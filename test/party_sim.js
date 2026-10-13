// Whole co-op runs in Node, networked: each player runs in its own copy of the game, and bots vote on the map, play the
// fights and handle their own rooms (rewards, shops, rest sites with Mend, events, chests, Ancients). Checks that the
// party stays in step: same floors, same rooms, matching fights, no errors.
// Usage: node test/party_sim.js [runs] [floors]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const FILES = ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'coop', 'neow2', 'ascension_data', 'ascension', 'net'];
const SRC = FILES.map((f) => [f, fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8')]);
const RUNS = +process.argv[2] || 6;
const FLOORS = +process.argv[3] || 18;
const CHARS = ['OATHBURNER', 'VEILED', 'CROWNED', 'UNBURIED', 'WIREBOUND'];
const RUN_MS = +(process.env.RUN_MS || 240000);
const SPIN_MS = +(process.env.SPIN_MS || 0); // the split-vote roulette's wait (the game's is a few seconds)
const LEAVE = !!process.env.LEAVE; // the last player drops out partway (at the map or in a fight); the rest go on
const REJOIN = !!process.env.REJOIN; // the last player drops out and comes back in a fresh copy of the game, with its ticket
const HOSTCRASH = !!process.env.HOSTCRASH; // the host's page reloads partway; it picks the game back up and everyone returns
class Gone extends Error {} // this player's link went down: come back (see comeBack)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function world() {
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, Promise, Math });
  for (const [f, code] of SRC) vm.runInContext(code, ctx, { filename: f + '.js' });
  ctx.HD.setVersion();
  return ctx.HD;
}
// Rewards and other gains, taken at random (the same handling test/sim.js uses, in short).
function take(HD, run, rng, items) {
  for (const it of items) {
    if (it.kind === 'gold') run.gainGold(it.n);
    if (it.kind === 'potion') run.addPotion(it.id);
    if (it.kind === 'relic') run.addRelic(it.id);
    if (it.kind === 'cards' && rng.next() < 0.8) { const c = rng.pick(it.cards); run.addCard(c.id, c.up); }
    if (it.kind === 'choice' && it.opts.length) run.choiceDone(it, rng.pick(it.opts));
    if (it.kind === 'remove' || it.kind === 'transform') { const xs = run.removable(); if (xs.length) { const c = rng.pick(xs); if (it.kind === 'remove') run.removeCard(c); else run.transform(c); } }
    if (it.kind === 'upgrade') { const c = run.deck.find((x) => !x.up && HD.CARDS[x.id].type !== 'Curse'); if (c) c.up = true; }
    if (it.kind === 'enchant') { const xs = run.enchantable(it.id, it.filter ? (d) => d.type === it.filter : null); if (xs.length) run.enchant(rng.pick(xs), it.id, it.n || 0); }
  }
}
const drain = (HD, run, rng) => { for (let k = 0; run.pending.length && k < 50; k++) take(HD, run, rng, run.pending.splice(0)); };
function botUI(rng) { return { choose: (g, o) => { const min = o.min != null ? o.min : o.n; return rng.shuffle(o.from.slice()).slice(0, Math.min(o.from.length, min + rng.int(o.n - min + 1))); } }; }
function move(HD, g, rng) {
  const ally = () => { const a = g.allies(); return a.length ? rng.pick(a).index : undefined; };
  const foe = () => { const a = g.alive(); return a.length ? rng.pick(a).uid : undefined; };
  const pots = g.run.potions.map((p, k) => k).filter((k) => g.canUsePotion(k));
  if (pots.length && rng.next() < 0.05) { const slot = rng.pick(pots); return HD.POTIONS[g.run.potions[slot]].target !== 'enemy' && rng.next() < 0.3 ? { k: 'potion', slot, ally: ally() } : { k: 'potion', slot, target: foe() }; }
  const ok = g.hand.filter((c) => g.canPlay(c));
  if (ok.length && rng.next() < 0.9) { const c = rng.pick(ok); return HD.CARDS[c.id].target === 'ally' ? { k: 'play', card: c.uid, ally: ally() } : { k: 'play', card: c.uid, target: foe() }; }
  return { k: 'end' };
}

// Bosses the host met lately sit out until the rest of their act's bosses have come up.
function bossChecks(st) {
  const HD = world();
  const all = HD.encPool('boss', 1);
  for (let n = 0; n < 50; n++) {
    const h = new HD.NetHost({ recentBosses: all.slice(0, all.length - 1) });
    h.rng = HD.makeRng(n);
    const b = h.pickBosses();
    if (b[1] !== all[all.length - 1] || !HD.encPool('boss', 2).includes(b[2])) { st.bossMismatch++; console.error(`boss pick ignored the recent bosses: ${JSON.stringify(b)}`); return; }
  }
  const seen = new Set();
  for (let n = 0; n < 60; n++) { const h = new HD.NetHost(); h.rng = HD.makeRng(n); seen.add(h.pickBosses()[1]); }
  if (seen.size !== all.length) { st.bossMismatch++; console.error(`with no history, only these bosses came up: ${[...seen]}`); }
}

async function partyRun(i, st) {
  const size = 2 + (i % 3);
  const world0 = world();
  let HD0 = world0;
  const hostOpts = { seed: `party${i}`, spinMs: SPIN_MS, onEvent: (e) => { if (e.t === 'desync') st.desyncs++; } };
  let host = new HD0.NetHost(hostOpts);
  // FORCE_EVENT=LAMP_KEY (say): every room but the boss is that event, to test events that start fights.
  if (process.env.FORCE_EVENT) { const roomFor = host.roomFor.bind(host); host.roomFor = (key) => (key === 'BOSS' ? roomFor(key) : { room: 'event', event: process.env.FORCE_EVENT }); }
  const delay = ((r) => () => r.int(2))(HD0.makeRng(7 + i));
  const players = [];
  // A player's link to the host (seat and token to take a seat back).
  const connect = (me, seat, token) => {
    const { HD } = me;
    const [a, b] = HD0.loopPair(delay);
    host.connect(a);
    me.peer = new HD.NetPeer({ link: b, name: `P${me.j}`, ui: botUI(me.rng), onEvent: (e) => { if (process.env.NETDBG && e.t === 'applied') me.states[`${me.peer.f}:${e.n}`] = JSON.stringify(HD.fightState(me.peer.g)); me.q.push(e); if (e.t === 'error') st.errors.push(`${i}: ${e.error && e.error.stack}`); } });
    me.peer.hello(seat, token);
  };
  for (let j = 0; j < size; j++) {
    const HD = j ? world() : HD0;
    const me = { HD, j, rng: HD.makeRng(HD.hashSeed(`pbot${i}:${j}`)), q: [], log: [], states: {} };
    connect(me);
    players.push(me);
  }
  host.authority = () => players[0].peer.run;
  if (LEAVE) Object.assign(players[size - 1], { leaver: true, leaveAt: i % 3 === 2 ? 'lobby' : i % 2 ? 'fight' : 'map', leaveFloor: 2 + (i % 7) });
  if (REJOIN) Object.assign(players[size - 1], { leaver: true, leaveAt: i % 2 ? 'fight' : 'map', leaveFloor: 2 + (i % 7) });
  const crashAt = HOSTCRASH ? { where: i % 2 ? 'fight' : 'map', floor: 3 + (i % 6) } : null;
  while (players.some((p) => p.peer.seat === null)) await sleep(1);
  // Someone who joins and leaves again before picking a hero.
  if (LEAVE && players[size - 1].leaveAt === 'lobby') { const me = players.pop(); me.left = true; st.left++; me.peer.link.close(); await sleep(5); }
  players.forEach((p, j) => p.peer.pickChar(CHARS[(i + j * 2) % CHARS.length]));
  await sleep(20);
  if (!host.startRun(0)) throw new Error('run did not start');
  while (players.some((p) => !p.peer.run)) await sleep(1);
  // One boss per act for the whole party.
  if (new Set(players.map((p) => p.peer.run.boss)).size > 1) { st.bossMismatch++; console.error(`run ${i}: players see different bosses`); }
  const t0 = Date.now();
  const next = async (me, types) => {
    for (;;) {
      if (me.gone) throw new Gone();
      // A vote the host dropped (the party could not reach that room): vote again, as a player would.
      for (let j = me.q.findIndex((e) => e.t === 'mapstate'); j >= 0; j = me.q.findIndex((e) => e.t === 'mapstate')) {
        const e = me.q.splice(j, 1)[0];
        if (me.revote && e.at[me.peer.seat] && !e.votes[me.peer.seat]) me.revote();
      }
      const k = me.q.findIndex((e) => types.includes(e.t));
      if (k >= 0) return me.q.splice(k, 1)[0];
      if (Date.now() - t0 > RUN_MS) throw new Error(`waiting for ${types} at floor ${me.peer.run && me.peer.run.floor}; host at=${JSON.stringify(host.run.at)} votes=${JSON.stringify(host.run.votes)} asks=${host.run.asks.length}; positions ${players.map((p) => p.peer.run && `${p.peer.run.act}/${p.peer.run.pos}/${p.peer.run.floor}`)}; authority reach ${host.authority().reachable()}`);
      await sleep(1);
    }
  };
  // A player dropping out: their link closes, as when a phone sleeps or a tab closes.
  const leave = (me) => {
    st.left++;
    if (REJOIN) { me.gone = true; me.peer.link.close(); throw new Gone(); }
    me.left = true; me.peer.link.close(); return 'left';
  };
  // The host's page reloads: its links all drop, then a new host picks the game up from what it saved.
  let restoring = null;
  const crash = () => {
    if (restoring) return;
    st.crashes++;
    const data = JSON.parse(JSON.stringify(host.toSave())); // as kept in the browser
    for (const p of players) p.gone = true;
    for (const s of host.seats) if (s.link && s.live) s.link.close();
    restoring = (async () => {
      await sleep(200);
      HD0 = world();
      host = HD0.NetHost.fromSave(data, Object.assign({ restoreMs: 2500 }, hostOpts));
      host.authority = () => players[0].peer.run;
    })();
    throw new Gone();
  };
  const crashing = (me, where) => crashAt && !restoring && me === players[0] && crashAt.where === where && me.peer.run.floor >= crashAt.floor && me.rng.next() < 0.3;
  // Coming back, as a reloaded page does: a fresh copy of the game, the seat's secret, and the run as last saved.
  const comeBack = async (old) => {
    if (restoring) await restoring; else await sleep(300 + old.rng.int(5000));
    const HD = old.j === 0 && restoring ? HD0 : world();
    const me = { HD, j: old.j, rng: HD.makeRng(HD.hashSeed(`pbot${i}:${old.j}:back${st.rejoins}`)), q: [], log: old.log, states: {}, left: true, saved: old.saved };
    players[old.j] = me;
    st.rejoins++;
    connect(me, old.peer.seat, old.peer.token);
    const w = await next(me, ['welcome', 'reject']);
    if (w.t === 'reject') throw new Error(`seat ${old.peer.seat} could not come back: ${w.reason}`);
    if (!w.rejoined) throw new Error('the host did not treat it as a rejoin');
    if (w.fight !== 'in') { const run = HD.Run.fromSave(me.saved); run.follow(w.pos); me.peer.run = run; me.peer.chars = w.run.chars; }
    return { me, w };
  };
  const leaving = (me, where) => me.leaver && me.leaveAt === where && me.peer.run.floor >= me.leaveFloor && me.rng.next() < 0.2;
  // One player's fight: random moves on its own copy until the fight ends everywhere.
  const fight = async (me) => {
    await next(me, ['fight']);
    const g = me.peer.g;
    while (!g.over) {
      await sleep(me.rng.int(3));
      if (me.gone) throw new Gone();
      if (leaving(me, 'fight')) return leave(me);
      if (crashing(me, 'fight')) crash();
      if (Date.now() - t0 > RUN_MS) throw new Error('fight stalled');
      if (me.peer.waiting || g.phase !== 'player') continue;
      const s = g.seats[me.peer.seat];
      if (!s || s.dead || s.ready) continue;
      me.peer.act(g.asSeat(s, () => move(me.HD, g, me.rng)));
    }
    await me.peer.chain;
    return g;
  };
  // After a fight: fallen players come back at 1 HP if the party won; then rewards (unless it was someone else's event).
  const afterFight = (me, g, kind, rewards) => {
    const { HD, rng } = me, run = me.peer.run, s = g.seats[me.peer.seat]; // the fight's copy of this player's run
    if (!g.won) { run.hp = 0; return 'lost'; }
    run.hp = s.dead ? 1 : s.p.hp; run.maxHp = s.p.maxHp;
    st.revived += s.dead ? 1 : 0;
    run.hp = run.maxHp; // keep the run going (see above)
    run.combatDone(kind === 'event' ? 'monster' : kind);
    if (rewards) take(HD, run, rng, g.asSeat(s, () => run.combatRewards(kind, g)));
    drain(HD, run, rng);
    if (kind === 'boss') {
      if (run.act >= HD.LAST_ACT) return 'won';
      run.startAct(run.act + 1);
      run.addRelic(rng.pick(run.ancientOffer())); drain(HD, run, rng);
    }
    return 'ok';
  };
  const bot = async (me, back) => {
    const { HD, rng } = me;
    let run;
    if (back && back.over) return 'lost'; // the party fell while this player was away
    if (!back) {
      await next(me, ['run']);
      run = me.peer.run;
      run.addRelic(rng.pick(run.neowOffer())); drain(HD, run, rng);
      // Random bots lose a lot; extra HP keeps runs going so later floors, bosses and acts get tested too.
      run.maxHp += 250; run.hp = run.maxHp;
    } else if (back.fight === 'in') {
      const g = await fight(me);
      const r = afterFight(me, g, g.kind, true);
      if (r !== 'ok') return r;
    }
    for (;;) {
      run = me.peer.run; // each fight hands back its copy of the run
      me.saved = run.toSave(); // what the browser keeps for coming back
      if (run.floor >= FLOORS) return 'done';
      me.peer.atMap();
      if (leaving(me, 'map')) return leave(me);
      if (crashing(me, 'map')) crash();
      const vote = () => { const ks = run.reachable(); if (ks.length) me.peer.vote(rng.pick(ks)); };
      vote();
      me.revote = vote;
      const m = await next(me, ['go', 'go-fight', 'lost']);
      me.revote = null;
      if (m.t === 'lost') return 'lost'; // the party fell in a fight this player waited out
      me.saved = me.peer.run.toSave(); // the party moved
      // A split vote's roulette must land where the party then goes, on one of the rooms someone voted for.
      for (let k = me.q.findIndex((e) => e.t === 'spin'); k >= 0; k = me.q.findIndex((e) => e.t === 'spin')) {
        const sp = me.q.splice(k, 1)[0];
        if (me === players[0]) { st.spins++; if (m.t !== 'go' || sp.key !== m.key || !sp.options.includes(m.key) || sp.options.length < 2) { st.badSpins++; console.error(`run ${i}: roulette ${JSON.stringify(sp)} then ${m.t} ${m.key}`); } }
      }
      if (m.key === 'BOSS' && m.enc !== run.boss) { st.bossMismatch++; console.error(`run ${i}: the map showed ${run.boss}, the party fought ${m.enc}`); }
      if (m.t === 'go-fight') { const g = await fight(me); if (g === 'left') return g; const r = afterFight(me, g, 'event', false); if (r !== 'ok') return r; continue; }
      me.log.push(`${run.floor}:${m.key}:${m.room}:${m.enc || m.event || ''}`);
      if (m.enc) { const g = await fight(me); if (g === 'left') return g; const r = afterFight(me, g, m.kind, true); if (r !== 'ok') return r; continue; }
      if (m.room === 'event') {
        const ev = run.startEvent(m.event);
        // Not on the last floor: the bots stop there, so a fight nobody else would join would wait forever.
        for (let step = 0; ev && step < 20 && run.floor < FLOORS; step++) {
          const open = run.eventView(ev).options.filter((o) => !o.locked);
          if (!open.length) break;
          const res = run.eventChoose(ev, rng.pick(open).id);
          drain(HD, run, rng);
          if (run.hp <= 0) run.hp = 1; // co-op: a player who falls outside a fight comes back at 1 HP
          if (res.fight) {
            me.peer.eventFight(res.fight, res.kind || 'monster');
            st.asks++;
            const gf = await next(me, ['go-fight']);
            // Several players can pick the same event's fight: each of them gets its rewards.
            if (gf.enc === res.fight && gf.kind === (res.kind || 'monster')) {
              if (!(gf.all || []).includes(me.peer.seat)) { st.askLost++; console.error(`run ${i}: seat ${me.peer.seat} asked for ${gf.enc} but is not among ${JSON.stringify(gf.all)}`); }
              if (gf.all.length > 1 && gf.by === me.peer.seat) st.sharedAsks++;
            }
            me.q.unshift({ t: 'go-fight-taken' });
            const g = await fight(me);
            if (g === 'left') return g;
            const r = afterFight(me, g, res.kind === 'event' ? 'event' : 'monster', res.kind !== 'event');
            if (r !== 'ok') return r;
            if (HD.EVENTS[ev.id].onWin) HD.EVENTS[ev.id].onWin(run, ev, g);
            break;
          }
        }
        drain(HD, run, rng);
        continue;
      }
      if (m.room === 'shop') { run.hook('onShop'); run.gold += 200; run.makeShop(); for (const kind of ['cards', 'relics', 'potions']) if (run.shop[kind].length && rng.next() < 0.6) run.buy(kind, rng.int(run.shop[kind].length)); drain(HD, run, rng); continue; }
      if (m.room === 'rest') {
        run.hook('onRestSite');
        const mates = me.peer.chars.map((c, k) => k).filter((k) => k !== me.peer.seat);
        const r = rng.next();
        if (r < 0.2 && mates.length) { me.peer.mend(rng.pick(mates)); st.mends++; }
        else if (r < 0.6) { run.heal(run.restHeal()); run.hook('onRest'); }
        else { const c = run.deck.find((x) => !x.up && HD.CARDS[x.id].type !== 'Curse'); if (c) c.up = true; }
        continue;
      }
      if (m.room === 'treasure') { const t = run.treasure(); run.gainGold(t.gold); if (t.relic) run.addRelic(t.relic); drain(HD, run, rng); continue; }
    }
  };
  // Each player plays on; a dropped link brings them back with their ticket.
  const play = async (me) => {
    let back = null;
    for (;;) {
      try { return await bot(me, back); } catch (e) { if (!(e instanceof Gone)) throw e; ({ me, w: back } = await comeBack(me)); }
    }
  };
  const results = await Promise.all(players.map((me) => play(me).catch((e) => { st.errors.push(`${i}: ${e.stack.split('\n').slice(0, 4).join(' | ')}`); return 'error'; })));
  // The party moved together: every player saw the same rooms on the same floors.
  if (process.env.NETDBG) {
    const keys = Object.keys(players[0].states).sort((a, b) => { const [fa, na] = a.split(':').map(Number), [fb, nb] = b.split(':').map(Number); return fa - fb || na - nb; });
    const k = keys.find((x) => players.some((p) => p.states[x] !== undefined && p.states[x] !== players[0].states[x]));
    if (k) {
      const flat = (x, pre = '') => (Array.isArray(x) ? x.flatMap((y, q) => flat(y, `${pre}.${q}`)) : [[pre, JSON.stringify(x)]]);
      const A = Object.fromEntries(flat(JSON.parse(players[0].states[k])));
      console.error(`run ${i}: first difference at fight:action ${k}`);
      players.forEach((p, q) => { if (q && p.states[k]) for (const [path2, v] of flat(JSON.parse(p.states[k]))) if (A[path2] !== v) console.error(`  copy ${q} ${path2}: ${A[path2]} vs ${v}`); });
    }
  }
  const logs = players.filter((p) => !p.left).map((p) => p.log.join(' '));
  if (new Set(logs).size > 1) { st.split++; console.error(`run ${i}: players went different ways\n  ${logs.join('\n  ')}`); }
  st.runs++; st.players += size; st.floors += players[0].peer.run.floor;
  for (const r of results) st.ends[r] = (st.ends[r] || 0) + 1;
}

(async () => {
  const st = { runs: 0, players: 0, floors: 0, ends: {}, mends: 0, revived: 0, spins: 0, badSpins: 0, bossMismatch: 0, desyncs: 0, split: 0, left: 0, asks: 0, sharedAsks: 0, askLost: 0, rejoins: 0, crashes: 0, errors: [] };
  bossChecks(st);
  for (let i = process.env.ONLY ? +process.env.ONLY : 0; i < (process.env.ONLY ? +process.env.ONLY + 1 : RUNS); i++) await partyRun(i, st);
  for (const e of st.errors.slice(0, 4)) console.error(e);
  console.log(JSON.stringify({ runs: st.runs, players: st.players, avgFloor: +(st.floors / Math.max(1, st.runs)).toFixed(1), ends: st.ends, mends: st.mends, revived: st.revived, left: st.left, rejoins: st.rejoins, hostReloads: st.crashes, eventFightAsks: st.asks, sharedEventFights: st.sharedAsks, eventRewardsLost: st.askLost, roulettes: st.spins, badRoulettes: st.badSpins, bossMismatch: st.bossMismatch, desyncs: st.desyncs, wentDifferentWays: st.split, errors: st.errors.length }));
  if (st.errors.length || st.desyncs || st.split || st.badSpins || st.bossMismatch || st.askLost || !st.spins) process.exitCode = 1;
})();

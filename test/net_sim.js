// Networked fights in Node: every player runs in its own copy of the game (as on separate machines), joined to the
// host by in-memory links with random delays. Bots play random legal moves. Checks that every copy ends the same, that
// a dropped player can rejoin mid-fight, that tampering is caught, and that bad messages are refused.
// Usage: node test/net_sim.js [fights]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const FILES = ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'coop', 'neow2', 'ascension_data', 'ascension', 'net'];
const SRC = FILES.map((f) => [f, fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8')]);
const N = +process.argv[2] || 24;
const CHARS = ['OATHBURNER', 'VEILED', 'CROWNED', 'UNBURIED', 'WIREBOUND'];
const KINDS = ['monster', 'monster', 'elite', 'boss'];
const TRIAL_MS = 60000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A fresh copy of the game: its own HD, uid counter and everything.
function world() {
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, Promise, Math });
  for (const [f, code] of SRC) vm.runInContext(code, ctx, { filename: f + '.js' });
  ctx.HD.setVersion();
  return ctx.HD;
}
function makeRun(HD, i, j, size, pick) {
  const r = new HD.Run(`net${i}:${j}`, pick.pick(CHARS), 0);
  r.party = size;
  const coop = r.pool().concat(r.pool('colorless')).filter((d) => d.coop);
  for (let k = 0; k < 4; k++) r.addCard(r.rng.misc.pick(coop).id, false);
  for (let k = 0; k < 6; k++) r.addCard(r.rng.misc.pick(r.pool()).id, r.rng.misc.next() < 0.4);
  r.fillPotions();
  r.pending.length = 0;
  return r;
}
// A player's bot: random legal moves from its own copy, and its own choices; it never touches the fight's RNG.
function botUI(rng) {
  return { choose: (g, o) => { const min = o.min != null ? o.min : o.n; const k = Math.min(o.from.length, min + rng.int(o.n - min + 1)); return rng.shuffle(o.from.slice()).slice(0, k); } };
}
function chooseMove(g, rng) {
  const ally = () => { const a = g.allies(); return a.length ? rng.pick(a).index : undefined; };
  const foe = () => { const a = g.alive(); return a.length ? rng.pick(a).uid : undefined; };
  const pots = g.run.potions.map((p, k) => k).filter((k) => g.canUsePotion(k));
  if (pots.length && rng.next() < 0.06) { const slot = rng.pick(pots); return HD0(g).POTIONS[g.run.potions[slot]].target !== 'enemy' && rng.next() < 0.3 ? { k: 'potion', slot, ally: ally() } : { k: 'potion', slot, target: foe() }; }
  const ok = g.hand.filter((c) => g.canPlay(c));
  if (ok.length && rng.next() < 0.9) { const c = rng.pick(ok); return HD0(g).CARDS[c.id].target === 'ally' ? { k: 'play', card: c.uid, ally: ally() } : { k: 'play', card: c.uid, target: foe() }; }
  return { k: 'end' };
}
const HD0 = (g) => g.constructor.HD || g._HD; // the copy's own HD (set below)

async function trial(i, st) {
  const pick = { i: 0, pick(a) { return a[(this.i++ * 7 + i * 13) % a.length]; } };
  const size = 2 + (i % 3);
  const host0 = world();
  const host = new host0.NetHost({ onEvent: (e) => { if (e.t === 'desync') st.desyncsSeen.push(i); } });
  const drive = host0.makeRng(host0.hashSeed('netdrive' + i));
  const delay = () => drive.int(3);
  const players = [];
  const join = (HD, run, rejoin) => {
    const [a, b] = host0.loopPair(delay);
    host.connect(a);
    const me = { HD, rng: HD.makeRng(HD.hashSeed(`bot${i}:${players.length}:${rejoin}`)), events: [] };
    me.states = {};
    me.peer = new HD.NetPeer({ link: b, run, name: `P${players.length}`, ui: botUI(me.rng), onEvent: (e) => {
      me.events.push(e.t);
      if (e.t === 'reject' && rejoin !== undefined) st.errorsSeen.push(`${i}: rejoin refused (${e.reason})`);
      if (e.t === 'error') st.errorsSeen.push(`${i}: ${e.error && e.error.stack}`);
      if (e.t === 'applied' && process.env.NETDBG) me.states[e.n] = JSON.stringify(HD.fightState(me.peer.g));
    } });
    me.peer.hello(rejoin);
    return me;
  };
  for (let j = 0; j < size; j++) { const HD = j ? world() : host0; players.push(join(HD, makeRun(HD, i, j, size, pick))); }
  while (players.some((p) => p.peer.seat === null)) await sleep(1);
  const act = 1 + (i % 2), kind = KINDS[i % KINDS.length];
  for (const p of players) p.peer.run.act = act;
  const pool = kind === 'monster' ? 'normal' : kind;
  const encs = host0.encPool(pool, act);
  host.startFight(encs[i % encs.length], kind);
  const t0 = Date.now();
  const rejoinAt = i % 4 === 1 ? 12 + (i % 7) : -1;
  const tamperAt = i % 8 === 3 ? 8 : -1;
  let rejoined = false, tampered = false;
  for (;;) {
    if (Date.now() - t0 > TRIAL_MS) {
      const view = players.map((p) => { const g = p.peer.g; return g && { seat: p.peer.seat, applied: p.peer.applied, waiting: p.peer.waiting, phase: g.phase, over: g.over, round: g.round,
        seats: g.seats.map((x) => `${x.index}:${x.ready ? 'R' : '-'}${x.ended ? 'E' : '-'}${x.dead ? 'D' : '-'}`).join(' '), prompts: p.peer.picks.map((q) => Object.keys(q.wait).join('/')) }; });
      throw new Error(`stalled: log ${host.fight.log.length} ${JSON.stringify(view)} last ${JSON.stringify(host.fight.log.slice(-4))}`);
    }
    await sleep(drive.int(3));
    const logLen = host.fight.log.length;
    // Drop a player mid-fight and bring them back in a brand-new copy of the game.
    if (!rejoined && rejoinAt >= 0 && logLen >= rejoinAt) {
      rejoined = true;
      const j = 1 + (i % (size - 1));
      const seat = players[j].peer.seat;
      players[j].peer.link.close();
      await sleep(5);
      players[j] = join(world(), null, seat);
      st.rejoins++;
    }
    if (!tampered && tamperAt >= 0 && logLen >= tamperAt && players[1].peer.g) { tampered = true; players[1].peer.g.enemies[0].hp += 1; st.tampers.push(i); }
    const live = players.filter((p) => p.peer.g && p.peer.f === host.fight.f);
    if (live.length === size && live.every((p) => p.peer.g.over) && live.every((p) => p.peer.nextN === host.fight.log.length)) break;
    for (const p of live) {
      const g = p.peer.g;
      g._HD = p.HD;
      if (g.over || p.peer.waiting || g.phase !== 'player') continue;
      const s = g.seats[p.peer.seat];
      if (!s || s.dead) continue;
      if (s.ready) { if (p.rng.next() < 0.02) p.peer.act({ k: 'unend' }); continue; }
      p.peer.act(g.asSeat(s, () => chooseMove(g, p.rng)));
    }
  }
  await Promise.all(players.map((p) => p.peer.chain));
  const hashes = players.map((p) => p.HD.fightHash(p.peer.g));
  if (new Set(hashes).size > 1 && !tampered) { st.mismatches++; console.error(`fight ${i}: copies differ ${hashes}`); }
  if (process.env.NETDBG && (new Set(hashes).size > 1 || st.desyncsSeen.includes(i)) && !tampered) {
    const ns = Object.keys(players[0].states).map(Number).sort((x, y) => x - y);
    const n = ns.find((k) => players.some((p) => p.states[k] !== undefined && p.states[k] !== players[0].states[k]));
    console.error(`first difference after action ${n}:`, JSON.stringify(host.fight.log[n]));
    const parts = players.map((p) => JSON.parse(p.states[n] || 'null'));
    const flat = (x, pre = '') => (Array.isArray(x) ? x.flatMap((y, k) => flat(y, `${pre}.${k}`)) : [[pre, JSON.stringify(x)]]);
    const A = Object.fromEntries(flat(parts[0]));
    for (let q = 1; q < parts.length; q++) for (const [k, v] of flat(parts[q])) if (A[k] !== v) console.error(`  copy ${q} ${k}: ${A[k]} vs ${v}`);
    console.error('  prev', JSON.stringify(host.fight.log.slice(Math.max(0, n - 3), n)));
  }
  st.fights++; st.actions += host.fight.log.length; st.players += size;
  if (players[0].peer.g.won) st.won++;
}

async function protocolChecks(st) {
  const HD = world();
  const host = new HD.NetHost();
  const mk = (build) => { const [a, b] = HD.loopPair(); host.connect(a); const ev = []; const p = new HD.NetPeer({ link: b, run: new HD.Run('pc', 'OATHBURNER'), build, onEvent: (e) => ev.push(e) }); p.hello(); return { p, ev, b }; };
  const one = mk(), two = mk(), odd = mk('some-other-build');
  await sleep(10);
  const ok = (name, c) => { st.checks++; if (!c) { st.failed++; console.error('FAIL', name); } else console.log('ok  ', name); };
  ok('a different build is turned away', odd.ev.some((e) => e.t === 'reject' && e.reason === 'version'));
  ok('players get seats in join order', one.p.seat === 0 && two.p.seat === 1);
  host.startFight('RIPJAW', 'monster');
  await sleep(30);
  ok('both players start the same fight', one.p.g && two.p.g && HD.fightHash(one.p.g) === HD.fightHash(two.p.g));
  const n0 = host.fight.log.length;
  two.b.send(JSON.stringify({ t: 'act', f: host.fight.f, s: 0, a: { k: 'end' } }));
  two.b.send('not json');
  two.b.send(JSON.stringify({ t: 'act', f: host.fight.f, a: { k: 'win', card: 'x' } }));
  two.b.send(JSON.stringify({ t: 'pick', f: host.fight.f, pi: -1, uids: [1] }));
  await sleep(20);
  ok('a player cannot act for someone else; junk is ignored', host.fight.log.length === n0 + 1 && host.fight.log[n0].s === 1);
  const late = mk();
  await sleep(10);
  ok('nobody joins in the middle of a fight', late.ev.some((e) => e.t === 'reject'));
}

(async () => {
  const st = { fights: 0, won: 0, players: 0, actions: 0, rejoins: 0, tampers: [], desyncsSeen: [], mismatches: 0, errors: 0, errorsSeen: [], checks: 0, failed: 0 };
  await protocolChecks(st);
  for (let i = process.env.ONLY ? +process.env.ONLY : 0; i < (process.env.ONLY ? +process.env.ONLY + 1 : N); i++) {
    try { await trial(i, st); } catch (e) { st.errors++; console.error(`fight ${i}:`, e.stack.split('\n').slice(0, 6).join('\n')); if (st.errors > 3) break; }
  }
  const caught = st.tampers.every((i) => st.desyncsSeen.includes(i));
  const falseAlarms = st.desyncsSeen.filter((i) => !st.tampers.includes(i));
  for (const e of st.errorsSeen.slice(0, 3)) console.error(e);
  console.log(JSON.stringify({ fights: st.fights, won: st.won, players: st.players, actions: st.actions, rejoins: st.rejoins, tampers: st.tampers.length, tamperCaught: caught,
    falseAlarms: falseAlarms.length, mismatches: st.mismatches, errors: st.errors + st.errorsSeen.length, protocolChecks: `${st.checks - st.failed}/${st.checks}` }));
  if (st.errors || st.errorsSeen.length || st.mismatches || !caught || falseAlarms.length || st.failed) process.exitCode = 1;
})();

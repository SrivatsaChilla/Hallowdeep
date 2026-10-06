// Multiplayer fights, headless: random parties of 2 to 4 (any characters) play random interleaved actions.
// Checks invariants after every action, and replays each fight from its action log: lockstep needs the same result.
// Usage: node test/mp_sim.js [fights]   (ASC=10 for Ascension)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ctx = vm.createContext({ console, setTimeout, Math, Promise });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'neow2', 'ascension_data', 'ascension']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
const HD = ctx.HD;
HD.setVersion();
const N = +process.argv[2] || 200;
const ASC = Number(process.env.ASC || 0);
const CHARS = ['OATHBURNER', 'VEILED', 'CROWNED', 'UNBURIED', 'WIREBOUND'];
const KINDS = ['monster', 'monster', 'elite', 'boss'];

// A run with a fuller deck and some relics, so more cards and powers get exercised.
function party(i, pick) {
  const runs = [];
  for (let j = 0; j < 2 + (i % 3); j++) {
    const r = new HD.Run(`mp${i}:${j}`, pick.pick(CHARS), ASC);
    const relics = Object.keys(HD.RELICS).filter((id) => HD.RELICS[id].rarity !== 'Starter' && ['shared', r.color].includes(HD.RELICS[id].pool || 'shared'));
    for (let k = 0; k < 8; k++) r.addCard(r.rng.misc.pick(HD.POOL(r.color)).id, r.rng.misc.next() < 0.4);
    for (const id of r.rng.misc.shuffle(relics).slice(0, 6)) if (!r.hasRelic(id)) r.addRelic(id);
    r.fillPotions();
    r.pending.length = 0;
    runs.push(r);
  }
  return runs;
}
// A random legal move for one player, as the data that would travel over the network.
function choose(g, drive) {
  // Uses its own RNG: the fight's RNG belongs to the fight, or the replay would differ.
  const foe = () => { const a = g.alive(); return a.length ? drive.pick(a).uid : null; };
  const pots = g.run.potions.map((p, k) => k).filter((k) => g.canUsePotion(k));
  if (pots.length && drive.next() < 0.08) return { k: 'potion', slot: drive.pick(pots), target: foe() };
  const ok = g.hand.filter((c) => g.canPlay(c));
  if (ok.length && drive.next() < 0.9) return { k: 'play', card: drive.pick(ok).uid, target: foe() };
  return { k: 'end' };
}
function check(g, where) {
  if (g.seat !== g.seats[0]) throw new Error(`${where}: active seat not restored`);
  const stray = Object.keys(g).filter((k) => !HD.Combat.SHARED_KEYS.includes(k));
  if (stray.length) throw new Error(`${where}: unclassified combat fields: ${stray.join(', ')}`);
  for (const s of g.seats) {
    if (s.p.hp > s.p.maxHp) throw new Error(`${where}: seat ${s.index} HP over max`);
    if (!g.over && !!s.dead !== s.p.hp <= 0) throw new Error(`${where}: seat ${s.index} dead=${!!s.dead} at ${s.p.hp} HP`);
    if (s.hand.length > 10) throw new Error(`${where}: seat ${s.index} holds ${s.hand.length} cards`);
  }
}
async function fight(i, replay) {
  HD.setUid(1);
  const pick = HD.makeRng(HD.hashSeed('party' + i));
  const runs = party(i, pick);
  const act = 1 + pick.int(2);
  const kind = pick.pick(KINDS);
  const pool = kind === 'monster' ? (pick.next() < 0.5 ? 'weak' : 'normal') : kind;
  const enc = pick.pick(HD.encPool(pool, act));
  for (const r of runs) r.act = act;
  HD.setUid(1000000);
  const g = new HD.Combat(runs[0], enc, HD.autoUI, kind);
  for (const r of runs.slice(1)) g.addSeat(r);
  await g.start();
  check(g, `${enc} start`);
  const drive = HD.makeRng(HD.hashSeed('drive' + i));
  const log = [];
  while (!g.over) {
    if (log.length > 4000) throw new Error(`${enc}: stalled at round ${g.round}`);
    let step;
    if (replay) step = replay[log.length];
    else {
      const ready = g.living().filter((s) => s.ready);
      const free = g.living().filter((s) => !s.ready);
      if (!free.length) throw new Error(`${enc}: everyone is ready but the round did not end`);
      if (ready.length && drive.next() < 0.03) step = [drive.pick(ready).index, { k: 'unend' }];
      else { const s = drive.pick(free); step = [s.index, g.asSeat(s, () => choose(g, drive))]; }
    }
    if (!step) throw new Error(`${enc}: replay ran out of actions`);
    log.push(step);
    await g.act(step[0], step[1]);
    check(g, `${enc} round ${g.round}`);
  }
  const h = crypto.createHash('sha1').update([enc, g.round, g.won, ...g.seats.map((s) => `${s.p.hp}/${s.p.maxHp}/${s.run.gold}`), ...g.enemies.map((e) => e.hp), ...g.log].join('|')).digest('hex');
  return { g, log, h, enc, kind, size: runs.length };
}

(async () => {
  const st = { fights: 0, won: 0, lost: 0, fellButWon: 0, rounds: 0, errors: 0, mismatches: 0, sizes: {}, chars: {} };
  for (let i = 0; i < N; i++) {
    try {
      const a = await fight(i, null);
      const b = await fight(i, a.log);
      if (a.h !== b.h) { st.mismatches++; console.error(`fight ${i} (${a.enc}): replay differs`); }
      st.fights++; st.rounds += a.g.round; st.sizes[a.size] = (st.sizes[a.size] || 0) + 1;
      for (const s of a.g.seats) st.chars[s.run.charId] = (st.chars[s.run.charId] || 0) + 1;
      if (a.g.won) { st.won++; if (a.g.seats.some((s) => s.dead)) st.fellButWon++; } else st.lost++;
    } catch (e) {
      st.errors++;
      console.error(`fight ${i}:`, e.stack.split('\n').slice(0, 6).join('\n'));
      if (st.errors > 5) break;
    }
  }
  st.avgRounds = +(st.rounds / Math.max(1, st.fights)).toFixed(1);
  delete st.rounds;
  console.log(JSON.stringify(st));
  if (st.errors || st.mismatches) process.exitCode = 1;
})();

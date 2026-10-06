// Multiplayer combat rules (from the wiki's co-op page): scaling, shared enemy turns, falling, theft, extra turns.
// Usage: node test/mp_checks.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ctx = vm.createContext({ console, setTimeout, Math, Promise });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro','coop', 'neow2', 'ascension_data', 'ascension']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
const HD = ctx.HD;
HD.setVersion();
let fails = 0, n = 0;
const eq = (name, a, b) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)); } else console.log('ok  ', name); };

// A fight with k players (Oathburners unless given), started, with one test enemy whose moves we choose.
async function party(k, o = {}) {
  const runs = Array.from({ length: k }, (_, i) => new HD.Run(`mpc${i}`, (o.chars || [])[i] || 'OATHBURNER'));
  for (const r of runs) r.act = o.act || 1;
  const g = new HD.Combat(runs[0], o.enc || 'RIPJAW', HD.autoUI, o.kind || 'monster');
  for (const r of runs.slice(1)) g.addSeat(r);
  await g.start();
  return g;
}
const MOVES = { HIT: { name: 'Hit', atk: 10 }, HIT2: { name: 'Hit twice', atk: 6, hits: 2 }, WEAKEN: { name: 'Weaken', debuff: { sapped: 2 } },
  SLIME: { name: 'Slime', status: { id: 'SLUDGE', n: 2, to: 'discard' } }, WALL: { name: 'Wall', block: 10 } };
function rig(e) { e.def = Object.assign({}, e.def, { moves: Object.assign({}, e.def.moves, MOVES) }); return e; }
async function enemyDoes(g, e, move) { rig(e); e.intent = move; await g.execMove(e); }
const clear = (g) => { for (const s of g.seats) { s.p.block = 0; s.p.pw = {}; } };

(async () => {
  // ---------- scaling ----------
  const solo = new HD.Combat(new HD.Run('mpc0'), 'RIPJAW', HD.autoUI); await solo.start();
  const base = solo.enemies[0].maxHp;
  eq('2 players, Act 1: enemy HP x2.2', (await party(2)).enemies[0].maxHp, Math.floor(base * 22 / 10));
  eq('4 players, Act 1: enemy HP x4.4', (await party(4)).enemies[0].maxHp, Math.floor(base * 44 / 10));
  eq('2 players, Act 2: enemy HP x2.4', (await party(2, { act: 2 })).enemies[0].maxHp, Math.floor(base * 24 / 10));
  eq('2 players, Act 3 boss: enemy HP x2.6', (await party(2, { act: 3, kind: 'boss' })).enemies[0].maxHp, Math.floor(base * 26 / 10));
  const sc = await party(3);
  eq('Artifact (Ward) 1 with 3 players: 3', sc.spawn('FIST_CONSTRUCT').pw.ward, 3);
  eq('Plating 15 with 3 players: 75', sc.spawn('TOAD_KNIGHT').pw.plate, 75);
  eq('Slippery 8 with 3 players: 24', sc.spawn('SMEARWRAITH').pw.slippery, 24);
  eq('Curl Up 14 with 3 players, Act 1: 46', sc.spawn('BROOD_LOUSE').pw.curlUp, 46);
  const wall = await party(2); const we = wall.enemies[0]; we.block = 0; await enemyDoes(wall, we, 'WALL');
  eq('enemy Block 10 with 2 players, Act 1: 22', we.block, 22);

  // ---------- the enemy turn hits everyone ----------
  const g = await party(3); const e = g.enemies[0]; clear(g);
  const hp0 = g.seats.map((s) => s.p.hp);
  g.seats[0].p.block = 4; g.seats[2].p.block = 99;
  await enemyDoes(g, e, 'HIT');
  eq('an attack hits every player; each blocks on their own', g.seats.map((s, i) => hp0[i] - s.p.hp), [6, 10, 0]);
  eq('Guard is spent per player', g.seats.map((s) => s.p.block), [0, 0, 89]);
  clear(g); await enemyDoes(g, e, 'WEAKEN');
  eq('debuffs land on every player', g.seats.map((s) => s.p.pw.sapped), [2, 2, 2]);
  const sl = g.seats.map((s) => s.discard.filter((c) => c.id === 'SLUDGE').length);
  await enemyDoes(g, e, 'SLIME');
  eq('status cards go to every player', g.seats.map((s, i) => s.discard.filter((c) => c.id === 'SLUDGE').length - sl[i]), [2, 2, 2]);
  eq('attacks are not scaled up', g.asSeat(g.seats[1], () => { clear(g); return g.enemyDmg(e, 10); }), 10);

  // ---------- turns ----------
  const t = await party(2); const te = t.enemies[0]; const seen = te.hist.length;
  await t.act(0, { k: 'end' });
  eq('one player ending does not end the round', [t.phase, t.round, te.hist.length, t.seats[0].ready], ['player', 1, seen, true]);
  eq('a player who ended cannot play', t.asSeat(t.seats[0], () => t.hand.some((c) => t.canPlay(c))), false);
  await t.act(0, { k: 'unend' });
  eq('End Turn can be taken back', t.seats[0].ready, false);
  await t.act(0, { k: 'end' }); await t.act(1, { k: 'end' });
  eq('the round ends when everyone has ended', [t.round, te.hist.length, t.seats.map((s) => s.ready)], [2, seen + 1, [false, false]]);
  eq('each player keeps their own turn count', t.seats.map((s) => s.turn), [2, 2]);

  // ---------- extra turns ----------
  const x = await party(2); const xe = x.enemies[0]; const xs = xe.hist.length;
  x.seats[0].p.pw.extraTurn = 1;
  await x.act(0, { k: 'end' }); await x.act(1, { k: 'end' });
  eq('an extra turn for one player: they play on, the enemies wait', [x.round, xe.hist.length, x.seats[0].turn, x.seats[0].ready, x.seats[1].ready], [1, xs, 2, false, true]);
  await x.act(0, { k: 'end' });
  eq('then the enemies act and a new round starts', [x.round, xe.hist.length, x.seats.map((s) => s.turn)], [2, xs + 1, [3, 2]]);

  // ---------- falling ----------
  const f = await party(2); const fe = f.enemies[0]; clear(f);
  f.seats[1].p.hp = 5; await enemyDoes(f, fe, 'HIT');
  eq('a player can fall while the other fights on', [f.seats[1].dead, f.over], [true, false]);
  await enemyDoes(f, fe, 'HIT');
  eq('enemies stop hitting a fallen player', f.seats[1].p.hp, 0);
  f.seats[0].p.hp = 3; await enemyDoes(f, fe, 'HIT');
  eq('the fight is lost when everyone has fallen', [f.over, f.won], [true, false]);
  const w = await party(2);
  await w.act(0, { k: 'end' });
  await w.withSeat(w.seats[1], () => w.loseHp(w.p, 999));
  await w.act(1, { k: 'noop' });
  eq('if the last player still playing falls, the round goes on', [w.round, w.seats[1].dead], [2, true]);
  eq('a fallen player does not start a turn', w.seats.map((s) => s.turn), [2, 1]);

  // ---------- theft ----------
  const h = await party(2, { enc: 'HOPPER_WEAK' }); const he = h.enemies.find((z) => z.id === 'PILFER_HOPPER');
  h.seats[0].run.gold = 100; h.seats[1].run.gold = 10; clear(h); h.seats.forEach((s) => (s.p.block = 99));
  he.intent = 'THIEVERY'; await h.execMove(he);
  eq('Thievery robs every player', h.seats.map((s) => s.run.gold), [85, 0]);
  await h.withSeat(h.seats[1], () => h.damage(he, 9999, {}));
  eq('killing it gives each player their own Gold back', h.seats.map((s) => s.run.gold), [100, 10]);

  // ---------- Imbalanced ----------
  const b = await party(2, { enc: 'CUPBEETLE_SWARM' }); const be = b.enemies.find((z) => z.pw.imbalanced); clear(b);
  if (be) {
    b.seats[0].p.block = 99; await enemyDoes(b, be, 'HIT');
    eq('Imbalanced: stunned when any player blocks it all', be.forceIntent, 'STUN');
  } else eq('Imbalanced enemy found', false, true);

  // ---------- mixed characters ----------
  const m = await party(4, { chars: ['UNBURIED', 'WIREBOUND', 'CROWNED', 'VEILED'] });
  eq('each player has their own piles, relics and resources (the Veiled draws 2 more)', m.seats.map((s) => [s.hand.length, s.orbSlots, s.run.charId]), [[5, 0, 'UNBURIED'], [5, 3, 'WIREBOUND'], [5, 0, 'CROWNED'], [7, 0, 'VEILED']]);
  eq('the Crowned starts with its own Glint', m.seats[2].stars, 3);

  console.log(fails ? `${fails} of ${n} multiplayer checks failed` : `all ${n} multiplayer checks passed`);
  if (fails) process.exitCode = 1;
})();

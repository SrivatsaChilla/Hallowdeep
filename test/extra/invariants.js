// Fuzz with invariant checks: card conservation, no NaN, hand size, energy, and enemy move coverage.
const _path = require('path');
const _ROOT = _path.join(__dirname, '..', '..');
const fs = require('fs'), vm = require('vm');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core','cards','potions','monsters','relics','versions','combat','run','events','act2','act3','colorless','enchants','events2','ancients','silent','regent_data','regent','orbs','defect_data','defect','neow2','ascension_data','ascension','names','naming']) vm.runInContext(fs.readFileSync(_path.join(_ROOT, 'src') + '/'+f+'.js','utf8'), ctx);
const HD = ctx.HD; HD.setVersion(process.argv[3] || '0.111'); HD.setNames('original');
const N = +process.argv[2] || 200;
const problems = new Map(); const bump = (k) => problems.set(k, (problems.get(k) || 0) + 1);
const moveUse = {}; const encUse = {};
const origExec = HD.Combat.prototype.execMove;
HD.Combat.prototype.execMove = async function (e) { const k = e.id + ':' + e.intent; moveUse[k] = (moveUse[k] || 0) + 1; return origExec.call(this, e); };
function check(g, where) {
  const all = [...g.draw, ...g.hand, ...g.discard, ...g.ash];
  const uids = all.map((c) => c.uid); if (new Set(uids).size !== uids.length) bump('DUP card in two piles @' + where);
  if (g.hand.length > 10) bump('hand>10 @' + where);
  if (!(g.energy >= 0)) bump('energy<0 or NaN @' + where);
  if (!Number.isFinite(g.p.hp) || !Number.isFinite(g.p.block) || g.p.block < 0) bump('player hp/block bad @' + where);
  for (const e of g.enemies) { if (!Number.isFinite(e.hp) || !Number.isFinite(e.block)) bump('enemy hp/block NaN ' + e.id); if (e.alive && e.hp <= 0 && !e.respawning) bump('alive enemy with hp<=0 ' + e.id); if (!Number.isInteger(e.hp)) bump('non-integer enemy hp ' + e.id); }
  for (const [k, v] of Object.entries(g.p.pw)) if (!Number.isFinite(v)) bump('player pw NaN ' + k);
  // every non-Power card created must be somewhere (created uids tracked below)
  for (const u of uids) g.placed.add(u);
  for (const uid of g.created) if (g.placed.has(uid) && HD.CARDS[g.createdType[uid].id].type !== 'Power' && !uids.includes(uid) && !g.consumed.has(uid)) { bump('card vanished @' + where + ' ' + g.createdId[uid]); if (!g.dumped) { g.dumped = 1; const o = g.createdType[uid]; console.log('VANISHED', JSON.stringify({ now: o.id, was: g.createdId[uid], flags: o, pw: Object.keys(g.p.pw), relics: g.run.relics.map((r) => r.id).join(','), hexed: g.alive().some((x) => x.pw.hex) })); } }
}
(async () => {
  for (let i = 0; i < N; i++) {
    const run = new HD.Run('inv' + i, process.env.CHAR || 'OATHBURNER');
    run.addRelic(run.rng.misc.pick(run.neowOffer()));
    { const anc = Object.values(HD.RELICS).filter((d) => d.ancient).map((d) => d.id); for (let k = 0; k < 3; k++) { run.addRelic(run.rng.misc.pick(anc)); } run.pending.length = 0; }
    for (let k = 0; k < 10; k++) run.addCard(run.rng.misc.pick(HD.POOL(run.color)).id, run.rng.misc.next() < 0.3);
    for (let k = 0; k < 5; k++) run.addCard(run.rng.misc.pick(HD.POOL('colorless')).id, run.rng.misc.next() < 0.3);
    for (let k = 0; k < 6; k++) { const id = run.rng.misc.pick(Object.keys(HD.ENCH)); const xs = run.enchantable(id); if (xs.length) run.enchant(run.rng.misc.pick(xs), id, 2); }
    run.fillPotions();
    const enc = [...Object.keys(HD.ENC)][i % Object.keys(HD.ENC).length];
    encUse[enc] = (encUse[enc] || 0) + 1;
    const g = new HD.Combat(run, enc, HD.autoUI, 'monster');
    g.created = new Set(); g.placed = new Set(); g.createdType = {}; g.createdId = {}; g.consumed = new Set();
    const mk = g.makeCard.bind(g); g.makeCard = (id, up) => { const c = mk(id, up); g.created.add(c.uid); g.createdType[c.uid] = c; g.createdId[c.uid] = id; return c; };
    try {
      await g.start(); check(g, 'start');
      let turns = 0;
      while (!g.over && turns++ < 60) {
        for (let p = 0; p < 40 && !g.over; p++) {
          const ok = g.hand.filter((c) => g.canPlay(c)); if (!ok.length) break;
          const c = run.rng.misc.pick(ok); const d = HD.CARDS[c.id];
          await g.playCard(c, d.target === 'enemy' ? g.randomEnemy() : null); if (!g.over) check(g, 'after ' + c.id);
        }
        if (!g.over) { await g.endTurn(); if (!g.over) check(g, 'endTurn'); }
      }
      if (turns > 59) bump('combat did not finish in 60 turns: ' + enc);
    } catch (e) { bump('EXCEPTION ' + enc + ': ' + e.message.slice(0, 80)); }
  }
  console.log('problems:', problems.size ? Object.fromEntries([...problems].sort((a, b) => b[1] - a[1]).slice(0, 25)) : 'none');
  const missing = []; const seen = new Set(Object.keys(moveUse));
  for (const [id, m] of Object.entries(HD.MON)) for (const mv of Object.keys(m.moves)) if (!seen.has(id + ':' + mv)) missing.push(id + ':' + mv);
  console.log('enemy moves never executed:', missing.length ? missing.join(', ') : 'none');
})();

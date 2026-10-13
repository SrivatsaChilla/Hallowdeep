// The damage preview (src/preview.js). What it shows must be exactly what then happens; it may leave out only what
// hangs on the order of a draw pile or on chance (and must say so); and it must never change the real fight or move
// the card numbers that co-op players have to agree on.
// Random fights (solo and co-op, every hero, extra cards and potions): every move a player could make is previewed,
// then one is really made and compared with its preview.
// Usage: node test/preview.js [fights]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const FILES = ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'coop', 'neow2', 'ascension_data', 'ascension', 'net', 'preview'];
const ctx = vm.createContext({ console, setTimeout, clearTimeout, Promise, Math });
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
const HD = ctx.HD;
HD.setVersion();
const FIGHTS = +process.argv[2] || 60;
const MAX_STEPS = 80;
const CHARS = ['OATHBURNER', 'VEILED', 'CROWNED', 'UNBURIED', 'WIREBOUND'];
const POTIONS = ['FLAME_FLASK', 'BLASTING_VIAL', 'TOXIN_FLASK', 'EXPOSING_VIAL', 'BARK_DRAUGHT', 'KNELL_DRAUGHT', 'STONE_FLASK'];
// The real fight answers prompts the way the preview's copy does, so the two can be compared exactly.
const FIRST = { choose: async (g, o) => o.from.slice(0, o.min != null ? o.min : o.n) };

const st = { fights: 0, previews: 0, checked: 0, wrong: 0, touched: 0, none: 0, hidden: 0, errors: 0 };
const read = (g) => {
  const out = {};
  for (const e of g.enemies) out[e.uid] = e.alive ? { hp: Math.max(0, e.hp), block: e.block } : { hp: 0, block: 0 };
  for (const s of g.seats) out[`p${s.index}`] = s.dead ? { hp: 0, block: 0 } : { hp: Math.max(0, s.p.hp), block: s.p.block };
  return out;
};
const changes = (a, b) => { const out = {}; for (const k of Object.keys(a)) if (b[k] && (b[k].hp !== a[k].hp || b[k].block !== a[k].block)) out[k] = b[k]; return out; };
const cardName = (seat, uid) => { const c = seat.hand.concat(seat.discard, seat.ash, seat.draw).find((x) => x.uid === uid); return c ? HD.CARDS[c.id].name : '?'; };

async function fight(i) {
  const rng = HD.makeRng(HD.hashSeed(`preview${i}`));
  const k = 1 + (i % 3);
  const runs = Array.from({ length: k }, (_, j) => {
    const r = new HD.Run(`pv${i}:${j}`, rng.pick(CHARS), 0, { party: k });
    for (let n = 0; n < 8; n++) { const d = rng.pick(r.pool()); r.addCard(d.id, rng.next() < 0.4); }
    r.potions = [rng.pick(POTIONS), rng.pick(POTIONS), rng.pick(POTIONS)];
    r.act = 1 + (i % 3);
    return r;
  });
  const pool = rng.pick(['weak', 'normal', 'elite', 'boss']);
  const kind = pool === 'weak' || pool === 'normal' ? 'monster' : pool;
  const g = new HD.Combat(runs[0], rng.pick(HD.encPool(pool, runs[0].act)), FIRST, kind);
  for (const r of runs.slice(1)) g.addSeat(r);
  await g.start();
  st.fights++;
  for (let step = 0; step < MAX_STEPS && !g.over; step++) {
    const seat = g.seats.find((s) => !s.dead && !s.ready);
    if (!seat) break;
    const moves = g.asSeat(seat, () => {
      const out = [];
      for (const c of g.hand) {
        if (!g.canPlay(c)) continue;
        const targets = HD.CARDS[c.id].target === 'enemy' ? g.alive() : [null];
        for (const t of targets) out.push({ k: 'play', card: c.uid, target: t ? t.uid : undefined });
      }
      g.run.potions.forEach((id, slot) => {
        if (id && g.canUsePotion(slot)) for (const t of HD.POTIONS[id].target === 'enemy' ? g.alive() : [null]) out.push({ k: 'potion', slot, target: t ? t.uid : undefined });
      });
      return out;
    });
    const pv = [];
    for (const a of moves) {
      const hash = HD.fightHash(g), uid = HD.uidPeek();
      pv.push(await HD.preview(g, seat.index, a));
      st.previews++;
      if (HD.fightHash(g) !== hash || HD.uidPeek() !== uid) { st.touched++; console.error(`fight ${i}: a preview changed the real fight`, JSON.stringify(a)); }
    }
    // Make one move for real (sometimes end the turn instead) and compare it with its preview.
    const j = moves.length && rng.next() < 0.85 ? rng.int(moves.length) : -1;
    if (j < 0) { await g.act(seat.index, { k: 'end' }); continue; }
    const name = moves[j].k === 'play' ? cardName(seat, moves[j].card) : seat.run.potions[moves[j].slot];
    const before = read(g);
    await g.act(seat.index, moves[j]);
    const got = changes(before, read(g));
    if (!pv[j]) { st.none++; continue; }
    st.checked++;
    const { out, hidden } = pv[j];
    if (hidden) st.hidden++;
    // Everything shown happens exactly; anything not shown was hidden on purpose.
    const shownRight = Object.keys(out).every((k) => JSON.stringify(got[k]) === JSON.stringify(out[k]));
    const missing = Object.keys(got).filter((k) => !out[k]);
    if (!shownRight || (missing.length && !hidden)) {
      st.wrong++;
      if (st.wrong <= 8) console.error(`fight ${i} (${g.encId}, ${k} players): ${name} ${JSON.stringify(moves[j])}\n  preview ${JSON.stringify(pv[j])}\n  real    ${JSON.stringify(got)}`);
    }
  }
}

(async () => {
  for (let i = 0; i < FIGHTS; i++) {
    try { await fight(i); } catch (e) { st.errors++; console.error(`fight ${i}:`, e.stack.split('\n').slice(0, 5).join('\n')); if (st.errors > 3) break; }
  }
  console.log(JSON.stringify(st));
  if (st.wrong || st.touched || st.errors || !st.checked) process.exitCode = 1;
})();

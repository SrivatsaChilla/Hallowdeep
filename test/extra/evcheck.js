// Compares every number in each event's options (both ends of random ranges) with the source data.
const _path = require('path');
const _ROOT = _path.join(__dirname, '..', '..');
const fs = require('fs'), vm = require('vm');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core','cards','potions','monsters','relics','versions','combat','run','events','act2','act3','colorless','enchants','events2','ancients','silent','regent_data','regent','orbs','defect_data','defect','osty','necro_data','necro','coop','neow2','ascension_data','ascension']) vm.runInContext(fs.readFileSync(_path.join(_ROOT, 'src') + '/'+f+'.js','utf8'), ctx);
const HD = ctx.HD;
const map = JSON.parse(fs.readFileSync(_path.join(_ROOT, 'dev', 'namemap.json'))).events;
const data = Object.fromEntries(JSON.parse(fs.readFileSync(_path.join(process.env.CODEX_STABLE || _path.join(_ROOT, '..', 'spire-codex', 'data', 'eng'), 'events.json'))).map((e) => [e.id, e]));
const nums = (s) => (s || '').replace(/\[[^\]]*\]/g, ' ').match(/\d+/g) || [];
let bad = 0;
for (const [orig, ours] of Object.entries(map)) {
  const e = data[orig], d = HD.EVENTS[ours];
  const want = new Set();
  for (const p of e.pages || []) for (const o of p.options || []) if (!/Enchant|Colorless/.test(o.description)) nums(o.description).forEach((n) => want.add(n));
  const have = new Set();
  const run = new HD.Run('ev'); run.gold = 999; run.hp = 20;
  for (const pick of ['lo', 'hi']) {
    const rr = { range: (a, b) => (pick === 'lo' ? a : b), pick: (xs) => xs[0], next: () => 0.5 };
    const v = d.roll ? d.roll(run, rr) : {};
    for (let h = 0; h < 9; h++) {
      if ('holds' in v) v.holds = h;
      for (const p of Object.values(d.pages)) for (const o of p.options || []) {
        if (/Enchant|Colorless/.test(o.desc(v, run))) continue;
        nums(o.desc(v, run)).forEach((n) => have.add(n));
        if (o.lock) { run.gold = 0; nums(o.lock(run, v)).forEach((n) => have.add(n)); run.gold = 999; }
      }
    }
  }
  const missing = [...want].filter((n) => !have.has(n)), extra = [...have].filter((n) => !want.has(n));
  if (missing.length || extra.length) { bad++; console.log(`${ours.padEnd(15)} missing [${missing}] extra [${extra}]`); }
}
console.log(Object.keys(map).length, 'events checked,', bad, 'with differences');

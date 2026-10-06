// Parity check against a Spire Codex export: card numbers, monster HP and attacks, and the numbers in relic and potion text.
// Usage: node dev/verify.js /path/to/codex/data-beta/v0.111.0/eng   (the game follows v0.111 only)
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = process.argv[2];
if (!dir) { console.log('usage: node dev/verify.js <codex data/eng dir>'); process.exit(1); }
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'coop', 'neow2', 'ascension_data', 'ascension']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx);
const HD = ctx.HD;
HD.setVersion();
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'namemap.json')));
const load = (n) => Object.fromEntries(JSON.parse(fs.readFileSync(path.join(dir, n + '.json'))).map((x) => [x.id, x]));
const codexCards = load('cards'), codexMons = load('monsters'), codexRelics = load('relics'), codexPots = load('potions');
const KEY = { Damage: 'dmg', Block: 'blk', HpLoss: 'hp', Energy: 'en', Cards: 'draw', Vulnerable: 'vul', Strength: 'str', Heal: 'heal', MaxHp: 'mhp', Repeat: 'hits',
  StrengthPower: 'str', CrimsonMantlePower: 'blk', CrueltyPower: 'pct', Increase: 'inc', StrengthLoss: 'loss', CalculationBase: 'base', CalculationExtra: 'per',
  Weak: 'weak', Poison: 'tox', Dexterity: 'dex', Shivs: 'shivs', ExtraDamage: 'per', AccuracyPower: 'amt', PhantomBladesPower: 'amt', SpeedsterPower: 'amt', ThornsPower: 'amt',
  EnvenomPower: 'amt', SerpentFormPower: 'amt', AfterimagePower: 'amt', PoisonPerTurn: 'amt', Accelerant: 'amt', CorrosiveWave: 'amt', StranglePower: 'amt', IntangiblePower: 'n', Skills: 'n', OutbreakPower: 'amt', RetainAmount: 'n' };
const UPKEY = { damage: 'dmg', block: 'blk', energy: 'en', cards: 'draw', vulnerable: 'vul', strength: 'str', heal: 'heal', maxhp: 'mhp', repeat: 'hits',
  strengthpower: 'str', crimsonmantlepower: 'blk', crueltypower: 'pct', increase: 'inc', strengthloss: 'loss', calculationbase: 'base', calculationextra: 'per',
  weak: 'weak', poison: 'tox', dexterity: 'dex', shivs: 'shivs', extradamage: 'per', accuracypower: 'amt', phantombladespower: 'amt', thornspower: 'amt', envenompower: 'amt',
  serpentformpower: 'amt', poisonperturn: 'amt', accelerant: 'amt', corrosivewave: 'amt', stranglepower: 'amt', intangiblepower: 'n', skills: 'n', outbreakpower: 'amt', retainamount: 'n' };
let bad = 0, checked = 0, gaps = 0;
const fail = (m) => { bad++; console.log('MISMATCH', m); };
for (const [orig, ours] of Object.entries(map.cards)) {
  const c = codexCards[orig], d = HD.CARDS[ours];
  if (!c || !d) continue;
  checked++;
  if (typeof d.cost === 'number' && c.cost !== d.cost) fail(`${ours} cost ${d.cost} vs ${c.cost}`);
  if (c.upgrade && c.upgrade.cost !== undefined && d.upCost !== c.upgrade.cost) fail(`${ours} upgraded cost ${d.upCost} vs ${c.upgrade.cost}`);
  for (const [k, ok] of Object.entries(KEY)) if (c.vars && c.vars[k] !== undefined && d.v[ok] !== undefined && d.v[ok] !== c.vars[k]) fail(`${ours} ${ok} ${d.v[ok]} vs ${c.vars[k]}`);
  for (const [k, ok] of Object.entries(UPKEY)) if (c.upgrade && c.upgrade[k] && d.up[ok] !== undefined && d.up[ok] !== +c.upgrade[k]) fail(`${ours} +${ok} ${d.up[ok]} vs ${c.upgrade[k]}`);
}
for (const [orig, ours] of Object.entries(map.monsters)) {
  const m = codexMons[orig], d = HD.MON[ours];
  if (!m || !d) continue;
  checked++;
  if (d.gap === 'hp' && m.min_hp == null) { gaps++; } else if (m.min_hp !== d.hp[0] || (m.max_hp || m.min_hp) !== d.hp[1]) fail(`${ours} hp ${d.hp} vs ${m.min_hp}-${m.max_hp}`);
  const ourAtk = [...new Set(Object.values(d.moves).filter((x) => x.atk != null).map((x) => `${x.atk}x${x.hits || 1}`))].sort();
  const theirAtk = [...new Set(m.moves.filter((x) => x.damage).map((x) => `${x.damage.normal}x${x.damage.hit_count || 1}`))].sort();
  if (d.gap === 'attacks' && !theirAtk.length) gaps++; else if (JSON.stringify(ourAtk) !== JSON.stringify(theirAtk)) fail(`${ours} attacks ${ourAtk} vs ${theirAtk}`);
}
// Relic and potion text: every number in the source text must appear in ours (ordinal words aside).
const nums = (s) => (s || '').replace(/\[(?:energy|star):(\d+)\]/g, ' $1 ').replace(/\[[^\]]*\]/g, ' ').replace(/(\d+)(st|nd|rd|th)\b/g, '$1').match(/\d+/g) || [];
const textCheck = (kind, table, src, ours) => {
  for (const [orig, id] of Object.entries(table)) {
    const x = src[orig], d = ours[id];
    if (!x || !d) { if (!d) fail(`${kind} ${id} missing`); continue; }
    checked++;
    // The source writes the Energy or Star icon right after a number (or as a plain word) in a few texts, which adds a number.
    const ICON_REPEAT = { SPIKED_GAUNTLETS: [1], GALACTIC_DUST: [1], MINI_REGENT: [1] };
    const raw = nums(x.description); for (const n of ICON_REPEAT[orig] || []) raw.splice(raw.indexOf(String(n)), 1);
    const want = raw.sort().join(','), have = nums(d.text).sort().join(',');
    if (want !== have) fail(`${kind} ${id}: [${have}] vs [${want}]`);
  }
};
textCheck('relic', map.relics, codexRelics, HD.RELICS);
textCheck('potion', map.potions, codexPots, HD.POTIONS);
// Rarity and cost are part of the balance too.
for (const [orig, ours] of Object.entries(map.cards)) {
  const c = codexCards[orig], d = HD.CARDS[ours];
  if (!c || !d || !['Common', 'Uncommon', 'Rare'].includes(c.rarity)) continue;
  if (c.rarity !== d.rarity) fail(`${ours} rarity ${d.rarity} vs ${c.rarity}`);
}
console.log(`${checked} entries checked, ${bad} mismatches, ${gaps} known data gaps (card set: ${HD.version})`);

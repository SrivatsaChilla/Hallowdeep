const _path = require('path');
const _ROOT = _path.join(__dirname, '..', '..');
const fs = require('fs'), vm = require('vm');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core','cards','potions','monsters','relics','versions','combat','run','events','act2','act3','colorless','enchants','events2','ancients','silent','regent_data','regent','orbs','defect_data','defect','neow2','ascension_data','ascension']) vm.runInContext(fs.readFileSync(_path.join(_ROOT, 'src') + '/'+f+'.js','utf8'), ctx);
const HD = ctx.HD; const ver = process.argv[3] || '0.111'; HD.setVersion(ver);
const map = JSON.parse(fs.readFileSync(_path.join(_ROOT, 'dev', 'namemap.json'))).cards;
const data = Object.fromEntries(JSON.parse(fs.readFileSync((process.argv[2] || process.env.CODEX_BETA || _path.join(_ROOT, '..', 'spire-codex', 'data-beta', 'v0.111.0', 'eng')) + '/cards.json')).map((c) => [c.id, c]));
const KW = { Exhaust: 'Burn', Ethereal: 'Fleeting', Innate: 'Opening', Unplayable: 'Unplayable', Eternal: 'Eternal', Retain: 'Retain', Sly: 'Furtive' };
const TT = { AnyEnemy: 'enemy', AllEnemies: 'all', Self: 'self', None: 'self', AnyAlly: 'ally', AllAllies: 'ally' };
let bad = 0, n = 0;
for (const [orig, ours] of Object.entries(map)) {
  const c = data[orig], d = HD.CARDS[ours]; if (!c || !d || d.coop) continue; n++;
  const want = (c.keywords || []).filter((k) => KW[k]).map((k) => KW[k]).sort().join(',');
  const have = (d.kw || []).slice().sort().join(',');
  if (want !== have) { bad++; console.log('KEYWORD', ours, 'ours [' + have + '] data [' + want + ']'); }
  if (c.target && TT[c.target] && d.target && TT[c.target] !== d.target && d.type !== 'Power') { bad++; console.log('TARGET', ours, 'ours', d.target, 'data', c.target); }
  if (c.type && c.type !== d.type) { bad++; console.log('TYPE', ours, d.type, c.type); }
  if (c.upgrade && c.upgrade.keywords) console.log('UPG-KW', ours, JSON.stringify(c.upgrade.keywords), 'ours upKw', JSON.stringify(d.upKw));
}
console.log(n, 'cards compared,', bad, 'differences');
console.log('target values in data:', [...new Set(Object.values(data).map((c) => c.target))]);

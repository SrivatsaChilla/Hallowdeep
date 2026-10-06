// Plays each card in a controlled combat and prints what actually happened next to its text.
const _path = require('path');
const _ROOT = _path.join(__dirname, '..', '..');
const fs = require('fs'), vm = require('vm');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core','cards','potions','monsters','relics','versions','combat','run','events','act2','act3','colorless','enchants','events2','ancients','silent','regent_data','regent','orbs','defect_data','defect','osty','necro_data','necro','neow2','ascension_data','ascension','names','naming']) vm.runInContext(fs.readFileSync(_path.join(_ROOT, 'src') + '/'+f+'.js','utf8'), ctx);
const HD = ctx.HD; HD.setVersion(process.argv[2] || '0.111'); HD.setNames('original');
const F = { d: (n) => n, b: (n) => n };
const strip = (s) => (s || '').replace(/<[^>]+>/g, '');
const snap = (g, e) => ({ eh: e.hp, eb: e.block, epw: JSON.stringify(e.pw), ph: g.p.hp, pb: g.p.block, en: g.energy, ppw: JSON.stringify(g.p.pw), hand: g.hand.map(c=>c.id), draw: g.draw.length, disc: g.discard.map(c=>c.id), ash: g.ash.length, maxhp: g.p.maxHp });
const diffPw = (a, b) => { const A = JSON.parse(a), B = JSON.parse(b), out = []; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if ((A[k]||0) !== (B[k]||0)) out.push(`${k}${(B[k]||0)-(A[k]||0)>=0?'+':''}${(B[k]||0)-(A[k]||0)}`); return out.join(','); };
(async () => {
  const ids = Object.keys(HD.CARDS).filter((id) => ['oathburner', process.env.COLOR || 'oathburner'].includes(HD.CARDS[id].color) && (process.env.COLOR ? HD.CARDS[id].color === process.env.COLOR : true) && !HD.CARDS[id].coop && (!HD.CARDS[id].only || HD.CARDS[id].only === HD.version));
  const lo = +process.argv[3] || 0, hi = +process.argv[4] || ids.length;
  for (const id of ids.slice(lo, hi)) {
    const d = HD.CARDS[id];
    for (const up of [false]) {
      const run = new HD.Run('bt' + id, process.env.COLOR === 'veiled' ? 'VEILED' : 'OATHBURNER'); const g = new HD.Combat(run, 'GNAWLET_WEAK', HD.autoUI, 'monster'); await g.start();
      const e = g.enemies[0]; e.hp = e.maxHp = 999; e.block = 0; e.pw = {}; g.p.hp = 60; g.p.block = 0; g.p.pw = {};
      const c = g.makeCard(id, up);
      g.hand = [c, g.makeCard('CUT'), g.makeCard('CUT'), g.makeCard('BRACE'), g.makeCard('WILDFIRE')];
      g.draw = Array.from({ length: 10 }, (_, i) => g.makeCard(i % 2 ? 'CUT' : 'BRACE'));
      g.discard = [g.makeCard('BRACE'), g.makeCard('CRACK'), g.makeCard('OPEN_VEIN')];
      g.ash = [g.makeCard('CUT'), g.makeCard('CUT')]; g.energy = 10; g.t = g.freshTurn(); g.turn = 1; g.lostHpTimes = 0;
      const before = snap(g, e);
      let err = '';
      try { await g.playCard(c, d.target === 'enemy' ? e : null); } catch (x) { err = 'ERR ' + x.message; }
      const a = snap(g, e);
      const cost = g.costOf ? '' : '';
      const obs = [];
      if (a.eh !== before.eh) obs.push(`enemy ${a.eh - before.eh}`);
      if (a.eb) obs.push(`enemyBlock ${a.eb}`);
      const ep = diffPw(before.epw, a.epw); if (ep) obs.push(`enemyPw ${ep}`);
      if (a.ph !== before.ph) obs.push(`hp ${a.ph - before.ph}`);
      if (a.maxhp !== before.maxhp) obs.push(`maxhp +${a.maxhp - before.maxhp}`);
      if (a.pb) obs.push(`block ${a.pb}`);
      const pp = diffPw(before.ppw, a.ppw); if (pp) obs.push(`pw ${pp}`);
      obs.push(`energy ${before.en - a.en >= 0 ? '-' : '+'}${Math.abs(before.en - a.en)} net`);
      const dh = a.hand.length - (before.hand.length - 1); if (dh) obs.push(`hand ${dh >= 0 ? '+' : ''}${dh}`);
      if (a.draw !== before.draw) obs.push(`draw ${a.draw - before.draw}`);
      if (a.ash !== before.ash) obs.push(`ash +${a.ash - before.ash}`);
      const dd = a.disc.length - before.disc.length; obs.push(`disc ${dd >= 0 ? '+' : ''}${dd}`);
      console.log(`${(HD.ORIGINAL.cards[id] || d.name).padEnd(17)} c${String(d.cost).padEnd(2)} | ${strip(d.text(HD.vals({ id, up }), F, { id, up }, null)).slice(0, 96)}\n${''.padEnd(22)}=> ${err || obs.join(' | ')}`);
    }
  }
})();

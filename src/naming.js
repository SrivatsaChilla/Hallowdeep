// Switches displayed names between HallowDeep's own and the original game's. Numbers and rules never change.
(function () {
  const HD = globalThis.HD;
  const O = HD.ORIGINAL;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Plurals translate too ("3 Phantasms" becomes "3 Apparitions").
  const re = new RegExp(`\\b(${Object.keys(O.text).sort((a, b) => b.length - a.length).map(esc).join('|')})(s|es)?\\b`, 'g');
  const plural = (w) => (/(s|x|z|ch|sh)$/.test(w) ? `${w}es` : `${w}s`);
  // Saves the HallowDeep value of a field the first time it is read. Always call it before overwriting.
  const base = (o, k) => { const hk = `${k}HD`; if (!(hk in o)) o[hk] = o[k]; return o[hk]; };
  const sub = (s) => (HD.nameMode === 'original' && typeof s === 'string' ? s.replace(re, (m, w, pl) => (pl ? plural(O.text[w]) : O.text[w])) : s);
  const wrap = (f) => (HD.nameMode === 'original' ? (...a) => sub(f(...a)) : f);
  HD.sub = sub;
  HD.setNames = function (mode) {
    HD.nameMode = mode === 'original' ? 'original' : 'hollowdeep';
    const on = HD.nameMode === 'original';
    for (const [id, d] of Object.entries(HD.CARDS)) {
      const n = base(d, 'name');
      d.name = (on && O.cards[id]) || n;
      if (typeof base(d, 'text') === 'function') d.text = wrap(d.textHD);
    }
    for (const [id, d] of Object.entries(HD.MON)) {
      const n = base(d, 'name');
      d.name = (on && O.monsters[id]) || n;
      for (const [mk, m] of Object.entries(d.moves)) { const mn = base(m, 'name'); m.name = (on && O.moves[id] && O.moves[id][mk]) || mn; }
    }
    for (const [id, d] of Object.entries(HD.ENC)) { const n = base(d, 'name'); d.name = (on && O.encounters[id]) || n; }
    for (const [id, d] of Object.entries(HD.EVENTS || {})) { const n = base(d, 'name'); d.name = (on && O.events[id]) || n; }
    for (const [kind, table] of [['relics', HD.RELICS], ['potions', HD.POTIONS]]) {
      for (const [id, d] of Object.entries(table)) { const n = base(d, 'name'); d.name = (on && O[kind][id]) || n; d.text = sub(base(d, 'text')); }
    }
    for (const [k, p] of Object.entries(HD.PW)) { const n = base(p, 'n'); p.n = (on && O.powers[k]) || sub(n); p.d = wrap(base(p, 'd')); }
    if (!HD.TERMS_HD) HD.TERMS_HD = HD.TERMS;
    HD.TERMS = on ? Object.fromEntries(Object.entries(HD.TERMS_HD).map(([k, v]) => [sub(k), sub(v)])) : HD.TERMS_HD;
    HD.CHAR_NAMES = on ? { OATHBURNER: 'Ironclad', VEILED: 'Silent', CROWNED: 'Regent' } : { OATHBURNER: 'Oathburner', VEILED: 'The Veiled', CROWNED: 'The Crowned' };
    HD.CHAR = HD.CHAR_NAMES.OATHBURNER;
    HD.ACT_NAMES = on ? { 1: 'Overgrowth', 2: 'Hive', 3: 'Glory' } : { 1: 'The Rootworks', 2: 'The Waxen Hive', 3: 'The Gilded Court' };
    HD.ACT = HD.ACT_NAMES[1];
  };
})();

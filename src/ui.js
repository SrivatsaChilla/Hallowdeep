// UI: renders screens from state, patches the DOM in place, and animates what changed.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const S = {
    ascBy: (() => { try { return JSON.parse(localStorage.getItem('hollowdeep.ascChoice')) || {}; } catch (e) { return {}; } })(),
    screen: 'title', run: null, g: null, sel: null, selPotion: null, busy: false, overlay: null, acting: null, showLog: false,
    mouse: null, dragUid: null, hidden: new Set(), gone: new Set(), dying: new Set(), prevHand: new Set(), prevEnergy: null,
    bannerTurn: 0, bannerEnemy: 0, suppressClick: false,
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel) => document.querySelector(sel);
  const T = (s) => HD.sub(s);
  const actName = () => HD.ACT_NAMES[(S.run && S.run.act) || 1];
  // Keyword highlighting follows the active name set.
  let kwCache = null;
  function kw() {
    if (kwCache && kwCache.mode === HD.nameMode) return kwCache;
    const of = { [T('Burns')]: T('Burn'), [T('Burned')]: T('Burn'), [T('Ash pile')]: T('Burn') };
    const words = [...Object.keys(of), ...Object.keys(HD.TERMS)].sort((a, b) => b.length - a.length);
    kwCache = { mode: HD.nameMode, of, src: `\\b(${words.join('|')})\\b` };
    return kwCache;
  }
  const kwRe = () => new RegExp(kw().src, 'g');

  // ---------- glossary: everything a description can mention ----------
  // Keywords, enchantments, potions, relics, and cards that are only ever given (tokens, statuses, curses, Ancient and event cards).
  let glossCache = null;
  function glossary() {
    if (glossCache && glossCache.mode === HD.nameMode) return glossCache;
    const map = new Map();
    const add = (name, e) => { if (name && name.length >= 3 && !map.has(name)) map.set(name, e); };
    for (const d of Object.values(CARDS)) if (!d.coop && (['token', 'status', 'curse', 'event', 'quest'].includes(d.color) || d.rarity === 'Ancient')) add(d.name, { kind: 'card', id: d.id, name: d.name });
    for (const k of Object.keys(HD.TERMS)) add(k, { kind: 'term', name: k, body: HD.TERMS[k] });
    for (const [alias, k] of Object.entries(kw().of)) if (HD.TERMS[k]) add(alias, { kind: 'term', name: k, body: HD.TERMS[k] });
    for (const e of Object.values(HD.ENCH)) add(T(e.name), { kind: 'ench', name: T(e.name), body: T(e.text('X')) });
    // Relic and potion texts are already in the current names (the name switch rewrites them); don't translate twice.
    for (const d of Object.values(HD.POTIONS)) add(d.name, { kind: 'potion', id: d.id, name: d.name, body: d.text });
    for (const d of Object.values(HD.RELICS)) if (d.text) add(d.name, { kind: 'relic', id: d.id, name: d.name, body: d.text });
    const names = [...map.keys()].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Plurals count too ("Add 3 Shivs").
    glossCache = { mode: HD.nameMode, map, re: new RegExp(`(?<![\\w'])(${names.join('|')})(?:s|es)?(?![\\w'])`, 'g') };
    return glossCache;
  }
  function glossIn(text, own) {
    const { map, re } = glossary();
    const out = [], seen = new Set(own ? [own] : []);
    const plain = String(text || '').replace(/<[^>]+>/g, ' ');
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(plain))) {
      const e = map.get(m[1]);
      if (!e || seen.has(e.name)) continue;
      seen.add(e.name); out.push(e);
      // A mentioned card brings its own keywords along (Apotheosis: Innate, Exhaust).
      if (e.kind === 'card') for (const k of HD.kwOf({ id: e.id, up: false }).map(T)) if (HD.TERMS[k] && !seen.has(k)) { seen.add(k); out.push({ kind: 'term', name: k, body: HD.TERMS[k] }); }
    }
    return out;
  }
  const GLOSS_KIND = { term: '', ench: 'Enchantment', potion: 'Potion', relic: 'Relic', card: 'Card' };
  function glossCardText(id) {
    const d = CARDS[id];
    const kws = HD.kwOf({ id, up: false }).map(T).join('. ');
    let body = '';
    try { body = d.text ? d.text(HD.vals({ id, up: false }), { d: (n) => n, b: (n) => n }, { id, up: false }, null).replace(/<[^>]+>/g, '') : ''; } catch (e) { body = ''; }
    return [kws && `${kws}.`, body].filter(Boolean).join(' ') || 'Unplayable.';
  }
  // Rows of definitions; with faces, mentioned cards are drawn as cards.
  function glossRows(entries, faces) {
    const rows = entries.map((e) => {
      if (e.kind === 'card' && faces) return '';
      const body = e.kind === 'card' ? glossCardText(e.id) : e.body;
      return `<p class="gl"><b>${esc(e.name)}</b>${GLOSS_KIND[e.kind] ? ` <small>${GLOSS_KIND[e.kind]}</small>` : ''} ${esc(body)}</p>`;
    }).join('');
    const cards = faces ? entries.filter((e) => e.kind === 'card').map((e) => cardHTML({ uid: `gl-${e.id}`, id: e.id, up: false }, { noTips: true, cls: 'tipcard' })).join('') : '';
    return `${cards ? `<div class="gl-cards">${cards}</div>` : ''}${rows}`;
  }

  // ---------- icons ----------
  const ICON = {
    attack: '<path d="M2 14 11 5l2-2v2l-2 2-7 7z M9 3l4 4" />',
    defend: '<path d="M8 1l6 2v5c0 3.5-3 6-6 7-3-1-6-3.5-6-7V3z" />',
    buff: '<path d="M8 2l6 7h-4v5H6V9H2z" />',
    debuff: '<path d="M8 14 2 7h4V2h4v5h4z" />',
    summon: '<path d="M7 2h2v5h5v2H9v5H7V9H2V7h5z" />',
    sleep: '<path d="M3 3h7L3 12h7M10 6h4l-4 5h4" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    stun: '<path d="M8 1l2 5 5 .5-4 3.5 1.5 5L8 12l-4.5 3L5 10 1 6.5 6 6z" />',
    unknown: '<text x="8" y="13" text-anchor="middle" font-size="13" font-weight="700">?</text>',
  };
  const icon = (k) => `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">${ICON[k] || ICON.unknown}</svg>`;
  const NODE_ICON = HD.NODE_ICONS; // map node icons live in sigils.js
  const NODE_LABEL = { monster: 'Fight', elite: 'Elite', rest: 'Rest site', shop: 'Shop', treasure: 'Treasure', unknown: 'Unknown', boss: 'Boss' };

  // Abstract creature sigil, derived from the monster id. Original art stand-in.
  function sigil(id, size) {
    let h = HD.hashSeed(id);
    const sides = 3 + (h % 5); h >>>= 3;
    const rot = h % 360; h >>>= 9;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = ((rot + (i * 360) / sides) * Math.PI) / 180;
      const r = i % 2 && sides > 4 ? 30 : 40;
      pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
    }
    const eyes = 1 + (h % 3); h >>>= 2;
    let inner = '';
    for (let i = 0; i < eyes; i++) inner += `<circle cx="${50 + (i - (eyes - 1) / 2) * 14}" cy="${46 + (h % 7)}" r="${4 + (h % 3)}" class="eye"/>`;
    return `<svg class="sigil" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" style="--d:${-(HD.hashSeed(id + 'd') % 3000)}ms"><polygon points="${pts.join(' ')}" class="body"/>${inner}</svg>`;
  }
  // The playable characters' emblems live in sigils.js.
  const playerSigil = (size, charId) => {
    const id = HD.SIGILS[charId || (S.run && S.run.charId)] ? charId || S.run.charId : 'OATHBURNER';
    return `<svg class="sigil me ${id.toLowerCase()}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${HD.SIGILS[id]}</svg>`;
  };

  const GLINT = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.5 5.6 6.1.6-4.6 4.1 1.3 6-5.3-3.1-5.3 3.1 1.3-6L1.4 7.7l6.1-.6z"/></svg>';
  // ---------- Cells (the Defect's Orbs): empty slots on the left, the next to be Released on the right ----------
  const CELL_ICON = {
    BOLT: '<path d="M11 1 4 11h5l-2 8 8-11h-5z"/>', RIME: '<path d="M10 1v18M2 5.5l16 9M2 14.5l16-9" stroke-width="2.2" fill="none"/>',
    MURK: '<path d="M13 2a8 8 0 1 0 5 13A7 7 0 0 1 13 2z"/>', FLUX: '<path d="M10 1c4 5 7 7 7 11a7 7 0 0 1-14 0c0-3 2-5 3-7 1 2 2 3 4 3-1-3-1-5 0-7z"/>',
    SHARD: '<path d="M10 1l7 9-7 9-7-9z"/>',
  };
  function cellRow(g) {
    if (!g.orbSlots && !g.orbs.length) return '';
    let out = '';
    for (let i = Math.max(g.orbSlots, g.orbs.length) - 1; i >= 0; i--) {
      const o = g.orbs[i];
      if (!o) { out += `<span class="cell empty" data-key="cellslot-${i}" aria-label="Empty ${T('Cell')} Slot"></span>`; continue; }
      const d = HD.ORBS[o.id], pass = g.orbAmt(o, 'pass'), rel = g.orbAmt(o, 'rel');
      out += `<span class="cell k-${o.id.toLowerCase()}" data-key="cell-${o.uid}" tabindex="0" ${tip(T(d.name), T(d.text(pass, rel)), T('Cell'))} aria-label="${esc(T(d.name))}: passive ${pass}, ${T('Release')} ${rel}"><svg viewBox="0 0 20 20" aria-hidden="true">${CELL_ICON[o.id]}</svg><b>${pass}</b><i>${rel}</i></span>`;
    }
    return `<div class="cellrow" data-key="cells" aria-label="${T('Cells')}">${out}</div>`;
  }

  // ---------- Clutch (the Necrobinder's Osty) ----------
  const HAND = '<path d="M6.5 19V11L4.2 7.4a1.3 1.3 0 0 1 2.2-1.4L8 8.4V3a1.3 1.3 0 0 1 2.6 0v5V2a1.3 1.3 0 0 1 2.6 0v6V3.2a1.3 1.3 0 0 1 2.6 0V11c0 5-2 8-5.8 8z"/>';
  function clutchBox(g) {
    if (!g.osty && S.run.charId !== 'UNBURIED') return '';
    const o = g.osty, up = !!(o && o.alive);
    return `<div class="clutch ${up ? '' : 'down'}" data-key="clutch" tabindex="0" ${tip(T('Clutch'), HD.TERMS[T('Clutch')] || '', up ? `${o.hp}/${o.maxHp} HP` : 'Not roused')} aria-label="${esc(T('Clutch'))}: ${up ? `${o.hp} of ${o.maxHp} HP` : 'not roused'}">
      <svg class="clutch-ico" viewBox="0 0 20 20" aria-hidden="true">${HAND}</svg>${up ? hpBar({ hp: o.hp, maxHp: o.maxHp }) : `<span class="cdown">${esc(T('Clutch'))} is down</span>`}</div>`;
  }

  // ---------- cards ----------
  function fmt(g, c) {
    const mark = (v, base) => `<span class="num ${v > base ? 'hi' : v < base ? 'lo' : ''}">${v}</span>`;
    return {
      d: (n) => (g && g.phase !== 'start' ? mark(g.atkDmg(n, null, c), n) : n),
      b: (n) => (g && g.phase !== 'start' ? mark(g.blockPreview(n, c), n) : n),
    };
  }
  function cardParts(c, g) {
    const d = CARDS[c.id];
    const kws = HD.kwOf(c);
    // Keywords printed at the top of the card, as in the original (Exhaust is printed at the bottom).
    const top = kws.filter((k) => ['Unplayable', 'Opening', 'Fleeting', 'Furtive', 'Retain', 'Eternal'].includes(k));
    // Retained for other reasons (drawn by Expertise, a Shiv under Phantom Blades): say so on the card too.
    if (!top.includes('Retain') && g && g.cardRetained && g.hand && g.hand.includes(c) && g.cardRetained(c)) top.push('Retain');
    const body = d.text ? d.text(HD.vals(c), fmt(g, c), c, g) : '';
    const bits = [];
    if (top.length) bits.push(top.map(T).join('. ') + '.');
    if (c.replay) bits.push(`Replay ${c.replay}.`);
    if (body) bits.push(body);
    if (kws.includes('Burn')) bits.push(`${T('Burn')}.`);
    // Enchantments: the name on top, any extra rules text at the bottom, both in purple.
    const en = c.ench && HD.ENCH[c.ench.id];
    if (en) {
      bits.unshift(`<span class="ench">${esc(T(en.name))}${c.ench.n && !['GOOPY', 'SOWN', 'ADROIT', 'MOMENTUM', 'SWIFT'].includes(c.ench.id) ? ' ' + c.ench.n : ''}</span>`);
      if (en.extra) bits.push(`<span class="ench">${esc(T(en.extra(c.ench.n)))}</span>`);
    }
    return bits.join(' ');
  }
  function termsIn(text) {
    const seen = new Set();
    const plain = text.replace(/<[^>]+>/g, '');
    const re = kwRe();
    let m;
    while ((m = re.exec(plain))) seen.add(kw().of[m[1]] || m[1]);
    return [...seen].filter((k) => HD.TERMS[k]);
  }
  function tips(text, own) {
    const rows = glossIn(text, own).map((e) => `<span><b>${esc(e.name)}</b> ${esc(e.kind === 'card' ? glossCardText(e.id) : e.body)}</span>`);
    return rows.length ? `<span class="tips">${rows.join('')}</span>` : '';
  }
  // Long card names shrink to fit their banner; sizes are measured once per name and screen size.
  const nameFit = new Map();
  const narrow = () => window.matchMedia('(max-width: 760px)').matches;
  // Phones: portrait or a short landscape screen. Cards lift on the first tap and play on the second.
  const compact = () => window.matchMedia('(max-width: 760px), (max-height: 520px) and (orientation: landscape)').matches;
  // Touch (or a phone-sized screen): cards are played only by dragging; a tap just lifts a card to read it.
  let lastPointer = 'mouse';
  document.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);
  const dragOnly = () => lastPointer === 'touch' || compact();
  // Name sizes depend on the card's size: hand cards on phones are smaller than cards in rewards, the shop or the deck.
  const fitKey = (name, where) => `${name}|${where || 'full'}|${innerWidth}x${innerHeight}`;
  function cardHTML(c, o = {}) {
    const d = CARDS[c.id];
    const g = o.g;
    const base = d.cost === 'X' ? 'X' : c.up && d.upCost != null ? d.upCost : d.cost;
    const cost = g ? g.costOf(c) : base;
    const costCls = typeof cost === 'number' && typeof base === 'number' ? (cost < base ? 'cheap' : cost > base ? 'dear' : '') : '';
    const text = cardParts(c, g);
    const glint = d.star == null ? null : g ? g.starCostOf(c) : d.star;
    const rar = { Basic: 'Starter', Status: 'Status', Token: 'Token', Curse: 'Curse' }[d.rarity] || d.rarity;
    const typeLine = ['Status', 'Token', 'Curse'].includes(d.rarity) ? rar : `${rar} ${d.type.toLowerCase()}`;
    const cls = ['card', `t-${d.type.toLowerCase()}`, `r-${d.rarity.toLowerCase()}`, d.color === 'colorless' ? 'col-colorless' : '', c.ench ? 'enchanted' : '', c.up ? 'up' : '', c.bound ? 'bound' : '', o.cls || ''].join(' ');
    const act = o.act ? `data-act="${o.act}" data-arg="${o.arg != null ? o.arg : c.uid}" role="button" tabindex="0"` : '';
    const label = `${d.name}${c.up ? '+' : ''}, ${typeLine}, cost ${cost == null ? 'none' : cost}${glint == null ? '' : ` and ${glint} ${T('Glint')}${glint === 1 ? '' : 's'}`}. ${text.replace(/<[^>]+>/g, '')}`;
    const name = `${d.name}${c.up ? '+' : ''}`;
    const nameCls = name.length > 16 ? 'n3' : name.length > 12 ? 'n2' : '';
    const plain = text.replace(/<[^>]+>/g, '');
    const typeWord = ['Status', 'Curse'].includes(d.rarity) ? d.rarity : d.type;
    const fit = /\bbig\b/.test(o.cls || '') ? null : nameFit.get(fitKey(name, o.dkey && /^h/.test(o.dkey) ? 'hand' : 'full'));
    return `<div class="${cls}" ${act} data-cid="${d.id}" data-up="${c.up ? 1 : 0}" ${o.dkey ? `data-key="${o.dkey}"` : ''} ${o.style ? `style="${o.style}"` : ''} aria-label="${esc(label)}">
      ${cost == null ? '' : `<span class="seal ${costCls}">${cost}</span>`}
      ${glint == null ? '' : `<span class="starseal ${typeof glint === 'number' && typeof d.star === 'number' && glint < d.star ? 'cheap' : ''}">${glint}</span>`}
      <span class="cname ${nameCls}" ${fit ? `style="font-size:${fit}px"` : ''}>${esc(name)}</span>
      <span class="cart"><img src="${HD.cardArt(d.id)}" alt="" draggable="false"></span>
      <span class="ctype">${typeWord}</span>
      <span class="ctext ${plain.length > 80 ? 'long' : ''}"><span>${text.replace(kwRe(), '<b>$1</b>')}</span></span>
      ${o.hint ? `<span class="key" aria-hidden="true">${o.hint}</span>` : ''}
      ${o.price != null ? `<span class="price ${o.sale ? 'sale' : ''}">${o.price} gold${o.sale ? ', on sale' : ''}</span>` : ''}
      ${o.noTips ? '' : tips(text, d.name)}
    </div>`;
  }

  // ---------- shared chrome ----------
  const HIDE_N = new Set(['rampart', 'rot', 'endlessCuts', 'standFirm', 'stoneStance', 'noDraw', 'noEnergy', 'keepSwinging', 'shrink', 'ringing', 'illusion', 'minion', 'duplicate', 'giga', 'surrounded', 'backAttack', 'crabRage', 'burrowed', 'imbalanced', 'escapeArtist', 'confused', 'huntingEdge', 'reflect', 'usurped', 'echoForm', 'freePower', 'boneMastery', 'grimForm', 'veilFree']);
  const info = (title, body) => `data-act="info" data-title="${esc(title)}" data-body="${esc(body)}"`;
  // Hover tooltips (mouse and keyboard focus): name, description, a small line of kind, and an optional icon.
  const tip = (title, body, kind, icon) => `data-tt="${esc(title)}" data-tb="${esc(body)}"${kind ? ` data-tk="${esc(kind)}"` : ''}${icon ? ` data-ti="${esc(icon)}"` : ''}`;
  function chips(t, inert) {
    return Object.entries(t.pw).filter(([k, v]) => HD.PW[k] && v).map(([k, v]) => {
      const m = HD.PW[k];
      return `<span class="chip ${m.t}" data-key="pw-${k}" ${inert ? '' : `${info(m.n, m.d(v))} role="button"`} tabindex="0" ${tip(m.n, m.d(v), m.t === 'debuff' ? 'Debuff' : 'Buff')}>${esc(m.n)}${HIDE_N.has(k) ? '' : ` ${v}`}</span>`;
    }).join('');
  }
  const initials = (name) => name.split(/\s+/).filter((w) => !/^(of|the|in|a)$/i.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  function belt() {
    const r = S.run;
    return `<span class="belt" aria-label="Potions">${r.potions.map((id, i) => id
      ? `<button class="vial r-${HD.POTIONS[id].rarity.toLowerCase()} ${S.selPotion === i ? 'sel' : ''}" data-key="v${i}-${id}" data-act="potion" data-arg="${i}" ${tip(HD.POTIONS[id].name, HD.POTIONS[id].text, `${HD.POTIONS[id].rarity} potion`, `potion:${id}`)} aria-label="${esc(HD.POTIONS[id].name)}"><span class="vfull">${esc(HD.POTIONS[id].name)}</span><span class="vshort" aria-hidden="true">${initials(HD.POTIONS[id].name)}</span></button>`
      : `<span class="vial empty" data-key="v${i}" aria-label="Empty potion slot"></span>`).join('')}</span>`;
  }
  function bar() {
    const r = S.run;
    const relics = r.relics.map((x) => {
      const d = HD.RELICS[x.id];
      const note = x.charges ? ` (${x.charges})` : x.counter ? ` (${x.counter})` : x.lifts ? ` (${x.lifts})` : x.used ? ' (used)' : '';
      return `<span class="relic" data-key="r-${x.id}" ${info(d.name + note, d.text)} role="button" tabindex="0" ${tip(d.name + note, d.text, `${d.rarity === 'Starter' ? 'Starter' : d.rarity} relic`, `relic:${x.id}`)}>${HD.relicIcon(x.id, 'chipicon')}${esc(d.name)}${note}</span>`;
    }).join('');
    const hp = S.g && S.screen === 'combat' ? S.g.p : r;
    return `<header class="bar" data-key="bar">
      <span class="who">${esc(HD.charName(r.charId))}</span>
      <span class="stats">${r.asc ? `<span class="ascbadge" tabindex="0" ${tip(`Ascension ${r.asc}`, HD.ASCENSIONS.slice(1, r.asc + 1).map((a, i) => `${i + 1}. ${HD.ascName(i + 1)}: ${HD.ascText(i + 1)}`).join(' '), 'Active levels')}>A${r.asc}</span>` : ''}
        <span class="stat hp"><span class="lbl">HP</span> ${hp.hp}/${hp.maxHp}</span>
        <span class="stat gold"><span class="lbl">Gold</span> ${r.gold}</span>
        <span class="stat"><span class="lbl">${T('Depth')}</span> ${r.floor}</span>
      </span>
      <button class="ghost deckbtn" data-act="pile" data-arg="deck">Deck ${r.deck.length}</button>
      <span class="runtime" data-key="runtime" title="Run time" aria-label="Run time ${fmtTime(r.playMs)}">${CLOCK}<span class="t">${fmtTime(r.playMs)}</span></span>
      <span class="inv">${belt()}<span class="relics">${relics}</span></span>
    </header>`;
  }
  const hpBar = (t) => {
    const pct = Math.max(0, (t.hp / t.maxHp) * 100).toFixed(1);
    return `<div class="hpbar"><span class="lag" style="width:${pct}%"></span><span class="fill" style="width:${pct}%"></span><span class="hptxt">${t.hp}/${t.maxHp}</span>${t.block ? `<span class="gbadge" data-key="gb">${t.block}</span>` : ''}</div>`;
  };

  // Reward lists are shared by the spoils screen and bonus pickups.
  function itemsHTML(items, list) {
    const r = S.run;
    return items.map((it, i) => {
      if (it.taken) return '';
      const arg = `${list}:${i}`;
      const key = `data-key="it-${list}-${i}"`;
      if (it.kind === 'gold') return `<button class="loot" ${key} data-act="take" data-arg="${arg}">${COIN}${r.goldPreview(it.n)} Gold</button>`;
      if (it.kind === 'relic') return `<button class="loot" ${key} data-act="take" data-arg="${arg}">${HD.relicIcon(it.id)}<span><b>${esc(HD.RELICS[it.id].name)}</b> ${esc(HD.RELICS[it.id].text)}</span></button>`;
      if (it.kind === 'potion') {
        const d = HD.POTIONS[it.id];
        const full = r.freeSlot() < 0;
        return `<button class="loot" ${key} data-act="take" data-arg="${arg}" ${full ? 'disabled' : ''}>${HD.potionIcon(it.id)}<span><b>${esc(d.name)}</b> ${esc(d.text)}${full ? ' <i>Your belt is full. Use or discard a potion from the top bar first.</i>' : ''}</span></button>`;
      }
      if (it.kind === 'cards') {
        const left = (it.n || 1) - (it.got || 0);
        return `<div class="pickgroup" ${key}><h3>${it.n > 1 ? `Add ${left} more card${left > 1 ? 's' : ''} to your deck` : 'Add one card to your deck'}</h3><div class="pickrow">${it.cards.map((c, j) => c.taken ? '' :
        cardHTML({ uid: `${arg}:${j}`, id: c.id, up: c.up, ench: c.ench }, { act: 'takecard', arg: `${arg}:${j}`, style: `--i:${j}` })).join('')}</div>
        <button class="ghost" data-act="skip" data-arg="${arg}">${it.got ? 'Done' : 'Skip these cards'}</button>
        ${r.hasRelic('DRIFT_LOG') && !it.rerolled && !it.got ? `<button class="ghost" data-act="reroll" data-arg="${arg}">Reroll (once)</button>` : ''}
        ${r.hasRelic('OLD_WING') && !it.got ? `<button class="ghost" data-act="sacrifice" data-arg="${arg}">Sacrifice these cards</button>` : ''}</div>`;
      }
      return '';
    }).join('');
  }

  // ---------- name setting ----------
  const NAME_KEY = 'hollowdeep.names';
  function namesToggle() {
    const opt = (v, label) => `<button class="seg ${HD.nameMode === v ? 'on' : ''}" data-act="names" data-arg="${v}" aria-pressed="${HD.nameMode === v}">${label}</button>`;
    return `<div class="names" role="group" aria-label="Card and enemy names">${opt('original', 'Original names')}${opt('hollowdeep', 'HallowDeep names')}</div>`;
  }
  function setNames(mode) {
    HD.setNames(mode);
    try { localStorage.setItem(NAME_KEY, HD.nameMode); } catch (e) { /* storage unavailable */ }
  }

  // ---------- run timer ----------
  const CLOCK = '<svg class="clock" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  function fmtTime(ms) {
    const t = Math.floor((ms || 0) / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }
  let lastTick = null;
  function timing() { return !!S.run && S.screen !== 'title' && S.screen !== 'end' && !document.hidden; }
  function tickTime() {
    const now = performance.now();
    if (timing()) { if (lastTick != null) S.run.playMs = (S.run.playMs || 0) + (now - lastTick); lastTick = now; } else lastTick = null;
    const el = document.querySelector('.bar .runtime');
    if (el && S.run) { const txt = fmtTime(S.run.playMs); const t = el.querySelector('.t'); if (t.textContent !== txt) { t.textContent = txt; el.setAttribute('aria-label', `Run time ${txt}`); } }
  }
  // Keep the saved run's time current when the page is hidden or closed, so Continue resumes the clock.
  function saveTime() {
    tickTime();
    if (!S.run || S.screen === 'end') return;
    try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return; const o = JSON.parse(raw); if (o.run && o.run.data) { o.run.data.playMs = S.run.playMs; localStorage.setItem(SAVE_KEY, JSON.stringify(o)); } } catch (e) { /* storage unavailable */ }
  }
  setInterval(tickTime, 500);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveTime(); else { lastTick = null; tickTime(); } });
  window.addEventListener('pagehide', saveTime);

  // ---------- Ascension progress: win a run at level N to unlock N + 1, per character ----------
  const ASC_KEY = 'hollowdeep.ascUnlocked';
  const ascUnlocked = () => { try { return JSON.parse(localStorage.getItem(ASC_KEY)) || {}; } catch (e) { return {}; } };
  const ascMax = (id) => Math.max(0, Math.min(10, ascUnlocked()[id] || 0));
  const ascChosen = (id) => Math.min(S.ascBy[id] || 0, ascMax(id));
  // Called when a run is won. Returns the newly unlocked level, or 0.
  function unlockAscension(id, won) {
    const all = ascUnlocked();
    const next = Math.min(10, won + 1);
    if (won >= 10 || (all[id] || 0) >= next) return 0;
    all[id] = next;
    try { localStorage.setItem(ASC_KEY, JSON.stringify(all)); } catch (e) { /* storage unavailable */ }
    S.ascBy[id] = next;
    try { localStorage.setItem('hollowdeep.ascChoice', JSON.stringify(S.ascBy)); } catch (e) { /* storage unavailable */ }
    return next;
  }
  function ascPicker(id) {
    const max = ascMax(id), lvl = ascChosen(id), name = HD.charName(id);
    const goal = max >= 10 ? 'Every level unlocked.' : `Win a run on ${max ? `Ascension ${max}` : 'no Ascension'} to unlock Ascension ${max + 1}.`;
    return `<div class="ascpick" data-key="asc-${id}" role="group" aria-label="Ascension for ${esc(name)}">
        <span class="lbl">Ascension</span>
        <button class="ghost" data-act="asc" data-arg="${id}:-1" aria-label="Lower Ascension for ${esc(name)}" ${lvl <= 0 ? 'disabled' : ''}>&minus;</button>
        <b class="lvl">${lvl}</b>
        <button class="ghost" data-act="asc" data-arg="${id}:1" aria-label="Raise Ascension for ${esc(name)}" ${lvl >= max ? 'disabled' : ''}>+</button>
        <span class="desc">${lvl ? `<b>${esc(HD.ascName(lvl))}</b> ${esc(HD.ascText(lvl))}${lvl > 1 ? ' Includes every level below.' : ''}` : esc(HD.ascText(0))} <span class="goal">${goal}</span></span>
      </div>`;
  }

  // ---------- screens ----------
  function titleScreen() {
    const hero = (id) => { const ch = HD.CHARS[id], rl = HD.RELICS[ch.relic];
      const lvl = ascChosen(id);
      return `<div class="herobox"><button class="hero" data-act="start" data-arg="${id}">
          ${playerSigil(84, id)}
          <span class="hname">${esc(HD.charName(id))}</span>
          <span class="hsub">${ch.hp} HP, ${ch.energy} Energy. Starts with ${esc(rl.name)}: ${esc(rl.text)}</span>
          <span class="go">Descend${lvl ? ` (A${lvl})` : ''}</span>
        </button>${ascPicker(id)}</div>`; };
    if (!S.seedDefault) S.seedDefault = S.lastSeed || Math.random().toString(36).slice(2, 8);
    return `<main class="title" data-key="scr-title">
      <h1>HallowDeep</h1>
      <p class="lede">Fight your way through ${HD.ACT} with a deck that grows as you go.</p>
      ${readSave() ? `<button class="primary continue" data-act="resume">Continue your run (${T('Depth')} ${readSave().run.data.floor})</button>` : ''}
      <div class="roster">
        ${hero('OATHBURNER')}${hero('VEILED')}${hero('CROWNED')}${hero('UNBURIED')}${hero('WIREBOUND')}
      </div>
      <label class="seed">Seed <input id="seed" value="${esc(S.seedDefault)}" spellcheck="false" autocomplete="off"></label>
      <div class="toggles">${namesToggle()}</div>
      <p class="fine">Three acts. Drag a card up to play it, or drag it onto an enemy. Keys: 1 to 0 pick a card, then 1 to 5 pick a target. E ends the turn, Esc cancels.</p>
    </main>`;
  }

  function mapScreen() {
    const r = S.run, m = r.map;
    const reach = new Set(r.reachable());
    // Rows climb from the start at the bottom to the boss at the top.
    const TOP = 150, STEP = 64;
    const X = (n) => 46 + n.c * 70 + ((HD.hashSeed(n.key + 'x') % 17) - 8);
    const Y = (n) => TOP + (m.rows - 1 - n.r) * STEP + ((HD.hashSeed(n.key + 'y') % 13) - 6);
    const W = 46 * 2 + 70 * (m.cols - 1);
    const boss = { x: W / 2, y: 76 };
    const start = { x: W / 2, y: TOP + (m.rows - 1) * STEP + 96 };
    const H = start.y + 60;
    const visited = new Set(r.path);
    let lines = '';
    for (const n of Object.values(m.nodes)) {
      if (n.r === 0) lines += `<line x1="${start.x}" y1="${start.y}" x2="${X(n)}" y2="${Y(n)}" class="${r.path[0] === n.key ? 'trod' : !r.pos ? 'next' : ''}"/>`;
      for (const k of n.next) {
        const b = m.nodes[k];
        const on = visited.has(n.key) && visited.has(k) && r.path.indexOf(k) === r.path.indexOf(n.key) + 1;
        const next = r.pos === n.key && reach.has(k);
        lines += `<line x1="${X(n)}" y1="${Y(n)}" x2="${X(b)}" y2="${Y(b)}" class="${on ? 'trod' : next ? 'next' : ''}"/>`;
      }
      if (n.r === m.rows - 1) lines += `<line x1="${X(n)}" y1="${Y(n)}" x2="${boss.x}" y2="${boss.y}" class="${r.pos === 'BOSS' && r.path.includes(n.key) ? 'trod' : r.pos === n.key ? 'next' : ''}"/>`;
    }
    const nodes = Object.values(m.nodes).map((n) => {
      const leap = reach.has(n.key) && r.pos && r.pos !== 'BOSS' && !r.map.nodes[r.pos].next.includes(n.key);
      const cls = ['node', `n-${n.type}`, reach.has(n.key) ? 'reach' : '', leap ? 'leap' : '', visited.has(n.key) ? 'visited' : '', r.pos === n.key ? 'here' : '', r.marked && r.marked.includes(n.key) ? 'marked' : ''].join(' ');
      const act = reach.has(n.key) ? `data-act="node" data-arg="${n.key}" role="button" tabindex="0"` : '';
      return `<g class="${cls}" transform="translate(${X(n)} ${Y(n)})" ${act} aria-label="${NODE_LABEL[n.type]}, row ${n.r + 1}"><circle r="17"/>${NODE_ICON[n.type]}</g>`;
    }).join('');
    const bossReach = reach.has('BOSS');
    const bossName = HD.ENC[r.boss].name;
    const bossNode = `<g class="node n-boss ${bossReach ? 'reach' : ''}" transform="translate(${boss.x} ${boss.y})" ${bossReach ? 'data-act="node" data-arg="BOSS" role="button" tabindex="0"' : ''} aria-label="Boss: ${esc(bossName)}"><circle r="28"/>${NODE_ICON.boss}</g>
      <text class="bosslbl" x="${boss.x}" y="${boss.y - 42}" text-anchor="middle">${esc(bossName)}</text>`;
    const startNode = `<g class="node n-start ${!r.pos ? 'here' : 'visited'}" transform="translate(${start.x} ${start.y})" aria-label="Start: ${esc(T('The Rootmother'))}"><circle r="24"/>${NODE_ICON.start}</g>
      <text class="startlbl" x="${start.x}" y="${start.y + 44}" text-anchor="middle">${r.act === 1 || !HD.ANCIENTS[r.ancient] ? T('The Rootmother') : T(HD.ANCIENTS[r.ancient].name)}</text>`;
    const legend = Object.entries(NODE_LABEL).filter(([k]) => k !== 'boss').map(([k, v]) =>
      `<li><svg viewBox="${k === 'boss' ? '-18 -18 36 36' : '-13 -13 26 26'}" width="24" height="24" class="n-${k}">${NODE_ICON[k]}</svg>${v}</li>`).join('');
    const relicList = r.relics.map((x) => { const d = HD.RELICS[x.id]; return `<li><b>${esc(d.name)}</b> ${esc(d.text)}</li>`; }).join('');
    return `${bar()}<main class="mapwrap" data-key="scr-map">
      <section class="map" id="mapScroll" aria-label="Map of ${actName()}">
        <h2>Act ${r.act}: ${actName()}</h2>
        <p class="hint">${r.pos ? 'Choose the next room. You climb toward the boss at the top.' : 'Choose your first room, just above the start.'}${r.relic('MOTH_BOOTS') && r.relic('MOTH_BOOTS').charges ? ` Dashed rooms are off your path; reaching one uses a ${esc(HD.RELICS.MOTH_BOOTS.name)} charge (${r.relic('MOTH_BOOTS').charges} left).` : ''}</p>
        <svg viewBox="0 0 ${W} ${H}" width="${W}" class="mapsvg">${lines}${nodes}${bossNode}${startNode}</svg>
      </section>
      <aside class="side">
        <h3>Legend</h3><ul class="legend">${legend}</ul>
        <h3>Relics</h3><ul class="rlist">${relicList}</ul>
        <h3>Names</h3>${namesToggle()}
      </aside>
    </main>`;
  }

  function foeHTML(e, g) {
    const idx = g.alive().indexOf(e);
    const live = idx >= 0;
    const it = live ? g.intentOf(e) : { kind: 'unknown', label: '' };
    let intent = '';
    if (live) {
      if (it.kind === 'attack') intent = `${icon('attack')}<span>${it.dmg}${it.hits > 1 ? `\u00d7${it.hits}` : ''}</span>${it.kinds.slice(1).map((k) => icon(k)).join('')}`;
      else intent = it.kinds ? it.kinds.map((k) => icon(k)).join('') + (it.kind === 'defend' ? `<span>${it.block}</span>` : '') : icon(it.kind);
    }
    const tip = it.name ? `${it.name}${it.dmg != null ? `: ${it.dmg} damage${it.hits > 1 ? ` ${it.hits} times` : ''}` : ''}${it.block ? `, gains ${it.block} Guard` : ''}${it.kinds && it.kinds.includes('buff') ? ', strengthens itself' : ''}${it.kinds && it.kinds.includes('debuff') ? ', afflicts you' : ''}${it.kinds && it.kinds.includes('summon') ? ', calls help' : ''}` : it.label;
    const targeting = live && ((S.sel && CARDS[S.sel.id].target === 'enemy') || S.selPotion != null);
    const size = e.def.hp[0] >= 150 ? 150 : e.def.hp[0] >= 80 ? 124 : e.def.hp[0] >= 30 ? 100 : 76;
    const state = (live ? '' : e.fled ? 'fled' : 'dying') + (live && g.p.pw.surrounded && g.facing === e.uid ? ' faced' : '');
    const powers = Object.entries(e.pw).filter(([k, v]) => HD.PW[k] && v).map(([k, v]) => `${HD.PW[k].n}: ${HD.PW[k].d(v)}`);
    const about = [`${e.hp} of ${e.maxHp} HP${e.block ? `, ${e.block} ${T('Guard')}` : ''}.`, live && tip ? `Next: ${tip}.` : '', ...powers].filter(Boolean).join('\n');
    const acts = targeting ? `data-act="foe" data-arg="${e.uid}" role="button" tabindex="0"` : live ? `${info(e.def.name, about)} role="button" tabindex="0"` : '';
    return `<div class="foe ${targeting ? 'targetable' : ''} ${S.acting === e.uid ? 'acting' : ''} ${state}" data-key="e${e.uid}" data-ent="${e.uid}" ${acts} aria-label="${esc(e.def.name)}, ${e.hp} of ${e.maxHp} HP.${live ? ` Intends: ${esc(tip)}` : ''}">
      <div class="intent k-${it.kind}" title="${esc(tip)}">${intent}</div>
      ${sigil(e.id, size)}
      <div class="fname">${targeting ? `<span class="tkey">${idx + 1}</span>` : ''}${esc(e.def.name)}</div>
      ${hpBar(e)}
      <div class="chips">${live ? chips(e, true) : ''}</div>
    </div>`;
  }

  function combatScreen() {
    const g = S.g;
    const p = g.p;
    // Dead enemies stay one beat so their exit plays, then drop out.
    const shown = g.enemies.filter((e) => {
      if (e.alive) { S.gone.delete(e.uid); S.dying.delete(e.uid); return true; }
      if (S.gone.has(e.uid)) return false;
      if (!S.dying.has(e.uid)) { S.dying.add(e.uid); setTimeout(() => { S.gone.add(e.uid); scheduleRender(); }, reduced() ? 60 : 720); }
      return true;
    });
    const foes = shown.map((e) => foeHTML(e, g)).join('');
    const n = g.hand.length;
    const fanStep = Math.min(5, 26 / Math.max(1, n));
    const hand = g.hand.map((c, i) => {
      const m = i - (n - 1) / 2;
      const style = `--r:${(m * fanStep).toFixed(2)}deg;--y:${(m * m * (n > 6 ? 1.2 : 1.9)).toFixed(1)}px`;
      const cls = `${g.canPlay(c) ? 'playable' : 'dim'} ${S.sel === c ? 'sel' : ''} ${S.dragUid === c.uid ? 'ghost' : ''} ${S.hidden.has(c.uid) ? 'gone' : ''}`;
      return cardHTML(c, { g, act: 'card', dkey: `h${c.uid}`, style, hint: i < 10 ? String((i + 1) % 10) : '', cls });
    }).join('');
    const liftHint = (c) => (!g.canPlay(c) ? "You can't play this right now. Tap elsewhere to put it back."
      : CARDS[c.id].target === 'enemy' && g.alive().length > 1 ? 'Drag it onto an enemy to play it. Tap elsewhere to put it back.' : 'Drag it up to play it. Tap elsewhere to put it back.');
    const hint = S.sel && dragOnly() ? liftHint(S.sel)
      : S.sel ? `Choose a target for ${esc(CARDS[S.sel.id].name)}, or press Esc.`
      : S.selPotion != null ? `Choose a target for ${esc(HD.POTIONS[S.run.potions[S.selPotion]].name)}, or press Esc.`
      : g.phase === 'enemy' ? 'Enemies are acting.' : '';
    const stuck = g.phase === 'player' && !S.busy && !g.hand.some((c) => g.canPlay(c));
    const log = S.showLog ? `<div class="log" data-key="log" aria-live="polite">${g.log.slice(-14).map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : '';
    return `${bar()}<main class="combat" data-key="scr-combat-${g.encId}-${S.run.floor}">
      <section class="arena">
        <div class="me" data-key="p" data-ent="p" aria-label="You: ${p.hp} of ${p.maxHp} HP, ${p.block} ${T('Guard')}">
          ${playerSigil(120)}
          <div class="fname">${esc(HD.charName(S.run.charId))}</div>
          ${hpBar(p)}
          <div class="chips">${chips(p)}</div>
          ${cellRow(g)}${clutchBox(g)}
        </div>
        <div class="foes ${g.alive().length >= 4 ? 'crowd' : ''} ${g.alive().length >= 5 ? 'crowd5' : ''}">${foes}</div>
      </section>
      <p class="hint" aria-live="polite">${hint}</p>
      <section class="dock">
        <div class="left">
          <div class="orbs" data-key="orbs"><div class="energy ${g.energy ? '' : 'spent'}" data-key="orb" aria-label="Energy ${g.energy} of ${g.maxEnergy}"><span>${g.energy}</span><small>/${g.maxEnergy}</small></div>${S.run.charId === 'CROWNED' || g.stars ? `<span class="glints" data-key="glints" tabindex="0" aria-label="${g.stars} ${T('Glint')}${g.stars === 1 ? '' : 's'}" ${tip(T('Glints'), HD.TERMS[T('Glint')] || '', 'Resource')}>${GLINT}<b>${g.stars}</b></span>` : ''}</div>
          <button class="ghost" data-act="pile" data-arg="draw">Draw ${g.draw.length}</button>
        </div>
        <div class="hand" style="--m:${S.handM != null ? S.handM : 3}px" role="group" aria-label="Your hand">${hand || '<p class="empty">Your hand is empty.</p>'}</div>
        <div class="right">
          <button class="primary ${stuck ? 'nudge' : ''}" data-act="end" ${g.phase !== 'player' || S.busy ? 'disabled' : ''}>End turn</button>
          <button class="ghost" data-act="pile" data-arg="discard">Discard ${g.discard.length}</button>
          <button class="ghost" data-act="pile" data-arg="ash">${T('Ash')} ${g.ash.length}</button>
          <button class="ghost small" data-act="log">${S.showLog ? 'Hide log' : 'Show log'}</button>
        </div>
      </section>
      ${log}
    </main>`;
  }

  function rewardScreen() {
    const r = S.run;
    return `${bar()}<main class="panel" data-key="scr-reward-${r.floor}">
      <h2>${S.kind === 'boss' ? `${actName()} falls quiet` : 'Spoils'}</h2>
      ${itemsHTML(S.reward, 'rw')}
      <button class="primary" data-act="continue">${S.kind === 'boss' ? 'Finish the act' : 'Back to the map'}</button>
    </main>`;
  }

  function restScreen() {
    const r = S.run;
    const heal = r.restHeal();
    const kb = r.relic('KETTLEBELL');
    const label = {
      rest: `<b>Rest</b><span>Heal ${Math.min(heal, r.maxHp - r.hp)} HP (${heal} max).</span>`,
      smith: '<b>Smith</b><span>Upgrade a card.</span>',
      lift: `<b>Lift</b><span>Start every combat with 1 more ${T('Might')} (${kb ? kb.lifts || 0 : 0} of 3 so far).</span>`,
      dig: '<b>Dig</b><span>Find a random relic.</span>',
      hatch: `<b>Hatch</b><span>Hatch your ${esc(CARDS.ROC_EGG.name)}. Obtain ${esc(HD.RELICS.ROC_CHICK.name)}.</span>`,
      clone: '<b>Clone</b><span>Duplicate every card enchanted with Clone.</span>',
      cook: '<b>Cook</b><span>Remove 2 cards. Gain 9 Max HP.</span>',
      kindle: `<b>Kindle</b><span>Relight your ${esc(HD.RELICS.GOURD_CANDLE.name)}.</span>`,
    };
    const done = S.restUsed || [];
    const multi = r.hasRelic('BEDROLL');
    const open = r.restOptions().filter((o) => !done.includes(o));
    const canAct = open.length && (multi || !done.length);
    return `${bar()}<main class="panel rest" data-key="scr-rest-${r.floor}">
      <h2>A warm hollow</h2>
      <p>Roots curl around an old fire pit. ${multi ? 'Your bedroll lets you do everything here.' : 'You have time for one thing.'}</p>
      ${canAct ? `<div class="choices">${open.map((o) => `<button class="choice" data-key="rc-${o}" data-act="rest" data-arg="${o}">${label[o]}</button>`).join('')}</div>` : ''}
      ${done.length || !canAct ? '<button class="primary" data-act="to-map">Back to the map</button>' : ''}
    </main>`;
  }

  function shopScreen() {
    const r = S.run, s = r.shop;
    const cards = s.cards.map((c, i) => c.sold ? `<div class="card sold" data-key="sc${i}-sold" aria-label="Sold">Sold</div>`
      : cardHTML({ uid: 'sc' + i, id: c.id, up: false }, { act: 'buy', arg: `cards:${i}`, dkey: `sc${i}-${c.id}`, style: `--i:${i}`, price: r.price(c), sale: c.sale, cls: r.gold < r.price(c) ? 'dim' : 'playable' })).join('');
    const relics = s.relics.map((x, i) => x.sold ? '' : `<button class="loot" data-key="sr${i}-${x.id}" data-act="buy" data-arg="relics:${i}" ${r.gold < r.price(x) ? 'disabled' : ''}><b>${esc(HD.RELICS[x.id].name)}</b>, ${r.price(x)} gold. ${esc(HD.RELICS[x.id].text)}</button>`).join('');
    const full = r.freeSlot() < 0;
    const pots = s.potions.map((x, i) => x.sold ? '' : `<button class="loot" data-key="sp${i}-${x.id}" data-act="buy" data-arg="potions:${i}" ${r.gold < r.price(x) || full ? 'disabled' : ''}><b>${esc(HD.POTIONS[x.id].name)}</b>, ${r.price(x)} gold. ${esc(HD.POTIONS[x.id].text)}</button>`).join('');
    const cost = r.removalCost();
    return `${bar()}<main class="panel shop" data-key="scr-shop-${r.floor}">
      <h2>The root peddler</h2>
      <p>A hunched figure has spread wares across a flat stone.</p>
      <div class="pickrow">${cards}</div>
      <h3>Colorless</h3>
      <div class="pickrow">${(s.colorless || []).map((c, i) => c.sold ? `<div class="card sold" data-key="cl${i}-sold" aria-label="Sold">Sold</div>`
        : cardHTML({ uid: 'cl' + i, id: c.id, up: false }, { act: 'buy', arg: `colorless:${i}`, dkey: `cl${i}-${c.id}`, style: `--i:${i}`, price: r.price(c), cls: r.gold < r.price(c) ? 'dim' : 'playable' })).join('')}</div>
      <h3>Relics</h3>${relics || '<p>Sold out.</p>'}
      <h3>Potions</h3>${full ? '<p class="fine">Your belt is full.</p>' : ''}${pots || '<p>Sold out.</p>'}
      <h3>Services</h3>
      ${s.removed ? '<p>You already had a card removed here.</p>' : `<button class="loot" data-act="remove" ${r.gold < cost ? 'disabled' : ''}>Remove a card from your deck, ${cost} gold</button>`}
      <button class="primary" data-act="to-map">Leave the shop</button>
    </main>`;
  }

  function eventScreen() {
    const r = S.run;
    const view = r.eventView(S.ev);
    const opts = view.options.map((o) => `<button class="choice evopt" data-key="eo-${S.ev.page}-${o.id}" data-act="ev-pick" data-arg="${o.id}" ${o.locked ? 'disabled' : ''}>
        <b>${esc(T(o.label))}</b><span>${esc(T(o.desc))}</span>${o.locked ? `<em>${esc(o.locked)}</em>` : ''}</button>`).join('');
    return `${bar()}<main class="panel event" data-key="scr-event-${r.floor}">
      <h2>${esc(view.name)}</h2>
      <p class="evtext">${esc(T(view.text))}</p>
      ${opts ? `<div class="choices">${opts}</div>` : '<button class="primary" data-act="to-map">Continue</button>'}
    </main>`;
  }

  function ancientScreen() {
    const r = S.run;
    const neow = r.act === 1;
    const who = neow || !HD.ANCIENTS[r.ancient] ? T('The Rootmother') : T(HD.ANCIENTS[r.ancient].name);
    const offer = S.offer.map((id) => {
      const d = HD.RELICS[id];
      return `<button class="choice gift ${d.bane ? 'bane' : ''}" data-key="gift-${id}" data-act="gift" data-arg="${id}">${HD.relicIcon(id, 'medal')}<b>${esc(d.name)}</b><span>${esc(d.text)}</span>${d.bane ? '<em>Comes with a cost</em>' : ''}</button>`;
    }).join('');
    return `${bar()}<main class="panel ancient" data-key="scr-ancient">
      <h2>${esc(who)}</h2>
      <p>${neow ? 'Something ancient stirs beneath the first roots. It has mended your wounds, and it offers one gift before you begin.'
        : `The way down to ${esc(actName())} is guarded by something very old. It mends your wounds, and it will part with one of its treasures.`}</p>
      <div class="choices">${offer}</div>
    </main>`;
  }

  function treasureScreen() {
    const t = S.chest;
    return `${bar()}<main class="panel" data-key="scr-chest-${S.run.floor}">
      <h2>A root-bound chest</h2>
      ${!t ? '<button class="primary" data-act="open-chest">Pry it open</button>' : t.empty ? '<p>It is empty.</p><button class="primary" data-act="to-map">Back to the map</button>' : `
        ${t.taken ? '' : `<button class="loot" data-key="chest" data-act="take-chest">Take ${S.run.goldPreview(t.gold)} gold${t.relic ? ` and <b>${esc(HD.RELICS[t.relic].name)}</b>: ${esc(HD.RELICS[t.relic].text)}` : ''}</button>`}
        <button class="primary" data-act="to-map">Back to the map</button>`}
    </main>`;
  }

  function endScreen() {
    const r = S.run;
    const won = S.result === 'won';
    return `<main class="panel end" data-key="scr-end">
      <h1>${won ? 'Victory' : 'You fell'}</h1>
      ${won && S.unlocked ? `<p class="unlock"><b>Ascension ${S.unlocked} unlocked</b> for ${esc(HD.charName(r.charId))}: ${esc(HD.ascName(S.unlocked))}.</p>` : ''}
      <p>${won ? `All three acts are behind you${r.asc ? ` on Ascension ${r.asc}` : ''}. The run is won.` : `${T('Depth')} ${r.floor}, ${S.g ? `against ${esc(HD.ENC[S.g.encId].name)}` : `at ${esc(S.deathBy || 'an event')}`}.`}</p>
      <p class="fine">${r.asc ? `Ascension ${r.asc}. ` : ''}Time ${fmtTime(r.playMs)}. Deck ${r.deck.length} cards, ${r.relics.length} relics, ${r.gold} gold. Seed ${esc(r.seed)}.</p>
      <button class="primary" data-act="title">New descent</button>
    </main>`;
  }

  function overlayHTML() {
    const o = S.overlay;
    if (!o) return '';
    let body = '';
    let closable = true;
    if (o.kind === 'pile') body = o.cards.length ? `<div class="grid">${o.cards.map((c) => cardHTML(c, { g: S.screen === 'combat' ? S.g : null })).join('')}</div>` : '<p>Empty.</p>';
    if (o.kind === 'choose') {
      closable = false;
      const min = o.min != null ? o.min : o.n;
      const ok = o.picked.length >= min && o.picked.length <= o.n;
      body = `<div class="grid">${o.from.map((c) => cardHTML(c, { g: S.g, act: 'choose', dkey: `ch${c.uid}`, cls: o.picked.includes(c) ? 'sel' : 'playable' })).join('')}</div>
        ${o.n > 1 || min === 0 ? `<button class="primary" data-act="confirm" ${ok ? '' : 'disabled'}>Confirm${min === 0 ? ` (${o.picked.length})` : ''}</button>` : ''}`;
    }
    if (o.kind === 'pick') { closable = !o.required; body = `<div class="grid">${o.cards.map((c) => cardHTML(o.preview ? { uid: c.uid, id: c.id, up: true } : c, { act: 'pick', arg: c.uid, cls: 'playable' })).join('')}</div>`; }
    if (o.kind === 'bonus') { closable = false; body = `${itemsHTML(o.items, 'bn')}<button class="primary" data-act="bonus-done">Done</button>`; }
    if (o.kind === 'info') { const g = glossIn(o.body, o.title); body = `<div class="infotext">${o.body.split('\n').map((l) => `<p>${esc(l)}</p>`).join('')}${g.length ? `<div class="glossary">${glossRows(g, true)}</div>` : ''}</div>`; }
    if (o.kind === 'cardinfo') {
      const c = { uid: 'inspect', id: o.id, up: o.up };
      const text = cardParts(c, S.screen === 'combat' ? S.g : null);
      const rows = glossRows(glossIn(text, CARDS[o.id].name), true);
      body = `<div class="inspect">${cardHTML(c, { g: S.screen === 'combat' ? S.g : null, noTips: true, cls: 'big' })}<div class="infotext">${rows || '<p>No keywords on this card.</p>'}</div></div>`;
    }
    if (o.kind === 'choice') {
      closable = false;
      const it = o.it;
      body = `<div class="choices">${it.opts.map((v) => {
        if (it.act === 'potionGive') { const d = HD.POTIONS[S.run.potions[v]]; return `<button class="choice loot" data-act="choicePick" data-arg="${v}">${HD.potionIcon(S.run.potions[v])}<span><b>${esc(d.name)}</b> ${esc(d.text)}</span></button>`; }
        const d = HD.RELICS[v];
        return `<button class="choice loot" data-act="choicePick" data-arg="${v}">${HD.relicIcon(v)}<span><b>${esc(d.name)}</b> ${esc(d.text)}</span></button>`;
      }).join('')}</div>`;
    }
    if (o.kind === 'potion') {
      const id = S.run.potions[o.i];
      const d = HD.POTIONS[id];
      const inCombat = S.screen === 'combat' && S.g && !S.g.over;
      const usable = inCombat ? S.g.canUsePotion(o.i) && !S.busy : !!d.outside;
      body = `<p>${esc(d.text)}</p>${d.passive ? '<p class="fine">This works on its own. Keep it in your belt.</p>' : ''}
        <div class="choices">
          ${d.passive ? '' : `<button class="primary" data-act="drink" ${usable ? '' : 'disabled'}>${d.target === 'enemy' ? 'Throw' : 'Drink'}</button>`}
          <button class="ghost" data-act="toss">Discard</button>
          ${id === 'RANK_FLASK' && S.screen === 'shop' ? '<button class="ghost" data-act="throwAtMerchant">Throw at the merchant (+100 Gold)</button>' : ''}
        </div>${!usable && !d.passive ? `<p class="fine">${inCombat ? 'Wait for your turn.' : 'This one only works in combat.'}</p>` : ''}`;
    }
    return `<div class="overlay" data-key="ov-${o.kind}-${esc(o.title)}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><div class="sheet ${['potion', 'info'].includes(o.kind) ? 'small' : o.kind === 'cardinfo' ? 'mid' : ''}">
      <div class="shead"><h2>${esc(o.title)}</h2>${closable ? '<button class="ghost" data-act="close">Close</button>' : ''}</div>${body}</div></div>`;
  }

  // ---------- hover tooltips ----------
  let tipAnchor = null;
  HD.glossIn = (text, own) => glossIn(text, own).map((e) => `${e.kind}:${e.name}`); // for checks
  // Elements whose text gets a glossary panel on hover (and on long-press with touch).
  const GLOSSED = '.choice, .loot, .rlist li, .rest button';
  function tipBox() {
    let el = document.getElementById('hovertip');
    if (!el) { el = document.createElement('div'); el.id = 'hovertip'; el.className = 'hovertip'; el.setAttribute('role', 'tooltip'); el.hidden = true; document.body.appendChild(el); }
    return el;
  }
  function showTip(anchor) {
    const box = tipBox();
    const [kind, id] = (anchor.dataset.ti || '').split(':');
    const icon = kind === 'relic' && HD.RELICS[id] ? HD.relicIcon(id, 'tticon') : kind === 'potion' && HD.POTIONS[id] ? HD.potionIcon(id, 'tticon') : '';
    if (anchor.dataset.tt == null) {
      // Not a tooltip item: a choice, a shop or reward row, an event option. Show what its text mentions.
      const own = anchor.querySelector('b') ? anchor.querySelector('b').textContent.trim() : '';
      const g = glossIn(anchor.textContent, own);
      if (!g.length) { hideTip(); return; }
      box.innerHTML = `<div class="glossary">${glossRows(g, true)}</div>`;
      box.classList.add('side');
    } else {
      const g = glossIn(anchor.dataset.tb, anchor.dataset.tt);
      box.innerHTML = `${icon}<div><b>${anchor.dataset.tt}</b>${anchor.dataset.tk ? `<small>${anchor.dataset.tk}</small>` : ''}<p>${anchor.dataset.tb}</p>${g.length ? `<div class="glossary">${glossRows(g, true)}</div>` : ''}</div>`;
      box.classList.remove('side');
    }
    box.hidden = false;
    tipAnchor = anchor;
    placeTip();
  }
  function placeTip() {
    const box = tipBox();
    if (!tipAnchor || !tipAnchor.isConnected) { hideTip(); return; }
    const a = tipAnchor.getBoundingClientRect(), b = box.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    let left = Math.min(Math.max(8, a.left + a.width / 2 - b.width / 2), vw - b.width - 8);
    let top = a.bottom + 8;
    if (box.classList.contains('side') && (a.right + 10 + b.width <= vw - 8 || a.left - 10 - b.width >= 8)) {
      // Beside the hovered choice: to the right if it fits, else to the left.
      left = a.right + 10 + b.width <= vw - 8 ? a.right + 10 : a.left - 10 - b.width;
      top = Math.min(Math.max(8, a.top), vh - b.height - 8);
    } else if (top + b.height > vh - 8) top = Math.max(8, a.top - b.height - 8);
    box.style.left = `${left}px`; box.style.top = `${top}px`;
  }
  function hideTip() { const box = document.getElementById('hovertip'); if (box) box.hidden = true; tipAnchor = null; }
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const a = e.target.closest && (e.target.closest('[data-tt]') || (!e.target.closest('.card') && e.target.closest(GLOSSED)));
    if (a && a !== tipAnchor) showTip(a);
    else if (!a && tipAnchor) hideTip();
  });
  document.addEventListener('pointerout', (e) => { if (tipAnchor && e.target.closest && (e.target.closest('[data-tt]') === tipAnchor || e.target.closest(GLOSSED) === tipAnchor) && !tipAnchor.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener('focusin', (e) => { const a = e.target.closest && e.target.closest('[data-tt]'); if (a) showTip(a); });
  document.addEventListener('focusout', (e) => { if (tipAnchor && e.target === tipAnchor) hideTip(); });
  document.addEventListener('pointerdown', () => hideTip(), true);
  // Scrolling moves the panel with its item; it closes once the item leaves the screen.
  window.addEventListener('scroll', () => {
    if (!tipAnchor) return;
    const r = tipAnchor.getBoundingClientRect();
    if (!tipAnchor.isConnected || r.bottom < 0 || r.top > innerHeight) hideTip(); else placeTip();
  }, true);

  // ---------- pickups ----------
  // Everything the run gains is shown the way the original game does it: it appears, holds for a moment,
  // then flies to where it lives (relic bar, deck, potion belt, gold or HP counter).
  const COIN = '<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#e3b341" stroke="#7a5512" stroke-width="1.6"/><path d="M10 5v10M7.2 7.5h4.3a1.6 1.6 0 0 1 0 3.2H8.6a1.6 1.6 0 0 0 0 3.2h4.3" fill="none" stroke="#7a5512" stroke-width="1.4"/></svg>';
  let showing = false;
  const pulse = (el) => { if (el && !reduced()) el.animate([{ transform: 'scale(1.25)', filter: 'brightness(1.6)' }, { transform: 'scale(1)', filter: 'none' }], { duration: 380, easing: 'ease-out' }); };
  function targetFor(it) {
    if (it.kind === 'relic') return $(`.relic[data-key="r-${it.id}"]`) || $('.bar .relics') || $('.bar');
    if (it.kind === 'potion') return $(`.vial[data-arg="${it.slot}"]`) || $('.belt') || $('.bar');
    if (it.kind === 'gold') return $('.stat.gold') || $('.bar');
    if (it.kind === 'maxhp') return $('.stat.hp') || $('.bar');
    return $('.deckbtn') || $('[data-act=pile][data-arg=deck]') || $('.bar');
  }
  function pieceFor(it) {
    const el = document.createElement('div');
    if (it.kind === 'card' || it.kind === 'upgraded' || it.kind === 'removed' || it.kind === 'enchanted' || it.kind === 'downgraded') {
      const up = it.kind === 'upgraded' ? true : !!it.up;
      el.className = `show-card ${it.kind}`;
      el.innerHTML = cardHTML({ uid: 'sh' + Math.random(), id: it.id, up, ench: it.ench }, { noTips: true }) +
        (it.kind === 'removed' ? '<span class="show-tag">Removed</span>' : it.kind === 'upgraded' ? '<span class="show-tag up">Upgraded</span>' : it.kind === 'enchanted' ? '<span class="show-tag ench">Enchanted</span>' : it.kind === 'downgraded' ? '<span class="show-tag">Downgraded</span>' : '');
    } else if (it.kind === 'relic') {
      const d = HD.RELICS[it.id];
      el.className = 'show-relic';
      el.innerHTML = `${HD.relicIcon(it.id, 'medal')}<b>${esc(d.name)}</b><small>${esc(d.text)}</small>`;
    } else if (it.kind === 'potion') {
      el.className = 'show-potion';
      el.innerHTML = `${HD.potionIcon(it.id, 'bottle')}<b>${esc(HD.POTIONS[it.id].name)}</b>`;
    } else {
      el.className = `show-num ${it.kind} ${it.n < 0 ? 'neg' : ''}`;
      el.innerHTML = it.kind === 'gold' ? `${COIN}${it.n > 0 ? '+' : ''}${it.n}` : `${it.n > 0 ? '+' : ''}${it.n} Max HP`;
    }
    return el;
  }
  async function showcase() {
    if (showing || !S.run || !S.run.feed || !S.run.feed.length || S.screen === 'title') return;
    showing = true;
    const layer = fxLayer();
    while (S.run.feed.length) {
      // Show up to six things at once; cards line up together the way multiple rewards do.
      const batch = S.run.feed.splice(0, 6);
      const box = document.createElement('div');
      box.className = 'showcase';
      const rowItems = document.createElement('div'), rowCards = document.createElement('div');
      rowItems.className = 'show-row'; rowCards.className = 'show-row';
      const pieces = batch.map((it) => { const el = pieceFor(it); (/card|upgraded|removed|enchanted|downgraded/.test(it.kind) ? rowCards : rowItems).appendChild(el); return [it, el]; });
      for (const row of [rowItems, rowCards]) if (row.children.length) box.appendChild(row);
      const dim = document.createElement('div');
      dim.className = 'show-dim';
      layer.appendChild(dim);
      layer.appendChild(box);
      const hold = batch.some((x) => x.kind === 'relic') ? 1300 : batch.some((x) => ['card', 'upgraded', 'removed', 'enchanted'].includes(x.kind)) ? 1000 : 650;
      if (reduced()) {
        await new Promise((res) => setTimeout(res, hold));
        box.remove(); dim.remove();
        continue;
      }
      pieces.forEach(([, el], i) => el.animate([{ opacity: 0, transform: 'translateY(18px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: i * 70, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'backwards' }));
      await new Promise((res) => setTimeout(res, hold));
      await Promise.all(pieces.map(([it, el], i) => new Promise((res) => {
        if (it.kind === 'removed') {
          el.animate([{ opacity: 1, filter: 'none' }, { opacity: 0, filter: 'grayscale(1) brightness(.4)', transform: 'scale(.85)' }], { duration: 500, delay: i * 60, fill: 'forwards' }).onfinish = res;
          return;
        }
        const to = targetFor(it);
        if (!to) { res(); return; }
        const a = el.getBoundingClientRect(), b = to.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
        el.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: 0.2 }],
          { duration: 480, delay: i * 70, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).onfinish = () => { pulse(targetFor(it)); res(); };
      })));
      box.remove();
      if (reduced()) dim.remove(); else dim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => dim.remove();
    }
    showing = false;
  }

  // ---------- DOM patching ----------
  // Elements with data-key keep their identity across renders, so CSS transitions and running animations survive.
  const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);
  function morph(a, b) {
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
    for (const at of [...b.attributes]) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    if (a.tagName !== 'INPUT') morphKids(a, b);
  }
  function morphKids(a, b) {
    const pool = new Map();
    for (const k of a.childNodes) { const key = keyOf(k); if (key) pool.set(key, k); }
    let i = 0;
    for (const n of [...b.childNodes]) {
      const cur = a.childNodes[i] || null;
      const key = keyOf(n);
      let m = null;
      if (key) m = pool.get(key) || null;
      else if (cur && !keyOf(cur) && cur.nodeType === n.nodeType && cur.nodeName === n.nodeName) m = cur;
      if (m) { if (key) pool.delete(key); if (m !== cur) a.insertBefore(m, cur); morph(m, n); }
      else a.insertBefore(n, cur);
      i++;
    }
    while (a.childNodes.length > i) a.removeChild(a.lastChild);
  }

  // ---------- motion ----------
  const fxLayer = () => document.getElementById('fx');
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, left: r.left }; };
  function cloneAt(el) {
    const r = el.getBoundingClientRect();
    const k = el.cloneNode(true);
    for (const a of ['data-key', 'data-act', 'data-arg', 'role', 'tabindex', 'aria-label']) k.removeAttribute(a);
    k.classList.remove('sel', 'ghost', 'gone');
    k.classList.add('flying');
    k.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;transform:none;`;
    fxLayer().appendChild(k);
    return k;
  }
  // Moves an element (usually a clone) into a target rect and removes it.
  function fly(k, to, o = {}) {
    const r = k.getBoundingClientRect();
    const dx = to.x - (r.left + r.width / 2), dy = to.y - (r.top + r.height / 2);
    const from = getComputedStyle(k).transform;
    const start = from && from !== 'none' ? from : 'none';
    const arc = o.arc != null ? o.arc : -60;
    const a = k.animate([
      { transform: start, opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + arc}px) scale(${o.mid || 0.9}) rotate(${o.spin || 0}deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${o.end || 0.3}) rotate(${(o.spin || 0) * 2}deg)`, opacity: 0 },
    ], { duration: o.ms || 380, delay: o.delay || 0, easing: 'cubic-bezier(.45,0,.6,1)', fill: 'both' });
    a.onfinish = () => k.remove();
  }
  function shake(el, px = 8, ms = 260) {
    if (!el || reduced()) return;
    el.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-px}px)` }, { transform: `translateX(${px * 0.8}px)` }, { transform: `translateX(${-px * 0.4}px)` }, { transform: 'translateX(0)' }], { duration: ms, easing: 'ease-out' });
  }
  function flash(el, filter, ms = 240) { if (el && !reduced()) el.animate([{ filter }, { filter: 'none' }], { duration: ms, easing: 'ease-out' }); }
  function banner(title, sub) {
    const b = document.createElement('div');
    b.className = 'banner';
    b.innerHTML = `<b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    fxLayer().appendChild(b);
    const a = b.animate(reduced()
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'translate(-50%, -50%) scaleX(.6)' }, { opacity: 1, transform: 'translate(-50%, -50%) scaleX(1)', offset: 0.18 }, { opacity: 1, transform: 'translate(-50%, -50%) scaleX(1)', offset: 0.75 }, { opacity: 0, transform: 'translate(-50%, -60%) scaleX(1)' }],
      { duration: 1050, easing: 'ease-out', fill: 'both' });
    a.onfinish = () => b.remove();
  }
  function hurtFlash(n) {
    if (reduced()) return;
    const v = document.createElement('div');
    v.className = 'hurt';
    fxLayer().appendChild(v);
    const a = v.animate([{ opacity: Math.min(1, 0.35 + n / 30) }, { opacity: 0 }], { duration: 480, easing: 'ease-out', fill: 'both' });
    a.onfinish = () => v.remove();
    if (n >= 12) shake($('.arena'), 6, 300);
  }

  // ---------- render ----------
  const root = () => document.getElementById('app');
  let fxq = [];
  const floatStack = {};
  let rafPending = false;
  function render() {
    const html = { title: titleScreen, ancient: ancientScreen, event: eventScreen, map: mapScreen, combat: combatScreen, reward: rewardScreen, rest: restScreen, shop: shopScreen, treasure: treasureScreen, end: endScreen }[S.screen]();
    const t = document.createElement('div');
    t.innerHTML = html + overlayHTML();
    morphKids(root(), t);
    afterRender();
  }
  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; render(); });
  }
  // Re-fit the hand, card names and card text whenever the window or panel changes size, and once web fonts finish
  // loading (they change text widths). Without this the hand keeps the spacing it had at the old size.
  let refitQueued = false;
  function refit() {
    if (refitQueued) return;
    refitQueued = true;
    requestAnimationFrame(() => {
      refitQueued = false;
      if (!document.querySelector('.card')) return;
      fitNames(); fitHand(); fitHandText(); liftCard();
      // cards animate their tilt for a moment; measure the room they need again once they've settled
      clearTimeout(refit.settle);
      refit.settle = setTimeout(() => { if (document.querySelector('.hand .card')) { fitHand(); liftCard(); } }, 260);
    });
  }
  window.addEventListener('resize', refit);
  if (window.ResizeObserver) new ResizeObserver(refit).observe(document.documentElement);
  if (document.fonts) {
    const fontsChanged = () => { nameFit.clear(); textFit.clear(); S.handM = null; refit(); };
    if (document.fonts.ready) document.fonts.ready.then(fontsChanged);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fontsChanged);
  }
  function afterRender() {
    flushFx();
    showcase();
    if (tipAnchor) {
      const key = tipAnchor.dataset.key;
      const now = tipAnchor.isConnected ? tipAnchor : key ? document.querySelector(`[data-key="${CSS.escape(key)}"]`) : null;
      // Keep showing it on the same item after a redraw (top-bar items and glossary panels alike).
      if (now && (now.dataset.tt != null || now.matches(GLOSSED))) showTip(now); else hideTip();
    }
    if (S.screen !== 'combat') persist();
    fitNames();
    fitHand();
    fitHandText();
    liftCard();
    BG.set(S.screen === 'combat' ? 'fight' : 'calm');
    if (S.screen === 'map' && S.scrollMap) {
      S.scrollMap = false;
      const el = $('.node.reach');
      const box = document.getElementById('mapScroll');
      if (el && box) box.scrollTop = Math.max(0, el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight * 0.62);
    }
    if (S.screen === 'combat' && S.g) {
      const g = S.g;
      // Newly drawn cards arrive from the draw pile.
      const els = [...document.querySelectorAll('.hand .card[data-key]')];
      const src = $('[data-act=pile][data-arg=draw]');
      let k = 0;
      if (!reduced() && src) {
        const from = rectOf(src);
        for (const el of els) {
          if (S.prevHand.has(el.dataset.key)) continue;
          const to = rectOf(el);
          el.animate([
            { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(.25) rotate(-24deg)`, opacity: 0 },
            { opacity: 1, offset: 0.35 },
            { transform: getComputedStyle(el).transform === 'none' ? 'none' : getComputedStyle(el).transform, opacity: 1 },
          ], { duration: 340, delay: k++ * 70, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
        }
      }
      S.prevHand = new Set(els.map((el) => el.dataset.key));
      const orb = $('.energy');
      if (orb && S.prevEnergy != null && S.prevEnergy !== g.energy && !reduced()) orb.animate([{ transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 280, easing: 'ease-out' });
      S.prevEnergy = g.energy;
      if (!g.over && g.phase === 'player' && S.bannerTurn !== g.turn) { S.bannerTurn = g.turn; banner('Your turn', `Turn ${g.turn}`); }
      if (!g.over && g.phase === 'enemy' && S.bannerEnemy !== g.turn) { S.bannerEnemy = g.turn; banner('Enemy turn'); }
    } else S.prevHand = new Set();
    updateAim();
  }
  // Phone hand cards are small; when a card's text doesn't fit, shrink it until it does (the lift scales it back up to read).
  const textFit = new Map();
  function fitHandText() {
    if (!compact()) return;
    for (const t of document.querySelectorAll('.dock .card .ctext')) {
      const inner = t.firstElementChild;
      if (!inner) continue;
      const key = `${t.closest('.card').dataset.cid}|${t.textContent.length}|${innerWidth}x${innerHeight}`;
      if (textFit.has(key)) { t.style.fontSize = textFit.get(key); continue; }
      let size = parseFloat(getComputedStyle(t).fontSize);
      for (let i = 0; i < 12 && size > 5 && inner.getBoundingClientRect().height > t.getBoundingClientRect().height + 1; i++) { size = Math.round((size - 0.4) * 10) / 10; t.style.fontSize = `${size}px`; }
      textFit.set(key, t.style.fontSize);
    }
  }
  function fitNames() {
    for (const el of document.querySelectorAll('.card:not(.big) .cname')) {
      if (el.scrollWidth <= el.clientWidth) continue;
      const cur = parseFloat(getComputedStyle(el).fontSize);
      // Phone hand cards are read by lifting them (scaled up), so their names may shrink further.
      const floor = compact() && el.closest('.dock') ? 6 : 8;
      let size = Math.max(floor, Math.floor(cur * (el.clientWidth / el.scrollWidth) * 10) / 10 - 0.3);
      el.style.fontSize = `${size}px`;
      // Widths round to whole pixels; nudge down until the name truly fits.
      for (let i = 0; i < 8 && size > floor && el.scrollWidth > el.clientWidth; i++) { size = Math.round((size - 0.3) * 10) / 10; el.style.fontSize = `${size}px`; }
      nameFit.set(fitKey(el.textContent, el.closest('.dock') ? 'hand' : 'full'), size);
    }
  }
  // Cards overlap just enough to fit the hand; past a limit the hand scrolls instead.
  function liftCard() {
    const el = compact() && S.sel ? $('.hand .card.sel') : null;
    if (!el) return;
    // Layout position (ignores the lift transform): offsets are relative to the offset parent.
    const op = (el.offsetParent || document.body).getBoundingClientRect();
    const x = op.left + el.offsetLeft + el.offsetWidth / 2, y = op.top + el.offsetTop + el.offsetHeight / 2;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const w = el.offsetWidth, h = el.offsetHeight;
    const bar = $('.bar'), foes = $('.foes'), me = $('.me');
    const barB = bar ? bar.getBoundingClientRect().bottom : 0;
    const fr = foes ? foes.getBoundingClientRect() : null;
    let cx, cy, scale;
    if (vw > vh && fr) {
      // Sideways: over your own side, leaving the enemies on the right free to tap.
      const room = Math.max(w, fr.left - 12);
      cx = Math.max((w * 1.2) / 2 + 8, Math.min(room / 2, me ? me.getBoundingClientRect().left + me.getBoundingClientRect().width / 2 + 40 : room / 2));
      scale = Math.min(1.75, (vh - barB - 16) / h, (room - 16) / w);
      cy = barB + 8 + (h * scale) / 2;
    } else {
      // Upright: below the enemies, over your hand, so the enemies stay free to tap.
      const top = fr ? fr.bottom + 8 : vh * 0.45, bottom = vh - 8;
      scale = Math.min(1.75, (bottom - top) / h, (vw * 0.85) / w);
      cx = vw / 2; cy = (top + bottom) / 2;
    }
    scale = Math.max(1.15, scale);
    el.style.setProperty('--lx', `${Math.round(cx - x)}px`);
    el.style.setProperty('--ly', `${Math.round(cy - y)}px`);
    el.style.setProperty('--ls', scale.toFixed(2));
  }
  function fitHand() {
    const hand = $('.hand');
    const cards = hand ? hand.querySelectorAll('.card') : [];
    if (!cards.length) return;
    // Outer cards in the fan tilt out past their own width; leave room for that swing.
    const tilt = Math.max(...[...cards].map((c) => Math.abs(parseFloat(c.style.getPropertyValue('--r')) || 0)));
    const swing = compact() ? 0 : cards[0].offsetHeight * 1.15 * Math.sin((tilt * Math.PI) / 180);
    const n = cards.length, cw = cards[0].offsetWidth, avail = hand.clientWidth - (compact() ? 8 : 40) - 2 * swing;
    const minShow = compact() ? 0.25 : 0.28;
    // Phones overlap each card onto the one before it (2m per gap); wider screens split it on both sides.
    let m = compact() ? Math.min(2, (avail - n * cw) / (2 * Math.max(1, n - 1))) : Math.min(3, (avail - n * cw) / (2 * n));
    m = Math.max(m, -(cw * (1 - minShow)) / 2);
    m = Math.round(m * 10) / 10;
    if (m !== S.handM) { S.handM = m; hand.style.setProperty('--m', `${m}px`); }
    // Desktop fan: the outer cards tilt and dip below the hand box. Reserve room for the largest hand (10 cards) at this
    // card size, so the room never changes as cards are played or drawn (and the fighters above never bob up and down).
    if (!compact()) {
      const w = cards[0].offsetWidth, h = cards[0].offsetHeight;
      let drop = 0;
      for (let k = 1; k <= 10; k++) {
        const step = Math.min(5, 26 / k), mm = (k - 1) / 2, th = (mm * step * Math.PI) / 180;
        drop = Math.max(drop, 0.15 * h * (1 - Math.cos(th)) + (w / 2) * Math.abs(Math.sin(th)) + mm * mm * (k > 6 ? 1.2 : 1.9));
      }
      const want = `${Math.ceil(drop + 6)}px`;
      if (hand.style.paddingBottom !== want) hand.style.paddingBottom = want;
    }
  }
  function flushFx() {
    const layer = fxLayer();
    for (const f of fxq) {
      const el = document.querySelector(`[data-ent="${f.id}"]`);
      if (!el || !layer) continue;
      const sig = el.querySelector('.sigil');
      if (f.type === 'hit' && f.n > 0) {
        shake(sig, f.n >= 10 ? 11 : 7);
        flash(sig, 'brightness(2.4) saturate(0)');
        if (f.id === 'p') hurtFlash(f.n);
      }
      if (f.type === 'guard' && sig && !reduced()) sig.animate([{ transform: 'scale(1.08)', filter: 'drop-shadow(0 0 10px var(--lichen))' }, { transform: 'scale(1)', filter: 'none' }], { duration: 360, easing: 'ease-out' });
      if (f.type === 'heal') flash(sig, 'drop-shadow(0 0 12px var(--lichen)) brightness(1.2)', 420);
      if (f.type === 'block') shake(el.querySelector('.gbadge'), 4, 200);
      // Numbers landing on the same target in quick succession stack instead of overlapping.
      const now = performance.now();
      const st = floatStack[f.id] && now - floatStack[f.id].t < 450 ? floatStack[f.id] : { n: -1 };
      st.n++; st.t = now; floatStack[f.id] = st;
      const b = el.getBoundingClientRect();
      const s = document.createElement('span');
      s.className = `float f-${f.type} ${f.n >= 20 ? 'big' : ''}`;
      s.textContent = f.type === 'hit' ? (f.n ? `-${f.n}` : '0') : f.type === 'block' ? `${f.n} blocked` : `+${f.n}`;
      s.style.left = `${b.left + b.width / 2 + (st.n % 2 ? 22 : -14) + (Math.random() * 10 - 5)}px`;
      s.style.top = `${b.top + b.height * 0.3 + (st.n % 4) * 30}px`;
      layer.appendChild(s);
      setTimeout(() => s.remove(), reduced() ? 500 : 1000);
    }
    fxq = [];
  }
  const UI = {
    choose: (g, o) => new Promise((res) => {
      if (!o.from.length) return res([]);
      S.overlay = { kind: 'choose', title: o.prompt, from: o.from, n: Math.min(o.n, o.from.length), min: o.min, picked: [], res };
      render();
    }),
    fx: (type, t, n) => { fxq.push({ type, id: t.isPlayer ? 'p' : t.uid, n }); scheduleRender(); },
    pace: async (g, e) => { S.acting = e.uid; render(); await HD.sleep(reduced() ? 150 : 480); S.acting = null; },
  };

  // ---------- aiming ----------
  function foeAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const f = el && el.closest('.foe');
    if (!f || !S.g) return null;
    return S.g.alive().find((e) => `e${e.uid}` === f.dataset.key) || null;
  }
  function aimSource() {
    if (drag && drag.on) return drag.targeted ? drag.k : null;
    if (S.screen !== 'combat') return null;
    if (S.sel && CARDS[S.sel.id].target === 'enemy') return $(`[data-key="h${S.sel.uid}"]`);
    if (S.selPotion != null) return $(`.vial[data-arg="${S.selPotion}"]`);
    return null;
  }
  function updateAim() {
    const svg = document.getElementById('aim');
    if (!svg) return;
    document.querySelectorAll('.foe.aimed').forEach((f) => f.classList.remove('aimed'));
    const src = aimSource();
    if (!src || !S.mouse) { svg.classList.remove('on'); return; }
    const r = src.getBoundingClientRect();
    const vial = src.classList.contains('vial');
    const sx = r.left + r.width / 2, sy = vial ? r.bottom : r.top + 10;
    const ex = S.mouse.x, ey = S.mouse.y;
    const cx = vial ? ex : sx + (ex - sx) * 0.1;
    const cy = vial ? sy : Math.min(sy, ey) - Math.abs(ex - sx) * 0.2 - 50;
    const d = `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex},${ey}`;
    document.getElementById('aimpath').setAttribute('d', d);
    document.getElementById('aimtrail').setAttribute('d', d);
    const foe = foeAt(ex, ey);
    if (foe) { const f = $(`[data-key="e${foe.uid}"]`); if (f) f.classList.add('aimed'); }
    svg.classList.toggle('lock', !!foe);
    svg.classList.add('on');
  }

  // ---------- dragging cards ----------
  let drag = null;
  function startDrag() {
    const g = S.g;
    drag.on = true;
    S.sel = null; S.selPotion = null;
    S.dragUid = drag.c.uid;
    S.suppressClick = true;
    if (drag.el.classList.contains('sel')) { drag.el.style.transition = 'none'; drag.el.classList.remove('sel'); }
    drag.touch = lastPointer === 'touch';
    drag.r = drag.el.getBoundingClientRect();
    drag.k = cloneAt(drag.el);
    drag.el.style.transition = '';
    drag.k.classList.add('held');
    drag.targeted = CARDS[drag.c.id].target === 'enemy' && g.alive().length > 1;
    drag.handTop = $('.hand').getBoundingClientRect().top;
    if (drag.targeted) drag.k.style.transform = 'translateY(-70px) scale(1.1)';
    else {
      // The play line: release above it to play (self, Block, buff and all-enemy cards).
      const line = document.createElement('div');
      line.className = 'playline';
      line.style.top = `${drag.handTop - 30}px`;
      line.innerHTML = '<span>Release above this line to play</span>';
      fxLayer().appendChild(line);
      drag.line = line;
    }
    render();
  }
  function moveDrag(x, y) {
    if (drag.targeted) return;
    const k = drag.k;
    k.style.left = `${x - drag.r.width / 2}px`;
    // A finger covers what's under it, so on touch the card rides above the finger.
    k.style.top = `${drag.touch ? y - drag.r.height - 14 : y - drag.r.height * 0.45}px`;
    const armed = y < drag.handTop - 30;
    k.classList.toggle('armed', armed);
    if (drag.line) drag.line.classList.toggle('on', armed);
  }
  function endDrag(x, y) {
    const { c, k } = drag;
    if (drag.line) drag.line.remove();
    const g = S.g;
    if (drag.targeted) {
      const e = foeAt(x, y);
      drag = null;
      if (e && g.canPlay(c)) return play(c, e, k);
      return cancelDrag(c, k);
    }
    const armed = k.classList.contains('armed');
    drag = null;
    if (armed && g.canPlay(c)) {
      const t = CARDS[c.id].target === 'enemy' ? g.alive()[0] : null;
      return play(c, t, k);
    }
    cancelDrag(c, k);
  }
  function cancelDrag(c, k) {
    const home = $(`[data-key="h${c.uid}"]`);
    if (home && !reduced()) {
      const a = k.getBoundingClientRect(), b = home.getBoundingClientRect();
      k.animate([{ transform: getComputedStyle(k).transform }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px)` }], { duration: 180, easing: 'ease-out', fill: 'forwards' }).onfinish = () => { k.remove(); S.dragUid = null; render(); };
    } else { k.remove(); S.dragUid = null; render(); }
    updateAim();
  }

  // ---------- flow ----------
  function checkPending() {
    const r = S.run;
    if (!r || S.overlay || !r.pending.length) return;
    const it = r.pending.shift();
    if (it.kind === 'choice') { if (!it.opts.length) return checkPending(); S.activePick = it; S.overlay = { kind: 'choice', title: it.title, it }; return; }
    const PICKS = {
      mirror: ['Choose a card to copy', () => r.deck.slice(), false, (c) => r.addCard(c.id, c.up)],
      transform: [`Choose a card to Transform${it.up ? ' (it will be Upgraded)' : ''}`, () => r.removable(), false, (c) => { const n = r.transform(c); if (it.up && n && !['Curse', 'Status'].includes(CARDS[n.id].type)) n.up = true; }],
      upgrade: ['Choose a card to Upgrade (shown upgraded)', () => r.deck.filter((c) => !c.up && ['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type)), true, (c) => { r.upgrade(c); }],
      remove: ['Choose a card to remove', () => r.removable(), false, (c) => { r.removeCard(c); if (it.stashTo) { const st = r.relic(it.stashTo); if (st) (st.stash = st.stash || []).push(c.id); } }],
      carveAny: [`Choose a card to Transform into ${it.into ? CARDS[it.into].name : ''} (or close to stop)`, () => r.removable().filter((c) => c.id !== it.into), false, (c) => { r.removeCard(c); r.addCard(it.into, false); }],
      enchant: [`Choose a card to Enchant with ${it.kind === 'enchant' ? T(HD.ENCH[it.id].name) : ''}${it.n && it.id !== 'SOWN' ? ' ' + it.n : ''}${it.optional ? ' (or close to skip)' : ''}`,
        () => r.enchantable(it.id, it.filter ? (d) => d.type === it.filter : null), false, (c) => r.enchant(c, it.id, it.n || 0)],
      carve: [`Choose a starter card to Transform into ${it.into ? CARDS[it.into].name : ''}`, () => r.removable().filter((c) => CARDS[c.id].rarity === 'Basic'), false,
        (c) => { r.removeCard(c); r.addCard(it.into, false); }],
    };
    if (PICKS[it.kind]) {
      const [title, list, preview, fn] = PICKS[it.kind];
      const cards = list();
      if (!cards.length) return checkPending();
      S.activePick = it;
      pickDeck(title, cards, preview, (c) => { S.activePick = null; fn(c); }, !it.optional);
      return;
    }
    const batch = [it];
    while (r.pending.length && !PICKS[r.pending[0].kind]) batch.push(r.pending.shift());
    S.overlay = { kind: 'bonus', title: 'Something extra', items: batch };
  }
  const SAVE_KEY = 'hollowdeep.run';
  const readSave = () => { try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
  const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage unavailable */ } };
  // Saved outside combat on every render, and once at the start of each combat (resuming restarts that fight).
  function persist(combat) {
    const r = S.run;
    if (!r || S.screen === 'title' || S.screen === 'end') return;
    const shown = S.overlay && S.overlay.kind === 'bonus' ? S.overlay.items.filter((x) => !x.taken) : S.activePick ? [S.activePick] : [];
    const ui = { screen: combat ? 'combat' : S.screen, ev: S.ev, offer: S.offer, reward: S.reward, restUsed: S.restUsed, chest: S.chest, kind: S.kind, combat: combat || null, pendingFront: shown };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, version: HD.version, run: r.toSave(), ui })); } catch (e) { /* storage full or unavailable */ }
  }
  function resumeRun() {
    const save = readSave();
    if (!save) return render();
    const r = (S.run = HD.Run.fromSave(save.run));
    r.feed = [];
    const u = save.ui;
    Object.assign(S, { ev: u.ev, offer: u.offer, reward: u.reward, restUsed: u.restUsed, chest: u.chest, kind: u.kind, overlay: null, activePick: null });
    if (u.pendingFront && u.pendingFront.length) r.pending.unshift(...u.pendingFront);
    if (u.screen === 'combat' && u.combat) return startCombat(u.combat.enc, u.combat.kind);
    S.screen = u.screen;
    S.scrollMap = u.screen === 'map';
    checkPending();
    render();
  }
  function startRun(charId) {
    const input = document.getElementById('seed');
    const seed = (input && input.value.trim()) || Math.random().toString(36).slice(2, 8);
    S.lastSeed = seed;
    S.seedDefault = null;
    const cid = HD.CHARS[charId] ? charId : 'OATHBURNER';
    S.run = new HD.Run(seed, cid, ascChosen(cid));
    S.run.feed = [];
    S.offer = S.run.neowOffer();
    S.screen = 'ancient';
    render();
  }
  async function enterNode(key) {
    const r = S.run;
    if (S.busy || !r.reachable().includes(key)) return;
    r.moveTo(key);
    if (key === 'BOSS') return startCombat(r.boss, 'boss');
    const n = r.map.nodes[key];
    let type = n.type;
    if (type === 'unknown') {
      r.hook('onUnknown');
      type = r.rollUnknown();
      if (type === 'event') {
        const st = r.startEvent();
        if (st) { S.ev = st; S.screen = 'event'; return render(); }
        type = 'monster';
      }
    }
    if (type === 'monster') return startCombat(r.pickEncounter('monster'), 'monster');
    if (type === 'elite') return startCombat(r.pickEncounter('elite'), 'elite');
    if (type === 'rest') { r.hook('onRestSite'); S.restUsed = []; S.screen = 'rest'; }
    if (type === 'shop') {
      r.hook('onShop'); const sh = r.makeShop(); S.screen = 'shop';
      if (r.hasRelic('NOBLE_PARASOL')) {
        for (const c of sh.cards.concat(sh.colorless || [])) if (!c.sold) { r.addCard(c.id, false); c.sold = true; }
        for (const x of sh.relics) if (!x.sold) { r.addRelic(x.id); x.sold = true; }
        for (const x of sh.potions) if (!x.sold && r.addPotion(x.id)) x.sold = true;
      }
    }
    if (type === 'treasure') { S.chest = null; S.screen = 'treasure'; }
    render();
  }
  async function startCombat(enc, kind) {
    Object.assign(S, { kind, sel: null, selPotion: null, busy: true, dragUid: null, prevEnergy: null, bannerTurn: 0, bannerEnemy: 0, handM: null });
    persist({ enc, kind });
    S.hidden.clear(); S.gone.clear(); S.dying.clear(); S.prevHand = new Set();
    S.g = new HD.Combat(S.run, enc, UI, kind);
    S.screen = 'combat';
    render();
    await S.g.start();
    S.busy = false;
    render();
    if (S.g.over) afterCombat();
  }
  function afterCombat() {
    const g = S.g, r = S.run;
    if (S.settled === g) return;
    S.settled = g;
    S.sel = null; S.selPotion = null;
    if (!g.won) { r.hp = 0; S.result = 'dead'; S.screen = 'end'; S.overlay = null; clearSave(); render(); return; }
    r.hp = g.p.hp; r.maxHp = g.p.maxHp;
    r.combatDone(S.kind === 'event' ? 'monster' : S.kind);
    if (S.ev && S.ev.page === 'FOUGHT') { const d = HD.EVENTS[S.ev.id]; if (d.onWin) d.onWin(r, S.ev, g); S.ev = null; }
    if (S.kind === 'event') { setTimeout(() => { S.screen = 'map'; checkPending(); render(); }, reduced() ? 0 : 650); return; }
    S.reward = r.combatRewards(S.kind, g);
    // Let the last enemy finish falling before the spoils appear.
    setTimeout(() => { S.screen = 'reward'; render(); }, reduced() ? 0 : 650);
  }
  async function engine(fn) {
    if (S.busy || (S.g && S.g.over)) return;
    S.busy = true; S.sel = null; S.selPotion = null;
    render();
    await fn();
    S.busy = false;
    S.hidden.clear();
    S.dragUid = null;
    render();
    if (S.g.over) afterCombat();
  }
  function destFor(c, t) {
    const d = CARDS[c.id];
    if (t) { const f = $(`[data-key="e${t.uid}"] .sigil`); if (f) return rectOf(f); }
    if (d.type === 'Power') { const p = $('[data-key="p"] .sigil'); if (p) return rectOf(p); }
    const a = $('.arena'); return a ? rectOf(a) : { x: innerWidth / 2, y: innerHeight / 2 };
  }
  // Plays a card: the card (or its dragged copy) flies to where it lands while the engine resolves.
  function play(c, t, k) {
    if (!reduced()) {
      const el = k || $(`[data-key="h${c.uid}"]`);
      if (el) fly(k || cloneAt(el), destFor(c, t), { end: CARDS[c.id].type === 'Power' ? 0.15 : 0.35 });
      if (CARDS[c.id].type === 'Attack') { const me = $('[data-key="p"] .sigil'); if (me) me.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(26px)' }, { transform: 'translateX(0)' }], { duration: 300, easing: 'ease-out' }); }
    } else if (k) k.remove();
    S.hidden.add(c.uid);
    return engine(() => S.g.playCard(c, t));
  }
  function endTurn() {
    const g = S.g;
    if (g.phase !== 'player' || S.busy) return;
    S.sel = null;
    engine(() => g.endTurn());
  }
  const drink = (i, t) => engine(() => S.g.usePotion(i, t));
  // End of turn: only the cards that are leaving fly to the discard pile (or the Exhaust pile); retained cards stay put.
  UI.handLeaving = (list) => {
    if (reduced()) return;
    const disc = $('[data-act=pile][data-arg=discard]'), ash = $('[data-act=pile][data-arg=ash]');
    list.forEach(({ c, burn }, i) => {
      const el = $(`[data-key="h${c.uid}"]`), to = burn ? ash : disc;
      if (!el || !to) return;
      fly(cloneAt(el), rectOf(to), { end: 0.2, arc: -20, ms: 320, delay: i * 35, spin: 8 });
      el.classList.add('gone');
      S.hidden.add(c.uid);
    });
  };
  function clickCard(c) {
    const g = S.g;
    if (S.busy || !c) return;
    S.selPotion = null;
    if (dragOnly()) { S.sel = S.sel === c ? null : c; render(); return; }
    if (!g.canPlay(c)) { S.sel = null; render(); return; }
    if (S.sel === c) { S.sel = null; render(); return; }
    if (CARDS[c.id].target === 'enemy') {
      const a = g.alive();
      if (a.length === 1) return play(c, a[0]);
      S.sel = c; render(); return;
    }
    play(c, null);
  }
  function pickDeck(title, cards, preview, onPick, required) {
    S.overlay = { kind: 'pick', title, cards, preview, onPick, required };
    render();
  }
  function takeItem(list, i, j) {
    const r = S.run;
    const items = list === 'rw' ? S.reward : S.overlay.items;
    const it = items[i];
    if (!it || it.taken) return;
    if (it.kind === 'gold') r.gainGold(it.n);
    if (it.kind === 'relic') r.addRelic(it.id);
    if (it.kind === 'potion' && !r.addPotion(it.id)) return;
    if (it.kind === 'cards') {
      const c = it.cards[j];
      if (c.taken) return;
      r.addCard(c.id, c.up, c.ench); c.taken = true; it.got = (it.got || 0) + 1;
      if (it.got < (it.n || 1)) return;
    }
    it.taken = true;
    if (list === 'bn' && items.every((x) => x.taken)) S.overlay = null;
    checkPending();
  }
  function restAction(o) {
    const r = S.run;
    const mark = () => { S.restUsed = (S.restUsed || []).concat(o); };
    if (o === 'rest') { r.heal(r.restHeal()); r.hook('onRest'); mark(); }
    if (o === 'lift') { const kb = r.relic('KETTLEBELL'); kb.lifts = (kb.lifts || 0) + 1; mark(); }
    if (o === 'dig') { r.addRelic(r.rollRelic()); mark(); }
    if (o === 'clone') { for (const c of r.deck.filter((x) => x.ench && x.ench.id === 'CLONE')) r.addCard(c.id, c.up); mark(); }
    if (o === 'cook') { r.pending.push({ kind: 'remove' }, { kind: 'remove' }); r.gainMaxHp(9); mark(); checkPending(); }
    if (o === 'kindle') { const k = r.relic('GOURD_CANDLE'); if (k) { k.charges = 5; k.used = false; } mark(); }
    if (o === 'hatch') { for (const c of r.deck.filter((x) => x.id === 'ROC_EGG')) r.removeCard(c); r.addRelic('ROC_CHICK'); mark(); }
    if (o === 'smith') {
      const ups = r.deck.filter((c) => !c.up && ['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type));
      if (!ups.length) { mark(); return; }
      return pickDeck('Choose a card to upgrade (shown upgraded)', ups, true, (c) => { r.upgrade(c); mark(); });
    }
    checkPending();
  }

  function onAct(act, arg) {
    const r = S.run, g = S.g, o = S.overlay;
    switch (act) {
      case 'start': return startRun(arg);
      case 'asc': {
        const [id, step] = arg.split(':');
        S.ascBy[id] = Math.max(0, Math.min(ascMax(id), ascChosen(id) + Number(step)));
        try { localStorage.setItem('hollowdeep.ascChoice', JSON.stringify(S.ascBy)); } catch (e) { /* storage may be off */ }
        return render();
      }
      case 'resume': return resumeRun();
      case 'names': setNames(arg); return render();
      case 'reroll': case 'sacrifice': {
        const [l, i] = arg.split(':'); const items = l === 'rw' ? S.reward : S.overlay.items; const it = items[+i];
        if (act === 'reroll') { it.cards = r.cardReward(S.kind === 'elite' || S.kind === 'boss' ? S.kind : 'monster'); it.rerolled = true; }
        else { it.taken = true; const w = r.relic('OLD_WING'); w.counter = (w.counter || 0) + 1; if (w.counter >= 2) { w.counter = 0; const id = r.rollRelic(); if (id) r.addRelic(id); } }
        return render();
      }
      case 'choicePick': {
        const it = S.overlay.it;
        S.overlay = null; S.activePick = null;
        r.choiceDone(it, it.act === 'potionGive' ? +arg : arg);
        checkPending();
        return render();
      }
      case 'throwAtMerchant': { const i = S.overlay.i; r.potions[i] = null; r.gainGold(100); S.overlay = null; return render(); }
      case 'ev-pick': {
        const res = r.eventChoose(S.ev, arg);
        if (r.hp <= 0) { r.hp = 0; S.result = 'dead'; S.screen = 'end'; S.overlay = null; S.g = null; S.deathBy = HD.EVENTS[S.ev.id].name; clearSave(); return render(); }
        if (res.fight) return startCombat(res.fight, res.kind || 'monster');
        checkPending();
        return render();
      }
      case 'gift': r.addRelic(arg); S.screen = 'map'; S.scrollMap = true; checkPending(); return render();
      case 'title': S.screen = 'title'; S.overlay = null; return render();
      case 'node': return enterNode(arg);
      case 'card': return clickCard(g.hand.find((c) => String(c.uid) === arg));
      case 'foe': {
        const e = g.alive().find((x) => String(x.uid) === arg);
        if (!e) return;
        if (S.sel && dragOnly()) { S.sel = null; return render(); }
        if (S.sel) return play(S.sel, e);
        if (S.selPotion != null) return drink(S.selPotion, e);
        return;
      }
      case 'end': return endTurn();
      case 'log': S.showLog = !S.showLog; return render();
      case 'pile': {
        const byName = (xs) => xs.slice().sort((a, b) => CARDS[a.id].name.localeCompare(CARDS[b.id].name));
        const src = arg === 'deck' ? r.deck : arg === 'draw' ? byName(g.draw) : arg === 'discard' ? g.discard.slice().reverse() : g.ash;
        const title = { deck: 'Your deck', draw: 'Draw pile (shown in name order)', discard: 'Discard pile', ash: T('Ash pile') }[arg];
        S.overlay = { kind: 'pile', title, cards: src };
        return render();
      }
      case 'close':
        // Closing the card inspector returns to whatever sheet was open under it.
        S.overlay = o && (o.kind === 'cardinfo' || o.kind === 'info') ? o.prev || null : null;
        if (!S.overlay) { S.activePick = null; checkPending(); }
        return render();
      case 'choose': {
        const c = o.from.find((x) => String(x.uid) === arg);
        const min = o.min != null ? o.min : o.n;
        if (o.n === 1 && min === 1) { S.overlay = null; render(); return o.res([c]); }
        const i = o.picked.indexOf(c);
        if (i >= 0) o.picked.splice(i, 1); else if (o.picked.length < o.n) o.picked.push(c);
        return render();
      }
      case 'confirm': { const res = o.res, picked = o.picked; S.overlay = null; render(); return res(picked); }
      case 'pick': { const c = o.cards.find((x) => String(x.uid) === arg); S.overlay = null; o.onPick(c); checkPending(); return render(); }
      case 'potion': {
        if (S.busy && S.screen === 'combat') return;
        S.sel = null; S.selPotion = null;
        const id = r.potions[+arg];
        S.overlay = { kind: 'potion', i: +arg, title: HD.POTIONS[id].name };
        return render();
      }
      case 'drink': {
        const i = o.i;
        const d = HD.POTIONS[r.potions[i]];
        S.overlay = null;
        if (S.screen === 'combat') {
          if (d.target === 'enemy' && g.alive().length > 1) { S.selPotion = i; return render(); }
          return drink(i, d.target === 'enemy' ? g.alive()[0] : null);
        }
        r.potions[i] = null;
        d.useOutside(r);
        return render();
      }
      case 'toss': r.potions[o.i] = null; S.overlay = null; return render();
      case 'take': { const [l, i] = arg.split(':'); takeItem(l, +i); return render(); }
      case 'takecard': { const [l, i, j] = arg.split(':'); takeItem(l, +i, +j); return render(); }
      case 'skip': { const [l, i] = arg.split(':'); const items = l === 'rw' ? S.reward : o.items; items[+i].taken = true; if (l === 'bn' && items.every((x) => x.taken)) { S.overlay = null; checkPending(); } return render(); }
      case 'bonus-done': S.overlay = null; checkPending(); return render();
      case 'continue': {
        const gold = S.reward.find((x) => x.kind === 'gold' && !x.taken);
        if (gold) { r.gainGold(gold.n); gold.taken = true; }
        if (S.kind === 'boss') {
          if (r.act >= HD.LAST_ACT) {
            const second = r.secondBossFor();
            if (second) return startCombat(second, 'boss');
            S.unlocked = unlockAscension(r.charId, r.asc || 0);
            S.result = 'won'; S.screen = 'end'; clearSave(); return render();
          }
          r.startAct(r.act + 1);
          S.offer = r.ancientOffer();
          S.screen = 'ancient';
          return render();
        }
        S.screen = 'map'; S.scrollMap = true; return render();
      }
      case 'to-map': S.screen = 'map'; S.scrollMap = true; return render();
      case 'rest': restAction(arg); return render();
      case 'buy': { const [kind, i] = arg.split(':'); r.buy(kind, +i); checkPending(); return render(); }
      case 'remove': {
        const cost = r.removalCost();
        if (r.gold < cost || r.shop.removed) return;
        return pickDeck('Choose a card to remove', r.removable(), false, (c) => { r.removeCard(c); r.gold -= cost; r.removals++; r.shop.removed = true; });
      }
      case 'open-chest': S.chest = Object.assign(r.treasure(), { taken: false }); return render();
      case 'take-chest': r.gainGold(S.chest.gold); r.addRelic(S.chest.relic); S.chest.taken = true; checkPending(); return render();
    }
  }

  // ---------- input ----------
  document.addEventListener('click', (ev) => {
    if (S.suppressClick) { S.suppressClick = false; return; }
    const el = ev.target.closest('[data-act]');
    if (!el && S.screen === 'combat' && S.sel && dragOnly() && !ev.target.closest('.card')) { S.sel = null; return render(); }
    if (!el || el.disabled) return;
    if (el.dataset.act === 'info') { S.overlay = { kind: 'info', title: el.dataset.title, body: el.dataset.body }; return render(); }
    onAct(el.dataset.act, el.dataset.arg);
  });
  // Press and hold any card to read it up close with its keywords.
  let hold = null;
  const cancelHold = () => { if (hold) { clearTimeout(hold.t); hold = null; } };
  document.addEventListener('pointerdown', (ev) => {
    cancelHold();
    const card = ev.target.closest('.card[data-cid]');
    const item = !card && ev.pointerType === 'touch' ? ev.target.closest(GLOSSED) : null;
    if (item && ev.button === 0) {
      const own = item.querySelector('b') ? item.querySelector('b').textContent.trim() : '';
      if (glossIn(item.textContent, own).length) {
        hold = { x: ev.clientX, y: ev.clientY, t: setTimeout(() => {
          hold = null;
          S.suppressClick = true;
          const body = item.textContent.replace(own, '').replace(/\s+/g, ' ').trim();
          S.overlay = { kind: 'info', title: own || 'Details', body, prev: S.overlay };
          render();
        }, 480) };
      }
    }
    if (card && ev.button === 0 && !(S.overlay && S.overlay.kind === 'cardinfo')) {
      hold = { x: ev.clientX, y: ev.clientY, t: setTimeout(() => {
        hold = null;
        if (drag && drag.on) return;
        drag = null;
        S.suppressClick = true;
        S.overlay = { kind: 'cardinfo', title: card.querySelector('.cname').textContent, id: card.dataset.cid, up: card.dataset.up === '1', prev: S.overlay };
        render();
      }, 480) };
    }
  });
  document.addEventListener('pointermove', (ev) => { if (hold && Math.hypot(ev.clientX - hold.x, ev.clientY - hold.y) > 10) cancelHold(); });
  document.addEventListener('pointerup', cancelHold);
  document.addEventListener('pointercancel', cancelHold);
  document.addEventListener('contextmenu', (ev) => { if (ev.target.closest('.card')) ev.preventDefault(); });
  document.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || S.screen !== 'combat' || S.busy || S.overlay || !S.g) return;
    const el = ev.target.closest('.hand .card');
    if (!el) return;
    const c = S.g.hand.find((x) => `h${x.uid}` === el.dataset.key);
    if (c) drag = { c, el, x0: ev.clientX, y0: ev.clientY, on: false };
  });
  document.addEventListener('pointermove', (ev) => {
    S.mouse = { x: ev.clientX, y: ev.clientY };
    if (drag && !drag.on) {
      if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 12) return;
      if (S.busy || !S.g.canPlay(drag.c)) { drag = null; return; }
      startDrag();
    }
    if (drag && drag.on) moveDrag(ev.clientX, ev.clientY);
    updateAim();
  });
  document.addEventListener('pointerup', (ev) => {
    if (drag && drag.on) endDrag(ev.clientX, ev.clientY);
    drag = null;
    setTimeout(() => { S.suppressClick = false; }, 0);
  });
  document.addEventListener('pointercancel', () => { if (drag && drag.on) { const d = drag; drag = null; if (d.line) d.line.remove(); cancelDrag(d.c, d.k); } drag = null; });
  window.addEventListener('resize', updateAim);
  document.addEventListener('keydown', (ev) => {
    const el = document.activeElement;
    if (el && el.tagName === 'INPUT') { if (ev.key === 'Enter' && S.screen === 'title') startRun(); return; }
    if ((ev.key === 'Enter' || ev.key === ' ') && el && el.dataset && el.dataset.act && el.tagName !== 'BUTTON') { ev.preventDefault(); onAct(el.dataset.act, el.dataset.arg); return; }
    if (ev.key === 'Escape') {
      if (drag && drag.on) { const d = drag; drag = null; return cancelDrag(d.c, d.k); }
      if (S.overlay && S.overlay.kind === 'cardinfo') { S.overlay = S.overlay.prev || null; return render(); }
      if (S.overlay && ['pile', 'potion', 'info'].includes(S.overlay.kind)) { S.overlay = null; return render(); }
      if (S.sel || S.selPotion != null) { S.sel = null; S.selPotion = null; return render(); }
    }
    if (S.screen !== 'combat' || S.overlay) return;
    if (ev.key === 'e' || ev.key === 'E') return endTurn();
    if (/^[0-9]$/.test(ev.key)) {
      const i = ev.key === '0' ? 9 : +ev.key - 1;
      const e = S.g.alive()[i];
      if (S.sel) { if (e) play(S.sel, e); return; }
      if (S.selPotion != null) { if (e) drink(S.selPotion, e); return; }
      clickCard(S.g.hand[i]);
    }
  });

  // ---------- ambient background ----------
  // Slow motes drifting up through the dark: spores between fights, embers during them.
  const BG = (() => {
    const cv = document.getElementById('bg');
    if (!cv || !cv.getContext) return { set() {} };
    const ctx = cv.getContext('2d');
    let mode = null, col = '#888', motes = [], w = 0, h = 0, last = 0, raf = 0;
    const spawn = (any) => ({ x: Math.random() * w, y: any ? Math.random() * h : h + 8, r: 0.6 + Math.random() * 1.9, vy: 0.1 + Math.random() * 0.28, ph: Math.random() * 6.28, a: 0.12 + Math.random() * 0.3 });
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motes = Array.from({ length: Math.round((w * h) / 24000) }, () => spawn(true));
    }
    function paint(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = col;
      const speed = mode === 'fight' ? 1.5 : 1;
      for (const m of motes) {
        if (t != null) {
          m.y -= m.vy * speed;
          m.x += Math.sin(t / 1900 + m.ph) * 0.18;
          if (m.y < -8) Object.assign(m, spawn(false));
        }
        ctx.globalAlpha = m.a * (0.65 + 0.35 * Math.sin((t || 0) / 800 + m.ph));
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
      }
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (t - last < 33) return;
      last = t;
      paint(t);
    }
    function start() { cancelAnimationFrame(raf); if (reduced()) paint(null); else raf = requestAnimationFrame(frame); }
    function pickColor() { col = getComputedStyle(document.documentElement).getPropertyValue(mode === 'fight' ? '--wax2' : '--lichen').trim() || '#888'; }
    window.addEventListener('resize', () => { size(); if (reduced()) paint(null); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else start(); });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pickColor);
    size();
    return { set(m) { if (m === mode) return; mode = m; pickColor(); start(); } };
  })();

  HD.boot = () => {
    let saved = null;
    try { saved = localStorage.getItem(NAME_KEY); } catch (e) { /* storage unavailable */ }
    HD.setVersion();
    HD.setNames(saved || 'original');
    render();
  };
  HD.state = S; // exposed for debugging in the console
  HD.render = render;
  HD.UI = UI;
})();

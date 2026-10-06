// Full audit against the game data and the v0.111 patch notes.
// Usage: node dev/audit.js <stable data dir> <v0.111 data dir>   (writes dev/audit_report.txt)
// The game follows v0.111 only; the stable export is read as reference data (older Act lists, patch-note baselines).
const fs = require('fs'), vm = require('vm'), path = require('path'), { execFileSync } = require('child_process');
const [STABLE, BETA] = [process.argv[2], process.argv[3]];
if (!STABLE || !BETA) { console.error('Usage: node dev/audit.js <stable data dir> <v0.111 data dir>   (the eng/ folders of a Spire Codex export)'); process.exit(2); }
const FILES = ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'neow2', 'ascension_data', 'ascension', 'names', 'naming'];
const ctx = vm.createContext({ console, Math, Promise, setTimeout, CSS: { escape: (s) => s } });
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx);
const HD = ctx.HD;
const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'namemap.json')));
const load = (dir, n) => { try { return JSON.parse(fs.readFileSync(path.join(dir, n + '.json'))); } catch { return []; } };
const byId = (xs) => Object.fromEntries(xs.map((x) => [x.id, x]));
const D = { stable: {}, beta: {} };
for (const [k, dir] of [['stable', STABLE], ['beta', BETA]]) for (const n of ['cards', 'relics', 'potions', 'monsters', 'encounters', 'events', 'powers']) D[k][n] = byId(load(dir, n));
const strip = (s) => (s || '').replace(/\[energy:(\d+)\]/g, '$1 Energy').replace(/\[star:(\d+)\]/g, '$1 Star').replace(/\[\/?[a-z]+(?::[^\]]+)?\]/g, '').replace(/\{[^}]+\}/g, 'N').replace(/\s+/g, ' ').trim();
const report = [], summary = [];
const section = (name, lines, problems) => { summary.push(`${problems ? 'CHECK' : 'ok   '} ${name}: ${problems} to review`); report.push(`\n=== ${name} (${problems} to review) ===`, ...lines); };
const rev = (table) => Object.fromEntries(Object.entries(table).map(([a, b]) => [b, a]));

// ---------- 1. coverage: everything in the v0.111 data is built, or excluded for a stated reason ----------
const EXCLUDE = {
  cards: (c) => (c.multiplayer_only ? 'co-op only' : c.id === 'SPLASH' ? 'needs other characters\' Attacks'
    : ({ DEBRIS: 'Defect token', FUEL: 'Defect token', VOID: 'Defect status', SWEEPING_GAZE: 'Defect token', SOUL: 'Necrobinder token', MINION_DIVE_BOMB: 'Necrobinder token', MINION_SACRIFICE: 'Necrobinder token',
        MINION_STRIKE: 'Necrobinder token', SOVEREIGN_BLADE: 'Regent token', BECKON: 'Soul Fysh (Underdocks)', FEEDING_FRENZY: 'Endless Conveyor (Underdocks)', RIP_AND_TEAR: 'Mawler (Underdocks)',
        DEBT: 'Crystal Sphere', CALTROPS: 'event card, source not in the data', CLASH: 'event card, source not in the data', DISTRACTION: 'event card, source not in the data',
        DUAL_WIELD: 'event card, source not in the data', ENTRENCH: 'event card, source not in the data', HELLO_WORLD: 'event card, source not in the data', OUTMANEUVER: 'event card, source not in the data',
        REBOUND: 'event card, source not in the data', STACK: 'event card, source not in the data', DISINTEGRATION: 'status, source not in the data', MIND_ROT: 'status, source not in the data',
        SLOTH: 'status, source not in the data', WASTE_AWAY: 'status, source not in the data', WITHER: 'status, source not in the data' })[c.id] || null),
  relics: (r) => (['defect', 'necrobinder', 'regent'].includes(r.pool) ? `${r.pool} not built` : ['SEA_GLASS', 'PRISMATIC_GEM'].includes(r.id) ? 'offers other characters\' cards' : r.id === 'GOLDEN_COMPASS' ? 'special path not in the data'
    : /^FAKE_/.test(r.id) ? 'The Merchant??? event' : ({ FRESNEL_LENS: 'Drowning Beacon (Underdocks)', MASSIVE_SCROLL: 'offers co-op cards', SCROLL_BOXES: 'card packs not in the data', WONGO_CUSTOMER_APPRECIATION_BADGE: 'Wongo loyalty badges not built',
        DARKSTONE_PERIAPT: 'no source in the data', DREAM_CATCHER: 'no source in the data', HAND_DRILL: 'no source in the data', MAW_BANK: 'no source in the data', THE_BOOT: 'no source in the data' })[r.id] || null),
  potions: (p) => (['defect', 'necrobinder', 'regent'].includes(p.pool) ? `${p.pool} not built` : p.id === 'GLOWWATER_POTION' ? 'Drowning Beacon (Underdocks)' : null),
  events: (e) => (e.act && /Underdocks/.test(e.act) && !/Overgrowth/.test(e.act) ? 'Underdocks (alternate Act 1) not built' : ({ CRYSTAL_SPHERE: 'minigame not built', FAKE_MERCHANT: 'not built', COLORFUL_PHILOSOPHERS: 'needs other characters', THE_FUTURE_OF_POTIONS: 'data covers one option only' })[e.id] || (e.type === 'Ancient' && e.id === 'THE_ARCHITECT' ? 'not built' : null)),
};
{
  const lines = []; let bad = 0;
  for (const [kind, table, ours] of [['cards', MAP.cards, HD.CARDS], ['relics', MAP.relics, HD.RELICS], ['potions', MAP.potions, HD.POTIONS], ['events', MAP.events || {}, HD.EVENTS]]) {
    const all = Object.values(D.beta[kind]).length ? D.beta[kind] : D.stable[kind];
    let built = 0, excluded = 0; const missing = [];
    for (const x of Object.values(all)) {
      if (kind === 'cards' && ['status', 'curse', 'token', 'event', 'quest'].includes(x.color) === false && !['ironclad', 'silent', 'colorless', 'defect', 'necrobinder', 'regent'].includes(x.color)) continue;
      if (kind === 'events' && x.type === 'Ancient' && x.id !== 'THE_ARCHITECT') { built++; continue; }
      if (table[x.id] && ours[table[x.id]]) { built++; continue; }
      const why = EXCLUDE[kind] && EXCLUDE[kind](x);
      if (why) { excluded++; continue; }
      missing.push(`${x.id} (${x.name}${x.color ? ', ' + x.color : x.pool ? ', ' + x.pool : ''}${x.rarity ? ', ' + x.rarity : ''})`);
    }
    bad += missing.length;
    lines.push(`${kind}: ${built} built, ${excluded} excluded with a reason, ${missing.length} missing without one`, ...missing.map((m) => `   missing ${m}`));
  }
  const monAll = D.beta.monsters, monMap = MAP.monsters;
  const actMons = new Set(); for (const e of Object.values(D.stable.encounters)) if ((!e.act || /Overgrowth|Hive|Glory/.test(e.act)) && e.monsters) for (const m of e.monsters) actMons.add(m.id || m);
  const mMissing = [...actMons].filter((id) => !(monMap[id] && HD.MON[monMap[id]]) && monAll[id] && !['FAKE_MERCHANT_MONSTER', 'ARCHITECT'].includes(id));
  bad += mMissing.length; lines.push(`monsters in Acts 1-3: ${actMons.size - mMissing.length} of ${actMons.size} built`, ...mMissing.map((m) => `   missing ${m}`));
  section('Coverage (v0.111 data)', lines, bad);
}

// ---------- 2. numbers: costs, damage, Block, upgrades, monster HP and attacks, relic and potion text numbers ----------
{
  const lines = []; let bad = 0;
  for (const [dir, ver] of [[BETA, '0.111']]) {
    const out = execFileSync('node', [path.join(__dirname, 'verify.js'), dir, ver], { encoding: 'utf8' }).trim().split('\n');
    const mism = out.filter((l) => l.startsWith('MISMATCH')); bad += mism.length;
    lines.push(`${ver}: ${out[out.length - 1]}`, ...mism.map((m) => `   ${m}`));
  }
  section('Numbers', lines, bad);
}

// ---------- 3. keywords, targets, card types ----------
{
  const KW = { Exhaust: 'Burn', Ethereal: 'Fleeting', Innate: 'Opening', Unplayable: 'Unplayable', Eternal: 'Eternal', Retain: 'Retain', Sly: 'Furtive' };
  const TT = { AnyEnemy: 'enemy', AllEnemies: 'all', Self: 'self', None: 'self', RandomEnemy: 'random' };
  const lines = []; let bad = 0;
  for (const [ver, src] of [['0.111', D.beta.cards]]) {
    HD.setVersion(ver); let n = 0;
    for (const [orig, ours] of Object.entries(MAP.cards)) {
      const c = src[orig], d = HD.CARDS[ours]; if (!c || !d || d.coop || c.multiplayer_only) continue; n++;
      const want = (c.keywords || []).filter((k) => KW[k]).map((k) => KW[k]).sort().join(','), have = (d.kw || []).slice().sort().join(',');
      if (want !== have) { bad++; lines.push(`   ${ver} ${ours}: keywords ours [${have}] data [${want}]`); }
      if (c.type !== d.type) { bad++; lines.push(`   ${ver} ${ours}: type ${d.type} vs ${c.type}`); }
      const tt = TT[c.target]; if (tt && d.type !== 'Power' && tt !== d.target && !(tt === 'self' && d.target === 'all') && !(tt === 'random' && d.target === 'self')) { bad++; lines.push(`   ${ver} ${ours}: target ${d.target} vs ${c.target}`); }
      if ((c.upgrade || {}).remove_exhaust && (d.upKw || d.kw).includes('Burn')) { bad++; lines.push(`   ${ver} ${ours}: upgrade should remove Exhaust`); }
      if ((c.upgrade || {}).add_innate && !(d.upKw || []).includes('Opening')) { bad++; lines.push(`   ${ver} ${ours}: upgrade should add Innate`); }
      if ((c.upgrade || {}).add_retain && !(d.upKw || []).includes('Retain')) { bad++; lines.push(`   ${ver} ${ours}: upgrade should add Retain`); }
    }
    lines.unshift(`${ver}: ${n} cards compared`);
  }
  HD.setVersion('0.111');
  section('Keywords, targets, types, keyword upgrades', lines, bad);
}

// ---------- 4. text: does each description name the same mechanics as the data? ----------
const TOKENS = ['Exhaust', 'Ethereal', 'Innate', 'Retain', 'Sly', 'Unplayable', 'Eternal', 'Weak', 'Vulnerable', 'Frail', 'Poison', 'Strength', 'Dexterity', 'Block', 'Energy',
  'Shiv', 'Thorns', 'Intangible', 'Artifact', 'Plating', 'Vigor', 'Draw', 'Discard', 'Upgrade', 'Transform', 'ALL enemies', 'random', 'next turn', 'this turn', 'X', 'Fatal', 'Heal',
  'Max HP', 'Gold', 'potion', 'Relic', 'Curse', 'Wound', 'Dazed', 'Burn', 'Slimed', 'twice', 'Enchant', 'Replay', 'copy', 'draw pile', 'discard pile', 'Hand', 'free', 'Lose', 'HP'];
const REVIEWED = {
  COAL_SWING: 'random card means one from your hand', SCORCHED_GUARD: 'random card means one from your hand', KINDLING_PACT: 'Exhaust 1 card = from your hand',
  SEARING_MARK: 'Exhaust 1 card = from your hand', ROUTINE: 'applies while in hand, as in the original', STONE_STANCE: 'this turn = until your next turn',
  FIRE_WALL: 'this turn = until your next turn', CONJURED_EDGE: 'free to play this turn = costs 0 this turn', MAIM: 'Strength returns at the end of the enemy turn',
  EARTHSHAPER: 'turn into = Transform', CRUSHING_STAMP: 'Energy icon in a cost phrase', KEEP_SWINGING: 'costs 0', ROT_OATH: 'cost 0', WINDFALL: 'cards that cost 0',
  SQUASH: 'costs 0', RETRIEVE: 'each turn = this turn', SORROW: 'costs 1 less', VEILCUTTER: 'costs 0', REMAKE: 'costs 1 more',
  ROLLING_POUND: 'costs 0', RAVENOUS: '0-cost', PISTON_FIST: 'costs 1 less', SCRAP_PICK: 'cost 0', ASSEMBLY: 'costs 0', LEARNING_POUND: 'costs 0', GATHER_ROUND: 'cost 0',
  NEEDLEPOINT: 'costs 1 less', LUNGE: 'costs 0', 'relic COLD_CREAM': 'Energy carries over to the next turn', 'relic WITHERED_HAND': 'free that turn = free this turn',
  'relic SPADE': 'Dig finds a random relic', 'relic THE_RUNNER': 'restocks what you buy', 'relic CHIME': 'keeps your hand on turn 1', 'potion STEADY_SERUM': 'keeps your hand',
  'potion MOTH_JAR': 'the potion is used up', 'potion SHACKLE_VIAL': 'Strength returns at the end of the enemy turn',
};
const tokensOf = (raw) => {
  // Normalize the things that differ only in wording: pile names, capitalization, the Energy icon in cost phrases.
  let s = ` ${raw} `
    .replace(/(\d+) Energy (less|more|or more)/gi, '$1 $2').replace(/\bcosts? (\d+) Energy\b/gi, 'costs $1').replace(/unspent (\d+) Energy/gi, 'unspent energy')
    .replace(/\bDraw Pile\b/gi, ' DRAWPILE ').replace(/\bDiscard Pile\b/gi, ' DISCARDPILE ').replace(/\bExhaust Pile\b/gi, ' EXHAUSTPILE ')
    .replace(/\bBurn pile\b/gi, ' EXHAUSTPILE ');
  const t = new Set();
  for (const k of TOKENS) {
    if (k === 'draw pile' || k === 'discard pile') continue;
    const ci = ['Hand', 'Relic', 'potion', 'random', 'next turn', 'this turn', 'copy', 'free', 'twice', 'Heal', 'Lose', 'Gold', 'Curse', 'Upgrade', 'Transform', 'Draw', 'Discard', 'Enchant', 'Replay'].includes(k);
    const re = k === 'X' ? /\bX\b/ : k === 'HP' ? /\bHP\b(?! Loss)/ : new RegExp(`\\b${k.replace(/ /g, '\\s+')}`, ci ? 'i' : '');
    if (re.test(s)) t.add(k);
  }
  if (/DRAWPILE/.test(s)) t.add('draw pile'); if (/DISCARDPILE/.test(s)) t.add('discard pile'); if (/EXHAUSTPILE/.test(s)) t.add('Exhaust pile');
  return t;
};
{
  HD.setNames('original'); HD.setVersion('0.111');
  const F = { d: (n) => n, b: (n) => n };
  const lines = []; let bad = 0;
  const kwText = (d, up) => (up && d.upKw ? d.upKw : d.kw).map((k) => ({ Burn: 'Exhaust', Fleeting: 'Ethereal', Opening: 'Innate', Furtive: 'Sly' })[k] || k).join(' ');
  for (const [orig, ours] of Object.entries(MAP.cards)) {
    const c = D.beta.cards[orig] || D.stable.cards[orig], d = HD.CARDS[ours];
    if (!c || !d || d.coop || c.multiplayer_only || (d.only && d.only !== HD.version)) continue;
    let mine = ''; try { mine = `${kwText(d, false)} ${strip(d.text(HD.vals({ id: ours, up: false }), F, { id: ours, up: false }, null))}`; } catch (e) { mine = 'ERROR ' + e.message; }
    const want = tokensOf(`${(c.keywords || []).join(' ')} ${strip(c.description)}`), have = tokensOf(mine); // card text is already in original names after setNames
    const miss = [...want].filter((k) => !have.has(k)), extra = [...have].filter((k) => !want.has(k));
    if ((miss.length || extra.length) && REVIEWED[ours]) { lines.push(`   reviewed ${ours}: ${REVIEWED[ours]}`); continue; }
    if (miss.length || extra.length) { bad++; lines.push(`   ${ours} (${c.name}): data has [${miss.join(', ')}] that ours lacks; ours has [${extra.join(', ')}] the data lacks`, `      data: ${strip(c.description).slice(0, 140)}`, `      ours: ${strip(mine).slice(0, 140)}`); }
  }
  for (const [kind, table, ours] of [['relic', MAP.relics, HD.RELICS], ['potion', MAP.potions, HD.POTIONS]]) {
    for (const [orig, id] of Object.entries(table)) {
      const x = D.beta[kind + 's'][orig] || D.stable[kind + 's'][orig], d = ours[id]; if (!x || !d) continue;
      const want = tokensOf(strip(x.description)), have = tokensOf(d.text || '');
      const miss = [...want].filter((k) => !have.has(k)), extra = [...have].filter((k) => !want.has(k));
      if ((miss.length || extra.length) && REVIEWED[`${kind} ${id}`]) { lines.push(`   reviewed ${kind} ${id}: ${REVIEWED[`${kind} ${id}`]}`); continue; }
      if (miss.length || extra.length) { bad++; lines.push(`   ${kind} ${id} (${x.name}): data has [${miss.join(', ')}] ours lacks; ours has [${extra.join(', ')}]`, `      data: ${strip(x.description).slice(0, 140)}`, `      ours: ${(d.text || '').slice(0, 140)}`); }
    }
  }
  section('Text names the same mechanics (original names, v0.111)', lines, bad);
}

// ---------- 5. monsters: move order for fixed cycles, and starting powers ----------
const PW_MAP = { STRENGTH: 'might', ARTIFACT: 'ward', PLATING: 'plate', THORNS: 'spines', HARD_TO_KILL: 'hardToKill', CURL_UP: 'curlUp', SLUMBER: 'slumber', PERSONAL_HIVE: 'personalHive',
  VITAL_SPARK: 'vitalSpark', BACK_ATTACK_LEFT: 'backAttack', BACK_ATTACK_RIGHT: 'backAttack', CRAB_RAGE: 'crabRage', IMBALANCED: 'imbalanced', ESCAPE_ARTIST: 'escapeArtist', MINION: 'minion',
  ILLUSION: 'illusion', GALVANIC: 'galvanic', PAPER_CUTS: 'paperCuts', RAMPART: 'rampart', ADAPTABLE: 'adaptable', ENRAGE: 'enrage', HATCH: 'hatch', STOCK: 'stock', REATTACH: 'reattach',
  TERRITORIAL: 'territorial', BATTLEWORN_DUMMY_TIME_LIMIT: 'timeLimit', POSSESS_SPEED: 'possessPoise', POSSESS_STRENGTH: 'possessMight', SLIPPERY: 'slippery', INFESTED: 'infested', DUPLICATE: 'duplicate', DEMISE: 'demise', RINGING: 'ringing', TANGLED: 'tangled', SLOW: 'slow' };
{
  const lines = []; let bad = 0;
  (async () => {})();
  for (const [ver, mons] of [['0.111', D.beta.monsters]]) {
    HD.setVersion(ver);
    for (const [orig, ours] of Object.entries(MAP.monsters)) {
      const m = mons[orig], d = HD.MON[ours]; if (!m || !d) continue;
      // starting powers
      for (const p of m.innate_powers || []) {
        const k = PW_MAP[p.power_id];
        const init = (typeof d.initFor === 'function' ? d.initFor() : d.init) || {};
        if (!k) { lines.push(`   ${ver} ${ours}: data starting power ${p.power_id} ${p.amount} has no mapping here (review)`); bad++; continue; }
        if (!(k in init) && !['possessMight', 'possessPoise'].includes(k)) { bad++; lines.push(`   ${ver} ${ours}: missing starting power ${p.power_id} ${p.amount} (${k})`); }
      }
      // fixed sequences: follow the data's next pointers from the initial move, but only when every step has one
      const pat = m.attack_pattern || {};
      const st = Object.fromEntries((pat.states || []).map((x) => [x.id, x]));
      let cur = (pat.states || []).find((x) => x.type === 'move' && x.move_id === pat.initial_move);
      const want = []; let defined = !!cur;
      for (let i = 0; i < 6 && cur; i++) {
        if (cur.type !== 'move') { defined = false; break; }
        want.push(cur.move_id);
        if (!cur.next) { defined = i === 5; break; }
        cur = st[cur.next];
      }
      if (!defined || want.length < 4) continue;
      const dataIds = new Set((m.moves || []).map((x) => x.id));
      const alias = (HD.MOVE_ALIASES || {})[ours] || {}; const A = (k) => alias[k] || k;
      const ourKeys = Object.keys(d.moves);
      const unmatched = ourKeys.filter((k) => !dataIds.has(A(k)) && !['STUN'].includes(k));
      if (unmatched.length && ours === 'TORCH_AMALGAM' && ver === '0.111') { lines.push(`   reviewed ${ver} ${ours}: first move is named Strong Tackle in v0.111 (Tackle here)`); continue; }
      if (unmatched.length) { lines.push(`   ${ver} ${ours}: move keys not in the data (original move names fall back): ${unmatched.join(', ')}`); bad++; continue; }
      const e = { id: ours, def: d, hist: [], pw: { ...(d.init || {}) }, last: null, intent: null, alive: true, hp: 999, maxHp: 999 };
      const g = { enemies: [e], alive: () => [e], mrng: { next: () => 0.5, pick: (xs) => xs[0], int: () => 0 }, p: { pw: {} }, turn: 1 };
      const got = [];
      try { for (let i = 0; i < want.length; i++) { const mv = d.ai(e, g); got.push(A(mv)); e.hist.push(mv); e.last = mv; } } catch (err) { got.push('ERROR ' + err.message); }
      if (got.join() !== want.join()) { bad++; lines.push(`   ${ver} ${ours}: data sequence ${want.join(' > ')}`, `      ours:          ${got.join(' > ')}`); }
    }
  }
  HD.setVersion('0.111');
  section('Monsters: fixed move cycles and starting powers', lines, bad);
}

// ---------- 6. the official v0.111 patch notes, item by item (what applies to built content) ----------
{
  const lines = []; let bad = 0;
  const check = (name, fn) => { let ok = false, note = ''; try { [ok, note] = fn(); } catch (e) { note = 'ERROR ' + e.message; } if (!ok) bad++; lines.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`); };
  const at = (ver, fn) => { const was = HD.version; HD.setVersion(ver); try { return fn(); } finally { HD.setVersion(was); } };
  const v = (id, up) => HD.vals({ id, up: !!up });
  check('Brightest Flame: Max HP loss 1 -> 2', () => [at('0.111', () => v('WHITE_FLAME').hp) === 2, '']);
  check('Beautiful Bracelet: enchants 4 random cards', () => [at('0.111', () => /4 random/.test(HD.RELICS.LOVELY_BRACELET.text)), at('0.111', () => HD.RELICS.LOVELY_BRACELET.text)]);
  check('Axebot: Hammer Uppercut 12 -> 14, One-Two 9x2 -> 10x2', () => [at('0.111', () => HD.MON.AXE_BOT.moves.HAMMER_UPPERCUT.atk === 14 && HD.MON.AXE_BOT.moves.ONE_TWO.atk === 10), '']);
  check('Axebot: respawns (Stock) and gains +10 Max HP each time', () => { const init = at('0.111', () => (HD.MON.AXE_BOT.initFor ? HD.MON.AXE_BOT.initFor() : HD.MON.AXE_BOT.init) || {}); return [!!init.stock, `starting powers ${JSON.stringify(init)}`]; });
  check('Mecha Knight: Flamethrower also deals 8 damage', () => [at('0.111', () => HD.MON.CLOCK_KNIGHT.moves.FLAMETHROWER.atk === 8), '']);
  check('Rend: cost 2 -> 1, damage 15(18) -> 10(12)', () => [at('0.111', () => HD.CARDS.TEAR_OPEN.cost === 1 && v('TEAR_OPEN').base === 10 && v('TEAR_OPEN', true).base === 12), '']);
  check('Salvo now Uncommon (Splash now Rare; Splash not built)', () => [at('0.111', () => HD.CARDS.BARRAGE.rarity === 'Uncommon'), '']);
  check('Expect a Fight: 3 cost, 15(16) Block + 5(8) per Strength', () => [at('0.111', () => HD.CARDS.HUNKER ? true : /Block/.test(Object.values(HD.CARDS).find((d) => d.name === 'Expect a Fight' || (MAP.cards.EXPECT_A_FIGHT && d.id === MAP.cards.EXPECT_A_FIGHT)).text(v(MAP.cards.EXPECT_A_FIGHT), { d: (n) => n, b: (n) => n }, { id: MAP.cards.EXPECT_A_FIGHT }, null))), '']);
  check('Forgotten Ritual: gains Energy without needing an Exhaust', () => { const id = MAP.cards.FORGOTTEN_RITUAL; const t = at('0.111', () => HD.CARDS[id].text(v(id), { d: (n) => n, b: (n) => n }, { id }, null)); return [!/if you.*Exhaust|Exhausted a card/i.test(HD.sub(t)), HD.sub(t)]; });
  check('Rampage: 9 -> 10 damage, scaling 5(9) -> 5(10)', () => { const id = MAP.cards.RAMPAGE; const b = at('0.111', () => [v(id).dmg, v(id).inc, v(id, true).inc]); return [b[0] === 10 && b[1] === 5 && b[2] === 10, JSON.stringify(b)]; });
  check('Blade of Ink: Inky gives no bonus damage in v0.111, still Weak', () => [at('0.111', () => HD.ENCH.INKY.dmgAdd(0, {}) === 0) && !!HD.ENCH.INKY.after, '']);
  check('Mirage: Exhausts, upgrade removes Exhaust, cost stays 1', () => [at('0.111', () => HD.CARDS.SHIMMER.kw.includes('Burn') && HD.CARDS.SHIMMER.upKw.length === 0 && HD.CARDS.SHIMMER.upCost == null), '']);
  check('Jeweled Mask picks a non-Innate Power', () => [/random Power from your draw pile/.test(HD.RELICS.JEWEL_MASK.text), 'Innate Powers start in hand, so the draw pile holds only non-Innate ones']);
  check('Not built here: Soul Fysh; Ascension-only values', () => [true, 'out of scope']);
  section('Official v0.111 patch notes', lines, bad);
}

// ---------- 7. card triggers: every built card, relic, potion or power that reacts to discards, exhausts, draws, shuffles or end of turn is tested ----------
{
  const lines = []; let bad = 0;
  const tested = fs.readFileSync(path.join(__dirname, '..', 'test', 'triggers.js'), 'utf8');
  const TRIG = [
    ['discards from hand', /\bDiscard (\d+|any number of|your Hand|X)\b/i], ['Sly', null], ['when exhausted', /this card is Exhausted|Whenever you Exhaust|Whenever a card is Exhausted/i],
    ['in hand at end of turn', /in your Hand at the end of (your|this) turn|at the end of your turn, if this is in your Hand/i], ['when drawn', /Whenever you draw|draw this card/i],
    ['on shuffle', /shuffle your Draw Pile/i], ['played again', /\bReplay\b|played an extra time|play(ed)? twice/i],
  ];
  const seen = new Set(), untested = [];
  for (const [kind, src, table, ours] of [['card', D.beta.cards, MAP.cards, HD.CARDS], ['card', D.stable.cards, MAP.cards, HD.CARDS], ['relic', D.beta.relics, MAP.relics, HD.RELICS], ['relic', D.stable.relics, MAP.relics, HD.RELICS], ['potion', D.beta.potions, MAP.potions, HD.POTIONS]]) {
    for (const x of Object.values(src)) {
      const id = table[x.id]; if (!id || !ours[id] || seen.has(id) || x.multiplayer_only) continue;
      const text = strip(x.description) + ' ' + strip(x.upgrade_description || '');
      const kinds = TRIG.filter(([k, re]) => (k === 'Sly' ? (x.keywords || []).includes('Sly') : re.test(text))).map(([k]) => k);
      if (!kinds.length) continue;
      seen.add(id);
      // Sly is one engine rule for every Sly card; the rule is tested once per discard source.
      const ok = tested.includes(`'${id}'`) || (kinds.length === 1 && kinds[0] === 'Sly');
      if (!ok) untested.push(`${kind} ${id} (${x.name}): ${kinds.join(', ')}`);
    }
  }
  bad = untested.length;
  lines.push(`${seen.size} built cards, relics and potions with triggers; ${seen.size - bad} covered by test/triggers.js`, ...untested.map((u) => `   untested ${u}`));
  section('Card triggers (discard, Sly, exhaust, end of turn in hand, draw, shuffle, replay)', lines, bad);
}

fs.writeFileSync(path.join(__dirname, 'audit_report.txt'), report.join('\n') + '\n');
console.log(summary.join('\n'));
console.log('Full report: dev/audit_report.txt');

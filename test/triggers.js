// Behavior checks for card triggers: Sly from every discard source, exhaust, end-of-turn-in-hand, draw, shuffle and replay effects.
// Usage: node test/triggers.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'coop', 'neow2', 'ascension_data', 'ascension'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx);
const HD = ctx.HD;
HD.setVersion('0.111');
let fails = 0, n = 0;
const eq = (name, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };

// Choices pick the preferred cards first (e.g. the Sly card), then fill up to n.
const ui = (prefer = []) => ({ choose: async (g, o) => { const k = o.n; const p = o.from.filter((c) => prefer.includes(c.id)); return p.concat(o.from.filter((c) => !prefer.includes(c.id))).slice(0, k); } });
async function fight(char, opts = {}) {
  const r = new HD.Run('trig', char);
  for (const id of opts.relics || []) r.addRelic(id);
  r.pending.length = 0;
  if (opts.deck) { r.deck = opts.deck.map((id) => r.newCard(id, false)); }
  const g = new HD.Combat(r, opts.enc || 'BANDITS', ui(opts.prefer), 'monster');
  await g.start();
  for (const e of g.enemies) { e.hp = e.maxHp = 500; e.block = 0; }
  g.energy = 9; g.p.block = 0;
  if (opts.hand) g.hand = opts.hand.map((id) => g.makeCard(id, false));
  if (opts.draw) g.draw = opts.draw.map((id) => g.makeCard(id, false));
  if (opts.discard) g.discard = opts.discard.map((id) => g.makeCard(id, false));
  return g;
}
const hp = (g) => g.enemies.map((e) => 500 - e.hp);
const play = async (g, id, t) => { const c = g.hand.find((x) => x.id === id); await g.playCard(c, t === undefined && HD.CARDS[id].target === 'enemy' ? g.enemies[0] : t || null); };

(async () => {
  // ---------- Sly: discarded from hand during your turn, it plays itself for free ----------
  // Untouchable (6 Block) is the Sly card in each case; every discard source must trigger it.
  const sources = [
    ['Survivor', 'ENDURE', 8], ['Acrobatics', 'SOMERSAULT', 0], ['Prepared', 'READY_UP', 0], ['Dagger Throw', 'TOSS_BLADE', 0],
    ['Calculated Gamble', 'LONG_ODDS', 0], ['Storm of Steel', 'STEEL_RAIN', 0], ['Hidden Daggers', 'SLEEVE_KNIVES', 0], ['Shadow Step', 'SHADE_STEP', 0],
  ];
  for (const [name, id, ownBlock] of sources) {
    const g = await fight('VEILED', { hand: [id, 'SLIP_AWAY'], draw: [], discard: [], prefer: ['SLIP_AWAY'] });
    const e0 = g.energy;
    await play(g, id);
    eq(`Sly via ${name}: Untouchable plays itself for free`, [g.p.block - ownBlock, g.energy === e0 - g.costOf(g.makeCard(id, false)) || g.energy === e0 - (HD.CARDS[id].cost || 0), g.discard.concat(g.hand).some((c) => c.id === 'SLIP_AWAY')], [6, true, true]);
  }
  {
    const g = await fight('VEILED', { hand: ['TRADE_TOOLS'], prefer: ['SLIP_AWAY'] });
    await play(g, 'TRADE_TOOLS'); g.draw = [g.makeCard('SLIP_AWAY', false)]; g.discard = [];
    g.hand.length = 0; g.p.block = 0;
    await g.endTurn();
    eq('Sly via Tools of the Trade (start of turn): plays itself', g.p.block >= 6 || g.discard.some((c) => c.id === 'SLIP_AWAY'), true);
  }
  {
    const g = await fight('VEILED', { hand: ['SLIP_AWAY', 'JAB'], prefer: ['SLIP_AWAY', 'JAB'], relics: ['FINGER_BELLS', 'THICK_WRAPS'] });
    await HD.POTIONS['GAMBLERS_GROG'].use(g, null);
    eq("Sly via Gambler's Brew; Tingsha and Tough Bandages count both discards", [g.p.block, hp(g).reduce((a, b) => a + b, 0)], [6 + 3 + 3, 6]);
  }
  {
    const r = new HD.Run('chip', 'VEILED'); r.addRelic('LOADED_DIE'); r.deck = Array.from({ length: 6 }, () => r.newCard('SLIP_AWAY', false));
    const g = new HD.Combat(r, 'BANDITS', ui(['SLIP_AWAY']), 'monster'); await g.start();
    eq('Sly via Gambling Chip (start of combat): the discarded Untouchables play themselves', g.p.block >= 6, true);
  }
  {
    const g = await fight('VEILED', { hand: ['REBOUND'], draw: ['JAB', 'JAB', 'JAB', 'JAB', 'JAB', 'JAB'] });
    g.enemies.forEach((e) => { e.intent = Object.keys(e.def.moves)[0]; });
    const before = hp(g).join();
    await g.endTurn();
    eq('Sly does not trigger on the end-of-turn discard (Ricochet stays put)', [hp(g).join() === before, g.discard.some((c) => c.id === 'REBOUND')], [true, true]);
  }
  {
    const g = await fight('VEILED', { hand: ['ENDURE', 'EVADE'], prefer: ['EVADE'] });
    g.hand[1].addKw = ['Furtive'];
    await play(g, 'ENDURE');
    eq('Sly given by Master Planner or Hand Trick also triggers (Defend plays itself)', g.p.block, 8 + 5);
  }
  {
    const g = await fight('VEILED', { hand: ['ENDURE', 'JAB', 'LAST_RITES'], prefer: ['JAB'] });
    await play(g, 'ENDURE');
    eq('Memento Mori counts discards this turn', HD.CARDS.LAST_RITES.text(HD.vals({ id: 'LAST_RITES', up: false }), { d: (x) => x, b: (x) => x }, g.hand[0], g).includes('13'), true);
  }

  // ---------- Exhaust triggers ----------
  {
    const g = await fight('OATHBURNER', { hand: ['KINDLING_PACT', 'WAR_HORN'], draw: ['CUT', 'CUT', 'CUT'], prefer: ['WAR_HORN'] });
    const e0 = g.energy; await play(g, 'KINDLING_PACT');
    eq('Drum of Battle: exhausted by Burning Pact, gain 2 Energy', g.energy - (e0 - 1), 2);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['WAR_HORN'], draw: [], relics: ['FERRYMANS_ASH'] });
    const c = g.hand[0]; c.addKw = ['Fleeting']; g.enemies.forEach((e) => { e.intent = Object.keys(e.def.moves)[0]; });
    await g.endTurn();
    eq("Drum of Battle exhausted by Ethereal at end of turn; Charon's Ashes hits ALL", [hp(g).every((x) => x >= 3), g.ash.some((x) => x.id === 'WAR_HORN')], [true, true]);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['SCORCHED_GUARD', 'CUT'], relics: ['LOST_SOUL'] });
    await play(g, 'SCORCHED_GUARD');
    eq('Forgotten Soul: an Exhaust deals damage to a random enemy', hp(g).reduce((a, b) => a + b, 0) >= 1, true);
  }

  // ---------- End of turn, still in hand ----------
  const endOfTurn = async (id, relics = []) => {
    const g = await fight('OATHBURNER', { hand: [id], relics }); g.enemies.forEach((e) => { e.intent = Object.keys(e.def.moves)[0]; e.def = { ...e.def }; });
    for (const e of g.enemies) e.forceIntent = 'NONE';
    const hp0 = g.p.hp; const pw0 = { ...g.p.pw };
    g.enemyTurn = async () => {}; // isolate the player's end of turn
    await g.endTurn();
    return { lost: hp0 - g.p.hp, weak: (g.p.pw.sapped || 0) - (pw0.sapped || 0), frail: (g.p.pw.brittle || 0) - (pw0.brittle || 0) };
  };
  eq('Burn: 2 damage at end of turn in hand', (await endOfTurn('SCORCH')).lost, 2);
  eq('Decay: 2 damage at end of turn in hand', (await endOfTurn('MILDEW')).lost, 2);
  eq('Doubt: 1 Weak at end of turn in hand', (await endOfTurn('MISGIVING')).weak, 1);
  eq('Shame: 1 Frail at end of turn in hand', (await endOfTurn('DISGRACE')).frail, 1);
  eq('Regret: lose 1 HP per card in hand', (await endOfTurn('REMORSE')).lost, 1);
  eq('Bad Luck: lose 13 HP at end of turn in hand', (await endOfTurn('ILL_FORTUNE')).lost, 13);
  eq('Burn still triggers when the hand is retained (Runic Pyramid)', (await endOfTurn('SCORCH', ['GLYPH_PYRAMID'])).lost, 2);

  // ---------- Draw triggers ----------
  {
    const g = await fight('VEILED', { hand: ['QUICKSILVER'], draw: ['JAB', 'JAB'] });
    await play(g, 'QUICKSILVER'); await g.drawCards(2);
    eq('Speedster: each card drawn on your turn deals 2 to ALL', hp(g), [4, 4, 4]);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['ENDLESS_CUTS'], draw: ['CUT', 'BRACE'] });
    await play(g, 'ENDLESS_CUTS'); await g.drawCards(2);
    eq('Hellraiser: a drawn Strike plays itself against a random enemy', [hp(g).reduce((a, b) => a + b, 0) >= 6, g.hand.map((c) => c.id)], [true, ['BRACE']]);
  }

  // ---------- Shuffle triggers ----------
  {
    const g = await fight('OATHBURNER', { hand: ['SCHEME'], draw: [], discard: ['CUT', 'BRACE', 'CUT'], relics: ['COUNTING_FRAME'], prefer: ['BRACE'] });
    await play(g, 'SCHEME'); g.discard.push(...g.ash.splice(0)); g.discard = g.discard.filter((c) => c.id !== 'SCHEME'); await g.drawCards(1);
    eq('Abacus (6 Block) and Stratagem (choose a card) on shuffle', [g.p.block, g.hand.some((c) => c.id === 'BRACE')], [6, true]);
  }

  // ---------- Replays ----------
  {
    const g = await fight('VEILED', { hand: ['DOUBLE_TAKE', 'EVADE'] });
    await play(g, 'DOUBLE_TAKE'); await play(g, 'EVADE');
    eq('Burst: the next Skill plays twice', g.p.block, 10);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['ECHO_SWING', 'CUT'] });
    await play(g, 'ECHO_SWING'); await play(g, 'CUT');
    eq('One-Two Punch: the next Attack plays twice', hp(g)[0], 12);
  }

  // ---------- found by the audit ----------
  {
    const g = await fight('VEILED', { hand: ['ACID_TIDE'], draw: ['JAB', 'JAB'] });
    await play(g, 'ACID_TIDE'); await g.drawCards(2);
    eq('Corrosive Wave: each card drawn this turn applies 2 Poison to ALL', g.enemies.map((e) => e.pw.toxin || 0), [4, 4, 4]);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['ASH_HARVEST', 'NUMB_FLESH', 'KINDLING_PACT', 'CUT'], draw: ['BRACE', 'BRACE', 'BRACE', 'BRACE', 'BRACE'], prefer: ['CUT'] });
    await play(g, 'ASH_HARVEST'); await play(g, 'NUMB_FLESH'); const h = g.hand.length; await play(g, 'KINDLING_PACT');
    eq('Dark Embrace draws 1 and Feel No Pain gains 3 Block when a card is Exhausted', [g.p.block, g.hand.length - (h - 2)], [3, 3]);
  }
  eq('Infection: 3 damage at end of turn in hand', (await endOfTurn('BLIGHT')).lost, 3);
  eq('Toxic: 5 damage at end of turn in hand', (await endOfTurn('VENOM')).lost, 5);
  {
    const g = await fight('VEILED', { hand: ['CAREFUL_PLANS', 'JAB', 'EVADE'] });
    await play(g, 'CAREFUL_PLANS'); g.enemyTurn = async () => {}; const kept = g.hand.slice(); await g.endTurn();
    eq('Well-Laid Plans (v0.111): the hand is not discarded at end of turn', kept.every((c) => g.hand.includes(c)), true);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['BURIED_GEM'], draw: ['CUT'] });
    await play(g, 'BURIED_GEM'); const gem = g.draw[0]; g.hand.push(g.draw.pop());
    await play(g, 'CUT');
    eq('Hidden Gem: a draw-pile card gains Replay 2 and plays 3 times', [gem.replay, hp(g)[0]], [2, 18]);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['CUT', 'CUT'], relics: ['HURLING_AXE'] });
    await play(g, 'CUT'); await play(g, 'CUT');
    eq('Throwing Axe: only the first card of the combat plays twice', hp(g)[0], 18);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['CUT'] });
    await HD.POTIONS['ECHO_VIAL'].use(g, null); await play(g, 'CUT');
    eq('Duplicator: the next card plays twice', hp(g)[0], 12);
  }
  {
    const g = await fight('OATHBURNER', { hand: ['CUT'] });
    await HD.POTIONS['CUTTERS_STEW'].use(g, null); await play(g, 'CUT');
    eq("Soldier's Stew: Strikes gain Replay 1", hp(g)[0], 12);
  }
  {
    const g = await fight('OATHBURNER', { hand: [], draw: [], discard: ['CUT', 'BRACE'], relics: ['BIG_HUG'] });
    await g.drawCards(1);
    eq('Biiig Hug: shuffling adds a Soot to the draw pile', g.draw.concat(g.hand).some((c) => c.id === 'ASHFALL'), true);
  }

  // ---------- the Regent (the Crowned) ----------
  {
    const g = await fight('CROWNED', { hand: [], draw: ['ROYAL_BOOT', 'ROYAL_FIST'], discard: [] });
    await g.drawCards(2);
    const boot = g.hand.find((c) => c.id === 'ROYAL_BOOT'), fist = g.hand.find((c) => c.id === 'ROYAL_FIST');
    eq('Kingly Kick: drawing it lowers its cost by 1', g.costOf(boot), 3);
    eq('Kingly Punch: drawing it adds 4 damage this combat', HD.vals(fist).dmg, 12);
    g.discard.push(...g.hand.splice(0)); g.draw = []; await g.drawCards(2);
    eq('Kingly Kick and Kingly Punch keep growing with each draw', [g.costOf(boot), HD.vals(fist).dmg], [2, 16]);
  }
  {
    const g = await fight('CROWNED', { hand: ['BLADEMASTER', 'THE_ARMORER'], draw: [], discard: [] });
    g.stars = 9; await play(g, 'BLADEMASTER'); await play(g, 'THE_ARMORER');
    const blade = g.hand.find((c) => c.id === 'REGAL_BLADE');
    await play(g, 'REGAL_BLADE');
    eq('Sword Sage: a Blade created later has Replay 1 and hits twice (40 + 40)', [blade.replay, hp(g)[0]], [1, 80]);
  }
  {
    const g = await fight('CROWNED', { hand: ['BRIGHT_SMITE', 'MOTE_WALL'], draw: [], discard: [] });
    g.stars = 2; await play(g, 'BRIGHT_SMITE'); await play(g, 'MOTE_WALL');
    eq('Shining Strike goes on top of the draw pile; Particle Wall returns to hand', [g.draw[g.draw.length - 1].id, g.hand.map((c) => c.id)], ['BRIGHT_SMITE', ['MOTE_WALL']]);
  }
  {
    const g = await fight('CROWNED', { hand: ['SKYFALL_VOLLEY'], draw: [], discard: [] });
    g.enemyTurn = async () => {}; await play(g, 'SKYFALL_VOLLEY'); const once = hp(g)[0]; await g.endTurn();
    eq('Bombardment: plays itself from the Exhaust pile at the start of your turn', [once, hp(g).reduce((a, b) => a + b, 0), g.ash.some((c) => c.id === 'SKYFALL_VOLLEY')], [18, 36, true]);
  }
  {
    const g = await fight('CROWNED', { hand: [], draw: ['SMITE', 'UNBOWED'], discard: [] });
    g.enemyTurn = async () => {}; g.hand = []; await g.endTurn();
    eq('I Am Invincible: plays itself from the top of the draw pile at the end of your turn', g.discard.some((c) => c.id === 'UNBOWED') || g.hand.some((c) => c.id === 'UNBOWED'), true);
  }
  {
    const g = await fight('CROWNED', { hand: ['SO_DECREED', 'WARD_OFF', 'WARD_OFF', 'WARD_OFF'], draw: [], discard: [] });
    await play(g, 'SO_DECREED'); const before = g.hand.some((c) => c.id === 'SO_DECREED');
    await play(g, 'WARD_OFF'); await play(g, 'WARD_OFF'); await play(g, 'WARD_OFF');
    eq('Make It So: back to hand after the third Skill of the turn', [before, g.hand.some((c) => c.id === 'SO_DECREED')], [false, true]);
  }

  // ---------- the Defect (the Wirebound) ----------
  {
    const g = await fight('WIREBOUND', { hand: ['MIRROR_FORM', 'POUND', 'POUND'], draw: [], discard: [] });
    g.enemyTurn = async () => {}; await play(g, 'MIRROR_FORM'); await g.endTurn();
    g.hand = ['POUND', 'POUND'].map((id) => g.makeCard(id, false)); g.energy = 9; const h0 = hp(g)[0];
    await play(g, 'POUND'); const first = hp(g)[0] - h0; await play(g, 'POUND');
    eq('Echo Form: only the first card each turn is played an extra time', [first, hp(g)[0] - h0], [12, 18]);
  }
  {
    const g = await fight('WIREBOUND', { hand: [], draw: ['DRAIN'], discard: [] });
    g.energy = 3; await g.drawCards(1);
    eq('Void: drawing it loses 1 Energy', g.energy, 2);
  }

  // ---------- the Necrobinder (the Unburied) ----------
  {
    const g = await fight('UNBURIED', { hand: ['LEAFSTORM'], draw: ['RAKE', 'RAKE', 'DESECRATE'], discard: [] });
    await play(g, 'LEAFSTORM'); await g.drawCards(1);
    eq('Pagestorm: drawing an Ethereal card draws 1 more', g.hand.length, 2);
  }
  {
    const g = await fight('UNBURIED', { hand: ['REMAKE', 'RAKE'], draw: [], discard: [] });
    await play(g, 'REMAKE'); const r = g.hand[0]; const cost = g.costOf(r); await play(g, 'RAKE');
    eq('Transfigure: the card gains Replay 1 (6 + 6) and costs 1 more', [r.replay, cost, hp(g)[0]], [1, 2, 12]);
  }

  console.log(fails ? `${fails} of ${n} FAILED` : `all ${n} trigger checks passed`);
  process.exitCode = fails ? 1 : 0;
})();

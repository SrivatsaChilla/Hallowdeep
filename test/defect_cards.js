// Behavior checks for the Defect: Cells (Prime, Release, passives, Tuning, slots) and his cards, relics and potions.
// Usage: node test/defect_cards.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'neow2', 'ascension_data', 'ascension'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx);
const HD = ctx.HD; HD.setVersion('0.111');
let fails = 0, n = 0;
const eq = (name, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
const ui = { choose: async (g, o) => o.from.slice(0, o.n) };
async function fight(o = {}) {
  const r = new HD.Run('dc', o.char || 'WIREBOUND');
  if (o.noStarter) r.relics = [];
  for (const id of o.relics || []) r.addRelic(id);
  r.pending.length = 0;
  const g = new HD.Combat(r, o.enc || 'RIPJAW', ui, 'monster'); await g.start();
  for (const e of g.enemies) { e.hp = e.maxHp = 500; e.block = 0; }
  g.energy = 9; g.p.block = 0; if (!o.keepOrbs) g.orbs = [];
  g.hand = (o.hand || []).map((id) => g.makeCard(id, false)); g.draw = (o.draw || []).map((id) => g.makeCard(id, false)); g.discard = [];
  g.enemyTurn = async () => {};
  return g;
}
const dealt = (g) => g.enemies.reduce((a, e) => a + 500 - e.hp, 0);
const ids = (g) => g.orbs.map((o) => o.id);
const play = async (g, id, t) => { const c = g.hand.find((x) => x.id === id); await g.playCard(c, t === undefined && HD.CARDS[id].target === 'enemy' ? g.enemies[0] : t || null); };

(async () => {
  let g = await fight({ keepOrbs: true });
  eq('The Wirebound: 75 HP, 3 Cell Slots, Cracked Core Primes 1 Lightning', [g.run.maxHp, g.orbSlots, ids(g)], [75, 3, ['BOLT']]);

  // ---------- Cells ----------
  g = await fight(); for (const id of ['BOLT', 'RIME', 'MURK']) await g.channel(id); await g.channel('FLUX');
  eq('Channel fills slots; when full, the rightmost (oldest) Orb is Evoked first', [ids(g), dealt(g)], [['RIME', 'MURK', 'FLUX'], 8]);
  g = await fight(); await g.channel('BOLT'); await g.channel('RIME'); g.hand = []; g.enemyTurn = async () => { g.seen = g.p.block; }; await g.endTurn();
  eq('End of turn: Lightning 3 to a random enemy, Frost 2 Block for the enemy turn', [dealt(g), g.seen], [3, 2]);
  g = await fight(); g.addPw(g.p, 'tuning', 2); await g.channel('BOLT'); await g.channel('RIME'); g.hand = []; g.enemyTurn = async () => { g.seen = g.p.block; }; await g.endTurn();
  eq('Focus 2: Lightning passive 5, Frost passive 4', [dealt(g), g.seen], [5, 4]);
  g = await fight(); await g.channel('MURK'); g.hand = []; await g.endTurn(); const murk = g.orbs[0].val; await g.evokeRight();
  eq('Dark: starts at 6, grows by 6 each end of turn, Evoke hits the lowest HP enemy', [murk, dealt(g)], [12, 12]);
  g = await fight(); g.addPw(g.p, 'tuning', 1); await g.channel('MURK'); g.hand = []; await g.endTurn();
  eq('Dark with Focus 1: grows by 7, Evoke itself is not changed by Focus', g.orbs[0].val, 13);
  g = await fight({ enc: 'BANDITS' }); await g.channel('SHARD'); g.hand = []; await g.endTurn(); const after1 = dealt(g); await g.evokeRight();
  eq('Glass: 4 to ALL, then drops to 3; Evoke deals double the current passive (6) to ALL', [after1, dealt(g) - after1], [4 * g.enemies.length, 6 * g.enemies.length]);
  g = await fight(); g.addPw(g.p, 'tuning', 5); await g.channel('FLUX'); g.energy = 0; await g.evokeRight();
  eq('Plasma: Evoke gains 2 Energy, unaffected by Focus', g.energy, 2);
  g = await fight(); await g.channel('FLUX'); g.hand = []; await g.endTurn();
  eq('Plasma: passive gains 1 Energy at the start of turn', g.energy, 4);
  g = await fight(); g.addPw(g.p, 'tuning', -5); await g.channel('BOLT'); await g.evokeRight();
  eq('Negative Focus never makes an Orb deal less than 0', dealt(g), 3);

  // ---------- slot cards ----------
  g = await fight({ hand: ['EXTRA_CELLS', 'HEAVY_FRAME'] }); await play(g, 'EXTRA_CELLS'); for (let i = 0; i < 5; i++) await g.channel('RIME'); await play(g, 'HEAVY_FRAME');
  eq('Capacitor +2 slots; Bulk Up loses 1 slot (the newest Orb is lost, not Evoked) and gives 2 Strength, 2 Dexterity', [g.orbSlots, g.orbs.length, g.p.block, g.p.pw.might, g.p.pw.poise], [4, 4, 0, 2, 2]);
  g = await fight({ char: 'OATHBURNER' }); await g.channel('BOLT');
  eq('A character without slots gets 1 slot when it first Channels', [g.orbSlots, ids(g)], [1, ['BOLT']]);

  // ---------- cards ----------
  g = await fight({ hand: ['ARC', 'DOUBLE_RELEASE'] }); await play(g, 'ARC'); await play(g, 'DOUBLE_RELEASE');
  eq('Zap then Dualcast: Lightning Evoked twice (8 + 8), then gone', [dealt(g), g.orbs.length], [16, 0]);
  g = await fight({ hand: ['CELL_VOLLEY'] }); for (const id of ['BOLT', 'RIME', 'RIME']) await g.channel(id); await play(g, 'CELL_VOLLEY');
  eq('Barrage: 5 damage per Channeled Orb', dealt(g), 15);
  g = await fight({ hand: ['COMPILER'], draw: ['POUND', 'POUND', 'POUND'] }); await g.channel('BOLT'); await g.channel('BOLT'); await g.channel('RIME'); await play(g, 'COMPILER');
  eq('Compile Driver: draws 1 per unique Orb (2)', g.hand.length, 2);
  g = await fight({ hand: ['PINCER', 'PINCER'] }); await play(g, 'PINCER'); await play(g, 'PINCER');
  eq('Claw: each Claw raises ALL Claws by 2 this combat (3 + 5)', dealt(g), 8);
  g = await fight({ hand: ['ROLLING_POUND'] }); const mp = g.hand[0]; await play(g, 'ROLLING_POUND');
  eq('Momentum Strike costs 0 after it is played', g.costOf(mp), 0);
  g = await fight({ hand: ['SQUALL'] }); g.energy = 3; await play(g, 'SQUALL');
  eq('Tempest: Channel X Lightning', ids(g), ['BOLT', 'BOLT', 'BOLT']);
  g = await fight({ hand: ['CHAIN_RELEASE'] }); await g.channel('BOLT'); g.energy = 3; await play(g, 'CHAIN_RELEASE');
  eq('Multi-Cast: Evoke the rightmost Orb X times', dealt(g), 24);
  g = await fight({ hand: ['FOURFOLD_RELEASE'] }); await g.channel('RIME'); await play(g, 'FOURFOLD_RELEASE');
  eq('Quadcast: Frost Evoked 4 times', g.p.block, 20);
  g = await fight({ hand: ['OVERLOAD'] }); await g.channel('BOLT'); await g.channel('RIME'); await play(g, 'OVERLOAD');
  eq('Shatter: 7 to ALL, then every Orb Evoked twice', [dealt(g), g.p.block, g.orbs.length], [7 + 16, 10, 0]);
  g = await fight({ hand: ['ARC_COIL'] }); await g.channel('BOLT'); await g.channel('BOLT'); await play(g, 'ARC_COIL');
  eq('Tesla Coil: 3 damage, then each Lightning passive hits that enemy (3 + 3)', [dealt(g), g.orbs.length], [9, 2]);
  g = await fight({ hand: ['RUMBLE', 'DOUBLE_RELEASE'] }); await play(g, 'RUMBLE'); await g.channel('BOLT'); await play(g, 'DOUBLE_RELEASE');
  eq('Thunder: each Lightning Evoke deals 8 more to the enemy hit', dealt(g), 32);
  g = await fight({ hand: ['GATHERING_MURK'] }); await play(g, 'GATHERING_MURK');
  eq('Darkness: Channel Dark, then trigger Dark passives (6 + 6)', g.orbs[0].val, 12);
  g = await fight({ hand: ['STORM_BANK', 'ARC', 'ARC'] }); await play(g, 'ARC'); await play(g, 'ARC'); await play(g, 'STORM_BANK');
  eq('Voltaic: Channel Lightning equal to Lightning already Channeled (2)', ids(g), ['BOLT', 'BOLT', 'BOLT']);
  g = await fight({ hand: ['SYNC_UP'] }); await g.channel('BOLT'); await g.channel('RIME'); await play(g, 'SYNC_UP');
  eq('Synchronize: 1 Focus this turn per unique Orb; gone at the end of turn', [g.focus(), (g.hand = [], await g.endTurn(), g.focus())], [2, 0]);
  g = await fight({ hand: ['OVERBEAM'] }); g.addPw(g.p, 'tuning', 4); await play(g, 'OVERBEAM');
  eq('Hyperbeam: Focus is 3 lower this turn', g.focus(), 1);
  g = await fight({ hand: ['SPIRAL_DRILL', 'POUND', 'HOP'] }); await play(g, 'POUND'); await play(g, 'HOP'); await play(g, 'SPIRAL_DRILL');
  eq('Helix Drill: 3 damage per Energy spent on other cards (2)', dealt(g), 6 + 6);
  g = await fight({ hand: ['FAST_LANE', 'FAST_LANE'], draw: ['POUND', 'POUND'] }); await play(g, 'FAST_LANE');
  eq('FTL: draws when fewer than 3 other cards were played this turn', g.hand.length, 2);
  g = await fight({ hand: ['SCRAP_PICK'], draw: ['POUND', 'PIN_BEAM', 'HOP', 'EYE_POKE'] }); await play(g, 'SCRAP_PICK');
  eq('Scrape: keeps only the drawn 0-cost cards', g.hand.map((c) => c.id).sort(), ['EYE_POKE', 'PIN_BEAM']);
  g = await fight({ hand: ['THRUSTER', 'CHIMNEY', 'JUNK_ALCHEMY', 'PISTON_FIST'] }); await play(g, 'CHIMNEY'); await play(g, 'JUNK_ALCHEMY'); const fist = g.hand.find((c) => c.id === 'PISTON_FIST'); await play(g, 'THRUSTER');
  eq('Creating a Status: Smokestack 5 to ALL, Trash to Treasure Channels an Orb, Rocket Punch costs 1 less', [dealt(g), g.orbs.length, g.costOf(fist)], [5, 1, 1]);
  g = await fight({ hand: ['SECOND_PASS'], draw: ['POUND', 'POUND', 'POUND', 'DRAIN'] }); await play(g, 'SECOND_PASS'); await g.drawCards(1);
  eq('Iteration: the first Status drawn each turn draws 2 more', g.hand.length, 3);
  g = await fight({ hand: ['SELF_IMPROVE'] }); g.hand[0].src = g.run.deck[0]; await play(g, 'SELF_IMPROVE');
  eq('Genetic Algorithm: 1 Block now, and the deck card keeps +3 Block for later combats', [g.p.block, g.run.deck[0].grow, HD.vals({ id: 'SELF_IMPROVE', grow: g.run.deck[0].grow }).blk], [1, 3, 4]);
  const sv = HD.Run.fromSave(JSON.parse(JSON.stringify(g.run.toSave())));
  eq('Genetic Algorithm growth survives save and load', sv.deck[0].grow, 3);
  g = await fight({ hand: ['LEARNING_POUND'] }); await play(g, 'LEARNING_POUND'); const copy = g.discard.find((c) => c.id === 'LEARNING_POUND' && c.setCost === 0);
  eq('Adaptive Strike: adds a 0-cost copy to the discard pile', !!copy && g.costOf(copy) === 0, true);
  g = await fight({ hand: ['ASSEMBLY', 'RETUNE'] }); await play(g, 'ASSEMBLY'); const e0 = g.energy; await play(g, 'RETUNE');
  eq('Synthesis: the next Power costs 0', e0 - g.energy, 0);
  g = await fight({ hand: ['AMPLIFY', 'RETUNE'] }); await play(g, 'AMPLIFY'); await play(g, 'RETUNE');
  eq('Signal Boost: the next Power is played twice (Defragment twice)', g.p.pw.tuning, 2);
  g = await fight({ hand: ['THUNDERHEAD', 'SIDE_PROCESS', 'RETUNE'] }); await play(g, 'THUNDERHEAD'); await play(g, 'SIDE_PROCESS'); const e1 = g.energy; await play(g, 'RETUNE');
  eq('Storm and Subroutine do not trigger for themselves; a later Power Channels Lightning and refunds 1 Energy', [ids(g).filter((x) => x === 'BOLT').length, g.energy - e1], [2, 0]);
  g = await fight({ hand: ['RAVENOUS', 'PIN_BEAM', 'PIN_BEAM'] }); await play(g, 'RAVENOUS'); await play(g, 'PIN_BEAM'); await play(g, 'PIN_BEAM');
  eq('Feral: the first 0-cost Attack each turn returns to hand', g.hand.filter((c) => c.id === 'PIN_BEAM').length, 1);
  g = await fight({ hand: ['HUNGRY_MURK'] }); await play(g, 'HUNGRY_MURK'); g.hand = []; await g.endTurn();
  eq('Consuming Shadow: Channel 2 Dark; end of turn Evokes the leftmost', g.orbs.length, 1);
  g = await fight({ hand: ['SLEET'] }); await play(g, 'SLEET'); await g.channel('RIME'); g.hand = []; await g.endTurn();
  eq('Hailstorm: with Frost, 6 to ALL at the end of turn', dealt(g), 6);
  g = await fight({ hand: ['FIXED_BELIEF'] }); await play(g, 'FIXED_BELIEF'); g.hand = []; await g.endTurn();
  eq('Biased Cognition: 5 Focus, then lose 1 each turn', g.p.pw.tuning, 4);
  g = await fight({ hand: ['CYCLE'] }); await play(g, 'CYCLE'); await g.channel('BOLT'); g.hand = []; await g.endTurn();
  eq('Loop: the rightmost Orb passive also runs at the start of turn (3 + 3)', dealt(g), 6);

  // ---------- relics and potions ----------
  g = await fight({ relics: ['GILT_WIRING'] }); await g.channel('BOLT'); await g.channel('RIME'); g.hand = []; g.enemyTurn = async () => { g.seen = g.p.block; }; await g.endTurn();
  eq('Gold-Plated Cables: the rightmost Orb passive runs twice', [dealt(g), g.seen], [6, 2]);
  g = await fight({ relics: ['TICK_COUNTER'] }); for (let i = 0; i < 7; i++) await g.channel('RIME');
  eq('Metronome: the 7th Channel deals 30 to ALL, once', dealt(g) - 0 >= 30, true);
  g = await fight({ noStarter: true, relics: ['CHARGED_CORE'] }); await g.rh('battleStart'); await g.evokeRight();
  eq('Infused Core: 3 Lightning; Lightning deals 1 more (9)', [g.orbs.length, dealt(g)], [2, 9]);
  g = await fight({ relics: ['RUNE_BANK', 'MEMORY_DISC'] });
  eq('Runic Capacitor +3 slots; Data Disk 1 Focus', [g.orbSlots, g.focus()], [6, 1]);
  g = await fight({ relics: ['FEELING_GEAR'] }); await g.channel('RIME'); g.hand = []; g.enemyTurn = async () => { await g.damage(g.p, 5, {}); }; await g.endTurn();
  eq('Emotion Chip: after losing HP, all passives trigger at the start of turn', g.p.block, 2);
  g = await fight(); await HD.POTIONS.CELL_DRAUGHT.use(g); await HD.POTIONS.MURK_ESSENCE.use(g); await HD.POTIONS.TUNING_DRAUGHT.use(g);
  eq('Potion of Capacity, Essence of Darkness, Focus Potion', [g.orbSlots, ids(g).filter((x) => x === 'MURK').length, g.focus()], [5, 5, 2]);
  const ra = new HD.Run('anc', 'WIREBOUND'); ra.addRelic('OLD_TOOTH'); ra.addRelic('ELDER_TOUCH');
  eq('Archaic Tooth: Dualcast becomes Quadcast; Touch of Orobas: Infused Core', [ra.deck.some((c) => c.id === 'FOURFOLD_RELEASE'), ra.hasRelic('CHARGED_CORE')], [true, true]);

  console.log(fails ? `${fails} of ${n} FAILED` : `all ${n} Defect checks passed`);
  process.exitCode = fails ? 1 : 0;
})();

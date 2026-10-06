// Engine checks for the Regent's mechanics, using stand-in cards: Stars, Forge and the Sovereign Blade, creating and
// transforming cards, when-drawn effects, where a card goes after play, self-play from the Exhaust pile and the top of
// the draw pile, Reflect, ending the turn from a card, playing a card several times.  Usage: node test/regent_engine.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'neow2', 'ascension_data', 'ascension'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx);
const HD = ctx.HD; HD.setVersion('0.111');
let fails = 0, n = 0;
const eq = (name, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
// stand-in cards
const C = HD.CARDS, base = { color: 'test', rarity: 'Common', target: 'self', v: {}, up: {}, kw: [], tags: [], text: () => '' };
C.T_STAR2 = Object.assign({}, base, { id: 'T_STAR2', type: 'Attack', cost: 0, star: 2, target: 'enemy', play: (g, c, t) => g.attack(t, 8, 1, c) });
C.T_STARX = Object.assign({}, base, { id: 'T_STARX', type: 'Attack', cost: 0, star: 'X', target: 'enemy', play: async (g, c, t, v, x) => { for (let i = 0; i < x; i++) await g.attack(t, 5, 1, c); } });
C.T_GAIN3 = Object.assign({}, base, { id: 'T_GAIN3', type: 'Skill', cost: 1, play: (g) => g.gainStars(3) });
C.T_FORGE = Object.assign({}, base, { id: 'T_FORGE', type: 'Skill', cost: 1, v: { f: 7 }, play: (g, c, t, v) => g.forge(v.f) });
C.T_ONDRAW = Object.assign({}, base, { id: 'T_ONDRAW', type: 'Attack', cost: 4, target: 'enemy', onDraw: (g, c) => { c.bonusCost = (c.bonusCost || 0) - 1; }, play: () => {} });
C.T_BACK = Object.assign({}, base, { id: 'T_BACK', type: 'Skill', cost: 0, settleTo: () => 'hand', play: (g) => g.gainBlock(1, true) });
C.T_TOP = Object.assign({}, base, { id: 'T_TOP', type: 'Attack', cost: 1, target: 'enemy', settleTo: () => 'drawTop', play: (g, c, t) => g.attack(t, 1, 1, c) });
C.T_ASH = Object.assign({}, base, { id: 'T_ASH', type: 'Attack', cost: 3, target: 'enemy', kw: ['Burn'], playFromAshAtTurnStart: true, play: (g, c, t) => g.attack(t, 18, 1, c) });
C.T_INVINC = Object.assign({}, base, { id: 'T_INVINC', type: 'Skill', cost: 1, playFromDrawTopAtTurnEnd: true, play: (g) => { g.invPlayed = (g.invPlayed || 0) + 1; return g.gainBlock(10, true); } });
C.T_VOID = Object.assign({}, base, { id: 'T_VOID', type: 'Skill', cost: 0, play: (g) => { g.endTurnAfterPlay = true; } });
C.T_REFLECT = Object.assign({}, base, { id: 'T_REFLECT', type: 'Skill', cost: 0, play: async (g) => { await g.gainBlock(30, true); g.p.pw.reflect = 1; } });
const fight = async (hand, o = {}) => {
  const r = new HD.Run('re'); const g = new HD.Combat(r, o.enc || 'RIPJAW', HD.autoUI, 'monster'); await g.start();
  for (const e of g.enemies) { e.hp = e.maxHp = 500; e.block = 0; }
  g.energy = 9; g.hand = hand.map((id) => g.makeCard(id, false)); if (o.draw) g.draw = o.draw.map((id) => g.makeCard(id, false)); return g;
};
const dealt = (g) => 500 - g.enemies[0].hp;
(async () => {
  let g = await fight(['T_STAR2']);
  eq('A Star card cannot be played without enough Stars', [g.stars, g.canPlay(g.hand[0])], [0, false]);
  const seen = []; HD.onEngine('starsSpent', async (gg, k) => { seen.push(['spent', k]); }); HD.onEngine('starsGained', async (gg, k) => { seen.push(['gained', k]); });
  g = await fight(['T_GAIN3', 'T_STAR2']); await g.playCard(g.hand[0], null);
  eq('Gaining Stars: 3, carried and counted this turn', [g.stars, g.t.starsGained], [3, 3]);
  await g.playCard(g.hand[0], g.enemies[0]);
  eq('Spending Stars on a 0 Energy, 2 Star card', [g.stars, g.energy, dealt(g), g.t.starsSpent], [1, 8, 8, 2]);
  eq('Star events reach registered hooks', seen.slice(-2), [['gained', 3], ['spent', 2]]);
  g = await fight(['T_STARX']); g.stars = 4; await g.playCard(g.hand[0], g.enemies[0]);
  eq('X Star cost spends every Star and passes X to the card', [g.stars, dealt(g)], [0, 20]);
  g = await fight(['T_STARX']); eq('An X Star card is playable with 0 Stars', g.canPlay(g.hand[0]), true);
  g = await fight(['T_GAIN3']); g.enemyTurn = async () => {}; await g.playCard(g.hand[0], null); await g.endTurn();
  eq('Stars carry over to the next turn', g.stars, 3);

  // Forge and the Sovereign Blade
  const created = []; HD.onEngine('created', async (gg, c) => created.push(c.id));
  g = await fight(['T_FORGE', 'T_FORGE']); await g.playCard(g.hand[0], null);
  const blade = g.hand.find((c) => c.id === 'REGAL_BLADE');
  eq('First Forge creates a Regal Blade in hand at 10 + Forge', [!!blade, blade && 10 + blade.forged, g.t.created, created.slice(-1)], [true, 17, 1, ['REGAL_BLADE']]);
  await g.playCard(g.hand.find((c) => c.id === 'T_FORGE'), null);
  eq('Later Forges add to the existing Blade, no second Blade', [g.blades().length, 10 + blade.forged], [1, 24]);
  g.discard.push(...g.hand.splice(g.hand.indexOf(blade), 1)); await g.forge(3);
  eq('A Blade in the discard pile still gains Forge', 10 + blade.forged, 27);
  g.ash.push(...g.discard.splice(g.discard.indexOf(blade), 1)); await g.forge(5);
  const fresh = g.hand.find((c) => c.id === 'REGAL_BLADE');
  eq('After the Blade is Exhausted, Forge makes a new one (10 + 5) and still feeds the exhausted one', [!!fresh, fresh && 10 + fresh.forged, 10 + blade.forged], [true, 15, 32]);
  await g.playCard(fresh, g.enemies[0]);
  eq('Playing the Blade deals 10 + Forged', dealt(g), 15);

  // creating and transforming
  g = await fight(['T_GAIN3', 'T_GAIN3']); const before = g.rs.created || 0;
  await g.create(g.makeCard('THRALL_STRIKE', false), 'hand'); await g.create(g.makeCard('SCORCH', false), 'discard');
  eq('Creating counts cards, but not status cards', [(g.rs.created || 0) - before, g.t.created], [1, 1]);
  const old = g.hand[0]; const nw = await g.transformInCombat(old, 'CUT', true);
  eq('Transforming in combat replaces the card in place and counts as created', [g.hand.includes(old), g.hand.includes(nw), nw.up, g.t.created], [false, true, true, 2]);

  // when drawn, after-play destinations, self-play from piles
  g = await fight([], { draw: ['T_ONDRAW'] }); await g.drawCards(1);
  eq('When drawn: Kingly Kick-style cost drop', g.costOf(g.hand[0]), 3);
  g = await fight(['T_BACK']); await g.playCard(g.hand[0], null);
  eq('A card can return to hand after play (Particle Wall)', [g.hand.map((c) => c.id), g.discard.length], [['T_BACK'], 0]);
  g = await fight(['T_TOP']); await g.playCard(g.hand[0], g.enemies[0]);
  eq('A card can go on top of the draw pile after play (Shining Strike)', g.draw[g.draw.length - 1].id, 'T_TOP');
  g = await fight([]); g.ash = [g.makeCard('T_ASH', false)]; g.enemyTurn = async () => {}; g.hand = []; await g.endTurn();
  eq('Bombardment-style: plays itself from the Exhaust pile at turn start and stays there', [dealt(g), g.ash.some((c) => c.id === 'T_ASH')], [18, true]);
  g = await fight([], { draw: ['CUT', 'T_INVINC'] }); g.enemyTurn = async () => {}; g.p.block = 0; await g.endTurn();
  eq('I Am Invincible-style: plays itself from the top of the draw pile at turn end', g.invPlayed, 1);
  g = await fight(['T_VOID', 'CUT']); g.enemyTurn = async () => {}; const t0 = g.turn; await g.playCard(g.hand[0], null);
  eq('Void Form-style: a card can end your turn', g.turn, t0 + 1);
  g = await fight(['T_REFLECT']); await g.playCard(g.hand[0], null); await g.damage(g.p, 12, { attack: true, src: g.enemies[0] });
  eq('Reflect: blocked attack damage goes back to the attacker', dealt(g), 12);
  g = await fight(['T_STAR2', 'CUT']); g.stars = 9; await g.playTimes(g.hand.find((c) => c.id === 'CUT'), 3, g.enemies[0]);
  eq('Play a card 3 times (Decisions, Decisions)', [dealt(g), g.discard.filter((c) => c.id === 'CUT').length], [18, 1]);
  g = await fight(['CUT', 'CUT']); await g.playCard(g.hand[0], g.enemies[0]); await g.playCard(g.hand[0], g.enemies[0]);
  eq('Hits on an enemy this turn are counted (Beat into Shape)', g.enemies[0].hitsTurn, 2);
  eq('Energy spent this turn is counted (Orbit)', g.t.energySpent, 2);
  console.log(fails ? `${fails} of ${n} FAILED` : `all ${n} Regent engine checks passed`);
  process.exitCode = fails ? 1 : 0;
})();

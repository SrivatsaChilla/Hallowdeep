// Behavior checks for the Regent's cards, relics and potions: the Regal Blade (Usurper, Hunting Edge, Riposte, Call the
// Blade), Glint powers, created-card counters, Thralls, Hollow Form, Royal Stare and the end-of-combat Gold.
// Usage: node test/regent_cards.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'neow2', 'ascension_data', 'ascension'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx);
const HD = ctx.HD; HD.setVersion('0.111');
let fails = 0, n = 0;
const eq = (name, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
// Choices take the first options offered.
const ui = { choose: async (g, o) => o.from.slice(0, o.n) };
async function fight(o = {}) {
  const r = new HD.Run('rc', 'CROWNED');
  if (o.noStarter) r.relics = [];
  for (const id of o.relics || []) r.addRelic(id);
  r.pending.length = 0;
  const g = new HD.Combat(r, o.enc || 'RIPJAW', ui, 'monster'); await g.start();
  for (const e of g.enemies) { e.hp = e.maxHp = 500; e.block = 0; }
  g.energy = 9; g.p.block = 0; g.stars = o.stars || 0;
  g.hand = (o.hand || []).map((id) => g.makeCard(id, false)); g.draw = (o.draw || []).map((id) => g.makeCard(id, false)); g.discard = [];
  return g;
}
const dealt = (g) => g.enemies.reduce((a, e) => a + 500 - e.hp, 0);
const play = async (g, id, t) => { const c = g.hand.find((x) => x.id === id); await g.playCard(c, t === undefined && HD.CARDS[id].target === 'enemy' ? g.enemies[0] : t || null); };
const blade = (g) => g.hand.find((c) => c.id === 'REGAL_BLADE');

(async () => {
  let g = new HD.Combat(new HD.Run('rc', 'CROWNED'), 'RIPJAW', ui, 'monster'); await g.start();
  eq('The Crowned: 75 HP, 99 Gold, Star Circlet gives 3 Glints at combat start', [g.run.maxHp, g.run.gold, g.stars], [75, 99, 3]);
  g = await fight({ noStarter: true, relics: ['FATED_CIRCLET'] }); await g.rh('battleStart');
  eq('Fated Circlet: 7 Glints at combat start', g.stars, 7);

  // ---------- the Regal Blade ----------
  g = await fight({ hand: ['USURPER'] }); await play(g, 'USURPER'); await play(g, 'REGAL_BLADE');
  eq('Usurper: Temper 3, then the Blade deals double to that enemy this turn (13 x 2)', dealt(g), 26);
  g = await fight({ enc: 'BANDITS', hand: ['HUNTING_EDGE'] }); await play(g, 'HUNTING_EDGE'); await play(g, 'REGAL_BLADE');
  eq('Seeking Edge: the Blade hits ALL enemies (17 each)', g.enemies.map((e) => 500 - e.hp), g.enemies.map(() => 17));
  g = await fight({ hand: ['RIPOSTE', 'WAR_PLUNDER'] }); await play(g, 'RIPOSTE'); await play(g, 'WAR_PLUNDER'); await play(g, 'REGAL_BLADE');
  eq('Parry: the Blade also gives 10 Guard', g.p.block, 10);
  g = await fight({ hand: ['WAR_PLUNDER', 'CALL_THE_BLADE'] }); await play(g, 'WAR_PLUNDER'); const b = blade(g);
  g.hand.splice(g.hand.indexOf(b), 1); g.ash.push(b); await play(g, 'CALL_THE_BLADE');
  eq('Summon Forth: brings the Blade back from the Exhaust pile, then Forges (10 + 6 + 8)', [g.hand.includes(b), 10 + b.forged], [true, 24]);
  g = await fight({ hand: ['HAMMER_OUT', 'SMITE', 'SMITE'] }); await play(g, 'SMITE'); await play(g, 'SMITE'); await play(g, 'HAMMER_OUT');
  eq('Beat into Shape: Forge 5 plus 5 for each earlier hit this turn (5 + 10)', blade(g).forged, 15);
  g = await fight({ hand: ['REGAL_BLADE'] }); g.hand[0].up = true;
  eq('Sovereign Blade: costs 2, 1 upgraded, and is Retained', [HD.CARDS.REGAL_BLADE.cost, g.costOf(g.hand[0]), g.staysAtEndOfTurn(g.hand[0])], [2, 1, true]);

  // ---------- Glints ----------
  g = await fight({ hand: ['STARFALL'], stars: 1 });
  eq('Falling Star needs 2 Glints', g.canPlay(g.hand[0]), false);
  g = await fight({ hand: ['EVENT_HORIZON', 'REVERE', 'STARFALL'] }); await play(g, 'EVENT_HORIZON'); await play(g, 'REVERE'); const afterGain = dealt(g); await play(g, 'STARFALL');
  eq('Black Hole: 3 damage to ALL on gaining and on spending Glints', [afterGain, dealt(g)], [3, 3 + 3 + 8]);
  g = await fight({ hand: ['STARBORN', 'RUINATION'], stars: 4 }); await play(g, 'STARBORN'); await play(g, 'RUINATION');
  eq('Child of the Stars: 2 Guard per Glint spent', g.p.block, 8);
  g = await fight({ hand: ['STARDRIFT'], stars: 3 }); await play(g, 'STARDRIFT');
  eq('Stardust: X Glints, 5 damage X times', [g.stars, dealt(g)], [0, 15]);
  g = await fight({ hand: ['REVERE', 'HOARD_LIGHT', 'SHINE_FORTH'] }); await play(g, 'REVERE'); await play(g, 'HOARD_LIGHT'); await play(g, 'SHINE_FORTH');
  eq('Radiate: 3 damage to ALL per Glint gained this turn (3 Glints)', dealt(g), 9);
  g = await fight({ hand: ['MOON_PIKE', 'STARFALL', 'SMITE'], draw: ['RUINATION'], stars: 1 }); await play(g, 'MOON_PIKE');
  eq('Crescent Spear: 8 + 2 per card with a Glint cost (itself, Falling Star, Devastate)', dealt(g), 14);
  g = await fight({ hand: ['SECRET_HOARD'] }); g.enemyTurn = async () => {}; await play(g, 'SECRET_HOARD'); g.stars = 0; await g.endTurn();
  eq('Hidden Cache: 3 Glints next turn', g.stars, 3);
  g = await fight({ hand: ['WELLSPRING'] }); g.enemyTurn = async () => {}; await play(g, 'WELLSPRING'); g.stars = 0; await g.endTurn();
  eq('Genesis: 2 Glints at the start of each turn', g.stars, 2);

  // ---------- creating cards ----------
  g = await fight({ hand: ['ARMORY', 'NURSERY_CLOUD', 'GIFT_BASKET'] }); await play(g, 'ARMORY'); await play(g, 'NURSERY_CLOUD'); await play(g, 'GIFT_BASKET');
  eq('Arsenal and Pillar of Creation: 1 Might and 2 Guard for each of 3 created cards', [g.p.pw.might, g.p.block], [3, 6]);
  g = await fight({ hand: ['DISMISSAL', 'WARD_OFF', 'HEAVY_STAR'] }); const created0 = g.rs.created || 0; await play(g, 'DISMISSAL');
  eq('Begone: Transforms a card into Minion Strike (counts as created)', [g.hand.map((c) => c.id).includes('THRALL_STRIKE'), g.rs.created - created0], [true, 1]);
  await play(g, 'HEAVY_STAR');
  eq('Supermassive: 5 + 3 per card created this combat', dealt(g), 5 + 3 * g.rs.created);
  g = await fight({ hand: ['IMPACT_PATH'] }); const c0 = g.rs.created || 0; await play(g, 'IMPACT_PATH');
  eq('Collision Course adds Debris, which does not count as created', [g.hand.map((c) => c.id), (g.rs.created || 0) - c0], [['RUBBLE'], 0]);
  g = await fight({ hand: ['THRALL_STRIKE', 'THRALL_SHIELD'], relics: ['MODEL_THRALL'] }); await play(g, 'THRALL_STRIKE'); await play(g, 'THRALL_SHIELD');
  eq('Vitruvian Minion: Minion cards deal double damage and give double Guard', [dealt(g), g.p.block], [12, 14]);
  g = await fight({ relics: ['CROWNSTONE'] }); await g.create(g.makeCard('THRALL_STRIKE', false)); await g.create(g.makeCard('THRALL_STRIKE', false));
  eq('Regalite: 4 Guard for the first created card each turn only', g.p.block, 4);

  // ---------- other powers and relics ----------
  g = await fight({ hand: ['ROYAL_STARE', 'SMITE'] }); await play(g, 'ROYAL_STARE'); await play(g, 'SMITE');
  eq("Monarch's Gaze: an attacked enemy loses 1 Strength this turn", g.enemies[0].pw.mightDown, 1);
  g = await fight({ hand: ['HOLLOW_FORM', 'SMITE'] }); g.enemyTurn = async () => {}; const t0 = g.turn; await play(g, 'HOLLOW_FORM');
  g.hand = ['RUINATION', 'RUINATION', 'RUINATION'].map((id) => g.makeCard(id, false)); g.energy = 0;
  eq('Void Form: ends the turn; the first 2 cards next turn are free', [g.turn, g.canPlay(g.hand[0])], [t0 + 1, true]);
  await play(g, 'RUINATION'); await play(g, 'RUINATION');
  eq('Void Form: the third card costs again', g.canPlay(g.hand[0]), false);
  g = await fight({ hand: ['CIRCUIT', 'RUINATION', 'HEAVENS_WEIGHT', 'SMITE'], stars: 4 }); await play(g, 'CIRCUIT'); const e1 = g.energy;
  await play(g, 'RUINATION'); await play(g, 'HEAVENS_WEIGHT'); const e2 = g.energy; await play(g, 'SMITE');
  eq("Orbit: its own cost does not count; the 4th Energy spent after it gives 1 back", [e1 - e2, e2 - g.energy], [3, 0]);
  g = await fight({ hand: ['PROCLAMATION', 'SMITE'] }); await play(g, 'PROCLAMATION');
  eq('Monologue: does not count itself', g.p.pw.mightTemp || 0, 0);
  await play(g, 'SMITE');
  eq('Monologue: each later card gives 1 Strength this turn', [g.p.pw.mightTemp, dealt(g)], [1, 6]);
  g = await fight({ hand: ['TRIBUTE'] }); const gold = g.run.gold; await play(g, 'TRIBUTE'); for (const e of g.enemies) await g.kill(e);
  eq('Royalties: 30 Gold at the end of combat', g.run.gold - gold, 30);
  g = await fight({ hand: ['MIRROR_GUARD'], stars: 3 }); await play(g, 'MIRROR_GUARD'); await g.damage(g.p, 12, { attack: true, src: g.enemies[0] });
  eq('Reflect: blocked attack damage goes back to the attacker', dealt(g), 12);
  g = await fight({ relics: ['COMET_DUST'] }); g.stars = 12; await g.spendStars(12);
  eq('Galactic Dust: 10 Guard per 10 Glints spent, the rest carries over', [g.p.block, g.run.relic('COMET_DUST').counter], [10, 2]);
  g = await fight({ hand: ['STARFALL', 'STARFALL'], relics: ['LITTLE_KING'], stars: 4 }); await play(g, 'STARFALL'); await play(g, 'STARFALL');
  eq('Mini Regent: 1 Strength for the first Glints spent each turn only', g.p.pw.might, 1);
  g = await fight({ noStarter: true, relics: ['SWORD_PRIMER'] }); await g.rh('battleStart');
  eq('Fencing Manual: Forge 10 at combat start', 10 + blade(g).forged, 20);
  g = await fight(); await HD.POTIONS.GLINT_FLASK.use(g); await HD.POTIONS.ROYAL_NERVE.use(g);
  eq("Star Potion and King's Courage: 3 Glints; Forge 15", [g.stars, 10 + blade(g).forged], [3, 25]);

  // ---------- run wiring ----------
  const r = new HD.Run('anc', 'CROWNED'); r.addRelic('OLD_TOOTH'); r.addRelic('ELDER_TOUCH');
  eq('Archaic Tooth and Touch of Orobas: Meteor Shower and Divine Destiny', [r.deck.some((c) => c.id === 'STARSTORM'), r.hasRelic('FATED_CIRCLET'), r.hasRelic('STAR_CIRCLET')], [true, true, false]);
  const sv = HD.Run.fromSave(JSON.parse(JSON.stringify(new HD.Run('sv', 'CROWNED').toSave())));
  eq('Save and load keep the character', [sv.charId, sv.color], ['CROWNED', 'crowned']);

  console.log(fails ? `${fails} of ${n} FAILED` : `all ${n} Regent card checks passed`);
  process.exitCode = fails ? 1 : 0;
})();

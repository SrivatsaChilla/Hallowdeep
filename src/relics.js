// Relics for the Oathburner: starter, common, uncommon, rare, shop. Values match the reference build.
// Combat hooks get (g, r, ...). Run hooks get (run, r, ...). r.counter persists across combats.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const R = (HD.RELICS = {});
  const relic = (rarity, id, o) => { R[id] = Object.assign({ id, rarity, pool: 'shared' }, o); };
  const upgradeRandom = (run, type, n) => {
    run.rng.misc.shuffle(run.deck.filter((c) => !c.up && CARDS[c.id].type === type)).slice(0, n).forEach((c) => run.upgrade(c));
  };
  const hitAll = async (g, n) => { for (const e of g.alive()) await g.damage(e, n, {}); };
  const onTurn = (n, fn) => async (g, r) => { if (g.turn === n) await fn(g, r); };
  // Fires on every `every`th card of a type played in a single turn.
  const perTurn = (type, every, fn) => async (g, r, c, d) => { if (d.type === type && g.t[type.toLowerCase() + 's'] % every === 0) await fn(g, r); };

  // ---------- Starter ----------
  relic('Starter', 'EMBER_HEART', { name: 'Ember Heart', text: 'At the end of combat, heal 6 HP.', afterCombat: (run) => run.heal(6) });

  // ---------- Common ----------
  relic('Common', 'MOORING_STONE', { name: 'Mooring Stone', text: 'Start each combat with 10 Guard.', battleStart: async (g) => { g.p.block += 10; } });
  relic('Common', 'POUCH_OF_GRIT', { name: 'Pouch of Grit', text: 'At the start of each combat, apply 1 Exposed to ALL enemies.',
    battleStart: async (g) => { for (const e of g.alive()) await g.apply(e, 'exposed', 1); } });
  relic('Common', 'PACKED_SATCHEL', { name: 'Packed Satchel', text: 'At the start of each combat, draw 2 additional cards.', battleStart: async (g) => { g.firstTurnDraw += 2; } });
  relic('Common', 'RED_PHIAL', { name: 'Red Phial', text: 'At the start of each combat, heal 2 HP.', battleStart: async (g) => g.heal(2) });
  relic('Common', 'LEDGER_OF_FIVE', { name: 'Ledger of Five', text: 'Every 5 cards you add to your deck, heal 20 HP.',
    onCardAdded: (run, r) => { r.counter = (r.counter || 0) + 1; if (r.counter >= 5) { r.counter = 0; run.heal(20); } } });
  relic('Common', 'BRAMBLE_MAIL', { name: 'Bramble Mail', text: 'Start each combat with 3 Spines.', battleStart: async (g) => g.addPw(g.p, 'spines', 3) });
  relic('Common', 'KNOT_BOX', { name: 'Knot Box', text: 'The first time you lose HP each combat, draw 3 cards.' });
  relic('Common', 'FIRECRACKER', { name: 'Firecracker', text: 'At the start of each combat, deal 9 damage to ALL enemies.', battleStart: (g) => hitAll(g, 9) });
  relic('Common', 'NECKGUARD', { name: 'Neckguard', text: 'At the start of each combat, gain 4 Plate.', battleStart: async (g) => g.addPw(g.p, 'plate', 4) });
  relic('Common', 'SUN_BLOOM', { name: 'Sun Bloom', text: 'Every 3 turns, gain 1 Energy.',
    turnStart: async (g, r) => { r.counter = (r.counter || 0) + 1; if (r.counter >= 3) { r.counter = 0; g.gainEnergy(1); } } });
  relic('Common', 'WICK_LAMP', { name: 'Wick Lamp', text: 'Start each combat with 1 additional Energy.', battleStart: async (g) => { g.firstTurnEnergy += 1; } });
  relic('Common', 'PIE_VOUCHER', { name: 'Pie Voucher', text: 'Whenever you enter a shop, heal 15 HP.', onShop: (run) => run.heal(15) });
  relic('Common', 'WORRY_STONE', { name: 'Worry Stone', text: 'Start each combat with 1 Poise.', battleStart: async (g) => g.addPw(g.p, 'poise', 1) });
  relic('Common', 'METRONOME', { name: 'Metronome', text: 'Every 3 turns, draw 1 card.',
    turnStart: async (g, r) => { r.counter = (r.counter || 0) + 1; if (r.counter >= 3) { r.counter = 0; g.extraDrawThisTurn += 1; } } });
  relic('Common', 'ASH_MASK', { name: 'Ash Mask', text: 'At the start of each combat, apply 1 Sapped to ALL enemies.',
    battleStart: async (g) => { for (const e of g.alive()) await g.apply(e, 'sapped', 1); } });
  relic('Common', 'DOWN_PILLOW', { name: 'Down Pillow', text: 'Whenever you Rest, heal an additional 15 HP.' });
  relic('Common', 'WILD_BERRY', { name: 'Wild Berry', text: 'On pickup, raise your Max HP by 7.', onPickup: (run) => run.gainMaxHp(7) });
  relic('Common', 'PRACTICE_POST', { name: 'Practice Post', text: 'Cut cards deal 3 additional damage.' });
  relic('Common', 'IRON_KNUCKLE', { name: 'Iron Knuckle', text: 'Start each combat with 1 Might.', battleStart: async (g) => g.addPw(g.p, 'might', 1) });
  relic('Common', 'OLD_KETTLE', { name: 'Old Kettle', text: 'Whenever you enter a Rest Site, start the next combat with 2 additional Energy.',
    onRestSite: (run, r) => { r.charged = true; },
    battleStart: async (g, r) => { if (r.charged) { g.firstTurnEnergy += 2; r.charged = false; } } });
  relic('Common', 'OILED_BUCKLE', { name: 'Oiled Buckle', text: 'On pickup, Upgrade 2 random Skills.', onPickup: (run) => upgradeRandom(run, 'Skill', 2) });
  relic('Common', 'HONING_STONE', { name: 'Honing Stone', text: 'On pickup, Upgrade 2 random Attacks.', onPickup: (run) => upgradeRandom(run, 'Attack', 2) });
  relic('Common', 'VIOLET_GOURD', { name: 'Violet Gourd', text: 'Enemies drop 15 additional Gold.', noShop: true });
  relic('Common', 'WIDE_SASH', { name: 'Wide Sash', text: 'On pickup, gain 2 potion slots.', onPickup: (run) => run.addPotionSlots(2) });
  relic('Common', 'CRACKED_SKULL', { name: 'Cracked Skull', pool: 'oathburner', text: 'While your HP is at or below 50%, you have 3 additional Might.' });

  // ---------- Uncommon ----------
  relic('Uncommon', 'PAINTED_OX', { name: 'Painted Ox', text: 'At the start of each combat, gain 8 Vigor.', battleStart: async (g) => g.addPw(g.p, 'vigor', 8) });
  relic('Uncommon', 'TALL_HAT', { name: 'Tall Hat', text: 'Gain 25% additional Gold.', noShop: true });
  relic('Uncommon', 'TWO_WICK_CANDLE', { name: 'Two-Wick Candle', text: 'At the start of your 2nd turn, gain 2 Energy.', turnStart: onTurn(2, async (g) => g.gainEnergy(2)) });
  relic('Uncommon', 'EVER_FEATHER', { name: 'Ever Feather', text: 'For every 5 cards in your deck, heal 3 HP whenever you enter a Rest Site.',
    onRestSite: (run) => run.heal(3 * Math.floor(run.deck.length / 5)) });
  relic('Uncommon', 'IMP_HORN', { name: 'Imp Horn', text: 'Whenever an enemy dies, gain 1 Energy and draw 1 card.',
    onEnemyDeath: async (g) => { g.gainEnergy(1); await g.drawCards(1); } });
  relic('Uncommon', 'IRON_CLEAT', { name: 'Iron Cleat', text: 'At the start of your 2nd turn, gain 14 Guard.', turnStart: onTurn(2, (g) => g.gainBlock(14, false)) });
  relic('Uncommon', 'PRAYER_PAPER', { name: 'Prayer Paper', text: 'Every 5 times a card Burns, draw 1 card.',
    onBurn: async (g, r) => { r.counter = (r.counter || 0) + 1; if (r.counter >= 5) { r.counter = 0; await g.drawCards(1); } } });
  relic('Uncommon', 'CHAIN_SICKLE', { name: 'Chain Sickle', text: 'Every 3 Attacks you play in a single turn, deal 6 damage to a random enemy.',
    afterPlay: perTurn('Attack', 3, async (g) => { const e = g.randomEnemy(); if (e) await g.damage(e, 6, {}); }) });
  relic('Uncommon', 'LONG_SWEET', { name: 'Long Sweet', text: 'Every other combat, your card rewards include an extra Power.' });
  relic('Uncommon', 'PAPER_KNIFE', { name: 'Paper Knife', text: 'Every 3 Skills you play in a single turn, deal 5 damage to ALL enemies.',
    afterPlay: perTurn('Skill', 3, (g) => hitAll(g, 5)) });
  relic('Uncommon', 'LUCKY_CARP', { name: 'Lucky Carp', text: 'Whenever you add a card to your deck, gain 15 Gold.', noShop: true, onCardAdded: (run) => run.gainGold(15) });
  relic('Uncommon', 'QUICKSILVER_GLASS', { name: 'Quicksilver Glass', text: 'At the start of your turn, deal 3 damage to ALL enemies.', turnStart: (g) => hitAll(g, 3) });
  relic('Uncommon', 'TOY_CANNON', { name: 'Toy Cannon', text: 'Upgraded Attacks deal 3 additional damage.' });
  relic('Uncommon', 'FLAIL_STICKS', { name: 'Flail Sticks', text: 'Every 10 Attacks you play, gain 1 Energy.',
    afterPlay: async (g, r, c, d) => { if (d.type !== 'Attack') return; r.counter = (r.counter || 0) + 1; if (r.counter >= 10) { r.counter = 0; g.gainEnergy(1); } } });
  relic('Uncommon', 'BRASS_SHELL', { name: 'Brass Shell', text: 'If you end your turn without Guard, gain 6 Guard.', turnEnd: async (g) => { if (!g.p.block) await g.gainBlock(6, false); } });
  relic('Uncommon', 'PAPER_FAN', { name: 'Paper Fan', text: 'Every 3 Attacks you play in a single turn, gain 4 Guard.', afterPlay: perTurn('Attack', 3, (g) => g.gainBlock(4, false)) });
  relic('Uncommon', 'TRACING_ARM', { name: 'Tracing Arm', text: 'At the start of each Boss combat, heal 25 HP.', battleStart: async (g) => { if (g.kind === 'boss') g.heal(25); } });
  relic('Uncommon', 'PARRY_BUCKLER', { name: 'Parry Buckler', text: 'If you end a turn with at least 10 Guard, deal 6 damage to a random enemy.',
    turnEnd: async (g) => { if (g.p.block >= 10) { const e = g.randomEnemy(); if (e) await g.damage(e, 6, {}); } } });
  relic('Uncommon', 'HARD_PEAR', { name: 'Hard Pear', text: 'On pickup, raise your Max HP by 10.', onPickup: (run) => run.gainMaxHp(10) });
  relic('Uncommon', 'QUILL_NIB', { name: 'Quill Nib', text: 'Every 10th Attack you play deals double damage.' });
  relic('Uncommon', 'FROST_RIND', { name: 'Frost Rind', text: 'The first time you play a Power each combat, gain 7 Guard.',
    afterPlay: async (g, r, c, d) => { if (d.type === 'Power' && !g.rs.frostRind) { g.rs.frostRind = true; await g.gainBlock(7, false); } } });
  relic('Uncommon', 'STONE_FROG', { name: 'Stone Frog', text: 'At the start of each combat, gain a Stone Flask.', battleStart: async (g) => { g.run.addPotion('STONE_FLASK'); } });
  relic('Uncommon', 'STAR_CHART', { name: 'Star Chart', text: 'Whenever you enter a ? room, heal 5 HP.', onUnknown: (run) => run.heal(5) });
  relic('Uncommon', 'SCALE_CHARM', { name: 'Scale Charm', text: 'Whenever you use a potion, gain 3 Might this turn.', onPotion: async (g) => g.addPw(g.p, 'mightTemp', 3) });
  relic('Uncommon', 'STILL_BASIN', { name: 'Still Basin', text: 'If you play no Attacks during your turn, gain 4 Guard.', turnEnd: async (g) => { if (!g.t.attacks) await g.gainBlock(4, false); } });
  relic('Uncommon', 'ROUGE_POT', { name: 'Rouge Pot', text: 'At the start of your 3rd turn, gain 1 Might and 1 Poise.',
    turnStart: onTurn(3, async (g) => { g.addPw(g.p, 'might', 1); g.addPw(g.p, 'poise', 1); }) });
  relic('Uncommon', 'CHISEL', { name: 'Chisel', text: 'At the start of each combat, Upgrade 2 random cards in your draw pile for that combat.',
    battleStart: async (g) => { g.rng.shuffle(g.draw.filter((c) => g.canUpgrade(c))).slice(0, 2).forEach((c) => g.upgradeInCombat(c)); } });
  relic('Uncommon', 'LETTER_SLOT', { name: 'Letter Slot', text: 'Whenever you Rest, receive 2 random potions.',
    onRest: (run) => { run.pending.push({ kind: 'potion', id: run.randomPotion() }, { kind: 'potion', id: run.randomPotion() }); } });
  relic('Uncommon', 'BELL_FORK', { name: 'Bell Fork', text: 'Every 10 Skills you play, gain 7 Guard.',
    afterPlay: async (g, r, c, d) => { if (d.type !== 'Skill') return; r.counter = (r.counter || 0) + 1; if (r.counter >= 10) { r.counter = 0; await g.gainBlock(7, false); } } });
  relic('Uncommon', 'ARM_GUARD', { name: 'Arm Guard', text: 'The first time you gain Guard from a card each combat, double it.' });
  relic('Uncommon', 'PAPER_NEWT', { name: 'Paper Newt', pool: 'oathburner', text: 'Exposed enemies take 75% more damage instead of 50%.' });
  relic('Uncommon', 'KNITTING_CLAY', { name: 'Knitting Clay', pool: 'oathburner', text: 'Whenever you lose HP in combat, gain 3 Guard next turn.' });

  // ---------- Rare ----------
  relic('Rare', 'PATIENT_BLADE', { name: 'Patient Blade', text: 'If you play no Attacks during your turn, gain 1 extra Energy next turn.',
    turnEnd: async (g) => { if (!g.t.attacks) g.addPw(g.p, 'nextEnergy', 1); } });
  relic('Rare', 'LAST_HEARTBEAT', { name: 'Last Heartbeat', text: 'You cannot lose more than 20 HP in a single turn.' });
  relic('Rare', 'FORGE_BELLOWS', { name: 'Forge Bellows', text: 'The first hand you draw each combat is Upgraded.',
    firstHand: async (g) => { for (const c of g.hand) if (g.canUpgrade(c)) g.upgradeInCombat(c); } });
  relic('Rare', 'HELM_WHEEL', { name: 'Helm Wheel', text: 'At the start of your 3rd turn, gain 18 Guard.', turnStart: onTurn(3, (g) => g.gainBlock(18, false)) });
  relic('Rare', 'HANGING_LAMP', { name: 'Hanging Lamp', text: 'At the start of your 3rd turn, gain 3 Energy.', turnStart: onTurn(3, async (g) => g.gainEnergy(3)) });
  relic('Rare', 'CLOAK_PIN', { name: 'Cloak Pin', text: 'At the end of your turn, gain 1 Guard for each card in your hand.',
    turnEnd: async (g) => { if (g.hand.length) await g.gainBlock(g.hand.length, false); } });
  relic('Rare', 'FROST_EGG', { name: 'Frost Egg', text: 'Whenever you add a Power to your deck, Upgrade it.', eggType: 'Power' });
  relic('Rare', 'LOADED_DIE', { name: 'Loaded Die', text: 'At the start of each combat, discard any number of cards, then draw that many.',
    firstHand: async (g) => {
      if (!g.hand.length) return;
      const xs = await g.choose({ from: g.hand.slice(), n: g.hand.length, min: 0, prompt: 'Loaded Die: discard any number, then draw that many' });
      // Discarding from hand: Sly cards play themselves, and discard relics and cards count it.
      for (const c of xs) { await g.discardFromHand(c); if (g.over) return; }
      await g.drawCards(xs.length);
    } });
  relic('Rare', 'BOARD_PIECE', { name: 'Board Piece', text: 'Whenever you play a Power, draw 1 card.', afterPlay: async (g, r, c, d) => { if (d.type === 'Power') await g.drawCards(1); } });
  relic('Rare', 'KETTLEBELL', { name: 'Kettlebell', text: 'You can Lift at Rest Sites to start every combat with more Might. Up to 3 times.',
    battleStart: async (g, r) => { if (r.lifts) g.addPw(g.p, 'might', r.lifts); } });
  relic('Rare', 'COLD_CREAM', { name: 'Cold Cream', text: 'Unspent Energy carries over to your next turn.' });
  relic('Rare', 'GLARING_HELM', { name: 'Glaring Helm', text: 'Whenever you play a card that costs 2 or more, gain 4 Guard.',
    afterPlay: async (g, r, c, d, paid) => { if (paid >= 2) await g.gainBlock(4, false); } });
  relic('Rare', 'THROWING_PIN', { name: 'Throwing Pin', text: 'Every 3 Attacks you play in a single turn, gain 1 Poise.', afterPlay: perTurn('Attack', 3, async (g) => g.addPw(g.p, 'poise', 1)) });
  relic('Rare', 'SHED_TAIL', { name: 'Shed Tail', text: 'When your HP would drop to 0, heal to 50% of your Max HP instead. Works once.' });
  relic('Rare', 'SUNFRUIT', { name: 'Sunfruit', text: 'On pickup, raise your Max HP by 14.', onPickup: (run) => run.gainMaxHp(14) });
  relic('Rare', 'MARROW_BONE', { name: 'Marrow Bone', text: 'If your HP is at or below 50% at the end of combat, heal 12 HP.',
    afterCombat: (run) => { if (run.hp <= run.maxHp / 2) run.heal(12); } });
  relic('Rare', 'EMBER_EGG', { name: 'Ember Egg', text: 'Whenever you add an Attack to your deck, Upgrade it.', eggType: 'Attack' });
  relic('Rare', 'WITHERED_HAND', { name: 'Withered Hand', text: 'Whenever you play a Power, a random card in your hand is free this turn.',
    afterPlay: async (g, r, c, d) => { if (d.type !== 'Power') return; const xs = g.hand.filter((x) => typeof CARDS[x.id].cost === 'number' && g.costOf(x) > 0); if (xs.length) g.rng.pick(xs).freeTurn = true; } });
  relic('Rare', 'WORN_COIN', { name: 'Worn Coin', text: 'On pickup, gain 300 Gold.', noShop: true, onPickup: (run) => run.gainGold(300) });
  relic('Rare', 'POCKET_SUNDIAL', { name: 'Pocket Sundial', text: 'If you play 3 or fewer cards during your turn, draw 3 extra cards next turn.',
    turnEnd: async (g) => { if (g.t.cards <= 3) g.addPw(g.p, 'nextDraw', 3); } });
  relic('Rare', 'SPINNING_WHEEL', { name: 'Spinning Wheel', text: 'Normal fights give an additional card reward.' });
  relic('Rare', 'PRISM_RING', { name: 'Prism Ring', text: 'The first time you play an Attack, a Skill and a Power in a turn, gain 1 Might and 1 Poise.',
    afterPlay: async (g) => { if (g.t.types.size >= 3 && !g.t.prism) { g.t.prism = true; g.addPw(g.p, 'might', 1); g.addPw(g.p, 'poise', 1); } } });
  relic('Rare', 'WHET_TOOTH', { name: 'Whet Tooth', text: 'Whenever you play an Attack or Skill, Upgrade it for the rest of combat.',
    afterPlay: async (g, r, c, d) => { if ((d.type === 'Attack' || d.type === 'Skill') && g.canUpgrade(c)) g.upgradeInCombat(c); } });
  relic('Rare', 'SPADE', { name: 'Spade', text: 'You can Dig at Rest Sites to find a relic.' });
  relic('Rare', 'STAR_BLADE', { name: 'Star Blade', text: 'Every 3 Attacks you play in a single turn, gain 1 Might.', afterPlay: perTurn('Attack', 3, async (g) => g.addPw(g.p, 'might', 1)) });
  relic('Rare', 'STONE_ALMANAC', { name: 'Stone Almanac', text: 'At the end of turn 7, deal 52 damage to ALL enemies.', turnEnd: async (g) => { if (g.turn === 7) await hitAll(g, 52); } });
  relic('Rare', 'VISE_CLAMP', { name: 'Vise Clamp', text: 'Up to 10 Guard carries over between turns.' });
  relic('Rare', 'THE_RUNNER', { name: 'The Runner', text: 'The shop restocks what you buy and its prices drop by 20%.', noShop: true });
  relic('Rare', 'MOSS_EGG', { name: 'Moss Egg', text: 'Whenever you add a Skill to your deck, Upgrade it.', eggType: 'Skill' });
  relic('Rare', 'LEAD_ROD', { name: 'Lead Rod', text: 'Whenever you would lose HP, lose 1 less.' });
  relic('Rare', 'WHIRLIGIG', { name: 'Whirligig', text: 'Whenever your hand is empty during your turn, draw a card.' });
  relic('Rare', 'EERIE_LAMP', { name: 'Eerie Lamp', text: 'Each combat, the first card you play that debuffs an enemy has double effect.' });
  relic('Rare', 'RIDDLE_BOX', { name: 'Riddle Box', text: 'At the start of each combat, add a random card to your hand. It is free this turn.',
    firstHand: async (g) => { const c = g.makeCard(g.randomPoolCard(() => true), false); c.freeTurn = true; g.addToHand(c); } });
  relic('Rare', 'PALE_IDOL', { name: 'Pale Idol', text: 'Combat rewards always include a potion.' });
  relic('Rare', 'PALE_STAR', { name: 'Pale Star', text: 'Elites give an additional Rare card reward.' });
  relic('Rare', 'FERRYMANS_ASH', { name: "Ferryman's Ash", pool: 'oathburner', text: 'Whenever a card Burns, deal 3 damage to ALL enemies.', onBurn: (g) => hitAll(g, 3) });
  relic('Rare', 'FORKED_TONGUE', { name: 'Forked Tongue', pool: 'oathburner', text: 'The first time you lose HP on your turn, heal that much.' });
  relic('Rare', 'DENTED_HELM', { name: 'Dented Helm', pool: 'oathburner', text: 'The first time you gain Might each combat, double it.' });

  // ---------- Shop ----------
  relic('Shop', 'BUCKLE', { name: 'Buckle', text: 'While you hold no potions, you have 2 additional Poise.' });
  relic('Shop', 'CRUSTY_LOAF', { name: 'Crusty Loaf', text: 'Lose 2 Energy on your first turn. Gain 1 Energy on every other turn.',
    turnStart: async (g) => { if (g.turn === 1) g.energy = Math.max(0, g.energy - 2); else g.gainEnergy(1); } });
  relic('Shop', 'KINDLING_BUNDLE', { name: 'Kindling Bundle', text: 'The first time a Skill Burns each combat, add a copy of it to your hand.',
    onBurn: async (g, r, c) => { if (CARDS[c.id].type === 'Skill' && !g.rs.kindling) { g.rs.kindling = true; g.addToHand(g.makeCard(c.id, c.up)); } } });
  relic('Shop', 'BREWING_POT', { name: 'Brewing Pot', text: 'On pickup, brew 5 random potions.',
    onPickup: (run) => { for (let i = 0; i < 5; i++) run.pending.push({ kind: 'potion', id: run.randomPotion() }); } });
  relic('Shop', 'UNKNOWN_REAGENT', { name: 'Unknown Reagent', text: 'Your X-cost cards act as if X were 2 higher.' });
  relic('Shop', 'HAND_MIRROR', { name: 'Hand Mirror', text: 'On pickup, add a copy of a card in your deck.', onPickup: (run) => { run.pending.push({ kind: 'mirror' }); } });
  relic('Shop', 'SCALEFRUIT', { name: 'Scalefruit', text: 'Whenever you gain Gold, raise your Max HP by 1.' });
  relic('Shop', 'PALE_SEED', { name: 'Pale Seed', text: 'Cut and Brace cards gain Fleeting.' });
  relic('Shop', 'MAGMA_LAMP', { name: 'Magma Lamp', text: 'If you take no damage in a combat, its card rewards are Upgraded.' });
  relic('Shop', 'HONEY_WAFFLE', { name: 'Honey Waffle', text: 'On pickup, raise your Max HP by 7 and heal to full.', onPickup: (run) => { run.gainMaxHp(7); run.hp = run.maxHp; } });
  relic('Shop', 'GUILD_TOKEN', { name: 'Guild Token', text: 'Everything in the shop is 50% off.' });
  relic('Shop', 'BEDROLL', { name: 'Bedroll', text: 'You may take any number of options at Rest Sites.' });
  relic('Shop', 'CLOCKWORK_SKY', { name: 'Clockwork Sky', text: 'On pickup, receive 5 card rewards.',
    onPickup: (run) => { for (let i = 0; i < 5; i++) run.pending.push({ kind: 'cards', cards: run.rewardCards('plain') }); } });
  relic('Shop', 'CHIME', { name: 'Chime', text: 'Keep your hand at the end of your first turn each combat.' });
  relic('Shop', 'HOWLING_JUG', { name: 'Howling Jug', text: 'If you end your turn with no cards in hand, deal 20 damage to ALL enemies.',
    turnEnd: async (g) => { if (!g.hand.length) await hitAll(g, 20); } });
  relic('Shop', 'BRAVE_SLING', { name: 'Brave Sling', text: 'Start each Elite combat with 2 Might.', battleStart: async (g) => { if (g.kind === 'elite') g.addPw(g.p, 'might', 2); } });
  relic('Shop', 'COUNTING_FRAME', { name: 'Counting Frame', text: 'Whenever you shuffle your draw pile, gain 6 Guard.', onShuffle: (g) => g.gainBlock(6, false) });
  relic('Shop', 'SULFUR_STONE', { name: 'Sulfur Stone', pool: 'oathburner', text: 'At the start of your turn, gain 2 Might and ALL enemies gain 1 Might.',
    turnStart: async (g) => { g.addPw(g.p, 'might', 2); for (const e of g.alive()) g.addPw(e, 'might', 1); } });

  // ---------- Ancient: the Rootmother (start of Act 1) ----------
  const strikes = (run) => run.deck.filter((c) => c.id === HD.CHARS[run.charId].strike);
  const defends = (run) => run.deck.filter((c) => c.id === HD.CHARS[run.charId].defend);
  const boon = (id, o) => relic('Ancient', id, Object.assign({ pool: 'neow' }, o));
  const bane = (id, o) => relic('Ancient', id, Object.assign({ pool: 'neow', bane: true }, o));
  boon('FADED_SCROLL', { name: 'Faded Scroll', text: 'On pickup, add a random Rare card to your deck.',
    onPickup: (run) => run.addCard(run.rng.cards.pick(run.pool().filter((d) => d.rarity === 'Rare')).id) });
  boon('ECHO_HORN', { name: 'Echo Horn', text: 'At the start of Elite combats, draw 2 additional cards and gain 1 Energy.',
    battleStart: async (g) => { if (g.kind === 'elite') { g.firstTurnDraw += 2; g.firstTurnEnergy += 1; } } });
  boon('AMBER_PEARL', { name: 'Amber Pearl', text: 'On pickup, gain 150 Gold.', onPickup: (run) => run.gainGold(150) });
  boon('BURIED_COFFER', { name: 'Buried Coffer', text: 'On pickup, receive 1 card reward and 1 random potion.',
    onPickup: (run) => { run.pending.push({ kind: 'cards', cards: run.rewardCards('plain') }, { kind: 'potion', id: run.randomPotion() }); } });
  boon('ROOTMOTHERS_WRATH', { name: "Rootmother's Wrath", text: "On pickup, add 1 Rootmother's Fury to your deck.", onPickup: (run) => run.addCard('ROOT_FURY') });
  boon('FRESH_SPROUT', { name: 'Fresh Sprout', text: 'On pickup, Transform 1 card.', onPickup: (run) => { run.pending.push({ kind: 'transform' }); } });
  boon('VIAL_BANDOLIER', { name: 'Vial Bandolier', text: 'On pickup, gain 1 potion slot and receive 2 random potions.',
    onPickup: (run) => { run.addPotionSlots(1); for (let i = 0; i < 2; i++) if (!run.addPotion(run.randomPotion())) run.pending.push({ kind: 'potion', id: run.randomPotion() }); } });
  boon('PRUNING_KNIFE', { name: 'Pruning Knife', text: 'On pickup, remove 1 card from your deck.', onPickup: (run) => { run.pending.push({ kind: 'remove' }); } });
  boon('MOTH_BOOTS', { name: 'Moth Boots', text: 'You may ignore paths when choosing your next room, 3 times.', onPickup: (run, r) => { r.charges = 3; } });
  boon('MAGMA_PEBBLE', { name: 'Magma Pebble', text: 'The Act 1 Boss drops 2 Relics.' });
  boon('SMALL_SEEDPOD', { name: 'Small Seedpod', text: 'On pickup, obtain a random Relic.', onPickup: (run) => run.addRelic(run.rollRelic()) });
  boon('HEARTY_MUSSEL', { name: 'Hearty Mussel', text: 'On pickup, raise your Max HP by 11.', onPickup: (run) => run.gainMaxHp(11) });
  boon('DEW_STONE', { name: 'Dew Stone', text: 'Whenever you Rest at a Rest Site, raise your Max HP by 5.', onRest: (run) => run.gainMaxHp(5) });
  boon('ROOTMOTHERS_CHARM', { name: "Rootmother's Charm", text: 'On pickup, Upgrade 1 of your Cut cards and 1 of your Brace cards.',
    onPickup: (run) => { for (const xs of [strikes(run), defends(run)]) { const c = xs.find((x) => !x.up); if (c) run.upgrade(c); } } });
  boon('SCENT_BALL', { name: 'Scent Ball', text: 'On pickup, Upgrade a card.', onPickup: (run) => { run.pending.push({ kind: 'upgrade' }); } });
  bane('TAINTED_PEARL', { name: 'Tainted Pearl', text: 'On pickup, add Avarice to your deck. Gain 333 Gold.',
    onPickup: (run) => { run.addCard('AVARICE'); run.gainGold(333); } });
  bane('HEAVY_SLAB', { name: 'Heavy Slab', text: 'On pickup, choose 1 of 3 Rare cards to add to your deck, and add 1 Sprain to your deck.',
    onPickup: (run) => { run.pending.push({ kind: 'cards', cards: run.cardReward('plain', 'Rare') }); run.addCard('SPRAIN'); } });
  bane('LARGE_SEEDPOD', { name: 'Large Seedpod', text: 'On pickup, obtain 2 random Relics. Add an extra Cut and Brace to your deck.',
    onPickup: (run) => { run.addRelic(run.rollRelic()); run.addRelic(run.rollRelic()); run.addCard(HD.CHARS[run.charId].strike); run.addCard(HD.CHARS[run.charId].defend); } });
  bane('MOSS_POULTICE', { name: 'Moss Poultice', text: 'On pickup, Transform 1 of your Cut cards and 1 of your Brace cards, and lose 12 Max HP.',
    onPickup: (run) => { for (const xs of [strikes(run), defends(run)]) if (xs.length) run.transform(run.rng.misc.pick(xs)); run.loseMaxHp(12); } });
  bane('ROOTMOTHERS_BONES', { name: "Rootmother's Bones", text: 'On pickup, gain 2 random Rootmother relics. Add 1 random curse to your deck.',
    onPickup: (run) => { for (const id of run.rng.neow.shuffle(HD.neowBoons(run)).slice(0, 2)) run.addRelic(id); run.addCard(run.rng.neow.pick(HD.RANDOM_CURSES)); } });
  bane('RUSTY_SHEARS', { name: 'Rusty Shears', text: 'On pickup, remove 2 cards from your deck and lose 16 HP.',
    onPickup: (run) => { run.pending.push({ kind: 'remove' }, { kind: 'remove' }); run.hp = Math.max(1, run.hp - 16); } });
  bane('TIN_CRUCIBLE', { name: 'Tin Crucible', text: 'Your first 3 card rewards are Upgraded. The first chest you open is empty.' });

  // The Rootmother offers 2 boons and 1 bane. One of each pair is eligible; some banes rule out a boon.
  HD.NEOW = {
    boons: ['FADED_SCROLL', 'ECHO_HORN', 'AMBER_PEARL', 'BURIED_COFFER', 'ROOTMOTHERS_WRATH', 'FRESH_SPROUT', 'VIAL_BANDOLIER', 'PRUNING_KNIFE', 'MOTH_BOOTS'],
    pairs: [['MAGMA_PEBBLE', 'SMALL_SEEDPOD'], ['HEARTY_MUSSEL', 'DEW_STONE'], ['ROOTMOTHERS_CHARM', 'SCENT_BALL']],
    banes: ['TAINTED_PEARL', 'HEAVY_SLAB', 'LARGE_SEEDPOD', 'MOSS_POULTICE', 'ROOTMOTHERS_BONES', 'RUSTY_SHEARS', 'TIN_CRUCIBLE'],
    conflicts: { TAINTED_PEARL: ['AMBER_PEARL'], HEAVY_SLAB: ['FADED_SCROLL'], MOSS_POULTICE: ['FRESH_SPROUT'], RUSTY_SHEARS: ['PRUNING_KNIFE'], LARGE_SEEDPOD: ['MAGMA_PEBBLE', 'SMALL_SEEDPOD'] },
  };
  HD.neowBoons = (run, bane) => {
    const N = HD.NEOW;
    const out = N.boons.slice();
    for (const pair of N.pairs) out.push(run.rng.neow.pick(pair));
    const blocked = new Set((bane && N.conflicts[bane]) || []);
    return out.filter((id) => !blocked.has(id) && !run.hasRelic(id));
  };

  HD.relicPool = (rarity, run) => Object.values(R)
    .filter((d) => d.rarity === rarity && (d.pool === 'shared' || d.pool === run.color) && !run.relics.some((r) => r.id === d.id))
    .map((d) => d.id);
})();

// Potions. Numbers match the reference build; names and text are HallowDeep's own.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const P = (HD.POTIONS = {});
  const potion = (id, o) => { P[id] = Object.assign({ id, target: 'self', pool: 'shared' }, o); };

  // Offer 3 random pool cards of a type; the pick goes to hand, free this turn.
  const offer = async (g, filter, prompt) => {
    const ids = g.rng.shuffle(g.run.pool().filter(filter).map((d) => d.id)).slice(0, 3);
    const opts = ids.map((id) => g.makeCard(id, false));
    const [c] = await g.choose({ from: opts, n: 1, prompt });
    if (c) { c.freeTurn = true; g.addToHand(c); }
  };

  // ---------- Common ----------
  potion('BLADE_TINCTURE', { name: 'Tincture of Blades', rarity: 'Common', text: 'Choose 1 of 3 random Attacks to add to your hand. It is free this turn.',
    use: (g) => offer(g, (d) => d.type === 'Attack', 'Choose an Attack') });
  potion('BARK_DRAUGHT', { name: 'Bark Draught', rarity: 'Common', text: 'Gain 12 Guard.', use: (g) => g.gainBlock(12, false) });
  potion('POISE_TONIC', { name: 'Poise Tonic', rarity: 'Common', text: 'Gain 2 Poise.', use: (g) => g.addPw(g.p, 'poise', 2) });
  potion('EMBER_DRAUGHT', { name: 'Ember Draught', rarity: 'Common', text: 'Gain 2 Energy.', use: (g) => g.gainEnergy(2) });
  potion('BLASTING_VIAL', { name: 'Blasting Vial', rarity: 'Common', target: 'all', text: 'Deal 10 damage to ALL enemies.',
    use: async (g) => { for (const e of g.alive()) await g.damage(e, 10, {}); } });
  potion('FLAME_FLASK', { name: 'Flask of Flame', rarity: 'Common', target: 'enemy', text: 'Deal 20 damage.', use: (g, t) => g.damage(t, 20, {}) });
  potion('SURGE_TONIC', { name: 'Surge Tonic', rarity: 'Common', text: 'Gain 5 Might. At the end of your turn, lose 5 Might.', use: (g) => g.addPw(g.p, 'mightTemp', 5) });
  potion('RITE_TINCTURE', { name: 'Tincture of Rites', rarity: 'Common', text: 'Choose 1 of 3 random Powers to add to your hand. It is free this turn.',
    use: (g) => offer(g, (d) => d.type === 'Power', 'Choose a Power') });
  potion('CRAFT_TINCTURE', { name: 'Tincture of Craft', rarity: 'Common', text: 'Choose 1 of 3 random Skills to add to your hand. It is free this turn.',
    use: (g) => offer(g, (d) => d.type === 'Skill', 'Choose a Skill') });
  potion('QUICKSTEP_TONIC', { name: 'Quickstep Tonic', rarity: 'Common', text: 'Gain 5 Poise. At the end of your turn, lose 5 Poise.', use: (g) => g.addPw(g.p, 'poiseTemp', 5) });
  potion('MIGHT_TONIC', { name: 'Might Tonic', rarity: 'Common', text: 'Gain 2 Might.', use: (g) => g.addPw(g.p, 'might', 2) });
  potion('CLEAR_EYE', { name: 'Clear Eye Draught', rarity: 'Common', text: 'Draw 3 cards.', use: (g) => g.drawCards(3) });
  potion('EXPOSING_VIAL', { name: 'Exposing Vial', rarity: 'Common', target: 'enemy', text: 'Apply 3 Exposed.', use: (g, t) => g.apply(t, 'exposed', 3) });
  potion('SAPPING_VIAL', { name: 'Sapping Vial', rarity: 'Common', target: 'enemy', text: 'Apply 3 Sapped.', use: (g, t) => g.apply(t, 'sapped', 3) });
  potion('HEARTBLOOD', { name: 'Heartblood Flask', rarity: 'Common', pool: 'oathburner', outside: true, text: 'Heal 20% of your Max HP.',
    use: (g) => g.heal(Math.floor(g.p.maxHp * 0.2)), useOutside: (run) => run.heal(Math.floor(run.maxHp * 0.2)) });

  // ---------- Uncommon ----------
  potion('ANVIL_OIL', { name: 'Anvil Oil', rarity: 'Uncommon', text: 'Upgrade every card in your hand for the rest of combat.',
    use: (g) => { for (const c of g.hand) if (g.canUpgrade(c)) g.upgradeInCombat(c); } });
  potion('FOCUS_DROPS', { name: 'Focus Drops', rarity: 'Uncommon', text: 'Draw 1 card. At the start of your next 3 turns, draw 1 more card.',
    use: async (g) => { await g.drawCards(1); g.addPw(g.p, 'clarity', 3); } });
  potion('PANACEA', { name: 'Panacea', rarity: 'Uncommon', text: 'Gain 1 Energy. Draw 2 cards.', use: async (g) => { g.gainEnergy(1); await g.drawCards(2); } });
  potion('ECHO_VIAL', { name: 'Echo Vial', rarity: 'Uncommon', text: 'This turn, your next card is played an extra time.', use: (g) => g.addPw(g.p, 'duplicate', 1) });
  potion('STONEWALL', { name: 'Stonewall Draught', rarity: 'Uncommon', text: 'Triple your Guard.', use: (g) => g.gainBlock(g.p.block * 2, false) });
  potion('EEL_OIL', { name: 'Eel Oil', rarity: 'Uncommon', text: 'Gain 1 Might and 1 Poise.', use: (g) => { g.addPw(g.p, 'might', 1); g.addPw(g.p, 'poise', 1); } });
  potion('GAMBLERS_GROG', { name: "Gambler's Grog", rarity: 'Uncommon', text: 'Discard any number of cards, then draw that many.',
    use: async (g) => {
      if (!g.hand.length) return;
      const xs = await g.choose({ from: g.hand.slice(), n: g.hand.length, min: 0, prompt: 'Discard any number of cards' });
      // Discarding from hand: Sly cards play themselves, and discard relics and cards count it.
      for (const c of xs) { await g.discardFromHand(c); if (g.over) return; }
      await g.drawCards(xs.length);
    } });
  potion('IRONHEART', { name: 'Ironheart Draught', rarity: 'Uncommon', text: 'Gain 7 Plate.', use: (g) => g.addPw(g.p, 'plate', 7) });
  potion('THORNWATER', { name: 'Thornwater', rarity: 'Uncommon', text: 'Gain 3 Spines.', use: (g) => g.addPw(g.p, 'spines', 3) });
  potion('BINDING_VIAL', { name: 'Binding Vial', rarity: 'Uncommon', target: 'all', text: 'Apply 1 Sapped and 1 Exposed to ALL enemies.',
    use: async (g) => { for (const e of g.alive()) { await g.apply(e, 'sapped', 1); await g.apply(e, 'exposed', 1); } } });
  potion('WASTING_POWDER', { name: 'Wasting Powder', rarity: 'Uncommon', target: 'enemy', text: 'The target loses 9 HP at the end of each of its turns.',
    use: (g, t) => g.addPw(t, 'demise', 9) });
  potion('SUNWELL', { name: 'Sunwell Tincture', rarity: 'Uncommon', text: 'Gain 1 Energy. Gain 1 more at the start of your next 3 turns.',
    use: (g) => { g.gainEnergy(1); g.addPw(g.p, 'radiance', 3); } });
  potion('MENDING', { name: 'Mending Draught', rarity: 'Uncommon', text: 'Gain 5 Regrowth.', use: (g) => g.addPw(g.p, 'regen', 5) });
  potion('STEADY_SERUM', { name: 'Steady Serum', rarity: 'Uncommon', text: 'Keep your hand for the next 2 turns.', use: (g) => g.addPw(g.p, 'retainHand', 2) });
  potion('MADCAP_DROPS', { name: 'Madcap Drops', rarity: 'Uncommon', text: 'Choose a card in your hand. It is free for the rest of combat.',
    use: async (g) => { if (!g.hand.length) return; const [c] = await g.choose({ from: g.hand.slice(), n: 1, prompt: 'Make a card free' }); if (c) c.freeCombat = true; } });
  potion('ASH_RINSE', { name: 'Ash Rinse', rarity: 'Uncommon', pool: 'oathburner', text: 'Burn any number of cards in your hand.',
    use: async (g) => {
      if (!g.hand.length) return;
      const xs = await g.choose({ from: g.hand.slice(), n: g.hand.length, min: 0, prompt: 'Burn any number of cards' });
      for (const c of xs) { g.hand.splice(g.hand.indexOf(c), 1); await g.burn(c); }
    } });

  // ---------- Rare ----------
  potion('WEEVIL_JUICE', { name: 'Weevil Juice', rarity: 'Rare', target: 'enemy', text: "The target's Attacks deal 30% less damage for 4 turns.",
    use: (g, t) => g.apply(t, 'dampened', 4) });
  potion('FRESH_START', { name: 'Fresh Start Flask', rarity: 'Rare', text: 'Shuffle ALL your cards into your draw pile. Draw 5 cards.',
    use: async (g) => { g.draw.push(...g.hand.splice(0), ...g.discard.splice(0)); g.rng.shuffle(g.draw); await g.rh('onShuffle'); await g.drawCards(5); } });
  potion('CHAOS_DISTILLATE', { name: 'Chaos Distillate', rarity: 'Rare', text: 'Play the top 3 cards of your draw pile.',
    use: async (g) => { for (let i = 0; i < 3; i++) { const c = await g.takeTopOfDraw(); if (!c) break; await g.autoPlay(c, {}); if (g.over) break; } } });
  potion('FORESIGHT', { name: 'Foresight Drop', rarity: 'Rare', text: 'Choose a card in your draw pile and put it in your hand.',
    use: async (g) => { if (!g.draw.length) return; const [c] = await g.choose({ from: g.draw.slice(), n: 1, prompt: 'Take a card from your draw pile' }); if (c) { g.draw.splice(g.draw.indexOf(c), 1); g.addToHand(c); } } });
  potion('BOTTOMLESS_BREW', { name: 'Bottomless Brew', rarity: 'Rare', outside: true, text: 'Fill every empty potion slot with a random potion.',
    use: (g) => g.run.fillPotions(), useOutside: (run) => run.fillPotions() });
  potion('MOTH_JAR', { name: 'Moth in a Jar', rarity: 'Rare', passive: true, text: 'When your HP would drop to 0, this breaks and you heal to 30% of your Max HP.' });
  potion('ROOTFRUIT', { name: 'Rootfruit Juice', rarity: 'Rare', outside: true, text: 'Raise your Max HP by 5.',
    use: (g) => g.gainMaxHp(5), useOutside: (run) => { run.maxHp += 5; run.hp += 5; } });
  potion('TITAN_DRAUGHT', { name: 'Titan Draught', rarity: 'Rare', text: 'Your next Attack deals triple damage.', use: (g) => g.addPw(g.p, 'giga', 1) });
  potion('MEMORY_DRAUGHT', { name: 'Memory Draught', rarity: 'Rare', text: 'Put a card from your discard pile into your hand. It is free this turn.',
    use: async (g) => { if (!g.discard.length) return; const [c] = await g.choose({ from: g.discard.slice(), n: 1, prompt: 'Take a card from your discard pile' }); if (c) { g.discard.splice(g.discard.indexOf(c), 1); c.freeTurn = true; g.addToHand(c); } } });
  potion('CHARMED_TONIC', { name: 'Charmed Tonic', rarity: 'Rare', text: 'Gain 1 Aegis.', use: (g) => g.addPw(g.p, 'buffer', 1) });
  potion('HOLLOW_GIFT', { name: 'Hollow Gift', rarity: 'Rare', text: 'Gain 1 Kindling.', use: (g) => g.addPw(g.p, 'ritual', 1) });
  potion('TRI_ACID', { name: 'Tri-Acid', rarity: 'Rare', text: 'Add a random Attack, Skill and Power to your hand. They are free this turn.',
    use: (g) => { for (const type of ['Attack', 'Skill', 'Power']) { const c = g.makeCard(g.randomPoolCard((d) => d.type === type), false); c.freeTurn = true; g.addToHand(c); } } });
  potion('SHACKLE_VIAL', { name: 'Shackle Vial', rarity: 'Rare', target: 'all', text: 'ALL enemies lose 7 Might until the end of their turn.',
    use: async (g) => { for (const e of g.alive()) await g.apply(e, 'mightDown', 7); } });
  potion('FORT_FLASK', { name: 'Fort in a Flask', rarity: 'Rare', text: 'Gain 10 Guard. Next turn, gain 10 Guard.',
    use: async (g) => { await g.gainBlock(10, false); g.addPw(g.p, 'nextBlock', 10); } });
  potion('MADNESS_OIL', { name: 'Madness Oil', rarity: 'Rare', text: 'Draw 7 cards. Randomize the cost of every card in your hand this turn.',
    use: async (g) => { await g.drawCards(7); for (const c of g.hand) if (typeof CARDS[c.id].cost === 'number') c.costTurn = g.rng.int(4); } });
  potion('CUTTERS_STEW', { name: "Cutter's Stew", rarity: 'Rare', pool: 'oathburner', text: 'Every Cut card gains Replay 1 for the rest of combat.',
    use: (g) => { for (const c of [...g.draw, ...g.hand, ...g.discard, ...g.ash]) if (g.isCut(c)) c.replay = (c.replay || 0) + 1; } });

  // ---------- Token ----------
  potion('STONE_FLASK', { name: 'Stone Flask', rarity: 'Token', pool: 'token', target: 'enemy', text: 'Deal 15 damage.', use: (g, t) => g.damage(t, 15, {}) });

  HD.potionPool = (rarity, color = 'oathburner') => Object.values(P).filter((d) => d.rarity === rarity && (d.pool === 'shared' || d.pool === color)).map((d) => d.id);
})();

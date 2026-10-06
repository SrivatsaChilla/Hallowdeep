// The six Ancients met at the start of Acts 2 and 3, their relics, and the cards those relics hand out.
// Numbers follow the reference data; names and text are HallowDeep's own.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const R = HD.RELICS;

  // ---------- cards from Ancient relics ----------
  const card = (id, o) => { CARDS[id] = Object.assign({ id, color: 'event', rarity: 'Ancient', target: 'self', v: {}, up: {}, kw: [], tags: [] }, o); };
  card('APEX', { name: 'Apex', type: 'Skill', cost: 2, upCost: 1, kw: ['Burn', 'Opening'], text: () => 'Upgrade ALL your cards for the rest of this combat.',
    play: async (g) => { for (const c of [...g.hand, ...g.draw, ...g.discard, ...g.ash]) if (g.canUpgrade(c)) g.upgradeInCombat(c); } });
  card('GLOWSHARD', { name: 'Glowshard', type: 'Skill', rarity: 'Token', color: 'token', cost: 0, kw: ['Burn', 'Retain'], v: { en: 2 }, up: { en: 1 },
    text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) });
  card('UNWIND', { name: 'Unwind', type: 'Skill', cost: 3, kw: ['Burn'], v: { blk: 15, draw: 2, en: 2 }, up: { blk: 2, draw: 1, en: 1 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Next turn, draw ${v.draw} cards and gain ${v.en} Energy.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'nextDraw', v.draw); g.addPw(g.p, 'nextEnergy', v.en); } });
  card('MAULING', { name: 'Mauling', type: 'Attack', cost: 1, target: 'enemy', v: { dmg: 5, inc: 1 }, up: { dmg: 1, inc: 1 },
    text: (v, f, c, g) => `Deal ${f.d(v.dmg + (g ? g.maulBonus || 0 : 0))} damage twice. All Maulings deal ${v.inc} more damage this combat.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg + (g.maulBonus || 0), 2, c); g.maulBonus = (g.maulBonus || 0) + v.inc; } });
  card('BEAST_CALL', { name: 'Beast Call', type: 'Attack', cost: 3, target: 'enemy', kw: ['Burn'], v: { dmg: 33 }, up: { dmg: 11 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Stun the enemy.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive && !t.respawning) { t.forceIntent = 'STUN'; t.intent = 'STUN'; } } });
  card('ASHFALL', { name: 'Ashfall', type: 'Status', rarity: 'Status', color: 'status', cost: null, kw: ['Unplayable'], text: () => '' });
  card('WHITE_FLAME', { name: 'White Flame', type: 'Skill', cost: 0, v: { en: 2, draw: 2, hp: 1 }, up: { en: 1, draw: 1 },
    text: (v) => `Gain ${v.en} Energy. Draw ${v.draw} cards. Lose ${v.hp} Max HP.`,
    play: async (g, c, t, v) => { g.gainEnergy(v.en); await g.drawCards(v.draw); g.p.maxHp = Math.max(1, g.p.maxHp - v.hp); g.p.hp = Math.min(g.p.hp, g.p.maxHp); } });
  card('SPELLBOUND', { name: 'Spellbound', type: 'Curse', rarity: 'Curse', color: 'curse', cost: 2, kw: ['Eternal'], text: () => 'While this is in your hand, it must be played before other cards.', play: async () => {} });
  card('PHANTASM', { name: 'Phantasm', type: 'Skill', cost: 1, kw: ['Burn', 'Fleeting'], upKw: ['Burn'], v: { n: 1 }, text: (v) => `Gain ${v.n} Intangible.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'intangible', v.n) });
  card('FOOLISHNESS', { name: 'Foolishness', type: 'Curse', rarity: 'Curse', color: 'curse', cost: null, kw: ['Opening', 'Fleeting', 'Unplayable', 'Eternal'], text: () => '' });
  card('HOPE_CARD', { name: 'Hope', type: 'Skill', cost: 0, kw: ['Burn'], upKw: ['Burn', 'Retain'], text: () => 'Put a card from your draw pile into your hand.',
    play: async (g) => {
      if (!g.draw.length) return;
      const [x] = await g.choose({ from: g.draw.slice(), n: 1, prompt: 'Choose a card' });
      if (x) { g.draw.splice(g.draw.indexOf(x), 1); g.addToHand(x); }
    } });

  // ---------- relics ----------
  const relic = (anc, id, o) => { R[id] = Object.assign({ id, rarity: 'Ancient', pool: 'ancient', ancient: anc }, o); };
  const energy = async (g) => { g.maxEnergy += 1; };
  const upgradeRandom = (run, n) => run.rng.misc.shuffle(run.deck.filter((c) => !c.up && ['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type))).slice(0, n).forEach((c) => run.upgrade(c));
  const tagged = (run, tag) => run.deck.filter((c) => CARDS[c.id].tags.includes(tag) && CARDS[c.id].rarity === 'Basic');

  // Orobas (Act 2)
  relic('OROBAS', 'ALCHEMY_CHEST', { name: 'Alchemy Chest', text: 'On pickup, gain 4 potion slots filled with random potions.',
    onPickup: (run) => { run.addPotionSlots(4); for (let i = 0; i < 4; i++) run.addPotion(run.randomPotion()); } });
  relic('OROBAS', 'OLD_TOOTH', { name: 'Old Tooth', text: 'On pickup, Transform a starter card into an ancient version.',
    onPickup: (run) => { const [from, to] = HD.CHARS[run.charId].ancientCard; const c = run.deck.find((x) => x.id === from); if (c) { run.removeCard(c); run.addCard(to, c.up); } } });
  relic('OROBAS', 'DRIFT_LOG', { name: 'Drift Log', text: 'You may reroll each card reward once.' });
  relic('OROBAS', 'STATIC_SHRIMP', { name: 'Static Shrimp', text: 'On pickup, Enchant a Skill with Imbued.', onPickup: (run) => run.pending.push({ kind: 'enchant', id: 'IMBUED' }) });
  relic('OROBAS', 'CRYSTAL_EYE', { name: 'Crystal Eye', text: 'On pickup, obtain 2 Common cards, 2 Uncommon cards, and 1 Rare card.',
    onPickup: (run) => { for (const rar of ['Common', 'Common', 'Uncommon', 'Uncommon', 'Rare']) run.addCard(run.rng.cards.pick(HD.POOL(run.color).filter((d) => d.rarity === rar)).id); } });
  relic('OROBAS', 'BRIGHT_PEARL', { name: 'Bright Pearl', text: 'At the start of each combat, add 1 Glowshard to your hand.', firstHand: async (g) => g.addToHand(g.makeCard('GLOWSHARD', false)) });
  relic('OROBAS', 'SAND_FORT', { name: 'Sand Fort', text: 'On pickup, Upgrade 6 random cards.', onPickup: (run) => upgradeRandom(run, 6) });
  relic('OROBAS', 'ELDER_TOUCH', { name: "Elder's Touch", text: 'On pickup, replace your starter relic with an ancient version.',
    onPickup: (run) => { const ch = HD.CHARS[run.charId]; const i = run.relics.findIndex((x) => x.id === ch.relic); if (i >= 0) { run.relics.splice(i, 1); run.addRelic(ch.ancientRelic); } } });
  R.EMBER_CORE = { id: 'EMBER_CORE', rarity: 'Starter', pool: 'oathburner', name: 'Ember Core', text: 'At the end of combat, heal 12 HP.', afterCombat: (run) => run.heal(12) };

  // Pael (Act 2)
  relic('PAEL', 'OLD_BLOOD', { name: 'Old Blood', text: 'At the start of your turn, draw 1 additional card.', turnStart: async (g) => { g.extraDrawThisTurn += 1; } });
  relic('PAEL', 'OLD_CLAW', { name: 'Old Claw', text: 'On pickup, Enchant all Braces with Goopy.', onPickup: (run) => { for (const c of run.deck.filter((x) => HD.ENCH.GOOPY.fits(CARDS[x.id]) && !x.ench)) run.enchant(c, 'GOOPY', 0); } });
  relic('PAEL', 'OLD_EYE', { name: 'Old Eye', text: 'The first time each combat you end your turn without playing cards, Burn your hand and take an extra turn.' });
  relic('PAEL', 'OLD_FLESH', { name: 'Old Flesh', text: 'Gain 1 additional Energy at the start of your 3rd turn, and every turn after that.',
    turnStart: async (g) => { if (g.turn >= 3) g.gainEnergy(1); } });
  relic('PAEL', 'OLD_GROWTH', { name: 'Old Growth', text: 'On pickup, Enchant a card with Clone.', onPickup: (run) => run.pending.push({ kind: 'enchant', id: 'CLONE' }) });
  relic('PAEL', 'OLD_HORN', { name: 'Old Horn', text: 'On pickup, add 2 Unwind to your deck.', onPickup: (run) => { run.addCard('UNWIND'); run.addCard('UNWIND'); } });
  relic('PAEL', 'OLD_LEGION', { name: 'Old Legion', text: 'Doubles the Guard gained from a card, then sleeps for 2 turns.', battleStart: async (g, r) => { r.sleep = 0; },
    turnStart: async (g, r) => { if (r.sleep > 0) r.sleep--; } });
  relic('PAEL', 'OLD_TEARS', { name: 'Old Tears', text: 'If you end your turn with at least 1 unspent Energy, gain 2 additional Energy next turn.' });
  relic('PAEL', 'OLD_FANG', { name: 'Old Fang', text: 'On pickup, remove 5 cards from your deck. After each combat, add 1 of them back at random, Upgraded.',
    onPickup: (run, r) => { r.stash = []; for (let i = 0; i < 5; i++) run.pending.push({ kind: 'remove', stashTo: 'OLD_FANG' }); },
    afterCombat: (run, r) => { if (r.stash && r.stash.length) { const id = r.stash.splice(run.rng.misc.int(r.stash.length), 1)[0]; run.addCard(id, true); } } });
  relic('PAEL', 'OLD_WING', { name: 'Old Wing', text: 'You may sacrifice card rewards. Every 2 sacrifices, obtain a Relic.' });

  // Tezcatara (Act 2)
  relic('TEZCATARA', 'BIG_HUG', { name: 'Big Hug', text: 'On pickup, remove 4 cards from your deck. Whenever you shuffle your draw pile, add an Ashfall to it.',
    onPickup: (run) => { for (let i = 0; i < 4; i++) run.pending.push({ kind: 'remove' }); },
    onShuffle: async (g) => { g.draw.splice(g.rng.int(g.draw.length + 1), 0, g.makeCard('ASHFALL', false)); } });
  relic('TEZCATARA', 'WARM_SOUP', { name: 'Warm Soup', text: 'On pickup, Enchant all Cut cards in your deck with Old Ember.',
    onPickup: (run) => { for (const c of run.deck.filter((x) => CARDS[x.id].tags.includes('Cut') && !x.ench)) run.enchant(c, 'TEZCATARAS_EMBER', 0); } });
  relic('TEZCATARA', 'GOURD_CANDLE', { name: 'Gourd Candle', text: 'Gain 1 Energy at the start of each turn. Goes out after 5 combats. Can be Kindled at Rest Sites.',
    onPickup: (run, r) => { r.charges = 5; },
    battleStart: async (g, r) => { if (r.charges > 0) g.maxEnergy += 1; }, afterCombat: (run, r) => { if (r.charges > 0) { r.charges--; if (!r.charges) r.used = true; } } });
  relic('TEZCATARA', 'GOLD_SEAL', { name: 'Gold Seal', text: 'At the start of your turn, spend 5 Gold to gain 1 Energy.',
    turnStart: async (g) => { if (g.run.gold >= 5) { g.run.gold -= 5; g.gainEnergy(1); } } });
  relic('TEZCATARA', 'TALE_BOOK', { name: 'Tale Book', text: 'On pickup, add 1 White Flame to your deck.', onPickup: (run) => run.addCard('WHITE_FLAME') });
  relic('TEZCATARA', 'WARM_MITTENS', { name: 'Warm Mittens', text: 'At the start of your turn, Burn the top card of your draw pile and gain 1 Might.',
    turnStart: async (g) => { const c = await g.takeTopOfDraw(); if (c) await g.burn(c); g.addPw(g.p, 'might', 1); } });
  relic('TEZCATARA', 'TOY_CHEST', { name: 'Toy Chest', text: 'On pickup, obtain 4 Wax relics. Every 3 combats, your left-most Wax relic melts away.',
    waxCount: 4, onPickup: (run, r) => { r.counter = 0; for (let i = 0; i < (R.TOY_CHEST.waxCount || 4); i++) { const id = run.rollRelic(); if (id) { run.addRelic(id); run.relic(id).wax = true; } } },
    afterCombat: (run, r) => { r.counter = (r.counter || 0) + 1; if (r.counter >= 3) { r.counter = 0; const w = run.relics.find((x) => x.wax); if (w) run.relics.splice(run.relics.indexOf(w), 1); } } });
  relic('TEZCATARA', 'HOT_COCOA', { name: 'Hot Cocoa', text: 'Start each combat with 4 additional Energy.', firstHand: async (g) => g.gainEnergy(4) });
  relic('TEZCATARA', 'SWEET_BISCUIT', { name: 'Sweet Biscuit', text: 'On pickup, Upgrade 4 cards.', onPickup: (run) => { for (let i = 0; i < 4; i++) run.pending.push({ kind: 'upgrade' }); } });

  // Nonupeipe (Act 3)
  relic('NONUPEIPE', 'LOVELY_BRACELET', { name: 'Lovely Bracelet', text: 'On pickup, choose 3 cards in your deck. Enchant them with Swift 3.',
    onPickup: (run) => { for (let i = 0; i < 3; i++) run.pending.push({ kind: 'enchant', id: 'SWIFT', n: 3 }); } });
  relic('NONUPEIPE', 'HOLY_ANTLER', { name: 'Holy Antler', text: 'Gain 1 Energy at the start of each turn. At the start of each combat, shuffle 3 Reeling into your draw pile.',
    battleStart: async (g) => { g.maxEnergy += 1; g.addStatus({ id: 'REELING', n: 3, to: 'draw' }); } });
  relic('NONUPEIPE', 'BRIGHT_SCARF', { name: 'Bright Scarf', text: 'The 5th card you play from your hand each turn is free.' });
  relic('NONUPEIPE', 'SOFT_FROND', { name: 'Soft Frond', text: 'At the start of each combat, fill all empty potion slots with random potions.',
    battleStart: async (g) => { while (g.run.freeSlot() >= 0 && g.run.addPotion(g.run.randomPotion())); } });
  relic('NONUPEIPE', 'DIAMOND_CROWN', { name: 'Diamond Crown', halve: true, text: 'Whenever you play 2 or fewer cards in a turn, take half damage from enemies.' });
  relic('NONUPEIPE', 'THICK_PELT', { name: 'Thick Pelt', text: 'On pickup, mark 7 random combats. Enemies in those rooms have 1 HP.',
    onPickup: (run) => {
      const rows = run.pos && run.pos !== 'BOSS' ? run.map.nodes[run.pos].r : -1;
      const xs = Object.entries(run.map.nodes).filter(([, n]) => n.r > rows && (n.type === 'monster' || n.type === 'elite')).map(([k]) => k);
      run.marked = run.rng.misc.shuffle(xs).slice(0, R.THICK_PELT.marks || 7);
    } });
  relic('NONUPEIPE', 'GLITTER', { name: 'Glitter', text: 'Enchant all card rewards with Glam.' });
  relic('NONUPEIPE', 'JEWEL_BOX', { name: 'Jewel Box', text: 'On pickup, add 1 Apex to your deck.', onPickup: (run) => run.addCard('APEX') });
  relic('NONUPEIPE', 'HANGING_FRUIT', { name: 'Hanging Fruit', text: 'On pickup, raise your Max HP by 31.', onPickup: (run) => run.gainMaxHp(31) });
  relic('NONUPEIPE', 'SEAL_RING', { name: 'Seal Ring', text: 'On pickup, gain 999 Gold.', onPickup: (run) => run.gainGold(999) });

  // Tanx (Act 3)
  relic('TANX', 'TALONS', { name: 'Talons', text: 'On pickup, Transform up to 6 cards into Mauling.',
    onPickup: (run) => { for (let i = 0; i < 6; i++) run.pending.push({ kind: 'carveAny', into: 'MAULING', optional: true }); } });
  relic('TANX', 'HAND_BOW', { name: 'Hand Bow', text: 'At the start of your turn, add a random Attack to your hand. It is free to play this turn.',
    turnStart: async (g) => { const c = g.makeCard(g.randomPoolCard((d) => d.type === 'Attack'), false); c.freeTurn = true; g.addToHand(c); } });
  relic('TANX', 'IRON_CUDGEL', { name: 'Iron Cudgel', text: 'Every 4 cards you play, draw 1 card.',
    afterPlay: async (g, r) => { r.counter = (r.counter || 0) + 1; if (r.counter >= 4) { r.counter = 0; await g.drawCards(1); } } });
  relic('TANX', 'BUTCHER_KNIFE', { name: 'Butcher Knife', text: 'You may Cook at Rest Sites.' });
  relic('TANX', 'TWIN_PRONGS', { name: 'Twin Prongs', text: 'At the start of your turn, gain 7 Guard.', turnStart: async (g) => g.gainBlock(7, false) });
  relic('TANX', 'SPIKED_GLOVES', { name: 'Spiked Gloves', text: 'Gain 1 Energy at the start of each turn. Powers cost 1 more Energy.', battleStart: energy });
  relic('TANX', 'HUNT_WHISTLE', { name: 'Hunt Whistle', text: 'On pickup, add 1 Beast Call to your deck.', onPickup: (run) => run.addCard('BEAST_CALL') });
  relic('TANX', 'HURLING_AXE', { name: 'Hurling Axe', text: 'The first card you play each combat is played an extra time.' });
  relic('TANX', 'TRIPLE_BOOMERANG', { name: 'Triple Boomerang', text: 'Choose 3 Attacks in your deck. Enchant them with Instinct.',
    onPickup: (run) => { for (let i = 0; i < 3; i++) run.pending.push({ kind: 'enchant', id: 'INSTINCT', filter: 'Attack' }); } });
  relic('TANX', 'SIEGE_HAMMER', { name: 'Siege Hammer', text: 'Whenever you kill an Elite, Upgrade 4 random cards.', afterCombat: (run, r, kind) => { if (kind === 'elite') upgradeRandom(run, 4); } });

  // Vakuu (Act 3)
  relic('VAKUU', 'BLOODY_ROSE', { name: 'Bloody Rose', text: 'On pickup, add 1 Spellbound to your deck. Gain 1 Energy at the start of each turn.',
    onPickup: (run) => run.addCard('SPELLBOUND'), battleStart: energy });
  relic('VAKUU', 'CHOICE_RIDDLE', { name: 'Choice Riddle', text: 'At the start of each combat, add 1 of 5 random cards to your hand. It gains Retain.',
    firstHand: async (g) => {
      const opts = g.rng.shuffle(HD.POOL(g.run.color).map((d) => d.id)).slice(0, 5).map((id) => g.makeCard(id, false));
      const [x] = await g.choose({ from: opts, n: 1, prompt: 'Choice Riddle: choose a card' });
      if (x) { x.addKw = ['Retain']; g.addToHand(x); }
    } });
  relic('VAKUU', 'FINE_CAPE', { name: 'Fine Cape', text: 'On pickup, lose 9 Max HP. Add 3 Phantasms to your deck.',
    onPickup: (run) => { run.loseMaxHp(9); for (let i = 0; i < 3; i++) run.addCard('PHANTASM'); } });
  relic('VAKUU', 'OLD_FIDDLE', { name: 'Old Fiddle', text: 'At the start of each turn, draw 2 additional cards. You cannot draw cards during your turn.',
    turnStart: async (g) => { g.extraDrawThisTurn += 2; } });
  relic('VAKUU', 'JEWEL_MASK', { name: 'Jewel Mask', text: 'At the start of each combat, put a random Power from your draw pile into your hand. It is free to play this combat.',
    firstHand: async (g) => { const xs = g.draw.filter((c) => CARDS[c.id].type === 'Power'); if (xs.length) { const c = g.rng.pick(xs); g.draw.splice(g.draw.indexOf(c), 1); c.freeCombat = true; g.addToHand(c); } } });
  relic('VAKUU', 'NOBLE_PARASOL', { name: 'Noble Parasol', text: 'When you meet the Merchant, immediately obtain EVERYTHING he sells.' });
  relic('VAKUU', 'TUNE_BOX', { name: 'Tune Box', text: 'Create a Fleeting copy of the first Attack you play each turn.',
    afterPlay: async (g, r, c, d) => { if (d.type !== 'Attack' || g.t.tuneBox) return; g.t.tuneBox = true; const x = g.makeCard(c.id, c.up); x.addKw = ['Fleeting']; g.addToHand(x); } });
  relic('VAKUU', 'KEPT_FOG', { name: 'Kept Fog', text: 'On pickup, remove 3 cards from your deck. Add Foolishness to your deck.',
    onPickup: (run) => { for (let i = 0; i < 3; i++) run.pending.push({ kind: 'remove' }); run.addCard('FOOLISHNESS'); } });
  relic('VAKUU', 'DRY_TALON', { name: 'Dry Talon', text: 'On pickup, add 2 random Curses and 3 Hopes to your deck.',
    onPickup: (run) => { for (let i = 0; i < 2; i++) run.addCard(run.rng.misc.pick(HD.RANDOM_CURSES)); for (let i = 0; i < 3; i++) run.addCard('HOPE_CARD'); } });
  relic('VAKUU', 'WHISPER_EARRING', { name: 'Whisper Earring', text: 'Gain 1 Energy at the start of each turn. The Whisperer plays your first turn for you.', battleStart: energy });

  // ---------- which Ancient meets you ----------
  const pool = (anc) => Object.values(R).filter((d) => d.ancient === anc).map((d) => d.id);
  Object.assign(HD.ANCIENTS, {
    OROBAS: { name: 'The Tidewarden', acts: [2], pool: pool('OROBAS') },
    PAEL: { name: 'The Many-Eyed', acts: [2], pool: pool('PAEL') },
    TEZCATARA: { name: 'The Hearthmother', acts: [2], pool: pool('TEZCATARA') },
    NONUPEIPE: { name: 'The Gilded Hermit', acts: [3], pool: pool('NONUPEIPE') },
    TANX: { name: 'The Huntmaster', acts: [3], pool: pool('TANX') },
    VAKUU: { name: 'The Whisperer', acts: [3], pool: pool('VAKUU') },
  });
  HD.ANCIENTS.DARV.acts = [2, 3];
  // How each Ancient introduces itself on its screen: a title under the name and a few opening lines (one is shown).
  HD.ANCIENT_VOICE = {
    ROOTMOTHER: { epithet: 'Keeper of the First Roots', lines: ['...little one.. ...the roots.. remember you...', '...wake.. ...take.. what the deep gives...', '...again.. you come.. ...again.. I mend...'] },
    DARV: { epithet: 'Keeper of Lost Things', lines: ["Everything down here was someone's once. Pick one.", 'I keep what the dark forgets. You may borrow one.', 'Mind the pile. Take one, and only one.'] },
    OROBAS: { epithet: 'Who Holds the Low Water', lines: ['The tide brings what it brings. Choose.', 'Salt and patience. One gift, then go.', 'The water has been waiting for you.'] },
    PAEL: { epithet: 'Watcher in the Wax', lines: ['We see you. We have always seen you.', 'So many eyes, and all of them on you. Choose.', 'We watched you climb down. Take what we offer.'] },
    TEZCATARA: { epithet: 'Who Keeps the Last Fire', lines: ['Sit. Warm your hands. Then take something.', 'Little ember, you look cold. One gift.', 'The fire remembers every traveler. Choose.'] },
    NONUPEIPE: { epithet: 'Who Counts the Coins Alone', lines: ['Gold, gold, gold. Touch only one.', 'Shh. Count with me. Then choose.', 'You may have one. One! Not two.'] },
    TANX: { epithet: 'Who Never Lost a Trail', lines: ['You have been hunted all the way down. Arm yourself.', 'Prey or hunter? Choose, and we will see.', 'The trail ends here, for now. Take a weapon.'] },
    VAKUU: { epithet: 'The Voice at Your Shoulder', lines: ['...closer... ...I have something for you...', '...yes... ...that one... ...or that one...', "...don't listen to the others... ...listen to me..."] },
  };
  HD.Run.prototype.ancientOffer = function () {
    // Ascension 2 (Weary Traveler): Ancients heal only 80% of your missing HP.
    this.hp = this.asc >= 2 ? this.hp + Math.floor((this.maxHp - this.hp) * 0.8) : this.maxHp;
    const ids = Object.keys(HD.ANCIENTS).filter((k) => (HD.ANCIENTS[k].acts || []).includes(this.act));
    this.ancient = this.rng.neow.pick(ids);
    return this.rng.neow.shuffle(HD.ANCIENTS[this.ancient].pool.filter((id) => !this.hasRelic(id))).slice(0, 3);
  };

  // ---------- run-level effects ----------
  const restOpts = HD.Run.prototype.restOptions;
  HD.Run.prototype.restOptions = function () {
    const o = restOpts.call(this);
    if (this.hasRelic('BUTCHER_KNIFE')) o.push('cook');
    const candle = this.relic('GOURD_CANDLE');
    if (candle && !candle.charges) o.push('kindle');
    return o;
  };
  const reward = HD.Run.prototype.cardReward;
  HD.Run.prototype.cardReward = function (...args) {
    const cards = reward.apply(this, args);
    if (this.hasRelic('GLITTER')) for (const c of cards) if (!c.ench && HD.ENCH.GLAM.fits(CARDS[c.id])) c.ench = { id: 'GLAM', n: 0 };
    return cards;
  };
})();

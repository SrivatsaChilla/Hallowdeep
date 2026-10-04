// Enchantments: permanent per-card modifiers that last the whole run. One per card.
// A card carries { ench: { id, n } }; the engine reads it for cost, damage, Guard, keywords, draws, shuffles and plays.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const isAtk = (d) => d.type === 'Attack';
  const isSkill = (d) => d.type === 'Skill';
  const gainsBlock = (d) => d.v && d.v.blk != null;
  const tagged = (tag) => (d) => (d.tags || []).includes(tag);
  const playable = (d) => ['Attack', 'Skill', 'Power'].includes(d.type);

  HD.ENCH = {
    ADROIT: { name: 'Adroit', extra: (n) => `Gain ${n} Guard.`,  fits: playable, text: (n) => `Gain ${n} Guard.`, after: async (g, c, t, n) => g.gainBlock(n, false) },
    CLONE: { name: 'Clone', fits: playable, text: () => 'Can be copied at Rest Sites.' },
    CORRUPTED: { name: 'Corrupted', extra: () => 'Lose 2 HP.',  fits: isAtk, text: () => 'Deals 50% more damage. Lose 2 HP.', mult: 1.5, after: async (g) => g.selfLoseHp(2) },
    GLAM: { name: 'Glam', fits: playable, text: () => 'Replays once per combat.', replay: (c) => { if (c.glamUsed) return 0; c.glamUsed = true; return 1; } },
    GOOPY: { name: 'Goopy', extra: () => "Permanently increase this card's Guard by 1.",  fits: tagged('Brace'), kwAdd: ['Burn'], text: (n) => `Burn. Gains 1 Guard for good each time it is played${n ? ` (+${n})` : ''}.`, blockAdd: (n) => n,
      after: async (g, c) => { c.ench.n++; if (c.src && c.src.ench) c.src.ench.n++; } },
    IMBUED: { name: 'Imbued', fits: isSkill, text: () => 'Played automatically at the start of each combat.' },
    // Inky: +1 damage on the stable branch; v0.111 removed the bonus damage and kept the Weak.
    INKY: { name: 'Inky', extra: () => 'Apply 1 Sapped.', fits: playable, text: () => (HD.version === 'stable' ? 'Deals 1 more damage and applies 1 Sapped.' : 'Applies 1 Sapped.'),
      dmgAdd: () => (HD.version === 'stable' ? 1 : 0),
      after: async (g, c, t) => { const e = t && t.alive ? t : null; if (e) await g.apply(e, 'sapped', 1); } },
    INSTINCT: { name: 'Instinct', fits: isAtk, text: () => 'Deals double Attack damage.', mult: 2 },
    MOMENTUM: { name: 'Momentum', extra: (n) => `Increase this card's damage by ${n} this combat.`,  fits: isAtk, text: (n) => `Deals ${n} more damage each time it is played this combat.`, dmgAdd: (n, c) => c.momentum || 0,
      after: async (g, c, t, n) => { c.momentum = (c.momentum || 0) + n; } },
    NIMBLE: { name: 'Nimble', fits: gainsBlock, text: (n) => `Gains ${n} more Guard.`, blockAdd: (n) => n },
    PERFECT_FIT: { name: 'Perfect Fit', fits: playable, text: () => 'Goes on top of your draw pile whenever it is shuffled in.' },
    ROYALLY_APPROVED: { name: 'Royally Approved', fits: (d) => isAtk(d) || isSkill(d), kwAdd: ['Opening', 'Retain'], text: () => 'Opening. Retain.' },
    SHARP: { name: 'Sharp', fits: isAtk, text: (n) => `Deals ${n} more damage.`, dmgAdd: (n) => n },
    SLITHER: { name: 'Slither', fits: (d) => playable(d) && typeof d.cost === 'number', text: () => 'Costs a random 0 to 3 when drawn.' },
    SLUMBERING_ESSENCE: { name: 'Slumbering Essence', fits: playable, text: () => 'Costs 1 less for each turn it stays in your hand, until played.' },
    SOULS_POWER: { name: "Soul's Power", fits: (d) => (d.kw || []).includes('Burn'), kwDrop: ['Burn'], text: () => 'No longer Burns.' },
    SOWN: { name: 'Sown', extra: (n) => `Gain ${n} Energy the first time this is played.`,  fits: playable, text: (n) => `The first time you play it each combat, gain ${n} Energy.`,
      after: async (g, c, t, n) => { if (!c.sownUsed) { c.sownUsed = true; g.gainEnergy(n); } } },
    SPIRAL: { name: 'Spiral', fits: (d) => d.rarity === 'Basic' && (tagged('Cut')(d) || tagged('Brace')(d)), text: () => 'Replay 1.', replay: () => 1 },
    STEADY: { name: 'Steady', fits: playable, kwAdd: ['Retain'], text: () => 'Retain.' },
    SWIFT: { name: 'Swift', extra: (n) => `Draw ${n} card${n > 1 ? 's' : ''} the first time this is played.`,  fits: playable, text: (n) => `The first time you play it each combat, draw ${n} card${n > 1 ? 's' : ''}.`,
      after: async (g, c, t, n) => { if (!c.swiftUsed) { c.swiftUsed = true; await g.drawCards(n); } } },
    TEZCATARAS_EMBER: { name: 'Old Ember', fits: playable, kwAdd: ['Eternal'], text: () => 'Costs 0. Deals 3 more damage. Eternal.', dmgAdd: () => 3, free: true },
    VIGOROUS: { name: 'Vigorous', fits: isAtk, text: (n) => `The first time it is played each combat, it deals ${n} more damage.`, dmgAdd: (n, c) => (c.vigorUsed ? 0 : n),
      after: async (g, c) => { c.vigorUsed = true; } },
  };
  // Cards in the deck that can take this enchantment (one enchantment per card).
  HD.Run.prototype.enchantable = function (id, filter) {
    const e = HD.ENCH[id];
    return this.deck.filter((c) => !c.ench && e.fits(CARDS[c.id]) && (!filter || filter(CARDS[c.id])));
  };
  HD.Run.prototype.enchant = function (c, id, n = 0) {
    if (!c || c.ench) return;
    c.ench = { id, n };
    this.note({ kind: 'enchanted', id: c.id, up: c.up, ench: { id, n } });
  };

  // ---------- relics that apply enchantments ----------
  const relic = (id, o) => { HD.RELICS[id] = Object.assign({ id, rarity: 'Shop', pool: 'shared' }, o); };
  const picks = (run, k, o) => { for (let i = 0; i < k; i++) run.pending.push(Object.assign({ kind: 'enchant' }, o)); };
  relic('KNOTTED_MALLET', { name: 'Knotted Mallet', text: 'On pickup, Enchant up to 3 Attacks with Sharp 3.',
    onPickup: (run) => picks(run, 3, { id: 'SHARP', n: 3, filter: 'Attack', optional: true }) });
  relic('CHARM_TAGS', { name: 'Charm Tags', text: 'On pickup, Enchant up to 3 cards with Adroit.',
    onPickup: (run) => picks(run, 3, { id: 'ADROIT', n: 3, optional: true }) });
  relic('FIST_BLADE', { name: 'Fist Blade', text: 'On pickup, Enchant an Attack with Momentum 5.', onPickup: (run) => picks(run, 1, { id: 'MOMENTUM', n: 5, filter: 'Attack' }) });
  relic('COURT_SEAL', { name: 'Court Seal', text: 'On pickup, Enchant an Attack or Skill with Royally Approved.', onPickup: (run) => picks(run, 1, { id: 'ROYALLY_APPROVED' }) });
  relic('ODD_LIGHTER', { name: 'Odd Lighter', text: 'Enchanted Attacks deal 9 additional damage.' });
  relic('FEATHER_CHARM', { name: 'Feather Charm', text: 'A random card in each card reward is Enchanted with Swift 1.' });
  relic('SILK_LOCK', { name: 'Silk Lock', rarity: 'Ancient', pool: 'neow', bane: true, text: 'On pickup, lose all Gold. Enchant every card in your first card reward with Glam.',
    onPickup: (run) => { run.gold = 0; run.glamNext = true; } });
  HD.NEOW.banes.push('SILK_LOCK');

  // Card rewards: Feather Charm and Silk Lock enchant the cards on offer.
  const baseReward = HD.Run.prototype.cardReward;
  HD.Run.prototype.cardReward = function (...args) {
    const cards = baseReward.apply(this, args);
    if (this.glamNext) { this.glamNext = false; for (const c of cards) if (HD.ENCH.GLAM.fits(CARDS[c.id])) c.ench = { id: 'GLAM', n: 0 }; }
    if (this.hasRelic('FEATHER_CHARM')) { const xs = cards.filter((c) => !c.ench && HD.ENCH.SWIFT.fits(CARDS[c.id])); if (xs.length) this.rng.cards.pick(xs).ench = { id: 'SWIFT', n: 1 }; }
    return cards;
  };

  // ---------- events that enchant ----------
  const EV = HD.EVENTS;
  const seed = EV.BLUE_SEED.pages.INITIAL.options.find((o) => o.id === 'PLANT');
  Object.assign(seed, { desc: () => 'Enchant a card with Sown.', lock: (run) => (run.enchantable('SOWN').length ? null : 'No card can be Enchanted.'),
    go: (run) => { run.pending.push({ kind: 'enchant', id: 'SOWN', n: 1 }); return 'PLANT'; } });
  EV.BLUE_SEED.pages.PLANT = { text: 'You press the seed into a card. Something takes root there.' };
  const snake = EV.BARK_CARVINGS.pages.INITIAL.options.find((o) => o.id === 'SNAKE');
  Object.assign(snake, { desc: () => 'Enchant 1 card with Slither.', lock: (run) => (run.enchantable('SLITHER').length ? null : 'None of your cards can be Enchanted with Slither.'),
    go: (run) => { run.pending.push({ kind: 'enchant', id: 'SLITHER', n: 0 }); return 'DONE'; } });
  const book = (type, id, n) => ({ id: `${type}_${id}`, label: { Attack: 'Read the back', Skill: 'Read a passage', Power: 'Read the whole book' }[type],
    desc: () => `Choose ${type === 'Attack' ? 'an' : 'a'} ${type} to Enchant with ${HD.ENCH[id].name} ${n}.`,
    lock: (run) => (run.enchantable(id, (d) => d.type === type).length ? null : `You have no ${type}s that can be Enchanted.`),
    go: (run) => { run.pending.push({ kind: 'enchant', id, n, filter: type }); return 'DONE'; } });
  EV.SELF_HELP = { id: 'SELF_HELP', name: 'Self-Help Book', act: 'any', pages: {
    INITIAL: { text: 'A book lies open on a stump: "Become Your Best Self in Three Easy Steps." Most of the pages are stuck together.',
      options: [book('Attack', 'SHARP', 2), book('Skill', 'NIMBLE', 2), book('Power', 'SWIFT', 2),
        // In the original, Move On only appears when nothing can be enchanted.
        { id: 'MOVE_ON', label: 'Move on', desc: () => 'You have no cards that can be Enchanted.',
          lock: (run) => (['Attack', 'Skill', 'Power'].some((ty) => run.enchantable({ Attack: 'SHARP', Skill: 'NIMBLE', Power: 'SWIFT' }[ty], (d) => d.type === ty).length) ? 'You still have cards to Enchant.' : null),
          go: () => 'LEAVE' }] },
    DONE: { text: 'You skim a chapter, and one of your habits gets a little sharper.' },
    LEAVE: { text: 'Some books are best left unread.' },
  } };
})();

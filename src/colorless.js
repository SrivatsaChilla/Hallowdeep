// Colorless cards. Numbers match the reference build; names and text are HallowDeep's own.
// coop: true cards exist only for multiplayer and never appear in solo pools. noGen cards are never created mid-combat.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const card = (id, o) => { CARDS[id] = Object.assign({ id, color: 'colorless', target: 'self', v: {}, up: {}, kw: [], tags: [] }, o); };
  const classCard = (g, f) => g.makeCard(g.randomPoolCard(f), false);
  const pickFrom = async (g, pile, filter, n, prompt) => {
    const xs = pile.filter(filter);
    if (!xs.length) return [];
    return g.choose({ from: g.rng.shuffle(xs.slice()).slice(0, n || xs.length), n: 1, prompt });
  };
  HD.colorlessIds = (forCombat) => HD.POOL('colorless').filter((d) => !(forCombat && d.noGen)).map((d) => d.id);

  // ---------- Uncommon attacks ----------
  card('GRAND_ARRIVAL', { name: 'Grand Arrival', type: 'Attack', rarity: 'Uncommon', cost: 0, target: 'all', kw: ['Opening', 'Burn'], v: { dmg: 11 }, up: { dmg: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies.`, play: (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  card('BRAWL', { name: 'Brawl', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { dmg: 7 }, up: { dmg: 2 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Gain Guard equal to the damage dealt.`,
    play: async (g, c, t, v) => { const h = t.hp; await g.attack(t, v.dmg, 1, c); const dealt = Math.max(0, h - Math.max(0, t.hp)); if (dealt) await g.gainBlock(dealt, false); } });
  card('QUICK_FLASH', { name: 'Quick Flash', type: 'Attack', rarity: 'Uncommon', cost: 0, target: 'enemy', v: { dmg: 5, draw: 1 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw ${v.draw} card.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.drawCards(v.draw); } });
  card('THOUGHT_LANCE', { name: 'Thought Lance', type: 'Attack', rarity: 'Uncommon', cost: 1, upCost: 0, target: 'enemy', kw: ['Opening'],
    text: (v, f, c, g) => `Deal damage equal to the number of cards in your draw pile.${g && g.phase !== 'start' ? ` (${f.d(g.draw.length)})` : ''}`,
    play: (g, c, t) => g.attack(t, g.draw.length, 1, c) });
  card('SWEEPING_EDGE', { name: 'Sweeping Edge', type: 'Attack', rarity: 'Uncommon', cost: 0, target: 'enemy', v: { dmg: 8 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Deal the same damage to ALL other enemies.`,
    play: async (g, c, t, v) => {
      const h = t.hp; await g.attack(t, v.dmg, 1, c); const dealt = Math.max(0, h - Math.max(0, t.hp));
      if (dealt) for (const e of g.alive()) if (e !== t) await g.damage(e, dealt, {});
    } });
  card('SEEKING_CUT', { name: 'Seeking Cut', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', tags: ['Cut'], v: { dmg: 9, draw: 3 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Choose 1 of ${v.draw} cards in your draw pile to put into your hand.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 1, c); if (g.over) return;
      const [x] = await pickFrom(g, g.draw, () => true, v.draw, 'Choose a card to put into your hand');
      if (x) { g.draw.splice(g.draw.indexOf(x), 1); g.addToHand(x); }
    } });
  card('HUMMING_HATCHET', { name: 'Humming Hatchet', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { dmg: 11 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. At the start of your next turn, return this to your hand.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); c.returnNext = true; } });
  card('FINAL_CUT', { name: 'Final Cut', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', tags: ['Cut'], v: { dmg: 14 }, up: { dmg: 6 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('ARROW_STORM', { name: 'Arrow Storm', type: 'Attack', rarity: 'Uncommon', cost: 'X', target: 'self', v: { dmg: 10 }, up: { dmg: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to a random enemy X times.`,
    play: async (g, c, t, v, x) => { for (let i = 0; i < x; i++) { const e = g.randomEnemy(); if (!e || g.over) break; await g.attack(e, v.dmg, 1, c); } } });

  // ---------- Uncommon powers ----------
  const power = (id, o) => card(id, Object.assign({ type: 'Power', rarity: 'Uncommon' }, o));
  power('CLOCKWORK_RHYTHM', { name: 'Clockwork Rhythm', cost: 1, upCost: 0, v: { en: 1 }, text: (v) => `Every 10 cards you draw, gain ${v.en} Energy.`, play: async (g, c, t, v) => g.addPw(g.p, 'automation', v.en) });
  power('STRAP_DOWN', { name: 'Strap Down', cost: 1, tags: ['Brace'], v: { extra: 4 }, up: { extra: 2 }, text: (v) => `Brace cards give ${v.extra} additional Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'fasten', v.extra) });
  power('FLOURISH', { name: 'Flourish', cost: 0, v: { dmg: 10 }, up: { dmg: 4 }, text: (v) => `Every time you play 5 cards in a single turn, deal ${v.dmg} damage to ALL enemies.`, play: async (g, c, t, v) => g.addPw(g.p, 'panache', v.dmg) });
  power('WARM_UP', { name: 'Warm Up', cost: 1, v: { vig: 4 }, up: { vig: 2 }, text: (v) => `At the start of your turn, gain ${v.vig} Vigor.`, play: async (g, c, t, v) => g.addPw(g.p, 'prepTime', v.vig) });
  power('KNACK', { name: 'Knack', cost: 1, v: { str: 1, dex: 1 }, up: { str: 1, dex: 1 }, text: (v) => `Gain ${v.str} Might. Gain ${v.dex} Poise.`, play: async (g, c, t, v) => { g.addPw(g.p, 'might', v.str); g.addPw(g.p, 'poise', v.dex); } });
  power('SCHEME', { name: 'Scheme', cost: 1, upCost: 0, text: () => 'Whenever you shuffle your draw pile, choose a card from it to put into your hand.', play: async (g) => g.addPw(g.p, 'stratagem', 1) });

  // ---------- Uncommon skills ----------
  const skill = (id, o) => card(id, Object.assign({ type: 'Skill', rarity: 'Uncommon' }, o));
  skill('UPHEAVAL', { name: 'Upheaval', cost: 2, v: { draw: 2 }, up: { draw: 1 }, text: (v) => `Play ${v.draw} random cards from your draw pile.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.draw && g.draw.length && !g.over; i++) { const x = g.rng.pick(g.draw); g.draw.splice(g.draw.indexOf(x), 1); await g.autoPlay(x, {}); } } });
  skill('GRIM_SHACKLES', { name: 'Grim Shackles', cost: 0, target: 'enemy', kw: ['Burn'], v: { loss: 9 }, up: { loss: 6 }, text: (v) => `The enemy loses ${v.loss} Might this turn.`,
    play: (g, c, t, v) => g.apply(t, 'mightDown', v.loss) });
  skill('FIND', { name: 'Find', cost: 1, kw: ['Burn'], upKw: [], text: () => 'Choose 1 of 3 random cards to add to your hand. It is free this turn.',
    play: async (g) => {
      const ids = g.rng.shuffle(g.run.pool().map((d) => d.id)).slice(0, 3);
      const [x] = await g.choose({ from: ids.map((id) => g.makeCard(id, false)), n: 1, prompt: 'Choose a card' });
      if (x) { x.freeTurn = true; g.addToHand(x); }
    } });
  skill('STEADY_STANCE', { name: 'Steady Stance', cost: 2, v: { blk: 13 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. Retain your hand this turn.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.t.keepHand = true; } });
  skill('LIGHT_FOOTWORK', { name: 'Light Footwork', cost: 0, v: { blk: 4, draw: 1 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. Draw ${v.draw} card.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.drawCards(v.draw); } });
  skill('ITCHY_HANDS', { name: 'Itchy Hands', cost: 0, v: { draw: 2 }, up: { draw: 1 }, text: (v) => `If you have no Attacks in your hand, draw ${v.draw} cards.`,
    play: async (g, c, t, v) => { if (!g.hand.some((x) => CARDS[x.id].type === 'Attack')) await g.drawCards(v.draw); } });
  skill('ODD_JOB', { name: 'Odd Job', cost: 0, kw: ['Burn'], v: { draw: 1 }, up: { draw: 1 }, text: (v) => `Add ${v.draw} random colorless card${v.draw > 1 ? 's' : ''} to your hand.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.draw; i++) g.addToHand(g.makeCard(g.rng.pick(HD.colorlessIds(true)), false)); } });
  skill('DUCK_AND_COVER', { name: 'Duck and Cover', cost: 0, kw: ['Burn'], v: { blk: 30, turns: 2 }, up: { blk: 10 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. You cannot gain Guard from cards for ${v.turns} turns.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'noCardBlock', v.turns); } });
  skill('OUTPUT', { name: 'Output', cost: 0, kw: ['Burn'], v: { en: 2 }, up: { en: 1 }, text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) });
  skill('HOLD_THE_LINE', { name: 'Hold the Line', cost: 0, kw: ['Burn'], upKw: [], text: () => 'Next turn, gain Guard equal to your current Guard.',
    play: async (g) => { if (g.p.block) g.addPw(g.p, 'nextBlock', g.p.block); } });
  skill('CLEANSE', { name: 'Cleanse', cost: 0, kw: ['Burn', 'Retain'], v: { draw: 3 }, up: { draw: 2 }, text: (v) => `Burn up to ${v.draw} cards in your hand.`,
    play: async (g, c, t, v) => {
      if (!g.hand.length) return;
      const xs = await g.choose({ from: g.hand.slice(), n: Math.min(v.draw, g.hand.length), min: 0, prompt: `Burn up to ${v.draw} cards` });
      for (const x of xs) { g.hand.splice(g.hand.indexOf(x), 1); await g.burn(x); }
    } });
  skill('FIDGET', { name: 'Fidget', cost: 0, kw: ['Retain'], v: { draw: 2, en: 2 }, up: { draw: 1, en: 1 }, text: (v) => `If your hand is empty, draw ${v.draw} cards and gain ${v.en} Energy.`,
    play: async (g, c, t, v) => { if (!g.hand.length) { await g.drawCards(v.draw); g.gainEnergy(v.en); } } });
  skill('CONCUSSION', { name: 'Concussion', cost: 2, target: 'all', kw: ['Burn'], v: { amt: 3 }, up: { amt: 2 }, text: (v) => `Apply ${v.amt} Sapped and ${v.amt} Exposed to ALL enemies.`,
    play: async (g, c, t, v) => { for (const e of g.alive()) { await g.apply(e, 'sapped', v.amt); await g.apply(e, 'exposed', v.amt); } } });
  skill('FUSE_BOMB', { name: 'Fuse Bomb', cost: 2, v: { turns: 3, dmg: 40 }, up: { dmg: 10 }, text: (v) => `At the end of ${v.turns} turns, deal ${v.dmg} damage to ALL enemies.`,
    play: async (g, c, t, v) => { g.p.bombs = (g.p.bombs || []).concat([{ turns: v.turns, dmg: v.dmg }]); } });
  skill('PLAN_AHEAD', { name: 'Plan Ahead', cost: 0, kw: ['Burn'], upKw: [], v: { draw: 2 }, text: (v) => `Draw ${v.draw} cards. Put a card from your hand on top of your draw pile.`,
    play: async (g, c, t, v) => {
      await g.drawCards(v.draw); if (!g.hand.length) return;
      const [x] = await g.choose({ from: g.hand.slice(), n: 1, prompt: 'Put a card on top of your draw pile' });
      if (x) { g.hand.splice(g.hand.indexOf(x), 1); g.draw.push(x); }
    } });
  skill('FINAL_BRACE', { name: 'Final Brace', cost: 1, tags: ['Brace'], v: { blk: 11 }, up: { blk: 4 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });

  // ---------- Rare attacks ----------
  card('WEIGHTED_CORD', { name: 'Weighted Cord', type: 'Attack', rarity: 'Rare', cost: 0, target: 'enemy', v: { dmg: 3 }, up: { dmg: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. At the start of your next turn, return this to your hand.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); c.returnNext = true; } });
  card('GILDED_AXE', { name: 'Gilded Axe', type: 'Attack', rarity: 'Rare', cost: 1, target: 'enemy', upKw: ['Retain'],
    text: (v, f, c, g) => `Deal damage equal to the number of cards played this combat.${g && g.phase !== 'start' ? ` (${f.d(g.playedCombat || 0)})` : ''}`,
    play: (g, c, t) => g.attack(t, g.playedCombat || 0, 1, c) });
  card('GRASPING_HAND', { name: 'Grasping Hand', type: 'Attack', rarity: 'Rare', cost: 2, target: 'enemy', noGen: true, v: { dmg: 20, gold: 20 }, up: { dmg: 5, gold: 5 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Fatal: gain ${v.gold} Gold.`,
    play: async (g, c, t, v) => { const r = await g.attack(t, v.dmg, 1, c); if (r.fatal) { const n = g.run.gainGold(v.gold); if (n) g.say(`You gain ${n} Gold.`); } } });
  card('WINDFALL', { name: 'Windfall', type: 'Attack', rarity: 'Rare', cost: 3, target: 'enemy', v: { dmg: 25, draw: 3 }, up: { dmg: 5 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Add ${v.draw} random cards that cost 0 to your hand.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); for (let i = 0; i < v.draw; i++) g.addToHand(classCard(g, (d) => d.cost === 0)); } });
  card('TEAR_OPEN', { name: 'Tear Open', type: 'Attack', rarity: 'Rare', cost: 2, target: 'enemy', v: { base: 15, per: 5 }, up: { base: 3, per: 3 },
    text: (v, f) => `Deal ${f.d(v.base)} damage, plus ${v.per} for each different debuff on the enemy.`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * Object.keys(t.pw).filter((k) => HD.DEBUFFS.has(k) && t.pw[k] > 0).length, 1, c) });
  card('BARRAGE', { name: 'Barrage', type: 'Attack', rarity: 'Rare', cost: 1, target: 'enemy', v: { dmg: 12 }, up: { dmg: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Retain your hand this turn.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.t.keepHand = true; } });

  // ---------- Rare powers ----------
  const rarePower = (id, o) => card(id, Object.assign({ type: 'Power', rarity: 'Rare' }, o));
  rarePower('CHAOS_ENGINE', { name: 'Chaos Engine', cost: 3, upCost: 2, text: () => 'Whenever you play an Attack, add a random Attack to your hand.', play: async (g) => g.addPw(g.p, 'calamity', 1) });
  rarePower('UNRAVEL', { name: 'Unravel', cost: 1, upKw: ['Opening'], v: { n: 1 }, text: (v) => `At the start of your turn, Transform ${v.n} card in your hand.`, play: async (g, c, t, v) => g.addPw(g.p, 'entropy', v.n) });
  rarePower('AGELESS_MAIL', { name: 'Ageless Mail', cost: 3, v: { plate: 9 }, up: { plate: 3 }, text: (v) => `Gain ${v.plate} Plate.`, play: async (g, c, t, v) => g.addPw(g.p, 'plate', v.plate) });
  rarePower('FRENZIED_HANDS', { name: 'Frenzied Hands', cost: 2, upCost: 1, text: () => 'At the start of your turn, play the top card of your draw pile.', play: async (g) => g.addPw(g.p, 'mayhem', 1) });
  rarePower('OLD_HABITS', { name: 'Old Habits', cost: 1, upCost: 0, text: () => 'The first Attack or Skill you play each turn goes on top of your draw pile.', play: async (g) => g.addPw(g.p, 'nostalgia', 1) });
  rarePower('LANDSLIDE', { name: 'Landslide', cost: 3, v: { dmg: 5, inc: 5 }, up: { dmg: 5 }, text: (v) => `At the start of your turn, deal ${v.dmg} damage to ALL enemies, then raise this damage by ${v.inc}.`,
    play: async (g, c, t, v) => { g.p.boulderPlays = (g.p.boulderPlays || 0) + 1; g.addPw(g.p, 'boulder', v.dmg); } });

  // ---------- Rare skills ----------
  const rareSkill = (id, o) => card(id, Object.assign({ type: 'Skill', rarity: 'Rare' }, o));
  rareSkill('BREW_UP', { name: 'Brew Up', cost: 1, upCost: 0, kw: ['Burn'], noGen: true, text: () => 'Procure a random potion.', play: async (g) => { g.run.addPotion(g.run.randomPotion()); } });
  rareSkill('CHOSEN_FEW', { name: 'Chosen Few', cost: 1, kw: ['Burn'], upKw: ['Burn', 'Retain'], text: () => 'Put every Rare card from your draw pile into your hand.',
    play: async (g) => { for (const x of g.draw.filter((y) => CARDS[y.id].rarity === 'Rare')) { if (g.hand.length >= 10) break; const i = g.draw.indexOf(x); if (i < 0) continue; g.draw.splice(i, 1); g.addToHand(x); } } });
  rareSkill('PUMMEL_SPREE', { name: 'Pummel Spree', cost: 3, v: { draw: 3 }, up: { draw: 1 }, text: (v) => `Play ${v.draw} random Attacks from your discard pile.`,
    play: async (g, c, t, v) => {
      const picks = g.rng.shuffle(g.discard.filter((y) => CARDS[y.id].type === 'Attack')).slice(0, v.draw);
      for (const x of picks) {
        if (g.over) break;
        const i = g.discard.indexOf(x); if (i < 0) continue; // an earlier play may have reshuffled it away
        g.discard.splice(i, 1); await g.autoPlay(x, {});
      }
    } });
  rareSkill('BURIED_GEM', { name: 'Buried Gem', cost: 1, noGen: true, v: { replay: 2 }, up: { replay: 1 }, text: (v) => `A random card without Replay in your draw pile gains Replay ${v.replay}.`,
    play: async (g, c, t, v) => { const xs = g.draw.filter((y) => !y.replay); if (xs.length) g.rng.pick(xs).replay = v.replay; } });
  rareSkill('GRAND_PLAN', { name: 'Grand Plan', cost: 0, kw: ['Burn'], v: { draw: 3 }, up: { draw: 1 }, text: (v) => `Draw ${v.draw} cards.`, play: (g, c, t, v) => g.drawCards(v.draw) });
  rareSkill('FRANTIC_NOTES', { name: 'Frantic Notes', cost: 1, kw: ['Burn'], upKw: ['Burn', 'Retain'], text: () => 'Draw cards until your hand is full.',
    play: async (g) => { while (g.hand.length < 10) { const x = await g.drawOne(); if (!x) break; } } });
  rareSkill('HIDDEN_FORM', { name: 'Hidden Form', cost: 0, kw: ['Burn'], upKw: [], text: () => 'Put a Skill from your draw pile into your hand.',
    play: async (g) => { const [x] = await pickFrom(g, g.draw, (y) => CARDS[y.id].type === 'Skill', 0, 'Choose a Skill'); if (x) { g.draw.splice(g.draw.indexOf(x), 1); g.addToHand(x); } } });
  rareSkill('HIDDEN_BLADE', { name: 'Hidden Blade', cost: 0, kw: ['Burn'], upKw: [], text: () => 'Put an Attack from your draw pile into your hand.',
    play: async (g) => { const [x] = await pickFrom(g, g.draw, (y) => CARDS[y.id].type === 'Attack', 0, 'Choose an Attack'); if (x) { g.draw.splice(g.draw.indexOf(x), 1); g.addToHand(x); } } });
  rareSkill('ALL_IN', { name: 'All In', cost: 0, v: { blk: 50 }, up: { blk: 25 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. If an Attack gets through your Guard this combat, you die.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.p.pw.gambit = 1; } });

  // ---------- co-op only ----------
  const coop = (id, name, type, rarity, cost, target) => card(id, { name, type, rarity, cost, target, coop: true, text: () => 'Co-op only.', play: async () => {} });
  coop('HOPE_BEACON', 'Hope Beacon', 'Power', 'Rare', 1, 'self'); coop('OWN_BELIEF', 'Belief', 'Skill', 'Uncommon', 0, 'self');
  coop('COORDINATED', 'Coordinate Strike', 'Skill', 'Uncommon', 1, 'self'); coop('PILE_ON', 'Pile On', 'Attack', 'Uncommon', 1, 'enemy');
  coop('HUDDLE', 'Huddle', 'Skill', 'Uncommon', 1, 'self'); coop('TAKE_THE_BLOW', 'Take the Blow', 'Skill', 'Uncommon', 1, 'self');
  coop('KNOCK_OVER', 'Knock Over', 'Attack', 'Rare', 3, 'enemy'); coop('BOOST', 'Boost', 'Skill', 'Uncommon', 1, 'self');
  coop('COPYCAT', 'Copycat', 'Skill', 'Rare', 1, 'self'); coop('RALLY_CRY', 'Rally Cry', 'Skill', 'Rare', 2, 'self'); coop('DOUBLE_TEAM', 'Double Team', 'Attack', 'Uncommon', 2, 'enemy');

  // ---------- potion and relics that hand out colorless cards ----------
  const colorlessReward = (run, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const rar = run.rng.cards.next() < 0.03 ? 'Rare' : 'Uncommon';
      const pool = run.pool('colorless').filter((d) => d.rarity === rar && !out.some((c) => c.id === d.id));
      out.push({ id: run.rng.cards.pick(pool).id, up: false });
    }
    return out;
  };
  HD.colorlessReward = colorlessReward;
  HD.POTIONS.GREY_TINCTURE = { id: 'GREY_TINCTURE', name: 'Grey Tincture', rarity: 'Common', target: 'self', pool: 'shared',
    text: 'Choose 1 of 3 random colorless cards to add to your hand. It is free this turn.',
    use: async (g) => {
      const opts = g.rng.shuffle(HD.colorlessIds(true)).slice(0, 3).map((id) => g.makeCard(id, false));
      const [x] = await g.choose({ from: opts, n: 1, prompt: 'Choose a colorless card' });
      if (x) { x.freeTurn = true; g.addToHand(x); }
    } };
  const relic = (id, o) => { HD.RELICS[id] = Object.assign({ id, pool: 'shared' }, o); };
  relic('TOOL_KIT', { rarity: 'Shop', name: 'Tool Kit', text: 'At the start of each combat, choose 1 of 3 random colorless cards and add it to your hand.',
    firstHand: async (g) => {
      const opts = g.rng.shuffle(HD.colorlessIds(true)).slice(0, 3).map((id) => g.makeCard(id, false));
      const [x] = await g.choose({ from: opts, n: 1, prompt: 'Tool Kit: choose a colorless card' });
      if (x) g.addToHand(x);
    } });
  relic('WORN_RUG', { rarity: 'Shop', name: 'Worn Rug', text: 'Card rewards can now contain colorless cards.' });
  relic('LEAD_WEIGHT', { rarity: 'Ancient', pool: 'neow', name: 'Lead Weight', text: 'On pickup, choose 1 of 2 colorless cards to add to your deck.',
    onPickup: (run) => { run.pending.push({ kind: 'cards', cards: colorlessReward(run, 2) }); } });
  HD.NEOW.boons.push('LEAD_WEIGHT');
})();

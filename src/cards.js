// Oathburner card pool (numbers match the reference build 1:1), plus status and token cards.
(function () {
  const HD = globalThis.HD;
  const CARDS = (HD.CARDS = {});
  const card = (id, o) => {
    CARDS[id] = Object.assign({ id, color: 'oathburner', target: 'self', v: {}, up: {}, kw: [], tags: [] }, o);
  };
  const s = (n, one, many) => (n === 1 ? one : many);

  // Resolved numbers for a card instance: base values, upgrade deltas, combat bonuses.
  HD.vals = (ci) => {
    const d = CARDS[ci.id];
    const v = Object.assign({}, d.v);
    if (ci.up) for (const k in d.up) v[k] = (v[k] || 0) + d.up[k];
    if (ci.bonus && v.dmg !== undefined) v.dmg += ci.bonus;
    if (ci.grow && v.blk !== undefined) v.blk += ci.grow; // permanent Guard growth (Genetic Algorithm)
    return v;
  };
  HD.kwOf = (ci) => {
    const d = CARDS[ci.id];
    let kw = ci.up && d.upKw ? d.upKw : d.kw;
    if (ci.addKw) kw = kw.concat(ci.addKw);
    const e = ci.ench && HD.ENCH && HD.ENCH[ci.ench.id];
    if (e && e.kwDrop) kw = kw.filter((k) => !e.kwDrop.includes(k));
    if (e && e.kwAdd) kw = kw.concat(e.kwAdd.filter((k) => !kw.includes(k)));
    return kw;
  };

  // ---------- Basic ----------
  card('CUT', { name: 'Cut', type: 'Attack', rarity: 'Basic', cost: 1, target: 'enemy', tags: ['Cut'], v: { dmg: 6 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage.`,
    play: async (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('BRACE', { name: 'Brace', type: 'Skill', rarity: 'Basic', cost: 1, tags: ['Brace'], v: { blk: 5 }, up: { blk: 3 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard.`,
    play: async (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('CRACK', { name: 'Crack', type: 'Attack', rarity: 'Basic', cost: 2, target: 'enemy', v: { dmg: 8, vul: 2 }, up: { dmg: 2, vul: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.vul} Exposed.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.apply(t, 'exposed', v.vul); } });

  // ---------- Common ----------
  card('WILDFIRE', { name: 'Wildfire', type: 'Attack', rarity: 'Common', cost: 0, target: 'enemy', v: { dmg: 6 }, up: { dmg: 2 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Put a copy of this card in your discard pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.discard.push(g.makeCard(c.id, c.up)); } });
  card('TEMPER_STEEL', { name: 'Temper Steel', type: 'Skill', rarity: 'Common', cost: 1, v: { blk: 5 },
    text: (v, f, c) => `Gain ${f.b(v.blk)} Guard. Upgrade ${c && c.up ? 'ALL cards' : 'a card'} in your hand.`,
    play: async (g, c, t, v) => {
      await g.gainBlock(v.blk, true);
      const up = g.hand.filter((x) => g.canUpgrade(x));
      if (c.up) up.forEach((x) => g.upgradeInCombat(x));
      else if (up.length) { const [x] = await g.choose({ from: up, n: 1, prompt: 'Upgrade a card' }); if (x) g.upgradeInCombat(x); }
    } });
  card('BLOOD_BULWARK', { name: 'Blood Bulwark', type: 'Skill', rarity: 'Common', cost: 2, v: { hp: 2, blk: 16 }, up: { blk: 4 },
    text: (v, f) => `Lose ${v.hp} HP. Gain ${f.b(v.blk)} Guard.`,
    play: async (g, c, t, v) => { await g.selfLoseHp(v.hp); await g.gainBlock(v.blk, true); } });
  card('OPEN_VEIN', { name: 'Open Vein', type: 'Skill', rarity: 'Common', cost: 0, v: { hp: 3, en: 2 }, up: { en: 1 },
    text: (v) => `Lose ${v.hp} HP. Gain ${v.en} Energy.`,
    play: async (g, c, t, v) => { await g.selfLoseHp(v.hp); g.gainEnergy(v.en); } });
  card('SHIELD_RUSH', { name: 'Shield Rush', type: 'Attack', rarity: 'Common', cost: 1, upCost: 0, target: 'enemy',
    text: (v, f, c, g) => `Deal damage equal to your Guard.${g ? ` (${g.p.block})` : ''}`,
    play: async (g, c, t) => g.attack(t, g.p.block, 1, c) });
  card('BULL_CHARGE', { name: 'Bull Charge', type: 'Attack', rarity: 'Common', cost: 1, target: 'all', v: { dmg: 9, hp: 1 }, up: { dmg: 4 },
    text: (v, f) => `Lose ${v.hp} HP. Deal ${f.d(v.dmg)} damage to ALL enemies.`,
    play: async (g, c, t, v) => { await g.selfLoseHp(v.hp); await g.attackAll(v.dmg, 1, c); } });
  card('COAL_SWING', { name: 'Coal Swing', type: 'Attack', rarity: 'Common', cost: 2, target: 'enemy', v: { dmg: 18 }, up: { dmg: 6 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Burn 1 random card in your hand.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.burnRandomFromHand(1); } });
  card('RECKLESS_DRAW', { name: 'Reckless Draw', type: 'Skill', rarity: 'Common', cost: 1, upCost: 0,
    text: () => 'Play the top card of your draw pile and Burn it.',
    play: async (g) => { const x = await g.takeTopOfDraw(); if (x) await g.autoPlay(x, { burn: true }); } });
  card('BROW_SMASH', { name: 'Brow Smash', type: 'Attack', rarity: 'Common', cost: 1, target: 'enemy', v: { dmg: 9 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Put a card from your discard pile on top of your draw pile.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 1, c);
      if (g.discard.length) { const [x] = await g.choose({ from: g.discard.slice(), n: 1, prompt: 'Put a card on top of your draw pile' }); if (x) { g.discard.splice(g.discard.indexOf(x), 1); g.draw.push(x); } }
    } });
  card('GUARDED_SWING', { name: 'Guarded Swing', type: 'Attack', rarity: 'Common', cost: 1, target: 'enemy', v: { dmg: 5, blk: 5 }, up: { dmg: 2, blk: 2 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Deal ${f.d(v.dmg)} damage.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.attack(t, v.dmg, 1, c); } });
  card('SLAG_FIST', { name: 'Slag Fist', type: 'Attack', rarity: 'Common', cost: 1, target: 'enemy', kw: ['Burn'], v: { dmg: 10 }, up: { dmg: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Double the target's Exposed.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive && t.pw.exposed) await g.apply(t, 'exposed', t.pw.exposed); } });
  card('HONED_CUT', { name: 'Honed Cut', type: 'Attack', rarity: 'Common', cost: 2, target: 'enemy', tags: ['Cut'], v: { dmg: 6, per: 2 }, up: { per: 1 },
    text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage, plus ${v.per} for each Cut card you own.${g ? ` (${g.countCuts()})` : ''}`,
    play: async (g, c, t, v) => g.attack(t, v.dmg + v.per * g.countCuts(), 1, c) });
  card('HILT_CUT', { name: 'Hilt Cut', type: 'Attack', rarity: 'Common', cost: 1, target: 'enemy', tags: ['Cut'], v: { dmg: 9, draw: 1 }, up: { dmg: 1, draw: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw ${v.draw} ${s(v.draw, 'card', 'cards')}.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.drawCards(v.draw); } });
  card('FEINT_CUT', { name: 'Feint Cut', type: 'Attack', rarity: 'Common', cost: 1, target: 'enemy', tags: ['Cut'], v: { dmg: 7, str: 2 }, up: { dmg: 2, str: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Gain ${v.str} Might this turn.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'mightTemp', v.str); } });
  card('GRIT_TEETH', { name: 'Grit Teeth', type: 'Skill', rarity: 'Common', cost: 1, v: { blk: 8, draw: 1 }, up: { blk: 3 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Draw ${v.draw} card.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.drawCards(v.draw); } });
  card('RICOCHET_BLADE', { name: 'Ricochet Blade', type: 'Attack', rarity: 'Common', cost: 1, target: 'random', v: { dmg: 3, hits: 3 }, up: { hits: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to a random enemy ${v.hits} times.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.hits; i++) { const e = g.randomEnemy(); if (!e) break; await g.attack(e, v.dmg, 1, c); } } });
  card('GROUND_SLAM', { name: 'Ground Slam', type: 'Attack', rarity: 'Common', cost: 1, target: 'all', v: { dmg: 4, vul: 1 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage and apply ${v.vul} Exposed to ALL enemies.`,
    play: async (g, c, t, v) => { await g.attackAll(v.dmg, 1, c); for (const e of g.alive()) await g.apply(e, 'exposed', v.vul); } });
  card('MENACE', { name: 'Menace', type: 'Skill', rarity: 'Common', cost: 1, target: 'enemy', kw: ['Burn'], v: { vul: 3 }, up: { vul: 1 },
    text: (v) => `Apply ${v.vul} Exposed.`,
    play: async (g, c, t, v) => g.apply(t, 'exposed', v.vul) });
  card('SCORCHED_GUARD', { name: 'Scorched Guard', type: 'Skill', rarity: 'Common', cost: 1, v: { blk: 7 }, up: { blk: 2 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Burn 1 random card in your hand.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.burnRandomFromHand(1); } });
  card('TWIN_CUT', { name: 'Twin Cut', type: 'Attack', rarity: 'Common', cost: 1, target: 'enemy', tags: ['Cut'], v: { dmg: 5 }, up: { dmg: 2 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage twice.`,
    play: async (g, c, t, v) => g.attack(t, v.dmg, 2, c) });

  // ---------- Uncommon ----------
  card('ASHEN_CUT', { name: 'Ashen Cut', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', tags: ['Cut'], v: { dmg: 6, per: 3 }, up: { per: 1 },
    text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage, plus ${v.per} for each card in your Ash pile.${g ? ` (${g.ash.length})` : ''}`,
    play: async (g, c, t, v) => g.attack(t, v.dmg + v.per * g.ash.length, 1, c) });
  card('WAR_FOCUS', { name: 'War Focus', type: 'Skill', rarity: 'Uncommon', cost: 0, v: { draw: 3 }, up: { draw: 1 },
    text: (v) => `Draw ${v.draw} cards. You cannot draw more cards this turn.`,
    play: async (g, c, t, v) => { await g.drawCards(v.draw); g.p.pw.noDraw = 1; } });
  card('ANVIL_DROP', { name: 'Anvil Drop', type: 'Attack', rarity: 'Uncommon', cost: 3, target: 'enemy', v: { dmg: 32 }, up: { dmg: 10 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage.`,
    play: async (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('PICK_ON', { name: 'Pick On', type: 'Attack', rarity: 'Uncommon', cost: 0, target: 'enemy', v: { dmg: 4, per: 2 }, up: { per: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage, plus ${v.per} for each Exposed on the target.`,
    play: async (g, c, t, v) => g.attack(t, v.dmg + v.per * (t.pw.exposed || 0), 1, c) });
  card('KINDLING_PACT', { name: 'Kindling Pact', type: 'Skill', rarity: 'Uncommon', cost: 1, v: { draw: 2 }, up: { draw: 1 },
    text: (v) => `Burn 1 card from your hand. Draw ${v.draw} cards.`,
    play: async (g, c, t, v) => { await g.burnChosen(1); await g.drawCards(v.draw); } });
  card('STONE_STANCE', { name: 'Stone Stance', type: 'Skill', rarity: 'Uncommon', cost: 1, v: { blk: 5 }, up: { blk: 3 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Take 50% less damage from Exposed enemies until your next turn.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.p.pw.stoneStance = 1; } });
  card('SHARED_SCAR', { name: 'Shared Scar', type: 'Skill', rarity: 'Uncommon', cost: 0, kw: ['Burn'], upKw: [], coop: true, v: { hp: 1 },
    text: (v) => `Lose ${v.hp} HP. Give an ally Guard equal to yours. (Co-op only)`,
    play: async (g, c, t, v) => { await g.selfLoseHp(v.hp); } });
  card('PRY_APART', { name: 'Pry Apart', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { dmg: 8 }, up: { dmg: 2 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Hits twice if the target is Exposed.`,
    play: async (g, c, t, v) => g.attack(t, v.dmg, t.pw.exposed ? 2 : 1, c) });
  card('LOOM_OVER', { name: 'Loom Over', type: 'Skill', rarity: 'Uncommon', cost: 1, target: 'enemy', kw: ['Burn'], v: { vul: 1, per: 1 }, up: { vul: 1 },
    text: (v) => `Apply ${v.vul} Exposed. Gain ${v.per} Might for each Exposed on the target.`,
    play: async (g, c, t, v) => { await g.apply(t, 'exposed', v.vul); g.addPw(g.p, 'might', v.per * (t.pw.exposed || 0)); } });
  card('WAR_HORN', { name: 'War Horn', type: 'Skill', rarity: 'Uncommon', cost: 1, v: { draw: 2, en: 2 }, up: { en: 1 },
    text: (v) => `Draw 2 cards. When this card Burns, gain ${v.en} Energy.`,
    play: async (g, c, t, v) => g.drawCards(v.draw),
    onBurn: async (g, c) => g.gainEnergy(HD.vals(c).en) });
  card('SMOLDER_GAZE', { name: 'Smolder Gaze', type: 'Skill', rarity: 'Uncommon', cost: 1, v: { blk: 8 }, up: { blk: 3 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Gain ${f.b(v.blk)} more if a card Burned this turn.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); if (g.t.burned) await g.gainBlock(v.blk, true); } });
  card('ROLL_UP_SLEEVES', { name: 'Roll Up Sleeves', type: 'Skill', rarity: 'Uncommon', cost: 2, upCost: 1,
    text: (v, f, c, g) => `Gain 1 Energy for each Attack in your hand. You cannot gain more Energy this turn.${g ? ` (${g.hand.filter((x) => CARDS[x.id].type === 'Attack').length})` : ''}`,
    play: async (g) => { g.gainEnergy(g.hand.filter((x) => CARDS[x.id].type === 'Attack').length); g.p.pw.noEnergy = 1; } });
  card('NUMB_FLESH', { name: 'Numb Flesh', type: 'Power', rarity: 'Uncommon', cost: 1, v: { n: 3 }, up: { n: 1 },
    text: (v) => `Whenever a card Burns, gain ${v.n} Guard.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'numb', v.n) });
  card('COME_AT_ME', { name: 'Come At Me', type: 'Attack', rarity: 'Uncommon', cost: 2, target: 'enemy', v: { dmg: 5, str: 3, estr: 1 }, up: { dmg: 1, str: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage twice. Gain ${v.str} Might. The target gains ${v.estr} Might.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 2, c); g.addPw(g.p, 'might', v.str); if (t.alive) g.addPw(t, 'might', v.estr); } });
  card('FIRE_WALL', { name: 'Fire Wall', type: 'Skill', rarity: 'Uncommon', cost: 2, v: { blk: 12, back: 4 }, up: { blk: 4, back: 2 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Until your next turn, attackers take ${v.back} damage per hit.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'fireWall', v.back); } });
  card('OLD_RITE', { name: 'Old Rite', type: 'Skill', rarity: 'Uncommon', cost: 1, kw: ['Burn'], v: { en: 3 }, up: { en: 1 },
    text: (v) => `If a card Burned this turn, gain ${v.en} Energy.`,
    play: async (g, c, t, v) => { if (g.t.burned) g.gainEnergy(v.en); } });
  card('BLOOD_LASH', { name: 'Blood Lash', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { hp: 2, dmg: 15 }, up: { dmg: 5 },
    text: (v, f) => `Lose ${v.hp} HP. Deal ${f.d(v.dmg)} damage.`,
    play: async (g, c, t, v) => { await g.selfLoseHp(v.hp); await g.attack(t, v.dmg, 1, c); } });
  card('ASH_WAIL', { name: 'Ash Wail', type: 'Attack', rarity: 'Uncommon', cost: 3, target: 'all', v: { dmg: 16 }, up: { dmg: 5 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. At the end of your turn, if this is in your Ash pile, play it.`,
    play: async (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  card('CONJURED_EDGE', { name: 'Conjured Edge', type: 'Skill', rarity: 'Uncommon', cost: 1, upCost: 0, kw: ['Burn'],
    text: () => 'Add a random Attack to your hand. It costs 0 this turn.',
    play: async (g) => { const x = g.makeCard(g.randomPoolCard((d) => d.type === 'Attack'), false); x.freeTurn = true; g.addToHand(x); } });
  card('FEVER', { name: 'Fever', type: 'Power', rarity: 'Uncommon', cost: 1, v: { dmg: 6 }, up: { dmg: 3 },
    text: (v) => `At the start of your turn, lose 1 HP. Whenever you lose HP on your turn, deal ${v.dmg} damage to ALL enemies.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'fever', v.dmg) });
  card('HEAT_UP', { name: 'Heat Up', type: 'Power', rarity: 'Uncommon', cost: 1, v: { str: 2 }, up: { str: 1 },
    text: (v) => `Gain ${v.str} Might.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'might', v.str) });
  card('SHOWBOAT', { name: 'Showboat', type: 'Power', rarity: 'Uncommon', cost: 1, upKw: ['Opening'],
    text: () => 'Your third Attack each turn adds a copy of itself to your hand.',
    play: async (g) => g.addPw(g.p, 'showboat', 1) });
  card('PLUNDER', { name: 'Plunder', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { dmg: 6 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw cards until you draw a non-Attack.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 1, c);
      for (let i = 0; i < 10; i++) { const x = await g.drawOne(); if (!x || CARDS[x.id].type !== 'Attack') break; }
    } });
  card('SEETHE', { name: 'Seethe', type: 'Skill', rarity: 'Uncommon', cost: 0, v: { n: 3 }, up: { n: 2 },
    text: (v) => `Whenever you play an Attack this turn, gain ${v.n} Guard.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'seethe', v.n) });
  card('ESCALATE', { name: 'Escalate', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { dmg: 9, inc: 5 }, up: { inc: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. This card deals ${v.inc} more damage for the rest of combat.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); c.bonus = (c.bonus || 0) + v.inc; } });
  card('SPLIT_SKIN', { name: 'Split Skin', type: 'Power', rarity: 'Uncommon', cost: 1, v: { str: 1 }, up: { str: 1 },
    text: (v) => `Whenever you lose HP on your turn, gain ${v.str} Might.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'splitSkin', v.str) });
  card('CLEAR_HANDS', { name: 'Clear Hands', type: 'Skill', rarity: 'Uncommon', cost: 1, v: { blk: 5 }, up: { blk: 2 },
    text: (v, f) => `Burn every non-Attack in your hand. Gain ${f.b(v.blk)} Guard for each.`,
    play: async (g, c, t, v) => {
      const xs = g.hand.filter((x) => CARDS[x.id].type !== 'Attack');
      for (const x of xs) { g.hand.splice(g.hand.indexOf(x), 1); await g.burn(x); }
      for (let i = 0; i < xs.length; i++) await g.gainBlock(v.blk, true);
    } });
  card('GRUDGE', { name: 'Grudge', type: 'Attack', rarity: 'Uncommon', cost: 0, target: 'enemy', v: { dmg: 5, hits: 2 }, up: { hits: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. If you lost HP this turn, hit ${v.hits} times instead.`,
    play: async (g, c, t, v) => g.attack(t, v.dmg, g.t.lostHp ? v.hits : 1, c) });
  card('FRENZY_MARCH', { name: 'Frenzy March', type: 'Power', rarity: 'Uncommon', cost: 2, upCost: 1,
    text: () => 'At the end of your turn, a random Attack in your hand is played at a random enemy.',
    play: async (g) => g.addPw(g.p, 'frenzy', 1) });
  card('CRUSHING_STAMP', { name: 'Crushing Stamp', type: 'Attack', rarity: 'Uncommon', cost: 3, target: 'all', v: { dmg: 12 }, up: { dmg: 3 },
    costFn: (g, c, base) => base - g.t.attacks,
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. Costs 1 less for each Attack played this turn.`,
    play: async (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  card('IRON_SKIN', { name: 'Iron Skin', type: 'Power', rarity: 'Uncommon', cost: 1, v: { n: 4 }, up: { n: 2 },
    text: (v) => `Gain ${v.n} Plate.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'plate', v.n) });
  card('PROVOKE', { name: 'Provoke', type: 'Skill', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { blk: 7, vul: 1 }, up: { blk: 1, vul: 1 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Apply ${v.vul} Exposed.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.apply(t, 'exposed', v.vul); } });
  card('KEEP_SWINGING', { name: 'Keep Swinging', type: 'Attack', rarity: 'Uncommon', cost: 2, target: 'enemy', v: { dmg: 14 }, up: { dmg: 6 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Your next Attack costs 0.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.pendingKeepSwinging = true; } });
  card('RISING_BLOW', { name: 'Rising Blow', type: 'Attack', rarity: 'Uncommon', cost: 2, target: 'enemy', v: { dmg: 13, n: 1 }, up: { n: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.n} Sapped. Apply ${v.n} Exposed.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.apply(t, 'sapped', v.n); await g.apply(t, 'exposed', v.n); } });
  card('BLOODHOUND', { name: 'Bloodhound', type: 'Power', rarity: 'Uncommon', cost: 1, v: { draw: 1 }, up: { draw: 1 },
    text: (v) => `Whenever you apply Exposed, draw ${v.draw} ${s(v.draw, 'card', 'cards')}.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'bloodhound', v.draw) });
  card('CYCLONE_SWING', { name: 'Cyclone Swing', type: 'Attack', rarity: 'Uncommon', cost: 'X', target: 'all', v: { dmg: 5 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies X times.`,
    play: async (g, c, t, v, x) => g.attackAll(v.dmg, x, c) });

  // ---------- Rare ----------
  card('HUNGER_FOR_MORE', { name: 'Hunger for More', type: 'Power', rarity: 'Rare', cost: 1, upKw: ['Opening'],
    text: () => 'At the start of your turn, return a random Attack from your discard pile to your hand and Upgrade it.',
    play: async (g) => g.addPw(g.p, 'hunger', 1) });
  card('RAMPART', { name: 'Rampart', type: 'Power', rarity: 'Rare', cost: 3, upCost: 2,
    text: () => 'Guard is no longer removed at the start of your turn.',
    play: async (g) => { g.p.pw.rampart = 1; } });
  card('SEARING_MARK', { name: 'Searing Mark', type: 'Skill', rarity: 'Rare', cost: 0, v: { hp: 1, str: 1 }, up: { str: 1 },
    text: (v) => `Lose ${v.hp} HP. Burn 1 card from your hand. Gain ${v.str} Might.`,
    play: async (g, c, t, v) => { await g.selfLoseHp(v.hp); await g.burnChosen(1); g.addPw(g.p, 'might', v.str); } });
  card('AVALANCHE', { name: 'Avalanche', type: 'Skill', rarity: 'Rare', cost: 'X',
    text: (v, f, c) => `Play the top ${c && c.up ? 'X+1' : 'X'} cards of your draw pile.`,
    play: async (g, c, t, v, x) => { const n = x + (c.up ? 1 : 0); for (let i = 0; i < n; i++) { const y = await g.takeTopOfDraw(); if (!y) break; await g.autoPlay(y, {}); if (g.over) break; } } });
  card('FIRESTORM', { name: 'Firestorm', type: 'Attack', rarity: 'Rare', cost: 1, target: 'all', v: { dmg: 2, hits: 4 }, up: { hits: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies ${v.hits} times.`,
    play: async (g, c, t, v) => g.attackAll(v.dmg, v.hits, c) });
  card('RED_CLOAK', { name: 'Red Cloak', type: 'Power', rarity: 'Rare', cost: 1, v: { blk: 8 }, up: { blk: 2 },
    text: (v) => `At the start of your turn, lose 1 HP and gain ${v.blk} Guard.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'redCloak', v.blk) });
  card('MERCILESS', { name: 'Merciless', type: 'Power', rarity: 'Rare', cost: 1, v: { pct: 25 }, up: { pct: 25 },
    text: (v) => `Exposed enemies take an extra ${v.pct}% damage.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'merciless', v.pct) });
  card('ASH_HARVEST', { name: 'Ash Harvest', type: 'Power', rarity: 'Rare', cost: 2, upCost: 1,
    text: () => 'Whenever a card Burns, draw 1 card.',
    play: async (g) => g.addPw(g.p, 'ashHarvest', 1) });
  card('HELLBOUND', { name: 'Hellbound', type: 'Power', rarity: 'Rare', cost: 3, v: { str: 2 }, up: { str: 1 },
    text: (v) => `At the start of your turn, gain ${v.str} Might.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'hellbound', v.str) });
  card('DEVOUR', { name: 'Devour', type: 'Attack', rarity: 'Rare', cost: 1, target: 'enemy', kw: ['Burn'], v: { dmg: 10, mhp: 3 }, up: { dmg: 2, mhp: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Fatal: raise your Max HP by ${v.mhp}.`,
    play: async (g, c, t, v) => { const r = await g.attack(t, v.dmg, 1, c); if (r.fatal) g.gainMaxHp(v.mhp); } });
  card('BONFIRE', { name: 'Bonfire', type: 'Attack', rarity: 'Rare', cost: 2, target: 'enemy', kw: ['Burn'], v: { dmg: 7 }, up: { dmg: 3 },
    text: (v, f) => `Burn your hand. Deal ${f.d(v.dmg)} damage for each card Burned.`,
    play: async (g, c, t, v) => { const xs = g.hand.splice(0); for (const x of xs) await g.burn(x); await g.attack(t, v.dmg, xs.length, c); } });
  card('ENDLESS_CUTS', { name: 'Endless Cuts', type: 'Power', rarity: 'Rare', cost: 2, upCost: 1,
    text: () => 'Whenever you draw a Cut card, it is played at a random enemy.',
    play: async (g) => { g.p.pw.endlessCuts = 1; } });
  card('UNBREAKABLE', { name: 'Unbreakable', type: 'Skill', rarity: 'Rare', cost: 2, kw: ['Burn'], v: { blk: 30 }, up: { blk: 10 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard.`,
    play: async (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('SIEGE_ENGINE', { name: 'Siege Engine', type: 'Power', rarity: 'Rare', cost: 2, v: { dmg: 6 }, up: { dmg: 2 },
    text: (v) => `Whenever you gain Guard, deal ${v.dmg} damage to a random enemy.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'siege', v.dmg) });
  card('MAIM', { name: 'Maim', type: 'Attack', rarity: 'Rare', cost: 3, target: 'enemy', v: { dmg: 15, loss: 10 }, up: { dmg: 5, loss: 5 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. The target loses ${v.loss} Might until the end of its turn.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'mightDown', v.loss); } });
  card('NOT_TODAY', { name: 'Not Today', type: 'Skill', rarity: 'Rare', cost: 2, kw: ['Burn'], v: { heal: 10 }, up: { heal: 3 },
    text: (v) => `Heal ${v.heal} HP.`,
    play: async (g, c, t, v) => g.heal(v.heal) });
  card('BLOOD_TITHE', { name: 'Blood Tithe', type: 'Skill', rarity: 'Rare', cost: 0, kw: ['Burn'], v: { hp: 6, en: 2, draw: 3 }, up: { draw: 2 },
    text: (v) => `Lose ${v.hp} HP. Gain ${v.en} Energy. Draw ${v.draw} cards.`,
    play: async (g, c, t, v) => { await g.selfLoseHp(v.hp); g.gainEnergy(v.en); await g.drawCards(v.draw); } });
  card('ECHO_SWING', { name: 'Echo Swing', type: 'Skill', rarity: 'Rare', cost: 1, v: { n: 1 }, up: { n: 1 },
    text: (v) => (v.n === 1 ? 'This turn, your next Attack is played an extra time.' : `This turn, your next ${v.n} Attacks are played an extra time.`),
    play: async (g, c, t, v) => g.addPw(g.p, 'echo', v.n) });
  card('FINAL_EMBER', { name: 'Final Ember', type: 'Attack', rarity: 'Rare', cost: 0, target: 'all', v: { dmg: 17, need: 3 }, up: { dmg: 6 },
    text: (v, f, c, g) => `If your Ash pile holds ${v.need} or more cards, deal ${f.d(v.dmg)} damage to ALL enemies.${g ? ` (${g.ash.length})` : ''}`,
    play: async (g, c, t, v) => { if (g.ash.length >= v.need) await g.attackAll(v.dmg, 1, c); } });
  card('EARTHSHAPER', { name: 'Earthshaper', type: 'Skill', rarity: 'Rare', cost: 0,
    text: (v, f, c) => `Turn every Attack in your hand into a ${c && c.up ? 'Boulder+' : 'Boulder'}.`,
    play: async (g, c) => { for (const x of g.hand) if (CARDS[x.id].type === 'Attack') { x.id = 'BOULDER'; x.up = !!c.up; x.bonus = 0; x.freeTurn = false; } } });
  card('HEARTH', { name: 'Hearth', type: 'Power', rarity: 'Rare', cost: 2, v: { en: 1 }, up: { en: 1 },
    text: (v) => `At the start of your turn, gain ${v.en} Energy.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'hearth', v.en) });
  card('FEED_THE_FLAMES', { name: 'Feed the Flames', type: 'Skill', rarity: 'Rare', cost: 1,
    text: (v, f, c) => `Burn your hand. Add 1 random ${c && c.up ? 'upgraded ' : ''}card to your hand for each card Burned.`,
    play: async (g, c) => {
      const xs = g.hand.splice(0);
      for (const x of xs) await g.burn(x);
      for (let i = 0; i < xs.length; i++) g.addToHand(g.makeCard(g.randomPoolCard(() => true), !!c.up));
    } });
  card('TAKE_THE_HITS', { name: 'Take the Hits', type: 'Power', rarity: 'Rare', cost: 1, upCost: 0, coop: true,
    text: () => 'Take double damage from enemies. Allies take half damage. (Co-op only)',
    play: async () => {} });
  card('SCAR_TISSUE', { name: 'Scar Tissue', type: 'Attack', rarity: 'Rare', cost: 2, target: 'enemy', v: { dmg: 5 }, up: { dmg: 2 },
    text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage. Hits once more for each time you lost HP this combat.${g ? ` (${g.lostHpTimes})` : ''}`,
    play: async (g, c, t, v) => g.attack(t, v.dmg, 1 + g.lostHpTimes, c) });
  card('FLAIL_ABOUT', { name: 'Flail About', type: 'Attack', rarity: 'Rare', cost: 1, target: 'enemy', v: { dmg: 4 }, up: { dmg: 2 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage twice. Burn a random Attack in your hand and add its damage to this card.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 2, c);
      const atks = g.hand.filter((x) => CARDS[x.id].type === 'Attack');
      if (atks.length) { const x = g.rng.pick(atks); const add = HD.vals(x).dmg || 0; g.hand.splice(g.hand.indexOf(x), 1); await g.burn(x); c.bonus = (c.bonus || 0) + add; }
    } });
  card('STAND_FIRM', { name: 'Stand Firm', type: 'Power', rarity: 'Rare', cost: 2, upCost: 1,
    text: () => 'The first time you gain Guard from a card each turn, double it.',
    play: async (g) => { g.p.pw.standFirm = 1; } });

  // ---------- Ancient (offered by Ancients only; not in reward pools) ----------
  card('SPLINTER', { name: 'Splinter', type: 'Attack', rarity: 'Ancient', cost: 1, target: 'enemy', v: { dmg: 20, vul: 5 }, up: { dmg: 10, vul: 2 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.vul} Exposed.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.apply(t, 'exposed', v.vul); } });
  card('ROT_OATH', { name: 'Rot Oath', type: 'Power', rarity: 'Ancient', cost: 3, upCost: 2,
    text: () => 'Skills cost 0. Whenever you play a Skill, Burn it.',
    play: async (g) => { g.p.pw.rot = 1; } });

  // ---------- Tokens and statuses ----------
  card('BOULDER', { name: 'Boulder', type: 'Attack', rarity: 'Token', color: 'token', cost: 1, target: 'enemy', v: { dmg: 16 }, up: { dmg: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage.`,
    play: async (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('SLUDGE', { name: 'Sludge', type: 'Status', rarity: 'Status', color: 'status', cost: 1, kw: ['Burn'],
    text: () => 'Draw 1 card.',
    play: async (g) => g.drawCards(1) });
  card('REELING', { name: 'Reeling', type: 'Status', rarity: 'Status', color: 'status', cost: null, kw: ['Unplayable', 'Fleeting'],
    text: () => '' });
  card('BLIGHT', { name: 'Blight', type: 'Status', rarity: 'Status', color: 'status', cost: null, kw: ['Unplayable'],
    text: () => 'At the end of your turn, if this is in your hand, take 3 damage.',
    endInHand: async (g) => g.damage(g.p, 3, {}) });

  HD.STARTER = { OATHBURNER: ['CUT', 'CUT', 'CUT', 'CUT', 'CUT', 'BRACE', 'BRACE', 'BRACE', 'BRACE', 'CRACK'] };
  // Characters: everything a run needs to know about who is playing.
  HD.CHARS = HD.CHARS || {};
  HD.CHARS.OATHBURNER = { id: 'OATHBURNER', name: 'Oathburner', color: 'oathburner', hp: 80, gold: 99, energy: 3, deck: HD.STARTER.OATHBURNER,
    relic: 'EMBER_HEART', ancientRelic: 'EMBER_CORE', ancientCard: ['CRACK', 'SPLINTER'], strike: 'CUT', defend: 'BRACE',
    blurb: 'Starts with Ember Heart: at the end of combat, heal 6 HP.' };
  // ---------- Curses and the Rootmother's card ----------
  const curse = (id, o) => card(id, Object.assign({ type: 'Curse', rarity: 'Curse', color: 'curse', cost: null, text: () => '' }, o));
  curse('AVARICE', { name: 'Avarice', kw: ['Unplayable', 'Eternal'] });
  curse('SPRAIN', { name: 'Sprain', kw: ['Unplayable'] });
  curse('FUMBLE', { name: 'Fumble', kw: ['Unplayable', 'Fleeting'] });
  curse('MILDEW', { name: 'Mildew', kw: ['Unplayable'], text: () => 'At the end of your turn, if this is in your hand, take 2 damage.',
    endInHand: async (g) => g.damage(g.p, 2, {}) });
  curse('MISGIVING', { name: 'Misgiving', kw: ['Unplayable'], text: () => 'At the end of your turn, if this is in your hand, gain 1 Sapped.',
    endInHand: async (g) => g.applyToPlayer('sapped', 1) });
  curse('ROUTINE', { name: 'Routine', kw: ['Unplayable'], text: () => 'While this is in your hand, you cannot play more than 3 cards this turn.' });
  curse('REMORSE', { name: 'Remorse', kw: ['Unplayable'], text: () => 'At the end of your turn, if this is in your hand, lose 1 HP for each card in your hand.',
    endInHand: async (g) => g.selfLoseHp(g.hand.length) });
  curse('DISGRACE', { name: 'Disgrace', kw: ['Unplayable'], text: () => 'At the end of your turn, if this is in your hand, gain 1 Brittle.',
    endInHand: async (g) => g.applyToPlayer('brittle', 1) });
  curse('SQUIRM', { name: 'Squirm', kw: ['Unplayable', 'Opening'] });
  // Curses a "random curse" can roll.
  HD.RANDOM_CURSES = ['FUMBLE', 'MILDEW', 'MISGIVING', 'SPRAIN', 'ROUTINE', 'REMORSE', 'DISGRACE', 'SQUIRM'];
  card('ROOT_FURY', { name: "Rootmother's Fury", type: 'Attack', rarity: 'Ancient', color: 'event', cost: 1, target: 'enemy', kw: ['Burn'],
    v: { dmg: 10, n: 2 }, up: { dmg: 4, n: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Put up to ${v.n} cards from your discard pile into your hand.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 1, c);
      if (g.over || !g.discard.length) return;
      const xs = await g.choose({ from: g.discard.slice(), n: Math.min(v.n, g.discard.length), min: 0, prompt: 'Put up to ' + v.n + ' cards into your hand' });
      for (const x of xs) { g.discard.splice(g.discard.indexOf(x), 1); g.addToHand(x); }
    } });

  HD.POOL = (color) => Object.values(CARDS).filter((d) => d.color === color && ['Common', 'Uncommon', 'Rare'].includes(d.rarity) && !d.coop && (!d.only || d.only === HD.version));
})();

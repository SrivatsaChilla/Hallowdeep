// The Crowned: the third character (the Regent). Costs, Glint costs, values, upgrades, keywords and targets come from
// HD.REGENT_DATA (generated from the v0.111 data); text, play functions, relics and potions are here.
// Glints are Stars, Temper is Forge, the Regal Blade is the Sovereign Blade, Thralls are Minions, Rubble is Debris.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const DATA = HD.REGENT_DATA['0.111'];
  const card = (id, o) => {
    const d = DATA[id];
    if (!d) throw new Error(`no Regent data for ${id}`);
    CARDS[id] = Object.assign({ id, color: d.rarity === 'Token' ? 'token' : 'crowned', name: d.name, type: d.type, rarity: d.rarity, cost: d.cost,
      target: d.target, kw: d.kw, tags: d.tags, v: d.v, up: d.up },
    d.upCost != null ? { upCost: d.upCost } : {}, d.upKw ? { upKw: d.upKw } : {}, d.star != null ? { star: d.star } : {}, o);
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const glints = (n) => plural(n, 'Glint');
  const hitAll = async (g, n) => { for (const e of g.alive()) { await g.damage(e, n, {}); if (g.over) return; } };
  const sapExpose = async (g, t, v) => { if (t.alive) await g.apply(t, 'sapped', v.weak); if (t.alive) await g.apply(t, 'exposed', v.vul); };
  const lowerMight = async (g, n) => { for (const e of g.alive()) await g.apply(e, 'mightDown', n); };
  const colorless = (g, up) => g.makeCard(g.rng.pick(HD.colorlessIds(true)), !!up);
  // Card names in text use the HallowDeep name; the original-names mode swaps it with the rest of the text.
  const hdName = (id) => CARDS[id].nameHD || CARDS[id].name;
  const tokenName = (id, c) => `${hdName(id)}${c && c.up ? '+' : ''}`;
  // Move chosen cards from one pile to another (the engine has no shared helper for this).
  const move = (from, to, xs) => { for (const x of xs) { const i = from.indexOf(x); if (i >= 0) { from.splice(i, 1); to.push(x); } } };
  const putBackOnTop = async (g, n) => {
    if (!g.hand.length) return;
    move(g.hand, g.draw, await g.choose({ from: g.hand.slice(), n, prompt: `Put ${plural(n, 'card')} on top of your draw pile` }));
  };
  const transformChosen = async (g, from, n, min, id, up, prompt) => {
    if (!from.length) return;
    for (const x of await g.choose({ from: from.slice(), n: Math.min(n, from.length), min, prompt })) await g.transformInCombat(x, id, up);
  };
  // Cards that cost Glints, in every pile and in play (Moon Pike counts itself).
  const glintCards = (g) => new Set([...g.hand, ...g.draw, ...g.discard, ...g.ash, ...(g.current ? [g.current] : [])].filter((x) => CARDS[x.id].star != null)).size;
  const thrall = (g) => (g.has('MODEL_THRALL') ? 2 : 1);

  // ---------- starter ----------
  card('SMITE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('WARD_OFF', { text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('STARFALL', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.weak} Sapped. Apply ${v.vul} Exposed.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await sapExpose(g, t, v); } });
  card('REVERE', { text: (v) => `Gain ${glints(v.stars)}.`, play: (g, c, t, v) => g.gainStars(v.stars) });

  // ---------- tokens: the Regal Blade, Thralls, Rubble ----------
  card('REGAL_BLADE', { v: { dmg: 10 }, up: {}, dmgMult: (g, t) => (t && t.pw.usurped ? 2 : 1),
    text: (v, f, c, g) => {
      const pw = (g && g.p && g.p.pw) || {};
      return `Deal ${f.d(v.dmg + ((c && c.forged) || 0))} damage${pw.huntingEdge ? ' to ALL enemies' : ''}.${pw.riposte ? ` Gain ${f.b(pw.riposte)} Guard.` : ''}`;
    },
    play: async (g, c, t, v) => {
      const n = v.dmg + (c.forged || 0);
      if (g.p.pw.huntingEdge) await g.attackAll(n, 1, c); else await g.attack(t, n, 1, c);
      if (g.p.pw.riposte && !g.over) await g.gainBlock(g.p.pw.riposte, true);
    } });
  card('THRALL_STRIKE', { dmgMult: thrall, text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!g.over) await g.drawCards(v.draw); } });
  card('THRALL_PLUNGE', { dmgMult: thrall, text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('THRALL_SHIELD', { blockMult: thrall, text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('RUBBLE', { rarity: 'Status', color: 'status', text: () => '', play: async () => {} });

  // ---------- common ----------
  card('STARTHROB', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies twice.`, play: (g, c, t, v) => g.attackAll(v.dmg, 2, c) });
  card('DISMISSAL', { text: (v, f, c) => `Choose a card in your hand to Transform into ${tokenName('THRALL_STRIKE', c)}.`,
    play: (g, c) => transformChosen(g, g.hand, 1, 1, 'THRALL_STRIKE', c.up, `Transform a card into ${tokenName('THRALL_STRIKE', c)}`) });
  card('HEAVENS_WEIGHT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage ${v.hits} times.`, play: (g, c, t, v) => g.attack(t, v.dmg, v.hits, c) });
  card('STARRY_MANTLE', { text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('IMPACT_PATH', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Add a ${hdName('RUBBLE')} to your hand.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!g.over) await g.create(g.makeCard('RUBBLE', false), 'hand'); } });
  card('COLD_HEAVENS', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Put a card from your discard pile on top of your draw pile.`,
    play: async (g, c, t, v) => {
      await g.gainBlock(v.blk, true);
      if (g.discard.length) move(g.discard, g.draw, await g.choose({ from: g.discard.slice(), n: 1, prompt: 'Put a card on top of your draw pile' }));
    } });
  card('MOON_PIKE', { text: (v, f, c, g) => `Deal ${f.d(v.base + v.per * (g && g.hand ? glintCards(g) : 0))} damage. Deals ${v.per} more for each of your cards with a Glint cost.`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * glintCards(g), 1, c) });
  card('TRAMPLE_DOWN', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. ALL enemies lose ${v.loss} Might this turn.`,
    play: async (g, c, t, v) => { await g.attackAll(v.dmg, 1, c); if (!g.over) await lowerMight(g, v.loss); } });
  card('HOARD_LIGHT', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Gain ${glints(v.stars)}.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.gainStars(v.stars); } });
  card('SPARKLE_TIDE', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Next turn, gain ${v.blockNextTurn} Guard.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'nextBlock', g.blockPreview(v.blockNextTurn, c)); } });
  card('LUSTER', { text: (v) => `Gain ${glints(v.stars)}. Draw ${plural(v.draw, 'card')}. Next turn, draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { await g.gainStars(v.stars); await g.drawCards(v.draw); g.addPw(g.p, 'nextDraw', v.draw); } });
  card('NORTH_LIGHT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Next turn, draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'nextDraw', v.draw); } });
  card('SECRET_HOARD', { text: (v) => `Gain ${glints(v.stars)}. Next turn, gain ${glints(v.starNextTurn)}.`,
    play: async (g, c, t, v) => { await g.gainStars(v.stars); g.addPw(g.p, 'nextStars', v.starNextTurn); } });
  card('KNEEL', { text: (v) => `Apply ${v.weak} Sapped. Apply ${v.vul} Exposed.`, play: (g, c, t, v) => sapExpose(g, t, v) });
  card('SMALL_TALK', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Gain ${v.vigor} Vigor.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'vigor', v.vigor); } });
  card('LIGHT_SLICE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw ${plural(v.draw, 'card')}. Put ${plural(v.putBack, 'card')} from your hand on top of your draw pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (g.over) return; await g.drawCards(v.draw); await putBackOnTop(g, v.putBack); } });
  card('HONE_EDGE', { text: (v) => `Temper ${v.forge}. Next turn, gain ${v.en} Energy.`, play: async (g, c, t, v) => { await g.forge(v.forge); g.addPw(g.p, 'nextEnergy', v.en); } });
  card('SUN_SMITE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Gain ${glints(v.stars)}.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.gainStars(v.stars); } });
  card('WAR_PLUNDER', { text: (v) => `Temper ${v.forge}. Draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => { await g.forge(v.forge); await g.drawCards(v.draw); } });
  card('BATTLE_FORGED', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Temper ${v.forge}.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.forge(v.forge); } });

  // ---------- uncommon ----------
  card('CONJUNCTION', { text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) });
  card('EVENT_HORIZON', { text: (v) => `Whenever you spend or gain Glints, deal ${v.blackHole} damage to ALL enemies.`, play: async (g, c, t, v) => g.addPw(g.p, 'eventHorizon', v.blackHole) });
  card('BASTION_WALL', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Temper ${v.forge}.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.forge(v.forge); } });
  card('MUSTER', { text: (v, f, c) => `Choose ${plural(v.draw, 'card')} in your draw pile to Transform into ${tokenName('THRALL_PLUNGE', c)}.`,
    play: (g, c, t, v) => transformChosen(g, g.draw, v.draw, v.draw, 'THRALL_PLUNGE', c.up, `Transform cards into ${tokenName('THRALL_PLUNGE', c)}`) });
  card('STARBORN', { text: (v) => `Whenever you spend Glints, gain ${v.blockForStars} Guard for each Glint spent.`, play: async (g, c, t, v) => g.addPw(g.p, 'starborn', v.blockForStars) });
  card('USURPER', { text: (v) => `Temper ${v.forge}. The ${hdName('REGAL_BLADE')} deals double damage to the enemy this turn.`,
    play: async (g, c, t, v) => { await g.forge(v.forge); if (t && t.alive) await g.apply(t, 'usurped', 1); } });
  card('CONFLUENCE', { text: (v) => `Next turn, gain ${v.en} Energy and ${glints(v.stars)}. Retain your hand this turn.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'nextEnergy', v.en); g.addPw(g.p, 'nextStars', v.stars); g.t.keepHand = true; } });
  card('BELLOWS', { text: (v) => `At the start of your turn, Temper ${v.forge}.`, play: async (g, c, t, v) => g.addPw(g.p, 'bellows', v.forge) });
  card('RAY_BURST', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.weak} Sapped. Apply ${v.vul} Exposed.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await sapExpose(g, t, v); } });
  card('TWINKLE', { text: (v) => `Draw ${plural(v.draw, 'card')}. Put ${plural(v.putBack, 'card')} from your hand on top of your draw pile.`,
    play: async (g, c, t, v) => { await g.drawCards(v.draw); await putBackOnTop(g, v.putBack); } });
  card('DOMINION', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Next turn, gain ${v.en} Energy.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'nextEnergy', v.en); } });
  card('ROYAL_BOOT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Whenever you draw this card, it costs 1 less.`,
    onDraw: (g, c) => { c.bonusCost = (c.bonusCost || 0) - 1; }, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('ROYAL_FIST', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Whenever you draw this card, it deals ${v.inc} more damage this combat.`,
    onDraw: (g, c) => { c.bonus = (c.bonus || 0) + HD.vals(c).inc; }, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('FELLING_BLOW', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. If this kills an enemy, gain ${glints(v.stars)}.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!t.alive && !t.fled) await g.gainStars(v.stars); } });
  card('MOONBURST', { text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage for each Skill already played this turn.${g && g.t ? ` (${g.t.skills})` : ''}`,
    play: async (g, c, t, v) => { if (g.t.skills) await g.attack(t, v.dmg, g.t.skills, c); } });
  card('SHOW_OF_RULE', { text: (v, f, c) => `Gain ${f.b(v.blk)} Guard. Add 1 random ${c && c.up ? 'Upgraded ' : ''}colorless card to your hand.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.create(colorless(g, c.up), 'hand'); } });
  card('RUINATION', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('CIRCUIT', { text: (v) => `Every 4 Energy you spend, gain ${v.en} Energy.`, play: async (g, c, t, v) => g.addPw(g.p, 'circuit', v.en) });
  card('FAR_SPECK', { text: (v) => `If you play ${v.cardPlay} or more cards in a turn, draw ${plural(v.draw, 'card')} at the start of your next turn.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'farSpeck', v.draw) });
  card('RIPOSTE', { text: (v) => `The ${hdName('REGAL_BLADE')} now also gives ${v.parry} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'riposte', v.parry) });
  card('MOTE_WALL', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Return this card to your hand.`, settleTo: () => 'hand', play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('NURSERY_CLOUD', { text: (v) => `Whenever you create a card, gain ${v.blk} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'nurseryCloud', v.blk) });
  card('FORETELL', { text: (v) => `Draw ${plural(v.draw, 'card')}.`, play: (g, c, t, v) => g.drawCards(v.draw) });
  card('BEACON', { text: (v, f, c) => `Choose 1 of 3 random ${c && c.up ? 'Upgraded ' : ''}colorless cards to add to your hand.`,
    play: async (g, c) => {
      const opts = g.rng.shuffle(HD.colorlessIds(true)).slice(0, 3).map((id) => g.makeCard(id, c.up));
      const [x] = await g.choose({ from: opts, n: 1, prompt: 'Choose a colorless card' });
      if (x) await g.create(x, 'hand');
    } });
  card('SHINE_FORTH', { text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage to ALL enemies for each Glint gained this turn.${g && g.t ? ` (${g.t.starsGained})` : ''}`,
    play: async (g, c, t, v) => { if (g.t.starsGained) await g.attackAll(v.dmg, g.t.starsGained, c); } });
  card('MIRROR_GUARD', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Blocked attack damage is reflected to your attacker this turn.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.p.pw.reflect = 1; } });
  card('HARMONIZE', { text: (v) => `Gain ${v.str} Might. ALL enemies lose 1 Might.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'might', v.str); for (const e of g.alive()) g.addPw(e, 'might', -1); } });
  card('KINGS_WAGER', { text: (v) => `Gain ${glints(v.stars)}.`, play: (g, c, t, v) => g.gainStars(v.stars) });
  card('BRIGHT_SMITE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Gain ${glints(v.stars)}. Put this card on top of your draw pile.`, settleTo: () => 'drawTop',
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.gainStars(v.stars); } });
  card('STARDRIFT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to a random enemy X times.`,
    play: async (g, c, t, v, x) => { for (let i = 0; i < x && !g.over; i++) { const e = g.randomEnemy(); if (e) await g.attack(e, v.dmg, 1, c); } } });
  card('CALL_THE_BLADE', { text: (v) => `Put every ${hdName('REGAL_BLADE')} into your hand from anywhere. Temper ${v.forge}.`,
    play: async (g, c, t, v) => {
      for (const b of g.blades(true)) {
        if (g.hand.includes(b)) continue;
        for (const pile of [g.draw, g.discard, g.ash]) { const i = pile.indexOf(b); if (i >= 0) { pile.splice(i, 1); g.addToHand(b); break; } }
      }
      await g.forge(v.forge);
    } });
  card('HEAVY_STAR', { text: (v, f, c, g) => `Deal ${f.d(v.base + v.per * ((g && g.rs && g.rs.created) || 0))} damage. Deals ${v.per} more for each card you created this combat.`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * (g.rs.created || 0), 1, c) });
  card('RESHAPE_LAND', { text: (v) => `Gain ${v.vigor} Vigor.`, play: async (g, c, t, v) => g.addPw(g.p, 'vigor', v.vigor) });
  card('PROCLAMATION', { text: (v) => `Whenever you play a card this turn, gain ${v.power} Might this turn.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'proclamation', v.power); g.t.procCard = c; } });
  card('PRISM_TURN', { text: (v) => `At the start of your turn, add ${v.draw} random colorless card to your hand.`, play: async (g, c, t, v) => g.addPw(g.p, 'prismTurn', v.draw) });

  // ---------- rare ----------
  card('ARMORY', { text: (v) => `Whenever you create a card, gain ${v.arsenal} Might.`, play: async (g, c, t, v) => g.addPw(g.p, 'armory', v.arsenal) });
  card('HAMMER_OUT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Temper ${v.base}. Tempers ${v.per} more for every other time you hit the enemy this turn.`,
    play: async (g, c, t, v) => { const before = t.hitsTurn || 0; await g.attack(t, v.dmg, 1, c); if (!g.over) await g.forge(v.base + v.per * before); } });
  card('FIRST_LIGHT', { text: (v) => `Draw ${plural(v.draw, 'card')}. Gain ${v.en} Energy. Gain ${glints(v.stars)}. Temper ${v.forge}.`,
    play: async (g, c, t, v) => { await g.drawCards(v.draw); g.gainEnergy(v.en); await g.gainStars(v.stars); await g.forge(v.forge); } });
  card('SKYFALL_VOLLEY', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. At the start of your turn, if this is in your Ash pile, play it.`, playFromAshAtTurnStart: true,
    play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('GIFT_BASKET', { text: (v) => `Add ${v.draw} random colorless cards to your hand.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.draw; i++) await g.create(colorless(g, false), 'hand'); } });
  card('FIRETAIL', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.weak} Sapped. Apply ${v.vul} Exposed.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await sapExpose(g, t, v); } });
  card('HARD_DESCENT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. Fill your hand with ${hdName('RUBBLE')}.`,
    play: async (g, c, t, v) => { await g.attackAll(v.dmg, 1, c); while (!g.over && g.hand.length < 10) await g.create(g.makeCard('RUBBLE', false), 'hand'); } });
  card('ROYAL_DECREE', { text: (v) => `Draw ${plural(v.draw, 'card')}. Choose a Skill in your hand and play it ${v.hits} times.`,
    play: async (g, c, t, v) => {
      await g.drawCards(v.draw);
      const xs = g.hand.filter((x) => CARDS[x.id].type === 'Skill');
      if (!xs.length || g.over) return;
      const [x] = await g.choose({ from: xs, n: 1, prompt: `Choose a Skill to play ${v.hits} times` });
      if (x) await g.playTimes(x, v.hits, null);
    } });
  card('FADING_SUN', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. ALL enemies lose ${v.loss} Might this turn.`,
    play: async (g, c, t, v) => { await g.attackAll(v.dmg, 1, c); if (!g.over) await lowerMight(g, v.loss); } });
  card('FORESEEN_END', { text: (v) => `Next turn, put ${plural(v.draw, 'card')} from your draw pile into your hand.`, play: async (g, c, t, v) => g.addPw(g.p, 'foreseen', v.draw) });
  card('HONOR_GUARD', { text: (v, f, c) => `Transform any number of cards in your hand into ${tokenName('THRALL_SHIELD', c)}.`,
    play: (g, c) => transformChosen(g, g.hand, g.hand.length, 0, 'THRALL_SHIELD', c.up, `Transform any number of cards into ${tokenName('THRALL_SHIELD', c)}`) });
  card('WELLSPRING', { text: (v) => `At the start of your turn, gain ${glints(v.starsPerTurn)}.`, play: async (g, c, t, v) => g.addPw(g.p, 'wellspring', v.starsPerTurn) });
  card('SKY_AUGER', { text: (v, f) => `Deal ${f.d(v.dmg)} damage X times. If X is ${v.en} or more, double it.`,
    play: async (g, c, t, v, x) => { const n = x >= v.en ? x * 2 : x; if (n > 0) await g.attack(t, v.dmg, n, c); } });
  card('OLD_MALLET', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Choose a colorless card in your hand. Add a copy of it to your hand.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 1, c);
      const xs = g.hand.filter((x) => CARDS[x.id].color === 'colorless');
      if (!xs.length || g.over) return;
      const [x] = await g.choose({ from: xs, n: 1, prompt: 'Choose a colorless card to copy' });
      if (x) await g.create(g.makeCard(x.id, x.up), 'hand');
    } });
  card('UNBOWED', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. At the end of your turn, if this is on top of your draw pile, play it.`, playFromDrawTopAtTurnEnd: true,
    play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('SO_DECREED', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Every ${v.draw} Skills you play in a turn, put this into your hand.`,
    play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('ROYAL_STARE', { text: (v) => `Whenever you attack an enemy, it loses ${v.loss} Might this turn.`, play: async (g, c, t, v) => g.addPw(g.p, 'royalStare', v.loss) });
  card('DENSE_SHELL', { text: (v) => `Gain ${v.plating} Plate.`, play: async (g, c, t, v) => g.addPw(g.p, 'plate', v.plating) });
  card('TRIBUTE', { text: (v) => `At the end of combat, gain ${v.gold} Gold.`, play: async (g, c, t, v) => g.addPw(g.p, 'tribute', v.gold) });
  card('HUNTING_EDGE', { text: (v) => `Temper ${v.forge}. The ${hdName('REGAL_BLADE')} now deals damage to ALL enemies.`,
    play: async (g, c, t, v) => { g.p.pw.huntingEdge = 1; await g.forge(v.forge); } });
  card('SEVEN_LIGHTS', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies ${v.hits} times.`, play: (g, c, t, v) => g.attackAll(v.dmg, v.hits, c) });
  card('BLADEMASTER', { text: (v) => `The ${hdName('REGAL_BLADE')} gains Replay ${v.swordSage}.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'blademaster', v.swordSage); for (const b of g.blades(true)) b.replay = (b.replay || 0) + v.swordSage; } });
  card('THE_ARMORER', { text: (v) => `Temper ${v.forge}.`, play: (g, c, t, v) => g.forge(v.forge) });
  card('IRON_RULE', { text: () => 'At the start of your turn, draw 1 card and Burn 1 card from your hand.', play: async (g) => g.addPw(g.p, 'ironRule', 1) });
  card('HOLLOW_FORM', { text: (v) => `End your turn. The first ${v.voidForm} cards you play each turn are free.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'hollowForm', v.voidForm); g.endTurnAfterPlay = true; } });

  // ---------- ancient ----------
  card('STARSTORM', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. Apply ${v.weak} Sapped and Exposed to ALL enemies.`,
    play: async (g, c, t, v) => { await g.attackAll(v.dmg, 1, c); for (const e of g.alive()) await sapExpose(g, e, v); } });
  card('THE_LOCKED_THRONE', { text: () => 'Whenever you play a card, gain 1 Glint.', play: async (g) => g.addPw(g.p, 'lockedThrone', 1) });

  // ---------- character ----------
  HD.CHARS.CROWNED = { id: 'CROWNED', name: 'The Crowned', color: 'crowned', hp: 75, gold: 99, energy: 3,
    deck: ['SMITE', 'SMITE', 'SMITE', 'SMITE', 'WARD_OFF', 'WARD_OFF', 'WARD_OFF', 'WARD_OFF', 'STARFALL', 'REVERE'],
    relic: 'STAR_CIRCLET', ancientRelic: 'FATED_CIRCLET', ancientCard: ['STARFALL', 'STARSTORM'], strike: 'SMITE', defend: 'WARD_OFF',
    blurb: 'Starts with Star Circlet: at the start of each combat, gain 3 Glints.' };

  // ---------- relics ----------
  const relic = (rarity, id, o) => { HD.RELICS[id] = Object.assign({ id, rarity, pool: 'crowned' }, o); };
  relic('Starter', 'STAR_CIRCLET', { name: 'Star Circlet', text: 'At the start of each combat, gain 3 Glints.', battleStart: (g) => g.gainStars(3) });
  relic('Starter', 'FATED_CIRCLET', { name: 'Fated Circlet', text: 'At the start of each combat, gain 7 Glints.', battleStart: (g) => g.gainStars(7) });
  relic('Common', 'SWORD_PRIMER', { name: 'Sword Primer', text: 'At the start of each combat, Temper 10.', battleStart: (g) => g.forge(10) });
  relic('Uncommon', 'COMET_DUST', { name: 'Comet Dust', text: 'For every 10 Glints spent, gain 10 Guard.',
    starsSpent: async (g, r, n) => { r.counter = (r.counter || 0) + n; while (r.counter >= 10) { r.counter -= 10; await g.gainBlock(10, false); } } });
  relic('Uncommon', 'CROWNSTONE', { name: 'Crownstone', text: 'The first time you create a card each turn, gain 4 Guard.',
    created: async (g) => { if (g.t.crownstone) return; g.t.crownstone = true; await g.gainBlock(4, false); } });
  relic('Rare', 'MOON_CAKE', { name: 'Moon Cake', text: 'At the end of your turn, gain 1 Glint.', turnEnd: (g) => g.gainStars(1) });
  relic('Rare', 'LITTLE_KING', { name: 'Little King', text: 'The first time you spend Glints each turn, gain 1 Might.',
    starsSpent: async (g) => { if (g.t.littleKing) return; g.t.littleKing = true; g.addPw(g.p, 'might', 1); } });
  relic('Rare', 'LEAVENED_DOUGH', { name: 'Leavened Dough', text: 'At the start of each combat, add 2 random colorless cards to your hand.',
    firstHand: async (g) => { for (let i = 0; i < 2; i++) await g.create(colorless(g, false), 'hand'); } });
  relic('Shop', 'MODEL_THRALL', { name: 'Model Thrall', text: 'Thrall cards deal double damage and give double Guard.' });

  // ---------- potions ----------
  const potion = (id, o) => { HD.POTIONS[id] = Object.assign({ id, pool: 'crowned', target: 'self' }, o); };
  potion('GLINT_FLASK', { name: 'Glint Flask', rarity: 'Common', text: 'Gain 3 Glints.', use: (g) => g.gainStars(3) });
  potion('ROYAL_NERVE', { name: 'Royal Nerve', rarity: 'Uncommon', text: 'Temper 15.', use: (g) => g.forge(15) });
  potion('STARBREW', { name: 'Starbrew', rarity: 'Rare', text: 'Add 3 Upgraded colorless cards to your hand.',
    use: async (g) => { for (let i = 0; i < 3; i++) await g.create(colorless(g, true), 'hand'); } });

  // ---------- powers, run by the engine hooks below ----------
  const pw = (g) => g.p.pw;
  HD.onEngine('turnStart', async (g) => {
    delete pw(g).reflect;
    for (const e of g.enemies) delete e.pw.usurped;
    if (pw(g).nextStars) { const n = pw(g).nextStars; delete pw(g).nextStars; await g.gainStars(n); }
    if (pw(g).wellspring) await g.gainStars(pw(g).wellspring);
    if (pw(g).bellows && !g.over) await g.forge(pw(g).bellows);
    for (let i = 0; i < (pw(g).prismTurn || 0) && !g.over; i++) await g.create(colorless(g, false), 'hand');
  });
  HD.onEngine('afterDraw', async (g) => {
    if (pw(g).foreseen && g.draw.length) {
      const n = Math.min(pw(g).foreseen, g.draw.length);
      for (const x of await g.choose({ from: g.draw.slice(), n, prompt: `Put ${plural(n, 'card')} into your hand` })) { g.draw.splice(g.draw.indexOf(x), 1); g.addToHand(x); }
    }
    delete pw(g).foreseen;
    for (let i = 0; i < (pw(g).ironRule || 0) && !g.over; i++) { await g.drawCards(1); await g.burnChosen(1); }
  });
  HD.onEngine('afterPlay', async (g, c) => {
    if (pw(g).lockedThrone) await g.gainStars(pw(g).lockedThrone);
    if (pw(g).proclamation && c !== g.t.procCard) g.addPw(g.p, 'mightTemp', pw(g).proclamation);
    // So Decreed: every 3 Skills played this turn, each copy in the draw or discard pile comes to your hand.
    const due = Math.floor(g.t.skills / DATA.SO_DECREED.v.draw);
    for (; (g.t.soDecreed || 0) < due; g.t.soDecreed = (g.t.soDecreed || 0) + 1) {
      for (const pile of [g.draw, g.discard]) for (const x of pile.filter((y) => y.id === 'SO_DECREED')) { pile.splice(pile.indexOf(x), 1); g.addToHand(x); }
    }
  });
  HD.onEngine('turnEnd', async (g) => {
    if (pw(g).farSpeck && g.t.cards >= DATA.FAR_SPECK.v.cardPlay) g.addPw(g.p, 'nextDraw', pw(g).farSpeck);
    delete pw(g).proclamation;
  });
  const starEvent = async (g) => { if (pw(g).eventHorizon) await hitAll(g, pw(g).eventHorizon); };
  HD.onEngine('starsGained', starEvent);
  HD.onEngine('starsSpent', async (g, n) => { await starEvent(g); if (pw(g).starborn && !g.over) await g.gainBlock(pw(g).starborn * n, false); });
  HD.onEngine('created', async (g, c) => {
    if (c.id === 'REGAL_BLADE' && pw(g).blademaster) c.replay = (c.replay || 0) + pw(g).blademaster;
    if (pw(g).armory) g.addPw(g.p, 'might', pw(g).armory);
    if (pw(g).nurseryCloud) await g.gainBlock(pw(g).nurseryCloud, false);
  });
  HD.onEngine('energySpent', async (g, n) => {
    if (!pw(g).circuit) return;
    g.circuitSpent = (g.circuitSpent || 0) + n;
    while (g.circuitSpent >= 4) { g.circuitSpent -= 4; g.gainEnergy(pw(g).circuit); }
  });
  HD.onEngine('combatWon', (g) => { if (pw(g).tribute) { g.run.gold += pw(g).tribute; g.say(`You collect ${pw(g).tribute} Gold in tribute.`); } });

  HD.DEBUFFS.add('usurped');
  Object.assign(HD.PW, {
    eventHorizon: { n: 'Event Horizon', t: 'buff', d: (a) => `Whenever you spend or gain Glints, deal ${a} damage to ALL enemies.` },
    starborn: { n: 'Starborn', t: 'buff', d: (a) => `Whenever you spend Glints, gain ${a} Guard for each Glint spent.` },
    bellows: { n: 'Bellows', t: 'buff', d: (a) => `At the start of your turn, Temper ${a}.` },
    wellspring: { n: 'Wellspring', t: 'buff', d: (a) => `At the start of your turn, gain ${a} Glint(s).` },
    prismTurn: { n: 'Prism Turn', t: 'buff', d: (a) => `At the start of your turn, add ${a} random colorless card(s) to your hand.` },
    armory: { n: 'Armory', t: 'buff', d: (a) => `Whenever you create a card, gain ${a} Might.` },
    nurseryCloud: { n: 'Nursery Cloud', t: 'buff', d: (a) => `Whenever you create a card, gain ${a} Guard.` },
    circuit: { n: 'Circuit', t: 'buff', d: (a) => `Every 4 Energy you spend, gain ${a} Energy.` },
    farSpeck: { n: 'Far Speck', t: 'buff', d: (a) => `If you play 5 or more cards in a turn, draw ${a} card(s) at the start of your next turn.` },
    riposte: { n: 'Riposte', t: 'buff', d: (a) => `The Regal Blade also gives ${a} Guard.` },
    huntingEdge: { n: 'Hunting Edge', t: 'buff', d: () => 'The Regal Blade deals damage to ALL enemies.' },
    blademaster: { n: 'Blademaster', t: 'buff', d: (a) => `The Regal Blade has Replay ${a}.` },
    royalStare: { n: 'Royal Stare', t: 'buff', d: (a) => `Whenever you attack an enemy, it loses ${a} Might this turn.` },
    ironRule: { n: 'Iron Rule', t: 'buff', d: (a) => `At the start of your turn, draw ${a} card(s) and Burn ${a} card(s) from your hand.` },
    hollowForm: { n: 'Hollow Form', t: 'buff', d: (a) => `The first ${a} cards you play each turn are free.` },
    lockedThrone: { n: 'The Locked Throne', t: 'buff', d: (a) => `Whenever you play a card, gain ${a} Glint(s).` },
    tribute: { n: 'Tribute', t: 'buff', d: (a) => `At the end of combat, gain ${a} Gold.` },
    proclamation: { n: 'Proclamation', t: 'buff', d: (a) => `Whenever you play a card this turn, gain ${a} Might this turn.` },
    reflect: { n: 'Mirror Guard', t: 'buff', d: () => 'Blocked attack damage is reflected to your attacker this turn.' },
    usurped: { n: 'Usurped', t: 'debuff', d: () => 'Takes double damage from the Regal Blade this turn.' },
    nextStars: { n: 'Glints next turn', t: 'buff', d: (a) => `Gain ${a} Glint(s) next turn.` },
    foreseen: { n: 'Foreseen End', t: 'buff', d: (a) => `Next turn, put ${a} card(s) from your draw pile into your hand.` },
  });
  HD.TERMS.Glint = 'A second resource beside Energy. Glints carry over between turns. Cards with a Glint cost need both.';
  HD.TERMS.Temper = 'Add damage to every Regal Blade. The first Temper in a combat creates one in your hand.';
})();

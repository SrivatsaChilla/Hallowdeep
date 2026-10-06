// The Wirebound: the fourth character built (the Defect). Costs, values, upgrades, keywords and targets come from
// HD.DEFECT_DATA (generated from the v0.111 data); text, play functions, relics and potions are here.
// Cells are Orbs (src/orbs.js), Prime is Channel, Release is Evoke, Tuning is Focus.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const DATA = HD.DEFECT_DATA['0.111'];
  const card = (id, o) => {
    const d = DATA[id];
    if (!d) throw new Error(`no Defect data for ${id}`);
    CARDS[id] = Object.assign({ id, color: d.rarity === 'Token' ? 'token' : 'wirebound', name: d.name, type: d.type, rarity: d.rarity, cost: d.cost,
      target: d.target, kw: d.kw, tags: d.tags, v: d.v, up: d.up }, d.upCost != null ? { upCost: d.upCost } : {}, d.upKw ? { upKw: d.upKw } : {}, o);
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const cells = (n, id) => `${n} ${HD.ORBS[id].name}`;
  // Card names in text use the HallowDeep name; the original-names mode swaps it with the rest of the text.
  const sName = (id) => CARDS[id].nameHD || CARDS[id].name;
  const hitAll = async (g, n) => { for (const e of g.alive()) { await g.damage(e, n, {}); if (g.over) return; } };
  const prime = async (g, id, n = 1) => { for (let i = 0; i < n && !g.over; i++) await g.channel(id); };
  const addStatus = async (g, id, n = 1, where = 'discard') => { for (let i = 0; i < n; i++) await g.create(g.makeCard(id, false), where); };
  const randomPower = (g) => g.makeCard(g.randomPoolCard((d) => d.type === 'Power'), false);
  const inPlay = (g) => (g && g.orbs ? g.orbs : null);
  // A "whenever you play a Power" power does not trigger for the card that gave it (a second copy still triggers the first).
  const justAdded = (g, c, k, n) => { g.t.added = Object.assign({}, g.t.added && g.t.added.c === c ? g.t.added : { c }, { [k]: n }); };
  const powerAmt = (g, c, k) => (g.p.pw[k] || 0) - (g.t.added && g.t.added.c === c ? g.t.added[k] || 0 : 0);

  // ---------- starter ----------
  card('POUND', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('CASING', { text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('ARC', { text: () => 'Prime 1 Bolt.', play: (g) => prime(g, 'BOLT') });
  card('DOUBLE_RELEASE', { text: () => 'Release your rightmost Cell twice.', play: (g) => g.evokeRight(2) });

  // ---------- tokens ----------
  card('DRAIN', { rarity: 'Status', color: 'status', text: (v) => `Whenever you draw this card, lose ${v.en} Energy.`,
    onDraw: (g, c) => { g.energy = Math.max(0, g.energy - HD.vals(c).en); }, play: async () => {} });
  card('BATTERY', { text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) });

  // ---------- common ----------
  card('BOLT_BALL', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Prime 1 Bolt.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await prime(g, 'BOLT'); } });
  card('CELL_VOLLEY', { text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage for each Primed Cell.${inPlay(g) ? ` (${g.orbs.length})` : ''}`,
    play: async (g, c, t, v) => { if (g.orbs.length) await g.attack(t, v.dmg, g.orbs.length, c); } });
  card('PIN_BEAM', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.vul} Exposed.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'exposed', v.vul); } });
  card('THRUSTER', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Add a ${sName('REELING')} to your discard pile.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await addStatus(g, 'REELING'); } });
  card('STORE_POWER', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Next turn, gain ${v.en} Energy.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'nextEnergy', v.en); } });
  card('PINCER', { text: (v, f, c, g) => `Deal ${f.d(v.dmg + ((g && g.pincer) || 0))} damage. ALL ${sName('PINCER')} cards deal ${v.inc} more damage this combat.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg + (g.pincer || 0), 1, c); g.pincer = (g.pincer || 0) + v.inc; } });
  card('RIME_SHOT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Prime 1 Rime.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await prime(g, 'RIME'); } });
  card('COMPILER', { text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage. Draw 1 card for each different Cell you have.${inPlay(g) ? ` (${g.uniqueOrbs()})` : ''}`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!g.over) await g.drawCards(g.uniqueOrbs()); } });
  card('COOL_LOGIC', { text: (v) => `Prime 1 Rime. Draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => { await prime(g, 'RIME'); await g.drawCards(v.draw); } });
  card('TUNED_POUND', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Gain ${v.focus} Tuning this turn.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'tuningTemp', v.focus); } });
  card('EYE_POKE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. If the enemy intends to attack, apply ${v.weak} Sapped.`,
    play: async (g, c, t, v) => { const atk = (g.intentOf(t).kinds || []).includes('attack'); await g.attack(t, v.dmg, 1, c); if (atk && t.alive) await g.apply(t, 'sapped', v.weak); } });
  card('GREASE_UP', { text: (v, f) => `Deal ${f.d(v.dmg)} damage ${v.hits} times. Add a ${sName('SLUDGE')} to your discard pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, v.hits, c); await addStatus(g, 'SLUDGE'); } });
  card('PROJECTION', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Put a card from your discard pile into your hand.`,
    play: async (g, c, t, v) => {
      await g.gainBlock(v.blk, true);
      if (!g.discard.length) return;
      const [x] = await g.choose({ from: g.discard.slice(), n: 1, prompt: 'Put a card into your hand' });
      if (x) { g.discard.splice(g.discard.indexOf(x), 1); g.addToHand(x); }
    } });
  card('QUICK_PATCH', { text: (v) => `Gain ${v.focus} Tuning this turn.`, play: async (g, c, t, v) => g.addPw(g.p, 'tuningTemp', v.focus) });
  card('HOP', { text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('BOLT_MAST', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. At the start of the next ${v.lightningRod} turns, Prime 1 Bolt.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'boltMast', v.lightningRod); } });
  card('ROLLING_POUND', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. This card costs 0 for the rest of combat.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); c.setCost = 0; } });
  card('SWEEP_RAY', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. Draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => { await g.attackAll(v.dmg, 1, c); if (!g.over) await g.drawCards(v.draw); } });
  card('OVERDRIVE', { text: (v) => `Gain ${v.en} Energy. Add a ${sName('DRAIN')} to your discard pile.`, play: async (g, c, t, v) => { g.gainEnergy(v.en); await addStatus(g, 'DRAIN'); } });
  card('CLAMOR', { text: (v, f) => `Deal ${f.d(v.dmg)} damage twice. Play a random Attack from your draw pile.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 2, c);
      const xs = g.draw.filter((x) => CARDS[x.id].type === 'Attack');
      if (!xs.length || g.over) return;
      const x = g.rng.pick(xs); g.draw.splice(g.draw.indexOf(x), 1); await g.autoPlay(x, {});
    } });

  // ---------- uncommon ----------
  card('STARTUP', { text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('HEAVY_FRAME', { text: (v) => `Lose ${plural(v.orbSlots, 'Cell Slot')}. Gain ${v.str} Might. Gain ${v.dex} Poise.`,
    play: async (g, c, t, v) => { g.addOrbSlots(-v.orbSlots); g.addPw(g.p, 'might', v.str); g.addPw(g.p, 'poise', v.dex); } });
  card('EXTRA_CELLS', { text: (v) => `Gain ${plural(v.hits, 'Cell Slot')}.`, play: async (g, c, t, v) => g.addOrbSlots(v.hits) });
  card('WILD_CELL', { text: (v) => `Prime ${v.hits} random Cell${v.hits === 1 ? '' : 's'}.`, play: async (g, c, t, v) => { for (let i = 0; i < v.hits && !g.over; i++) await g.channelRandom(); } });
  card('COLD_FRONT', { text: () => 'Prime 1 Rime for each enemy.', play: (g) => prime(g, 'RIME', g.alive().length) });
  card('COMPRESS', { text: (v, f, c) => `Gain ${f.b(v.blk)} Guard. Transform all Status cards in your hand into ${sName('BATTERY')}${c && c.up ? '+' : ''}.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); for (const x of g.hand.filter((y) => CARDS[y.id].type === 'Status')) await g.transformInCombat(x, 'BATTERY', c.up); } });
  card('GATHERING_MURK', { text: (v, f, c) => `Prime 1 Murk. Trigger the passive of all Murk Cells${c && c.up ? ' twice' : ''}.`,
    play: async (g, c) => { await prime(g, 'MURK'); for (let i = 0; i < (c.up ? 2 : 1); i++) for (const o of g.orbs.filter((x) => x.id === 'MURK')) await g.orbPassive(o); } });
  card('DOUBLER', { text: () => 'Double your Energy.', play: async (g) => g.gainEnergy(g.energy) });
  card('RAVENOUS', { text: () => 'The first time you play a 0-cost Attack each turn, return it to your hand.', play: async (g) => g.addPw(g.p, 'ravenous', 1) });
  card('GRIND_ON', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Add 2 ${sName('GASH')} to your discard pile.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await addStatus(g, 'GASH', 2); } });
  card('FAST_LANE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. If you have played fewer than ${v.playMax} other cards this turn, draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { const before = g.t.cards - 1; await g.attack(t, v.dmg, 1, c); if (!g.over && before < v.playMax) await g.drawCards(v.draw); } });
  card('FUSE', { text: () => 'Prime 1 Flux.', play: (g) => prime(g, 'FLUX') });
  card('ICE_SHELF', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Prime 2 Rime.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await prime(g, 'RIME', 2); } });
  card('SHARDCRAFT', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Prime 1 Shard.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await prime(g, 'SHARD'); } });
  card('SLEET', { text: (v) => `At the end of your turn, if you have Rime, deal ${v.hailstorm} damage to ALL enemies.`, play: async (g, c, t, v) => g.addPw(g.p, 'sleet', v.hailstorm) });
  card('SECOND_PASS', { text: (v) => `The first time you draw a Status each turn, draw ${plural(v.iteration, 'card')}.`, play: async (g, c, t, v) => g.addPw(g.p, 'secondPass', v.iteration) });
  card('CYCLE', { text: (v) => `At the start of your turn, trigger the passive of your rightmost Cell${v.loop > 1 ? ` ${v.loop} times` : ''}.`, play: async (g, c, t, v) => g.addPw(g.p, 'cycle', v.loop) });
  card('BLANK_OUT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.weak} Sapped. Prime 1 Murk.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'sapped', v.weak); await prime(g, 'MURK'); } });
  card('REDLINE', { text: (v) => `Draw ${plural(v.draw, 'card')}. Add a ${sName('SCORCH')} to your discard pile.`, play: async (g, c, t, v) => { await g.drawCards(v.draw); await addStatus(g, 'SCORCH'); } });
  card('REFRACTOR', { text: (v, f) => `Deal ${f.d(v.dmg)} damage twice. Prime ${v.hits} Shard.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 2, c); await prime(g, 'SHARD', v.hits); } });
  card('PISTON_FIST', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw ${plural(v.draw, 'card')}. Whenever you create a Status, this costs 1 less until played.`,
    play: async (g, c, t, v) => { c.bonusCost = 0; await g.attack(t, v.dmg, 1, c); if (!g.over) await g.drawCards(v.draw); } });
  card('SALVAGE', { text: (v) => `Burn a card. Next turn, gain ${v.en} Energy.`, play: async (g, c, t, v) => { await g.burnChosen(1); g.addPw(g.p, 'nextEnergy', v.en); } });
  card('SCRAP_PICK', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw ${plural(v.draw, 'card')}. Discard the ones drawn this way that do not cost 0.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 1, c);
      const drawn = []; for (let i = 0; i < v.draw && !g.over; i++) { const x = await g.drawOne(); if (!x) break; drawn.push(x); }
      for (const x of drawn) { if (g.over) return; if (g.hand.includes(x) && g.costOf(x) !== 0) await g.discardFromHand(x); }
    } });
  card('MURK_GUARD', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Prime 1 Murk.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await prime(g, 'MURK'); } });
  card('SCAN', { text: (v) => `Draw ${plural(v.draw, 'card')}.`, play: (g, c, t, v) => g.drawCards(v.draw) });
  card('CHIMNEY', { text: (v) => `Whenever you create a Status, deal ${v.smokestack} damage to ALL enemies.`, play: async (g, c, t, v) => g.addPw(g.p, 'chimney', v.smokestack) });
  card('THUNDERHEAD', { text: (v) => `Whenever you play a Power, Prime ${v.storm} Bolt.`, play: async (g, c, t, v) => { g.addPw(g.p, 'thunderhead', v.storm); justAdded(g, c, 'thunderhead', v.storm); } });
  card('SIDE_PROCESS', { text: () => 'Whenever you play a Power, gain 1 Energy.', play: async (g, c) => { g.addPw(g.p, 'sideProcess', 1); justAdded(g, c, 'sideProcess', 1); } });
  card('SPLIT_APART', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. If this kills an enemy, gain ${v.en} Energy.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!t.alive && !t.fled) g.gainEnergy(v.en); } });
  card('SYNC_UP', { text: (v, f, c, g) => `Gain ${v.per} Tuning this turn for each different Cell you have.${inPlay(g) ? ` (${g.uniqueOrbs()})` : ''}`,
    play: async (g, c, t, v) => { const n = v.per * g.uniqueOrbs(); if (n) g.addPw(g.p, 'tuningTemp', n); } });
  card('ASSEMBLY', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. The next Power you play costs 0.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'freePower', 1); } });
  card('SQUALL', { text: (v, f, c) => `Prime X${c && c.up ? '+1' : ''} Bolt.`, play: (g, c, t, v, x) => prime(g, 'BOLT', x + (c.up ? 1 : 0)) });
  card('ARC_COIL', { text: (v, f, c) => `Deal ${f.d(v.dmg)} damage. Trigger all your Bolts against the enemy${c && c.up ? ' twice' : ''}.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); for (let i = 0; i < (c.up ? 2 : 1); i++) for (const o of g.orbs.filter((x) => x.id === 'BOLT')) if (t.alive) await g.orbPassive(o, t); } });
  card('RUMBLE', { text: (v) => `Whenever you Release a Bolt, deal ${v.thunder} more damage to the enemy it hits.`, play: async (g, c, t, v) => g.addPw(g.p, 'rumble', v.thunder) });
  card('HISS', { text: () => 'Add a random Power to your hand. It is free to play this turn.',
    play: async (g) => { const x = randomPower(g); x.freeTurn = true; await g.create(x, 'hand'); } });

  // ---------- rare ----------
  card('LEARNING_POUND', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Add a copy of this card that costs 0 to your discard pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); const x = g.makeCard(c.id, c.up); x.setCost = 0; await g.create(x, 'discard'); } });
  card('GATHER_ROUND', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Put ALL cards that cost 0 from your discard pile into your hand.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); for (const x of g.discard.filter((y) => g.costOf(y) === 0)) { g.discard.splice(g.discard.indexOf(x), 1); g.addToHand(x); } } });
  card('FAILSAFE', { text: (v) => `The next ${v.buffer > 1 ? `${v.buffer} times` : 'time'} you would lose HP, you don't.`, play: async (g, c, t, v) => g.addPw(g.p, 'buffer', v.buffer) });
  card('HUNGRY_MURK', { text: (v) => `Prime ${v.hits} Murk. At the end of your turn, Release your leftmost Cell.`,
    play: async (g, c, t, v) => { await prime(g, 'MURK', v.hits); g.addPw(g.p, 'hungryMurk', v.consumingShadow); } });
  card('COOLANT_LINE', { text: (v) => `At the start of your turn, gain ${v.coolant} Guard for each different Cell you have.`, play: async (g, c, t, v) => g.addPw(g.p, 'coolantLine', v.coolant) });
  card('DREAMING_ENGINE', { text: () => 'At the start of your turn, add a random Power to your hand.', play: async (g) => g.addPw(g.p, 'dreamingEngine', 1) });
  card('RETUNE', { text: (v) => `Gain ${v.focus} Tuning.`, play: async (g, c, t, v) => g.addPw(g.p, 'tuning', v.focus) });
  card('MIRROR_FORM', { text: () => 'The first card you play each turn is played an extra time.', play: async (g) => g.addPw(g.p, 'echoForm', 1) });
  card('SCRAP_CANNON', { text: (v, f) => `Burn ALL your Status cards. Deal ${f.d(v.dmg)} damage to a random enemy for each card Burned.`,
    play: async (g, c, t, v) => {
      let n = 0;
      for (const pile of [g.hand, g.draw, g.discard]) for (const x of pile.filter((y) => CARDS[y.id].type === 'Status')) { pile.splice(pile.indexOf(x), 1); await g.burn(x); n++; }
      for (let i = 0; i < n && !g.over; i++) { const e = g.randomEnemy(); if (e) await g.attack(e, v.dmg, 1, c); }
    } });
  card('SELF_IMPROVE', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. This card gains ${v.inc} Guard for good.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); c.grow = (c.grow || 0) + v.inc; if (c.src) c.src.grow = (c.src.grow || 0) + v.inc; } });
  card('SPIRAL_DRILL', { text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage for each Energy spent on other cards this turn.${g && g.t ? ` (${g.t.energySpent})` : ''}`,
    play: async (g, c, t, v, x) => { const n = g.t.energySpent; if (n) await g.attack(t, v.dmg, n, c); } });
  card('OVERBEAM', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. Lose ${v.focus} Tuning this turn.`,
    play: async (g, c, t, v) => { await g.attackAll(v.dmg, 1, c); g.addPw(g.p, 'tuningDown', v.focus); } });
  card('RIME_LANCE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Prime ${v.hits} Rime.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await prime(g, 'RIME', v.hits); } });
  card('SELF_STUDY', { text: (v) => `At the start of your turn, draw ${plural(v.draw, 'additional card')}.`, play: async (g, c, t, v) => g.addPw(g.p, 'selfStudy', v.draw) });
  card('CRASHING_POUND', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Prime 3 Flux.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await prime(g, 'FLUX', 3); } });
  card('RETROFIT', { text: (v) => `Gain ${plural(v.hits, 'Cell Slot')}. Draw ${plural(v.draw, 'card')}. This card costs 1 more this combat.`,
    play: async (g, c, t, v) => { g.addOrbSlots(v.hits); await g.drawCards(v.draw); c.bonusCost = (c.bonusCost || 0) + 1; } });
  card('CHAIN_RELEASE', { text: (v, f, c) => `Release your rightmost Cell X${c && c.up ? '+1' : ''} times.`, play: async (g, c, t, v, x) => { const n = x + (c.up ? 1 : 0); if (n > 0) await g.evokeRight(n); } });
  card('SPECTRUM', { text: () => 'Prime 1 Bolt. Prime 1 Rime. Prime 1 Murk.', play: async (g) => { await prime(g, 'BOLT'); await prime(g, 'RIME'); await prime(g, 'MURK'); } });
  card('RESTART', { text: (v) => `Shuffle ALL your cards into your draw pile. Draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { g.draw.push(...g.hand.splice(0), ...g.discard.splice(0)); g.rng.shuffle(g.draw); await g.drawCards(v.draw); } });
  card('OVERLOAD', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. Release all of your Cells twice.`,
    play: async (g, c, t, v) => { await g.attackAll(v.dmg, 1, c); for (const o of g.orbs.slice()) { if (g.over) return; await g.evokeOrb(o, 2); } } });
  card('AMPLIFY', { text: () => 'The next Power you play is played an extra time.', play: async (g, c, t, v) => g.addPw(g.p, 'signalBoost', v.signalBoost) });
  card('SHARD_LATHE', { text: (v, f, c) => `${c && c.up ? 'Prime 1 Shard. ' : ''}At the start of your turn, Prime 1 Shard.`,
    play: async (g, c) => { if (c.up) await prime(g, 'SHARD'); g.addPw(g.p, 'shardLathe', 1); } });
  card('MELTDOWN', { text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) });
  card('JUNK_ALCHEMY', { text: () => 'Whenever you create a Status, Prime 1 random Cell.', play: async (g) => g.addPw(g.p, 'junkAlchemy', 1) });
  card('STORM_BANK', { text: (v, f, c, g) => `Prime Bolt equal to the Bolts already Primed this combat.${g && g.rs ? ` (${g.rs.channeledBOLT || 0})` : ''}`,
    play: (g) => prime(g, 'BOLT', g.rs.channeledBOLT || 0) });

  // ---------- ancient ----------
  card('FIXED_BELIEF', { text: (v) => `Gain ${v.focus} Tuning. At the start of your turn, lose 1 Tuning.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'tuning', v.focus); g.addPw(g.p, 'fixedBelief', v.biasedCognition); } });
  card('FOURFOLD_RELEASE', { text: (v) => `Release your rightmost Cell ${v.hits} times.`, play: (g, c, t, v) => g.evokeRight(v.hits) });

  // ---------- co-op only ----------
  for (const id of ['POWER_SHARE', 'DEEP_SLEEP', 'KICK_START', 'MIMIC_ROUTINE', 'ALL_HANDS']) card(id, { coop: true, text: () => 'Co-op only.', play: async () => {} });

  // ---------- character ----------
  HD.CHARS.WIREBOUND = { id: 'WIREBOUND', name: 'The Wirebound', color: 'wirebound', hp: 75, gold: 99, energy: 3, orbSlots: 3,
    deck: ['POUND', 'POUND', 'POUND', 'POUND', 'CASING', 'CASING', 'CASING', 'CASING', 'ARC', 'DOUBLE_RELEASE'],
    relic: 'SPLIT_CORE', ancientRelic: 'CHARGED_CORE', ancientCard: ['DOUBLE_RELEASE', 'FOURFOLD_RELEASE'], strike: 'POUND', defend: 'CASING',
    blurb: 'Starts with Split Core: at the start of each combat, Prime 1 Bolt.' };

  // ---------- relics ----------
  const relic = (rarity, id, o) => { HD.RELICS[id] = Object.assign({ id, rarity, pool: 'wirebound' }, o); };
  relic('Starter', 'SPLIT_CORE', { name: 'Split Core', text: 'At the start of each combat, Prime 1 Bolt.', battleStart: (g) => g.channel('BOLT') });
  relic('Starter', 'CHARGED_CORE', { name: 'Charged Core', text: 'At the start of each combat, Prime 3 Bolt. Bolt deals 1 additional damage.', battleStart: (g) => prime(g, 'BOLT', 3) });
  relic('Common', 'MEMORY_DISC', { name: 'Memory Disc', text: 'Start each combat with 1 Tuning.', battleStart: async (g) => g.addPw(g.p, 'tuning', 1) });
  relic('Uncommon', 'GILT_WIRING', { name: 'Gilt Wiring', text: 'Your rightmost Cell triggers its passive an additional time.' });
  relic('Uncommon', 'MURK_SEED', { name: 'Murk Seed', text: 'At the start of each combat, Prime 1 Murk.', battleStart: (g) => g.channel('MURK') });
  relic('Rare', 'FEELING_GEAR', { name: 'Feeling Gear', text: 'If you lost HP during the previous turn, trigger the passive of all Cells at the start of your turn.',
    turnStart: async (g) => { if (g.turn > 1 && g.lastHurtTurn === g.turn - 1) await g.orbPassives('all'); } });
  relic('Rare', 'TICK_COUNTER', { name: 'Tick Counter', text: 'The first time you Prime 7 Cells each combat, deal 30 damage to ALL enemies.',
    channeled: async (g) => { if (g.rs.tick || (g.rs.channeled || 0) < 7) return; g.rs.tick = true; await hitAll(g, 30); } });
  relic('Rare', 'RESERVE_PACK', { name: 'Reserve Pack', text: 'At the start of each combat, add 2 zero-cost cards from your draw pile to your hand.',
    battleStart: async (g) => { for (const x of g.rng.shuffle(g.draw.filter((y) => g.costOf(y) === 0)).slice(0, 2)) { g.draw.splice(g.draw.indexOf(x), 1); g.addToHand(x); } } });
  relic('Shop', 'RUNE_BANK', { name: 'Rune Bank', text: 'Start each combat with 3 additional Cell Slots.', battleStart: async (g) => g.addOrbSlots(3) });

  // ---------- potions ----------
  const potion = (id, o) => { HD.POTIONS[id] = Object.assign({ id, pool: 'wirebound', target: 'self' }, o); };
  potion('TUNING_DRAUGHT', { name: 'Tuning Draught', rarity: 'Common', text: 'Gain 2 Tuning.', use: async (g) => g.addPw(g.p, 'tuning', 2) });
  potion('CELL_DRAUGHT', { name: 'Cell Draught', rarity: 'Uncommon', text: 'Gain 2 Cell Slots.', use: async (g) => g.addOrbSlots(2) });
  potion('MURK_ESSENCE', { name: 'Murk Essence', rarity: 'Rare', text: 'Prime a Murk for each of your Cell Slots.', use: (g) => prime(g, 'MURK', g.orbSlots) });

  // ---------- powers, run by the engine hooks below ----------
  const pw = (g) => g.p.pw;
  HD.onEngine('turnStart', async (g) => {
    if (pw(g).fixedBelief) g.addPw(g.p, 'tuning', -pw(g).fixedBelief);
    if (pw(g).selfStudy) g.extraDrawThisTurn += pw(g).selfStudy;
    if (pw(g).boltMast) { g.addPw(g.p, 'boltMast', -1); await prime(g, 'BOLT'); }
    for (let i = 0; i < (pw(g).shardLathe || 0) && !g.over; i++) await prime(g, 'SHARD');
    for (let i = 0; i < (pw(g).cycle || 0) && !g.over; i++) if (g.orbs.length) await g.orbPassive(g.orbs[0]);
    if (pw(g).coolantLine && g.uniqueOrbs()) await g.gainBlock(pw(g).coolantLine * g.uniqueOrbs(), false);
    for (let i = 0; i < (pw(g).dreamingEngine || 0) && !g.over; i++) await g.create(randomPower(g), 'hand');
  });
  HD.onEngine('turnEnd', async (g) => {
    if (pw(g).sleet && g.orbs.some((o) => o.id === 'RIME')) await hitAll(g, pw(g).sleet);
    for (let i = 0; i < (pw(g).hungryMurk || 0) && !g.over; i++) await g.evokeLeft();
  });
  HD.onEngine('afterPlay', async (g, c, d, paid) => {
    if (d.type === 'Power') { await prime(g, 'BOLT', powerAmt(g, c, 'thunderhead')); g.gainEnergy(powerAmt(g, c, 'sideProcess')); }
    // Feral: the first 0-cost Attacks each turn come back to your hand.
    if (pw(g).ravenous && d.type === 'Attack' && paid === 0 && d.cost !== 'X' && (g.t.ravenous || 0) < pw(g).ravenous && g.discard.includes(c)) {
      g.t.ravenous = (g.t.ravenous || 0) + 1; g.discard.splice(g.discard.indexOf(c), 1); g.addToHand(c);
    }
  });
  HD.onEngine('statusCreated', async (g) => {
    for (const x of [...g.hand, ...g.draw, ...g.discard].filter((y) => y.id === 'PISTON_FIST')) x.bonusCost = (x.bonusCost || 0) - 1;
    if (pw(g).chimney) await hitAll(g, pw(g).chimney);
    for (let i = 0; i < (pw(g).junkAlchemy || 0) && !g.over; i++) await g.channelRandom();
  });
  HD.onEngine('drawn', async (g, c) => {
    if (!pw(g).secondPass || g.t.secondPass || CARDS[c.id].type !== 'Status' || g.phase !== 'player') return;
    g.t.secondPass = true; await g.drawCards(pw(g).secondPass);
  });

  Object.assign(HD.PW, {
    boltMast: { n: 'Bolt Mast', t: 'buff', d: (a) => `At the start of your next ${a} turn(s), Prime 1 Bolt.` },
    ravenous: { n: 'Ravenous', t: 'buff', d: (a) => `The first ${a} time(s) you play a 0-cost Attack each turn, return it to your hand.` },
    sleet: { n: 'Sleet', t: 'buff', d: (a) => `At the end of your turn, if you have Rime, deal ${a} damage to ALL enemies.` },
    secondPass: { n: 'Second Pass', t: 'buff', d: (a) => `The first time you draw a Status each turn, draw ${a} card(s).` },
    cycle: { n: 'Cycle', t: 'buff', d: (a) => `At the start of your turn, trigger your rightmost Cell's passive ${a} time(s).` },
    chimney: { n: 'Chimney', t: 'buff', d: (a) => `Whenever you create a Status, deal ${a} damage to ALL enemies.` },
    thunderhead: { n: 'Thunderhead', t: 'buff', d: (a) => `Whenever you play a Power, Prime ${a} Bolt.` },
    sideProcess: { n: 'Side Process', t: 'buff', d: (a) => `Whenever you play a Power, gain ${a} Energy.` },
    freePower: { n: 'Assembly', t: 'buff', d: (a) => `The next ${a} Power(s) you play cost 0.` },
    rumble: { n: 'Rumble', t: 'buff', d: (a) => `Whenever you Release a Bolt, deal ${a} more damage to the enemy it hits.` },
    hungryMurk: { n: 'Hungry Murk', t: 'buff', d: (a) => `At the end of your turn, Release your ${a} leftmost Cell(s).` },
    coolantLine: { n: 'Coolant Line', t: 'buff', d: (a) => `At the start of your turn, gain ${a} Guard for each different Cell you have.` },
    dreamingEngine: { n: 'Dreaming Engine', t: 'buff', d: (a) => `At the start of your turn, add ${a} random Power(s) to your hand.` },
    echoForm: { n: 'Mirror Form', t: 'buff', d: (a) => `The first ${a} card(s) you play each turn are played an extra time.` },
    selfStudy: { n: 'Self Study', t: 'buff', d: (a) => `At the start of your turn, draw ${a} additional card(s).` },
    signalBoost: { n: 'Amplify', t: 'buff', d: (a) => `Your next ${a} Power(s) are played an extra time.` },
    shardLathe: { n: 'Shard Lathe', t: 'buff', d: (a) => `At the start of your turn, Prime ${a} Shard.` },
    junkAlchemy: { n: 'Junk Alchemy', t: 'buff', d: (a) => `Whenever you create a Status, Prime ${a} random Cell(s).` },
    fixedBelief: { n: 'Fixed Belief', t: 'debuff', d: (a) => `At the start of your turn, lose ${a} Tuning.` },
  });
})();

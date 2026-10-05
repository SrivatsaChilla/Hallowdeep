// The Veiled: the second character. Cards, relics and potions follow the v0.111 data (HP, costs, damage, upgrades).
// Names and text are HallowDeep's own; HD.ORIGINAL maps them back to the original game's names.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const card = (id, o) => { CARDS[id] = Object.assign({ id, color: 'veiled', target: 'self', v: {}, up: {}, kw: [], tags: [] }, o); };
  const atk = (id, o) => card(id, Object.assign({ type: 'Attack', target: 'enemy' }, o));
  const skl = (id, o) => card(id, Object.assign({ type: 'Skill' }, o));
  const pow = (id, o) => card(id, Object.assign({ type: 'Power' }, o));
  const toxAll = async (g, n) => { for (const e of g.alive()) await g.applyToxin(e, n); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // ---------- starter ----------
  atk('JAB', { name: 'Jab', rarity: 'Basic', cost: 1, tags: ['Cut'], v: { dmg: 6 }, up: { dmg: 3 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  skl('EVADE', { name: 'Evade', rarity: 'Basic', cost: 1, tags: ['Brace'], v: { blk: 5 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  atk('HAMSTRING', { name: 'Hamstring', rarity: 'Basic', cost: 0, v: { dmg: 3, weak: 1 }, up: { dmg: 1, weak: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.weak} Sapped.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'sapped', v.weak); } });
  skl('ENDURE', { name: 'Endure', rarity: 'Basic', cost: 1, v: { blk: 8 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. Discard 1 card.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.discardChoice(1); } });

  // ---------- Sliver (Shiv) ----------
  card('SLIVER', { name: 'Sliver', type: 'Attack', rarity: 'Token', color: 'token', cost: 0, target: 'enemy', kw: ['Burn'], tags: ['Shiv'], v: { dmg: 4 }, up: { dmg: 2 },
    text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage${g && g.p && g.p.pw.knifeWheel ? ' to ALL enemies' : ''}.`,
    play: (g, c, t, v) => (g.p.pw.knifeWheel ? g.attackAll(v.dmg, 1, c) : g.attack(t, v.dmg, 1, c)) });

  // ---------- common attacks ----------
  atk('KNIFE_FAN', { name: 'Knife Fan', rarity: 'Common', cost: 1, target: 'all', v: { dmg: 4 }, up: { dmg: 2 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies twice.`, play: (g, c, t, v) => g.attackAll(v.dmg, 2, c) });
  atk('TOSS_BLADE', { name: 'Toss Blade', rarity: 'Common', cost: 1, v: { dmg: 9 }, up: { dmg: 3 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw 1 card. Discard 1 card.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (g.over) return; await g.drawCards(1); await g.discardChoice(1); } });
  atk('TUMBLE_CUT', { name: 'Tumble Cut', rarity: 'Common', cost: 1, target: 'all', kw: ['Furtive'], v: { dmg: 7 }, up: { dmg: 2 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies.`, play: (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  atk('OPENING_JAB', { name: 'Opening Jab', rarity: 'Common', cost: 1, tags: ['Cut'], v: { dmg: 3, shivs: 2 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Add ${plural(v.shivs, 'Sliver')} to your hand.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addSlivers(v.shivs); } });
  atk('VENOM_STAB', { name: 'Venom Stab', rarity: 'Common', cost: 1, v: { dmg: 6, tox: 3 }, up: { dmg: 2, tox: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.tox} Toxin.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.applyToxin(t, v.tox); } });
  atk('PROWLER', { name: 'Prowler', rarity: 'Common', cost: 2, v: { dmg: 15, draw: 2 }, up: { dmg: 5 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage. Next turn, draw ${v.draw} cards.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'nextDraw', v.draw); } });
  atk('REBOUND', { name: 'Rebound', rarity: 'Common', cost: 2, target: 'self', kw: ['Furtive'], v: { dmg: 3, hits: 4 }, up: { hits: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to a random enemy ${v.hits} times.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.hits && !g.over; i++) { const e = g.randomEnemy(); if (e) await g.attack(e, v.dmg, 1, c); } } });
  atk('NICK', { name: 'Nick', rarity: 'Common', cost: 0, v: { dmg: 6 }, up: { dmg: 3 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  atk('LOW_BLOW', { name: 'Low Blow', rarity: 'Common', cost: 1, v: { dmg: 8, weak: 1 }, up: { dmg: 2, weak: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.weak} Sapped.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'sapped', v.weak); } });

  // ---------- common skills ----------
  skl('READ_AHEAD', { name: 'Read Ahead', rarity: 'Common', cost: 0, v: { dex: 2 }, up: { dex: 2 }, text: (v) => `Gain ${v.dex} Poise this turn.`, play: async (g, c, t, v) => g.addPw(g.p, 'poiseTemp', v.dex) });
  skl('HANDSPRING', { name: 'Handspring', rarity: 'Common', cost: 1, v: { blk: 5, draw: 2 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. Draw ${v.draw} cards.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.drawCards(v.draw); } });
  skl('KNIFE_FLURRY', { name: 'Knife Flurry', rarity: 'Common', cost: 1, kw: ['Burn'], v: { draw: 3 }, up: { draw: 1 }, text: (v) => `Add ${plural(v.draw, 'Sliver')} to your hand.`, play: async (g, c, t, v) => g.addSlivers(v.draw) });
  skl('CLOAK_KNIFE', { name: 'Cloak and Knife', rarity: 'Common', cost: 1, v: { blk: 6, draw: 1 }, up: { draw: 1 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. Add ${plural(v.draw, 'Sliver')} to your hand.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addSlivers(v.draw); } });
  skl('LETHAL_DOSE', { name: 'Lethal Dose', rarity: 'Common', cost: 1, target: 'enemy', v: { tox: 5 }, up: { tox: 2 }, text: (v) => `Apply ${v.tox} Toxin.`, play: (g, c, t, v) => g.applyToxin(t, v.tox) });
  skl('PARRY', { name: 'Parry', rarity: 'Common', cost: 0, v: { blk: 4 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  skl('DUCK_ROLL', { name: 'Duck and Roll', rarity: 'Common', cost: 1, v: { blk: 4 }, up: { blk: 2 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. Next turn, gain ${v.blk} Guard.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'nextBlock', g.blockPreview(v.blk, c)); } });
  skl('KEENING', { name: 'Keening', rarity: 'Common', cost: 1, target: 'all', kw: ['Burn'], v: { loss: 6 }, up: { loss: 2 }, text: (v) => `ALL enemies lose ${v.loss} Might this turn.`,
    play: async (g, c, t, v) => { for (const e of g.alive()) await g.apply(e, 'mightDown', v.loss); } });
  skl('READY_UP', { name: 'Ready Up', rarity: 'Common', cost: 0, v: { draw: 1 }, up: { draw: 1 }, text: (v) => `Draw ${plural(v.draw, 'card')}. Discard ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { await g.drawCards(v.draw); await g.discardChoice(v.draw); } });
  skl('ADDER_BITE', { name: 'Adder Bite', rarity: 'Common', cost: 2, target: 'enemy', kw: ['Retain'], v: { tox: 7 }, up: { tox: 3 }, text: (v) => `Apply ${v.tox} Toxin.`, play: (g, c, t, v) => g.applyToxin(t, v.tox) });
  skl('SLIP_AWAY', { name: 'Slip Away', rarity: 'Common', cost: 2, kw: ['Furtive'], v: { blk: 6 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });

  // ---------- uncommon attacks ----------
  atk('BACK_KNIFE', { name: 'Back Knife', rarity: 'Uncommon', cost: 0, kw: ['Burn', 'Opening'], v: { dmg: 11 }, up: { dmg: 4 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  atk('DART_IN', { name: 'Dart In', rarity: 'Uncommon', cost: 2, v: { dmg: 10, blk: 10 }, up: { dmg: 3, blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. Deal ${f.d(v.dmg)} damage.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.attack(t, v.dmg, 1, c); } });
  atk('RINGING_SLASH', { name: 'Ringing Slash', rarity: 'Uncommon', cost: 1, target: 'all', v: { dmg: 10 }, up: { dmg: 3 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. Repeat for each enemy killed.`,
    play: async (g, c, t, v) => {
      for (let i = 0; i < 20 && !g.over; i++) { const before = g.alive().length; await g.attackAll(v.dmg, 1, c); if (g.alive().length >= before || !g.alive().length) break; }
    } });
  atk('COUP', { name: 'Coup', rarity: 'Uncommon', cost: 1, v: { dmg: 6 }, up: { dmg: 2 },
    text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage for each Attack already played this turn.${g && g.t ? ` (${g.t.attacks})` : ''}`,
    play: async (g, c, t, v) => { const n = g.t.attacks - 1; if (n > 0) await g.attack(t, v.dmg, n, c); } });
  atk('DARTS', { name: 'Darts', rarity: 'Uncommon', cost: 1, v: { dmg: 5 }, up: { dmg: 2 },
    text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage for each Skill in your hand.${g && g.hand ? ` (${g.hand.filter((x) => CARDS[x.id].type === 'Skill').length})` : ''}`,
    play: async (g, c, t, v) => { const n = g.hand.filter((x) => CARDS[x.id].type === 'Skill').length; if (n) await g.attack(t, v.dmg, n, c); } });
  atk('LAST_RITES', { name: 'Last Rites', rarity: 'Uncommon', cost: 1, v: { base: 9, per: 4 }, up: { base: 2, per: 1 },
    text: (v, f, c, g) => `Deal ${f.d(v.base + v.per * ((g && g.t && g.t.discarded) || 0))} damage. Deals ${v.per} more for each card discarded this turn.`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * (g.t.discarded || 0), 1, c) });
  atk('NEEDLEPOINT', { name: 'Needlepoint', rarity: 'Uncommon', cost: 3, v: { dmg: 15 }, up: { dmg: 4 }, costFn: (g, c, k) => Math.max(0, k - g.t.skills),
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Costs 1 less for each Skill played this turn.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  atk('LUNGE', { name: 'Lunge', rarity: 'Uncommon', cost: 2, v: { dmg: 14 }, up: { dmg: 6 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage. The next Skill you play costs 0.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.p.pw.freeSkill = 1; } });
  atk('CLEAN_CUT', { name: 'Clean Cut', rarity: 'Uncommon', cost: 0, v: { base: 13, per: 2 }, up: { base: 3 },
    text: (v, f, c, g) => `Deal ${f.d(Math.max(0, v.base - v.per * (g && g.hand ? g.hand.filter((x) => x !== c).length : 0)))} damage. Deals ${v.per} less for each other card in your hand.`,
    play: (g, c, t, v) => g.attack(t, Math.max(0, v.base - v.per * g.hand.length), 1, c) });
  atk('IMPALE', { name: 'Impale', rarity: 'Uncommon', cost: 'X', v: { dmg: 8 }, up: { dmg: 3 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage X times.`, play: (g, c, t, v, x) => (x > 0 ? g.attack(t, v.dmg, x, c) : null) });
  atk('GARROTE', { name: 'Garrote', rarity: 'Uncommon', cost: 1, v: { dmg: 8, amt: 2 }, up: { dmg: 2, amt: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Whenever you play a card this turn, the enemy loses ${v.amt} HP.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) g.addPw(t, 'choked', v.amt); } });

  // ---------- uncommon powers ----------
  pow('QUICKENING', { name: 'Quickening', rarity: 'Uncommon', cost: 1, v: { amt: 1 }, up: { amt: 1 }, text: (v) => `Toxin triggers ${v.amt} additional time${v.amt > 1 ? 's' : ''}.`, play: async (g, c, t, v) => g.addPw(g.p, 'quickening', v.amt) });
  pow('STEADY_AIM', { name: 'Steady Aim', rarity: 'Uncommon', cost: 1, v: { amt: 4 }, up: { amt: 2 }, text: (v) => `Slivers deal ${v.amt} additional damage.`, play: async (g, c, t, v) => g.addPw(g.p, 'accuracy', v.amt) });
  pow('LIGHT_FEET', { name: 'Light Feet', rarity: 'Uncommon', cost: 1, v: { dex: 2 }, up: { dex: 1 }, text: (v) => `Gain ${v.dex} Poise.`, play: async (g, c, t, v) => g.addPw(g.p, 'poise', v.dex) });
  pow('ENDLESS_KNIVES', { name: 'Endless Knives', rarity: 'Uncommon', cost: 1, upKw: ['Opening'], text: () => 'At the start of your turn, add 1 Sliver to your hand.', play: async (g) => g.addPw(g.p, 'endlessKnives', 1) });
  pow('FOUL_FUMES', { name: 'Foul Fumes', rarity: 'Uncommon', cost: 1, v: { amt: 2 }, up: { amt: 1 }, text: (v) => `At the start of your turn, apply ${v.amt} Toxin to ALL enemies.`, play: async (g, c, t, v) => g.addPw(g.p, 'foulFumes', v.amt) });
  pow('GHOST_KNIVES', { name: 'Ghost Knives', rarity: 'Uncommon', cost: 1, v: { amt: 9 }, up: { amt: 3 }, text: (v) => `Slivers gain Retain. The first Sliver you play each turn deals ${v.amt} additional damage.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'ghostKnives', v.amt) });
  pow('QUICKSILVER', { name: 'Quicksilver', rarity: 'Uncommon', cost: 2, upKw: ['Opening'], v: { amt: 2 }, text: (v) => `Each card you draw on your turn deals ${v.amt} damage to ALL enemies.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'quicksilver', v.amt) });

  // ---------- uncommon skills ----------
  skl('SPOOK', { name: 'Spook', rarity: 'Uncommon', cost: 0, target: 'all', only: 'stable', kw: ['Burn'], upKw: [], v: { weak: 1 }, text: (v) => `Apply ${v.weak} Sapped to ALL enemies.`,
    play: async (g, c, t, v) => { for (const e of g.alive()) await g.apply(e, 'sapped', v.weak); } });
  skl('SOMERSAULT', { name: 'Somersault', rarity: 'Uncommon', cost: 1, v: { draw: 3 }, up: { draw: 1 }, text: (v) => `Draw ${v.draw} cards. Discard 1 card.`, play: async (g, c, t, v) => { await g.drawCards(v.draw); await g.discardChoice(1); } });
  skl('SMEAR', { name: 'Smear', rarity: 'Uncommon', cost: 1, v: { blk: 5 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. Your Guard is not removed at the start of your next turn.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'smear', 1); } });
  skl('LOBBED_VIAL', { name: 'Lobbed Vial', rarity: 'Uncommon', cost: 2, v: { tox: 3, hits: 3 }, up: { hits: 1 }, text: (v) => `Apply ${v.tox} Toxin to a random enemy ${v.hits} times.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.hits; i++) { const e = g.randomEnemy(); if (e) await g.applyToxin(e, v.tox); } } });
  skl('FESTER', { name: 'Fester', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { tox: 9 }, up: { tox: 3 }, text: (v) => `If the enemy has Toxin, apply ${v.tox} Toxin.`,
    play: async (g, c, t, v) => { if (t.pw.toxin) await g.applyToxin(t, v.tox); } });
  skl('LONG_ODDS', { name: 'Long Odds', rarity: 'Uncommon', cost: 0, kw: ['Burn'], upKw: ['Burn', 'Retain'], text: () => 'Discard your hand, then draw that many cards.',
    play: async (g) => { const n = g.hand.length; for (const x of g.hand.slice()) { await g.discardFromHand(x); if (g.over) return; } await g.drawCards(n); } });
  skl('EXIT_PLAN', { name: 'Exit Plan', rarity: 'Uncommon', cost: 0, v: { blk: 3 }, up: { blk: 2 }, text: (v, f) => `Draw 1 card. If you draw a Skill, gain ${f.b(v.blk)} Guard.`,
    play: async (g, c, t, v) => { const x = await g.drawOne(); if (x && CARDS[x.id].type === 'Skill') await g.gainBlock(v.blk, true); } });
  skl('PRACTICED', { name: 'Practiced', rarity: 'Uncommon', cost: 1, v: { draw: 2 }, up: { draw: 1 }, text: (v) => `Draw ${v.draw} cards. They gain Retain this turn.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.draw; i++) { const x = await g.drawOne(); if (x) x.retainTurn = true; } } });
  skl('LAY_BARE', { name: 'Lay Bare', rarity: 'Uncommon', cost: 0, target: 'enemy', kw: ['Burn'], v: { vul: 2 }, up: { vul: 1 },
    text: (v) => `Remove all Ward and Guard from the enemy. Apply ${v.vul} Exposed.`, play: async (g, c, t, v) => { delete t.pw.ward; t.block = 0; await g.apply(t, 'exposed', v.vul); } });
  skl('SLEIGHT', { name: 'Sleight', rarity: 'Uncommon', cost: 1, v: { blk: 7 }, up: { blk: 3 }, text: (v, f) => `Gain ${f.b(v.blk)} Guard. A Skill in your hand gains Furtive this turn.`,
    play: async (g, c, t, v) => {
      await g.gainBlock(v.blk, true);
      const xs = g.hand.filter((x) => CARDS[x.id].type === 'Skill' && !HD.kwOf(x).includes('Furtive'));
      if (xs.length) { const [x] = await g.choose({ from: xs, n: 1, prompt: 'Give a Skill Furtive this turn' }); if (x) { x.addKw = (x.addKw || []).concat(['Furtive']); x.furtiveTurn = true; } }
    } });
  skl('MIASMA_CLOUD', { name: 'Miasma Cloud', rarity: 'Uncommon', cost: 2, target: 'all', v: { tox: 4, weak: 1 }, up: { tox: 2, weak: 1 }, text: (v) => `Apply ${v.tox} Toxin and ${v.weak} Sapped to ALL enemies.`,
    play: async (g, c, t, v) => { for (const e of g.alive()) { await g.applyToxin(e, v.tox); await g.apply(e, 'sapped', v.weak); } } });
  skl('SLEEVE_KNIVES', { name: 'Sleeve Knives', rarity: 'Uncommon', cost: 0, v: { draw: 2, shivs: 2 }, text: (v, f, c) => `Discard ${v.draw} cards. Add ${plural(v.shivs, c && c.up ? 'Sliver+' : 'Sliver')} to your hand.`,
    play: async (g, c, t, v) => { await g.discardChoice(v.draw); g.addSlivers(v.shivs, c.up); } });
  skl('TRIP', { name: 'Trip', rarity: 'Uncommon', cost: 2, target: 'enemy', v: { blk: 11, weak: 2 }, up: { blk: 3, weak: 1 }, text: (v, f) => `Apply ${v.weak} Sapped. Gain ${f.b(v.blk)} Guard.`,
    play: async (g, c, t, v) => { await g.apply(t, 'sapped', v.weak); await g.gainBlock(v.blk, true); } });
  skl('SHIMMER', { name: 'Shimmer', rarity: 'Uncommon', cost: 1, kw: ['Burn'], upKw: [], text: (v, f, c, g) => `Gain Guard equal to the Toxin on ALL enemies.${g && g.alive ? ` (${g.alive().reduce((a, e) => a + (e.pw.toxin || 0), 0)})` : ''}`,
    play: async (g) => { const n = g.alive().reduce((a, e) => a + (e.pw.toxin || 0), 0); if (n) await g.gainBlock(n, true); } });
  skl('REFLEXES', { name: 'Reflexes', rarity: 'Uncommon', cost: 3, kw: ['Furtive'], v: { draw: 2 }, up: { draw: 1 }, text: (v) => `Draw ${v.draw} cards.`, play: (g, c, t, v) => g.drawCards(v.draw) });
  skl('SIDLE', { name: 'Sidle', rarity: 'Uncommon', cost: 0, only: '0.111', v: { en: 1 }, up: { en: 1 }, text: (v) => `Next turn, gain ${v.en} Energy.`, play: async (g, c, t, v) => g.addPw(g.p, 'nextEnergy', v.en) });
  skl('PLANNER', { name: 'Planner', rarity: 'Uncommon', cost: 3, kw: ['Furtive'], v: { en: 1 }, up: { en: 1 }, text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) });
  skl('HIDDEN_STASH', { name: 'Hidden Stash', rarity: 'Uncommon', cost: 2, v: { draw: 3 }, up: { draw: 1 }, text: (v) => `Add ${plural(v.draw, 'Sliver')} to your hand. This card costs 1 less this combat.`,
    play: async (g, c, t, v) => { g.addSlivers(v.draw); c.bonusCost = (c.bonusCost || 0) - 1; } });

  // ---------- rare attacks ----------
  atk('SILENT_KILL', { name: 'Silent Kill', rarity: 'Rare', cost: 0, kw: ['Burn', 'Opening'], v: { dmg: 10, vul: 1 }, up: { dmg: 3, vul: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.vul} Exposed.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'exposed', v.vul); } });
  atk('CURTAIN_CALL', { name: 'Curtain Call', rarity: 'Rare', cost: 0, target: 'all', v: { dmg: 60 }, up: { dmg: 15 }, playIf: (g) => g.draw.length === 0,
    text: (v, f) => `Only playable with an empty draw pile. Deal ${f.d(v.dmg)} damage to ALL enemies.`, play: (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  atk('SLAUGHTER', { name: 'Slaughter', rarity: 'Rare', cost: 3, upCost: 2, v: { base: 1, per: 1 },
    text: (v, f, c, g) => `Deal ${f.d(v.base + v.per * ((g && g.drawnCombat) || 0))} damage. Deals ${v.per} more for each card drawn this combat.`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * (g.drawnCombat || 0), 1, c) });
  atk('THE_CHASE', { name: 'The Chase', rarity: 'Rare', cost: 1, kw: ['Burn'], v: { dmg: 10 }, up: { dmg: 5 }, text: (v, f) => `Deal ${f.d(v.dmg)} damage. Fatal: gain an additional card reward.`,
    play: async (g, c, t, v) => { const r = await g.attack(t, v.dmg, 1, c); if (r && r.fatal) g.extraCardReward = (g.extraCardReward || 0) + 1; } });

  // ---------- rare powers ----------
  pow('ROUGH_HIDE', { name: 'Rough Hide', rarity: 'Rare', cost: 3, kw: ['Furtive'], v: { dex: 1, amt: 4 }, up: { amt: 2 }, text: (v) => `Gain ${v.dex} Poise. Gain ${v.amt} Spines.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'poise', v.dex); g.addPw(g.p, 'spines', v.amt); } });
  pow('ECHO_IMAGE', { name: 'Echo Image', rarity: 'Rare', cost: 1, upKw: ['Opening'], v: { amt: 1 }, text: (v) => `Whenever you play a card, gain ${v.amt} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'echoImage', v.amt) });
  pow('VENOMOUS', { name: 'Venomous', rarity: 'Rare', cost: 2, v: { amt: 1 }, up: { amt: 1 }, text: (v) => `Whenever an Attack deals unblocked damage, apply ${v.amt} Toxin.`, play: async (g, c, t, v) => g.addPw(g.p, 'venomous', v.amt) });
  pow('KNIFE_WHEEL', { name: 'Knife Wheel', rarity: 'Rare', cost: 2, v: { shivs: 4 }, up: { shivs: 1 }, text: (v) => `Slivers now hit ALL enemies. Add ${plural(v.shivs, 'Sliver')} to your hand.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'knifeWheel', 1); g.addSlivers(v.shivs); } });
  pow('MASTERMIND', { name: 'Mastermind', rarity: 'Rare', cost: 2, upCost: 1, text: () => 'When you play a Skill, it gains Furtive.', play: async (g) => g.addPw(g.p, 'mastermind', 1) });
  pow('COILED_FORM', { name: 'Coiled Form', rarity: 'Rare', cost: 3, v: { amt: 4 }, up: { amt: 2 }, text: (v) => `Whenever you play a card, deal ${v.amt} damage to a random enemy.`, play: async (g, c, t, v) => g.addPw(g.p, 'coiled', v.amt) });
  pow('TRADE_TOOLS', { name: 'Trade Tools', rarity: 'Rare', cost: 1, upCost: 0, text: () => 'At the start of your turn, draw 1 card and discard 1 card.', play: async (g) => g.addPw(g.p, 'tradeTools', 1) });
  pow('HUNTERS_MARK', { name: "Hunter's Mark", rarity: 'Rare', cost: 2, upCost: 1, text: () => `Sapped enemies take ${HD.trackingMult === 2 ? 'double' : '50% more'} damage from Attacks.`, play: async (g) => g.addPw(g.p, 'huntersMark', 1) });
  pow('CAREFUL_PLANS', { name: 'Careful Plans', rarity: 'Rare', cost: 2, upCost: 1, text: () => 'At the end of your turn, you no longer discard your hand.', play: async (g) => g.addPw(g.p, 'carefulPlans', 1) });

  // ---------- rare skills ----------
  skl('RUSH', { name: 'Rush', rarity: 'Rare', cost: 0, kw: ['Burn'], v: { en: 1, draw: 2 }, up: { en: 1 }, text: (v) => `Gain ${v.en} Energy. Draw ${v.draw} cards.`, play: async (g, c, t, v) => { g.gainEnergy(v.en); await g.drawCards(v.draw); } });
  skl('INK_BLADES', { name: 'Ink Blades', rarity: 'Rare', cost: 1, v: { draw: 2 }, up: { draw: 1 }, text: (v) => `Add ${plural(v.draw, 'Inky Sliver')} to your hand.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.draw; i++) { const x = g.makeCard('SLIVER', false); x.ench = { id: 'INKY', n: 0 }; g.addToHand(x); } } });
  skl('SLOW_TIME', { name: 'Slow Time', rarity: 'Rare', cost: 3, upCost: 2, text: () => 'You cannot draw more cards this turn. ALL cards in your hand are free to play this turn.',
    play: async (g) => { g.p.pw.noDraw = 1; for (const x of g.hand) x.freeTurn = true; } });
  skl('DOUBLE_TAKE', { name: 'Double Take', rarity: 'Rare', cost: 1, v: { n: 1 }, up: { n: 1 }, text: (v) => `This turn, your next ${v.n > 1 ? `${v.n} Skills are` : 'Skill is'} played an extra time.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'doubleTake', v.n) });
  skl('ACID_TIDE', { name: 'Acid Tide', rarity: 'Rare', cost: 1, v: { amt: 2 }, up: { amt: 1 }, text: (v) => `Whenever you draw a card this turn, apply ${v.amt} Toxin to ALL enemies.`,
    play: async (g, c, t, v) => g.addPw(g.p, 'acidTide', v.amt) });
  skl('BLADE_TRAP', { name: 'Blade Trap', rarity: 'Rare', cost: 2, target: 'enemy', tags: ['Shiv'], text: (v, f, c) => `${c && c.up ? 'Upgrade and play' : 'Play'} every Sliver in your Burn pile on the enemy.`,
    play: async (g, c, t) => {
      for (const x of g.ash.filter((y) => y.id === 'SLIVER')) { if (g.over || !t.alive) break; const i = g.ash.indexOf(x); if (i < 0) continue; g.ash.splice(i, 1); if (c.up) x.up = true; await g.autoPlay(x, { target: t }); }
    } });
  skl('WASTING', { name: 'Wasting', rarity: 'Rare', cost: 'X', target: 'enemy', kw: ['Burn'], text: (v, f, c) => `The enemy loses X${c && c.up ? '+1' : ''} Might. Apply X${c && c.up ? '+1' : ''} Sapped.`,
    play: async (g, c, t, v, x) => { const n = x + (c.up ? 1 : 0); if (n > 0) { g.addPw(t, 'might', -n); await g.apply(t, 'sapped', n); } } });
  skl('BAD_DREAM', { name: 'Bad Dream', rarity: 'Rare', cost: 3, upCost: 2, kw: ['Burn'], text: () => 'Choose a card. Next turn, add 3 copies of it to your hand.',
    play: async (g) => { if (!g.hand.length) return; const [x] = await g.choose({ from: g.hand.slice(), n: 1, prompt: 'Choose a card to dream about' }); if (x) g.p.badDream = (g.p.badDream || []).concat([{ id: x.id, up: x.up, n: 3 }]); } });
  skl('PLAGUE', { name: 'Plague', rarity: 'Rare', cost: 3, target: 'all', v: { tox: 9 }, up: { tox: 3 }, text: (v) => `Apply ${v.tox} Toxin to ALL enemies. Toxin triggers immediately.`,
    play: async (g, c, t, v) => { await toxAll(g, v.tox); for (const e of g.alive().slice()) { await g.toxinTick(e); if (g.over) return; } } });
  skl('SHADOW_MERGE', { name: 'Shadow Merge', rarity: 'Rare', cost: 1, upCost: 0, text: () => 'Double the Guard you gain this turn.', play: async (g) => g.addPw(g.p, 'shadowMerge', 1) });
  skl('SHADE_STEP', { name: 'Shade Step', rarity: 'Rare', cost: 1, upCost: 0, text: () => 'Discard your hand. Next turn, Attacks deal double damage.',
    play: async (g) => { for (const x of g.hand.slice()) { await g.discardFromHand(x); if (g.over) return; } g.addPw(g.p, 'shadeStepNext', 1); } });
  skl('STEEL_RAIN', { name: 'Steel Rain', rarity: 'Rare', cost: 1, text: (v, f, c) => `Discard your hand. Add 1 ${c && c.up ? 'Sliver+' : 'Sliver'} to your hand for each card discarded.`,
    play: async (g, c) => { const n = g.hand.length; for (const x of g.hand.slice()) { await g.discardFromHand(x); if (g.over) return; } g.addSlivers(n, c.up); } });

  // ---------- ancient ----------
  atk('SUBDUE', { name: 'Subdue', rarity: 'Ancient', cost: 0, kw: ['Opening'], v: { dmg: 11, weak: 3 }, up: { dmg: 6, weak: 2 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.weak} Sapped.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'sapped', v.weak); } });
  pow('SPECTER_FORM', { name: 'Specter Form', rarity: 'Ancient', cost: 3, v: { n: 2, loss: 1 }, up: { n: 1 }, text: (v) => `Gain ${v.n} Intangible. At the start of your turn, lose ${v.loss} Poise.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'intangible', v.n); g.addPw(g.p, 'specter', v.loss); } });

  // ---------- co-op only ----------
  for (const [id, name, type, rarity, cost] of [['KNIFE_CHORUS', 'Knife Chorus', 'Skill', 'Uncommon', 2], ['BREW_SHARE', 'Shared Brew', 'Skill', 'Uncommon', 0],
    ['FADE_OUT', 'Fade Out', 'Skill', 'Uncommon', 0], ['LURK', 'Lurk', 'Power', 'Rare', 2], ['FLANK_HELP', 'Flank', 'Skill', 'Rare', 2]]) {
    card(id, { name, type, rarity, cost, upCost: ['KNIFE_CHORUS', 'FLANK_HELP'].includes(id) ? 1 : undefined, coop: true, text: () => 'Co-op only.', play: async () => {} });
  }

  // ---------- character ----------
  HD.CHARS.VEILED = { id: 'VEILED', name: 'The Veiled', color: 'veiled', hp: 70, gold: 99, energy: 3,
    deck: ['JAB', 'JAB', 'JAB', 'JAB', 'JAB', 'EVADE', 'EVADE', 'EVADE', 'EVADE', 'EVADE', 'HAMSTRING', 'ENDURE'],
    relic: 'SERPENT_RING', ancientRelic: 'DRAKE_RING', ancientCard: ['HAMSTRING', 'SUBDUE'], strike: 'JAB', defend: 'EVADE',
    blurb: 'Starts with Serpent Ring: draw 2 additional cards at the start of each combat.' };

  // ---------- relics ----------
  const relic = (rarity, id, o) => { HD.RELICS[id] = Object.assign({ id, rarity, pool: 'veiled' }, o); };
  relic('Starter', 'SERPENT_RING', { name: 'Serpent Ring', text: 'At the start of each combat, draw 2 additional cards.', battleStart: async (g) => { g.firstTurnDraw += 2; } });
  relic('Starter', 'DRAKE_RING', { name: 'Drake Ring', text: 'At the start of your first 3 turns, draw 2 additional cards.', turnStart: async (g) => { if (g.turn <= 3) g.extraDrawThisTurn += 2; } });
  relic('Common', 'LIZARD_SKULL', { name: 'Lizard Skull', text: 'Whenever you apply Toxin, apply an additional 1 Toxin.' });
  relic('Uncommon', 'FINGER_BELLS', { name: 'Finger Bells', text: 'Whenever you discard a card during your turn, deal 3 damage to a random enemy for each card discarded.' });
  relic('Uncommon', 'BENT_FUNNEL', { name: 'Bent Funnel', text: 'At the start of each combat, apply 4 Toxin to ALL enemies.', battleStart: async (g) => toxAll(g, 4) });
  relic('Rare', 'SPIRAL_DART', { name: 'Spiral Dart', text: 'Whenever you play a Sliver, gain 1 Poise this turn.' });
  relic('Rare', 'PAPER_CRANE', { name: 'Paper Crane', text: 'Enemies with Sapped deal 40% less damage to you rather than 25%.' });
  relic('Rare', 'THICK_WRAPS', { name: 'Thick Wraps', text: 'Whenever you discard a card during your turn, gain 3 Guard.' });
  relic('Shop', 'SHADOW_SCROLL', { name: 'Shadow Scroll', text: 'At the start of each combat, add 3 Slivers to your hand.', firstHand: async (g) => g.addSlivers(3) });

  // ---------- potions ----------
  const potion = (id, o) => { HD.POTIONS[id] = Object.assign({ id, pool: 'veiled', target: 'self' }, o); };
  potion('TOXIN_FLASK', { name: 'Toxin Flask', rarity: 'Common', target: 'enemy', text: 'Apply 6 Toxin.', use: async (g, t) => g.applyToxin(t, 6) });
  potion('SLY_DRAUGHT', { name: 'Sly Draught', rarity: 'Uncommon', text: 'Add 3 Upgraded Slivers to your hand.', use: async (g) => g.addSlivers(3, true) });
  potion('GHOST_JAR', { name: 'Ghost Jar', rarity: 'Rare', text: 'Gain 1 Intangible.', use: async (g) => g.addPw(g.p, 'intangible', 1) });

  // ---------- powers shown as chips ----------
  Object.assign(HD.PW, {
    toxin: { n: 'Toxin', t: 'debuff', d: (a) => `Loses ${a} HP at the start of its turn, then Toxin drops by 1.` },
    quickening: { n: 'Quickening', t: 'buff', d: (a) => `Toxin triggers ${a} additional time(s).` },
    accuracy: { n: 'Steady Aim', t: 'buff', d: (a) => `Slivers deal ${a} additional damage.` },
    endlessKnives: { n: 'Endless Knives', t: 'buff', d: (a) => `At the start of your turn, add ${a} Sliver(s) to your hand.` },
    foulFumes: { n: 'Foul Fumes', t: 'buff', d: (a) => `At the start of your turn, apply ${a} Toxin to ALL enemies.` },
    ghostKnives: { n: 'Ghost Knives', t: 'buff', d: (a) => `Slivers gain Retain. The first Sliver each turn deals ${a} more damage.` },
    quicksilver: { n: 'Quicksilver', t: 'buff', d: (a) => `Whenever you draw a card on your turn, deal ${a} damage to ALL enemies.` },
    smear: { n: 'Smear', t: 'buff', d: () => 'Your Guard is not removed at the start of your next turn.' },
    echoImage: { n: 'Echo Image', t: 'buff', d: (a) => `Whenever you play a card, gain ${a} Guard.` },
    venomous: { n: 'Venomous', t: 'buff', d: (a) => `Unblocked Attack damage applies ${a} Toxin.` },
    knifeWheel: { n: 'Knife Wheel', t: 'buff', d: () => 'Slivers hit ALL enemies.' },
    mastermind: { n: 'Mastermind', t: 'buff', d: () => 'Skills you play gain Furtive.' },
    coiled: { n: 'Coiled Form', t: 'buff', d: (a) => `Whenever you play a card, deal ${a} damage to a random enemy.` },
    tradeTools: { n: 'Trade Tools', t: 'buff', d: () => 'At the start of your turn, draw 1 card and discard 1 card.' },
    huntersMark: { n: "Hunter's Mark", t: 'buff', d: () => 'Sapped enemies take more damage from Attacks.' },
    carefulPlans: { n: 'Careful Plans', t: 'buff', d: () => 'You no longer discard your hand at the end of your turn.' },
    doubleTake: { n: 'Double Take', t: 'buff', d: (a) => `Your next ${a} Skill(s) this turn play an extra time.` },
    acidTide: { n: 'Acid Tide', t: 'buff', d: (a) => `Whenever you draw a card this turn, apply ${a} Toxin to ALL enemies.` },
    shadowMerge: { n: 'Shadow Merge', t: 'buff', d: (a) => `Guard gained this turn is doubled${a > 1 ? ` ${a} times` : ''}.` },
    shadeStepNext: { n: 'Shade Step', t: 'buff', d: () => 'Next turn, Attacks deal double damage.' },
    doubleAtk: { n: 'Shade Step', t: 'buff', d: () => 'Attacks deal double damage this turn.' },
    freeSkill: { n: 'Lunge', t: 'buff', d: () => 'The next Skill you play costs 0.' },
    specter: { n: 'Specter Form', t: 'debuff', d: (a) => `At the start of your turn, lose ${a} Poise.` },
    outbreak: { n: 'Plague', t: 'buff', d: (a) => `Every 3 times you apply Toxin, deal ${a} damage to ALL enemies.` },
    wellLaid: { n: 'Careful Plans', t: 'buff', d: (a) => `At the end of your turn, Retain up to ${a} card(s).` },
  });
  HD.TERMS.Furtive = 'If this card is discarded from your hand before the end of your turn, play it for free.';
  HD.TERMS.Toxin = 'Loses HP equal to Toxin at the start of its turn, then Toxin drops by 1. Ignores Guard.';
  HD.TERMS.Sliver = 'A 0-cost Attack token: deal 4 damage, Burn.';
  HD.TERMS.Intangible = 'All damage and HP loss is reduced to 1 until your next turn.';
})();

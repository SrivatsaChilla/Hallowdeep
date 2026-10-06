// Co-op only cards (the 37 in the v0.111 data) and the powers and hooks they need. They join the card pools only in
// multiplayer runs. Each one builds on the stub in its character's file (names, costs, generated numbers).
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const coop = (id, color, o) => { CARDS[id] = Object.assign({ id, color, target: 'self', v: {}, up: {}, kw: [], tags: [] }, CARDS[id], o, { coop: true }); };
  const s = (n, one, many) => (n === 1 ? one : many);
  const DIN_EVERY = 33;
  const burnedByAll = (g) => (g ? g.seats.reduce((a, x) => a + (x.burnedCount || 0), 0) : 0);
  // "Give" effects: the Guard is worked out on the card you play, then handed over as it is.
  const giveGuard = async (g, c, t, n) => { const b = g.blockPreview(n, c); await g.asAlly(t, () => g.gainBlock(b, false)); };

  // ---------- the Oathburner ----------
  coop('KINDLE_ALLY', 'oathburner', { target: 'ally', text: (v) => `Give another player ${v.str} Might.`,
    play: (g, c, t, v) => g.asAlly(t, () => g.addPw(g.p, 'might', v.str)) });
  coop('SHARED_SCAR', 'oathburner', { target: 'ally', text: (v) => `Lose ${v.hp} HP. Give another player Guard equal to your Guard.`,
    play: async (g, c, t, v) => { await g.selfLoseHp(v.hp); const n = g.p.block; await g.asAlly(t, () => g.gainBlock(n, false)); } });
  coop('DEEP_NIGHT', 'oathburner', { costFn: (g, c, k) => k - burnedByAll(g),
    text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage. Costs 1 less Energy for each card any player Burned this combat.${g ? ` (${burnedByAll(g)})` : ''}` });
  coop('SPREADING_RAGE', 'oathburner', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Add a copy of this card to every player's discard pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); for (const x of g.living()) g.asSeat(x, () => g.discard.push(g.makeCard(c.id, c.up))); } });
  coop('TAKE_THE_HITS', 'oathburner', { text: () => 'Take 50% more damage from enemies. The other players take 50% less damage from enemies.',
    play: async (g) => { g.addPw(g.p, 'tank', 1); } });

  // ---------- the Veiled ----------
  coop('KNIFE_CHORUS', 'veiled', { v: { n: 2 }, text: (v) => `Add ${v.n} ${s(v.n, 'Sliver', 'Slivers')} to EVERY player's hand.`,
    play: (g, c, t, v) => g.everyone(() => g.addSlivers(v.n)) });
  coop('BREW_SHARE', 'veiled', { target: 'ally', v: { poison: 3 }, up: { poison: 1 },
    text: (v) => `Choose another player. This turn, whenever their Attacks get through Guard, they apply ${v.poison} Toxin.`,
    play: (g, c, t, v) => g.asAlly(t, () => g.addPw(g.p, 'concoct', v.poison)) });
  coop('FADE_OUT', 'veiled', { target: 'ally', kw: ['Retain'], v: { dex: 6 }, up: { dex: 3 }, text: (v) => `Another player gains ${v.dex} Poise this turn.`,
    play: (g, c, t, v) => g.asAlly(t, () => g.addPw(g.p, 'poiseTemp', v.dex)) });
  coop('LURK', 'veiled', { kw: ['Furtive'], v: { n: 1 }, up: { n: 1 }, text: (v) => `Whenever another player attacks an enemy, gain ${v.n} Guard.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'lurk', v.n); } });
  coop('FLANK_HELP', 'veiled', { target: 'enemy', text: () => 'The enemy takes double attack damage from the other players this turn.',
    play: (g, c, t) => g.mark(t, 'flanked', 1) });

  // ---------- the Crowned ----------
  coop('SKY_CHART', 'crowned', { name: 'Sky Chart', type: 'Skill', rarity: 'Uncommon', cost: 0, star: 2, target: 'ally', v: { draw: 1, en: 1, blk: 9 }, up: { blk: 3 },
    text: (v, f) => `Another player draws ${v.draw} ${s(v.draw, 'card', 'cards')}, gains ${v.en} Energy and gains ${f.b(v.blk)} Guard.`,
    play: async (g, c, t, v) => { const b = g.blockPreview(v.blk, c); await g.asAlly(t, async () => { await g.drawCards(v.draw); g.gainEnergy(v.en); await g.gainBlock(b, false); }); } });
  coop('SHARED_ANVIL', 'crowned', { name: 'Shared Anvil', type: 'Power', rarity: 'Rare', cost: 2, upCost: 1,
    text: () => 'Whenever you Temper, every other player Tempers as much.', play: async (g) => { g.addPw(g.p, 'hammerTime', 1); } });
  coop('ROYAL_GIFT', 'crowned', { name: 'Royal Gift', type: 'Skill', rarity: 'Uncommon', cost: 0, target: 'ally',
    text: (v, f, c) => `Another player adds a random${c && c.up ? ' upgraded' : ''} colorless card to their hand.`,
    play: (g, c, t) => g.asAlly(t, () => g.create(g.makeCard(g.rng.pick(HD.colorlessIds(true)), !!c.up), 'hand')) });
  coop('WAR_COUNCIL', 'crowned', { name: 'War Council', type: 'Skill', rarity: 'Uncommon', cost: 1, v: { draw: 2 }, up: { draw: 1 },
    text: (v) => `Next turn, EVERY player draws ${v.draw} more cards.`, play: (g, c, t, v) => g.everyone(() => g.addPw(g.p, 'nextDraw', v.draw)) });
  coop('COUNSEL', 'crowned', { name: 'Counsel', type: 'Skill', rarity: 'Rare', cost: 1, upCost: 0, target: 'ally',
    text: () => 'Another player chooses a card in their draw pile and puts it into their hand.',
    play: (g, c, t) => g.asAlly(t, async () => {
      if (!g.draw.length) return;
      const [x] = await g.choose({ from: g.draw.slice(), n: 1, prompt: 'Counsel: put a card from your draw pile into your hand' });
      if (x && g.draw.includes(x)) { g.draw.splice(g.draw.indexOf(x), 1); g.addToHand(x); }
    }) });

  // ---------- the Unburied ----------
  coop('DIN', 'unburied', { text: (v) => `Every ${v.draw} cards drawn by ALL players, deal ${v.dmg} damage to a random enemy.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'din', v.dmg); } });
  coop('PEEK_BEYOND', 'unburied', { text: (v) => `EVERY player adds ${v.draw} ${s(v.draw, 'Wraith', 'Wraiths')} to their draw pile.`,
    play: (g, c, t, v) => g.everyone(() => g.addWraiths(v.draw, 'draw')) });
  coop('BONE_LEGION', 'unburied', { text: (v) => `EVERY player Rouses ${v.summon}.`, play: (g, c, t, v) => g.everyone(() => g.summon(v.summon)) });
  coop('WRAITHBOUND', 'unburied', { target: 'ally', text: () => 'Choose another player. Whenever you create a Wraith, add a Wraith to their draw pile.',
    play: async (g, c, t) => { g.p.soulTo = (g.p.soulTo || []).concat(t.seat.index); g.addPw(g.p, 'soulbound', 1); } });
  coop('NETHERWORLD', 'unburied', { text: () => 'This turn, whenever another player deals attack damage, apply that much Knell to the enemy.',
    play: async (g) => { g.addPw(g.p, 'underworld', 1); } });

  // ---------- the Wirebound ----------
  coop('POWER_SHARE', 'wirebound', { text: (v) => `EVERY player gains ${v.en} Energy.`, play: (g, c, t, v) => g.everyone(() => g.gainEnergy(v.en)) });
  coop('DEEP_SLEEP', 'wirebound', { text: (v) => `This turn, your Rime also gives every other player its Guard. Prime ${v.hits} Rime.`,
    play: async (g, c, t, v) => { if (!g.p.pw.hibernate) g.addPw(g.p, 'hibernate', 1); for (let i = 0; i < v.hits && !g.over; i++) await g.channel('RIME'); } });
  coop('KICK_START', 'wirebound', { target: 'ally', text: () => 'Another player Primes a Flux.', play: (g, c, t) => g.asAlly(t, () => g.channel('FLUX')) });
  coop('MIMIC_ROUTINE', 'wirebound', { target: 'ally', text: (v) => `Choose another player. The next ${v.imitationLearning} times they play a Power, you play a copy of it.`,
    play: async (g, c, t, v) => { const im = (g.p.imitate = g.p.imitate || {}); im[t.seat.index] = (im[t.seat.index] || 0) + v.imitationLearning; g.addPw(g.p, 'imitate', v.imitationLearning); } });
  coop('ALL_HANDS', 'wirebound', { text: (v) => `EVERY player's 0-cost Attacks deal ${v.oneForAll} more damage.`, play: async (g, c, t, v) => { g.addPw(g.p, 'oneForAll', v.oneForAll); } });

  // ---------- colorless ----------
  coop('HOPE_BEACON', 'colorless', { cost: 2, upKw: ['Opening'], text: () => 'Whenever you gain Guard on your turn, the other players gain half that much Guard.',
    play: async (g) => { g.addPw(g.p, 'beacon', 1); } });
  coop('OWN_BELIEF', 'colorless', { target: 'ally', v: { en: 2 }, up: { en: 1 }, text: (v) => `Another player gains ${v.en} Energy.`,
    play: (g, c, t, v) => g.asAlly(t, () => g.gainEnergy(v.en)) });
  coop('COORDINATED', 'colorless', { target: 'ally', v: { str: 5 }, up: { str: 3 }, text: (v) => `Give another player ${v.str} Might this turn.`,
    play: (g, c, t, v) => g.asAlly(t, () => g.addPw(g.p, 'mightTemp', v.str)) });
  coop('PILE_ON', 'colorless', { v: { dmg: 5, extra: 5 }, up: { extra: 2 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage, plus ${v.extra} more for each time another player attacked the enemy this turn.`,
    play: (g, c, t, v) => g.attack(t, v.dmg + v.extra * g.attacksByOthers(t), 1, c) });
  coop('HUDDLE', 'colorless', { kw: ['Burn'], v: { draw: 2 }, up: { draw: 1 }, text: (v) => `EVERY player draws ${v.draw} cards.`,
    play: (g, c, t, v) => g.everyone(() => g.drawCards(v.draw)) });
  coop('TAKE_THE_BLOW', 'colorless', { target: 'ally', v: { blk: 9 }, up: { blk: 4 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. This turn, enemy attacks aimed at another player hit you instead.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); t.seat.cover = g.seat; t.pw.covered = 1; g.p.pw.intercept = 1; } });
  coop('KNOCK_OVER', 'colorless', { v: { dmg: 10, knock: 2 }, up: { dmg: 4, knock: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. The enemy takes ${({ 2: 'double', 3: 'triple' })[v.knock] || `${v.knock} times the`} damage from the other players this turn.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.mark(t, 'knocked', v.knock); } });
  coop('BOOST', 'colorless', { target: 'ally', v: { blk: 11 }, up: { blk: 5 }, text: (v, f) => `Give another player ${f.b(v.blk)} Guard.`,
    play: (g, c, t, v) => giveGuard(g, c, t, v.blk) });
  coop('COPYCAT', 'colorless', { target: 'ally', kw: ['Burn'], upKw: [], text: () => 'Gain Guard equal to the Guard another player has.',
    play: (g, c, t) => g.gainBlock(t.block, true) });
  coop('RALLY_CRY', 'colorless', { v: { blk: 12 }, up: { blk: 5 }, text: (v, f) => `EVERY player gains ${f.b(v.blk)} Guard.`,
    play: async (g, c, t, v) => { const b = g.blockPreview(v.blk, c); await g.gainBlock(v.blk, true); for (const x of g.allies()) await g.withSeat(x, () => g.gainBlock(b, false)); } });
  coop('DOUBLE_TEAM', 'colorless', { v: { dmg: 11 }, up: { dmg: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. The next Attack another player plays on the enemy is played an extra time.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.mark(t, 'tagTeam', 1); } });
  coop('RELAY_STONE', 'colorless', { name: 'Relay Stone', type: 'Attack', rarity: 'Uncommon', cost: 1, target: 'enemy', v: { dmg: 10, inc: 10 }, up: { inc: 5 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. This card deals ${v.inc} more damage this combat, then passes to a random other player.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); c.bonus = (c.bonus || 0) + v.inc; },
    settleTo: (g, c) => { const a = g.allies(); if (!a.length) return null; g.asSeat(g.rng.pick(a), () => g.addToHand(c)); return 'gone'; } });

  // ---------- powers ----------
  Object.assign(HD.PW, {
    tank: { n: 'Take the Hits', t: 'buff', d: () => 'You take 50% more damage from enemies; the other players take 50% less.' },
    beacon: { n: 'Hope Beacon', t: 'buff', d: () => 'Whenever you gain Guard on your turn, the other players gain half that much.' },
    din: { n: 'Din', t: 'buff', d: (a) => `Every ${DIN_EVERY} cards drawn by ALL players, deal ${a} damage to a random enemy.` },
    concoct: { n: 'Shared Brew', t: 'buff', d: (a) => `This turn, your Attacks that get through Guard apply ${a} Toxin.` },
    lurk: { n: 'Lurk', t: 'buff', d: (a) => `Whenever another player attacks an enemy, gain ${a} Guard.` },
    intercept: { n: 'Covering', t: 'buff', d: () => 'This turn, enemy attacks aimed at the player you cover hit you instead.' },
    covered: { n: 'Covered', t: 'buff', d: () => 'This turn, another player takes the enemy attacks aimed at you.' },
    underworld: { n: 'Netherworld', t: 'buff', d: () => 'This turn, attack damage the other players deal also applies that much Knell.' },
    hammerTime: { n: 'Shared Anvil', t: 'buff', d: () => 'Whenever you Temper, every other player Tempers as much.' },
    hibernate: { n: 'Deep Sleep', t: 'buff', d: () => 'Until your next turn, your Rime also gives every other player its Guard.' },
    oneForAll: { n: 'All Hands', t: 'buff', d: (a) => `Every player's 0-cost Attacks deal ${a} more damage.` },
    soulbound: { n: 'Wraithbound', t: 'buff', d: () => 'Whenever you create a Wraith, the bound player gets one in their draw pile.' },
    imitate: { n: 'Mimic Routine', t: 'buff', d: (a) => `The next ${a} Power${a === 1 ? '' : 's'} the chosen player plays, you play a copy.` },
    flanked: { n: 'Flanked', t: 'debuff', d: () => 'Takes double attack damage from the other players this turn.' },
    knocked: { n: 'Knocked Over', t: 'debuff', d: (a) => `Takes ${a} times the damage from the other players this turn.` },
    tagTeam: { n: 'Double Team', t: 'debuff', d: () => 'The next Attack another player plays on it is played an extra time.' },
  });
  for (const k of ['flanked', 'knocked', 'tagTeam']) HD.DEBUFFS.add(k);

  // ---------- hooks ----------
  // Take the Hits: you take 50% more from enemies, every other player 50% less.
  HD.TAKEN_MODS.push((g, d) => {
    if (!g.multi) return d;
    if (g.p.pw.tank) d *= 1.5;
    if (g.allies().some((x) => x.p.pw.tank)) d *= 0.5;
    return d;
  });
  // All Hands: every player's 0-cost Attacks deal more.
  HD.ATK_ADD.push((g, c, t, isAtk) => (isAtk && g.multi && g.costOf(c) === 0 ? g.seats.reduce((a, x) => a + (x.p.pw.oneForAll || 0), 0) : 0));
  // Hope Beacon: the others gain half the Guard you gain on your turn.
  HD.onEngine('blockGained', async (g, b) => {
    const half = Math.floor(b / 2);
    if (!g.p.pw.beacon || !half) return;
    g.mp.echo = true;
    try { for (const x of g.allies()) await g.withSeat(x, () => g.gainBlock(half, false)); } finally { g.mp.echo = false; }
  });
  // Din counts the cards every player draws.
  HD.onEngine('anyDrawn', async (g) => {
    if (!g.p.pw.din) return;
    g.p.dinCount = (g.p.dinCount || 0) + 1;
    if (g.p.dinCount % DIN_EVERY === 0) { const e = g.randomEnemy(); if (e) await g.damage(e, g.p.pw.din, {}); }
  });
  // Shared Brew: Attacks that get through Guard apply Toxin.
  HD.onEngine('attackDealt', async (g, t) => { if (g.p.pw.concoct && t.alive) await g.applyToxin(t, g.p.pw.concoct); });
  // Lurk: another player attacked an enemy.
  HD.onEngine('allyAttacked', async (g) => { if (g.p.pw.lurk) await g.gainBlock(g.p.pw.lurk, false); });
  // Netherworld: another player's attack damage becomes Knell.
  HD.onEngine('allyAttackDealt', async (g, t, dmg) => { if (g.p.pw.underworld && t.alive) await g.applyDoom(t, dmg * g.p.pw.underworld); });
  // Shared Anvil: Tempering spreads to the other players (once, so two Anvils do not loop).
  HD.onEngine('forged', async (g, n) => {
    if (!g.p.pw.hammerTime || g.mp.forging) return;
    g.mp.forging = true;
    try { for (const x of g.allies()) await g.withSeat(x, () => g.forge(n)); } finally { g.mp.forging = false; }
  });
  // Wraithbound: each Wraith you create gives the bound player one too (theirs do not pass it on again).
  HD.onEngine('created', async (g, c) => {
    if (c.id !== 'WRAITH' || c.bonded || !g.p.soulTo) return;
    for (const i of g.p.soulTo) {
      const x = g.seats[i];
      if (x && !x.dead) await g.withSeat(x, async () => { const w = g.makeCard('WRAITH', false); w.bonded = true; await g.create(w, 'draw'); });
    }
  });
  // Mimic Routine: copy the chosen player's next Powers.
  HD.onEngine('afterPlay', async (g, c, d) => {
    if (!g.multi || d.type !== 'Power') return;
    const by = g.seat.index;
    for (const x of g.allies()) {
      const im = x.p.imitate;
      if (!im || !im[by]) continue;
      im[by]--; g.addPw(x.p, 'imitate', -1);
      await g.withSeat(x, () => g.autoPlay(g.makeCard(c.id, c.up), {}));
      if (g.over) return;
    }
  });
  // Deep Sleep lasts until your next turn starts.
  HD.onEngine('turnStart', async (g) => { if (g.p.pw.hibernate) g.addPw(g.p, 'hibernate', -1); });
})();

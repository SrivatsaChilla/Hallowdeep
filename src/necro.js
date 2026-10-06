// The Unburied: the fifth character (the Necrobinder). Costs, values, upgrades, keywords and targets come from
// HD.NECRO_DATA (generated from the v0.111 data); text, play functions, relics and potions are here.
// Clutch is Osty, Rouse is Summon, Knell is Doom, Wraiths are Souls (src/osty.js); Fleeting is Ethereal.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const DATA = HD.NECRO_DATA['0.111'];
  const card = (id, o) => {
    const d = DATA[id];
    if (!d) throw new Error(`no Necrobinder data for ${id}`);
    CARDS[id] = Object.assign({ id, color: d.rarity === 'Token' ? 'token' : 'unburied', name: d.name, type: d.type, rarity: d.rarity, cost: d.cost,
      target: d.target, kw: d.kw, tags: d.tags, v: d.v, up: d.up }, d.upCost != null ? { upCost: d.upCost } : {}, d.upKw ? { upKw: d.upKw } : {}, o);
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const hdName = (id) => CARDS[id].nameHD || CARDS[id].name;
  const wraiths = (n, up) => `${n === 1 ? 'a' : n} ${hdName('WRAITH')}${n === 1 ? '' : 's'}${up ? '+' : ''}`;
  const hitAll = async (g, n) => { for (const e of g.alive()) { await g.damage(e, n, {}); if (g.over) return; } };
  const od = (g, n) => (g && g.ostyDmg ? g.ostyDmg(n, null) : n);
  const ostyHp = (g) => (g && g.ostyAlive && g.ostyAlive() ? g.osty.hp : 0);
  const ostyMax = (g) => (g && g.ostyAlive && g.ostyAlive() ? g.osty.maxHp : 0);
  const fleeting = (c) => HD.kwOf(c).includes('Fleeting');
  const fleetingPlayed = (g) => (g && g.rs ? g.rs.fleetingPlayed || 0 : 0);
  const pickHand = async (g, filter, prompt) => { const xs = g.hand.filter(filter); if (!xs.length) return null; const [x] = await g.choose({ from: xs, n: 1, prompt }); return x || null; };
  const fromDiscard = async (g, n, prompt, min) => {
    if (!g.discard.length) return;
    for (const x of await g.choose({ from: g.discard.slice(), n: Math.min(n, g.discard.length), min, prompt })) { g.discard.splice(g.discard.indexOf(x), 1); g.addToHand(x); }
  };
  const clutchCards = (g, c) => [...g.hand, ...g.draw, ...g.discard, ...g.ash].filter((x) => x !== c && CARDS[x.id].tags.includes('Clutch')).length;

  // ---------- starter ----------
  card('RAKE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('BONE_WARD', { text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('HAND_UP', { text: (v) => `Rouse ${v.summon}.`, play: (g, c, t, v) => g.summon(v.summon) });
  card('LET_LOOSE', { text: (v, f, c, g) => `Clutch deals ${od(g, v.base + v.per * ostyHp(g))} damage. Deals additional damage equal to Clutch's current HP.`,
    play: (g, c, t, v) => g.ostyAttack(t, v.base + v.per * ostyHp(g)) });

  // ---------- tokens ----------
  card('WRAITH', { text: (v) => `Draw ${plural(v.draw, 'card')}.`, play: (g, c, t, v) => g.drawCards(v.draw) });
  card('SWEEPING_GLARE', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage to a random enemy.`,
    play: async (g, c, t, v) => { const e = g.randomEnemy(); if (e) await g.ostyAttack(e, v.ostyDamage); } });

  // ---------- common ----------
  card('HEREAFTER', { text: (v) => `Rouse ${v.summon}.`, play: (g, c, t, v) => g.summon(v.summon) });
  card('ROT_RAKE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply Knell equal to the damage dealt.`,
    play: async (g, c, t, v) => { const h = t.hp; await g.attack(t, v.dmg, 1, c); const dealt = Math.max(0, h - Math.max(0, t.hp)); if (dealt && t.alive) await g.applyDoom(t, dealt); } });
  card('DESECRATE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('STAND_FAST', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Apply ${v.weak} Sapped.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.apply(t, 'sapped', v.weak); } });
  card('SIPHON', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Upgrade ${plural(v.draw, 'random card')} in your discard pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); for (const x of g.rng.shuffle(g.discard.filter((y) => g.canUpgrade(y))).slice(0, v.draw)) g.upgradeInCombat(x); } });
  card('DREAD', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.vul} Exposed.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'exposed', v.vul); } });
  card('SQUASH', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage. Costs 0 if Clutch has attacked this turn.`,
    costFn: (g, c, k) => (g.t && g.t.ostyAttacks ? 0 : k), play: (g, c, t, v) => g.ostyAttack(t, v.ostyDamage) });
  card('TOMB_KEEPER', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Add ${wraiths(v.draw)} to your draw pile.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.addWraiths(v.draw); } });
  card('GRAVE_BURST', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Put a card from your discard pile into your hand.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!g.over) await fromDiscard(g, 1, 'Put a card into your hand'); } });
  card('SUMMONING_RITE', { text: (v) => `Next turn, Rouse ${v.summon} and gain ${v.en} Energy.`, play: async (g, c, t, v) => { g.addPw(g.p, 'rouseNext', v.summon); g.addPw(g.p, 'nextEnergy', v.en); } });
  card('DEATH_PULSE', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Apply ${v.doom} Knell to ALL enemies.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); for (const e of g.alive()) await g.applyDoom(e, v.doom); } });
  card('PROD', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage.`, play: (g, c, t, v) => g.ostyAttack(t, v.ostyDamage) });
  card('DRAW_FIRE', { text: (v, f) => `Rouse ${v.summon}. Gain ${f.b(v.blk)} Guard.`, play: async (g, c, t, v) => { await g.summon(v.summon); await g.gainBlock(v.blk, true); } });
  card('HARVEST', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('RIP_FREE', { text: (v, f, c) => `Deal ${f.d(v.dmg)} damage. Add ${wraiths(v.draw, c && c.up)} to your draw pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); await g.addWraiths(v.draw, 'draw', c.up); } });
  card('DEATH_MARK', { text: (v) => `Apply ${v.doom} Knell. Draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => { await g.applyDoom(t, v.doom); await g.drawCards(v.draw); } });
  card('CARVING_RAKE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. A card in your hand becomes Fleeting.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); const x = await pickHand(g, (y) => !fleeting(y), 'Make a card Fleeting'); if (x) x.addKw = (x.addKw || []).concat(['Fleeting']); } });
  card('FLICK', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage. A card in your hand gains Retain.`,
    play: async (g, c, t, v) => { await g.ostyAttack(t, v.ostyDamage); const x = await pickHand(g, (y) => !HD.kwOf(y).includes('Retain'), 'Give a card Retain'); if (x) x.addKw = (x.addKw || []).concat(['Retain']); } });
  card('SCATTER', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies.`, play: (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  card('FLICKER', { text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) });

  // ---------- uncommon ----------
  card('BONE_BURST', { text: (v, f, c, g) => `If Clutch is here, he deals ${od(g, v.ostyDamage)} damage to ALL enemies and you gain ${f.b(v.blk)} Guard. Clutch falls.`,
    play: async (g, c, t, v) => { if (!g.ostyAlive()) return; await g.ostyAttackAll(v.ostyDamage); if (g.over) return; await g.gainBlock(v.blk, true); await g.killOsty(); } });
  card('STOLEN_HOURS', { text: (v) => `Gain ${v.en} Energy. Cards cost ${v.extraCost} more this turn.`, play: async (g, c, t, v) => { g.gainEnergy(v.en); g.addPw(g.p, 'stolenHours', v.extraCost); } });
  card('ENTOMB', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('HARDEN', { text: (v) => `Clutch's attacks deal ${v.calcify} more damage.`, play: async (g, c, t, v) => g.addPw(g.p, 'harden', v.calcify) });
  card('BOTTLE_WRAITH', { text: (v) => `The enemy loses ${v.dmg} HP. Add ${wraiths(v.draw)} to your draw pile.`, play: async (g, c, t, v) => { await g.loseHp(t, v.dmg); await g.addWraiths(v.draw); } });
  card('PURGE', { text: (v) => `Rouse ${v.summon}. Burn 1 card from your draw pile.`,
    play: async (g, c, t, v) => { await g.summon(v.summon); if (!g.draw.length) return; const [x] = await g.choose({ from: g.draw.slice(), n: 1, prompt: 'Burn a card from your draw pile' }); if (x) { g.draw.splice(g.draw.indexOf(x), 1); await g.burn(x); } } });
  card('FINAL_HOURS', { text: (v) => `At the start of your turn, apply ${v.countdown} Knell to a random enemy.`, play: async (g, c, t, v) => g.addPw(g.p, 'finalHours', v.countdown) });
  card('BONE_WALTZ', { text: (v) => `Whenever you play a card that costs ${v.en} or more, gain ${v.danseMacabre} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'boneWaltz', v.danseMacabre) });
  card('FUNERAL_MARCH', { text: (v, f, c, g) => `Deal ${f.d(v.base + v.per * ((g && g.t && g.t.cardsDrawn) || 0))} damage. Deals ${v.per} more for each card drawn during your turn.`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * (g.t.cardsDrawn || 0), 1, c) });
  card('DEATHCALLER', { text: (v) => `Apply ${v.doom} Knell and ${v.weak} Sapped to ALL enemies.`,
    play: async (g, c, t, v) => { for (const e of g.alive()) { await g.applyDoom(e, v.doom); await g.apply(e, 'sapped', v.weak); } } });
  card('LAST_BREATH', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. If you applied Knell this turn, gain it ${v.hits} more times.`,
    play: async (g, c, t, v) => { for (let i = 0; i < 1 + (g.t.doomApplied ? v.hits : 0); i++) await g.gainBlock(v.blk, true); } });
  card('WEAKEN_WILL', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Exposed and Sapped are twice as strong on the enemy for ${plural(v.debilitate, 'turn')}.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'debilitate', v.debilitate); } });
  card('STALL', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Next turn, gain ${v.en} Energy.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'nextEnergy', v.en); } });
  card('LAMENT', { text: (v, f, c) => `Rouse ${v.summon} X times. Add X ${hdName('WRAITH')}${c && c.up ? '+' : ''}s to your draw pile.`,
    play: async (g, c, t, v, x) => { for (let i = 0; i < x && !g.over; i++) await g.summon(v.summon); await g.addWraiths(x, 'draw', c.up); } });
  card('EXHUME', { text: (v) => `Put ${plural(v.draw, 'card')} from your discard pile into your hand.`, play: (g, c, t, v) => fromDiscard(g, v.draw, `Put up to ${v.draw} cards into your hand`) });
  card('WITHERING_TOUCH', { text: (v) => `The enemy loses ${v.loss} Might this turn.`, play: (g, c, t, v) => g.apply(t, 'mightDown', v.loss) });
  card('RETRIEVE', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage. The first time you play this card each turn, draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { await g.ostyAttack(t, v.ostyDamage); if (c.fetchTurn !== g.turn) { c.fetchTurn = g.turn; await g.drawCards(v.draw); } } });
  card('OLD_FRIEND', { text: (v) => `Lose ${v.str} Might. Gain ${v.en} Energy at the start of each turn.`, play: async (g, c, t, v) => { g.addPw(g.p, 'might', -v.str); g.addPw(g.p, 'oldFriend', v.en); } });
  card('HAUNTING', { text: (v) => `Whenever you play a ${hdName('WRAITH')}, a random enemy loses ${v.hpLoss} HP.`, play: async (g, c, t, v) => g.addPw(g.p, 'haunting', v.hpLoss) });
  card('CLAP', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage and applies ${v.vul} Exposed to ALL enemies.`,
    play: async (g, c, t, v) => { if (!g.ostyAlive()) return; await g.ostyAttackAll(v.ostyDamage); for (const e of g.alive()) await g.apply(e, 'exposed', v.vul); } });
  card('KILLING_INTENT', { text: (v) => `The first Attack each turn deals ${v.lethality}% more damage.`, play: async (g, c, t, v) => g.addPw(g.p, 'lethality', v.lethality) });
  card('SORROW', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Costs ${v.en} less whenever ANYONE dies.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('INESCAPABLE', { text: (v) => `Apply ${v.base} Knell, plus ${v.per} more for every ${v.doomThreshold} Knell already on the enemy.`,
    play: (g, c, t, v) => g.applyDoom(t, v.base + v.per * Math.floor((t.pw.doom || 0) / v.doomThreshold)) });
  card('LEAFSTORM', { text: (v) => `Whenever you draw a Fleeting card, draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => g.addPw(g.p, 'leafstorm', v.draw) });
  card('READ_THROUGH', { text: (v) => `Draw ${plural(v.draw, 'card')}.`, play: (g, c, t, v) => g.drawCards(v.draw) });
  card('DRAG_UNDER', { text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage for each Fleeting card played this combat.${g && g.rs ? ` (${fleetingPlayed(g)})` : ''}`,
    play: async (g, c, t, v) => { const n = fleetingPlayed(g); if (n) await g.attack(t, v.dmg, n, c); } });
  card('DECOMPOSE', { text: (v) => `Apply ${v.power} Sapped. Apply ${v.power} Exposed.`, play: async (g, c, t, v) => { await g.apply(t, 'sapped', v.power); if (t.alive) await g.apply(t, 'exposed', v.power); } });
  card('CLATTER', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage. Hits once more for each other time he has attacked this turn.`,
    play: (g, c, t, v) => g.ostyAttack(t, v.ostyDamage, 1 + (g.t.ostyAttacks || 0)) });
  card('OTHER_HAND', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage. Whenever you play a card that costs ${v.en} or more, return this from your discard pile to your hand.`,
    play: (g, c, t, v) => g.ostyAttack(t, v.ostyDamage) });
  card('SEVER_TIES', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Add a ${hdName('WRAITH')} to your draw pile, hand and discard pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); for (const w of ['draw', 'hand', 'discard']) await g.addWraiths(1, w); } });
  card('PALL', { text: (v) => `Whenever you apply Knell, gain ${v.blk} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'pall', v.blk) });
  card('GO_GET_EM', { text: (v, f, c, g) => `Clutch deals ${od(g, v.ostyDamage)} damage. Whenever Clutch hits the enemy this turn, Rouse ${v.sicEm}.`,
    play: async (g, c, t, v) => { await g.ostyAttack(t, v.ostyDamage); if (t.alive) await g.apply(t, 'sicEm', v.sicEm); } });
  card('FLESH_TRICK', { text: (v) => `Whenever you apply a debuff to an enemy, it takes ${v.sleightOfFlesh} damage.`, play: async (g, c, t, v) => g.addPw(g.p, 'fleshTrick', v.sleightOfFlesh) });
  card('URGE_ON', { text: (v) => `Rouse ${v.summon}. Clutch heals ${v.heal} HP.`, play: async (g, c, t, v) => { await g.summon(v.summon); g.healOsty(v.heal); } });
  card('VEILCUTTER', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. The next Fleeting card you play costs 0.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'veilFree', 1); } });

  // ---------- rare ----------
  card('HOWL_OF_THE_DEAD', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. Costs ${v.en} less for each Fleeting card played this combat.`,
    costFn: (g, c, k) => Math.max(0, k - HD.vals(c).en * fleetingPlayed(g)), play: (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  card('ECHO_OF_THE_DEEP', { text: () => 'At the start of your turn, add a random card to your hand. It is Fleeting.', play: async (g) => g.addPw(g.p, 'echoDeep', 1) });
  card('DOMAIN', { text: () => 'At the start of your turn, gain 1 Energy and draw 1 additional card.', play: async (g) => g.addPw(g.p, 'domain', 1) });
  card('FEED_ON_LIFE', { text: (v) => `Whenever you play a ${hdName('WRAITH')}, Rouse ${v.devourLife}.`, play: async (g, c, t, v) => g.addPw(g.p, 'feedOnLife', v.devourLife) });
  card('SPECTRAL_HOST', { text: () => 'Play ALL Fleeting cards in your Ash pile.',
    play: async (g) => { for (const x of g.ash.filter((y) => fleeting(y) && y.id !== 'SPECTRAL_HOST')) { if (g.over) return; const i = g.ash.indexOf(x); if (i < 0) continue; g.ash.splice(i, 1); await g.autoPlay(x, {}); } } });
  card('LAST_DAYS', { text: (v) => `Apply ${v.doom} Knell to ALL enemies. Enemies with at least as much Knell as HP die.`,
    play: async (g, c, t, v) => { for (const e of g.alive()) await g.applyDoom(e, v.doom); for (const e of g.alive().slice()) if (e.pw.doom && e.hp <= e.pw.doom) await g.doomKill(e); } });
  card('ANNIHILATE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage X times.`, play: (g, c, t, v, x) => (x > 0 ? g.attack(t, v.dmg, x, c) : null) });
  card('GALLOWS', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. ALL ${hdName('GALLOWS')} cards deal double damage to this enemy.`, dmgMult: (g, t) => (t && t.hangMult) || 1,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); t.hangMult = (t.hangMult || 1) * 2; } });
  card('WRETCHEDNESS', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply the enemy's debuffs to ALL other enemies.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, 1, c);
      const debuffs = Object.entries(t.pw).filter(([k, n]) => HD.DEBUFFS.has(k) && n > 0);
      for (const e of g.alive().filter((x) => x !== t)) for (const [k, n] of debuffs) { if (k === 'doom') await g.applyDoom(e, n); else await g.apply(e, k, n); }
    } });
  card('BONE_MASTERY', { text: (v) => `Rouse ${v.summon}. Whenever Clutch loses HP, ALL enemies lose that much HP too.`, play: async (g, c, t, v) => { await g.summon(v.summon); g.p.pw.boneMastery = 1; } });
  card('MIND_SURGE', { text: (v) => `Gain ${v.en} Energy. Draw ${plural(v.draw, 'card')}. At the start of your turn, apply ${v.neurosurge} Knell to yourself.`,
    play: async (g, c, t, v) => { g.gainEnergy(v.en); await g.drawCards(v.draw); g.addPw(g.p, 'mindSurge', v.neurosurge); } });
  card('FORGETTING', { text: (v) => `Whenever you play a card this turn, apply ${v.doom} Knell to the enemy.`, play: async (g, c, t, v) => { g.t.oblivionCard = c; await g.apply(t, 'oblivion', v.doom); } });
  card('RISE_AGAIN', { text: (v) => `Rouse ${v.summon}.`, play: (g, c, t, v) => g.summon(v.summon) });
  card('GRIM_FORM', { text: () => 'Whenever Attacks deal damage, apply that much Knell.', play: async (g) => g.addPw(g.p, 'grimForm', 1) });
  card('OFFERING', { text: (v, f, c, g) => `If Clutch is here, he falls and you gain Guard equal to triple his Max HP.${g && g.ostyAlive ? ` (${3 * ostyMax(g)})` : ''}`,
    play: async (g) => { if (!g.ostyAlive()) return; const n = 3 * g.osty.maxHp; await g.killOsty(); await g.gainBlock(n, false); } });
  card('SPIRIT_CALL', { text: () => `Transform a card in your draw pile into a ${hdName('WRAITH')}.`,
    play: async (g) => { if (!g.draw.length) return; const [x] = await g.choose({ from: g.draw.slice(), n: 1, prompt: `Transform a card into a ${hdName('WRAITH')}` }); if (x) await g.transformInCombat(x, 'WRAITH', false); } });
  card('WATCHFUL_HAND', { text: () => `At the start of your turn, add a ${hdName('SWEEPING_GLARE')} to your hand.`, play: async (g, c, t, v) => g.addPw(g.p, 'watchful', v.sentryMode) });
  card('BOUND_FATES', { text: (v) => `Lose ${v.playerStrengthLoss} Might. The enemy loses ${v.enemyStrengthLoss} Might.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'might', -v.playerStrengthLoss); if (t.alive) g.addPw(t, 'might', -v.enemyStrengthLoss); } });
  card('WRAITH_STORM', { text: (v, f, c, g) => `Deal ${f.d(v.base + v.per * (g && g.ash ? g.ash.filter((x) => x.id === 'WRAITH').length : 0))} damage. Deals ${v.per} more for each ${hdName('WRAITH')} in your Ash pile.`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * g.ash.filter((x) => x.id === 'WRAITH').length, 1, c) });
  card('ASH_SPIRIT', { text: (v) => `Whenever you play a Fleeting card, gain ${v.blockOnExhaust} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'ashSpirit', v.blockOnExhaust) });
  card('CRUSH_GRIP', { text: (v, f, c, g) => `Clutch deals ${od(g, v.base + v.per * (g && g.hand ? clutchCards(g, c) : 0))} damage. Deals ${v.per} more for each of your other Clutch Attacks.`,
    play: (g, c, t, v) => g.ostyAttack(t, v.base + v.per * clutchCards(g, c)) });
  card('THE_SICKLE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. This card deals ${v.inc} more damage for good.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); c.grow = (c.grow || 0) + v.inc; if (c.src) c.src.grow = (c.src.grow || 0) + v.inc; } });
  card('HOUR_STRUCK', { text: (v, f, c, g) => `Deal damage equal to the enemy's Knell.`, play: async (g, c, t, v) => { if (t.pw.doom) await g.attack(t, t.pw.doom, 1, c); } });
  card('REMAKE', { text: () => 'A card in your hand gains Replay 1 and costs 1 more.',
    play: async (g) => { const x = await pickHand(g, (y) => typeof CARDS[y.id].cost === 'number', 'Give a card Replay'); if (x) { x.replay = (x.replay || 0) + 1; x.bonusCost = (x.bonusCost || 0) + 1; } } });
  card('DEATHLESS', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Add a copy of this card to your discard pile.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.create(g.makeCard(c.id, c.up), 'discard'); } });

  // ---------- ancient ----------
  card('BANNED_TOME', { text: () => 'At the end of combat, you may remove a card from your deck.', play: async (g) => g.addPw(g.p, 'bannedTome', 1) });
  card('GUARDIAN_HAND', { text: (v, f, c, g) => `Clutch deals ${od(g, v.base + v.per * ostyMax(g))} damage. Deals additional damage equal to Clutch's Max HP.`,
    play: (g, c, t, v) => g.ostyAttack(t, v.base + v.per * ostyMax(g)) });

  // ---------- co-op only ----------
  for (const id of ['DIN', 'PEEK_BEYOND', 'BONE_LEGION', 'WRAITHBOUND', 'NETHERWORLD']) card(id, { coop: true, text: () => 'Co-op only.', play: async () => {} });

  // ---------- character ----------
  HD.CHARS.UNBURIED = { id: 'UNBURIED', name: 'The Unburied', color: 'unburied', hp: 66, gold: 99, energy: 3,
    deck: ['RAKE', 'RAKE', 'RAKE', 'RAKE', 'BONE_WARD', 'BONE_WARD', 'BONE_WARD', 'BONE_WARD', 'HAND_UP', 'LET_LOOSE'],
    relic: 'BOUND_URN', ancientRelic: 'OPEN_URN', ancientCard: ['LET_LOOSE', 'GUARDIAN_HAND'], strike: 'RAKE', defend: 'BONE_WARD',
    blurb: 'Starts with Bound Urn: at the start of your turn, Rouse 1.' };

  // ---------- relics ----------
  const relic = (rarity, id, o) => { HD.RELICS[id] = Object.assign({ id, rarity, pool: 'unburied' }, o); };
  relic('Starter', 'BOUND_URN', { name: 'Bound Urn', text: 'At the start of your turn, Rouse 1.', turnStart: (g) => g.summon(1) });
  relic('Starter', 'OPEN_URN', { name: 'Open Urn', text: 'At the start of each combat, Rouse 5. At the start of your turn, Rouse 2.', battleStart: (g) => g.summon(5), turnStart: (g) => g.summon(2) });
  relic('Common', 'BONE_WHISTLE', { name: 'Bone Whistle', text: 'Whenever Clutch attacks, gain 2 Guard.', ostyAttacked: (g) => g.gainBlock(2, false) });
  relic('Uncommon', 'BINDING_KNIFE', { name: 'Binding Knife', text: 'Whenever a non-minion enemy dies to Knell, heal 3 HP.', doomKilled: async (g, r, e) => { if (!e.pw.minion) g.heal(3); } });
  relic('Uncommon', 'BURIAL_MASK', { name: 'Burial Mask', text: 'At the start of each combat, add 3 Wraiths to your draw pile.', battleStart: (g) => g.addWraiths(3) });
  relic('Rare', 'RIBBON_MARKER', { name: 'Ribbon Marker', text: 'At the end of each turn, a random Retained card costs 1 less until played.',
    turnEnd: async (g) => { const xs = g.hand.filter((x) => typeof CARDS[x.id].cost === 'number' && g.staysAtEndOfTurn(x)); if (!xs.length) return; const x = g.rng.pick(xs); x.bonusCost = (x.bonusCost || 0) - 1; x.ribbon = (x.ribbon || 0) + 1; } });
  relic('Rare', 'WIDE_BRIM', { name: 'Wide Brim', text: 'At the start of each combat, add 2 random Fleeting cards to your hand.',
    firstHand: async (g) => { const pool = HD.POOL(g.run.color).filter((d) => d.kw.includes('Fleeting')); const ids = pool.length ? pool : HD.POOL('unburied').filter((d) => d.kw.includes('Fleeting'));
      for (let i = 0; i < 2 && ids.length; i++) await g.create(g.makeCard(g.rng.pick(ids).id, false), 'hand'); } });
  relic('Rare', 'BONE_TILE', { name: 'Bone Tile', text: 'Whenever you play a card that costs 3 or more, gain 1 Energy.', afterPlay: async (g, r, c, d, paid) => { if (paid >= 3) g.gainEnergy(1); } });
  relic('Shop', 'DEATHLESS_SEAL', { name: 'Deathless Seal', text: 'Enemies with at least as much Knell as HP deal 50% less damage.' });

  // ---------- potions ----------
  const potion = (id, o) => { HD.POTIONS[id] = Object.assign({ id, pool: 'unburied', target: 'self' }, o); };
  potion('MARROW_BREW', { name: 'Marrow Brew', rarity: 'Uncommon', text: 'Rouse 15.', use: (g) => g.summon(15) });
  potion('JAR_OF_WRAITHS', { name: 'Jar of Wraiths', rarity: 'Rare', text: 'Add 2 Wraiths to your hand.', use: (g) => g.addWraiths(2, 'hand') });
  potion('KNELL_DRAUGHT', { name: 'Knell Draught', rarity: 'Common', target: 'enemy', text: 'Apply 33 Knell.', use: (g, t) => g.applyDoom(t, 33) });

  // ---------- powers, run by the engine hooks below ----------
  const pw = (g) => g.p.pw;
  HD.onEngine('turnStart', async (g) => {
    if (pw(g).rouseNext) { const n = pw(g).rouseNext; delete pw(g).rouseNext; await g.summon(n); }
    if (pw(g).oldFriend) g.gainEnergy(pw(g).oldFriend);
    if (pw(g).domain) { g.gainEnergy(pw(g).domain); g.extraDrawThisTurn += pw(g).domain; }
    if (pw(g).mindSurge) g.addPw(g.p, 'doom', pw(g).mindSurge);
    if (pw(g).finalHours) { const e = g.randomEnemy(); if (e) await g.applyDoom(e, pw(g).finalHours); }
    for (let i = 0; i < (pw(g).echoDeep || 0) && !g.over; i++) { const x = g.makeCard(g.randomPoolCard(() => true), false); x.addKw = ['Fleeting']; await g.create(x, 'hand'); }
    for (let i = 0; i < (pw(g).watchful || 0) && !g.over; i++) await g.create(g.makeCard('SWEEPING_GLARE', false), 'hand');
  });
  HD.onEngine('drawn', async (g, c) => {
    if (g.phase === 'player') g.t.cardsDrawn = (g.t.cardsDrawn || 0) + 1;
    if (pw(g).leafstorm && fleeting(c)) await g.drawCards(pw(g).leafstorm);
  });
  HD.onEngine('afterPlay', async (g, c, d, paid) => {
    if (c.ribbon) { c.bonusCost = (c.bonusCost || 0) + c.ribbon; c.ribbon = 0; }
    if (fleeting(c)) {
      g.rs.fleetingPlayed = (g.rs.fleetingPlayed || 0) + 1;
      if (pw(g).veilFree) g.addPw(g.p, 'veilFree', -1);
      if (pw(g).ashSpirit) await g.gainBlock(pw(g).ashSpirit, false);
    }
    if (c.id === 'WRAITH') {
      if (pw(g).haunting) { const e = g.randomEnemy(); if (e) await g.loseHp(e, pw(g).haunting); }
      if (pw(g).feedOnLife) await g.summon(pw(g).feedOnLife);
    }
    if (paid >= 2) {
      if (pw(g).boneWaltz) await g.gainBlock(pw(g).boneWaltz, false);
      for (const x of g.discard.filter((y) => y.id === 'OTHER_HAND')) { g.discard.splice(g.discard.indexOf(x), 1); g.addToHand(x); }
    }
    if (c !== g.t.oblivionCard) for (const e of g.alive()) if (e.pw.oblivion) await g.applyDoom(e, e.pw.oblivion);
  });
  HD.onEngine('turnEnd', async (g) => { delete pw(g).stolenHours; for (const e of g.enemies) delete e.pw.oblivion; for (const e of g.enemies) delete e.pw.sicEm; });
  HD.onEngine('doomApplied', async (g) => { if (pw(g).pall) await g.gainBlock(pw(g).pall, false); });
  HD.onEngine('debuffApplied', async (g, t) => { if (pw(g).fleshTrick && t.alive) await g.damage(t, pw(g).fleshTrick, {}); });
  HD.onEngine('attackDealt', async (g, t, n) => { if (pw(g).grimForm && t.alive) await g.applyDoom(t, n * pw(g).grimForm); });
  const sorrow = async (g) => { for (const x of [...g.hand, ...g.draw, ...g.discard].filter((y) => y.id === 'SORROW')) x.bonusCost = (x.bonusCost || 0) - HD.vals(x).en; };
  HD.onEngine('onEnemyDeath', sorrow);
  HD.onEngine('died', sorrow);
  HD.onEngine('combatWon', (g) => { for (let i = 0; i < (pw(g).bannedTome || 0); i++) g.run.pending.push({ kind: 'remove', optional: true }); });
  HD.COST_MODS = (HD.COST_MODS || []).concat([
    (g, c, k) => (g.p.pw.veilFree && fleeting(c) ? 0 : k),
    (g, c, k) => k + (g.p.pw.stolenHours || 0),
  ]);

  Object.assign(HD.PW, {
    rouseNext: { n: 'Rouse next turn', t: 'buff', d: (a) => `At the start of your next turn, Rouse ${a}.` },
    stolenHours: { n: 'Stolen Hours', t: 'debuff', d: (a) => `Cards cost ${a} more this turn.` },
    harden: { n: 'Harden', t: 'buff', d: (a) => `Clutch's attacks deal ${a} more damage.` },
    finalHours: { n: 'Final Hours', t: 'buff', d: (a) => `At the start of your turn, apply ${a} Knell to a random enemy.` },
    boneWaltz: { n: 'Bone Waltz', t: 'buff', d: (a) => `Whenever you play a card that costs 2 or more, gain ${a} Guard.` },
    debilitate: { n: 'Weakened Will', t: 'debuff', d: (a) => `Exposed and Sapped are twice as strong on it. ${a} turn(s) left.` },
    oldFriend: { n: 'Old Friend', t: 'buff', d: (a) => `Gain ${a} Energy at the start of each turn.` },
    haunting: { n: 'Haunting', t: 'buff', d: (a) => `Whenever you play a Wraith, a random enemy loses ${a} HP.` },
    lethality: { n: 'Killing Intent', t: 'buff', d: (a) => `The first Attack each turn deals ${a}% more damage.` },
    leafstorm: { n: 'Leafstorm', t: 'buff', d: (a) => `Whenever you draw a Fleeting card, draw ${a} card(s).` },
    pall: { n: 'Pall', t: 'buff', d: (a) => `Whenever you apply Knell, gain ${a} Guard.` },
    sicEm: { n: 'Hunted', t: 'debuff', d: (a) => `Whenever Clutch hits it this turn, Rouse ${a}.` },
    fleshTrick: { n: 'Flesh Trick', t: 'buff', d: (a) => `Whenever you apply a debuff to an enemy, it takes ${a} damage.` },
    veilFree: { n: 'Veilcutter', t: 'buff', d: () => 'The next Fleeting card you play costs 0.' },
    echoDeep: { n: 'Echo of the Deep', t: 'buff', d: (a) => `At the start of your turn, add ${a} random Fleeting card(s) to your hand.` },
    domain: { n: 'Domain', t: 'buff', d: (a) => `At the start of your turn, gain ${a} Energy and draw ${a} more card(s).` },
    feedOnLife: { n: 'Feed on Life', t: 'buff', d: (a) => `Whenever you play a Wraith, Rouse ${a}.` },
    boneMastery: { n: 'Bone Mastery', t: 'buff', d: () => 'Whenever Clutch loses HP, ALL enemies lose that much HP.' },
    mindSurge: { n: 'Mind Surge', t: 'debuff', d: (a) => `At the start of your turn, apply ${a} Knell to yourself.` },
    oblivion: { n: 'Forgetting', t: 'debuff', d: (a) => `Whenever you play a card this turn, it gains ${a} Knell.` },
    grimForm: { n: 'Grim Form', t: 'buff', d: () => 'Whenever Attacks deal damage, apply that much Knell.' },
    watchful: { n: 'Watchful Hand', t: 'buff', d: (a) => `At the start of your turn, add ${a} Sweeping Glare(s) to your hand.` },
    ashSpirit: { n: 'Ash Spirit', t: 'buff', d: (a) => `Whenever you play a Fleeting card, gain ${a} Guard.` },
    bannedTome: { n: 'Banned Tome', t: 'buff', d: () => 'At the end of combat, you may remove a card from your deck.' },
  });
})();

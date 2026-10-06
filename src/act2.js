// Act 2 (the Waxen Hive): monsters, encounters, status cards, and the Ancient Darv. HP and move numbers match the reference build.
// Moves marked approx use a best guess where the data leaves the effect out; see FIDELITY.md.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const mon = (id, o) => { HD.MON[id] = Object.assign({ id, act: 2 }, o); };
  const cyc = (e, seq, loop = 0) => { const i = e.hist.filter((m) => m !== 'STUN').length; return i < seq.length ? seq[i] : seq[loop + ((i - seq.length) % (seq.length - loop))]; };
  const rnd = (g, e, opts) => {
    let c = opts.filter(([id, , nr]) => !(nr && e.last === id));
    if (!c.length) c = opts;
    const tot = c.reduce((a, o) => a + o[1], 0);
    let r = g.mrng.next() * tot;
    for (const o of c) { r -= o[1]; if (r < 0) return o[0]; }
    return c[c.length - 1][0];
  };
  const slot = (e, g) => g.enemies.indexOf(e);
  const lastReal = (e) => e.hist.filter((m) => m !== 'STUN').pop();

  // ---------- status cards ----------
  const card = (id, o) => { CARDS[id] = Object.assign({ id, target: 'self', v: {}, up: {}, kw: [], tags: [], color: 'status', rarity: 'Status', type: 'Status' }, o); };
  card('VENOM', { name: 'Venom', cost: 1, kw: ['Burn'], v: { dmg: 5 }, text: (v) => `At the end of your turn, if this is in your hand, take ${v.dmg} damage.`,
    play: async () => {}, endInHand: async (g, c) => g.damage(g.p, 5, {}) });
  card('SCRAMBLE', { name: 'Scramble', cost: 1, v: {}, text: () => 'Push the sand back: raise Sandpit by 1. This card costs 1 more each time you play it.',
    play: async (g, c) => { g.addPw(g.p, 'sandpit', 1); c.bonusCost = (c.bonusCost || 0) + 1; } });
  card('BELL_TOLL', { name: "Bell's Toll", type: 'Curse', rarity: 'Curse', color: 'curse', cost: null, kw: ['Unplayable', 'Eternal'], text: () => '' });

  // ---------- normal ----------
  mon('CUP_EGG', { name: 'Egg Cupbeetle', hp: [21, 22], moves: { BITE: { name: 'Nip', atk: 7, block: 7 } }, ai: () => 'BITE' });
  mon('CUP_NECTAR', { name: 'Nectar Cupbeetle', hp: [35, 38],
    moves: { THRASH: { name: 'Flail', atk: 3 }, BUFF: { name: 'Sip Nectar', buff: { might: 15 } }, THRASH2: { name: 'Flail', atk: 3 } },
    ai: (e) => cyc(e, ['THRASH', 'BUFF', 'THRASH2'], 2) });
  mon('CUP_ROCK', { name: 'Rock Cupbeetle', hp: [45, 48], init: { imbalanced: 1 },
    moves: { HEADBUTT: { name: 'Headlong', atk: 15 } }, ai: () => 'HEADBUTT' });
  mon('CUP_SILK', { name: 'Silk Cupbeetle', hp: [40, 43], approx: true,
    moves: { THRASH: { name: 'Flail', atk: 4, hits: 2 }, TOXIC_SPIT: { name: 'Spit', debuff: { sapped: 1 } } },
    ai: (e) => cyc(e, ['THRASH', 'TOXIC_SPIT']) });
  mon('GNASHER', { name: 'Gnasher', hp: [60, 64], init: { ward: 2 }, approx: true,
    moves: { CLAMP: { name: 'Clamp', atk: 8, hits: 2 }, SCREECH: { name: 'Screech', status: { id: 'REELING', n: 3, to: 'discard' } } },
    ai: (e) => cyc(e, ['CLAMP', 'SCREECH']) });
  mon('SHELLCRAWLER', { name: 'Shellcrawler', hp: [24, 28], init: { hardToKill: 9 },
    moves: { SKITTER: { name: 'Skitter', atk: 1, hits: 3 }, MANDIBLES: { name: 'Mandibles', atk: 8 }, ENRAGE: { name: 'Rile', buff: { might: 2 } } },
    ai: (e, g) => {
      const last = lastReal(e);
      const rand = () => rnd(g, e, [['SKITTER', 1, true], ['MANDIBLES', 1, true]]);
      if (!last) return ['SKITTER', 'MANDIBLES', 'ENRAGE'][slot(e, g)] || rand();
      return last === 'MANDIBLES' ? 'ENRAGE' : rand();
    } });
  mon('STALKER', { name: 'Stalker Beast', hp: [121, 121], approx: true,
    moves: { TENDERIZING_GOOP: { name: 'Tenderizing Goop', debuff: { tender: 1 } }, BITE: { name: 'Bite', atk: 17 }, PUNCTURE: { name: 'Puncture', atk: 7, hits: 3 } },
    ai: (e, g) => (e.hist.length ? rnd(g, e, [['BITE', 1, true], ['PUNCTURE', 1, true], ['TENDERIZING_GOOP', 1, true]]) : 'TENDERIZING_GOOP') });
  mon('BROOD_LOUSE', { name: 'Brood Louse', hp: [134, 136], init: { curlUp: 14 }, approx: true,
    moves: { WEB_CANNON: { name: 'Web Shot', atk: 9, debuff: { brittle: 2 } }, POUNCE: { name: 'Pounce', atk: 14 }, CURL_AND_GROW: { name: 'Curl and Grow', block: 14, buff: { might: 5 } } },
    ai: (e) => cyc(e, ['WEB_CANNON', 'CURL_AND_GROW', 'POUNCE']) });
  mon('MITE', { name: 'Mite', hp: [61, 67], approx: true,
    moves: { TOXIC: { name: 'Venom Glut', status: { id: 'VENOM', n: 2, to: 'draw' } }, BITE: { name: 'Bite', atk: 13 }, SUCK: { name: 'Suck', atk: 4, buff: { might: 2 } } },
    ai: (e, g) => {
      const last = lastReal(e);
      if (!last) return slot(e, g) === 0 ? 'TOXIC' : 'SUCK';
      return { TOXIC: 'BITE', BITE: 'SUCK', SUCK: 'TOXIC' }[last];
    } });
  mon('EGG_DRONE', { name: 'Egg Drone', hp: [124, 130], approx: true,
    moves: { LAY_EGGS: { name: 'Lay Eggs', summon: 'HARD_EGG', fx: async (g, e) => { e.laid = (e.laid || 0) + 1; } }, SMASH: { name: 'Smash', atk: 16 }, TENDERIZER: { name: 'Tenderizer', atk: 7, debuff: { exposed: 2 } },
      NUTRITIONAL_PASTE: { name: 'Nutritional Paste', buff: { might: 3 } } },
    ai: (e, g) => {
      const last = lastReal(e);
      if (!last) return 'LAY_EGGS';
      if (last === 'LAY_EGGS' || last === 'NUTRITIONAL_PASTE') return 'SMASH';
      if (last === 'SMASH') return 'TENDERIZER';
      return (e.laid || 0) < 2 ? 'LAY_EGGS' : 'NUTRITIONAL_PASTE';
    } });
  mon('HARD_EGG', { name: 'Hard Egg', hp: [14, 18], init: { hatch: 2 }, approx: true,
    moves: { NIBBLE: { name: 'Nibble', atk: 4 },
      HATCH: { name: 'Hatch', fx: async (g, e) => { const at = g.enemies.indexOf(e); e.alive = false; e.fled = true; g.chooseIntent(g.spawn('CUP_EGG', { at })); g.say('The egg hatches.'); } } },
    ai: () => 'NIBBLE' });
  mon('DOZING_BEETLE', { name: 'Dozing Beetle', hp: [86, 86], init: { plate: 15, slumber: 3 }, wake: 'ROLL_OUT',
    moves: { SNORE: { name: 'Snore', sleep: true }, ROLL_OUT: { name: 'Roll Out', atk: 16, buff: { might: 2 } } },
    ai: (e) => (e.pw.slumber ? 'SNORE' : 'ROLL_OUT') });
  mon('THORN_TOAD', { name: 'Thorn Toad', hp: [116, 119], approx: true,
    moves: { PROTRUDING_SPIKES: { name: 'Bristle', buff: { spines: 5 } }, SPIKE_EXPLOSION: { name: 'Spike Burst', atk: 23, fx: async (g, e) => { delete e.pw.spines; } },
      TONGUE_LASH: { name: 'Tongue Lash', atk: 17 } },
    ai: (e) => cyc(e, ['PROTRUDING_SPIKES', 'SPIKE_EXPLOSION', 'TONGUE_LASH']) });
  mon('UMBRA', { name: 'The Umbra', hp: [123, 123], approx: true,
    moves: { ILLUSION: { name: 'Cast Illusion', summon: 'FRIGHT' }, PIERCING_GAZE: { name: 'Piercing Gaze', atk: 10 }, SAIL: { name: 'Drift', buff: { might: 2 } },
      HARDENING_STRIKE: { name: 'Hardening Strike', atk: 6, block: 6 } },
    ai: (e, g) => (!e.hist.length || !g.alive().some((x) => x.id === 'FRIGHT') && !g.enemies.some((x) => x.id === 'FRIGHT' && x.reviveTurn)
      ? 'ILLUSION' : rnd(g, e, [['PIERCING_GAZE', 1, true], ['SAIL', 1, true], ['HARDENING_STRIKE', 1, true]])) });
  mon('FRIGHT', { name: 'Fright', hp: [21, 21], init: { illusion: 1, minion: 1 }, moves: { SLAM: { name: 'Slam', atk: 16 } }, ai: () => 'SLAM' });
  mon('PILFER_HOPPER', { name: 'Pilfer Hopper', hp: [79, 79], init: { escapeArtist: 1 }, approx: true,
    moves: { THIEVERY: { name: 'Thievery', atk: 17, each: async (g, e) => { const n = Math.min(15, g.run.gold); g.run.gold -= n; e.stolen = (e.stolen || 0) + n; g.seize(e, 'gold', n); if (n) g.say(`${e.name} steals ${n} Gold.`); } },
      FLUTTER: { name: 'Flutter', buff: { flutter: 5 } }, HAT_TRICK: { name: 'Hat Trick', atk: 21 }, NAB: { name: 'Nab', atk: 14 }, ESCAPE: { name: 'Escape', escape: true } },
    ai: (e) => cyc(e, ['THIEVERY', 'FLUTTER', 'HAT_TRICK', 'NAB', 'ESCAPE'], 4) });
  mon('BURROWER', { name: 'Burrower', hp: [87, 87],
    moves: { BITE: { name: 'Bite', atk: 13 }, BURROW: { name: 'Burrow', block: 32, buff: { burrowed: 1 } }, BELOW: { name: 'Strike from Below', atk: 23 } },
    // Bite, Burrow, then Strike from Below every turn until it is dug out (stunned), then Bite again.
    ai: (e) => { const last = e.hist[e.hist.length - 1]; return !last || last === 'STUN' ? 'BITE' : { BITE: 'BURROW', BURROW: 'BELOW', BELOW: 'BELOW' }[last]; } });

  // ---------- elites ----------
  const segMoves = { WRITHE: { name: 'Writhe', atk: 5, hits: 2 }, BULK: { name: 'Bulk Up', atk: 6, buff: { might: 2 } }, CONSTRICT: { name: 'Constrict', atk: 8, debuff: { sapped: 1 } } };
  const segAi = (e, g) => rnd(g, e, [['WRITHE', 1, true], ['BULK', 1, true], ['CONSTRICT', 1, true]]);
  mon('CENTICOIL_HEAD', { name: 'Centicoil Head', hp: [40, 46], init: { reattach: 25 }, approx: true, moves: segMoves, ai: segAi });
  mon('CENTICOIL_BODY', { name: 'Centicoil Body', hp: [40, 46], init: { reattach: 25 }, approx: true, moves: segMoves, ai: segAi });
  mon('CENTICOIL_TAIL', { name: 'Centicoil Tail', hp: [40, 46], init: { reattach: 25 }, approx: true, moves: segMoves, ai: segAi });
  mon('SWARM_CALLER', { name: 'Swarm Caller', hp: [145, 145], init: { personalHive: 1 }, approx: true,
    moves: { BEES: { name: 'Swarm', atk: 3, hits: 7 }, SPEAR: { name: 'Stinger', atk: 18 }, PHEROMONE_SPIT: { name: 'Pheromone Spit', buff: { personalHive: 1, might: 1 } } },
    ai: (e) => cyc(e, ['BEES', 'SPEAR', 'PHEROMONE_SPIT']) });
  mon('HIVE_PRISM', { name: 'Hive Prism', hp: [161, 161], init: { vitalSpark: 2 },
    moves: { JAB: { name: 'Jab', atk: 15 }, RADIATE: { name: 'Radiate', atk: 11, block: 11 }, WHIRLWIND: { name: 'Whirl', atk: 5, hits: 3 },
      PULSATE: { name: 'Pulsate', atk: 8, block: 20, buff: { vitalSpark: 2 } } },
    ai: (e) => cyc(e, ['JAB', 'RADIATE', 'WHIRLWIND', 'PULSATE']) });

  // ---------- bosses ----------
  mon('CRAB_CLAW', { name: 'Claw Crab', hp: [209, 209], init: { backAttack: 1, crabRage: 1 },
    moves: { THRASH: { name: 'Thrash', atk: 12 }, ENLARGING_STRIKE: { name: 'Swelling Strike', atk: 4 }, BUG_STING: { name: 'Sting', atk: 6, hits: 2, debuff: { sapped: 2, brittle: 2 } },
      ADAPT: { name: 'Adapt', buff: { might: 2 } }, GUARDED_STRIKE: { name: 'Guarded Strike', atk: 12, block: 18 } },
    ai: (e) => cyc(e, ['THRASH', 'ENLARGING_STRIKE', 'BUG_STING', 'ADAPT', 'GUARDED_STRIKE']) });
  mon('CRAB_CANNON', { name: 'Cannon Crab', hp: [199, 199], init: { backAttack: 1, crabRage: 1 },
    moves: { TARGETING_RETICLE: { name: 'Take Aim', atk: 3 }, PRECISION_BEAM: { name: 'Precision Beam', atk: 18 }, CHARGE_UP: { name: 'Charge Up', buff: { might: 2 } },
      LASER: { name: 'Laser', atk: 31 }, RECHARGE: { name: 'Recharge', sleep: true } },
    ai: (e) => cyc(e, ['TARGETING_RETICLE', 'PRECISION_BEAM', 'CHARGE_UP', 'LASER', 'RECHARGE']) });
  mon('LORE_FIEND', { name: 'Lore Fiend', hp: [379, 379], approx: true,
    moves: { CURSE_OF_KNOWLEDGE: { name: 'Curse of Knowledge', each: async (g) => { g.addStatus({ id: g.mrng.pick(HD.RANDOM_CURSES), n: 1, to: 'draw' }); }, fx: async (g, e) => { e.curses = (e.curses || 0) + 1; }, debuff: {} },
      SLAP: { name: 'Slap', atk: 17 }, KNOWLEDGE_OVERWHELMING: { name: 'Overwhelm', atk: 8, hits: 3 },
      PONDER: { name: 'Ponder', atk: 11, buff: { might: 2 }, fx: async (g, e) => { e.hp = Math.min(e.maxHp, e.hp + 30); g.emit('heal', e, 30); } } },
    ai: (e) => ({ undefined: 'CURSE_OF_KNOWLEDGE', CURSE_OF_KNOWLEDGE: 'SLAP', SLAP: 'KNOWLEDGE_OVERWHELMING', KNOWLEDGE_OVERWHELMING: 'PONDER',
      PONDER: (e.curses || 0) < 3 ? 'CURSE_OF_KNOWLEDGE' : 'SLAP' })[lastReal(e)] });
  mon('GLUTTON', { name: 'The Glutton', hp: [321, 321], approx: true,
    moves: { LIQUIFY_GROUND: { name: 'Liquify Ground', each: async (g) => { g.addPw(g.p, 'sandpit', 8); g.addStatus({ id: 'SCRAMBLE', n: 2, to: 'draw' }); }, debuff: {} },
      THRASH: { name: 'Thrash', atk: 8, hits: 2 }, THRASH_MOVE_2: { name: 'Thrash', atk: 8, hits: 2 }, LUNGING_BITE: { name: 'Lunging Bite', atk: 28 }, SALIVATE: { name: 'Salivate', buff: { might: 2 } } },
    ai: (e) => cyc(e, ['LIQUIFY_GROUND', 'THRASH', 'LUNGING_BITE', 'SALIVATE', 'THRASH_MOVE_2'], 1) });

  // ---------- encounters ----------
  const E = HD.ENC;
  Object.assign(E, {
    CUPBEETLES_WEAK: { name: 'Cupbeetles', act: 2, pool: 'weak', approx: true, build: (r) => r.shuffle(['CUP_EGG', 'CUP_NECTAR', 'CUP_ROCK']).slice(0, 2) },
    SHELLS_WEAK: { name: 'Shellcrawlers', act: 2, pool: 'weak', approx: true, mons: ['SHELLCRAWLER', 'SHELLCRAWLER'] },
    HOPPER_WEAK: { name: 'Pilfer Hopper', act: 2, pool: 'weak', mons: ['PILFER_HOPPER'] },
    BURROWER_WEAK: { name: 'Burrower', act: 2, pool: 'weak', mons: ['BURROWER'] },
    CUPBEETLE_SWARM: { name: 'Cupbeetle Swarm', act: 2, pool: 'normal', mons: ['CUP_EGG', 'CUP_NECTAR', 'CUP_ROCK', 'CUP_SILK'] },
    GNASHERS: { name: 'Gnasher Pair', act: 2, pool: 'normal', mons: ['GNASHER', 'GNASHER'] },
    SHELLS: { name: 'Shellcrawler Nest', act: 2, pool: 'normal', approx: true, mons: ['SHELLCRAWLER', 'SHELLCRAWLER', 'SHELLCRAWLER', 'SHELLCRAWLER'] },
    STALKER: { name: 'Stalker Beast', act: 2, pool: 'normal', mons: ['STALKER'] },
    BROOD_LOUSE: { name: 'Brood Louse', act: 2, pool: 'normal', mons: ['BROOD_LOUSE'] },
    MITES: { name: 'Mite Mass', act: 2, pool: 'normal', approx: true, mons: ['MITE', 'MITE'] },
    EGG_DRONE: { name: 'Egg Drone', act: 2, pool: 'normal', mons: ['HARD_EGG', 'EGG_DRONE'] },
    SLUMBER_PARTY: { name: 'Sleeping Nest', act: 2, pool: 'normal', mons: ['CUP_ROCK', 'CUP_SILK', 'DOZING_BEETLE'] },
    THORN_TOAD: { name: 'Thorn Toad', act: 2, pool: 'normal', mons: ['THORN_TOAD'] },
    UMBRA: { name: 'The Umbra', act: 2, pool: 'normal', mons: ['UMBRA'], leader: 'UMBRA' },
    CENTICOIL: { name: 'Centicoil', act: 2, pool: 'elite', mons: ['CENTICOIL_HEAD', 'CENTICOIL_BODY', 'CENTICOIL_TAIL'] },
    SWARM_CALLER: { name: 'Swarm Caller', act: 2, pool: 'elite', mons: ['SWARM_CALLER'] },
    HIVE_PRISM: { name: 'Hive Prism', act: 2, pool: 'elite', mons: ['HIVE_PRISM'] },
    CRABS: { name: 'Twin Crab', act: 2, pool: 'boss', mons: ['CRAB_CLAW', 'CRAB_CANNON'] },
    LORE_FIEND: { name: 'Lore Fiend', act: 2, pool: 'boss', mons: ['LORE_FIEND'] },
    GLUTTON: { name: 'The Glutton', act: 2, pool: 'boss', mons: ['GLUTTON'] },
  });

  // ---------- Darv: the Ancient between acts ----------
  const relic = (id, o) => { HD.RELICS[id] = Object.assign({ id, rarity: 'Ancient', pool: 'darv' }, o); };
  const energy = async (g) => { g.maxEnergy += 1; };
  relic('STAR_DIAL', { name: 'Star Dial', text: 'On pickup, Transform 3 cards, then Upgrade them.', onPickup: (run) => { for (let i = 0; i < 3; i++) run.pending.push({ kind: 'transform', up: true }); } });
  relic('DARK_STAR', { name: 'Dark Star', text: 'Elites drop an additional Relic when defeated.' });
  relic('SUMMON_BELL', { name: 'Summoning Bell', text: "On pickup, obtain a unique Curse and 3 Relics.",
    onPickup: (run) => { run.addCard('BELL_TOLL'); for (let i = 0; i < 3; i++) run.addRelic(run.rollRelic()); } });
  relic('DUSTY_BOOK', { name: 'Dusty Book', text: 'On pickup, obtain an Ancient card.',
    onPickup: (run) => { const xs = Object.values(CARDS).filter((d) => d.color === run.color && d.rarity === 'Ancient'); if (xs.length) run.addCard(run.rng.misc.pick(xs).id); } });
  relic('GHOST_SLIME', { name: 'Ghost Slime', text: 'You can no longer gain Gold. Gain 1 Energy at the start of each turn.', battleStart: energy });
  relic('OPEN_CAGE', { name: 'Open Cage', text: 'On pickup, remove 2 cards from your deck.', onPickup: (run) => { run.pending.push({ kind: 'remove' }, { kind: 'remove' }); } });
  relic('TRICK_CHEST', { name: 'Trick Chest', text: 'On pickup, Transform ALL Cut and Brace cards.',
    onPickup: (run) => { for (const c of run.deck.filter((x) => CARDS[x.id].rarity === 'Basic' && (CARDS[x.id].tags.includes('Cut') || CARDS[x.id].tags.includes('Brace')))) run.transform(c); } });
  relic('SAGE_STONE', { name: 'Sage Stone', text: 'Gain 1 Energy at the start of each turn. ALL enemies start combat with 1 Might.',
    battleStart: async (g) => { g.maxEnergy += 1; for (const e of g.alive()) g.addPw(e, 'might', 1); } });
  relic('GLYPH_PYRAMID', { name: 'Glyph Pyramid', text: 'At the end of your turn, you no longer discard your hand.' });
  relic('SNAKE_EYE', { name: 'Snake Eye', text: 'At the start of your turn, draw 2 additional cards. Start each combat Confused.',
    battleStart: async (g) => { g.p.pw.confused = 1; }, turnStart: async (g) => { g.extraDrawThisTurn += 2; } });
  relic('DRY_FLASK', { name: 'Dry Flask', text: 'Gain 1 Energy at the start of each turn. You can no longer obtain potions.', battleStart: energy });
  relic('VELVET_COLLAR', { name: 'Velvet Collar', text: 'Gain 1 Energy at the start of each turn. You cannot play more than 6 cards per turn.', battleStart: energy });
  HD.ANCIENTS = { DARV: { name: 'The Hoarder', pool: ['STAR_DIAL', 'DARK_STAR', 'SUMMON_BELL', 'DUSTY_BOOK', 'GHOST_SLIME', 'OPEN_CAGE', 'TRICK_CHEST', 'SAGE_STONE', 'GLYPH_PYRAMID', 'SNAKE_EYE', 'DRY_FLASK', 'VELVET_COLLAR'] } };
})();

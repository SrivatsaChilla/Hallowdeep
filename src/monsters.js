// Act 1 (The Rootworks) monsters and encounters. HP and move numbers match the reference build.
// Moves marked APPROX use a best-guess order or status count; see FIDELITY.md.
(function () {
  const HD = globalThis.HD;
  const MON = (HD.MON = {});
  const mon = (id, o) => { MON[id] = Object.assign({ id }, o); };

  // Cycle through seq; after the end, loop back to index `loop`.
  const cyc = (e, seq, loop = 0) => {
    const i = e.hist.length;
    if (i < seq.length) return seq[i];
    return seq[loop + ((i - seq.length) % (seq.length - loop))];
  };
  // Weighted pick. flags: nr = never twice in a row, once = only once per combat.
  const rnd = (g, e, opts) => {
    let c = opts.filter(([id, , f = {}]) => !(f.nr && e.last === id) && !(f.once && e.hist.includes(id)));
    if (!c.length) c = opts;
    const tot = c.reduce((a, o) => a + o[1], 0);
    let r = g.mrng.next() * tot;
    for (const o of c) { r -= o[1]; if (r < 0) return o[0]; }
    return c[c.length - 1][0];
  };

  // ---------- Normal ----------
  mon('GNAWLET', { name: 'Gnawlet', hp: [42, 46],
    moves: { BUTT: { name: 'Headlong', atk: 12 }, SLICE: { name: 'Nip', atk: 6, block: 5 }, HISS: { name: 'Bristle', buff: { might: 2 } } },
    ai: (e, g) => { const a = g.alive(); if (a.length === 1) return 'BUTT'; return a[0] === e ? 'SLICE' : 'HISS'; } });
  mon('MOSSGRUB', { name: 'Mossgrub', hp: [55, 57], approx: true,
    moves: { GOOP: { name: 'Spit', atk: 4 }, INHALE: { name: 'Swell', buff: { might: 7 } } },
    ai: (e) => cyc(e, ['GOOP', 'INHALE']) });
  mon('PINCH_WEEVIL', { name: 'Pinch Weevil', hp: [38, 40],
    moves: { SHRINK: { name: 'Pinch Down', debuff: { shrink: 1 } }, CHOMP: { name: 'Nibble', atk: 7 }, STOMP: { name: 'Stomp', atk: 13 } },
    ai: (e) => cyc(e, ['SHRINK', 'CHOMP', 'STOMP'], 1) });
  mon('MOSS_OOZE', { name: 'Moss Ooze', hp: [32, 35], approx: true,
    moves: { CLUMP: { name: 'Glob', atk: 8 }, STICKY: { name: 'Spatter', status: { id: 'SLUDGE', n: 2, to: 'discard' } } },
    ai: (e) => cyc(e, ['STICKY', 'CLUMP']) });
  mon('MOSS_OOZE_S', { name: 'Moss Droplet', hp: [11, 15], approx: true,
    moves: { TACKLE: { name: 'Bump', atk: 3 }, GOOP: { name: 'Spatter', status: { id: 'SLUDGE', n: 1, to: 'discard' } } },
    ai: (e, g) => rnd(g, e, [['TACKLE', 1, { nr: true }], ['GOOP', 1, { nr: true }]]) });
  mon('BARK_OOZE', { name: 'Bark Ooze', hp: [26, 28], approx: true,
    moves: { POUNCE: { name: 'Pounce', atk: 11 }, STICKY: { name: 'Spatter', status: { id: 'SLUDGE', n: 1, to: 'discard' } } },
    ai: (e, g) => (e.hist.length === 0 ? 'STICKY' : rnd(g, e, [['POUNCE', 1, { nr: true }], ['STICKY', 1, { nr: true }]])) });
  mon('BARK_OOZE_S', { name: 'Bark Droplet', hp: [7, 11],
    moves: { TACKLE: { name: 'Bump', atk: 4 } }, ai: () => 'TACKLE' });
  mon('COGSTONE', { name: 'Cogstone', hp: [65, 65], init: { ward: 1 },
    moves: { CHARGE: { name: 'Wind Up', buff: { might: 2 } }, BLAST: { name: 'Repeater', atk: 7, buff: { might: 2 } },
      BLAST2: { name: 'Repeater', atk: 7, buff: { might: 2 } }, EXPEL: { name: 'Vent', atk: 5, hits: 2 } },
    ai: (e) => cyc(e, ['CHARGE', 'BLAST', 'BLAST2', 'EXPEL'], 1) });
  mon('SPOREWING', { name: 'Sporewing', hp: [47, 49],
    moves: { VSPORE: { name: 'Rot Spores', atk: 8, debuff: { exposed: 2 } }, FSPORE: { name: 'Dust Spores', atk: 8, debuff: { brittle: 2 } }, SMASH: { name: 'Slam', atk: 11 } },
    ai: (e, g) => rnd(g, e, [['VSPORE', 1, { nr: true }], ['FSPORE', 1, { nr: true }], ['SMASH', 1, { nr: true }]]) });
  mon('MISTMAW', { name: 'Mistmaw', hp: [74, 74], approx: true,
    moves: { CONJURE: { name: 'Conjure', summon: 'GLAREBUD' }, RAKE: { name: 'Rake', atk: 8, buff: { might: 1 } }, BUTT: { name: 'Butt', atk: 14 } },
    ai: (e, g) => (e.hist.length === 0 ? 'CONJURE' : rnd(g, e, [['RAKE', 40, { nr: true }], ['BUTT', 60, { nr: true }]])) });
  mon('GLAREBUD', { name: 'Glarebud', hp: [6, 6], init: { illusion: 1, minion: 1 }, approx: true,
    moves: { STARE: { name: 'Stare', status: { id: 'REELING', n: 1, to: 'draw' } } }, ai: () => 'STARE' });
  mon('BLOTLING', { name: 'Blotling', hp: [11, 17], init: { slippery: 1 },
    moves: { JAB: { name: 'Jab', atk: 3 }, TWIRL: { name: 'Twirl', atk: 2, hits: 3 }, GLARE: { name: 'Glare', atk: 10 } },
    ai: (e, g) => (e.hist.length === 0 ? 'TWIRL' : e.hist.length === 1 ? 'JAB'
      : rnd(g, e, [['JAB', 1, { nr: true }], ['TWIRL', 1, { nr: true }], ['GLARE', 1, { nr: true }]])) });
  mon('RIPJAW', { name: 'Ripjaw', hp: [72, 72],
    moves: { RIP: { name: 'Rend', atk: 14 }, ROAR: { name: 'Howl', debuff: { exposed: 3 } }, CLAW: { name: 'Claw', atk: 4, hits: 2 } },
    ai: (e, g) => (e.hist.length === 0 ? 'CLAW' : rnd(g, e, [['RIP', 1, { nr: true }], ['ROAR', 1, { once: true }], ['CLAW', 1, { nr: true }]])) });
  mon('THORNLURCH', { name: 'Thornlurch', hp: [61, 61],
    moves: { LASH: { name: 'Lash', atk: 6, hits: 2 }, SNARE: { name: 'Snare', atk: 8, debuff: { tangled: 1 } }, GNASH: { name: 'Gnash', atk: 16 } },
    ai: (e) => cyc(e, ['LASH', 'SNARE', 'GNASH']) });
  mon('SNAPGOURD', { name: 'Snapgourd', hp: [31, 33],
    moves: { SNAP: { name: 'Snap', atk: 3, buff: { might: 2 } } }, ai: () => 'SNAP' });
  mon('COILVINE', { name: 'Coilvine', hp: [53, 55],
    moves: { COIL: { name: 'Coil', debuff: { constrict: 3 } }, THWACK: { name: 'Thwack', atk: 7, block: 5 }, WHIP: { name: 'Whip', atk: 12 } },
    ai: (e, g) => (e.hist.length === 0 ? 'COIL' : rnd(g, e, [['THWACK', 1, { nr: true }], ['WHIP', 1, { nr: true }]])) });
  mon('CUTTHROAT', { name: 'Garnet Cutthroat', hp: [18, 23], moves: { STAB: { name: 'Backstab', atk: 10 } }, ai: () => 'STAB' });
  mon('HATCHET', { name: 'Garnet Hatchet', hp: [20, 22],
    moves: { CHOP: { name: 'Chop', atk: 5, block: 5 }, CHOP2: { name: 'Chop', atk: 5, block: 5 }, CLEAVER: { name: 'Big Chop', atk: 12 } },
    ai: (e) => cyc(e, ['CHOP', 'CHOP2', 'CLEAVER']) });
  mon('BRUISER', { name: 'Garnet Bruiser', hp: [30, 33], approx: true,
    moves: { BEAT: { name: 'Pummel', atk: 7 }, BELLOW: { name: 'Bellow', buff: { might: 3 } } }, ai: (e) => cyc(e, ['BEAT', 'BELLOW']) });
  mon('BOLTER', { name: 'Garnet Bolter', hp: [18, 21], approx: true,
    moves: { LOOSE: { name: 'Loose', atk: 14 }, RELOAD: { name: 'Reload', block: 3 } }, ai: (e) => cyc(e, ['RELOAD', 'LOOSE']) });
  mon('HOUNDMASTER', { name: 'Garnet Houndmaster', hp: [21, 25], approx: true,
    moves: { MARK: { name: 'Mark', debuff: { brittle: 2 } }, HOUNDS: { name: 'Release Hounds', atk: 1, hits: 8 } }, ai: (e) => cyc(e, ['MARK', 'HOUNDS']) });

  // ---------- Elites ----------
  mon('SLEEPING_IDOL', { name: 'Sleeping Idol', hp: [127, 127], init: { slow: 1 },
    moves: { SLEEP: { name: 'Dormant', sleep: true }, WAKE: { name: 'Stir', buff: { might: 10 } }, CARVE: { name: 'Carve', atk: 13 } },
    ai: (e) => cyc(e, ['SLEEP', 'WAKE', 'CARVE'], 2) });
  mon('CRAG_ROC', { name: 'Crag Roc', hp: [81, 84], init: { territorial: 1 },
    moves: { PECK: { name: 'Peck', atk: 3, hits: 3 }, DIVE: { name: 'Dive', atk: 17 } }, ai: (e) => cyc(e, ['DIVE', 'PECK']) });
  mon('BROOD_TOAD', { name: 'Brood Toad', hp: [61, 64], init: { infested: 4 }, approx: true,
    moves: { SPEW: { name: 'Spew', status: { id: 'BLIGHT', n: 2, to: 'discard' } }, TONGUE: { name: 'Tongue', atk: 4, hits: 4 } },
    ai: (e) => cyc(e, ['SPEW', 'TONGUE']) });
  mon('SQUIRMER', { name: 'Squirmer', hp: [17, 21],
    moves: { EMERGE: { name: 'Emerging', sleep: true }, BITE: { name: 'Bite', atk: 6 }, WRITHE: { name: 'Writhe', buff: { might: 2 } } },
    ai: (e, g) => {
      if (e.spawned && e.hist.length === 0) return 'EMERGE';
      const last = e.hist.filter((m) => m !== 'EMERGE').pop();
      if (last) return last === 'BITE' ? 'WRITHE' : 'BITE';
      return g.enemies.filter((x) => x.id === 'SQUIRMER').indexOf(e) % 2 === 0 ? 'BITE' : 'WRITHE';
    } });

  // ---------- Bosses ----------
  mon('SMEARWRAITH', { name: 'Smearwraith', hp: [173, 173], init: { slippery: 8 },
    moves: { BLOT: { name: 'Blot', atk: 7 }, LANCE: { name: 'Ink Lance', atk: 6, hits: 2 }, UNMAKE: { name: 'Unmake', atk: 26 }, GATHER: { name: 'Gather', buff: { might: 2 } } },
    ai: (e) => cyc(e, ['BLOT', 'LANCE', 'UNMAKE', 'GATHER']) });
  mon('RITE_OX', { name: 'Rite Ox', hp: [252, 252],
    moves: { CONSECRATE: { name: 'Consecrate', buff: { plow: 150 } }, PLOW: { name: 'Plow', atk: 18, buff: { might: 2 } },
      STUN: { name: 'Stunned', stun: true }, BELLOW: { name: 'Bellow', debuff: { ringing: 1 } },
      TRAMPLE: { name: 'Trample', atk: 15 }, CRUSH: { name: 'Crush', atk: 17, buff: { might: 3 } } },
    ai: (e) => {
      if (!e.broken) return e.hist.length === 0 ? 'CONSECRATE' : 'PLOW';
      const seq = ['BELLOW', 'TRAMPLE', 'CRUSH'];
      const i = e.hist.length - e.brokeAt;
      return seq[i % 3];
    } });
  mon('CHOIR_ABBOT', { name: 'Choir Abbot', hp: [190, 190],
    moves: { RUST: { name: 'Orb of Rust', atk: 8, debuff: { brittle: 1 } }, DREAD: { name: 'Orb of Dread', atk: 8, debuff: { sapped: 1 } },
      BEAM: { name: 'Soul Beam', atk: 3, hits: 3 }, RITE: { name: 'Dark Rite', buff: { might: 2 } } },
    ai: (e) => cyc(e, ['RUST', 'DREAD', 'BEAM', 'RITE']) });
  mon('CHOIR_NOVICE', { name: 'Choir Novice', hp: [58, 59], init: { minion: 1 },
    moves: { SWAY: { name: 'Sway', buff: { might: 2 } }, QUICK: { name: 'Quick Cut', atk: 5 }, BOOM: { name: 'Boomerang', atk: 2, hits: 2 } },
    ai: (e) => cyc(e, ['SWAY', 'QUICK', 'BOOM']) });

  // ---------- Encounters ----------
  // mons: fixed list, or build(rng) for randomized groups. leader: index whose death removes minions.
  HD.ENC = {
    GNAWLET_WEAK: { name: 'Gnawlet', pool: 'weak', mons: ['GNAWLET'] },
    WEEVIL_WEAK: { name: 'Pinch Weevil', pool: 'weak', mons: ['PINCH_WEEVIL'] },
    MOSSGRUB_WEAK: { name: 'Mossgrub', pool: 'weak', mons: ['MOSSGRUB'] },
    OOZES_WEAK: { name: 'Oozes', pool: 'weak', approx: true, build: (r) => [r.pick(['MOSS_OOZE', 'BARK_OOZE']), r.pick(['MOSS_OOZE_S', 'BARK_OOZE_S'])] },

    COGSTONE: { name: 'Cogstone', pool: 'normal', mons: ['COGSTONE'] },
    SPOREWING: { name: 'Sporewing', pool: 'normal', approx: true, build: (r) => ['SPOREWING', r.pick(['MOSS_OOZE', 'BARK_OOZE'])] },
    MISTMAW: { name: 'Mistmaw', pool: 'normal', approx: true, mons: ['GLAREBUD', 'MISTMAW'], leader: 'MISTMAW' },
    BLOTLINGS: { name: 'Blotlings', pool: 'normal', approx: true, mons: ['BLOTLING', 'BLOTLING', 'BLOTLING'] },
    RIPJAW: { name: 'Ripjaw', pool: 'normal', mons: ['RIPJAW'] },
    GNAWLETS: { name: 'Gnawlets', pool: 'normal', approx: true, mons: ['GNAWLET', 'GNAWLET'] },
    CRAWLERS: { name: 'Crawlers', pool: 'normal', mons: ['MOSSGRUB', 'PINCH_WEEVIL'] },
    BANDITS: { name: 'Garnet Bandits', pool: 'normal', approx: true, build: (r) => r.shuffle(['CUTTHROAT', 'HATCHET', 'BRUISER', 'BOLTER', 'HOUNDMASTER']).slice(0, 3) },
    OOZES: { name: 'Ooze Pile', pool: 'normal', approx: true, mons: ['MOSS_OOZE', 'BARK_OOZE', 'MOSS_OOZE_S', 'BARK_OOZE_S'] },
    COILVINE: { name: 'Coilvine', pool: 'normal', approx: true, mons: ['COILVINE', 'SNAPGOURD'] },
    SNAPGOURD: { name: 'Snapgourd', pool: 'normal', approx: true, mons: ['SNAPGOURD', 'SPOREWING'] },
    THORNLURCH: { name: 'Thornlurch', pool: 'normal', mons: ['THORNLURCH'] },

    IDOL: { name: 'Sleeping Idol', pool: 'elite', mons: ['SLEEPING_IDOL'] },
    ROC: { name: 'Crag Roc', pool: 'elite', mons: ['CRAG_ROC'] },
    TOAD: { name: 'Brood Toad', pool: 'elite', mons: ['BROOD_TOAD'] },

    SMEARWRAITH: { name: 'Smearwraith', pool: 'boss', mons: ['SMEARWRAITH'] },
    RITE_OX: { name: 'Rite Ox', pool: 'boss', mons: ['RITE_OX'] },
    CHOIR: { name: 'The Choir', pool: 'boss', mons: ['CHOIR_NOVICE', 'CHOIR_ABBOT', 'CHOIR_NOVICE'], leader: 'CHOIR_ABBOT' },
  };
  // Act 1 monsters use their own move keys; these point each one at the data's move id (for original names and audits).
  HD.MOVE_ALIASES = {
    BROOD_TOAD: { SPEW: 'INFECT', TONGUE: 'LASH' }, CHOIR_ABBOT: { RUST: 'ORB_OF_FRAILTY', DREAD: 'ORB_OF_WEAKNESS', RITE: 'RITUAL' },
    CHOIR_NOVICE: { SWAY: 'POWER_DANCE', QUICK: 'QUICK_SLASH', BOOM: 'BOOMERANG' }, COGSTONE: { CHARGE: 'CHARGE_UP', BLAST: 'REPEATER_BLAST', BLAST2: 'REPEATER_BLAST_MOVE_2' },
    CRAG_ROC: { DIVE: 'SWOOP' }, CUTTHROAT: { STAB: 'KILLSHOT' }, GLAREBUD: { STARE: 'DISTRACT' }, HATCHET: { CHOP: 'SWING_1', CHOP2: 'SWING_2', CLEAVER: 'BIG_SWING' },
    MOSS_OOZE: { CLUMP: 'CLUMP_SHOT', STICKY: 'STICKY_SHOT' }, PINCH_WEEVIL: { SHRINK: 'SHRINKER' }, RITE_OX: { CONSECRATE: 'STAMP', BELLOW: 'BEAST_CRY', TRAMPLE: 'STOMP' },
    SLEEPING_IDOL: { CARVE: 'SLASHES' }, SMEARWRAITH: { BLOT: 'INK_BLOT', LANCE: 'INKY_LANCE', UNMAKE: 'DISMEMBER', GATHER: 'PREPARE' }, SNAPGOURD: { SNAP: 'ENERGY_ORB' },
    THORNLURCH: { LASH: 'SWIPE', SNARE: 'GRASPING_VINES', GNASH: 'CHOMP' },
  };
  HD.encPool = (pool, act = 1) => Object.keys(HD.ENC).filter((k) => HD.ENC[k].pool === pool && (HD.ENC[k].act || 1) === act);
})();

// Act 3 (the Gilded Court): monsters and encounters. HP and move numbers match the reference build.
// Moves marked approx use a best guess where the data leaves the effect out; see FIDELITY.md.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const mon = (id, o) => { HD.MON[id] = Object.assign({ id, act: 3 }, o); };
  const real = (e) => e.hist.filter((m) => m !== 'STUN');
  const lastReal = (e) => real(e).pop();
  const cyc = (e, seq, loop = 0) => { const i = real(e).length; return i < seq.length ? seq[i] : seq[loop + ((i - seq.length) % (seq.length - loop))]; };
  const rnd = (g, e, opts) => {
    let c = opts.filter(([id, , nr]) => !(nr && e.last === id));
    if (!c.length) c = opts;
    const tot = c.reduce((a, o) => a + o[1], 0);
    let r = g.mrng.next() * tot;
    for (const o of c) { r -= o[1]; if (r < 0) return o[0]; }
    return c[c.length - 1][0];
  };
  const steal = (key, stolenKey, n) => async (g, e) => { g.addPw(g.p, key, -n); g.seize(e, key, n); e[stolenKey] = (e[stolenKey] || 0) + n; e.pw[key === 'might' ? 'possessMight' : 'possessPoise'] = e[stolenKey]; };

  // ---------- status cards ----------
  const card = (id, o) => { CARDS[id] = Object.assign({ id, target: 'self', v: {}, up: {}, kw: [], tags: [], color: 'status', rarity: 'Status', type: 'Status' }, o); };
  card('SCORCH', { name: 'Scorch', cost: null, kw: ['Unplayable'], v: { dmg: 2 }, text: (v) => `At the end of your turn, if this is in your hand, take ${v.dmg} damage.`,
    endInHand: async (g) => g.damage(g.p, 2, {}) });
  card('GASH', { name: 'Gash', cost: null, kw: ['Unplayable'], text: () => '' });

  // ---------- normal ----------
  mon('AXE_BOT', { name: 'Axe Automaton', hp: [70, 78], approx: true,
    moves: { BOOT_UP: { name: 'Boot Up', block: 10, buff: { might: 3 } }, ONE_TWO: { name: 'One-Two', atk: 9, hits: 2 },
      HAMMER_UPPERCUT: { name: 'Hammer Uppercut', atk: 12, debuff: { sapped: 2, brittle: 2 } } },
    ai: (e, g) => (e.hist.length ? rnd(g, e, [['ONE_TWO', 1, true], ['HAMMER_UPPERCUT', 1, true]]) : 'BOOT_UP') });
  mon('FIST_CONSTRUCT', { name: 'Fist Construct', hp: [55, 55], init: { ward: 1 }, approx: true,
    moves: { READY: { name: 'Ready', block: 10 }, STRONG_PUNCH: { name: 'Strong Punch', atk: 14 }, FAST_PUNCH: { name: 'Fast Punch', atk: 5, hits: 2, debuff: { brittle: 1 } } },
    ai: (e) => cyc(e, ['READY', 'FAST_PUNCH', 'STRONG_PUNCH']) });
  mon('SCULPTOR', { name: 'Zealous Sculptor', hp: [162, 162], approx: true,
    moves: { FORBIDDEN_INCANTATION: { name: 'Forbidden Incantation', buff: { ritual: 3 } }, SAVAGE: { name: 'Savage', atk: 12 } },
    ai: (e) => (e.hist.length ? 'SAVAGE' : 'FORBIDDEN_INCANTATION') });
  mon('ASSEMBLER', { name: 'Assembler', hp: [150, 150], approx: true,
    moves: { FABRICATE: { name: 'Fabricate', summon: 'FIST_CONSTRUCT' }, FABRICATING_STRIKE: { name: 'Fabricating Strike', atk: 18, summon: 'FIST_CONSTRUCT' },
      DISINTEGRATE: { name: 'Disintegrate', atk: 11 } },
    ai: (e, g) => (g.alive().filter((x) => x.id === 'FIST_CONSTRUCT').length < 2 ? rnd(g, e, [['FABRICATE', 1], ['FABRICATING_STRIKE', 1]]) : 'DISINTEGRATE') });
  mon('TOAD_KNIGHT', { name: 'Toad Knight', hp: [191, 191], init: { plate: 15 },
    moves: { TONGUE_LASH: { name: 'Tongue Lash', atk: 13, debuff: { brittle: 2 } }, STRIKE_DOWN_EVIL: { name: 'Strike Down Evil', atk: 21 },
      FOR_THE_QUEEN: { name: 'For the Queen', buff: { might: 5 } }, BEETLE_CHARGE: { name: 'Beetle Charge', atk: 35 } },
    ai: (e) => {
      const last = lastReal(e);
      if (!last || last === 'BEETLE_CHARGE') return 'TONGUE_LASH';
      if (last === 'TONGUE_LASH') return 'STRIKE_DOWN_EVIL';
      if (last === 'STRIKE_DOWN_EVIL') return 'FOR_THE_QUEEN';
      return !e.charged && e.hp < e.maxHp / 2 ? ((e.charged = true), 'BEETLE_CHARGE') : 'TONGUE_LASH';
    } });
  mon('BULB_HEAD', { name: 'Bulb Head', hp: [148, 148], init: { galvanic: 6 },
    moves: { SHOCKING_SLAP: { name: 'Shocking Slap', atk: 13, debuff: { brittle: 2 } }, THUNDER_STRIKE: { name: 'Thunder Strike', atk: 6, hits: 3 },
      GALVANIC_BURST: { name: 'Galvanic Burst', atk: 16, buff: { might: 2 } } },
    ai: (e) => cyc(e, ['SHOCKING_SLAP', 'THUNDER_STRIKE', 'GALVANIC_BURST']) });
  mon('OWL_JUDGE', { name: 'Owl Judge', hp: [231, 231],
    moves: { MAGISTRATE_SCRUTINY: { name: 'Scrutiny', atk: 16 }, PECK_ASSAULT: { name: 'Peck Assault', atk: 4, hits: 6 }, JUDICIAL_FLIGHT: { name: 'Take Flight', buff: { soar: 1 } },
      VERDICT: { name: 'Verdict', atk: 33, debuff: { exposed: 4 }, fx: async (g, e) => { delete e.pw.soar; } } },
    ai: (e) => cyc(e, ['MAGISTRATE_SCRUTINY', 'PECK_ASSAULT', 'JUDICIAL_FLIGHT', 'VERDICT']) });
  mon('BITING_SCROLL', { name: 'Biting Scroll', hp: [30, 37], init: { paperCuts: 2 }, approx: true,
    moves: { CHOMP: { name: 'Chomp', atk: 14 }, CHEW: { name: 'Chew', atk: 5, hits: 2 }, MORE_TEETH: { name: 'More Teeth', buff: { might: 2 } } },
    ai: (e, g) => {
      const last = lastReal(e);
      if (last === 'CHOMP') return 'MORE_TEETH';
      if (last === 'MORE_TEETH') return 'CHEW';
      return rnd(g, e, [['CHOMP', 1, true], ['CHEW', 1, true]]);
    } });
  mon('OOZE_BERSERKER', { name: 'Ooze Berserker', hp: [261, 261], approx: true,
    moves: { VOMIT_ICHOR: { name: 'Vomit Ichor', status: { id: 'SLUDGE', n: 3, to: 'discard' } }, LEECHING_HUG: { name: 'Leeching Hug', debuff: { sapped: 3 }, buff: { might: 3 } },
      SMOTHER: { name: 'Smother', atk: 30 }, FURIOUS_PUMMELING: { name: 'Furious Pummeling', atk: 4, hits: 4 } },
    ai: (e) => cyc(e, ['VOMIT_ICHOR', 'FURIOUS_PUMMELING', 'LEECHING_HUG', 'SMOTHER']) });
  mon('FADED', { name: 'The Faded', hp: [106, 106], approx: true, gap: 'attacks',
    moves: { MIASMA: { name: 'Miasma', block: 8, each: steal('poise', 'stolenPoise', 2), fx: async (g, e) => { g.addPw(e, 'poise', 2); } }, DREAD: { name: 'Dread', atk: 12 } },
    ai: (e) => cyc(e, ['MIASMA', 'DREAD']) });
  mon('STRAYED', { name: 'The Strayed', hp: [93, 93],
    moves: { DEBILITATING_SMOG: { name: 'Debilitating Smog', buff: { might: 2 }, each: steal('might', 'stolenMight', 2) }, EYE_LASERS: { name: 'Eye Lasers', atk: 4, hits: 2 } },
    ai: (e) => cyc(e, ['DEBILITATING_SMOG', 'EYE_LASERS']) });
  mon('BULWARK', { name: 'Living Bulwark', hp: [55, 55], init: { rampart: 25 },
    moves: { SHIELD_SLAM: { name: 'Shield Slam', atk: 6 }, SMASH: { name: 'Smash', atk: 16, buff: { might: 3 } } },
    ai: (e, g) => (g.alive().some((x) => x !== e) ? 'SHIELD_SLAM' : 'SMASH') });
  mon('GUNNER', { name: 'Turret Gunner', hp: [41, 41], rampartTarget: true,
    moves: { UNLOAD: { name: 'Unload', atk: 3, hits: 5 }, UNLOAD_MOVE_2: { name: 'Unload', atk: 3, hits: 5 }, RELOAD: { name: 'Reload', buff: { might: 1 } } },
    ai: (e) => cyc(e, ['UNLOAD', 'UNLOAD_MOVE_2', 'RELOAD']) });

  // ---------- elites ----------
  mon('CHAIN_KNIGHT', { name: 'Chain Knight', hp: [101, 101], approx: true,
    moves: { WAR_CHANT: { name: 'War Chant', buff: { might: 3 } }, FLAIL: { name: 'Flail', atk: 9, hits: 2 }, RAM: { name: 'Ram', atk: 15 } },
    ai: (e, g) => (e.hist.length ? rnd(g, e, [['WAR_CHANT', 1, true], ['FLAIL', 1, true], ['RAM', 1, true]]) : 'RAM') });
  mon('RUNE_KNIGHT', { name: 'Rune Knight', hp: [82, 82], approx: true,
    moves: { POWER_SHIELD: { name: 'Power Shield', atk: 6, block: 5 }, DAMPEN: { name: 'Dampen', debuff: { brittle: 2 } }, PREP: { name: 'Prepare', block: 5 },
      MAGIC_BOMB: { name: 'Magic Bomb', atk: 35 }, RAM: { name: 'Ram', atk: 10 } },
    ai: (e) => ({ undefined: 'POWER_SHIELD', POWER_SHIELD: 'DAMPEN', DAMPEN: 'RAM', RAM: 'PREP', PREP: 'MAGIC_BOMB', MAGIC_BOMB: 'RAM' })[lastReal(e)] });
  mon('PHANTOM_KNIGHT', { name: 'Phantom Knight', hp: [93, 93], approx: true,
    moves: { HEX: { name: 'Hex', buff: { hex: 2 } }, SOUL_SLASH: { name: 'Soul Slash', atk: 15 }, SOUL_FLAME: { name: 'Soul Flame', atk: 3, hits: 3 } },
    ai: (e, g) => { const n = real(e).length; return n === 0 ? 'HEX' : n === 1 ? 'SOUL_SLASH' : rnd(g, e, [['SOUL_SLASH', 1, true], ['SOUL_FLAME', 1, true]]); } });
  mon('CLOCK_KNIGHT', { name: 'Clockwork Knight', hp: [300, 300], init: { ward: 3 }, approx: true,
    moves: { CHARGE: { name: 'Charge', atk: 25 }, FLAMETHROWER: { name: 'Flamethrower', status: { id: 'SCORCH', n: 3, to: 'discard' } },
      WINDUP: { name: 'Wind Up', block: 15, buff: { might: 5 } }, HEAVY_CLEAVE: { name: 'Heavy Cleave', atk: 35 } },
    ai: (e) => cyc(e, ['CHARGE', 'FLAMETHROWER', 'WINDUP', 'HEAVY_CLEAVE'], 1) });
  mon('SOUL_KNOT', { name: 'Soul Knot', hp: [234, 234],
    moves: { SOUL_BURN: { name: 'Soul Burn', atk: 29 }, MAELSTROM: { name: 'Maelstrom', atk: 6, hits: 4 }, DRAIN_LIFE: { name: 'Drain Life', atk: 18, debuff: { exposed: 2, sapped: 2 } } },
    ai: (e, g) => (e.hist.length ? rnd(g, e, [['SOUL_BURN', 1, true], ['MAELSTROM', 1, true], ['DRAIN_LIFE', 1, true]]) : 'SOUL_BURN') });

  // ---------- bosses ----------
  mon('GLASS_AEON', { name: 'The Glass Aeon', hp: [512, 512], init: { ward: 3 }, approx: true,
    moves: { EBB: { name: 'Ebb', atk: 26, block: 33 }, EYE_LASERS: { name: 'Eye Lasers', atk: 11, hits: 2 },
      INCREASING_INTENSITY: { name: 'Rising Intensity', buff: { might: 2 }, status: { id: 'SCORCH', n: 2, to: 'discard' } } },
    ai: (e) => cyc(e, ['EBB', 'EYE_LASERS', 'INCREASING_INTENSITY']) });
  const amalgamDead = (g) => !g.alive().some((x) => x.id === 'TORCH_AMALGAM');
  mon('GILDED_QUEEN', { name: 'The Gilded Queen', hp: [400, 400], approx: true,
    moves: { PUPPET_STRINGS: { name: 'Puppet Strings', debuff: { chains: 3 } },
      YOU_ARE_MINE: { name: 'You Are Mine', debuff: { brittle: 99, sapped: 99, exposed: 99 } },
      BURN_BRIGHT_FOR_ME: { name: 'Burn Bright for Me', block: 20, fx: async (g) => { for (const x of g.alive()) if (x.id === 'TORCH_AMALGAM') g.addPw(x, 'might', 2); } },
      OFF_WITH_YOUR_HEAD: { name: 'Off with Your Head', atk: 3, hits: 5 }, EXECUTION: { name: 'Execution', atk: 15 }, ENRAGE: { name: 'Fury', buff: { might: 2 } } },
    ai: (e, g) => {
      const last = lastReal(e);
      if (!last) return 'PUPPET_STRINGS';
      if (last === 'PUPPET_STRINGS') return 'YOU_ARE_MINE';
      if (last === 'YOU_ARE_MINE' || last === 'BURN_BRIGHT_FOR_ME') return amalgamDead(g) ? 'OFF_WITH_YOUR_HEAD' : 'BURN_BRIGHT_FOR_ME';
      return { OFF_WITH_YOUR_HEAD: 'EXECUTION', EXECUTION: 'ENRAGE', ENRAGE: 'OFF_WITH_YOUR_HEAD' }[last];
    } });
  mon('TORCH_AMALGAM', { name: 'Torch Amalgam', hp: [199, 199], init: { minion: 1 },
    moves: { TACKLE: { name: 'Tackle', atk: 18 }, TACKLE_2: { name: 'Tackle', atk: 18 }, BEAM: { name: 'Beam', atk: 8, hits: 3 }, TACKLE_3: { name: 'Tackle', atk: 14 }, TACKLE_4: { name: 'Tackle', atk: 14 } },
    ai: (e) => cyc(e, ['TACKLE', 'TACKLE_2', 'BEAM', 'TACKLE_3', 'TACKLE_4'], 2) });
  // Specimen: 100 HP, then 200, then 300. Each death stuns it for a turn while it regrows.
  const PHASE_HP = [100, 200, 300];
  mon('SPECIMEN', { name: 'Specimen', hp: [100, 100], gap: 'hp', init: { adaptable: 1, enrage: 2 },
    moves: { BITE: { name: 'Bite', atk: 20 }, SKULL_BASH: { name: 'Skull Bash', atk: 14, debuff: { exposed: 1 } },
      MULTI_CLAW: { name: 'Multi-Claw', atk: 10, hitsFn: (e) => 3 + (e.claws || 0), fx: async (g, e) => { e.claws = (e.claws || 0) + 1; } },
      PHASE3_LACERATE: { name: 'Lacerate', atk: 10, hits: 3 }, BIG_POUNCE: { name: 'Big Pounce', atk: 45 },
      BURNING_GROWL: { name: 'Burning Growl', buff: { might: 2 }, status: { id: 'SCORCH', n: 3, to: 'discard' } },
      RESPAWN: { name: 'Regrow', buff: {}, fx: async (g, e) => {
        e.respawns = (e.respawns || 0) + 1; e.respawning = false;
        e.maxHp = e.hp = PHASE_HP[e.respawns]; e.hist = [];
        if (e.respawns === 1) e.pw = { adaptable: 1, painfulStabs: 1 };
        else e.pw = { adaptable: 1, nemesis: 1 };
        g.emit('heal', e, e.hp); g.say(`${e.name} rises again with ${e.hp} HP.`);
      } } },
    ai: (e) => {
      if (e.respawning) return 'RESPAWN';
      const last = lastReal(e);
      if (!e.respawns) return last === 'BITE' ? 'SKULL_BASH' : 'BITE';
      if (e.respawns === 1) return 'MULTI_CLAW';
      return { PHASE3_LACERATE: 'BIG_POUNCE', BIG_POUNCE: 'BURNING_GROWL' }[last] || 'PHASE3_LACERATE';
    } });

  // ---------- encounters ----------
  Object.assign(HD.ENC, {
    SCULPTOR_WEAK: { name: 'Zealous Sculptor', act: 3, pool: 'weak', mons: ['SCULPTOR'] },
    SCROLLS_WEAK: { name: 'Biting Scrolls', act: 3, pool: 'weak', approx: true, mons: ['BITING_SCROLL', 'BITING_SCROLL'] },
    GUNNER_WEAK: { name: 'Turret Gunner', act: 3, pool: 'weak', mons: ['BULWARK', 'GUNNER'] },
    AXE_BOTS: { name: 'Axe Automata', act: 3, pool: 'normal', approx: true, mons: ['AXE_BOT', 'AXE_BOT'] },
    CONSTRUCTS: { name: 'Construct Collection', act: 3, pool: 'normal', mons: ['COGSTONE', 'FIST_CONSTRUCT'] },
    ASSEMBLER: { name: 'Assembler', act: 3, pool: 'normal', mons: ['ASSEMBLER'] },
    TOAD_KNIGHT: { name: 'Toad Knight', act: 3, pool: 'normal', mons: ['TOAD_KNIGHT'] },
    BULB_HEAD: { name: 'A Lone Bulb Head', act: 3, pool: 'normal', mons: ['BULB_HEAD'] },
    OWL_JUDGE: { name: 'Owl Judge', act: 3, pool: 'normal', mons: ['OWL_JUDGE'] },
    SCROLLS: { name: 'Biting Scroll Pile', act: 3, pool: 'normal', approx: true, mons: ['BITING_SCROLL', 'BITING_SCROLL', 'BITING_SCROLL'] },
    OOZE_BERSERKER: { name: 'Ooze Berserker', act: 3, pool: 'normal', mons: ['OOZE_BERSERKER'] },
    FADED_STRAYED: { name: 'The Faded and the Strayed', act: 3, pool: 'normal', mons: ['FADED', 'STRAYED'] },
    KNIGHTS: { name: 'Knight Band', act: 3, pool: 'elite', mons: ['CHAIN_KNIGHT', 'RUNE_KNIGHT', 'PHANTOM_KNIGHT'] },
    CLOCK_KNIGHT: { name: 'Clockwork Knight', act: 3, pool: 'elite', mons: ['CLOCK_KNIGHT'] },
    SOUL_KNOT: { name: 'Soul Knot', act: 3, pool: 'elite', mons: ['SOUL_KNOT'] },
    GLASS_AEON: { name: 'The Glass Aeon', act: 3, pool: 'boss', mons: ['GLASS_AEON'] },
    QUEEN: { name: 'The Gilded Queen', act: 3, pool: 'boss', mons: ['TORCH_AMALGAM', 'GILDED_QUEEN'], leader: 'GILDED_QUEEN' },
    SPECIMEN: { name: 'Specimen', act: 3, pool: 'boss', mons: ['SPECIMEN'] },
  });
  HD.LAST_ACT = 3;
})();

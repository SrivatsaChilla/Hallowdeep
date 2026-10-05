// The game follows the v0.111 data. Cards and monsters first written from the older data get the v0.111 changes here.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const card = (id, o) => { CARDS[id] = Object.assign({ id, color: 'oathburner', target: 'self', v: {}, up: {}, kw: [], tags: [] }, o); };
  const mightNow = (g) => (g ? (g.p.pw.might || 0) + (g.p.pw.mightTemp || 0) : 0);

  // Cards that only exist from v0.111 on.
  card('DEEP_NIGHT', { name: 'Deep Night', only: '0.111', type: 'Attack', rarity: 'Rare', cost: 12, target: 'enemy', v: { dmg: 60 }, up: { dmg: 12 },
    costFn: (g, c, k) => k - (g.burnedCount || 0),
    text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage. Costs 1 less Energy for each card Burned this combat.${g ? ` (${g.burnedCount || 0})` : ''}`,
    play: async (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('SPREADING_RAGE', { name: 'Spreading Rage', only: '0.111', type: 'Attack', rarity: 'Uncommon', cost: 0, target: 'enemy', v: { dmg: 9 }, up: { dmg: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Put a copy of this card in every player's discard pile.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.discard.push(g.makeCard(c.id, c.up)); } });
  card('KINDLE_ALLY', { name: 'Kindle Ally', only: '0.111', coop: true, type: 'Skill', rarity: 'Uncommon', cost: 2, v: { str: 5 }, up: { str: 2 },
    text: (v) => `Give another player ${v.str} Might. (Co-op only)`, play: async () => {} });

  // v0.111 changes to existing cards. v and up merge into the older values; other fields replace them.
  const PATCH = {
    OPEN_VEIN: { rarity: 'Uncommon' },
    STONE_STANCE: { v: { blk: 4 } },
    RED_CLOAK: { v: { blk: 7 }, up: { blk: 3 } },
    MERCILESS: { rarity: 'Uncommon' },
    HELLBOUND: { v: { str: 3 } },
    LOOM_OVER: { rarity: 'Rare' },
    ROLL_UP_SLEEVES: { cost: 3, upCost: null, v: { base: 15, per: 5 }, up: { base: 1, per: 3 },
      text: (v, f, c, g) => `Gain ${f.b(v.base)} Guard. Gains ${v.per} additional Guard for each Might you have.${g ? ` (${mightNow(g)})` : ''}`,
      play: async (g, c, t, v) => g.gainBlock(v.base + v.per * mightNow(g), true) },
    OLD_RITE: { text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) },
    ASH_WAIL: { v: { dmg: 18 }, up: { dmg: 6 } },
    MAIM: { v: { dmg: 20 }, up: { dmg: 6 } },
    FINAL_EMBER: { v: { dmg: 18 } },
    ESCALATE: { v: { dmg: 10 }, up: { inc: 5 } },
    FEINT_CUT: { v: { str: 3 } },
    TAKE_THE_HITS: { text: () => 'Take 50% more damage from enemies. Allies take 50% less damage from enemies. (Co-op only)' },
    PROVOKE: { rarity: 'Common', v: { blk: 6 } },
    BOULDER: { v: { dmg: 20 } },
    UNWIND: { v: { blk: 16 } },
    MAULING: { v: { inc: 2 } },
    BEAST_CALL: { cost: 2 },
    WHITE_FLAME: { v: { hp: 2 } },
    TEAR_OPEN: { cost: 1, v: { base: 10 }, up: { base: 2 } },
    BARRAGE: { rarity: 'Uncommon' },
    HOPE_BEACON: { cost: 2 },
  };
  // v0.111 changes to monster moves.
  const MON_PATCH = {
    GLASS_AEON: { EBB: { atk: 22 } },
    AXE_BOT: { HAMMER_UPPERCUT: { atk: 14 }, ONE_TWO: { atk: 10 } },
    CLOCK_KNIGHT: { FLAMETHROWER: { atk: 8 } },
    TORCH_AMALGAM: { TACKLE: { atk: 26 }, TACKLE_2: { atk: 26 } },
  };
  const RELIC_PATCH = () => ({
    GOLD_SEAL: { text: 'At the start of your turn, spend 3 Gold to gain 1 Energy.', turnStart: async (g) => { if (g.run.gold >= 3) { g.run.gold -= 3; g.gainEnergy(1); } } },
    WARM_MITTENS: { text: 'At the start of your turn, Burn 1 card from your hand and gain 1 Might.',
      turnStart: async (g) => {}, firstHand: undefined, afterDraw: async (g) => { if (g.hand.length) { const [x] = await g.choose({ from: g.hand.slice(), n: 1, prompt: 'Burn a card' }); if (x) { g.hand.splice(g.hand.indexOf(x), 1); await g.burn(x); } } g.addPw(g.p, 'might', 1); } },
    TOY_CHEST: { text: 'On pickup, obtain 5 Wax relics. Every 3 combats, your left-most Wax relic melts away.', waxCount: 5 },
    LOVELY_BRACELET: { text: 'On pickup, Enchant 4 random cards in your deck with Swift 2.',
      onPickup: (run) => { for (const c of run.rng.misc.shuffle(run.enchantable('SWIFT')).slice(0, 4)) run.enchant(c, 'SWIFT', 2); } },
    DIAMOND_CROWN: { text: 'Start combat with 20 Guard. Your Guard is not removed at the start of your 2nd turn.', halve: false, keepT2: true,
      battleStart: async (g) => g.gainBlock(20, false) },
    THICK_PELT: { text: 'On pickup, mark 8 random combats. Enemies in those rooms have 1 HP.', marks: 8 },
    SEAL_RING: { text: 'On pickup, gain 888 Gold.', onPickup: (run) => run.gainGold(888) },
    FINE_CAPE: { text: 'On pickup, add 2 random Curses and 3 Phantasms to your deck.',
      onPickup: (run) => { for (let i = 0; i < 2; i++) run.addCard(run.rng.misc.pick(HD.RANDOM_CURSES)); for (let i = 0; i < 3; i++) run.addCard('PHANTASM'); } },
    DRY_TALON: { text: 'On pickup, lose 9 Max HP. Add 3 Hopes to your deck.', onPickup: (run) => { run.loseMaxHp(9); for (let i = 0; i < 3; i++) run.addCard('HOPE_CARD'); } },
  });
  // Apply the v0.111 changes once, at load. HD.setVersion() is kept so callers and saves need no special case.
  let applied = false;
  HD.setVersion = function () {
    HD.version = '0.111';
    HD.trackingMult = 1.5;
    if (!applied) {
      applied = true;
      for (const [id, patch] of Object.entries(PATCH)) {
        const d = CARDS[id];
        if (!d) continue;
        if (d.textHD) d.text = d.textHD;
        for (const [k, val] of Object.entries(patch)) { if (k === 'v' || k === 'up') d[k] = Object.assign({ ...d[k] }, val); else d[k] = val; }
        delete d.textHD; // the name layer re-reads the text on its next pass
      }
      for (const [id, patch] of Object.entries(RELIC_PATCH())) {
        const d = HD.RELICS[id];
        if (!d) continue;
        if (d.textHD != null) d.text = d.textHD;
        Object.assign(d, patch);
        delete d.textHD;
      }
      // Axebots carry Stock 2 (each one is replaced twice when killed); the fight is one Axebot.
      if (HD.MON.AXE_BOT) { HD.MON.AXE_BOT.init = { stock: 2 }; HD.ENC.AXE_BOTS.mons = ['AXE_BOT']; }
      for (const [id, moves] of Object.entries(MON_PATCH)) {
        const d = HD.MON[id];
        if (!d) continue;
        for (const [mv, patch] of Object.entries(moves)) Object.assign(d.moves[mv], patch);
      }
    }
    if (HD.setNames && HD.nameMode) HD.setNames(HD.nameMode);
  };
  HD.versionPatch = PATCH;
})();

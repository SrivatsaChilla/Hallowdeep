// HallowDeep core: namespace, seeded RNG, keyword glossary, power metadata.
(function () {
  const HD = (globalThis.HD = globalThis.HD || {});

  HD.makeRng = function (seed) {
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      getState: () => s,
      setState: (v) => { s = v | 0; },
      int: (n) => Math.floor(next() * n),
      range: (a, b) => a + Math.floor(next() * (b - a + 1)),
      float: (a, b) => a + next() * (b - a),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle: (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      },
      gauss: (lo, hi) => {
        const u = (next() + next() + next()) / 3;
        return lo + Math.round(u * (hi - lo));
      },
    };
  };

  HD.hashSeed = (str) => {
    let h = 2166136261;
    for (const ch of String(str)) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  HD.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let uidCounter = 1;
  HD.uid = () => uidCounter++;

  // Keyword glossary shown as tooltips. Written for HallowDeep.
  HD.TERMS = {
    Guard: 'Stops incoming attack damage. Guard fades at the start of your next turn.',
    Might: 'Each point adds 1 damage to every hit of your Attacks.',
    Poise: 'Each point adds 1 Guard whenever a card gives you Guard.',
    Exposed: 'Takes 50% more damage from Attacks. Counts down each round.',
    Sapped: 'Deals 25% less damage with Attacks. Counts down each round.',
    Brittle: 'Gains 25% less Guard from cards. Counts down each round.',
    Burn: 'Remove the card for the rest of combat. It goes to the Ash pile.',
    Fleeting: 'If this is still in your hand at the end of your turn, it Burns.',
    Opening: 'Always drawn at the start of combat.',
    Unplayable: 'Cannot be played.',
    Plate: 'At the end of your turn, gain that much Guard. Loses 1 at the start of your turn.',
    Spines: 'When an enemy attacks you, it takes that much damage.',
    Ward: 'Blocks the next debuff applied to this creature.',
    Fatal: 'Triggers when this card kills a non-minion enemy.',
    Cut: 'A tag. Some cards and relics care about cards with Cut in the name.',
    Energy: 'Spent to play cards. Refills each turn.',
    Vigor: 'Your next Attack deals that much more damage.',
    Aegis: 'Prevents the next time you would lose HP.',
    Kindling: 'At the end of your turn, gain that much Might.',
    Regrowth: 'At the end of your turn, heal that much, then it drops by 1.',
    Replay: 'The card is played that many extra times.',
    Eternal: 'Cannot be removed from your deck.',
    Retain: 'Stays in your hand at the end of your turn.',
  };

  // Power metadata. d(amount) returns tooltip text.
  HD.PW = {
    might: { n: 'Might', t: 'buff', d: (a) => `Attacks deal ${Math.abs(a)} ${a < 0 ? 'less' : 'more'} damage per hit.` },
    mightTemp: { n: 'Might this turn', t: 'buff', d: (a) => `${a} extra Might until the end of your turn.` },
    mightDown: { n: 'Might lost', t: 'debuff', d: (a) => `${a} less Might until the end of its turn.` },
    poise: { n: 'Poise', t: 'buff', d: (a) => `Guard from cards is changed by ${a}.` },
    exposed: { n: 'Exposed', t: 'debuff', d: (a) => `Takes 50% more damage from Attacks. ${a} round(s) left.` },
    sapped: { n: 'Sapped', t: 'debuff', d: (a) => `Deals 25% less Attack damage. ${a} round(s) left.` },
    brittle: { n: 'Brittle', t: 'debuff', d: (a) => `Gains 25% less Guard from cards. ${a} round(s) left.` },
    plate: { n: 'Plate', t: 'buff', d: (a) => `End of turn: gain ${a} Guard. Drops by 1 each turn.` },
    spines: { n: 'Spines', t: 'buff', d: (a) => `Attackers take ${a} damage per hit.` },
    ward: { n: 'Ward', t: 'buff', d: (a) => `Blocks the next ${a} debuff(s).` },
    rampart: { n: 'Rampart', t: 'buff', d: () => 'Guard is not removed at the start of your turn.' },
    numb: { n: 'Numb Flesh', t: 'buff', d: (a) => `Whenever a card Burns, gain ${a} Guard.` },
    ashHarvest: { n: 'Ash Harvest', t: 'buff', d: (a) => `Whenever a card Burns, draw ${a}.` },
    hellbound: { n: 'Hellbound', t: 'buff', d: (a) => `Start of turn: gain ${a} Might.` },
    splitSkin: { n: 'Split Skin', t: 'buff', d: (a) => `Whenever you lose HP on your turn, gain ${a} Might.` },
    fever: { n: 'Fever', t: 'buff', d: (a) => `Start of turn: lose 1 HP. When you lose HP on your turn, deal ${a} to ALL enemies.` },
    siege: { n: 'Siege Engine', t: 'buff', d: (a) => `Whenever you gain Guard, deal ${a} to a random enemy.` },
    redCloak: { n: 'Red Cloak', t: 'buff', d: (a) => `Start of turn: lose 1 HP, gain ${a} Guard.` },
    merciless: { n: 'Merciless', t: 'buff', d: (a) => `Exposed enemies take an extra ${a}% damage.` },
    hearth: { n: 'Hearth', t: 'buff', d: (a) => `Start of turn: gain ${a} Energy.` },
    rot: { n: 'Rot Oath', t: 'buff', d: () => 'Skills cost 0. Played Skills Burn.' },
    endlessCuts: { n: 'Endless Cuts', t: 'buff', d: () => 'When you draw a Cut card, it is played at a random enemy.' },
    frenzy: { n: 'Frenzy March', t: 'buff', d: (a) => `End of turn: ${a} random Attack(s) in hand are played at random enemies.` },
    hunger: { n: 'Hunger for More', t: 'buff', d: (a) => `Start of turn: ${a} random Attack(s) from discard return to hand, upgraded.` },
    showboat: { n: 'Showboat', t: 'buff', d: (a) => `Your third Attack each turn adds ${a} copy to your hand.` },
    standFirm: { n: 'Stand Firm', t: 'buff', d: () => 'The first Guard you gain from a card each turn is doubled.' },
    bloodhound: { n: 'Bloodhound', t: 'buff', d: (a) => `Whenever you apply Exposed, draw ${a}.` },
    stoneStance: { n: 'Stone Stance', t: 'buff', d: () => 'Take 50% less damage from Exposed enemies until your next turn.' },
    fireWall: { n: 'Fire Wall', t: 'buff', d: (a) => `Attackers take ${a} damage per hit until your next turn.` },
    seethe: { n: 'Seethe', t: 'buff', d: (a) => `Whenever you play an Attack this turn, gain ${a} Guard.` },
    noDraw: { n: 'No draw', t: 'debuff', d: () => 'You cannot draw more cards this turn.' },
    noEnergy: { n: 'No energy', t: 'debuff', d: () => 'You cannot gain more Energy this turn.' },
    echo: { n: 'Echo', t: 'buff', d: (a) => `Your next ${a} Attack(s) this turn are played twice.` },
    keepSwinging: { n: 'Keep Swinging', t: 'buff', d: () => 'Your next Attack costs 0.' },
    shrink: { n: 'Shrunk', t: 'debuff', d: () => 'While the Pinch Weevil lives, your Attacks deal 30% less damage.' },
    constrict: { n: 'Coiled', t: 'debuff', d: (a) => `While the Coilvine lives, take ${a} damage at the end of your turn.` },
    tangled: { n: 'Snared', t: 'debuff', d: (a) => `Attacks cost 1 more Energy. ${a} turn(s) left.` },
    ringing: { n: 'Deafened', t: 'debuff', d: () => 'You can only play 1 card this turn.' },
    slippery: { n: 'Smeared', t: 'buff', d: (a) => `The next ${a} times it loses HP, it loses only 1.` },
    territorial: { n: 'Territorial', t: 'buff', d: (a) => `End of its turn: gain ${a} Might.` },
    infested: { n: 'Brooding', t: 'buff', d: (a) => `On death, releases ${a} Squirmers.` },
    illusion: { n: 'Phantom', t: 'buff', d: () => 'Revives at full HP one turn after it dies.' },
    slow: { n: 'Sluggish', t: 'debuff', d: () => 'Takes 10% more Attack damage for each card you have played this turn.' },
    plow: { n: 'Rite', t: 'buff', d: (a) => `The first time its HP drops to ${a} or less, it is stunned and loses all Might.` },
    minion: { n: 'Minion', t: 'buff', d: () => 'Leaves combat when its leader dies.' },
    vigor: { n: 'Vigor', t: 'buff', d: (a) => `Your next Attack deals ${a} more damage.` },
    buffer: { n: 'Aegis', t: 'buff', d: (a) => `Prevents the next ${a} time(s) you would lose HP.` },
    ritual: { n: 'Kindling', t: 'buff', d: (a) => `End of turn: gain ${a} Might.` },
    regen: { n: 'Regrowth', t: 'buff', d: (a) => `End of turn: heal ${a}, then this drops by 1.` },
    retainHand: { n: 'Steady', t: 'buff', d: (a) => `Keep your hand at the end of your turn. ${a} turn(s) left.` },
    clarity: { n: 'Focus', t: 'buff', d: (a) => `Draw 1 extra card at the start of your turn. ${a} turn(s) left.` },
    radiance: { n: 'Sunwell', t: 'buff', d: (a) => `Gain 1 extra Energy at the start of your turn. ${a} turn(s) left.` },
    nextBlock: { n: 'Guard next turn', t: 'buff', d: (a) => `Gain ${a} Guard at the start of your next turn.` },
    nextEnergy: { n: 'Energy next turn', t: 'buff', d: (a) => `Gain ${a} extra Energy next turn.` },
    nextDraw: { n: 'Draw next turn', t: 'buff', d: (a) => `Draw ${a} extra cards next turn.` },
    duplicate: { n: 'Echo Vial', t: 'buff', d: () => 'Your next card this turn is played an extra time.' },
    giga: { n: 'Titan', t: 'buff', d: () => 'Your next Attack deals triple damage.' },
    poiseTemp: { n: 'Poise this turn', t: 'buff', d: (a) => `${a} extra Poise until the end of your turn.` },
    demise: { n: 'Wasting', t: 'debuff', d: (a) => `Loses ${a} HP at the end of its turn.` },
    dampened: { n: 'Dampened', t: 'debuff', d: (a) => `Its Attacks deal 30% less damage. ${a} turn(s) left.` },
    surrounded: { n: 'Surrounded', t: 'debuff', d: () => 'Enemies behind you deal 50% more damage. Target an enemy with a card or potion to face it.' },
    tainted: { n: 'Tainted', t: 'debuff', d: (a) => `Take ${a} more damage from each Attack this turn.` },
    tender: { n: 'Tender', t: 'debuff', d: (a) => `Whenever you play a card, lose ${a} Might and ${a} Poise this turn.` },
    sandpit: { n: 'Sandpit', t: 'debuff', d: (a) => `In ${a} turn(s), you will be swallowed and die.` },
    confused: { n: 'Confused', t: 'debuff', d: () => 'Cards cost a random 0 to 3 Energy when you draw them.' },
    flutter: { n: 'Flutter', t: 'buff', d: (a) => `Takes 50% less damage from Attacks. Hit it with Attacks ${a} times to knock it down.` },
    hardToKill: { n: 'Hard to Kill', t: 'buff', d: (a) => `Never loses more than ${a} HP at once.` },
    curlUp: { n: 'Curl Up', t: 'buff', d: (a) => `The first time it loses HP, it gains ${a} Guard.` },
    slumber: { n: 'Slumber', t: 'buff', d: (a) => `Asleep. Wakes after ${a} more turn(s) or hit(s).` },
    burrowed: { n: 'Burrowed', t: 'buff', d: () => 'Keeps its Guard between turns. Stunned if its Guard is broken.' },
    backAttack: { n: 'Flanking', t: 'buff', d: () => 'Deals 50% more damage while you face away from it.' },
    crabRage: { n: 'Crab Rage', t: 'buff', d: () => 'When an ally dies, gains 6 Might and 99 Guard.' },
    personalHive: { n: 'Hive', t: 'buff', d: (a) => `Whenever you hit it with an Attack, add ${a} Reeling to your draw pile.` },
    vitalSpark: { n: 'Vital Spark', t: 'buff', d: (a) => `Your Skills make you Tainted ${a}: take ${a} more damage from each Attack this turn.` },
    imbalanced: { n: 'Imbalanced', t: 'buff', d: () => 'Stunned if its Attack is fully blocked.' },
    reattach: { n: 'Reattach', t: 'buff', d: (a) => `If another segment lives, revives in 2 turns with ${a} HP.` },
    hatch: { n: 'Hatch', t: 'buff', d: (a) => `Hatches in ${a} turn(s).` },
    escapeArtist: { n: 'Escape Artist', t: 'buff', d: () => 'Tries to escape the combat.' },
    chains: { n: 'Chains', t: 'debuff', d: (a) => `The first ${a} cards you draw each turn are Bound: only 1 Bound card can be played each turn.` },
    hex: { n: 'Hex', t: 'buff', d: () => 'While it lives, every card in your hand is Ethereal.' },
    soar: { n: 'Soar', t: 'buff', d: () => 'Takes 50% less damage from Attacks until it lands.' },
    intangible: { n: 'Intangible', t: 'buff', d: () => 'All damage and HP loss it takes is reduced to 1 this turn.' },
    nemesis: { n: 'Nemesis', t: 'buff', d: () => 'Becomes Intangible every other turn.' },
    paperCuts: { n: 'Paper Cuts', t: 'buff', d: (a) => `When its Attacks get through your Guard, you lose ${a} Max HP.` },
    painfulStabs: { n: 'Painful Stabs', t: 'buff', d: (a) => `When its Attacks get through your Guard, add ${a} Gash to your discard pile.` },
    galvanic: { n: 'Galvanic', t: 'buff', d: (a) => `Whenever you play a Power, take ${a} damage.` },
    enrage: { n: 'Enrage', t: 'buff', d: (a) => `Whenever you play a Skill, it gains ${a} Might.` },
    adaptable: { n: 'Adaptable', t: 'buff', d: () => 'When it would die, it comes back stronger (twice).' },
    rampart: { n: 'Rampart', t: 'buff', d: (a) => `At the start of your turn, its gunner gains ${a} Guard.` },
    possessMight: { n: 'Possessed Might', t: 'buff', d: (a) => `Holds ${a} of your Might. Returns it when killed.` },
    possessPoise: { n: 'Possessed Poise', t: 'buff', d: (a) => `Holds ${a} of your Poise. Returns it when killed.` },
    automation: { n: 'Clockwork Rhythm', t: 'buff', d: (a) => `Every 10 cards you draw, gain ${a} Energy.` },
    fasten: { n: 'Strap Down', t: 'buff', d: (a) => `Brace cards give ${a} additional Guard.` },
    panache: { n: 'Flourish', t: 'buff', d: (a) => `Every 5th card you play in a turn deals ${a} damage to ALL enemies.` },
    prepTime: { n: 'Warm Up', t: 'buff', d: (a) => `At the start of your turn, gain ${a} Vigor.` },
    stratagem: { n: 'Scheme', t: 'buff', d: () => 'When you shuffle your draw pile, choose a card from it to put into your hand.' },
    calamity: { n: 'Chaos Engine', t: 'buff', d: (a) => `Whenever you play an Attack, add ${a} random Attack(s) to your hand.` },
    entropy: { n: 'Unravel', t: 'buff', d: (a) => `At the start of your turn, Transform ${a} card(s) in your hand.` },
    mayhem: { n: 'Frenzied Hands', t: 'buff', d: (a) => `At the start of your turn, play the top ${a} card(s) of your draw pile.` },
    nostalgia: { n: 'Old Habits', t: 'buff', d: () => 'The first Attack or Skill you play each turn goes on top of your draw pile.' },
    boulder: { n: 'Landslide', t: 'buff', d: (a) => `At the start of your turn, deal ${a} damage to ALL enemies, then it grows.` },
    gambit: { n: 'All In', t: 'debuff', d: () => 'If an Attack gets through your Guard this combat, you die.' },
    noCardBlock: { n: 'No Guard', t: 'debuff', d: (a) => `You cannot gain Guard from cards. ${a} turn(s) left.` },
    choked: { n: 'Choked', t: 'debuff', d: (a) => `Loses ${a} HP whenever you play a card this turn.` },
    curious: { n: 'Curious', t: 'buff', d: (a) => `Powers cost ${a} less.` },
    improvement: { n: 'Improvement', t: 'buff', d: () => 'At the end of combat, Upgrade a random card.' },
    timeLimit: { n: 'Time Limit', t: 'buff', d: (a) => `Leaves after ${a} more turn(s).` },
    stock: { n: 'Stock', t: 'buff', d: (a) => `When killed, a new one takes its place (${a} left), with 10 more Max HP each time.` },
    diadem: { n: 'Diamond Crown', t: 'buff', d: () => 'Take half damage from enemies this round.' },
  };
  // Enchantment of a card instance, or null (filled in by enchants.js).
  // Engine hooks other modules register into: HD.onEngine('starsSpent', async (g, n) => ...).
  // Names: starsGained, starsSpent, created, forged, energySpent, afterPlay, turnStart, afterDraw, turnEnd, combatWon.
  HD.ENGINE_HOOKS = HD.ENGINE_HOOKS || {};
  HD.onEngine = (name, fn) => { (HD.ENGINE_HOOKS[name] = HD.ENGINE_HOOKS[name] || []).push(fn); };
  HD.charName = (id) => (HD.CHAR_NAMES && HD.CHAR_NAMES[id || 'OATHBURNER']) || (HD.CHARS && HD.CHARS[id] ? HD.CHARS[id].name : 'Oathburner');
  HD.enchOf = (c) => (c && c.ench && HD.ENCH ? HD.ENCH[c.ench.id] : null);
  HD.DEBUFFS = new Set(['exposed', 'sapped', 'brittle', 'mightDown', 'slow', 'demise', 'dampened']);
})();

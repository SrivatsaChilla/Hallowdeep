// Events and ? rooms. Numbers and outcomes follow the reference data; all event text is HallowDeep's own.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const EV = (HD.EVENTS = {});
  const ev = (id, o) => { EV[id] = Object.assign({ id, act: 1 }, o); };

  // ---------- ? room roll ----------
  // One roll walks monster, elite, treasure, shop; the first band that covers it wins, otherwise it is an event.
  // A hit resets that outcome to its base; every other eligible outcome grows by its own base. Reset each act.
  const BASE = { monster: 0.1, elite: -1, treasure: 0.02, shop: 0.03 };
  HD.Run.prototype.resetUnknownOdds = function () { this.unknownOdds = { ...BASE }; };
  HD.Run.prototype.rollUnknown = function () {
    if (!this.unknownOdds) this.resetUnknownOdds();
    const odds = this.unknownOdds;
    const banned = new Set(this.hasRelic('BEAD_BRACELET') ? ['monster'] : []);
    const roll = this.rng.event.next();
    let acc = 0, hit = 'event';
    for (const k of ['monster', 'elite', 'treasure', 'shop']) {
      if (banned.has(k) || odds[k] < 0) continue;
      acc += odds[k];
      if (roll < acc) { hit = k; break; }
    }
    for (const k of Object.keys(odds)) {
      if (banned.has(k) || BASE[k] < 0) continue;
      odds[k] = k === hit ? BASE[k] : odds[k] + BASE[k];
    }
    return hit;
  };

  // ---------- helpers ----------
  const loseGold = (run, n) => { run.gold = Math.max(0, run.gold - n); };
  const loseHp = (run, n) => { run.hp -= n; };
  const potion = (run) => { const id = run.randomPotion(); if (!run.addPotion(id)) run.pending.push({ kind: 'potion', id }); };
  const upgradable = (run) => run.deck.filter((c) => !c.up && ['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type));
  const upgradeRandom = (run, all) => {
    const xs = upgradable(run);
    if (all) xs.forEach((c) => run.upgrade(c));
    else if (xs.length) run.upgrade(run.rng.event.pick(xs));
  };
  const basics = (run) => run.removable().filter((c) => CARDS[c.id].rarity === 'Basic');
  // Non-combat card rolls: rare below 3%, uncommon below 37% of the same roll, common otherwise.
  const defaultRarity = (run) => { const r = run.rng.event.next(); return r < 0.03 ? 'Rare' : r < 0.37 ? 'Uncommon' : 'Common'; };
  const pickCards = (run, n, rarityFn) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const rar = rarityFn();
      const pool = run.pool().filter((d) => d.rarity === rar && !out.some((c) => c.id === d.id));
      out.push({ id: run.rng.event.pick(pool).id, up: false });
    }
    return out;
  };
  const gold = (n) => `Gain ${n} Gold.`;
  const locked = (reason) => ({ locked: reason });

  // ---------- Act 1 events ----------
  ev('HEADY_SPORES', { name: 'Heady Spores', pages: {
    INITIAL: { text: 'A cloud of bright spores drifts across the path. Your thoughts go loose and strange as you breathe it in.',
      options: [
        { id: 'LET_GO', label: 'Let go', desc: () => 'Transform a card in your deck.', go: (run) => { run.pending.push({ kind: 'transform' }); return 'LET_GO'; } },
        { id: 'HOLD', label: 'Hold on to yourself', desc: () => 'Upgrade a card in your deck.', go: (run) => { run.pending.push({ kind: 'upgrade' }); return 'HOLD'; } },
      ] },
    LET_GO: { text: 'When the haze clears, something in your pack is not what it was.' },
    HOLD: { text: 'You clench your jaw until the haze passes, and come out of it sharper.' },
  } });

  ev('CRAG_NEST', { name: 'Crag Roc Nest', when: (run) => !run.hasRelic('ROC_CHICK') && !run.deck.some((c) => c.id === 'ROC_EGG'), pages: {
    INITIAL: { text: 'A nest of woven roots sits in a hollow, with one speckled egg inside. Nothing is guarding it. Yet.',
      options: [
        { id: 'EAT', label: 'Eat the egg', desc: () => 'Gain 7 Max HP.', go: (run) => { run.gainMaxHp(7); return 'EAT'; } },
        { id: 'TAKE', label: 'Take the egg', desc: () => 'Add a Roc Egg to your deck. It can be hatched at a Rest Site.', go: (run) => { run.addCard('ROC_EGG'); return 'TAKE'; } },
      ] },
    EAT: { text: 'It is enormous, and more filling than it has any right to be.' },
    TAKE: { text: 'You wrap the egg in your cloak. It is warm, and now and then it knocks.' },
  } });

  ev('THICKET', { name: 'Tangled Thicket', roll: (run, r) => ({ gold: r.range(61, 99) }), pages: {
    INITIAL: { text: 'The path is gone. Vines and ferns close in on every side, and you are very, very tired.',
      options: [
        { id: 'TRUDGE', label: 'Push through', desc: (v) => `${gold(v.gold)} Lose 8 HP.`, go: (run, v) => { run.gainGold(v.gold); loseHp(run, 8); return 'TRUDGE'; } },
        { id: 'REST', label: 'Rest here', desc: () => 'Heal 30% of your Max HP. Something will find you.', go: (run) => { run.heal(Math.floor(run.maxHp * 0.3)); return 'REST'; } },
      ] },
    TRUDGE: { text: 'Hours of hacking later you stumble onto a trail, and a traveller\'s lost purse beside it.' },
    REST: { text: 'You wake to something wriggling across your chest. Several somethings.',
      options: [{ id: 'FIGHT', label: 'Fight', desc: () => 'Start a fight.', go: () => ({ fight: 'WRIGGLERS' }) }] },
  } });

  ev('ROOT_MAZE', { name: 'Root Maze', roll: (run, r) => ({ solo: r.range(135, 165), join: r.range(35, 65) }), pages: {
    INITIAL: { text: 'A maze of roots, and a band of scavengers arguing over which way the treasure lies. They offer to split it with you.',
      options: [
        { id: 'SOLO', label: 'Go alone', desc: (v) => `${gold(v.solo)} Lose 18 HP.`, go: (run, v) => { run.gainGold(v.solo); loseHp(run, 18); return 'SOLO'; } },
        { id: 'JOIN', label: 'Join them', desc: (v) => gold(v.join), go: (run, v) => { run.gainGold(v.join); return 'JOIN'; } },
      ] },
    SOLO: { text: 'The maze takes its toll, but the hoard at its heart is all yours.' },
    JOIN: { text: 'Many hands make the maze easy. The split is fair, if small.' },
  } });

  ev('GLOW_CHORUS', { name: 'Glowing Chorus', when: (run) => run.gold >= 100, roll: (run, r) => ({ cost: r.range(100, 149) }), pages: {
    INITIAL: { text: 'Pale mushrooms hum in a ring, a low and lovely chord. At the centre, something soft pulses like a heart.',
      options: [
        { id: 'REACH', label: 'Reach into the flesh', desc: () => 'Remove 2 cards from your deck. Add Spore Haze to your deck.',
          go: (run) => { run.pending.push({ kind: 'remove' }, { kind: 'remove' }); run.addCard('SPORE_HAZE'); return 'REACH'; } },
        { id: 'TRIBUTE', label: 'Offer tribute', desc: (v) => `Pay ${v.cost} Gold. Obtain a random Relic.`, lock: (run, v) => (run.gold < v.cost ? `Requires ${v.cost} Gold.` : null),
          go: (run, v) => { loseGold(run, v.cost); run.addRelic(run.rollRelic()); return 'TRIBUTE'; } },
      ] },
    REACH: { text: 'Your hand comes back clean, and lighter. The humming follows you for a while.' },
    TRIBUTE: { text: 'The chord shifts as your coins sink into the moss. Something rises to meet your hand.' },
  } });

  ev('SHIFTING_GROVE', { name: 'Shifting Grove', when: (run) => run.gold >= 100, pages: {
    INITIAL: { text: 'In this grove the trees trade places when you are not looking. A voice asks if you would like to join them.',
      options: [
        { id: 'GROUP', label: 'Join the grove', desc: () => 'Lose ALL of your Gold. Transform 2 cards.',
          go: (run) => { run.gold = 0; run.pending.push({ kind: 'transform' }, { kind: 'transform' }); return 'GROUP'; } },
        { id: 'LONER', label: 'Stand apart', desc: () => 'Gain 5 Max HP.', go: (run) => { run.gainMaxHp(5); return 'LONER'; } },
      ] },
    GROUP: { text: 'You spin with the trees until you forget which way is up. Your purse did not survive the dance.' },
    LONER: { text: 'You plant your feet. The trees move around you, and you feel steadier for it.' },
  } });

  ev('BLUE_SEED', { name: 'Blue Seed', pages: {
    INITIAL: { text: 'A seed like a sapphire lies in the dirt, faintly warm to the touch.',
      options: [
        { id: 'EAT', label: 'Swallow it', desc: () => 'Heal 9 HP. Upgrade a card in your deck.', go: (run) => { run.heal(9); run.pending.push({ kind: 'upgrade' }); return 'EAT'; } },
        { id: 'PLANT', label: 'Plant it', desc: () => 'Enchant a card with Sown.', lock: () => 'Enchantments are not built yet.', go: () => 'INITIAL' },
      ] },
    EAT: { text: 'It tastes of cold water. Warmth spreads through your chest.' },
  } });

  ev('DROWNED_STATUE', { name: 'Drowned Statue', act: 1, roll: (run, r) => ({ gold: r.range(101, 121) }), pages: {
    INITIAL: { text: 'A statue lies half sunk in a black pool, a stone blade still in its grip. Coins glint on the bottom.',
      options: [
        { id: 'SWORD', label: 'Take the blade', desc: () => 'Obtain the Stone Blade.', go: (run) => { run.addRelic('STONE_BLADE'); return 'SWORD'; } },
        { id: 'DIVE', label: 'Dive for the coins', desc: (v) => `${gold(v.gold)} Lose 7 HP.`, go: (run, v) => { run.gainGold(v.gold); loseHp(run, 7); return 'DIVE'; } },
      ] },
    SWORD: { text: 'The blade comes free with a groan. It is heavy and dull, and it feels like it is waiting for something.' },
    DIVE: { text: 'The water is freezing and the stones are sharp, but your pockets are heavier.' },
  } });

  const TABLET = [3, 6, 12, 24];
  ev('CARVED_TABLET', { name: 'Carved Tablet', pages: {
    INITIAL: { text: 'A stone tablet covered in tiny script. Every line you read seems to take something from you.',
      options: [
        { id: 'READ', label: 'Read it', desc: () => `Lose ${TABLET[0]} Max HP. Upgrade a random card.`, go: (run) => { run.loseMaxHp(TABLET[0]); upgradeRandom(run); return 'READ_1'; } },
        { id: 'SMASH', label: 'Smash it', desc: () => 'Heal 20 HP.', go: (run) => { run.heal(20); return 'SMASH'; } },
      ] },
    SMASH: { text: 'The tablet breaks apart. Whatever it held drains out of the stone and into you.' },
    GIVE_UP: { text: 'You tear your eyes away. The words keep crawling at the edge of your sight for a while.' },
    ALL: { text: 'You read every last line. You understand everything, and there is almost nothing left of you.' },
  } });
  for (let i = 1; i <= 3; i++) {
    const next = i < 3 ? `READ_${i + 1}` : 'READ_4';
    EV.CARVED_TABLET.pages[`READ_${i}`] = { text: ['The script makes sense now, and your hands feel surer.', 'Deeper meaning, deeper cost.', 'You cannot stop. You do not want to.'][i - 1],
      options: [
        { id: 'READ', label: 'Keep reading', desc: () => `Lose ${TABLET[i]} Max HP. Upgrade a random card.`, go: (run) => { run.loseMaxHp(TABLET[i]); upgradeRandom(run); return next; } },
        { id: 'GIVE_UP', label: 'Look away', desc: () => 'Stop reading and leave.', go: () => 'GIVE_UP' },
      ] };
  }
  EV.CARVED_TABLET.pages.READ_4 = { text: 'The last lines glow. Reading them would cost you nearly everything.',
    options: [
      { id: 'ALL', label: 'Read the rest', desc: () => 'Set your Max HP to 1. Upgrade ALL cards.', go: (run) => { run.maxHp = 1; run.hp = 1; upgradeRandom(run, true); return 'ALL'; } },
      { id: 'GIVE_UP', label: 'Look away', desc: () => 'Stop reading and leave.', go: () => 'GIVE_UP' },
    ] };

  ev('RESTLESS_CAMP', { name: 'Restless Camp', when: (run) => run.hp <= run.maxHp * 0.7, pages: {
    INITIAL: { text: 'An old campsite ringed by twisted trees that creak even without wind. You are so tired.',
      options: [
        { id: 'REST', label: 'Rest anyway', desc: () => 'Heal to full HP. Add Restless Night to your deck.', go: (run) => { run.hp = run.maxHp; run.addCard('RESTLESS_NIGHT'); return 'REST'; } },
        { id: 'KILL', label: 'Cut down the trees', desc: () => 'Lose 8 Max HP. Obtain a random Relic.', go: (run) => { run.loseMaxHp(8); run.addRelic(run.rollRelic()); return 'KILL'; } },
      ] },
    REST: { text: 'You sleep, badly. The creaking follows you into your dreams, and out of them.' },
    KILL: { text: 'The trees fight back more than trees should. Among the roots of the last one, something glints.' },
  } });

  ev('GREEN_SPRING', { name: 'Green Spring', pages: {
    INITIAL: { text: 'A rumble leads you to a spring of bright green water, full of drifting motes of light. It looks inviting.',
      options: [
        { id: 'BOTTLE', label: 'Bottle some', desc: () => 'Procure 1 random Potion.', go: (run) => { potion(run); return 'BOTTLE'; } },
        { id: 'BATHE', label: 'Bathe', desc: () => 'Remove 1 card from your deck. Add 1 Guilt to your deck.', go: (run) => { run.pending.push({ kind: 'remove' }); run.addCard('GUILT'); return 'BATHE'; } },
      ] },
    BOTTLE: { text: 'Too good to be true, you decide, and fill a vial instead.' },
    BATHE: { text: 'You climb out lighter and oddly uneasy, as if you took something that was not yours.' },
  } });

  ev('MURMUR_HOLLOW', { name: 'Murmuring Hollow', when: (run) => run.gold >= 44, roll: (run, r) => ({ cost: r.range(26, 44) }), pages: {
    INITIAL: { text: 'A hollow tree murmurs as you pass. It would like some coins, please. Or a hug.',
      options: [
        { id: 'GOLD', label: 'Pay the tree', desc: (v) => `Lose ${v.cost} Gold. Procure 2 random Potions.`, go: (run, v) => { loseGold(run, v.cost); potion(run); potion(run); return 'GOLD'; } },
        { id: 'HUG', label: 'Hug the tree', desc: () => 'Lose 9 HP. Choose a card to Transform.', go: (run) => { loseHp(run, 9); run.pending.push({ kind: 'transform' }); return 'HUG'; } },
      ] },
    GOLD: { text: 'The coins vanish into the bark. Two vials roll out of a knot hole.' },
    HUG: { text: 'The tree hugs back, much too hard. You come away scratched and changed.' },
  } });

  ev('BARK_CARVINGS', { name: 'Bark Carvings', when: (run) => basics(run).length > 0, pages: {
    INITIAL: { text: 'Three carvings on a great trunk: a bird, a snake, and a ring. Each seems to ask for something of yours.',
      options: [
        { id: 'BIRD', label: 'The bird', desc: () => 'Choose 1 starter card to Transform into Pecking.', go: (run) => { run.pending.push({ kind: 'carve', into: 'PECKING' }); return 'DONE'; } },
        { id: 'SNAKE', label: 'The snake', desc: () => 'Enchant 1 card with Slither.', lock: () => 'Enchantments are not built yet.', go: () => 'INITIAL' },
        { id: 'TORUS', label: 'The ring', desc: () => 'Choose 1 starter card to Transform into Ring of Bark.', go: (run) => { run.pending.push({ kind: 'carve', into: 'BARK_RING' }); return 'DONE'; } },
      ] },
    DONE: { text: 'You trace the carving with your finger, and feel one of your old habits change shape.' },
  } });

  // ---------- events from any act ----------
  ev('MIND_LEECH', { name: 'Mind Leech', act: [1, 2], pages: {
    INITIAL: { text: 'Something wet lands on the back of your neck. It whispers that it knows things, and would share them.',
      options: [
        { id: 'SHARE', label: 'Listen', desc: () => 'Choose 1 of 5 random cards to add to your deck.',
          go: (run) => { run.pending.push({ kind: 'cards', cards: pickCards(run, 5, () => defaultRarity(run)) }); return 'SHARE'; } },
        { id: 'RIP', label: 'Rip it off', desc: () => 'Lose 5 HP. Gain a Colorless card reward.', go: (run) => { loseHp(run, 5); run.pending.push({ kind: 'cards', cards: HD.colorlessReward(run, 3) }); return 'RIP'; } },
      ] },
    SHARE: { text: 'The whispering goes on for a long time. When it lets go, you know one new trick.' },
    RIP: { text: 'It comes away with a wet pop and a parting gift: a trick from somewhere far outside your craft.' },
  } });

  ev('CHEESE_CELLAR', { name: 'Cheese Cellar', act: [1, 2], pages: {
    INITIAL: { text: 'A cellar stacked to the ceiling with wheels of cheese, and no one around to mind them.',
      options: [
        { id: 'GORGE', label: 'Gorge', desc: () => 'Choose 2 of 8 random Common cards to add to your deck.',
          go: (run) => { run.pending.push({ kind: 'cards', n: 2, cards: pickCards(run, 8, () => 'Common') }); return 'GORGE'; } },
        { id: 'SEARCH', label: 'Search the back', desc: () => 'Lose 14 HP. Obtain the Prize Cheese.', go: (run) => { loseHp(run, 14); run.addRelic('PRIZE_CHEESE'); return 'SEARCH'; } },
      ] },
    GORGE: { text: 'You eat until you cannot move, and leave with ideas you did not have before.' },
    SEARCH: { text: 'Behind a wall of rinds and a nest of very angry rats, you find the finest wheel of all.' },
  } });

  const bridgeCard = (run) => { const xs = run.removable(); return xs.length ? run.rng.event.pick(xs).uid : null; };
  ev('SLICK_BRIDGE', { name: 'Slick Bridge', act: 'any', when: (run) => run.floor >= 7 && run.removable().length > 0,
    roll: (run) => ({ card: bridgeCard(run), holds: 0 }),
    pages: { INITIAL: { text: 'A mossy log over a gorge. Halfway across, your pack starts to slip.' },
      OVERCOME: { text: 'You let it fall and make it across. Somewhere below, it hits the water.' } } });
  EV.SLICK_BRIDGE.pages.INITIAL.options = [
    { id: 'OVERCOME', label: 'Let it fall', desc: (v, run) => { const c = run.deck.find((x) => x.uid === v.card); return `Remove ${c ? CARDS[c.id].name + (c.up ? '+' : '') : 'a random card'} from your deck.`; },
      go: (run, v) => { const c = run.deck.find((x) => x.uid === v.card); if (c) run.removeCard(c); return 'OVERCOME'; } },
    { id: 'HOLD', label: 'Hold on', desc: (v) => `Lose ${3 + v.holds} HP. The card at risk changes.`,
      go: (run, v) => { loseHp(run, 3 + v.holds); v.holds++; v.card = bridgeCard(run); return 'INITIAL'; } },
  ];

  ev('TEA_KEEPER', { name: 'The Tea Keeper', act: [1, 2], when: (run) => run.gold >= 150, pages: {
    INITIAL: { text: 'A tiny figure behind a tiny counter offers you tea. Some of the prices are steep. One of the teas is free.',
      options: [
        { id: 'BONE', label: 'Marrow Tea', desc: () => 'Pay 50 Gold. At the start of your next combat, Upgrade your starting hand.', lock: (run) => (run.gold < 50 ? 'Requires 50 Gold.' : null),
          go: (run) => { loseGold(run, 50); run.addRelic('MARROW_TEA'); return 'DONE'; } },
        { id: 'EMBER', label: 'Cinder Tea', desc: () => 'Pay 150 Gold. At the start of your next 5 combats, gain 2 Might.', lock: (run) => (run.gold < 150 ? 'Requires 150 Gold.' : null),
          go: (run) => { loseGold(run, 150); run.addRelic('CINDER_TEA'); return 'DONE'; } },
        { id: 'RUDE', label: 'The free one', desc: () => 'At the start of your next combat, shuffle 2 Reeling into your draw pile.', go: (run) => { run.addRelic('RUDE_TEA'); return 'DONE'; } },
      ] },
    DONE: { text: 'The keeper pours with great ceremony. You drink it all.' },
  } });

  ev('OLD_LEGENDS', { name: 'Old Legends', act: 1, when: (run) => run.hp >= 10, pages: {
    INITIAL: { text: 'Deep in a collapsed tunnel you find a skeleton clutching a rolled map. The way out is long and dark.',
      options: [
        { id: 'MAP', label: 'Take the map', desc: () => 'Add a Treasure Map to your deck.', go: (run) => { run.addCard('TREASURE_MAP'); return 'MAP'; } },
        { id: 'EXIT', label: 'Feel your way out', desc: () => 'Lose 8 HP. Procure 1 random Potion.', go: (run) => { loseHp(run, 8); potion(run); return 'EXIT'; } },
      ] },
    MAP: { text: 'The map marks a spot somewhere in the next act. The legends, it seems, were true.' },
    EXIT: { text: 'You crawl out bruised, with a vial you found along the way.' },
  } });

  ev('TWO_BOXES', { name: 'Two Boxes', act: 'any', roll: (run, r) => ({ gold: r.range(41, 68) }), pages: {
    INITIAL: { text: 'Two boxes on a stump: one plain, one covered in carvings. A note says to take just one.',
      options: [
        { id: 'PLAIN', label: 'The plain box', desc: (v) => `Lose 6 HP. ${gold(v.gold)}`, go: (run, v) => { loseHp(run, 6); run.gainGold(v.gold); return 'PLAIN'; } },
        { id: 'ORNATE', label: 'The carved box', desc: () => 'Add Fumble to your deck. Obtain a random Relic.', go: (run) => { run.addCard('FUMBLE'); run.addRelic(run.rollRelic()); return 'ORNATE'; } },
      ] },
    PLAIN: { text: 'The lid bites your fingers, but the coins inside are real.' },
    ORNATE: { text: 'Inside is a relic, and a sudden clumsiness you cannot shake.' },
  } });

  // ---------- event engine ----------
  const actOk = (d, act) => d.act === 'any' || d.act === act || (Array.isArray(d.act) && d.act.includes(act));
  HD.Run.prototype.eventPool = function () {
    this.eventsSeen = this.eventsSeen || [];
    return Object.values(EV).filter((d) => actOk(d, this.act) && !this.eventsSeen.includes(d.id) && (!d.when || d.when(this))).map((d) => d.id);
  };
  // Picks an unseen eligible event; returns null when none are left (the room becomes a fight).
  HD.Run.prototype.startEvent = function (forceId) {
    const pool = this.eventPool();
    const id = forceId || (pool.length ? this.rng.event.pick(pool) : null);
    if (!id) return null;
    this.eventsSeen.push(id);
    const d = EV[id];
    return { id, page: 'INITIAL', v: d.roll ? d.roll(this, this.rng.event) : {} };
  };
  HD.Run.prototype.eventView = function (st) {
    const d = EV[st.id];
    const p = d.pages[st.page];
    const options = (p.options || []).map((o) => {
      const lock = o.lock ? o.lock(this, st.v) : null;
      return { id: o.id, label: o.label, desc: o.desc(st.v, this), locked: lock };
    });
    return { name: d.name, text: p.text, options };
  };
  // Applies an option. Returns { fight } when it starts a combat; otherwise the event moves to its next page.
  HD.Run.prototype.eventChoose = function (st, optId) {
    const p = EV[st.id].pages[st.page];
    const o = (p.options || []).find((x) => x.id === optId);
    if (!o || (o.lock && o.lock(this, st.v))) return {};
    const res = o.go(this, st.v);
    if (res && res.fight) { st.page = 'FOUGHT'; return { fight: res.fight, kind: res.kind }; }
    st.page = res;
    return {};
  };

  // ---------- event cards and relics ----------
  const card = (id, o) => { CARDS[id] = Object.assign({ id, target: 'self', v: {}, up: {}, kw: [], tags: [] }, o); };
  card('SPORE_HAZE', { name: 'Spore Haze', type: 'Curse', rarity: 'Curse', color: 'curse', cost: 1, kw: ['Burn'], text: () => '', play: async () => {} });
  card('RESTLESS_NIGHT', { name: 'Restless Night', type: 'Curse', rarity: 'Curse', color: 'curse', cost: null, kw: ['Unplayable', 'Retain'], text: () => '' });
  card('GUILT', { name: 'Guilt', type: 'Curse', rarity: 'Curse', color: 'curse', cost: null, kw: ['Unplayable'], lifetime: 5, v: { n: 5 },
    text: (v, f, c) => `Leaves your deck after ${v.n} combats.${c && c.left != null ? ` (${c.left} left)` : ''}` });
  card('ROC_EGG', { name: 'Roc Egg', type: 'Quest', rarity: 'Quest', color: 'quest', cost: null, kw: ['Unplayable'], text: () => 'Can be hatched at a Rest Site.' });
  card('TREASURE_MAP', { name: 'Treasure Map', type: 'Quest', rarity: 'Quest', color: 'quest', cost: null, kw: ['Unplayable'], v: { gold: 600 },
    text: (v) => `Marks a site of ${v.gold} extra Gold in the next act.` });
  card('PECKING', { name: 'Pecking', type: 'Attack', rarity: 'Event', color: 'event', cost: 1, target: 'enemy', v: { dmg: 2, hits: 3 }, up: { hits: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage ${v.hits} times.`, play: async (g, c, t, v) => g.attack(t, v.dmg, v.hits, c) });
  card('BARK_RING', { name: 'Ring of Bark', type: 'Skill', rarity: 'Event', color: 'event', cost: 2, v: { blk: 5, turns: 2 }, up: { blk: 2 },
    text: (v, f) => `Gain ${f.b(v.blk)} Guard. Gain ${v.blk} Guard at the start of the next ${v.turns} turns.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.p.barkRing = (g.p.barkRing || []).concat([{ n: v.blk, turns: v.turns }]); } });
  card('CHICK_SWOOP', { name: 'Chick Swoop', type: 'Attack', rarity: 'Event', color: 'event', cost: 0, target: 'enemy', v: { dmg: 14 }, up: { dmg: 4 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: async (g, c, t, v) => g.attack(t, v.dmg, 1, c) });

  const relic = (id, o) => { HD.RELICS[id] = Object.assign({ id, rarity: 'Event', pool: 'shared' }, o); };
  relic('STONE_BLADE', { name: 'Stone Blade', text: 'Transforms into a powerful Relic after defeating 5 Elites.',
    afterCombat: (run, r, kind) => {
      if (kind !== 'elite') return;
      r.counter = (r.counter || 0) + 1;
      if (r.counter >= 5) { run.relics.splice(run.relics.indexOf(r), 1); run.addRelic('JADE_BLADE'); }
    } });
  relic('JADE_BLADE', { name: 'Jade Blade', text: 'Start each combat with 3 Might.', battleStart: async (g) => g.addPw(g.p, 'might', 3) });
  relic('PRIZE_CHEESE', { name: 'Prize Cheese', text: 'At the end of combat, gain 1 Max HP.', afterCombat: (run) => run.gainMaxHp(1) });
  relic('MARROW_TEA', { name: 'Marrow Tea', text: 'At the start of the next combat, Upgrade your starting hand.',
    firstHand: async (g, r) => { if (r.used) return; r.used = true; for (const c of g.hand) if (g.canUpgrade(c)) g.upgradeInCombat(c); } });
  relic('CINDER_TEA', { name: 'Cinder Tea', text: 'At the start of the next 5 combats, gain 2 Might.', onPickup: (run, r) => { r.charges = 5; },
    battleStart: async (g, r) => { if (r.charges > 0) { r.charges--; if (!r.charges) r.used = true; g.addPw(g.p, 'might', 2); } } });
  relic('RUDE_TEA', { name: 'Rude Tea', text: 'At the start of the next combat, shuffle 2 Reeling into your draw pile.',
    battleStart: async (g, r) => { if (r.used) return; r.used = true; g.addStatus({ id: 'REELING', n: 2, to: 'draw' }); } });
  relic('ROC_CHICK', { name: 'Roc Chick', text: 'On pickup, add a Chick Swoop to your deck. A chick follows you into battle.',
    onPickup: (run) => run.addCard('CHICK_SWOOP') });
  relic('BEAD_BRACELET', { name: 'Bead Bracelet', rarity: 'Common', text: 'Regular enemy combats no longer appear in ? rooms.' });

  // The Wrigglers the thicket event wakes up. Four, each starting on the move its slot calls for.
  HD.ENC.WRIGGLERS = { name: 'Wrigglers', pool: 'event', approx: true, mons: ['SQUIRMER', 'SQUIRMER', 'SQUIRMER', 'SQUIRMER'] };
})();

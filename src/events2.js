// Act 2 and 3 events, and the shared events that start appearing in Act 2.
// Numbers follow the reference data; all event text is HallowDeep's own.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const EV = HD.EVENTS;
  const ev = (id, o) => { EV[id] = Object.assign({ id, act: 2 }, o); };
  const loseHp = (run, n) => { run.hp -= n; };
  const loseGold = (run, n) => { run.gold = Math.max(0, run.gold - n); };
  const potion = (run, rar) => { const id = rar ? run.rng.event.pick(HD.potionPool(rar, run.color)) : run.randomPotion(); if (!run.addPotion(id)) run.pending.push({ kind: 'potion', id }); };
  const relic = (run) => { const id = run.rollRelic(); if (id) run.addRelic(id); };
  const basics = (run, tag) => run.removable().filter((c) => CARDS[c.id].rarity === 'Basic' && CARDS[c.id].tags.includes(tag));
  const upgradeRandom = (run, n) => run.rng.event.shuffle(run.deck.filter((c) => !c.up && ['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type))).slice(0, n).forEach((c) => run.upgrade(c));
  const downgradeRandom = (run, n) => run.rng.event.shuffle(run.deck.filter((c) => c.up)).slice(0, n).forEach((c) => { c.up = false; run.note({ kind: 'downgraded', id: c.id }); });
  const classCard = (run, f) => run.rng.event.pick(HD.POOL(run.color).filter(f)).id;
  const tradeable = (run) => run.relics.filter((r) => HD.RELICS[r.id] && HD.RELICS[r.id].rarity !== 'Starter');
  const gold = (n) => `Gain ${n} Gold.`;

  // ---------- Act 2 ----------
  ev('FUSER', { name: 'The Fuser', when: (run) => basics(run, 'Cut').length >= 2 && basics(run, 'Brace').length >= 2, pages: {
    INITIAL: { text: 'A humming contraption with two slots and a lever. A scrawled note says it can turn two of something into one better something.',
      options: [
        { id: 'STRIKES', label: 'Fuse Cuts', desc: () => 'Remove 2 Cut cards. Add Final Cut to your deck.',
          go: (run) => { basics(run, 'Cut').slice(0, 2).forEach((c) => run.removeCard(c)); run.addCard('FINAL_CUT'); return 'DONE'; } },
        { id: 'DEFENDS', label: 'Fuse Braces', desc: () => 'Remove 2 Brace cards. Add Final Brace to your deck.',
          go: (run) => { basics(run, 'Brace').slice(0, 2).forEach((c) => run.removeCard(c)); run.addCard('FINAL_BRACE'); return 'DONE'; } },
      ] },
    DONE: { text: 'The machine shudders, spits out one card, and goes quiet.' },
  } });
  ev('BUG_HUNTER', { name: 'Bug Hunter', pages: {
    INITIAL: { text: 'A veteran exterminator offers to teach you a trick or two, for free. The hive has been bad for business.',
      options: [
        { id: 'EXTERMINATE', label: 'Learn to sweep', desc: () => 'Add Pest Sweep to your deck.', go: (run) => { run.addCard('PEST_SWEEP'); return 'DONE'; } },
        { id: 'SQUASH', label: 'Learn to squash', desc: () => 'Add Stomp Flat to your deck.', go: (run) => { run.addCard('STOMP_FLAT'); return 'DONE'; } },
      ] },
    DONE: { text: '"Aim for the soft bits," the exterminator says, and wanders off.' },
  } });
  const bloom = (depth) => {
    const gain = [35, 75, 135][depth];
    const opts = [{ id: 'EXTRACT', label: 'Take the nectar', desc: () => gold(gain), go: (run) => { run.gainGold(gain); return 'TAKEN'; } }];
    if (depth < 2) opts.push({ id: 'DEEPER', label: 'Reach deeper', desc: () => `Go deeper. Lose ${[5, 6][depth]} HP.`, go: (run) => { loseHp(run, [5, 6][depth]); return `DEEP_${depth + 1}`; } });
    else opts.push({ id: 'CENTER', label: 'Enter the center', desc: () => 'Lose 7 HP. Obtain the Pollen Heart.', go: (run) => { loseHp(run, 7); run.addRelic('POLLEN_HEART'); return 'CORE'; } });
    return { text: ['A flower the size of a house, its petals sticky with golden nectar.', 'The petals close in around you. The nectar here is thicker.', 'At the very heart of the flower, something pulses with warm light.'][depth], options: opts };
  };
  ev('GIANT_BLOOM', { name: 'Giant Bloom', when: (run) => run.hp >= 19, pages: {
    INITIAL: bloom(0), DEEP_1: bloom(1), DEEP_2: bloom(2),
    TAKEN: { text: 'You fill your pockets with nectar that hardens into something merchants will pay for.' },
    CORE: { text: 'You tear the glowing core free. The flower wilts around you.' },
  } });
  ev('FIELD_OF_HOLES', { name: 'Field of Holes', pages: {
    INITIAL: { text: 'A field pocked with holes, each one exactly your shape. One of them seems to be calling you.',
      options: [
        { id: 'RESIST', label: 'Resist', desc: () => 'Remove 2 cards from your deck. Add Routine to your deck.', go: (run) => { run.pending.push({ kind: 'remove' }, { kind: 'remove' }); run.addCard('ROUTINE'); return 'RESIST'; } },
        { id: 'ENTER', label: 'Climb into your hole', desc: () => 'Enchant a card with Perfect Fit.', lock: (run) => (run.enchantable('PERFECT_FIT').length ? null : 'No card can be Enchanted.'),
          go: (run) => { run.pending.push({ kind: 'enchant', id: 'PERFECT_FIT' }); return 'ENTER'; } },
      ] },
    RESIST: { text: 'You walk away, though part of you keeps looking back.' },
    ENTER: { text: 'It fits you perfectly. Something of yours fits perfectly now too.' },
  } });
  ev('INFESTED_MACHINE', { name: 'Infested Machine', pages: {
    INITIAL: { text: 'An old automaton, crawling with bugs. Its chest panel hangs open.',
      options: [
        { id: 'STUDY', label: 'Study it', desc: () => 'Obtain a random Power.', go: (run) => { run.addCard(classCard(run, (d) => d.type === 'Power')); return 'DONE'; } },
        { id: 'TOUCH', label: 'Touch the core', desc: () => 'Obtain a random card that costs 0.', go: (run) => { run.addCard(classCard(run, (d) => d.cost === 0)); return 'DONE'; } },
      ] },
    DONE: { text: 'The bugs scatter. You come away with an idea you did not have before.' },
  } });
  ev('STRAY_WISP', { name: 'Stray Wisp', roll: (run, r) => ({ gold: r.range(45, 75) }), pages: {
    INITIAL: { text: 'A little wisp of light drifts between the combs, lost and flickering.',
      options: [
        { id: 'CAPTURE', label: 'Catch it', desc: () => 'Add Mildew to your deck. Obtain the Wisp in a Jar.', go: (run) => { run.addCard('MILDEW'); run.addRelic('WISP_JAR'); return 'CAUGHT'; } },
        { id: 'SEARCH', label: 'Search nearby', desc: (v) => gold(v.gold), go: (run, v) => { run.gainGold(v.gold); return 'SEARCHED'; } },
      ] },
    CAUGHT: { text: 'The jar glows. Something in your pack starts to smell of damp.' },
    SEARCHED: { text: 'You let the wisp go and find a few coins where it had been hovering.' },
  } });
  ev('SOUL_GRAFTER', { name: 'Soul Grafter', pages: {
    INITIAL: { text: 'A figure with stitched hands offers to graft something into you. It will heal you, it says. Mostly.',
      options: [
        { id: 'LET_IN', label: 'Let it in', desc: () => 'Heal 25 HP. Add Shed Skin to your deck.', go: (run) => { run.heal(25); run.addCard('SHED_SKIN'); return 'DONE'; } },
        { id: 'REJECT', label: 'Refuse', desc: () => 'Lose 10 HP. Upgrade a card.', go: (run) => { loseHp(run, 10); run.pending.push({ kind: 'upgrade' }); return 'DONE'; } },
      ] },
    DONE: { text: 'The grafter shrugs and goes back to sewing.' },
  } });
  ev('LAMP_KEY', { name: 'The Lamp Key', pages: {
    INITIAL: { text: 'A softly glowing key lies on the path. A hooded stranger appears behind you. "That is mine, I think."',
      options: [
        { id: 'RETURN', label: 'Return the key', desc: () => 'Gain 100 Gold.', go: (run) => { run.gainGold(100); return 'RETURNED'; } },
        { id: 'KEEP', label: 'Keep the key', desc: () => 'Fight for the key.', go: () => 'KEEP' },
      ] },
    KEEP: { text: 'The stranger draws a flail. Only one of you is leaving with the key.', options: [{ id: 'FIGHT', label: 'Fight', desc: () => 'Start a fight.', go: () => ({ fight: 'HOODED_KNIGHT' }) }] },
    RETURNED: { text: 'The stranger thanks you and pays you handsomely.' },
  }, onWin: (run) => run.addCard('LAMP_KEY_CARD') });
  ev('CALM_WEAVER', { name: 'Calm Weaver', when: (run) => run.gold >= 125, pages: {
    INITIAL: { text: 'A huge, patient spider offers lessons in calm. Her rates are posted on a web.',
      options: [
        { id: 'BREATHE', label: 'Breathing lessons', desc: () => 'Pay 50 Gold. Add 2 Clarity to your deck.', lock: (run) => (run.gold < 50 ? 'Not enough Gold.' : null),
          go: (run) => { loseGold(run, 50); run.addCard('CLARITY'); run.addCard('CLARITY'); return 'DONE'; } },
        { id: 'AWARE', label: 'Emotional awareness', desc: () => 'Pay 125 Gold. Remove 1 card from your deck.', lock: (run) => (run.gold < 125 ? 'Not enough Gold.' : null),
          go: (run) => { loseGold(run, 125); run.pending.push({ kind: 'remove' }); return 'DONE'; } },
        { id: 'NEEDLES', label: 'Eight-legged needles', desc: () => 'Pay 250 Gold. Remove 2 cards from your deck.', lock: (run) => (run.gold < 250 ? 'Not enough Gold.' : null),
          go: (run) => { loseGold(run, 250); run.pending.push({ kind: 'remove' }, { kind: 'remove' }); return 'DONE'; } },
      ] },
    DONE: { text: 'You leave feeling lighter, and somewhat poorer.' },
  } });

  // ---------- Act 3 ----------
  const dummy = (n, hp, prize, give) => ({ id: `SETTING_${n}`, label: `Setting ${n}`, desc: () => `Fight a ${hp} HP dummy. ${prize}`, go: (run, v) => { v.setting = n; return { fight: `DUMMY_${n}`, kind: 'event' }; } });
  ev('TRAINING_DUMMY', { name: 'Old Training Dummy', act: 3, pages: {
    INITIAL: { text: 'A battered training dummy with a dial on its chest. A sign says: beat it in three turns, win a prize.',
      options: [dummy(1, 75, 'Procure 1 random Potion.'), dummy(2, 150, 'Upgrade 2 random cards.'), dummy(3, 300, 'Obtain a random Relic.')] },
  }, onWin: (run, st, g) => {
    if (g.enemies.some((e) => e.fled)) return;
    if (st.v.setting === 1) potion(run); else if (st.v.setting === 2) upgradeRandom(run, 2); else relic(run);
  } });
  ev('FORGOTTEN_GRAVE', { name: 'Forgotten Grave', act: 3, pages: {
    INITIAL: { text: 'An unmarked grave, and a soul sitting on it, waiting to be remembered.',
      options: [
        { id: 'CONFRONT', label: 'Tell it the truth', desc: () => "Add Mildew to your deck. Enchant a card that Burns with Soul's Power.",
          lock: (run) => (run.enchantable('SOULS_POWER').length ? null : 'You have no cards that Burn that can be Enchanted.'),
          go: (run) => { run.addCard('MILDEW'); run.pending.push({ kind: 'enchant', id: 'SOULS_POWER' }); return 'DONE'; } },
        { id: 'ACCEPT', label: 'Take it with you', desc: () => 'Obtain the Lost Soul.', go: (run) => { run.addRelic('LOST_SOUL'); return 'DONE'; } },
      ] },
    DONE: { text: 'The grave is quiet now.' },
  } });
  ev('MUSHROOM_HUNGER', { name: 'Mushroom Hunger', act: 3, pages: {
    INITIAL: { text: 'Two mushrooms grow side by side: one enormous, one small and sweet-smelling. You are starving.',
      options: [
        { id: 'BIG', label: 'The big one', desc: () => 'Obtain the Giant Cap. On pickup, raise your Max HP by 20. Draw 2 fewer cards at the start of each combat.', go: (run) => { run.addRelic('GIANT_CAP'); return 'DONE'; } },
        { id: 'SWEET', label: 'The sweet one', desc: () => 'Obtain the Sweet Cap. On pickup, lose 15 HP and Upgrade 2 random cards.', go: (run) => { run.addRelic('SWEET_CAP'); return 'DONE'; } },
      ] },
    DONE: { text: 'You feel very strange, and very full.' },
  } });
  ev('MIRROR_POOL', { name: 'Mirror Pool', act: 3, pages: {
    INITIAL: { text: 'A still pool that shows you as you were, and as you might be.',
      options: [
        { id: 'TOUCH', label: 'Touch your reflection', desc: () => 'Downgrade 2 random cards. Upgrade 4 random cards.', go: (run) => { downgradeRandom(run, 2); upgradeRandom(run, 4); return 'DONE'; } },
        { id: 'SHATTER', label: 'Shatter it', desc: () => 'Duplicate your deck. Add Ill Fortune to your deck.',
          go: (run) => { for (const c of run.deck.slice()) run.addCard(c.id, c.up, c.ench); run.addCard('ILL_FORTUNE'); return 'DONE'; } },
      ] },
    DONE: { text: 'The surface stills. You are not quite who you were.' },
  } });
  ev('TEA_TABLE', { name: 'Round Tea Table', act: 3, when: (run) => run.hp >= 12, pages: {
    INITIAL: { text: 'A long table set for tea, and a host who insists. The tea smells faintly of almonds.',
      options: [
        { id: 'ENJOY', label: 'Enjoy the tea', desc: () => 'Obtain the Court Poison. Heal to full HP.', go: (run) => { run.addRelic('COURT_POISON'); run.hp = run.maxHp; return 'DONE'; } },
        { id: 'FIGHT', label: 'Start a fight', desc: () => 'Lose 11 HP. Obtain a random Relic.', go: (run) => { loseHp(run, 11); relic(run); return 'DONE'; } },
      ] },
    DONE: { text: 'The host bows. Tea time is over.' },
  } });
  const RIDERS = {
    ATTACK: [['SAPPING', 'Sapping', 'Apply 2 Sapped. Apply 2 Exposed.'], ['VIOLENCE', 'Violence', 'Hits 2 additional times.'], ['CHOKING', 'Choking', 'Whenever you play a card this turn, the enemy loses 6 HP.']],
    SKILL: [['ENERGIZED', 'Energized', 'Gain 2 Energy.'], ['WISDOM', 'Wisdom', 'Draw 3 cards.'], ['CHAOS', 'Chaos', 'Add a random card to your hand. It is free this turn.']],
    POWER: [['EXPERTISE', 'Expertise', 'Gain 2 Might. Gain 2 Poise.'], ['CURIOUS', 'Curious', 'Powers cost 1 less.'], ['IMPROVEMENT', 'Improvement', 'At the end of combat, Upgrade a random card.']],
  };
  const TYPE_CARD = { ATTACK: 'ODD_DEVICE', SKILL: 'ODD_DEVICE_S', POWER: 'ODD_DEVICE_P' };
  ev('TINKER_BENCH', { name: "Tinker's Bench", act: 3, pages: {
    INITIAL: { text: 'A scientist covered in soot waves you over. "You look capable. I need someone to test my newest invention!"',
      options: [{ id: 'ACCEPT', label: 'Accept', desc: () => 'Build a custom card to add to your deck.', go: () => 'TYPE' }] },
    TYPE: { text: '"What kind of tool do you need?"', options: [
      { id: 'ATTACK', label: 'Weapon', desc: () => 'Make an Attack (deal 12 damage).', go: (run, v) => { v.type = 'ATTACK'; return 'RIDER_ATTACK'; } },
      { id: 'SKILL', label: 'Protector', desc: () => 'Make a Skill (gain 8 Guard).', go: (run, v) => { v.type = 'SKILL'; return 'RIDER_SKILL'; } },
      { id: 'POWER', label: 'Gadget', desc: () => 'Make a Power.', go: (run, v) => { v.type = 'POWER'; return 'RIDER_POWER'; } },
    ] },
    DONE: { text: '"All done! Now go out there and use it." The scientist is already working on the next one.' },
  } });
  for (const [type, riders] of Object.entries(RIDERS)) {
    EV.TINKER_BENCH.pages[`RIDER_${type}`] = { text: '"Excellent. Now, what should it do?"', options: riders.map(([id, label, text]) => ({
      id, label, desc: () => text, go: (run) => { run.addCard(TYPE_CARD[type], false, null, { rider: id }); return 'DONE'; } })) };
  }
  const CASES = ['MERCHANT', 'NOBLE', 'NONDESCRIPT'];
  const verdict = (cs) => ({
    MERCHANT: [['Guilty', 'Add Remorse to your deck. Obtain 2 random Relics.', (run) => { run.addCard('REMORSE'); relic(run); relic(run); }],
      ['Innocent', 'Add Disgrace to your deck. Upgrade 2 cards.', (run) => { run.addCard('DISGRACE'); run.pending.push({ kind: 'upgrade' }, { kind: 'upgrade' }); }]],
    NOBLE: [['Guilty', 'Heal 10 HP.', (run) => run.heal(10)], ['Innocent', 'Add Remorse to your deck. Gain 300 Gold.', (run) => { run.addCard('REMORSE'); run.gainGold(300); }]],
    NONDESCRIPT: [['Guilty', 'Add Misgiving to your deck. Gain 2 card rewards.', (run) => { run.addCard('MISGIVING'); run.pending.push({ kind: 'cards', cards: run.cardReward('monster') }, { kind: 'cards', cards: run.cardReward('monster') }); }],
      ['Innocent', 'Add Misgiving to your deck. Transform 2 cards.', (run) => { run.addCard('MISGIVING'); run.pending.push({ kind: 'transform' }, { kind: 'transform' }); }]],
  })[cs];
  ev('HEARING', { name: 'The Hearing', act: 3, roll: (run, r) => ({ case: r.pick(CASES) }), pages: {
    INITIAL: { text: 'A courtroom with no judge. Everyone turns to look at you. "Ah, today\'s decider has arrived."',
      options: [
        { id: 'ACCEPT', label: 'Accept', desc: () => "Serve as today's decider.", go: (run, v) => v.case },
        { id: 'REJECT', label: 'Refuse', desc: () => 'You are not allowed to refuse.', go: () => 'REJECT' },
      ] },
    REJECT: { text: 'The room goes very quiet. "We will ask once more."', options: [
      { id: 'ACCEPT', label: 'Give in', desc: () => "Serve as today's decider.", go: (run, v) => v.case },
      { id: 'DOUBLE_DOWN', label: 'Refuse again', desc: () => 'Face lethal consequences.', go: (run) => { run.hp = 0; return 'REJECT'; } },
    ] },
    VERDICT: { text: 'The gavel falls. The court thanks you for your service.' },
  } });
  const caseText = { MERCHANT: 'The accused is a merchant, caught selling relics that were not his to sell.',
    NOBLE: 'The accused is a noble, charged with hoarding grain through a hungry winter.', NONDESCRIPT: 'The accused is... someone. Nobody can quite remember who, or what they did.' };
  for (const cs of CASES) EV.HEARING.pages[cs] = { text: caseText[cs], options: verdict(cs).map(([label, desc, fn]) => ({ id: label.toUpperCase(), label, desc: () => desc, go: (run) => { fn(run); return 'VERDICT'; } })) };

  // ---------- shared, from Act 2 ----------
  const DOLLS = ['WIND_DOLL', 'RAG_DOLL', 'TWIN_DOLL'];
  const dollChoice = (run, n) => run.pending.push({ kind: 'choice', act: 'relicTake', title: 'Choose a doll', opts: run.rng.event.shuffle(DOLLS.filter((d) => !run.hasRelic(d))).slice(0, n) });
  ev('DOLLS', { name: 'Room of Dolls', act: 2, pages: {
    INITIAL: { text: 'A hidden room packed with dolls. Their whispers grow louder the longer you stay.',
      options: [
        { id: 'RANDOM', label: 'Grab one', desc: () => 'Obtain a random doll.', go: (run) => { const ds = DOLLS.filter((d) => !run.hasRelic(d)); if (ds.length) run.addRelic(run.rng.event.pick(ds)); return 'DONE'; } },
        { id: 'SOME_TIME', label: 'Take some time', desc: () => 'Lose 5 HP. Choose 1 of 2 dolls.', go: (run) => { loseHp(run, 5); dollChoice(run, 2); return 'DONE'; } },
        { id: 'EXAMINE', label: 'Examine them all', desc: () => 'Lose 15 HP. Choose 1 of 3 dolls.', go: (run) => { loseHp(run, 15); dollChoice(run, 3); return 'DONE'; } },
      ] },
    DONE: { text: 'The whispering stops the moment you pick one up.' },
  } });
  ev('POTION_RUNNER', { name: 'Potion Runner', act: [2, 3], pages: {
    INITIAL: { text: 'A courier lies groaning beside an overturned crate of potions. Most of them smell terrible.',
      options: [
        { id: 'GRAB', label: 'Grab the crate', desc: () => 'Procure 3 Rank Flasks.', go: (run) => { for (let i = 0; i < 3; i++) if (!run.addPotion('RANK_FLASK')) run.pending.push({ kind: 'potion', id: 'RANK_FLASK' }); return 'DONE'; } },
        { id: 'RANSACK', label: 'Ransack the bags', desc: () => 'Procure 1 random Uncommon Potion.', go: (run) => { potion(run, 'Uncommon'); return 'DONE'; } },
      ] },
    DONE: { text: 'The courier will not be making this delivery.' },
  } });
  ev('ELDER', { name: 'The Elder', act: [2, 3], when: (run) => run.potions.some(Boolean), pages: {
    INITIAL: { text: 'An ancient trader with a voice like dry leaves. "I trade fairly. Mostly."',
      options: [
        { id: 'POTION', label: 'Give a potion', desc: () => 'Obtain a random Relic.', lock: (run) => (run.potions.some(Boolean) ? null : 'You have no potions to give.'),
          go: (run) => { run.pending.push({ kind: 'choice', act: 'potionGive', title: 'Give a potion', opts: run.potions.map((p, i) => (p ? i : null)).filter((i) => i != null) }); return 'DONE'; } },
        { id: 'GOLD', label: 'Give 100 Gold', desc: () => 'Obtain a random Relic.', lock: (run) => (run.gold < 100 ? 'Not enough Gold.' : null), go: (run) => { loseGold(run, 100); relic(run); return 'DONE'; } },
        { id: 'RELIC', label: 'Give a relic', desc: () => 'Obtain 2 random Relics.', lock: (run) => (tradeable(run).length ? null : 'You have no relics to give.'),
          go: (run) => { run.pending.push({ kind: 'choice', act: 'relicGive', n: 2, title: 'Give a relic', opts: tradeable(run).map((r) => r.id) }); return 'DONE'; } },
      ] },
    DONE: { text: '"A pleasure," the elder rasps.' },
  } });
  ev('CLOAKED_TRADER', { name: 'Cloaked Trader', act: [2, 3], when: (run) => tradeable(run).length >= 5,
    roll: (run) => { const out = []; for (let i = 0; i < 3; i++) { const id = run.rollRelic(); if (id && !out.includes(id)) out.push(id); } return { offers: out }; }, pages: {
      INITIAL: { text: 'A shadowy figure flings open a cloak lined with relics. "What are you trading?"' },
      DONE: { text: '"Hehehe. Thank you."' } } });
  EV.CLOAKED_TRADER.pages.INITIAL.options = [0, 1, 2].map((i) => ({ id: ['TOP', 'MIDDLE', 'BOTTOM'][i], label: `Take the ${['top', 'middle', 'bottom'][i]} one`,
    desc: (v) => (v.offers[i] ? `Trade one of your relics for ${HD.RELICS[v.offers[i]].name}.` : 'Nothing here.'), lock: (run, v) => (v.offers[i] ? null : 'Nothing here.'),
    go: (run, v) => { run.pending.push({ kind: 'choice', act: 'relicTrade', get: v.offers[i], title: 'Choose a relic to trade away', opts: tradeable(run).map((r) => r.id) }); return 'DONE'; } }));
  ev('AGELESS_STONE', { name: 'Ageless Stone', act: 2, when: (run) => run.potions.some(Boolean), pages: {
    INITIAL: { text: 'A boulder carved with the words: LIFT ME. A cup of something sits on top.',
      options: [
        { id: 'LIFT', label: 'Drink and lift', desc: () => 'Lose a random potion. Gain 10 Max HP.', lock: (run) => (run.potions.some(Boolean) ? null : 'Requires a potion.'),
          go: (run) => { const xs = run.potions.map((p, i) => (p ? i : -1)).filter((i) => i >= 0); run.potions[run.rng.event.pick(xs)] = null; run.gainMaxHp(10); return 'DONE'; } },
        { id: 'PUSH', label: 'Push it', desc: () => 'Lose 6 HP. Enchant an Attack with Vigorous 8.', lock: (run) => (run.enchantable('VIGOROUS').length ? null : 'Requires an Attack.'),
          go: (run) => { loseHp(run, 6); run.pending.push({ kind: 'enchant', id: 'VIGOROUS', n: 8 }); return 'DONE'; } },
      ] },
    DONE: { text: 'The stone does not move. You feel stronger anyway.' },
  } });
  ev('PARASITE', { name: 'Parasite Bloom', act: [2, 3], pages: {
    INITIAL: { text: 'A pulsing growth reaches toward you, offering to share its strength.',
      options: [
        { id: 'APPROACH', label: 'Let it bond', desc: () => 'Enchant an Attack with Corrupted.', lock: (run) => (run.enchantable('CORRUPTED').length ? null : 'None of your Attacks can be Enchanted.'),
          go: (run) => { run.pending.push({ kind: 'enchant', id: 'CORRUPTED' }); return 'DONE'; } },
        { id: 'BURN', label: 'Burn it', desc: () => 'Choose a card to Transform.', go: (run) => { run.pending.push({ kind: 'transform' }); return 'DONE'; } },
      ] },
    DONE: { text: 'The growth withers.' },
  } });
  const hasKey = (run) => run.deck.some((c) => c.id === 'LAMP_KEY_CARD');
  const dropKey = (run) => { const k = run.deck.find((c) => c.id === 'LAMP_KEY_CARD'); if (k) run.removeCard(k); };
  ev('HISTORIAN', { name: 'The Historian', act: 3, when: hasKey, pages: {
    INITIAL: { text: 'A scholar locked in a cage beside a locked chest. Your lamp key fits both locks. It will only turn once.',
      options: [
        { id: 'CAGE', label: 'Open the cage', desc: () => 'Lose the Lamp Key. Obtain Old Lessons.', go: (run) => { dropKey(run); run.addRelic('OLD_LESSONS'); return 'DONE'; } },
        { id: 'CHEST', label: 'Open the chest', desc: () => 'Lose the Lamp Key. Procure 2 random Potions. Obtain 2 random Relics.', go: (run) => { dropKey(run); potion(run); potion(run); relic(run); relic(run); return 'DONE'; } },
      ] },
    DONE: { text: 'The key crumbles to rust in the lock.' },
  } });
  const commonRelic = (run) => { const xs = HD.relicPool('Common', run); if (xs.length) run.addRelic(run.rng.event.pick(xs)); };
  ev('BAZAAR', { name: "Bongo's Bazaar", act: 2, when: (run) => run.gold >= 100, pages: {
    INITIAL: { text: 'A cheerful stall wedged between two combs. "Welcome to Bongo\'s! Everything must go!"',
      options: [
        { id: 'BIN', label: 'Bargain bin', desc: () => 'Pay 100 Gold. Obtain 1 random Common Relic.', lock: (run) => (run.gold < 100 ? 'Requires 100 Gold.' : null), go: (run) => { loseGold(run, 100); commonRelic(run); return 'DONE'; } },
        { id: 'FEATURED', label: 'Featured item', desc: () => 'Pay 200 Gold. Obtain a random Relic.', lock: (run) => (run.gold < 200 ? 'Requires 200 Gold.' : null), go: (run) => { loseGold(run, 200); relic(run); return 'DONE'; } },
        { id: 'MYSTERY', label: 'Mystery box', desc: () => 'Pay 300 Gold. Obtain 3 random Relics after 5 combats.', lock: (run) => (run.gold < 300 ? 'Requires 300 Gold.' : null),
          go: (run) => { loseGold(run, 300); run.addRelic('MYSTERY_TICKET'); return 'DONE'; } },
        { id: 'LEAVE', label: 'Leave', desc: () => 'Downgrade a random card.', go: (run) => { downgradeRandom(run, 1); return 'LEFT'; } },
      ] },
    DONE: { text: '"Come again soon!"' },
    LEFT: { text: 'Bongo looks wounded. On your way out, something of yours gets a little worse.' },
  } });

  // ---------- event cards ----------
  const card = (id, o) => { CARDS[id] = Object.assign({ id, color: 'event', rarity: 'Event', target: 'self', v: {}, up: {}, kw: [], tags: [] }, o); };
  card('PEST_SWEEP', { name: 'Pest Sweep', type: 'Attack', cost: 1, target: 'all', v: { dmg: 3, hits: 4 }, up: { dmg: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies ${v.hits} times.`, play: (g, c, t, v) => g.attackAll(v.dmg, v.hits, c) });
  card('STOMP_FLAT', { name: 'Stomp Flat', type: 'Attack', cost: 1, target: 'enemy', v: { dmg: 10, vul: 2 }, up: { dmg: 2, vul: 1 },
    text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.vul} Exposed.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'exposed', v.vul); } });
  card('SHED_SKIN', { name: 'Shed Skin', type: 'Skill', cost: 2, kw: ['Burn'], v: { draw: 3 }, up: { draw: 2 },
    text: (v) => `Add ${v.draw} random Attacks to your draw pile. They are free to play this combat.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.draw; i++) { const x = g.makeCard(g.randomPoolCard((d) => d.type === 'Attack'), false); x.freeCombat = true; g.draw.splice(g.rng.int(g.draw.length + 1), 0, x); } } });
  card('CLARITY', { name: 'Clarity', type: 'Skill', cost: 0, kw: ['Burn'], text: (v, f, c) => `Reduce the cost of ALL cards in your hand to 1 this ${c && c.up ? 'combat' : 'turn'}.`,
    play: async (g, c) => { for (const x of g.hand) { if (c.up) x.setCost = 1; else x.costTurn = Math.min(1, x.costTurn != null ? x.costTurn : g.costOf(x)); } } });
  card('ILL_FORTUNE', { name: 'Ill Fortune', type: 'Curse', rarity: 'Curse', color: 'curse', cost: null, kw: ['Unplayable', 'Eternal'], v: { loss: 13 },
    text: (v) => `At the end of your turn, if this is in your hand, lose ${v.loss} HP.`, endInHand: async (g) => g.selfLoseHp(13) });
  card('LAMP_KEY_CARD', { name: 'Lamp Key', type: 'Quest', rarity: 'Quest', color: 'quest', cost: null, kw: ['Unplayable'], text: () => 'Unlocks a special event in the next act.' });
  const riderText = (c) => { const r = c && c.rider && Object.values(RIDERS).flat().find((x) => x[0] === c.rider); return r ? ` ${r[2]}` : ''; };
  card('ODD_DEVICE', { name: 'Odd Device', type: 'Attack', cost: 1, target: 'enemy', upKw: ['Opening'], v: { dmg: 12 },
    text: (v, f, c) => `Deal ${f.d(v.dmg)} damage${c && c.rider === 'VIOLENCE' ? ' 3 times' : ''}.${c && c.rider === 'VIOLENCE' ? '' : riderText(c)}`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, c.rider === 'VIOLENCE' ? 3 : 1, c);
      if (!t.alive || g.over) return;
      if (c.rider === 'SAPPING') { await g.apply(t, 'sapped', 2); await g.apply(t, 'exposed', 2); }
      if (c.rider === 'CHOKING') g.addPw(t, 'choked', 6);
    } });
  card('ODD_DEVICE_S', { name: 'Odd Device', type: 'Skill', cost: 1, upKw: ['Opening'], v: { blk: 8 },
    text: (v, f, c) => `Gain ${f.b(v.blk)} Guard.${riderText(c)}`,
    play: async (g, c, t, v) => {
      await g.gainBlock(v.blk, true);
      if (c.rider === 'ENERGIZED') g.gainEnergy(2);
      if (c.rider === 'WISDOM') await g.drawCards(3);
      if (c.rider === 'CHAOS') { const x = g.makeCard(g.randomPoolCard(() => true), false); x.freeTurn = true; g.addToHand(x); }
    } });
  card('ODD_DEVICE_P', { name: 'Odd Device', type: 'Power', cost: 1, upKw: ['Opening'], text: (v, f, c) => (riderText(c).trim() || 'Does whatever it was built to do.'),
    play: async (g, c) => {
      if (c.rider === 'EXPERTISE') { g.addPw(g.p, 'might', 2); g.addPw(g.p, 'poise', 2); }
      if (c.rider === 'CURIOUS') g.addPw(g.p, 'curious', 1);
      if (c.rider === 'IMPROVEMENT') g.addPw(g.p, 'improvement', 1);
    } });

  // ---------- event relics ----------
  const rel = (id, o) => { HD.RELICS[id] = Object.assign({ id, rarity: 'Event', pool: 'shared' }, o); };
  rel('POLLEN_HEART', { name: 'Pollen Heart', text: 'Every 4 turns, draw 2 additional cards.',
    turnStart: async (g, r) => { r.counter = (r.counter || 0) + 1; if (r.counter >= 4) { r.counter = 0; g.extraDrawThisTurn += 2; } } });
  rel('WISP_JAR', { name: 'Wisp in a Jar', text: 'Whenever you play a Power, deal 8 damage to ALL enemies.',
    afterPlay: async (g, r, c, d) => { if (d.type === 'Power') for (const e of g.alive()) await g.damage(e, 8, {}); } });
  rel('COURT_POISON', { name: 'Court Poison', text: 'At the start of each combat, lose 4 HP.', battleStart: async (g) => g.selfLoseHp(4) });
  rel('GIANT_CAP', { name: 'Giant Cap', text: 'On pickup, raise your Max HP by 20. At the start of each combat, draw 2 fewer cards.',
    onPickup: (run) => run.gainMaxHp(20), battleStart: async (g) => { g.firstTurnDraw -= 2; } });
  rel('SWEET_CAP', { name: 'Sweet Cap', text: 'On pickup, lose 15 HP and Upgrade 2 random cards.', onPickup: (run) => { run.hp = Math.max(1, run.hp - 15); upgradeRandom(run, 2); } });
  rel('LOST_SOUL', { name: 'Lost Soul', text: 'Whenever you Burn a card, deal 1 damage to a random enemy.', onBurn: async (g) => { const e = g.randomEnemy(); if (e) await g.damage(e, 1, {}); } });
  rel('OLD_LESSONS', { name: 'Old Lessons', text: 'At the start of your turn, play a copy of the last Attack or Skill you played.',
    turnStart: async (g) => {
      const last = g.lastAS; if (!last || g.turn === 1) return;
      const x = g.makeCard(last.id, last.up); await g.autoPlay(x, {});
      for (const pile of [g.discard, g.draw, g.hand]) { const i = pile.indexOf(x); if (i >= 0) pile.splice(i, 1); }
    } });
  rel('MYSTERY_TICKET', { name: 'Mystery Ticket', text: 'Receive 3 random Relics after 5 combats.',
    afterCombat: (run, r) => { if (r.used) return; r.counter = (r.counter || 0) + 1; if (r.counter >= 5) { r.used = true; for (let i = 0; i < 3; i++) relic(run); } } });
  rel('WIND_DOLL', { name: 'Wind Doll', text: 'Whenever you play an Attack, gain 1 Guard.', afterPlay: async (g, r, c, d) => { if (d.type === 'Attack') await g.gainBlock(1, false); } });
  rel('RAG_DOLL', { name: 'Rag Doll', text: 'At the start of your turn, deal damage equal to the turn number to ALL enemies.',
    turnStart: async (g) => { for (const e of g.alive()) await g.damage(e, g.turn, {}); } });
  rel('TWIN_DOLL', { name: 'Twin Doll', text: 'Whenever you add a card to your deck, add one more copy.',
    onCardAdded: (run, r, c) => { if (r.busy) return; r.busy = true; run.addCard(c.id, c.up, c.ench); r.busy = false; } });

  // ---------- Foul Potion ----------
  HD.POTIONS.RANK_FLASK = { id: 'RANK_FLASK', name: 'Rank Flask', rarity: 'Event', target: 'self', pool: 'event',
    text: 'Deal 12 damage to ALL players and enemies. Can be thrown at the Merchant for 100 Gold instead.',
    use: async (g) => { for (const e of g.alive()) await g.damage(e, 12, {}); if (!g.over) await g.damage(g.p, 12, {}); } };

  // ---------- event fights ----------
  const mon = (id, o) => { HD.MON[id] = Object.assign({ id, act: 0 }, o); };
  for (const [n, hp] of [[1, 75], [2, 150], [3, 300]]) {
    mon(`DUMMY_${n}`, { name: 'Training Dummy', hp: [hp, hp], init: { timeLimit: 3 }, moves: { NOTHING: { name: 'Wobble', sleep: true } }, ai: () => 'NOTHING' });
    HD.ENC[`DUMMY_${n}`] = { name: 'Training Dummy', pool: 'event', mons: [`DUMMY_${n}`] };
  }
  mon('HOODED_KNIGHT', { name: 'Hooded Knight', hp: [101, 101], moves: HD.MON.CHAIN_KNIGHT.moves, ai: HD.MON.CHAIN_KNIGHT.ai });
  HD.ENC.HOODED_KNIGHT = { name: 'Hooded Knight', pool: 'event', mons: ['HOODED_KNIGHT'] };
  // An Act 2 fight the data lists without an act.
  HD.ENC.TUNNEL_PAIR = { name: 'Tunneling Pair', act: 2, pool: 'normal', mons: ['GNASHER', 'BURROWER'] };
})();

// Behavior checks for the Fool (the Minstrel): Arrows (Reeds: Shoot, Impaled, Dislodge), Aim, Stretch, Melodies,
// Sadness and Joy, the Tarot cards, and the Fool's cards, relics and potions.  Usage: node test/fool_cards.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'fool_data', 'fool', 'coop', 'neow2', 'ascension_data', 'ascension'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
const HD = ctx.HD; HD.setVersion('0.111');
let fails = 0, n = 0;
const eq = (name, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
const ui = { choose: async (g, o) => o.from.slice(0, o.n) };
const HP = 500;
// A fight with sturdy, powerless enemies that never act. two: a fight with more than one enemy.
async function fight(o = {}) {
  const r = new HD.Run('fc', o.char || 'MINSTREL');
  if (o.noStarter) r.relics = [];
  for (const id of o.relics || []) r.addRelic(id);
  for (const id of o.deck || []) r.addCard(id);
  if (o.floor) r.floor = o.floor;
  r.pending.length = 0;
  const g = new HD.Combat(r, o.two ? 'BANDITS' : 'RIPJAW', ui, 'monster'); await g.start();
  for (const e of g.enemies) { e.hp = e.maxHp = HP; e.block = 0; e.pw = {}; }
  g.energy = 9; g.p.block = 0;
  if (!o.keep) { delete g.p.pw.aim; delete g.p.pw.stretch; }
  if (o.aim) g.p.pw.aim = o.aim;
  if (o.noReed) g.rs.reedMax = 0;
  const mk = (ids) => (ids || []).map((id) => g.makeCard(id, false));
  if (o.hand) { g.hand = mk(o.hand); g.draw = mk(o.draw); g.discard = mk(o.discard); }
  g.enemyTurn = async () => {};
  return g;
}
const lost = (e) => HP - e.hp;
const dealt = (g) => g.enemies.reduce((a, e) => a + lost(e), 0);
const ids = (pile) => pile.map((c) => c.id);
const count = (pile, id) => pile.filter((c) => c.id === id).length;
const play = async (g, id, t) => { const c = g.hand.find((x) => x.id === id); return g.playCard(c, t === undefined && HD.CARDS[id].target === 'enemy' ? g.enemies[0] : t || null); };
const PLUCKS = ['PLUCK', 'PLUCK', 'PLUCK', 'PLUCK', 'PLUCK', 'PLUCK', 'PLUCK', 'PLUCK'];

(async () => {
  let g, e;
  // ---------- the character ----------
  g = await fight({ keep: true });
  eq('The Fool: 77 HP, 99 Gold, 5 Strikes, 4 Defends, Foolish Shot; Song Bow gives 6 Aim; 1 Arrow',
    [g.run.maxHp, g.run.gold, count(g.run.deck, 'PLUCK'), count(g.run.deck, 'BARK_WARD'), count(g.run.deck, 'CARELESS_REED'), g.p.pw.aim, g.reeds()], [77, 99, 5, 4, 1, 6, 1]);

  // ---------- Arrows: Shoot, Impaled, Dislodge ----------
  g = await fight({ hand: ['CARELESS_REED', 'QUICK_REED'], aim: 6 }); e = g.enemies[0]; await play(g, 'CARELESS_REED');
  eq('Foolish Shot: 15 + 6 Aim; Aim is spent; the enemy is Impaled; with no Arrow, Shoot cards cannot be played', [dealt(g), g.p.pw.aim, e.pw.impaled, g.reeds(), g.canPlay(g.hand[0])], [21, undefined, 3, 0, false]);
  g = await fight({ hand: ['CARELESS_REED', 'PLUCK', 'PLUCK', 'PLUCK'] }); e = g.enemies[0]; await play(g, 'CARELESS_REED'); e.block = 100;
  await play(g, 'PLUCK'); await play(g, 'PLUCK'); const mid = [e.pw.impaled, g.reeds()]; await play(g, 'PLUCK');
  eq('Impaled: the Arrow is Dislodged after 3 more hits (blocked hits count)', [mid, e.pw.impaled, g.reeds()], [[1, 0], undefined, 1]);
  g = await fight({ hand: ['CARELESS_REED'], two: true }); e = g.enemies[0]; e.hp = 5; await play(g, 'CARELESS_REED');
  eq('a Shot that kills gets the Arrow straight back', [e.alive, g.over, g.reeds()], [false, false, 1]);
  g = await fight({ hand: ['HEAVY_REED'], aim: 6 }); await play(g, 'HEAVY_REED');
  eq('Heavy Shot (v0.114): Aim counts 3 times (16 + 18)', dealt(g), 34);
  g = await fight({ hand: ['TWIN_REEDS'], aim: 6 }); await play(g, 'TWIN_REEDS');
  eq('Twin Shot (v0.114, replaced Rapid Shot): both hits get Aim ((7 + 6) x 2); its own hits do not loosen the Arrow', [dealt(g), g.enemies[0].pw.impaled], [26, 3]);
  g = await fight({ hand: ['RAINING_REED'], two: true }); await play(g, 'RAINING_REED');
  eq('Rain Shot: every other enemy takes the damage dealt', g.enemies.map(lost).every((x) => x === 12) && g.enemies.length > 1, true);
  g = await fight({ hand: ['BLOSSOM_REED'] }); await play(g, 'BLOSSOM_REED');
  eq('Blossom Shot: Stretch equal to the damage dealt', [dealt(g), g.p.pw.stretch], [11, 11]);
  g = await fight({ hand: ['TRICK_REED'], draw: PLUCKS }); await play(g, 'TRICK_REED');
  eq('Trick Shot (v0.114): 12 damage and draw 2', [dealt(g), ids(g.hand), ids(g.discard)], [12, ['PLUCK', 'PLUCK'], ['TRICK_REED']]);
  g = await fight({ hand: ['LAST_REST', 'CARELESS_REED'] }); await play(g, 'LAST_REST'); await play(g, 'CARELESS_REED');
  eq('Quietus (v0.114): the next Shot deals double, and the Arrow is no longer destroyed', [dealt(g), g.enemies[0].pw.impaled, g.reeds(), g.rs.reedMax, g.p.pw.quietus], [30, 3, 0, 1, undefined]);
  g = await fight({ hand: ['SPARE_REED', 'CARELESS_REED', 'QUICK_REED'] }); e = g.enemies[0]; await play(g, 'SPARE_REED'); const two = g.reeds(); await play(g, 'CARELESS_REED'); await play(g, 'QUICK_REED');
  eq('Quiver: a second Arrow; both can be stuck in one enemy, and the second Shot loosens the first', [two, g.reeds(), e.reeds.map((r) => r.left), e.pw.impaled], [2, 0, [2, 3], 2]);
  g = await fight({ hand: ['WHETTING', 'CARELESS_REED'] }); await play(g, 'WHETTING'); await play(g, 'CARELESS_REED');
  eq('Honing (v0.114): Arrows deal double damage (15 becomes 30)', dealt(g), 30);
  g = await fight({ hand: ['NO_LOVE_LOST', 'CARELESS_REED'] }); await play(g, 'NO_LOVE_LOST'); await play(g, 'CARELESS_REED'); const dl = dealt(g); await g.endTurn();
  eq('Dislike You: 8, then Shots deal 50% more to it this turn (22); gone next turn', [dl, g.enemies[0].pw.dislikeYou], [30, undefined]);
  g = await fight({ hand: ['BARBED_REEDS', 'CARELESS_REED', 'PLUCK'] }); await play(g, 'BARBED_REEDS'); await play(g, 'CARELESS_REED'); await play(g, 'PLUCK');
  eq('Serrated Arrows (v0.114): Impaled enemies take 50% more from your Attacks (15, then 6 becomes 9)', dealt(g), 24);
  g = await fight({ hand: ['CARELESS_REED', 'FA_MALLET'] }); await play(g, 'CARELESS_REED'); await play(g, 'FA_MALLET');
  eq('Wah Hammer: double damage to an Impaled enemy (15 + 18)', dealt(g), 33);
  g = await fight({ hand: ['CARELESS_REED', 'BOW_SWAT', 'LA_SKIP'], draw: PLUCKS }); await play(g, 'CARELESS_REED'); await play(g, 'BOW_SWAT'); await play(g, 'LA_SKIP');
  eq('Bow Smack gains 1 Energy and Ki Hop draws 2 against an Impaled enemy', [g.energy, g.hand.length], [9 - 3 + 1, 2]);
  g = await fight({ hand: ['NAIL_DOWN', 'CARELESS_REED', 'NAIL_DOWN'] }); e = g.enemies[0]; await play(g, 'NAIL_DOWN'); const miss = dealt(g); await play(g, 'CARELESS_REED'); await play(g, 'NAIL_DOWN');
  eq('Nail: nothing unless the enemy is Impaled; then 20 damage, 2 Weak and 2 Vulnerable', [miss, dealt(g), e.pw.sapped, e.pw.exposed], [0, 35, 2, 2]);
  g = await fight({ hand: ['YANK', 'CARELESS_REED', 'YANK', 'TEAR_OUT', 'QUICK_REED', 'CALL_BACK'], draw: PLUCKS, discard: [] }); e = g.enemies[0];
  await play(g, 'YANK'); const none = g.hand.length; await play(g, 'CARELESS_REED'); await play(g, 'YANK'); const back = [g.reeds(), e.pw.impaled, g.hand.length];
  await play(g, 'QUICK_REED'); await play(g, 'TEAR_OUT'); const vul = [g.reeds(), e.pw.exposed];
  eq('Wrest: nothing without an Impaled enemy; otherwise Dislodge and draw 2. Uproot: Dislodge and 3 Vulnerable', [none, back, vul], [5, [1, undefined, 5], [1, 3]]);
  g = await fight({ hand: ['CARELESS_REED', 'CALL_BACK'], draw: [], discard: ['FELLING'] }); await play(g, 'CARELESS_REED'); await play(g, 'CALL_BACK');
  eq('Recall (v0.114): costs 0, Retain, Dislodges and Exhausts (the upgrade keeps it)', [g.reeds(), ids(g.draw), count(g.ash, 'CALL_BACK'), HD.kwOf({ id: 'CALL_BACK' }), HD.kwOf({ id: 'CALL_BACK', up: true })], [1, [], 1, ['Burn', 'Retain'], ['Retain']]);
  g = await fight({ hand: ['CARELESS_REED', 'PLUCK', 'PLUCK', 'HEROIC_FETCH'] }); await play(g, 'CARELESS_REED'); await play(g, 'PLUCK'); await play(g, 'PLUCK'); await play(g, 'HEROIC_FETCH');
  eq('Epic Retrieval: 3 Energy when its hit Dislodges the Arrow', [g.reeds(), g.energy], [1, 9 - 5 + 3]);
  g = await fight({ relics: ['CATGUT'], hand: ['HUP', 'CARELESS_REED', 'YANK', 'QUICK_REED', 'YANK'], draw: [] }); await play(g, 'HUP'); await play(g, 'CARELESS_REED'); await play(g, 'YANK'); await play(g, 'QUICK_REED'); await play(g, 'YANK');
  eq('Twine: 4 Block for each Dislodge; Yah!: 1 Energy for the first Dislodge each turn', [g.p.block, g.energy], [8, 9 - 2 + 1]);
  g = await fight({ hand: ['BURSTING_REEDS', 'CARELESS_REED'], two: true }); await play(g, 'BURSTING_REEDS'); await play(g, 'CARELESS_REED');
  eq('Explosive Arrows (v0.114): 8 damage to ALL enemies when you Impale', g.enemies.map(lost).slice(0, 2), [23, 8]);
  g = await fight({ hand: ['CARELESS_REED'], draw: [], discard: ['WHISTLING_REEDS'] }); await play(g, 'CARELESS_REED');
  eq('Whistling Arrows comes back from the discard pile when you Shoot', ids(g.hand), ['WHISTLING_REEDS']);
  g = await fight({ hand: ['REED_JAB'] }); await play(g, 'REED_JAB');
  eq('Arrow Stab (v0.114): costs 2, deals 13 and gains 6 Aim', [g.energy, dealt(g), g.p.pw.aim], [7, 13, 6]);
  g = await fight({ hand: ['DEAD_SET', 'DARKEN_THE_SKY'], draw: ['PLUCK', 'HEAVY_REED', 'PLUCK'] }); await play(g, 'DEAD_SET'); await play(g, 'DARKEN_THE_SKY');
  eq('Locked In fetches a Shoot card from the draw pile; Blot out the Sky adds a free one', [g.hand.length, g.hand.every((c) => HD.CARDS[c.id].tags.includes('Loose')), g.costOf(g.hand[1]) === 0 || g.costOf(g.hand[1]) === 'X', ids(g.draw)], [2, true, true, ['PLUCK', 'PLUCK']]);
  g = await fight({ hand: ['FULL_BLOOM', 'PLUCK', 'CARELESS_REED'], draw: ['QUICK_REED'] }); await play(g, 'FULL_BLOOM'); const bloom = ids(g.hand); const e1 = g.energy; await play(g, 'THE_ONE_REED');
  eq('Florescence (v0.114): a card in hand becomes The Shot, which costs 0, deals 20 and Exhausts', [bloom, e1 - g.energy, dealt(g), count(g.ash, 'THE_ONE_REED'), ids(g.draw)], [['THE_ONE_REED', 'CARELESS_REED'], 0, 20, 1, ['QUICK_REED']]);
  g = await fight({ char: 'OATHBURNER', hand: ['CARELESS_REED', 'SPARE_REED'] }); const dry = g.canPlay(g.hand[0]); await play(g, 'SPARE_REED');
  eq('other characters have no Arrow, so they cannot Shoot until Quiver gives them one', [dry, g.canPlay(g.hand[0])], [false, true]);

  // ---------- Aim and Stretch ----------
  g = await fight({ hand: ['NOTCH', 'SOL_STEADY', 'DRAW_TAUT'] }); await play(g, 'NOTCH'); await play(g, 'SOL_STEADY'); const en = g.energy; await play(g, 'DRAW_TAUT');
  eq('Nock 5 Aim, Cho Ready 7 Block and 3 Aim, Brace 8 Aim for each Energy', [g.p.block, g.p.pw.aim], [7, 5 + 3 + 8 * en]);
  g = await fight({ hand: ['LONG_REACH', 'BARK_WARD', 'BARK_WARD'], draw: [] }); await play(g, 'LONG_REACH'); await play(g, 'BARK_WARD'); const first = [g.p.block, g.p.pw.stretch]; await play(g, 'BARK_WARD');
  eq('Stretch: 7 more Block on the next card that gives Block, then it is spent', [first, g.p.block], [[12, undefined], 17]);
  g = await fight({ hand: ['LONG_REACH', 'SOL_LA'], draw: [] }); await play(g, 'LONG_REACH'); await play(g, 'SOL_LA');
  eq('Cho Ki: 8 Block (plus Stretch), and the spent Stretch comes back', [g.p.block, g.p.pw.stretch], [15, 7]);
  g = await fight({ hand: ['SOL_STAND'] }); await play(g, 'SOL_STAND'); const g3 = await fight({ hand: ['SOL_STAND'], noReed: true }); await play(g3, 'SOL_STAND');
  eq('Cho Firm: 5 Block, twice while you hold an Arrow', [g.p.block, g3.p.block], [10, 5]);
  g = await fight({ hand: ['SOL_BRISTLES'], draw: PLUCKS }); await play(g, 'SOL_BRISTLES'); const th = g.p.pw.spines; await g.endTurn();
  eq('Cho Barbs: 8 Block and 2 Thorns that last until your next turn', [th, g.p.pw.spines], [2, undefined]);
  g = await fight({ hand: ['SPRING_BACK'], draw: PLUCKS }); await play(g, 'SPRING_BACK'); await g.endTurn();
  eq('Bounce: 8 Stretch, and it returns to your hand next turn', [g.p.pw.stretch, count(g.hand, 'SPRING_BACK')], [8, 1]);

  // ---------- Melodies ----------
  g = await fight({ hand: ['FA_TAP', 'SOL_BOUGHS', 'CHORD_WALL', 'FINALE'], draw: PLUCKS }); await play(g, 'FA_TAP'); const c1 = g.costOf(g.hand.find((c) => c.id === 'SOL_BOUGHS')); await play(g, 'SOL_BOUGHS');
  const c2 = g.costOf(g.hand.find((c) => c.id === 'FINALE')); const b0 = g.p.block; await play(g, 'CHORD_WALL'); const mel = g.refrains(); const shield = g.p.block - b0; await g.endTurn();
  eq('Melodies: Cho Limbs is free with a Wah Melody, Coda costs 2 less for each, Harmonic Shield gives 4 plus 4 for each (3 Melodies by then); they end with the turn', [c1, c2, mel, shield, g.refrains()], [0, 2, 2, 4 + 4 * 2, 0]);
  g = await fight({ hand: ['FA_TAP', 'LA_LASH', 'RHYTHM_PLUCK'] }); await play(g, 'FA_TAP'); await play(g, 'LA_LASH'); const b4 = dealt(g); await play(g, 'RHYTHM_PLUCK');
  eq('Rhythm Strike hits once more for each Melody', dealt(g) - b4, Math.floor(4 * 1.5) * 3);
  g = await fight({ hand: ['SOL_STAND', 'FA_BLARE'] }); await play(g, 'SOL_STAND'); await play(g, 'FA_BLARE');
  eq('Wah Blast hits twice with a Cho or Ki Melody', dealt(g), 28);
  g = await fight({ relics: ['MAESTROS_WAND'], hand: ['CRADLE_SONG', 'FA_SOL_LA'], draw: PLUCKS }); e = g.enemies[0]; const raw = g.enemyDmg(e, 20); await play(g, 'CRADLE_SONG'); await play(g, 'FA_SOL_LA');
  eq('Wah Cho Ki starts every Melody: Lullaby gives 12 Block, Conductor\'s Baton cuts attacks by 25%', [g.refrains(), g.p.block, raw, g.enemyDmg(e, 20)], [3, 8 + 12, 20, 15]);
  g = await fight({ hand: ['THEME', 'HARSH_CHORD', 'SONG_TRAIL', 'FA_SOL'], draw: PLUCKS }); await play(g, 'THEME'); await play(g, 'HARSH_CHORD'); await play(g, 'SONG_TRAIL'); await play(g, 'FA_SOL');
  eq('Motif draws for each new Melody, Violent Chord deals 7 on Wah, Song Path gives 4 Block on Cho', [g.hand.length, dealt(g), g.p.block], [2, 7 + 3, 4 + 3]);
  g = await fight({ hand: ['LOST_LYRE', 'FA_TAP'], draw: ['PLUCK'] }); await play(g, 'LOST_LYRE'); await play(g, 'FA_TAP');
  eq('Lost Lute plays the top card of the draw pile when you gain a Melody', [dealt(g), g.draw.length], [6 + 6, 0]);
  g = await fight({ hand: ['LA_STANZA', 'FA_TAP'] }); await play(g, 'LA_STANZA'); await play(g, 'FA_TAP');
  const g5 = await fight({ hand: ['LA_STANZA', 'LA_LASH'] }); await play(g5, 'LA_STANZA'); await play(g5, 'LA_LASH');
  eq('Ki Verse (v0.114): the next Wah or Cho card is played twice; Ki cards no longer count', [dealt(g), g.enemies[0].pw.exposed, g.p.pw.kiVerse, dealt(g5), g5.p.pw.kiVerse], [6 + 9, 2, undefined, 5, 1]);
  g = await fight({ hand: ['SOL_CHOIR', 'FA_TAP', 'LA_LASH', 'PLUCK'] }); await play(g, 'SOL_CHOIR');
  eq('Cho Chorus: 14 Block (v0.114), and every Wah and Ki card in hand plays itself', [g.p.block, ids(g.hand), g.refrains()], [14, ['PLUCK'], 3]);
  g = await fight({ hand: ['IN_TUNE', 'PLUCK', 'LA_LASH', 'LA_SKIP'] }); await play(g, 'IN_TUNE'); await play(g, 'LA_LASH'); const ups = g.hand.filter((c) => c.up).length; await play(g, 'LA_SKIP');
  eq('Tune (v0.114): gaining a Ki Melody Upgrades a random card in hand (only the first Ki Melody each turn)', [ups, g.hand.filter((c) => c.up).length], [1, 1]);
  g = await fight({ hand: ['LA_PAUSE', 'PLUCK'], draw: PLUCKS }); await play(g, 'LA_PAUSE'); const kept = !!g.t.keepHand;
  const g4 = await fight({ hand: ['FA_TAP', 'LA_PAUSE', 'PLUCK'], draw: PLUCKS }); await play(g4, 'FA_TAP'); await play(g4, 'LA_PAUSE'); await g4.endTurn();
  eq('Ki Rest: 4 Energy next turn; with a Wah or Cho Melody your hand is Retained', [kept, g4.energy, g4.hand.length], [false, 3 + 4, 6]);
  g = await fight({ hand: ['FA_OPUS', 'FA_TAP', 'PLUCK'], draw: ['LA_LASH'], discard: ['SOL_STAND'] }); await play(g, 'FA_OPUS');
  eq('Wah Symphony (v0.114): 6, plus 4 for each of your Cho and Ki cards (Wah cards no longer count)', dealt(g), 6 + 4 * 2);

  // ---------- Sadness and Joy ----------
  g = await fight({ relics: ['BONE_MEAL'], hand: ['ALL_IS_FINE', 'JAPE', 'HEARTACHE'], draw: PLUCKS }); await play(g, 'ALL_IS_FINE'); await play(g, 'JAPE'); const woe = g.hand.find((c) => c.id === 'WOE'); const blk = g.p.block; await play(g, 'HEARTACHE'); await g.endTurn();
  eq('Jest adds a Sadness (Unplayable, Retain): All Is Well gives 4 Block, Fertilizer 1 Strength, Anguish deals 6 more for each', [blk, g.canPlay(woe), g.p.pw.might, dealt(g), count(g.hand, 'WOE')], [19, false, 1, 6 + 6 + 1, 1]);
  g = await fight({ hand: ['WOE', 'WOE', 'SPROUT'] }); g.hand[2].up = true; await play(g, 'SPROUT');
  eq('Growth (v0.114): 11 Block upgraded, and 1 random Sadness becomes a copy of it (upgraded too)', [g.p.block, count(g.hand, 'WOE'), g.hand.filter((c) => c.id === 'SPROUT' && c.up).length], [11, 1, 1]);
  g = await fight({ hand: ['BRIGHT_SIDE', 'WOE', 'WOE', 'PLUCK'], draw: PLUCKS }); await play(g, 'BRIGHT_SIDE');
  eq('Optimism (new in v0.114): Exhaust every Sadness in hand, draw 1 for each; Exhausts itself unless upgraded', [count(g.ash, 'WOE'), count(g.ash, 'BRIGHT_SIDE'), g.hand.length, HD.kwOf({ id: 'BRIGHT_SIDE', up: true })], [2, 1, 3, []]);
  g = await fight({ hand: ['GRIEVING_BLOW'], draw: [] }); await play(g, 'GRIEVING_BLOW');
  eq('Mourning Blow: 10 damage, then it becomes a Sadness in your hand', [dealt(g), ids(g.hand), g.discard.length, g.rs.woe], [10, ['WOE'], 0, 1]);
  g = await fight({ hand: ['WOE', 'FIST_OF_GLEE'], draw: PLUCKS }); await play(g, 'FIST_OF_GLEE'); const joy = ids(g.hand); const e0 = g.energy; await play(g, 'GLEE');
  eq('Punch of Joy turns a Sadness into Joy; Joy gives 1 Energy, draws 1 and Exhausts', [joy, g.energy - e0, ids(g.hand), count(g.ash, 'GLEE')], [['GLEE'], 1, ['PLUCK'], 1]);
  g = await fight({ hand: ['LIGHTEN_UP', 'WOEFUL_PLUCK', 'ROOT_AROUND', 'SPITE'], draw: PLUCKS }); await play(g, 'LIGHTEN_UP'); await play(g, 'WOEFUL_PLUCK'); await play(g, 'ROOT_AROUND'); await play(g, 'SPITE');
  eq('Brighten Up (2 and 2), Sorrowful Strike (1), Rummage (draw 3, 1) and Vitriol (2 Weak, 2) make Sadness', [count(g.hand, 'WOE') + count(g.discard, 'WOE'), count(g.hand, 'GLEE'), g.enemies[0].pw.sapped, g.rs.woe], [6, 2, 2, 6]);
  g = await fight({ hand: ['WOE', 'WOE', 'FIST_OF_GLEE'], draw: PLUCKS }); g.hand[2].up = true; await play(g, 'FIST_OF_GLEE');
  eq('Punch of Joy+ (v0.114): 16 damage and 2 Sadness become Joy', [dealt(g), count(g.hand, 'GLEE'), count(g.hand, 'WOE')], [16, 2, 0]);
  g = await fight({ hand: ['FA_LA'], draw: [], discard: ['FELLING'] }); await play(g, 'FA_LA');
  eq('Wah Ki (v0.114): 3 damage 2 times and a card from the discard pile goes on top of the draw pile', [dealt(g), ids(g.draw)], [6, ['FELLING']]);
  g = await fight({ hand: ['LISTLESS'], draw: PLUCKS.concat(PLUCKS) }); await play(g, 'LISTLESS'); await g.endTurn(); const t2 = [g.hand.length, count(g.hand, 'WOE')];
  g = await fight({ hand: ['LISTLESS', 'RAPTURE'], draw: PLUCKS.concat(PLUCKS) }); await play(g, 'LISTLESS'); await play(g, 'RAPTURE'); await g.endTurn();
  eq('Ennui: a Sadness and 2 more cards each turn; Ecstasy turns one Sadness into Joy each turn', [t2, g.hand.length, count(g.hand, 'WOE'), count(g.hand, 'GLEE')], [[8, 1], 8, 0, 1]);

  // ---------- other rares ----------
  g = await fight({ hand: ['ONE_MORE_SONG', 'PLUCK', 'PLUCK'], draw: PLUCKS }); await play(g, 'ONE_MORE_SONG'); const en2 = g.energy; const ok1 = await play(g, 'PLUCK');
  eq('Encore: 1 Energy, draw 2, then only 1 more card this turn', [en2, g.hand.length + 1, ok1, g.hand.some((c) => g.canPlay(c))], [10, 4, true, false]);
  g = await fight({ hand: ['DULLARD', 'FELLING', 'FA_SOL', 'PLUCK'], draw: PLUCKS }); await play(g, 'DULLARD'); await g.endTurn();
  eq('Simpleton plays the cheapest card in hand at the end of the turn', [dealt(g), count(g.discard, 'FA_SOL'), count(g.discard, 'FELLING')], [3, 1, 1]);
  g = await fight({ hand: ['DULLARD', 'FELLING', 'FA_SOL', 'PLUCK'], draw: PLUCKS }); g.hand[0].up = true; await play(g, 'DULLARD'); await g.endTurn();
  eq('Simpleton+ (v0.114) plays the 2 cheapest cards', dealt(g), 3 + 6);
  g = await fight({ deck: ['FLAUNT'] }); const fl = [...g.hand, ...g.draw].find((c) => c.id === 'FLAUNT'); g.draw = g.draw.filter((c) => c !== fl); g.hand = [fl, g.makeCard('PLUCK', false)]; delete g.p.pw.aim;
  await play(g, 'FLAUNT'); const aim = g.p.pw.aim; g.enemies[0].hp = 3; await play(g, 'PLUCK');
  eq('Show Off: 5 Aim; a kill this turn makes the deck card give 2 more for good', [aim, fl.src.grow, /Gain 7 Sight/.test(HD.CARDS.FLAUNT.text(HD.vals(fl.src), { d: String, b: String }, fl.src, null))], [5, 2, true]);
  g = await fight({ hand: ['FELLING'], two: true }); g.enemies[0].hp = 10; await play(g, 'FELLING');
  eq('Timber: a kill deals 30 to ALL enemies', lost(g.enemies[1]), 30);
  g = await fight({ hand: ['SINGING_REED', 'FA_TAP', 'SKYWARD_REED', 'HALLOWED_REED'] }); await play(g, 'FA_TAP'); await play(g, 'SINGING_REED');
  eq('Melodic Shot hits once more for each Melody; Sky Shot is Innate and Exhausts; Divine Shot is Retained', [dealt(g), HD.kwOf({ id: 'SKYWARD_REED' }), HD.kwOf({ id: 'HALLOWED_REED' })], [6 + Math.floor(12 * 1.5) * 2, ['Burn', 'Opening'], ['Retain']]);

  // ---------- the Tarot cards ----------
  g = await fight({ hand: ['FABLED_FORM'], draw: PLUCKS.concat(PLUCKS) }); await play(g, 'FABLED_FORM'); await g.endTurn();
  const omens = Object.values(HD.CARDS).filter((d) => d.tags.includes('Omen')).map((d) => d.id);
  eq('Mythic Form deals a random Tarot card each turn; there are 22; Ethereal until upgraded (v0.114)', [g.hand.filter((c) => omens.includes(c.id)).length, omens.length, HD.kwOf({ id: 'FABLED_FORM' }), HD.kwOf({ id: 'FABLED_FORM', up: true })], [1, 22, ['Fleeting'], []]);
  let clean = 0;
  for (const id of omens) for (const up of [false, true]) {
    g = await fight({ hand: [id, 'PLUCK', 'WOE', 'BARK_WARD'], draw: PLUCKS, discard: PLUCKS, two: true }); g.hand[0].up = up;
    try { await play(g, id); HD.CARDS[id].text(HD.vals({ id, up }), { d: String, b: String }, { id, up }, null); clean++; } catch (err) { console.log('     ', id, up, err.message); }
  }
  eq('every Tarot card plays, plain and upgraded', clean, 44);
  g = await fight({ hand: ['THE_RECKONING', 'THE_RECKONING'], two: true }); g.enemies[0].hp = 31; await play(g, 'THE_RECKONING'); const alive = g.enemies[0].alive; g.enemies[0].hp = 30; await play(g, 'THE_RECKONING');
  eq('Judgement: an enemy at 30 HP or less dies', [alive, g.enemies[0].alive], [true, false]);
  g = await fight({ hand: ['THE_LION', 'THE_VESSEL', 'THE_THRONE', 'THE_HANGED_ONE', 'THE_RUIN', 'THE_REAPER', 'THE_GARDEN'], floor: 7 }); e = g.enemies[0];
  for (const id of ['THE_LION', 'THE_VESSEL', 'THE_THRONE', 'THE_HANGED_ONE', 'THE_REAPER', 'THE_GARDEN']) await play(g, id); const hp = g.p.hp; await play(g, 'THE_RUIN');
  eq('Strength 4, Temperance 20 Block, The Emperor 3 Energy, The Hanged Man 6 HP for an extra turn, Death 66 Doom, The Empress 3 and 3, The Tower 1 for each floor (v0.114)',
    [g.p.pw.might, g.p.block, g.energy, 77 - hp, g.p.pw.extraTurn, e.pw.doom, e.pw.sapped, e.pw.exposed, dealt(g)], [4, 20, 12, 6, 1, 66, 3, 3, Math.floor((7 + 4) * 1.5)]);
  g = await fight({ hand: ['THE_DAYSTAR', 'THE_KEEPER_OF_KEYS', 'THE_LANTERN', 'PLUCK'], draw: PLUCKS }); await play(g, 'THE_DAYSTAR'); const soot = [count(g.draw, 'ASHFALL'), count(g.discard, 'ASHFALL')];
  await play(g, 'THE_KEEPER_OF_KEYS'); const keys = g.hand.slice(-3).every((c) => c.costTurn == null); const h0 = g.hand.length; await play(g, 'THE_LANTERN');
  eq('The Sun puts 2 Soot in the draw pile, The Hierophant no longer cuts costs, The Hermit draws 3 (v0.114)', [soot, keys, g.hand.length - h0], [[2, 0], true, -2 + 3]);
  g = await fight({ hand: ['THE_PALE_MOON'], draw: [] }); await play(g, 'THE_PALE_MOON'); const sl = count(g.hand, 'SLIVER');
  g = await fight({ hand: ['THE_CONJURER'], draw: [] }); await play(g, 'THE_CONJURER'); const orbs = [g.orbSlots, g.orbs.length];
  g = await fight({ hand: ['THE_PAIR'], draw: [] }); await play(g, 'THE_PAIR'); const pair = [g.hand.length, g.hand.some((c) => HD.CARDS[c.id].color === 'minstrel')];
  eq('The Moon fills the hand with Shivs, The Magician gives 3 Orb Slots and 3 Orbs, The Lovers fills it with other characters\' cards', [sl, orbs, pair], [10, [3, 3], [10, false]]);

  // ---------- relics, potions, Ancients ----------
  g = await fight({ relics: ['WOVEN_MAT', 'WHITTLERS_KNIFE'], keep: true }); const st = [g.p.pw.aim, g.p.pw.stretch]; g.discard = g.draw.splice(0); await g.reshuffle();
  eq('Exercise Mat: 6 Stretch at the start; Whittling Knife: 5 Aim on a shuffle', [st, g.p.pw.aim], [[6, 6], 11]);
  g = await fight({ noStarter: true, relics: ['TALESPINNER'], keep: true }); const a0 = g.p.pw.aim; await g.endTurn();
  eq('Storyteller: 12 Aim at the start, 3 more at the end of each turn', [a0, g.p.pw.aim], [12, 15]);
  g = await fight({ relics: ['CLAY_WHISTLE', 'STRANGE_LANTERN'], hand: [], draw: [] }); await g.rh('firstHand');
  eq('Ocarina adds a Wah, Cho or Ki card; Bizarre Lamp adds a Joy and a Sadness', [g.hand.length, g.hand.filter((c) => ['Fa', 'Sol', 'La'].some((k) => HD.CARDS[c.id].tags.includes(k))).length, count(g.hand, 'GLEE'), count(g.hand, 'WOE')], [3, 1, 1, 1]);
  g = await fight({ hand: [], draw: [] }); await HD.POTIONS.MARKSMANS_DRAUGHT.use(g); await HD.POTIONS.BOTTLED_TUNE.use(g); const tune = [g.hand.length, g.hand.every((c) => c.freeTurn)]; await HD.POTIONS.CRYSTAL_BLISS.use(g);
  eq('Precision Potion 21 Aim; Bottled Song 3 free cards; Crystalline Euphoria 3 Joy and a hand full of Sadness', [g.p.pw.aim, tune, g.hand.length, count(g.hand, 'GLEE'), count(g.hand, 'WOE')], [21, [3, true], 10, 3, 4]);
  const ra = new HD.Run('anc', 'MINSTREL'); ra.addRelic('OLD_TOOTH'); ra.addRelic('ELDER_TOUCH');
  eq('Archaic Tooth: Foolish Shot becomes Divine Shot; Touch of Orobas: Storyteller', [ra.deck.some((c) => c.id === 'HALLOWED_REED'), ra.hasRelic('TALESPINNER')], [true, true]);
  const pg = new HD.Run('prism', 'OATHBURNER'); pg.addRelic('PRISM_GLASS');
  eq('other characters are not offered Fool cards (they stay on v0.111)', pg.pending.flatMap((x) => x.cards || []).some((c) => HD.CARDS[c.id].color === 'minstrel'), false);

  // ---------- every card ----------
  let played = 0; const mine = Object.values(HD.CARDS).filter((d) => d.color === 'minstrel' && !d.coop);
  for (const d of mine) for (const up of [false, true]) {
    g = await fight({ hand: [d.id, 'WOE', 'PLUCK', 'QUICK_REED'], draw: PLUCKS, discard: ['HEAVY_REED', 'PLUCK'], two: true }); g.hand[0].up = up;
    try {
      const inFight = d.text(HD.vals(g.hand[0]), { d: String, b: String }, g.hand[0], g), inDeck = d.text(HD.vals({ id: d.id, up }), { d: String, b: String }, { id: d.id, up }, null);
      if (typeof inFight !== 'string' || typeof inDeck !== 'string' || /undefined|NaN/.test(inFight + inDeck)) throw new Error(`bad text: ${inFight} / ${inDeck}`);
      await g.playCard(g.hand[0], d.target === 'enemy' ? g.enemies[0] : null); await g.endTurn(); played++;
    } catch (err) { console.log('     ', d.id, up, err.message); }
  }
  eq('all 85 solo Fool cards show their text and play, plain and upgraded (v0.114: Twin Shot replaced Rapid Shot, Optimism is new)', [mine.length, played], [85, 170]);

  console.log(fails ? `${fails} of ${n} FAILED` : `all ${n} Fool checks passed`);
  process.exitCode = fails ? 1 : 0;
})();

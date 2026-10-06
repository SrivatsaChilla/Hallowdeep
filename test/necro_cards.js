// Behavior checks for the Necrobinder: Clutch (Osty: Rouse, taking hits, attacking, falling), Knell (Doom), Wraiths
// (Souls) and her cards, relics and potions.  Usage: node test/necro_cards.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console, Math, Promise, setTimeout });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'neow2', 'ascension_data', 'ascension'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx);
const HD = ctx.HD; HD.setVersion('0.111');
let fails = 0, n = 0;
const eq = (name, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
const ui = { choose: async (g, o) => o.from.slice(0, o.n) };
async function fight(o = {}) {
  const r = new HD.Run('nc', o.char || 'UNBURIED');
  if (o.noStarter) r.relics = [];
  for (const id of o.relics || []) r.addRelic(id);
  r.pending.length = 0;
  const g = new HD.Combat(r, o.enc || 'RIPJAW', ui, 'monster'); await g.start();
  for (const e of g.enemies) { e.hp = e.maxHp = 500; e.block = 0; }
  g.energy = 9; g.p.block = 0; if (!o.keepOsty) g.osty = null;
  g.hand = (o.hand || []).map((id) => g.makeCard(id, false)); g.draw = (o.draw || []).map((id) => g.makeCard(id, false)); g.discard = [];
  g.enemyTurn = async () => {};
  return g;
}
const dealt = (g) => g.enemies.reduce((a, e) => a + 500 - e.hp, 0);
const play = async (g, id, t) => { const c = g.hand.find((x) => x.id === id); await g.playCard(c, t === undefined && HD.CARDS[id].target === 'enemy' ? g.enemies[0] : t || null); };
const osty = (g) => (g.osty && g.osty.alive ? [g.osty.hp, g.osty.maxHp] : 'down');

(async () => {
  let g = await fight({ keepOsty: true });
  eq('The Unburied: 66 HP; Bound Phylactery Summons 1 at the start of the first turn', [g.run.maxHp, osty(g)], [66, [1, 1]]);

  // ---------- Clutch (Osty) ----------
  g = await fight({ hand: ['HAND_UP', 'HAND_UP'] }); await play(g, 'HAND_UP');
  const first = osty(g); await play(g, 'HAND_UP');
  eq('Summon 5 brings Osty in at 5; a second Summon raises Max HP and HP (10/10)', [first, osty(g)], [[5, 5], [10, 10]]);
  g = await fight(); await g.summon(5); g.p.block = 3; await g.damage(g.p, 12, { attack: true, src: g.enemies[0] });
  eq('Enemy attack: Block first, then Osty takes the rest (5), overflow hits you (4)', [g.p.hp, osty(g)], [g.p.maxHp - 4, 'down']);
  g = await fight(); await g.summon(5); await g.damage(g.p, 3, {});
  eq('Non-attack damage skips Osty', [g.p.hp, osty(g)], [g.p.maxHp - 3, [5, 5]]);
  g = await fight({ hand: ['PROD'] }); g.addPw(g.p, 'might', 5); g.addPw(g.p, 'sapped', 2); await g.summon(3); await play(g, 'PROD');
  eq('Osty attacks ignore your Strength and Weak (Poke 6)', dealt(g), 6);
  g = await fight({ hand: ['PROD'] }); await play(g, 'PROD');
  eq('Osty attacks do nothing while he is down', dealt(g), 0);
  g = await fight({ hand: ['PROD'] }); await g.summon(3); await g.apply(g.enemies[0], 'exposed', 2); await play(g, 'PROD');
  eq('Osty attacks are boosted by Vulnerable (6 x 1.5)', dealt(g), 9);
  g = await fight({ hand: ['LET_LOOSE'] }); await g.summon(7); await play(g, 'LET_LOOSE');
  eq('Unleash: 6 plus Osty current HP (7)', dealt(g), 13);
  g = await fight({ hand: ['HARDEN', 'PROD'] }); await g.summon(3); await play(g, 'HARDEN'); await play(g, 'PROD');
  eq('Calcify: Osty attacks deal 4 more', dealt(g), 10);
  g = await fight({ hand: ['PROD', 'CLATTER', 'SQUASH'] }); await g.summon(3); const sq = g.hand.find((c) => c.id === 'SQUASH'); const costBefore = g.costOf(sq);
  await play(g, 'PROD'); const costAfter = g.costOf(sq); await play(g, 'CLATTER');
  eq('Flatten costs 0 once Osty attacked; Rattle hits once more per earlier Osty attack (6 + 7 x 2)', [costBefore, costAfter, dealt(g)], [2, 0, 20]);
  g = await fight({ hand: ['BONE_BURST'], enc: 'BANDITS' }); await g.summon(4); await play(g, 'BONE_BURST');
  eq('Bone Shards: Osty hits ALL for 9, you gain 9 Block, Osty dies', [dealt(g), g.p.block, osty(g)], [9 * g.enemies.length, 9, 'down']);
  g = await fight({ hand: ['OFFERING'] }); await g.summon(6); await play(g, 'OFFERING');
  eq('Sacrifice: Osty dies, you gain triple his Max HP as Block', [osty(g), g.p.block], ['down', 18]);
  g = await fight({ hand: ['URGE_ON'] }); await g.summon(10); g.osty.hp = 4; await play(g, 'URGE_ON');
  eq('Spur: Summon 3 (13 max, 7 HP), then Osty heals 5 (12)', osty(g), [12, 13]);
  g = await fight({ hand: ['GO_GET_EM', 'PROD'] }); await g.summon(3); await play(g, 'GO_GET_EM'); await play(g, 'PROD');
  eq("Sic 'Em: each later Osty hit on that enemy Summons 3", osty(g), [6, 6]);
  g = await fight({ hand: ['BONE_MASTERY'], enc: 'BANDITS' }); await play(g, 'BONE_MASTERY'); await g.damage(g.p, 3, { attack: true, src: g.enemies[0] });
  eq('Necro Mastery: Osty losing 3 HP makes ALL enemies lose 3', dealt(g), 3 * g.enemies.length);
  g = await fight({ hand: ['CRUSH_GRIP', 'PROD', 'FLICK'], draw: ['PROD'] }); await g.summon(1); await play(g, 'CRUSH_GRIP');
  eq('Squeeze: 25 plus 5 per other Osty Attack (3)', dealt(g), 40);

  // ---------- Knell (Doom) ----------
  g = await fight({ hand: ['DEATH_MARK'] }); g.enemies[0].hp = 13; await play(g, 'DEATH_MARK');
  const alive = g.enemies[0].alive; delete g.enemyTurn; g.enemies[0].intent = 'STUN'; g.enemies[0].forceIntent = 'STUN'; g.hand = []; await g.endTurn();
  eq('Doom 13 on a 13 HP enemy: it dies at the end of its turn, not before', [alive, g.enemies[0].alive], [true, false]);
  g = await fight({ hand: ['DEATH_MARK'] }); await g.apply(g.enemies[0], 'ward', 1); await play(g, 'DEATH_MARK');
  eq('Artifact blocks a Doom application', g.enemies[0].pw.doom || 0, 0);
  g = await fight({ hand: ['ROT_RAKE'] }); await play(g, 'ROT_RAKE');
  eq('Blight Strike: Doom equal to damage dealt', g.enemies[0].pw.doom, 8);
  g = await fight({ hand: ['INESCAPABLE'] }); g.enemies[0].pw.doom = 25; await play(g, 'INESCAPABLE');
  eq('No Escape: 10 + 5 per 10 Doom already there (2) = 20 more', g.enemies[0].pw.doom, 45);
  g = await fight({ hand: ['HOUR_STRUCK'] }); g.enemies[0].pw.doom = 30; await play(g, 'HOUR_STRUCK');
  eq("Time's Up: damage equal to the enemy's Doom", dealt(g), 30);
  g = await fight({ hand: ['LAST_DAYS'], enc: 'BANDITS' }); g.enemies[0].hp = 20; await play(g, 'LAST_DAYS');
  eq('End of Days: 29 Doom to ALL, kills at once those with Doom >= HP', [g.enemies[0].alive, g.enemies.slice(1).every((e) => e.alive && e.pw.doom === 29)], [false, true]);
  g = await fight({ hand: ['PALL', 'DEATH_PULSE'], enc: 'BANDITS' }); await play(g, 'PALL'); await play(g, 'DEATH_PULSE');
  eq('Shroud: 3 Block per Doom application (one per enemy) plus Negative Pulse 5', g.p.block, 5 + 3 * g.enemies.length);
  g = await fight({ hand: ['DEATH_MARK', 'LAST_BREATH'] }); await play(g, 'DEATH_MARK'); await play(g, 'LAST_BREATH');
  eq("Death's Door: after applying Doom, Block 3 times (6 x 3)", g.p.block, 18);
  g = await fight({ hand: ['GRIM_FORM', 'RAKE'] }); await play(g, 'GRIM_FORM'); await play(g, 'RAKE');
  eq('Reaper Form: attack damage applies that much Doom', g.enemies[0].pw.doom, 6);
  g = await fight({ hand: ['FLESH_TRICK', 'DECOMPOSE'] }); await play(g, 'FLESH_TRICK'); await play(g, 'DECOMPOSE');
  eq('Sleight of Flesh: 9 damage per debuff applied (Weak, Vulnerable)', dealt(g), 18);
  g = await fight({ hand: ['FORGETTING', 'RAKE', 'BONE_WARD'] }); await play(g, 'FORGETTING'); await play(g, 'RAKE'); await play(g, 'BONE_WARD');
  eq('Oblivion: every later card this turn adds 3 Doom', g.enemies[0].pw.doom, 6);
  g = await fight({ hand: ['MIND_SURGE'] }); await play(g, 'MIND_SURGE'); g.hand = []; await g.endTurn(); g.p.hp = 3; g.hand = []; await g.endTurn();
  eq('Neurosurge: 3 Doom on you each turn start; it kills you at the end of your turn once HP <= Doom', [g.p.pw.doom, g.over, g.won], [3, true, false]);
  g = await fight({ relics: ['DEATHLESS_SEAL'] }); const e0 = g.enemies[0]; e0.pw.doom = 600; const d0 = g.enemyDmg(e0, 10);
  eq('Undying Sigil: enemies with Doom >= HP deal half damage', d0, 5);

  // ---------- Wraiths (Souls) ----------
  g = await fight({ hand: ['HAUNTING', 'FEED_ON_LIFE'], draw: ['RAKE', 'RAKE', 'RAKE'] }); await play(g, 'HAUNTING'); await play(g, 'FEED_ON_LIFE'); await g.addWraiths(1, 'hand'); await play(g, 'WRAITH');
  eq('Soul: draws 2; Haunt 7 HP to a random enemy; Devour Life Summons 1', [g.hand.length, dealt(g), osty(g)], [2, 7, [1, 1]]);
  g = await fight({ hand: ['SEVER_TIES'] }); await play(g, 'SEVER_TIES');
  eq('Severance: a Soul in draw pile, hand and discard pile', [g.draw, g.hand, g.discard].map((p) => p.filter((c) => c.id === 'WRAITH').length), [1, 1, 1]);
  g = await fight({ hand: ['WRAITH_STORM'] }); g.ash = ['WRAITH', 'WRAITH'].map((id) => g.makeCard(id, false)); await play(g, 'WRAITH_STORM');
  eq('Soul Storm: 9 plus 4 per Soul in the Exhaust pile', dealt(g), 17);

  // ---------- Ethereal ----------
  g = await fight({ hand: ['VEILCUTTER', 'DESECRATE', 'DESECRATE', 'ASH_SPIRIT'] }); await play(g, 'ASH_SPIRIT'); await play(g, 'VEILCUTTER'); const e1 = g.energy; await play(g, 'DESECRATE'); const e2 = g.energy; await play(g, 'DESECRATE');
  eq('Veilpiercer: next Ethereal card is free; Spirit of Ash 4 Block per Ethereal card', [e1 - e2, e2 - g.energy, g.p.block], [0, 1, 8]);
  g = await fight({ hand: ['DRAG_UNDER', 'HOWL_OF_THE_DEAD'] }); g.rs.fleetingPlayed = 3; const howl = g.hand.find((c) => c.id === 'HOWL_OF_THE_DEAD'); await play(g, 'DRAG_UNDER');
  eq("Pull From Below: 5 per Ethereal played (3); Banshee's Cry costs 2 less per Ethereal played (9 - 6)", [dealt(g), g.costOf(howl)], [15, 3]);
  g = await fight({ hand: ['SPECTRAL_HOST'] }); g.ash = ['DESECRATE', 'RAKE'].map((id) => g.makeCard(id, false)); await play(g, 'SPECTRAL_HOST');
  eq('Eidolon: plays every Ethereal card in the Exhaust pile', [dealt(g), g.ash.some((c) => c.id === 'RAKE')], [13, true]);

  // ---------- other cards ----------
  g = await fight({ hand: ['GALLOWS', 'GALLOWS'] }); await play(g, 'GALLOWS'); await play(g, 'GALLOWS');
  eq('Hang: the second Hang deals double to the same enemy (10 + 20)', dealt(g), 30);
  g = await fight({ hand: ['STOLEN_HOURS', 'RAKE'] }); await play(g, 'STOLEN_HOURS'); const rk = g.hand[0];
  eq('Borrowed Time: +4 Energy, cards cost 1 more this turn', [g.energy, g.costOf(rk)], [12, 2]);
  g = await fight({ hand: ['FUNERAL_MARCH'], draw: ['RAKE', 'RAKE'] }); g.t.cardsDrawn = 0; await g.drawCards(2); await play(g, 'FUNERAL_MARCH');
  eq('Death March: 8 plus 4 per card drawn during your turn (2)', dealt(g), 16);
  g = await fight({ hand: ['WRETCHEDNESS'], enc: 'BANDITS' }); await g.apply(g.enemies[0], 'sapped', 2); await play(g, 'WRETCHEDNESS');
  eq('Misery: the enemy debuffs spread to ALL others', g.enemies.slice(1).every((e) => e.pw.sapped === 2), true);
  g = await fight({ hand: ['THE_SICKLE'] }); g.hand[0].src = g.run.deck[0]; await play(g, 'THE_SICKLE');
  eq('The Scythe: the deck card permanently deals 5 more', [dealt(g), g.run.deck[0].grow, HD.vals({ id: 'THE_SICKLE', grow: 5 }).dmg], [13, 5, 18]);
  g = await fight({ hand: ['SORROW', 'RAKE'] }); const so = g.hand[0]; await g.summon(1); await g.killOsty(); await g.kill(g.enemies[0]);
  eq('Melancholy: costs 1 less whenever anyone dies (Osty, an enemy)', g.costOf(so), 1);
  g = await fight({ hand: ['OTHER_HAND', 'ENTOMB'] }); await g.summon(2); await play(g, 'OTHER_HAND'); await play(g, 'ENTOMB');
  eq('Right Hand Hand: returns from discard when you play a 2+ cost card', g.hand.some((c) => c.id === 'OTHER_HAND'), true);
  g = await fight({ hand: ['RETRIEVE', 'RETRIEVE'], draw: ['RAKE', 'RAKE'] }); await g.summon(2); const rt = g.hand[0]; await play(g, 'RETRIEVE'); g.discard.splice(g.discard.indexOf(rt), 1); g.hand.push(rt); await g.playCard(rt, g.enemies[0]);
  eq('Fetch: draws only the first time that card is played each turn', g.hand.filter((c) => c.id === 'RAKE').length, 1);
  g = await fight({ hand: ['BANNED_TOME'] }); await play(g, 'BANNED_TOME'); for (const e of g.enemies) await g.kill(e);
  eq('Forbidden Grimoire: an optional card removal after combat', g.run.pending.filter((p) => p.kind === 'remove' && p.optional).length, 1);

  // ---------- relics and potions ----------
  g = await fight({ hand: ['PROD'], relics: ['BONE_WHISTLE'] }); await g.summon(2); await play(g, 'PROD');
  eq('Bone Flute: 2 Block whenever Osty attacks', g.p.block, 2);
  g = await fight({ relics: ['BINDING_KNIFE'] }); g.p.hp = 30; g.enemies[0].hp = 5; g.enemies[0].pw.doom = 5; await g.doomKill(g.enemies[0]);
  eq('Book Repair Knife: heal 3 when an enemy dies to Doom', g.p.hp, 33);
  g = await fight({ hand: ['ENTOMB'], relics: ['BONE_TILE'] }); await play(g, 'ENTOMB');
  eq('Ivory Tile: a 3+ cost card refunds 1 Energy (4 - 1)', g.energy, 6);
  g = await fight({ noStarter: true, relics: ['OPEN_URN'], keepOsty: true }); g.osty = null; await g.rh('battleStart'); await g.rh('turnStart');
  eq('Phylactery Unbound: Summon 5 at combat start, 2 each turn', osty(g), [7, 7]);
  g = await fight(); await HD.POTIONS.MARROW_BREW.use(g); await HD.POTIONS.JAR_OF_WRAITHS.use(g); await HD.POTIONS.KNELL_DRAUGHT.use(g, g.enemies[0]);
  eq('Bone Brew, Pot of Ghouls, Potion of Doom', [osty(g), g.hand.filter((c) => c.id === 'WRAITH').length, g.enemies[0].pw.doom], [[15, 15], 2, 33]);
  const ra = new HD.Run('anc', 'UNBURIED'); ra.addRelic('OLD_TOOTH'); ra.addRelic('ELDER_TOUCH');
  eq('Archaic Tooth: Unleash becomes Protector; Touch of Orobas: Phylactery Unbound', [ra.deck.some((c) => c.id === 'GUARDIAN_HAND'), ra.hasRelic('OPEN_URN')], [true, true]);

  console.log(fails ? `${fails} of ${n} FAILED` : `all ${n} Necrobinder checks passed`);
  process.exitCode = fails ? 1 : 0;
})();

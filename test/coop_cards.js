// The 37 co-op only cards, each played in a small party, plus co-op card pools and potions thrown to an ally.
// Usage: node test/coop_cards.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ctx = vm.createContext({ console, setTimeout, Math, Promise });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro', 'coop', 'neow2', 'ascension_data', 'ascension']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
const HD = ctx.HD;
HD.setVersion();
let fails = 0, n = 0;
const eq = (name, a, b) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)); } else console.log('ok  ', name); };

// A started fight for the given characters against one sturdy enemy that only does what a test tells it to.
async function party(chars) {
  const runs = chars.map((ch, i) => new HD.Run(`coop${i}`, ch));
  const g = new HD.Combat(runs[0], 'RIPJAW', HD.autoUI, 'monster');
  for (const r of runs.slice(1)) g.addSeat(r);
  await g.start();
  const e = g.enemies[0];
  e.hp = e.maxHp = 5000; e.block = 0; e.pw = {};
  e.def = Object.assign({}, e.def, { moves: Object.assign({}, e.def.moves, { HIT: { name: 'Hit', atk: 10 } }) });
  for (const s of g.seats) { s.energy = 20; s.p.block = 0; s.p.pw = {}; s.p.hp = s.p.maxHp; }
  return { g, e, a: g.seats[0], b: g.seats[1] };
}
// Put a card in a player's hand and play it through the action queue, at an enemy or at another player.
async function play(g, s, id, o = {}) {
  const c = g.makeCard(id, !!o.up);
  s.hand.push(c);
  await g.act(s.index, { k: 'play', card: c.uid, target: o.at ? o.at.uid : undefined, ally: o.ally ? o.ally.index : undefined });
  return c;
}
const ids = (pile) => pile.map((c) => c.id);
const count = (pile, id) => pile.filter((c) => c.id === id).length;

(async () => {
  const OB = 'OATHBURNER';
  // ---------- pools and targeting ----------
  {
    const r = new HD.Run('pool', 'VEILED');
    const solo = r.pool().filter((d) => d.coop).length;
    r.party = 2;
    eq('co-op cards join the pools only in a party', [solo, r.pool().filter((d) => d.coop).map((d) => d.id).sort(), r.pool('colorless').filter((d) => d.coop).length], [0, ['BREW_SHARE', 'FADE_OUT', 'FLANK_HELP', 'KNIFE_CHORUS', 'LURK'], 12]);
    eq('all 37 co-op cards are built', Object.values(HD.CARDS).filter((d) => d.coop && !/^Co-op only/.test(d.text({}, { d: String, b: String }, {}, null))).length, 37);
    const { g, a } = await party([OB]);
    const c = g.makeCard('BOOST', false); a.hand.push(c);
    eq('an ally card cannot be played alone', g.canPlay(c), false);
  }
  // ---------- the Oathburner ----------
  { const { g, a, b } = await party([OB, OB]); await play(g, a, 'KINDLE_ALLY', { ally: b }); eq('Kindle Ally: another player gains 5 Might', [b.p.pw.might, a.p.pw.might || 0], [5, 0]); }
  { const { g, a, b } = await party([OB, OB]); a.p.block = 10; const hp = a.p.hp; await play(g, a, 'SHARED_SCAR', { ally: b }); eq('Shared Scar: lose 1 HP, give your Guard', [hp - a.p.hp, b.p.block], [1, 10]); }
  { const { g, a, b } = await party([OB, OB]); a.burnedCount = 3; b.burnedCount = 5; const c = g.makeCard('DEEP_NIGHT', false); a.hand.push(c); eq('Deep Night: cheaper for cards anyone Burned', g.asSeat(a, () => g.costOf(c)), 4); }
  { const { g, e, a, b } = await party([OB, OB, OB]); await play(g, a, 'SPREADING_RAGE', { at: e }); eq('Spreading Rage: a copy in every discard pile', g.seats.map((s) => count(s.discard, 'SPREADING_RAGE')), [2, 1, 1]); }
  { const { g, e, a, b } = await party([OB, OB, OB]); await play(g, a, 'TAKE_THE_HITS'); eq('Take the Hits: you take 50% more, others 50% less', g.seats.map((s) => g.asSeat(s, () => g.enemyDmg(e, 10))), [15, 5, 5]); }
  // ---------- the Veiled ----------
  { const { g, a } = await party(['VEILED', OB]); const before = g.seats.map((s) => count(s.hand, 'SLIVER')); await play(g, a, 'KNIFE_CHORUS'); eq('Knife Chorus: 2 Slivers for every player', g.seats.map((s, i) => count(s.hand, 'SLIVER') - before[i]), [2, 2]); }
  {
    const { g, e, a, b } = await party(['VEILED', OB]); await play(g, a, 'BREW_SHARE', { ally: b }); await play(g, b, 'CUT', { at: e });
    eq('Shared Brew: the ally\'s unblocked Attack applies 3 Toxin', [e.pw.toxin, a.p.pw.concoct || 0], [3, 0]);
    await g.act(0, { k: 'end' }); await g.act(1, { k: 'end' });
    eq('Shared Brew ends with their turn', b.p.pw.concoct || 0, 0);
  }
  { const { g, a, b } = await party(['VEILED', OB]); await play(g, a, 'FADE_OUT', { ally: b }); eq('Fade Out: another player gains 6 Poise this turn', b.p.pw.poiseTemp, 6); }
  { const { g, e, a, b } = await party(['VEILED', OB]); await play(g, a, 'LURK'); const blk = a.p.block; await play(g, b, 'CUT', { at: e }); await play(g, b, 'CUT', { at: e }); eq('Lurk: Guard whenever another player attacks', a.p.block - blk, 2); }
  {
    const { g, e, a, b } = await party(['VEILED', OB]); await play(g, a, 'FLANK_HELP', { at: e });
    eq('Flank: double attack damage from the other players only', [g.asSeat(b, () => g.atkDmg(10, e, null)), g.asSeat(a, () => g.atkDmg(10, e, null))], [20, 10]);
    await g.act(0, { k: 'end' }); await g.act(1, { k: 'end' });
    eq('Flank lasts until the next round', [e.pw.flanked || 0, g.asSeat(b, () => g.atkDmg(10, e, null))], [0, 10]);
  }
  // ---------- the Crowned ----------
  {
    const { g, a, b } = await party(['CROWNED', OB]); a.stars = 5; const hand = b.hand.length, en = b.energy;
    await play(g, a, 'SKY_CHART', { ally: b });
    eq('Sky Chart: costs 2 Glint; the ally draws 1, gains 1 Energy and 9 Guard', [a.stars, b.hand.length - hand, b.energy - en, b.p.block], [3, 1, 1, 9]);
  }
  { const { g, a, b } = await party(['CROWNED', OB]); await play(g, a, 'SHARED_ANVIL'); await g.withSeat(a, () => g.forge(4)); eq('Shared Anvil: when you Temper, the others Temper too', g.asSeat(b, () => g.blades().map((x) => x.forged)), [4]); }
  { const { g, a, b } = await party(['CROWNED', OB]); const hand = b.hand.length; await play(g, a, 'ROYAL_GIFT', { ally: b, up: true }); const got = b.hand[b.hand.length - 1]; eq('Royal Gift: an upgraded colorless card for the ally', [b.hand.length - hand, HD.CARDS[got.id].color, got.up], [1, 'colorless', true]); }
  { const { g, a } = await party(['CROWNED', OB, OB]); await play(g, a, 'WAR_COUNCIL'); eq('War Council: every player draws 2 more next turn', g.seats.map((s) => s.p.pw.nextDraw), [2, 2, 2]); }
  { const { g, a, b } = await party(['CROWNED', OB]); const [h, d] = [b.hand.length, b.draw.length]; await play(g, a, 'COUNSEL', { ally: b }); eq('Counsel: the ally moves a card from their draw pile to their hand', [b.hand.length - h, d - b.draw.length], [1, 1]); }
  // ---------- the Unburied ----------
  { const { g, e, a, b } = await party(['UNBURIED', OB]); await play(g, a, 'DIN'); a.p.dinCount = 32; const hp = e.hp; await g.withSeat(b, () => g.drawCards(1)); eq('Din: the 33rd card anyone draws deals 66', hp - e.hp, 66); }
  { const { g, a } = await party(['UNBURIED', OB]); await play(g, a, 'PEEK_BEYOND'); eq('Peek Beyond: 3 Wraiths in every draw pile', g.seats.map((s) => count(s.draw, 'WRAITH')), [3, 3]); }
  { const { g, a } = await party(['UNBURIED', OB]); a.osty = null; await play(g, a, 'BONE_LEGION'); eq('Bone Legion: every player Rouses 6', g.seats.map((s) => s.osty && s.osty.hp), [6, 6]); }
  {
    const { g, a, b } = await party(['UNBURIED', 'UNBURIED']); await play(g, a, 'WRAITHBOUND', { ally: b }); await play(g, b, 'WRAITHBOUND', { ally: a });
    await g.withSeat(a, () => g.addWraiths(1, 'draw'));
    eq('Wraithbound: your Wraiths give the bound player one, and it does not bounce back', [count(a.draw, 'WRAITH'), count(b.draw, 'WRAITH')], [1, 1]);
  }
  { const { g, e, a, b } = await party(['UNBURIED', OB]); await play(g, a, 'NETHERWORLD'); await play(g, b, 'CUT', { at: e }); eq('Netherworld: another player\'s attack damage becomes Knell', e.pw.doom, 6); }
  // ---------- the Wirebound ----------
  { const { g, a } = await party(['WIREBOUND', OB, OB]); const en = g.seats.map((s) => s.energy); await play(g, a, 'POWER_SHARE'); eq('Power Share: every player gains 2 Energy', g.seats.map((s, i) => s.energy - en[i]), [2 - 1, 2, 2]); }
  {
    const { g, a, b } = await party(['WIREBOUND', OB]); a.orbs = []; await play(g, a, 'DEEP_SLEEP');
    const before = b.p.block; await g.withSeat(a, () => g.orbPassives('end'));
    eq('Deep Sleep: 2 Rime, and their Guard goes to the others too', [ids(a.orbs).filter((x) => x === 'RIME').length, b.p.block - before], [2, 4]);
  }
  { const { g, a, b } = await party(['WIREBOUND', OB]); await play(g, a, 'KICK_START', { ally: b }); eq('Kick Start: another player Primes a Flux', ids(b.orbs), ['FLUX']); }
  { const { g, a, b } = await party(['WIREBOUND', OB]); await play(g, a, 'MIMIC_ROUTINE', { ally: b }); await play(g, b, 'HELLBOUND'); const n = HD.vals({ id: 'HELLBOUND' }).str; eq('Mimic Routine: you play a copy of their Power', [a.p.pw.hellbound, b.p.pw.hellbound, a.p.imitate[1]], [n, n, 1]); }
  {
    const { g, e, a, b } = await party(['WIREBOUND', OB]); const sl = g.makeCard('SLIVER', false); b.hand.push(sl);
    const before = g.asSeat(b, () => g.atkDmg(4, e, sl)); await play(g, a, 'ALL_HANDS');
    eq('All Hands: everyone\'s 0-cost Attacks deal 3 more', g.asSeat(b, () => g.atkDmg(4, e, sl)) - before, 3);
  }
  // ---------- colorless ----------
  { const { g, a, b } = await party([OB, OB]); await play(g, a, 'HOPE_BEACON'); await g.withSeat(a, () => g.gainBlock(10, false)); eq('Hope Beacon: others gain half your Guard on your turn', b.p.block, 5); }
  { const { g, a, b } = await party([OB, OB]); const en = b.energy; await play(g, a, 'OWN_BELIEF', { ally: b }); eq('Belief: another player gains 2 Energy', b.energy - en, 2); }
  { const { g, a, b } = await party([OB, OB]); await play(g, a, 'COORDINATED', { ally: b }); eq('Coordinate Strike: 5 Might this turn for another player', b.p.pw.mightTemp, 5); }
  { const { g, e, a, b } = await party([OB, OB]); await play(g, b, 'CUT', { at: e }); await play(g, b, 'CUT', { at: e }); const hp = e.hp; await play(g, a, 'PILE_ON', { at: e }); eq('Pile On: 5 more for each attack by the others this turn', hp - e.hp, 15); }
  { const { g, a } = await party([OB, OB]); const h = g.seats.map((s) => s.hand.length); await play(g, a, 'HUDDLE'); eq('Huddle: every player draws 2', g.seats.map((s, i) => s.hand.length - h[i]), [2, 2]); }
  {
    const { g, e, a, b } = await party([OB, OB]); await play(g, a, 'TAKE_THE_BLOW', { ally: b });
    const [ha, hb] = [a.p.hp, b.p.hp]; e.intent = 'HIT'; await g.execMove(e);
    eq('Take the Blow: 9 Guard, and the attack on the ally hits you instead', [ha - a.p.hp, hb - b.p.hp], [11, 0]);
  }
  {
    const { g, e, a, b } = await party([OB, OB]); await play(g, a, 'KNOCK_OVER', { at: e }); let hp = e.hp; await g.withSeat(b, () => g.damage(e, 10, {}));
    const fromB = hp - e.hp; hp = e.hp; await g.withSeat(a, () => g.damage(e, 10, {}));
    eq('Knock Over: double damage from the others, not from you', [fromB, hp - e.hp], [20, 10]);
  }
  { const { g, a, b } = await party([OB, OB]); await play(g, a, 'BOOST', { ally: b }); eq('Boost: give another player 11 Guard', b.p.block, 11); }
  { const { g, a, b } = await party([OB, OB]); b.p.block = 7; await play(g, a, 'COPYCAT', { ally: b }); eq('Copycat: Guard equal to another player\'s', a.p.block, 7); }
  { const { g, a } = await party([OB, OB, OB]); await play(g, a, 'RALLY_CRY'); eq('Rally Cry: every player gains 12 Guard', g.seats.map((s) => s.p.block), [12, 12, 12]); }
  {
    const { g, e, a, b } = await party([OB, OB]); await play(g, a, 'DOUBLE_TEAM', { at: e });
    const hp = e.hp; await play(g, b, 'CUT', { at: e }); const hit = g.asSeat(b, () => g.atkDmg(6, e, null));
    eq('Double Team: the next Attack another player plays on it is played twice', [hp - e.hp, e.pw.tagTeam || 0], [2 * hit, 0]);
  }
  {
    const { g, e, a, b } = await party([OB, OB]); const c = await play(g, a, 'RELAY_STONE', { at: e });
    eq('Relay Stone: grows by 10 and passes to another player', [b.hand.includes(c), a.discard.includes(c), HD.vals(c).dmg], [true, false, 20]);
  }
  // ---------- potions ----------
  {
    const { g, a, b } = await party([OB, OB]); a.run.potions = ['BARK_DRAUGHT', null, null];
    await g.act(0, { k: 'potion', slot: 0, ally: 1 });
    eq('a potion you would drink can be thrown to another player', [b.p.block, a.p.block, a.run.potions[0]], [12, 0, null]);
  }
  console.log(fails ? `${fails} of ${n} co-op card checks failed` : `all ${n} co-op card checks passed`);
  if (fails) process.exitCode = 1;
})();

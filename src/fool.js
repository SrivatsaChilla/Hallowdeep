// The Minstrel: the sixth character (the Fool, new in the v0.113 beta). Costs, values, upgrades, keywords and targets
// come from HD.FOOL_DATA (generated from the newest beta data, v0.114); the rules, text, relics and potions are here.
// A Reed is an Arrow, Loose is Shoot, Transfixed is Impaled, Wrench is Dislodge, Sight is Aim, Limber is Stretch,
// Refrains are Melodies (Fa, Sol, La are Wah, Cho, Ki), Woe and Glee are Sadness and Joy, Omens are Tarot cards.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const C = HD.Combat.prototype;
  const DATA = HD.FOOL_DATA['0.114'];
  const REED_HITS = 3; // hits on a Transfixed enemy before the Reed comes out
  const MEL = ['Fa', 'Sol', 'La'];
  const card = (id, o) => {
    const d = DATA[id];
    if (!d) throw new Error(`no Fool data for ${id}`);
    CARDS[id] = Object.assign({ id, color: d.rarity === 'Token' ? 'token' : d.type === 'Status' ? 'status' : 'minstrel', name: d.name, type: d.type, rarity: d.rarity,
      cost: d.cost, target: d.target, kw: d.kw, tags: d.tags, v: d.v, up: d.up }, d.upCost != null ? { upCost: d.upCost } : {}, d.upKw ? { upKw: d.upKw } : {}, o);
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const tagged = (c, tag) => CARDS[c.id].tags.includes(tag);
  const loose = (c) => tagged(c, 'Loose');
  const mels = (g) => (g && g.t && g.refrains ? g.refrains() : 0);
  const woes = (g) => (g && g.rs ? g.rs.woe || 0 : 0);
  // The chip on an enemy shows the fewest hits any Reed in it still needs.
  const sync = (t) => { if (t.reeds && t.reeds.length) t.pw.impaled = Math.min(...t.reeds.map((r) => r.left)); else { t.reeds = null; delete t.pw.impaled; } };
  const poolOf = (g, f) => HD.POOL('minstrel', g.run.party > 1).filter(f).map((d) => d.id);
  // A card that could play itself right now: it has a cost, is not co-op aimed, and has a Reed if it needs one.
  const selfPlayable = (g, x) => typeof g.costOf(x) === 'number' && !HD.kwOf(x).includes('Unplayable') && CARDS[x.id].target !== 'ally' && (!loose(x) || g.reeds() > 0);
  const moveLoose = async (g, pile, prompt) => {
    const xs = pile.filter(loose);
    if (!xs.length) return;
    const [x] = await g.choose({ from: xs, n: 1, prompt });
    if (x && pile.includes(x)) { pile.splice(pile.indexOf(x), 1); g.addToHand(x); }
  };
  const woeToGlee = async (g) => { const xs = g.hand.filter((x) => x.id === 'WOE'); if (xs.length) await g.transformInCombat(g.rng.pick(xs), 'GLEE', false); };
  const addGlee = async (g, n, up) => { for (let i = 0; i < n && !g.over; i++) await g.create(g.makeCard('GLEE', !!up), 'hand'); };

  // ---------- Reeds (Arrows) ----------
  // Reeds in hand: every Reed you own that is not stuck in a living enemy. A Reed in an enemy that dies or leaves is yours again.
  C.reeds = function () {
    const me = this.seat.index;
    return Math.max(0, (this.rs.reedMax || 0) - this.enemies.reduce((a, e) => a + (e.alive && e.reeds ? e.reeds.filter((r) => r.by === me).length : 0), 0));
  };
  C.transfixed = function (t) { const me = this.seat.index; return !!(t && t.alive && t.reeds && t.reeds.some((r) => r.by === me)); };
  C.transfix = async function (t) {
    (t.reeds = t.reeds || []).push({ by: this.seat.index, left: REED_HITS });
    sync(t);
    await this.hook('transfixed', t);
  };
  // Loose a Reed (Shoot): an attack whose every hit gets your Sight. Afterward the Sight is spent and the Reed stays in
  // the enemy. Returns the HP the target lost.
  C.loose = async function (t, base, hits, c) {
    if (this.over || !t || !t.alive) return { dealt: 0, fatal: false };
    if (!this.reeds()) { this.say('You have no Reed to Loose.'); return { dealt: 0, fatal: false }; }
    const hp = t.hp;
    const { fatal } = await this.attack(t, base, hits, c);
    const dealt = Math.max(0, hp - Math.max(0, t.hp));
    delete this.p.pw.aim;
    delete this.p.pw.quietus; // spent on this Loose (v0.114: the Reed is no longer destroyed)
    if (t.alive && !this.over) await this.transfix(t);
    if (!this.over) await this.hook('loosed', t, c);
    return { dealt, fatal };
  };
  // Wrench (Dislodge): take your Reeds back out of an enemy (spentOnly: just the ones that took their 3 hits).
  C.wrench = async function (t, spentOnly) {
    const me = this.seat.index;
    const out = t && t.reeds ? t.reeds.filter((r) => r.by === me && (!spentOnly || r.left <= 0)) : [];
    if (!out.length) return 0;
    t.reeds = t.reeds.filter((r) => !out.includes(r));
    sync(t);
    this.t.wrenched = (this.t.wrenched || 0) + out.length;
    this.say(`Your Reed comes out of ${t.name}.`);
    for (let i = 0; i < out.length && !this.over; i++) {
      if (this.p.pw.yah && !this.t.yahUsed) { this.t.yahUsed = true; this.gainEnergy(this.p.pw.yah); }
      await this.hook('wrenched', t);
    }
    return out.length;
  };

  // ---------- Refrains (Melodies): on for the rest of the turn once you play a card with that tag ----------
  C.refrains = function () { const m = this.t && this.t.mel; return m ? MEL.filter((k) => m[k]).length : 0; };
  C.hasRefrain = function (...ks) { const m = this.t && this.t.mel; return !!m && ks.some((k) => m[k]); };
  C.gainRefrain = async function (k) {
    const m = (this.t.mel = this.t.mel || {});
    if (m[k]) return;
    m[k] = true;
    const pw = this.p.pw;
    if (k === 'Sol' && pw.songPath) await this.gainBlock(pw.songPath, false);
    if (k === 'Fa' && pw.violentChord) for (const e of this.alive().slice()) { await this.damage(e, pw.violentChord, {}); if (this.over) return; }
    if (k === 'La' && pw.tune) for (const x of this.rng.shuffle(this.hand.filter((y) => this.canUpgrade(y))).slice(0, pw.tune)) this.upgradeInCombat(x);
    if (pw.motif) await this.drawCards(pw.motif);
    for (let i = 0; i < (pw.lostLute || 0) && !this.over; i++) { const x = await this.takeTopOfDraw(); if (x) await this.autoPlay(x, {}); }
    if (this.over || !MEL.every((x) => m[x])) return;
    if (pw.lullaby) await this.gainBlock(pw.lullaby, false);
    await this.rh('allRefrains');
  };

  // ---------- Woe (Sadness) ----------
  C.addWoe = async function (n, where = 'hand') {
    for (let i = 0; i < n && !this.over; i++) {
      await this.create(this.makeCard('WOE', false), where);
      this.rs.woe = (this.rs.woe || 0) + 1;
      if (this.p.pw.allIsWell) await this.gainBlock(this.p.pw.allIsWell, false);
      await this.rh('woeMade');
    }
  };

  // ---------- starter ----------
  card('PLUCK', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('BARK_WARD', { text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('CARELESS_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.loose(t, v.dmg, 1, c) });

  // ---------- tokens ----------
  card('WOE', { text: () => '' });
  card('GLEE', { text: (v) => `Gain ${v.en} Energy. Draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => { g.gainEnergy(v.en); await g.drawCards(v.draw); } });
  card('THE_ONE_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.loose(t, v.dmg, 1, c) });

  // ---------- common ----------
  card('REED_JAB', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Gain ${v.aim} Sight.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'aim', v.aim); } });
  card('BOW_SWAT', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. If the enemy is Transfixed, gain ${v.en} Energy.`,
    play: async (g, c, t, v) => { const pin = g.transfixed(t); await g.attack(t, v.dmg, 1, c); if (pin) g.gainEnergy(v.en); } });
  card('SOL_BRISTLES', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Gain ${v.choBarbs} Spines this turn.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'spines', v.choBarbs); g.addPw(g.p, 'barbs', v.choBarbs); } });
  card('SOL_STAND', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. If you have a Reed, gain Guard an additional time.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); if (g.reeds()) await g.gainBlock(v.blk, true); } });
  card('SOL_STEADY', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Gain ${v.aim} Sight.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); g.addPw(g.p, 'aim', v.aim); } });
  card('LONG_REACH', { text: (v) => `Gain ${v.stretch} Limber. Draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => { g.addPw(g.p, 'stretch', v.stretch); await g.drawCards(v.draw); } });
  card('HEAVY_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage. Sight affects this card ${v.aimMultiplier} times.`, play: (g, c, t, v) => g.loose(t, v.dmg, 1, c) });
  card('JAPE', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Add ${v.draw} Woe to your hand.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.addWoe(v.draw); } });
  card('LA_HYMN', { text: (v) => `Look at the top ${v.draw} cards of your draw pile. Choose 1 to add to your hand and discard the rest.`,
    play: async (g, c, t, v) => {
      const top = g.draw.splice(Math.max(0, g.draw.length - v.draw));
      if (!top.length) return;
      const [x] = await g.choose({ from: top, n: 1, prompt: 'Put a card into your hand' });
      for (const y of top) { if (y === x) g.addToHand(y); else g.discard.push(y); }
    } });
  card('LA_SKIP', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. If the enemy is Transfixed, draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { const pin = g.transfixed(t); await g.attack(t, v.dmg, 1, c); if (pin && !g.over) await g.drawCards(v.draw); } });
  card('LA_LASH', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Next turn, gain ${v.en} Energy.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); g.addPw(g.p, 'nextEnergy', v.en); } });
  card('GRIEVING_BLOW', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Transform this into Woe and return it to your hand.`, settleTo: () => 'gone',
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!g.over) await g.addWoe(1); } });
  card('NOTCH', { text: (v) => `Gain ${v.aim} Sight.`, play: async (g, c, t, v) => g.addPw(g.p, 'aim', v.aim) });
  card('QUICK_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.loose(t, v.dmg, 1, c) });
  card('RAINING_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage. Damage ALL other enemies equal to the damage dealt.`,
    play: async (g, c, t, v) => { const { dealt } = await g.loose(t, v.dmg, 1, c); if (dealt) for (const e of g.alive().filter((x) => x !== t)) { await g.damage(e, dealt, {}); if (g.over) return; } } });
  card('CALL_BACK', { text: () => 'If the enemy is Transfixed, Wrench.', play: (g, c, t) => g.wrench(t) });
  card('WOEFUL_PLUCK', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Add ${v.draw} Woe to your hand.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!g.over) await g.addWoe(v.draw); } });
  card('FA_MALLET', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Deals double damage to Transfixed enemies.`, dmgMult: (g, t) => (g.transfixed(t) ? 2 : 1),
    play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('FA_SWING', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies.`, play: (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  card('FA_TAP', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Apply ${v.vul} Exposed.`, play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'exposed', v.vul); } });

  // ---------- uncommon ----------
  card('ALL_IS_FINE', { text: (v) => `Whenever you create a Woe, gain ${v.allIsWell} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'allIsWell', v.allIsWell) });
  card('HEARTACHE', { text: (v, f, c, g) => `Deal ${f.d(v.base + v.per * woes(g))} damage. Deals ${v.per} additional damage for each Woe you have created this combat.`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * woes(g), 1, c) });
  card('BOWCRAFT', { text: (v) => `At the start of your turn, gain ${v.aim} Sight.`, play: async (g, c, t, v) => g.addPw(g.p, 'archery', v.aim) });
  card('BLOSSOM_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage and gain Limber equal to the damage dealt.`,
    play: async (g, c, t, v) => { const { dealt } = await g.loose(t, v.dmg, 1, c); if (dealt) g.addPw(g.p, 'stretch', dealt); } });
  card('DARKEN_THE_SKY', { text: () => 'Add a random card that can Loose to your hand. It is free to play this turn.',
    play: async (g) => { const x = g.makeCard(g.rng.pick(poolOf(g, (d) => d.tags.includes('Loose'))), false); x.freeTurn = true; await g.create(x, 'hand'); } });
  card('DRAW_TAUT', { text: (v) => `Gain ${v.aim} Sight X times.`, play: async (g, c, t, v, x) => g.addPw(g.p, 'aim', v.aim * x) });
  card('SOL_LA', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Regain any spent Limber.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); if (g.t.stretchSpent) { g.addPw(g.p, 'stretch', g.t.stretchSpent); g.t.stretchSpent = 0; } } });
  card('SOL_BOUGHS', { text: (v, f) => `Gain ${f.b(v.blk)} Guard twice. Costs ${v.melodyCostReduction} less if you have a Fa Refrain or La Refrain.`,
    costFn: (g, c, k) => (g.hasRefrain('Fa', 'La') ? Math.max(0, k - HD.vals(c).melodyCostReduction) : k),
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.gainBlock(v.blk, true); } });
  card('NO_LOVE_LOST', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. The enemy takes ${v.dislikeYou}% additional damage from Reeds you Loose this turn.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (t.alive) await g.apply(t, 'dislikeYou', v.dislikeYou); } });
  card('HEROIC_FETCH', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. If this Wrenches a Reed, gain ${v.en} Energy.`,
    play: async (g, c, t, v) => { const before = g.t.wrenched || 0; await g.attack(t, v.dmg, 1, c); if ((g.t.wrenched || 0) > before) g.gainEnergy(v.en); } });
  card('SPROUT', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Transform 1 random Woe in your hand into a copy of this card.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); const xs = g.hand.filter((x) => x.id === 'WOE'); if (xs.length && !g.over) await g.transformInCombat(g.rng.pick(xs), 'SPROUT', c.up); } });
  card('CHORD_WALL', { text: (v, f, c, g) => `Gain ${v.base} Guard. Gain ${v.per} additional Guard for each Refrain you have.${g && g.t ? ` (${f.b(v.base + v.per * mels(g))})` : ''}`,
    play: (g, c, t, v) => g.gainBlock(v.base + v.per * g.refrains(), true) });
  card('DEEP_ROOTS', { text: (v) => `At the start of your turn, gain ${v.hiddenRoots} Limber.`, play: async (g, c, t, v) => g.addPw(g.p, 'hiddenRoots', v.hiddenRoots) });
  card('HOBBLING_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage and apply ${v.power} Sapped and Exposed.`,
    play: async (g, c, t, v) => { await g.loose(t, v.dmg, 1, c); if (t.alive) { await g.apply(t, 'sapped', v.power); await g.apply(t, 'exposed', v.power); } } });
  card('LA_PAUSE', { text: (v) => `Next turn, gain ${v.en} Energy. If you have a Fa Refrain or Sol Refrain, Retain your hand this turn.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'nextEnergy', v.en); if (g.hasRefrain('Fa', 'Sol')) g.t.keepHand = true; } });
  card('DEAD_SET', { text: () => 'Put a card that can Loose from your draw pile into your hand.', play: (g) => moveLoose(g, g.draw, 'Put a card that can Loose into your hand') });
  card('THEME', { text: (v) => `Whenever you gain a Refrain, draw ${plural(v.motif, 'card')}.`, play: async (g, c, t, v) => g.addPw(g.p, 'motif', v.motif) });
  card('FIST_OF_GLEE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Transform ${v.draw} random Woe in your hand into Glee.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); for (let i = 0; i < v.draw && !g.over; i++) await woeToGlee(g); } });
  card('TWIN_REEDS', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage twice.`, play: (g, c, t, v) => g.loose(t, v.dmg, v.hitCount, c) });
  card('RHYTHM_PLUCK', { text: (v, f, c, g) => `Deal ${f.d(v.dmg)} damage. Hits an additional time for each Refrain you have.${g && g.t ? ` (${v.base + v.per * mels(g)})` : ''}`,
    play: (g, c, t, v) => g.attack(t, v.dmg, v.base + v.per * g.refrains(), c) });
  card('ROOT_AROUND', { text: (v) => `Draw ${plural(v.draw, 'card')}. Add a Woe to your hand.`, play: async (g, c, t, v) => { await g.drawCards(v.draw); await g.addWoe(1); } });
  card('BARBED_REEDS', { text: (v) => `Transfixed enemies take ${v.serratedArrows}% more damage from your Attacks.`, play: async (g, c, t, v) => g.addPw(g.p, 'serratedArrows', v.serratedArrows) });
  card('SONG_TRAIL', { text: (v) => `Whenever you gain a Sol Refrain, gain ${v.songPath} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'songPath', v.songPath) });
  card('EVEN_TEMPO', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Draw ${plural(v.per, 'card')} for each Refrain you have.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!g.over) await g.drawCards(v.base + v.per * g.refrains()); } });
  card('FELLING', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. If this kills an enemy, deal ${f.d(v.onKillDamage)} damage to ALL enemies.`,
    play: async (g, c, t, v) => { await g.attack(t, v.dmg, 1, c); if (!t.alive && !g.over) await g.attackAll(v.onKillDamage, 1, c); } });
  card('TRICK_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage and draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { await g.loose(t, v.dmg, 1, c); if (!g.over) await g.drawCards(v.draw); } });
  card('IN_TUNE', { text: (v) => `Whenever you gain a La Refrain, Upgrade ${v.draw === 1 ? 'a random card' : `${v.draw} random cards`} in your hand.`, play: async (g, c, t, v) => g.addPw(g.p, 'tune', v.draw) });
  card('TEAR_OUT', { text: (v) => `If the enemy is Transfixed, Wrench and apply ${v.vul} Exposed.`, play: async (g, c, t, v) => { if (await g.wrench(t)) await g.apply(t, 'exposed', v.vul); } });
  card('HARSH_CHORD', { text: (v) => `Whenever you gain a Fa Refrain, deal ${v.violentChord} damage to ALL enemies.`, play: async (g, c, t, v) => g.addPw(g.p, 'violentChord', v.violentChord) });
  card('SPITE', { text: (v) => `Apply ${v.weak} Sapped. Add ${v.draw} Woe to your hand.`, play: async (g, c, t, v) => { await g.apply(t, 'sapped', v.weak); await g.addWoe(v.draw); } });
  card('FA_BLARE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies. If you have a Sol Refrain or La Refrain, hits twice.`,
    play: (g, c, t, v) => g.attackAll(v.dmg, g.hasRefrain('Sol', 'La') ? 2 : 1, c) });
  card('FA_SOL', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Deal ${f.d(v.dmg)} damage.`, play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.attack(t, v.dmg, 1, c); } });
  card('FA_LA', { text: (v, f) => `Deal ${f.d(v.dmg)} damage ${v.hitCount} times. Put a card from your discard pile on top of your draw pile.`,
    play: async (g, c, t, v) => {
      await g.attack(t, v.dmg, v.hitCount, c);
      if (g.over || !g.discard.length) return;
      const [x] = await g.choose({ from: g.discard.slice(), n: 1, prompt: 'Put a card on top of your draw pile' });
      if (x && g.discard.includes(x)) { g.discard.splice(g.discard.indexOf(x), 1); g.draw.push(x); }
    } });
  card('WHISTLING_REEDS', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Whenever you Loose a Reed, return this to your hand from your discard pile.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('YANK', { text: (v) => `If the enemy is Transfixed, Wrench and draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => { if (await g.wrench(t)) await g.drawCards(v.draw); } });

  // ---------- rare ----------
  card('SPRING_BACK', { text: (v) => `Gain ${v.stretch} Limber. At the start of your next turn, return this to your hand.`, play: async (g, c, t, v) => { g.addPw(g.p, 'stretch', v.stretch); c.returnNext = true; } });
  card('LIGHTEN_UP', { text: (v) => `Add ${v.sadness} Woe to your hand. Add ${v.joy} Glee to your hand.`, play: async (g, c, t, v) => { await g.addWoe(v.sadness); await addGlee(g, v.joy); } });
  card('SOL_CHOIR', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Play ALL Fa and La cards in your hand.`,
    play: async (g, c, t, v) => {
      await g.gainBlock(v.blk, true);
      for (const x of g.hand.filter((y) => (tagged(y, 'Fa') || tagged(y, 'La')) && selfPlayable(g, y))) {
        if (g.over || !g.alive().length) return;
        const i = g.hand.indexOf(x); if (i < 0) continue;
        g.hand.splice(i, 1);
        await g.autoPlay(x, {});
      }
    } });
  card('FINALE', { text: (v, f) => `Deal ${f.d(v.dmg)} damage. Costs ${v.costReductionPerMelody} less for each Refrain you have.`,
    costFn: (g, c, k) => Math.max(0, k - HD.vals(c).costReductionPerMelody * g.refrains()), play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('RAPTURE', { text: () => 'At the start of your turn, Transform 1 random Woe in your hand into Glee.', play: async (g, c, t, v) => g.addPw(g.p, 'ecstasy', v.draw) });
  card('ONE_MORE_SONG', { text: (v) => `Gain ${v.en} Energy. Draw ${plural(v.draw, 'card')}. You can only play ${v.encore} more card this turn.`,
    play: async (g, c, t, v) => { g.gainEnergy(v.en); await g.drawCards(v.draw); g.t.playCap = g.t.cards + v.encore; g.p.pw.encore = v.encore; } });
  card('LISTLESS', { text: (v) => `At the start of your turn, add 1 Woe to your hand and draw ${v.ennui} additional cards.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'ennui', v.ennui); g.rs.ennui = (g.rs.ennui || 0) + 1; } });
  card('BURSTING_REEDS', { text: (v) => `Whenever you Transfix an enemy, deal ${v.explosiveArrows} damage to ALL enemies.`, play: async (g, c, t, v) => g.addPw(g.p, 'explosiveArrows', v.explosiveArrows) });
  card('FULL_BLOOM', { text: (v, f, c) => `Choose a card in your hand to Transform into The One Reed${c && c.up ? '+' : ''}.`,
    play: async (g, c) => {
      if (!g.hand.length) return;
      const [x] = await g.choose({ from: g.hand.slice(), n: 1, prompt: 'Transform a card into The One Reed' });
      if (x && g.hand.includes(x)) await g.transformInCombat(x, 'THE_ONE_REED', c.up);
    } });
  const honingText = (a) => (a === 100 ? 'Reeds deal double damage.' : `Reeds deal ${a}% additional damage.`);
  card('WHETTING', { text: (v) => honingText(v.honing), play: async (g, c, t, v) => g.addPw(g.p, 'honing', v.honing) });
  card('LA_STANZA', { text: (v) => (v.kiVerse === 1 ? 'The next Fa or Sol card you play this turn is played an additional time.' : `The next ${v.kiVerse} Fa or Sol cards you play this turn are played an additional time.`),
    play: async (g, c, t, v) => g.addPw(g.p, 'kiVerse', v.kiVerse) });
  card('CRADLE_SONG', { text: (v) => `When you gain every Refrain, gain ${v.lullaby} Guard.`, play: async (g, c, t, v) => g.addPw(g.p, 'lullaby', v.lullaby) });
  card('SINGING_REED', { text: (v, f, c, g) => `Loose a Reed to deal ${f.d(v.dmg)} damage. Hits an additional time for each Refrain you have.${g && g.t ? ` (${v.base + v.per * mels(g)})` : ''}`,
    play: (g, c, t, v) => g.loose(t, v.dmg, v.base + v.per * g.refrains(), c) });
  card('FABLED_FORM', { text: () => 'At the start of your turn, add a random Omen to your hand.', play: async (g) => g.addPw(g.p, 'mythic', 1) });
  card('NAIL_DOWN', { text: (v, f) => `If the enemy is Transfixed, deal ${f.d(v.dmg)} damage and apply ${v.power} Sapped and Exposed.`,
    play: async (g, c, t, v) => { if (!g.transfixed(t)) return; await g.attack(t, v.dmg, 1, c); if (t.alive) { await g.apply(t, 'sapped', v.power); await g.apply(t, 'exposed', v.power); } } });
  card('LAST_REST', { text: (v) => `This turn, the next Reed you Loose deals ${v.quietus === 2 ? 'double' : 'triple'} damage.`,
    play: async (g, c, t, v) => { g.p.pw.quietus = Math.max(g.p.pw.quietus || 0, v.quietus); } });
  card('SPARE_REED', { text: (v) => `Gain ${v.hits} additional ${v.hits === 1 ? 'Reed' : 'Reeds'}.`, play: async (g, c, t, v) => { g.rs.reedMax = (g.rs.reedMax || 0) + v.hits; } });
  card('REED_AFTER_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage X times.`, play: (g, c, t, v, x) => (x > 0 ? g.loose(t, v.dmg, x, c) : null) });
  // The Sight this card gives grows for good, like The Sickle's damage (grow is saved with the deck card).
  card('FLAUNT', { text: (v, f, c) => `Gain ${v.aim + ((c && c.grow) || 0)} Sight. If a non-minion enemy dies this turn, permanently increase this card's Sight by ${v.showOff}.`,
    play: async (g, c, t, v) => { g.addPw(g.p, 'aim', v.aim + (c.grow || 0)); (g.t.flaunt = g.t.flaunt || []).push({ c, n: v.showOff }); } });
  card('DULLARD', { text: (v) => (v.simpleton === 1 ? 'At the end of your turn, play the least expensive card in your hand.' : `At the end of your turn, play the ${v.simpleton} least expensive cards in your hand.`), play: async (g, c, t, v) => g.addPw(g.p, 'simpleton', v.simpleton) });
  card('SKYWARD_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.loose(t, v.dmg, 1, c) });
  card('FA_SOL_LA', { text: (v, f) => `Gain ${f.b(v.blk)} Guard. Deal ${f.d(v.dmg)} damage. Draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { await g.gainBlock(v.blk, true); await g.attack(t, v.dmg, 1, c); if (!g.over) await g.drawCards(v.draw); } });
  // v0.114: Fa cards no longer count, only cards containing Sol or La (a Fa Sol card still counts).
  const solLa = (c) => tagged(c, 'Sol') || tagged(c, 'La');
  const tuneful = (g, c) => { const piles = [...g.hand, ...g.draw, ...g.discard]; return piles.filter(solLa).length + (c && solLa(c) && !piles.includes(c) ? 1 : 0); };
  card('FA_OPUS', { text: (v, f, c, g) => `Deal ${f.d(v.base + v.per * (g && g.hand ? tuneful(g, c) : 0))} damage to ALL enemies. Deals ${v.per} additional damage for ALL your cards containing Sol or La.`,
    play: (g, c, t, v) => g.attackAll(v.base + v.per * tuneful(g, c), 1, c) });
  card('BRIGHT_SIDE', { text: () => 'Burn ALL Woe in your hand. Draw 1 card for each card Burned.',
    play: async (g) => {
      const xs = g.hand.filter((x) => x.id === 'WOE');
      for (const x of xs) { g.hand.splice(g.hand.indexOf(x), 1); await g.burn(x); if (g.over) return; }
      if (xs.length) await g.drawCards(xs.length);
    } });
  card('HUP', { text: (v) => `The first time you Wrench a Reed each turn, gain ${v.en} Energy.`, play: async (g, c, t, v) => g.addPw(g.p, 'yah', v.en) });

  // ---------- ancient ----------
  card('HALLOWED_REED', { text: (v, f) => `Loose a Reed to deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.loose(t, v.dmg, 1, c) });
  card('LOST_LYRE', { text: () => 'Whenever you gain a Refrain, play the top card of your draw pile.', play: async (g, c, t, v) => g.addPw(g.p, 'lostLute', v.lostLute) });

  // ---------- Omens (Tarot cards): tokens that Fabled Form deals out ----------
  card('THE_REAPER', { text: (v) => `Apply ${v.doom} Knell.`, play: (g, c, t, v) => g.applyDoom(t, v.doom) });
  card('THE_RECKONING', { text: (v) => `If the enemy has ${v.threshold} or less HP, set its HP to 0.`, play: async (g, c, t, v) => { if (t.hp <= v.threshold) { t.hp = 0; await g.kill(t); } } });
  card('THE_SCALES', { text: (v, f) => `Deal ${f.d(v.dmg)} damage.`, play: (g, c, t, v) => g.attack(t, v.dmg, 1, c) });
  card('THE_LION', { text: (v) => `Gain ${v.str} Might.`, play: async (g, c, t, v) => g.addPw(g.p, 'might', v.str) });
  card('THE_VESSEL', { text: (v, f) => `Gain ${f.b(v.blk)} Guard.`, play: (g, c, t, v) => g.gainBlock(v.blk, true) });
  card('THE_CART', { text: (v, f) => `Deal ${f.d(v.dmg)} damage to ALL enemies.`, play: (g, c, t, v) => g.attackAll(v.dmg, 1, c) });
  card('THE_HORNED_ONE', { text: (v, f, c) => `Burn your hand. ${c && c.up ? 'Upgrade and play' : 'Play'} the top card of your draw pile for each card Burned this way.`,
    play: async (g, c) => {
      const xs = g.hand.splice(0);
      for (const x of xs) await g.burn(x);
      for (let i = 0; i < xs.length && !g.over; i++) { const x = await g.takeTopOfDraw(); if (!x) return; if (c.up && g.canUpgrade(x)) g.upgradeInCombat(x); await g.autoPlay(x, {}); }
    } });
  card('THE_THRONE', { text: (v) => `Gain ${v.en} Energy.`, play: async (g, c, t, v) => g.gainEnergy(v.en) });
  card('THE_GARDEN', { text: (v) => `Apply ${v.power} Sapped. Apply ${v.power} Exposed.`, play: async (g, c, t, v) => { await g.apply(t, 'sapped', v.power); if (t.alive) await g.apply(t, 'exposed', v.power); } });
  card('THE_WANDERER', { text: (v) => `Play ${v.draw} random cards from your hand.`,
    play: async (g, c, t, v) => {
      for (let i = 0; i < v.draw && !g.over && g.alive().length; i++) {
        const ok = g.hand.filter((x) => selfPlayable(g, x));
        if (!ok.length) return;
        const x = g.rng.pick(ok);
        g.hand.splice(g.hand.indexOf(x), 1);
        await g.autoPlay(x, {});
      }
    } });
  card('THE_HANGED_ONE', { text: (v) => `Lose ${v.hpLoss} HP. Take an extra turn after this one.`, play: async (g, c, t, v) => { await g.selfLoseHp(v.hpLoss); if (!g.over) g.p.pw.extraTurn = 1; } });
  card('THE_LANTERN', { text: (v) => `Discard a card. Draw ${plural(v.draw, 'card')}. Discarded Curses are Burned.`,
    play: async (g, c, t, v) => {
      if (g.hand.length) {
        const [x] = await g.choose({ from: g.hand.slice(), n: 1, prompt: 'Discard a card' });
        if (x && CARDS[x.id].type === 'Curse') { g.hand.splice(g.hand.indexOf(x), 1); await g.burn(x); } else if (x) await g.discardFromHand(x);
      }
      if (!g.over) await g.drawCards(v.draw);
    } });
  card('THE_KEEPER_OF_KEYS', { text: (v) => `Add ${v.draw} random colorless cards to your hand.`,
    play: async (g, c, t, v) => { for (let i = 0; i < v.draw && !g.over; i++) await g.create(g.makeCard(g.rng.pick(HD.colorlessIds(true)), false), 'hand'); } });
  card('THE_VEIL', { text: (v) => `Draw ${plural(v.draw, 'card')}.`, play: (g, c, t, v) => g.drawCards(v.draw) });
  card('THE_PAIR', { text: (v, f, c) => `Fill your hand with random ${c && c.up ? 'upgraded ' : ''}cards from other characters.`,
    play: async (g, c) => {
      const pool = Object.values(HD.CHARS).filter((ch) => ch.color !== g.run.color).flatMap((ch) => g.run.pool(ch.color)).map((d) => d.id);
      while (g.hand.length < 10 && !g.over) await g.create(g.makeCard(g.rng.pick(pool), c.up), 'hand');
    } });
  card('THE_CONJURER', { text: (v) => `Gain ${v.hits} Cell Slots. Prime ${v.hits} random Cells.`,
    play: async (g, c, t, v) => { g.addOrbSlots(v.hits); for (let i = 0; i < v.hits && !g.over; i++) await g.channelRandom(); } });
  card('THE_PALE_MOON', { text: (v, f, c) => `Fill your hand with Slivers${c && c.up ? '+' : ''}.`, play: async (g, c) => g.addSlivers(10 - g.hand.length, c.up) });
  card('THE_LODESTAR', { text: (v) => `Next turn, gain ${v.en} Energy and draw ${plural(v.draw, 'card')}.`, play: async (g, c, t, v) => { g.addPw(g.p, 'nextEnergy', v.en); g.addPw(g.p, 'nextDraw', v.draw); } });
  card('THE_DAYSTAR', { text: (v) => `Draw ${plural(v.draw, 'card')}. Gain ${v.en} Energy. Add 2 Ashfall to your draw pile.`,
    play: async (g, c, t, v) => { await g.drawCards(v.draw); g.gainEnergy(v.en); g.addStatus({ id: 'ASHFALL', n: 2, to: 'draw' }); } });
  card('THE_RUIN', { text: (v, f, c, g) => `Deal ${v.per} damage for each floor traveled.${g && g.run ? ` (${f.d(v.base + v.per * g.run.floor)})` : ''}`,
    play: (g, c, t, v) => g.attack(t, v.base + v.per * g.run.floor, 1, c) });
  card('THE_WREATH', { text: (v) => `Put ${v.draw} random cards from your discard pile into your hand.`,
    play: async (g, c, t, v) => { for (const x of g.rng.shuffle(g.discard.slice()).slice(0, v.draw)) { if (g.hand.length >= 10) return; g.discard.splice(g.discard.indexOf(x), 1); g.addToHand(x); } } });
  card('THE_WHEEL', { text: (v) => `Discard your hand. Draw ${plural(v.draw, 'card')}.`,
    play: async (g, c, t, v) => { for (const x of g.hand.slice()) { await g.discardFromHand(x); if (g.over) return; } await g.drawCards(v.draw); } });
  const OMENS = Object.keys(DATA).filter((id) => DATA[id].tags.includes('Omen'));

  // ---------- co-op only (filled in by coop.js) ----------
  for (const id of ['MULCH', 'ENTHRALL', 'MORNING_BENDS', 'COVERING_FLIGHT', 'FULL_BAND', 'SELF_MOCKERY']) card(id, { coop: true, text: () => 'Co-op only.', play: async () => {} });

  // ---------- character ----------
  // guest: from a later game version than everyone else, so other characters' "cards from another character" skip it.
  HD.CHARS.MINSTREL = { id: 'MINSTREL', name: 'The Minstrel', color: 'minstrel', hp: 77, gold: 99, energy: 3, reeds: 1, guest: true,
    deck: ['PLUCK', 'PLUCK', 'PLUCK', 'PLUCK', 'PLUCK', 'BARK_WARD', 'BARK_WARD', 'BARK_WARD', 'BARK_WARD', 'CARELESS_REED'],
    relic: 'SINGING_BOW', ancientRelic: 'TALESPINNER', ancientCard: ['CARELESS_REED', 'HALLOWED_REED'], strike: 'PLUCK', defend: 'BARK_WARD',
    blurb: 'Starts with Singing Bow: start each combat with 6 Sight.' };

  // ---------- relics ----------
  const relic = (rarity, id, o) => { HD.RELICS[id] = Object.assign({ id, rarity, pool: 'minstrel' }, o); };
  const randomTune = (g, k) => g.rng.pick(poolOf(g, (d) => (k ? d.tags.includes(k) : MEL.some((m) => d.tags.includes(m)))));
  relic('Starter', 'SINGING_BOW', { name: 'Singing Bow', text: 'Start each combat with 6 Sight.', battleStart: (g) => g.addPw(g.p, 'aim', 6) });
  relic('Starter', 'TALESPINNER', { name: 'Talespinner', text: 'Start each combat with 12 Sight. At the end of your turn, gain 3 Sight.',
    battleStart: (g) => g.addPw(g.p, 'aim', 12), turnEnd: (g) => g.addPw(g.p, 'aim', 3) });
  relic('Common', 'WOVEN_MAT', { name: 'Woven Mat', text: 'Start each combat with 6 Limber.', battleStart: (g) => g.addPw(g.p, 'stretch', 6) });
  relic('Uncommon', 'CLAY_WHISTLE', { name: 'Clay Whistle', text: 'At the start of each combat, add a random Fa, Sol or La card to your hand.',
    firstHand: (g) => g.create(g.makeCard(randomTune(g), false), 'hand') });
  relic('Uncommon', 'WHITTLERS_KNIFE', { name: "Whittler's Knife", text: 'Whenever you shuffle your draw pile, gain 5 Sight.', onShuffle: (g) => g.addPw(g.p, 'aim', 5) });
  relic('Rare', 'MAESTROS_WAND', { name: "Maestro's Wand", text: 'When you gain every Refrain, take 25% less attack damage until your next turn.', allRefrains: (g) => { g.p.pw.baton = 1; } });
  relic('Rare', 'BONE_MEAL', { name: 'Bone Meal', text: 'Whenever you create a Woe, gain 1 Might.', woeMade: (g) => g.addPw(g.p, 'might', 1) });
  relic('Rare', 'CATGUT', { name: 'Catgut', text: 'Whenever you Wrench a Reed, gain 4 Guard.', wrenched: (g) => g.gainBlock(4, false) });
  relic('Shop', 'STRANGE_LANTERN', { name: 'Strange Lantern', text: 'At the start of each combat, add a Glee and a Woe to your hand.', firstHand: async (g) => { await addGlee(g, 1); await g.addWoe(1); } });

  // ---------- potions ----------
  const potion = (id, o) => { HD.POTIONS[id] = Object.assign({ id, pool: 'minstrel', target: 'self' }, o); };
  potion('BOTTLED_TUNE', { name: 'Bottled Tune', rarity: 'Uncommon', text: 'Add a random Fa, Sol and La card to your hand. They are free to play this turn.',
    use: async (g) => { for (const k of MEL) { const x = g.makeCard(randomTune(g, k), false); x.freeTurn = true; await g.create(x, 'hand'); } } });
  potion('CRYSTAL_BLISS', { name: 'Crystal Bliss', rarity: 'Rare', text: 'Add 3 Glee to your hand. Fill your hand with Woe.', use: async (g) => { await addGlee(g, 3); await g.addWoe(Math.max(0, 10 - g.hand.length)); } });
  potion('MARKSMANS_DRAUGHT', { name: "Marksman's Draught", rarity: 'Common', text: 'Gain 21 Sight.', use: (g) => g.addPw(g.p, 'aim', 21) });

  // ---------- the rules above, wired into the engine ----------
  const pw = (g) => g.p.pw;
  // Sight adds to every hit of a Loosed Reed (Heavy Reed counts it twice).
  HD.ATK_ADD.push((g, c) => (c && pw(g).aim && loose(c) ? pw(g).aim * (HD.vals(c).aimMultiplier || 1) : 0));
  HD.ATK_MULT.push((g, c, t, isAtk) => {
    let m = 1;
    if (c && loose(c)) { m *= 1 + (pw(g).honing || 0) / 100; if (pw(g).quietus) m *= pw(g).quietus; if (t && t.pw.dislikeYou) m *= 1 + t.pw.dislikeYou / 100; }
    if (isAtk && pw(g).serratedArrows && g.transfixed(t)) m *= 1 + pw(g).serratedArrows / 100;
    return m;
  });
  // A card that Looses needs a Reed in hand; One More Song caps the cards left this turn.
  HD.PLAY_MODS.push((g, c, d) => (!d.tags.includes('Loose') || g.reeds() > 0) && (g.t.playCap == null || g.t.cards < g.t.playCap));
  HD.REPLAY_MODS.push((g, c, d) => { if (!pw(g).kiVerse || !['Fa', 'Sol'].some((k) => d.tags.includes(k))) return 0; g.addPw(g.p, 'kiVerse', -1); return 1; });
  HD.TAKEN_MODS.push((g, d) => (pw(g).baton ? d * 0.75 : d));

  HD.onEngine('playing', async (g, c, d) => { for (const k of MEL) if (d.tags.includes(k)) { await g.gainRefrain(k); if (g.over) return; } });
  // Each hit on a Transfixed enemy loosens its owner's Reeds; the third one frees them.
  HD.onEngine('hitEnemy', async (g, t) => {
    if (!t.alive || !t.reeds) return;
    const me = g.seat.index;
    for (const r of t.reeds) if (r.by === me) r.left--;
    sync(t);
    await g.wrench(t, true);
  });
  HD.onEngine('transfixed', async (g) => { if (pw(g).explosiveArrows) for (const e of g.alive().slice()) { await g.damage(e, pw(g).explosiveArrows, {}); if (g.over) return; } });
  HD.onEngine('loosed', async (g) => { for (const x of g.discard.filter((y) => y.id === 'WHISTLING_REEDS')) { if (g.hand.length >= 10) return; g.discard.splice(g.discard.indexOf(x), 1); g.addToHand(x); } });
  HD.onEngine('onEnemyDeath', async (g, e) => {
    if (e.reeds) { e.reeds = null; delete e.pw.impaled; } // the Reeds drop out; this is not a Wrench
    if (!e.pw.minion && g.t && g.t.flaunt) for (const x of g.t.flaunt) { x.c.grow = (x.c.grow || 0) + x.n; if (x.c.src) x.c.src.grow = (x.c.src.grow || 0) + x.n; }
  });
  HD.onEngine('turnStart', async (g) => {
    delete pw(g).baton;
    if (pw(g).barbs) { g.addPw(g.p, 'spines', -pw(g).barbs); delete pw(g).barbs; }
    for (const e of g.enemies) if (e.alive && e.reeds) sync(e);
    if (pw(g).archery) g.addPw(g.p, 'aim', pw(g).archery);
    if (pw(g).hiddenRoots) g.addPw(g.p, 'stretch', pw(g).hiddenRoots);
    if (pw(g).ennui) { g.extraDrawThisTurn += pw(g).ennui; await g.addWoe(g.rs.ennui || 1); }
    for (let i = 0; i < (pw(g).mythic || 0) && !g.over; i++) await g.create(g.makeCard(g.rng.pick(OMENS), false), 'hand');
  });
  HD.onEngine('afterDraw', async (g) => { for (let i = 0; i < (pw(g).ecstasy || 0) && !g.over; i++) await woeToGlee(g); });
  HD.onEngine('turnEnd', async (g) => {
    for (let i = 0; i < (pw(g).simpleton || 0) && !g.over && g.alive().length; i++) {
      const ok = g.hand.filter((x) => selfPlayable(g, x));
      if (!ok.length) break;
      const x = ok.reduce((a, b) => (g.costOf(b) < g.costOf(a) ? b : a));
      g.hand.splice(g.hand.indexOf(x), 1);
      await g.autoPlay(x, {});
    }
    if (g.over) return;
    for (const k of ['quietus', 'encore', 'kiVerse']) delete pw(g)[k];
    for (const e of g.enemies) delete e.pw.dislikeYou;
    g.t.flaunt = null; g.t.mel = null; // Refrains end with the turn
  });

  HD.DEBUFFS.add('dislikeYou');
  Object.assign(HD.PW, {
    aim: { n: 'Sight', t: 'buff', d: (a) => `The next Reed you Loose deals ${a} more damage per hit.` },
    stretch: { n: 'Limber', t: 'buff', d: (a) => `The next time a card gives you Guard, gain ${a} more.` },
    impaled: { n: 'Transfixed', t: 'debuff', d: (a) => `A Reed is stuck in it. The Reed is Wrenched after its owner hits this enemy ${a} more time${a === 1 ? '' : 's'}.` },
    dislikeYou: { n: 'No Love Lost', t: 'debuff', d: (a) => `Takes ${a}% additional damage from Reeds you Loose this turn.` },
    barbs: { n: 'Bristles', t: 'buff', d: (a) => `${a} of your Spines fade at the start of your next turn.` },
    baton: { n: "Maestro's Wand", t: 'buff', d: () => 'Take 25% less attack damage until your next turn.' },
    quietus: { n: 'Last Rest', t: 'buff', d: (a) => `This turn, the next Reed you Loose deals ${a} times the damage.` },
    encore: { n: 'One More Song', t: 'debuff', d: () => 'You can only play 1 more card this turn.' },
    kiVerse: { n: 'La Stanza', t: 'buff', d: (a) => `The next ${a} Fa or Sol card(s) you play this turn are played an additional time.` },
    allIsWell: { n: 'All Is Fine', t: 'buff', d: (a) => `Whenever you create a Woe, gain ${a} Guard.` },
    archery: { n: 'Bowcraft', t: 'buff', d: (a) => `At the start of your turn, gain ${a} Sight.` },
    hiddenRoots: { n: 'Deep Roots', t: 'buff', d: (a) => `At the start of your turn, gain ${a} Limber.` },
    motif: { n: 'Theme', t: 'buff', d: (a) => `Whenever you gain a Refrain, draw ${a} card(s).` },
    serratedArrows: { n: 'Barbed Reeds', t: 'buff', d: (a) => `Transfixed enemies take ${a}% more damage from your Attacks.` },
    songPath: { n: 'Song Trail', t: 'buff', d: (a) => `Whenever you gain a Sol Refrain, gain ${a} Guard.` },
    tune: { n: 'In Tune', t: 'buff', d: (a) => `Whenever you gain a La Refrain, Upgrade ${a} random card(s) in your hand.` },
    violentChord: { n: 'Harsh Chord', t: 'buff', d: (a) => `Whenever you gain a Fa Refrain, deal ${a} damage to ALL enemies.` },
    ecstasy: { n: 'Rapture', t: 'buff', d: (a) => `At the start of your turn, Transform ${a} random Woe in your hand into Glee.` },
    ennui: { n: 'Listless', t: 'buff', d: (a) => `At the start of your turn, add Woe to your hand and draw ${a} additional cards.` },
    explosiveArrows: { n: 'Bursting Reeds', t: 'buff', d: (a) => `Whenever you Transfix an enemy, deal ${a} damage to ALL enemies.` },
    honing: { n: 'Whetting', t: 'buff', d: (a) => honingText(a) },
    lullaby: { n: 'Cradle Song', t: 'buff', d: (a) => `When you gain every Refrain, gain ${a} Guard.` },
    mythic: { n: 'Fabled Form', t: 'buff', d: (a) => `At the start of your turn, add ${a} random Omen(s) to your hand.` },
    simpleton: { n: 'Dullard', t: 'buff', d: (a) => `At the end of your turn, play the ${a === 1 ? '' : `${a} `}least expensive card${a === 1 ? '' : 's'} in your hand.` },
    yah: { n: 'Hup!', t: 'buff', d: (a) => `The first time you Wrench a Reed each turn, gain ${a} Energy.` },
    lostLute: { n: 'Lost Lyre', t: 'buff', d: (a) => `Whenever you gain a Refrain, play the top ${a === 1 ? 'card' : `${a} cards`} of your draw pile.` },
  });
  Object.assign(HD.TERMS, {
    Reed: 'Your arrow. Cards that Loose need one in hand. After you Loose it, it stays in the enemy until you Wrench it or the enemy dies.',
    Loose: 'Fire a Reed at an enemy. Every hit gets your Sight, then the Sight is spent and the enemy is Transfixed.',
    Transfixed: 'Your Reed is stuck in this enemy. It is Wrenched after you hit the enemy 3 more times.',
    Transfix: 'Loose a Reed into an enemy. It stays there until it is Wrenched.',
    Wrench: 'Take your Reed back out of a Transfixed enemy.',
    Sight: 'The next Reed you Loose deals that much more damage per hit. Then it is spent.',
    Limber: 'The next time a card gives you Guard, gain that much more. Then it is spent.',
    Refrain: 'Playing a Fa, Sol or La card starts that Refrain. Refrains last until the end of your turn.',
    Omen: 'Rare 0-cost cards with powerful one-time effects.',
  });
})();

// Combat engine. Pure logic; the UI talks to it through ui.choose / ui.fx / ui.pace.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const TICK = ['exposed', 'sapped', 'brittle', 'dampened', 'debilitate'];

  // Per-player combat state lives on a seat. The Combat reads and writes the active seat's copy under these names, so
  // engine code written for one player works for any of them. Everything else (enemies, turn, rng, log) is shared.
  const SEAT_KEYS = ['run', 'p', 'hand', 'draw', 'discard', 'ash', 'energy', 'maxEnergy', 't', 'rs', 'stars', 'orbs', 'orbSlots',
    'hadOrbSlots', 'osty', 'facing', 'current', 'ending', 'lostHpTimes', 'hpLostFirst', 'hpLostPhase', 'lastHurtTurn',
    'firstTurnEnergy', 'firstTurnDraw', 'extraDrawThisTurn', 'leftover', 'drawLocked', 'nibCard', 'lastAS', 'circuitSpent',
    'pendingKeepSwinging', 'endTurnAfterPlay', 'outbreakCount', 'maulBonus', 'pincer', 'playedCombat', 'burnedCount',
    'drawsCounted', 'drawnCombat', 'extraCardReward', 'turn'];
  // Enemy powers that grow with the party like HP does: Curl Up, Flutter, Plow, Rampart, Reattach, Regen (wiki list;
  // Hardened Shell, Shriek and Skittish are not built here).
  const MP_SCALED = ['curlUp', 'flutter', 'plow', 'rampart', 'reattach', 'regen'];
  const SHARED_KEYS = ['ui', 'kind', 'rng', 'mrng', 'encId', 'enc', 'round', 'queue', 'over', 'won', 'phase', 'enemies', 'log', 'leader', 'seats', 'seat'];

  class Combat {
    constructor(run, encId, ui, kind = 'monster') {
      this.ui = ui || HD.autoUI;
      this.kind = kind;
      this.rng = run.rng.combat;
      this.mrng = run.rng.monster;
      this.encId = encId;
      this.enc = HD.ENC[encId];
      this.round = 0; // rounds of the fight; each player also counts their own turns
      this.over = false;
      this.won = false;
      this.phase = 'start';
      this.enemies = [];
      this.log = [];
      this.seats = [];
      this.seat = this.addSeat(run);
    }
    // A player in this fight: their Run (deck, relics, potions, gold) and everything the fight tracks for them.
    addSeat(run) {
      const ch = HD.CHARS[run.charId];
      const s = { index: this.seats.length, run,
        p: { isPlayer: true, name: HD.charName(run.charId), hp: run.hp, maxHp: run.maxHp, block: 0, pw: {}, fresh: {} },
        turn: 0, maxEnergy: 3, energy: 0, draw: [], hand: [], discard: [], ash: [], t: this.freshTurn(),
        lostHpTimes: 0, hpLostFirst: false, hpLostPhase: 0, firstTurnEnergy: 0, firstTurnDraw: 0, extraDrawThisTurn: 0, leftover: 0,
        rs: {}, // per-combat relic flags
        stars: 0, // the Regent's second resource; carries over between turns, no cap
        orbs: [], // the Defect's Cells (orbs.js); index 0 is the rightmost
        orbSlots: (ch && ch.orbSlots) || 0 };
      s.hadOrbSlots = s.orbSlots > 0;
      Object.defineProperty(s.p, 'seat', { value: s }); // hidden, so saves and copies of the player never loop
      this.seats.push(s);
      return s;
    }
    // Runs fn as one player: every per-player name (p, hand, energy, run...) points at that seat until fn settles.
    async withSeat(s, fn) { const prev = this.seat; this.seat = s; try { return await fn(); } finally { this.seat = prev; } }
    // The same for a synchronous read, such as a cost or damage preview on the screen.
    asSeat(s, fn) { const prev = this.seat; this.seat = s; try { return fn(); } finally { this.seat = prev; } }
    get multi() { return this.seats.length > 1; }
    // Players still standing; and everyone an event concerns (the standing players, plus the active one even if they fell).
    living() { return this.seats.filter((s) => !s.dead); }
    party() { return this.seats.filter((s) => !s.dead || s === this.seat); }
    // The active player falls. The fight is lost only when every player has fallen.
    downed() {
      this.p.hp = 0; this.seat.dead = true; this.seat.ready = false;
      if (this.seats.every((s) => s.dead)) { this.over = true; this.won = false; }
    }

    // ---------- multiplayer scaling (wiki): enemy HP, Block and some powers grow with the party; attacks do not ----------
    // The act factor in tenths: 1.1 in Act 1, 1.2 after that, 1.3 for the Act 3 boss.
    mpFactor() { const act = this.seats[0].run.act || 1; return act === 1 ? 11 : act >= 3 && this.kind === 'boss' ? 13 : 12; }
    mpScale(n) { const k = this.seats.length; return k > 1 && n > 0 ? Math.floor((n * k * this.mpFactor()) / 10) : n; }
    mpPower(key, n) {
      const k = this.seats.length;
      if (k <= 1 || typeof n !== 'number') return n;
      if (key === 'plate') return n * ((k - 1) * 2 + 1);
      if (key === 'ward') return n + k - 1;
      if (key === 'slippery') return n * k;
      return MP_SCALED.includes(key) ? this.mpScale(n) : n;
    }
    mpPowers(init) { const pw = {}; for (const [key, n] of Object.entries(init || {})) pw[key] = this.mpPower(key, n); return pw; }

    // ---------- multiplayer actions ----------
    // One player's action as plain data (cards and enemies by uid), so it can travel. Actions resolve one at a time.
    act(i, a) {
      const go = () => this.withSeat(this.seats[i], () => this.doAct(a));
      this.queue = (this.queue || Promise.resolve()).then(go, go);
      return this.queue;
    }
    async doAct(a) {
      const foe = this.enemies.find((e) => e.uid === a.target) || null;
      if (a.k === 'play') { const c = this.hand.find((x) => x.uid === a.card); if (c) await this.playCard(c, foe); }
      else if (a.k === 'potion') await this.usePotion(a.slot, foe);
      else if (a.k === 'end') await this.endTurn();
      else if (a.k === 'unend') this.cancelEndTurn();
      await this.endRound(); // the last player still playing may have fallen
    }
    freshTurn() { return { cards: 0, attacks: 0, skills: 0, powers: 0, played: 0, types: new Set(), lostHp: false, burned: false, blockFromCard: false, starsGained: 0, starsSpent: 0, created: 0, energySpent: 0 }; }

    // ---------- setup ----------
    makeCard(id, up) { return { uid: HD.uid(), id, up: !!up, bonus: 0 }; }
    spawn(id, o = {}) {
      let d = HD.MON[id];
      const asc = (this.run && this.run.asc) || 0;
      const A = asc >= 8 && HD.ASC_MON ? (HD.ASC_MON['0.111'] || {})[id] : null;
      // Ascension 9 (Deadly Enemies): stronger attacks, per move, as in the data.
      if (A && A.atk && asc >= 9) d = Object.assign({}, d, { moves: Object.fromEntries(Object.entries(d.moves).map(([k, m]) => [k, A.atk[k] != null && m.atk != null ? Object.assign({}, m, { atk: A.atk[k] }) : m])) });
      // Ascension 8 (Tough Enemies): more HP.
      const hpr = A && A.hp ? A.hp : d.hp;
      const hp = this.mpScale(this.mrng.range(hpr[0], hpr[1]));
      const e = { uid: HD.uid(), id, def: d, name: d.name, hp, maxHp: hp, block: 0, pw: this.mpPowers(d.init),
        fresh: {}, hist: [], last: null, alive: true, intent: null, spawned: !!o.spawned };
      if (o.at != null) this.enemies.splice(o.at, 0, e); else this.enemies.push(e);
      return e;
    }
    async rh(name, ...args) {
      for (const r of this.run.relics.slice()) {
        const d = HD.RELICS[r.id];
        if (d && d[name]) { await d[name](this, r, ...args); if (this.over) return; }
      }
    }
    has(id) { return this.run.hasRelic(id); }
    async start() {
      const ids = this.enc.build ? this.enc.build(this.mrng) : this.enc.mons;
      for (const id of ids) this.spawn(id);
      if (this.enc.leader) this.leader = this.enemies.find((e) => e.id === this.enc.leader);
      for (const s of this.seats) this.asSeat(s, () => this.dealDeck());
      for (const e of this.enemies) { this.chooseIntent(e); if (e.pw.plate) e.block += e.pw.plate; }
      const mark = this.seats.find((s) => s.run.marked && s.run.marked.includes(s.run.pos));
      if (mark) { for (const e of this.enemies) e.hp = 1; mark.run.marked = mark.run.marked.filter((k) => k !== mark.run.pos); this.say('The marked foes are already half dead.'); }
      for (const s of this.seats) {
        await this.withSeat(s, async () => {
          if (this.enemies.some((e) => e.pw.backAttack)) { this.facing = this.enemies[0].uid; this.p.pw.surrounded = 1; }
          await this.rh('battleStart');
          this.refresh();
        });
        if (this.over) break;
      }
      this.checkEnd();
      if (!this.over) await this.startTurn();
    }

    // The active player's draw pile at the start of the fight: the deck shuffled, Opening cards on top.
    dealDeck() {
      const deck = this.rng.shuffle(this.run.deck.map((c) => Object.assign(this.makeCard(c.id, c.up), { src: c }, c.ench ? { ench: { ...c.ench } } : {}, c.rider ? { rider: c.rider } : {}, c.grow ? { grow: c.grow } : {})));
      if (this.has('PALE_SEED')) for (const c of deck) if (this.isCut(c) || CARDS[c.id].tags.includes('Brace')) c.addKw = ['Fleeting'];
      const opening = deck.filter((c) => HD.kwOf(c).includes('Opening'));
      this.draw = deck.filter((c) => !opening.includes(c)).concat(opening);
    }

    // ---------- queries ----------
    alive() { return this.enemies.filter((e) => e.alive); }
    randomEnemy() { const a = this.alive(); return a.length ? this.rng.pick(a) : null; }
    say(msg) { this.log.push(msg); if (this.log.length > 60) this.log.shift(); }
    emit(type, target, amount) { if (this.ui.fx) this.ui.fx(type, target, amount); }
    isCut(c) { return CARDS[c.id].tags.includes('Cut'); }
    countCuts() {
      const piles = [...this.draw, ...this.hand, ...this.discard];
      let n = piles.filter((c) => this.isCut(c)).length;
      if (this.current && this.isCut(this.current) && !piles.includes(this.current)) n++;
      return n;
    }
    canUpgrade(c) { return !c.up && ['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type); }
    upgradeInCombat(c) { c.up = true; }
    shrunk() { return this.p.pw.shrink && this.p.shrinkSrc && this.p.shrinkSrc.alive; }
    noPotions() { return this.run.potions.every((x) => !x); }

    costOf(c) {
      const d = CARDS[c.id];
      if (d.cost === 'X') return 'X';
      if (d.cost === null || d.cost === undefined) return null;
      let k = c.up && d.upCost != null ? d.upCost : d.cost;
      if (c.confCost != null) k = c.confCost;
      if (c.ench && HD.ENCH[c.ench.id].free) k = 0;
      if (c.sleepCut) k -= c.sleepCut;
      if (c.setCost != null && k > c.setCost) k = c.setCost;
      if (d.type === 'Power' && this.p.pw.curious) k -= this.p.pw.curious;
      if (d.type === 'Power' && this.has('SPIKED_GLOVES')) k += 1;
      if (this.has('BRIGHT_SCARF') && this.t && this.t.cards === 4 && this.hand.includes(c)) k = 0;
      if (c.costTurn != null) k = c.costTurn;
      if (c.bonusCost) k += c.bonusCost;
      if (d.costFn) k = d.costFn(this, c, k);
      for (const f of HD.COST_MODS || []) k = f(this, c, k, d);
      if (d.type === 'Attack' && this.p.pw.tangled) k += 1;
      if (d.type === 'Skill' && this.p.pw.freeSkill) k = 0;
      if (d.type === 'Power' && this.p.pw.freePower) k = 0;
      if (this.hollowFree() || c.freeTurn || c.freeCombat || (d.type === 'Attack' && this.p.pw.keepSwinging) || (d.type === 'Skill' && this.p.pw.rot)) k = 0;
      return Math.max(0, k);
    }
    canPlay(c) {
      if (this.over || this.phase !== 'player' || this.ending || this.seat.ready || this.seat.dead) return false;
      const d = CARDS[c.id];
      if (d.cost === null || HD.kwOf(c).includes('Unplayable')) return false;
      if (this.p.pw.ringing && this.t.cards >= 1) return false;
      if (this.t.cards >= 3 && this.hand.some((x) => x.id === 'ROUTINE')) return false;
      if (this.t.cards >= 6 && this.has('VELVET_COLLAR')) return false;
      if (c.bound && this.t.boundPlayed) return false;
      if (d.playIf && !d.playIf(this, c)) return false;
      if (c.id !== 'SPELLBOUND' && this.hand.some((x) => x.id === 'SPELLBOUND')) return false;
      const sc = this.starCostOf(c);
      if (sc !== 'X' && sc > this.stars) return false;
      if (d.cost === 'X') return true;
      return this.costOf(c) <= this.energy;
    }

    // ---------- damage math ----------
    atkDmg(base, t, c) {
      const d0 = c ? CARDS[c.id] : null;
      const isAtk = d0 && d0.type === 'Attack';
      let d = base;
      if (c && this.isCut(c) && this.has('PRACTICE_POST')) d += 3;
      if (isAtk && c.up && this.has('TOY_CANNON')) d += 3;
      if (c && CARDS[c.id].tags.includes('Shiv')) { d += this.p.pw.accuracy || 0; if (this.p.pw.ghostKnives && !(this.t && this.t.ghostUsed)) d += this.p.pw.ghostKnives; }
      const en = HD.enchOf(c);
      if (en && en.dmgAdd) d += en.dmgAdd(c.ench.n, c);
      if (isAtk && c.ench && this.has('ODD_LIGHTER')) d += 9;
      if (isAtk && this.p.pw.vigor) d += this.p.pw.vigor;
      d += (this.p.pw.might || 0) + (this.p.pw.mightTemp || 0);
      if (this.p.pw.sapped) d *= 0.75;
      if (this.shrunk()) d *= 0.7;
      if (t) {
        if ((t.pw.flutter || t.pw.soar) && isAtk) d *= 0.5;
        if (isAtk && t.pw.sapped && this.p.pw.huntersMark) d *= HD.trackingMult || 1.5;
        if (t.pw.exposed) d *= 1 + (this.has('PAPER_NEWT') ? 0.75 : 0.5) * (t.pw.debilitate ? 2 : 1) + (this.p.pw.merciless || 0) / 100;
        if (t.pw.slow) d *= 1 + 0.1 * this.t.played;
      }
      if (isAtk && this.p.pw.giga) d *= 3;
      // Lethality: the first Attack each turn (in hand: none played yet; resolving: it is the first).
      if (isAtk && this.p.pw.lethality && (this.t ? this.t.attacks : 0) <= (this.hand.includes(c) ? 0 : 1)) d *= 1 + this.p.pw.lethality / 100;
      if (d0 && d0.dmgMult) d *= d0.dmgMult(this, t, c);
      if (en && en.mult) d *= en.mult;
      if (isAtk && this.p.pw.doubleAtk) d *= 2;
      if (c && this.nibCard === c) d *= 2;
      return Math.max(0, Math.floor(d));
    }
    enemyDmg(e, base) {
      let d = base + (e.pw.might || 0) - (e.pw.mightDown || 0);
      if (e.pw.sapped) d *= 1 - (this.has('PAPER_CRANE') ? 0.4 : 0.25) * (e.pw.debilitate ? 2 : 1);
      if (e.pw.doom && e.pw.doom >= e.hp && this.has('DEATHLESS_SEAL')) d *= 0.5;
      if (e.pw.dampened) d *= 0.7;
      if (e.pw.backAttack && this.facing && this.facing !== e.uid && this.alive().some((x) => x.uid === this.facing)) d *= 1.5;
      if (this.p.pw.tainted) d += this.p.pw.tainted;
      if (this.p.pw.diadem) d *= 0.5;
      if (this.p.pw.exposed) d *= 1.5;
      if (this.p.pw.stoneStance && e.pw.exposed) d *= 0.5;
      return Math.max(0, Math.floor(d));
    }
    poise() { return (this.p.pw.poise || 0) + (this.p.pw.poiseTemp || 0) + (this.has('BUCKLE') && this.noPotions() ? 2 : 0); }
    blockPreview(n, c) {
      const en = HD.enchOf(c);
      let b = n + this.poise() + (en && en.blockAdd ? en.blockAdd(c.ench.n) : 0);
      if (this.p.pw.brittle) b *= 0.75;
      const d0 = c && CARDS[c.id];
      if (d0 && d0.blockMult) b *= d0.blockMult(this, c);
      return Math.max(0, Math.floor(b));
    }

    // ---------- effects used by cards, potions and relics ----------
    addPw(t, k, n) {
      if (t === this.p && (k === 'might' || k === 'mightTemp') && n > 0 && this.has('DENTED_HELM') && !this.rs.helm) { this.rs.helm = true; n *= 2; }
      t.pw[k] = (t.pw[k] || 0) + n;
      if (!t.pw[k]) delete t.pw[k];
    }
    async apply(t, k, n) {
      if (!t || !t.alive || n <= 0) return false;
      const debuff = HD.DEBUFFS.has(k);
      if (debuff && this.has('EERIE_LAMP') && this.current && !this.rs.lampUsed) { this.rs.lampUsed = true; this.rs.lampCard = this.current; }
      if (debuff && this.current && this.rs.lampCard === this.current) n *= 2;
      if (debuff && t.pw.ward) {
        t.pw.ward--; if (!t.pw.ward) delete t.pw.ward;
        this.say(`${t.name}'s Ward blocks ${HD.PW[k].n}.`);
        return false;
      }
      this.addPw(t, k, n);
      if (k === 'exposed' && this.p.pw.bloodhound) await this.drawCards(this.p.pw.bloodhound);
      if (debuff && !t.isPlayer && !this.over) await this.hook('debuffApplied', t, k, n);
      return true;
    }
    async applyToPlayer(k, n, src) {
      const p = this.p;
      if (k === 'shrink') { p.pw.shrink = 1; p.shrinkSrc = src; return; }
      if (k === 'constrict') { this.addPw(p, 'constrict', n); p.constrictSrc = src; return; }
      if (k === 'ringing') { p.pw.ringing = 1; return; }
      this.addPw(p, k, n);
      if (TICK.includes(k)) p.fresh[k] = true;
    }
    async attack(t, base, hits = 1, c = null) {
      let fatal = false;
      for (let i = 0; i < hits; i++) {
        if (!t || !t.alive || this.over) break;
        await this.damage(t, this.atkDmg(base, t, c), { attack: true, src: this.p });
        if (!t.alive && !t.pw.minion && !t.fled) fatal = true;
      }
      return { fatal };
    }
    async attackAll(base, hits, c = null) {
      for (let i = 0; i < hits; i++) {
        for (const e of this.alive()) { await this.damage(e, this.atkDmg(base, e, c), { attack: true, src: this.p }); if (this.over) return; }
      }
    }
    async damage(t, amount, o = {}) {
      if (this.over || (!t.isPlayer && (!t.alive || t.respawning)) || (t.isPlayer && t.seat.dead)) return 0;
      let dmg = Math.max(0, amount);
      if (t.pw.intangible) dmg = Math.min(dmg, 1);
      const blocked = Math.min(t.block, dmg);
      t.block -= blocked;
      dmg -= blocked;
      if (blocked) this.emit('block', t, blocked);
      if (t.isPlayer && o.attack && dmg > 0 && this.osty && this.osty.alive) dmg = await this.ostyAbsorb(dmg);
      // Burrowed creatures are knocked out when their Guard is broken.
      if (!t.isPlayer && t.pw.burrowed && blocked && t.block === 0) { delete t.pw.burrowed; t.forceIntent = 'STUN'; t.intent = 'STUN'; this.say(`${t.name} is dug out and dazed.`); }
      if (dmg > 0) await this.loseHp(t, dmg, o);
      else if (!blocked) this.emit('hit', t, 0);
      if (!t.isPlayer && o.attack && dmg > 0 && (o.src === this.p || o.osty) && !this.over) await this.hook('attackDealt', t, dmg, o);
      if (t.isPlayer && o.attack && dmg > 0 && this.p.pw.gambit && !this.over) { this.say('You went all in, and lost.'); this.downed(); return dmg; }
      if (t.isPlayer && o.src && o.attack && dmg > 0 && !this.over) {
        if (o.src.pw.paperCuts) { this.p.maxHp = Math.max(1, this.p.maxHp - o.src.pw.paperCuts); this.p.hp = Math.min(this.p.hp, this.p.maxHp); this.say(`You lose ${o.src.pw.paperCuts} Max HP.`); }
        if (o.src.pw.painfulStabs) this.addStatus({ id: 'GASH', n: o.src.pw.painfulStabs, to: 'discard' });
      }
      if (!t.isPlayer && o.attack && o.src === this.p && dmg > 0 && this.p.pw.venomous && t.alive) await this.applyToxin(t, this.p.pw.venomous);
      if (!t.isPlayer && o.attack && o.src === this.p) t.hitsTurn = (t.hitsTurn || 0) + 1;
      if (!t.isPlayer && o.attack && o.src === this.p && this.p.pw.royalStare && t.alive) await this.apply(t, 'mightDown', this.p.pw.royalStare);
      if (t.isPlayer && o.attack && blocked > 0 && this.p.pw.reflect && o.src && !o.src.isPlayer && o.src.alive && !this.over) await this.damage(o.src, blocked, {});
      if (!t.isPlayer && o.attack && o.src === this.p && !this.over) {
        if (t.pw.flutter) { t.flutterHits = (t.flutterHits || 0) + 1; if (t.flutterHits >= t.pw.flutter) { delete t.pw.flutter; t.flutterHits = 0; t.forceIntent = 'STUN'; t.intent = 'STUN'; this.say(`${t.name} is knocked out of the air.`); } }
        if (t.pw.personalHive) this.addStatus({ id: 'REELING', n: t.pw.personalHive, to: 'draw' });
        if (t.pw.spines && this.p.hp > 0) await this.damage(this.p, t.pw.spines, {});
      }
      if (t.isPlayer && o.attack && o.src && o.src.alive && !this.over) {
        if (this.p.pw.spines) await this.damage(o.src, this.p.pw.spines, {});
        if (this.p.pw.fireWall && o.src.alive) await this.damage(o.src, this.p.pw.fireWall, {});
      }
      return dmg;
    }
    async loseHp(t, n, o = {}) {
      if (n <= 0 || this.over) return;
      if (!t.isPlayer) {
        if (t.pw.slippery) { n = 1; t.pw.slippery--; if (!t.pw.slippery) delete t.pw.slippery; }
        if (t.pw.hardToKill) n = Math.min(n, t.pw.hardToKill);
        if (t.pw.intangible) n = Math.min(n, 1);
        t.hp -= n;
        if (t.hp <= 0 && t.pw.adaptable && (t.respawns || 0) < 2) {
          t.hp = 0; t.respawning = true; t.block = 0; t.pw = { adaptable: 1 }; t.forceIntent = null; t.intent = 'RESPAWN';
          this.emit('hit', t, n); this.say(`${t.name} collapses... and begins to change.`);
          return;
        }
        if (t.pw.curlUp && t.hp > 0) { t.block += t.pw.curlUp; delete t.pw.curlUp; this.say(`${t.name} curls up.`); }
        if (t.pw.slumber && t.hp > 0) this.slumberTick(t);
        this.emit('hit', t, n);
        if (t.pw.plow && t.hp > 0 && t.hp <= t.pw.plow) {
          delete t.pw.plow; delete t.pw.might;
          t.broken = true; t.forceIntent = 'STUN'; t.intent = 'STUN';
          this.say(`${t.name} staggers and loses its Might.`);
        }
        if (t.hp <= 0) await this.kill(t);
        return;
      }
      const p = this.p;
      if (p.pw.buffer && !o.direct) { this.addPw(p, 'buffer', -1); this.emit('block', p, n); return; }
      if (this.has('LEAD_ROD')) { n -= 1; if (n <= 0) return; }
      if (this.has('LAST_HEARTBEAT')) { n = Math.min(n, 20 - this.hpLostPhase); if (n <= 0) return; }
      this.hpLostPhase += n;
      p.hp -= n;
      this.lastHurtTurn = this.turn;
      this.emit('hit', p, n);
      this.lostHpTimes++;
      if (this.phase === 'player') this.t.lostHp = true;
      if (this.has('KNITTING_CLAY')) this.addPw(p, 'nextBlock', 3);
      if (p.hp <= 0) {
        const jar = this.run.potions.indexOf('MOTH_JAR');
        if (jar >= 0) { this.run.potions[jar] = null; p.hp = Math.max(1, Math.floor(p.maxHp * 0.3)); this.say('The moth breaks free and you rise.'); }
        else if (this.has('SHED_TAIL') && !this.run.relic('SHED_TAIL').used) { this.run.relic('SHED_TAIL').used = true; p.hp = Math.max(1, Math.floor(p.maxHp * 0.5)); this.say('You shed your tail and live.'); }
        else { this.downed(); return; }
      }
      if (!this.hpLostFirst) { this.hpLostFirst = true; if (this.has('KNOT_BOX')) await this.drawCards(3); }
      if (this.phase === 'player') {
        if (this.has('FORKED_TONGUE') && !this.rs.tongue) { this.rs.tongue = true; this.heal(n); }
        if (p.pw.splitSkin) this.addPw(p, 'might', p.pw.splitSkin);
        if (p.pw.fever) for (const e of this.alive()) await this.damage(e, p.pw.fever, {});
      }
      this.refresh();
    }
    // Relic states that depend on HP or inventory.
    refresh() {
      if (!this.has('CRACKED_SKULL')) return;
      const low = this.p.hp <= this.p.maxHp / 2;
      if (low && !this.rs.skull) { this.rs.skull = true; this.p.pw.might = (this.p.pw.might || 0) + 3; }
      else if (!low && this.rs.skull) { this.rs.skull = false; this.p.pw.might = (this.p.pw.might || 0) - 3; if (!this.p.pw.might) delete this.p.pw.might; }
    }
    async kill(e) {
      e.hp = 0; e.alive = false; e.block = 0;
      this.say(`${e.name} is slain.`);
      if (e.pw.stock > 0 && !e.fled) {
        const n = this.spawn(e.id, { at: this.enemies.indexOf(e) + 1 });
        n.respawns = (e.respawns || 0) + 1;
        n.maxHp += 10 * n.respawns; n.hp = n.maxHp;
        n.pw = { stock: e.pw.stock - 1 }; if (!n.pw.stock) delete n.pw.stock;
        this.chooseIntent(n);
        this.say(`A new ${e.name} rolls in to take its place.`);
      }
      if (e.pw.infested) {
        const at = this.enemies.indexOf(e) + 1;
        for (let i = 0; i < e.pw.infested; i++) this.chooseIntent(this.spawn('SQUIRMER', { spawned: true, at: at + i }));
      }
      if (e.pw.illusion && this.leader && this.leader.alive) e.reviveTurn = this.round + 1;
      if (e.pw.reattach && this.alive().some((x) => x.pw.reattach)) { e.reviveTurn = this.round + 2; e.reviveHp = e.pw.reattach; }
      this.giveBack(e);
      for (const x of this.alive()) if (x.pw.crabRage) { this.addPw(x, 'might', 6); x.block += 99; this.say(`${x.name} flies into a rage.`); }
      if (this.leader === e) {
        for (const x of this.enemies) { if (!x.reviveHp) x.reviveTurn = null; if (x !== e && x.alive && x.pw.minion) { x.alive = false; x.fled = true; this.say(`${x.name} flees.`); } }
      }
      for (const s of this.party()) await this.withSeat(s, () => this.hook('onEnemyDeath', e));
      this.checkEnd();
    }
    // What an enemy takes from the active player (Might, Poise, Gold) goes back to that player when it dies.
    seize(e, key, n) {
      const took = (e.took = e.took || {});
      const mine = (took[this.seat.index] = took[this.seat.index] || {});
      mine[key] = (mine[key] || 0) + n;
    }
    giveBack(e) {
      for (const s of this.seats) {
        const t = e.took && e.took[s.index];
        if (!t) continue;
        this.asSeat(s, () => {
          if (t.might) { this.addPw(this.p, 'might', t.might); this.say('Your Might returns.'); }
          if (t.poise) { this.addPw(this.p, 'poise', t.poise); this.say('Your Poise returns.'); }
          if (t.gold) { this.run.gold += t.gold; this.say(`You take back ${t.gold} Gold.`); }
        });
      }
      e.took = null; e.stolenMight = 0; e.stolenPoise = 0; e.stolen = 0;
    }
    checkEnd() {
      if (this.over) return;
      for (const s of this.seats) if (s.p.hp <= 0) s.dead = true;
      if (this.seats.every((s) => s.dead)) { this.over = true; this.won = false; }
      else if (!this.alive().length) {
        this.over = true; this.won = true;
        for (const s of this.living()) this.asSeat(s, () => {
          for (const f of (HD.ENGINE_HOOKS && HD.ENGINE_HOOKS.combatWon) || []) f(this);
          if (this.p.pw.improvement) { const xs = this.run.deck.filter((c) => !c.up && ['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type)); for (let i = 0; i < this.p.pw.improvement && xs.length; i++) this.run.upgrade(xs.splice(this.rng.int(xs.length), 1)[0]); }
        });
      }
    }
    async gainBlock(n, fromCard) {
      let b = n;
      if (fromCard) {
        if (this.p.pw.noCardBlock) return;
        if (this.p.pw.fasten && this.current && CARDS[this.current.id].tags.includes('Brace')) n += this.p.pw.fasten;
        b = this.blockPreview(n, this.current);
        if (this.p.pw.shadowMerge) b *= 2 ** this.p.pw.shadowMerge;
        const legion = this.run.relic('OLD_LEGION');
        if (legion && !legion.sleep) { b *= 2; legion.sleep = 2; }
        if (this.p.pw.standFirm && !this.t.blockFromCard) b *= 2;
        if (this.has('ARM_GUARD') && !this.rs.armGuard) { this.rs.armGuard = true; b *= 2; }
        this.t.blockFromCard = true;
      }
      if (b <= 0) return;
      this.p.block = Math.min(999, this.p.block + b);
      this.emit('guard', this.p, b);
      if (this.p.pw.siege) { const e = this.randomEnemy(); if (e) await this.damage(e, this.p.pw.siege, {}); }
    }
    async selfLoseHp(n) { await this.loseHp(this.p, n, { direct: true }); }
    heal(n) { if (n <= 0) return; this.p.hp = Math.min(this.p.maxHp, this.p.hp + n); this.emit('heal', this.p, n); this.refresh(); }
    gainMaxHp(n) { this.p.maxHp += n; this.p.hp += n; this.refresh(); }
    gainEnergy(n) { if (!this.p.pw.noEnergy) this.energy += n; }

    // ---------- piles ----------
    async reshuffle() {
      this.draw = this.rng.shuffle(this.discard.splice(0));
      const fit = this.draw.filter((c) => c.ench && c.ench.id === 'PERFECT_FIT');
      if (fit.length) this.draw = this.draw.filter((c) => !fit.includes(c)).concat(fit);
      await this.rh('onShuffle');
      for (let i = 0; i < (this.p.pw.stratagem || 0) && this.draw.length && this.hand.length < 10; i++) {
        const [x] = await this.choose({ from: this.draw.slice(), n: 1, prompt: 'Scheme: put a card into your hand' });
        if (x) { this.draw.splice(this.draw.indexOf(x), 1); this.hand.push(x); }
      }
    }
    async drawCards(n) { for (let i = 0; i < n; i++) { const c = await this.drawOne(); if (!c) break; } }
    async drawOne() {
      if (this.p.pw.noDraw || this.hand.length >= 10) return null;
      if (!this.draw.length) {
        if (!this.discard.length) return null;
        await this.reshuffle();
      }
      if (this.drawLocked) return null;
      const c = this.draw.pop();
      if (!c) return null;
      if ((this.p.pw.confused || (c.ench && c.ench.id === 'SLITHER')) && typeof CARDS[c.id].cost === 'number') c.confCost = this.rng.int(4);
      this.drawnCombat = (this.drawnCombat || 0) + 1;
      if (this.phase === 'player' && this.p.pw.quicksilver) for (const e of this.alive()) await this.damage(e, this.p.pw.quicksilver, {});
      if (this.phase === 'player' && this.p.pw.acidTide) for (const e of this.alive()) await this.applyToxin(e, this.p.pw.acidTide);
      if (this.p.pw.automation) { this.drawsCounted = (this.drawsCounted || 0) + 1; if (this.drawsCounted % 10 === 0) this.gainEnergy(this.p.pw.automation); }
      if (this.p.pw.chains && this.phase === 'player' && (this.t.drawn || 0) < this.p.pw.chains) { c.bound = true; this.t.drawn = (this.t.drawn || 0) + 1; }
      this.hand.push(c);
      if (CARDS[c.id].onDraw && !this.over) await CARDS[c.id].onDraw(this, c);
      if (!this.over) await this.hook('drawn', c);
      if (this.p.pw.endlessCuts && this.isCut(c) && this.alive().length && this.phase === 'player') {
        this.hand.splice(this.hand.indexOf(c), 1);
        await this.autoPlay(c, {});
      }
      return c;
    }
    async takeTopOfDraw() {
      if (!this.draw.length) {
        if (!this.discard.length) return null;
        await this.reshuffle();
      }
      return this.draw.pop() || null;
    }
    addToHand(c) { if (this.hand.length < 10) this.hand.push(c); else this.discard.push(c); }
    addStatus(s) {
      for (let i = 0; i < s.n; i++) {
        const c = this.makeCard(s.id, false);
        if (s.to === 'draw') this.draw.splice(this.rng.int(this.draw.length + 1), 0, c);
        else if (s.to === 'hand') this.addToHand(c);
        else this.discard.push(c);
      }
    }
    async burn(c) {
      this.ash.push(c);
      this.burnedCount = (this.burnedCount || 0) + 1;
      this.t.burned = true;
      if (this.p.pw.numb) await this.gainBlock(this.p.pw.numb, false);
      if (this.p.pw.ashHarvest) await this.drawCards(this.p.pw.ashHarvest);
      const d = CARDS[c.id];
      if (d.onBurn) await d.onBurn(this, c);
      await this.rh('onBurn', c);
    }
    async burnRandomFromHand(n) {
      for (let i = 0; i < n && this.hand.length; i++) {
        const c = this.rng.pick(this.hand);
        this.hand.splice(this.hand.indexOf(c), 1);
        await this.burn(c);
      }
    }
    async burnChosen(n) {
      if (!this.hand.length) return;
      const picks = await this.choose({ from: this.hand.slice(), n, prompt: 'Choose a card to Burn' });
      for (const c of picks) { const i = this.hand.indexOf(c); if (i >= 0) { this.hand.splice(i, 1); await this.burn(c); } }
    }
    // The engine, not the UI, enforces how many cards a choice may take.
    async choose(o) {
      const n = Math.min(o.n, o.from.length);
      const min = Math.min(o.min != null ? o.min : n, n);
      const got = await this.ui.choose(this, o);
      const picks = [...new Set(got || [])].filter((c) => o.from.includes(c)).slice(0, n);
      for (const c of o.from) { if (picks.length >= min) break; if (!picks.includes(c)) picks.push(c); }
      return picks;
    }
    // Toxin (Poison): Lizard Skull adds 1 to every application.
    async applyToxin(t, n) {
      if (!t || !t.alive || n <= 0) return;
      await this.apply(t, 'toxin', n + (this.has('LIZARD_SKULL') ? 1 : 0));
      if (this.p.pw.outbreak) { this.outbreakCount = (this.outbreakCount || 0) + 1; if (this.outbreakCount % 3 === 0) for (const e of this.alive()) await this.damage(e, this.p.pw.outbreak, {}); }
    }
    // A Toxin tick: lose HP equal to Toxin (ignores Guard), then Toxin drops by 1. Quickening adds extra ticks.
    async toxinTick(e) {
      for (let i = 0; i < 1 + this.seats.reduce((a, x) => a + (x.p.pw.quickening || 0), 0) && e.alive && e.pw.toxin; i++) {
        await this.loseHp(e, e.pw.toxin);
        if (e.alive && e.pw.toxin) this.addPw(e, 'toxin', -1);
        if (this.over) return;
      }
    }
    // Discarding from hand during your turn: Furtive cards play themselves; Finger Bells and Thick Wraps trigger.
    async discardFromHand(c) {
      const i = this.hand.indexOf(c); if (i < 0) return;
      this.hand.splice(i, 1);
      this.t.discarded = (this.t.discarded || 0) + 1;
      if (this.has('FINGER_BELLS')) { const e = this.randomEnemy(); if (e) await this.damage(e, 3, {}); }
      if (this.has('THICK_WRAPS')) await this.gainBlock(3, false);
      if (HD.kwOf(c).includes('Furtive') && !this.over) { this.say(`${CARDS[c.id].name} slips out and plays itself.`); c.freeTurn = true; await this.autoPlay(c, {}); }
      else this.discard.push(c);
    }
    async discardChoice(n, prompt) {
      if (!this.hand.length || n <= 0) return [];
      const xs = this.hand.length <= n ? this.hand.slice() : await this.choose({ from: this.hand.slice(), n, prompt: prompt || `Discard ${n} card${n > 1 ? 's' : ''}` });
      for (const x of xs) { await this.discardFromHand(x); if (this.over) break; }
      return xs;
    }
    addSlivers(n, up) { for (let i = 0; i < n; i++) this.addToHand(this.makeCard('SLIVER', !!up)); }
    // End of turn: is the whole hand kept, and does this card stay? (The screen uses these too, so retained cards never animate out.)
    handKept() { const p = this.p; return (this.turn === 1 && this.has('CHIME')) || !!p.pw.retainHand || this.has('GLYPH_PYRAMID') || !!this.t.keepHand || !!p.pw.carefulPlans; }
    cardRetained(c) { return !!c.retainTurn || HD.kwOf(c).includes('Retain') || !!(this.p.pw.ghostKnives && CARDS[c.id].tags.includes('Shiv')); }
    staysAtEndOfTurn(c, keep = this.handKept(), hexed = this.alive().some((x) => x.pw.hex)) {
      if (hexed || HD.kwOf(c).includes('Fleeting')) return false;
      return keep || this.cardRetained(c);
    }
    // ---------- shared hooks: relics (rh) plus anything registered in HD.ENGINE_HOOKS[name] ----------
    async hook(name, ...args) {
      await this.rh(name, ...args);
      for (const f of (HD.ENGINE_HOOKS && HD.ENGINE_HOOKS[name]) || []) { if (this.over) return; await f(this, ...args); }
    }
    // ---------- Stars ----------
    hollowFree() { return !!this.p.pw.hollowForm && this.phase === 'player' && this.t.cards < this.p.pw.hollowForm; }
    starCostOf(c) {
      const d = CARDS[c.id];
      if (d.star === 'X') return 'X';
      if (d.star == null || this.hollowFree()) return 0;
      const k = (c.up && d.upStar != null ? d.upStar : d.star) + (c.starBonus || 0);
      return Math.max(0, k);
    }
    async gainStars(n) {
      if (n <= 0 || this.over) return;
      this.stars += n; this.t.starsGained += n;
      this.emit('stars', this.p, n);
      await this.hook('starsGained', n);
    }
    async spendStars(n) {
      if (n <= 0 || this.over) return;
      this.stars = Math.max(0, this.stars - n); this.t.starsSpent += n; this.rs.starsSpent = (this.rs.starsSpent || 0) + n;
      await this.hook('starsSpent', n);
    }
    // ---------- creating cards: anything new added to a pile mid-combat (status cards do not count) ----------
    async create(c, where = 'hand') {
      if (where === 'hand') this.addToHand(c);
      else if (where === 'drawTop') this.draw.push(c);
      else if (where === 'draw') this.draw.splice(this.rng.int(this.draw.length + 1), 0, c);
      else this.discard.push(c);
      if (CARDS[c.id].type === 'Status') { await this.hook('statusCreated', c); return c; }
      this.t.created++; this.rs.created = (this.rs.created || 0) + 1;
      await this.hook('created', c);
      return c;
    }
    // Transform a card where it sits; the new card counts as created.
    async transformInCombat(c, id, up) {
      const n = this.makeCard(id, !!up);
      for (const pile of [this.hand, this.draw, this.discard, this.ash]) {
        const i = pile.indexOf(c);
        if (i >= 0) { pile[i] = n; if (CARDS[n.id].type !== 'Status') { this.t.created++; this.rs.created = (this.rs.created || 0) + 1; await this.hook('created', n); } return n; }
      }
      return null;
    }
    // ---------- Forge and the Sovereign Blade ----------
    blades(includeAsh = true) { return [...this.hand, ...this.draw, ...this.discard, ...(includeAsh ? this.ash : []), ...(this.current && this.current.id === 'REGAL_BLADE' ? [this.current] : [])].filter((c, i, a) => c.id === 'REGAL_BLADE' && a.indexOf(c) === i); }
    async forge(n) {
      if (n <= 0 || this.over) return;
      // The first Forge (or the first after every Blade left the deck) creates a new Blade at 10 + n in hand.
      if (!this.blades(false).length) {
        const b = this.makeCard('REGAL_BLADE', false); b.forged = 0;
        for (const x of this.ash.filter((y) => y.id === 'REGAL_BLADE')) x.forged = (x.forged || 0) + n;
        b.forged = n;
        await this.create(b, 'hand');
      } else {
        for (const b of this.blades(true)) b.forged = (b.forged || 0) + n;
      }
      this.rs.forged = (this.rs.forged || 0) + n;
      this.emit('forge', this.p, n);
      await this.hook('forged', n);
    }
    // Play a card several times from wherever it is, then settle it once (Decisions, Decisions).
    async playTimes(c, times, tg) {
      for (const pile of [this.hand, this.draw, this.discard]) { const i = pile.indexOf(c); if (i >= 0) { pile.splice(i, 1); break; } }
      const d = CARDS[c.id];
      for (let i = 0; i < times && !this.over; i++) { this.count(d); await this.resolve(c, d.target === 'enemy' ? (tg && tg.alive ? tg : this.randomEnemy()) : null, 0); this.t.played++; }
      if (!this.over) await this.settle(c, false);
    }
    randomPoolCard(filter) { return this.rng.pick(HD.POOL(this.run.color).filter(filter)).id; }
    // Whirligig: refill an empty hand during your turn.
    async topCheck() {
      if (this.has('WHIRLIGIG') && this.phase === 'player' && !this.ending && !this.over && !this.hand.length && (this.draw.length || this.discard.length)) await this.drawOne();
    }

    // ---------- playing cards ----------
    async resolve(c, tg, x) {
      const d = CARDS[c.id];
      const en = HD.enchOf(c);
      let times = 1 + (c.replay || 0) + (en && en.replay ? en.replay(c) : 0);
      if (this.has('HURLING_AXE') && !this.rs.axe) { this.rs.axe = true; times++; }
      if (d.type === 'Skill' && this.p.pw.doubleTake) { times++; this.addPw(this.p, 'doubleTake', -1); }
      if (d.type === 'Attack' && this.p.pw.echo) { times++; this.addPw(this.p, 'echo', -1); }
      if (this.p.pw.duplicate) { times++; this.addPw(this.p, 'duplicate', -1); }
      if (this.p.pw.echoForm && (this.t.echoed || 0) < this.p.pw.echoForm) { times++; this.t.echoed = (this.t.echoed || 0) + 1; }
      if (d.type === 'Power' && this.p.pw.signalBoost) { times++; this.addPw(this.p, 'signalBoost', -1); }
      const prev = this.current;
      this.current = c;
      for (let i = 0; i < times; i++) {
        let t = tg;
        if (d.target === 'enemy' && (!t || !t.alive)) t = this.randomEnemy();
        if (d.target === 'enemy' && !t) break;
        await d.play(this, c, t, HD.vals(c), x);
        if (this.over) break;
      }
      if (en && en.after && !this.over) { this.current = c; await en.after(this, c, tg, c.ench.n); }
      this.current = prev;
      c.sleepCut = 0;
      if (d.type === 'Attack') {
        delete this.p.pw.vigor;
        if (this.p.pw.giga) this.addPw(this.p, 'giga', -1);
        if (this.nibCard === c) this.nibCard = null;
      }
      if (this.over) return;
      if (d.type === 'Attack') {
        if (this.p.pw.seethe) await this.gainBlock(this.p.pw.seethe, false);
        if (this.p.pw.showboat && this.t.attacks === 3) for (let i = 0; i < this.p.pw.showboat; i++) this.addToHand(this.makeCard(c.id, c.up));
      }
      if (this.pendingKeepSwinging) { this.pendingKeepSwinging = false; this.p.pw.keepSwinging = 1; }
    }
    async settle(c, forceBurn) {
      const d = CARDS[c.id];
      c.freeTurn = false;
      if (d.type === 'Power') return;
      const to = d.settleTo && !forceBurn ? d.settleTo(this, c) : null;
      if (to === 'hand') { this.addToHand(c); return; }
      if (to === 'drawTop') { this.draw.push(c); return; }
      if (forceBurn || HD.kwOf(c).includes('Burn') || (this.p.pw.rot && d.type === 'Skill')) await this.burn(c);
      else if (this.p.pw.nostalgia && !this.t.nostalgia && (d.type === 'Attack' || d.type === 'Skill')) { this.t.nostalgia = true; this.draw.push(c); }
      else this.discard.push(c);
    }
    count(d) {
      this.t.cards++;
      this.playedCombat = (this.playedCombat || 0) + 1;
      this.t.types.add(d.type);
      if (d.type === 'Attack') this.t.attacks++;
      if (d.type === 'Skill') this.t.skills++;
      if (d.type === 'Power') this.t.powers++;
    }
    async playCard(c, tg) {
      if (!this.canPlay(c)) return false;
      const d = CARDS[c.id];
      let x = 0, paid = 0;
      if (d.cost === 'X') { x = this.energy + (this.has('UNKNOWN_REAGENT') ? 2 : 0); paid = this.energy; this.energy = 0; }
      else { paid = this.costOf(c); this.energy -= paid; }
      const sc = this.starCostOf(c);
      const starsPaid = sc === 'X' ? this.stars : sc;
      if (sc === 'X') x = starsPaid;
      if (paid > 0) { this.t.energySpent += paid; await this.hook('energySpent', paid); }
      if (starsPaid > 0) await this.spendStars(starsPaid);
      if (d.type === 'Attack' && this.p.pw.keepSwinging) delete this.p.pw.keepSwinging;
      if (d.type === 'Attack' && this.has('QUILL_NIB')) { const r = this.run.relic('QUILL_NIB'); r.counter = (r.counter || 0) + 1; if (r.counter >= 10) { r.counter = 0; this.nibCard = c; } }
      this.hand.splice(this.hand.indexOf(c), 1);
      this.count(d);
      c.confCost = null;
      if (tg && !tg.isPlayer) this.facing = tg.uid;
      if (this.p.pw.tender) { this.addPw(this.p, 'mightTemp', -this.p.pw.tender); this.addPw(this.p, 'poiseTemp', -this.p.pw.tender); }
      if (d.type === 'Skill') { const spark = this.alive().reduce((a, x) => a + (x.pw.vitalSpark || 0), 0); if (spark) this.addPw(this.p, 'tainted', spark); }
      if (d.type === 'Skill') for (const x of this.alive()) if (x.pw.enrage) this.addPw(x, 'might', x.pw.enrage);
      if (c.bound) this.t.boundPlayed = true;
      if (d.type === 'Skill' && this.p.pw.freeSkill && !c.freeTurn) delete this.p.pw.freeSkill;
      if (d.type === 'Power' && this.p.pw.freePower && !c.freeTurn) this.addPw(this.p, 'freePower', -1);
      if (d.type === 'Attack' || d.type === 'Skill') this.lastAS = { id: c.id, up: c.up };
      for (const e of this.alive()) if (e.pw.choked) await this.loseHp(e, e.pw.choked);
      if (this.over) return true;
      if (d.type === 'Power') { const z = this.alive().reduce((a, x) => a + (x.pw.galvanic || 0), 0); if (z) await this.damage(this.p, z, {}); if (this.over) return true; }
      this.say(`You play ${d.name}${c.up ? '+' : ''}.`);
      await this.resolve(c, tg, x);
      this.t.played++;
      if (!this.over) await this.settle(c, false);
      if (!this.over) await this.rh('afterPlay', c, d, paid);
      if (!this.over) for (const f of (HD.ENGINE_HOOKS && HD.ENGINE_HOOKS.afterPlay) || []) { await f(this, c, d, paid); if (this.over) break; }
      if (this.endTurnAfterPlay && !this.over) { this.endTurnAfterPlay = false; this.checkEnd(); if (!this.over) await this.endTurn(); return true; }
      if (!this.over && this.p.pw.echoImage) await this.gainBlock(this.p.pw.echoImage, false);
      if (!this.over && this.p.pw.coiled) { const e = this.randomEnemy(); if (e) await this.damage(e, this.p.pw.coiled, {}); }
      if (!this.over && CARDS[c.id].tags.includes('Shiv')) { this.t.ghostUsed = true; if (this.has('SPIRAL_DART')) this.addPw(this.p, 'poiseTemp', 1); }
      if (d.type === 'Skill' && this.p.pw.mastermind) c.addKw = (c.addKw || []).concat(['Furtive']);
      if (!this.over && d.type === 'Attack') for (let i = 0; i < (this.p.pw.calamity || 0); i++) this.addToHand(this.makeCard(this.randomPoolCard((x) => x.type === 'Attack'), false));
      if (!this.over && this.p.pw.panache && this.t.cards % 5 === 0) for (const e of this.alive()) await this.damage(e, this.p.pw.panache, {});
      this.checkEnd();
      await this.topCheck();
      return true;
    }
    async autoPlay(c, o = {}) {
      const d = CARDS[c.id];
      if (d.cost === null || HD.kwOf(c).includes('Unplayable')) {
        if (o.burn) await this.burn(c); else this.discard.push(c);
        return;
      }
      this.count(d);
      this.say(`${d.name}${c.up ? '+' : ''} plays itself.`);
      await this.resolve(c, d.target === 'enemy' ? (o.target && o.target.alive ? o.target : this.randomEnemy()) : null, 0);
      this.t.played++;
      if (!this.over) await this.settle(c, !!o.burn);
      if (!this.over) await this.rh('afterPlay', c, d, 0);
      this.checkEnd();
    }

    // ---------- potions ----------
    potionTarget(i) { const d = HD.POTIONS[this.run.potions[i]]; return d ? d.target : null; }
    canUsePotion(i) {
      const d = HD.POTIONS[this.run.potions[i]];
      return !!d && !d.passive && !this.over && this.phase === 'player' && !this.ending && !this.seat.ready && !this.seat.dead;
    }
    async usePotion(i, tg) {
      if (!this.canUsePotion(i)) return false;
      const d = HD.POTIONS[this.run.potions[i]];
      if (d.target === 'enemy' && (!tg || !tg.alive)) tg = this.randomEnemy();
      if (tg && d.target === 'enemy') this.facing = tg.uid;
      this.run.potions[i] = null;
      this.say(`You drink ${d.name}.`);
      await d.use(this, tg);
      if (!this.over) await this.rh('onPotion', d);
      this.checkEnd();
      await this.topCheck();
      return true;
    }

    // ---------- turn flow ----------
    // A new round: every standing player's turn starts together, in seat order.
    async startTurn() {
      if (this.over) return;
      this.round++;
      this.phase = 'player';
      for (const s of this.seats) { s.ready = false; s.ended = false; }
      const seats = this.living();
      for (const s of seats) { await this.withSeat(s, () => this.seatTurnStart(s === seats[0])); if (this.over) return; }
    }
    // One player's start of turn. The lead (the first standing player) also runs the enemies' upkeep for the round.
    async seatTurnStart(lead) {
      if (this.over) return;
      this.turn++;
      this.hpLostPhase = 0;
      this.t = this.freshTurn();
      const p = this.p;
      delete p.pw.stoneStance; delete p.pw.fireWall; delete p.pw.tainted; delete p.pw.diadem;
      if (p.pw.intangible) this.addPw(p, 'intangible', -1);
      this.drawLocked = false;
      if (p.pw.shrink && !this.shrunk()) delete p.pw.shrink;
      if (lead) for (const e of this.enemies) {
        const canRevive = e.reviveHp ? this.alive().some((x) => x.pw.reattach) : this.leader && this.leader.alive;
        if (!e.alive && !e.fled && e.reviveTurn != null && e.reviveTurn <= this.round && canRevive) {
          e.alive = true; e.hp = Math.min(e.maxHp, e.reviveHp || e.maxHp); e.block = 0; e.reviveTurn = null; e.reviveHp = 0;
          this.chooseIntent(e);
          this.say(`${e.name} re-forms.`);
        }
      }
      const keepT2 = (this.turn === 2 && this.has('DIAMOND_CROWN') && HD.RELICS.DIAMOND_CROWN.keepT2) || p.pw.smear;
      if (p.pw.smear) this.addPw(p, 'smear', -1);
      delete p.pw.doubleAtk;
      if (p.pw.shadeStepNext) { p.pw.doubleAtk = 1; this.addPw(p, 'shadeStepNext', -1); }
      if (this.turn > 1 && !p.pw.rampart && !keepT2) p.block = this.has('VISE_CLAMP') ? Math.min(p.block, 10) : 0;
      if (this.turn > 1 && p.pw.plate) this.addPw(p, 'plate', -1);
      this.energy = this.maxEnergy + (p.pw.hearth || 0) + (this.turn === 1 ? this.firstTurnEnergy : 0) + (this.has('COLD_CREAM') ? this.leftover : 0);
      this.leftover = 0;
      if (p.pw.radiance) { this.energy += 1; this.addPw(p, 'radiance', -1); }
      if (p.pw.nextEnergy) { this.energy += p.pw.nextEnergy; delete p.pw.nextEnergy; }
      this.extraDrawThisTurn = 0;
      if (p.pw.clarity) { this.extraDrawThisTurn += 1; this.addPw(p, 'clarity', -1); }
      if (p.pw.nextDraw) { this.extraDrawThisTurn += p.pw.nextDraw; delete p.pw.nextDraw; }
      if (p.pw.nextBlock) { const b = p.pw.nextBlock; delete p.pw.nextBlock; await this.gainBlock(b, false); }
      if (lead) for (const e of this.alive()) if (e.pw.rampart) for (const x of this.alive()) if (x !== e && x.def.rampartTarget) x.block += e.pw.rampart;
      for (const c of [...this.hand, ...this.draw, ...this.discard]) c.bound = false;
      if (p.barkRing) { for (const x of p.barkRing) { await this.gainBlock(x.n, false); x.turns--; } p.barkRing = p.barkRing.filter((x) => x.turns > 0); }
      await this.rh('turnStart');
      if (this.over) return;
      if (lead) for (const e of this.enemies) e.hitsTurn = 0;
      for (const f of (HD.ENGINE_HOOKS && HD.ENGINE_HOOKS.turnStart) || []) { await f(this); if (this.over) return; }
      for (const c of this.discard.filter((x) => x.returnNext)) { c.returnNext = false; const i = this.discard.indexOf(c); if (i < 0) continue; this.discard.splice(i, 1); this.addToHand(c); }
      if (p.pw.prepTime) this.addPw(p, 'vigor', p.pw.prepTime);
      if (p.pw.specter) this.addPw(p, 'poise', -p.pw.specter);
      if (p.pw.endlessKnives) this.addSlivers(p.pw.endlessKnives);
      if (p.pw.foulFumes) for (const e of this.alive()) await this.applyToxin(e, p.pw.foulFumes);
      if (p.badDream) { for (const x of p.badDream) for (let i = 0; i < x.n; i++) this.addToHand(this.makeCard(x.id, x.up)); p.badDream = null; }
      if (p.pw.toxin) { await this.loseHp(p, p.pw.toxin); this.addPw(p, 'toxin', -1); if (this.over) return; }
      if (p.pw.boulder) { for (const e of this.alive()) await this.damage(e, p.pw.boulder, {}); if (this.over) return; p.boulderPlays = p.boulderPlays || 1; this.addPw(p, 'boulder', 5 * p.boulderPlays); }
      if (p.pw.hellbound) this.addPw(p, 'might', p.pw.hellbound);
      if (p.pw.redCloak) { await this.selfLoseHp(1); if (this.over) return; await this.gainBlock(p.pw.redCloak, false); }
      if (p.pw.fever) { await this.selfLoseHp(1); if (this.over) return; }
      if (p.pw.hunger) {
        for (let i = 0; i < p.pw.hunger; i++) {
          const atks = this.discard.filter((c) => CARDS[c.id].type === 'Attack');
          if (!atks.length) break;
          const c = this.rng.pick(atks);
          this.discard.splice(this.discard.indexOf(c), 1);
          if (this.canUpgrade(c)) this.upgradeInCombat(c);
          this.addToHand(c);
        }
      }
      if (this.turn === 1) for (const c of this.draw.filter((x) => x.ench && x.ench.id === 'IMBUED')) { if (this.over) break; const i = this.draw.indexOf(c); if (i < 0) continue; this.draw.splice(i, 1); await this.autoPlay(c, {}); }
      await this.drawCards(5 + (this.turn === 1 ? this.firstTurnDraw : 0) + this.extraDrawThisTurn);
      if (this.turn === 1 && !this.over) await this.rh('firstHand');
      if (!this.over) await this.rh('afterDraw');
      if (!this.over) for (const f of (HD.ENGINE_HOOKS && HD.ENGINE_HOOKS.afterDraw) || []) { await f(this); if (this.over) return; }
      // Cards that play themselves from the Exhaust pile at the start of your turn (Bombardment).
      for (const c of this.ash.filter((x) => CARDS[x.id].playFromAshAtTurnStart)) {
        if (this.over || !this.alive().length) break;
        const i = this.ash.indexOf(c); if (i < 0) continue;
        this.ash.splice(i, 1);
        await this.autoPlay(c, {});
      }
      for (let i = 0; i < (p.pw.tradeTools || 0) && !this.over; i++) { await this.drawCards(1); await this.discardChoice(1, 'Trade Tools: discard a card'); }
      if (this.has('OLD_FIDDLE')) this.drawLocked = true;
      for (let i = 0; i < (p.pw.entropy || 0) && this.hand.length; i++) {
        // Transform in place, the same way Primal Force turns cards into Giant Rocks.
        const x = this.rng.pick(this.hand); const id = this.randomPoolCard((d) => d.id !== x.id);
        Object.assign(x, { id, up: false, bonus: 0, replay: 0, costTurn: null, confCost: null, freeTurn: false, freeCombat: false });
      }
      for (let i = 0; i < (p.pw.mayhem || 0) && !this.over; i++) { const x = await this.takeTopOfDraw(); if (x) await this.autoPlay(x, {}); }
      this.checkEnd();
      await this.topCheck();
      if (this.turn === 1 && this.has('WHISPER_EARRING') && !this.over) {
        this.say('The Whisperer plays your first turn.');
        for (let i = 0; i < 30 && !this.over; i++) {
          const ok = this.hand.filter((c) => this.canPlay(c) && CARDS[c.id].type !== 'Curse');
          if (!ok.length) break;
          const c = this.rng.pick(ok);
          await this.playCard(c, CARDS[c.id].target === 'enemy' ? this.randomEnemy() : null);
        }
        if (!this.over) await this.endTurn();
      }
    }
    // A player ends their turn. Once every standing player has, each one's turn ends in seat order, then the enemies act.
    async endTurn() {
      if (this.over || this.phase !== 'player' || this.ending || this.seat.ready || this.seat.dead) return;
      this.seat.ready = true;
      await this.endRound();
    }
    // Take back End Turn while someone else is still playing.
    cancelEndTurn() { if (this.phase === 'player' && !this.over && this.seat.ready) this.seat.ready = false; }
    async endRound() {
      const seats = this.living();
      if (this.over || this.phase !== 'player' || !seats.length || seats.some((s) => !s.ready)) return;
      const again = [];
      for (const s of seats) {
        if (s.ended) continue;
        s.ended = true;
        if (await this.withSeat(s, () => this.seatTurnEnd())) again.push(s);
        if (this.over) return;
      }
      // Extra turns skip the enemies. If only some players get one, the others wait for them.
      if (again.length && again.length === this.living().length) return this.startTurn();
      if (again.length) {
        for (const s of again) { s.ready = false; s.ended = false; await this.withSeat(s, () => this.seatTurnStart(false)); if (this.over) return; }
        return;
      }
      await this.enemyTurn();
      if (!this.over) await this.startTurn();
    }
    // One player's end of turn. Returns true if they take another turn.
    async seatTurnEnd() {
      this.ending = true;
      const p = this.p;
      const done = () => { this.ending = false; this.checkEnd(); return false; };
      for (const f of (HD.ENGINE_HOOKS && HD.ENGINE_HOOKS.turnEnd) || []) { await f(this); if (this.over) return done(); }
      const top = this.draw[this.draw.length - 1];
      if (top && CARDS[top.id].playFromDrawTopAtTurnEnd && !this.over) { this.draw.pop(); await this.autoPlay(top, {}); if (this.over) return done(); }
      for (let i = 0; i < (p.pw.frenzy || 0); i++) {
        const atks = this.hand.filter((c) => CARDS[c.id].type === 'Attack');
        if (!atks.length || !this.alive().length) break;
        const c = this.rng.pick(atks);
        this.hand.splice(this.hand.indexOf(c), 1);
        await this.autoPlay(c, {});
        if (this.over) return done();
      }
      for (const c of this.ash.filter((x) => x.id === 'ASH_WAIL')) {
        if (!this.alive().length) break;
        const i = this.ash.indexOf(c); if (i < 0) continue;
        this.ash.splice(i, 1);
        await this.autoPlay(c, {});
        if (this.over) return done();
      }
      if (p.pw.plate) await this.gainBlock(p.pw.plate, false);
      await this.rh('turnEnd');
      if (this.over) return done();
      if (p.pw.doom && p.hp <= p.pw.doom) { this.say('Your Knell tolls.'); this.downed(); return done(); }
      if (p.pw.regen) { this.heal(p.pw.regen); this.addPw(p, 'regen', -1); }
      if (p.pw.ritual) this.addPw(p, 'might', p.pw.ritual);
      for (const c of this.hand.slice()) {
        const d = CARDS[c.id];
        if (d.endInHand) { await d.endInHand(this, c); if (this.over) return done(); }
      }
      if (p.pw.constrict) {
        if (p.constrictSrc && p.constrictSrc.alive) { await this.damage(p, p.pw.constrict, {}); if (this.over) return done(); }
        else delete p.pw.constrict;
      }
      for (const k of ['mightTemp', 'poiseTemp', 'seethe', 'noDraw', 'noEnergy', 'ringing', 'echo', 'duplicate', 'tuningTemp', 'tuningDown']) delete p.pw[k];
      if (p.pw.tangled) this.addPw(p, 'tangled', -1);
      const keep = this.handKept();
      for (const k of ['doubleTake', 'acidTide', 'shadowMerge', 'freeSkillTurn']) delete p.pw[k];
      if (p.bombs) {
        for (const b of p.bombs) b.turns--;
        for (const b of p.bombs.filter((x) => x.turns <= 0)) { for (const e of this.alive()) await this.damage(e, b.dmg, {}); if (this.over) return done(); }
        p.bombs = p.bombs.filter((x) => x.turns > 0);
      }
      if (p.pw.noCardBlock) this.addPw(p, 'noCardBlock', -1);
      for (const e of this.enemies) delete e.pw.choked;
      if (p.pw.retainHand) this.addPw(p, 'retainHand', -1);
      if (p.pw.wellLaid && this.hand.length && !keep) {
        const xs = await this.choose({ from: this.hand.slice(), n: Math.min(p.pw.wellLaid, this.hand.length), min: 0, prompt: `Careful Plans: Retain up to ${p.pw.wellLaid}` });
        for (const x of xs) x.retainTurn = true;
      }
      const hexed = this.alive().some((x) => x.pw.hex);
      // Tell the screen which cards are leaving, so only those animate out.
      if (this.ui.handLeaving) this.ui.handLeaving(this.hand.filter((c) => !this.staysAtEndOfTurn(c, keep, hexed)).map((c) => ({ c, burn: hexed || HD.kwOf(c).includes('Fleeting') })));
      for (const c of this.hand.splice(0)) {
        c.costTurn = null; c.freeTurn = false; c.bound = false;
        if (c.furtiveTurn) { c.furtiveTurn = false; c.addKw = (c.addKw || []).filter((k) => k !== 'Furtive'); }
        if (hexed || HD.kwOf(c).includes('Fleeting')) await this.burn(c);
        else if (this.staysAtEndOfTurn(c, keep, false)) {
          c.retainTurn = false; if (c.ench && c.ench.id === 'SLUMBERING_ESSENCE') c.sleepCut = (c.sleepCut || 0) + 1; this.hand.push(c); }
        else this.discard.push(c);
      }
      if (this.has('COLD_CREAM')) this.leftover = this.energy;
      if (this.has('OLD_TEARS') && this.energy >= 1) this.addPw(p, 'nextEnergy', 2);
      if (this.has('DIAMOND_CROWN') && HD.RELICS.DIAMOND_CROWN.halve && this.t.cards <= 2) p.pw.diadem = 1;
      this.ending = false;
      if (p.pw.extraTurn) { delete p.pw.extraTurn; this.say('You take an extra turn.'); return true; }
      if (this.has('OLD_EYE') && !this.rs.oldEye && this.t.cards === 0) {
        this.rs.oldEye = true;
        for (const c of this.hand.splice(0)) await this.burn(c);
        this.say('Time bends. You take another turn.');
        return true;
      }
      return false;
    }
    chooseIntent(e) {
      if (!e.alive) return;
      if (e.forceIntent) { e.intent = e.forceIntent; e.forceIntent = null; return; }
      e.intent = e.def.ai(e, this);
    }
    async enemyTurn() {
      this.phase = 'enemy';
      for (const s of this.seats) s.hpLostPhase = 0;
      for (const e of this.alive().slice()) { if (e.pw.toxin) { await this.toxinTick(e); if (this.over) return; } }
      for (const e of this.alive()) {
        delete e.pw.intangible;
        if (!e.pw.burrowed) e.block = 0;
        if (e.pw.plate && e.plateStarted) this.addPw(e, 'plate', -1);
      }
      for (const e of this.enemies.slice()) {
        if (!e.alive) continue;
        if (this.ui.pace) await this.ui.pace(this, e);
        await this.execMove(e);
        if (this.over) return;
        if (e.alive && e.pw.plate) { e.block += e.pw.plate; e.plateStarted = true; }
        if (e.alive && e.pw.ritual) this.addPw(e, 'might', e.pw.ritual);
        if (e.alive && e.pw.timeLimit) { this.addPw(e, 'timeLimit', -1); if (!e.pw.timeLimit) { e.alive = false; e.fled = true; this.say(`${e.name} topples over. Time is up.`); this.checkEnd(); if (this.over) return; } }
        if (e.alive && e.pw.nemesis) { e.nemesisOn = !e.nemesisOn; if (e.nemesisOn) e.pw.intangible = 1; }
        if (e.alive && e.pw.slumber && e.intent !== 'WAKE') this.slumberTick(e);
        if (e.alive && e.pw.hatch) { this.addPw(e, 'hatch', -1); if (!e.pw.hatch) e.forceIntent = 'HATCH'; }
        if (e.alive && e.pw.territorial) this.addPw(e, 'might', e.pw.territorial);
        if (e.alive && e.pw.demise) { await this.loseHp(e, e.pw.demise); if (this.over) return; }
        delete e.pw.mightDown;
        if (e.alive && e.pw.doom && e.hp <= e.pw.doom) { await this.doomKill(e); if (this.over) return; }
      }
      for (const t of [...this.seats.map((s) => s.p), ...this.alive()]) {
        for (const k of TICK) {
          if (!t.pw[k]) continue;
          if (t.fresh[k]) delete t.fresh[k]; else this.addPw(t, k, -1);
        }
      }
      for (const e of this.alive()) this.chooseIntent(e);
      for (const s of this.living()) this.asSeat(s, () => {
        if (this.p.pw.sandpit && !this.over) {
          this.addPw(this.p, 'sandpit', -1);
          if (!this.p.pw.sandpit) { this.say('The sand swallows you.'); this.downed(); }
        }
      });
    }
    // Slumbering creatures wake after enough turns or hits.
    slumberTick(e) {
      this.addPw(e, 'slumber', -1);
      if (!e.pw.slumber) { e.forceIntent = e.def.wake; e.intent = e.def.wake; this.say(`${e.name} wakes up.`); }
    }
    async execMove(e) {
      const id = e.intent;
      const m = e.def.moves[id];
      if (m && !m.sleep && !m.stun) {
        this.say(`${e.name} uses ${m.name}.`);
        if (m.atk != null) {
          // Every standing player is hit, and each blocks on their own. Imbalanced: one player blocking it all stuns it.
          const hits = m.hitsFn ? m.hitsFn(e) : m.hits || 1;
          const dealt = new Map();
          for (let i = 0; i < hits; i++) {
            if (!e.alive || this.over) break;
            for (const s of this.living()) {
              const n = await this.withSeat(s, () => this.damage(this.p, this.enemyDmg(e, m.atk), { attack: true, src: e }));
              dealt.set(s, (dealt.get(s) || 0) + n);
              if (!e.alive || this.over) break;
            }
          }
          if (e.pw.imbalanced && (!dealt.size || [...dealt.values()].some((n) => !n)) && e.alive) { e.forceIntent = 'STUN'; this.say(`${e.name} loses its balance.`); }
        }
        if (this.over) return;
        if (m.escape) { e.alive = false; e.fled = true; this.say(`${e.name} escapes${e.stolen ? ` with ${e.stolen} of your Gold` : ''}.`); e.stolen = 0; e.took = null; this.checkEnd(); return; }
        // each: what the move does to every standing player; fx: what it does once.
        if (m.each && e.alive) for (const s of this.living()) { await this.withSeat(s, () => m.each(this, e)); if (this.over) return; }
        if (m.fx && e.alive) { await m.fx(this, e); if (this.over) return; }
        if (e.alive) {
          if (m.block) e.block += this.mpScale(m.block) + (e.pw.poise || 0);
          if (m.buff) for (const k in m.buff) this.addPw(e, k, this.mpPower(k, m.buff[k]));
          for (const s of this.living()) {
            await this.withSeat(s, async () => {
              if (m.debuff) for (const k in m.debuff) await this.applyToPlayer(k, m.debuff[k], e);
              if (m.status) this.addStatus(m.status);
            });
          }
          if (m.summon && this.alive().filter((x) => x.id === m.summon).length < 3) this.chooseIntent(this.spawn(m.summon, { at: 0 }));
        }
      }
      e.hist.push(id);
      e.last = id;
      if (id === 'STUN') e.brokeAt = e.hist.length;
      if (m && m.surface) delete e.pw.burrowed;
    }
    // What the UI shows above an enemy.
    intentOf(e) {
      if (e.intent === 'STUN' && !e.def.moves.STUN) return { kind: 'stun', label: 'Stunned' };
      const m = e.def.moves[e.intent];
      if (!m) return { kind: 'unknown', label: '?' };
      if (m.stun) return { kind: 'stun', label: 'Stunned' };
      if (m.sleep) return { kind: 'sleep', label: m.name };
      const kinds = [];
      if (m.atk != null) kinds.push('attack');
      if (m.block) kinds.push('defend');
      if (m.buff) kinds.push('buff');
      if (m.debuff || m.status) kinds.push('debuff');
      if (m.summon) kinds.push('summon');
      return { kind: kinds[0] || 'unknown', kinds, name: m.name, dmg: m.atk != null ? this.enemyDmg(e, m.atk) : null, hits: m.hitsFn ? m.hitsFn(e) : m.hits || 1, block: m.block || 0 };
    }
  }
  for (const k of SEAT_KEYS) Object.defineProperty(Combat.prototype, k, { get() { return this.seat[k]; }, set(v) { this.seat[k] = v; }, configurable: true });
  Combat.SEAT_KEYS = SEAT_KEYS;
  Combat.SHARED_KEYS = SHARED_KEYS;
  HD.Combat = Combat;

  // Headless chooser for tests and simulations.
  HD.autoUI = {
    choose: async (g, o) => {
      const min = o.min != null ? o.min : o.n;
      const k = min === o.n ? o.n : min + g.rng.int(o.n - min + 1);
      return g.rng.shuffle(o.from.slice()).slice(0, k);
    },
  };
})();

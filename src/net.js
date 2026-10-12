// Multiplayer networking (lockstep). The host numbers every action and choice; every player runs the same fight from
// the same start and applies them in that order, so all copies stay the same. Links only carry JSON strings:
// HD.loopPair links two ends in memory (tests, one-machine play); a WebRTC link plugs into the same interface.
(function () {
  const HD = globalThis.HD;
  const ACTS = ['play', 'potion', 'end', 'unend'];
  const MAX_PLAYERS = 4;
  const SPIN_MS = 3400; // a split vote's roulette: the wheel turns, then rests on the room before the party goes
  const MAX_HP = 9999;
  const DROP_MS = 3000; // a player whose link closes mid-fight has this long to rejoin before they leave the fight
  const AIM_MS = 50; // the most often the host passes on one player's pointer
  const CHAT_MAX = 200; // characters in one chat message
  const CHAT_MS = 400; // the most often one player can send a chat message
  const isInt = (x) => Number.isInteger(x);
  const optInt = (x) => x === undefined || x === null || isInt(x);

  // ---------- links ----------
  // Two connected ends. Each end: send(text), onMessage(fn), onClose(fn), close(). Delivery is async and in order;
  // delay() (ms) can make one direction slower than the other.
  HD.loopPair = (delay = () => 0) => {
    const mk = () => ({ fns: [], closeFns: [], open: true, last: 0, q: [], timer: null });
    const a = mk(), b = mk();
    // One queue per direction, drained in order, so messages never overtake each other.
    const pump = (x) => {
      x.timer = setTimeout(() => {
        x.timer = null;
        while (x.q.length && x.q[0][0] <= Date.now()) { const [, text] = x.q.shift(); if (x.open) for (const f of x.fns) f(text); }
        if (x.q.length) pump(x);
      }, Math.max(0, x.q[0][0] - Date.now()));
    };
    const end = (me, other) => ({
      send(text) {
        if (!me.open || !other.open) return;
        other.last = Math.max(other.last, Date.now() + delay());
        other.q.push([other.last, text]);
        if (!other.timer) pump(other);
      },
      onMessage(f) { me.fns.push(f); },
      onClose(f) { me.closeFns.push(f); },
      close() { if (!me.open) return; me.open = false; other.open = false; for (const f of [...me.closeFns, ...other.closeFns]) f(); },
    });
    return [end(a, b), end(b, a)];
  };

  // ---------- fingerprint of a fight, compared between players to catch desyncs ----------
  const sorted = (o) => Object.keys(o).sort().map((k) => [k, o[k]]);
  const pile = (cs) => cs.map((c) => `${c.uid}:${c.id}${c.up ? '+' : ''}`);
  HD.fightState = (g) => [g.round, g.over, g.won,
    g.seats.map((s) => [s.p.hp, s.p.maxHp, s.p.block, sorted(s.p.pw), s.energy, s.stars, s.turn, !!s.dead, !!s.ready, s.run.gold, s.run.potions,
      pile(s.hand), pile(s.draw), pile(s.discard), pile(s.ash), s.orbs.map((o) => o.id + o.val), s.osty ? [s.osty.hp, s.osty.maxHp] : null]),
    g.enemies.map((e) => [e.uid, e.id, e.hp, e.block, e.alive, e.intent, sorted(e.pw)])];
  HD.fightHash = (g) => HD.hashSeed(JSON.stringify(HD.fightState(g)));

  // ---------- message checks: everything that comes off a link is untrusted ----------
  const validAct = (a) => !!a && ACTS.includes(a.k) && optInt(a.card) && optInt(a.target) && optInt(a.slot) && optInt(a.ally);
  const validPick = (m) => isInt(m.pi) && m.pi >= 0 && Array.isArray(m.uids) && m.uids.length <= 10 && m.uids.every(isInt);
  // The default chooser for this player's own prompts. It must not touch the fight's RNG: only this machine runs it.
  const FIRST = { choose: (g, o) => o.from.slice(0, o.min != null ? o.min : o.n) };
  // A player's nickname: printable, single spaces, at most 16 characters.
  // A chat message: printable, single spaces, at most CHAT_MAX characters. The screen shows it as text, never as HTML.
  HD.cleanChat = (s) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
  HD.cleanName = (s) => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const parse = (text) => { try { const m = JSON.parse(text); return m && typeof m.t === 'string' ? m : null; } catch (e) { return null; } };

  // ---------- the host ----------
  // Seats are fixed by the link a player joined on, so nobody can act for someone else.
  class Host {
    constructor(o = {}) {
      this.build = o.build || HD.BUILD || 'dev';
      this.max = o.max || MAX_PLAYERS;
      this.seats = []; // { link, name, live }
      this.fight = null; // { f, enc, kind, snaps, uidBase, log }
      this.fights = 0;
      this.hashes = new Map();
      this.onEvent = o.onEvent || (() => {});
      this.seed = o.seed; // the run's seed (random when not given)
      this.authority = o.authority || null; // () => the host player's Run, which decides rooms and encounters
      this.spinMs = o.spinMs != null ? o.spinMs : SPIN_MS;
      this.recentBosses = o.recentBosses || []; // bosses this host has met lately, oldest first
      this.dropMs = o.dropMs != null ? o.dropMs : DROP_MS;
      this.lastSnaps = []; // each player's run at the last fight's start, for a player who has since left
      this.run = null; // the party's run: { seed, at, votes, asks, stats, spin }
    }
    connect(link) {
      link.onMessage((text) => this.receive(link, text));
      link.onClose(() => {
        const s = this.seats.find((x) => x.link === link);
        if (!s) return;
        s.live = false;
        const seat = this.seats.indexOf(s);
        this.onEvent({ t: 'left', seat });
        if (!this.run) return this.broadcast(this.lobby());
        this.mapState(); this.resolve(); this.tryEventFight(); this.trySnaps();
        // In a fight, a player who does not come back soon leaves it, so the others are not left waiting on their turn.
        const F = this.fight;
        if (F && F.snaps) {
          clearTimeout(s.drop);
          s.drop = setTimeout(() => { if (!s.live && this.fight === F) this.sequence({ s: seat, a: { k: 'leave' } }); }, this.dropMs);
        }
      });
    }
    send(link, m) { link.send(JSON.stringify(m)); }
    broadcast(m) { const text = JSON.stringify(m); for (const s of this.seats) if (s.live) s.link.send(text); }
    seatOf(link) { const i = this.seats.findIndex((s) => s.link === link && s.live); return i < 0 ? null : i; }
    receive(link, text) {
      const m = parse(text);
      if (!m) return;
      if (m.t === 'hello') return this.hello(link, m);
      const seat = this.seatOf(link);
      if (seat === null) return;
      if (m.t === 'snap') return this.snap(seat, m);
      if (m.t === 'chat') return this.chat(seat, m);
      if (m.t === 'char' && !this.run && HD.CHARS[m.id]) { this.seats[seat].char = m.id; return this.broadcast(this.lobby()); }
      if (m.t === 'name' && !this.run) { this.seats[seat].name = HD.cleanName(m.name) || `Player ${seat + 1}`; return this.broadcast(this.lobby()); }
      if (this.run && ['at-map', 'vote', 'ev-fight', 'mend', 'stat'].includes(m.t)) return this.party(seat, m);
      if (!this.fight || m.f !== this.fight.f) return;
      if (m.t === 'act' && validAct(m.a)) return this.sequence({ s: seat, a: m.a });
      if (m.t === 'pick' && validPick(m)) return this.sequence({ s: seat, pick: { pi: m.pi, uids: m.uids } });
      if (m.t === 'hash' && isInt(m.n) && isInt(m.h)) return this.hash(seat, m.n, m.h);
      if (m.t === 'aim') return this.aim(seat, m);
    }
    // Chat, from anyone at the table at any time. The host cleans it and sends it to everyone, the sender too, so every
    // player sees the same messages in the same order. Not part of any fight.
    chat(seat, m) {
      const s = this.seats[seat], now = Date.now();
      const text = typeof m.text === 'string' ? HD.cleanChat(m.text) : '';
      if (!text || now - (s.chatAt || 0) < CHAT_MS) return;
      s.chatAt = now;
      this.broadcast({ t: 'chat', s: seat, text });
    }
    // A player's pointer in a fight, passed on for the others to draw. It is not part of the fight, so it is not
    // numbered. x and y are fractions of the fight area; on is the enemy under it; card is what they are aiming.
    aim(seat, m) {
      const s = this.seats[seat], now = Date.now();
      if (now - (s.aimAt || 0) < AIM_MS) return;
      const frac = (v) => typeof v === 'number' && v >= 0 && v <= 1;
      const off = m.off === true;
      if (!off && (!frac(m.x) || !frac(m.y) || !optInt(m.on))) return;
      if (m.card != null && !(typeof m.card === 'string' && (HD.CARDS[m.card] || HD.POTIONS[m.card]))) return;
      s.aimAt = now;
      const out = JSON.stringify(off ? { t: 'aim', f: m.f, s: seat, off: true } : { t: 'aim', f: m.f, s: seat, x: m.x, y: m.y, on: m.on == null ? null : m.on, card: m.card || null });
      this.seats.forEach((x, i) => { if (x.live && i !== seat) x.link.send(out); });
    }
    hello(link, m) {
      if (m.build !== this.build) return this.send(link, { t: 'reject', reason: 'version', build: this.build });
      let seat;
      if (isInt(m.rejoin) && this.seats[m.rejoin] && !this.seats[m.rejoin].live) { seat = m.rejoin; clearTimeout(this.seats[seat].drop); this.seats[seat].link = link; this.seats[seat].live = true; }
      else if (this.fight || this.run) return this.send(link, { t: 'reject', reason: 'already playing' });
      else if (this.seats.length >= this.max) return this.send(link, { t: 'reject', reason: 'full' });
      else { seat = this.seats.length; this.seats.push({ link, name: HD.cleanName(m.name) || `Player ${seat + 1}`, live: true }); }
      this.send(link, { t: 'welcome', seat, names: this.seats.map((s) => s.name) });
      this.onEvent({ t: 'joined', seat });
      if (!this.run) this.broadcast(this.lobby());
      if (this.fight && this.fight.snaps) {
        const { f, enc, kind, snaps, uidBase, gone, log } = this.fight;
        this.send(link, { t: 'fight', f, enc, kind, snaps, uidBase, gone });
        this.send(link, { t: 'catchup', f, log });
      }
    }
    // A fight: ask every player for their run, then send everyone the same start.
    startFight(enc, kind) {
      this.fight = { f: ++this.fights, enc, kind, snaps: null, got: [], log: [] };
      this.hashes.clear();
      this.broadcast({ t: 'snap-req', f: this.fight.f });
    }
    snap(seat, m) {
      const F = this.fight;
      if (!F || m.f !== F.f || F.snaps || !m.run || typeof m.run !== 'object' || !isInt(m.uid)) return;
      F.got[seat] = m;
      this.trySnaps();
    }
    // Once every player still here has sent their run, everyone gets the same start. A player who left keeps their seat
    // (so seat numbers stay the same everywhere) but is gone from the fight: their last run, or a fresh one, fills it.
    trySnaps() {
      const F = this.fight;
      if (!F || F.snaps || this.seats.some((s, i) => s.live && !F.got[i])) return;
      F.gone = this.seats.map((s, i) => i).filter((i) => !F.got[i]);
      F.snaps = this.seats.map((s, i) => (F.got[i] ? F.got[i].run : this.lastSnaps[i] || this.freshSnap(i)));
      // Every copy starts numbering the fight's cards above any number a player has used.
      F.uidBase = Math.max(0, ...F.got.filter(Boolean).map((x) => x.uid)) + 10000;
      this.lastSnaps = F.snaps;
      delete F.got;
      this.broadcast({ t: 'fight', f: F.f, enc: F.enc, kind: F.kind, snaps: F.snaps, uidBase: F.uidBase, gone: F.gone });
    }
    freshSnap(i) {
      const { seed, asc, chars, bosses } = this.runInfo;
      return new HD.Run(`${seed}:${i}`, chars[i], asc, { party: chars.length, mapSeed: seed, bosses }).toSave();
    }
    // ---------- the party outside fights ----------
    lobby() { return { t: 'lobby', players: this.seats.map((s) => ({ name: s.name, char: s.char || null, live: s.live })) }; }
    live() { return this.seats.map((s, i) => (s.live ? i : -1)).filter((i) => i >= 0); }
    // Start the run once every player has picked a hero. Each player makes their own run; the maps come from one seed.
    startRun(asc = 0) {
      if (this.run || !this.seats.length || this.seats.some((s) => s.live && !s.char)) return false;
      const seed = this.seed || Math.random().toString(36).slice(2, 8);
      this.run = { seed, at: [], votes: [], asks: [], stats: [], spin: false };
      this.rng = HD.makeRng(HD.hashSeed(`${seed}:party`));
      this.runInfo = { seed, asc, chars: this.seats.map((s) => s.char), bosses: this.pickBosses() };
      this.broadcast(Object.assign({ t: 'run' }, this.runInfo));
      return true;
    }
    // One boss per act for the whole party, at random. Bosses this host met lately sit out until the others in their
    // act have come up, so the same one does not keep returning.
    pickBosses() {
      const out = {};
      for (let n = 1; HD.encPool('boss', n).length; n++) {
        const pool = HD.encPool('boss', n);
        const seen = pool.length > 1 ? this.recentBosses.filter((b) => pool.includes(b)).slice(1 - pool.length) : [];
        const fresh = pool.filter((b) => !seen.includes(b));
        out[n] = this.rng.pick(fresh.length ? fresh : pool);
      }
      return out;
    }
    party(seat, m) {
      const R = this.run;
      if (m.t === 'at-map') { R.at[seat] = true; R.votes[seat] = null; this.mapState(); return this.tryEventFight(); }
      // Votes are checked when the room is picked, not now: the host player's own run may still be a step behind.
      if (m.t === 'vote') {
        if (R.spin || !R.at[seat] || typeof m.key !== 'string' || m.key.length > 12) return;
        R.votes[seat] = m.key; this.mapState(); return this.resolve();
      }
      if (m.t === 'ev-fight' && HD.ENC[m.enc] && ['monster', 'elite', 'event'].includes(m.kind)) { R.asks.push({ seat, enc: m.enc, kind: m.kind }); return this.tryEventFight(); }
      if (m.t === 'mend' && isInt(m.to) && m.to !== seat && this.seats[m.to]) return this.broadcast({ t: 'mended', from: seat, to: m.to });
      // A player's HP outside fights, so the others can see who is hurt.
      if (m.t === 'stat' && isInt(m.hp) && isInt(m.maxHp) && m.maxHp > 0 && m.maxHp <= MAX_HP) {
        R.stats[seat] = { hp: Math.max(0, Math.min(m.hp, m.maxHp)), maxHp: m.maxHp };
        return this.broadcast({ t: 'stats', stats: this.seats.map((s, i) => R.stats[i] || null) });
      }
    }
    mapState() { const R = this.run; this.broadcast({ t: 'mapstate', at: this.seats.map((s, i) => !!R.at[i]), votes: this.seats.map((s, i) => R.votes[i] || null) }); }
    // Everyone standing is at the map and has voted. If they agree, the party goes. A split vote spins a roulette with
    // one slot per vote, as in the original: a room more players picked is likelier, and everyone watches it land.
    resolve() {
      const R = this.run, live = this.live();
      if (R.spin || !live.length || !live.every((i) => R.at[i] && R.votes[i]) || R.asks.length) return;
      // Everyone (the host player too) is at the map now, so the host's run is up to date. A vote for a room the party
      // cannot reach is dropped and that player picks again.
      const reach = this.authority().reachable();
      const bad = live.filter((i) => !reach.includes(R.votes[i]));
      if (bad.length) { for (const i of bad) R.votes[i] = null; return this.mapState(); }
      const picks = live.map((i) => R.votes[i]);
      const options = [...new Set(picks)];
      if (options.length === 1) return this.go(options[0]);
      const key = picks[this.rng.int(picks.length)];
      R.spin = true;
      this.broadcast({ t: 'spin', options, key, ms: this.spinMs });
      setTimeout(() => { R.spin = false; if (this.run === R) this.go(key); }, this.spinMs);
    }
    go(key) {
      const R = this.run;
      if (!this.authority()) return; // the host left while the wheel turned
      const room = this.roomFor(key);
      R.at = []; R.votes = [];
      this.broadcast(Object.assign({ t: 'go', key }, room));
      if (room.enc) this.startFight(room.enc, room.kind);
    }
    roomFor(key) {
      const r = this.authority();
      if (key === 'BOSS') return { room: 'boss', enc: r.boss, kind: 'boss' };
      let type = r.map.nodes[key].type;
      if (type === 'unknown') {
        r.hook('onUnknown');
        type = r.rollUnknown();
        if (type === 'event') { const pool = r.eventPool(); if (pool.length) return { room: 'event', event: this.rng.pick(pool) }; type = 'monster'; }
      }
      if (type === 'monster' || type === 'elite') return { room: type, enc: r.pickEncounter(type), kind: type };
      return { room: type };
    }
    // An event that turns into a fight pulls the whole party in, once nobody is still in the middle of a room.
    tryEventFight() {
      const R = this.run;
      if (!R || !R.asks.length || !this.live().every((i) => R.at[i] || R.asks.some((a) => a.seat === i))) return;
      // Everyone is in the same event, so several players may pick its fight: they all get the fight's rewards.
      const ask = R.asks[0];
      const all = R.asks.filter((a) => a.enc === ask.enc && a.kind === ask.kind).map((a) => a.seat);
      R.asks = []; R.at = []; R.votes = [];
      this.broadcast({ t: 'go-fight', by: ask.seat, all, enc: ask.enc, kind: ask.kind });
      this.startFight(ask.enc, ask.kind === 'event' ? 'monster' : ask.kind);
    }
    sequence(x) {
      const m = Object.assign({ t: 'seq', f: this.fight.f, n: this.fight.log.length }, x);
      this.fight.log.push(m);
      this.broadcast(m);
    }
    hash(seat, n, h) {
      const got = this.hashes.get(n) || {};
      got[seat] = h;
      this.hashes.set(n, got);
      const live = this.seats.map((s, i) => (s.live ? i : -1)).filter((i) => i >= 0);
      if (!live.every((i) => got[i] !== undefined)) return;
      this.hashes.delete(n);
      if (new Set(live.map((i) => got[i])).size > 1) { this.broadcast({ t: 'desync', f: this.fight.f, n }); this.onEvent({ t: 'desync', n, got }); }
    }
  }

  // ---------- a player ----------
  // o: link, run (this player's Run), name, ui (the screen: choose, fx, pace...), onEvent.
  class Peer {
    constructor(o) {
      this.link = o.link;
      this.run = o.run;
      this.name = o.name;
      this.ui = o.ui || FIRST;
      this.build = o.build || HD.BUILD || 'dev';
      this.onEvent = o.onEvent || (() => {});
      this.seat = null;
      this.g = null;
      this.f = 0;
      this.chain = Promise.resolve();
      this.link.onMessage((text) => this.receive(text));
      this.link.onClose(() => this.onEvent({ t: 'closed' }));
    }
    send(m) { this.link.send(JSON.stringify(m)); }
    hello(rejoin) { this.rejoin = rejoin; this.send({ t: 'hello', build: this.build, name: this.name, rejoin }); }
    // The party outside fights.
    pickChar(id) { this.send({ t: 'char', id }); }
    rename(name) { this.send({ t: 'name', name }); }
    atMap() { this.send({ t: 'at-map' }); }
    vote(key) { this.send({ t: 'vote', key }); }
    stat(hp, maxHp) { this.send({ t: 'stat', hp, maxHp }); }
    chat(text) { this.send({ t: 'chat', text }); }
    eventFight(enc, kind) { this.send({ t: 'ev-fight', enc, kind }); }
    mend(to) { this.send({ t: 'mend', to }); }
    // This player's pointer in the fight, for the others to see (o: { x, y, on, card } or { off: true }).
    aim(o) { if (this.g && !this.g.over) this.send(Object.assign({ t: 'aim', f: this.f }, o)); }
    // This player's moves. They take effect when the host's numbered copy comes back.
    act(a) { if (this.g && !this.g.over) { this.waiting = true; this.send({ t: 'act', f: this.f, a }); } }
    receive(text) {
      const m = parse(text);
      if (!m) return;
      if (m.t === 'welcome') { this.seat = m.seat; this.names = m.names; return this.onEvent(m); }
      if (m.t === 'reject') return this.onEvent(m);
      if (m.t === 'snap-req') return this.send({ t: 'snap', f: m.f, run: this.run.toSave(), uid: HD.uidPeek() });
      if (m.t === 'fight') return this.begin(m);
      // The party moves before anything else can happen, so the next fight's snapshot already has the new room.
      if (m.t === 'go' && this.run && typeof m.key === 'string') this.run.moveTo(m.key);
      if (['lobby', 'mapstate', 'go', 'go-fight', 'spin', 'stats', 'chat'].includes(m.t)) return this.onEvent(m);
      if (m.t === 'run') {
        const bosses = m.bosses && typeof m.bosses === 'object' ? m.bosses : null;
        this.run = new HD.Run(`${m.seed}:${this.seat}`, m.chars[this.seat], m.asc || 0, { party: m.chars.length, mapSeed: m.seed, bosses });
        this.chars = m.chars;
        return this.onEvent(m);
      }
      // Mend: another player healed you for 30% of your Max HP at a rest site.
      if (m.t === 'mended') { if (m.to === this.seat && this.run && this.run.hp > 0) this.run.heal(Math.floor(this.run.maxHp * 0.3)); return this.onEvent(m); }
      if (m.f !== this.f) return;
      if (m.t === 'aim') return this.onEvent(m);
      if (m.t === 'catchup') { for (const x of m.log) this.seq(x); return; }
      if (m.t === 'seq') return this.seq(m);
      if (m.t === 'desync') return this.onEvent(m);
    }
    // The same start on every machine: every seat's run rebuilt from the snapshots (this player's too, so no copy
    // can differ), the same uid start, the host's run first (its RNG drives the fight). The fight's copy of this
    // player's run becomes this.run: the screen picks it up from the 'fight' event.
    begin(m) {
      const runs = m.snaps.map((x) => HD.Run.fromSave(x));
      this.run = runs[this.seat];
      this.rejoin = undefined;
      HD.setUid(m.uidBase);
      const g = new HD.Combat(runs[0], m.enc, this.netUI(), m.kind);
      for (const r of runs.slice(1)) g.addSeat(r);
      // Players who left before the fight keep their seat but take no part (and do not count for enemy HP).
      for (const i of Array.isArray(m.gone) ? m.gone : []) if (g.seats[i] && i !== this.seat) Object.assign(g.seats[i], { gone: true, dead: true });
      Object.assign(this, { g, f: m.f, applied: 0, nextN: 0, early: {}, lastRound: -1, endSent: false, picks: g.seats.map(() => ({ next: 0, got: {}, wait: {} })), waiting: false });
      this.chain = Promise.resolve().then(() => g.start()).then(() => { this.report(-1); this.onEvent({ t: 'applied', n: -1 }); });
      this.onEvent({ t: 'fight', g, run: this.run });
    }
    // The host's numbered messages, used strictly in number order even if a link delivers them out of order.
    seq(m) {
      if (!isInt(m.n) || m.n < this.nextN || this.early[m.n]) return;
      this.early[m.n] = m;
      while (this.early[this.nextN]) { const x = this.early[this.nextN]; delete this.early[this.nextN]; this.nextN++; this.use(x); }
    }
    use(m) {
      if (m.pick) return this.answer(m.s, m.pick);
      this.chain = this.chain.then(async () => {
        this.onEvent({ t: 'acting', s: m.s, a: m.a }); // the screen can show the move before it resolves
        try { await this.g.act(m.s, m.a); } catch (e) { this.onEvent({ t: 'error', error: e }); }
        this.applied = m.n + 1;
        if (m.s === this.seat) this.waiting = false;
        this.report(m.n);
        this.onEvent({ t: 'applied', n: m.n });
      });
    }
    // After the round changes, and once when the fight ends, send the host this copy's fingerprint. Nothing after
    // that: moves still arriving do nothing, and the rewards screen is already changing this player's run.
    report(n) {
      const g = this.g;
      if (this.endSent || (g.round === this.lastRound && !g.over)) return;
      this.lastRound = g.round;
      this.endSent = g.over;
      this.send({ t: 'hash', f: this.f, n, h: HD.fightHash(g) });
      if (g.over) this.onEvent({ t: 'over', g });
    }
    // Choices in the middle of a card belong to whoever was resolving it; everyone uses the host's numbered answer.
    netUI() {
      const peer = this;
      return Object.assign({}, this.ui, {
        choose(g, o) {
          const owner = g.seat.index;
          const p = peer.picks[owner];
          const pi = p.next++;
          const done = new Promise((res) => { p.wait[pi] = res; });
          if (p.got[pi]) peer.resolvePick(owner, pi);
          else if (owner === peer.seat) Promise.resolve(peer.ui.choose(g, o)).then((cs) => peer.send({ t: 'pick', f: peer.f, pi, uids: (cs || []).map((c) => c.uid) }));
          return done.then((uids) => uids.map((u) => o.from.find((c) => c.uid === u)).filter(Boolean));
        },
      });
    }
    answer(seat, pick) {
      const p = this.picks[seat];
      if (!p || p.got[pick.pi]) return;
      p.got[pick.pi] = pick.uids;
      if (p.wait[pick.pi]) this.resolvePick(seat, pick.pi);
    }
    resolvePick(seat, pi) { const p = this.picks[seat]; const res = p.wait[pi]; delete p.wait[pi]; res(p.got[pi]); }
  }

  HD.NetHost = Host;
  HD.NetPeer = Peer;
})();

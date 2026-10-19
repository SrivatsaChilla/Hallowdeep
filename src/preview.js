// Damage preview: what a card or potion would do right now, found by playing it on throwaway copies of the fight.
// The copies have the same cards and powers, so Vulnerable, Guard, multi-hits, all-enemy cards and side effects come
// out exactly as they would; anything that hangs on the order of a draw pile or on chance is left out (see HD.preview).
// The real fight is never touched.
(function () {
  const HD = globalThis.HD;
  const SHARED = new Set(['def', 'enc', 'map', 'ui']); // fixed data and screen hooks: the copy uses the same ones
  const DROPPED = new Set(['queue', 'feed']); // the real fight's actions in progress, and the screen's list of gains
  const WAIT_MS = 250; // a play that takes longer than this (it never should) shows no preview
  // The copy answers its own prompts with the first options and shows nothing.
  const QUIET = { choose: async (g, o) => o.from.slice(0, o.min != null ? o.min : o.n), fx() {}, pace() {}, handLeaving() {} };
  const isRng = (x) => typeof x.getState === 'function' && typeof x.setState === 'function' && typeof x.next === 'function';

  // A deep copy that keeps classes, shared references and hidden properties (a player's seat link).
  function copy(x, seen) {
    if (x === null || typeof x !== 'object') return x;
    if (seen.has(x)) return seen.get(x);
    if (isRng(x)) { const r = HD.makeRng(0); r.setState(x.getState()); seen.set(x, r); return r; }
    if (x instanceof Promise) return undefined;
    if (x instanceof Set) { const o = new Set(); seen.set(x, o); for (const v of x) o.add(copy(v, seen)); return o; }
    if (x instanceof Map) { const o = new Map(); seen.set(x, o); for (const [k, v] of x) o.set(k, copy(v, seen)); return o; }
    const o = Array.isArray(x) ? [] : Object.create(Object.getPrototypeOf(x));
    seen.set(x, o);
    for (const k of Reflect.ownKeys(x)) {
      const d = Object.getOwnPropertyDescriptor(x, k);
      if ('value' in d) d.value = SHARED.has(k) ? d.value : DROPPED.has(k) ? undefined : copy(d.value, seen);
      Object.defineProperty(o, k, d);
    }
    return o;
  }
  HD.copyFight = (g) => {
    const x = copy(g, new Map());
    x.ui = QUIET;
    let next = -1; // numbers below zero never clash with the real fight's
    x.uidSrc = () => next--;
    for (const s of x.seats) s.run.uidSrc = x.uidSrc;
    return x;
  };

  const hpOf = (t) => ({ hp: Math.max(0, t.hp), block: t.block });
  const read = (g) => {
    const out = {};
    for (const e of g.enemies) out[e.uid] = e.alive ? hpOf(e) : { hp: 0, block: 0 };
    for (const s of g.seats) out[`p${s.index}`] = s.dead ? { hp: 0, block: 0 } : hpOf(s.p);
    return out;
  };
  // The things a player cannot know: the order of every draw pile and how random picks will fall. A mixed copy has its
  // draw piles shuffled and every random stream reseeded.
  function unknown(x) {
    const seed = () => Math.floor(Math.random() * 4294967296);
    for (const s of x.seats) {
      const d = s.draw;
      for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
      for (const r of Object.values(s.run.rng)) r.setState(seed());
    }
    x.rng.setState(seed()); x.mrng.setState(seed());
  }
  // One play of the move on a copy of the fight (mixed: with the unknowns shuffled).
  async function trial(g, seat, a, mixed) {
    const x = HD.copyFight(g);
    const s = x.seats[seat];
    if (!s || x.over) return null;
    if (mixed) unknown(x);
    const before = read(x);
    const tg = x.enemies.find((e) => e.uid === a.target) || null;
    const run = () => x.withSeat(s, () => {
      if (a.k === 'potion') return x.usePotion(a.slot, tg);
      const c = x.hand.find((h) => h.uid === a.card);
      return c ? x.playCard(c, tg) : false;
    });
    let timer;
    const late = new Promise((res) => { timer = setTimeout(() => res('late'), WAIT_MS); });
    const done = await Promise.race([run(), late]);
    clearTimeout(timer);
    return done === 'late' || done === false ? null : { before, after: read(x) };
  }
  // seat: the player acting (an index); a: { k: 'play', card: uid, target } or { k: 'potion', slot, target }, where
  // target is an enemy's uid. The move is played on the real copy and on MIXES copies with the unknowns shuffled; only
  // what comes out the same every time is shown, so a preview never gives away the top of the draw pile (Cascade) or
  // where a random hit lands. Resolves with { out: { [enemy uid or 'p' + seat]: { hp, block } }, hidden } (hidden: some
  // change depends on the unknowns and is left out), or null when the move cannot be previewed.
  const MIXES = 5;
  HD.preview = async (g, seat, a) => {
    try {
      const real = await trial(g, seat, a, false);
      if (!real) return null;
      const all = [real];
      for (let i = 0; i < MIXES; i++) { const t = await trial(g, seat, a, true); if (!t) return null; all.push(t); }
      const out = {};
      let hidden = false;
      for (const k of Object.keys(real.before)) {
        const was = real.before[k];
        if (!all.some((t) => t.after[k].hp !== was.hp || t.after[k].block !== was.block)) continue; // untouched
        if (all.every((t) => t.after[k].hp === real.after[k].hp && t.after[k].block === real.after[k].block)) out[k] = real.after[k];
        else hidden = true;
      }
      return { out, hidden };
    } catch (e) {
      return null; // a preview must never break the real fight
    }
  };

  // Survival: the least extra Block the player needs to live through their own end of turn and the enemies' turn.
  // Played out on mixed copies only, keeping the worst case, so it never depends on the real draw pile or on luck.
  const SURVIVE_MIXES = 3;
  const MAX_EXTRA = 999;
  async function lives(g, seat, extra) {
    const x = HD.copyFight(g);
    const s = x.seats[seat];
    if (!s || x.over || s.dead) return null;
    unknown(x);
    s.p.block += extra;
    const run = async () => { await x.withSeat(s, () => x.seatTurnEnd()); if (!x.over) await x.enemyTurn(); return true; };
    let timer;
    const late = new Promise((res) => { timer = setTimeout(() => res('late'), WAIT_MS); });
    const done = await Promise.race([run(), late]);
    clearTimeout(timer);
    return done === 'late' ? null : !s.dead && s.p.hp > 0;
  }
  // Between simulations the browser gets a chance to paint (a posted message is the quickest way back; the tests'
  // sandbox has only setTimeout).
  const breather = typeof MessageChannel === 'function'
    ? () => new Promise((res) => { const ch = new MessageChannel(); ch.port1.onmessage = () => { ch.port1.close(); res(); }; ch.port2.postMessage(0); })
    : () => new Promise((res) => setTimeout(res, 0));
  const GUESS_SLACK = 10; // over the incoming attacks, for blockable damage at the end of the turn
  // Resolves with 0 (you live as you are), the Block still needed, Infinity (Block alone can't save you), or null.
  HD.blockNeeded = async (g, seat) => {
    try {
      // Every simulation starts from one snapshot, so a move made meanwhile can't mix two fights into one answer.
      const snap = HD.copyFight(g);
      const safe = async (extra) => {
        for (let i = 0; i < SURVIVE_MIXES; i++) {
          await breather();
          const ok = await lives(snap, seat, extra);
          if (ok === null) throw new Error('no answer');
          if (!ok) return false;
        }
        return true;
      };
      if (await safe(0)) return 0;
      // Blocking every attack is usually enough, so the search starts below that; only past it does it need the full range.
      const guess = Math.min(MAX_EXTRA, snap.incoming().total + GUESS_SLACK);
      let lo = 0, hi = guess; // lo dies, hi lives
      if (!(await safe(guess))) {
        if (!(await safe(MAX_EXTRA))) return Infinity;
        lo = guess; hi = MAX_EXTRA;
      }
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (await safe(mid)) hi = mid; else lo = mid; }
      return hi;
    } catch (e) {
      return null; // like the preview, this must never break the real fight
    }
  };
})();

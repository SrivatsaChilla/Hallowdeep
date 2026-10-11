// Damage preview: what a card or potion would do right now, found by playing it on a throwaway copy of the fight.
// The copy has the same cards, powers and RNG positions, so Vulnerable, Guard, multi-hits, all-enemy cards and
// side effects come out exactly as they would. The real fight is never touched.
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
  // seat: the player acting (an index); a: { k: 'play', card: uid, target } or { k: 'potion', slot, target }, where
  // target is an enemy's uid. Resolves with { [enemy uid or 'p' + seat]: { hp, block } } for everything that changes,
  // or null when the move cannot be previewed.
  HD.preview = async (g, seat, a) => {
    try {
      const x = HD.copyFight(g);
      const s = x.seats[seat];
      if (!s || x.over) return null;
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
      if (done === 'late' || done === false) return null;
      const after = read(x);
      const out = {};
      for (const k of Object.keys(before)) if (after[k] && (after[k].hp !== before[k].hp || after[k].block !== before[k].block)) out[k] = after[k];
      return out;
    } catch (e) {
      return null; // a preview must never break the real fight
    }
  };
})();

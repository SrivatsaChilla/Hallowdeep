// Cells (the Defect's Orbs): Prime puts one in the next empty slot (index 0 is the rightmost, the oldest), Release
// spends one. Passives run at the end of your turn (Flux at the start). Tuning (Focus) changes every Cell but Flux.
(function () {
  const HD = globalThis.HD;
  const C = HD.Combat.prototype;
  const MAX_SLOTS = 10;
  const hitAll = async (g, n) => { for (const e of g.alive()) { await g.damage(e, n, {}); if (g.over) return; } };
  const lowestHp = (g) => g.alive().reduce((a, e) => (!a || e.hp < a.hp ? e : a), null);
  // Bolt: Thunder adds damage to each enemy a released Bolt hits; Charged Core adds 1 to every Bolt.
  const boltHit = async (g, n, t, released) => {
    const e = t && t.alive ? t : g.randomEnemy(); if (!e) return;
    await g.damage(e, n, {});
    if (released && g.p.pw.rumble && e.alive && !g.over) await g.damage(e, g.p.pw.rumble, {});
  };
  const core = (g) => (g.has('CHARGED_CORE') ? 1 : 0);
  // Rime's Guard. Deep Sleep (co-op) gives every other player the same Guard.
  const rimeGuard = async (g, n) => { await g.gainBlock(n, false); if (g.p.pw.hibernate) for (const s of g.allies()) await g.withSeat(s, () => g.gainBlock(n, false)); };
  // Each Cell: passive and release amounts for display and play, when its passive runs, and what it does.
  HD.ORBS = {
    BOLT: { name: 'Bolt', at: 'end', pass: (g) => 3 + g.focus() + core(g), rel: (g) => 8 + g.focus() + core(g),
      passive: (g, o, t) => boltHit(g, g.orbAmt(o, 'pass'), t, false), release: (g, o) => boltHit(g, g.orbAmt(o, 'rel'), null, true),
      text: (p, r) => `Passive: at the end of your turn, deal ${p} damage to a random enemy. Release: deal ${r} damage to a random enemy.` },
    RIME: { name: 'Rime', at: 'end', pass: (g) => 2 + g.focus(), rel: (g) => 5 + g.focus(),
      passive: (g, o) => rimeGuard(g, g.orbAmt(o, 'pass')), release: (g, o) => rimeGuard(g, g.orbAmt(o, 'rel')),
      text: (p, r) => `Passive: at the end of your turn, gain ${p} Guard. Release: gain ${r} Guard.` },
    MURK: { name: 'Murk', at: 'end', start: 6, pass: (g) => 6 + g.focus(), rel: (g, o) => o.val,
      passive: (g, o) => { o.val += g.orbAmt(o, 'pass'); }, release: async (g, o) => { const e = lowestHp(g); if (e) await g.damage(e, o.val, {}); },
      text: (p, r) => `Passive: at the end of your turn, this Cell's damage grows by ${p}. Release: deal ${r} damage to the enemy with the lowest HP.` },
    FLUX: { name: 'Flux', at: 'start', pass: () => 1, rel: () => 2,
      passive: (g) => g.gainEnergy(1), release: (g) => g.gainEnergy(2),
      text: () => 'Passive: at the start of your turn, gain 1 Energy. Release: gain 2 Energy. Tuning does not change Flux.' },
    SHARD: { name: 'Shard', at: 'end', start: 4, pass: (g, o) => o.val + g.focus(), rel: (g, o) => 2 * Math.max(0, o.val + g.focus()),
      passive: async (g, o) => { await hitAll(g, g.orbAmt(o, 'pass')); o.val = Math.max(0, o.val - 1); }, release: (g, o) => hitAll(g, g.orbAmt(o, 'rel')),
      text: (p, r) => `Passive: at the end of your turn, deal ${p} damage to ALL enemies, then this drops by 1. Release: deal ${r} damage to ALL enemies.` },
  };
  HD.ORB_IDS = Object.keys(HD.ORBS);

  C.focus = function () { const pw = this.p.pw; return (pw.tuning || 0) + (pw.tuningTemp || 0) - (pw.tuningDown || 0); };
  C.orbAmt = function (o, kind) { return Math.max(0, HD.ORBS[o.id][kind](this, o)); };
  C.uniqueOrbs = function () { return new Set(this.orbs.map((o) => o.id)).size; };
  C.addOrbSlots = function (n) { this.orbSlots = Math.max(0, Math.min(MAX_SLOTS, this.orbSlots + n)); if (n > 0) this.hadOrbSlots = true;
    // Losing slots drops the newest Cells (leftmost) without releasing them.
    while (this.orbs.length > this.orbSlots) this.orbs.pop(); };
  C.channel = async function (id) {
    if (this.over || !HD.ORBS[id]) return;
    // A character without slots gets one the first time it Primes a Cell.
    if (this.orbSlots <= 0) { if (this.hadOrbSlots) return; this.addOrbSlots(1); }
    if (this.orbs.length >= this.orbSlots) await this.evokeRight(1);
    if (this.over) return;
    this.orbs.push({ uid: HD.uid(), id, val: HD.ORBS[id].start || 0 });
    this.rs.channeled = (this.rs.channeled || 0) + 1;
    this.rs['channeled' + id] = (this.rs['channeled' + id] || 0) + 1;
    await this.hook('channeled', id);
  };
  C.channelRandom = function () { return this.channel(this.rng.pick(HD.ORB_IDS)); };
  // Release a Cell `times` times, then remove it. Index 0 is the rightmost.
  C.evokeOrb = async function (o, times = 1) {
    for (let i = 0; i < times && !this.over; i++) { await HD.ORBS[o.id].release(this, o); await this.hook('evoked', o); }
    const i = this.orbs.indexOf(o); if (i >= 0) this.orbs.splice(i, 1);
  };
  C.evokeRight = async function (times = 1) { if (this.orbs.length) await this.evokeOrb(this.orbs[0], times); };
  C.evokeLeft = async function () { if (this.orbs.length) await this.evokeOrb(this.orbs[this.orbs.length - 1], 1); };
  C.orbPassive = async function (o, t) { if (!this.over && this.orbs.includes(o)) await HD.ORBS[o.id].passive(this, o, t); };
  // Run passives right to left; `when` is 'end', 'start' or 'all' (Emotion Chip triggers every Cell).
  C.orbPassives = async function (when) {
    for (const o of this.orbs.slice()) { if (this.over) return; if (when === 'all' || HD.ORBS[o.id].at === when) await this.orbPassive(o); }
  };

  HD.onEngine('turnStart', async (g) => { await g.orbPassives('start'); });
  HD.onEngine('turnEnd', async (g) => {
    await g.orbPassives('end');
    // Gilt Wiring: the rightmost Cell's passive runs once more.
    if (g.has('GILT_WIRING') && g.orbs.length && HD.ORBS[g.orbs[0].id].at === 'end') await g.orbPassive(g.orbs[0]);
  });
  HD.PW.tuning = { n: 'Tuning', t: 'buff', d: (a) => `Cells (except Flux) are ${Math.abs(a)} ${a < 0 ? 'weaker' : 'stronger'}.` };
  HD.PW.tuningTemp = { n: 'Tuning this turn', t: 'buff', d: (a) => `${a} extra Tuning until the end of your turn.` };
  HD.PW.tuningDown = { n: 'Tuning lost', t: 'debuff', d: (a) => `${a} less Tuning until the end of your turn.` };
  HD.TERMS.Cell = 'A Primed charge that works at the end of each turn (its passive) and once more when Released. You have a few Cell Slots.';
  HD.TERMS.Prime = 'Put a Cell in your next empty slot. If none is empty, your rightmost Cell is Released first.';
  HD.TERMS.Release = 'Use up your rightmost Cell for its Release effect.';
  HD.TERMS.Tuning = 'Each point makes Bolt, Rime, Murk and Shard Cells 1 stronger.';
  Object.assign(HD.TERMS, {
    Bolt: 'A Cell. Passive: deal 3 damage to a random enemy. Release: deal 8 damage to a random enemy.',
    Rime: 'A Cell. Passive: gain 2 Guard. Release: gain 5 Guard.',
    Murk: 'A Cell. Passive: its damage grows by 6. Release: deal its damage (6 to start) to the enemy with the lowest HP.',
    Flux: 'A Cell. Passive: at the start of your turn, gain 1 Energy. Release: gain 2 Energy. Tuning does not change it.',
    Shard: 'A Cell. Passive: deal 4 damage to ALL enemies, then it drops by 1. Release: deal double its passive damage to ALL enemies.',
  });
})();

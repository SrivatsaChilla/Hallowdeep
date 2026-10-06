// Clutch (the Necrobinder's Osty), Knell (Doom) and Wraiths (Souls). Rouse (Summon) brings Clutch in with that much HP,
// or adds it to his Max HP and HP. After Guard, enemy attack damage hits Clutch first. His attacks ignore your Might and
// Sapped. Knell kills a creature at the end of its own turn if its HP is at or below its Knell.
(function () {
  const HD = globalThis.HD;
  const C = HD.Combat.prototype;

  C.ostyAlive = function () { return !!(this.osty && this.osty.alive); };
  C.summon = async function (n) {
    if (n <= 0 || this.over) return;
    if (!this.ostyAlive()) this.osty = { uid: 'osty', name: 'Clutch', alive: true, hp: n, maxHp: n, pw: {} };
    else { this.osty.maxHp += n; this.osty.hp += n; }
    await this.hook('summoned', n);
  };
  C.healOsty = function (n) { if (this.ostyAlive()) this.osty.hp = Math.min(this.osty.maxHp, this.osty.hp + n); };
  C.killOsty = async function () {
    if (!this.ostyAlive()) return;
    this.osty.alive = false; this.osty.hp = 0;
    this.say('Clutch falls.');
    await this.hook('died', this.osty);
  };
  // Clutch loses HP (Necro Mastery passes it on to ALL enemies); returns how much he lost.
  C.ostyLoseHp = async function (n) {
    if (!this.ostyAlive() || n <= 0) return 0;
    const lost = Math.min(n, this.osty.hp);
    this.osty.hp -= lost;
    if (this.p.pw.boneMastery && lost > 0) for (const e of this.alive().slice()) { await this.loseHp(e, lost); if (this.over) return lost; }
    if (this.osty.hp <= 0) await this.killOsty();
    return lost;
  };
  C.ostyAbsorb = async function (dmg) { return dmg - (await this.ostyLoseHp(dmg)); };
  // Clutch's attack damage: his own number plus Harden, then the target's Exposed and Flutter; never your Might or Sapped.
  C.ostyDmg = function (base, t) {
    let d = base + (this.p.pw.harden || 0);
    if (t) {
      if (t.pw.flutter || t.pw.soar) d *= 0.5;
      if (t.pw.exposed) d *= 1 + (this.has('PAPER_NEWT') ? 0.75 : 0.5) * (t.pw.debilitate ? 2 : 1);
    }
    return Math.max(0, Math.floor(d));
  };
  // One Clutch attack (a card or a token): `hits` hits on one enemy. Does nothing while Clutch is down.
  C.ostyAttack = async function (t, base, hits = 1) {
    if (!this.ostyAlive() || this.over) return { fatal: false };
    this.t.ostyAttacks = (this.t.ostyAttacks || 0) + 1;
    let fatal = false;
    for (let i = 0; i < hits; i++) {
      if (!t || !t.alive || this.over || !this.ostyAlive()) break;
      const sic = t.pw.sicEm || 0;
      await this.damage(t, this.ostyDmg(base, t), { attack: true, src: this.osty, osty: true });
      if (!t.alive && !t.pw.minion && !t.fled) fatal = true;
      if (sic) await this.summon(sic);
    }
    await this.hook('ostyAttacked', t);
    return { fatal };
  };
  C.ostyAttackAll = async function (base) {
    if (!this.ostyAlive() || this.over) return;
    this.t.ostyAttacks = (this.t.ostyAttacks || 0) + 1;
    for (const e of this.alive().slice()) {
      const sic = e.pw.sicEm || 0;
      await this.damage(e, this.ostyDmg(base, e), { attack: true, src: this.osty, osty: true });
      if (this.over) return;
      if (sic) await this.summon(sic);
    }
    await this.hook('ostyAttacked', null);
  };
  // Knell: an enemy can Ward it off; on you it just builds up.
  C.applyDoom = async function (t, n) {
    if (!t || n <= 0 || this.over) return false;
    if (t.isPlayer) { this.addPw(t, 'doom', n); return true; }
    const ok = await this.apply(t, 'doom', n);
    if (ok) { this.t.doomApplied = true; await this.hook('doomApplied', t, n); }
    return ok;
  };
  C.doomKill = async function (e) {
    if (!e.alive) return;
    this.say(`${e.name}'s Knell tolls.`);
    e.hp = 0;
    await this.kill(e);
    await this.hook('doomKilled', e);
  };
  C.addWraiths = async function (n, where = 'draw', up = false) { for (let i = 0; i < n && !this.over; i++) await this.create(this.makeCard('WRAITH', up), where); };

  HD.DEBUFFS.add('doom'); HD.DEBUFFS.add('debilitate'); HD.DEBUFFS.add('oblivion'); HD.DEBUFFS.add('sicEm');
  HD.PW.doom = { n: 'Knell', t: 'debuff', d: (a) => `At the end of its turn, if its HP is ${a} or less, it dies.` };
  HD.TERMS.Clutch = 'Your bony left hand. Rouse him to give him HP. He takes enemy attack damage after your Guard, and some cards make him attack.';
  HD.TERMS.Rouse = 'Bring Clutch in with that much HP. If he is already here, raise his Max HP and HP by that much this combat.';
  HD.TERMS.Knell = 'At the end of its turn, a creature dies if its HP is at or below its Knell.';
  HD.TERMS.Wraith = 'A 0-cost token: draw 2 cards, Burn.';
})();

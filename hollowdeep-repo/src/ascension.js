// Ascension: ten levels of extra difficulty, each including the ones below it. Rules follow the data (ascensions.json and
// the mechanics constants); Gloom's rest-site count and Scarcity's upgrade rate are not in the data (see FIDELITY.md).
(function () {
  const HD = globalThis.HD;
  HD.ASCENSIONS = [
    { hd: 'No Ascension', orig: 'No Ascension', text: 'Play without any Ascension modifiers.' },
    { hd: 'Crowded Halls', orig: 'Swarming Elites', text: 'Elites spawn more often.' },
    { hd: 'Weary Feet', orig: 'Weary Traveler', text: 'Ancients only heal 80% of your missing HP.' },
    { hd: 'Lean Purse', orig: 'Poverty', text: 'Enemies and Treasure Chests drop 25% less Gold.' },
    { hd: 'Short Belt', orig: 'Tight Belt', text: 'Start each run with 1 less potion slot.' },
    { hd: "Delver's Bane", orig: "Ascender's Bane", text: 'Start each run Cursed.' },
    { hd: 'Fading Fires', orig: 'Gloom', text: 'Fewer Rest Sites.' },
    { hd: 'Thin Pickings', orig: 'Scarcity', text: 'Rare and Upgraded cards appear less often.' },
    { hd: 'Thick Hides', orig: 'Tough Enemies', text: 'All enemies are harder to kill.' },
    { hd: 'Sharp Teeth', orig: 'Deadly Enemies', text: 'All enemies have deadlier attacks.' },
    { hd: 'Twin Wardens', orig: 'Double Boss', text: 'Fight two bosses at the end of Act 3.' },
  ];
  HD.ascName = (n) => { const a = HD.ASCENSIONS[n] || HD.ASCENSIONS[0]; return HD.nameMode === 'original' ? a.orig : a.hd; };
  HD.ascText = (n) => HD.sub ? HD.sub(HD.ASCENSIONS[n].text) : HD.ASCENSIONS[n].text;

  // Ascension 5: the curse every run starts with.
  HD.CARDS.DELVERS_BANE = { id: 'DELVERS_BANE', name: "Delver's Bane", type: 'Curse', rarity: 'Curse', color: 'curse', cost: null, target: 'self',
    kw: ['Fleeting', 'Unplayable', 'Eternal'], tags: [], v: {}, up: {}, text: () => '' };

  // Ascension 10: a second, different Act 3 boss right after the first.
  HD.Run.prototype.secondBossFor = function () {
    if (this.asc < 10 || this.act !== HD.LAST_ACT || this.secondBoss) return null;
    const pool = HD.encPool('boss', this.act).filter((k) => k !== this.boss);
    this.secondBoss = pool.length ? this.rng.enc.pick(pool) : this.boss;
    return this.secondBoss;
  };
})();

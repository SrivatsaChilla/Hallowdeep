// Neow relics found missing by the audit, their cards and potion, and Circlet (the relic you get when the pools run dry).
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS, R = HD.RELICS;
  const relic = (id, o) => { R[id] = Object.assign({ id, rarity: 'Ancient', pool: 'neow' }, o); };

  relic('FISHING_LINE', { name: 'Fishing Line', text: 'Every 3 normal combats, Upgrade a random card in your deck.',
    afterCombat: (run, r, kind) => {
      if (kind !== 'monster') return;
      r.counter = (r.counter || 0) + 1;
      if (r.counter >= 3) { r.counter = 0; const xs = run.deck.filter((c) => !c.up && ['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type)); if (xs.length) run.upgrade(run.rng.misc.pick(xs)); }
    } });
  relic('PRISM_GLASS', { name: 'Prism Glass', text: 'On pickup, obtain 2 card rewards from other characters.',
    onPickup: (run) => {
      const others = Object.values(HD.CHARS).filter((ch) => ch.id !== run.charId).map((ch) => ch.color);
      for (let i = 0; i < 2; i++) {
        const color = run.rng.cards.pick(others);
        const out = [];
        for (let k = 0; k < 3; k++) {
          const r = run.rng.cards.next(), rar = r < 0.03 ? 'Rare' : r < 0.37 ? 'Uncommon' : 'Common';
          const pool = HD.POOL(color).filter((d) => d.rarity === rar && !out.some((c) => c.id === d.id));
          if (pool.length) out.push({ id: run.rng.cards.pick(pool).id, up: false });
        }
        run.pending.push({ kind: 'cards', cards: out });
      }
    } });
  relic('DIVINING_ROD', { name: 'Divining Rod', only: '0.111', text: 'On pickup, add 1 Divining to your deck.', onPickup: (run) => run.addCard('DIVINING') });
  relic('ROOT_OFFERING', { name: 'Root Offering', only: '0.111', bane: true, text: 'On pickup, procure 1 Ambergris and add 1 Guilt to your deck.',
    onPickup: (run) => { if (!run.addPotion('AMBERGRIS')) run.pending.push({ kind: 'potion', id: 'AMBERGRIS' }); run.addCard('GUILT'); } });
  HD.NEOW.boons.push('FISHING_LINE', 'PRISM_GLASS', 'DIVINING_ROD');
  HD.NEOW.banes.push('ROOT_OFFERING');
  // Version-only Neow relics stay out of the other version's offers.
  const offer = HD.neowBoons;
  HD.neowBoons = (run, bane) => offer(run, bane).filter((id) => !R[id].only || R[id].only === HD.version);
  if (HD.Run.prototype.neowOffer) {
    const no = HD.Run.prototype.neowOffer;
    HD.Run.prototype.neowOffer = function () {
      const keep = HD.NEOW.banes; HD.NEOW.banes = keep.filter((id) => !R[id].only || R[id].only === HD.version);
      try { return no.call(this); } finally { HD.NEOW.banes = keep; }
    };
  }

  // Dowsing: a quest card that turns into Abundance after 5 more ? rooms.
  CARDS.DIVINING = { id: 'DIVINING', name: 'Divining', type: 'Quest', rarity: 'Quest', color: 'quest', cost: null, target: 'self', kw: ['Unplayable'], tags: [], v: { rooms: 5 }, up: {}, lifetimeRooms: 5,
    text: (v, f, c) => `After entering ${c && c.left != null ? c.left : v.rooms} more ? rooms, Transforms into Abundance.` };
  CARDS.ABUNDANCE = { id: 'ABUNDANCE', name: 'Abundance', type: 'Skill', rarity: 'Ancient', color: 'event', cost: 1, upCost: 0, target: 'self', kw: ['Burn'], tags: [], v: {}, up: {},
    text: () => 'Choose 1 of 3 Upgraded Powers to add to your hand. It is free to play this turn.',
    play: async (g) => {
      const ids = g.rng.shuffle(HD.POOL(g.run.color).filter((d) => d.type === 'Power').map((d) => d.id)).slice(0, 3);
      const [x] = await g.choose({ from: ids.map((id) => g.makeCard(id, true)), n: 1, prompt: 'Choose a Power' });
      if (x) { x.freeTurn = true; g.addToHand(x); }
    } };
  const add = HD.Run.prototype.addCard;
  HD.Run.prototype.addCard = function (id, ...rest) { const c = add.call(this, id, ...rest); if (c && id === 'DIVINING') c.left = 5; return c; };
  const hook = HD.Run.prototype.hook;
  HD.Run.prototype.hook = function (name, ...args) {
    const out = hook.call(this, name, ...args);
    if (name === 'onUnknown') for (const c of this.deck.filter((x) => x.id === 'DIVINING')) { c.left = (c.left == null ? 5 : c.left) - 1; if (c.left <= 0) { this.removeCard(c); this.addCard('ABUNDANCE'); } }
    return out;
  };

  // Ambergris: heal half your Max HP; in combat, also take an extra turn.
  HD.POTIONS.AMBERGRIS = { id: 'AMBERGRIS', name: 'Ambergris', rarity: 'Event', pool: 'event', target: 'self', outside: true,
    text: 'Heal for 50% of your Max HP. If used in combat, take an extra turn.',
    use: async (g) => { g.heal(Math.floor(g.p.maxHp * 0.5)); g.p.pw.extraTurn = 1; },
    useOutside: (run) => run.heal(Math.floor(run.maxHp * 0.5)) };
  HD.PW.extraTurn = { n: 'Extra Turn', t: 'buff', d: () => 'After this turn, you take another turn.' };

  // Circlet: what you get when there are no relics left to give.
  R.CIRCLET = { id: 'CIRCLET', rarity: 'Special', pool: 'shared', name: 'Circlet', text: "It's a circlet." };
  const roll = HD.Run.prototype.rollRelic;
  HD.Run.prototype.rollRelic = function (...a) { return roll.apply(this, a) || 'CIRCLET'; };
})();

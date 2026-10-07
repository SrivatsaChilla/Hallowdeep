// Run layer: map generation, encounter picks, rewards, potions, shop, rest. Numbers follow the reference build.
(function () {
  const HD = globalThis.HD;
  const CARDS = HD.CARDS;
  const COLS = 7;
  HD.ACT_ROWS = { 1: 15, 2: 14, 3: 13 };
  HD.LAST_ACT = 2; // Acts after this one are not built yet; beating its boss wins the run.

  // Map: 7-column grid, 15 rooms. Row 0 fights, row 8 treasure, last row rest.
  // Room counts per act: 5 elites, 3 shops, 10-14 unknown, 6-7 rests, fights fill the rest.
  // short: co-op acts are one floor shorter.
  HD.genMap = function (rng, act = 1, asc = 0, short = false) {
    const ROWS = HD.ACT_ROWS[act] - (short ? 1 : 0);
    const nodes = {};
    const key = (r, c) => `${r},${c}`;
    const get = (r, c) => nodes[key(r, c)] || (nodes[key(r, c)] = { key: key(r, c), r, c, type: null, next: [], prev: [] });
    const edges = new Set();
    let first = -1;
    for (let p = 0; p < 6; p++) {
      let c = rng.int(COLS);
      if (p === 1) while (c === first) c = rng.int(COLS);
      if (p === 0) first = c;
      get(0, c);
      for (let r = 0; r < ROWS - 1; r++) {
        const opts = rng.shuffle([c - 1, c, c + 1].filter((x) => x >= 0 && x < COLS));
        let nx = opts.find((x) => x === c || !edges.has(`${key(r, x)}>${key(r + 1, c)}`));
        if (nx === undefined) nx = c;
        const a = get(r, c), b = get(r + 1, nx);
        if (!a.next.includes(b.key)) { a.next.push(b.key); b.prev.push(a.key); }
        edges.add(`${a.key}>${b.key}`);
        c = nx;
      }
    }
    const list = Object.values(nodes).sort((a, b) => a.r - b.r || a.c - b.c);
    for (const n of list) {
      if (n.r === 0) n.type = 'monster';
      else if (n.r === ROWS - 1) n.type = 'rest';
      else if (n.r === ROWS - 7) n.type = 'treasure';
    }
    const free = list.filter((n) => !n.type);
    const bag = [];
    const push = (t, k) => { for (let i = 0; i < k; i++) bag.push(t); };
    push('elite', asc >= 1 ? 8 : 5); push('shop', 3);
    push('unknown', act === 1 ? rng.gauss(10, 14) : rng.gauss(9, 13));
    push('rest', (act === 3 ? rng.range(5, 6) : rng.range(6, 7)) - (asc >= 6 ? 1 : 0));
    while (bag.length < free.length) bag.push('monster');
    bag.length = free.length;
    rng.shuffle(bag);
    const special = ['elite', 'rest', 'shop'];
    const ok = (n, t) => {
      if ((t === 'elite' || t === 'rest') && n.r < 5) return false;
      if (t === 'rest' && n.r === ROWS - 2) return false;
      if (special.includes(t) && n.prev.some((k) => nodes[k].type === t)) return false;
      if (t !== 'monster') for (const pk of n.prev) for (const sk of nodes[pk].next) if (sk !== n.key && nodes[sk].type === t) return false;
      return true;
    };
    free.forEach((n, i) => {
      for (let j = i; j < bag.length; j++) {
        if (ok(n, bag[j])) { [bag[i], bag[j]] = [bag[j], bag[i]]; n.type = bag[i]; return; }
      }
      n.type = 'monster';
    });
    return { nodes, rows: ROWS, cols: COLS };
  };

  const RELIC_PRICE = { Common: 175, Uncommon: 225, Rare: 275, Shop: 200 };
  const POTION_PRICE = { Common: 50, Uncommon: 75, Rare: 100 };
  const CARD_PRICE = { Common: 50, Uncommon: 75, Rare: 150 };

  class Run {
    // o (co-op): party is the number of players; mapSeed gives every player the same maps.
    constructor(seedStr, charId = 'OATHBURNER', asc = 0, o = {}) {
      this.seed = seedStr;
      this.charId = charId;
      this.asc = Math.max(0, Math.min(10, asc | 0)); // Ascension level (each level includes the ones below it)
      this.playMs = 0; // run timer: time spent in this run while the page was visible
      this.color = HD.CHARS[charId].color;
      this.party = o.party || 1; // players in the run; co-op cards join the pools when there are more
      const mk = (k) => HD.makeRng(HD.hashSeed(`${seedStr}:${k}`));
      this.rng = { map: mk('map'), combat: mk('combat'), monster: mk('monster'), cards: mk('cards'), shop: mk('shop'),
        relic: mk('relic'), gold: mk('gold'), misc: mk('misc'), enc: mk('enc'), potion: mk('potion'), neow: mk('neow'), event: mk('event') };
      if (o.mapSeed) this.rng.map = HD.makeRng(HD.hashSeed(`${o.mapSeed}:map`));
      const ch = HD.CHARS[charId];
      this.maxHp = ch.hp; this.hp = ch.hp; this.gold = ch.gold;
      this.deck = [];
      ch.deck.forEach((id) => this.deck.push(this.newCard(id, false)));
      if (this.asc >= 5) this.deck.push(this.newCard('DELVERS_BANE', false));
      this.relics = [{ id: ch.relic }];
      this.potions = this.asc >= 4 ? [null, null] : [null, null, null];
      this.potionOdds = 0.4;
      this.pending = [];
      this.act = 1; this.floor = 0;
      this.rarityOffset = -5; this.removals = 0; this.fights = 0; this.combats = 0;
      this.encHist = []; this.eliteHist = [];
      this.map = HD.genMap(this.rng.map, 1, this.asc, this.party > 1);
      this.pos = null;
      this.path = [];
      this.boss = this.rng.enc.pick(HD.encPool('boss', 1));
    }

    // ---------- basics ----------
    newCard(id, up) { return { uid: HD.uid(), id, up: !!up }; }
    // The cards this run can offer or create: the character's, or another color's, plus co-op cards in a party.
    pool(color = this.color) { return HD.POOL(color, this.party > 1); }
    hasRelic(id) { return this.relics.some((r) => r.id === id); }
    relic(id) { return this.relics.find((r) => r.id === id); }
    hook(name, ...args) { for (const r of this.relics.slice()) { const d = HD.RELICS[r.id]; if (d && d[name]) d[name](this, r, ...args); } }
    heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
    // The UI shows every gain as it happens (relic, card, potion, gold, Max HP). Only set when a UI is attached.
    note(item) { if (this.feed) this.feed.push(item); }
    gainMaxHp(n) { this.maxHp += n; this.hp += n; this.note({ kind: 'maxhp', n }); }
    loseMaxHp(n) { this.maxHp = Math.max(1, this.maxHp - n); this.hp = Math.min(this.hp, this.maxHp); this.note({ kind: 'maxhp', n: -n }); }
    upgrade(c) { if (c.up || !['Attack', 'Skill', 'Power'].includes(CARDS[c.id].type)) return; c.up = true; this.note({ kind: 'upgraded', id: c.id }); }
    // Cards that can leave the deck (Eternal curses stay).
    removable() { return this.deck.filter((c) => !HD.kwOf(c).includes('Eternal')); }
    removeCard(c) { const i = this.deck.indexOf(c); if (i >= 0) { this.deck.splice(i, 1); this.note({ kind: 'removed', id: c.id, up: c.up }); } }
    // Transform: swap a card for a different random card from the character's pool.
    transform(c) {
      const pool = this.pool().filter((d) => d.id !== c.id);
      this.removeCard(c);
      return this.addCard(this.rng.misc.pick(pool).id, false);
    }
    choiceDone(it, v) {
      if (it.act === 'relicTake') this.addRelic(v);
      if (it.act === 'potionGive') { this.potions[v] = null; const id = this.rollRelic(); if (id) this.addRelic(id); }
      if (it.act === 'relicGive' || it.act === 'relicTrade') {
        const i = this.relics.findIndex((r) => r.id === v); if (i >= 0) this.relics.splice(i, 1);
        if (it.act === 'relicTrade') this.addRelic(it.get);
        else for (let k = 0; k < (it.n || 1); k++) { const id = this.rollRelic(); if (id) this.addRelic(id); }
      }
    }
    // A new act: fresh map, boss, weak-fight count and ? room odds. The floor count carries on.
    startAct(n) {
      this.act = n;
      this.map = HD.genMap(this.rng.map, n, this.asc, this.party > 1);
      this.pos = null; this.path = [];
      this.fights = 0; this.encHist = []; this.eliteHist = [];
      this.boss = this.rng.enc.pick(HD.encPool('boss', n));
      this.unknownOdds = null;
      this.floor++;
    }
    // Ancients after Neow: heal to full, then three relics from one Ancient's pool.
    ancientOffer() {
      this.hp = this.maxHp;
      const ids = Object.keys(HD.ANCIENTS);
      this.ancient = this.rng.neow.pick(ids);
      return this.rng.neow.shuffle(HD.ANCIENTS[this.ancient].pool.filter((id) => !this.hasRelic(id))).slice(0, 3);
    }
    // The Rootmother: heal to full, then offer 2 boons and 1 bane.
    neowOffer() {
      this.hp = this.maxHp;
      this.floor = 1;
      // Co-op: no Tin Crucible (Silver Crucible) and no Moth Boots (Winged Boots).
      const bane = this.rng.neow.pick(this.party > 1 ? HD.NEOW.banes.filter((id) => id !== 'TIN_CRUCIBLE') : HD.NEOW.banes);
      const boons = this.rng.neow.shuffle(HD.neowBoons(this, bane).filter((id) => this.party === 1 || id !== 'MOTH_BOOTS')).slice(0, 2);
      return [...boons, bane];
    }
    gainGold(n) {
      if (n <= 0 || this.hasRelic('GHOST_SLIME')) return 0;
      if (this.hasRelic('TALL_HAT')) n = Math.floor(n * 1.25);
      this.gold += n;
      this.note({ kind: 'gold', n });
      if (this.hasRelic('SCALEFRUIT')) this.gainMaxHp(1);
      return n;
    }
    goldPreview(n) { return this.hasRelic('TALL_HAT') ? Math.floor(n * 1.25) : n; }
    addCard(id, up, ench, extra) {
      const egg = Object.values(HD.RELICS).find((d) => d.eggType === CARDS[id].type && this.hasRelic(d.id));
      const c = this.newCard(id, up || !!egg);
      if (CARDS[id].lifetime) c.left = CARDS[id].lifetime;
      if (ench) c.ench = { ...ench };
      if (extra) Object.assign(c, extra);
      this.deck.push(c);
      this.note({ kind: 'card', id, up: c.up, ench: c.ench });
      this.hook('onCardAdded', c);
      return c;
    }
    // After every won combat: relic hooks, then cards that leave the deck after a number of combats.
    combatDone(kind) {
      this.hook('afterCombat', kind);
      for (const c of this.deck.slice()) if (c.left != null && --c.left <= 0) this.removeCard(c);
    }
    addRelic(id) {
      if (!id) return;
      const r = { id };
      this.relics.push(r);
      this.note({ kind: 'relic', id });
      const d = HD.RELICS[id];
      if (d.onPickup) d.onPickup(this, r);
    }

    // ---------- potions ----------
    addPotionSlots(n) { for (let i = 0; i < n; i++) this.potions.push(null); }
    freeSlot() { return this.potions.indexOf(null); }
    addPotion(id) { const i = this.freeSlot(); if (i < 0 || !id || this.hasRelic('DRY_FLASK')) return false; this.potions[i] = id; this.note({ kind: 'potion', id, slot: i }); return true; }
    randomPotion() {
      const r = this.rng.potion.next();
      const rar = r < 0.65 ? 'Common' : r < 0.9 ? 'Uncommon' : 'Rare';
      return this.rng.potion.pick(HD.potionPool(rar, this.color));
    }
    fillPotions() { for (let i = 0; i < this.potions.length; i++) if (!this.potions[i]) this.potions[i] = this.randomPotion(); }
    // Pity: 40% start, -10% on a drop, +10% on a miss. Elites add 12.5% to that one roll.
    rollPotionDrop(kind) {
      const th = this.potionOdds + (kind === 'elite' ? 0.125 : 0);
      const drop = this.hasRelic('PALE_IDOL') || this.rng.potion.next() < th;
      this.potionOdds += drop ? -0.1 : 0.1;
      return drop ? this.randomPotion() : null;
    }

    reachable() {
      const ns = this.map.nodes;
      if (!this.pos) return Object.values(ns).filter((n) => n.r === 0).map((n) => n.key);
      if (this.pos === 'BOSS') return [];
      const cur = ns[this.pos];
      if (cur.r === this.map.rows - 1) return ['BOSS'];
      const boots = this.relic('MOTH_BOOTS');
      if (boots && boots.charges > 0 && this.party === 1) return Object.values(ns).filter((n) => n.r === cur.r + 1).map((n) => n.key);
      return cur.next.slice();
    }
    // Moves to a room; leaving the drawn paths spends a Moth Boots charge.
    moveTo(key) {
      const cur = this.pos && this.pos !== 'BOSS' ? this.map.nodes[this.pos] : null;
      if (cur && key !== 'BOSS' && !cur.next.includes(key)) this.relic('MOTH_BOOTS').charges--;
      this.pos = key; this.path.push(key); this.floor++;
    }
    pickEncounter(kind) {
      let pool = kind;
      if (kind === 'monster') pool = this.fights < (this.act === 1 ? 3 : 2) ? 'weak' : 'normal';
      const hist = kind === 'elite' ? this.eliteHist : this.encHist;
      const all = HD.encPool(pool, this.act);
      const opts = all.filter((k) => !hist.slice(kind === 'elite' ? -1 : -2).includes(k));
      const k = this.rng.enc.pick(opts.length ? opts : all);
      hist.push(k);
      if (kind === 'monster') this.fights++;
      return k;
    }

    // ---------- cards ----------
    // Rarity bands: rare = base + offset, uncommon sits on top of it, common gets the rest.
    rollRarity(kind, mutate) {
      if (kind === 'boss') return 'Rare';
      if (kind === 'plain') { const r = this.rng.cards.next() * 100; return r < 3 ? 'Rare' : r < 37 ? 'Uncommon' : 'Common'; }
      const scarce = this.asc >= 7;
      const base = (scarce ? { monster: 1.49, elite: 5, shop: 4.5 } : { monster: 3, elite: 10, shop: 9 })[kind];
      const unc = { monster: 37, elite: 40, shop: 37 }[kind];
      const edge = base + this.rarityOffset;
      const r = this.rng.cards.next() * 100;
      const rar = r < edge ? 'Rare' : r < edge + unc ? 'Uncommon' : 'Common';
      if (mutate) this.rarityOffset = rar === 'Rare' ? -5 : Math.min(40, this.rarityOffset + (scarce ? 0.5 : 1));
      return rar;
    }
    cardReward(kind, forceRarity) {
      const pool = this.pool();
      const out = [];
      for (let i = 0; i < 3; i++) {
        const rar = forceRarity || this.rollRarity(kind, kind === 'monster' || kind === 'elite' || kind === 'boss');
        const rug = this.hasRelic('WORN_RUG') ? this.pool('colorless') : [];
        const cands = pool.concat(rug).filter((d) => d.rarity === rar && !out.includes(d.id));
        out.push(this.rng.cards.pick(cands).id);
      }
      if (kind === 'boss') this.rarityOffset = -5;
      // Upgrade chance: 0% in Act 1, 25% in Act 2, 50% in Act 3. Rares are never upgraded this way.
      const upChance = ([0, 0, 0.25, 0.5][this.act] || 0) * (this.asc >= 7 ? 0.5 : 1);
      return out.map((id) => ({ id, up: CARDS[id].rarity !== 'Rare' && this.rng.cards.next() < upChance }));
    }
    // Card rewards the player is offered; Tin Crucible upgrades the first 3.
    rewardCards(kind, forceRarity) {
      const cards = this.cardReward(kind, forceRarity);
      const tc = this.relic('TIN_CRUCIBLE');
      if (tc && (tc.counter || 0) < 3) { tc.counter = (tc.counter || 0) + 1; for (const c of cards) c.up = true; }
      return cards;
    }
    // A reward list: gold, potion, relic, and one or more card picks.
    combatRewards(kind, g) {
      this.combats++;
      const items = [];
      let gold = kind === 'boss' ? 100 : kind === 'elite' ? this.rng.gold.range(35, 45) : this.rng.gold.range(10, 20);
      if (this.asc >= 3) gold = Math.floor(gold * 0.75);
      if (this.hasRelic('VIOLET_GOURD')) gold += 15;
      items.push({ kind: 'gold', n: gold });
      const pot = this.rollPotionDrop(kind);
      if (pot && !this.hasRelic('DRY_FLASK')) items.push({ kind: 'potion', id: pot });
      if (kind === 'elite') for (let i = 0; i < (this.hasRelic('DARK_STAR') ? 2 : 1); i++) { const r = this.rollRelic(); if (r) items.push({ kind: 'relic', id: r }); }
      if (kind === 'boss' && this.act === 1 && this.hasRelic('MAGMA_PEBBLE')) for (let i = 0; i < 2; i++) { const r = this.rollRelic(); if (r) items.push({ kind: 'relic', id: r }); }
      const picks = [this.rewardCards(kind)];
      if (kind === 'monster' && this.hasRelic('SPINNING_WHEEL')) picks.push(this.rewardCards(kind));
      if (kind === 'elite' && this.hasRelic('PALE_STAR')) picks.push(this.rewardCards('elite', 'Rare'));
      if (this.hasRelic('LONG_SWEET') && this.combats % 2 === 0) {
        const powers = this.pool().filter((d) => d.type === 'Power');
        for (const p of picks) { const extra = this.rng.cards.pick(powers.filter((d) => !p.some((c) => c.id === d.id))); p.push({ id: extra.id, up: false }); }
      }
      if (this.hasRelic('MAGMA_LAMP') && g && g.lostHpTimes === 0) for (const p of picks) for (const c of p) if (CARDS[c.id].type !== 'Status') c.up = true;
      for (let i = 0; i < ((g && g.extraCardReward) || 0); i++) picks.push(this.rewardCards(kind));
      for (const p of picks) items.push({ kind: 'cards', cards: p });
      return items;
    }

    // ---------- relics ----------
    // 50% common, 33% uncommon, 17% rare; an empty tier falls through to the next one up.
    rollRelic() {
      const r = this.rng.relic.next();
      const order = ['Common', 'Uncommon', 'Rare'];
      let i = r < 0.5 ? 0 : r < 0.83 ? 1 : 2;
      for (; i < order.length; i++) { const pool = HD.relicPool(order[i], this); if (pool.length) return this.rng.relic.pick(pool); }
      return null;
    }
    treasure() {
      const tc = this.relic('TIN_CRUCIBLE');
      if (tc && !tc.used) { tc.used = true; return { gold: 0, relic: null, empty: true }; }
      const g = this.rng.gold.range(42, 52);
      return { gold: this.asc >= 3 ? Math.floor(g * 0.75) : g, relic: this.rollRelic() };
    }

    // ---------- rest ----------
    restHeal() { return Math.floor(this.maxHp * 0.3) + (this.hasRelic('DOWN_PILLOW') ? 15 : 0); }
    restOptions() {
      const o = ['rest', 'smith'];
      const kb = this.relic('KETTLEBELL');
      if (kb && (kb.lifts || 0) < 3) o.push('lift');
      if (this.hasRelic('SPADE')) o.push('dig');
      if (this.deck.some((c) => c.id === 'ROC_EGG')) o.push('hatch');
      if (this.deck.some((c) => c.ench && c.ench.id === 'CLONE')) o.push('clone');
      return o;
    }

    // ---------- shop ----------
    priceMult() { return (this.hasRelic('GUILD_TOKEN') ? 0.5 : 1) * (this.hasRelic('THE_RUNNER') ? 0.8 : 1); }
    removalCost() { return Math.round((75 + 25 * this.removals) * this.priceMult()); }
    shopCard(type, taken) {
      const sh = this.rng.shop;
      const pool = this.pool();
      let rar = this.rollRarity('shop', false);
      if (type === 'Power' && rar === 'Common') rar = 'Uncommon';
      let cands = pool.filter((d) => d.type === type && d.rarity === rar && !taken.includes(d.id));
      if (!cands.length) cands = pool.filter((d) => d.type === type && !taken.includes(d.id));
      const d = sh.pick(cands);
      return { id: d.id, base: Math.round(CARD_PRICE[d.rarity] * sh.float(0.95, 1.05)), type };
    }
    shopRelic(rarity) {
      const sh = this.rng.shop;
      let pool = [];
      if (rarity === 'Shop') pool = HD.relicPool('Shop', this);
      else {
        const r = sh.next();
        const order = ['Common', 'Uncommon', 'Rare'];
        for (let i = r < 0.5 ? 0 : r < 0.83 ? 1 : 2; i < 3 && !pool.length; i++) pool = HD.relicPool(order[i], this);
      }
      pool = pool.filter((id) => !HD.RELICS[id].noShop && !(this.shop && this.shop.relics.some((x) => x.id === id)));
      if (!pool.length) return null;
      const id = sh.pick(pool);
      return { id, base: Math.round(RELIC_PRICE[HD.RELICS[id].rarity] * sh.float(0.85, 1.15)) };
    }
    shopColorless(rar) {
      const pool = this.pool('colorless').filter((d) => d.rarity === rar && !(this.shop && (this.shop.colorless || []).some((x) => x.id === d.id)));
      const d = this.rng.shop.pick(pool);
      return { id: d.id, rar, base: Math.round(CARD_PRICE[rar] * 1.15 * this.rng.shop.float(0.95, 1.05)) };
    }
    shopPotion() {
      const id = this.randomPotion();
      return { id, base: Math.round(POTION_PRICE[HD.POTIONS[id].rarity] * this.rng.shop.float(0.95, 1.05)) };
    }
    makeShop() {
      this.shop = { cards: [], relics: [], potions: [], removed: false };
      const s = this.shop;
      for (const type of ['Attack', 'Attack', 'Skill', 'Skill', 'Power']) s.cards.push(this.shopCard(type, s.cards.map((c) => c.id)));
      const sale = this.rng.shop.int(5);
      s.cards[sale].sale = true;
      for (const rar of ['any', 'any', 'Shop']) { const x = this.shopRelic(rar); if (x) s.relics.push(x); }
      for (let i = 0; i < 3; i++) s.potions.push(this.shopPotion());
      s.colorless = ['Uncommon', 'Rare'].map((rar) => this.shopColorless(rar));
      return s;
    }
    price(item) { return Math.round(item.base * (item.sale ? 0.5 : 1) * this.priceMult()); }
    // Buying empties the slot unless The Runner restocks it.
    buy(kind, i) {
      const s = this.shop;
      const it = s[kind][i];
      if (!it || it.sold) return false;
      const cost = this.price(it);
      if (this.gold < cost) return false;
      if (kind === 'potions' && this.freeSlot() < 0) return false;
      this.gold -= cost;
      if (kind === 'cards' || kind === 'colorless') this.addCard(it.id, false);
      if (kind === 'relics') this.addRelic(it.id);
      if (kind === 'potions') this.addPotion(it.id);
      if (this.hasRelic('THE_RUNNER')) {
        const next = kind === 'cards' ? this.shopCard(it.type, s.cards.map((c) => c.id)) : kind === 'colorless' ? this.shopColorless(it.rar) : kind === 'relics' ? this.shopRelic('any') : this.shopPotion();
        s[kind][i] = next || { sold: true };
      } else it.sold = true;
      return true;
    }
  }
  // Save and resume: plain data plus the position of every RNG stream.
  const SAVE_SKIP = new Set(['rng', 'deck', 'feed']);
  Run.prototype.toSave = function () {
    const data = {};
    for (const [k, v] of Object.entries(this)) if (!SAVE_SKIP.has(k)) data[k] = v;
    data.deck = this.deck.map((c) => ({ id: c.id, up: c.up, left: c.left, ench: c.ench, rider: c.rider, grow: c.grow }));
    const rng = {};
    for (const [k, r] of Object.entries(this.rng)) rng[k] = r.getState();
    return JSON.parse(JSON.stringify({ seed: this.seed, data, rng }));
  };
  Run.fromSave = function (o) {
    const r = new Run(o.seed, (o.data && o.data.charId) || 'OATHBURNER');
    Object.assign(r, o.data);
    r.deck = o.data.deck.map((c) => Object.assign(r.newCard(c.id, c.up), c.left != null ? { left: c.left } : {}, c.ench ? { ench: c.ench } : {}, c.rider ? { rider: c.rider } : {}, c.grow ? { grow: c.grow } : {}));
    for (const [k, v] of Object.entries(o.rng)) if (r.rng[k]) r.rng[k].setState(v);
    return r;
  };
  HD.Run = Run;
})();

// Headless fuzz: plays random runs through the engine to catch crashes and stalls.
// Usage: node test/sim.js [runs]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ctx = vm.createContext({ console, setTimeout, Math, Promise });
for (const f of ['core', 'cards', 'potions', 'monsters', 'relics', 'versions', 'combat', 'run', 'events', 'act2', 'act3', 'colorless', 'enchants', 'events2', 'ancients', 'silent', 'regent_data', 'regent', 'neow2', 'ascension_data', 'ascension']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
const HD = ctx.HD;
const N = +process.argv[2] || 300;
HD.setVersion();
const CHAR = process.env.CHAR || 'OATHBURNER';
const allRelics = Object.keys(HD.RELICS).filter((id) => HD.RELICS[id].rarity !== 'Starter' && ['shared', 'neow', 'ancient', 'darv', HD.CHARS[CHAR].color].includes(HD.RELICS[id].pool || 'shared'));

function takeItems(run, items) {
  for (const it of items) {
    if (it.kind === 'gold') run.gainGold(it.n);
    if (it.kind === 'potion') run.addPotion(it.id);
    if (it.kind === 'relic') run.addRelic(it.id);
    if (it.kind === 'cards') for (const c of run.rng.misc.shuffle(it.cards.slice()).slice(0, it.n || 1)) run.addCard(c.id, c.up);
    if (it.kind === 'carveAny') { const xs = run.removable().filter((c) => c.id !== it.into); if (xs.length && run.rng.misc.next() < 0.5) { run.removeCard(run.rng.misc.pick(xs)); run.addCard(it.into, false); } }
    if (it.kind === 'remove' && it.stashTo) { /* handled below with the stash */ }
    if (it.kind === 'choice' && it.opts.length) run.choiceDone(it, run.rng.misc.pick(it.opts));
    if (it.kind === 'enchant') { const xs = run.enchantable(it.id, it.filter ? (d) => d.type === it.filter : null); if (xs.length) run.enchant(run.rng.misc.pick(xs), it.id, it.n || 0); }
    if (it.kind === 'carve') { const xs = run.removable().filter((c) => HD.CARDS[c.id].rarity === 'Basic'); if (xs.length) { run.removeCard(run.rng.misc.pick(xs)); run.addCard(it.into, false); } }
    if (it.kind === 'mirror') { const c = run.rng.misc.pick(run.deck); run.addCard(c.id, c.up); }
    if (it.kind === 'transform') { const xs = run.removable(); if (xs.length) run.transform(run.rng.misc.pick(xs)); }
    if (it.kind === 'remove') { const xs = run.removable(); if (xs.length) { const c = run.rng.misc.pick(xs); run.removeCard(c); if (it.stashTo) { const st = run.relic(it.stashTo); if (st) (st.stash = st.stash || []).push(c.id); } } }
    if (it.kind === 'upgrade') { const c = run.deck.find((x) => !x.up && HD.CARDS[x.id].type !== 'Curse'); if (c) c.up = true; }
  }
}
function drainPending(run) { let guard = 0; while (run.pending.length && guard++ < 50) takeItems(run, run.pending.splice(0)); }

async function fight(run, enc, kind, stats) {
  const g = new HD.Combat(run, enc, HD.autoUI, kind);
  await g.start();
  let guard = 0;
  while (!g.over) {
    if (++guard > 400) throw new Error(`stalled in ${enc} turn ${g.turn}`);
    for (let i = 0; i < run.potions.length && !g.over; i++) {
      if (run.potions[i] && g.canUsePotion(i) && run.rng.misc.next() < 0.25) {
        stats.potions[run.potions[i]] = (stats.potions[run.potions[i]] || 0) + 1;
        await g.usePotion(i, g.randomEnemy());
      }
    }
    let plays = 0;
    while (!g.over && plays < 40) {
      const ok = g.hand.filter((c) => g.canPlay(c));
      if (!ok.length) break;
      const c = run.rng.misc.pick(ok);
      const d = HD.CARDS[c.id];
      await g.playCard(c, d.target === 'enemy' ? g.randomEnemy() : null);
      stats.played[c.id] = (stats.played[c.id] || 0) + 1;
      plays++;
    }
    if (!g.over) await g.endTurn();
  }
  return g;
}

(async () => {
  const stats = { actsCleared: {}, unknown: {}, events: {}, neow: {}, wins: 0, deaths: {}, played: {}, potions: {}, relicsSeen: {}, encs: {}, floors: 0, errors: 0 };
  for (let i = 0; i < N; i++) {
    const run = new HD.Run('sim' + i, CHAR, Number(process.env.ASC || 0));
    const offer = run.neowOffer();
    stats.neow[offer.length] = (stats.neow[offer.length] || 0) + 1;
    run.addRelic(run.rng.misc.pick(offer));
    drainPending(run);
    const pool = HD.POOL(run.color);
    for (let k = 0; k < 2; k++) run.addCard(run.rng.misc.pick(HD.RANDOM_CURSES));
    for (let k = 0; k < 4; k++) run.addCard(run.rng.misc.pick(HD.POOL('colorless')).id, run.rng.misc.next() < 0.3);
    for (let k = 0; k < 4; k++) { const id = run.rng.misc.pick(Object.keys(HD.ENCH)); const xs = run.enchantable(id); if (xs.length) run.enchant(run.rng.misc.pick(xs), id, 3); }
    for (let k = 0; k < 8; k++) run.addCard(run.rng.misc.pick(pool).id, run.rng.misc.next() < 0.4);
    for (const id of run.rng.misc.shuffle(allRelics.slice()).slice(0, 14)) if (!run.hasRelic(id)) run.addRelic(id);
    run.fillPotions();
    drainPending(run);
    try {
      let alive = true;
      while (alive) {
        const opts = run.reachable();
        if (!opts.length) break;
        const k = run.rng.misc.pick(opts);
        run.moveTo(k);
        const n = k === 'BOSS' ? { type: 'boss' } : run.map.nodes[k];
        let type = n.type;
        if (type === 'unknown') {
          run.hook('onUnknown');
          type = run.rollUnknown();
          stats.unknown[type] = (stats.unknown[type] || 0) + 1;
          if (type === 'event') {
            const st = run.startEvent();
            type = 'done';
            if (!st) type = 'monster';
            else {
              stats.events[st.id] = (stats.events[st.id] || 0) + 1;
              for (let step = 0; step < 20; step++) {
                const view = run.eventView(st);
                const open = view.options.filter((o) => !o.locked);
                if (!open.length) break;
                const res = run.eventChoose(st, run.rng.misc.pick(open).id);
                drainPending(run);
                if (run.hp <= 0) { alive = false; stats.deaths['event:' + st.id] = (stats.deaths['event:' + st.id] || 0) + 1; break; }
                if (res.fight) {
                  run.hp = run.maxHp;
                  const g = await fight(run, res.fight, 'monster', stats);
                  if (!g.won) { alive = false; break; }
                  run.hp = g.p.hp; run.maxHp = g.p.maxHp;
                  run.combatDone('monster');
                  if (HD.EVENTS[st.id].onWin) HD.EVENTS[st.id].onWin(run, st, g);
                  if (res.kind !== 'event') takeItems(run, run.combatRewards('monster', g));
                  drainPending(run);
                  break;
                }
              }
              if (!alive) break;
            }
          }
        }
        if (['monster', 'elite', 'boss'].includes(type)) {
          const enc = type === 'boss' ? run.boss : run.pickEncounter(type);
          stats.encs[enc] = (stats.encs[enc] || 0) + 1;
          for (const r of run.relics) stats.relicsSeen[r.id] = 1;
          run.hp = run.maxHp; // keep runs alive so later content gets tested
          const g = await fight(run, enc, type, stats);
          if (!g.won) { stats.deaths[enc] = (stats.deaths[enc] || 0) + 1; alive = false; break; }
          run.hp = g.p.hp; run.maxHp = g.p.maxHp;
          run.combatDone(type);
          takeItems(run, run.combatRewards(type, g));
          if (type === 'boss') {
            stats.actsCleared[run.act] = (stats.actsCleared[run.act] || 0) + 1;
            if (run.act >= HD.LAST_ACT) {
              // Ascension 10: a second boss before the win.
              const second = run.secondBossFor();
              if (second) {
                stats.encs[second] = (stats.encs[second] || 0) + 1; stats.secondBosses = (stats.secondBosses || 0) + 1;
                run.hp = run.maxHp; const g2 = await fight(run, second, 'boss', stats);
                if (!g2.won) { stats.deaths[second] = (stats.deaths[second] || 0) + 1; alive = false; break; }
                run.hp = g2.p.hp; run.combatDone('boss'); takeItems(run, run.combatRewards('boss', g2));
              }
              stats.wins++; break;
            }
            run.startAct(run.act + 1);
            run.addRelic(run.rng.misc.pick(run.ancientOffer()));
            drainPending(run);
            continue;
          }
        } else if (type === 'rest') {
          run.hook('onRestSite');
          const o = run.rng.misc.pick(run.restOptions());
          if (o === 'rest') { run.heal(run.restHeal()); run.hook('onRest'); }
          if (o === 'smith') { const c = run.deck.find((x) => !x.up); if (c) c.up = true; }
          if (o === 'lift') { const kb = run.relic('KETTLEBELL'); kb.lifts = (kb.lifts || 0) + 1; }
          if (o === 'dig') run.addRelic(run.rollRelic());
          if (o === 'hatch') { for (const c of run.deck.filter((x) => x.id === 'ROC_EGG')) run.removeCard(c); run.addRelic('ROC_CHICK'); }
        } else if (type === 'shop') {
          run.hook('onShop');
          run.gold += 300;
          run.makeShop();
          for (const kind of ['cards', 'relics', 'potions']) for (let j = 0; j < run.shop[kind].length; j++) run.buy(kind, j);
        } else if (type === 'treasure') {
          const t = run.treasure(); run.gainGold(t.gold); run.addRelic(t.relic);
        }
        drainPending(run);
        stats.floors++;
      }
    } catch (e) {
      stats.errors++;
      console.error(`run ${i}:`, e.stack.split('\n').slice(0, 5).join('\n'));
      if (stats.errors > 5) break;
    }
  }
  const neverCards = HD.POOL(HD.CHARS[CHAR].color).concat(HD.POOL('colorless')).map((d) => d.id).filter((id) => !stats.played[id]);
  const neverPotions = Object.values(HD.POTIONS).filter((d) => !d.passive && d.pool !== 'token').map((d) => d.id).filter((id) => !stats.potions[id]);
  const neverRelics = allRelics.filter((id) => !stats.relicsSeen[id]);
  console.log(JSON.stringify({ cardSet: HD.version, ascension: Number(process.env.ASC || 0), secondBosses: stats.secondBosses || 0, runs: N, bossWins: stats.wins, errors: stats.errors, floors: stats.floors,
    encounters: Object.keys(stats.encs).length, encountersNever: Object.keys(HD.ENC).filter((k) => !stats.encs[k] && HD.ENC[k].pool !== 'event'), actsCleared: stats.actsCleared, unknownRooms: stats.unknown, eventsSeen: Object.keys(stats.events).length,
    eventsNever: Object.keys(HD.EVENTS).filter((id) => !stats.events[id]), eventDeaths: Object.keys(stats.deaths).filter((k) => k.startsWith('event:')).length, neowOfferSizes: stats.neow, cardsNeverPlayed: neverCards, potionsNeverUsed: neverPotions, relicsNeverHeld: neverRelics }, null, 1));
})();

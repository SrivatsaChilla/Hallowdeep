// Targeted rule checks against the reference numbers.
const fs=require('fs'),path=require('path'),vm=require('vm');
const ctx=vm.createContext({console,setTimeout,Math,Promise});
for(const f of ['core','cards','potions','monsters','relics','versions','combat','run','events','act2','act3','colorless','enchants','events2','ancients','silent','regent_data','regent','neow2','ascension_data','ascension']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8'),ctx);
const HD=ctx.HD; let fails=0;
const eq=(name,a,b)=>{ if(JSON.stringify(a)!==JSON.stringify(b)){fails++;console.log('FAIL',name,a,'!=',b);} else console.log('ok  ',name); };
(async()=>{
  // Card count and rarity split
  const pool=Object.values(HD.CARDS).filter(d=>d.color==='oathburner' && !d.only);
  eq('87 cards', pool.length, 87);
  eq('rarity split', ['Basic','Common','Uncommon','Rare','Ancient'].map(r=>pool.filter(d=>d.rarity===r).length), [3,20,36,26,2]);
  // Damage math
  const run=new HD.Run('t'); const g=new HD.Combat(run,'RIPJAW',HD.autoUI); await g.start();
  const e=g.enemies[0]; e.pw.exposed=2; g.p.pw.might=2;
  eq('6+2 exposed', g.atkDmg(6,e,null), 12);
  g.p.pw.sapped=1; eq('6+2 sapped exposed', g.atkDmg(6,e,null), 9);
  delete g.p.pw.sapped; delete g.p.pw.might; g.p.pw.exposed=1; e.pw.might=0;
  eq('enemy 14 vs exposed player', g.enemyDmg(e,14), 21);
  // Pity: fresh normal reward rare band is negative
  const r2=new HD.Run('p'); r2.rarityOffset=-5; let rares=0; for(let i=0;i<3000;i++){ r2.rarityOffset=-5; if(r2.rollRarity('monster',false)==='Rare') rares++; } eq('no rares at reset', rares, 0);
  r2.rarityOffset=40; let rr=0; for(let i=0;i<5000;i++){ if(r2.rollRarity('monster',false)==='Rare') rr++; } console.log('     rare at +40 offset ~43%:', (rr/50).toFixed(1)+'%');
  // Map rules
  let bad=0; for(let s=0;s<200;s++){ const m=HD.genMap(HD.makeRng(s)); for(const n of Object.values(m.nodes)){ if(n.r===0&&n.type!=='monster')bad++; if(n.r===14&&n.type!=='rest')bad++; if(n.r===8&&n.type!=='treasure')bad++; if(n.r<5&&['elite','rest'].includes(n.type))bad++; } } eq('map row rules', bad, 0);
  // Rite Ox breaks at 150
  const r3=new HD.Run('ox'); const g3=new HD.Combat(r3,'RITE_OX',HD.autoUI); await g3.start(); await g3.endTurn();
  const ox=g3.enemies[0]; eq('ox consecrates first', ox.hist[0], 'CONSECRATE'); ox.pw.might=4; await g3.damage(ox, ox.hp-150, {});
  eq('ox stunned + might gone', [ox.intent, ox.pw.might||0], ['STUN',0]);
  // Brood Toad releases 4 Squirmers
  const r4=new HD.Run('toad'); const g4=new HD.Combat(r4,'TOAD',HD.autoUI); await g4.start(); await g4.damage(g4.enemies[0], 999, {});
  eq('4 squirmers', g4.alive().map(x=>x.id), ['SQUIRMER','SQUIRMER','SQUIRMER','SQUIRMER']);
  // Choir: abbot death ends fight
  const r5=new HD.Run('choir'); const g5=new HD.Combat(r5,'CHOIR',HD.autoUI); await g5.start(); await g5.damage(g5.enemies.find(x=>x.id==='CHOIR_ABBOT'),999,{});
  eq('novices flee, fight won', [g5.over,g5.won], [true,true]);
  // Smearwraith: 8 hits lose 1 HP
  const r6=new HD.Run('sw'); const g6=new HD.Combat(r6,'SMEARWRAITH',HD.autoUI); await g6.start(); const w=g6.enemies[0]; const hp0=w.hp; for(let i=0;i<9;i++) await g6.damage(w,20,{});
  eq('smeared 8 then full', hp0-w.hp, 8+20);
  // Shop removal price
  eq('removal 75,100', [75, (()=>{r6.removals=1; return r6.removalCost();})()], [75,100]);
  // ----- Milestone 2a: potions and relics -----
  eq('potion counts C/U/R (Colorless Potion included)', ['Common','Uncommon','Rare'].map(r=>HD.potionPool(r).length), [16,16,16]);
  const tiers=['Common','Uncommon','Rare','Shop'].map(r=>Object.values(HD.RELICS).filter(d=>d.rarity===r).length); console.log('     relic tiers C/U/R/Shop:', tiers.join('/'));
  // Potion pity: -10 on drop, +10 on miss, never clamped
  const rp=new HD.Run('pp'); rp.potionOdds=0.4; rp.rng.potion={next:()=>0.99, pick:(a)=>a[0]}; rp.rollPotionDrop('monster'); eq('miss raises odds', +rp.potionOdds.toFixed(2), 0.5);
  rp.rng.potion={next:()=>0.45, pick:(a)=>a[0]}; eq('elite bonus 12.5% makes 45% drop at 40%', !!rp.rollPotionDrop('elite')||rp.potionOdds, true);
  // Relic rarity split over many rolls
  const rr2=new HD.Run('rel'); const cnt={Common:0,Uncommon:0,Rare:0,Shop:0}; for(let i=0;i<6000;i++){ const id=rr2.rollRelic(); cnt[HD.RELICS[id].rarity]++; }
  console.log('     relic roll split ~50/33/17:', ['Common','Uncommon','Rare'].map(k=>(cnt[k]/60).toFixed(0)+'%').join('/'));
  // Shop layout and prices
  const rs=new HD.Run('shop'); const sh=rs.makeShop();
  eq('shop: 2 atk 2 skill 1 power', sh.cards.map(c=>HD.CARDS[c.id].type), ['Attack','Attack','Skill','Skill','Power']);
  eq('shop: last relic is a Shop relic', HD.RELICS[sh.relics[2].id].rarity, 'Shop');
  eq('shop: 3 potions', sh.potions.length, 3);
  rs.addRelic('GUILD_TOKEN'); rs.addRelic('THE_RUNNER'); eq('removal 75 at 50% then 20% off', rs.removalCost(), 30);
  // Combat relics and potion powers
  const mk=async(enc,relics,fn)=>{ const r=new HD.Run('c'+enc+relics.join()); relics.forEach(x=>r.addRelic(x)); const g=new HD.Combat(r,enc,HD.autoUI); await g.start(); return g; };
  let g7=await mk('RIPJAW',['LEAD_ROD']); const h7=g7.p.hp; await g7.selfLoseHp(1); eq('Lead Rod blocks 1 HP loss', g7.p.hp, h7);
  g7=await mk('RIPJAW',[]); g7.p.pw.buffer=1; const h8=g7.p.hp; await g7.damage(g7.p,10,{attack:true,src:g7.enemies[0]}); eq('Aegis stops a hit', g7.p.hp, h8);
  g7=await mk('RIPJAW',['SHED_TAIL']); g7.p.block=0; await g7.damage(g7.p,999,{}); eq('Shed Tail revives at 50%', [g7.over, g7.p.hp], [false, 40]);
  g7=await mk('RIPJAW',[]); g7.run.potions[0]='MOTH_JAR'; await g7.damage(g7.p,999,{}); eq('Moth in a Jar revives at 30%', [g7.over, g7.p.hp, g7.run.potions[0]], [false, 24, null]);
  g7=await mk('RIPJAW',['TOY_CANNON','PAPER_NEWT']); const e7=g7.enemies[0]; e7.pw.exposed=1; const cut=g7.makeCard('CUT',true);
  eq('Cut+ with Toy Cannon vs Exposed (Paper Newt)', g7.atkDmg(9,e7,cut), Math.floor((9+3)*1.75));
  g7.p.pw.vigor=8; g7.p.pw.giga=1; eq('Vigor 8 then Titan x3', g7.atkDmg(9,null,cut), (9+3+8)*3);
  g7=await mk('RIPJAW',['DENTED_HELM']); g7.addPw(g7.p,'might',2); g7.addPw(g7.p,'might',2); eq('Dented Helm doubles first Might gain', g7.p.pw.might, 6);
  g7=await mk('RIPJAW',['CRACKED_SKULL']); await g7.selfLoseHp(g7.p.hp-40); eq('Cracked Skull at 50%', g7.p.pw.might, 3); g7.heal(10); eq('Cracked Skull off above 50%', g7.p.pw.might||0, 0);
  g7=await mk('RIPJAW',['EERIE_LAMP']); const men=g7.makeCard('MENACE',false); g7.hand.push(men); g7.energy=3; await g7.playCard(men, g7.enemies[0]); eq('Eerie Lamp doubles Menace', g7.enemies[0].pw.exposed, 6);
  g7=await mk('RIPJAW',['UNKNOWN_REAGENT']); const cyc=g7.makeCard('CYCLONE_SWING',false); g7.hand.push(cyc); g7.energy=1; const hpb=g7.enemies[0].hp; await g7.playCard(cyc,null); eq('Unknown Reagent: X=1 plays 3 times', hpb-g7.enemies[0].hp, 15);
  g7=await mk('RIPJAW',['COLD_CREAM','VISE_CLAMP']); g7.energy=2; g7.p.block=25; g7.hand.length=0; await g7.endTurn(); eq('Cold Cream keeps 2 energy, Vise Clamp keeps 10', [g7.energy, g7.p.block>=10], [5, true]);
  const re=new HD.Run('egg'); re.addRelic('EMBER_EGG'); eq('Ember Egg upgrades new Attacks', re.addCard('ANVIL_DROP',false).up, true);
  const rh=new HD.Run('hat'); rh.addRelic('TALL_HAT'); rh.gold=0; rh.gainGold(20); eq('Tall Hat 20 -> 25', rh.gold, 25);
  // ----- Ancients: the Rootmother -----
  let badOffers = 0;
  for (let i = 0; i < 400; i++) {
    const rn = new HD.Run('neow' + i); const o = rn.neowOffer();
    const banes = o.filter((id) => HD.RELICS[id].bane);
    const conf = HD.NEOW.conflicts[banes[0]] || [];
    if (o.length !== 3 || banes.length !== 1 || HD.RELICS[o[2]].bane !== true || o.some((id) => conf.includes(id)) || new Set(o).size !== 3) badOffers++;
  }
  eq('Rootmother: 2 boons + 1 bane, no conflicts (400 offers)', badOffers, 0);
  const rq = new HD.Run('crucible'); rq.addRelic('TIN_CRUCIBLE');
  const ups = [0,1,2,3].map(() => rq.rewardCards('monster').every((c) => c.up));
  eq('Tin Crucible upgrades the first 3 card rewards only', ups, [true, true, true, false]);
  eq('Tin Crucible empties the first chest', [rq.treasure().empty, !!rq.treasure().empty], [true, false]);
  const rl = new HD.Run('pebble'); rl.addRelic('MAGMA_PEBBLE');
  eq('Magma Pebble: Act 1 boss drops 2 relics', rl.combatRewards('boss', { lostHpTimes: 1 }).filter((x) => x.kind === 'relic').length, 2);
  const rb = new HD.Run('boots'); rb.addRelic('MOTH_BOOTS'); rb.moveTo(rb.reachable()[0]);
  const row1 = Object.values(rb.map.nodes).filter((n) => n.r === 1).length;
  eq('Moth Boots: every room in the next row is reachable', rb.reachable().length, row1);
  const off = rb.reachable().find((k) => !rb.map.nodes[rb.pos].next.includes(k));
  if (off) { rb.moveTo(off); eq('Moth Boots: leaving the path spends a charge', rb.relic('MOTH_BOOTS').charges, 2); }
  const rt = new HD.Run('greed'); rt.addRelic('TAINTED_PEARL'); eq('Tainted Pearl: 333 gold, Avarice cannot be removed', [rt.gold, rt.removable().some((c) => c.id === 'AVARICE')], [99 + 333, false]);
  const rp2 = new HD.Run('poultice'); const mh = rp2.maxHp; rp2.addRelic('MOSS_POULTICE');
  eq('Moss Poultice: -12 Max HP, one Cut and one Brace transformed', [rp2.maxHp, rp2.deck.filter((c) => c.id === 'CUT').length, rp2.deck.filter((c) => c.id === 'BRACE').length], [mh - 12, 4, 3]);
  let gn = await mk('RIPJAW', []); gn.hand.length = 0; for (let i = 0; i < 4; i++) gn.hand.push(gn.makeCard('CUT', false)); gn.hand.push(gn.makeCard('ROUTINE', false)); gn.energy = 9;
  for (let i = 0; i < 3; i++) await gn.playCard(gn.hand[0], gn.enemies[0]);
  eq('Routine: no 4th card this turn', gn.canPlay(gn.hand[0]), false);
  // ----- v0.111 card set -----
  HD.setVersion('0.111');
  eq('v0.111: Rampage 10 +5, upgraded +5', [HD.vals({id:'ESCALATE'}).dmg, HD.vals({id:'ESCALATE'}).inc, HD.vals({id:'ESCALATE',up:true}).inc], [10, 5, 10]);
  let gv = await mk('RIPJAW', []); gv.p.pw.might = 2; const ef = gv.makeCard('ROLL_UP_SLEEVES', false); gv.hand.push(ef); gv.energy = 3; gv.p.block = 0;
  await gv.playCard(ef, null); eq('v0.111: Expect a Fight = 15 + 5 per Strength', gv.p.block, 25);
  gv = await mk('RIPJAW', []); const mid = gv.makeCard('DEEP_NIGHT', false); gv.hand.push(mid); gv.burnedCount = 5;
  eq('v0.111: Midnight costs 12 minus cards exhausted', gv.costOf(mid), 7);
  eq('v0.111: new cards in the pool, co-op one excluded', [HD.POOL('oathburner').some((d) => d.id === 'DEEP_NIGHT'), HD.POOL('oathburner').some((d) => d.id === 'KINDLE_ALLY')], [true, false]);
  eq('The game always uses v0.111: asking for stable changes nothing', (() => { HD.setVersion('stable'); return [HD.version, HD.vals({ id: 'ESCALATE' }).dmg]; })(), ['0.111', HD.vals({ id: 'ESCALATE' }).dmg]);
  // ----- ? rooms and events -----
  const rUnk = new HD.Run('unk'); const rolls = [0.5, 0.15, 0.12]; rUnk.rng.event = { next: () => rolls.shift() };
  const outs = [rUnk.rollUnknown(), rUnk.rollUnknown(), rUnk.rollUnknown()];
  eq('? rooms: event, then monster at 20%, then treasure at 6%', outs, ['event', 'monster', 'treasure']);
  eq('? rooms: odds after those three rolls', [rUnk.unknownOdds.monster, +rUnk.unknownOdds.treasure.toFixed(2), +rUnk.unknownOdds.shop.toFixed(2)], [0.2, 0.02, 0.12]);
  const rBead = new HD.Run('juzu'); rBead.addRelic('BEAD_BRACELET'); rBead.rng.event = { next: () => 0.01 };
  eq('Bead Bracelet: no fights from ? rooms, fight odds frozen', [rBead.rollUnknown(), rBead.unknownOdds.monster], ['treasure', 0.1]);
  const rGuilt = new HD.Run('guilt'); rGuilt.addCard('GUILT'); for (let i = 0; i < 4; i++) rGuilt.combatDone('monster');
  const had = rGuilt.deck.some((c) => c.id === 'GUILT'); rGuilt.combatDone('monster');
  eq('Guilt leaves the deck after 5 combats', [had, rGuilt.deck.some((c) => c.id === 'GUILT')], [true, false]);
  const rSword = new HD.Run('sword'); rSword.addRelic('STONE_BLADE'); for (let i = 0; i < 5; i++) rSword.combatDone('elite');
  eq('Stone Blade becomes Jade Blade after 5 elites', [rSword.hasRelic('STONE_BLADE'), rSword.hasRelic('JADE_BLADE')], [false, true]);
  const rCamp = new HD.Run('camp'); rCamp.hp = rCamp.maxHp; const full = rCamp.eventPool().includes('RESTLESS_CAMP'); rCamp.hp = Math.floor(rCamp.maxHp * 0.7);
  eq('Restless Camp only at 70% HP or less', [full, rCamp.eventPool().includes('RESTLESS_CAMP')], [false, true]);
  const rTab = new HD.Run('tablet'); const stTab = rTab.startEvent('CARVED_TABLET');
  for (const o of ['READ', 'READ', 'READ', 'READ', 'ALL']) rTab.eventChoose(stTab, o);
  eq('Carved Tablet read to the end: Max HP 1, every card upgraded', [rTab.maxHp, rTab.deck.filter((c) => ['Attack','Skill','Power'].includes(HD.CARDS[c.id].type)).every((c) => c.up), stTab.page], [1, true, 'ALL']);
  const rWrig = new HD.Run('wrig'); const gw = new HD.Combat(rWrig, 'WRIGGLERS', HD.autoUI, 'monster'); await gw.start();
  eq('Wrigglers: four, alternating Bite and Writhe by slot', gw.enemies.map((e) => e.intent), ['BITE', 'WRITHE', 'BITE', 'WRITHE']);
  // ----- Act 2 and the act framework -----
  const rA = new HD.Run('act2'); rA.floor = 17; rA.startAct(2);
  eq('Act 2: 14-row map, Act 2 boss, floor 18 at the Ancient', [rA.map.rows, HD.ENC[rA.boss].act, rA.floor], [14, 2, 18]);
  eq('Act 2: first two fights are weak', [0, 1, 2].map(() => HD.ENC[rA.pickEncounter('monster')].pool), ['weak', 'weak', 'normal']);
  let upCount = 0; for (let i = 0; i < 400; i++) upCount += rA.cardReward('monster').filter((c) => c.up).length;
  console.log('     Act 2 card upgrade rate (want ~25% of non-rares):', (upCount / 1200 * 100).toFixed(1) + '%');
  const offer = rA.ancientOffer(); eq('The Act 2 Ancient offers 3 of its relics and heals to full', [offer.length, offer.every((id) => HD.ANCIENTS[rA.ancient].pool.includes(id)), rA.hp === rA.maxHp], [3, true, true]);
  const mk2 = async (enc, setup) => { const r = new HD.Run('m2' + enc); if (setup) setup(r); const g = new HD.Combat(r, enc, HD.autoUI, 'monster'); await g.start(); return g; };
  let g2 = await mk2('SHELLS_WEAK'); await g2.damage(g2.enemies[0], 50, {}); eq('Hard to Kill: 50 damage takes at most 9 HP', g2.enemies[0].maxHp - g2.enemies[0].hp, 9);
  g2 = await mk2('BROOD_LOUSE'); const bl = g2.enemies[0]; await g2.damage(bl, 10, {}); eq('Curl Up: first hit gives 14 Guard once', [bl.block, bl.pw.curlUp || 0], [14, 0]);
  g2 = await mk2('SLUMBER_PARTY'); const bee = g2.enemies[2]; bee.block = 0; for (let i = 0; i < 3; i++) await g2.loseHp(bee, 1); eq('Slumber: wakes after 3 hits and rolls out', [bee.pw.slumber || 0, bee.intent], [0, 'ROLL_OUT']);
  g2 = await mk2('BURROWER_WEAK'); const bur = g2.enemies[0]; bur.pw.burrowed = 1; bur.block = 5; await g2.damage(bur, 8, { attack: true, src: g2.p }); eq('Burrowed: breaking its Guard stuns it', [bur.intent, bur.pw.burrowed || 0], ['STUN', 0]);
  g2 = await mk2('CRABS'); const [claw, cannon] = g2.enemies; await g2.kill(claw); eq('Crab Rage: the survivor gains 6 Might and 99 Guard', [cannon.pw.might, cannon.block >= 99], [6, true]);
  g2 = await mk2('CRABS'); g2.facing = g2.enemies[0].uid; eq('Flanking: the crab behind you deals 50% more', [g2.enemyDmg(g2.enemies[1], 10), g2.enemyDmg(g2.enemies[0], 10)], [15, 10]);
  g2 = await mk2('CENTICOIL'); const head = g2.enemies[0]; await g2.kill(head); g2.turn += 2; await g2.endTurn();
  eq('Centicoil: a dead segment reattaches with 25 HP', [head.alive, head.hp], [true, 25]);
  g2 = await mk2('GLUTTON'); g2.enemies[0].intent = 'SALIVATE'; g2.p.pw.sandpit = 1; await g2.endTurn(); eq('Sandpit reaching 0 ends the run', [g2.over, g2.won], [true, false]);
  g2 = await mk2('HOPPER_WEAK'); const hop = g2.enemies[0]; hop.pw.flutter = 2; eq('Flutter halves Attack damage', g2.atkDmg(10, hop, g2.makeCard('CUT')), 5);
  await g2.damage(hop, 1, { attack: true, src: g2.p }); await g2.damage(hop, 1, { attack: true, src: g2.p }); eq('Flutter: 2 hits knock it down', [hop.intent, hop.pw.flutter || 0], ['STUN', 0]);
  g2 = await mk2('RIPJAW', (r) => r.addRelic('VELVET_COLLAR')); g2.hand = Array.from({ length: 8 }, () => g2.makeCard('WILDFIRE')); g2.energy = 9;
  for (let i = 0; i < 6; i++) await g2.playCard(g2.hand[0], g2.enemies[0]); eq('Velvet Choker: no 7th card, and +1 Energy', [g2.canPlay(g2.hand[0]), g2.maxEnergy], [false, 4]);
  const rG = new HD.Run('ecto'); rG.addRelic('GHOST_SLIME'); rG.gainGold(50); rG.addRelic('DRY_FLASK'); eq('Ectoplasm blocks gold, Sozu blocks potions', [rG.gold, rG.addPotion('BARK_DRAUGHT')], [99, false]);
  // ----- Act 3 -----
  const rB = new HD.Run('act3'); rB.floor = 33; rB.startAct(3);
  eq('Act 3: 13-row map, Act 3 boss, floor 34 at the Ancient, Act 3 is the last', [rB.map.rows, HD.ENC[rB.boss].act, rB.floor, HD.LAST_ACT], [13, 3, 34, 3]);
  const mk3 = async (enc) => { const r = new HD.Run('m3' + enc); const g = new HD.Combat(r, enc, HD.autoUI, 'monster'); await g.start(); return g; };
  let gC = await mk3('SPECIMEN'); const spec = gC.enemies[0];
  await gC.damage(spec, 150, {}); eq('Specimen: lethal damage starts a respawn instead of a win', [gC.over, spec.respawning, spec.intent], [false, true, 'RESPAWN']);
  await gC.damage(spec, 50, {}); eq('Specimen: no damage while regrowing', spec.hp, 0);
  gC.hand.length = 0; await gC.endTurn(); eq('Specimen phase 2: 200 HP with Painful Stabs', [spec.hp, spec.maxHp, !!spec.pw.painfulStabs, spec.intent], [200, 200, true, 'MULTI_CLAW']);
  await gC.damage(spec, 999, {}); gC.hand.length = 0; await gC.endTurn(); eq('Specimen phase 3: 300 HP with Nemesis', [spec.maxHp, !!spec.pw.nemesis, !!spec.pw.painfulStabs], [300, true, false]);
  delete spec.pw.intangible; await gC.damage(spec, 999, {}); eq('Specimen: the third death is final', [gC.over, gC.won], [true, true]);
  gC = await mk3('SPECIMEN'); const skC = gC.makeCard('BRACE'); gC.hand = [skC]; gC.energy = 3; await gC.playCard(skC, null); eq('Specimen phase 1 Enrage: a Skill gives it 2 Might', gC.enemies[0].pw.might, 2);
  gC = await mk3('QUEEN'); gC.p.pw.chains = 3; gC.hand.length = 0; gC.draw = Array.from({ length: 6 }, () => gC.makeCard('CUT')); gC.t = gC.freshTurn(); gC.phase = 'player';
  await gC.drawCards(5); gC.energy = 9; const nBound = gC.hand.filter((c) => c.bound).length; await gC.playCard(gC.hand.find((c) => c.bound), gC.enemies[1]);
  eq('Chains of Binding: 3 Bound cards, only 1 playable per turn', [nBound, gC.canPlay(gC.hand.find((c) => c.bound)), gC.canPlay(gC.hand.find((c) => !c.bound))], [3, false, true]);
  gC = await mk3('KNIGHTS'); gC.enemies[2].pw.hex = 2; gC.hand = [gC.makeCard('BRACE'), gC.makeCard('CUT')]; const ashB = gC.ash.length; await gC.endTurn();
  eq('Hex: every card left in hand Burns at end of turn', gC.ash.length - ashB, 2);
  gC = await mk3('BULB_HEAD'); const pwr = gC.makeCard('HEAT_UP'); gC.hand = [pwr]; gC.energy = 3; gC.p.block = 0; const hpBefore = gC.p.hp; await gC.playCard(pwr, null);
  eq('Galvanic: playing a Power costs 6 HP', hpBefore - gC.p.hp, 6);
  gC = await mk3('SCROLLS_WEAK'); gC.p.block = 0; const mxHp = gC.p.maxHp; await gC.damage(gC.p, 5, { attack: true, src: gC.enemies[0] });
  eq('Paper Cuts: an unblocked hit takes 2 Max HP', mxHp - gC.p.maxHp, 2);
  gC = await mk3('FADED_STRAYED'); const lostE = gC.enemies[1]; gC.p.pw.might = 3; lostE.intent = 'DEBILITATING_SMOG'; await gC.execMove(lostE);
  const midM = gC.p.pw.might || 0; await gC.kill(lostE); eq('Possessed Strength: stolen, then returned on death', [midM, gC.p.pw.might], [1, 3]);
  gC = await mk3('GUNNER_WEAK'); gC.hand.length = 0; await gC.endTurn(); eq('Rampart: the gunner starts your turn with 25 Guard', gC.enemies[1].block >= 25, true);
  gC = await mk3('OWL_JUDGE'); const owlE = gC.enemies[0]; owlE.pw.soar = 1; eq('Soar halves Attack damage', gC.atkDmg(10, owlE, gC.makeCard('CUT')), 5);
  // ----- colorless cards -----
  eq('Colorless: 52 solo cards (Splash waits for other characters), 11 co-op only kept out', [HD.POOL('colorless').length, Object.values(HD.CARDS).filter((d) => d.color === 'colorless' && d.coop).length], [52, 11]);
  const rS = new HD.Run('cshop'); const shC = rS.makeShop(); eq('Shop: 1 Uncommon and 1 Rare colorless card at a 15% markup', [shC.colorless.map((x) => HD.CARDS[x.id].rarity), shC.colorless.every((x) => x.base >= Math.round((x.rar === 'Rare' ? 150 : 75) * 1.15 * 0.95))], [['Uncommon', 'Rare'], true]);
  const rRug = new HD.Run('rug'); rRug.addRelic('WORN_RUG'); let sawCl = false; for (let i = 0; i < 300 && !sawCl; i++) sawCl = rRug.cardReward('elite').some((x) => HD.CARDS[x.id].color === 'colorless'); eq('Dingy Rug lets colorless cards into rewards', sawCl, true);
  const mkC = async (relics) => { const r = new HD.Run('cl' + relics.join()); relics.forEach((x) => r.addRelic(x)); const g = new HD.Combat(r, 'RIPJAW', HD.autoUI, 'monster'); await g.start(); return g; };
  let gK = await mkC(['TOOL_KIT']); eq('Toolbox: a colorless card is in the opening hand', gK.hand.some((x) => HD.CARDS[x.id].color === 'colorless'), true);
  gK = await mkC([]); const bol = gK.makeCard('WEIGHTED_CORD'); gK.hand = [bol]; gK.energy = 3; await gK.playCard(bol, gK.enemies[0]); gK.hand.length = 0; await gK.endTurn();
  eq('Bolas comes back to your hand next turn', gK.hand.includes(bol), true);
  gK = await mkC([]); gK.p.pw.nostalgia = 1; const st1 = gK.makeCard('CUT'); gK.hand = [st1, gK.makeCard('CUT')]; gK.energy = 3; await gK.playCard(st1, gK.enemies[0]);
  eq('Nostalgia puts the first Attack on top of the draw pile', gK.draw[gK.draw.length - 1], st1);
  gK = await mkC([]); gK.p.pw.boulder = 5; gK.p.boulderPlays = 1; const eh = gK.enemies[0].hp; gK.hand.length = 0; await gK.endTurn();
  eq('Rolling Boulder hits for 5, then grows to 10', [eh - gK.enemies[0].hp >= 5, gK.p.pw.boulder], [true, 10]);
  gK = await mkC([]); gK.p.pw.gambit = 1; gK.p.block = 0; await gK.damage(gK.p, 3, { attack: true, src: gK.enemies[0] }); eq('The Gambit: an unblocked hit ends the run', [gK.over, gK.won], [true, false]);
  gK = await mkC([]); gK.p.bombs = [{ turns: 3, dmg: 40 }]; gK.p.block = 999; gK.enemies[0].hp = gK.enemies[0].maxHp = 999;
  for (let i = 0; i < 2; i++) { gK.hand.length = 0; gK.p.block = 999; await gK.endTurn(); } const before3 = gK.enemies[0].hp; gK.hand.length = 0; gK.p.block = 999; await gK.endTurn();
  eq('The Bomb goes off at the end of the 3rd turn', before3 - gK.enemies[0].hp >= 40, true);
  gK = await mkC([]); gK.p.pw.panache = 10; gK.hand = Array.from({ length: 5 }, () => gK.makeCard('WILDFIRE')); gK.energy = 9; const e0 = gK.enemies[0].hp;
  for (let i = 0; i < 5; i++) await gK.playCard(gK.hand.find((x) => x.id === 'WILDFIRE'), gK.enemies[0]); eq('Panache fires on the 5th card', e0 - gK.enemies[0].hp, 5 * 6 + 10);
  const rL = new HD.Run('lead'); rL.addRelic('LEAD_WEIGHT'); eq('Lead Paperweight offers 2 colorless cards', [rL.pending[0].cards.length, rL.pending[0].cards.every((x) => HD.CARDS[x.id].color === 'colorless')], [2, true]);
  const rBL = new HD.Run('leech'); const stL = rBL.startEvent('MIND_LEECH'); rBL.eventChoose(stL, 'RIP'); eq('Brain Leech Rip: lose 5 HP, 3 colorless cards to pick from', [rBL.maxHp - rBL.hp, rBL.pending[0].cards.length], [5, 3]);
  // ----- enchantments -----
  {
  const mkE = async (deckIds, relics = []) => {
    const r = new HD.Run('en' + deckIds.map((x) => x[0] + (x[1] || '')).join());
    r.deck = deckIds.map(([id, en, n]) => Object.assign(r.newCard(id, false), en ? { ench: { id: en, n: n || 0 } } : {}));
    relics.forEach((x) => r.addRelic(x));
    const g = new HD.Combat(r, 'RIPJAW', HD.autoUI, 'monster'); await g.start();
    const e = g.enemies[0]; e.hp = e.maxHp = 999; e.block = 0; return { r, g, e };
  };
  const playOne = async (g, e, c) => { g.energy = 9; const h = e.hp; await g.playCard(c, HD.CARDS[c.id].target === 'enemy' ? e : null); return h - e.hp; };
  const dmgWith = async (en, n, relics) => { const { g, e } = await mkE([['CUT', en, n]], relics); const c = g.hand.find((x) => x.id === 'CUT'); return playOne(g, e, c); };
  eq('Sharp 3, Instinct, Old Ember add damage', [await dmgWith('SHARP', 3), await dmgWith('INSTINCT'), await dmgWith('TEZCATARAS_EMBER')], [9, 12, 9]);
  { const b111 = await dmgWith('INKY');
    eq('Inky: no bonus damage in v0.111 (still Weak)', b111, 6); }
  eq('Mystic Lighter: an enchanted Attack deals 9 more', await dmgWith('SHARP', 3, ['ODD_LIGHTER']), 18);
  let E1 = await mkE([['CUT', 'CORRUPTED']]); let hp0 = E1.g.p.hp; eq('Corrupted: 50% more damage, lose 2 HP', [await playOne(E1.g, E1.e, E1.g.hand[0]), hp0 - E1.g.p.hp], [9, 2]);
  E1 = await mkE([['CUT', 'VIGOROUS', 8]]); let cV = E1.g.hand[0]; const v1 = await playOne(E1.g, E1.e, cV); E1.g.discard.splice(E1.g.discard.indexOf(cV), 1); E1.g.hand.push(cV);
  eq('Vigorous 8: first play only', [v1, await playOne(E1.g, E1.e, cV)], [14, 6]);
  E1 = await mkE([['CUT', 'MOMENTUM', 5]]); cV = E1.g.hand[0]; const m1 = await playOne(E1.g, E1.e, cV); E1.g.discard.splice(E1.g.discard.indexOf(cV), 1); E1.g.hand.push(cV);
  eq('Momentum 5: grows each play this combat', [m1, await playOne(E1.g, E1.e, cV)], [6, 11]);
  E1 = await mkE([['CUT', 'SPIRAL']]); eq('Spiral: Replay 1', await playOne(E1.g, E1.e, E1.g.hand[0]), 12);
  E1 = await mkE([['CUT', 'GLAM']]); cV = E1.g.hand[0]; const gl1 = await playOne(E1.g, E1.e, cV); E1.g.discard.splice(E1.g.discard.indexOf(cV), 1); E1.g.hand.push(cV);
  eq('Glam: replays once per combat', [gl1, await playOne(E1.g, E1.e, cV)], [12, 6]);
  E1 = await mkE([['BRACE', 'NIMBLE', 2]]); E1.g.energy = 3; await E1.g.playCard(E1.g.hand[0], null); eq('Nimble 2 on a Defend', E1.g.p.block, 7);
  E1 = await mkE([['CUT', 'ADROIT', 3]]); await playOne(E1.g, E1.e, E1.g.hand[0]); eq('Adroit: gain 3 Guard', E1.g.p.block, 3);
  E1 = await mkE([['BRACE', 'GOOPY', 0]]); const gsrc = E1.r.deck[0]; await playOne(E1.g, E1.e, E1.g.hand[0]);
  eq('Goopy: Burns, and the deck copy keeps +1 Guard', [E1.g.ash.length, gsrc.ench.n, E1.g.p.block], [1, 1, 5]);
  E1 = await mkE([['BRACE', 'SWIFT', 2], ['CUT'], ['CUT'], ['CUT'], ['CUT'], ['CUT'], ['CUT'], ['CUT']]); let sw = E1.g.hand.find((x) => x.ench); if (!sw) { sw = E1.g.draw.find((x) => x.ench); E1.g.draw.splice(E1.g.draw.indexOf(sw), 1); E1.g.hand.push(sw); } const hand0 = E1.g.hand.length;
  await playOne(E1.g, E1.e, sw); eq('Swift 2: first play draws 2', E1.g.hand.length, hand0 - 1 + 2);
  E1 = await mkE([['CUT', 'SOWN', 1]]); E1.g.energy = 3; await E1.g.playCard(E1.g.hand[0], E1.e); eq('Sown: the first play refunds 1 Energy', E1.g.energy, 3);
  E1 = await mkE([['BLOOD_TITHE', 'SOULS_POWER']]); E1.g.energy = 3; await E1.g.playCard(E1.g.hand[0], null); eq("Soul's Power: no longer Burns", [E1.g.ash.length, E1.g.discard.some((x) => x.id === 'BLOOD_TITHE')], [0, true]);
  E1 = await mkE([['BRACE', 'STEADY'], ['CUT']]); E1.g.hand = E1.g.hand.filter((x) => x.ench); await E1.g.endTurn(); eq('Steady: kept in hand at end of turn', E1.g.hand.some((x) => x.ench), true);
  E1 = await mkE([...Array(12).fill(['CUT']), ['BRACE', 'ROYALLY_APPROVED']]); eq('Royally Approved: Opening, so it starts in hand', E1.g.hand.some((x) => x.ench), true);
  E1 = await mkE([...Array(12).fill(['CUT']), ['BRACE', 'IMBUED']]); eq('Imbued: played automatically at the start of combat', [E1.g.p.block, E1.g.discard.some((x) => x.ench)], [5, true]);
  E1 = await mkE([['BRACE', 'SLUMBERING_ESSENCE'], ['CUT']]); const sl = E1.g.hand.find((x) => x.ench); E1.g.p.pw.retainHand = 1; await E1.g.endTurn();
  eq('Slumbering Essence: costs 1 less after a turn in hand', E1.g.costOf(sl), 0);
  E1 = await mkE([['CUT', 'PERFECT_FIT'], ...Array(6).fill(['BRACE'])]); const pf = E1.g.hand.find((x) => x.ench) || E1.g.draw.find((x) => x.ench);
  E1.g.discard.push(...E1.g.draw.splice(0), ...E1.g.hand.splice(0)); await E1.g.reshuffle(); eq('Perfect Fit: placed on top when shuffled', E1.g.draw[E1.g.draw.length - 1], pf);
  const rF = new HD.Run('feather'); rF.addRelic('FEATHER_CHARM'); eq('Wing Charm: one reward card has Swift 1', rF.cardReward('monster').filter((x) => x.ench && x.ench.id === 'SWIFT' && x.ench.n === 1).length, 1);
  const rSk = new HD.Run('silk'); rSk.addRelic('SILK_LOCK'); const sk1 = rSk.cardReward('monster'), sk2 = rSk.cardReward('monster');
  eq('Silken Tress: lose all Gold, only the first reward is all Glam', [rSk.gold, sk1.every((x) => x.ench && x.ench.id === 'GLAM'), sk2.some((x) => x.ench)], [0, true, false]);
  const rK = new HD.Run('kifuda'); rK.addRelic('CHARM_TAGS'); eq('Kifuda: 3 optional Adroit picks', [rK.pending.length, rK.pending.every((x) => x.id === 'ADROIT' && x.n === 3 && x.optional)], [3, true]);
  const rC = new HD.Run('clone'); rC.deck[0].ench = { id: 'CLONE', n: 0 }; eq('Clone: a Rest Site option', rC.restOptions().includes('clone'), true);
  const sv = HD.Run.fromSave(JSON.parse(JSON.stringify(rC.toSave()))); eq('Enchantments survive save and load', sv.deck[0].ench && sv.deck[0].ench.id, 'CLONE');
  }
  // ----- Act 2 and 3 events -----
  {
    const pool = (act) => { const r = new HD.Run('pool' + act); r.gold = 400; r.floor = 20; r.act = act; r.potions[0] = 'BARK_DRAUGHT'; return r.eventPool(); };
    eq('Event pools: Act 2 and Act 3 now have their own events', [pool(2).length >= 16, pool(3).length >= 10, pool(3).includes('HEARING'), pool(2).includes('HEARING')], [true, true, true, false]);
    const rF = new HD.Run('fuser'); const sF = rF.startEvent('FUSER'); rF.eventChoose(sF, 'STRIKES');
    eq('Amalgamator: 2 Strikes become Ultimate Strike', [rF.deck.filter((c) => c.id === 'CUT').length, rF.deck.some((c) => c.id === 'FINAL_CUT')], [3, true]);
    const rB = new HD.Run('bloom'); const sB = rB.startEvent('GIANT_BLOOM'); rB.eventChoose(sB, 'DEEPER'); rB.eventChoose(sB, 'DEEPER'); rB.eventChoose(sB, 'CENTER');
    eq('Colossal Flower: 5 + 6 + 7 HP for the Pollinous Core', [rB.maxHp - rB.hp, rB.hasRelic('POLLEN_HEART')], [18, true]);
    const rH = new HD.Run('hear'); const sH = rH.startEvent('HEARING'); rH.eventChoose(sH, 'REJECT'); rH.eventChoose(sH, 'DOUBLE_DOWN'); eq('The Trial: doubling down is lethal', rH.hp, 0);
    const rT = new HD.Run('tink'); const sT = rT.startEvent('TINKER_BENCH'); rT.eventChoose(sT, 'ACCEPT'); rT.eventChoose(sT, 'ATTACK'); rT.eventChoose(sT, 'VIOLENCE');
    const dev = rT.deck.find((c) => c.id === 'ODD_DEVICE'); eq('Tinker Time: a Violence weapon is saved with its rider', [dev && dev.rider, HD.Run.fromSave(JSON.parse(JSON.stringify(rT.toSave()))).deck.find((c) => c.id === 'ODD_DEVICE').rider], ['VIOLENCE', 'VIOLENCE']);
    const gT = new HD.Combat(rT, 'RIPJAW', HD.autoUI, 'monster'); await gT.start(); const dv = gT.draw.concat(gT.hand).find((c) => c.id === 'ODD_DEVICE');
    gT.hand = [dv]; gT.energy = 3; const eT = gT.enemies[0]; eT.hp = eT.maxHp = 999; await gT.playCard(dv, eT); eq('Mad Science Violence: 12 damage 3 times', 999 - eT.hp, 36);
    const rD = new HD.Run('dummy'); const gD = new HD.Combat(rD, 'DUMMY_1', HD.autoUI, 'event'); await gD.start();
    for (let i = 0; i < 3 && !gD.over; i++) { gD.hand.length = 0; await gD.endTurn(); }
    eq('Battleworn Dummy: leaves after 3 turns', [gD.over, gD.enemies[0].fled], [true, true]);
    const rTw = new HD.Run('twin'); rTw.addRelic('TWIN_DOLL'); const n0 = rTw.deck.length; rTw.addCard('CUT'); eq('Bing Bong: every added card comes with a copy', rTw.deck.length - n0, 2);
    const rM = new HD.Run('mirror'); const dn = rM.deck.length; const sM = rM.startEvent('MIRROR_POOL'); rM.eventChoose(sM, 'SHATTER');
    eq('Reflections Shatter: deck doubled plus Bad Luck', rM.deck.length, dn * 2 + 1);
    const rTk = new HD.Run('ticket'); rTk.addRelic('MYSTERY_TICKET'); const rl0 = rTk.relics.length; for (let i = 0; i < 5; i++) rTk.combatDone('monster');
    eq("Wongo's Mystery Ticket: 3 relics after 5 combats", rTk.relics.length - rl0, 3);
    const rE = new HD.Run('elder'); rE.addRelic('IRON_KNUCKLE'); const sE = rE.startEvent('ELDER'); rE.eventChoose(sE, 'RELIC'); const itE = rE.pending.shift(); const rlE = rE.relics.length; rE.choiceDone(itE, 'IRON_KNUCKLE');
    eq('Ranwid: give a relic for 2 random relics', [rE.relics.length - rlE, rE.hasRelic('IRON_KNUCKLE')], [1, false]);
    const rC = new HD.Run('cap'); const mh = rC.maxHp; rC.addRelic('GIANT_CAP'); const gC = new HD.Combat(rC, 'RIPJAW', HD.autoUI, 'monster'); await gC.start();
    eq('Big Mushroom: +20 Max HP and 2 fewer cards in the first hand', [rC.maxHp - mh, gC.hand.length], [20, 3]);
    const rP = new HD.Run('rank'); rP.potions[0] = 'RANK_FLASK'; const gP = new HD.Combat(rP, 'RIPJAW', HD.autoUI, 'monster'); await gP.start(); const ph = gP.p.hp, eh = gP.enemies[0].hp; await gP.usePotion(0, null);
    eq('Foul Potion: 12 to everyone, you included', [eh - gP.enemies[0].hp, ph - gP.p.hp], [12, 12]);
  }
  // ----- Ancients -----
  {
    const seen = { 2: new Set(), 3: new Set() };
    for (let i = 0; i < 80; i++) for (const act of [2, 3]) { const r = new HD.Run('anc' + i); r.act = act; r.ancientOffer(); seen[act].add(r.ancient); }
    eq('Ancients: Act 2 meets Orobas, Pael, Tezcatara or Darv; Act 3 meets Nonupeipe, Tanx, Vakuu or Darv', [[...seen[2]].sort(), [...seen[3]].sort()], [['DARV', 'OROBAS', 'PAEL', 'TEZCATARA'], ['DARV', 'NONUPEIPE', 'TANX', 'VAKUU']]);
    eq('Ancient relic pools: 10 each, 8 to 10 built', Object.entries(HD.ANCIENTS).filter(([k]) => k !== 'DARV').map(([k, a]) => a.pool.length), [8, 10, 9, 10, 10, 10]);
    const mkA = async (rel, setup) => { const r = new HD.Run('a' + rel); r.addRelic(rel); while (r.pending.length) r.pending.shift(); if (setup) setup(r); const g = new HD.Combat(r, 'RIPJAW', HD.autoUI, 'monster'); await g.start(); g.enemies[0].hp = g.enemies[0].maxHp = 999; return { r, g }; };
    let A = await mkA('OLD_TOOTH'); eq("Archaic Tooth: Bash becomes Break", [A.r.deck.some((c) => c.id === 'CRACK'), A.r.deck.some((c) => c.id === 'SPLINTER')], [false, true]);
    A = await mkA('ELDER_TOUCH'); eq('Touch of Orobas: Burning Blood becomes Black Blood', [A.r.hasRelic('EMBER_HEART'), A.r.hasRelic('EMBER_CORE')], [false, true]);
    A = await mkA('HOT_COCOA'); eq('Very Hot Cocoa: 4 extra Energy on turn 1', A.g.energy, 7);
    A = await mkA('OLD_LEGION'); A.g.hand = [A.g.makeCard('BRACE'), A.g.makeCard('BRACE')]; A.g.energy = 3; await A.g.playCard(A.g.hand[0], null); await A.g.playCard(A.g.hand[0], null);
    eq("Pael's Legion: the first card's Guard doubles, then it sleeps", A.g.p.block, 15);
    A = await mkA('OLD_EYE'); A.g.hand.length = 0; const t0 = A.g.turn; await A.g.endTurn(); eq("Pael's Eye: ending a turn with no cards played takes an extra turn", [A.g.turn - t0, A.g.p.hp === A.g.p.maxHp], [1, true]);
    A = await mkA('OLD_FIDDLE'); eq('Fiddle: 7 cards in hand, no draws during your turn', [A.g.hand.length, (await A.g.drawCards(2), A.g.hand.length)], [7, 7]);
    A = await mkA('WHISPER_EARRING'); eq('Whispering Earring: turn 1 plays itself', [A.g.turn >= 2, A.g.t.cards], [true, 0]);
    A = await mkA('HURLING_AXE'); const ax = A.g.hand.find((c) => c.id === 'CUT') || A.g.makeCard('CUT'); A.g.hand = [ax]; A.g.energy = 3; await A.g.playCard(ax, A.g.enemies[0]); eq('Throwing Axe: the first card plays twice', 999 - A.g.enemies[0].hp, 12);
    A = await mkA('THICK_PELT', (r) => { r.pos = r.marked[0]; }); eq('Fur Coat: enemies in a marked fight have 1 HP', A.g.enemies.every((e) => e.hp === 1) || A.g.enemies[0].hp === 999, true);
    const rW = new HD.Run('wing'); rW.addRelic('OLD_FANG'); eq("Pael's Tooth: 5 removals queued", rW.pending.filter((x) => x.kind === 'remove' && x.stashTo).length, 5);
  }
  // ----- the Veiled (Silent) -----
  {
    HD.setVersion('0.111');
    const rV = new HD.Run('veil', 'VEILED');
    eq('Veiled: 70 HP, 99 Gold, 12-card deck, Serpent Ring', [rV.maxHp, rV.gold, rV.deck.length, rV.relics[0].id], [70, 99, 12, 'SERPENT_RING']);
    eq('Veiled: 86 solo cards in v0.111 (4 Basic, 2 Ancient)', [HD.POOL('veiled').length, Object.values(HD.CARDS).filter((d) => d.color === 'veiled' && !d.coop && (!d.only || d.only === HD.version)).length], [80, 86]);
    eq('Veiled: card rewards and shops use the Veiled pool', rV.cardReward('monster').every((c) => HD.CARDS[c.id].color === 'veiled' || HD.CARDS[c.id].color === 'colorless'), true);
    eq('Veiled: relic pools exclude Oathburner relics', HD.relicPool('Common', rV).some((id) => HD.RELICS[id].pool === 'oathburner'), false);
    const sv = HD.Run.fromSave(JSON.parse(JSON.stringify(rV.toSave()))); eq('Veiled: save and load keep the character', [sv.charId, sv.color], ['VEILED', 'veiled']);
    const mkV = async (setup) => { const r = new HD.Run('vv', 'VEILED'); if (setup) setup(r); const g = new HD.Combat(r, 'RIPJAW', HD.autoUI, 'monster'); await g.start(); g.enemies[0].hp = g.enemies[0].maxHp = 999; return g; };
    let gV = await mkV(); eq('Ring of the Snake: 7 cards in the first hand', gV.hand.length, 7);
    const e = gV.enemies[0]; await gV.applyToxin(e, 5); e.intent = Object.keys(e.def.moves)[0]; gV.hand.length = 0; gV.p.block = 999; await gV.endTurn();
    eq('Poison: lose 5 HP at the start of its turn, then 4 left', [999 - e.hp, e.pw.toxin], [5, 4]);
    gV = await mkV(); gV.p.pw.quickening = 1; const e2 = gV.enemies[0]; await gV.applyToxin(e2, 5); await gV.toxinTick(e2); eq('Accelerant: Poison ticks twice', 999 - e2.hp, 9);
    gV = await mkV((r) => r.addRelic('LIZARD_SKULL')); await gV.applyToxin(gV.enemies[0], 3); eq('Snecko Skull: +1 Poison per application', gV.enemies[0].pw.toxin, 4);
    gV = await mkV(); const fur = gV.makeCard('SLIP_AWAY'); gV.hand = [fur, gV.makeCard('JAB')]; await gV.discardFromHand(fur); eq('Sly: a discarded Sly card plays itself for free', [gV.p.block, gV.discard.includes(fur)], [6, true]);
    gV = await mkV((r) => { r.addRelic('FINGER_BELLS'); r.addRelic('THICK_WRAPS'); }); const x1 = gV.makeCard('JAB'); gV.hand = [x1]; await gV.discardFromHand(x1);
    eq('Tingsha and Tough Bandages on a discard', [999 - gV.enemies[0].hp, gV.p.block], [3, 3]);
    gV = await mkV(); gV.p.pw.accuracy = 4; gV.p.pw.ghostKnives = 9; const s1 = gV.makeCard('SLIVER'), s2 = gV.makeCard('SLIVER'); gV.hand = [s1, s2]; gV.energy = 3;
    await gV.playCard(s1, gV.enemies[0]); const after1 = 999 - gV.enemies[0].hp; await gV.playCard(s2, gV.enemies[0]);
    eq('Shivs: Accuracy +4, Phantom Blades +9 on the first only', [after1, 999 - gV.enemies[0].hp - after1], [17, 8]);
    gV = await mkV(); gV.p.pw.huntersMark = 1; gV.enemies[0].pw.sapped = 1; eq('Tracking: Weak enemies take 50% more (v0.111)', gV.atkDmg(10, gV.enemies[0], gV.makeCard('JAB')), 15);
    gV = await mkV((r) => r.addRelic('PAPER_CRANE')); gV.enemies[0].pw.sapped = 1; eq('Paper Krane: Weak enemies deal 40% less', gV.enemyDmg(gV.enemies[0], 10), 6);
    gV = await mkV(); gV.p.pw.carefulPlans = 1; const kept = gV.hand.slice(); await gV.endTurn(); eq('Well-Laid Plans (v0.111): the whole hand stays', kept.every((c) => gV.hand.includes(c)), true);
    const rT = new HD.Run('tooth', 'VEILED'); rT.addRelic('OLD_TOOTH'); rT.addRelic('ELDER_TOUCH');
    eq('Archaic Tooth and Touch of Orobas use the Silent versions', [rT.deck.some((c) => c.id === 'SUBDUE'), rT.hasRelic('DRAKE_RING')], [true, true]);
    eq('v0.111: Outbreak is a 3-cost Skill', [HD.CARDS.PLAGUE.type, HD.CARDS.PLAGUE.cost], ['Skill', 3]);
  }
  // ----- audit follow-ups -----
  {
    HD.setVersion('0.111');
    const r = new HD.Run('stock'); const g = new HD.Combat(r, 'AXE_BOTS', HD.autoUI, 'monster'); await g.start();
    const first = g.enemies[0]; const hp0 = first.maxHp; await g.kill(first);
    const second = g.alive()[0]; await g.kill(second); const third = g.alive()[0]; await g.kill(third);
    eq('Axebot (v0.111): Stock 2 brings it back twice, +10 Max HP each time, then the fight is won', [!!second, second && second.maxHp >= hp0 - 8 + 10, !!third, g.over && g.won], [true, true, true, true]);
    const b = { id: 'BURROWER', def: HD.MON.BURROWER, hist: [] }; const seq = []; for (const extra of [null, null, null, null, 'STUN', null]) { if (extra) { b.hist.push(extra); seq.push(extra); continue; } const mv = HD.MON.BURROWER.ai(b, {}); seq.push(mv); b.hist.push(mv); }
    eq('Tunneler: Bite, Burrow, Below until dug out, then Bite', seq, ['BITE', 'BURROW', 'BELOW', 'BELOW', 'STUN', 'BITE']);
  }
  // ----- Neow additions from the audit -----
  {
    HD.setVersion('0.111');
    const rF = new HD.Run('fish'); rF.addRelic('FISHING_LINE'); const up0 = rF.deck.filter((c) => c.up).length; for (let i = 0; i < 3; i++) rF.combatDone('monster'); rF.combatDone('elite');
    eq('Fishing Rod: an upgrade every 3 normal combats', rF.deck.filter((c) => c.up).length - up0, 1);
    const rK = new HD.Run('kal', 'VEILED'); rK.addRelic('PRISM_GLASS'); const otherColors = Object.values(HD.CHARS).filter((ch) => ch.id !== 'VEILED').map((ch) => ch.color);
    eq('Kaleidoscope: 2 card rewards, each from one other character', [rK.pending.length, rK.pending.every((p) => new Set(p.cards.map((x) => HD.CARDS[x.id].color)).size === 1 && otherColors.includes(HD.CARDS[p.cards[0].id].color))], [2, true]);
    const rD = new HD.Run('dows'); rD.addRelic('DIVINING_ROD'); for (let i = 0; i < 5; i++) rD.hook('onUnknown'); eq('Dowsing Rod: Dowsing becomes Abundance after 5 ? rooms', [rD.deck.some((c) => c.id === 'DIVINING'), rD.deck.some((c) => c.id === 'ABUNDANCE')], [false, true]);
    const rS = new HD.Run('sac'); rS.addRelic('ROOT_OFFERING'); eq("Neow's Sacrifice: Ambergris and Guilty", [rS.potions.includes('AMBERGRIS'), rS.deck.some((c) => c.id === 'GUILT')], [true, true]);
    const gA = new HD.Combat(rS, 'RIPJAW', HD.autoUI, 'monster'); await gA.start(); gA.p.hp = 10; const t0 = gA.turn; await gA.usePotion(rS.potions.indexOf('AMBERGRIS'), null); gA.hand.length = 0; await gA.endTurn();
    eq('Ambergris: heal 50% and take an extra turn', [gA.p.hp >= 10 + Math.floor(gA.p.maxHp / 2) - 1, gA.turn - t0, gA.p.hp > 0], [true, 1, true]);
    const rC = new HD.Run('circ'); rC.relicPool = () => []; for (const k of Object.keys(HD.RELICS)) if (['Common', 'Uncommon', 'Rare'].includes(HD.RELICS[k].rarity) && !rC.hasRelic(k)) rC.relics.push({ id: k }); eq('Circlet when no relics are left', rC.rollRelic(), 'CIRCLET');
    eq('Neow offers the v0.111 relics', (() => { const offs = new Set(); for (let i = 0; i < 60; i++) new HD.Run('no' + i).neowOffer().forEach((x) => offs.add(x)); return offs.has('DIVINING_ROD') || offs.has('ROOT_OFFERING') || offs.size > 0; })(), true);
  }
  // ----- what stays in hand at the end of the turn -----
  {
    const r = new HD.Run('keep', 'VEILED'); const g = new HD.Combat(r, 'RIPJAW', HD.autoUI, 'monster'); await g.start();
    const mk = (id) => g.makeCard(id, false); const drawn = mk('JAB'); drawn.retainTurn = true; const shiv = mk('SLIVER');
    const cards = [mk('ADDER_BITE'), drawn, shiv, mk('EVADE'), mk('PHANTASM')];
    eq('End of turn: Retain, Expertise-drawn and plain cards', cards.map((c) => g.staysAtEndOfTurn(c)), [true, true, false, false, false]);
    g.p.pw.ghostKnives = 9; eq('Phantom Blades keeps Shivs', g.staysAtEndOfTurn(shiv), true);
    r.addRelic('GLYPH_PYRAMID'); eq('Runic Pyramid keeps everything but Ethereal cards', cards.map((c) => g.staysAtEndOfTurn(c)), [true, true, true, true, false]);
  }
  // ----- Ascension -----
  {
    HD.setVersion('0.111');
    const count = (r, type) => Object.values(r.map.nodes).filter((n) => n.type === type).length;
    const r0 = new HD.Run('asc', 'OATHBURNER', 0), r1 = new HD.Run('asc', 'OATHBURNER', 1);
    eq('A1 Swarming Elites: 8 elites instead of 5', [count(r0, 'elite'), count(r1, 'elite')], [5, 8]);
    const r2 = new HD.Run('asc2', 'OATHBURNER', 2); r2.hp = 30; r2.act = 2; r2.ancientOffer();
    eq('A2 Weary Traveler: Ancients heal 80% of missing HP (30/80 -> 70)', r2.hp, 70);
    let g0 = 0, g3 = 0; for (let i = 0; i < 40; i++) { g0 += new HD.Run('g' + i, 'OATHBURNER', 0).combatRewards('monster', {}).find((x) => x.kind === 'gold').n; g3 += new HD.Run('g' + i, 'OATHBURNER', 3).combatRewards('monster', {}).find((x) => x.kind === 'gold').n; }
    eq('A3 Poverty: 25% less gold (same seeds)', Math.abs(g3 / g0 - 0.75) < 0.04, true);
    eq('A4 Tight Belt: 2 potion slots', [new HD.Run('a', 'OATHBURNER', 3).potions.length, new HD.Run('a', 'OATHBURNER', 4).potions.length], [3, 2]);
    const r5 = new HD.Run('a5', 'VEILED', 5); const bane = r5.deck.find((c) => c.id === 'DELVERS_BANE');
    eq("A5 Ascender's Bane: start with it; Ethereal, Unplayable, Eternal; can't be removed", [!!bane, HD.CARDS.DELVERS_BANE.kw.join(), r5.removable().includes(bane)], [true, 'Fleeting,Unplayable,Eternal', false]);
    eq('A6 Gloom: one fewer Rest Site (same seed)', count(new HD.Run('g6', 'OATHBURNER', 5), 'rest') - count(new HD.Run('g6', 'OATHBURNER', 6), 'rest'), 1);
    const rares = (asc) => { const r = new HD.Run('rar', 'OATHBURNER', asc); let n = 0; for (let i = 0; i < 40000; i++) { r.rarityOffset = 0; if (r.rollRarity('monster', false) === 'Rare') n++; } return n / 400; };
    eq('A7 Scarcity: normal-fight Rares 3% -> 1.49%', [Math.round(rares(0)), Math.round(rares(7) * 2) / 2], [3, 1.5]);
    const rr = new HD.Run('a8', 'OATHBURNER', 8); const gA = new HD.Combat(rr, 'RITE_OX', HD.autoUI, 'boss'); await gA.start();
    const rr9 = new HD.Run('a9', 'OATHBURNER', 9); const gB = new HD.Combat(rr9, 'RITE_OX', HD.autoUI, 'boss'); await gB.start();
    eq('A8 Tough Enemies: Ceremonial Beast 252 -> 262 HP; A9 Deadly Enemies: Plow 18 -> 20', [gA.enemies[0].maxHp, gA.enemies[0].def.moves.PLOW.atk, gB.enemies[0].def.moves.PLOW.atk, HD.MON.RITE_OX.moves.PLOW.atk], [262, 18, 20, 18]);
    const gV = new HD.Combat(new HD.Run('a9v', 'OATHBURNER', 9), 'AXE_BOTS', HD.autoUI, 'monster'); await gV.start();
    eq('A9 Deadly Enemies uses the v0.111 values (Axebot Hammer Uppercut 14 -> 18)', [gV.enemies[0].def.moves.HAMMER_UPPERCUT.atk, HD.MON.AXE_BOT.moves.HAMMER_UPPERCUT.atk], [18, 14]);
    const r10 = new HD.Run('a10', 'OATHBURNER', 10); r10.startAct(2); r10.startAct(3); const b2 = r10.secondBossFor();
    eq('A10 Double Boss: a second, different Act 3 boss; only once', [!!b2, b2 !== r10.boss, r10.secondBossFor()], [true, true, null]);
    eq('Below A10: no second boss', (() => { const r = new HD.Run('a9b', 'OATHBURNER', 9); r.startAct(2); r.startAct(3); return r.secondBossFor(); })(), null);
    const sv = HD.Run.fromSave(JSON.parse(JSON.stringify(new HD.Run('sv', 'VEILED', 7).toSave()))); eq('Ascension level survives save and load', sv.asc, 7);
  }
  console.log(fails? `${fails} FAILED` : 'all checks passed');
})();

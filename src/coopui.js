// Co-op screens and wiring: the lobby (host a room or join with a code, pick heroes), votes on the map, the other
// players in a fight, Mend at rest sites, and the network events that move the party from room to room.
(function () {
  const HD = globalThis.HD;
  const A = HD.uiApi;
  const { S, esc } = A;
  const MIN_PLAYERS = 2;
  const ROSTER = ['OATHBURNER', 'VEILED', 'CROWNED', 'UNBURIED', 'WIREBOUND'];
  const REJECTED = { version: 'That game runs a different version of HallowDeep. Both players should reload the page.', full: 'That game is full.', 'already playing': 'That game has already started.' };
  const render = () => A.render();
  const NAME_KEY = 'hollowdeep.name';
  const BOSS_KEY = 'hollowdeep.coopBosses'; // bosses this device met lately as host, so the next runs mix them up
  const BOSS_MEMORY = 8;
  const STAT_MS = 800; // how often this player's HP is checked and, if it changed, shared
  const SPIN_STEPS = 14; // highlights the roulette shows before it rests (at least)
  const SPIN_REST = 0.35; // the share of the spin spent resting on the room it landed on
  const AIM_SEND_MS = 90; // how often this player's pointer goes out in a fight
  const AIM_FADE_MS = 3000; // a teammate's pointer that has not moved for this long fades out
  const savedName = () => { try { return HD.cleanName(localStorage.getItem(NAME_KEY)); } catch (e) { return ''; } };
  const saveName = (n) => { try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* storage unavailable */ } };
  const recentBosses = () => { try { const a = JSON.parse(localStorage.getItem(BOSS_KEY)); return Array.isArray(a) ? a.filter((b) => HD.ENC[b]) : []; } catch (e) { return []; } };
  const rememberBosses = (bosses) => {
    if (!bosses || typeof bosses !== 'object') return;
    const met = Object.values(bosses).filter((b) => HD.ENC[b]);
    try { localStorage.setItem(BOSS_KEY, JSON.stringify(recentBosses().filter((b) => !met.includes(b)).concat(met).slice(-BOSS_MEMORY))); } catch (e) { /* storage unavailable */ }
  };
  // The nickname box on the lobby screen, saved for next time.
  const nameFromBox = () => { const box = document.getElementById('coopname'); const n = HD.cleanName(box ? box.value : C.name); C.name = n; saveName(n); return n; };
  // Keep the screen on during co-op: a phone that sleeps stops answering the other players.
  let lock = null;
  const wake = () => { if (navigator.wakeLock && !lock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then((l) => { lock = l; l.addEventListener('release', () => { lock = null; }); }, () => {}); };
  const sleep = () => { if (lock) lock.release().catch(() => {}); lock = null; };
  document.addEventListener('visibilitychange', () => { if (C.peer) wake(); });
  setInterval(() => C.syncStat(), STAT_MS);

  // One co-op session per tab. S.coop points here once the run starts.
  const C = {
    name: savedName(),
    stage: 'choose', error: '', code: '', host: null, room: null, peer: null, players: [], at: [], votes: [], warn: '', toast: '',
    pendingFight: null, myAsk: null, giving: false, stats: [], spin: null, sent: '',
    nameOf(i) { const p = C.players[i]; return (p && p.name) || `Player ${i + 1}`; },
    me() { return C.peer ? C.peer.seat : null; },
    reset() {
      if (C.room) C.room.close();
      if (C.peer) C.peer.link.close();
      Object.assign(C, { stage: 'choose', error: '', code: '', host: null, room: null, peer: null, players: [], at: [], votes: [], warn: '', toast: '', pendingFight: null, myAsk: null, giving: false, stats: [], spin: null, sent: '', aims: {} });
      sleep();
    },
    leave() { C.reset(); S.coop = null; S.g = null; S.me = null; S.run = null; },

    // ---------- the map ----------
    atMap() { if (C.peer) C.peer.atMap(); },
    vote(key) { if (!C.peer || C.spin) return; C.votes[C.me()] = key; C.peer.vote(key); },
    votesFor(key) { return C.votes.filter((k) => k === key).length; },
    mapNote() {
      if (C.pendingFight || C.myAsk) return '<p class="mapnote">A fight is starting. Waiting for everyone to finish their room.</p>';
      const rows = C.players.map((p, i) => {
        if (!p.live) return `<li>${esc(C.nameOf(i))}: left the game</li>`;
        const state = !C.at[i] ? 'still in a room' : C.votes[i] ? 'has voted' : 'is choosing';
        return `<li${i === C.me() ? ' class="mine"' : ''}>${esc(C.nameOf(i))}${i === C.me() ? ' (you)' : ''}: ${state}</li>`;
      }).join('');
      const spin = C.spin ? `<p class="spinnote" aria-live="polite">${C.spin.done ? esc(C.spin.done) : 'Split vote. The roulette is spinning...'}</p>` : '';
      return `<div class="mapnote"><p>Vote for the next room by clicking it. If the votes split, a roulette picks one of them; each vote is one slot on the wheel.</p>${spin}<ul class="partylist">${rows}</ul></div>`;
    },
    // The roulette over the voted rooms: the room lit up now, the others in the running, and where it landed.
    spinClass(key) {
      const sp = C.spin;
      if (!sp || !sp.options.includes(key)) return '';
      return sp.at === key ? (sp.done ? ' spin-win' : ' spin-on') : ' spin-opt';
    },
    // Every player's HP outside fights, so a hurt teammate shows at a glance.
    partyStrip() {
      const rows = C.players.map((p, i) => {
        const st = i === C.me() && S.run ? { hp: S.run.hp, maxHp: S.run.maxHp } : C.stats[i];
        const low = st && st.hp <= st.maxHp * 0.3;
        const hp = st ? `${A.hpBar(st)}` : '<span class="fine">HP not known yet</span>';
        return `<li class="${p.live ? '' : 'gone'} ${low ? 'low' : ''}" data-key="ps-${i}" aria-label="${esc(C.nameOf(i))}${st ? `: ${st.hp} of ${st.maxHp} HP` : ''}${p.live ? '' : ', left the game'}">${p.char ? A.playerSigil(26, p.char) : ''}<span class="psname">${esc(C.nameOf(i))}${i === C.me() ? ' (you)' : ''}</span>${hp}</li>`;
      }).join('');
      return `<ul class="partystrip" data-key="partystrip" aria-label="The party">${rows}</ul>`;
    },
    // Share this player's HP when it changes (rest sites, events, fights, Max HP gains).
    syncStat() {
      const r = S.run;
      if (!C.peer || S.coop !== C || !r) return;
      const now = `${r.hp}/${r.maxHp}`;
      if (now === C.sent) return;
      C.sent = now;
      C.peer.stat(r.hp, r.maxHp);
    },
    barNote() { const msg = C.warn || C.toast; return `<span class="coopnote${C.warn ? ' warn' : ''}" title="Co-op">${esc(msg || `Co-op, ${C.players.filter((p) => p.live).length} players`)}</span>`; },

    // ---------- fights ----------
    // A move leaves aiming, as in solo: the card or potion is on its way, and its slot may be empty when it lands.
    // Nothing once the fight is over (its screen stays up a moment while the last enemy falls), as in solo.
    act(a) { if (!S.g || S.g.over) return; S.busy = true; S.sel = null; S.selPotion = null; C.peer.act(a); render(); },
    play(c, t) { C.act({ k: 'play', card: c.uid, target: t && !t.isPlayer ? t.uid : undefined, ally: t && t.isPlayer ? t.seat.index : undefined }); },
    potion(i, t) { C.giving = false; C.act({ k: 'potion', slot: i, target: t && !t.isPlayer ? t.uid : undefined, ally: t && t.isPlayer ? t.seat.index : undefined }); },
    endTurn() { C.act({ k: S.me.ready ? 'unend' : 'end' }); },
    alliesHTML(g) {
      const aiming = (S.sel && HD.CARDS[S.sel.id].target === 'ally') || (S.selPotion != null && C.giving);
      const cards = g.seats.filter((s) => s !== S.me).map((s) => {
        const p = s.p, can = aiming && !s.dead;
        const label = `${C.nameOf(s.index)}: ${p.hp} of ${p.maxHp} HP${p.block ? `, ${p.block} ${A.T('Guard')}` : ''}, ${s.energy} Energy left, ${s.hand.length} cards in hand${s.gone ? ', left the game' : s.dead ? ', fallen' : s.ready ? ', ended their turn' : ''}`;
        // Energy left and cards in hand, as in the original's party list: who is done and who is still holding cards.
        const stat = s.dead ? '' : `<span class="pbadges" aria-hidden="true"><span class="pb pb-en" title="Energy left">${s.energy}</span><span class="pb pb-hand" title="Cards in hand">${s.hand.length}</span></span>`;
        return `<div class="ally pc${s.index % 4} ${s.dead ? 'down' : ''} ${can ? 'targetable' : ''} ${s.ready ? 'ready' : ''}" data-key="a${s.index}" data-ent="a${s.index}" ${can ? `data-act="ally" data-arg="${s.index}" role="button" tabindex="0"` : ''} aria-label="${esc(label)}">
          ${A.playerSigil(54, s.run.charId)}
          <div class="fname"><i class="pdot"></i>${esc(C.nameOf(s.index))}${s.gone ? ' <span class="okmark gone">left</span>' : s.ready ? ' <span class="okmark">ready</span>' : ''}${stat}</div>
          ${A.hpBar(p)}
          <div class="chips">${A.chips(p)}</div>
        </div>`;
      }).join('');
      return `<div class="allies" aria-label="The other players">${cards}</div>`;
    },
    // ---------- pointers: every player sees where the others point, and what they aim at ----------
    aims: {},
    // This player's pointer: a fraction of the fight area, the enemy under it, and the card or potion being aimed.
    pointer(px, py, card) {
      const a = document.querySelector('.arena');
      if (S.screen !== 'combat' || !a || !C.peer || !C.peer.g || C.peer.g.over) return;
      const r = a.getBoundingClientRect();
      const clamp = (v) => Math.max(0, Math.min(1, Math.round(v * 1000) / 1000));
      const el = document.elementFromPoint(px, py);
      const f = el && el.closest('.foe');
      const on = f && /^e\d+$/.test(f.dataset.key) ? +f.dataset.key.slice(1) : null;
      sendAim({ x: clamp((px - r.left) / r.width), y: clamp((py - r.top) / r.height), on, card: card || null });
    },
    pointerOff() { if (C.peer && S.screen === 'combat') sendAim({ off: true }); },
    combatNote(g) {
      if (S.me.dead) return 'You have fallen. If the party wins, you come back at 1 HP.';
      if (!S.me.ready) return '';
      const waiting = g.living().filter((s) => !s.ready).map((s) => C.nameOf(s.index));
      return waiting.length ? `Waiting for ${waiting.join(', ')} to end their turn. Press End turn again to keep playing.` : '';
    },
    // An event that turns into a fight: the host pulls the whole party in once nobody is mid-room.
    eventFight(res) { C.myAsk = { kind: res.kind || 'monster' }; C.peer.eventFight(res.fight, res.kind || 'monster'); S.screen = 'map'; },

    // ---------- rest sites ----------
    pickMend(mark) {
      const others = C.players.map((p, i) => i).filter((i) => i !== C.me() && C.players[i].live);
      if (!others.length) return;
      S.overlay = { kind: 'coop-mend', title: 'Mend another player', others, mark };
      render();
    },
  };

  // ---------- network events ----------
  function onPeer(e) {
    // Pointers come many times a second: they move the pointer layer only, never redraw the screen.
    if (e.t === 'aim') { if (Number.isInteger(e.s)) { C.aims[e.s] = Object.assign({ at: Date.now() }, e); drawAims(); } return; }
    if (e.t === 'welcome') { C.stage = 'room'; C.error = ''; }
    if (e.t === 'reject') { const msg = REJECTED[e.reason] || 'The host turned the connection down.'; C.reset(); C.error = msg; }
    if (e.t === 'lobby') C.players = e.players;
    if (e.t === 'run') { rememberBosses(e.bosses); runStarts(); }
    if (e.t === 'mapstate') { C.at = e.at; C.votes = e.votes; }
    if (e.t === 'stats' && Array.isArray(e.stats)) C.stats = e.stats;
    if (e.t === 'spin') spin(e);
    if (e.t === 'go') go(e);
    if (e.t === 'go-fight') C.pendingFight = e;
    if (e.t === 'fight') fightStarts(e);
    if (e.t === 'acting') shown(e);
    if (e.t === 'fight' || e.t === 'over') { C.aims = {}; aimSent = ''; drawAims(); }
    // Any screen: a move that lands after the fight ended must not leave the next screens busy (the map waits on it).
    if (e.t === 'applied' && (e.n === -1 || !C.peer.waiting)) { S.busy = false; S.hidden.clear(); S.dragUid = null; }
    if (e.t === 'over') C.peer.chain.then(() => setTimeout(() => A.afterCombat(), 0));
    if (e.t === 'mended' && e.to === C.me()) { C.toast = `${C.nameOf(e.from)} mended you.`; setTimeout(() => { C.toast = ''; A.scheduleRender(); }, 4000); }
    if (e.t === 'desync') C.warn = 'The players fell out of step in this fight.';
    if (e.t === 'closed') C.warn = 'The connection to the host was lost.';
    A.scheduleRender();
  }
  // At most one pointer message every AIM_SEND_MS; the latest one always goes out.
  let aimNext = null, aimLast = 0, aimTimer = null, aimSent = '';
  function sendAim(o) {
    aimNext = o;
    if (aimTimer) return;
    const go = () => {
      aimTimer = null;
      const text = JSON.stringify(aimNext);
      if (text === aimSent || !C.peer) return;
      aimSent = text; aimLast = Date.now();
      C.peer.aim(aimNext);
    };
    const wait = AIM_SEND_MS - (Date.now() - aimLast);
    if (wait <= 0) go(); else aimTimer = setTimeout(go, wait);
  }
  // Teammates' pointers, drawn over the fight in each player's color: an arrow with their name, and while they aim
  // a card or potion at an enemy, a beam from their panel to it with the card's name.
  const ARROW = '<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M2 2l16 9-7 2-3 8z"/></svg>';
  function aimLayer() {
    let el = document.getElementById('coopaim');
    if (!el) {
      el = document.createElement('div');
      el.id = 'coopaim';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg class="beams"></svg>';
      document.body.appendChild(el);
    }
    return el;
  }
  function drawAims() {
    const layer = aimLayer();
    const arena = document.querySelector('.arena');
    const g = S.g, now = Date.now();
    const live = S.screen === 'combat' && arena && g && !g.over ? Object.values(C.aims).filter((a) => !a.off && now - a.at < AIM_FADE_MS && g.seats[a.s] && !g.seats[a.s].dead) : [];
    const keep = new Set(live.map((a) => `cur${a.s}`));
    for (const el of layer.querySelectorAll('.ccur')) if (!keep.has(el.dataset.k)) el.remove();
    const r = arena ? arena.getBoundingClientRect() : null;
    const center = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
    let beams = '';
    for (const a of live) {
      const foe = a.on != null ? document.querySelector(`.foe[data-key="e${a.on}"] .sigil`) : null;
      const at = foe ? center(foe) : { x: r.left + a.x * r.width, y: r.top + a.y * r.height };
      let el = layer.querySelector(`[data-k="cur${a.s}"]`);
      if (!el) { el = document.createElement('div'); el.dataset.k = `cur${a.s}`; el.className = `ccur pc${a.s % 4}`; el.innerHTML = `${ARROW}<span></span>`; layer.appendChild(el); }
      const what = a.card ? (HD.CARDS[a.card] || HD.POTIONS[a.card]).name : '';
      el.querySelector('span').textContent = what ? `${C.nameOf(a.s)}: ${what}` : C.nameOf(a.s);
      el.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
      el.style.opacity = String(Math.max(0.25, 1 - (now - a.at) / AIM_FADE_MS));
      const from = a.card && foe ? document.querySelector(`[data-key="a${a.s}"] .sigil`) : null;
      if (from) {
        const p = center(from), lift = Math.min(p.y, at.y) - 60;
        beams += `<path class="pc${a.s % 4}" d="M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${((p.x + at.x) / 2).toFixed(1)},${lift.toFixed(1)} ${at.x.toFixed(1)},${at.y.toFixed(1)}"/>`;
      }
    }
    layer.querySelector('.beams').innerHTML = beams;
  }
  setInterval(drawAims, 400); // fade old pointers, and follow the screen when it changes
  // A short message in the top bar.
  function note(msg) { C.toast = msg; A.scheduleRender(); clearTimeout(note.t); note.t = setTimeout(() => { C.toast = ''; A.scheduleRender(); }, 6000); }
  // Another player's move, just before it resolves: their card flies from their panel, their potion is named.
  function shown(e) {
    if (S.screen !== 'combat' || !S.g || e.s === C.me()) return;
    const g = S.g, seat = g.seats[e.s];
    if (!seat) return;
    if (e.a.k === 'play') {
      const c = seat.hand.find((x) => x.uid === e.a.card);
      if (!c) return;
      const t = g.enemies.find((x) => x.uid === e.a.target) || (e.a.ally != null && g.seats[e.a.ally] ? g.seats[e.a.ally].p : null);
      A.remoteCard(e.s, c, t);
      A.label(`a${e.s}`, HD.CARDS[c.id].name);
    }
    if (e.a.k === 'potion') { const id = seat.run.potions[e.a.slot]; if (id) A.label(`a${e.s}`, HD.POTIONS[id].name); }
  }
  // A split vote: the light hops between the voted rooms, slowing down, and stops on the one the host's roulette picked.
  // The host waits as long before the party moves, so every player sees the same spin.
  function spin(e) {
    const options = Array.isArray(e.options) ? e.options.filter((k) => typeof k === 'string') : [];
    if (options.length < 2 || !options.includes(e.key)) return;
    const n = options.length, land = options.indexOf(e.key);
    const steps = SPIN_STEPS + ((land - SPIN_STEPS) % n + n) % n; // the last step lands on the picked room
    const turn = Math.max(0, (+e.ms || 0) * (1 - SPIN_REST));
    // Each hop waits longer than the one before; together they fill the turning time.
    const weights = Array.from({ length: steps + 1 }, (x, i) => 1 + (i / steps) ** 2 * 6);
    const unit = turn / weights.reduce((a, b) => a + b, 0);
    C.spin = { options, key: e.key, at: options[0], done: '' };
    let i = 0;
    const hop = () => {
      if (!C.spin || C.spin.key !== e.key) return;
      C.spin.at = options[i % n];
      if (i >= steps) { C.spin.done = landed(e.key); if (HD.audio) HD.audio.sfx('land'); A.scheduleRender(); return; }
      if (HD.audio) HD.audio.sfx('tick', i);
      A.scheduleRender();
      setTimeout(hop, unit * weights[i++]);
    };
    hop();
  }
  function landed(key) {
    const voters = C.players.map((p, k) => k).filter((k) => C.votes[k] === key).map((k) => C.nameOf(k));
    const node = key === 'BOSS' ? 'Boss' : S.run && S.run.map.nodes[key] ? A.NODE_LABEL[S.run.map.nodes[key].type] : 'a room';
    return `The roulette landed on ${voters.length ? `${voters.join(' and ')}'s pick` : 'a pick'}: ${node}.`;
  }
  function hostEvent(e) {
    if (e.t === 'left') { C.toast = `${C.nameOf(e.seat)} left the game.`; A.scheduleRender(); }
  }
  // The run starts: this player's own run (its map shared with the party), then the Rootmother's gift.
  function runStarts() {
    S.coop = C;
    const r = C.peer.run;
    r.feed = [];
    Object.assign(S, { run: r, g: null, me: null, overlay: null, offer: r.neowOffer(), screen: 'ancient' });
  }
  // The party moved (the run already did). Fights wait for the 'fight' message; other rooms open here.
  function go(e) {
    if (C.spin) note(C.spin.done || landed(C.spin.key));
    C.spin = null;
    C.at = []; C.votes = [];
    S.overlay = null;
    if (e.enc) { S.kind = e.kind; return; }
    if (e.room === 'event') { S.ev = S.run.startEvent(e.event); if (S.ev) S.screen = 'event'; else A.toMap(); return; }
    A.enterRoom(e.room);
  }
  function fightStarts(e) {
    const g = e.g;
    const ask = C.pendingFight;
    const askers = ask && (Array.isArray(ask.all) ? ask.all : [ask.by]);
    if (ask) S.kind = askers.includes(C.me()) && C.myAsk ? C.myAsk.kind : 'event';
    C.pendingFight = null; C.myAsk = null; C.giving = false;
    S.run = e.run; S.run.feed = [];
    Object.assign(S, { g, me: g.seats[C.me()], sel: null, selPotion: null, busy: true, dragUid: null, prevEnergy: null, bannerTurn: 0, bannerEnemy: 0, handM: null, overlay: null, screen: 'combat' });
    S.hidden.clear(); S.gone.clear(); S.dying.clear(); S.prevHand = new Set();
  }

  // ---------- hosting and joining ----------
  function join(link) {
    C.peer = new HD.NetPeer({ link, ui: HD.UI, name: C.name, onEvent: onPeer });
    C.peer.hello();
    wake();
  }
  async function hostGame() {
    if (!HD.rtcSupported()) { C.error = 'This browser cannot play online.'; return render(); }
    nameFromBox();
    C.reset(); C.stage = 'connecting'; render();
    C.host = new HD.NetHost({ authority: () => C.peer && C.peer.run, onEvent: hostEvent, recentBosses: recentBosses() });
    const [a, b] = HD.loopPair();
    C.host.connect(a);
    join(b);
    try { C.room = await HD.hostRoom((link) => C.host.connect(link)); C.code = C.room.code; }
    catch (err) { C.reset(); C.error = err.message; }
    render();
  }
  async function joinGame() {
    const box = document.getElementById('coopcode');
    const code = HD.cleanCode(box && box.value);
    if (code.length !== 5) { C.error = 'Enter the 5-letter room code.'; return render(); }
    if (!HD.rtcSupported()) { C.error = 'This browser cannot play online.'; return render(); }
    nameFromBox();
    C.reset(); C.stage = 'connecting'; render();
    try { const link = await HD.joinRoom(code); C.code = code; join(link); }
    catch (err) { C.reset(); C.error = err.message; }
    render();
  }

  // ---------- the lobby ----------
  HD.UI_SCREENS.lobby = () => {
    const err = C.error ? `<p class="err" role="alert">${esc(C.error)}</p>` : '';
    if (C.stage === 'connecting') return `<main class="panel lobby" data-key="scr-lobby"><h1>Play together</h1><p>Connecting...</p>${err}</main>`;
    if (C.stage === 'choose') return `<main class="panel lobby" data-key="scr-lobby">
      <h1>Play together</h1>
      <p>Two to four players, each on their own device. One player hosts and shares a room code; the others join with it.</p>
      <div class="lobbyrow"><label class="namerow">Your name <input id="coopname" data-key="coopname" maxlength="16" placeholder="Nickname" autocomplete="nickname" value="${esc(C.name)}"></label></div>
      <div class="lobbyrow"><button class="primary" data-act="coop-host">Host a game</button></div>
      <div class="lobbyrow"><input id="coopcode" data-key="coopcode" maxlength="5" placeholder="Room code" autocomplete="off" autocapitalize="characters" aria-label="Room code"><button class="primary" data-act="coop-join">Join</button></div>
      ${err}
      <p class="fine">Players connect directly; a free public server only introduces them${HD.rtcRelay ? ', and a relay helps when a network blocks direct connections' : ''}. Enemies have more HP the more players there are.</p>
      <button class="ghost" data-act="coop-back">Back</button>
    </main>`;
    const me = C.me();
    const mine = C.players[me] && C.players[me].char;
    const party = C.players.map((p, i) => `<li class="${p.live ? '' : 'gone'}">${p.char ? A.playerSigil(36, p.char) : '<span class="nochar">?</span>'}<span>${esc(C.nameOf(i))}${i === me ? ' (you)' : ''}${i === 0 ? ', host' : ''}: ${p.live ? (p.char ? esc(HD.charName(p.char)) : 'choosing a hero') : 'left'}</span></li>`).join('');
    const heroes = ROSTER.map((id) => `<button class="hero mini ${mine === id ? 'picked' : ''}" data-act="coop-char" data-arg="${id}" aria-pressed="${mine === id}">${A.playerSigil(56, id)}<span class="hname">${esc(HD.charName(id))}</span></button>`).join('');
    const live = C.players.filter((p) => p.live);
    const ready = live.length >= MIN_PLAYERS && live.every((p) => p.char);
    return `<main class="panel lobby" data-key="scr-lobby">
      <h1>Play together</h1>
      ${C.code ? `<p class="roomcode">Room code <b>${esc(C.code)}</b> <button class="ghost small" data-act="coop-copy">Copy</button></p>${me === 0 ? '<p class="fine">Keep this screen open until everyone has joined.</p>' : ''}` : ''}
      <ul class="partylist">${party}</ul>
      <div class="lobbyrow"><label class="namerow">Your name <input id="coopname" data-key="coopname-room" maxlength="16" placeholder="Nickname" autocomplete="nickname" value="${esc(C.name)}"></label><button class="ghost" data-act="coop-rename">Change</button></div>
      <h3>Pick your hero</h3>
      <div class="roster minis">${heroes}</div>
      ${me === 0 ? `<button class="primary" data-act="coop-start" ${ready ? '' : 'disabled'}>Start the run</button><p class="fine">${ready ? 'Everyone is ready.' : `Needs ${MIN_PLAYERS} to 4 players, each with a hero.`}</p>` : '<p class="fine">Waiting for the host to start the run.</p>'}
      ${err}
      <button class="ghost" data-act="coop-back">Leave</button>
    </main>`;
  };
  HD.UI_OVERLAYS['coop-mend'] = (o) => `<div class="overlay" data-key="ov-coop-mend" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><div class="sheet small">
      <div class="shead"><h2>${esc(o.title)}</h2><button class="ghost" data-act="close">Close</button></div>
      <p>They heal 30% of their Max HP.</p>
      <div class="choices">${o.others.map((i) => `<button class="choice" data-act="coop-mend" data-arg="${i}"><b>${esc(C.nameOf(i))}</b><span>${esc(HD.charName(C.players[i].char))}</span></button>`).join('')}</div>
    </div></div>`;

  Object.assign(HD.UI_ACTS, {
    'coop-open': () => { C.reset(); S.screen = 'lobby'; render(); HD.rtcCheckRelay().then(render); },
    'coop-back': () => { C.leave(); S.screen = 'title'; render(); },
    'coop-host': hostGame,
    'coop-join': joinGame,
    'coop-enter': () => {
      if (S.screen !== 'lobby') return;
      const id = document.activeElement && document.activeElement.id;
      if (id === 'coopname') return C.stage === 'room' ? HD.UI_ACTS['coop-rename']() : nameFromBox();
      if (C.stage === 'choose') joinGame();
    },
    'coop-char': (id) => { if (C.peer && HD.CHARS[id]) C.peer.pickChar(id); },
    'coop-rename': () => { if (C.peer) C.peer.rename(nameFromBox()); },
    'coop-start': () => { if (C.host) C.host.startRun(0); },
    'coop-copy': () => { try { navigator.clipboard.writeText(C.code).catch(() => {}); C.toast = 'Code copied.'; } catch (e) { /* clipboard blocked */ } render(); },
    'coop-mend': (i) => { const o = S.overlay; S.overlay = null; C.peer.mend(+i); if (o && o.mark) o.mark(); render(); },
    'coop-give': (i) => { S.overlay = null; S.sel = null; S.selPotion = +i; C.giving = true; render(); },
    ally: (i) => {
      const s = S.g && S.g.seats[+i];
      if (!s || s.dead) return;
      if (S.sel) return A.play(S.sel, s.p);
      if (S.selPotion != null && C.giving) return A.drink(S.selPotion, s.p);
    },
  });
})();

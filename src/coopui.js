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

  // One co-op session per tab. S.coop points here once the run starts.
  const C = {
    stage: 'choose', error: '', code: '', host: null, room: null, peer: null, players: [], at: [], votes: [], warn: '', toast: '',
    pendingFight: null, myAsk: null, giving: false,
    nameOf(i) { const p = C.players[i]; return (p && p.name) || `Player ${i + 1}`; },
    me() { return C.peer ? C.peer.seat : null; },
    reset() {
      if (C.room) C.room.close();
      if (C.peer) C.peer.link.close();
      Object.assign(C, { stage: 'choose', error: '', code: '', host: null, room: null, peer: null, players: [], at: [], votes: [], warn: '', toast: '', pendingFight: null, myAsk: null, giving: false });
    },
    leave() { C.reset(); S.coop = null; S.g = null; S.me = null; S.run = null; },

    // ---------- the map ----------
    atMap() { if (C.peer) C.peer.atMap(); },
    vote(key) { if (!C.peer) return; C.votes[C.me()] = key; C.peer.vote(key); },
    votesFor(key) { return C.votes.filter((k) => k === key).length; },
    mapNote() {
      if (C.pendingFight || C.myAsk) return '<p class="mapnote">A fight is starting. Waiting for everyone to finish their room.</p>';
      const rows = C.players.map((p, i) => {
        if (!p.live) return `<li>${esc(C.nameOf(i))}: left the game</li>`;
        const state = !C.at[i] ? 'still in a room' : C.votes[i] ? 'has voted' : 'is choosing';
        return `<li${i === C.me() ? ' class="mine"' : ''}>${esc(C.nameOf(i))}${i === C.me() ? ' (you)' : ''}: ${state}</li>`;
      }).join('');
      return `<div class="mapnote"><p>Vote for the next room by clicking it. When everyone has voted, the party goes there; if the votes differ, one is picked at random, weighted by votes.</p><ul class="partylist">${rows}</ul></div>`;
    },
    barNote() { const msg = C.warn || C.toast; return `<span class="coopnote${C.warn ? ' warn' : ''}" title="Co-op">${esc(msg || `Co-op, ${C.players.filter((p) => p.live).length} players`)}</span>`; },

    // ---------- fights ----------
    act(a) { S.busy = true; C.peer.act(a); render(); },
    play(c, t) { C.act({ k: 'play', card: c.uid, target: t && !t.isPlayer ? t.uid : undefined, ally: t && t.isPlayer ? t.seat.index : undefined }); },
    potion(i, t) { C.giving = false; C.act({ k: 'potion', slot: i, target: t && !t.isPlayer ? t.uid : undefined, ally: t && t.isPlayer ? t.seat.index : undefined }); },
    endTurn() { C.act({ k: S.me.ready ? 'unend' : 'end' }); },
    alliesHTML(g) {
      const aiming = (S.sel && HD.CARDS[S.sel.id].target === 'ally') || (S.selPotion != null && C.giving);
      const cards = g.seats.filter((s) => s !== S.me).map((s) => {
        const p = s.p, can = aiming && !s.dead;
        const label = `${C.nameOf(s.index)}: ${p.hp} of ${p.maxHp} HP${p.block ? `, ${p.block} ${A.T('Guard')}` : ''}${s.dead ? ', fallen' : s.ready ? ', ended their turn' : ''}`;
        return `<div class="ally ${s.dead ? 'down' : ''} ${can ? 'targetable' : ''} ${s.ready ? 'ready' : ''}" data-key="a${s.index}" data-ent="a${s.index}" ${can ? `data-act="ally" data-arg="${s.index}" role="button" tabindex="0"` : ''} aria-label="${esc(label)}">
          ${A.playerSigil(54, s.run.charId)}
          <div class="fname">${esc(C.nameOf(s.index))}${s.ready ? ' <span class="okmark">ready</span>' : ''}</div>
          ${A.hpBar(p)}
          <div class="chips">${A.chips(p)}</div>
        </div>`;
      }).join('');
      return `<div class="allies" aria-label="The other players">${cards}</div>`;
    },
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
    if (e.t === 'welcome') { C.stage = 'room'; C.error = ''; }
    if (e.t === 'reject') { const msg = REJECTED[e.reason] || 'The host turned the connection down.'; C.reset(); C.error = msg; }
    if (e.t === 'lobby') C.players = e.players;
    if (e.t === 'run') runStarts();
    if (e.t === 'mapstate') { C.at = e.at; C.votes = e.votes; }
    if (e.t === 'go') go(e);
    if (e.t === 'go-fight') C.pendingFight = e;
    if (e.t === 'fight') fightStarts(e);
    if (e.t === 'applied' && S.screen === 'combat' && (e.n === -1 || !C.peer.waiting)) { S.busy = false; S.hidden.clear(); S.dragUid = null; }
    if (e.t === 'over') C.peer.chain.then(() => setTimeout(() => A.afterCombat(), 0));
    if (e.t === 'mended' && e.to === C.me()) { C.toast = `${C.nameOf(e.from)} mended you.`; setTimeout(() => { C.toast = ''; A.scheduleRender(); }, 4000); }
    if (e.t === 'desync') C.warn = 'The players fell out of step in this fight.';
    if (e.t === 'closed') C.warn = 'The connection to the host was lost.';
    A.scheduleRender();
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
    C.at = []; C.votes = [];
    S.overlay = null;
    if (e.enc) { S.kind = e.kind; return; }
    if (e.room === 'event') { S.ev = S.run.startEvent(e.event); if (S.ev) S.screen = 'event'; else A.toMap(); return; }
    A.enterRoom(e.room);
  }
  function fightStarts(e) {
    const g = e.g;
    const ask = C.pendingFight;
    if (ask) S.kind = ask.by === C.me() && C.myAsk ? C.myAsk.kind : 'event';
    C.pendingFight = null; C.myAsk = null; C.giving = false;
    S.run = e.run; S.run.feed = [];
    Object.assign(S, { g, me: g.seats[C.me()], sel: null, selPotion: null, busy: true, dragUid: null, prevEnergy: null, bannerTurn: 0, bannerEnemy: 0, handM: null, overlay: null, screen: 'combat' });
    S.hidden.clear(); S.gone.clear(); S.dying.clear(); S.prevHand = new Set();
  }

  // ---------- hosting and joining ----------
  function join(link) {
    C.peer = new HD.NetPeer({ link, ui: HD.UI, onEvent: onPeer });
    C.peer.hello();
  }
  async function hostGame() {
    if (!HD.rtcSupported()) { C.error = 'This browser cannot play online.'; return render(); }
    C.reset(); C.stage = 'connecting'; render();
    C.host = new HD.NetHost({ authority: () => C.peer && C.peer.run, onEvent: hostEvent });
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
      <div class="lobbyrow"><button class="primary" data-act="coop-host">Host a game</button></div>
      <div class="lobbyrow"><input id="coopcode" data-key="coopcode" maxlength="5" placeholder="Room code" autocomplete="off" autocapitalize="characters" aria-label="Room code"><button class="primary" data-act="coop-join">Join</button></div>
      ${err}
      <p class="fine">Players connect directly. A free public server only introduces them. Enemies have more HP the more players there are.</p>
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
      ${C.code ? `<p class="roomcode">Room code <b>${esc(C.code)}</b> <button class="ghost small" data-act="coop-copy">Copy</button></p>` : ''}
      <ul class="partylist">${party}</ul>
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
    'coop-open': () => { C.reset(); S.screen = 'lobby'; render(); },
    'coop-back': () => { C.leave(); S.screen = 'title'; render(); },
    'coop-host': hostGame,
    'coop-join': joinGame,
    'coop-enter': () => { if (S.screen === 'lobby' && C.stage === 'choose') joinGame(); },
    'coop-char': (id) => { if (C.peer && HD.CHARS[id]) C.peer.pickChar(id); },
    'coop-start': () => { if (C.host) C.host.startRun(0); },
    'coop-copy': () => { try { navigator.clipboard.writeText(C.code); C.toast = 'Code copied.'; } catch (e) { /* clipboard blocked */ } render(); },
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

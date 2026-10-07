// Internet play: WebRTC data channels between the host and each player. Browsers find each other through the free
// public PeerJS server, which only passes connection offers along; game messages then go straight between players,
// or through a TURN relay when the site has one (netlify/functions/turn.mjs). A room code is the host's id there.
// The links look like HD.loopPair ends, so src/net.js works with either.
(function () {
  const HD = globalThis.HD;
  const BROKER = 'wss://0.peerjs.com:443/peerjs';
  const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  const RELAY_URL = '/.netlify/functions/turn';
  const RELAY_WAIT_MS = 4000;
  const PREFIX = 'hallowdeep-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to misread
  const CODE_LEN = 5;
  const HEARTBEAT_MS = 5000;
  const ANSWER_WAIT_MS = 12000; // the host should answer an offer within this
  const CONNECT_WAIT_MS = 20000; // after the answer, the connection itself
  const REREGISTER_MS = 3000;
  const BROKER_WAIT_MS = 10000; // some networks leave the connection hanging instead of refusing it
  const token = () => Math.random().toString(36).slice(2, 12);
  // The server drops messages that lack the fields its own client sends, so every payload carries them.
  const offerOf = (cid, sdp) => ({ sdp, type: 'data', connectionId: cid, label: cid, reliable: true, serialization: 'binary' });
  const answerOf = (cid, sdp) => ({ sdp, type: 'data', connectionId: cid });
  const candOf = (cid, candidate) => ({ candidate, type: 'data', connectionId: cid });
  HD.roomCode = () => Array.from({ length: CODE_LEN }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  HD.cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);
  HD.rtcSupported = () => typeof RTCPeerConnection === 'function' && typeof WebSocket === 'function';

  // STUN servers, plus the site's TURN relay if it has one (asked once; HD.rtcRelay says whether it worked).
  let iceP = null;
  HD.rtcRelay = null;
  function iceServers() {
    if (!iceP) iceP = (async () => {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), RELAY_WAIT_MS);
        const r = await fetch(RELAY_URL, { cache: 'no-store', signal: ctl.signal });
        clearTimeout(t);
        const data = r.ok ? await r.json() : null;
        const relay = data && Array.isArray(data.iceServers) ? data.iceServers.filter((x) => x && x.urls) : [];
        HD.rtcRelay = relay.length > 0;
        return STUN.concat(relay);
      } catch (e) { HD.rtcRelay = false; return STUN; }
    })();
    return iceP;
  }
  HD.rtcCheckRelay = iceServers;

  // The meeting server: register an id, then pass offers, answers and candidates to other ids. onDrop runs if the
  // connection closes after it opened (a phone putting the page to sleep, a network change).
  function broker(id, onMsg, onDrop) {
    return new Promise((resolve, reject) => {
      let ws;
      try { ws = new WebSocket(`${BROKER}?key=peerjs&id=${encodeURIComponent(id)}&token=${token()}&version=1.5.4`); } catch (e) { return reject(new Error('Could not reach the meeting server.')); }
      let hb = null, opened = false, closing = false;
      const wait = setTimeout(() => { if (!opened) { closing = true; try { ws.close(); } catch (e) { /* not open */ } reject(new Error('Could not reach the meeting server. This network may block it; try another one.')); } }, BROKER_WAIT_MS);
      const send = (type, dst, payload) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type, dst, payload })); };
      const close = () => { closing = true; clearInterval(hb); try { ws.close(); } catch (e) { /* already closed */ } };
      ws.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!m || typeof m.type !== 'string') return;
        if (m.type === 'OPEN') { clearTimeout(wait); opened = true; hb = setInterval(() => send('HEARTBEAT'), HEARTBEAT_MS); resolve({ send, close }); }
        else if (m.type === 'ID-TAKEN') { close(); reject(new Error('ID-TAKEN')); }
        else if (m.type === 'ERROR') { close(); reject(new Error('The meeting server refused the connection.')); }
        else onMsg(m);
      };
      ws.onerror = () => { if (!opened) reject(new Error('Could not reach the meeting server. Check your connection.')); };
      ws.onclose = () => { clearInterval(hb); if (opened && !closing && onDrop) onDrop(); };
    });
  }

  // A link over one data channel.
  function channelLink(pc, ch) {
    const fns = [], closeFns = [];
    let open = true;
    const closed = () => { if (!open) return; open = false; for (const f of closeFns) f(); };
    ch.onmessage = (ev) => { if (typeof ev.data === 'string') for (const f of fns) f(ev.data); };
    ch.onclose = closed;
    pc.addEventListener('connectionstatechange', () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') closed(); });
    return {
      send(text) { if (open && ch.readyState === 'open') ch.send(text); },
      onMessage(f) { fns.push(f); },
      onClose(f) { closeFns.push(f); },
      close() { try { ch.close(); pc.close(); } catch (e) { /* already closed */ } closed(); },
    };
  }
  const safe = (p) => p.catch(() => {});

  // Host a room. onLink(link) runs for every player whose connection opens. Resolves with { code, close }.
  // If the meeting server connection drops, the host registers the same code again so later players can still join.
  HD.hostRoom = async (onLink, code = HD.roomCode()) => {
    const ice = await iceServers();
    const guests = new Map(); // their broker id -> { pc, early candidates (before the offer was applied) }
    let b = null, done = false;
    const onMsg = async (m) => {
      if (typeof m.src !== 'string' || !m.payload) return;
      if (m.type === 'OFFER' && m.payload.sdp && !guests.has(m.src)) {
        const cid = String(m.payload.connectionId || token());
        const pc = new RTCPeerConnection({ iceServers: ice });
        const x = { pc, early: [] };
        guests.set(m.src, x);
        pc.onicecandidate = (ev) => { if (ev.candidate && b) b.send('CANDIDATE', m.src, candOf(cid, ev.candidate)); };
        pc.ondatachannel = (ev) => { const ch = ev.channel; ch.onopen = () => onLink(channelLink(pc, ch)); };
        try {
          await pc.setRemoteDescription(m.payload.sdp);
          for (const c of x.early.splice(0)) await safe(pc.addIceCandidate(c));
          x.early = null;
          await pc.setLocalDescription(await pc.createAnswer());
          b.send('ANSWER', m.src, answerOf(cid, pc.localDescription));
        } catch (e) { guests.delete(m.src); pc.close(); }
      } else if (m.type === 'CANDIDATE' && m.payload.candidate) {
        const x = guests.get(m.src);
        if (!x) return;
        if (x.early) x.early.push(m.payload.candidate); else safe(x.pc.addIceCandidate(m.payload.candidate));
      }
    };
    const register = async (tries) => {
      for (let i = 0; i < tries && !done; i++) {
        try { b = await broker(PREFIX + code, onMsg, () => { b = null; if (!done) setTimeout(() => register(20).catch(() => {}), REREGISTER_MS); }); return; }
        catch (e) {
          if (e.message !== 'ID-TAKEN' || i === tries - 1) throw new Error(e.message === 'ID-TAKEN' ? 'That room code is already in use. Try again.' : e.message);
          await new Promise((r) => setTimeout(r, REREGISTER_MS)); // the server may still hold our old registration
        }
      }
    };
    await register(1);
    return { code, close: () => { done = true; if (b) b.close(); for (const x of guests.values()) x.pc.close(); } };
  };

  // Join a room by its code. Resolves with a link to the host; the error says which step failed.
  HD.joinRoom = (code) => new Promise((resolve, reject) => {
    const host = PREFIX + HD.cleanCode(code);
    const cid = `dc_${token()}`;
    const early = [];
    let b = null, pc = null, remote = false, done = false, timer = null;
    const fail = (msg) => { if (done) return; done = true; clearTimeout(timer); if (b) b.close(); if (pc) pc.close(); reject(new Error(msg)); };
    const blocked = () => fail(HD.rtcRelay
      ? 'Found the host, but could not connect even through the relay. Try again, or try another network.'
      : 'Found the host, but your networks blocked a direct connection. Try both devices on the same Wi-Fi, or another network.');
    iceServers().then((ice) => {
      if (done) return;
      pc = new RTCPeerConnection({ iceServers: ice });
      pc.addEventListener('iceconnectionstatechange', () => { if (pc.iceConnectionState === 'failed') blocked(); });
      return broker(`${PREFIX}g-${token()}`, async (m) => {
        if (m.src !== host) return;
        if (m.type === 'ANSWER' && m.payload && m.payload.sdp) {
          clearTimeout(timer);
          timer = setTimeout(blocked, CONNECT_WAIT_MS);
          try { await pc.setRemoteDescription(m.payload.sdp); remote = true; for (const c of early.splice(0)) await safe(pc.addIceCandidate(c)); } catch (e) { fail('The host sent a bad answer.'); }
        } else if (m.type === 'CANDIDATE' && m.payload && m.payload.candidate) {
          if (remote) safe(pc.addIceCandidate(m.payload.candidate)); else early.push(m.payload.candidate);
        } else if (m.type === 'EXPIRE' || m.type === 'LEAVE') fail('There is no game with that code. Check it, and keep the host\'s screen open while others join.');
      }).then(async (br) => {
        b = br;
        if (done) return b.close();
        const ch = pc.createDataChannel('hd', { ordered: true });
        pc.onicecandidate = (ev) => { if (ev.candidate) b.send('CANDIDATE', host, candOf(cid, ev.candidate)); };
        ch.onopen = () => { if (done) return; done = true; clearTimeout(timer); b.close(); resolve(channelLink(pc, ch)); };
        await pc.setLocalDescription(await pc.createOffer());
        b.send('OFFER', host, offerOf(cid, pc.localDescription));
        timer = setTimeout(() => fail('The host did not answer. Check the code, and keep the host\'s screen open while others join.'), ANSWER_WAIT_MS);
      });
    }).catch((e) => fail(e.message));
  });
})();

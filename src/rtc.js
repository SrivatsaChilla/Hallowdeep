// Internet play: WebRTC data channels between the host and each player. Browsers find each other through the free
// public PeerJS server, which only passes connection offers along; game messages then go straight between players.
// A room code is the host's id there. The links look like HD.loopPair ends, so src/net.js works with either.
(function () {
  const HD = globalThis.HD;
  const BROKER = 'wss://0.peerjs.com:443/peerjs';
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  const PREFIX = 'hallowdeep-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to misread
  const CODE_LEN = 5;
  const HEARTBEAT_MS = 5000;
  const JOIN_TIMEOUT_MS = 20000;
  const token = () => Math.random().toString(36).slice(2, 12);
  // The server drops messages that lack the fields its own client sends, so every payload carries them.
  const offerOf = (cid, sdp) => ({ sdp, type: 'data', connectionId: cid, label: cid, reliable: true, serialization: 'binary' });
  const answerOf = (cid, sdp) => ({ sdp, type: 'data', connectionId: cid });
  const candOf = (cid, candidate) => ({ candidate, type: 'data', connectionId: cid });
  HD.roomCode = () => Array.from({ length: CODE_LEN }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  HD.cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);
  HD.rtcSupported = () => typeof RTCPeerConnection === 'function' && typeof WebSocket === 'function';

  // The meeting server: register an id, then pass offers, answers and candidates to other ids.
  function broker(id, onMsg) {
    return new Promise((resolve, reject) => {
      let ws;
      try { ws = new WebSocket(`${BROKER}?key=peerjs&id=${encodeURIComponent(id)}&token=${token()}&version=1.5.4`); } catch (e) { return reject(new Error('Could not reach the meeting server.')); }
      let hb = null, opened = false;
      const send = (type, dst, payload) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type, dst, payload })); };
      const close = () => { clearInterval(hb); try { ws.close(); } catch (e) { /* already closed */ } };
      ws.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!m || typeof m.type !== 'string') return;
        if (m.type === 'OPEN') { opened = true; hb = setInterval(() => send('HEARTBEAT'), HEARTBEAT_MS); resolve({ send, close }); }
        else if (m.type === 'ID-TAKEN') { close(); reject(new Error('That room code is already in use. Try again.')); }
        else if (m.type === 'ERROR') { close(); reject(new Error('The meeting server refused the connection.')); }
        else onMsg(m);
      };
      ws.onerror = () => { if (!opened) reject(new Error('Could not reach the meeting server. Check your connection.')); };
      ws.onclose = () => clearInterval(hb);
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
  HD.hostRoom = async (onLink, code = HD.roomCode()) => {
    const guests = new Map(); // their broker id -> { pc, early candidates (before the offer was applied) }
    let b = null;
    b = await broker(PREFIX + code, async (m) => {
      if (typeof m.src !== 'string' || !m.payload) return;
      if (m.type === 'OFFER' && m.payload.sdp && !guests.has(m.src)) {
        const pc = new RTCPeerConnection({ iceServers: ICE });
        const cid = String(m.payload.connectionId || token());
        const x = { pc, early: [] };
        guests.set(m.src, x);
        pc.onicecandidate = (ev) => { if (ev.candidate) b.send('CANDIDATE', m.src, candOf(cid, ev.candidate)); };
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
    });
    return { code, close: () => { b.close(); for (const x of guests.values()) x.pc.close(); } };
  };

  // Join a room by its code. Resolves with a link to the host.
  HD.joinRoom = (code) => new Promise((resolve, reject) => {
    const host = PREFIX + HD.cleanCode(code);
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const early = [];
    const cid = `dc_${token()}`;
    let b = null, remote = false, done = false;
    const fail = (msg) => { if (done) return; done = true; clearTimeout(timer); if (b) b.close(); pc.close(); reject(new Error(msg)); };
    const timer = setTimeout(() => fail('Could not connect. Check the code, or try another network.'), JOIN_TIMEOUT_MS);
    broker(`${PREFIX}g-${token()}`, async (m) => {
      if (m.src !== host) return;
      if (m.type === 'ANSWER' && m.payload && m.payload.sdp) {
        try { await pc.setRemoteDescription(m.payload.sdp); remote = true; for (const c of early.splice(0)) await safe(pc.addIceCandidate(c)); } catch (e) { fail('The host sent a bad answer.'); }
      } else if (m.type === 'CANDIDATE' && m.payload && m.payload.candidate) {
        if (remote) safe(pc.addIceCandidate(m.payload.candidate)); else early.push(m.payload.candidate);
      } else if (m.type === 'EXPIRE' || m.type === 'LEAVE') fail('There is no game with that code.');
    }).then(async (br) => {
      b = br;
      if (done) return b.close();
      const ch = pc.createDataChannel('hd', { ordered: true });
      pc.onicecandidate = (ev) => { if (ev.candidate) b.send('CANDIDATE', host, candOf(cid, ev.candidate)); };
      ch.onopen = () => { if (done) return; done = true; clearTimeout(timer); b.close(); resolve(channelLink(pc, ch)); };
      await pc.setLocalDescription(await pc.createOffer());
      b.send('OFFER', host, offerOf(cid, pc.localDescription));
    }, (e) => fail(e.message));
  });
})();

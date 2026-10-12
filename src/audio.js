// Sound: effects and ambient music, made in the browser with the Web Audio API, so the game ships no sound files and
// borrows no one's recordings. ui.js calls HD.audio.sfx(name) when something happens and HD.audio.mood(name) when the
// scene changes. This file also adds the Sound sheet (effects and music volume, mute). Browsers allow no sound before
// the player's first click or key press, and everything pauses while the page is hidden.
(function () {
  const HD = globalThis.HD;
  if (typeof window === 'undefined' || !HD.UI_OVERLAYS) return;
  const KEY = 'hollowdeep.sound';
  const DEFAULTS = { sfx: 0.7, music: 0.35, muted: false };
  const SAME_MS = 28; // the same sound this soon after the last one plays once (an all-enemy hit is one sound)
  const FADE_S = 2.5; // music fades between scenes over this long
  const AHEAD_S = 1.2; // music notes are scheduled this far ahead
  const TICK_MS = 250;
  const MUSIC_LEVEL = 0.6; // the music slider at full is this loud next to the effects

  const prefs = (() => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return Object.assign({}, DEFAULTS); } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* storage unavailable */ } };

  // ---------- the mixer ----------
  let ctx = null, master, sfxBus, musicBus, sfxEcho, musicEcho, noiseBuf;
  let level = 1; // quieter for other players' moves
  function boot() {
    if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {}); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = gainTo(comp);
    sfxBus = gainTo(master); musicBus = gainTo(master);
    // One shared echo, like a stone hall. Each bus feeds it through its own volume.
    const verb = ctx.createConvolver();
    verb.buffer = hall(2.6);
    const wet = gainTo(master, 0.32);
    verb.connect(wet);
    sfxEcho = gainTo(verb); musicEcho = gainTo(verb);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    levels();
    music.set(music.want, false);
    return ctx;
  }
  function gainTo(dest, v = 1) { const g = ctx.createGain(); g.gain.value = v; g.connect(dest); return g; }
  function hall(sec) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    return b;
  }
  // Volumes, eased so a change never clicks.
  function levels() {
    if (!ctx) return;
    const t = ctx.currentTime, m = prefs.music * MUSIC_LEVEL;
    master.gain.setTargetAtTime(prefs.muted ? 0 : 1, t, 0.05);
    sfxBus.gain.setTargetAtTime(prefs.sfx, t, 0.05); sfxEcho.gain.setTargetAtTime(prefs.sfx, t, 0.05);
    musicBus.gain.setTargetAtTime(m, t, 0.2); musicEcho.gain.setTargetAtTime(m, t, 0.2);
  }
  const live = () => ctx && ctx.state === 'running' && !prefs.muted;

  // ---------- two building blocks: a note and a burst of filtered noise ----------
  // o: f (Hz), to (Hz at the end), type, at (seconds from now), dur, vol, att (attack), echo (share sent to the
  // hall), music (on the music bus).
  function tone(o) {
    const t = ctx.currentTime + (o.at || 0), dur = o.dur || 0.2, att = o.att || 0.005;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    envelope(g.gain, t, att, dur, (o.vol || 0.1) * (o.music ? 1 : level));
    osc.connect(g); route(g, o);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  // o: filter (a BiquadFilter type), f, to, q, and the tone fields.
  function hiss(o) {
    const t = ctx.currentTime + (o.at || 0), dur = o.dur || 0.2;
    const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    flt.type = o.filter || 'bandpass'; flt.Q.value = o.q || 1;
    flt.frequency.setValueAtTime(o.f || 1000, t);
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    envelope(g.gain, t, o.att || 0.01, dur, (o.vol || 0.1) * (o.music ? 1 : level));
    src.connect(flt); flt.connect(g); route(g, o);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  function envelope(p, t, att, dur, vol) {
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + att);
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, att + 0.01));
  }
  function route(node, o) {
    node.connect(o.music ? musicBus : sfxBus);
    if (o.echo) { const s = gainTo(o.music ? musicEcho : sfxEcho, o.echo); node.connect(s); }
  }

  // ---------- effects ----------
  const notes = (fs, o) => fs.forEach((f, i) => tone(Object.assign({ f, at: i * (o.gap || 0.07) }, o)));
  const SFX = {
    attack: () => { hiss({ f: 2400, to: 500, q: 0.8, dur: 0.18, vol: 0.32 }); tone({ f: 300, to: 140, type: 'triangle', dur: 0.09, vol: 0.06 }); },
    skill: () => { hiss({ f: 900, to: 2600, q: 1.2, dur: 0.14, vol: 0.2 }); tone({ f: 660, dur: 0.12, vol: 0.05, type: 'triangle' }); },
    power: () => { tone({ f: 196, to: 392, dur: 0.6, vol: 0.12, att: 0.08, echo: 0.6 }); tone({ f: 294, to: 588, dur: 0.6, vol: 0.07, att: 0.08, echo: 0.6 }); hiss({ f: 400, to: 3000, dur: 0.5, vol: 0.06 }); },
    hit: (n) => {
      const k = Math.min(1, 0.45 + n / 30);
      tone({ f: 150, to: 50, dur: 0.2, vol: 0.5 * k }); hiss({ filter: 'lowpass', f: 1400, to: 250, dur: 0.14, vol: 0.32 * k });
      if (n >= 20) { tone({ f: 80, to: 32, dur: 0.45, vol: 0.4 }); hiss({ filter: 'lowpass', f: 600, to: 80, dur: 0.4, vol: 0.25, echo: 0.4 }); }
    },
    hurt: () => { tone({ f: 110, to: 40, dur: 0.3, vol: 0.5 }); hiss({ filter: 'lowpass', f: 700, to: 120, dur: 0.24, vol: 0.32 }); tone({ f: 73, type: 'square', dur: 0.12, vol: 0.05 }); },
    zero: () => tone({ f: 1760, dur: 0.09, vol: 0.06, type: 'triangle' }),
    block: () => { tone({ f: 784, dur: 0.3, vol: 0.1, type: 'triangle', echo: 0.3 }); tone({ f: 1187, dur: 0.24, vol: 0.06 }); tone({ f: 2093, dur: 0.12, vol: 0.04 }); hiss({ filter: 'highpass', f: 3500, dur: 0.06, vol: 0.14 }); },
    guard: () => { hiss({ f: 350, to: 1600, q: 1.5, dur: 0.24, vol: 0.14 }); tone({ f: 392, to: 523, dur: 0.22, vol: 0.06, type: 'triangle' }); },
    heal: () => notes([523, 659, 784], { dur: 0.45, vol: 0.06, echo: 0.5 }),
    kill: () => { hiss({ filter: 'lowpass', f: 2400, to: 120, dur: 0.7, vol: 0.24, echo: 0.4 }); tone({ f: 220, to: 50, dur: 0.7, vol: 0.18 }); },
    potion: () => { for (let i = 0; i < 4; i++) tone({ f: 260 + i * 70, to: 420 + i * 90, at: i * 0.06, dur: 0.08, vol: 0.09 }); hiss({ f: 900, dur: 0.25, vol: 0.04 }); },
    coin: () => { tone({ f: 1568, dur: 0.12, vol: 0.08, type: 'triangle' }); tone({ f: 2093, at: 0.07, dur: 0.28, vol: 0.08, type: 'triangle', echo: 0.3 }); },
    card: () => { hiss({ f: 3000, q: 2, dur: 0.07, vol: 0.1 }); tone({ f: 784, at: 0.03, dur: 0.14, vol: 0.06, type: 'triangle' }); },
    relic: () => notes([1047, 1319, 1568, 2093, 2637], { gap: 0.05, dur: 0.35, vol: 0.045, echo: 0.6 }),
    upgrade: () => { tone({ f: 523, to: 1047, dur: 0.45, vol: 0.07, att: 0.03, echo: 0.5 }); tone({ f: 784, to: 1568, dur: 0.45, vol: 0.05, att: 0.03, echo: 0.5 }); },
    remove: () => hiss({ f: 1800, to: 200, dur: 0.35, vol: 0.12 }),
    maxhp: () => notes([392, 523, 659], { gap: 0.08, dur: 0.5, vol: 0.06, type: 'triangle', echo: 0.5 }),
    click: () => tone({ f: 880, dur: 0.035, vol: 0.035, type: 'triangle' }),
    node: () => { tone({ f: 330, dur: 0.14, vol: 0.07, type: 'triangle' }); tone({ f: 494, at: 0.06, dur: 0.18, vol: 0.06, type: 'triangle', echo: 0.3 }); },
    end: () => { tone({ f: 440, dur: 0.8, vol: 0.07, echo: 0.5 }); tone({ f: 881, dur: 0.6, vol: 0.03, echo: 0.5 }); },
    battle: () => { tone({ f: 95, to: 38, dur: 0.55, vol: 0.5, echo: 0.4 }); hiss({ filter: 'lowpass', f: 500, to: 80, dur: 0.35, vol: 0.25 }); tone({ f: 80, to: 34, at: 0.2, dur: 0.6, vol: 0.4, echo: 0.4 }); },
    boss: () => { SFX.battle(); tone({ f: 55, type: 'sawtooth', dur: 1.6, vol: 0.05, att: 0.2, echo: 0.6 }); tone({ f: 58.3, type: 'sawtooth', dur: 1.6, vol: 0.04, att: 0.2, echo: 0.6 }); },
    win: () => notes([440, 554, 659, 880], { gap: 0.11, dur: 0.6, vol: 0.08, type: 'triangle', echo: 0.6 }),
    lose: () => notes([440, 349, 294, 220], { gap: 0.28, dur: 0.8, vol: 0.08, echo: 0.6 }),
    tick: (n) => tone({ f: 900 + n * 35, dur: 0.04, vol: 0.05, type: 'triangle' }),
    land: () => notes([659, 784, 1047], { gap: 0.08, dur: 0.5, vol: 0.07, type: 'triangle', echo: 0.5 }),
    chat: () => notes([988, 1319], { gap: 0.06, dur: 0.16, vol: 0.05, type: 'triangle' }),
    stars: () => notes([1568, 2349], { gap: 0.05, dur: 0.25, vol: 0.05, echo: 0.4 }),
    forge: () => { tone({ f: 620, type: 'square', dur: 0.08, vol: 0.05 }); tone({ f: 1240, dur: 0.3, vol: 0.06, echo: 0.4 }); tone({ f: 1860, dur: 0.2, vol: 0.03 }); hiss({ filter: 'highpass', f: 2500, dur: 0.08, vol: 0.12 }); },
  };
  const last = {};
  // name: one of SFX; n: an amount (damage, a step); scale: quieter for other players' moves.
  function sfx(name, n = 0, scale = 1) {
    if (prefs.muted || !prefs.sfx || !SFX[name] || !boot() || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (last[name] || 0) < SAME_MS) return;
    last[name] = now;
    level = scale;
    try { SFX[name](n); } finally { level = 1; }
  }

  // ---------- music: slow ambience made as it plays ----------
  // Each scene has a low drone with wind, soft chords now and then, and a few bell notes from its scale. Fights are
  // lower and darker with a heartbeat; bosses heavier still. Notes are MIDI numbers from the root.
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MOODS = {
    title: { root: 45, scale: [0, 3, 5, 7, 10], chord: [9, 13], bell: [4, 9], beat: 0, drone: [45, 52], wind: 0.02, cut: 900 },
    calm: { root: 45, scale: [0, 2, 3, 5, 7, 8, 10], chord: [7, 11], bell: [3, 7], beat: 0, drone: [45, 57], wind: 0.025, cut: 1100 },
    fight: { root: 40, scale: [0, 1, 3, 5, 7, 8, 10], chord: [6, 9], bell: [2.5, 5], beat: 1.7, drone: [28, 35], wind: 0.035, cut: 700 },
    boss: { root: 38, scale: [0, 1, 3, 6, 7, 8, 11], chord: [5, 8], bell: [2, 4], beat: 1.25, drone: [26, 33, 38], wind: 0.045, cut: 600 },
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
  const music = {
    want: 'title', mood: null, layer: null, next: {},
    // A scene's bed: the drone through a slowly moving filter, and wind. Fades in; the old one fades out.
    set(name, sting = true) {
      this.want = name;
      if (!ctx || name === this.mood || !MOODS[name]) return;
      const was = this.mood;
      this.mood = name;
      if (sting && was && (name === 'fight' || name === 'boss') && was !== 'fight' && was !== 'boss') sfx(name === 'boss' ? 'boss' : 'battle');
      const m = MOODS[name], t = ctx.currentTime;
      if (this.layer) { const old = this.layer; old.gain.gain.setTargetAtTime(0.0001, t, FADE_S / 3); setTimeout(() => old.stop(), FADE_S * 1500); }
      const out = gainTo(musicBus, 0.0001);
      const send = gainTo(musicEcho, 0.5); out.connect(send);
      out.gain.setTargetAtTime(1, t, FADE_S / 3);
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = m.cut; flt.Q.value = 0.7; flt.connect(out);
      const srcs = [];
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 0.05; depth.gain.value = m.cut * 0.35; lfo.connect(depth); depth.connect(flt.frequency); srcs.push(lfo);
      for (const note of m.drone) for (const [type, cents, v] of [['triangle', -6, 0.05], ['sine', 7, 0.06]]) {
        const o = ctx.createOscillator(), g = gainTo(flt, v);
        o.type = type; o.frequency.value = hz(note); o.detune.value = cents; o.connect(g); srcs.push(o);
      }
      const wind = ctx.createBufferSource(), wf = ctx.createBiquadFilter(), wg = gainTo(out, m.wind), wl = ctx.createOscillator(), wd = ctx.createGain();
      wind.buffer = noiseBuf; wind.loop = true; wf.type = 'bandpass'; wf.frequency.value = 450; wf.Q.value = 0.6;
      wl.frequency.value = 0.07; wd.gain.value = 250; wl.connect(wd); wd.connect(wf.frequency);
      wind.connect(wf); wf.connect(wg); srcs.push(wind, wl);
      for (const s of srcs) s.start(t);
      this.layer = { gain: out, stop: () => { for (const s of srcs) { try { s.stop(); } catch (e) { /* already stopped */ } } out.disconnect(); } };
      const now = ctx.currentTime;
      this.next = { chord: now + 1, bell: now + rand(1.5, 3), beat: now + 0.5 };
    },
    // Notes for the next AHEAD_S seconds: chords, bells and (in fights) a heartbeat.
    tick() {
      if (!live() || !this.mood || !prefs.music) return;
      const m = MOODS[this.mood], now = ctx.currentTime, end = now + AHEAD_S, nx = this.next;
      while (nx.chord < end) {
        const deg = Math.floor(Math.random() * m.scale.length);
        const chord = [0, 2, 4].map((k) => m.root + 12 + m.scale[(deg + k) % m.scale.length] + (deg + k >= m.scale.length ? 12 : 0));
        for (const n of chord) tone({ f: hz(n), type: 'triangle', at: nx.chord - now, att: 1.5, dur: m.chord[0] + 2, vol: 0.03, echo: 0.7, music: true });
        nx.chord += rand(m.chord[0], m.chord[1]);
      }
      while (nx.bell < end) {
        tone({ f: hz(m.root + 24 + pick(m.scale) + (Math.random() < 0.3 ? 12 : 0)), at: nx.bell - now, att: 0.01, dur: 2.6, vol: 0.028, echo: 0.8, music: true });
        nx.bell += rand(m.bell[0], m.bell[1]);
      }
      while (m.beat && nx.beat < end) {
        tone({ f: 62, to: 40, at: nx.beat - now, dur: 0.25, vol: 0.12, music: true });
        tone({ f: 55, to: 38, at: nx.beat - now + 0.22, dur: 0.22, vol: 0.07, music: true });
        nx.beat += m.beat;
      }
    },
  };
  setInterval(() => music.tick(), TICK_MS);
  // Sound starts with the first click or key press, and rests while the page is hidden.
  const wake = () => boot();
  document.addEventListener('pointerdown', wake, true);
  document.addEventListener('keydown', wake, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else { ctx.resume().catch(() => {}); if (music.next.chord) { const t = ctx.currentTime; music.next = { chord: t + 0.5, bell: t + 1, beat: t + 0.3 }; } }
  });

  // ---------- the Sound sheet ----------
  const SPEAKER = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor"/><path d="M13 7a4 4 0 0 1 0 6M15.2 4.8a7 7 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const MUTED = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor"/><path d="M13 7.5l5 5M18 7.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const slider = (key, label) => `<label class="vol"><span>${label}</span><input type="range" min="0" max="100" step="5" value="${Math.round(prefs[key] * 100)}" data-vol="${key}" aria-label="${label} volume"><b>${Math.round(prefs[key] * 100)}</b></label>`;
  HD.UI_OVERLAYS.sound = () => `<div class="overlay" data-key="ov-sound" role="dialog" aria-modal="true" aria-label="Sound"><div class="sheet small">
      <div class="shead"><h2>Sound</h2><button class="ghost" data-act="close">Close</button></div>
      ${slider('sfx', 'Effects')}${slider('music', 'Music')}
      <div class="choices"><button class="ghost" data-act="sound-mute" aria-pressed="${prefs.muted}">${prefs.muted ? 'Turn sound back on' : 'Mute everything'}</button></div>
      <p class="fine">The sounds and music are made in your browser as you play.</p>
    </div></div>`;
  Object.assign(HD.UI_ACTS, {
    sound: () => { HD.uiApi.S.overlay = { kind: 'sound', title: 'Sound' }; HD.uiApi.render(); },
    'sound-mute': () => { prefs.muted = !prefs.muted; save(); levels(); if (!prefs.muted) sfx('click'); HD.uiApi.render(); },
  });
  document.addEventListener('input', (e) => {
    const key = e.target && e.target.dataset && e.target.dataset.vol;
    if (!key || !(key in DEFAULTS)) return;
    prefs[key] = Math.max(0, Math.min(1, +e.target.value / 100));
    if (prefs[key] > 0) prefs.muted = false;
    save(); levels();
    const num = e.target.parentElement.querySelector('b'); if (num) num.textContent = e.target.value;
    if (key === 'sfx') sfx('click');
  });

  HD.audio = {
    sfx,
    mood: (name) => music.set(name),
    // The top bar's sound button.
    button: () => `<button class="ghost soundbtn" data-act="sound" title="Sound" aria-label="Sound settings${prefs.muted ? ' (muted)' : ''}">${prefs.muted ? MUTED : SPEAKER}</button>`,
  };
})();

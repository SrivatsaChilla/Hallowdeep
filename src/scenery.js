// Scenery: a faint silhouette of each act behind every screen (the Rootworks, the Waxen Hive, the Gilded Court) and a
// stair into the dark on the title. Drawn once at load from a seeded generator, so every device sees the same shapes.
// Colors come from style.css (#scene): each layer mixes the page background with the act's tint, in either theme.
(function () {
  const HD = globalThis.HD;
  if (typeof document === 'undefined') return;
  const W = 1600, H = 900;
  const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const f = (n) => Math.round(n);
  const path = (cls, d, extra = '') => `<path class="${cls}" d="${d}"${extra}/>`;

  // A wavy band along the top (y from 0 to about `depth`) or the bottom edge.
  function band(r, edge, depth, step, wobble) {
    let d = edge === 'top' ? `M0 0H${W}V${f(depth)}` : `M0 ${H}H${W}V${f(H - depth)}`;
    for (let x = W - step; x >= 0; x -= step) d += `L${f(x)} ${f(edge === 'top' ? depth + (r() - 0.5) * wobble : H - depth + (r() - 0.5) * wobble)}`;
    return d + 'Z';
  }
  // A tapered tendril hanging from y0 (roots, wax drips): wide at the top, a point or a round drop at the end.
  function tendril(x, y0, len, w, sway, drop) {
    const tx = x + sway, ty = y0 + len;
    if (drop) return `M${f(x - w / 2)} ${f(y0)}Q${f(x - w / 2)} ${f(ty - w)} ${f(tx - w / 2)} ${f(ty)}A${f(w / 2)} ${f(w / 2)} 0 0 0 ${f(tx + w / 2)} ${f(ty)}Q${f(x + w / 2)} ${f(ty - w)} ${f(x + w / 2)} ${f(y0)}Z`;
    return `M${f(x - w / 2)} ${f(y0)}Q${f(x + sway * 0.3 - w / 3)} ${f(y0 + len * 0.6)} ${f(tx)} ${f(ty)}Q${f(x + sway * 0.3 + w / 3)} ${f(y0 + len * 0.6)} ${f(x + w / 2)} ${f(y0)}Z`;
  }
  // A thick arch rising from the floor (a root bridge).
  function arch(cx, span, height, th) {
    const a = cx - span / 2, b = cx + span / 2, k = 1.33;
    return `M${f(a)} ${H}C${f(a)} ${f(H - height * k)} ${f(b)} ${f(H - height * k)} ${f(b)} ${H}H${f(b - th)}C${f(b - th)} ${f(H - (height - th) * k)} ${f(a + th)} ${f(H - (height - th) * k)} ${f(a + th)} ${H}Z`;
  }
  const hex = (cx, cy, s) => Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 3 * i + Math.PI / 6; return `${i ? 'L' : 'M'}${f(cx + s * Math.cos(t))} ${f(cy + s * Math.sin(t))}`; }).join('') + 'Z';

  function rootworks() {
    const r = rng(11);
    // Each group is its own path: shapes that overlap inside one path can cancel into holes.
    const ceiling = band(r, 'top', 70, 64, 40), ground = band(r, 'bottom', 40, 80, 30);
    let far = '', mid = '', near = '', line = '';
    for (let i = 0; i < 26; i++) { const x = 30 + i * 60 + (r() - 0.5) * 40; far += tendril(x, 40, 60 + r() * 260, 8 + r() * 14, (r() - 0.5) * 60, false); }
    for (const [cx, span, h, th] of [[300, 620, 520, 46], [1250, 700, 560, 52], [780, 460, 330, 34]]) mid += arch(cx, span, h, th);
    for (let i = 0; i < 9; i++) { const x = 60 + i * 190 + (r() - 0.5) * 80; mid += tendril(x, 0, 120 + r() * 200, 16 + r() * 14, (r() - 0.5) * 80, false); }
    for (const x of [90, 190, 1380, 1500, 1260]) {
      const s = 0.6 + r() * 0.8, y = H - 38;
      near += `M${f(x - 7 * s)} ${f(y)}V${f(y - 38 * s)}H${f(x + 7 * s)}V${f(y)}Z`; // stem, up to the cap
      near += `M${f(x - 42 * s)} ${f(y - 38 * s)}Q${f(x)} ${f(y - 110 * s)} ${f(x + 42 * s)} ${f(y - 38 * s)}Z`; // cap
    }
    for (let i = 0; i < 7; i++) { const y = 120 + r() * 380; line += `M0 ${f(y)}Q${f(400 + r() * 300)} ${f(y + (r() - 0.5) * 200)} ${f(800 + r() * 200)} ${f(y + (r() - 0.5) * 120)}`; }
    return [path('s-far', ceiling), path('s-far', far), path('s-line', line), path('s-mid', mid), path('s-near', ground), path('s-near', near)];
  }
  function hive() {
    const r = rng(23);
    const ceiling = band(r, 'top', 46, 50, 24), floor = band(r, 'bottom', 46, 70, 26);
    let comb = '', capped = '', drips = '', mounds = '', mouth = '';
    const s = 46, dx = s * Math.sqrt(3), dy = s * 1.5;
    for (let row = 0; row < 7; row++) for (let col = -1; col < W / dx + 1; col++) {
      const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = 70 + row * dy;
      comb += hex(cx, cy, s - 4);
      if (r() < 0.22) capped += hex(cx, cy, s - 10);
    }
    for (let i = 0; i < 30; i++) { const x = 20 + i * 54 + (r() - 0.5) * 30; drips += tendril(x, 30, 30 + r() * 150, 10 + r() * 12, 0, true); }
    for (const [cx, w, h] of [[180, 280, 330], [1430, 300, 360], [560, 180, 190], [1060, 200, 210]]) mounds += `M${f(cx - w / 2)} ${H}Q${f(cx - w / 2)} ${f(H - h)} ${f(cx)} ${f(H - h)}Q${f(cx + w / 2)} ${f(H - h)} ${f(cx + w / 2)} ${H}Z`;
    mouth = `M${W / 2 - 120} ${H - 40}Q${W / 2 - 120} ${H - 260} ${W / 2} ${H - 270}Q${W / 2 + 120} ${H - 260} ${W / 2 + 120} ${H - 40}Z`;
    return [path('s-line', comb), path('s-far', capped), path('s-far', mouth), path('s-mid', ceiling), path('s-mid', drips), path('s-near', floor), path('s-near', mounds)];
  }
  function court() {
    const r = rng(37);
    let sky = `M0 ${H}V560`, colon = '', floor = band(r, 'bottom', 54, 400, 4), gild = '';
    // A skyline of spires, the great dome in the middle.
    for (let x = 0; x <= W; x += 80 + r() * 60) {
      const h = 120 + r() * 220, w = 26 + r() * 30;
      sky += `L${f(x)} 560L${f(x)} ${f(560 - h * 0.5)}L${f(x + w / 2)} ${f(560 - h)}L${f(x + w)} ${f(560 - h * 0.5)}L${f(x + w)} 560`;
    }
    sky += `L${W} 560V${H}Z`;
    const dome = `M${W / 2 - 230} 560A230 230 0 0 1 ${W / 2 + 230} 560ZM${W / 2 - 14} 330V240L${W / 2} 200L${W / 2 + 14} 240V330Z`;
    gild += `M${W / 2 - 120} 365L${W / 2 - 60} 430L${W / 2 - 90} 500M${W / 2 + 60} 352L${W / 2 + 20} 420L${W / 2 + 70} 470M${W / 2 - 230} 560H${W / 2 + 230}`;
    // A colonnade: a wall with round-topped openings.
    colon = `M0 ${H}V600H${W}V${H}Z`;
    for (let x = 30; x < W; x += 180) colon += `M${x} ${H - 54}V700A70 70 0 0 1 ${x + 140} 700V${H - 54}Z`;
    for (let x = 30; x < W; x += 180) gild += `M${x - 8} 610H${x + 148}`;
    return [path('s-far', sky), path('s-far', dome), path('s-gild', gild), path('s-mid', colon, ' fill-rule="evenodd"'), path('s-near', floor)];
  }
  function descent() {
    let steps = '', frame = `M0 0H${W}V${H}H0ZM${W / 2 - 360} ${H}V340Q${W / 2 - 360} 120 ${W / 2} 60Q${W / 2 + 360} 120 ${W / 2 + 360} 340V${H}Z`;
    for (let i = 0; i < 10; i++) {
      const t = i / 10, y = H - i * 38, hw = 330 - t * 250, h = 38 - t * 18;
      steps += `M${f(W / 2 - hw)} ${f(y)}L${f(W / 2 - hw * 0.94)} ${f(y - h)}H${f(W / 2 + hw * 0.94)}L${f(W / 2 + hw)} ${f(y)}Z`;
    }
    return [path('s-mid', frame, ' fill-rule="evenodd"'), path('s-far', steps)];
  }

  const SCENES = { title: descent, 1: rootworks, 2: hive, 3: court };
  HD.SCENERY = SCENES;
  const box = document.getElementById('scene');
  if (box) box.innerHTML = Object.entries(SCENES).map(([k, draw]) => `<svg data-scene="${k}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${draw().join('')}</svg>`).join('');
})();

// Enemy art kit. Each enemy is a small original drawing in a 100x100 box: flat colors with ink outlines, facing left
// toward the player, feet on a ground shadow at y 93. foes1-3.js fill HD.FOE_ART (one entry per monster id); an id
// with no drawing falls back to the abstract sigil in ui.js.
(function () {
  const HD = globalThis.HD;
  const INK = '#1a0f0a';
  const st = (w = 2.6) => ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const K = {
    INK,
    st,
    p: (d, fill, w = 2.6) => `<path d="${d}" fill="${fill}"${st(w)}/>`,
    c: (x, y, r, fill, w = 2.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"${st(w)}/>`,
    el: (x, y, rx, ry, fill, w = 2.4) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"${st(w)}/>`,
    line: (d, w = 2.4, color = INK) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
    // Shading and shine, drawn without outlines on top of a filled shape.
    shade: (d, o = 0.2) => `<path d="${d}" fill="#000" opacity="${o}"/>`,
    tint: (d, fill, o = 1) => `<path d="${d}" fill="${fill}" opacity="${o}"/>`,
    // A faint light edge behind a dark body, so it still reads on the dark theme.
    rim: (d, color = '#c8b8e0', o = 0.4, w = 6) => `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${o}" stroke-width="${w}" stroke-linejoin="round"/>`,
    hi: (d, o = 0.5, w = 2) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`,
    ground: (rx = 30, cx = 50) => `<ellipse cx="${cx}" cy="93" rx="${rx}" ry="${(rx * 0.13).toFixed(1)}" fill="#000" opacity=".22"/>`,
    // An eye looking left, toward the player.
    eye: (x, y, r = 4, iris = INK) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff6e0"${st(1.6)}/><circle cx="${(x - r * 0.28).toFixed(1)}" cy="${y}" r="${(r * 0.52).toFixed(1)}" fill="${iris}"/><circle cx="${(x - r * 0.5).toFixed(1)}" cy="${(y - r * 0.3).toFixed(1)}" r="${(r * 0.18).toFixed(1)}" fill="#fff"/>`,
    // A glowing eye or light: a soft halo and a bright core.
    glow: (x, y, r, color, core = '#fffbe0') => `<circle cx="${x}" cy="${y}" r="${(r * 2).toFixed(1)}" fill="${color}" opacity=".28"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x}" cy="${y}" r="${(r * 0.45).toFixed(1)}" fill="${core}"/>`,
    // A row of n teeth between x1 and x2 at y, pointing down (h > 0) or up (h < 0).
    teeth: (x1, x2, y, n, h, fill = '#fbf3dc') => {
      const w = (x2 - x1) / n;
      let d = `M${x1} ${y}`;
      for (let i = 0; i < n; i++) d += ` L${(x1 + w * (i + 0.5)).toFixed(1)} ${y + h} L${(x1 + w * (i + 1)).toFixed(1)} ${y}`;
      return `<path d="${d}z" fill="${fill}"${st(1.4)}/>`;
    },
    // Wrap a drawing: move, scale or flip it around the ground point (50, 93).
    g: (inner, t) => `<g transform="${t}">${inner}</g>`,
    small: (inner, s) => `<g transform="translate(50 93) scale(${s}) translate(-50 -93)">${inner}</g>`,
  };
  HD.FOE_KIT = K;
  HD.FOE_ART = {};
})();

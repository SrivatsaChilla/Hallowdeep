// Character sigils and map node icons. Sigils are layered emblems (100x100) with their own gradients; map icons are
// drawn in currentColor with cut-out details (even-odd holes), so they follow every node state's color.
(function () {
  const HD = globalThis.HD;
  const INK = '#1a0f0a';
  const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const rg = (id, stops, cx = 0.5, cy = 0.5, r = 0.6) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  const shine = (d, w = 2.2, o = 0.4) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;

  // ---------- character sigils ----------
  HD.SIGILS = {
    // a riveted heater shield with a burning oath-flame
    OATHBURNER: `<defs>${lg('ob-rim', [[0, '#f6dd8f'], [0.55, '#c08a2c'], [1, '#7a4c12']])}${lg('ob-field', [[0, '#6e2016'], [1, '#2a0b09']])}${rg('ob-fl', [[0, '#fff4b8'], [0.45, '#ffb347'], [1, '#c92f17']], 0.5, 0.78, 0.75)}</defs>
      <path d="M50 4 90 17v31c0 25-17 41-40 48C27 89 10 73 10 48V17z" fill="url(#ob-rim)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M50 13 81 23v25c0 19-13 33-31 39C32 81 19 67 19 48V23z" fill="url(#ob-field)" stroke="#2a1206" stroke-width="1.5"/>
      <path d="M50 22c10 10 16 19 14 31-1 10-6 16-14 19-8-3-13-9-14-19-1-7 2-12 6-15 0 5 2 9 5 10-2-10 0-18 3-26z" fill="url(#ob-fl)" stroke="#3a0d06" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M50 44c4 5 6 9 5 13-1 5-3 7-5 8-2-1-4-3-5-8 0-4 2-7 5-13z" fill="#fff6c8"/>
      ${[[50, 8.6], [84, 20], [16, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#5a3a10"/>`).join('')}
      ${shine('M22 26 50 17', 2.2, 0.45)}`,
    // a pointed hood over a shadowed face, two glinting eyes and a dagger
    VEILED: `<defs>${lg('vl-hood', [[0, '#3f6b4c'], [1, '#14231a']])}${lg('vl-steel', [[0, '#f4f6f0'], [1, '#8a958c']], 1, 0)}${rg('vl-eye', [[0, '#eaffd8'], [1, '#7fd08a']])}</defs>
      <path d="M50 4C70 13 82 32 83 53c1 16-4 30-10 39H27c-6-9-11-23-10-39C18 32 30 13 50 4z" fill="url(#vl-hood)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M50 22c12 6 18 18 18 31 0 9-3 16-6 21H38c-3-5-6-12-6-21 0-13 6-25 18-31z" fill="#0a110c"/>
      <path d="M36 50l10 2-10 3z" fill="url(#vl-eye)"/><path d="M64 50l-10 2 10 3z" fill="url(#vl-eye)"/>
      <path d="M37 60h26l-4 12H41z" fill="#24402f" stroke="#0a110c" stroke-width="1.2"/>
      <g transform="translate(70 74) rotate(36)"><path d="M0-21 3.4-15V5H-3.4V-15z" fill="url(#vl-steel)" stroke="${INK}" stroke-width="1.4"/><path d="M0-17V3" stroke="#6c766e" stroke-width="1"/>
        <rect x="-7" y="5" width="14" height="3.4" rx="1.2" fill="#7a5530" stroke="${INK}" stroke-width="1.2"/><rect x="-1.8" y="8.4" width="3.6" height="8" rx="1" fill="#3a2a1a"/></g>
      ${shine('M50 9C63 16 73 30 77 46', 2, 0.35)}`,
    // a jeweled crown with a star above the center point
    CROWNED: `<defs>${lg('cr-gold', [[0, '#fff0a8'], [0.5, '#e0a93a'], [1, '#8a5a12']])}${lg('cr-band', [[0, '#d39a2e'], [1, '#6e4510']])}${rg('cr-red', [[0, '#ffb3a8'], [1, '#b0182a']], 0.35, 0.35)}${rg('cr-blue', [[0, '#b8e0ff'], [1, '#1f5fa8']], 0.35, 0.35)}${rg('cr-star', [[0, '#fffbe0'], [1, '#f2c94c']])}</defs>
      <path d="M50 3.5l2.4 5 5.5.6-4.1 3.7 1.2 5.4L50 15.4l-5 2.8 1.2-5.4-4.1-3.7 5.5-.6z" fill="url(#cr-star)" stroke="#6e4510" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M13 72 17 31 34 51 50 21 66 51 83 31 87 72z" fill="url(#cr-gold)" stroke="#4a3208" stroke-width="3" stroke-linejoin="round"/>
      <path d="M22 67 23 43 35 57 50 34 65 57 77 43 78 67z" fill="#000" opacity=".13"/>
      ${[[17, 31], [83, 31], [50, 21]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="url(#cr-gold)" stroke="#4a3208" stroke-width="1.6"/>`).join('')}
      <rect x="12" y="69" width="76" height="17" rx="3.5" fill="url(#cr-band)" stroke="#4a3208" stroke-width="3"/>
      <circle cx="31" cy="77.5" r="4.6" fill="url(#cr-red)" stroke="#4a3208" stroke-width="1.4"/><circle cx="50" cy="77.5" r="5.4" fill="url(#cr-blue)" stroke="#4a3208" stroke-width="1.4"/><circle cx="69" cy="77.5" r="4.6" fill="url(#cr-red)" stroke="#4a3208" stroke-width="1.4"/>
      ${shine('M19 66 21 38', 1.8, 0.5)}${shine('M16 73h68', 1.4, 0.35)}`,
    // a hooded skull with violet light in its sockets
    UNBURIED: `<defs>${lg('nb-hood', [[0, '#4a3a5e'], [1, '#17111f']])}${lg('nb-bone', [[0, '#f3eee4'], [1, '#b7ad9c']])}${rg('nb-glow', [[0, '#f2e6ff'], [0.5, '#b48cf0'], [1, 'rgba(120,80,200,0)']])}</defs>
      <path d="M50 3C73 7 89 27 89 52c0 18-6 32-12 41H23c-6-9-12-23-12-41C11 27 27 7 50 3z" fill="url(#nb-hood)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M50 19c16 0 26 11 26 26 0 9-4 16-9 20v10H33V65c-5-4-9-11-9-20 0-15 10-26 26-26z" fill="url(#nb-bone)" stroke="#2a2233" stroke-width="2.2"/>
      <path d="M31 44c0-5 4-8 9-7 5 1 6 5 5 9-1 4-4 6-8 6-4 0-6-3-6-8zM69 44c0-5-4-8-9-7-5 1-6 5-5 9 1 4 4 6 8 6 4 0 6-3 6-8z" fill="#170f20"/>
      <circle cx="38.5" cy="45" r="6" fill="url(#nb-glow)"/><circle cx="61.5" cy="45" r="6" fill="url(#nb-glow)"/>
      <path d="M50 52l-3.4 6.5h6.8z" fill="#170f20"/>
      <rect x="37" y="65" width="26" height="9" rx="1.5" fill="#e6dfd2" stroke="#2a2233" stroke-width="1.6"/>
      <path d="M43.5 65v9M50 65v9M56.5 65v9" stroke="#2a2233" stroke-width="1.4"/>
      <path d="M58 21l-3 8 4 5-2 6" fill="none" stroke="#2a2233" stroke-width="1.5" stroke-linejoin="round"/>
      ${shine('M50 8C66 11 79 23 84 40', 2, 0.25)}`,
    // a geared automaton head with one lit lens
    WIREBOUND: `<defs>${lg('wb-steel', [[0, '#e8eef4'], [0.5, '#8fa3b5'], [1, '#3f4d5a']], 1, 1)}${lg('wb-plate', [[0, '#2b3f52'], [1, '#121c26']])}${rg('wb-lens', [[0, '#ffffff'], [0.35, '#bfeaff'], [0.8, '#3aa0e0'], [1, '#14507a']])}</defs>
      <path d="M44 4h12l2 10 8 3 8-6 8 8-6 8 3 8 10 2v12l-10 2-3 8 6 8-8 8-8-6-8 3-2 10H44l-2-10-8-3-8 6-8-8 6-8-3-8-10-2V44l10-2 3-8-6-8 8-8 8 6 8-3z" fill="url(#wb-steel)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="27" fill="url(#wb-plate)" stroke="#0b1218" stroke-width="2.4"/>
      <circle cx="50" cy="50" r="15" fill="#0b1218"/><circle cx="50" cy="50" r="12" fill="url(#wb-lens)"/>
      <circle cx="50" cy="50" r="4.6" fill="#0d2a40"/><circle cx="45.5" cy="45.5" r="2.4" fill="#fff" opacity=".85"/>
      ${[[31, 31], [69, 31], [31, 69], [69, 69]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#9fb4c6" stroke="#0b1218" stroke-width="1"/>`).join('')}
      ${shine('M30 34C34 28 41 24 48 23', 2, 0.4)}`,
  };

  // ---------- map node icons (about -12..12; the boss icon is larger) ----------
  const sword = (rot) => `<g transform="rotate(${rot})"><path d="M0-11.5 1.9-8.6V2.6H-1.9V-8.6z"/><rect x="-5" y="2.6" width="10" height="2.2" rx=".8"/><rect x="-1" y="4.8" width="2" height="4"/><circle cy="10.2" r="1.7"/></g>`;
  HD.NODE_ICONS = {
    monster: `<g fill="currentColor" transform="scale(1.15)">${sword(42)}${sword(-42)}</g>`,
    elite: '<path fill="currentColor" fill-rule="evenodd" d="M-10.5-11c1 4.5 3 7 5.5 8.2C-3.4-4.6-1.8-5 0-5s3.4.4 5 2.2c2.5-1.2 4.5-3.7 5.5-8.2 1.5 5.2.7 9.6-2.2 12.4.5 1 .7 2 .7 3.1 0 3-1.6 4.6-3.5 5.6V12h-11V10.1C-7.4 9.1-9 7.5-9 4.5c0-1.1.2-2.1.7-3.1-2.9-2.8-3.7-7.2-2.2-12.4zM-4.6 1.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8zM4.6 1.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8zM0 6.8 1.4 9.2H-1.4z"/>',
    rest: '<g fill="currentColor"><path fill-rule="evenodd" d="M0-11.5c3.6 4.2 6.2 7.6 5.6 11.8C5.1 3.6 2.8 5.6 0 6.2c-2.8-.6-5.1-2.6-5.6-5.9-.4-2.8.8-4.9 2.4-6.4.1 2 .9 3.4 2.2 3.9-.7-3.9.2-6.6 1-9.3zM0-2.2c1.4 1.8 2.2 3.4 1.9 4.9C1.7 3.8 1 4.5 0 4.8c-1-.3-1.7-1-1.9-2.1-.3-1.5.5-3.1 1.9-4.9z"/><rect x="-10" y="6.6" width="20" height="2.6" rx="1.3" transform="rotate(14)"/><rect x="-10" y="6.6" width="20" height="2.6" rx="1.3" transform="rotate(-14)"/></g>',
    shop: '<path fill="currentColor" fill-rule="evenodd" d="M-4.2-11h8.4l-2.2 3.8c5.4 1.8 9 6.6 9 12.2 0 4.4-3.8 6.5-11 6.5S-11 9.4-11 5c0-5.6 3.6-10.4 9-12.2zM-3.4-7h6.8v1.3h-6.8zM0-1.6a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 1 0 0-8.4zM0 .2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 1 1 0-4.8z"/>',
    treasure: '<path fill="currentColor" fill-rule="evenodd" d="M-10.5-1.5V-4C-10.5-8.5-6.6-10.5 0-10.5S10.5-8.5 10.5-4v2.5zM-10.5.5h21V9.5c0 1-.8 1.5-1.5 1.5h-18c-.7 0-1.5-.5-1.5-1.5zM-6.8-9V-1.5h1.6V-9.6zM5.2-9.6V-1.5h1.6V-9zM-1.9 1.6h3.8v4.6l-1.9 1.6-1.9-1.6z"/>',
    unknown: '<path fill="currentColor" d="M-6.6-4.6C-6.6-9-3.6-11.5.4-11.5c4.2 0 6.9 2.4 6.9 6 0 2.8-1.5 4.3-3.6 5.6-1.6 1-2 1.7-2 3.3v.9h-4V3.2c0-2.6.9-3.9 3-5.2 1.7-1.1 2.4-1.8 2.4-3.1 0-1.4-1.1-2.4-2.8-2.4-1.9 0-3 1.1-3.2 2.9zM-2.3 7.2h4.1v4.3h-4.1z"/>',
    boss: '<path fill="currentColor" fill-rule="evenodd" d="M-14-14c.6 6.4 3 10.4 6.6 12.4C-5.4-3.5-2.8-4.3 0-4.3s5.4.8 7.4 2.7C11-3.6 13.4-7.6 14-14c2.4 7.3 1.2 13.4-2.7 17 .5 1.1.7 2.3.7 3.6 0 4-2.1 6.4-4.9 7.8V17H-7.1v-2.6C-9.9 13-12 10.6-12 6.6c0-1.3.2-2.5.7-3.6-3.9-3.6-5.1-9.7-2.7-17zM-6.2 1.5a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 1 0 0-6.6zM6.2 1.5a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 1 0 0-6.6zM0 9.2l1.9 3.3H-1.9zM-3.6 14v3h1.6v-3zM2 14v3h1.6v-3zM-6-11.6l3 3.2 3-4.6 3 4.6 3-3.2v3.8H-6z"/>',
    start: '<path fill="currentColor" fill-rule="evenodd" d="M-10 11V-1.5C-10-7.3-5.5-11.5 0-11.5S10-7.3 10-1.5V11h-4.4V-1.3C5.6-4.6 3.1-7.2 0-7.2S-5.6-4.6-5.6-1.3V11zM-12.5 9.2h25v2.6h-25z"/>',
  };
})();

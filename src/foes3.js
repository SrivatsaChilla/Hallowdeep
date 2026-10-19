// Act 3 (Glory) enemy drawings. See foekit.js for the box, the facing and the helpers.
(function () {
  const HD = globalThis.HD;
  const { p, c, el, line, shade, tint, hi, rim, ground, eye, glow, teeth, INK } = HD.FOE_KIT;

  // An armored knight: o.plate (armor), o.dark (joints and legs), o.helm (markup over the head), o.cape (or null),
  // o.front (weapon held toward the player), o.back (behind the body).
  const knight = (o) => `${ground(28)}${o.back || ''}${o.cape ? p('M34 36 L24 88 L76 88 L66 36z', o.cape) : ''}
    ${p('M39 70 L36 91 L48 91 L49 72z', o.dark)}${p('M51 72 L52 91 L64 91 L61 70z', o.dark)}
    ${p('M35 40 C35 32 65 32 65 40 L66 72 L34 72z', o.plate)}${shade('M50 34 L65 40 L66 72 L52 72z', 0.2)}
    ${line('M36 56 L64 56', 1.6, o.dark)}${p('M30 38 C30 32 40 30 42 36 L40 44 L30 44z', o.plate, 2.2)}${p('M70 38 C70 32 60 30 58 36 L60 44 L70 44z', o.plate, 2.2)}
    ${p('M40 30 C38 16 62 16 60 30 L58 34 L42 34z', o.plate)}${o.helm || line('M43 26 L57 26', 2.6)}${o.front || ''}`;
  // A training dummy: a post, a stuffed sack body and a painted target; armor adds plates.
  const dummy = (sack, armor = '', extra = '') => `${ground(24)}${p('M46 60 L44 91 L56 91 L54 60z', '#8a6a3a')}${line('M30 92 L70 92', 3)}
    ${p('M32 36 C32 28 68 28 68 36 L66 64 L34 64z', sack)}${line('M50 30 L50 64', 1.2, '#8a6a3a')}${line('M30 42 L16 40 M70 42 L84 40', 4, '#8a6a3a')}
    ${c(50, 48, 8, '#f2e8d0', 1.8)}${c(50, 48, 4.4, '#c8402e', 0)}${c(50, 48, 1.6, '#f2e8d0', 0)}
    ${c(50, 20, 10, sack)}${line('M44 20 L48 22 M52 22 L56 20', 1.8)}${line('M45 26 C48 28 52 28 55 26', 1.4)}${armor}${extra}`;

  Object.assign(HD.FOE_ART, {
    // Axebot: a rust-red brute of a machine with heavy axe-blade arms
    AXE_BOT: `${ground(32)}${p('M38 70 L34 91 L48 91 L48 72z', '#5a3a30')}${p('M54 72 L54 91 L68 91 L64 70z', '#5a3a30')}
      ${p('M30 34 C30 24 70 24 72 34 L70 72 L32 72z', '#9a4a36')}${shade('M52 28 L72 34 L70 72 L54 72z', 0.22)}
      ${c(42, 50, 3, '#5a2a20', 1.4)}${c(58, 50, 3, '#5a2a20', 1.4)}${p('M40 16 L60 16 L62 28 L38 28z', '#7a3a2c')}${glow(46, 22, 2.6, '#f0a030')}
      ${line('M30 40 L18 56', 6)}${line('M30 40 L18 56', 3, '#5a3a30')}${p('M18 56 C8 50 4 62 8 70 C14 68 20 62 22 58z', '#c4ccd0', 1.8)}
      ${line('M72 40 L84 54', 6)}${line('M72 40 L84 54', 3, '#5a3a30')}${p('M84 54 C94 50 98 62 94 70 C88 68 82 62 80 58z', '#c4ccd0', 1.8)}`,

    // Punch Construct: a clay-skinned golem with a blue visor and one oversized fist
    FIST_CONSTRUCT: `${ground(30)}${p('M40 70 L36 91 L48 91 L50 72z', '#a88a5a')}${p('M54 72 L56 91 L68 91 L64 70z', '#a88a5a')}
      ${p('M36 40 C36 32 64 32 64 40 L64 72 L36 72z', '#d4bc8a')}${shade('M52 36 L64 40 L64 72 L54 72z', 0.2)}
      ${p('M40 20 C40 12 60 12 60 22 L58 34 L42 34z', '#c8ae7e')}${p('M41 22 L59 22 L58 28 L42 28z', '#5ac0e8', 1.8)}
      ${line('M38 44 L24 54', 7)}${line('M38 44 L24 54', 4, '#c8ae7e')}${c(18, 58, 11, '#b89a6a')}${line('M12 54 L18 54 M11 59 L18 59 M12 64 L18 63', 1.6)}
      ${line('M64 44 L72 60', 6)}${line('M64 44 L72 60', 3.4, '#c8ae7e')}${hi('M40 38 L40 66', 0.4, 2)}`,

    // Devoted Sculptor: a blue-robed, beak-masked artisan with a great hammer and chisel
    SCULPTOR: `${ground(28)}${line('M70 92 L74 22', 3.6, '#6a4a2a')}${p('M62 12 L86 14 L84 28 L62 26z', '#8a8a92')}
      ${p('M36 36 C38 28 62 28 64 36 L70 90 L30 90z', '#4a6a9a')}${shade('M52 32 L64 36 L70 90 L56 90z', 0.2)}${line('M36 50 L64 50', 2, '#c8a03a')}
      ${p('M40 32 C38 18 46 12 52 12 C60 12 64 20 62 30 C58 36 44 36 40 32z', '#e8e0d0')}${p('M42 24 L24 30 L42 32z', '#e8e0d0', 2)}${c(48, 22, 2.4, INK, 0)}
      ${line('M40 46 L28 56', 4.4)}${line('M40 46 L28 56', 2.4, '#4a6a9a')}${p('M28 56 L18 66 L22 68 L30 58z', '#c4ccd0', 1.6)}`,

    // Fabricator: a spindly workshop machine on spider legs, goggled, with grasping tool-arms
    ASSEMBLER: `${ground(34)}${['M40 62 L24 72 L18 92', 'M46 66 L40 92', 'M58 66 L64 92', 'M64 62 L80 72 L86 92'].map((d) => line(d, 2.8)).join('')}
      ${c(52, 54, 15, '#c8a868')}${shade('M60 42 C70 48 70 62 62 68 C58 70 54 70 52 70 C62 64 64 50 60 42z', 0.2)}
      ${p('M38 44 C38 36 48 34 54 38 L54 46 L38 48z', '#5a4a3a', 2)}${c(42, 42, 4.6, '#a8d8e8', 1.8)}${c(51, 41, 4, '#a8d8e8', 1.8)}
      ${line('M40 56 L24 44 L18 30 M64 46 L78 30 L84 18', 2.4)}${p('M14 28 L18 22 L22 30z', '#c4ccd0', 1.4)}${p('M82 14 L88 18 L84 22z', '#c4ccd0', 1.4)}
      ${line('M52 40 C52 30 58 24 64 22', 1.8)}${c(66, 20, 3, '#e85a3a', 1.4)}`,

    // Frog Knight: a frog in gilded armor riding a beetle, trident raised
    TOAD_KNIGHT: `${ground(36)}${['M30 78 L24 92', 'M44 80 L42 92', 'M62 80 L66 92', 'M76 76 L84 92'].map((d) => line(d, 3)).join('')}
      ${p('M18 74 C18 60 34 54 54 54 C74 54 88 62 86 74 C84 82 70 84 52 84 C32 84 18 82 18 74z', '#3a2a4a')}${line('M54 55 C52 64 52 74 54 84', 1.6)}
      ${p('M10 72 C10 64 18 62 24 66 L22 76 C16 78 11 76 10 72z', '#2a1e36')}
      ${p('M40 54 C40 42 48 34 56 34 C64 34 70 42 70 54z', '#8a9a3a')}${p('M42 54 L68 54 L66 44 L44 44z', '#c8a03a', 2)}
      ${c(48, 30, 5, '#9aaa4a', 2)}${c(60, 30, 5, '#9aaa4a', 2)}${c(47, 30, 2, INK, 0)}${c(59, 30, 2, INK, 0)}${line('M48 38 C52 40 58 40 62 38', 1.6)}
      ${line('M36 62 L28 6', 2.6, '#c8a03a')}${line('M23 12 L28 4 L33 12 M28 4 L28 14', 2, '#c8a03a')}`,

    // Globe Head: a stooped figure in a long coat whose head is a glass globe full of lightning
    BULB_HEAD: `${ground(26)}${p('M40 70 L38 91 L48 91 L50 72z', '#3a3a44')}${p('M52 72 L54 91 L64 91 L62 70z', '#3a3a44')}
      ${p('M36 40 C36 32 64 32 64 40 L68 76 L32 76z', '#7a7a6a')}${shade('M52 36 L64 40 L68 76 L54 76z', 0.2)}${line('M50 40 L50 76', 1.4)}
      ${line('M38 46 L28 66', 4.4)}${line('M38 46 L28 66', 2.4, '#7a7a6a')}${glow(26, 70, 2.6, '#7ac8f8')}
      ${c(50, 20, 15, '#c8e8f4', 2.4)}${tint('M50 5 C64 5 66 30 50 35 C60 26 60 12 50 5z', '#7aa8c8', 0.4)}
      ${line('M44 12 L50 20 L46 24 L54 30', 2, '#5ab0f0')}${line('M56 12 L52 18 L58 22', 1.6, '#9ad8ff')}${hi('M40 14 C42 10 46 7 50 6', 0.6, 2)}`,

    // Owl Magistrate: a stern brown owl wearing a judge's white ruff
    OWL_JUDGE: `${ground(28)}${line('M42 80 L40 92 M46 82 L46 92 M58 82 L58 92 M62 80 L64 92', 2.6)}
      ${p('M28 58 C26 36 38 22 52 22 C68 22 78 36 76 58 C74 76 64 84 52 84 C38 84 30 76 28 58z', '#8a5a34')}
      ${p('M70 38 C82 42 90 54 92 68 C82 62 74 60 70 58z', '#6a4226', 2)}${shade('M60 24 C74 30 80 46 76 62 C72 76 64 84 54 84 C70 72 72 44 60 24z', 0.18)}
      ${p('M32 68 C36 62 44 64 46 68 C48 62 56 62 58 68 C60 64 68 62 72 68 C66 78 58 80 52 77 C46 80 38 78 32 68z', '#f2ece0', 2)}${line('M40 70 L42 74 M52 70 L52 75 M64 70 L62 74', 1.2, '#b8b0a0')}
      ${c(40, 38, 7, '#f2d88a', 2)}${c(38.5, 38, 3.4, INK, 0)}${c(60, 38, 7, '#f2d88a', 2)}${c(58.5, 38, 3.4, INK, 0)}
      ${p('M46 46 L52 44 L50 52z', '#e8b04a', 1.6)}${p('M34 26 L30 14 L42 22z M66 22 L72 12 L72 26z', '#6a4226', 1.8)}`,

    // Scroll of Biting: a curling violet scroll that opens into a fanged mouth, glyphs aflame
    BITING_SCROLL: `${ground(30)}${p('M20 24 L76 18 L80 74 L24 80z', '#e8d8b0')}${shade('M64 20 L76 18 L80 74 L68 76z', 0.15)}
      ${c(22, 24, 8, '#8a5ab8')}${c(78, 74, 8, '#8a5ab8')}${line('M14 24 L30 24 M70 74 L86 74', 2)}
      ${p('M30 44 C40 36 62 34 70 42 C64 56 40 58 30 44z', '#3a0c1a', 2)}${teeth(32, 68, 41, 6, 5)}${teeth(34, 66, 51, 6, -4)}
      ${['M34 30 l3 -3 2 3 3 -3', 'M50 28 l2 -3 3 3', 'M36 64 l4 -2 2 3 4 -2', 'M58 62 l3 -3 2 3'].map((d) => line(d, 1.6, '#e8902a')).join('')}
      ${glow(30, 68, 2.4, '#f0a030')}${glow(66, 30, 2, '#f0a030')}`,

    // Slimed Berserker: a hulking warrior drowned in teal slime, dripping from every limb
    OOZE_BERSERKER: `${ground(36)}${p('M34 70 L30 91 L44 91 L46 72z', '#3a8a84')}${p('M56 72 L58 91 L72 91 L68 70z', '#3a8a84')}
      ${p('M26 40 C26 26 74 26 76 40 L74 74 L28 74z', '#4aa098')}${shade('M54 30 L76 40 L74 74 L56 74z', 0.2)}
      ${p('M38 24 C38 12 62 12 62 24 L60 32 L40 32z', '#4aa098')}${glow(44, 24, 2.2, '#e8f070')}${glow(55, 24, 2.2, '#e8f070')}
      ${line('M28 44 L14 70', 9)}${line('M28 44 L14 70', 5.4, '#4aa098')}${line('M74 44 L86 70', 9)}${line('M74 44 L86 70', 5.4, '#4aa098')}
      ${['M18 70 l-2 8 4 0z', 'M84 70 l2 8 -4 0z', 'M40 74 l-1 7 3 0z', 'M62 74 l1 7 -3 0z'].map((d) => p(d, '#6cc8bc', 1.4)).join('')}
      ${tint('M36 46 C40 42 46 46 42 50z M60 54 C64 50 70 54 66 58z', '#2a6a64', 0.8)}`,

    // The Forgotten: a weathered grey stone head, eyes long since closed
    FADED: `${ground(30)}${p('M20 62 C18 38 32 22 50 22 C68 22 82 38 80 62 C78 78 68 86 50 86 C32 86 22 78 20 62z', '#9a9a96')}
      ${shade('M62 24 C76 32 82 48 80 62 C78 78 68 86 54 86 C70 74 72 46 62 24z', 0.2)}
      ${p('M30 50 C34 46 42 46 44 52 C40 50 34 50 30 50z M56 52 C58 46 66 46 70 50 C66 50 60 50 56 52z', '#5a5a56', 1.6)}
      ${p('M44 60 L50 52 L56 60z', '#8a8a86', 1.6)}${line('M40 72 C46 70 54 70 60 72', 2)}
      ${line('M28 36 L36 44 M70 32 L64 42 M74 66 L66 70', 1.4, '#6a6a66')}${hi('M28 44 C30 34 38 26 46 24', 0.35, 2.4)}`,

    // The Lost: a bronze tribal mask hanging from a ring, its eye holes empty
    STRAYED: `${ground(20)}${c(50, 10, 5, 'none', 3)}${line('M50 15 L50 22', 2.4)}
      ${p('M30 46 C30 28 40 20 50 20 C60 20 70 28 70 46 C70 68 60 86 50 88 C40 86 30 68 30 46z', '#b8864a')}
      ${shade('M56 22 C66 28 70 38 70 46 C70 68 60 86 50 88 C62 72 64 44 56 22z', 0.2)}
      ${el(41, 46, 5, 6.5, '#2a1a10', 1.6)}${el(59, 46, 5, 6.5, '#2a1a10', 1.6)}${p('M46 58 L50 66 L54 58z', '#8a5a2a', 1.6)}
      ${line('M42 74 C46 78 54 78 58 74', 2)}${line('M30 40 L22 42 M70 40 L78 42', 2)}${hi('M36 34 C38 28 42 24 46 22', 0.45, 2)}`,

    // Living Shield: a soldier all but hidden behind a towering wooden shield
    BULWARK: `${ground(30)}${p('M60 70 L60 91 L72 91 L70 70z', '#3a4a3a')}${p('M56 36 C58 28 76 28 78 36 L78 72 L56 72z', '#5a6a5a')}
      ${c(68, 24, 8, '#8aa07a')}${p('M59 22 C60 12 76 12 77 22z', '#4a544a')}
      ${p('M20 18 L52 14 L54 90 L22 92z', '#9a6a3a')}${line('M30 17 L31 91 M42 15 L43 90', 1.6, '#6a4a22')}
      ${line('M21 32 L53 29 M22 74 L54 72', 3.4, '#6a6a72')}${c(38, 52, 5, '#8a8a92', 1.8)}${hi('M24 22 L26 86', 0.35, 2)}`,

    // Turret Operator: a squat gunner hunched behind a many-barreled gun
    GUNNER: `${ground(34)}${p('M44 70 L40 91 L52 91 L54 72z', '#4a3e34')}${p('M58 72 L60 91 L72 91 L68 70z', '#4a3e34')}
      ${p('M40 38 C40 30 72 30 74 38 L74 72 L40 72z', '#c8a040')}${shade('M58 34 L74 38 L74 72 L60 72z', 0.2)}
      ${c(58, 24, 11, '#9aa0b0')}${p('M48 20 C48 10 68 10 68 20z', '#5a5a64')}${eye(52, 25, 2.6, '#3a2a1a')}
      ${p('M8 46 L44 42 L46 62 L8 60z', '#6a6a72')}${[48, 53, 57].map((y) => line(`M8 ${y} L40 ${y - 1}`, 1.4, '#3a3a42')).join('')}
      ${el(8, 53, 3, 7.5, '#3a3a42', 1.8)}${p('M44 40 L58 44 L58 62 L44 64z', '#4a4a52', 2)}`,

    // Flail Knight: a black-armored knight swinging two spiked flails
    CHAIN_KNIGHT: knight({ plate: '#4a4a52', dark: '#2a2a30', cape: null,
      helm: `${p('M42 24 L58 24 L58 28 L42 28z', '#1a1a20', 1.4)}${p('M44 16 l2 -6 2 6 M52 16 l2 -6 2 6', '#6a6a72', 1.4)}`,
      front: `${line('M30 44 L22 58 L14 68', 1.8, '#8a8a92')}${c(12, 72, 6, '#6a6a72', 2)}${line('M6 72 L3 72 M12 66 L12 63 M12 78 L12 81', 2)}
        ${line('M70 44 L80 60 L86 68', 1.8, '#8a8a92')}${c(88, 72, 6, '#6a6a72', 2)}${line('M94 72 L97 72 M88 66 L88 63 M88 78 L88 81', 2)}` }),

    // Magi Knight: a blue-caped knight holding up a shield of shimmering runes
    RUNE_KNIGHT: knight({ plate: '#8a94a8', dark: '#3a4256', cape: '#2e4a8a',
      helm: `${p('M42 25 L58 25 L57 29 L43 29z', '#1a2030', 1.4)}${glow(50, 14, 2, '#9ad8ff')}`,
      front: `${tint('M8 30 C8 22 30 22 30 30 L30 52 C30 62 19 68 19 68 C19 68 8 62 8 52z', '#7ac8f8', 0.3)}${line('M10 30 C10 24 28 24 28 30 L28 50 C28 60 19 65 19 65 C19 65 10 60 10 50z', 2.4)}
        ${line('M14 34 L24 34 M19 34 L19 50 M14 44 L24 44 M15 54 L23 54', 1.8, '#5ab0f0')}${line('M30 44 L26 46', 4)}` }),

    // Spectral Knight: a translucent teal ghost in armor, a pale blade at its side
    PHANTOM_KNIGHT: `${tint('M30 30 C30 14 70 14 70 30 L76 88 L24 88z', '#7ae0d0', 0.22)}<g opacity=".82">${knight({ plate: '#8ad8cc', dark: '#4a9a90', cape: '#5ab8b0',
      helm: `${p('M42 24 L58 24 L58 28 L42 28z', '#1e4a46', 1.4)}${glow(46, 26, 1.4, '#e8fff8')}${glow(54, 26, 1.4, '#e8fff8')}`,
      front: `${line('M30 46 L20 86', 4)}${line('M30 46 L20 86', 2, '#cff4ee')}${line('M24 50 L36 52', 3, '#4a9a90')}` })}</g>`,

    // Mecha Knight: a brass war machine shaped like a knight, a green glass dome for a head
    CLOCK_KNIGHT: knight({ plate: '#b8944a', dark: '#5a4a2a', cape: null,
      helm: `${c(50, 22, 9, '#9ae0a8', 2.2)}${glow(50, 22, 3, '#5ae07a')}`,
      back: `${line('M66 40 L86 12', 4.4)}${line('M66 40 L86 12', 2.4, '#c4ccd0')}`,
      front: `${c(50, 50, 5, '#e8c060', 1.8)}${line('M50 47 L50 50 L53 51', 1.4)}${line('M34 46 L22 56', 4.4)}${line('M34 46 L22 56', 2.4, '#b8944a')}${p('M14 54 L22 50 L26 60 L18 62z', '#7a6a4a', 1.8)}` }),

    // Soul Nexus: a violet knot of vines cradling one huge red eye, glowing with stolen light
    SOUL_KNOT: `${ground(22)}${tint('M50 10 C78 10 90 32 88 52 C86 74 68 86 50 86 C30 86 12 72 12 50 C12 28 26 10 50 10z', '#e84a5a', 0.18)}
      ${['M50 66 C46 78 40 84 34 92', 'M52 66 C56 78 62 84 70 92', 'M36 52 C24 48 18 40 16 30', 'M64 52 C76 46 82 38 84 28', 'M42 38 C38 26 40 18 46 12', 'M58 38 C62 26 60 18 54 12'].map((d) => line(d, 6) + line(d, 3.4, '#6a3a8a')).join('')}
      ${c(50, 52, 16, '#5a2e7a')}${c(50, 52, 11, '#f2e4e8', 2)}${c(48, 52, 6.4, '#d8283a', 0)}${c(47, 52, 3, INK, 0)}${c(45.4, 49.6, 1.4, '#fff', 0)}`,

    // Aeonglass: an hourglass of pale green sand set in a turning bronze ring
    GLASS_AEON: `${ground(26)}${c(50, 50, 38, 'none', 8)}<circle cx="50" cy="50" r="38" fill="none" stroke="#c8963a" stroke-width="5" stroke-dasharray="44 6"/>
      ${c(50, 9, 4.4, '#7ad8c8', 1.8)}${p('M36 22 L64 22 L64 26 C64 38 54 44 54 50 C54 56 64 62 64 74 L64 78 L36 78 L36 74 C36 62 46 56 46 50 C46 44 36 38 36 26z', '#dff4f0', 2.2)}
      ${tint('M40 30 L60 30 C58 38 52 42 50 46 C48 42 42 38 40 30z M40 76 C40 66 48 62 50 58 C52 62 60 66 60 76z', '#7ad8c0', 0.9)}
      ${line('M50 46 L50 62', 1.4, '#7ad8c0')}${p('M32 18 L68 18 L68 23 L32 23z M32 77 L68 77 L68 82 L32 82z', '#a8763a', 2)}`,

    // Queen: a dark violet sovereign under a spiked gilded crown, eyes like candle flames
    GILDED_QUEEN: `${ground(30)}${p('M24 50 C24 36 76 36 76 50 L84 90 L16 90z', '#3a2246')}${shade('M54 40 L76 50 L84 90 L58 90z', 0.2)}
      ${line('M26 56 L18 90 M74 56 L82 90', 2, '#e0b84a')}${rim('M30 50 C28 30 36 22 50 22 C64 22 72 30 70 50 C64 56 36 56 30 50z', '#e0b84a', 0.3)}
      ${p('M30 50 C28 30 36 22 50 22 C64 22 72 30 70 50 C64 56 36 56 30 50z', '#1e1226')}
      ${p('M41 34 C40 40 42 46 44 46 C46 46 47 40 44 34 C43 38 42 38 41 34z', '#f0e050', 1.2)}${p('M56 34 C55 40 57 46 59 46 C61 46 62 40 59 34 C58 38 57 38 56 34z', '#f0e050', 1.2)}
      ${p('M30 26 L32 10 L40 20 L50 4 L60 20 L68 10 L70 26z', '#d8a83a')}${[[32, 10], [50, 4], [68, 10]].map(([x, y]) => c(x, y, 2.6, '#e84a5a', 1.4)).join('')}`,

    // Torch Head Amalgam: a gnarled, many-limbed husk with green torch-fire for heads
    TORCH_AMALGAM: `${ground(34)}${['M38 70 L28 82 L24 92', 'M48 72 L46 92', 'M60 72 L64 92', 'M68 68 L80 80 L84 92'].map((d) => line(d, 6) + line(d, 3.4, '#3a3a34')).join('')}
      ${p('M34 44 C34 30 66 28 68 42 L70 72 L32 72z', '#4a4a40')}${shade('M52 34 L68 42 L70 72 L54 72z', 0.22)}
      ${line('M34 46 L18 34 L14 20 M66 44 L80 30 L84 16 M50 32 L50 18', 5)}${line('M34 46 L18 34 L14 20 M66 44 L80 30 L84 16 M50 32 L50 18', 2.8, '#3a3a34')}
      ${[[14, 14], [84, 10], [50, 12]].map(([x, y]) => `${p(`M${x - 6} ${y + 6} C${x - 8} ${y - 2} ${x - 2} ${y - 8} ${x} ${y - 14} C${x + 2} ${y - 6} ${x + 8} ${y - 2} ${x + 6} ${y + 6}z`, '#9af05a', 1.6)}${glow(x, y + 2, 2.4, '#e8ff9a')}`).join('')}
      ${glow(44, 52, 2.2, '#9af05a')}${glow(56, 56, 2.2, '#9af05a')}`,

    // Test Subject #C14: a lumpy yellow-green head, bolted plate on its cheek, tongue lolling
    SPECIMEN: `${ground(30)}${p('M18 56 C16 30 34 14 54 16 C76 18 88 36 84 60 C80 78 66 88 48 86 C30 84 20 74 18 56z', '#cce06a')}
      ${shade('M64 20 C80 28 88 44 84 60 C80 78 66 88 52 86 C70 74 74 44 64 20z', 0.2)}${p('M70 44 L84 40 L86 60 L72 62z', '#9a9aa2', 2)}${c(76, 46, 1.6, INK, 0)}${c(78, 56, 1.6, INK, 0)}
      ${[[40, 32, 3.4], [50, 30, 3], [46, 38, 2.6], [56, 36, 2.4]].map(([x, y, r]) => c(x, y, r, '#3a4a1a', 0)).join('')}
      ${p('M22 60 C30 54 46 54 52 62 C46 72 30 72 22 60z', '#3a1018', 2)}${teeth(26, 50, 58, 5, 3)}
      ${p('M30 66 C28 74 32 82 38 82 C42 80 42 72 40 66z', '#e87a8a', 1.8)}`,

    // Battle Friend: a training dummy; later models come plated and studded
    DUMMY_1: dummy('#c8a878'),
    DUMMY_2: dummy('#b89868', `${p('M34 36 L66 36 L66 46 L34 46z', '#8a94a8', 1.8)}${p('M40 12 C40 6 60 6 60 12 L60 16 L40 16z', '#8a94a8', 1.8)}`),
    DUMMY_3: dummy('#a88858', `${p('M32 34 L68 34 L66 64 L34 64z', '#6a7488', 2)}${c(50, 48, 8, '#f2e8d0', 1.8)}${c(50, 48, 4.4, '#c8402e', 0)}${p('M38 12 C38 4 62 4 62 12 L62 18 L38 18z', '#6a7488', 1.8)}${[[36, 38], [64, 38], [36, 60], [64, 60]].map(([x, y]) => c(x, y, 1.6, '#c8c8d0', 1)).join('')}`,
      line('M16 40 L10 36 M84 40 L90 36', 3, '#6a7488')),

    // Mysterious Knight: a grey knight in a ragged hood, a spiked mace in each fist
    HOODED_KNIGHT: knight({ plate: '#6a6a70', dark: '#3a3a40', cape: '#4a4a52',
      helm: `${p('M38 32 C36 14 64 14 62 32 C58 36 42 36 38 32z', '#4a4a52')}${el(50, 27, 6, 4, '#120e14', 0)}${glow(48, 27, 1.2, '#e8e0f0')}${glow(53, 27, 1.2, '#e8e0f0')}`,
      front: `${line('M30 46 L18 62', 3, '#5a4a3a')}${c(16, 66, 6, '#5a5a62', 2)}${line('M8 66 L11 66 M16 58 L16 60 M22 66 L20 66 M16 74 L16 72', 2)}
        ${line('M70 46 L82 62', 3, '#5a4a3a')}${c(84, 66, 6, '#5a5a62', 2)}` }),
  });
})();

// Act 2 (Hive) enemy drawings. See foekit.js for the box, the facing and the helpers.
(function () {
  const HD = globalThis.HD;
  const { p, c, el, line, shade, tint, hi, ground, eye, glow, teeth, INK } = HD.FOE_KIT;

  // Bowlbugs: a round bug with one big eye and a bowl on its back holding its load.
  const bowlbug = (body, shell, load) => `${ground(32)}${['M30 80 L26 91', 'M42 84 L40 92', 'M60 84 L62 92', 'M72 80 L76 91'].map((d) => line(d, 3.2)).join('')}
    ${load}${p('M26 52 C34 38 70 38 78 52 C68 58 36 58 26 52z', shell, 2.2)}
    ${p('M18 68 C17 54 32 48 50 48 C70 48 85 56 83 70 C81 82 67 87 50 87 C33 87 19 82 18 68z', body)}
    ${shade('M60 50 C76 52 86 62 82 74 C78 82 68 86 56 87 C70 78 72 62 60 50z', 0.18)}
    ${p('M9 70 L18 64 L19 74z', '#e8b04a', 1.8)}${c(26, 64, 9, '#fff6e0', 2)}${c(23.5, 64, 5, '#e88a2a', 0)}${c(22.5, 64, 2.6, INK, 0)}${c(21, 61.6, 1.2, '#fff', 0)}`;
  // Decimillipede: armored segments, slate plates over an orange underside.
  const segment = (x, y, r) => `${c(x, y, r, '#e07a3a')}${p(`M${x - r} ${y} C${x - r} ${y - r * 1.25} ${x + r} ${y - r * 1.25} ${x + r} ${y}z`, '#3c4a62', 2.2)}${hi(`M${x - r * 0.6} ${y - r * 0.55} C${x - r * 0.2} ${y - r * 0.85} ${x + r * 0.3} ${y - r * 0.85} ${x + r * 0.6} ${y - r * 0.6}`, 0.4)}`;
  const segLegs = (x1, x2) => [x1, (x1 + x2) / 2, x2].map((x) => line(`M${x} 78 L${x - 4} 91 M${x} 78 L${x + 4} 91`, 2.2)).join('');

  Object.assign(HD.FOE_ART, {
    CUP_ROCK: bowlbug('#c84a3e', '#8a3a30', `${p('M32 44 C30 30 44 20 56 22 C70 22 76 34 72 46z', '#8f8f8a')}${shade('M58 24 C70 26 76 36 72 46 L60 46 C64 38 64 30 58 24z', 0.2)}`),
    CUP_EGG: bowlbug('#7ab84a', '#4f8a32', `${el(52, 32, 15, 18, '#7cc8c0')}${[[46, 26, 3], [58, 34, 2.4], [50, 40, 2]].map(([x, y, r]) => c(x, y, r, '#3a8a84', 0)).join('')}${hi('M42 24 C44 18 48 15 52 15', 0.5)}`),
    CUP_SILK: bowlbug('#d8a0b0', '#a86a7e', `${[[40, 38, 10], [56, 30, 13], [66, 42, 9], [50, 44, 9]].map(([x, y, r]) => c(x, y, r, '#f4f2ee', 1.8)).join('')}${line('M36 34 C46 30 56 34 64 30', 1.2, '#c8c4c0')}`),
    CUP_NECTAR: bowlbug('#9a5aa8', '#6a3a7a', `${p('M30 46 C30 30 42 22 54 22 C68 22 76 32 74 46z', '#f0a830')}${p('M44 46 C44 52 46 56 48 56 C50 56 50 50 50 46z', '#f0a830', 1.6)}${hi('M38 34 C42 28 48 25 54 25', 0.55, 2.4)}`),

    // Chomper: a squat tan crab-thing that is mostly one huge clamping jaw
    GNASHER: `${ground(34)}${['M50 76 L44 91', 'M62 78 L62 92', 'M74 76 L82 91', 'M84 70 L94 86'].map((d) => line(d, 3)).join('')}
      ${p('M46 58 C50 46 74 44 86 54 C92 62 88 76 78 80 L52 80 C44 76 42 66 46 58z', '#c8a878')}${shade('M50 74 C62 82 78 82 88 70 L78 80 L52 80z', 0.22)}
      ${p('M8 40 L50 34 L52 56 L10 56z', '#b89868')}${p('M10 60 L52 58 L50 78 L12 74z', '#a88858')}
      ${teeth(12, 50, 56, 7, 4.4)}${teeth(12, 50, 60, 7, -4.4)}${line('M8 40 L50 34', 2)}${glow(40, 44, 3, '#5ac8f0')}
      ${hi('M14 42 L44 38', 0.4, 2)}`,

    // Exoskeleton: a dry, hollow husk of an insect on long jointed legs
    SHELLCRAWLER: `${ground(32)}${['M36 62 L26 74 L22 91', 'M48 66 L44 80 L40 92', 'M62 66 L68 80 L66 92', 'M72 62 L84 74 L88 90'].map((d) => line(d, 2.6)).join('')}
      ${[[76, 54, 11], [62, 52, 12], [48, 50, 12]].map(([x, y, r]) => el(x, y, r, r * 0.8, '#b0885a', 2.2) + line(`M${x - r * 0.7} ${y} L${x + r * 0.7} ${y}`, 1.2, '#7a5a34')).join('')}
      ${p('M20 44 C22 36 34 34 38 42 C38 50 30 54 24 52 C20 50 19 47 20 44z', '#c49a68')}${line('M22 38 C18 28 12 24 6 24 M28 36 C28 26 24 18 18 14', 1.8)}
      ${p('M20 50 L12 56 L18 54z M24 52 L18 60 L24 56z', '#e8d8b8', 1.4)}${eye(28, 43, 3, '#3a2a1a')}${hi('M44 42 C54 38 66 40 74 44', 0.4)}`,

    // Hunter Killer: a lean red hunting insect, all spikes and mandibles
    STALKER: `${ground(36)}${['M40 70 L32 92', 'M52 72 L54 92', 'M70 70 L76 92', 'M80 64 L92 88'].map((d) => line(d, 5) + line(d, 2.6, '#a8322a')).join('')}
      ${p('M30 56 C38 42 68 40 84 50 C92 56 90 68 82 72 L42 74 C32 70 28 64 30 56z', '#c43c30')}
      ${p('M40 44 l4 -10 4 8 4 -11 4 10 4 -10 4 9 4 -8', '#7a1e18', 1.8)}${shade('M36 66 C52 74 72 74 88 62 L82 72 L42 74z', 0.24)}
      ${p('M10 58 C12 48 22 44 32 48 C36 54 34 62 28 66 C20 68 12 66 10 58z', '#d24a3a')}${p('M12 62 C6 66 4 72 8 76 C10 70 14 68 18 66z M16 66 C12 72 14 78 18 80 C18 74 20 70 22 68z', '#f2d8a8', 1.6)}
      ${glow(20, 54, 2.2, '#f0e050')}${hi('M44 46 C56 42 70 44 80 50', 0.35)}`,

    // Louse Progenitor: a huge, armored blue louse banded in orange
    BROOD_LOUSE: `${ground(38)}${['M32 80 L26 92', 'M46 84 L44 92', 'M60 84 L62 92', 'M74 80 L80 92'].map((d) => line(d, 3)).join('')}
      ${p('M16 66 C14 46 34 32 56 32 C78 32 92 48 88 68 C86 80 72 86 54 86 C34 86 18 80 16 66z', '#3a7aa8')}
      ${[38, 52, 66, 78].map((x) => line(`M${x} ${x === 78 ? 40 : 34} C${x + 4} 50 ${x + 4} 70 ${x} 85`, 4) + line(`M${x} ${x === 78 ? 40 : 34} C${x + 4} 50 ${x + 4} 70 ${x} 85`, 2.4, '#e8963a')).join('')}
      ${shade('M60 34 C80 36 92 52 88 68 C86 80 72 86 58 86 C74 74 76 50 60 34z', 0.2)}
      ${p('M6 64 C6 54 14 50 22 54 C24 60 22 66 16 70 C10 70 7 68 6 64z', '#2e6488')}${eye(13, 59, 3, '#e8963a')}
      ${hi('M24 50 C32 40 44 36 54 35', 0.45, 2.4)}`,

    // Myte: a round, orange-brown tick with a skull-like face and splayed legs
    MITE: `${ground(34)}${['M34 60 L18 52 L8 70', 'M36 68 L22 72 L16 90', 'M64 60 L80 52 L92 70', 'M62 68 L76 74 L84 90', 'M44 74 L40 92', 'M56 74 L60 92'].map((d) => line(d, 3)).join('')}
      ${el(50, 58, 22, 18, '#c8742e')}${p('M34 52 C40 44 60 44 66 52 C60 50 40 50 34 52z', '#8a4a1e', 1.6)}
      ${shade('M58 42 C70 46 74 60 66 72 C62 76 56 76 52 76 C64 68 66 52 58 42z', 0.2)}
      ${el(36, 60, 9, 8, '#e8d0a8', 2)}${c(33, 58, 2.6, INK, 0)}${c(39, 58, 2.6, INK, 0)}${line('M30 66 L34 72 L36 66 L38 72 L42 66', 1.6)}
      ${tint('M56 54 C60 52 64 56 62 60z M52 64 C56 62 58 66 54 68z', '#8a4a1e', 0.8)}`,

    // Ovicopter: a fuzzy flying bug on buzzing wings, an egg slung beneath it
    EGG_DRONE: `${ground(18)}${p('M48 40 C40 20 22 14 12 18 C16 30 32 40 46 44z', '#dfeef0', 1.8)}${p('M56 40 C66 18 84 12 92 18 C88 30 72 40 58 44z', '#dfeef0', 1.8)}
      ${tint('M48 40 C40 20 22 14 12 18 C16 30 32 40 46 44z M56 40 C66 18 84 12 92 18 C88 30 72 40 58 44z', '#9ad0e0', 0.35)}
      ${c(52, 50, 15, '#e8ecd8')}${c(52, 50, 10, '#c8dca0', 0)}${line('M44 62 L46 70 M60 62 L58 70', 2)}${el(52, 76, 8, 10, '#a8d8c8')}
      ${eye(42, 47, 4, '#3a6a2a')}${eye(54, 44, 3.4, '#3a6a2a')}${line('M38 40 C34 32 30 30 26 30 M46 37 C46 28 44 24 40 22', 1.6)}`,

    // Tough Egg: a big teal egg, flecked dark
    HARD_EGG: `${ground(24)}${el(50, 62, 24, 29, '#6cbcb4')}${shade('M62 36 C76 46 78 74 66 88 C60 92 54 92 50 92 C66 82 72 56 62 36z', 0.2)}
      ${[[40, 50, 4, 3], [56, 44, 3, 2.4], [60, 66, 4.6, 3.4], [44, 74, 3.4, 2.6], [34, 64, 2.4, 2]].map(([x, y, rx, ry]) => el(x, y, rx, ry, '#2e7a74', 0)).join('')}
      ${hi('M34 46 C36 40 40 36 44 34', 0.55, 2.6)}`,

    // Slumbering Beetle: a great purple rhinoceros beetle, horn lowered, fast asleep
    DOZING_BEETLE: `${ground(38)}${['M40 76 L34 91', 'M56 78 L56 92', 'M72 76 L78 91'].map((d) => line(d, 3.4)).join('')}
      ${p('M30 70 C30 48 50 36 70 38 C86 40 94 54 90 70 C86 80 76 82 64 82 L36 82 C30 80 29 76 30 70z', '#6a3e8a')}
      ${line('M62 39 C60 52 62 68 66 82', 2)}${shade('M70 40 C86 44 94 56 90 70 C86 80 78 82 68 82 C78 70 78 52 70 40z', 0.2)}
      ${p('M14 66 C14 56 24 52 32 56 L34 72 C26 76 16 74 14 66z', '#4e2a6a')}${p('M18 58 C10 50 6 38 10 26 C14 36 20 44 26 52z', '#3a1e52', 2)}
      ${line('M20 64 C22 66 26 66 28 64', 1.8)}${hi('M38 54 C46 44 58 40 68 40', 0.4, 2.4)}
      ${line('M74 22 L84 22 L74 32 L84 32', 4)}${line('M74 22 L84 22 L74 32 L84 32', 2, '#e8dcf4')}${line('M86 10 L93 10 L86 17 L93 17', 3.4)}${line('M86 10 L93 10 L86 17 L93 17', 1.6, '#e8dcf4')}`,

    // Spiny Toad: a squat green toad bristling with dark spines, red-eyed
    THORN_TOAD: `${ground(38)}${p('M22 78 L18 92 L32 92 L34 80z', '#4e7a3a')}${p('M70 80 L72 92 L86 92 L82 76z', '#4e7a3a')}
      ${['M30 44 l2 -10 5 9', 'M42 36 l3 -11 4 10', 'M56 34 l4 -11 3 11', 'M70 38 l5 -10 2 11', 'M80 48 l7 -7 0 10', 'M86 60 l8 -3 -4 9'].map((d) => p(d, '#2a3a24', 1.4)).join('')}
      ${p('M14 66 C14 46 34 34 56 34 C78 34 92 50 90 68 C88 80 74 84 54 84 C32 84 15 80 14 66z', '#6a9a4a')}
      ${tint('M30 58 C34 54 38 58 34 62z M52 48 C56 44 62 48 56 52z M70 60 C74 56 80 60 74 64z M44 70 C48 66 52 70 48 74z', '#3e6a2e', 0.8)}
      ${shade('M60 36 C80 40 92 54 90 68 C88 80 76 84 62 84 C76 72 74 50 60 36z', 0.18)}${line('M12 70 C22 76 40 76 50 70', 2.2)}
      ${c(22, 50, 6, '#c8302a', 2)}${c(20.5, 50, 2.6, INK, 0)}${c(36, 46, 5, '#c8302a', 2)}${c(34.8, 46, 2.2, INK, 0)}`,

    // The Obscura: a pale, coiling creature of pearl segments trailing blue light
    UMBRA: `${ground(26)}${tint('M30 20 C46 10 70 16 72 34 C74 50 60 56 52 66 C44 76 50 88 62 90 C40 92 30 78 36 64 C42 52 58 44 54 32 C50 22 38 22 30 20z', '#9ad8f0', 0.25)}
      ${[[58, 84, 8], [46, 76, 8.6], [42, 64, 9], [48, 52, 9], [58, 42, 9], [60, 30, 8.4], [52, 20, 7.6]].map(([x, y, r]) => c(x, y, r, '#eaf2f4', 2)).join('')}
      ${[[58, 84], [46, 76], [42, 64], [48, 52], [58, 42], [60, 30]].map(([x, y]) => c(x, y, 2.6, '#7ac0e0', 0)).join('')}
      ${p('M66 34 C78 26 88 28 94 22 C90 34 80 40 68 40z M64 50 C76 50 84 56 92 52 C86 62 74 62 64 56z', '#bfe4f0', 1.6)}
      ${glow(48, 18, 2.6, '#5ac8f0')}`,

    // Parafright: a cold blue ring of spirit, hollow at its heart
    FRIGHT: `${ground(18)}${tint('M50 14 C76 14 88 34 86 52 C84 72 66 84 50 84 C32 84 14 72 14 50 C14 30 28 14 50 14z', '#7ac8f8', 0.25)}
      <circle cx="50" cy="50" r="24" fill="none" stroke="#bfe8ff" stroke-width="11" stroke-opacity=".85"/><circle cx="50" cy="50" r="24" fill="none" stroke="#5ab0f0" stroke-width="5"/>
      ${line('M74 40 C84 30 90 20 88 10', 4, '#9ad8ff')}${line('M30 72 C22 82 18 88 10 90', 3, '#9ad8ff')}${glow(36, 42, 2.2, '#ffffff', '#ffffff')}${glow(46, 38, 2.2, '#ffffff', '#ffffff')}`,

    // Thieving Hopper: a lanky green grasshopper, a stolen sack slung over one shoulder
    PILFER_HOPPER: `${ground(30)}${line('M54 66 L74 50 L80 92', 4)}${line('M54 66 L74 50 L80 92', 2, '#5a8a3a')}${line('M46 66 L32 80 L30 92', 3)}
      ${p('M44 40 C48 32 60 32 62 40 L60 70 L46 70z', '#7aaa4a')}${p('M60 36 C70 34 80 40 82 50 C74 52 66 48 60 44z', '#2e3e6a', 2)}
      ${p('M66 30 C64 20 76 16 82 22 C84 30 78 36 70 36z', '#b89a6a', 2)}${line('M62 40 L70 32', 2.2)}
      ${p('M40 30 C40 22 50 18 56 24 C58 30 54 36 48 36 C44 36 41 34 40 30z', '#8aba5a')}${eye(46, 27, 3.4, '#a8302a')}
      ${line('M48 21 C46 10 40 6 34 6 M52 21 C54 12 58 8 64 8', 1.8)}${line('M44 48 L30 58 L22 52', 2.6)}`,

    // Tunneler: a maroon, armored digger heaving itself out of a dirt mound, claws first
    BURROWER: `${p('M8 92 C14 78 30 74 50 74 C70 74 86 78 92 92z', '#8a6a46')}${tint('M20 84 C26 80 30 84 24 88z M64 82 C70 78 76 82 70 86z', '#5a4428', 0.9)}
      ${p('M30 76 C28 54 40 38 56 38 C72 38 82 52 80 76z', '#7a2e34')}${['M40 44 l3 -8 4 7', 'M54 38 l4 -9 3 9', 'M68 44 l5 -7 1 8'].map((d) => p(d, '#4a1a1e', 1.4)).join('')}
      ${shade('M60 40 C74 44 82 56 80 76 L66 76 C72 62 70 50 60 40z', 0.2)}${eye(40, 56, 3.4, '#e8a030')}${eye(52, 54, 3.4, '#e8a030')}
      ${p('M28 66 C18 60 10 62 6 70 C12 68 16 70 18 74 C14 74 12 78 14 82 C20 78 26 76 32 74z', '#9a3e44')}
      ${p('M78 66 C88 60 94 64 96 72 C92 70 88 72 86 76 C90 76 92 80 90 84 C84 80 80 78 76 76z', '#9a3e44')}`,

    // Decimillipede: its head, a middle stretch and its stinging tail, each fought on its own
    CENTICOIL_HEAD: `${ground(30)}${segLegs(56, 76)}${segment(70, 66, 16)}${segment(48, 60, 15)}
      ${p('M18 56 C18 44 30 38 40 44 C44 50 42 60 36 64 C28 66 20 64 18 56z', '#e07a3a')}${p('M18 52 C20 42 32 38 40 44 C32 44 24 48 18 52z', '#3c4a62', 2)}
      ${p('M18 58 C10 58 6 64 8 70 C12 66 16 64 20 64z M24 62 C20 68 22 74 26 76 C26 70 28 66 30 64z', '#f2d8a8', 1.6)}
      ${glow(26, 50, 2.2, '#f0e050')}${glow(32, 48, 1.8, '#f0e050')}${line('M28 42 C24 30 18 26 12 26 M34 42 C34 30 30 22 24 18', 1.8)}`,
    CENTICOIL_BODY: `${ground(32)}${segLegs(30, 70)}${segment(30, 66, 15)}${segment(50, 62, 16)}${segment(70, 66, 15)}`,
    CENTICOIL_TAIL: `${ground(30)}${segLegs(30, 50)}${segment(30, 66, 15)}${segment(50, 64, 14)}
      ${p('M62 62 C72 56 82 50 86 36 C90 48 84 60 74 68z', '#3c4a62', 2.2)}${p('M86 36 L92 24 L90 38z', '#f2d8a8', 1.6)}`,

    // Entomancer: a hunched insect-mage in olive wraps, a spear and a cloud of bees
    SWARM_CALLER: `${ground(26)}${line('M26 92 L30 14', 3.4, '#5a3a1e')}${p('M30 14 L26 4 L34 8z', '#c4ccd0', 1.6)}
      ${p('M42 70 L38 91 L48 91 L50 72z', '#4a4a24')}${p('M52 72 L56 91 L66 91 L62 70z', '#4a4a24')}
      ${p('M38 40 C40 32 62 32 64 40 L66 74 L36 74z', '#7a7a3a')}${shade('M52 36 L64 40 L66 74 L54 74z', 0.2)}${line('M40 48 L30 44', 4)}
      ${p('M40 30 C40 20 60 18 62 30 C60 38 42 38 40 30z', '#8a8a44')}${glow(46, 28, 2, '#f0e050')}${glow(55, 28, 2, '#f0e050')}
      ${[[16, 30], [22, 46], [74, 22], [82, 38], [70, 50]].map(([x, y]) => el(x, y, 3.4, 2.4, '#f0c030', 1.2) + line(`M${x - 1.5} ${y - 2.4} L${x - 3} ${y - 5}`, 1, '#dfeef0')).join('')}`,

    // Infested Prism: a red pyramid with one burning eye, ringed by drifting blue shards
    HIVE_PRISM: `${ground(30)}${p('M50 12 L86 80 L14 80z', '#b83a3a')}${p('M50 12 L86 80 L58 80z', '#8a2a2e', 2)}
      ${glow(46, 54, 5, '#f0c040')}${c(46, 54, 2.2, INK, 0)}
      ${['M8 34 L18 26 L20 40z', 'M82 22 L94 30 L84 38z', 'M90 56 L98 66 L88 70z', 'M4 64 L14 58 L12 72z'].map((d) => p(d, '#7ab8e0', 1.6)).join('')}
      ${hi('M46 20 L22 74', 0.4, 2)}`,

    // Crusher: an enormous red crab claw rising from below, pincers open
    CRAB_CLAW: `${ground(30)}${p('M44 92 C40 80 42 66 50 58 L64 62 C62 72 62 82 64 92z', '#b83a2e')}${p('M48 62 C46 50 50 40 58 36 L70 40 C66 48 64 56 64 64z', '#c84434')}
      ${p('M56 38 C44 30 34 18 34 6 C46 12 56 20 62 30z', '#d84e3a')}${p('M64 34 C70 22 82 14 94 16 C88 26 78 34 70 40z', '#d84e3a')}
      ${shade('M60 64 L64 62 C62 72 62 82 64 92 L58 92 C56 82 56 72 60 64z', 0.2)}
      ${[[54, 74], [58, 50]].map(([x, y]) => line(`M${x - 8} ${y} L${x + 8} ${y + 2}`, 1.8)).join('')}${hi('M40 12 C44 20 50 26 56 30', 0.45, 2.2)}`,

    // Rocket: a crab's armored arm ending in a cannon, its muzzle glowing
    CRAB_CANNON: `${ground(30)}${p('M50 92 C46 80 48 66 56 58 L70 62 C68 72 68 82 70 92z', '#b83a2e')}
      ${p('M54 62 C50 50 48 40 44 32 L58 26 C62 36 66 48 68 60z', '#c84434')}${p('M30 34 C28 24 38 16 48 16 L60 20 L56 36 C46 40 34 40 30 34z', '#6a6a72')}
      ${el(30, 28, 6, 9, '#3a3a42', 2)}${glow(30, 28, 3.4, '#f0a030')}${line('M44 18 L48 38 M52 18 L54 37', 1.6, '#4a4a52')}
      ${shade('M64 64 L70 62 C68 72 68 82 70 92 L64 92 C62 82 62 72 64 64z', 0.2)}${line('M50 74 L64 76', 1.8)}`,

    // Knowledge Demon: a towering cloaked demon whose face is a split, glowing tome
    LORE_FIEND: `${ground(32)}${p('M30 34 C32 24 68 24 70 34 L82 90 L18 90z', '#8a6a3a')}${shade('M52 28 L70 34 L82 90 L56 90z', 0.2)}
      ${line('M30 40 L22 90 M70 40 L78 90', 2, '#e0b84a')}${p('M42 50 L58 50 L56 90 L44 90z', '#5a3a1e', 1.8)}
      ${p('M36 34 C34 20 40 10 50 8 C60 10 66 20 64 34 C58 40 42 40 36 34z', '#5a4428')}
      ${p('M50 14 C44 16 40 22 40 30 C44 32 48 32 50 30z', '#e8e0c8', 1.6)}${p('M50 14 C56 16 60 22 60 30 C56 32 52 32 50 30z', '#e8e0c8', 1.6)}
      ${line('M43 20 L48 21 M42 25 L48 25 M52 21 L57 20 M52 25 L58 25', 1, '#8a7a5a')}${glow(50, 30, 2.2, '#f0d050')}
      ${p('M36 22 C30 16 28 8 30 2 C34 8 38 12 40 16z', '#3a2a18', 1.6)}${p('M64 22 C70 16 72 8 70 2 C66 8 62 12 60 16z', '#3a2a18', 1.6)}`,

    // The Insatiable: a vast round maw ringed in orange flesh, hooked tendrils at its edges
    GLUTTON: `${ground(36)}${['M18 30 C8 24 6 14 12 8', 'M82 30 C92 24 94 14 88 8', 'M18 76 C8 82 6 90 12 94', 'M82 76 C92 82 94 90 88 94'].map((d) => line(d, 7) + line(d, 3.6, '#3a6a8a')).join('')}
      ${c(50, 52, 38, '#e07a3a')}${c(50, 52, 28, '#b8402e', 2.2)}${el(46, 54, 15, 18, '#2a0c0c', 2)}
      ${shade('M70 22 C88 34 92 60 80 78 C72 88 60 90 50 90 C72 80 82 50 70 22z', 0.2)}${hi('M22 40 C26 28 36 20 46 17', 0.45, 2.6)}`,
  });
})();

// Act 1 (Overgrowth) enemy drawings. See foekit.js for the box, the facing and the helpers.
(function () {
  const HD = globalThis.HD;
  const { p, c, el, line, shade, tint, hi, rim, ground, eye, glow, teeth, small, INK } = HD.FOE_KIT;

  // A standing figure for the raiders: o.cloak (or null), o.body, o.legs, o.skin, o.head (extra markup over the head),
  // o.front (weapon or arm in front), o.back (behind the body), o.wide (bulkier build).
  const figure = (o) => {
    const w = o.wide ? 6 : 0;
    return `${ground(26)}${o.back || ''}
      ${o.cloak ? p(`M${36 - w} 38 L${24 - w} 88 L${76 + w} 88 L${64 + w} 38z`, o.cloak) : ''}
      ${p('M40 70 L37 91 L47 91 L49 72z', o.legs)}${p('M51 72 L53 91 L63 91 L60 70z', o.legs)}
      ${p(`M${37 - w} 40 C${37 - w} 33 ${63 + w} 33 ${63 + w} 40 L${65 + w} 72 L${35 - w} 72z`, o.body)}
      ${shade(`M50 36 L${63 + w} 40 L${65 + w} 72 L52 72z`, 0.18)}
      ${c(50, 26, 9.5, o.skin)}${o.head || ''}${o.front || ''}`;
  };
  const slimeDome = (body, d = 'M12 90 C8 68 22 44 50 42 C78 44 92 68 88 90z') => p(d, body) + shade('M60 46 C80 52 90 70 88 90 L62 90 C72 76 70 58 60 46z', 0.16);

  Object.assign(HD.FOE_ART, {
    // Nibbit: a stout teal lizard with a heavy brow and a ridged back
    GNAWLET: `${ground(34)}${line('M78 66 C90 64 96 56 97 46', 6)}${line('M78 66 C90 64 96 56 97 46', 3, '#2f7a72')}
      ${p('M32 78 L29 91 L39 91 L41 79z', '#2f7a72')}${p('M66 79 L68 91 L78 91 L76 77z', '#2f7a72')}
      ${p('M30 62 C34 47 58 43 74 51 C86 57 86 74 76 80 L37 82 C27 80 24 70 30 62z', '#3f8f86')}
      ${shade('M34 75 C46 81 66 81 80 70 L77 80 L37 82z', 0.22)}
      ${p('M40 49 l4 -7 3 7 4 -7 3 7 4 -7 3 7', '#b9d77a', 2)}
      ${p('M9 64 C9 50 21 41 34 45 C44 49 46 61 42 71 C36 80 18 80 12 74 C9 71 8 67 9 64z', '#4aa196')}
      ${p('M16 50 C22 44 32 44 38 50 C30 49 22 50 16 54z', '#2f7a72', 2)}
      ${line('M12 70 C20 73 30 73 39 69', 2)}${eye(25, 57, 3.6, '#c99a1a')}${hi('M48 52 C58 48 68 50 74 54', 0.4)}`,

    // Fuzzy Wurm Crawler: a fat lilac grub rearing up with a pink, toothed mouth
    MOSSGRUB: `${ground(36)}${c(80, 76, 13, '#7a5aa0')}${c(62, 70, 16, '#8a68b0')}${c(43, 61, 16, '#9a76c0')}
      ${['M72 63 l3 -6 3 6 3 -6 3 6', 'M52 55 l3 -7 3 7 3 -7 3 7 3 -7 3 7', 'M34 46 l3 -7 3 7 3 -7 3 7 3 -7 3 7'].map((d) => p(d, '#d8c4ee', 1.6)).join('')}
      ${c(27, 50, 15, '#a884cc')}${shade('M40 74 C54 86 76 90 92 80 L88 88 L44 86z', 0.2)}
      ${p('M10 44 C16 32 30 34 34 44 C28 52 22 58 14 60 C10 54 9 49 10 44z', '#e47aa0')}
      ${p('M14 46 C20 40 28 41 31 46 C26 51 21 54 16 55z', '#5a1830', 1.4)}${teeth(15, 30, 46, 4, 3.2)}
      ${c(26, 37, 2.2, INK, 0)}${c(33, 39, 2, INK, 0)}${[50, 68, 84].map((x) => p(`M${x - 3} 84 l2 7 4 0 2 -7z`, '#4a3466', 1.6)).join('')}`,

    // Shrinker Beetle: a yellow beetle on spindly legs, its long snout ending in a glassy spiral
    PINCH_WEEVIL: `${ground(30)}${['M44 74 L36 91', 'M58 76 L56 92', 'M72 74 L80 91'].map((d) => line(d, 2.4)).join('')}
      ${p('M34 70 C34 50 52 40 68 44 C82 48 89 62 85 74 L40 78z', '#cfc65a')}${line('M60 44 C58 56 60 68 64 76', 1.8)}
      ${shade('M64 46 C80 50 88 62 85 74 L66 77 C72 66 72 54 64 46z', 0.18)}
      ${[[50, 56], [72, 58], [56, 68]].map(([x, y]) => el(x, y, 3.2, 2.4, '#8a8a2a', 1.2)).join('')}
      ${c(29, 67, 9, '#8f8d3c')}${eye(26, 65, 3, '#4a6a1a')}${line('M21 64 Q9 52 15 37', 3)}
      ${c(17, 30, 7, '#c4ecf4', 2)}${line('M17 30 m-3.5 0 a3.5 3.5 0 1 1 3.5 3.5 a2 2 0 1 1 -2 -2', 1.4, '#3a7a9a')}
      ${hi('M42 52 C48 46 56 44 62 45', 0.5)}`,

    // Leaf Slime: a blue-grey dome with a mossy cap, a sprout and one sleepy eye
    MOSS_OOZE: `${ground(38)}${slimeDome('#7395ad')}
      ${p('M20 60 C26 45 42 38 52 40 C66 38 80 46 82 60 C72 54 66 61 57 55 C49 61 41 53 33 61 C28 56 24 61 20 60z', '#6f9c3c', 2)}
      ${p('M50 41 C45 31 39 27 32 25 C36 33 43 38 50 41z', '#92c24c', 2)}${p('M50 41 C55 29 63 25 71 25 C65 33 58 38 50 41z', '#92c24c', 2)}
      ${eye(40, 72, 6.5, '#2a3a4a')}${p('M33.5 72 C34 64 46 64 46.5 72 C42 69 38 69 33.5 72z', '#5a7a92', 1.6)}
      ${hi('M20 76 C20 66 26 58 32 54', 0.4, 2.4)}`,

    // Twig Slime: a lime-green blob stuck with twigs, with darker spots
    BARK_OOZE: `${ground(38)}${['M30 52 L18 32 M23 41 L15 40', 'M48 44 L46 18 M47 30 L54 24', 'M66 48 L80 26 M74 36 L82 38', 'M80 64 L96 56'].map((d) => line(d, 3.4, '#6a4a22')).join('')}
      ${slimeDome('#c6dc66', 'M12 90 C8 66 24 46 50 44 C76 46 92 66 88 90z')}
      ${[[34, 62, 5, 4], [62, 58, 6, 4.5], [48, 76, 4, 3], [72, 76, 5, 3.5], [26, 78, 3.4, 2.6]].map(([x, y, rx, ry]) => el(x, y, rx, ry, '#8c9c34', 1.2)).join('')}
      ${c(36, 70, 2.6, INK, 0)}${c(46, 70, 2.6, INK, 0)}${hi('M20 74 C20 64 26 56 34 52', 0.45, 2.4)}`,

    // Cubex Construct: a tall tan monolith on a plinth with a blue light set in its foot
    COGSTONE: `${ground(28)}${p('M28 76 L72 76 L76 91 L24 91z', '#8a7656')}${shade('M54 76 L72 76 L76 91 L56 91z', 0.2)}
      ${p('M36 10 L62 14 L60 72 L34 70z', '#cdb88c')}${p('M62 14 L71 18 L69 73 L60 72z', '#9a8664')}
      ${line('M40 24 L56 26 M39 38 L52 39', 1.6, '#7a6a4a')}${c(47, 58, 2.6, '#6a5a40', 1.2)}
      ${glow(48, 80, 4.2, '#5ac8f0')}${hi('M39 14 L38 66', 0.45, 2.2)}`,

    // Flyconid: a cluster of drooping yellow mushroom caps on a spotted green stalk
    SPOREWING: `${ground(18)}${p('M47 90 C43 74 47 60 51 46 L56 46 C54 60 52 76 55 90z', '#6c9a4a')}
      ${[[50, 62], [52, 74], [49, 84]].map(([x, y]) => c(x, y, 1.8, '#d8f0a0', 0)).join('')}
      ${p('M52 58 C42 56 36 60 32 66 C40 64 46 62 52 62z', '#7aaa52', 1.8)}
      ${[[33, 40, 13], [68, 36, 13], [51, 22, 14]].map(([x, y, r]) => `${p(`M${x - r} ${y + 4} C${x - r} ${y - r} ${x + r} ${y - r} ${x + r} ${y + 4} C${x + r * 0.5} ${y + r * 0.9} ${x - r * 0.5} ${y + r * 0.9} ${x - r} ${y + 4}z`, '#ebb44c')}${shade(`M${x - r} ${y + 4} C${x - r * 0.5} ${y + r * 0.9} ${x + r * 0.5} ${y + r * 0.9} ${x + r} ${y + 4} C${x} ${y + 9} ${x - r * 0.4} ${y + 8} ${x - r} ${y + 4}z`, 0.22)}${hi(`M${x - r * 0.6} ${y - 2} C${x - r * 0.4} ${y - r * 0.6} ${x} ${y - r * 0.75} ${x + r * 0.3} ${y - r * 0.7}`, 0.5)}`).join('')}`,

    // Fogmog: a walking mushroom with a red, green-spotted cap and a wide, grumpy face
    MISTMAW: `${ground(30)}${p('M33 90 C31 72 34 58 38 52 L64 52 C68 60 70 74 68 90z', '#d8bb8c')}
      ${p('M36 66 C28 66 24 72 24 78 C30 76 34 74 37 72z', '#c8a878', 2)}${p('M66 66 C74 66 78 72 78 78 C72 76 68 74 65 72z', '#c8a878', 2)}
      ${shade('M56 52 L64 52 C68 60 70 74 68 90 L58 90 C62 76 60 62 56 52z', 0.16)}
      ${p('M38 72 C44 78 56 78 62 72 C58 74 42 74 38 72z', '#4a2a1a', 1.8)}${teeth(42, 58, 73.5, 4, 2.4)}
      ${eye(42, 62, 3.4)}${eye(56, 62, 3.4)}${line('M38 57 L46 59 M60 57 L52 59', 2)}
      ${p('M13 54 C13 31 31 18 51 18 C73 18 90 32 88 54 C70 60 31 60 13 54z', '#c8412f')}
      ${[[30, 36, 5], [52, 28, 6], [72, 38, 5], [44, 46, 3.5], [64, 50, 3]].map(([x, y, r]) => c(x, y, r, '#7dbb4a', 1.6)).join('')}
      ${hi('M22 44 C24 34 32 26 42 22', 0.45, 2.4)}`,

    // Eye with Teeth: a pale, ghostly mouth with one staring eye, trailing wisps
    GLAREBUD: `${ground(16)}${tint('M50 22 C76 22 84 46 78 62 C72 76 28 76 22 62 C16 46 24 22 50 22z', '#cfeedd', 0.35)}
      ${['M38 62 Q32 76 42 88', 'M50 64 Q54 78 48 90', 'M62 62 Q70 74 62 86'].map((d) => line(d, 2.4, '#a6d8bf')).join('')}
      ${p('M26 48 C30 32 70 32 74 48 C70 64 30 64 26 48z', '#24342c')}${teeth(32, 68, 38.5, 7, 4.4)}${teeth(32, 68, 58, 7, -4.4)}
      ${eye(50, 48, 8.5, '#2c7a52')}`,

    // Inklet: a little ink-black cat-shaped blob with glowing crescent eyes
    BLOTLING: `${ground(22)}${rim('M28 90 C23 74 25 59 30 51 L26 30 L41 42 C47 40 54 40 60 42 L75 30 L71 51 C77 61 77 76 72 90 C66 86 62 92 56 88 C50 92 46 86 40 90 C36 86 32 92 28 90z')}${p('M28 90 C23 74 25 59 30 51 L26 30 L41 42 C47 40 54 40 60 42 L75 30 L71 51 C77 61 77 76 72 90 C66 86 62 92 56 88 C50 92 46 86 40 90 C36 86 32 92 28 90z', '#16121a')}
      ${p('M33 58 C37 52 45 52 47 58 C43 56 37 56 33 58z', '#eef27a', 1)}${p('M53 58 C57 52 65 52 67 58 C63 56 57 56 53 58z', '#eef27a', 1)}
      ${hi('M34 48 C38 44 44 43 48 43', 0.25, 2)}`,

    // Mawler: a hulking blue beast with a huge open jaw and a whip of a tail
    RIPJAW: `${ground(38)}${line('M82 52 C92 48 96 38 94 28', 7)}${line('M82 52 C92 48 96 38 94 28', 3.6, '#4a7c9c')}
      ${p('M70 76 L74 92 L86 92 L82 74z', '#4a7c9c')}${p('M31 52 C40 34 70 30 83 45 C91 55 89 72 80 79 L41 81 C33 77 29 66 31 52z', '#5a90b2')}
      ${shade('M36 72 C50 80 70 80 86 70 L80 79 L41 81z', 0.24)}${p('M44 36 l4 -7 4 6 4 -8 4 7 4 -7 3 7', '#a8c8dc', 1.8)}
      ${p('M30 74 L28 92 L42 92 L42 76z', '#4a7c9c')}${line('M28 92 l2 -3 M34 92 l1 -3 M40 92 l0 -3', 1.6)}
      ${p('M7 60 C7 46 19 38 33 42 C42 46 43 56 39 64 L37 74 C29 81 15 79 10 73z', '#6aa2c4')}
      ${p('M9 61 C17 56 30 56 38 62 L36 72 C28 77 16 76 11 71z', '#7a1e24', 1.8)}${teeth(11, 37, 61, 6, 4)}${teeth(12, 35, 72, 5, -3.6)}
      ${eye(22, 49, 3.4, '#c43a1a')}${line('M16 45 L28 47', 2.2)}${hi('M48 40 C58 36 70 38 78 44', 0.4)}`,

    // Vine Shambler: a hunched, mossy plant beast with long arms, thorns and a toothy maw
    THORNLURCH: `${ground(36)}${p('M44 70 L41 92 L51 92 L52 72z', '#6a7a32')}${p('M60 72 L62 92 L72 92 L68 70z', '#6a7a32')}
      ${p('M72 46 C82 56 84 76 80 92 L74 92 C74 78 70 64 64 56z', '#7a8a3a')}
      ${p('M27 40 C33 23 62 19 75 33 C83 43 81 62 72 73 L36 73 C27 63 23 51 27 40z', '#8c9c4a')}
      ${tint('M32 30 C42 22 60 20 70 28 C60 30 46 34 32 30z', '#5f7a2a', 0.8)}${shade('M54 26 C70 28 82 44 72 73 L58 73 C66 58 64 40 54 26z', 0.16)}
      ${['M40 24 l3 -7 2 7', 'M54 20 l3 -8 3 8', 'M68 26 l4 -7 1 8'].map((d) => p(d, '#5a3a1e', 1.4)).join('')}
      ${p('M30 46 C30 40 40 38 46 42 C46 52 40 58 32 58 C29 54 29 50 30 46z', '#3a1a10', 1.8)}${teeth(31, 45, 43, 4, 3.6)}
      ${p('M36 56 C26 62 18 74 16 90 L24 91 C26 78 32 68 40 62z', '#7a8a3a')}${line('M16 90 l-3 2 M20 91 l0 2 M24 91 l3 2', 1.8)}
      ${glow(47, 34, 2.4, '#e8d040')}${line('M70 40 C80 34 86 38 84 46', 1.8, '#4a6a22')}`,

    // Snapping Jaxfruit: a round red fruit with a leafy crown, bud stalks and a jagged grin
    SNAPGOURD: `${ground(26)}${['M44 40 Q36 26 38 14', 'M50 38 Q50 22 50 10', 'M56 40 Q64 26 62 14'].map((d) => line(d, 2.4, '#4a6a2a')).join('')}
      ${[[38, 13], [50, 9], [62, 13]].map(([x, y]) => c(x, y, 4.2, '#e88aa0', 1.8)).join('')}
      ${c(50, 64, 27, '#b63a4c')}${shade('M62 40 C78 48 82 70 70 86 C64 90 56 92 50 91 C66 82 72 60 62 40z', 0.2)}
      ${p('M30 44 C36 34 44 38 50 42 C56 36 64 34 70 44 C62 46 56 44 50 48 C44 44 38 46 30 44z', '#5a8a32', 2)}
      ${p('M32 68 L68 68 L64 74 L36 74z', '#3a0a14', 1.8)}${teeth(33, 67, 68, 7, 3.6)}${teeth(36, 64, 74, 6, -3)}
      ${hi('M30 56 C32 50 36 46 40 44', 0.5, 2.4)}`,

    // Slithering Strangler: a rearing maroon serpent with cream spots and a spiked grey head
    COILVINE: `${ground(30)}${line('M64 90 C86 88 86 72 68 68 C48 64 40 54 52 44 C61 37 58 28 48 24', 15)}${line('M64 90 C86 88 86 72 68 68 C48 64 40 54 52 44 C61 37 58 28 48 24', 10.5, '#8c2c26')}
      ${line('M44 90 L66 90', 15)}${line('M44 90 L66 90', 10.5, '#8c2c26')}
      ${[[72, 84], [78, 74], [62, 66], [48, 56], [54, 44], [52, 32]].map(([x, y]) => c(x, y, 1.7, '#f2dcb0', 0)).join('')}
      ${p('M49 25 C41 14 28 12 17 18 C25 22 29 28 33 31 C40 31 46 29 49 25z', '#9c9ca4')}
      ${p('M30 15 l2 -8 4 7 2 -9 4 9 3 -7 2 8', '#7a7a84', 1.6)}${glow(29, 21, 1.8, '#e8402a')}${line('M17 18 L25 24', 1.6)}`,

    // Bygone Effigy: a moss-flecked stone statue of a robed reaper on a plinth, eyes shut
    SLEEPING_IDOL: `${ground(28)}${line('M70 86 L71 8', 3.4)}${p('M71 8 C60 6 46 10 38 20 C50 16 60 16 70 18z', '#c4ccc4', 1.8)}
      ${p('M29 80 L71 80 L75 92 L25 92z', '#8a9188')}${p('M40 30 C40 22 60 22 60 30 L66 80 L34 80z', '#a9b1a5')}
      ${line('M50 34 L48 78 M56 36 L58 78', 1.4, '#7a8276')}${c(50, 20, 8.5, '#b6beb2')}${line('M44 20 l4 1 M52 21 l4 -1', 1.6)}
      ${p('M60 40 C66 42 70 46 70 52 L64 54z', '#a9b1a5', 2)}${tint('M36 62 C40 58 44 64 40 70z M58 50 C62 48 64 54 60 56z M30 84 C36 82 40 86 34 88z', '#6f8a4a', 0.85)}
      ${hi('M42 30 L38 76', 0.4, 2)}`,

    // Byrdonis: a long-legged green bird with a pink hooked beak, a crest and a fan of tail feathers
    CRAG_ROC: `${ground(24)}${line('M51 66 L47 81 L51 92 M47 92 L55 92', 2.6, '#6a6a5a')}${line('M60 66 L64 81 L60 92 M56 92 L64 92', 2.6, '#6a6a5a')}
      ${p('M72 47 L97 38 L92 49 L99 54 L76 59z', '#4a8a3a')}${p('M40 50 C44 37 66 35 75 45 C81 53 75 64 62 66 L48 66 C40 62 37 56 40 50z', '#6aac4c')}
      ${p('M56 44 C64 42 72 46 74 52 C66 52 60 50 56 44z', '#4a8a3a', 1.8)}
      ${p('M45 51 C38 41 34 29 30 23 C26 17 18 16 16 22 C20 24 24 30 28 36 C32 44 36 50 40 55z', '#7cbe5c')}
      ${p('M16 22 L5 27 L13 31 L19 26z', '#e8829a', 1.8)}${p('M24 17 l-2 -9 5 6 1 -9 4 9', '#4a8a3a', 1.6)}${eye(23, 21, 2.6, '#c8402a')}`,

    // Phrog Parasite: a bloated yellow-green orb of pustules on writhing tendrils
    BROOD_TOAD: `${ground(32)}${['M30 72 Q22 84 28 92', 'M40 76 Q38 88 44 92', 'M60 76 Q64 88 58 92', 'M70 72 Q80 82 74 92', 'M22 62 Q10 70 14 82', 'M78 62 Q90 68 88 80'].map((d) => line(d, 6) + line(d, 3, '#7a7a2a')).join('')}
      ${c(50, 48, 30, '#bcbc3c')}${shade('M66 24 C82 36 84 60 70 74 C60 80 46 80 38 78 C60 72 74 50 66 24z', 0.2)}
      ${[[34, 34, 4], [56, 24, 3.4], [68, 44, 4.6], [40, 60, 3.6], [58, 62, 3]].map(([x, y, r]) => c(x, y, r, '#8a8a20', 1.4) + c(x, y, r * 0.45, '#f0f080', 0)).join('')}
      ${eye(30, 48, 4.4, '#7a2a1a')}${eye(44, 44, 3.6, '#7a2a1a')}${p('M24 58 C30 64 40 64 46 58 C40 61 30 61 24 58z', '#3a2a10', 1.6)}
      ${hi('M30 26 C36 20 44 18 50 18', 0.5, 2.4)}`,

    // Wriggler: a knot of fat brown worms around a round mouth ringed with teeth
    SQUIRMER: `${ground(30)}${['M30 50 C14 46 10 60 20 66', 'M40 36 C34 18 50 14 54 26', 'M64 36 C72 20 88 30 80 42', 'M72 58 C90 58 92 76 78 78', 'M58 74 C60 90 44 92 42 80', 'M34 70 C20 82 12 72 18 64'].map((d) => line(d, 10) + line(d, 6.4, '#b88e4e')).join('')}
      ${c(50, 56, 19, '#a07a3e')}${c(50, 56, 13, '#2e1a10', 2)}
      ${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2, b = 0.3, r = 12.5, ri = 7; const pt = (t, rr) => `${(50 + Math.cos(t) * rr).toFixed(1)} ${(56 + Math.sin(t) * rr).toFixed(1)}`; return `<path d="M${pt(a - b, r)} L${pt(a, ri)} L${pt(a + b, r)}z" fill="#fbf3dc" stroke="${INK}" stroke-width="1"/>`; }).join('')}`,

    // Vantom: a dripping blot of living ink, flecked with sickly yellow-green
    SMEARWRAITH: `${ground(30)}${p('M78 34 C86 22 96 18 99 10 C94 24 90 34 82 42z', '#d8ec7a', 1.6)}
      ${rim('M20 70 C14 50 22 26 44 22 C66 18 84 34 82 56 C82 70 78 78 74 84 C70 78 66 86 60 82 C56 88 50 82 46 88 C42 82 36 86 34 80 C28 84 24 78 20 70z')}${p('M20 70 C14 50 22 26 44 22 C66 18 84 34 82 56 C82 70 78 78 74 84 C70 78 66 86 60 82 C56 88 50 82 46 88 C42 82 36 86 34 80 C28 84 24 78 20 70z', '#141018')}
      ${el(38, 48, 8.5, 6.5, '#d6ea78', 1.4)}${el(60, 38, 5, 4, '#d6ea78', 1.4)}${el(62, 62, 7, 5, '#d6ea78', 1.4)}${el(30, 66, 3.6, 2.8, '#d6ea78', 1.2)}
      ${hi('M28 40 C32 32 40 28 48 27', 0.2, 2.4)}`,

    // Ceremonial Beast: a pale stag with frosty antlers, a mossy mane and gold chains
    RITE_OX: `${ground(34)}${['M42 68 L40 92', 'M50 69 L50 92', 'M68 69 L70 92', 'M76 67 L80 92'].map((d) => line(d, 6) + line(d, 3, '#dfe6e8')).join('')}
      ${p('M33 54 C39 45 71 45 79 51 C86 58 83 69 74 71 L40 71 C33 67 31 60 33 54z', '#e8eef0')}${shade('M38 66 C52 72 70 72 82 64 L74 71 L40 71z', 0.14)}
      ${line('M36 58 C50 64 66 64 80 56', 1.8, '#c8a03a')}${[44, 54, 64, 74].map((x) => c(x, 61 + (x === 54 || x === 64 ? 1.6 : 0), 1.6, '#e8c050', 1)).join('')}
      ${p('M38 57 C34 46 30 38 24 34 C18 32 13 35 13 40 C15 44 20 46 24 48 C28 52 30 58 34 63z', '#eef4f6')}
      ${p('M30 46 C36 42 46 44 47 54 C41 61 34 58 30 46z', '#6a9a4a', 1.8)}${eye(21, 38, 2.4, '#3a6a8a')}
      ${line('M24 33 C21 24 25 15 30 8 M25 22 L18 16 M28 15 L35 10', 5)}${line('M24 33 C21 24 25 15 30 8 M25 22 L18 16 M28 15 L35 10', 2.6, '#a6cce0')}
      ${line('M29 34 C32 26 38 20 44 16 M35 25 L38 18 M40 19 L46 22', 5)}${line('M29 34 C32 26 38 20 44 16 M35 25 L38 18 M40 19 L46 22', 2.6, '#a6cce0')}`,

    // Kin Priest: a tall hooded priest in violet robes, a glowing orb on his staff
    CHOIR_ABBOT: `${ground(28)}${line('M24 91 L26 26', 3.6, '#5a3a1e')}${glow(26, 21, 5.4, '#c08af0')}
      ${p('M36 31 C38 23 62 23 64 31 L73 90 L27 90z', '#4a3a6c')}${shade('M52 26 L64 31 L73 90 L56 90z', 0.2)}
      ${line('M36 40 L32 90 M64 40 L68 90', 1.6, '#c8a03a')}${p('M44 46 L56 46 L54 90 L46 90z', '#6a5a90', 1.8)}
      ${p('M38 33 C35 19 44 8 50 5 C56 8 65 19 62 33 C56 37 44 37 38 33z', '#5a4a7e')}${el(50, 25, 7.5, 6.5, '#120c1a', 0)}
      ${glow(47, 25, 1.5, '#e0c0ff')}${glow(53, 25, 1.5, '#e0c0ff')}${p('M38 46 C32 46 28 42 26 36 L30 34 C33 39 37 41 42 41z', '#4a3a6c', 2)}`,

    // Kin Follower: a smaller hooded acolyte mid-dance, a curved blade raised
    CHOIR_NOVICE: `${ground(22)}${p('M14 30 C18 18 30 12 40 14 C32 18 26 24 24 32 L20 34z', '#d8dce4', 1.8)}
      ${p('M40 70 L34 91 L44 91 L48 72z', '#3a2e52')}${p('M54 72 L58 91 L68 91 L62 70z', '#3a2e52')}
      ${p('M38 40 C40 32 60 32 62 40 L66 74 L34 74z', '#6c5a90')}${shade('M52 36 L62 40 L66 74 L54 74z', 0.2)}
      ${line('M40 46 C30 42 24 36 22 32', 5)}${line('M40 46 C30 42 24 36 22 32', 2.6, '#6c5a90')}
      ${p('M40 38 C38 26 45 18 50 16 C55 18 62 26 60 38 C55 41 45 41 40 38z', '#7e6aa4')}${el(50, 31, 6, 5, '#120c1a', 0)}
      ${glow(47.5, 31, 1.2, '#e0c0ff')}${glow(52.5, 31, 1.2, '#e0c0ff')}${line('M42 56 L58 56', 1.6, '#c8a03a')}`,
  });

  // The raiders: bandits in rough gear, each with their own weapon.
  const SKIN = '#c8a07a';
  Object.assign(HD.FOE_ART, {
    // Axe Raider: green-grey mail, a round shield and a hand axe
    HATCHET: figure({ body: '#5a6a5a', legs: '#3a443a', skin: '#8aa07a',
      head: `${p('M40 24 C40 12 60 12 60 24 L56 22 L44 22z', '#4a544a')}${eye(46, 28, 2.2, '#a02a1a')}`,
      front: `${c(66, 52, 12, '#7a5a34')}${c(66, 52, 4, '#b8b0a0', 1.6)}${line('M36 48 L22 38', 3.4, '#5a3a1e')}${p('M22 38 C14 30 12 22 18 18 C22 24 28 28 30 32z', '#c4ccd0', 1.8)}` }),
    // Assassin Raider: a lean, cloaked duelist with a pointed helm and a long thin blade
    CUTTHROAT: figure({ cloak: '#3a4a5c', body: '#7a8a98', legs: '#2a3440', skin: SKIN,
      head: `${p('M41 26 C40 14 50 4 50 4 C50 4 60 14 59 26z', '#9aa4ac')}${line('M44 27 L56 27', 2.4)}`,
      front: `${line('M38 52 L8 82', 2.2, '#dfe4e8')}${line('M38 52 L33 57', 3.6, '#5a3a1e')}` }),
    // Brute Raider: a broad bruiser in red-brown leather with a spiked helm
    BRUISER: figure({ wide: true, body: '#8a4a3a', legs: '#4a2a22', skin: SKIN,
      head: `${p('M39 26 C39 12 61 12 61 26z', '#5a4a44')}${p('M44 14 l2 -7 2 7 M52 14 l2 -7 2 7', '#9aa0a4', 1.4)}${eye(46, 28, 2.2, '#3a1a10')}`,
      front: `${c(28, 62, 7, SKIN)}${c(72, 62, 7, SKIN)}${line('M30 42 L28 56 M70 42 L72 56', 6)}${line('M30 42 L28 56 M70 42 L72 56', 3.4, '#8a4a3a')}${line('M40 46 L60 60 M60 46 L40 60', 1.8, '#5a2a1e')}` }),
    // Crossbow Raider: a wide-brimmed hat and a loaded crossbow
    BOLTER: figure({ cloak: '#4a3e34', body: '#6a5a4a', legs: '#3a3028', skin: SKIN,
      head: `${p('M30 22 C38 18 62 18 70 22 L66 24 L34 24z', '#3a3028')}${p('M40 22 C40 10 60 10 60 22z', '#4a3e34')}`,
      front: `${line('M16 46 L50 48', 3.6, '#6a4a2a')}${p('M20 36 C14 42 14 52 20 58 L22 56 C18 50 18 44 22 38z', '#5a4a3a', 1.6)}${line('M20 37 L20 57', 1)}${line('M10 46 L20 46', 1.8, '#c4ccd0')}` }),
    // Tracker Raider: a hunched tracker crouched behind a bristling black hound
    HOUNDMASTER: `${ground(36)}${p('M66 60 L64 91 L72 91 L74 62z', '#3a3028')}${p('M60 36 C62 28 78 28 80 36 L82 66 L58 66z', '#6a5a40')}
      ${c(70, 24, 8, '#9a7a5a')}${p('M61 22 C62 12 78 12 79 22z', '#4a3e30')}
      ${rim('M14 68 C14 56 26 50 40 52 L62 56 C74 58 80 66 78 76 L74 92 L66 92 L64 80 L36 80 L32 92 L24 92 L24 80 C18 78 14 74 14 68z')}${p('M14 68 C14 56 26 50 40 52 L62 56 C74 58 80 66 78 76 L74 92 L66 92 L64 80 L36 80 L32 92 L24 92 L24 80 C18 78 14 74 14 68z', '#24201e')}
      ${p('M6 64 C8 56 16 52 24 56 L22 68 C16 70 10 70 6 64z', '#2e2a26')}${teeth(7, 20, 66, 4, 2.6)}${glow(16, 59, 1.6, '#e85a2a')}
      ${p('M30 52 l2 -6 3 5 3 -6 3 6 3 -5', '#3a3430', 1.4)}${line('M64 46 L40 58', 1.6, '#8a6a3a')}`,
  });

  // The small slimes are the big ones, shrunk.
  HD.FOE_ART.MOSS_OOZE_S = small(HD.FOE_ART.MOSS_OOZE, 0.68);
  HD.FOE_ART.BARK_OOZE_S = small(HD.FOE_ART.BARK_OOZE, 0.66);
})();

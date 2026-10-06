// Card art: original painted-style vignettes built from a small motif library. Output is cached as data URIs.
(function () {
  const HD = globalThis.HD;
  const S = '#1a0f0a'; // outline ink

  // Scene palettes per card type: [deep, mid, glow].
  const PAL = {
    Attack: [['#1e0a08', '#6e2016', '#ff9d4d'], ['#1a0c0c', '#7a2a1c', '#ffc35c'], ['#220b0e', '#5e1a24', '#ff7a55']],
    Skill: [['#0b1a1c', '#23504c', '#9fe6d2'], ['#0c1620', '#274a5e', '#a9d8ff'], ['#101a14', '#2e5a42', '#c8f0a8']],
    Power: [['#140c24', '#46286e', '#f3c65a'], ['#120a1e', '#3a2a6a', '#e7a8ff'], ['#1a0c1e', '#5a2a5e', '#ffb86b']],
    Status: [['#161512', '#4a463e', '#d8d0bf']],
    Curse: [['#0e080f', '#35193a', '#c0527e']],
    Token: [['#1a140a', '#5e4a24', '#ffd98a']],
  };

  // Motifs live in a 100x100 box centred on 50,50. Fills: M metal, L leather, K dark, G glow, B blood, W highlight.
  const M = 'url(#metal)', L = '#6b4226', K = '#2a1d17', G = 'url(#glowfill)', B = 'url(#bloodfill)', F = 'url(#fire)', W = 'rgba(255,255,255,.6)', R = 'url(#rock)';
  const st = (w = 2.5) => `stroke="${S}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const MOTIF = {
    sword: `<path d="M50 4 58 15V64H42V15Z" fill="${M}" ${st()}/><path d="M50 9V61" stroke="${W}" stroke-width="2"/>
      <path d="M28 63H72L67 71H33Z" fill="${K}" ${st()}/><rect x="45.5" y="71" width="9" height="16" rx="2" fill="${L}" ${st(2)}/><circle cx="50" cy="91" r="5.5" fill="${K}" ${st(2)}/>`,
    dagger: `<path d="M50 18 57 27V64H43V27Z" fill="${M}" ${st()}/><path d="M50 22V61" stroke="${W}" stroke-width="2"/>
      <path d="M34 63H66L62 70H38Z" fill="${K}" ${st()}/><rect x="45.5" y="70" width="9" height="15" rx="2" fill="${L}" ${st(2)}/>`,
    shield: `<path d="M50 6 85 17V45C85 70 69 86 50 95 31 86 15 70 15 45V17Z" fill="${M}" ${st(3)}/>
      <path d="M50 15 77 24V45C77 64 65 77 50 85 35 77 23 64 23 45V24Z" fill="${G}" ${st(1.5)}/>
      <path d="M30 34 50 48 70 34M30 50 50 64 70 50" fill="none" stroke="${K}" stroke-width="5" opacity=".55" stroke-linejoin="round"/><path d="M22 22 50 13" stroke="${W}" stroke-width="2.5"/>`,
    tower: `<path d="M20 8H80V70C80 82 66 92 50 96 34 92 20 82 20 70Z" fill="${M}" ${st(3)}/>
      <path d="M28 16H72V68C72 78 62 85 50 88 38 85 28 78 28 68Z" fill="${G}" ${st(1.5)}/>
      <circle cx="50" cy="48" r="10" fill="${K}" opacity=".5"/><path d="M26 12H74" stroke="${W}" stroke-width="2.5"/>`,
    hammer: `<rect x="45.5" y="32" width="9" height="62" rx="3" fill="${L}" ${st(2)}/>
      <path d="M16 12H84L88 22V38L84 46H16L12 38V22Z" fill="${M}" ${st(3)}/><path d="M18 19H82" stroke="${W}" stroke-width="2.5"/><path d="M30 12V46M70 12V46" stroke="${K}" stroke-width="2" opacity=".6"/>`,
    axe: `<rect x="46" y="8" width="8" height="88" rx="3" fill="${L}" ${st(2)}/>
      <path d="M53 12C80 6 96 30 90 56 82 46 68 44 53 46Z" fill="${M}" ${st(2.5)}/><path d="M88 52C91 34 82 18 62 14" fill="none" stroke="${W}" stroke-width="2.5"/>`,
    mace: `<rect x="46" y="44" width="8" height="52" rx="3" fill="${L}" ${st(2)}/>
      <path d="M50 6 56 18 68 14 66 26 78 30 68 38 74 48 62 48 58 58 50 50 42 58 38 48 26 48 32 38 22 30 34 26 32 14 44 18Z" fill="${M}" ${st(2.5)}/><circle cx="50" cy="32" r="11" fill="${K}" opacity=".35"/>`,
    flail: `<rect x="12" y="62" width="9" height="34" rx="3" fill="${L}" ${st(2)} transform="rotate(-30 16 79)"/>
      <path d="M24 62 34 50 44 42 54 36" fill="none" stroke="${K}" stroke-width="3" stroke-dasharray="5 3"/>
      <circle cx="66" cy="30" r="15" fill="${M}" ${st(2.5)}/><path d="M66 8V14M88 30H82M66 52V46M50 30H44M81 15 77 19M81 45 77 41M51 45 55 41M51 15 55 19" stroke="${S}" stroke-width="4"/>`,
    flame: `<path d="M50 5C63 25 81 34 77 60 75 80 63 94 50 94 36 94 23 82 23 63 23 47 33 39 38 27 42 39 46 43 50 46 54 32 50 20 50 5Z" fill="${F}" ${st(2)}/>
      <path d="M50 50C58 60 64 66 62 78 60 88 54 92 50 92 44 92 38 86 38 78 38 68 46 62 50 50Z" fill="#fff1b0" opacity=".9"/>`,
    fireball: `<path d="M18 82C30 60 44 40 70 22 60 40 58 48 60 56 70 46 80 42 90 40 80 58 70 78 50 88 36 94 22 92 18 82Z" fill="${F}" ${st(2)}/><circle cx="40" cy="72" r="13" fill="#fff1b0" opacity=".85"/>`,
    burst: `<path d="M50 4 58 32 84 14 68 40 96 46 68 56 86 82 58 68 50 96 42 68 14 82 32 56 4 46 32 40 16 14 42 32Z" fill="${G}" ${st(2)}/><circle cx="50" cy="50" r="12" fill="#fffbe8" opacity=".9"/>`,
    blood: `<path d="M50 6C61 30 77 46 77 65 77 81 65 93 50 93 35 93 23 81 23 65 23 46 39 30 50 6Z" fill="${B}" ${st(2.5)}/><path d="M36 64C36 56 40 50 44 46" fill="none" stroke="${W}" stroke-width="3"/>`,
    heart: `<path d="M50 90C20 68 7 52 7 34 7 19 19 9 32 9 40 9 46 13 50 21 54 13 60 9 68 9 81 9 93 19 93 34 93 52 80 68 50 90Z" fill="${B}" ${st(2.5)}/><path d="M22 28C24 20 30 17 36 18" fill="none" stroke="${W}" stroke-width="3"/>`,
    skull: `<path d="M50 6C28 6 14 22 14 42 14 54 20 62 28 66V80H72V66C80 62 86 54 86 42 86 22 72 6 50 6Z" fill="#e8dcc2" ${st(2.5)}/>
      <ellipse cx="36" cy="44" rx="9" ry="10" fill="${K}"/><ellipse cx="64" cy="44" rx="9" ry="10" fill="${K}"/><path d="M50 52 45 62H55Z" fill="${K}"/>
      <path d="M36 80V70M44 80V70M52 80V70M60 80V70" stroke="${S}" stroke-width="2.5"/><circle cx="36" cy="46" r="3" fill="${G}"/><circle cx="64" cy="46" r="3" fill="${G}"/>`,
    eye: `<path d="M4 50C20 26 36 18 50 18 64 18 80 26 96 50 80 74 64 82 50 82 36 82 20 74 4 50Z" fill="#efe4cc" ${st(2.5)}/>
      <circle cx="50" cy="50" r="22" fill="${G}" ${st(2)}/><circle cx="50" cy="50" r="10" fill="${K}"/><circle cx="43" cy="43" r="4" fill="#fff"/>`,
    horns: `<path d="M44 70C30 64 14 50 10 24 18 40 30 46 42 48Z" fill="#e8dcc2" ${st(2.5)}/><path d="M56 70C70 64 86 50 90 24 82 40 70 46 58 48Z" fill="#e8dcc2" ${st(2.5)}/>
      <path d="M30 60C40 76 60 76 70 60 66 84 34 84 30 60Z" fill="${K}" ${st(2)}/><circle cx="42" cy="66" r="3" fill="${G}"/><circle cx="58" cy="66" r="3" fill="${G}"/>`,
    anvil: `<path d="M8 28H72C82 28 92 34 94 40H72L66 52H34L28 40H14Z" fill="${M}" ${st(3)}/><path d="M36 52H64L70 78H30Z" fill="${K}" ${st(2.5)}/>
      <path d="M22 78H78V88H22Z" fill="${K}" ${st(2.5)}/><path d="M12 32H70" stroke="${W}" stroke-width="2.5"/>`,
    fist: `<path d="M26 36C26 28 32 24 38 26 40 20 48 18 52 24 56 18 64 18 66 26 72 22 80 26 80 34V62C80 78 68 90 52 90 36 90 26 80 26 66Z" fill="#d9a77e" ${st(2.5)}/>
      <path d="M38 26V44M52 24V44M66 26V44" stroke="${S}" stroke-width="2"/><path d="M26 50C34 46 42 48 46 56" fill="none" ${st(2)}/><path d="M30 64H78V74H30Z" fill="${L}" opacity=".8"/>`,
    helmet: `<path d="M16 60C16 28 30 10 50 10 70 10 84 28 84 60V84H16Z" fill="${M}" ${st(3)}/><path d="M26 48H74V58H26Z" fill="${K}"/>
      <path d="M50 10V84" stroke="${K}" stroke-width="3" opacity=".5"/><path d="M28 28C32 20 40 16 48 15" fill="none" stroke="${W}" stroke-width="2.5"/>`,
    crown: `<path d="M12 78 18 30 34 52 50 18 66 52 82 30 88 78Z" fill="url(#gold)" ${st(2.5)}/><rect x="12" y="74" width="76" height="12" rx="2" fill="url(#gold)" ${st(2)}/>
      <circle cx="50" cy="60" r="6" fill="${B}" ${st(1.5)}/>`,
    warhorn: `<path d="M8 72C30 72 48 60 62 38L66 30 86 44 80 52C64 72 40 86 12 86Z" fill="#e8dcc2" ${st(2.5)}/>
      <ellipse cx="76" cy="37" rx="12" ry="7" transform="rotate(35 76 37)" fill="${K}" ${st(2)}/><path d="M30 70 36 82M46 60 54 72" stroke="url(#gold)" stroke-width="5"/><rect x="4" y="72" width="8" height="14" rx="2" fill="url(#gold)" ${st(1.5)}/>`,
    rune: `<circle cx="50" cy="50" r="40" fill="none" stroke="${G}" stroke-width="4"/><circle cx="50" cy="50" r="30" fill="none" stroke="${G}" stroke-width="2" stroke-dasharray="6 5"/>
      <path d="M50 22V78M34 36 66 64M66 36 34 64" stroke="${G}" stroke-width="4"/>`,
    mountain: `<path d="M4 90 34 30 48 50 62 20 96 90Z" fill="${R}" ${st(2.5)}/><path d="M34 30 26 46 34 42 40 46ZM62 20 54 36 62 32 70 38Z" fill="#efe8da"/>`,
    boulder: `<path d="M14 70 20 38 40 18 66 20 86 38 90 66 72 88 34 90Z" fill="${R}" ${st(3)}/><path d="M40 30 48 50 42 62M66 40 60 56 70 70" fill="none" stroke="${S}" stroke-width="2.5"/><path d="M26 42C30 32 36 26 44 24" fill="none" stroke="${W}" stroke-width="2.5"/>`,
    coins: `<ellipse cx="38" cy="72" rx="24" ry="9" fill="url(#gold)" ${st(2)}/><ellipse cx="38" cy="62" rx="24" ry="9" fill="url(#gold)" ${st(2)}/><ellipse cx="62" cy="52" rx="24" ry="9" fill="url(#gold)" ${st(2)}/>
      <ellipse cx="62" cy="42" rx="24" ry="9" fill="url(#gold)" ${st(2)}/><ellipse cx="50" cy="30" rx="24" ry="9" fill="url(#gold)" ${st(2)}/>`,
    claw: `<path d="M22 8C40 30 44 62 30 92 34 62 30 34 22 8Z" fill="${G}" ${st(2)}/><path d="M46 6C64 30 66 64 52 94 56 64 54 32 46 6Z" fill="${G}" ${st(2)}/><path d="M70 8C86 32 88 62 76 90 80 62 78 34 70 8Z" fill="${G}" ${st(2)}/>`,
    maw: `<path d="M8 30C30 12 70 12 92 30L84 50H16Z" fill="${K}" ${st(2.5)}/><path d="M16 50H84L92 70C70 88 30 88 8 70Z" fill="${K}" ${st(2.5)}/>
      <path d="M20 32 26 46 32 30 38 46 44 28 50 46 56 28 62 46 68 30 74 46 80 32" fill="#efe4cc" ${st(1.5)}/><path d="M20 68 26 54 32 70 38 54 44 72 50 54 56 72 62 54 68 70 74 54 80 68" fill="#efe4cc" ${st(1.5)}/>`,
    wall: `<rect x="8" y="24" width="84" height="66" fill="${R}" ${st(3)}/><path d="M8 46H92M8 68H92M30 24V46M60 24V46M18 46V68M46 46V68M76 46V68M30 68V90M60 68V90" stroke="${S}" stroke-width="2.5"/>
      <path d="M8 24V14H22V24M38 24V14H52V24M68 24V14H82V24" fill="${R}" ${st(2.5)}/>`,
    banner: `<rect x="18" y="6" width="6" height="90" rx="2" fill="${L}" ${st(2)}/><path d="M24 12H84L72 34 84 56H24Z" fill="${B}" ${st(2.5)}/><circle cx="50" cy="34" r="8" fill="url(#gold)" ${st(1.5)}/>`,
    hourglass: `<path d="M22 8H78M22 92H78" stroke="${L}" stroke-width="7"/><path d="M28 12C28 36 46 44 46 50 46 56 28 64 28 88H72C72 64 54 56 54 50 54 44 72 36 72 12Z" fill="rgba(230,240,250,.25)" ${st(2.5)}/>
      <path d="M36 26H64C60 38 52 44 50 48 48 44 40 38 36 26ZM34 84C38 72 46 68 50 66 54 68 62 72 66 84Z" fill="url(#gold)"/>`,
    cards: `<rect x="14" y="20" width="40" height="58" rx="5" fill="#e8dcc2" ${st(2)} transform="rotate(-16 34 49)"/><rect x="30" y="16" width="40" height="58" rx="5" fill="#e8dcc2" ${st(2)}/>
      <rect x="46" y="20" width="40" height="58" rx="5" fill="#e8dcc2" ${st(2)} transform="rotate(16 66 49)"/><circle cx="50" cy="44" r="9" fill="${G}"/>`,
    uparrow: `<path d="M50 6 86 46H64V94H36V46H14Z" fill="${G}" ${st(3)}/><path d="M50 18 72 42" stroke="${W}" stroke-width="3"/>`,
    swirl: `<path d="M50 50C50 42 58 40 62 46 68 54 60 66 48 64 34 62 30 44 40 34 54 20 78 30 80 50 82 72 60 86 40 82 16 76 8 50 20 30" fill="none" stroke="${G}" stroke-width="7" stroke-linecap="round"/>
      <path d="M50 50C50 42 58 40 62 46 68 54 60 66 48 64 34 62 30 44 40 34 54 20 78 30 80 50 82 72 60 86 40 82 16 76 8 50 20 30" fill="none" stroke="${W}" stroke-width="2" stroke-linecap="round"/>`,
    bolt: `<path d="M58 4 22 54H46L36 96 80 40H54Z" fill="${G}" ${st(2.5)}/><path d="M56 12 32 48" stroke="${W}" stroke-width="2.5"/>`,
    cracked: `<path d="M4 64 30 56 52 62 74 54 96 62V96H4Z" fill="${R}" ${st(2.5)}/><path d="M50 62 44 76 54 84 48 96M52 62 66 74 62 88M44 76 30 82" fill="none" stroke="${S}" stroke-width="2.5"/>
      <path d="M26 44 22 34M38 38 36 26M62 38 66 26M74 44 80 34" stroke="${G}" stroke-width="4" stroke-linecap="round"/>`,
    orbs: `<circle cx="22" cy="60" r="12" fill="${G}" ${st(2)}/><circle cx="50" cy="30" r="12" fill="${M}" ${st(2)}/><circle cx="78" cy="60" r="12" fill="${B}" ${st(2)}/>
      <path d="M22 44C28 32 36 26 42 24M58 24C66 26 74 34 78 44" fill="none" stroke="${W}" stroke-width="2" stroke-dasharray="3 4"/>`,
    slime: `<path d="M10 84C10 60 24 40 40 34 46 22 60 20 66 32 84 40 92 62 90 84Z" fill="#7fae5a" ${st(2.5)}/><circle cx="40" cy="58" r="6" fill="${K}"/><circle cx="62" cy="56" r="6" fill="${K}"/>
      <path d="M30 42C34 36 40 34 44 34" fill="none" stroke="${W}" stroke-width="3"/>`,
    spores: `<circle cx="30" cy="36" r="14" fill="#a3b86c" ${st(2)}/><circle cx="66" cy="30" r="10" fill="#a3b86c" ${st(2)}/><circle cx="58" cy="66" r="18" fill="#a3b86c" ${st(2)}/><circle cx="24" cy="76" r="8" fill="#a3b86c" ${st(2)}/>
      <circle cx="26" cy="32" r="3" fill="${K}"/><circle cx="52" cy="60" r="4" fill="${K}"/><circle cx="64" cy="70" r="3" fill="${K}"/><circle cx="68" cy="28" r="2.5" fill="${K}"/>`,
    bone: `<path d="M22 70 58 34" stroke="#e8dcc2" stroke-width="14" stroke-linecap="round"/><path d="M22 70 58 34" stroke="${S}" stroke-width="18" stroke-linecap="round" opacity=".0"/>
      <circle cx="16" cy="70" r="9" fill="#e8dcc2" ${st(2)}/><circle cx="22" cy="78" r="9" fill="#e8dcc2" ${st(2)}/><circle cx="60" cy="26" r="9" fill="#e8dcc2" ${st(2)}/><circle cx="68" cy="32" r="9" fill="#e8dcc2" ${st(2)}/>
      <path d="M38 48 46 54 42 58 50 62" fill="none" stroke="${S}" stroke-width="2.5"/><path d="M60 62 84 86" stroke="#e8dcc2" stroke-width="12" stroke-linecap="round" opacity=".7"/>`,
    tentacle: `<path d="M20 94C20 70 34 62 40 50 48 34 34 24 46 12 58 2 74 12 66 24 60 34 50 30 54 42 58 56 76 60 78 80 80 90 74 96 66 94" fill="none" stroke="#6e3a6e" stroke-width="12" stroke-linecap="round"/>
      <path d="M20 94C20 70 34 62 40 50 48 34 34 24 46 12 58 2 74 12 66 24" fill="none" stroke="${W}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`,
    roots: `<path d="M50 4C48 30 52 46 50 60M50 60C40 70 26 72 12 90M50 60C58 72 72 76 88 92M50 40C38 44 30 38 20 42M50 34C60 38 70 30 82 34M50 60V96" fill="none" stroke="#8a6a3e" stroke-width="7" stroke-linecap="round"/>
      <path d="M50 4C48 30 52 46 50 60" fill="none" stroke="${G}" stroke-width="2.5"/>`,
    mask: `<path d="M16 22C30 14 70 14 84 22 88 50 76 80 50 92 24 80 12 50 16 22Z" fill="#e8dcc2" ${st(2.5)}/><path d="M24 40 44 48 26 52ZM76 40 56 48 74 52Z" fill="${K}"/>
      <path d="M36 72C44 66 56 66 64 72" fill="none" ${st(3)}/><path d="M22 34 44 42M78 34 56 42" ${st(3)}/>`,
    tear: `<path d="M50 8C60 30 74 46 74 64 74 80 64 90 50 90 36 90 26 80 26 64 26 46 40 30 50 8Z" fill="#8fb4d8" ${st(2.5)}/><path d="M38 62C38 54 42 48 46 44" fill="none" stroke="${W}" stroke-width="3"/>`,
    question: `<path d="M30 34C30 20 40 10 52 10 66 10 74 20 74 32 74 46 56 50 56 64V70" fill="none" stroke="${G}" stroke-width="12" stroke-linecap="round"/><circle cx="56" cy="88" r="7" fill="${G}"/>`,
    clock: `<circle cx="50" cy="50" r="40" fill="#e8dcc2" ${st(3)}/><path d="M50 18V24M50 76V82M18 50H24M76 50H82" stroke="${S}" stroke-width="3"/><path d="M50 50V28M50 50 66 58" stroke="${S}" stroke-width="4"/>`,
    scroll: `<path d="M20 16H76V84H20Z" fill="#e8dcc2" ${st(2.5)}/><path d="M14 12H26V24H14ZM70 76H82V88H70Z" fill="#cdbb95" ${st(2)}/>
      <path d="M30 32H66M30 42H66M30 52H58M30 62H62" stroke="${K}" stroke-width="2.5" opacity=".6"/><circle cx="60" cy="72" r="7" fill="${B}" ${st(1.5)}/>`,
    chains: `<rect x="12" y="38" width="30" height="18" rx="9" fill="none" stroke="${M}" stroke-width="7"/><rect x="36" y="38" width="30" height="18" rx="9" fill="none" stroke="${M}" stroke-width="7" transform="rotate(20 51 47)"/>
      <rect x="58" y="44" width="30" height="18" rx="9" fill="none" stroke="${M}" stroke-width="7"/>`,
    cloak: `<path d="M30 10H70L86 92C68 84 58 90 50 84 42 90 32 84 14 92Z" fill="${B}" ${st(2.5)}/><path d="M30 10C36 22 64 22 70 10" fill="${K}" ${st(2)}/><circle cx="50" cy="18" r="5" fill="url(#gold)"/>`,
    pyre: `<path d="M14 88 86 72M14 72 86 88M20 80 80 80" stroke="${L}" stroke-width="9" stroke-linecap="round"/>
      <path d="M50 8C60 26 74 34 70 56 68 70 60 76 50 76 38 76 30 68 30 56 30 42 38 36 42 26 46 36 48 38 50 40 52 28 50 20 50 8Z" fill="${F}" ${st(2)}/>`,
    egg: `<ellipse cx="50" cy="54" rx="30" ry="38" fill="#efe4cc" ${st(2.5)}/><circle cx="40" cy="40" r="4" fill="#a38a6a"/><circle cx="60" cy="58" r="5" fill="#a38a6a"/><circle cx="46" cy="72" r="3" fill="#a38a6a"/><path d="M34 34C38 26 44 22 50 21" fill="none" stroke="${W}" stroke-width="3"/>`,
    moon: `<path d="M62 8C40 12 26 30 26 52 26 74 42 92 64 94 48 84 40 70 40 52 40 32 50 16 62 8Z" fill="url(#glowfill)" ${st(2.5)}/><circle cx="74" cy="30" r="3" fill="#fffbe8"/><circle cx="82" cy="54" r="2" fill="#fffbe8"/><circle cx="70" cy="74" r="2.5" fill="#fffbe8"/>`,
    shards: `<path d="M50 6 58 36 44 34Z" fill="${M}" ${st(2)}/><path d="M60 42 90 34 72 58Z" fill="${M}" ${st(2)}/><path d="M42 44 12 38 30 60Z" fill="${M}" ${st(2)}/><path d="M50 60 60 94 40 90Z" fill="${M}" ${st(2)}/><circle cx="50" cy="48" r="7" fill="#fffbe8"/>`,
  };

  // Overlay effects drawn on top of the motif.
  const FX = {
    slash: (g) => `<path d="M12 104C60 70 120 40 196 14" fill="none" stroke="${g}" stroke-width="7" stroke-linecap="round" opacity=".55"/><path d="M20 106C66 76 124 46 194 22" fill="none" stroke="#fff" stroke-width="2" opacity=".75"/>`,
    speed: (g) => [22, 40, 58, 80, 98].map((y, i) => `<path d="M${6 + i * 5} ${y}H${58 - i * 4}" stroke="${g}" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>`).join(''),
    sparks: (g, r) => Array.from({ length: 14 }, () => `<circle cx="${(20 + r() * 160).toFixed(1)}" cy="${(10 + r() * 100).toFixed(1)}" r="${(0.8 + r() * 2.2).toFixed(1)}" fill="${g}" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`).join(''),
    ring: (g) => `<ellipse cx="100" cy="64" rx="70" ry="48" fill="none" stroke="${g}" stroke-width="2" opacity=".5"/><ellipse cx="100" cy="64" rx="84" ry="58" fill="none" stroke="${g}" stroke-width="1" opacity=".3" stroke-dasharray="6 6"/>`,
    drops: (g, r) => Array.from({ length: 6 }, () => { const x = 30 + r() * 140, y = 20 + r() * 80, s = 0.18 + r() * 0.14; return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)}) translate(-50 -50)" d="M50 6C61 30 77 46 77 65 77 81 65 93 50 93 35 93 23 81 23 65 23 46 39 30 50 6Z" fill="#9e1b1b" opacity=".85"/>`; }).join(''),
    ash: (g, r) => Array.from({ length: 22 }, () => `<rect x="${(r() * 200).toFixed(1)}" y="${(r() * 128).toFixed(1)}" width="${(1 + r() * 3).toFixed(1)}" height="${(1 + r() * 2).toFixed(1)}" fill="#cfc6b8" opacity="${(0.25 + r() * 0.5).toFixed(2)}" transform="rotate(${(r() * 90).toFixed(0)})"/>`).join(''),
    aura: (g) => `<circle cx="100" cy="62" r="56" fill="url(#aura)"/>`,
    quake: (g) => `<path d="M10 116 40 108 64 118 96 106 130 118 160 108 190 116" fill="none" stroke="${g}" stroke-width="3" opacity=".7"/>`,
  };

  // Composition per card: [main motif, second motif or null, effects, main rotation].
  const ART = {
    CUT: ['sword', null, ['slash'], 38], BRACE: ['shield', null, ['ring'], 0], CRACK: ['hammer', 'burst', ['speed'], -24],
    WILDFIRE: ['flame', 'sword', ['sparks'], 0], TEMPER_STEEL: ['anvil', 'hammer', ['sparks'], 0], BLOOD_BULWARK: ['shield', null, ['drops', 'ring'], 0],
    OPEN_VEIN: ['blood', 'dagger', ['drops'], 0], SHIELD_RUSH: ['shield', null, ['speed'], -18], BULL_CHARGE: ['horns', 'burst', ['speed'], 0],
    COAL_SWING: ['mace', 'flame', ['sparks'], 28], RECKLESS_DRAW: ['cards', 'flame', ['sparks'], 0], BROW_SMASH: ['helmet', 'burst', ['speed'], -12],
    GUARDED_SWING: ['shield', 'sword', ['slash'], 0], SLAG_FIST: ['fist', 'flame', ['sparks'], 0], HONED_CUT: ['sword', null, ['aura', 'sparks'], 0],
    HILT_CUT: ['sword', 'burst', ['speed'], 200], FEINT_CUT: ['sword', 'uparrow', ['slash'], 30], GRIT_TEETH: ['shield', null, ['speed'], 12],
    RICOCHET_BLADE: ['swirl', 'dagger', ['sparks'], 0], GROUND_SLAM: ['bolt', 'cracked', ['quake'], 0], MENACE: ['eye', null, ['quake', 'ring'], 0],
    SCORCHED_GUARD: ['shield', 'flame', ['sparks'], 0], TWIN_CUT: ['sword', 'sword', ['slash'], 32], ASHEN_CUT: ['sword', null, ['ash', 'slash'], 38],
    WAR_FOCUS: ['eye', 'cards', ['aura'], 0], ANVIL_DROP: ['hammer', null, ['speed', 'quake'], 18], PICK_ON: ['fist', 'eye', ['speed'], 0],
    KINDLING_PACT: ['scroll', 'flame', ['sparks'], 0], STONE_STANCE: ['mountain', null, ['ring'], 0], SHARED_SCAR: ['heart', 'heart', ['ring'], 0],
    PRY_APART: ['claw', 'shards', ['slash'], 0], LOOM_OVER: ['crown', 'eye', ['aura'], 0], WAR_HORN: ['warhorn', null, ['speed'], 0],
    SMOLDER_GAZE: ['eye', 'flame', ['sparks'], 0], ROLL_UP_SLEEVES: ['fist', 'uparrow', ['aura'], 0], NUMB_FLESH: ['heart', 'chains', ['ash'], 0],
    COME_AT_ME: ['fist', 'fist', ['speed'], -10], FIRE_WALL: ['shield', 'flame', ['ring', 'sparks'], 0], OLD_RITE: ['rune', null, ['aura', 'sparks'], 0],
    BLOOD_LASH: ['swirl', 'blood', ['drops'], 0], ASH_WAIL: ['skull', null, ['ash', 'speed'], 0], CONJURED_EDGE: ['sword', 'flame', ['sparks'], 25],
    FEVER: ['flame', 'flame', ['sparks', 'aura'], 0], HEAT_UP: ['flame', 'uparrow', ['aura'], 0], SHOWBOAT: ['orbs', 'dagger', ['sparks'], 0],
    PLUNDER: ['coins', 'dagger', ['sparks'], 0], SEETHE: ['mask', 'flame', ['aura'], 0], ESCALATE: ['axe', null, ['slash', 'speed'], 24],
    SPLIT_SKIN: ['heart', 'shards', ['drops'], 0], CLEAR_HANDS: ['swirl', 'shield', ['speed'], 0], GRUDGE: ['dagger', 'blood', ['drops'], 30],
    FRENZY_MARCH: ['horns', 'horns', ['speed', 'quake'], 0], CRUSHING_STAMP: ['cracked', 'boulder', ['quake'], 0], IRON_SKIN: ['helmet', null, ['ring'], 0],
    PROVOKE: ['banner', 'eye', ['ring'], 0], KEEP_SWINGING: ['axe', null, ['speed', 'slash'], -20], RISING_BLOW: ['fist', 'uparrow', ['speed'], 0],
    BLOODHOUND: ['claw', 'eye', ['drops'], 0], CYCLONE_SWING: ['swirl', 'sword', ['sparks'], 0], HUNGER_FOR_MORE: ['maw', null, ['aura'], 0],
    RAMPART: ['wall', null, ['ring'], 0], SEARING_MARK: ['rune', 'flame', ['sparks'], 0], AVALANCHE: ['boulder', 'boulder', ['quake', 'speed'], 12],
    FIRESTORM: ['fireball', 'flame', ['sparks', 'aura'], 0], RED_CLOAK: ['cloak', null, ['aura'], 0], MERCILESS: ['skull', 'dagger', ['aura'], 0],
    ASH_HARVEST: ['skull', 'swirl', ['ash'], 0], HELLBOUND: ['horns', 'flame', ['aura', 'sparks'], 0], DEVOUR: ['maw', 'heart', ['drops'], 0],
    BONFIRE: ['pyre', 'skull', ['sparks', 'aura'], 0], ENDLESS_CUTS: ['sword', 'sword', ['aura', 'sparks'], 0], UNBREAKABLE: ['tower', null, ['aura', 'ring'], 0],
    SIEGE_ENGINE: ['helmet', 'burst', ['aura'], 0], MAIM: ['claw', null, ['drops', 'slash'], 0], NOT_TODAY: ['heart', 'hourglass', ['aura'], 0],
    BLOOD_TITHE: ['heart', 'cards', ['drops', 'aura'], 0], ECHO_SWING: ['fist', 'fist', ['speed', 'aura'], 12], FINAL_EMBER: ['hourglass', 'flame', ['ash'], 0],
    EARTHSHAPER: ['boulder', 'fist', ['aura'], 0], HEARTH: ['pyre', null, ['aura', 'sparks'], 0], FEED_THE_FLAMES: ['flame', 'cards', ['sparks'], 0],
    TAKE_THE_HITS: ['tower', 'heart', ['ring'], 0], SCAR_TISSUE: ['claw', 'blood', ['drops'], 0], FLAIL_ABOUT: ['flail', null, ['speed'], 0],
    STAND_FIRM: ['mountain', 'shield', ['aura'], 0], SPLINTER: ['shards', 'hammer', ['aura', 'sparks'], 0], ROT_OATH: ['skull', 'tentacle', ['ash', 'aura'], 0],
    BOULDER: ['boulder', null, ['speed'], 0], SLUDGE: ['slime', null, [], 0], REELING: ['swirl', null, ['sparks'], 0], BLIGHT: ['spores', null, ['ash'], 0],
    AVARICE: ['coins', null, ['sparks'], 0], SPRAIN: ['bone', null, [], 0], FUMBLE: ['cards', 'swirl', [], 0], MILDEW: ['skull', 'spores', ['ash'], 0],
    MISGIVING: ['question', null, ['ash'], 0], ROUTINE: ['clock', null, [], 0], REMORSE: ['tear', null, ['ash'], 0], DISGRACE: ['mask', null, [], 0],
    SQUIRM: ['tentacle', null, [], 0], ROOT_FURY: ['roots', 'burst', ['aura', 'sparks'], 0],
    DEEP_NIGHT: ['moon', 'sword', ['aura', 'ash'], 0],
    VENOM: ['blood', 'spores', ['drops'], 0],
    JAB: ['dagger', null, ['slash'], 30], EVADE: ['shield', null, ['speed'], 0], HAMSTRING: ['dagger', 'chains', ['slash'], 20],
    ENDURE: ['shield', 'cards', ['ring'], 0], SLIVER: ['dagger', null, ['speed'], 40], KNIFE_FAN: ['dagger', 'dagger', ['speed', 'sparks'], 0],
    TOSS_BLADE: ['dagger', 'cards', ['speed'], 45], TUMBLE_CUT: ['swirl', 'dagger', ['slash'], 0], OPENING_JAB: ['dagger', 'dagger', ['slash'], 15],
    VENOM_STAB: ['dagger', 'tear', ['drops'], 30], PROWLER: ['eye', 'claw', ['slash'], 0], REBOUND: ['dagger', 'swirl', ['speed'], 0],
    NICK: ['dagger', null, ['slash'], 60], LOW_BLOW: ['fist', 'dagger', ['quake'], 0], READ_AHEAD: ['eye', 'hourglass', ['aura'], 0],
    HANDSPRING: ['uparrow', 'shield', ['speed'], 0], KNIFE_FLURRY: ['dagger', 'dagger', ['sparks', 'speed'], 10], CLOAK_KNIFE: ['mask', 'dagger', ['ash'], 0],
    LETHAL_DOSE: ['tear', 'skull', ['drops'], 0], PARRY: ['sword', 'shield', ['sparks'], 0], DUCK_ROLL: ['shield', 'swirl', ['speed'], 0],
    KEENING: ['mask', 'burst', ['ring'], 0], READY_UP: ['cards', 'hourglass', ['aura'], 0], ADDER_BITE: ['claw', 'tear', ['drops'], 0],
    SLIP_AWAY: ['mask', 'shield', ['speed', 'ash'], 0], BACK_KNIFE: ['dagger', 'mask', ['slash'], 35], DART_IN: ['dagger', 'shield', ['speed'], 20],
    RINGING_SLASH: ['sword', 'burst', ['slash', 'ring'], 60], COUP: ['crown', 'dagger', ['slash'], 0], DARTS: ['dagger', 'cards', ['speed'], 0],
    LAST_RITES: ['skull', 'cards', ['ash'], 0], NEEDLEPOINT: ['dagger', 'eye', ['sparks'], 50], LUNGE: ['claw', 'uparrow', ['speed'], 0],
    CLEAN_CUT: ['sword', null, ['slash'], 40], IMPALE: ['sword', 'dagger', ['drops'], 70], GARROTE: ['chains', 'skull', ['ring'], 0],
    QUICKENING: ['tear', 'hourglass', ['drops', 'aura'], 0], STEADY_AIM: ['eye', 'dagger', ['aura'], 0], LIGHT_FEET: ['uparrow', 'swirl', ['speed', 'aura'], 0],
    ENDLESS_KNIVES: ['dagger', 'swirl', ['aura'], 0], FOUL_FUMES: ['spores', 'tear', ['ash'], 0], GHOST_KNIVES: ['dagger', 'mask', ['aura'], 0],
    QUICKSILVER: ['bolt', 'cards', ['speed'], 0], SOMERSAULT: ['swirl', 'cards', ['speed'], 0], SMEAR: ['shield', 'mask', ['ash'], 0],
    LOBBED_VIAL: ['tear', 'swirl', ['drops'], 0], FESTER: ['spores', 'blood', ['drops'], 0], LONG_ODDS: ['cards', 'question', ['sparks'], 0],
    EXIT_PLAN: ['scroll', 'uparrow', ['speed'], 0], PRACTICED: ['cards', 'rune', ['aura'], 0], LAY_BARE: ['eye', 'cracked', ['sparks'], 0],
    SLEIGHT: ['cards', 'mask', ['sparks'], 0], MIASMA_CLOUD: ['spores', 'skull', ['ash'], 0], SLEEVE_KNIVES: ['dagger', 'cards', ['speed'], 25],
    TRIP: ['claw', 'shield', ['quake'], 0], SHIMMER: ['mask', 'tear', ['aura'], 0], REFLEXES: ['eye', 'cards', ['speed'], 0],
    SIDLE: ['mask', 'bolt', ['aura'], 0], PLANNER: ['scroll', 'bolt', ['aura'], 0], HIDDEN_STASH: ['dagger', 'coins', ['sparks'], 0],
    SILENT_KILL: ['dagger', 'skull', ['slash'], 40], CURTAIN_CALL: ['burst', 'skull', ['sparks', 'aura'], 0],
    SLAUGHTER: ['sword', 'blood', ['drops', 'slash'], 50], THE_CHASE: ['claw', 'eye', ['speed'], 0], ROUGH_HIDE: ['claw', 'shield', ['ring'], 0],
    ECHO_IMAGE: ['mask', 'mask', ['aura'], 0], VENOMOUS: ['tear', 'claw', ['drops', 'aura'], 0], KNIFE_WHEEL: ['swirl', 'dagger', ['sparks'], 0],
    MASTERMIND: ['crown', 'cards', ['aura'], 0], COILED_FORM: ['tentacle', 'eye', ['aura'], 0], TRADE_TOOLS: ['anvil', 'cards', ['sparks'], 0],
    HUNTERS_MARK: ['eye', 'rune', ['aura'], 0], CAREFUL_PLANS: ['scroll', 'hourglass', ['aura'], 0], RUSH: ['bolt', 'uparrow', ['speed', 'sparks'], 0],
    INK_BLADES: ['dagger', 'tear', ['drops'], 0], SLOW_TIME: ['hourglass', 'cards', ['aura'], 0], DOUBLE_TAKE: ['cards', 'cards', ['sparks'], 0],
    ACID_TIDE: ['tear', 'spores', ['drops', 'speed'], 0], BLADE_TRAP: ['dagger', 'chains', ['sparks'], 0], WASTING: ['skull', 'tear', ['ash'], 0],
    BAD_DREAM: ['moon', 'mask', ['ash'], 0], PLAGUE: ['spores', 'skull', ['drops', 'ash'], 0], SHADOW_MERGE: ['mask', 'shield', ['aura'], 0],
    SHADE_STEP: ['mask', 'claw', ['speed', 'ash'], 0], STEEL_RAIN: ['dagger', 'dagger', ['speed', 'sparks'], 70], SUBDUE: ['fist', 'chains', ['quake'], 0],
    SPECTER_FORM: ['mask', null, ['aura', 'ash'], 0],
    APEX: ['crown', 'uparrow', ['aura', 'sparks'], 0], GLOWSHARD: ['orbs', 'bolt', ['aura'], 0], UNWIND: ['hourglass', 'shield', ['aura'], 0],
    MAULING: ['claw', 'claw', ['slash'], 0], BEAST_CALL: ['warhorn', 'claw', ['quake'], 0], ASHFALL: ['flame', null, ['ash'], 0],
    WHITE_FLAME: ['flame', 'bolt', ['aura', 'sparks'], 0], SPELLBOUND: ['eye', 'chains', ['ash'], 0], PHANTASM: ['mask', null, ['aura', 'ash'], 0],
    FOOLISHNESS: ['mask', 'question', ['ash'], 0], HOPE_CARD: ['cards', 'rune', ['sparks'], 0],
    PEST_SWEEP: ['claw', 'swirl', ['sparks', 'speed'], 0], STOMP_FLAT: ['fist', 'boulder', ['quake'], 0], SHED_SKIN: ['swirl', 'claw', ['ash'], 0],
    CLARITY: ['eye', 'rune', ['aura'], 0], ILL_FORTUNE: ['skull', 'coins', ['ash'], 0], LAMP_KEY_CARD: ['flame', 'rune', ['aura'], 0],
    ODD_DEVICE: ['anvil', 'bolt', ['sparks'], 0], ODD_DEVICE_S: ['shield', 'bolt', ['sparks'], 0], ODD_DEVICE_P: ['clock', 'bolt', ['aura'], 0],
    GRAND_ARRIVAL: ['burst', 'crown', ['sparks', 'aura'], 0], BRAWL: ['fist', 'shield', ['speed'], 0], QUICK_FLASH: ['dagger', 'cards', ['slash'], 30],
    THOUGHT_LANCE: ['eye', 'bolt', ['aura'], 0], SWEEPING_EDGE: ['sword', null, ['slash', 'speed'], 70], SEEKING_CUT: ['sword', 'eye', ['slash'], 35],
    HUMMING_HATCHET: ['axe', 'swirl', ['speed'], 20], FINAL_CUT: ['sword', null, ['aura', 'slash'], 25], ARROW_STORM: ['dagger', 'dagger', ['speed', 'sparks'], 0],
    CLOCKWORK_RHYTHM: ['clock', 'cards', ['aura'], 0], STRAP_DOWN: ['shield', 'chains', ['ring'], 0], FLOURISH: ['sword', 'burst', ['sparks', 'aura'], 0],
    WARM_UP: ['fist', 'flame', ['aura'], 0], KNACK: ['uparrow', 'shield', ['aura'], 0], SCHEME: ['scroll', 'cards', ['aura'], 0],
    UPHEAVAL: ['cards', 'burst', ['sparks'], 0], GRIM_SHACKLES: ['chains', 'skull', ['ash'], 0], FIND: ['eye', 'cards', ['sparks'], 0],
    STEADY_STANCE: ['shield', 'hourglass', ['ring'], 0], LIGHT_FOOTWORK: ['shield', 'cards', ['speed'], 0], ITCHY_HANDS: ['fist', 'cards', ['speed'], 0],
    ODD_JOB: ['anvil', 'question', ['sparks'], 0], DUCK_AND_COVER: ['tower', null, ['ring', 'speed'], 0], OUTPUT: ['bolt', 'clock', ['aura'], 0],
    HOLD_THE_LINE: ['wall', 'hourglass', ['ring'], 0], CLEANSE: ['tear', 'flame', ['sparks'], 0], FIDGET: ['swirl', 'cards', ['speed'], 0],
    CONCUSSION: ['burst', 'eye', ['quake'], 0], FUSE_BOMB: ['fireball', 'hourglass', ['sparks'], 0], PLAN_AHEAD: ['scroll', 'eye', ['aura'], 0],
    FINAL_BRACE: ['tower', null, ['aura', 'ring'], 0], WEIGHTED_CORD: ['orbs', 'chains', ['speed'], 0], GILDED_AXE: ['axe', 'coins', ['sparks'], 25],
    GRASPING_HAND: ['fist', 'coins', ['sparks'], 0], WINDFALL: ['coins', 'cards', ['sparks', 'aura'], 0], TEAR_OPEN: ['claw', 'eye', ['drops'], 0],
    BARRAGE: ['dagger', 'cards', ['speed'], 20], CHAOS_ENGINE: ['swirl', 'sword', ['sparks', 'aura'], 0], UNRAVEL: ['swirl', 'question', ['ash'], 0],
    AGELESS_MAIL: ['helmet', 'hourglass', ['ring'], 0], FRENZIED_HANDS: ['fist', 'cards', ['sparks', 'speed'], 0], OLD_HABITS: ['hourglass', 'cards', ['ash'], 0],
    LANDSLIDE: ['boulder', 'boulder', ['quake', 'speed'], 0], BREW_UP: ['tear', 'flame', ['sparks'], 0], CHOSEN_FEW: ['crown', 'cards', ['aura'], 0],
    PUMMEL_SPREE: ['fist', 'fist', ['speed', 'sparks'], 0], BURIED_GEM: ['orbs', 'cracked', ['sparks'], 0], GRAND_PLAN: ['scroll', 'crown', ['aura'], 0],
    FRANTIC_NOTES: ['scroll', 'swirl', ['speed'], 0], HIDDEN_FORM: ['mask', 'cards', ['ash'], 0], HIDDEN_BLADE: ['dagger', 'mask', ['ash'], 30],
    ALL_IN: ['coins', 'skull', ['aura'], 0], SCRAMBLE: ['cracked', 'uparrow', ['speed'], 0], BELL_TOLL: ['clock', 'chains', ['ash'], 0],
    SCORCH: ['flame', null, ['sparks'], 0], GASH: ['claw', 'blood', ['drops'], 0],
    SPORE_HAZE: ['spores', 'skull', ['ash'], 0], RESTLESS_NIGHT: ['moon', 'tear', ['ash'], 0], GUILT: ['mask', 'chains', ['ash'], 0],
    ROC_EGG: ['egg', null, ['aura'], 0], TREASURE_MAP: ['scroll', 'coins', ['sparks'], 0], PECKING: ['claw', 'burst', ['speed'], 0],
    BARK_RING: ['rune', 'shield', ['ring'], 0], CHICK_SWOOP: ['egg', 'claw', ['speed', 'sparks'], 0], SPREADING_RAGE: ['flame', 'burst', ['speed', 'sparks'], 0], KINDLE_ALLY: ['flame', 'uparrow', ['aura'], 0],
    // the Unburied
    RAKE: ['claw', null, ['slash'], 0], BONE_WARD: ['shield', 'bone', ['ring'], 0], HAND_UP: ['claw', 'uparrow', ['aura'], 0], LET_LOOSE: ['claw', 'burst', ['speed'], 0],
    WRAITH: ['mask', 'swirl', ['ash', 'aura'], 0], SWEEPING_GLARE: ['eye', 'claw', ['speed'], 0],
    HEREAFTER: ['skull', 'uparrow', ['aura'], 0], ROT_RAKE: ['claw', 'spores', ['slash', 'ash'], 0], DESECRATE: ['skull', 'cracked', ['ash'], 0], STAND_FAST: ['shield', 'skull', ['ring'], 0],
    SIPHON: ['swirl', 'heart', ['drops'], 0], DREAD: ['eye', 'skull', ['aura'], 0], SQUASH: ['claw', 'boulder', ['quake'], 0], TOMB_KEEPER: ['wall', 'skull', ['ring'], 0],
    GRAVE_BURST: ['cracked', 'bone', ['quake'], 0], SUMMONING_RITE: ['rune', 'claw', ['aura'], 0], DEATH_PULSE: ['skull', 'swirl', ['ring'], 0], PROD: ['claw', null, ['speed'], 20],
    DRAW_FIRE: ['shield', 'claw', ['sparks'], 0], HARVEST: ['axe', 'skull', ['slash'], -20], RIP_FREE: ['claw', 'mask', ['slash'], 0], DEATH_MARK: ['skull', 'rune', ['aura'], 0],
    CARVING_RAKE: ['claw', 'dagger', ['slash'], 0], FLICK: ['claw', 'burst', ['speed'], 0], SCATTER: ['bone', 'bone', ['speed', 'ash'], 0], FLICKER: ['flame', 'mask', ['aura'], 0],
    BONE_BURST: ['bone', 'burst', ['speed', 'sparks'], 0], STOLEN_HOURS: ['hourglass', 'claw', ['aura'], 0], ENTOMB: ['wall', 'skull', ['quake'], 0], HARDEN: ['bone', 'shield', ['ring'], 0],
    BOTTLE_WRAITH: ['tear', 'mask', ['aura'], 0], PURGE: ['flame', 'cards', ['ash'], 0], FINAL_HOURS: ['hourglass', 'skull', ['ash'], 0], BONE_WALTZ: ['bone', 'swirl', ['ring'], 0],
    FUNERAL_MARCH: ['skull', 'banner', ['speed'], 0], DEATHCALLER: ['warhorn', 'skull', ['ring'], 0], LAST_BREATH: ['heart', 'shield', ['aura'], 0], WEAKEN_WILL: ['eye', 'chains', ['ash'], 0],
    STALL: ['hourglass', 'shield', ['ring'], 0], LAMENT: ['mask', 'tear', ['ash'], 0], EXHUME: ['claw', 'cards', ['quake'], 0], WITHERING_TOUCH: ['claw', 'spores', ['ash'], 0],
    RETRIEVE: ['claw', 'cards', ['speed'], 0], OLD_FRIEND: ['claw', 'heart', ['aura'], 0], HAUNTING: ['mask', 'eye', ['ash'], 0], CLAP: ['claw', 'claw', ['quake', 'speed'], 0],
    KILLING_INTENT: ['dagger', 'eye', ['slash'], 0], SORROW: ['tear', 'shield', ['ring'], 0], INESCAPABLE: ['chains', 'skull', ['quake'], 0], LEAFSTORM: ['scroll', 'swirl', ['speed', 'ash'], 0],
    READ_THROUGH: ['scroll', 'eye', ['aura'], 0], DRAG_UNDER: ['tentacle', 'skull', ['quake'], 0], DECOMPOSE: ['spores', 'skull', ['ash'], 0], CLATTER: ['bone', 'claw', ['speed', 'sparks'], 0],
    OTHER_HAND: ['claw', 'uparrow', ['speed'], 0], SEVER_TIES: ['axe', 'mask', ['slash'], 0], PALL: ['cloak', 'skull', ['aura'], 0], GO_GET_EM: ['claw', 'eye', ['speed'], 0],
    FLESH_TRICK: ['blood', 'mask', ['drops'], 0], URGE_ON: ['claw', 'heart', ['aura'], 0], VEILCUTTER: ['dagger', 'mask', ['slash', 'ash'], 0],
    HOWL_OF_THE_DEAD: ['maw', 'skull', ['ring', 'speed'], 0], ECHO_OF_THE_DEEP: ['swirl', 'cards', ['ash', 'aura'], 0], DOMAIN: ['crown', 'skull', ['aura'], 0], FEED_ON_LIFE: ['maw', 'heart', ['drops'], 0],
    SPECTRAL_HOST: ['mask', 'mask', ['ash', 'aura'], 0], LAST_DAYS: ['skull', 'hourglass', ['quake', 'ash'], 0], ANNIHILATE: ['burst', 'skull', ['quake', 'sparks'], 0], GALLOWS: ['chains', 'skull', ['ring'], 0],
    WRETCHEDNESS: ['tear', 'skull', ['ash'], 0], BONE_MASTERY: ['bone', 'crown', ['aura'], 0], MIND_SURGE: ['eye', 'bolt', ['sparks'], 0], FORGETTING: ['swirl', 'eye', ['ash'], 0],
    RISE_AGAIN: ['claw', 'skull', ['aura', 'quake'], 0], GRIM_FORM: ['axe', 'mask', ['aura', 'ash'], 0], OFFERING: ['claw', 'heart', ['drops'], 0], SPIRIT_CALL: ['mask', 'rune', ['ash'], 0],
    WATCHFUL_HAND: ['eye', 'claw', ['ring'], 0], BOUND_FATES: ['chains', 'heart', ['ring'], 0], WRAITH_STORM: ['mask', 'swirl', ['speed', 'ash'], 0], ASH_SPIRIT: ['flame', 'mask', ['ash'], 0],
    CRUSH_GRIP: ['claw', 'cracked', ['quake'], 0], THE_SICKLE: ['axe', null, ['slash'], -30], HOUR_STRUCK: ['clock', 'skull', ['quake'], 0], REMAKE: ['hammer', 'cards', ['sparks'], 0],
    DEATHLESS: ['shield', 'skull', ['aura'], 0], BANNED_TOME: ['scroll', 'chains', ['aura'], 0], GUARDIAN_HAND: ['claw', 'shield', ['aura', 'ring'], 0],
    // the Wirebound
    POUND: ['fist', null, ['speed'], 0], CASING: ['shield', 'bolt', ['ring'], 0], ARC: ['bolt', null, ['sparks'], 0], DOUBLE_RELEASE: ['bolt', 'bolt', ['ring', 'sparks'], 0],
    DRAIN: ['swirl', 'cracked', ['ash'], 0], BATTERY: ['bolt', 'uparrow', ['aura'], 0],
    BOLT_BALL: ['orbs', 'bolt', ['sparks'], 0], CELL_VOLLEY: ['orbs', 'burst', ['speed', 'sparks'], 0], PIN_BEAM: ['eye', 'bolt', ['speed'], 0], THRUSTER: ['flame', 'uparrow', ['speed'], 0],
    STORE_POWER: ['shield', 'bolt', ['aura'], 0], PINCER: ['claw', null, ['slash'], 0], RIME_SHOT: ['shards', 'burst', ['speed'], 0], COMPILER: ['scroll', 'orbs', ['sparks'], 0],
    COOL_LOGIC: ['shards', 'eye', ['aura'], 0], TUNED_POUND: ['fist', 'orbs', ['speed', 'sparks'], 0], EYE_POKE: ['eye', 'fist', ['speed'], 0], GREASE_UP: ['slime', 'fist', ['drops'], 0],
    PROJECTION: ['mask', 'cards', ['aura'], 0], QUICK_PATCH: ['hammer', 'orbs', ['sparks'], 0], HOP: ['uparrow', 'shield', ['speed'], 0], BOLT_MAST: ['tower', 'bolt', ['sparks'], 0],
    ROLLING_POUND: ['fist', 'swirl', ['speed'], 0], SWEEP_RAY: ['eye', 'burst', ['speed', 'ring'], 0], OVERDRIVE: ['bolt', 'flame', ['speed', 'sparks'], 0], CLAMOR: ['warhorn', 'fist', ['quake'], 0],
    STARTUP: ['shield', 'clock', ['ring'], 0], HEAVY_FRAME: ['anvil', 'fist', ['quake'], 0], EXTRA_CELLS: ['orbs', 'uparrow', ['aura'], 0], WILD_CELL: ['orbs', 'question', ['sparks'], 0],
    COLD_FRONT: ['shards', 'shards', ['speed', 'aura'], 0], COMPRESS: ['anvil', 'cards', ['quake'], 0], GATHERING_MURK: ['moon', 'swirl', ['aura'], 0], DOUBLER: ['bolt', 'bolt', ['aura'], 0],
    RAVENOUS: ['maw', 'claw', ['slash'], 0], GRIND_ON: ['shield', 'blood', ['drops'], 0], FAST_LANE: ['bolt', 'uparrow', ['speed'], 0], FUSE: ['flame', 'orbs', ['sparks'], 0],
    ICE_SHELF: ['wall', 'shards', ['ring'], 0], SHARDCRAFT: ['shards', 'shield', ['sparks'], 0], SLEET: ['shards', 'bolt', ['speed', 'ash'], 0], SECOND_PASS: ['cards', 'swirl', ['speed'], 0],
    CYCLE: ['swirl', 'orbs', ['ring'], 0], BLANK_OUT: ['moon', 'burst', ['ash'], 0], REDLINE: ['flame', 'cards', ['speed', 'sparks'], 0], REFRACTOR: ['shards', 'burst', ['ring', 'sparks'], 0],
    PISTON_FIST: ['fist', 'anvil', ['speed', 'sparks'], 0], SALVAGE: ['hammer', 'cards', ['ash'], 0], SCRAP_PICK: ['claw', 'cards', ['slash'], 0], MURK_GUARD: ['shield', 'moon', ['aura'], 0],
    SCAN: ['eye', 'cards', ['ring'], 0], CHIMNEY: ['tower', 'flame', ['ash'], 0], THUNDERHEAD: ['bolt', 'swirl', ['sparks', 'quake'], 0], SIDE_PROCESS: ['clock', 'bolt', ['ring'], 0],
    SPLIT_APART: ['axe', 'cracked', ['slash'], -20], SYNC_UP: ['orbs', 'clock', ['ring'], 0], ASSEMBLY: ['anvil', 'uparrow', ['sparks'], 0], SQUALL: ['bolt', 'bolt', ['speed', 'sparks'], 0],
    ARC_COIL: ['tower', 'bolt', ['ring', 'sparks'], 0], RUMBLE: ['bolt', 'mountain', ['quake'], 0], HISS: ['swirl', 'question', ['ash'], 0],
    LEARNING_POUND: ['fist', 'scroll', ['speed'], 0], GATHER_ROUND: ['cards', 'swirl', ['aura'], 0], FAILSAFE: ['shield', 'heart', ['ring', 'aura'], 0], HUNGRY_MURK: ['maw', 'moon', ['aura'], 0],
    COOLANT_LINE: ['tear', 'orbs', ['ring'], 0], DREAMING_ENGINE: ['clock', 'cards', ['aura', 'sparks'], 0], RETUNE: ['orbs', 'eye', ['aura'], 0], MIRROR_FORM: ['mask', 'mask', ['aura'], 0],
    SCRAP_CANNON: ['fireball', 'cracked', ['speed', 'ash'], 0], SELF_IMPROVE: ['shield', 'uparrow', ['aura'], 0], SPIRAL_DRILL: ['swirl', 'bolt', ['speed'], 0], OVERBEAM: ['eye', 'burst', ['speed', 'sparks'], 0],
    RIME_LANCE: ['shards', 'sword', ['speed'], 0], SELF_STUDY: ['scroll', 'eye', ['aura'], 0], CRASHING_POUND: ['fireball', 'fist', ['quake', 'speed'], 0], RETROFIT: ['hammer', 'orbs', ['sparks'], 0],
    CHAIN_RELEASE: ['chains', 'bolt', ['sparks'], 0], SPECTRUM: ['orbs', 'shards', ['aura', 'sparks'], 0], RESTART: ['swirl', 'cards', ['speed'], 0], OVERLOAD: ['burst', 'bolt', ['quake', 'sparks'], 0],
    AMPLIFY: ['warhorn', 'uparrow', ['ring'], 0], SHARD_LATHE: ['clock', 'shards', ['sparks'], 0], MELTDOWN: ['fireball', 'flame', ['ash', 'sparks'], 0], JUNK_ALCHEMY: ['cards', 'orbs', ['sparks'], 0],
    STORM_BANK: ['bolt', 'coins', ['sparks', 'aura'], 0], FIXED_BELIEF: ['eye', 'chains', ['aura'], 0], FOURFOLD_RELEASE: ['bolt', 'orbs', ['ring', 'sparks'], 0],
    // the Crowned
    SMITE: ['sword', null, ['slash'], -38], WARD_OFF: ['shield', 'crown', ['ring'], 0], STARFALL: ['fireball', 'shards', ['speed', 'sparks'], 0], REVERE: ['crown', null, ['aura', 'sparks'], 0],
    REGAL_BLADE: ['sword', 'crown', ['aura', 'sparks'], 0], THRALL_STRIKE: ['fist', 'mask', ['speed'], 0], THRALL_PLUNGE: ['mask', 'burst', ['speed'], 0], THRALL_SHIELD: ['shield', 'mask', ['ring'], 0],
    RUBBLE: ['boulder', 'cracked', ['ash'], 0],
    STARTHROB: ['orbs', 'burst', ['ring', 'sparks'], 0], DISMISSAL: ['crown', 'mask', ['speed'], 0], HEAVENS_WEIGHT: ['boulder', 'bolt', ['quake'], 0], STARRY_MANTLE: ['cloak', 'orbs', ['sparks'], 0],
    IMPACT_PATH: ['fireball', 'cracked', ['speed', 'quake'], 0], COLD_HEAVENS: ['moon', 'cards', ['aura'], 0], MOON_PIKE: ['moon', 'sword', ['slash'], 30], TRAMPLE_DOWN: ['boulder', 'cracked', ['quake'], 0],
    HOARD_LIGHT: ['shield', 'orbs', ['sparks'], 0], SPARKLE_TIDE: ['shield', 'swirl', ['sparks', 'ring'], 0], LUSTER: ['orbs', 'cards', ['aura', 'sparks'], 0], NORTH_LIGHT: ['bolt', 'eye', ['speed', 'sparks'], 0],
    SECRET_HOARD: ['coins', 'orbs', ['sparks'], 0], KNEEL: ['crown', 'eye', ['quake'], 0], SMALL_TALK: ['scroll', 'shield', ['ring'], 0], LIGHT_SLICE: ['sword', 'bolt', ['slash', 'sparks'], 20],
    HONE_EDGE: ['anvil', 'sword', ['sparks'], 0], SUN_SMITE: ['sword', 'fireball', ['slash'], -30], WAR_PLUNDER: ['coins', 'sword', ['sparks'], 0], BATTLE_FORGED: ['hammer', 'sword', ['sparks'], 0],
    CONJUNCTION: ['orbs', 'orbs', ['aura'], 0], EVENT_HORIZON: ['swirl', 'orbs', ['ring', 'aura'], 0], BASTION_WALL: ['wall', 'anvil', ['ring'], 0], MUSTER: ['banner', 'mask', ['speed'], 0],
    STARBORN: ['egg', 'orbs', ['aura', 'sparks'], 0], USURPER: ['crown', 'sword', ['slash'], 0], CONFLUENCE: ['swirl', 'hourglass', ['aura'], 0], BELLOWS: ['anvil', 'flame', ['sparks'], 0],
    RAY_BURST: ['bolt', 'burst', ['speed', 'sparks'], 0], TWINKLE: ['orbs', 'cards', ['sparks'], 0], DOMINION: ['crown', 'fist', ['quake'], 0], ROYAL_BOOT: ['crown', 'burst', ['speed'], 0],
    ROYAL_FIST: ['fist', 'crown', ['speed', 'sparks'], 0], FELLING_BLOW: ['hammer', 'skull', ['quake'], -20], MOONBURST: ['moon', 'burst', ['ring', 'sparks'], 0], SHOW_OF_RULE: ['crown', 'scroll', ['aura'], 0],
    RUINATION: ['fireball', 'skull', ['quake', 'sparks'], 0], CIRCUIT: ['orbs', 'swirl', ['ring'], 0], FAR_SPECK: ['eye', 'orbs', ['aura'], 0], RIPOSTE: ['sword', 'shield', ['slash', 'ring'], 0],
    MOTE_WALL: ['wall', 'orbs', ['sparks'], 0], NURSERY_CLOUD: ['egg', 'swirl', ['aura'], 0], FORETELL: ['eye', 'scroll', ['aura'], 0], BEACON: ['tower', 'orbs', ['aura', 'sparks'], 0],
    SHINE_FORTH: ['orbs', 'burst', ['ring', 'sparks'], 0], MIRROR_GUARD: ['shield', 'shards', ['ring'], 0], HARMONIZE: ['orbs', 'uparrow', ['ring'], 0], KINGS_WAGER: ['coins', 'crown', ['sparks'], 0],
    BRIGHT_SMITE: ['sword', 'orbs', ['slash', 'sparks'], -30], STARDRIFT: ['shards', 'orbs', ['speed', 'sparks'], 0], CALL_THE_BLADE: ['sword', 'uparrow', ['aura'], 0], HEAVY_STAR: ['orbs', 'boulder', ['quake'], 0],
    RESHAPE_LAND: ['mountain', 'uparrow', ['quake'], 0], PROCLAMATION: ['scroll', 'warhorn', ['ring'], 0], PRISM_TURN: ['shards', 'swirl', ['sparks'], 0],
    ARMORY: ['anvil', 'axe', ['sparks'], 0], HAMMER_OUT: ['hammer', 'anvil', ['sparks', 'speed'], 0], FIRST_LIGHT: ['burst', 'orbs', ['aura', 'sparks'], 0], SKYFALL_VOLLEY: ['fireball', 'fireball', ['speed', 'quake'], 0],
    GIFT_BASKET: ['egg', 'cards', ['sparks'], 0], FIRETAIL: ['fireball', 'flame', ['speed', 'sparks'], -20], HARD_DESCENT: ['fireball', 'boulder', ['quake', 'ash'], 0], ROYAL_DECREE: ['scroll', 'crown', ['aura', 'ring'], 0],
    FADING_SUN: ['fireball', 'cracked', ['ash', 'aura'], 0], FORESEEN_END: ['hourglass', 'eye', ['aura'], 0], HONOR_GUARD: ['banner', 'shield', ['ring'], 0], WELLSPRING: ['tear', 'orbs', ['aura', 'sparks'], 0],
    SKY_AUGER: ['bolt', 'mountain', ['speed', 'quake'], 0], OLD_MALLET: ['hammer', 'cards', ['sparks'], 20], UNBOWED: ['shield', 'crown', ['ring', 'aura'], 0], SO_DECREED: ['scroll', 'sword', ['slash'], 0],
    ROYAL_STARE: ['eye', 'crown', ['aura'], 0], DENSE_SHELL: ['shield', 'boulder', ['ring'], 0], TRIBUTE: ['coins', 'crown', ['sparks', 'aura'], 0], HUNTING_EDGE: ['sword', 'eye', ['slash', 'speed'], 0],
    SEVEN_LIGHTS: ['orbs', 'shards', ['sparks', 'speed'], 0], BLADEMASTER: ['sword', 'sword', ['slash', 'aura'], 28], THE_ARMORER: ['anvil', 'hammer', ['sparks', 'aura'], 0], IRON_RULE: ['crown', 'chains', ['ash'], 0],
    HOLLOW_FORM: ['mask', 'swirl', ['ash', 'aura'], 0], STARSTORM: ['fireball', 'orbs', ['speed', 'sparks'], 0], THE_LOCKED_THRONE: ['crown', 'chains', ['aura', 'sparks'], 0],
  };

  const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const place = (name, x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(-50 -50)">${MOTIF[name] || ''}</g>`;

  function svgFor(id) {
    const d = HD.CARDS[id];
    const type = PAL[d.type] ? d.type : d.rarity === 'Token' ? 'Token' : 'Status';
    const h = HD.hashSeed(id);
    const r = rng(h);
    const [deep, mid, glow] = PAL[type][h % PAL[type].length];
    const [main, second, fx, rot] = ART[id] || ['burst', null, ['aura'], 0];
    const lx = 60 + r() * 80, ly = 30 + r() * 30;
    // Distant ridges and hanging roots give every card the same underground world.
    let ridges = '';
    for (let i = 0; i < 2; i++) {
      const base = 96 + i * 14;
      let path = `M0 ${base}`;
      for (let x = 0; x <= 200; x += 25) path += ` Q${x + 12} ${base - 8 - r() * 22} ${x + 25} ${base - r() * 8}`;
      ridges += `<path d="${path} V128 H0Z" fill="${deep}" opacity="${0.55 + i * 0.3}"/>`;
    }
    let roots = '';
    for (let i = 0; i < 3; i++) {
      const x = 15 + r() * 170, len = 18 + r() * 34;
      roots += `<path d="M${x.toFixed(0)} -2 C${(x + 10 - r() * 20).toFixed(0)} ${(len * 0.4).toFixed(0)} ${(x - 10 + r() * 20).toFixed(0)} ${(len * 0.7).toFixed(0)} ${(x + 6 - r() * 12).toFixed(0)} ${len.toFixed(0)}" fill="none" stroke="${deep}" stroke-width="${(2 + r() * 3).toFixed(1)}" stroke-linecap="round" opacity=".8"/>`;
    }
    const pair = second === main;
    const mainX = pair ? 82 : second ? 88 : 100, mainY = 62;
    const mainS = second ? 0.9 : 1.02;
    const mainArt = pair
      ? place(main, 78, 62, 0.86, -Math.abs(rot || 20)) + place(main, 122, 62, 0.86, Math.abs(rot || 20))
      : place(main, mainX, mainY, mainS, rot);
    const secondArt = second && !pair ? place(second, 148, 78, 0.62, 0) : '';
    const under = fx.filter((k) => k === 'aura' || k === 'ring').map((k) => FX[k](glow, r)).join('');
    const over = fx.filter((k) => k !== 'aura' && k !== 'ring').map((k) => FX[k](glow, r)).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 128" preserveAspectRatio="xMidYMid slice">
<defs>
<radialGradient id="bg" cx="${(lx / 2).toFixed(0)}%" cy="${(ly / 1.28).toFixed(0)}%" r="85%"><stop offset="0" stop-color="${mid}"/><stop offset="1" stop-color="${deep}"/></radialGradient>
<radialGradient id="light" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
<radialGradient id="aura" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${glow}" stop-opacity=".45"/><stop offset=".6" stop-color="${glow}" stop-opacity=".12"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="50%" cy="48%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f1ea"/><stop offset=".45" stop-color="#b9b6ae"/><stop offset="1" stop-color="#6c6a66"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe38a"/><stop offset="1" stop-color="#b47a16"/></linearGradient>
<linearGradient id="rock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a39686"/><stop offset="1" stop-color="#4e453c"/></linearGradient>
<linearGradient id="bloodfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0473f"/><stop offset="1" stop-color="#6e0f14"/></linearGradient>
<linearGradient id="glowfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe8"/><stop offset="1" stop-color="${glow}"/></linearGradient>
<linearGradient id="fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd35a"/><stop offset=".5" stop-color="#ff7a2a"/><stop offset="1" stop-color="#b8201a"/></linearGradient>
<filter id="paint" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${h % 97}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .75 0"/><feGaussianBlur stdDeviation="3"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${h % 89}"/><feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 .22 0"/></filter>
</defs>
<rect width="200" height="128" fill="url(#bg)"/>
<ellipse cx="${lx.toFixed(0)}" cy="${ly.toFixed(0)}" rx="90" ry="60" fill="url(#light)"/>
<g filter="url(#soft)" opacity=".5"><ellipse cx="${(r() * 200).toFixed(0)}" cy="${(20 + r() * 60).toFixed(0)}" rx="50" ry="14" fill="${mid}"/><ellipse cx="${(r() * 200).toFixed(0)}" cy="${(30 + r() * 60).toFixed(0)}" rx="40" ry="10" fill="${glow}" opacity=".25"/></g>
${roots}${ridges}${under}
<g filter="url(#paint)"><g transform="translate(4 6)" filter="url(#shadow)">${mainArt}</g>${mainArt}${secondArt}</g>
${over}
<rect width="200" height="128" filter="url(#grain)"/>
<rect width="200" height="128" fill="url(#vig)"/>
</svg>`;
  }

  const cache = {};
  HD.cardArt = (id) => cache[id] || (cache[id] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFor(id))}`);
  HD.cardArtSvg = svgFor;
  HD.ART_MAP = ART;

  // Relic and potion icons. A relic's motif comes from a keyword in its id, otherwise from its hash.
  const ICON_DEFS = `<defs><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f1ea"/><stop offset=".45" stop-color="#b9b6ae"/><stop offset="1" stop-color="#6c6a66"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe38a"/><stop offset="1" stop-color="#b47a16"/></linearGradient>
<linearGradient id="rock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a39686"/><stop offset="1" stop-color="#4e453c"/></linearGradient>
<linearGradient id="bloodfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0473f"/><stop offset="1" stop-color="#6e0f14"/></linearGradient>
<linearGradient id="glowfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe8"/><stop offset="1" stop-color="#f3c65a"/></linearGradient>
<linearGradient id="fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd35a"/><stop offset=".5" stop-color="#ff7a2a"/><stop offset="1" stop-color="#b8201a"/></linearGradient></defs>`;
  const RELIC_WORDS = [['EGG', 'egg'], ['PEARL', 'orbs'], ['COIN', 'coins'], ['GOLD', 'coins'], ['CHEESE', 'coins'], ['BELL', 'clock'], ['CANDLE', 'flame'], ['LAMP', 'flame'],
    ['EMBER', 'flame'], ['SULFUR', 'flame'], ['KINDLING', 'flame'], ['HEART', 'heart'], ['BLOOD', 'blood'], ['SKULL', 'skull'], ['BONE', 'bone'], ['EYE', 'eye'],
    ['STAR', 'burst'], ['TEA', 'tear'], ['FLASK', 'tear'], ['JUG', 'tear'], ['POT', 'tear'], ['BLADE', 'sword'], ['KNIFE', 'dagger'], ['NIB', 'dagger'], ['HELM', 'helmet'],
    ['MAIL', 'helmet'], ['SHIELD', 'shield'], ['BUCKLER', 'shield'], ['GUARD', 'shield'], ['CHAIN', 'chains'], ['CLAMP', 'chains'], ['CLOCK', 'clock'], ['SUNDIAL', 'clock'],
    ['GLASS', 'hourglass'], ['ALMANAC', 'clock'], ['MAP', 'scroll'], ['SCROLL', 'scroll'], ['BOOK', 'scroll'], ['PAPER', 'scroll'], ['CROWN', 'crown'], ['ROCK', 'boulder'],
    ['STONE', 'boulder'], ['PEBBLE', 'boulder'], ['MASK', 'mask'], ['HORN', 'warhorn'], ['RING', 'rune'], ['BRACELET', 'rune'], ['BEAD', 'rune'], ['SEED', 'spores'],
    ['FRUIT', 'orbs'], ['PEAR', 'orbs'], ['BERRY', 'orbs'], ['MUSSEL', 'orbs'], ['SKY', 'orbs'], ['ROOT', 'roots'], ['CLAW', 'claw'], ['TOOTH', 'claw'], ['SICKLE', 'axe'],
    ['AXE', 'axe'], ['HAMMER', 'hammer'], ['ANVIL', 'anvil'], ['FAN', 'cards'], ['DIE', 'cards'], ['PIECE', 'cards'], ['RUG', 'scroll'], ['CAGE', 'chains'], ['FROG', 'slime'],
    ['TAIL', 'tentacle'], ['MIRROR', 'eye'], ['IDOL', 'mask'], ['BANNER', 'banner'], ['WHEEL', 'swirl'], ['TOP', 'swirl'], ['BOOTS', 'uparrow'], ['FEATHER', 'uparrow'],
    ['SEAL', 'crown'], ['MALLET', 'hammer'], ['TAGS', 'scroll'], ['LIGHTER', 'flame'], ['CHARM', 'rune'], ['LOCK', 'chains'],
    ['FUNNEL', 'tear'], ['CRANE', 'scroll'], ['BELLS', 'clock'], ['WRAPS', 'shield'], ['DART', 'dagger'], ['JAR', 'tear']];
  const ICON_POOL = ['orbs', 'rune', 'crown', 'eye', 'flame', 'heart', 'shield', 'coins', 'hourglass', 'scroll', 'burst', 'boulder', 'mask', 'chains'];
  const iconMotif = (id) => (RELIC_WORDS.find(([w]) => id.includes(w)) || [null, ICON_POOL[HD.hashSeed(id) % ICON_POOL.length]])[1];
  HD.relicIcon = (id, cls = 'ricon') => `<svg class="${cls}" viewBox="-6 -6 112 112" aria-hidden="true">${ICON_DEFS}<circle cx="50" cy="50" r="54" fill="#2a1e17" stroke="#c79a3a" stroke-width="5"/>${MOTIF[iconMotif(id)] || ''}</svg>`;
  HD.potionIcon = (id, cls = 'picon') => {
    const hue = HD.hashSeed(id) % 360;
    return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="M40 8H60V30C76 36 86 50 86 66 86 84 70 96 50 96 30 96 14 84 14 66 14 50 24 36 40 30Z" fill="rgba(240,240,250,.25)" stroke="${S}" stroke-width="4"/>
      <path d="M18 64C30 58 70 70 82 62 84 82 70 92 50 92 30 92 16 82 18 64Z" fill="hsl(${hue} 70% 52%)"/><rect x="36" y="2" width="28" height="10" rx="3" fill="#8a5a2e" stroke="${S}" stroke-width="3"/>
      <path d="M30 70C32 60 38 54 44 52" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="4" stroke-linecap="round"/></svg>`;
  };
})();

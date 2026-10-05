# HallowDeep

A browser deckbuilding roguelike that mirrors Slay the Spire 2 (v0.111) mechanically: every number, rule and monster
pattern matches the game data, while names, text, art and UI are original. A toggle shows the original game's names.
One self-contained HTML file, no framework, no runtime dependencies.

- Repo: github.com/SrivatsaChilla/Hollowdeep (main deploys to Netlify via netlify.toml)
- Owner: Sri (SrivatsaChilla)

## Working with Sri

- Be direct and concise. No long preambles or hedging.
- Never use em dashes anywhere: code, comments, docs, UI text, commit messages.
- Keep header comments in code short (a few lines).
- When showing Sri code to apply, give the full updated file, not a patch.
- Before changing behavior that Sri did not ask for, say so and why.

## Fidelity rules

- Mechanics and numbers come from the v0.111 data (Spire Codex export). Data wins over wikis and guides.
- The game follows v0.111 only (the stable/beta switch was removed). Cards first written from older data get their
  v0.111 changes in src/versions.js, applied once at load.
- HallowDeep names and text are original. dev/namemap.json maps original IDs to ours; src/names.js (generated) holds the
  original names and term swaps used by the "Original names" mode.
- Any guess or approximation goes in FIDELITY.md.
- Effects that move cards must go through the engine functions listed in dev/TRIGGERS.md (discardFromHand, burn,
  drawOne, reshuffle, create, forge...), or triggers like Sly silently break.

## Layout

- build.py concatenates src/*.js in a fixed order (see the `order` list) plus style.css into dist/hallowdeep.html and
  dist/index.html. dist/ is not committed; Netlify builds it.
- Everything hangs off the global `HD`. Key files:
  - core.js: RNG, glossary terms, power definitions, HD.onEngine hook registry
  - cards.js (Ironclad, called the Oathburner), silent.js (Silent, the Veiled), colorless.js, potions.js, relics.js
  - monsters.js, act2.js, act3.js: monsters and encounters; events.js, events2.js; ancients.js, neow2.js
  - combat.js: the Combat class (turns, damage, piles, Stars, Forge, card creation, hooks)
  - run.js: the Run class (map, rewards, shop, saves); ascension.js + ascension_data.js (generated)
  - versions.js: v0.111 patch; enchants.js; naming.js + names.js; art.js (SVG card art); ui.js (all screens, input)
- ui.js renders HTML strings and morphs the DOM (data-key keeps elements stable). Clicks go through data-act handlers.
- Phones: compact() = width <= 760 or short landscape; dragOnly() = touch input. Layout rules and tests in
  dev/qa_devices.py and dev/qa_resize.py.
- Local storage keys stay lowercase "hollowdeep.*" (saves, settings, Ascension unlocks) so old saves keep working.

## Setup

- Python 3.10+, Node 18+. For browser tests: `pip install playwright pillow` then `python -m playwright install chromium`.
- Reference data (only for the parity, audit and generator tools):
  `git clone https://github.com/ptrlrd/spire-codex ../spire-codex && git -C ../spire-codex checkout a079dab`
  - stable export: ../spire-codex/data/eng
  - v0.111 export: ../spire-codex/data-beta/v0.111.0/eng
  - test/extra scripts read CODEX_STABLE and CODEX_BETA, defaulting to those paths.

## Commands

    python3 build.py                         # build dist/
    node test/checks.js                      # rule checks (run after every change)
    node test/triggers.js                    # card trigger behavior (Sly, exhaust, draw, shuffle, replay...)
    node test/regent_engine.js               # Stars, Forge, card creation and other engine hooks
    node test/sim.js 100                     # headless random runs; CHAR=VEILED, ASC=10 env vars
    node test/extra/invariants.js 300        # fuzzing for state invariants
    node dev/verify.js ../spire-codex/data-beta/v0.111.0/eng          # number parity, expect 0 mismatches
    node dev/audit.js ../spire-codex/data/eng ../spire-codex/data-beta/v0.111.0/eng   # 7 audit sections, all ok
    python3 dev/qa_devices.py [device...]    # real fights through the UI at 16 screen sizes (slow; run in batches)
    python3 dev/qa_resize.py                 # resizing and rotating mid-fight
    python3 dev/timer_check.py; python3 dev/ascension_unlock.py; python3 dev/cardfaces.py; python3 dev/handfit.py
    python3 test/extra/phone_layouts.py | card_text_fit.py | tooltips.py | save_load.py | touch_inspect.py
    python3 test/extra/bot.py [seed]         # clicks through a whole run; seeds starting "veil" play the Silent

Generators: dev/gen_names.py (names.js), dev/gen_ascension.py (ascension_data.js), dev/gen_regent.py (regent_data.js).

## Before committing

Build, then run checks.js, triggers.js, regent_engine.js, a short sim for each character, and the browser tests that
touch what changed (any layout change: qa_devices on a few sizes plus qa_resize). Keep commits focused.

Commit messages: imperative summary line under about 60 characters, blank line, then a body explaining what changed
and why (bullets are fine). Author: `Srivatsa Chilla <67921517+SrivatsaChilla@users.noreply.github.com>`.

## Current work: the Regent (third character)

Research is complete in dev/REGENT.md (rules for Stars, Forge, Sovereign Blade, card creation; card list; sources).
Step 1 (engine) is done and tested. Step 2 (content) is in progress on the `regent-wip` branch:
- Done: dev/gen_regent.py generates src/regent_data.js (every card's costs, Star costs, values, upgrades, keywords,
  tags, targets) and adds the Regent to dev/namemap.json. HallowDeep names: the Regent is "The Crowned"; Star is
  "Glint", Forge "Temper", Sovereign Blade "Regal Blade", Minion "Thrall", Debris "Rubble".
- Next: src/regent.js with each card's text and play function built on HD.REGENT_DATA['0.111'] (mirror silent.js),
  the Regal Blade and Thrall tokens, 9 relics, 3 potions, HD.CHARS.REGENT (75 HP, 99 Gold, deck 4 Smite, 4 Ward Off,
  Starfall, Revere; relic Star Circlet), add regent_data and regent to build.py's order, card art, then step 3:
  a Glint counter next to Energy, Glint costs on cards, the Regal Blade's damage shown. Add the Regent to the parity,
  keyword and trigger checks, simulations and device tests.
- On regent-wip, dev/verify.js reports 12 mismatches: the Regent's relics and potions are mapped in namemap.json
  but not built yet. They clear once those exist; everything else should stay at 0.

## Backlog

- Portrait phone performance (about 12 fps under 4x CPU throttle).
- Content needing other characters: Sea Glass, Prismatic Gem, Colorful Philosophers.
- Not built: Golden Compass, Crystal Sphere, The Merchant???, Future of Potions, co-op cards, the Underdocks act,
  the Defect (orbs; needs the onDraw hook, already built), the Necrobinder.
- Optional: attach the built HTML to GitHub Releases.

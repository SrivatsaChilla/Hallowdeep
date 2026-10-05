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
  - cards.js (Ironclad, called the Oathburner), silent.js (Silent, the Veiled), regent.js (Regent, the Crowned; numbers
    from the generated regent_data.js), colorless.js, potions.js, relics.js
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
    node test/regent_cards.js                # the Regent's real cards, relics and potions
    node test/sim.js 100                     # headless random runs; CHAR=VEILED or CROWNED, ASC=10 env vars
    node test/extra/invariants.js 300        # fuzzing for state invariants
    node dev/verify.js ../spire-codex/data-beta/v0.111.0/eng          # number parity, expect 0 mismatches
    node dev/audit.js ../spire-codex/data/eng ../spire-codex/data-beta/v0.111.0/eng   # 7 audit sections, all ok
    python3 dev/qa_devices.py [device...]    # real fights through the UI at 16 screen sizes (slow; run in batches)
    python3 dev/qa_resize.py                 # resizing and rotating mid-fight
    python3 dev/timer_check.py; python3 dev/ascension_unlock.py; python3 dev/cardfaces.py; python3 dev/handfit.py
    python3 test/extra/phone_layouts.py | card_text_fit.py | tooltips.py | save_load.py | touch_inspect.py
    python3 test/extra/bot.py [seed]         # clicks through a whole run; seeds starting "veil" play the Silent, "crown" the Regent

Generators: dev/gen_names.py (names.js), dev/gen_ascension.py (ascension_data.js), dev/gen_regent.py (regent_data.js).

## Before committing

Build, then run checks.js, triggers.js, regent_engine.js, regent_cards.js, a short sim for each character, and the browser tests that
touch what changed (any layout change: qa_devices on a few sizes plus qa_resize). Keep commits focused.

Commit messages: imperative summary line under about 60 characters, blank line, then a body explaining what changed
and why (bullets are fine). Author: `Srivatsa Chilla <67921517+SrivatsaChilla@users.noreply.github.com>`.

## Current work: the Regent (third character)

Research is in dev/REGENT.md. HallowDeep names: the Regent is "The Crowned" (id CROWNED, color crowned); Star is
"Glint", Forge "Temper", Sovereign Blade "Regal Blade" (id REGAL_BLADE), Minion "Thrall", Debris "Rubble".
- Done: engine (step 1); content (step 2): src/regent.js builds all 86 solo cards from HD.REGENT_DATA['0.111'], the
  tokens, 9 relics, 3 potions, every power (as HD.onEngine hooks), HD.CHARS.CROWNED; card art; names.js regenerated.
  Screen (step 3, first pass): roster entry and crown sigil, a Glint counter pinned to the Energy orb, a Glint cost seal
  on cards, the Regal Blade's damage in its text. Parity 0 mismatches, audit all ok, sims 0 errors for all three
  characters, test/regent_cards.js covers the cards. Approximations are in FIDELITY.md ("The Crowned").
- Next: run the browser suites with the Regent (qa_devices includes a CROWNED fight, bot.py takes "crown" seeds,
  qa_resize, phone_layouts, card_text_fit, tooltips); Playwright was not installed on Sri's Mac when this was built.
  Then polish: Glint gain and spend animation, a Glint icon in card text, relic icons for the Regent's relics.
- The 5 co-op Regent cards are not defined (the Silent's co-op cards are stubs; add stubs if the compendium needs them).

## Backlog

- Portrait phone performance (about 12 fps under 4x CPU throttle).
- Content needing other characters: Sea Glass, Prismatic Gem, Colorful Philosophers.
- Not built: Golden Compass, Crystal Sphere, The Merchant???, Future of Potions, co-op cards, the Underdocks act,
  the Defect (orbs; needs the onDraw hook, already built), the Necrobinder.
- Optional: attach the built HTML to GitHub Releases.

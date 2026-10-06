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
    from the generated regent_data.js), defect.js (Defect, the Wirebound; defect_data.js; Orbs in orbs.js), necro.js (Necrobinder, the
    Unburied; necro_data.js; Osty and Doom in osty.js), colorless.js, potions.js, relics.js
  - monsters.js, act2.js, act3.js: monsters and encounters; events.js, events2.js; ancients.js, neow2.js
  - combat.js: the Combat class (turns, damage, piles, Stars, Forge, card creation, hooks)
  - run.js: the Run class (map, rewards, shop, saves); ascension.js + ascension_data.js (generated)
  - versions.js: v0.111 patch; enchants.js; naming.js + names.js; art.js (SVG card art); sigils.js (character
    emblems and map node icons); ui.js (all screens, input)
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
    node test/defect_cards.js                # Cells (Orbs) and the Defect's cards, relics and potions
    node test/necro_cards.js                 # Clutch (Osty), Knell (Doom) and the Necrobinder's cards
    node test/sim.js 100                     # headless random runs; CHAR=VEILED, CROWNED, WIREBOUND or UNBURIED, ASC=10 env vars
    node test/extra/invariants.js 300        # fuzzing for state invariants
    node test/mp_checks.js                   # multiplayer combat rules (scaling, shared enemy turns, falling, theft)
    node test/mp_sim.js 300                  # random 2 to 4 player fights, each replayed from its action log; ASC=10
    node test/coop_cards.js                  # the 37 co-op cards, co-op card pools, potions thrown to an ally
    node test/net_sim.js 24                  # networked fights: a copy of the game per player, rejoins, tamper and bad-message checks
    node dev/verify.js ../spire-codex/data-beta/v0.111.0/eng          # number parity, expect 0 mismatches
    node dev/audit.js ../spire-codex/data/eng ../spire-codex/data-beta/v0.111.0/eng   # 7 audit sections, all ok
    python3 dev/qa_devices.py [device...]    # real fights through the UI at 16 screen sizes (slow; run in batches)
    python3 dev/qa_resize.py                 # resizing and rotating mid-fight
    python3 dev/timer_check.py; python3 dev/ascension_unlock.py; python3 dev/cardfaces.py; python3 dev/handfit.py
    python3 test/extra/phone_layouts.py | card_text_fit.py | tooltips.py | save_load.py | touch_inspect.py
    python3 test/extra/bot.py [seed]         # clicks through a whole run; seeds starting "veil" play the Silent, "crown" the Regent, "wire" the Defect, "necro" the Necrobinder

Generators: dev/gen_names.py (names.js), dev/gen_ascension.py (ascension_data.js), dev/gen_regent.py (regent_data.js),
dev/gen_defect.py (defect_data.js), dev/gen_necro.py (necro_data.js); the character generators share dev/charlib.py.

## Before committing

Build, then run checks.js, triggers.js, regent_engine.js, regent_cards.js, defect_cards.js, necro_cards.js, mp_checks.js, coop_cards.js, a short mp_sim and net_sim, a short sim for each character, and the browser tests that
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

## The Defect (fifth roster slot)

Research is in dev/DEFECT.md. HallowDeep names: the Defect is "The Wirebound" (id WIREBOUND, color wirebound); Orb is
"Cell", Channel "Prime", Evoke "Release", Focus "Tuning", Lightning "Bolt", Frost "Rime", Dark "Murk", Plasma "Flux",
Glass "Shard", Void "Drain", Fuel "Battery". All names are in dev/gen_defect.py.
- Built on the `defect` branch (from regent-wip): src/orbs.js (the Cell engine), src/defect.js (all 86 solo cards, 5
  co-op stubs, tokens, 9 relics, 3 potions, every power), roster slot 5 with a gear sigil, a Cell row under the
  portrait in combat (passive and Release numbers, tooltips), card art, names.js. Parity 0 mismatches, audit all ok,
  test/defect_cards.js 50 checks, sims 0 errors. Approximations in FIDELITY.md ("The Wirebound").
- Next: the browser suites with the Defect once Playwright is installed (qa_devices has a WIREBOUND fight; bot.py
  takes "wire" seeds); Cell channel and release animations.

## The Necrobinder (fourth roster slot)

Research is in dev/NECROBINDER.md. HallowDeep names: the Necrobinder is "The Unburied" (id UNBURIED, color unburied);
Osty is "Clutch", Summon "Rouse", Doom "Knell", Soul "Wraith", Sweeping Gaze "Sweeping Glare". All names are in
dev/gen_necro.py.
- Built on the `necrobinder` branch (from defect): src/osty.js (Clutch, Knell, Wraiths), src/necro.js (all 86 solo
  cards, 5 co-op stubs, tokens, 9 relics, 3 potions, every power), roster slot 4 with a skull sigil, a Clutch HP bar under
  the portrait, card art, names.js. Parity 0 mismatches, audit all ok, test/necro_cards.js 50 checks, sims 0 errors.
  Approximations in FIDELITY.md ("The Unburied").
- Next: the browser suites once Playwright is installed (qa_devices has an UNBURIED fight; bot.py takes "necro" seeds).

## Multiplayer (co-op, in progress)

Rules, design and status are in dev/MULTIPLAYER.md. Built on the `multiplayer` branch. The combat engine has seats:
per-player state lives on `g.seat` and the old names (`g.p`, `g.hand`, `g.run`...) point at the active seat, so a new
field the engine keeps on the Combat must go in `Combat.SEAT_KEYS` (per player) or `Combat.SHARED_KEYS` (test/sim.js
fails otherwise). Enemy moves use `each` for what they do to every player and `fx` for what they do once. The 37 co-op cards are in
src/coop.js (loaded after necro everywhere); `run.party` above 1 puts them in the card pools. Networking is in
src/net.js (a host that numbers actions, peers that replay them in order); a choice in the middle of a card must never
use the fight's RNG on one machine only. With one
player the engine must stay exactly as before: compare the `digest` that test/sim.js prints before and after a change.

## Backlog

- Portrait phone performance (about 12 fps under 4x CPU throttle).
- Content needing other characters: Sea Glass, Prismatic Gem, Colorful Philosophers.
- Not built: Golden Compass, Crystal Sphere, The Merchant???, Future of Potions, co-op cards, the Underdocks act.
- Optional: attach the built HTML to GitHub Releases.

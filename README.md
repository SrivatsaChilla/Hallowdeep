# HallowDeep

A deckbuilding roguelike descent. Mechanics and numbers mirror a reference game 1:1; names, text, characters, monsters, art and UI are original.

Built so far: two characters (the Oathburner and the Veiled), all three acts with their monsters, events and six Ancients, Ascension 0 to 10, enchantments, potions and relics, original or HallowDeep names, and layouts tested on 16 screen sizes from desktops to small phones. The Regent is in progress (see dev/REGENT.md).

## Run it

Open `dist/hallowdeep.html` (or the identical `dist/index.html`) in a browser. No server or install needed.

After editing anything in `src/`, rebuild:

    python3 build.py

## Deploy

Netlify builds from source using `netlify.toml`: it runs `python3 build.py` and publishes `dist/`, where `index.html` is the game. Pushing to `main` redeploys. The built files are not committed.

## Test it

    node test/checks.js        # targeted rule checks (damage math, pity, map rules, boss mechanics)
    node test/sim.js 300       # plays 300 random runs headless, reports crashes and stalls
    node dev/verify.js <codex data/eng dir>   # number parity against a Spire Codex export

Run all three after every change. `node dev/verify.js <codex data-beta/v0.111.0/eng> 0.111` checks it. `sim.js` also lists any card, potion or relic that never got exercised.

## Layout

    src/core.js      seeded RNG, keyword glossary, power definitions
    src/cards.js     every card: cost, values, upgrade deltas, text, play()
    src/potions.js   potions: rarity, target, text, use()
    src/monsters.js  monsters (HP, moves, AI) and encounter groups
    src/versions.js  game versions: v0.111 beta card changes and new cards
    src/events.js    ? room odds, event engine, events and their cards and relics
    src/act2.js      Act 2 monsters and encounters, its status cards, Darv and his relics
    src/act3.js      Act 3 monsters and encounters, Burn and Wound
    src/colorless.js colorless cards, the Colorless Potion, Toolbox, Dingy Rug, Lead Paperweight
    src/enchants.js  enchantments, the relics and events that apply them
    src/events2.js   Act 2 and 3 events, shared events from Act 2 on, their cards, relics, Foul Potion and fights
    src/ancients.js  the six Ancients of Acts 2 and 3, their relics and cards, Cook and Kindle
    src/silent.js    the Veiled (the Silent): cards, relics, potions, powers
    src/relics.js    relics as hooks (battleStart, turnStart, afterPlay, onBurn, afterCombat, onPickup...)
    src/combat.js    combat engine, no DOM
    src/run.js       map generation, encounter picks, rewards, shop, rest
    src/ui.js        screens and input
    src/style.css    tokens (light and dark), cards, layout
    src/index.html   template the build fills in
    dev/namemap.json original id to HallowDeep id (dev only, never ship)
    dev/verify.js    parity checker
    FIDELITY.md      what is exact, what is approximated, what is missing

Engine and UI are split on purpose. `combat.js` only talks to the UI through `ui.choose`, `ui.fx` and `ui.pace`, so the same engine runs headless in tests and can later sit behind a different front end. The engine also validates every choice it gets back (count, duplicates, cards that were not offered), so no UI path can take more than a card allows.

`ui.js` renders HTML strings, then patches the live DOM instead of replacing it. Elements with a `data-key` (hand cards, enemies, the energy orb, Guard badges) keep their identity between renders, which is what lets transitions and animations run through state changes. Give anything you want to animate a stable `data-key`.

## Adding content

A card is one `card(id, {...})` call. `v` holds base numbers, `up` holds upgrade deltas, `text(v, f)` builds the description (use `f.d()` for damage and `f.b()` for Guard so live modifiers show), and `play(g, card, target, v, x)` runs the effect through engine helpers like `g.attack`, `g.gainBlock`, `g.apply`, `g.drawCards`, `g.burn`.

A potion is one `potion(id, {...})` call with `rarity`, `target` ('self', 'enemy' or 'all') and `use(g, target)`. A relic is one `relic(rarity, id, {...})` call; add only the hooks it needs. Combat hooks receive `(g, relic, ...)` and run hooks receive `(run, relic, ...)`; `relic.counter` persists between combats, `g.rs` is per-combat scratch space.

A monster is one `mon(id, {...})` call with `hp`, `moves` and an `ai(e, g)` that returns the next move id. Helpers `cyc` (fixed cycle) and `rnd` (weighted, with no-repeat and once flags) cover most patterns.

## Roadmap

- M2a (done): potions, all regular relic tiers, shop potions and relic slots, rest site Lift, Dig and Bedroll.
- Acts: all three are playable.
- M2b (in progress): Neow, 9 curse cards, Neow's Fury, the real ? room odds and 19 events are done. Colorless cards (52 solo cards, the Colorless Potion, Toolbox, Dingy Rug, Lead Paperweight, two colorless shop slots) are done. Still to come: enchantments and the relics that need them, and the other Ancients with Acts 2 and 3.
- M3: second character, then the other three.
- M4: Acts 2 and 3, the alternate Act 1, true ending.
- M5: ascension levels, save and resume, run history.

## Legal

Game mechanics and numbers generally are not protected by copyright, but copying an entire content set one to one can still draw claims, and store takedowns do not need a court. The source data comes from a community project that asks people not to use it to repackage the game. Fine for personal and learning use; talk to a lawyer before any public or paid release.

## Names

The game shows the original card, relic, potion, enemy and keyword names by default. The toggle on the title screen and the map switches to HallowDeep's own names; the choice is saved in the browser. Only names and wording change, never numbers or rules.

`src/names.js` is generated. After editing `dev/namemap.json`, rebuild it with `python3 dev/gen_names.py <codex data/eng dir>`. Before sharing the game publicly, consider defaulting to HallowDeep names (the `'original'` fallback in `HD.boot` in `ui.js`) or dropping `names` and `naming` from `build.py`.

## Card art

Every card has an original painted-style illustration generated as SVG in `src/art.js` (none of the original game's art is used). A card's picture comes from its entry in `ART`: a main motif, an optional second motif, overlay effects and a rotation. The scene colors follow the card type, and small details (light position, roots, ridges) vary per card from its id. To change a card's picture, edit its `ART` entry; to add a new motif, add a 100x100 drawing to `MOTIF`.

## Versions

The game follows the v0.111 data. Cards and monsters first written from the older data get the v0.111 changes from `src/versions.js` once at load: `v` and `up` merge into the older values, anything else replaces them. Cards added in v0.111 carry `only: '0.111'`.

## Saving and controls

The run saves in the browser after every change outside combat and at the start of each fight. The title screen offers "Continue your run"; resuming mid-fight restarts that fight from its first turn (the random draws replay the same way). Winning or dying clears the save.

Ascension (0 to 10) is unlocked one level at a time, per character, as in the original: win a run on a level to unlock the next one for that character. Each character card on the title screen has its own Ascension picker, capped at its highest unlocked level. Each level adds one modifier on top of the ones below it, and the top bar shows the level during a run. `python3 dev/ascension_unlock.py` tests the unlock flow in a browser.

Hover anything that mentions another thing (a relic that enchants a card, adds a card, gives a potion, or uses a keyword) and a panel explains it: enchantments and keywords as text, cards drawn as cards. On touch screens, tap a relic or potion, or press and hold a choice, shop item or reward, to read the same.

On phones and other touch screens, cards are played only by dragging, as in the original: drag a targeted card onto the enemy you want (with one enemy left, dragging it up into the play area is enough), and drag Block, buff and all-enemy cards up past the dashed line. Drop a card back by the hand to cancel. A tap only lifts a card to read it; tap again or anywhere else to put it back. The whole hand fits as an overlapped fan, and landscape gets its own compact layout. With a mouse, clicking still plays cards.

Tap or click a relic, a status effect or an enemy to read what it does. Press and hold any card (or hold the mouse button on it) to inspect it with its keyword definitions.

## Events

An event is one `ev(id, {...})` call in `src/events.js`: `when(run)` is its precondition, `roll(run, rng)` rolls its random values once, and `pages` maps page ids to text and options. An option has a `label`, a `desc(v, run)`, an optional `lock(run, v)` that returns a reason, and `go(run, v)` that applies the effect and returns the next page id (or `{ fight: 'ENCOUNTER' }`). Card picks go through `run.pending` so the UI and the simulator handle them the same way.

## Pickups

Everything the run gains outside the normal flow of play goes through `run.note()`: relics, cards, potions, gold, Max HP, removals and upgrades. The UI reads `run.feed` after each render and shows each batch on screen, then flies every item to where it lives (relic bar, deck, potion belt, gold or HP). Use `run.addRelic`, `run.addCard`, `run.addPotion`, `run.gainGold`, `run.gainMaxHp`, `run.removeCard` and `run.upgrade` rather than touching the arrays directly, or the player will not see what they got.

## Enchantments

A deck card carries `ench: { id, n }`. Combat copies keep it plus a `src` link back to the deck card, so permanent changes (Goopy) stick. Each entry in `HD.ENCH` can define `fits`, `kwAdd`/`kwDrop`, `dmgAdd`, `mult`, `blockAdd`, `replay`, `free`, `after` (runs once after the card is played) and `extra` (purple rules text). To enchant from a relic or event, push `{ kind: 'enchant', id, n, filter, optional }` onto `run.pending`.

## Characters

`HD.CHARS` holds each character: HP, Gold, Energy, starting deck and relic, the card color (pool), the ancient versions used by Archaic Tooth and Touch of Orobas, and the ids of its Strike and Defend. A run is created as `new HD.Run(seed, charId)`; every pool lookup goes through `run.color`. The Veiled's cards are written from the v0.111 data.

## Audit

`node dev/audit.js [stable data dir] [v0.111 data dir]` (the game follows v0.111; the stable export is only reference data) runs every check against the data and writes `dev/audit_report.txt`:
coverage (every card, relic, potion, event and Act 1-3 monster in the data is built or excluded with a stated reason),
numbers (both card sets), keywords, targets, types and keyword upgrades, whether each card, relic and potion text names the same
mechanics as the data (reviewed wording differences are listed, not counted), monster move sequences and starting powers,
and each item of the official v0.111 patch notes that applies to built content.

`python3 dev/qa_devices.py [device names]` plays five real fights through the screen on 14 device sizes (1920x1080 down to a 320x568 phone and a 568x320 phone held sideways), with a mouse on desktops and touch on tablets and phones, and checks after every action for errors, stuck screens, cards that fail to play, page scrolling, and controls, cards or enemies that are off screen or covered.

`python3 dev/qa_resize.py` starts fights at one size and then resizes the window or rotates the device through a chain of sizes (desktop windows, phones and tablets), running the same layout check after every change.

`node test/regent_engine.js` checks the engine pieces the Regent needs (Stars, Forge and the Sovereign Blade, creating and transforming cards, when-drawn effects, self-playing cards, Reflect) with stand-in cards.

`node test/triggers.js` plays out every card trigger that is built: Sly from each discard source (cards, Tools of the Trade, Gambler's Brew, Gambling Chip), exhaust triggers, end-of-turn effects of cards held in hand, draw, shuffle and replay effects. `dev/TRIGGERS.md` lists each trigger type, the rule from the data, the engine function it must go through, and the triggers the remaining characters need.

`python3 dev/cardfaces.py` renders every card (base and upgraded, both name modes, both versions) and checks that each keyword it has (Sly, Retain, Innate, Ethereal, Exhaust and so on) is printed on its face and that every game term on a card has a tooltip. `python3 dev/handfit.py` puts every card in a phone-sized hand and checks that no name or text is cut off.

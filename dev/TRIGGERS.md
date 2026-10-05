# Card triggers

Effects that fire because a card moves (discarded, exhausted, drawn, shuffled) or sits somewhere (in hand at end of turn).
Researched from both data sets (stable and v0.111) across all five characters. Every effect below must go through the
engine function named here, never move cards between piles by hand, or the triggers silently stop working.
`node test/triggers.js` checks each built trigger; `node dev/audit.js` lists any trigger card that is built but untested.

## Keywords in the data

Eternal, Ethereal, Exhaust, Innate, Retain, Sly, Unplayable. All seven are built.

| Keyword | Rule (data wording) | Engine |
|---|---|---|
| Sly | If this card is discarded from your Hand before the end of your turn, play it for free. | `discardFromHand(c)` / `discardChoice(n)` |
| Ethereal | If this card is in your Hand at the end of this turn, it is Exhausted. | end of turn, then `burn(c)` |
| Retain | Retained cards are not discarded at the end of turn. | `staysAtEndOfTurn(c)` |
| Exhaust | Removed until the end of combat. | `burn(c)` |
| Innate | Start each combat with this card in your Hand. | combat start |
| Unplayable, Eternal | Cannot be played; cannot be removed or transformed. | `canPlay`, `removable` |

Sly details: it triggers for every discard from hand during your turn, whatever caused it (a card, a power at the start of
your turn, a potion, a relic at the start of combat). It does not trigger on the normal end-of-turn discard. A card given
Sly for a while (Master Planner, Hand Trick) behaves the same. The discard still counts for Tingsha, Tough Bandages and
Memento Mori.

## Trigger types

| Type | Built examples | Engine |
|---|---|---|
| Discarded from hand | Sly cards; Tingsha, Tough Bandages; Memento Mori | `discardFromHand(c)` |
| Exhausted | Drum of Battle (`onBurn` on the card); Dark Embrace, Feel No Pain, Charon's Ashes, Forgotten Soul | `burn(c)` runs the card's `onBurn`, then relics and powers |
| In hand at end of turn | Burn, Decay, Doubt, Shame, Regret, Bad Luck, Infection, Toxic | the card's `endInHand(g, c)`, run before discards; still runs when the hand is retained |
| Drawn | Speedster, Corrosive Wave, Hellraiser | `drawOne()` |
| Draw pile shuffled | Stratagem, The Abacus, Biiig Hug, Perfect Fit | `reshuffle()` then `onShuffle` |
| Played again | Burst, One-Two Punch, Hidden Gem (Replay), Glam, Spiral | `resolve` play count |

## Engine hooks added for the Regent

Card fields: `star` / `upStar` (Star cost, or 'X'), `onDraw(g, c)` (when drawn), `settleTo(g, c)` returning
'hand' or 'drawTop' (where a played card goes), `playFromAshAtTurnStart` (plays itself from the Exhaust pile at the
start of your turn), `playFromDrawTopAtTurnEnd` (plays itself from the top of the draw pile at the end of your turn).
Combat functions: `gainStars`, `spendStars`, `forge`, `create(card, where)`, `transformInCombat`, `playTimes`,
`blades()`, and `g.endTurnAfterPlay = true` to end the turn once a card resolves.
Registered hooks (`HD.onEngine(name, fn)`): starsGained, starsSpent, created, forged, energySpent, afterPlay,
turnStart, afterDraw, turnEnd, combatWon. `node test/regent_engine.js` checks each one.

## Needed for characters not built yet

| Card | Character | Trigger | Plan |
|---|---|---|---|
| Void | Defect (status) | Whenever you draw this card, lose 1 Energy | `onDraw(g, c)` (built for the Regent) |
| Pagestorm | Necrobinder | Whenever you draw an Ethereal card, draw 1 card | power check in `drawOne()` |
| Kingly Kick, Melancholy, Momentum Strike, Rocket Punch | Regent, Necrobinder, Defect | cost changes while held or after play | per-card `costFn` / `bonusCost` (as Up My Sleeve) |
| Echo Form, Sword Sage, Transfigure | Defect, Regent, Necrobinder | extra plays | `resolve` play count |
| I Am Invincible | Regent | at end of turn, if in hand | `endInHand` |
| Wither, Beckon, Debt | Defect status, Underdocks, Crystal Sphere | at end of turn, if in hand | `endInHand` |
| Ethereal-heavy Necrobinder cards | Necrobinder | Ethereal exhaust at end of turn | already built |

# The Fool: research for the sixth character (HallowDeep: the Minstrel)

Sources: the Spire Codex export for the v0.113.0 beta (now regenerated from v0.114.0) (cards, powers, relics, potions, glossary, characters and the
hover text in messages.json), fetched on Nov 13 2026, one day after the Fool went live on the beta branch. Sri's
starting point was the card list at sts2.untapped.gg/en/cards/fool, which matches the export card for card. The
keyword rules below that are not in the data come from early guides and are marked as guesses in FIDELITY.md.

The rest of the game follows v0.111. Only this character reads the beta export (src/fool_data.js, now v0.114.0).

## Character

- 77 HP, 99 Gold, 3 Energy, 1 Arrow slot. Starting deck: 5 Strike, 4 Defend, Foolish Shot. Relic: Song Bow (start each
  combat with 6 Aim). Storyteller (Touch of Orobas): 12 Aim at the start, 3 more at the end of each turn.
- Archaic Tooth turns Foolish Shot into Divine Shot. Ancient cards: Divine Shot, Lost Lute.
- 90 cards: Basic 3, Common 20, Uncommon 38, Rare 27, Ancient 2; 6 are multiplayer-only (Compost, Covering Fire,
  Enrapture, Ensemble, Self Deprecate, Yoga). Tokens: Sadness (status, Unplayable, Retain), Joy (0, Exhaust, 1 Energy
  and draw 1), The Shot (made by Florescence), and the 22 Tarot cards that Mythic Form deals out.
- 9 relics (Song Bow, Storyteller, Exercise Mat, Ocarina, Whittling Knife, Conductor's Baton, Fertilizer, Twine,
  Bizarre Lamp) and 3 potions (Precision Potion, Bottled Song, Crystalline Euphoria).

## Mechanics

- Arrow: "Arrows can be shot with cards to Impale a target." Cards tagged Shoot need one. While it is stuck in an
  enemy the hover text reads "Currently Impaled in a target. Attack the enemy to Dislodge it."
- Impaled: "This Arrow is Dislodged after you hit this enemy 3 more times." Recall, Uproot and Wrest Dislodge at once.
  Guides say the Arrow also returns when the enemy dies.
- Aim: "Your next Arrow deals {Amount} more damage." Heavy Shot applies it twice.
- Stretch: "The next time you gain Block from a card, gain an additional {Amount} Block."
- Melodies: "Activates if you played a Wah / Cho / Ki card this turn." Cards carry Wah, Cho and Ki as tags (some carry
  two or three). Other cards count Melodies or trigger when one is gained.
- Sadness and Joy: many cards add Sadness as a cost; All Is Well, Anguish, Growth and Fertilizer pay it back; Punch of
  Joy and Ecstasy turn Sadness into Joy.

## How it is built

- src/fool.js: Reeds live on the enemy (`e.reeds`, one entry per Arrow with its owner and hits left) and the player's
  count is derived (`g.reeds()`: Reeds owned, `rs.reedMax`, minus those in living enemies), so an enemy that dies, flees
  or is replaced can never strand one. Refrains live on the turn (`g.t.mel`). Sight and Limber are powers (`aim`,
  `stretch`).
- combat.js hook points: `HD.ATK_MULT`, `HD.PLAY_MODS`, `HD.REPLAY_MODS`, the `playing` hook (a card is about to take
  effect) and the `hitEnemy` hook (each Attack hit).
- Names are in dev/gen_fool.py. Regenerate: `python3 dev/gen_fool.py <newest beta eng dir>`, then dev/gen_names.py with the
  v0.111 folder plus the newest beta one.
- Checks: `node test/fool_cards.js` (67), `CHAR=MINSTREL node test/sim.js 200`, and the Fool's 6 cards in
  test/coop_cards.js.

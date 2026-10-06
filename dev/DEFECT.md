# The Defect: research for the fourth character (HallowDeep: the Wirebound)

Sources: the Spire Codex export (v0.111: cards, orbs, relics, potions, powers, glossary, characters) and the Slay the
Spire wiki (slaythespire.wiki.gg pages for Orbs and Glass). Data wins over the wiki where they disagree.

## Character

- 75 HP, 99 Gold, 3 Energy, 3 Orb Slots. Starting deck: 4 Strike, 4 Defend, Zap, Dualcast. Relic: Cracked Core
  (start of combat, Channel 1 Lightning). Infused Core (Touch of Orobas) Channels 3 and Lightning deals 1 more.
- Archaic Tooth turns Dualcast into Quadcast. Ancient cards (Dusty Tome): Biased Cognition, Quadcast.
- 91 cards: Basic 4, Common 20, Uncommon 38, Rare 27, Ancient 2; 5 co-op only (Energy Surge, Hibernate, Ignition,
  Imitation Learning, One for All). Tokens: Fuel (Compact); status Void (Turbo). Dazed, Slimed, Burn and Wound exist.

## Orbs (HallowDeep: Cells)

- Channel puts an Orb in the first empty slot; with no empty slot the first (rightmost, oldest) Orb is Evoked first.
  Evoke consumes the rightmost Orb. "Leftmost" means the newest (Consuming Shadow). Max 10 slots. A character with no
  slots gets 1 the first time it Channels.
- Lightning: passive 3 to a random enemy, Evoke 8 to a random enemy. Frost: passive 2 Block, Evoke 5 Block.
- Dark: starts at 6; passive adds 6 to its own damage; Evoke deals that damage to the lowest-HP enemy. Focus adds to the
  growth, not to the stored damage.
- Plasma: passive at the START of turn, 1 Energy; Evoke 2 Energy. Unaffected by Focus.
- Glass: passive 4 to ALL, then its value drops by 1 (not below 0); Evoke deals double the current passive to ALL.
- Focus adds to passive and Evoke of Lightning, Frost and Glass, and to Dark's growth. Values never go below 0.
- Passives run at the end of your turn, rightmost first.

## Engine pieces (src/orbs.js and src/combat.js)

g.orbs / g.orbSlots, channel, channelRandom, evokeRight(times), evokeLeft, evokeOrb, orbPassive, orbPassives,
addOrbSlots, focus(), uniqueOrbs(). Hooks: channeled, evoked, statusCreated (create() of a Status), drawn. Echo Form and
Signal Boost replays and Synthesis's free Power are in resolve and costOf. Combat cards keep `src` (the deck card) so
Genetic Algorithm's `grow` is permanent and saved.

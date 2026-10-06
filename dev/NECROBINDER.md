# The Necrobinder: research for the fifth character (HallowDeep: the Unburied)

Sources: the Spire Codex export (v0.111: cards, powers, relics, potions, glossary, characters, monsters) and the Slay the
Spire wiki (slaythespire.wiki.gg pages for Osty, Doom and Soul). Data wins over the wiki where they disagree.

## Character

- 66 HP, 99 Gold, 3 Energy. Starting deck: 4 Strike, 4 Defend, Bodyguard, Unleash. Relic: Bound Phylactery (start of
  your turn, Summon 1). Phylactery Unbound (Touch of Orobas): Summon 5 at combat start, 2 each turn.
- Archaic Tooth turns Unleash into Protector. Ancient cards (Dusty Tome): Forbidden Grimoire, Protector.
- 91 cards: Basic 4, Common 20, Uncommon 38, Rare 27, Ancient 2; 5 co-op only (Cacophony, Glimpse Beyond, Legion of
  Bone, Soulbound, Underworld). Tokens: Soul (0, Exhaust, draw 2 (3)), Sweeping Gaze (Osty deals 10 (15) to a random
  enemy, Exhaust, Ethereal).

## Osty (HallowDeep: Clutch)

- Summon X: Osty appears with X HP; if he is already up, his Max HP and HP both rise by X for this combat.
- After Block, unblocked enemy attack damage hits Osty first; overflow hits the player. Non-attack damage skips him.
- When he reaches 0 HP he dies and can be Summoned again. He starts each combat down.
- Osty Attacks (tag OstyAttack) use his own damage: not changed by the player's Strength or Weak. They do nothing while
  he is down. Calcify adds to them; the target's Vulnerable still applies.

## Doom (HallowDeep: Knell)

- A debuff that stays. At the end of the afflicted creature's own turn, if its HP is at or below its Doom, it dies,
  through Block, Intangible and boss phases. Artifact blocks one application. On the player (Neurosurge) it is checked
  at the end of the player's turn, after orb passives.

## Engine pieces (src/osty.js and src/combat.js)

summon, ostyAttack, ostyAttackAll, ostyAbsorb, killOsty, healOsty, applyDoom, doomKill, addWraiths. Hooks: summoned,
ostyAttacked, died (Osty), doomApplied, doomKilled, debuffApplied, attackDealt, onEnemyDeath (now also an engine hook).
HD.COST_MODS adjusts every card's cost (Veilpiercer, Borrowed Time). Debilitate doubles Vulnerable and Weak on the
enemy; Lethality boosts the first Attack each turn; Undying Sigil halves damage from enemies Doom will kill.

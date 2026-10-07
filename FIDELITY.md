# Fidelity notes

Reference data: Spire Codex export (repo snapshot of Sep 29 2026, changelog 1.3.0) and its v0.111 beta export. The game follows v0.111 only; the older export serves as reference.

## Exact

- Character: 80 HP, 99 gold, 3 energy, starter deck of 5 Cut, 4 Brace, 1 Crack, starter relic heals 6 after combat.
- All 87 Oathburner cards: cost, upgraded cost, every number, upgrade deltas, targets, keywords.
- All 29 Act 1 monsters: HP ranges, move damage, hit counts, block, buffs and debuff amounts, innate powers (Ward 1, Smeared 1 and 8, Sluggish, Territorial 1, Brooding 4, Rite 150, Minion).
- Boss and elite patterns where the data gives them: Rite Ox, Smearwraith, Choir Abbot and Novices, Cogstone, Thornlurch, Pinch Weevil, Hatchet, Crag Roc.
- Card rewards: 3 cards; normal 3/37/60, elite 10/40/50, boss always rare; pity offset starts at -5, +1 per non-rare, cap +40, reset on rare; the negative rare band eats into uncommon; Act 1 upgrade chance 0%.
- Gold: fights 10 to 20, elites 35 to 45, boss 100, treasure 42 to 52.
- Shop: 2 attacks, 2 skills, 1 power; one on sale at half price; card prices 50/75/150 times 0.95 to 1.05; common relics 175 times 0.85 to 1.15; removal 75 plus 25 per use. Shop cards read the pity offset but do not change it.
- Map room rules: 15 rooms, 7 columns, row 1 fights, row 9 treasure, last row rest, 5 elites, 3 shops, 10 to 14 unknown, 6 to 7 rests, no elites or rests in the first 5 rows, first 3 fights from the weak pool.
- Relics: all 25 common, 32 uncommon, 38 rare and 18 shop relics available to this character, with their values (dev/verify.js checks every number in their text).
- Relic rolls: 50% common, 33% uncommon, 17% rare for elites, treasure and the shop's two random slots; an empty tier falls through to the next one up. The third shop relic is always a Shop relic. Relic prices 175/225/275/200 times 0.85 to 1.15. Five gold relics never appear in the shop.
- Potions: all 47 this character can find (44 shared plus 3 character potions), with their values. Drop chance starts at 40%, moves down 10% on a drop and up 10% on a miss with no cap; elites add 12.5% to that roll only; bosses roll like normal fights. Rarity 65/25/10. 3 slots. Shop sells 3 at 50/75/100 times 0.95 to 1.05.
- Rest heals 30% of max HP. Lift gives +1 Might per combat, 3 times max. Old Kettle gives 2 energy.

## Approximated (data gaps)

- Encounter make-up for mixed groups: weak oozes, Sporewing, Mistmaw, Blotlings, Gnawlets, Garnet Bandits (3 of 5), Ooze Pile, Coilvine, Snapgourd.
- Move order for Mossgrub, Moss and Bark Oozes, Bruiser, Bolter, Houndmaster, Brood Toad, and whether the Sleeping Idol loops on Carve.
- Status counts: Sludge 2 (Moss Ooze) or 1, Blight 2, Reeling 1. Mistmaw summons up to 3 Glarebuds, which act as minions.
- Ash Wail returns to the discard pile after it plays itself.
- Cards played by other cards treat X as 0.
- Map path layout uses a classic 6-path walk; the room counts are exact, the exact path algorithm is not.
- Forked Tongue triggers once per combat; the source text does not say whether it resets each turn.
- Last Heartbeat caps HP loss per phase (your turn, the enemy turn) at 20.
- Prism Ring grants its bonus once per turn, when the third card type is played.
- Clockwork Sky's five card rewards use plain odds without touching the rare pity offset.
- Tall Hat rounds bonus gold down.
- Vigor is consumed by the first Attack card that finishes, so every hit of that card gets it.
- Aegis does not stop HP loss you inflict on yourself.
## Game versions

The game follows the v0.111 data (there is no card-set switch). Compared with the older data: 15 Ironclad cards change (Bloodletting, Colossus, Crimson Mantle, Cruelty, Demon Form, Dominate, Expect a Fight, Forgotten Ritual, Howl from Beyond, Mangle, Pact's End, Rampage, Setup Strike, Tank, Taunt), Giant Rock deals 20, and Midnight and Outrage join the pool (Blaze is co-op only). Checked against the v0.111 data: 317 entries, 0 mismatches.

Not built for v0.111 yet: Neow's two new relics (Dowsing Rod, Neow's Sacrifice) and the Ambergris potion; the data does not say which side of Neow's offer they sit on.

## ? rooms and events

Exact: the ? room roll (one roll through fight 10%, treasure 2%, shop 3%, elites never, event otherwise; a hit resets to its base and every other outcome grows by its base), Juzu Bracelet blocking fights, and every number in 19 events (checked against the data, both ends of every random range). Events never repeat within a run and respect their preconditions (gold, HP, floor, act).

Built events: Aroma of Chaos, Byrdonis Nest (with egg hatching at rest sites and Byrdpip), Dense Vegetation (with its Wriggler fight), Jungle Maze Adventure, Luminous Choir, Morphic Grove, Sapphire Seed, The Sunken Statue (Sword of Stone becomes Sword of Jade after 5 elites), Tablet of Truth, Unrest Site, Wellspring, Whispering Hollow, Wood Carvings, Brain Leech, Room Full of Cheese, Slippery Bridge, Tea Master, The Legends Were True, This or That?. All event text is HallowDeep's own.

Act 2 and Act 3 events (built 16 of 17): Amalgamator, Bugslayer, Colossal Flower, Field of Man-Sized Holes, Infested Automaton, The Lost Wisp, Spirit Grafter, The Lantern Key (with its knight fight and the key), Zen Weaver, Battleworn Dummy (three dummies, three turns to win), Grave of the Forgotten, Hungry for Mushrooms, Reflections, The Round Tea Party, Tinker Time (build-your-own card with nine riders) and The Trial. Shared from Act 2 on (built 9 of 12): Doll Room, Potion Courier (with the Foul Potion, which can be thrown at the merchant for 100 Gold), Ranwid the Elder, Relic Trader, Stone of All Time, Symbiote, War Historian Repy (needs the Lantern Key), Welcome to Wongo's and the Self-Help Book. Not built: Colorful Philosophers (needs other characters), Crystal Sphere (an 11x11 minigame), The Merchant??? and The Future of Potions?. The data lists one Act 2 fight (Chomper and Tunneler) without an act; it is in the Act 2 pool here.

Approximations: events are picked uniformly from the eligible pool (the data does not give weights). Riders in Tinker Time are split three per card type (Attack, Skill, Power); the data lists all nine without saying which type offers which. The Battleworn Dummy gives only its event prize, no card or gold spoils. Ranwid takes the potion you choose. "Tradeable" relics are every relic except your starter. The Dense Vegetation fight uses 4 Wrigglers. The first-ever-run rule (two forced events, then a forced fight) is not modelled because there is no account history.

Not built: The Future of Potions? (the data only covers one of its options), War Historian Repy (needs the Lantern Key from later acts). Act 2 and 3 events wait for those acts.

## Acts

All three acts are playable; beating the Act 3 boss wins the run. Exact: map rows per act (15, 14, 13), ? room counts (10-14 in Act 1, 9-13 after), rest sites (6-7, 5-6 in Act 3), two weak fights to open Acts 2 and 3 (three in Act 1), card reward upgrade chance (0%, 25%, 50%, never for Rares), floors counting on across acts (Act 2's Ancient is floor 18, its boss floor 33), and the Ancient between acts healing to full.

Act 2: all 26 monsters and 20 encounters with their HP and attack numbers (checked against the data), including Hard to Kill, Curl Up, Slumber, Burrowed, Flutter, Imbalanced, Plating, Thorns, Personal Hive, Vital Spark, Tender, Crab Rage, flanking with facing, reattaching segments, eggs that hatch, a thief that escapes with your gold, and the Sandpit.

Approximations in Act 2, where the data leaves effects out: Screech adds 3 Dazed, Toxic adds 2 Toxic, Curse of Knowledge adds a random curse, Liquify Ground starts Sandpit at 8 with 2 Frantic Escape, Thievery steals 15 Gold, Sail gives 2 Strength, Tough Eggs hatch into a Bowlbug after 2 turns, Ovicopter lays eggs twice, then switches to Nutritional Paste, Enlarging Strike does not grow, and the move order of Bowlbug (Silk), Chomper, Hunter Killer, Louse Progenitor, the Decimillipede segments and The Obscura. Group sizes: 2 Exoskeletons (weak) and 4 (normal), 2 random Bowlbugs (weak), 2 Mytes.

Act 3: all 23 monsters and 18 encounters (Cubex Construct is shared with Act 1), with HP and attack numbers checked against the data and the v0.111 monster changes applied in the beta card set. Built rules: Chains of Binding (Bound cards), Hex, Galvanic, Paper Cuts, Painful Stabs, Possess Strength and Dexterity, Rampart, Soar, Intangible every other turn (Nemesis), Enrage, the Queen's 99-turn debuffs and her branch when the Amalgam dies, and the Test Subject's three phases.

Act 3 values the data leaves out: the Test Subject's phase HP (100, 200, 300) and Burning Growl's 3 Burns come from published guides. Approximations: Dread deals 12, Forbidden Incantation gives Ritual 3, Fabricator builds Punch Constructs (up to 2), Flamethrower and Increasing Intensity add Burns (3 and 2), Vomit Ichor adds 3 Slimed, Dampen applies 2 Frail, Burn Bright for Me gives the Amalgam 2 Strength, Multi-Claw gains a hit each use, and group sizes (2 Axebots, 2 or 3 Scrolls of Biting). Few events can appear in Act 3 yet, so its ? rooms turn into fights more often than they should.

Ancients between acts: Act 2 meets Orobas, Pael or Tezcatara and Act 3 meets Nonupeipe, Tanx or Vakuu; Darv can appear in either (the data gives him no act). Each heals you to full and offers 3 random relics from its pool. Built: all 12 of Darv's relics and 57 of the other Ancients' 60 (with the 11 cards they hand out, the Cook and Kindle rest options, the ancient Bash and Burning Blood, and the v0.111 changes to nine of them). Not built: Sea Glass and Prismatic Gem (they offer other characters' cards) and Golden Compass (the data does not describe its special path). Approximations: Toy Box's Wax relics are random relics that melt one at a time every 3 combats; Pael's Tooth keeps the removed cards and returns them in random order; Fur Coat marks fights in the current act only; Whispering Earring plays your first turn by picking playable cards at random.

## Colorless cards

52 of the 53 solo colorless cards, with every number checked against the data (and the v0.111 changes to Rend and Salvo in the beta set). Splash waits for the other characters, whose Attacks it offers. The 11 multiplayer-only colorless cards are defined but never offered in solo, as in the original. Alchemize, Hand of Greed and Hidden Gem are never generated mid-combat, per the data. The shop sells 1 Uncommon and 1 Rare colorless card at a 15% markup; Dingy Rug mixes colorless cards into card rewards; Toolbox, Lead Paperweight, the Colorless Potion and Brain Leech's Rip option all work. Approximation: colorless card rewards (Lead Paperweight, Brain Leech) roll Rare 3% of the time, otherwise Uncommon.

## Enchantments

All 22 enchantments, one per card, saved with the deck and shown on the card (name on top, extra rules text at the bottom, both in purple). Built sources: Gnarled Hammer, Kifuda, Punch Dagger, Royal Stamp, Mystic Lighter, Wing Charm, Silken Tress (Neow), Sapphire Seed's Plant, Wood Carvings' Snake, the Self-Help Book event, and a Clone option at Rest Sites. Approximations: Sown gives 1 Energy (the amount is not in the data), and copies made with Clone do not keep the Clone enchantment. Clone duplicates every Clone card at a Rest Site, per the rest-site data.

## The Veiled (the Silent)

Built from the v0.111 data: 70 HP, 99 Gold, 3 Energy, 5 Strikes, 5 Defends, Neutralize and Survivor, Ring of the Snake. All 86 solo cards (80 in the reward pool, plus 4 Basic and 2 Ancient), the Shiv token, 9 relics and 3 potions, with every cost, number, keyword, target and type checked against v0.111 (668 entries).111 changed (Outbreak back to a Power, Well-Laid Plans back to retaining 1 card, Expertise back to drawing up to 6, Tracking back to double damage, Haze, Flick-Flack, Mirage, Anticipate and three rarities), removes Sidestep and adds back Scare. The 5 multiplayer-only Silent cards are defined but never offered. Built mechanics: Poison (ticks at the start of each creature's turn, ignores Block), Accelerant, Shivs (with Accuracy, Phantom Blades, Fan of Knives, Knife Trap, Helical Dart), Sly (a card discarded from your hand during your turn plays itself for free), discard effects (Tingsha, Tough Bandages, Memento Mori), and every power.

Ancient relics follow the character: Archaic Tooth turns Neutralize into Suppress, Touch of Orobas turns Ring of the Snake into Ring of the Drake, and Dusty Tome offers the Silent's Ancient cards.

The Inky enchantment from Blade of Ink only applies Weak in v0.111 (the patch notes removed its bonus damage; the v0.111 data has no enchantment file). Approximations: Speedster counts every card drawn on your turn, including the opening draw. Nightmare's copies arrive at the start of your next turn.

## The Crowned (the Regent)

Built from the v0.111 data: 75 HP, 99 Gold, 3 Energy, 4 Strikes, 4 Defends, Falling Star and Venerate, Divine Right (3 Stars at combat start). All 86 solo cards (80 in the reward pool, 4 Basic, 2 Ancient), the Sovereign Blade, the three Minion tokens and Debris, 9 relics and 3 potions. Every cost, Star cost, number, keyword, target and type comes from the generated src/regent_data.js; dev/verify.js reports 0 mismatches. The 5 multiplayer-only Regent cards are not defined. Archaic Tooth turns Falling Star into Meteor Shower, Touch of Orobas turns Divine Right into Divine Destiny, and Dusty Tome offers Meteor Shower or The Sealed Throne.

Card text follows the card where it disagrees with the power text (Conqueror lasts this turn, Tyranny draws and Exhausts 1, Royalties gives 30 Gold).

Approximations:
- Void Form makes the first 2 cards each turn free of both Energy and Stars ("free to play"); X-cost cards still spend everything.
- Crescent Spear counts cards with a Star cost in every pile (hand, draw, discard, Exhaust) plus itself, and counts X Star cards.
- Black Hole deals its damage once per gain or spend, not once per Star.
- Tyranny keeps the Exhaust keyword the data gives it; a played Power leaves no card behind, so it has no effect.
- Galactic Dust's count of Stars spent carries over between combats, like other counter relics.
- Make It So returns from the draw or discard pile; Skills played by other cards (Decisions, Decisions) count toward its 3 when the next card is played.
- Monarch's Gaze and Crush Under lower Strength until the end of the enemy's next turn (the same "this turn" rule as Piercing Wail).
- Resonance's Strength loss on enemies is permanent and is not blocked by Artifact, as with Malaise.
- Monologue does not count itself; The Sealed Throne, Monologue and Make It So do not trigger from cards that play themselves (Bombardment, I Am Invincible).

## The Wirebound (the Defect)

Built from the v0.111 data: 75 HP, 99 Gold, 3 Energy, 3 Orb Slots, 4 Strikes, 4 Defends, Zap and Dualcast, Cracked Core. All 86 solo cards, Fuel and Void, 9 relics and 3 potions, with every cost, number, keyword, target and type from the generated src/defect_data.js (dev/verify.js: 0 mismatches). The 5 multiplayer-only Defect cards are defined but never offered. Orb rules are in dev/DEFECT.md.

Card text follows the card where it disagrees with the power text (Trash to Treasure Channels 1, Creative AI adds 1 Power, Consuming Shadow Evokes 1 Orb, per copy).

Approximations:
- Losing Orb Slots (Bulk Up) removes the newest Orbs without Evoking them; Channeling with 0 slots does nothing once the character has had slots.
- FTL counts the cards played before it this turn.
- "Whenever you create a Status" counts Status cards your own cards and powers create, not ones enemies add.
- Storm and Subroutine do not trigger for the Power card that gives them.
- Glass's Evoke is double its current passive, so it shrinks with the passive.
- Emotion Chip checks HP lost from the start of your previous turn through the enemy turn.
- Power Cell picks its 2 zero-cost cards before the opening draw.

## The Unburied (the Necrobinder)

Built from the v0.111 data: 66 HP, 99 Gold, 3 Energy, 4 Strikes, 4 Defends, Bodyguard and Unleash, Bound Phylactery. All 86 solo cards, Soul and Sweeping Gaze, 9 relics and 3 potions, with every cost, number, keyword, target and type from the generated src/necro_data.js (dev/verify.js: 0 mismatches). The 5 multiplayer-only cards are defined but never offered. Osty and Doom rules are in dev/NECROBINDER.md.

Card text follows the card where it disagrees with the power text (Reaper Form applies that much Doom per copy).

Approximations:
- Osty's attacks are not hit back by enemy Thorns (Spines), and they do not count as your hits for other characters' "you hit" effects.
- Sic 'Em applies after its own hit, so only later Osty hits Summon.
- "Ethereal cards played" counts cards you play that are Ethereal when played, not ones that play themselves.
- Sacrifice's Block is not changed by Dexterity.
- Bookmark and Ivory Tile use the current cost or the Energy actually paid; Wide Brim picks Ethereal cards from the character's pool.

## Audit fixes (v0.111)

Midnight and Outrage are multiplayer-only in the v0.111 data (they count cards Exhausted by anyone, or copy into everyone's discard pile), so they are defined but never offered in solo; dev/audit.js now flags any multiplayer-only card that is not marked co-op.

Found by dev/audit.js and fixed: Axebot's Stock (it is replaced twice when killed, +10 Max HP each time; the fight is one Axebot in v0.111), the move order of Tunneler (Strike from Below repeats until it is dug out), Bowlbug (Nectar), Cubex Construct, Thieving Hopper and Torch Head Amalgam, original move names for 15 Act 1 monsters, and Neow's missing relics: Fishing Rod, Kaleidoscope, and the v0.111 Dowsing Rod (with Dowsing and Abundance) and Neow's Sacrifice (with Ambergris). Circlet is given when the relic pools run dry. Not built: Massive Scroll (co-op cards) and Scroll Boxes (card packs not in the data).

## Multiplayer (in progress)

Rules from the wiki's co-op page; the design and status are in dev/MULTIPLAYER.md. Built so far is the combat engine for
2 to 4 players (no screens or network yet). Approximations:
- Enemy HP, Block and scaled powers round down.
- If only some players get an extra turn, they play it while the others wait; the enemies act after.
- Steal moves take from every player and give each their share back on death; the enemy's own gain happens once per move
  (The Faded gains 2 Poise, The Strayed 2 Might).
- Accelerant (Quickening) adds up across players for every Toxin tick.
- "When an enemy dies", Knell kills and end-of-fight effects trigger for every standing player.
- Co-op cards that give Guard to another player (Boost, Sky Chart, Rally Cry) work it out on the card you play (your
  Poise counts) and hand it over as it is; Shared Scar gives exactly your Guard.
- Lurk (Sneaky) and Pile On (Gang Up) count each attack card or Clutch attack against an enemy once, however many hits.
- Knocked Over (Knockdown) multiplies all damage from the other players; Flanked doubles only their attack damage.
  Flanked, Knocked Over, Double Team, Take the Blow and Netherworld last until the next round starts. Deep Sleep
  (Hibernate) lasts until your next turn, so the Rime passive at the end of your turn shares its Guard.
- Co-op runs: Ascension is 0; each player gets their own Ancient and their own chest (the original shows everyone the
  same Ancient and puts one relic per player in a shared chest); the host's relics decide what a ? room holds; a player
  who drops to 0 HP outside a fight stays at 1 HP; co-op runs are not saved.
- Map votes: the room with the most votes wins, and a split vote goes to whoever has waited longest for a split to
  go their way (the original picks at random, weighted by votes; players found that felt unfair). Moth Boots cannot
  leave the path in co-op, since the party moves together.
- Royal Gift (Largesse) picks from the solo colorless cards. Relay Stone (The Ball) passes to a random other standing
  player after it is played, keeping its extra damage for the rest of the fight.

## Ascension

Levels 1 to 10 follow ascensions.json and the mechanics constants: 8 elites per act instead of 5 (A1), Ancients heal 80% of missing HP (A2), 25% less Gold from fights and chests (A3), 2 potion slots (A4), Ascender's Bane (A5), the Scarcity rarity numbers (A7: Rare 1.49%/5%/4.5% and half the rarity growth), each monster's Ascension HP (A8) and each move's Ascension damage (A9) from the monster data for the chosen card set, and a second Act 3 boss (A10).
Approximations: Gloom (A6) removes 1 Rest Site per act (the count is not in the data); Scarcity also halves the chance of upgraded card rewards (the rate is not in the data); A8 Block values are not changed (the data's Block entries cannot be matched to moves); with Double Boss the second boss follows the first boss's rewards directly.

## Map

The map climbs from a single start node at the bottom to the boss at the top. The start node is Neow. Floors count Neow as floor 1, so the Act 1 boss is floor 17.

## Ancients

Exact: Neow heals you to full, then offers 2 relics from the positive pool and 1 from the curse pool, with one of each pair (Lava Rock or Small Capsule, Nutritious Oyster or Stone Humidifier, Neow's Talisman or Pomander) eligible and the conflict rules applied (Cursed Pearl blocks Golden Pearl, Hefty Tablet blocks Arcane Scroll, Leafy Poultice blocks New Leaf, Precarious Shears blocks Precise Scissors, Large Capsule blocks both capsule-pair relics). 22 of the 26 Neow relics are built with their exact values.

Not built yet: Lead Paperweight (needs colorless cards), Massive Scroll (needs multiplayer cards), Scroll Boxes (pack contents not in the data), Silken Tress (needs enchantments). The other Ancients (Tezcatara, Nonupeipe, Darv, Tanx, Orobas, Pael, Vakuu) appear at the Act 2 and 3 transitions and come with those acts.

Approximations: the random curse pool is Clumsy, Decay, Doubt, Injury, Normality, Regret, Shame and Writhe; the data does not list which curses a random roll can give. Transform picks uniformly from the character's Common, Uncommon and Rare cards.

## Not built yet

Ancients, colorless cards and the Colorless Potion, enchantments and the six relics that need them, the two colorless relics, the Juzu-style relic, the upgraded starter relic, the other four characters, Acts 2 and 3, the alternate Act 1, ascension, co-op (Shared Scar and Take the Hits are excluded from solo pools). Saving works per run; there is no run history or unlock progression.

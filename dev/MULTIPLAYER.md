# Multiplayer (co-op)

Sources: the wiki's co-op page (slaythespire.wiki.gg, "Slay the Spire 2:Multiplayer") and the v0.111 data (37 multiplayer-only
cards; the Intercept, Covered, Tank and Flanking powers; the Imbalanced and Attack intent texts). Data wins where they overlap.

## Rules of the original

- 1 to 4 players, any characters, duplicates allowed. Ascension is shared (the lowest level everyone has unlocked) and
  tracked apart from solo, not per character.
- Map: the party moves together. Each player votes; if they disagree, the room is picked at random, weighted by votes.
  Every act is 1 floor shorter (Act 1 boss on floor 16, Act 2 on 31, Act 3 on 45).
- Combat is real time. The player turn ends only when every player has ended theirs.
- Enemies attack and debuff every player at once; each player blocks on their own. Enemy attacks are not scaled.
  Damage buffs only help their owner; debuffs on an enemy help everyone.
- Enemy HP: HP x players x act factor (1.1 in Act 1, 1.2 in Acts 2 and 3, 1.3 for the Act 3 boss). Enemy Block the same.
  Plating x ((n - 1) x 2 + 1); Artifact + (n - 1); Slippery x n; Skittish x ((n - 1) x 0.5 + 1), rounded down;
  Curl Up, Flutter, Hardened Shell, Plow, Rampart, Reattach, Regen and Shriek x n x act factor.
- A player who falls is revived on the next floor at 1 HP if anyone survived the fight (before Burning Blood heals).
  The run ends only if the whole party falls in the same fight.
- Rest sites add Mend: heal another player for 30% of their Max HP. Miniature Tent gives all three options.
- Events: everyone gets the same event and mostly chooses on their own; some events need everyone to pick the same
  option. The Merchant??? never appears.
- Potions that target yourself can be thrown to another player instead; potions used outside combat only in combat.
- Ancients: everyone meets the same Ancient, each with their own relic offer. Neow never offers Silver Crucible or
  Winged Boots (Massive Scroll instead).
- Treasure: one unique relic per player; each picks; clashes go to rock-paper-scissors and the loser gets a leftover.
- Merchants are separate per player. Relics only affect their owner and cannot be traded.
- Cards: the 37 multiplayer-only cards (5 per character, 12 colorless) join the pools. Some cards never affect other
  players even if they sound like it: Cruelty, Accuracy, Tracking, Shadow Step, Lethality, Reaper Form, Claw, Maul.

## How HallowDeep does it

### Seats (src/combat.js)

- A fight has one seat per player. A seat holds that player's Run, creature (`p`), piles, Energy, Glint, Cells, Clutch,
  turn count and per-fight relic flags (`Combat.SEAT_KEYS`). Shared state (enemies, `round`, RNG, log) stays on the Combat
  (`Combat.SHARED_KEYS`). test/sim.js fails if the engine ever writes a field that is in neither list.
- The Combat exposes the active seat's fields under the old names (`g.p`, `g.hand`, `g.energy`, `g.run`...), so the card,
  relic and potion code written for one player works unchanged. `withSeat(seat, fn)` and `asSeat(seat, fn)` switch it.
- `g.act(i, action)` queues one player's action (`{k: 'play', card, target}`, `potion`, `end`, `unend`) as plain data.
  Actions resolve one at a time in arrival order. With one seat, everything behaves exactly as before (the sim
  fingerprints in test/sim.js did not change).
- Rounds: `startTurn` starts every standing player's turn (the first one also runs the enemies' upkeep). `endTurn` marks
  a player ready; when every standing player is, each one's end of turn runs in seat order, then the enemy turn.
- Enemy moves: attacks, debuffs and status cards go to every standing player. A move's `each(g, e)` runs once per player
  (theft, curses, Sandpit) and `fx(g, e)` once. Stolen Might, Poise and Gold go back to whoever lost them.

### Co-op cards (src/coop.js)

- All 37 multiplayer-only cards, built on the stubs in each character's file. Six were new and got HallowDeep names: Sky
  Chart (Constellation), Shared Anvil (Hammer Time), Royal Gift (Largesse), War Council (Plot), Counsel (Tutor) and
  Relay Stone (The Ball).
- `run.party` is the number of players; `run.pool()` adds co-op cards to every card pool when it is above 1.
- A card with `target: 'ally'` aims at another player (`{ k: 'play', card, ally: seatIndex }`) and cannot be played
  without one. Potions you would drink can be thrown to another player the same way.
- Engine pieces they use: `g.allies()`, `g.asAlly(t, fn)`, `g.everyone(fn)`; marks on enemies that only help the other
  players (`g.mark`, Flanked, Knocked Over, Double Team); `seat.cover` for Take the Blow; the hooks `allyAttacked`,
  `allyAttackDealt`, `blockGained` and `anyDrawn`; and `HD.ATK_ADD` / `HD.TAKEN_MODS` for All Hands and Take the Hits.

### Network (src/net.js)

- Lockstep inside combat. `HD.NetHost` seats players by the link they joined on (so nobody can act for anyone else),
  turns away a different build (`HD.BUILD`, stamped by build.py) and numbers every action and choice. `HD.NetPeer` is
  one player: it runs the fight and applies the host's numbered messages strictly in order.
- Messages (JSON): `hello`/`welcome`/`reject`; `snap-req`/`snap` (each player's `run.toSave()` and next uid);
  `fight` (every snapshot, the uid start, encounter and kind: everyone builds the same Combat, the host's run first so
  its RNG drives the fight); `act` (a player's move) and `pick` (their answer to a prompt) become `seq` with a number
  `n`; `hash` (a fingerprint of the fight, `HD.fightHash`, sent when the round changes and at the end) and `desync`.
- Prompts in the middle of a card belong to the player resolving it (`g.seat` when `ui.choose` runs). That player
  answers; everyone, them included, uses the numbered answer, matched by a per-player prompt count.
- Rejoin: a player who drops sends `hello` with their seat and gets the fight's start and every numbered message so
  far, then replays them in a fresh copy of the game. Until then the round waits for them.
- Every message off a link is checked (types, numbers, sizes); anything else is ignored.
- Links: `HD.loopPair` (in memory, in order, optional delay) for tests and one-machine play. WebRTC comes next with
  the lobby. test/net_sim.js runs each player in its own copy of the game and checks that every copy ends the same,
  that rejoining works, that tampering is caught and that bad messages are refused.
- Out of combat is not networked yet: map votes, room barriers and shared results come with the lobby (step 4).

## Status

| Step | What | State |
|---|---|---|
| 0 | Rules research (this file) | done |
| 1 | Seats; solo unchanged | done |
| 2a | N players in the engine: rounds, enemy turn for all, falling, scaling, theft | done (test/mp_checks.js, test/mp_sim.js) |
| 2b | The 37 co-op cards, multiplayer card pools, throwing potions, Intercept/Covered, Tank | done (test/coop_cards.js) |
| 3 | Net layer: transport, host sequencer, snapshot exchange, desync hash, N-client test in Node | done (test/net_sim.js) |
| 4 | WebRTC, lobby, barriers, map vote, Mend, treasure picks | |
| 5 | Allies on the combat screen (phones too), animations for other players' cards | |
| 6 | Rejoin and hardening | |

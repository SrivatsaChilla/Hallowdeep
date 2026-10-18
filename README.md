<div align="center">

# HallowDeep

**A Slay the Spire clone you can play in your browser.**

### [▶ Play at hallowdeep.netlify.app](https://hallowdeep.netlify.app/)

No download or account needed.

https://github.com/user-attachments/assets/d4d03bcb-1d71-41a8-8b12-3d0dcacf00bd

<sub>Video not playing? [Download it](docs/hallowdeep.mp4) (21 seconds).</sub>

<table>
<tr>
<td><img src="docs/screenshots/fight.jpg" alt="A fight: the Wirebound faces three Choir monsters with a hand of five cards" width="400"></td>
<td><img src="docs/screenshots/rewards.jpg" alt="Choosing a new card after a fight" width="400"></td>
</tr>
<tr>
<td><img src="docs/screenshots/map.jpg" alt="The Act 1 map, a web of fights, events and rest sites" width="400"></td>
<td><img src="docs/screenshots/title.jpg" alt="The title screen with all five heroes" width="400"></td>
</tr>
</table>

</div>

Build a deck, climb three acts, and see how far you get. HallowDeep is a faithful clone of Slay the Spire 2: every
card, relic, potion, monster and number comes from the game's v0.111 data, with its own card art and interface.

Play as the Ironclad, Silent, Regent, Necrobinder or Defect, then push your favorite through Ascension 1 to 10. Cards
and monsters use their original names, or flip a switch for HallowDeep's own. It plays on desktops, tablets and
phones, and your run saves as you go.

## Play together

Bring up to three friends, each on their own device. One player hosts and shares a five-letter room code; everyone
else joins with it. No accounts, nothing to install.

- **Pick the path together.** Everyone votes on the next room, and a split vote spins a roulette over the picks.
- **Fight side by side.** See your teammates' HP, Energy and cards in hand, where they are pointing, what they are
  aiming at, and every card they play.
- **Look out for each other.** Chat with T, Mend a teammate at a rest site, throw them a potion, and find 37 cards
  made for co-op.
- **Dropped out? Jump back in.** Refresh or reopen the game and pick **Rejoin your co-op game** to take your seat
  back, even mid-fight. If the host drops, they rejoin the same way and the party reconnects.
- Enemies get more HP with every player.

## The little things

- **Damage preview.** Aim a card or potion and every health bar shows exactly what it will take, plus the total when
  it hits several enemies. Anything left to chance or to your draw pile stays secret.
- **Cards that play themselves** (Cascade, Mayhem, Distilled Chaos) rise from your draw pile into a queue, face down
  until each one plays.
- **Show upgrades** in your deck view to see what every card becomes before you upgrade it.
- **Sound and music,** made in your browser as you play. Volume and mute are under the speaker button.

## Run it locally

From the HallowDeep folder:

```bash
python3 build.py
```

Then open `dist/hallowdeep.html` in a browser. Developer notes are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Host your own copy

Netlify builds the game from this repo as is (`netlify.toml` runs `build.py` and serves `dist/`). Co-op works without
any setup; to help players on strict networks connect, add a Cloudflare TURN key as the `CF_TURN_KEY_ID` and
`CF_TURN_API_TOKEN` environment variables (mark the token secret).

<sub>An unofficial fan project, not affiliated with Mega Crit. Game data from [Spire Codex](https://github.com/ptrlrd/spire-codex). For personal and learning use.</sub>

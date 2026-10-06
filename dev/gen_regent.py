# Builds src/regent_data.js (the Regent's card numbers from the v0.111 data) and adds the Regent to dev/namemap.json.
# Usage: python3 dev/gen_regent.py <v0.111 eng dir>
import sys
from charlib import generate, SOURCES

CARD_NAMES = {
  'STRIKE_REGENT': 'Smite', 'DEFEND_REGENT': 'Ward Off', 'FALLING_STAR': 'Starfall', 'VENERATE': 'Revere',
  'ALIGNMENT': 'Conjunction', 'ARSENAL': 'Armory', 'ASTRAL_PULSE': 'Starthrob', 'BEGONE': 'Dismissal', 'BEAT_INTO_SHAPE': 'Hammer Out',
  'BIG_BANG': 'First Light', 'BLACK_HOLE': 'Event Horizon', 'BOMBARDMENT': 'Skyfall Volley', 'BULWARK': 'Bastion Wall', 'BUNDLE_OF_JOY': 'Gift Basket',
  'CHARGE': 'Muster', 'CELESTIAL_MIGHT': "Heaven's Weight", 'CHILD_OF_THE_STARS': 'Starborn', 'CLOAK_OF_STARS': 'Starry Mantle',
  'COLLISION_COURSE': 'Impact Path', 'COMET': 'Firetail', 'CONQUEROR': 'Usurper', 'CONVERGENCE': 'Confluence', 'COSMIC_INDIFFERENCE': 'Cold Heavens',
  'CRASH_LANDING': 'Hard Descent', 'CRESCENT_SPEAR': 'Moon Pike', 'CRUSH_UNDER': 'Trample Down', 'DEBRIS': 'Rubble', 'DECISIONS_DECISIONS': 'Royal Decree',
  'DEVASTATE': 'Ruination', 'DYING_STAR': 'Fading Sun', 'FOREGONE_CONCLUSION': 'Foreseen End', 'FURNACE': 'Bellows', 'GUARDS': 'Honor Guard',
  'GAMMA_BLAST': 'Ray Burst', 'GATHER_LIGHT': 'Hoard Light', 'GENESIS': 'Wellspring', 'GLIMMER': 'Twinkle', 'GLITTERSTREAM': 'Sparkle Tide',
  'GLOW': 'Luster', 'GUIDING_STAR': 'North Light', 'HEAVENLY_DRILL': 'Sky Auger', 'HEGEMONY': 'Dominion', 'HEIRLOOM_HAMMER': 'Old Mallet',
  'HIDDEN_CACHE': 'Secret Hoard', 'I_AM_INVINCIBLE': 'Unbowed', 'KINGLY_KICK': 'Royal Boot', 'KINGLY_PUNCH': 'Royal Fist', 'KNOCKOUT_BLOW': 'Felling Blow',
  'KNOW_THY_PLACE': 'Kneel', 'LUNAR_BLAST': 'Moonburst', 'MAKE_IT_SO': 'So Decreed', 'MANIFEST_AUTHORITY': 'Show of Rule', 'METEOR_SHOWER': 'Starstorm',
  'MINION_DIVE_BOMB': 'Thrall Plunge', 'MINION_SACRIFICE': 'Thrall Shield', 'MINION_STRIKE': 'Thrall Strike', 'MONARCHS_GAZE': 'Royal Stare',
  'MONOLOGUE': 'Proclamation', 'NEUTRON_AEGIS': 'Dense Shell', 'ORBIT': 'Circuit', 'PALE_BLUE_DOT': 'Far Speck', 'PARRY': 'Riposte',
  'PARTICLE_WALL': 'Mote Wall', 'PATTER': 'Small Talk', 'PHOTON_CUT': 'Light Slice', 'PILLAR_OF_CREATION': 'Nursery Cloud', 'PROPHESIZE': 'Foretell',
  'QUASAR': 'Beacon', 'RADIATE': 'Shine Forth', 'REFINE_BLADE': 'Hone Edge', 'REFLECT': 'Mirror Guard', 'RESONANCE': 'Harmonize',
  'ROYAL_GAMBLE': "King's Wager", 'ROYALTIES': 'Tribute', 'SEEKING_EDGE': 'Hunting Edge', 'SEVEN_STARS': 'Seven Lights', 'SHINING_STRIKE': 'Bright Smite',
  'SOLAR_STRIKE': 'Sun Smite', 'SOVEREIGN_BLADE': 'Regal Blade', 'SPECTRUM_SHIFT': 'Prism Turn', 'SPOILS_OF_BATTLE': 'War Plunder', 'STARDUST': 'Stardrift',
  'SUMMON_FORTH': 'Call the Blade', 'SUPERMASSIVE': 'Heavy Star', 'SWORD_SAGE': 'Blademaster', 'TERRAFORMING': 'Reshape Land',
  'THE_SEALED_THRONE': 'The Locked Throne', 'THE_SMITH': 'The Armorer', 'TYRANNY': 'Iron Rule', 'VOID_FORM': 'Hollow Form', 'WROUGHT_IN_WAR': 'Battle-Forged',
}
RELIC_NAMES = {'DIVINE_RIGHT': 'Star Circlet', 'DIVINE_DESTINY': 'Fated Circlet', 'FENCING_MANUAL': 'Sword Primer', 'GALACTIC_DUST': 'Comet Dust',
  'LUNAR_PASTRY': 'Moon Cake', 'MINI_REGENT': 'Little King', 'ORANGE_DOUGH': 'Leavened Dough', 'REGALITE': 'Crownstone', 'VITRUVIAN_MINION': 'Model Thrall'}
POTION_NAMES = {'COSMIC_CONCOCTION': 'Starbrew', 'KINGS_COURAGE': 'Royal Nerve', 'STAR_POTION': 'Glint Flask'}
TOKENS = {'SOVEREIGN_BLADE', 'MINION_STRIKE', 'MINION_DIVE_BOMB', 'MINION_SACRIFICE', 'DEBRIS'}

generate(sys.argv[-1], 'REGENT_DATA', 'regent_data.js', CARD_NAMES, RELIC_NAMES, POTION_NAMES, TOKENS,
  {'The Regent': 'The Crowned', 'Stars': 'Glints', 'Star': 'Glint', 'Forge': 'Temper', 'Sovereign Blade': 'Regal Blade', 'Minion': 'Thrall'},
  SOURCES)

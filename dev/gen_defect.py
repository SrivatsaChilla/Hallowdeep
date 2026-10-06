# Builds src/defect_data.js (the Defect's card numbers from the v0.111 data) and adds the Defect to dev/namemap.json.
# Usage: python3 dev/gen_defect.py <v0.111 eng dir>
import sys
from charlib import generate, SOURCES

CARD_NAMES = {
  'STRIKE_DEFECT': 'Pound', 'DEFEND_DEFECT': 'Casing', 'ZAP': 'Arc', 'DUALCAST': 'Double Release',
  'BALL_LIGHTNING': 'Bolt Ball', 'BARRAGE': 'Cell Volley', 'BEAM_CELL': 'Pin Beam', 'BOOST_AWAY': 'Thruster', 'CHARGE_BATTERY': 'Store Power',
  'CLAW': 'Pincer', 'COLD_SNAP': 'Rime Shot', 'COMPILE_DRIVER': 'Compiler', 'COOLHEADED': 'Cool Logic', 'FOCUSED_STRIKE': 'Tuned Pound',
  'GO_FOR_THE_EYES': 'Eye Poke', 'GUNK_UP': 'Grease Up', 'HOLOGRAM': 'Projection', 'HOTFIX': 'Quick Patch', 'LEAP': 'Hop',
  'LIGHTNING_ROD': 'Bolt Mast', 'MOMENTUM_STRIKE': 'Rolling Pound', 'SWEEPING_BEAM': 'Sweep Ray', 'TURBO': 'Overdrive', 'UPROAR': 'Clamor',
  'BOOT_SEQUENCE': 'Startup', 'BULK_UP': 'Heavy Frame', 'CAPACITOR': 'Extra Cells', 'CHAOS': 'Wild Cell', 'CHILL': 'Cold Front',
  'COMPACT': 'Compress', 'DARKNESS': 'Gathering Murk', 'DOUBLE_ENERGY': 'Doubler', 'ENERGY_SURGE': 'Power Share', 'FERAL': 'Ravenous',
  'FIGHT_THROUGH': 'Grind On', 'FTL': 'Fast Lane', 'FUSION': 'Fuse', 'GLACIER': 'Ice Shelf', 'GLASSWORK': 'Shardcraft', 'HAILSTORM': 'Sleet',
  'HIBERNATE': 'Deep Sleep', 'IGNITION': 'Kick Start', 'ITERATION': 'Second Pass', 'LOOP': 'Cycle', 'NULL': 'Blank Out', 'OVERCLOCK': 'Redline',
  'REFRACT': 'Refractor', 'ROCKET_PUNCH': 'Piston Fist', 'SCAVENGE': 'Salvage', 'SCRAPE': 'Scrap Pick', 'SHADOW_SHIELD': 'Murk Guard',
  'SKIM': 'Scan', 'SMOKESTACK': 'Chimney', 'STORM': 'Thunderhead', 'SUBROUTINE': 'Side Process', 'SUNDER': 'Split Apart',
  'SYNCHRONIZE': 'Sync Up', 'SYNTHESIS': 'Assembly', 'TEMPEST': 'Squall', 'TESLA_COIL': 'Arc Coil', 'THUNDER': 'Rumble', 'WHITE_NOISE': 'Hiss',
  'ADAPTIVE_STRIKE': 'Learning Pound', 'ALL_FOR_ONE': 'Gather Round', 'BUFFER': 'Failsafe', 'CONSUMING_SHADOW': 'Hungry Murk',
  'COOLANT': 'Coolant Line', 'CREATIVE_AI': 'Dreaming Engine', 'DEFRAGMENT': 'Retune', 'ECHO_FORM': 'Mirror Form', 'FLAK_CANNON': 'Scrap Cannon',
  'GENETIC_ALGORITHM': 'Self Improve', 'HELIX_DRILL': 'Spiral Drill', 'HYPERBEAM': 'Overbeam', 'ICE_LANCE': 'Rime Lance',
  'IMITATION_LEARNING': 'Mimic Routine', 'MACHINE_LEARNING': 'Self Study', 'METEOR_STRIKE': 'Crashing Pound', 'MODDED': 'Retrofit',
  'MULTI_CAST': 'Chain Release', 'ONE_FOR_ALL': 'All Hands', 'RAINBOW': 'Spectrum', 'REBOOT': 'Restart', 'SHATTER': 'Overload',
  'SIGNAL_BOOST': 'Amplify', 'SPINNER': 'Shard Lathe', 'SUPERCRITICAL': 'Meltdown', 'TRASH_TO_TREASURE': 'Junk Alchemy', 'VOLTAIC': 'Storm Bank',
  'BIASED_COGNITION': 'Fixed Belief', 'QUADCAST': 'Fourfold Release',
  'VOID': 'Drain', 'FUEL': 'Battery',
}
RELIC_NAMES = {'CRACKED_CORE': 'Split Core', 'INFUSED_CORE': 'Charged Core', 'DATA_DISK': 'Memory Disc', 'EMOTION_CHIP': 'Feeling Gear',
  'GOLD_PLATED_CABLES': 'Gilt Wiring', 'METRONOME': 'Tick Counter', 'POWER_CELL': 'Reserve Pack', 'RUNIC_CAPACITOR': 'Rune Bank', 'SYMBIOTIC_VIRUS': 'Murk Seed'}
POTION_NAMES = {'ESSENCE_OF_DARKNESS': 'Murk Essence', 'FOCUS_POTION': 'Tuning Draught', 'POTION_OF_CAPACITY': 'Cell Draught'}
TOKENS = {'VOID', 'FUEL'}

generate(sys.argv[-1], 'DEFECT_DATA', 'defect_data.js', CARD_NAMES, RELIC_NAMES, POTION_NAMES, TOKENS,
  {'The Defect': 'The Wirebound', 'Orbs': 'Cells', 'Orb': 'Cell', 'Channeled': 'Primed', 'Channel': 'Prime', 'Evoked': 'Released', 'Evoke': 'Release',
   'Focus': 'Tuning', 'Lightning': 'Bolt', 'Frost': 'Rime', 'Dark': 'Murk', 'Plasma': 'Flux', 'Glass': 'Shard'},
  SOURCES + ['regent_data', 'regent'])

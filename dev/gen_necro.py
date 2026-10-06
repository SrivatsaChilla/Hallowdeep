# Builds src/necro_data.js (the Necrobinder's card numbers from the v0.111 data) and adds her to dev/namemap.json.
# Usage: python3 dev/gen_necro.py <v0.111 eng dir>
import sys
from charlib import generate, SOURCES

CARD_NAMES = {
  'STRIKE_NECROBINDER': 'Rake', 'DEFEND_NECROBINDER': 'Bone Ward', 'BODYGUARD': 'Hand Up', 'UNLEASH': 'Let Loose',
  'AFTERLIFE': 'Hereafter', 'BLIGHT_STRIKE': 'Rot Rake', 'DEFILE': 'Desecrate', 'DEFY': 'Stand Fast', 'DRAIN_POWER': 'Siphon',
  'FEAR': 'Dread', 'FLATTEN': 'Squash', 'GRAVE_WARDEN': 'Tomb Keeper', 'GRAVEBLAST': 'Grave Burst', 'INVOKE': 'Summoning Rite',
  'NEGATIVE_PULSE': 'Death Pulse', 'POKE': 'Prod', 'PULL_AGGRO': 'Draw Fire', 'REAP': 'Harvest', 'REAVE': 'Rip Free',
  'SCOURGE': 'Death Mark', 'SCULPTING_STRIKE': 'Carving Rake', 'SNAP': 'Flick', 'SOW': 'Scatter', 'WISP': 'Flicker',
  'BONE_SHARDS': 'Bone Burst', 'BORROWED_TIME': 'Stolen Hours', 'BURY': 'Entomb', 'CALCIFY': 'Harden', 'CAPTURE_SPIRIT': 'Bottle Wraith',
  'CLEANSE': 'Purge', 'COUNTDOWN': 'Final Hours', 'DANSE_MACABRE': 'Bone Waltz', 'DEATH_MARCH': 'Funeral March', 'DEATHBRINGER': 'Deathcaller',
  'DEATHS_DOOR': 'Last Breath', 'DEBILITATE': 'Weaken Will', 'DELAY': 'Stall', 'DIRGE': 'Lament', 'DREDGE': 'Exhume',
  'ENFEEBLING_TOUCH': 'Withering Touch', 'FETCH': 'Retrieve', 'FRIENDSHIP': 'Old Friend', 'HAUNT': 'Haunting', 'HIGH_FIVE': 'Clap',
  'LEGION_OF_BONE': 'Bone Legion', 'LETHALITY': 'Killing Intent', 'MELANCHOLY': 'Sorrow', 'NO_ESCAPE': 'Inescapable', 'PAGESTORM': 'Leafstorm',
  'PARSE': 'Read Through', 'PULL_FROM_BELOW': 'Drag Under', 'PUTREFY': 'Decompose', 'RATTLE': 'Clatter', 'RIGHT_HAND_HAND': 'Other Hand',
  'SEVERANCE': 'Sever Ties', 'SHROUD': 'Pall', 'SIC_EM': 'Go Get Em', 'SLEIGHT_OF_FLESH': 'Flesh Trick', 'SOULBOUND': 'Wraithbound',
  'SPUR': 'Urge On', 'UNDERWORLD': 'Netherworld', 'VEILPIERCER': 'Veilcutter',
  'BANSHEES_CRY': 'Howl of the Dead', 'CACOPHONY': 'Din', 'CALL_OF_THE_VOID': 'Echo of the Deep', 'DEMESNE': 'Domain', 'DEVOUR_LIFE': 'Feed on Life',
  'EIDOLON': 'Spectral Host', 'END_OF_DAYS': 'Last Days', 'ERADICATE': 'Annihilate', 'GLIMPSE_BEYOND': 'Peek Beyond', 'HANG': 'Gallows',
  'MISERY': 'Wretchedness', 'NECRO_MASTERY': 'Bone Mastery', 'NEUROSURGE': 'Mind Surge', 'OBLIVION': 'Forgetting', 'REANIMATE': 'Rise Again',
  'REAPER_FORM': 'Grim Form', 'SACRIFICE': 'Offering', 'SEANCE': 'Spirit Call', 'SENTRY_MODE': 'Watchful Hand', 'SHARED_FATE': 'Bound Fates',
  'SOUL_STORM': 'Wraith Storm', 'SPIRIT_OF_ASH': 'Ash Spirit', 'SQUEEZE': 'Crush Grip', 'THE_SCYTHE': 'The Sickle', 'TIMES_UP': 'Hour Struck',
  'TRANSFIGURE': 'Remake', 'UNDEATH': 'Deathless',
  'FORBIDDEN_GRIMOIRE': 'Banned Tome', 'PROTECTOR': 'Guardian Hand',
  'SOUL': 'Wraith', 'SWEEPING_GAZE': 'Sweeping Glare',
}
RELIC_NAMES = {'BOUND_PHYLACTERY': 'Bound Urn', 'PHYLACTERY_UNBOUND': 'Open Urn', 'BONE_FLUTE': 'Bone Whistle', 'BOOK_REPAIR_KNIFE': 'Binding Knife',
  'BOOKMARK': 'Ribbon Marker', 'FUNERARY_MASK': 'Burial Mask', 'BIG_HAT': 'Wide Brim', 'IVORY_TILE': 'Bone Tile', 'UNDYING_SIGIL': 'Deathless Seal'}
POTION_NAMES = {'BONE_BREW': 'Marrow Brew', 'POT_OF_GHOULS': 'Jar of Wraiths', 'POTION_OF_DOOM': 'Knell Draught'}
TOKENS = {'SOUL', 'SWEEPING_GAZE'}

generate(sys.argv[-1], 'NECRO_DATA', 'necro_data.js', CARD_NAMES, RELIC_NAMES, POTION_NAMES, TOKENS,
  {'The Necrobinder': 'The Unburied', "Osty's": "Clutch's", 'Osty': 'Clutch', 'Summon': 'Rouse', 'Doom': 'Knell', 'Souls': 'Wraiths', 'Soul': 'Wraith'},
  SOURCES + ['regent_data', 'regent', 'orbs', 'defect_data', 'defect'])

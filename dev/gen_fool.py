# Builds src/fool_data.js (the Fool's card numbers from the newest beta data; the character first appeared in v0.113) and
# adds the Fool to dev/namemap.json.
# Usage: python3 dev/gen_fool.py <v0.114 eng dir>
import sys
from charlib import generate, SOURCES

CARD_NAMES = {
  'STRIKE_FOOL': 'Pluck', 'DEFEND_FOOL': 'Bark Ward', 'FOOLISH_SHOT': 'Careless Reed',
  'ARROW_STAB': 'Reed Jab', 'BOW_SMACK': 'Bow Swat', 'CHO_BARBS': 'Sol Bristles', 'CHO_FIRM': 'Sol Stand', 'CHO_READY': 'Sol Steady',
  'DEEP_STRETCH': 'Long Reach', 'HEAVY_SHOT': 'Heavy Reed', 'JEST': 'Jape', 'KI_CHANT': 'La Hymn', 'KI_HOP': 'La Skip', 'KI_WHIP': 'La Lash',
  'MOURNING_BLOW': 'Grieving Blow', 'NOCK': 'Notch', 'QUICK_SHOT': 'Quick Reed', 'RAIN_SHOT': 'Raining Reed', 'RECALL': 'Call Back',
  'SORROWFUL_STRIKE': 'Woeful Pluck', 'WAH_HAMMER': 'Fa Mallet', 'WAH_SWEEP': 'Fa Swing', 'WAH_TOUCH': 'Fa Tap',
  'ALL_IS_WELL': 'All Is Fine', 'ANGUISH': 'Heartache', 'ARCHERY': 'Bowcraft', 'BLOSSOM_SHOT': 'Blossom Reed', 'BLOT_OUT_THE_SKY': 'Darken the Sky',
  'BRACE': 'Draw Taut', 'CHO_KI': 'Sol La', 'CHO_LIMBS': 'Sol Boughs', 'COMPOST': 'Mulch', 'DISLIKE_YOU': 'No Love Lost', 'ENRAPTURE': 'Enthrall',
  'EPIC_RETRIEVAL': 'Heroic Fetch', 'GROWTH': 'Sprout', 'HARMONIC_SHIELD': 'Chord Wall', 'HIDDEN_ROOTS': 'Deep Roots', 'HOBBLING_SHOT': 'Hobbling Reed',
  'KI_REST': 'La Pause', 'LOCKED_IN': 'Dead Set', 'MOTIF': 'Theme', 'PUNCH_OF_JOY': 'Fist of Glee', 'TWIN_SHOT': 'Twin Reeds',
  'RHYTHM_STRIKE': 'Rhythm Pluck', 'RUMMAGE': 'Root Around', 'SERRATED_ARROWS': 'Barbed Reeds', 'SONG_PATH': 'Song Trail', 'STEADY_CADENCE': 'Even Tempo',
  'TIMBER': 'Felling', 'TRICK_SHOT': 'Trick Reed', 'TUNE': 'In Tune', 'UPROOT': 'Tear Out', 'VIOLENT_CHORD': 'Harsh Chord', 'VITRIOL': 'Spite',
  'WAH_BLAST': 'Fa Blare', 'WAH_CHO': 'Fa Sol', 'WAH_KI': 'Fa La', 'WHISTLING_ARROWS': 'Whistling Reeds', 'WREST': 'Yank', 'YOGA': 'Morning Bends',
  'BOUNCE': 'Spring Back', 'BRIGHTEN_UP': 'Lighten Up', 'CHO_CHORUS': 'Sol Choir', 'CODA': 'Finale', 'COVERING_FIRE': 'Covering Flight',
  'ECSTASY': 'Rapture', 'ENCORE': 'One More Song', 'ENNUI': 'Listless', 'ENSEMBLE': 'Full Band', 'EXPLOSIVE_ARROWS': 'Bursting Reeds',
  'FLORESCENCE': 'Full Bloom', 'HONING': 'Whetting', 'KI_VERSE': 'La Stanza', 'LULLABY': 'Cradle Song', 'MELODIC_SHOT': 'Singing Reed',
  'MYTHIC_FORM': 'Fabled Form', 'NAIL': 'Nail Down', 'OPTIMISM': 'Bright Side', 'QUIETUS': 'Last Rest', 'QUIVER': 'Spare Reed', 'REPEAT_SHOT': 'Reed after Reed',
  'SELF_DEPRECATE': 'Self Mockery', 'SHOW_OFF': 'Flaunt', 'SIMPLETON': 'Dullard', 'SKY_SHOT': 'Skyward Reed', 'WAH_CHO_KI': 'Fa Sol La',
  'WAH_SYMPHONY': 'Fa Opus', 'YAH': 'Hup!',
  'DIVINE_SHOT': 'Hallowed Reed', 'LOST_LUTE': 'Lost Lyre',
  'SADNESS': 'Woe', 'JOY': 'Glee', 'THE_SHOT': 'The One Reed',
  # the Omens (Tarot cards)
  'DEATH': 'The Reaper', 'JUDGEMENT': 'The Reckoning', 'JUSTICE': 'The Scales', 'STRENGTH': 'The Lion', 'TEMPERANCE': 'The Vessel',
  'THE_CHARIOT': 'The Cart', 'THE_DEVIL': 'The Horned One', 'THE_EMPEROR': 'The Throne', 'THE_EMPRESS': 'The Garden', 'THE_FOOL': 'The Wanderer',
  'THE_HANGED_MAN': 'The Hanged One', 'THE_HERMIT': 'The Lantern', 'THE_HIEROPHANT': 'The Keeper of Keys', 'THE_HIGH_PRIESTESS': 'The Veil',
  'THE_LOVERS': 'The Pair', 'THE_MAGICIAN': 'The Conjurer', 'THE_MOON': 'The Pale Moon', 'THE_STAR': 'The Lodestar', 'THE_SUN': 'The Daystar',
  'THE_TOWER': 'The Ruin', 'THE_WORLD': 'The Wreath', 'WHEEL_OF_FORTUNE': 'The Wheel',
}
RELIC_NAMES = {'SONG_BOW': 'Singing Bow', 'STORYTELLER': 'Talespinner', 'EXERCISE_MAT': 'Woven Mat', 'OCARINA': 'Clay Whistle',
  'WHITTLING_KNIFE': "Whittler's Knife", 'CONDUCTORS_BATON': "Maestro's Wand", 'FERTILIZER': 'Bone Meal', 'TWINE': 'Catgut', 'BIZARRE_LAMP': 'Strange Lantern'}
POTION_NAMES = {'BOTTLED_SONG': 'Bottled Tune', 'CRYSTALLINE_EUPHORIA': 'Crystal Bliss', 'PRECISION_POTION': "Marksman's Draught"}
OMENS = {'DEATH', 'JUDGEMENT', 'JUSTICE', 'STRENGTH', 'TEMPERANCE', 'THE_CHARIOT', 'THE_DEVIL', 'THE_EMPEROR', 'THE_EMPRESS', 'THE_FOOL',
  'THE_HANGED_MAN', 'THE_HERMIT', 'THE_HIEROPHANT', 'THE_HIGH_PRIESTESS', 'THE_LOVERS', 'THE_MAGICIAN', 'THE_MOON', 'THE_STAR', 'THE_SUN',
  'THE_TOWER', 'THE_WORLD', 'WHEEL_OF_FORTUNE'}
TOKENS = OMENS | {'JOY', 'THE_SHOT'}

generate(sys.argv[-1], 'FOOL_DATA', 'fool_data.js', CARD_NAMES, RELIC_NAMES, POTION_NAMES, TOKENS,
  {'The Fool': 'The Minstrel', 'an Arrow': 'a Reed', 'An Arrow': 'A Reed', 'Arrows': 'Reeds', 'Arrow': 'Reed', 'Shoot': 'Loose', 'Impaled': 'Transfixed', 'Impale': 'Transfix',
   'Dislodged': 'Wrenched', 'Dislodge': 'Wrench', 'Aim': 'Sight', 'Stretch': 'Limber', 'Melodies': 'Refrains', 'Melody': 'Refrain',
   'Wah': 'Fa', 'Cho': 'Sol', 'Ki': 'La', 'Tarot': 'Omen'},
  SOURCES + ['regent_data', 'regent', 'orbs', 'defect_data', 'defect', 'osty', 'necro_data', 'necro'], ver='0.114')

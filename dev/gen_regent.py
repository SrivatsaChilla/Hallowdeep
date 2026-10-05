# Builds src/regent_data.js (the Regent's card numbers from the v0.111 data) and adds the Regent to dev/namemap.json.
# Usage: python3 dev/gen_regent.py <v0.111 eng dir>
import json, re, sys, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
BETA = Path(sys.argv[-1])

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

KEY = {'Damage': 'dmg', 'Block': 'blk', 'Cards': 'draw', 'Energy': 'en', 'Repeat': 'hits', 'Strength': 'str', 'StrengthLoss': 'loss',
       'Vulnerable': 'vul', 'Weak': 'weak', 'CalculationBase': 'base', 'CalculationExtra': 'per', 'ExtraDamage': 'per', 'Increase': 'inc'}
KW = {'Exhaust': 'Burn', 'Ethereal': 'Fleeting', 'Innate': 'Opening', 'Retain': 'Retain', 'Sly': 'Furtive', 'Unplayable': 'Unplayable', 'Eternal': 'Eternal'}
TAG = {'Strike': 'Cut', 'Defend': 'Brace', 'Minion': 'Thrall'}
TARGET = {'AnyEnemy': 'enemy', 'AllEnemies': 'all', 'Self': 'self', 'None': 'self', 'RandomEnemy': 'self', None: 'self'}

def our_id(name): return re.sub(r'[^A-Z0-9]+', '_', name.upper().replace("'", '')).strip('_')
def key(var): return KEY.get(var, var[0].lower() + var[1:])

def build(d):
    cards = {c['id']: c for c in json.load(open(d / 'cards.json'))}
    out = {}
    for orig, name in CARD_NAMES.items():
        c = cards.get(orig)
        if not c: continue
        vars_ = dict(c.get('vars') or {})
        star = 'X' if c.get('is_x_star_cost') else vars_.pop('StarCost', c.get('star_cost'))
        vars_.pop('StarCost', None)
        # "XPower" duplicates "X" in the data; keep one key.
        for k in list(vars_):
            if k.endswith('Power') and k[:-5] in vars_ and vars_[k] == vars_[k[:-5]]: del vars_[k]
        v = {key(k): x for k, x in vars_.items() if isinstance(x, (int, float))}
        up, upmods = {}, set()
        for k, x in (c.get('upgrade') or {}).items():
            if k in ('add_innate', 'add_retain', 'remove_exhaust', 'remove_ethereal'): upmods.add(k); continue
            if k in ('cost', 'description_changed'): continue
            match = [vk for vk in (c.get('vars') or {}) if vk.lower() == k]
            if match and isinstance(x, str) and re.match(r'^[+-]\d+$', x):
                kk = match[0]
                if kk.endswith('Power') and kk[:-5] in (c.get('vars') or {}): kk = kk[:-5]
                up[key(kk)] = int(x)
        kw = [KW[k] for k in (c.get('keywords') or []) if k in KW]
        upkw = list(kw)
        if 'add_innate' in upmods and 'Opening' not in upkw: upkw.append('Opening')
        if 'add_retain' in upmods and 'Retain' not in upkw: upkw.append('Retain')
        if 'remove_exhaust' in upmods: upkw = [k for k in upkw if k != 'Burn']
        if 'remove_ethereal' in upmods: upkw = [k for k in upkw if k != 'Fleeting']
        e = {'orig': orig, 'name': name, 'rarity': 'Token' if orig in TOKENS else c['rarity'], 'type': c['type'],
             'cost': 'X' if c.get('is_x_cost') else c['cost'], 'target': TARGET.get(c.get('target'), 'self'),
             'kw': kw, 'tags': [TAG[t] for t in (c.get('tags') or []) if t in TAG], 'v': v, 'up': up}
        if star is not None: e['star'] = star
        if (c.get('upgrade') or {}).get('cost') is not None: e['upCost'] = c['upgrade']['cost']
        if upkw != kw: e['upKw'] = upkw
        out[our_id(name)] = e
    return out

data = {'0.111': build(BETA)}
# IDs must not collide with anything already in the game.
existing = json.loads(subprocess.check_output(['node', '-e', """
const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console,Math});
for (const f of ['core','cards','potions','monsters','relics','versions','combat','run','events','act2','act3','colorless','enchants','events2','ancients','silent','neow2']) vm.runInContext(fs.readFileSync('src/'+f+'.js','utf8'),ctx);
console.log(JSON.stringify({cards:Object.keys(ctx.HD.CARDS),relics:Object.keys(ctx.HD.RELICS),potions:Object.keys(ctx.HD.POTIONS)}));"""], cwd=ROOT))
clash = [k for k in data['0.111'] if k in existing['cards']] + [our_id(n) for n in RELIC_NAMES.values() if our_id(n) in existing['relics']] + [our_id(n) for n in POTION_NAMES.values() if our_id(n) in existing['potions']]
if clash: sys.exit(f'ID clash with existing content: {clash}')
missing = [o for o in CARD_NAMES if our_id(CARD_NAMES[o]) not in data['0.111']]
if missing: sys.exit(f'not in the v0.111 data: {missing}')

(ROOT / 'src' / 'regent_data.js').write_text('// Generated by dev/gen_regent.py from the Spire Codex data. Do not edit by hand.\n'
  '(function () {\n  globalThis.HD.REGENT_DATA = ' + json.dumps(data, separators=(',', ':')) + ';\n})();\n')
nm = json.load(open(ROOT / 'dev' / 'namemap.json'))
for o, n in CARD_NAMES.items(): nm['cards'][o] = our_id(n)
for o, n in RELIC_NAMES.items(): nm['relics'][o] = our_id(n)
for o, n in POTION_NAMES.items(): nm['potions'][o] = our_id(n)
nm['terms'].update({'The Regent': 'The Crowned', 'Stars': 'Glints', 'Star': 'Glint', 'Forge': 'Temper', 'Sovereign Blade': 'Regal Blade', 'Minion': 'Thrall'})
json.dump(nm, open(ROOT / 'dev' / 'namemap.json', 'w'), indent=1)
print(f"{len(data['0.111'])} cards, {len(RELIC_NAMES)} relics, {len(POTION_NAMES)} potions mapped")

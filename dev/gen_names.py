# Builds src/names.js (original game names) from dev/namemap.json and a Spire Codex export.
# Usage: python3 dev/gen_names.py /path/to/codex/data/eng [more data dirs for newer versions]
import json, re, subprocess, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1])
nm = json.load(open(root / 'dev' / 'namemap.json'))
load = lambda n: {x['id']: x for x in json.load(open(src / f'{n}.json'))}
C, M, R, P, E = load('cards'), load('monsters'), load('relics'), load('potions'), json.load(open(src / 'encounters.json'))
EVS = load('events')
for extra in sys.argv[2:]:
    for x in json.load(open(Path(extra) / 'cards.json')): C.setdefault(x['id'], x)
    for n, table in (('relics', R), ('potions', P)):
        try:
            for x in json.load(open(Path(extra) / f'{n}.json')): table.setdefault(x['id'], x)
        except FileNotFoundError: pass

# Our current names and encounter compositions, read from the game data itself.
js = """const vm=require('vm'),fs=require('fs');const ctx=vm.createContext({console,Math,Promise,setTimeout});
for(const f of ['core','cards','potions','monsters','relics','versions','combat','run','events','act2','act3','colorless','enchants','events2','ancients','silent','regent_data','regent','orbs','defect_data','defect','osty','necro_data','necro','coop','neow2','ascension_data','ascension'])vm.runInContext(fs.readFileSync('src/'+f+'.js','utf8'),ctx);
const HD=ctx.HD, pick=(o,f)=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,f(v)]));
const enc=pick(HD.ENC,(e)=>{let m=e.mons;if(!m){const s=new Set();for(let i=0;i<60;i++)e.build({pick:(a)=>a[i%a.length],range:(a)=>a,int:(n)=>i%n,next:()=>((i*37)%100)/100,shuffle:(a)=>a}).forEach(x=>s.add(x));m=[...s];}return {name:e.name,mons:m,kind:e.kind||e.pool||'',act:e.act||1};});
console.log(JSON.stringify({events:pick(HD.EVENTS,d=>d.name),cards:pick(HD.CARDS,d=>d.name),mons:pick(HD.MON,d=>({name:d.name,moves:Object.keys(d.moves),alias:(HD.MOVE_ALIASES||{})[d.id]||{}})),relics:pick(HD.RELICS,d=>d.name),potions:pick(HD.POTIONS,d=>d.name),enc,pw:pick(HD.PW,p=>p.n)}));"""
ours = json.loads(subprocess.run(['node', '-e', js], cwd=root, capture_output=True, text=True, check=True).stdout)

out = {'cards': {}, 'monsters': {}, 'moves': {}, 'relics': {}, 'potions': {}, 'encounters': {}, 'powers': {}, 'events': {}, 'text': {}}
for orig, mine in nm.get('events', {}).items():
    if orig in EVS and mine in ours['events']: out['events'][mine] = EVS[orig]['name']
text = out['text']  # our word -> original word, applied to card, relic, potion and power text
for orig, mine in nm['cards'].items():
    if orig in C and mine in ours['cards']:
        out['cards'][mine] = C[orig]['name']; text[ours['cards'][mine]] = C[orig]['name']
rev_mon = {}
for orig, mine in nm['monsters'].items():
    if orig in M and mine in ours['mons']:
        rev_mon[mine] = orig
        out['monsters'][mine] = M[orig]['name']
        names = {m['id']: re.sub(r' Move \d+$', '', m['name']) for m in M[orig].get('moves', []) if m.get('name')}
        al = ours['mons'][mine].get('alias', {})
        mv = {k: names[al.get(k, k)] for k in ours['mons'][mine]['moves'] if al.get(k, k) in names}
        if mv: out['moves'][mine] = mv
for kind, table, data in (('relics', nm['relics'], R), ('potions', nm['potions'], P)):
    for orig, mine in table.items():
        if orig in data and mine in ours[kind]:
            out[kind][mine] = data[orig]['name']; text[ours[kind][mine]] = data[orig]['name']

# Encounters: match on the set of monsters involved.
ACTNAME = {1: 'Overgrowth', 2: 'Hive', 3: 'Glory'}
for key, e in ours['enc'].items():
    mine = {rev_mon.get(m) for m in e['mons']}
    weak = key.endswith('_WEAK')
    best = None
    for x in [z for z in E if z['act'] and ACTNAME[e['act']] in z['act']]:
        theirs = {m['id'] if isinstance(m, dict) else m for m in x['monsters']}
        if mine <= theirs and x['is_weak'] == weak and (best is None or len(theirs) < len(best[1])): best = (x, theirs)
    if e['kind'] == 'event' or not best:
        # Event fights and fights the data lists without an act: match on monsters alone.
        loose = [z for z in E if not z['act'] and mine <= {m['id'] if isinstance(m, dict) else m for m in z['monsters']}]
        if loose: out['encounters'][key] = loose[0]['name']
        elif best: out['encounters'][key] = best[0]['name']
        else: print('no encounter match for', key, e['mons'])
    else: out['encounters'][key] = best[0]['name']

# Keywords and a few interface words.
terms = {v: k for k, v in nm['terms'].items() if v != k and ' tag' not in k}
terms.update({'The Veiled': 'Silent', 'Toxin': 'Poison', 'Slivers': 'Shivs', 'Sliver': 'Shiv', 'Furtive': 'Sly', 'Spines': 'Thorns', 'Old Ember': "Tezcatara's Ember", 'The Hoarder': 'Darv', 'The Tidewarden': 'Orobas', 'The Many-Eyed': 'Pael', 'The Hearthmother': 'Tezcatara', 'The Gilded Hermit': 'Nonupeipe', 'The Huntmaster': 'Tanx', 'The Whisperer': 'Vakuu', 'Cut': 'Strike', 'Burns': 'Exhausts', 'Burned': 'Exhausted', 'Ash': 'Exhaust', 'Rootworks': 'Overgrowth', 'Depth': 'Floor', 'Rootmother': 'Neow'})
text.update(terms)
card_pw = {v: k for k, v in ours['cards'].items()}
fixed = {'noDraw': 'No Draw', 'noEnergy': 'No Energy Gain', 'shrink': 'Shrink', 'constrict': 'Constrict', 'tangled': 'Tangled', 'ringing': 'Ringing',
         'slippery': 'Slippery', 'territorial': 'Territorial', 'infested': 'Infested', 'illusion': 'Illusion', 'slow': 'Slow', 'plow': 'Plow', 'minion': 'Minion',
         'retainHand': 'Retain Hand', 'clarity': 'Clarity', 'radiance': 'Radiance', 'nextBlock': 'Block Next Turn', 'nextEnergy': 'Energy Next Turn',
         'nextDraw': 'Draw Cards Next Turn', 'duplicate': 'Duplication', 'giga': 'Gigantification', 'poiseTemp': 'Temporary Dexterity',
         'mightTemp': 'Temporary Strength', 'demise': 'Demise', 'dampened': 'Shrink'}
for k, n in ours['pw'].items():
    if k in fixed: out['powers'][k] = fixed[k]
    elif n in card_pw and card_pw[n] in out['cards']: out['powers'][k] = out['cards'][card_pw[n]]
out['character'] = 'Ironclad'
out['act'] = 'Overgrowth'
body = json.dumps(out, indent=0, ensure_ascii=False, sort_keys=True)
(root / 'src' / 'names.js').write_text(f"""// Original game names, shown when the name setting is "Original". Generated by dev/gen_names.py; do not edit by hand.
(function () {{
  const HD = globalThis.HD;
  HD.ORIGINAL = {body};
}})();
""")
print({k: len(v) if isinstance(v, dict) else v for k, v in out.items()})

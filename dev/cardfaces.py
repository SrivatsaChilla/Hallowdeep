from pathlib import Path
# Renders every card (base and upgraded, both name modes) and checks that each of its keywords is printed on the face
# and that every game term on the face has a tooltip.  Usage: python3 dev/cardfaces.py [path to built html]
import asyncio, json, sys
from playwright.async_api import async_playwright
HTML = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parent.parent / 'dist' / 'hallowdeep.html')
JS = """([names, ver])=>{
  HD.setVersion(ver); HD.setNames(names);
  const T = (s) => HD.sub(s);
  const cards = []; for (const id of Object.keys(HD.CARDS)) { const d = HD.CARDS[id]; if (d.coop || (d.only && d.only !== HD.version)) continue;
    cards.push({uid:'a'+id,id,up:false}); if (['Attack','Skill','Power'].includes(d.type)) cards.push({uid:'b'+id,id,up:true}); }
  HD.state.overlay = {kind:'pile', title:'all', cards}; HD.state.screen='map'; HD.render();
  const TERMWORDS = ['Sly','Furtive','Poison','Toxin','Shiv','Sliver','Retain','Innate','Opening','Ethereal','Fleeting','Exhaust','Burn','Unplayable','Eternal',
    'Vulnerable','Exposed','Weak','Sapped','Frail','Brittle','Strength','Might','Dexterity','Poise','Block','Guard','Vigor','Plating','Plate','Thorns','Spines','Artifact','Ward','Intangible','Replay','Fatal'];
  const problems = [];
  const els = [...document.querySelectorAll('.overlay .card')];
  els.forEach((el, i) => {
    const c = cards[i]; const face = (el.querySelector('.ctext') || el).textContent;
    for (const k of HD.kwOf(c)) { const shown = T(k); if (!new RegExp('\\\\b' + shown + '\\\\b').test(face)) problems.push(`${c.id}${c.up ? '+' : ''}: keyword ${k} (${shown}) not printed`); }
    const tips = (el.querySelector('.tips') || {textContent: ''}).textContent;
    for (const w of TERMWORDS) if (new RegExp('\\\\b' + w + '\\\\b').test(face) && !new RegExp('\\\\b' + w + '\\\\b').test(tips)) problems.push(`${c.id}${c.up ? '+' : ''}: "${w}" on the card has no tooltip`);
  });
  return { checked: els.length, problems };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 820})
        await pg.goto('file://' + HTML); await pg.wait_for_timeout(300); await pg.click('button.hero'); await pg.wait_for_timeout(200)
        total = 0
        for names in ('original', 'hollowdeep'):
            for ver in ('0.111', 'stable'):
                r = await pg.evaluate(JS, [names, ver]); total += len(r['problems'])
                uniq = sorted(set(x.split(': ', 1)[1] for x in r['problems']))
                print(f"{names:10} {ver:6} {r['checked']} card faces, {len(r['problems'])} problems")
                for x in sorted(set(r['problems']))[:12]: print('   ', x)
        await b.close()
        print('all card faces ok' if not total else f'{total} problems')
asyncio.run(main())

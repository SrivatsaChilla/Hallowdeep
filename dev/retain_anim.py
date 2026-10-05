import asyncio, json
from playwright.async_api import async_playwright
from pathlib import Path as _P
HTML_URL = 'file://' + str((_P(__file__).resolve().parent.parent / 'dist' / 'hallowdeep.html'))
SETUP = """async(pyramid)=>{HD.sleep=(ms)=>new Promise(r=>setTimeout(r, Math.min(ms, 60))); const S=HD.state,r=S.run; r.feed.length=0; if (pyramid) r.addRelic('GLYPH_PYRAMID');
  S.kind='monster'; S.g=new HD.Combat(r,'RIPJAW',HD.UI,'monster'); S.screen='combat'; S.busy=true; HD.render(); await S.g.start(); const g=S.g;
  g.enemies[0].hp=g.enemies[0].maxHp=999; g.p.pw.ghostKnives=9;
  const mk=(id)=>g.makeCard(id,false); const drawn=mk('JAB'); drawn.retainTurn=true;
  g.hand=[mk('ADDER_BITE'), drawn, mk('SLIVER'), mk('EVADE'), mk('JAB'), mk('PHANTASM')]; S.busy=false; HD.render(); }"""
async def run(pyramid):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':820}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
        await pg.click('button.hero[data-arg=VEILED]'); await pg.wait_for_timeout(200)
        await pg.evaluate(SETUP, pyramid); await pg.wait_for_timeout(1200)
        faces = await pg.evaluate("()=>[...document.querySelectorAll('.hand .card')].map(e=>e.dataset.cid+(e.dataset.key)+':'+(/\\bRetain\\b/.test(e.querySelector('.ctext').textContent)?'Retain':'-'))")
        uids = await pg.evaluate("()=>HD.state.g.hand.map(c=>[c.uid,c.id,!!c.retainTurn])")
        await pg.click('[data-act=end]')
        flying, hidden = set(), set()
        for _ in range(12):
            await pg.wait_for_timeout(40)
            f = await pg.evaluate("()=>[...document.querySelectorAll('.card.flying')].map(e=>e.dataset.cid)")
            h = await pg.evaluate("()=>[...document.querySelectorAll('.hand .card.gone')].map(e=>e.dataset.cid)")
            flying.update(f); hidden.update(h)
        await pg.wait_for_timeout(2500)
        after = await pg.evaluate("()=>[HD.state.g.turn, HD.state.g.hand.map(c=>c.id), HD.state.g.discard.map(c=>c.id), HD.state.g.ash.map(c=>c.id)]")
        await b.close()
        return {'faces': faces, 'flewOut': sorted(flying), 'hiddenInHand': sorted(hidden), 'turn2Hand': after[1], 'discard': after[2], 'exhaust': after[3], 'errors': errs}
async def main():
    for pyr in (False, True): print('Runic Pyramid' if pyr else 'normal', json.dumps(await run(pyr)))
asyncio.run(main())

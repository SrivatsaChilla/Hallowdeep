import asyncio, json
from playwright.async_api import async_playwright
import os as _os, tempfile as _tf
from pathlib import Path as _Path
_ROOT = _Path(__file__).resolve().parents[2]
HTML_URL = (_ROOT / 'dist' / 'hallowdeep.html').as_uri()
TMP = _os.path.join(_tf.gettempdir(), 'hallowdeep-')
SETUP = "async()=>{HD.sleep=()=>Promise.resolve(); const S=HD.state,r=S.run; ['BENT_FUNNEL','PAPER_CRANE','FINGER_BELLS'].forEach(x=>r.addRelic(x)); r.feed.length=0; r.potions=['TOXIN_FLASK','GHOST_JAR',null]; S.kind='monster'; S.g=new HD.Combat(r,'BANDITS',HD.UI,'monster'); S.screen='combat'; S.busy=true; HD.render(); await S.g.start(); for (const id of ['KNIFE_FAN','LETHAL_DOSE','SOMERSAULT']) S.g.hand.push(S.g.makeCard(id,false)); S.g.energy=9; S.busy=false; HD.render();}"
async def tapcard(pg, sel):
    pt = await pg.evaluate('''(sel)=>{const el=document.querySelector(sel); const r=el.getBoundingClientRect(); const nx=el.nextElementSibling; const right = nx && nx.classList.contains('card') ? Math.min(r.right, nx.getBoundingClientRect().left) : r.right; return {x:(r.left+right)/2, y:r.top+r.height*0.6}}''', sel)
    await pg.touchscreen.tap(pt['x'], pt['y'])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); res = {}
        for tag, vp in (('portrait', {'width':390,'height':844}), ('landscape', {'width':844,'height':390}), ('small', {'width':360,'height':640}), ('landscape-small', {'width':667,'height':375})):
            ctx = await b.new_context(viewport=vp, is_mobile=True, has_touch=True, device_scale_factor=2, color_scheme='dark')
            pg = await ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
            await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
            await pg.tap('button.hero[data-arg=VEILED]'); await pg.wait_for_timeout(200)
            await pg.evaluate(SETUP); await pg.wait_for_timeout(1500)
            fit = await pg.evaluate("""()=>{const cs=[...document.querySelectorAll('.hand .card')].map(c=>c.getBoundingClientRect()); const vw=document.documentElement.clientWidth, vh=innerHeight;
              return {cards: cs.length, allOnScreen: cs.every(r=>r.left>=-2 && r.right<=vw+2 && r.bottom<=vh+2), handBottom: Math.round(Math.max(...cs.map(r=>r.bottom))), vh, pageScrolls: document.documentElement.scrollHeight > vh + 2 || document.documentElement.scrollWidth > vw + 2,
                endVisible: (()=>{const e=document.querySelector('[data-act=end]').getBoundingClientRect(); return e.bottom<=vh && e.right<=vw})()}}""")
            await pg.screenshot(path=f'{TMP}mm_{tag}.png')
            # 1) tap an untargeted card: it lifts; tap again: it plays
            e0 = await pg.evaluate("HD.state.g.energy")
            sel = '.hand .card[aria-label^="Acrobatics"]'
            await tapcard(pg, sel); await pg.wait_for_timeout(350)
            lifted = await pg.evaluate("""()=>{const c=document.querySelector('.hand .card.sel'); if(!c) return null; const r=c.getBoundingClientRect(); return {w:Math.round(r.width), cx:Math.round(r.left+r.width/2), top:Math.round(r.top), bottom:Math.round(r.bottom), text: parseFloat(getComputedStyle(c.querySelector('.ctext')).fontSize)*parseFloat(c.style.getPropertyValue('--ls')||1)}}""")
            await pg.screenshot(path=f'{TMP}mm_{tag}_lift.png')
            hint = await pg.evaluate("document.querySelector('.combat > .hint').textContent")
            b1 = await pg.evaluate("HD.state.g.energy")
            await pg.tap('.hand .card.sel'); await pg.wait_for_timeout(900)
            e1 = await pg.evaluate("HD.state.g.energy")
            if await pg.evaluate("!!HD.state.overlay"):
                await pg.tap('.overlay .card >> nth=0'); await pg.wait_for_timeout(200)
                if await pg.query_selector('.overlay [data-act=confirm]'): await pg.tap('.overlay [data-act=confirm]')
                await pg.wait_for_timeout(500)
            # 2) tap a targeted card, tap an enemy
            await tapcard(pg, '.hand .card[aria-label^="Deadly Poison"]'); await pg.wait_for_timeout(300)
            pz0 = await pg.evaluate("HD.state.g.enemies.map(e=>e.pw.toxin||0).join(',')")
            await pg.tap('.foe >> nth=1'); await pg.wait_for_timeout(900)
            pz1 = await pg.evaluate("HD.state.g.enemies.map(e=>e.pw.toxin||0).join(',')")
            # 3) tap away puts a lifted card back
            await tapcard(pg, '.hand .card'); await pg.wait_for_timeout(250)
            dbg = await pg.evaluate("()=>({sel: !!HD.state.sel, ov: HD.state.overlay && HD.state.overlay.kind})")
            spot = await pg.evaluate('''()=>{ for (let y=innerHeight*0.15; y<innerHeight*0.9; y+=12) for (let x=40; x<innerWidth-40; x+=12) { const e=document.elementFromPoint(x,y); if (e && !e.closest('[data-act],.card,.bar,.chip')) return {x,y}; } return null }''')
            if spot: await pg.touchscreen.tap(spot['x'], spot['y'])
            res.setdefault('spots', {})[tag] = [spot, await pg.evaluate('(p)=>{const e=document.elementFromPoint(p.x,p.y); return e && e.className.toString().slice(0,30)}', spot) if spot else None]
            await pg.wait_for_timeout(250)
            back = await pg.evaluate("!HD.state.sel")
            # 4) tap areas: tapping just above and below a relic chip still hits it
            hits = await pg.evaluate("""()=>{const r=document.querySelector('.bar .relic').getBoundingClientRect(); const ok=(y)=>{const e=document.elementFromPoint(r.left+r.width/2, y); return !!(e&&e.closest('.relic'))}; return {h: Math.round(r.height), above: ok(r.top-7), below: ok(r.bottom+7)}}""")
            res[tag] = {**fit, 'lifted': lifted, 'hint': hint, 'liftCostsNothing': b1 == e0, 'playedOnSecondTap': e1 < b1, 'targetedPlay': [pz0, pz1], 'tapAwayDeselects': back, 'beforeTapAway': dbg, 'relicHitArea': hits, 'errors': errs}
            await ctx.close()
        print(json.dumps(res, indent=1)); await b.close()
asyncio.run(main())

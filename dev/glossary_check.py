import asyncio, json
from playwright.async_api import async_playwright
from pathlib import Path as _P
HTML_URL = 'file://' + str((_P(__file__).resolve().parent.parent / 'dist' / 'hallowdeep.html'))
TIP = "(()=>{const t=document.getElementById('hovertip'); return t && !t.hidden ? t.innerText.replace(/\\n+/g,' | ').slice(0,260) : null})()"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width':1280,'height':820}, color_scheme='dark')
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('button.hero'); await pg.wait_for_timeout(200)
        # an Ancient offering Electric Shrymp and Jewelry Box
        await pg.evaluate("()=>{const S=HD.state; S.run.ancient='OROBAS'; S.offer=['STATIC_SHRIMP','JEWEL_BOX','SAND_FORT']; S.screen='ancient'; HD.render();}")
        await pg.wait_for_timeout(300)
        out = {}
        for rid in ('STATIC_SHRIMP','JEWEL_BOX','SAND_FORT'):
            await pg.hover(f'[data-act=gift][data-arg={rid}]'); await pg.wait_for_timeout(250)
            out[rid] = await pg.evaluate(TIP)
            if rid == 'JEWEL_BOX':
                out['jewel box shows a card'] = await pg.evaluate("!!document.querySelector('#hovertip .card.tipcard')")
                await pg.screenshot(path='/tmp/hollowdeep-gl_ancient.png')
        if not out.get('jewel box shows a card'): await pg.screenshot(path='/tmp/hollowdeep-gl_ancient.png')
        await pg.hover('[data-act=gift][data-arg=STATIC_SHRIMP]'); await pg.wait_for_timeout(250); await pg.screenshot(path='/tmp/hollowdeep-gl_shrimp.png')
        # a relic in the top bar that mentions a potion and a curse
        await pg.evaluate("()=>{const S=HD.state; S.run.addRelic('ROOT_OFFERING'); S.run.feed.length=0; S.screen='map'; HD.render();}"); await pg.wait_for_timeout(300)
        await pg.hover('.bar .relic[data-key="r-ROOT_OFFERING"]'); await pg.wait_for_timeout(250)
        out['bar relic Neows Sacrifice'] = await pg.evaluate(TIP)
        # a card's own tooltip mentioning a token card
        await pg.evaluate("()=>{HD.state.overlay={kind:'pile',title:'t',cards:[{uid:'x1',id:'KNIFE_FLURRY',up:false},{uid:'x2',id:'INK_BLADES',up:false}]}; HD.render();}"); await pg.wait_for_timeout(300)
        out['card tips Blade Dance'] = await pg.evaluate("document.querySelector('.overlay .card[data-cid=KNIFE_FLURRY] .tips') && document.querySelector('.overlay .card[data-cid=KNIFE_FLURRY] .tips').textContent.slice(0,160)")
        out['card tips Blade of Ink'] = await pg.evaluate("document.querySelector('.overlay .card[data-cid=INK_BLADES] .tips') && document.querySelector('.overlay .card[data-cid=INK_BLADES] .tips').textContent.slice(0,200)")
        await pg.evaluate("()=>{HD.state.overlay=null; HD.render();}")
        # hollowdeep names
        await pg.evaluate("()=>{HD.setNames('hollowdeep'); const S=HD.state; S.offer=['STATIC_SHRIMP','JEWEL_BOX','SAND_FORT']; S.screen='ancient'; HD.render();}"); await pg.wait_for_timeout(300)
        await pg.hover('[data-act=gift][data-arg=JEWEL_BOX]'); await pg.wait_for_timeout(250)
        out['hollowdeep names: Jewel Box'] = await pg.evaluate(TIP)
        out['errors'] = errs
        # touch: long-press an Ancient choice opens the details; a tap still picks
        tp = await b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        await tp.goto(HTML_URL); await tp.wait_for_timeout(300)
        await tp.tap('button.hero'); await tp.wait_for_timeout(200)
        await tp.evaluate("()=>{const S=HD.state; S.run.ancient='OROBAS'; S.offer=['STATIC_SHRIMP','JEWEL_BOX','SAND_FORT']; S.screen='ancient'; HD.render();}"); await tp.wait_for_timeout(300)
        cdp = await tp.context.new_cdp_session(tp)
        r = await tp.evaluate("(()=>{const q=document.querySelector('[data-act=gift][data-arg=STATIC_SHRIMP]').getBoundingClientRect(); return {x:q.left+q.width/2, y:q.top+q.height/2}})()")
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':r['x'],'y':r['y']}]})
        await tp.wait_for_timeout(650)
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        await tp.wait_for_timeout(300)
        out['touch long-press'] = await tp.evaluate("HD.state.overlay && [HD.state.overlay.kind, HD.state.overlay.title, document.querySelector('.overlay .glossary') && document.querySelector('.overlay .glossary').innerText.slice(0,120), HD.state.run.relics.map(x=>x.id).join(',')]")
        await tp.screenshot(path='/tmp/hollowdeep-gl_touch.png')
        print(json.dumps(out, indent=1)); await b.close()
asyncio.run(main())

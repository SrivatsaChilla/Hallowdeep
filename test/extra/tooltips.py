import asyncio
from playwright.async_api import async_playwright
import os as _os, tempfile as _tf
from pathlib import Path as _Path
_ROOT = _Path(__file__).resolve().parents[2]
HTML_URL = (_ROOT / 'dist' / 'hallowdeep.html').as_uri()
TMP = _os.path.join(_tf.gettempdir(), 'hallowdeep-')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width':1280,'height':820}, color_scheme='dark')
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('button.hero[data-arg=VEILED]'); await pg.wait_for_timeout(200)
        await pg.evaluate("async()=>{HD.sleep=()=>Promise.resolve(); const S=HD.state,r=S.run; ['BENT_FUNNEL','PAPER_CRANE'].forEach(x=>r.addRelic(x)); r.feed.length=0; r.potions=['TOXIN_FLASK','GHOST_JAR',null]; S.kind='monster'; S.g=new HD.Combat(r,'RIPJAW',HD.UI,'monster'); S.screen='combat'; S.busy=true; HD.render(); await S.g.start(); S.busy=false; HD.render();}")
        await pg.wait_for_timeout(1500)
        await pg.hover('.relic[data-key="r-BENT_FUNNEL"]'); await pg.wait_for_timeout(250)
        r1 = await pg.evaluate("(()=>{const t=document.getElementById('hovertip'); return t && !t.hidden ? t.innerText.replace(/\\n+/g,' | ') : null})()")
        await pg.screenshot(path=TMP + 'hv_relic.png', clip={'x':0,'y':0,'width':1280,'height':260})
        await pg.hover('.vial[data-arg="0"]'); await pg.wait_for_timeout(250)
        r2 = await pg.evaluate("(()=>{const t=document.getElementById('hovertip'); return t && !t.hidden ? t.innerText.replace(/\\n+/g,' | ') : null})()")
        await pg.screenshot(path=TMP + 'hv_potion.png', clip={'x':0,'y':0,'width':1280,'height':260})
        chip = await pg.query_selector('.foe .chip')
        r3 = None
        if chip:
            await chip.hover(); await pg.wait_for_timeout(250)
            r3 = await pg.evaluate("(()=>{const t=document.getElementById('hovertip'); return t && !t.hidden ? t.innerText.replace(/\\n+/g,' | ') : null})()")
        await pg.mouse.move(640, 500); await pg.wait_for_timeout(200)
        gone = await pg.evaluate("document.getElementById('hovertip').hidden")
        # a render while hovering keeps the tooltip on the same item
        await pg.hover('.relic[data-key="r-PAPER_CRANE"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("HD.render()"); await pg.wait_for_timeout(150)
        kept = await pg.evaluate("(()=>{const t=document.getElementById('hovertip'); return t && !t.hidden ? t.innerText.split('\\n')[0] : null})()")
        print('relic hover:', r1); print('potion hover:', r2); print('enemy power chip hover:', r3); print('moved away hides it:', gone, '| survives a re-render:', kept)
        # touch: no hover tooltip, tap still opens the sheet
        tp = await b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        await tp.goto(HTML_URL); await tp.wait_for_timeout(300)
        await tp.tap('button.hero'); await tp.wait_for_timeout(200); await tp.evaluate("()=>{HD.state.screen='map'; HD.render();}"); await tp.wait_for_timeout(200)
        await tp.tap('.relic'); await tp.wait_for_timeout(200)
        print('touch: tooltip shown', await tp.evaluate("!!document.getElementById('hovertip') && !document.getElementById('hovertip').hidden"), '| info sheet', await tp.evaluate("HD.state.overlay && HD.state.overlay.kind"))
        print('errors', errs); await b.close()
asyncio.run(main())

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
        ctx = await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True, color_scheme='dark')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        cdp = await ctx.new_cdp_session(pg)
        async def press(x, y, ms):
            await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            await pg.wait_for_timeout(ms)
            await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
            await pg.wait_for_timeout(250)
        async def center(sel):
            bb = await (await pg.query_selector(sel)).bounding_box(); return bb['x']+bb['width']/2, bb['y']+bb['height']/2
        await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
        await pg.tap('button.hero'); await pg.wait_for_timeout(200)
        await pg.evaluate("async()=>{const S=HD.state,r=S.run; ['PAINTED_OX','KETTLEBELL','WIDE_SASH'].forEach(x=>r.addRelic(x)); r.fillPotions(); S.kind='monster'; S.g=new HD.Combat(r,'BANDITS',HD.UI,'monster'); S.screen='combat'; S.busy=true; HD.render(); await S.g.start(); S.busy=false; HD.render();}")
        await pg.wait_for_timeout(1500)
        # 1. tap a relic
        x,y = await center('.relic[data-key="r-PAINTED_OX"]'); await press(x,y,60)
        print('relic tap ->', await pg.evaluate("HD.state.overlay && [HD.state.overlay.kind, HD.state.overlay.title, HD.state.overlay.body]"))
        await pg.screenshot(path=TMP + 't_relic.png'); await pg.tap('[data-act=close]'); await pg.wait_for_timeout(150)
        # 2. tap an enemy
        x,y = await center('.foe'); await press(x,y,60)
        print('enemy tap ->', await pg.evaluate("HD.state.overlay && [HD.state.overlay.kind, HD.state.overlay.title, HD.state.overlay.body]"))
        await pg.screenshot(path=TMP + 't_enemy.png'); await pg.tap('[data-act=close]'); await pg.wait_for_timeout(150)
        # 3. tap a power chip on the player
        await pg.evaluate("()=>{}")
        chip = await pg.query_selector('.me .chip')
        if chip:
            bb = await chip.bounding_box(); await press(bb['x']+bb['width']/2, bb['y']+bb['height']/2, 60)
            print('chip tap ->', await pg.evaluate("HD.state.overlay && [HD.state.overlay.kind, HD.state.overlay.title, HD.state.overlay.body]"))
            await pg.tap('[data-act=close]'); await pg.wait_for_timeout(150)
        # 4. long-press a hand card: inspector, card not played
        n0 = await pg.evaluate("HD.state.g.hand.length")
        x,y = await center('.hand .card'); await press(x,y,650)
        print('long-press card ->', await pg.evaluate("HD.state.overlay && [HD.state.overlay.kind, HD.state.overlay.title]"), '| hand size kept:', n0 == await pg.evaluate("HD.state.g.hand.length"))
        await pg.screenshot(path=TMP + 't_inspect.png'); await pg.tap('[data-act=close]'); await pg.wait_for_timeout(200)
        # 5. a normal tap still plays a card
        e0 = await pg.evaluate("HD.state.g.energy")
        sel = '.hand .card.playable'
        x,y = await center(sel); await press(x,y,60); await pg.wait_for_timeout(1200)
        st = await pg.evaluate("[HD.state.g.energy, !!HD.state.sel, HD.state.overlay && HD.state.overlay.kind]")
        print('short tap -> energy', e0, '->', st[0], '| selected for targeting:', st[1], '| overlay:', st[2])
        # 6. long-press inside the deck viewer returns to the deck viewer on close
        await pg.evaluate("()=>{HD.state.sel=null; HD.render();}")
        await pg.tap('[data-act=pile][data-arg=deck]'); await pg.wait_for_timeout(200)
        x,y = await center('.overlay .card'); await press(x,y,650)
        k1 = await pg.evaluate("HD.state.overlay.kind"); await pg.tap('[data-act=close]'); await pg.wait_for_timeout(150)
        print('inspect from deck ->', k1, '| after close:', await pg.evaluate("HD.state.overlay && HD.state.overlay.kind"))
        print('errors', errs); await b.close()
asyncio.run(main())

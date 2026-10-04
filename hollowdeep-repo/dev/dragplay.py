import asyncio, json
from playwright.async_api import async_playwright
from pathlib import Path as _P
HTML_URL = 'file://' + str((_P(__file__).resolve().parent.parent / 'dist' / 'hollowdeep.html'))
def setup(enc, ids): return f"""async()=>{{HD.sleep=()=>Promise.resolve(); const S=HD.state,r=S.run; r.feed.length=0; S.kind='monster'; S.g=new HD.Combat(r,'{enc}',HD.UI,'monster'); S.screen='combat'; S.busy=true; HD.render(); await S.g.start(); const g=S.g;
  for (const e of g.enemies) {{ e.hp=e.maxHp=200; }} g.hand={json.dumps(ids)}.map(id=>g.makeCard(id,false)); g.energy=9; S.busy=false; HD.render(); }}"""
async def touch_drag(cdp, x0, y0, x1, y1, steps=12):
    await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x0,'y':y0}]})
    for i in range(1, steps+1):
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':x0+(x1-x0)*i/steps,'y':y0+(y1-y0)*i/steps}]})
        await asyncio.sleep(0.015)
    await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
async def tap(cdp, x, y):
    await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]}); await asyncio.sleep(0.03)
    await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
CARDPT = """(cid)=>{const el=document.querySelector(`.hand .card[data-cid="${cid}"]`); if(!el) return null; const r=el.getBoundingClientRect(); const nx=el.nextElementSibling; const right = nx && nx.classList.contains('card') ? Math.min(r.right, nx.getBoundingClientRect().left) : r.right; return {x:(r.left+right)/2, y:r.top+r.height*0.55, handTop: document.querySelector('.hand').getBoundingClientRect().top}}"""
FOEPT = "(i)=>{const f=document.querySelectorAll('.foe')[i].getBoundingClientRect(); return {x:f.left+f.width/2, y:f.top+f.height/2}}"
STATE = "()=>({e: HD.state.g.energy, block: HD.state.g.p.block, hp: HD.state.g.enemies.map(e=>200-e.hp), hand: HD.state.g.hand.map(c=>c.id), sel: HD.state.sel && HD.state.sel.id, line: !!document.querySelector('.playline')})"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); res = {}
        for tag, vp in (('portrait', {'width':390,'height':844}), ('landscape', {'width':844,'height':390})):
            ctx = await b.new_context(viewport=vp, is_mobile=True, has_touch=True, device_scale_factor=2)
            pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
            cdp = await ctx.new_cdp_session(pg)
            await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
            await pg.tap('button.hero[data-arg=VEILED]'); await pg.wait_for_timeout(200)
            out = {}
            async def fresh(enc, ids):
                await pg.evaluate(setup(enc, ids)); await pg.wait_for_timeout(700)
            # 1 self: Defend dragged up plays
            await fresh('BANDITS', ['JAB','EVADE','KNIFE_FAN','LETHAL_DOSE','JAB'])
            c = await pg.evaluate(CARDPT, 'EVADE'); await touch_drag(cdp, c['x'], c['y'], c['x'], c['handTop'] - 120); await pg.wait_for_timeout(700)
            out['self dragged up'] = await pg.evaluate(STATE)
            # 2 released low: cancelled
            c = await pg.evaluate(CARDPT, 'KNIFE_FAN'); await touch_drag(cdp, c['x'], c['y'], c['x'] + 20, c['handTop'] + 10); await pg.wait_for_timeout(600)
            out['dropped low cancels'] = await pg.evaluate(STATE)
            # 3 all-enemy dragged up
            c = await pg.evaluate(CARDPT, 'KNIFE_FAN'); await touch_drag(cdp, c['x'], c['y'], c['x'], c['handTop'] - 140); await pg.wait_for_timeout(700)
            out['all-enemy dragged up'] = await pg.evaluate(STATE)
            # 4 targeted: drag onto enemy 2
            c = await pg.evaluate(CARDPT, 'LETHAL_DOSE'); f = await pg.evaluate(FOEPT, 2); await touch_drag(cdp, c['x'], c['y'], f['x'], f['y'], 16); await pg.wait_for_timeout(700)
            out['targeted onto enemy 3'] = await pg.evaluate("()=>HD.state.g.enemies.map(e=>e.pw.toxin||0)")
            # 5 targeted dropped in empty play area with several enemies: cancelled
            c = await pg.evaluate(CARDPT, 'JAB'); await touch_drag(cdp, c['x'], c['y'], 20, c['handTop'] - 60); await pg.wait_for_timeout(600)
            out['targeted dropped on nothing'] = await pg.evaluate(STATE)
            # 6 taps never play: tap lifts, tap again puts back, tap enemy puts back
            c = await pg.evaluate(CARDPT, 'JAB'); await tap(cdp, c['x'], c['y']); await pg.wait_for_timeout(300)
            lifted = await pg.evaluate(STATE)
            sel = await pg.evaluate("(()=>{const r=document.querySelector('.hand .card.sel').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}})()")
            await tap(cdp, sel['x'], sel['y']); await pg.wait_for_timeout(300)
            back = await pg.evaluate(STATE)
            c = await pg.evaluate(CARDPT, 'JAB'); await tap(cdp, c['x'], c['y']); await pg.wait_for_timeout(300)
            f = await pg.evaluate(FOEPT, 0); await tap(cdp, f['x'], f['y']); await pg.wait_for_timeout(300)
            enemyTap = await pg.evaluate(STATE)
            out['taps'] = {'lift': lifted['sel'], 'hint': await pg.evaluate("document.querySelector('.combat > .hint') && document.querySelector('.combat > .hint').textContent") if False else None, 'tapAgainPutsBack': back['sel'] is None and back['e'] == lifted['e'], 'enemyTapPlays': enemyTap['e'] != back['e'], 'enemyTapPutsBack': enemyTap['sel'] is None}
            # 7 drag a lifted card up (self)
            await fresh('BANDITS', ['JAB','EVADE','JAB'])
            c = await pg.evaluate(CARDPT, 'EVADE'); await tap(cdp, c['x'], c['y']); await pg.wait_for_timeout(300)
            hint = await pg.evaluate("document.querySelector('.combat > .hint').textContent")
            sel = await pg.evaluate("(()=>{const r=document.querySelector('.hand .card.sel').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}})()")
            await touch_drag(cdp, sel['x'], sel['y'], sel['x'], 60); await pg.wait_for_timeout(700)
            out['drag a lifted card'] = {'hint': hint, **(await pg.evaluate(STATE))}
            # 8 one enemy left: a targeted card dragged up plays on it
            await fresh('RIPJAW', ['JAB','EVADE'])
            c = await pg.evaluate(CARDPT, 'JAB'); await touch_drag(cdp, c['x'], c['y'], c['x'], c['handTop'] - 120); await pg.wait_for_timeout(700)
            out['single enemy, dragged up'] = await pg.evaluate(STATE)
            out['errors'] = errs
            res[tag] = out
            await ctx.close()
        print(json.dumps(res, indent=1)); await b.close()
asyncio.run(main())

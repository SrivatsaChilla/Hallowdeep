import asyncio, random
from playwright.async_api import async_playwright
import os as _os, tempfile as _tf
from pathlib import Path as _Path
_ROOT = _Path(__file__).resolve().parents[2]
HTML_URL = (_ROOT / 'dist' / 'hallowdeep.html').as_uri()
TMP = _os.path.join(_tf.gettempdir(), 'hallowdeep-')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; results=[]
        import sys
        for seed in sys.argv[1:] or ['bot1']:
            pg = await b.new_page(viewport={'width':1280,'height':820})
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(HTML_URL)
            await pg.evaluate(f"HD.nextSeed = '{seed}'"); await pg.click('button.hero[data-arg=%s]' % ('VEILED' if seed.startswith('veil') else 'CROWNED' if seed.startswith('crown') else 'WIREBOUND' if seed.startswith('wire') else 'UNBURIED' if seed.startswith('necro') else 'OATHBURNER'))
            # speed up enemy pacing and give relics that touch the UI flow
            await pg.evaluate("""()=>{HD.sleep=()=>Promise.resolve(); const r=HD.state.run; ['BREWING_POT','HAND_MIRROR','CLOCKWORK_SKY','BEDROLL','SPADE','KETTLEBELL','LOADED_DIE','LETTER_SLOT','PALE_IDOL','THE_RUNNER'].forEach(x=>r.addRelic(x)); r.maxHp=r.hp=400; HD.render();}""")
            random.seed(seed)
            for step in range(4000):
                if step % 500 == 0: print('step', step, flush=True)
                st = await pg.evaluate("()=>({s:HD.state.screen, o:HD.state.overlay&&HD.state.overlay.kind, busy:HD.state.busy})")
                if st['busy'] and st['o'] != 'choose': await pg.wait_for_timeout(5); continue
                o, s = st['o'], st['s']
                async def click(sel):
                    els = await pg.query_selector_all(sel)
                    ok = []
                    for e in els:
                        try:
                            if await e.is_enabled(): ok.append(e)
                        except Exception: pass
                    els = ok
                    if not els: return False
                    try: await random.choice(els).click(timeout=3000)
                    except Exception: return True
                    return True
                if o == 'choose':
                    n = await pg.evaluate("()=>{const o=HD.state.overlay; return [o.n, o.min==null?o.n:o.min]}")
                    await click('.overlay .card')
                    if not await click('[data-act=confirm]'): pass
                    continue
                if o == 'pick': await click('.overlay .card'); continue
                if o == 'bonus':
                    if not await click('.overlay [data-act=take]:not([disabled]), .overlay [data-act=takecard]:not([disabled])'): await click('[data-act=bonus-done]')
                    continue
                if o == 'choice': await click('[data-act=choicePick]'); continue
                if o in ('pile','potion','info','cardinfo'): await click('[data-act=close]'); continue
                if o: 
                    if not await click('.overlay [data-act]'): print('stuck on overlay', o, flush=True)
                    continue
                if s == 'ancient': await click('[data-act=gift]'); continue
                if s == 'event':
                    if not await click('[data-act=ev-pick]'): await click('[data-act=to-map]')
                    continue
                if s == 'map': await click('.node.reach'); continue
                if s == 'combat':
                    r = random.random()
                    if r < 0.12 and await click('.vial[data-act=potion]'):
                        if not await click('[data-act=drink]'): await click('[data-act=close]')
                        continue
                    if await pg.query_selector('.foe.targetable'): await click('.foe.targetable'); continue
                    if not await click('.hand .card.playable'): await click('[data-act=end]')
                    continue
                if s == 'reward':
                    if not await click('[data-act=take]:not([disabled]), [data-act=takecard], [data-act=open-cards]'): await click('[data-act=continue]')
                    continue
                if s == 'rest':
                    if not await click('[data-act=rest]'): await click('[data-act=to-map]')
                    continue
                if s == 'shop':
                    if random.random() < 0.5 and await click('[data-act=buy]'): continue
                    await click('[data-act=to-map]'); continue
                if s == 'treasure':
                    if not await click('[data-act=open-chest], [data-act=take-chest]'): await click('[data-act=to-map]')
                    continue
                if s == 'end':
                    results.append(await pg.evaluate("()=>[HD.state.result, HD.state.run.floor, HD.state.run.relics.length, HD.state.run.deck.length]")); break
            else:
                results.append(('unfinished', st))
        print('results', results); print('errors', errs[:5]); await b.close()
asyncio.run(main())

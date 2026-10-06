import asyncio, json
from playwright.async_api import async_playwright
import os as _os, tempfile as _tf
from pathlib import Path as _Path
_ROOT = _Path(__file__).resolve().parents[2]
HTML_URL = (_ROOT / 'dist' / 'hallowdeep.html').as_uri()
TMP = _os.path.join(_tf.gettempdir(), 'hallowdeep-')
STATE = "()=>{const r=HD.state.run; return JSON.stringify({screen:HD.state.screen, deck:r.deck.map(c=>c.id+(c.up?'+':'')), gold:r.gold, hp:r.hp, maxHp:r.maxHp, floor:r.floor, relics:r.relics, potions:r.potions, path:r.path, pos:r.pos, off:r.rarityOffset, po:r.potionOdds, rng:Object.fromEntries(Object.entries(r.rng).map(([k,v])=>[k,v.getState()])), boss:r.boss, fights:r.fights})}"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width':1280,'height':820})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
        print('fresh title has Continue:', await pg.query_selector('[data-act=resume]') is not None)
        await pg.evaluate("HD.nextSeed = 'save1'"); await pg.click('button.hero'); await pg.wait_for_timeout(200)
        await pg.click('[data-act=gift]'); await pg.wait_for_timeout(200)
        while await pg.evaluate("!!HD.state.overlay"):
            if await pg.query_selector('.overlay .card'): await pg.click('.overlay .card')
            elif await pg.query_selector('.overlay [data-act=take]'): await pg.click('.overlay [data-act=take]')
            else: await pg.click('[data-act=bonus-done]')
            await pg.wait_for_timeout(150)
        await pg.evaluate("HD.sleep=()=>Promise.resolve()")
        await pg.click('.node.reach'); await pg.wait_for_timeout(600)
        # mid-combat save: record the enemies, reload, continue, compare
        foes0 = await pg.evaluate("HD.state.g.enemies.map(e=>e.id+':'+e.hp).join(',')")
        hand0 = await pg.evaluate("HD.state.g.hand.map(c=>c.id).join(',')")
        await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('[data-act=resume]'); await pg.wait_for_timeout(800)
        foes1 = await pg.evaluate("HD.state.g.enemies.map(e=>e.id+':'+e.hp).join(',')")
        hand1 = await pg.evaluate("HD.state.g.hand.map(c=>c.id).join(',')")
        print('mid-combat resume replays the same fight:', foes0 == foes1 and hand0 == hand1, '|', foes1)
        # win the fight, take everything, back to the map
        await pg.evaluate("()=>{const S=HD.state; for(const e of S.g.alive()) e.hp=1; S.run.potions[0]='BLASTING_VIAL'; HD.render();}")
        await pg.click('.vial[data-arg="0"]'); await pg.click('[data-act=drink]'); await pg.wait_for_timeout(1500)
        for _ in range(6):
            el = await pg.query_selector('[data-act=take], [data-act=takecard]')
            if not el: break
            await el.click(); await pg.wait_for_timeout(150)
        await pg.click('[data-act=continue]'); await pg.wait_for_timeout(300)
        s0 = await pg.evaluate(STATE)
        await pg.reload(); await pg.wait_for_timeout(300)
        label = await pg.inner_text('[data-act=resume]')
        await pg.click('[data-act=resume]'); await pg.wait_for_timeout(300)
        s1 = await pg.evaluate(STATE)
        a, c = json.loads(s0), json.loads(s1)
        print('continue label:', label)
        print('map resume identical:', s0 == s1, '' if s0 == s1 else [k for k in a if a[k] != c[k]])
        # reward screen resume keeps the same rewards
        await pg.click('.node.reach'); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const S=HD.state; for(const e of S.g.alive()) e.hp=1; S.run.potions[0]='BLASTING_VIAL'; HD.render();}")
        await pg.click('.vial[data-arg="0"]'); await pg.click('[data-act=drink]'); await pg.wait_for_timeout(1500)
        r0 = await pg.evaluate("JSON.stringify(HD.state.reward)")
        await pg.reload(); await pg.wait_for_timeout(300); await pg.click('[data-act=resume]'); await pg.wait_for_timeout(300)
        r1 = await pg.evaluate("JSON.stringify(HD.state.reward)")
        print('reward-screen resume keeps the same spoils:', r0 == r1, '| screen', await pg.evaluate("HD.state.screen"))
        # death clears the save
        await pg.click('[data-act=continue]'); await pg.wait_for_timeout(200)
        await pg.click('.node.reach'); await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{const S=HD.state; S.g.p.hp=1; S.g.p.block=0; for(const e of S.g.alive()) e.intent=Object.keys(e.def.moves).find(k=>e.def.moves[k].atk!=null)||e.intent; HD.render();}")
        await pg.click('[data-act=end]'); await pg.wait_for_timeout(1500)
        print('after death screen:', await pg.evaluate("HD.state.screen"), '| save cleared:', await pg.evaluate("localStorage.getItem('hollowdeep.run') === null"))
        print('errors', errs); await b.close()
asyncio.run(main())

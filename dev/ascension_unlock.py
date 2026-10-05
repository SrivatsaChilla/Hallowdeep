# Ascension unlocks in the browser: a fresh player has only Ascension 0; winning a run at level N unlocks N + 1 for that
# character only; the picker cannot go past the unlocked level; new runs use the chosen level.  Usage: python3 dev/ascension_unlock.py
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
HTML_URL = 'file://' + str(Path(__file__).resolve().parent.parent / 'dist' / 'hallowdeep.html')
fails = 0
def eq(name, got, want):
    global fails
    ok = got == want; fails += 0 if ok else 1
    print(('ok   ' if ok else 'FAIL ') + name + ('' if ok else f'  got {got!r} want {want!r}'))
PICK = "(id) => { const b = document.querySelector(`[data-key=asc-${id}]`); return { lvl: +b.querySelector('.lvl').textContent, minus: !b.querySelector('[data-arg$=\":-1\"]').disabled, plus: !b.querySelector('[data-arg$=\":1\"]').disabled, goal: b.querySelector('.goal').textContent }; }"
WIN = """() => { const S = HD.state, r = S.run; r.act = HD.LAST_ACT; r.secondBoss = r.asc >= 10 ? 'DONE' : r.secondBoss; S.kind = 'boss'; S.screen = 'reward'; S.reward = []; HD.render(); }"""
async def win(pg):
    await pg.evaluate(WIN); await pg.wait_for_timeout(200)
    await pg.click('[data-act=continue]'); await pg.wait_for_timeout(300)
    return await pg.evaluate("(() => { const u = document.querySelector('.end .unlock'); return [HD.state.screen, u ? u.textContent.trim() : null]; })()")
async def title(pg):
    await pg.reload(); await pg.wait_for_timeout(400)
async def start(pg, ch):
    await pg.click(f'button.hero[data-arg={ch}]'); await pg.wait_for_timeout(300)
    return await pg.evaluate("HD.state.run.asc")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 900}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
        await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
        await pg.evaluate("localStorage.clear(); localStorage.setItem('hollowdeep-asc', '7')"); await title(pg)
        eq('Fresh player: Ironclad has only Ascension 0 (an old saved choice of 7 is ignored)', await pg.evaluate(PICK, 'OATHBURNER'), {'lvl': 0, 'minus': False, 'plus': False, 'goal': 'Win a run on no Ascension to unlock Ascension 1.'})
        await pg.evaluate("document.querySelector('[data-key=asc-OATHBURNER] [data-arg$=\":1\"]').disabled = false"); await pg.click('[data-key=asc-OATHBURNER] [data-arg$=":1"]'); await pg.wait_for_timeout(150)
        eq('Forcing the + button still cannot go past the unlocked level', (await pg.evaluate(PICK, 'OATHBURNER'))['lvl'], 0)
        eq('A run started now is Ascension 0', await start(pg, 'OATHBURNER'), 0)
        eq('Winning on Ascension 0 unlocks Ascension 1', await win(pg), ['end', 'Ascension 1 unlocked for Ironclad: Swarming Elites.'])
        await title(pg)
        eq('Ironclad: Ascension 1 unlocked and selected; + stops there', await pg.evaluate(PICK, 'OATHBURNER'), {'lvl': 1, 'minus': True, 'plus': False, 'goal': 'Win a run on Ascension 1 to unlock Ascension 2.'})
        eq('Silent is unaffected: still only Ascension 0', (await pg.evaluate(PICK, 'VEILED'))['lvl'], 0)
        eq('The next Ironclad run is Ascension 1', await start(pg, 'OATHBURNER'), 1)
        eq('Winning on Ascension 1 unlocks Ascension 2', (await win(pg))[1], 'Ascension 2 unlocked for Ironclad: Weary Traveler.')
        await title(pg); await pg.click('[data-key=asc-OATHBURNER] [data-arg$=":-1"]'); await pg.click('[data-key=asc-OATHBURNER] [data-arg$=":-1"]'); await pg.wait_for_timeout(150)
        eq('Lower levels stay playable', await start(pg, 'OATHBURNER'), 0)
        eq('Winning on a lower level unlocks nothing new', (await win(pg))[1], None)
        await title(pg)
        eq('Ironclad still unlocked up to 2', (await pg.evaluate(PICK, 'OATHBURNER'))['plus'], True)
        await pg.evaluate("localStorage.setItem('hollowdeep.ascUnlocked', JSON.stringify({ OATHBURNER: 10 })); localStorage.setItem('hollowdeep.ascChoice', JSON.stringify({ OATHBURNER: 10 }))"); await title(pg)
        eq('All 10 unlocked', await pg.evaluate(PICK, 'OATHBURNER'), {'lvl': 10, 'minus': True, 'plus': False, 'goal': 'Every level unlocked.'})
        await pg.evaluate("localStorage.setItem('hollowdeep.ascUnlocked', JSON.stringify({ OATHBURNER: 10 }))"); await title(pg)
        eq('An Ascension 10 run', await start(pg, 'OATHBURNER'), 10)
        await pg.evaluate("() => { const S = HD.state, r = S.run; r.startAct(2); r.startAct(3); S.kind = 'boss'; S.screen = 'reward'; S.reward = []; HD.render(); }"); await pg.wait_for_timeout(200)
        await pg.click('[data-act=continue]'); await pg.wait_for_timeout(400)
        eq('Ascension 10: beating the first Act 3 boss leads into the second boss, not a win', [await pg.evaluate("HD.state.screen"), await pg.evaluate("HD.state.kind")], ['combat', 'boss'])
        await title(pg)
        eq('An Ascension 10 run (again)', await start(pg, 'OATHBURNER'), 10)
        eq('Winning on Ascension 10 unlocks nothing further', (await win(pg))[1], None)
        eq('No page errors', errs, [])
        await b.close()
    print('all Ascension unlock checks passed' if not fails else f'{fails} FAILED')
asyncio.run(main())

# Run timer in the browser: counts during a run, pauses when the tab is hidden and on the end screen, survives closing
# the page (Continue resumes it), shows on the end screen, and sits at the right end of the top bar's first row without
# overlapping anything, at every device size (with an Ascension badge showing).  Usage: python3 dev/timer_check.py
import asyncio, re
from pathlib import Path
from playwright.async_api import async_playwright
HTML_URL = 'file://' + str(Path(__file__).resolve().parent.parent / 'dist' / 'hallowdeep.html')
SIZES = [(1920, 1080, False), (1366, 768, False), (1280, 720, False), (1029, 1236, False), (1024, 768, False), (820, 1100, False),
         (768, 1024, True), (1024, 768, True), (744, 1133, True), (430, 932, True), (390, 844, True), (360, 640, True), (320, 568, True),
         (844, 390, True), (667, 375, True), (568, 320, True)]
fails = 0
def eq(name, got, want):
    global fails
    ok = got == want; fails += 0 if ok else 1
    print(('ok   ' if ok else 'FAIL ') + name + ('' if ok else f'  got {got!r} want {want!r}'))
secs = lambda t: sum(int(x) * 60 ** i for i, x in enumerate(reversed(t.split(':'))))
TIME = "document.querySelector('.bar .runtime .t').textContent"
LAYOUT = """() => {
  const bar = document.querySelector('.bar'), rt = document.querySelector('.bar .runtime'), out = [];
  const R = (e) => e.getBoundingClientRect(), b = R(bar), r = R(rt);
  if (r.width < 10 || r.right > innerWidth + 1 || r.left < 0) out.push('timer not fully on screen');
  if (bar.scrollWidth > bar.clientWidth + 1) out.push('bar overflows');
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page scrolls sideways');
  const sharesRow = (e) => Math.min(R(e).bottom, r.bottom) - Math.max(R(e).top, r.top) > r.height / 2;
  const firstRow = [...bar.children].filter((e) => e !== rt && getComputedStyle(e).display !== 'none' && R(e).height > 0 && sharesRow(e));
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!hit || !rt.contains(hit)) out.push('timer covered');
  if (firstRow.some((e) => R(e).right > r.left + 1 && R(e).left < r.left)) out.push('something overlaps the timer');
  if (firstRow.some((e) => R(e).left > r.right)) out.push('timer is not the right-most item');
  if (Math.round(b.right - r.right) > 40) out.push(`timer ${Math.round(b.right - r.right)}px from the right edge`);
  for (const e of bar.querySelectorAll('.stat, .deckbtn, .ascbadge')) { const x = R(e); if (x.width && x.right > r.left + 1 && x.left < r.right - 1 && x.bottom > r.top + 1 && x.top < r.bottom - 1) out.push('overlaps ' + e.className); }
  return out;
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
        await pg.goto(HTML_URL); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('button.hero[data-arg=OATHBURNER]'); await pg.wait_for_timeout(200)
        await (await pg.query_selector('[data-act=gift]')).click(); await pg.wait_for_timeout(200)
        t0 = secs(await pg.evaluate(TIME)); await pg.wait_for_timeout(2600); t1 = secs(await pg.evaluate(TIME))
        eq('The timer counts while a run is open', t1 - t0 >= 2, True)
        await pg.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'))")
        h0 = await pg.evaluate("HD.state.run.playMs"); await pg.wait_for_timeout(1800); h1 = await pg.evaluate("HD.state.run.playMs")
        eq('It pauses while the tab is hidden', round(h1 - h0), 0)
        saved = await pg.evaluate("JSON.parse(localStorage.getItem('hollowdeep.run')).run.data.playMs")
        eq('Hiding the tab saves the time with the run', abs(saved - h1) < 5, True)
        await pg.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'))")
        await pg.wait_for_timeout(1200); before = await pg.evaluate("HD.state.run.playMs")
        await pg.evaluate("window.dispatchEvent(new Event('pagehide'))"); await pg.reload(); await pg.wait_for_timeout(400)
        await pg.click('[data-act=resume]'); await pg.wait_for_timeout(300)
        after = await pg.evaluate("HD.state.run.playMs")
        eq('Closing the page and pressing Continue resumes from the saved time', abs(after - before) < 1500 and after > 3000, True)
        await pg.evaluate("() => { const S = HD.state, r = S.run; r.act = HD.LAST_ACT; S.kind = 'boss'; S.screen = 'reward'; S.reward = []; HD.render(); }")
        await pg.click('[data-act=continue]'); await pg.wait_for_timeout(300)
        endtxt = await pg.evaluate("document.querySelector('.end .fine').textContent")
        eq('The end screen shows the final time', bool(re.search(r'Time \d+:\d\d', endtxt)), True)
        e0 = await pg.evaluate("HD.state.run.playMs"); await pg.wait_for_timeout(1200); e1 = await pg.evaluate("HD.state.run.playMs")
        eq('The clock stops on the end screen', round(e1 - e0), 0)
        await pg.close()
        bad = []
        for w, h, touch in SIZES:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=touch, has_touch=touch); q = await ctx.new_page()
            q.on('pageerror', lambda e: errs.append(str(e)[:120]))
            await q.goto(HTML_URL); await q.evaluate("localStorage.clear(); localStorage.setItem('hollowdeep.ascUnlocked', JSON.stringify({ OATHBURNER: 10 })); localStorage.setItem('hollowdeep.ascChoice', JSON.stringify({ OATHBURNER: 7 }))"); await q.reload(); await q.wait_for_timeout(300)
            await (q.tap if touch else q.click)('button.hero[data-arg=OATHBURNER]'); await q.wait_for_timeout(200)
            await q.evaluate("() => { const S = HD.state; S.run.playMs = 3725000; S.screen = 'map'; HD.render(); }"); await q.wait_for_timeout(300)
            m = await q.evaluate(LAYOUT)
            await q.evaluate("async () => { const S = HD.state; S.kind = 'monster'; S.screen = 'combat'; S.g = new HD.Combat(S.run, 'OOZES', HD.UI, 'monster'); S.busy = true; HD.render(); await S.g.start(); S.busy = false; HD.render(); }"); await q.wait_for_timeout(900)
            c = await q.evaluate(LAYOUT)
            if m or c: bad.append(f'{w}x{h}: map {m} combat {c}')
            await ctx.close()
        eq('Timer layout at 16 sizes, map and combat, with an Ascension badge (1:02:05 shown)', bad, [])
        eq('No page errors', errs, [])
        await b.close()
    print('all timer checks passed' if not fails else f'{fails} FAILED')
asyncio.run(main())

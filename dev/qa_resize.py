# Resizing and rotating mid-fight: start a fight at one size, change the window or rotate the phone through a chain of
# sizes, and run the full layout check (dev/qa_devices.py) after each change.  Usage: python3 dev/qa_resize.py
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright
SRC = (Path(__file__).parent / 'qa_devices.py').read_text()
LAYOUT = re.search(r'LAYOUT = r"""(.*?)"""', SRC, re.S).group(1)
HTML_URL = 'file://' + str(Path(__file__).resolve().parent.parent / 'dist' / 'hallowdeep.html')
SETUP = """async (enc) => { const S = HD.state; S.run.feed = []; S.kind = 'monster'; S.screen = 'combat'; S.g = new HD.Combat(S.run, enc, HD.UI, 'monster');
  S.busy = true; HD.render(); await S.g.start(); S.g.hand = ['CUT','BRACE','CRACK','CUT','BRACE','CUT','BRACE'].map((i) => S.g.makeCard(i, false)); S.busy = false; HD.render(); }"""
CHAINS = {
  'desktop window': (False, [(1600, 900), (1029, 1236), (900, 1100), (1280, 720), (780, 950), (1920, 1080), (643, 775), (1366, 768)]),
  'phone rotating': (True, [(390, 844), (844, 390), (390, 844), (667, 375), (360, 640), (568, 320), (320, 568)]),
  'tablet rotating': (True, [(768, 1024), (1024, 768), (744, 1133), (1133, 744)]),
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); total = 0
        for name, (touch, sizes) in CHAINS.items():
            for enc in ('RIPJAW', 'OOZES'):
                ctx = await b.new_context(viewport={'width': sizes[0][0], 'height': sizes[0][1]}, is_mobile=touch, has_touch=touch)
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
                await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
                await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
                await (pg.tap if touch else pg.click)('button.hero[data-arg=OATHBURNER]'); await pg.wait_for_timeout(200)
                await pg.evaluate(SETUP, enc); await pg.wait_for_timeout(1200)
                for w, h in sizes[1:]:
                    await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(500)
                    probs = await pg.evaluate(LAYOUT); total += len(probs)
                    if probs: print(f'  {name} {enc} -> {w}x{h}: {probs[:3]}')
                if errs: print(f'  {name} {enc} errors: {errs[:2]}'); total += len(errs)
                await ctx.close()
            print(f'{name}: {len(sizes) - 1} size changes x 2 fights checked', flush=True)
        await b.close()
        print('all resize checks passed' if not total else f'{total} problems')
asyncio.run(main())

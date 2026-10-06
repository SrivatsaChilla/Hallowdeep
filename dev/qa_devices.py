# Combat QA across device sizes: plays real fights through the screen (mouse on desktops, touch on tablets and phones)
# and checks layout, input and stuck states after every action.
# Usage: python3 dev/qa_devices.py [device names...]   (no names = all)   Writes /tmp/hollowdeep-qa-<device>.json
import asyncio, json, random, sys
from pathlib import Path as _P
from playwright.async_api import async_playwright
HTML_URL = 'file://' + str((_P(__file__).resolve().parent.parent / 'dist' / 'hallowdeep.html'))

import os
VERBOSE = os.environ.get('QA_VERBOSE') == '1'
DEVICES = {  # name: (width, height, touch)
    'desktop-1920': (1920, 1080, False), 'panel-tall': (1029, 1236, False), 'panel-narrow': (820, 1100, False), 'laptop-1366': (1366, 768, False), 'laptop-1280': (1280, 720, False), 'small-1024': (1024, 768, False),
    'tablet-portrait': (768, 1024, True), 'tablet-landscape': (1024, 768, True), 'ipad-mini': (744, 1133, True),
    'phone-large': (430, 932, True), 'phone': (390, 844, True), 'phone-small': (360, 640, True), 'phone-tiny': (320, 568, True),
    'phone-land': (844, 390, True), 'phone-land-small': (667, 375, True), 'phone-land-tiny': (568, 320, True),
}
FIGHTS = [('OATHBURNER', 'RIPJAW'), ('VEILED', 'OOZES'), ('OATHBURNER', 'CHOIR'), ('VEILED', 'CUPBEETLE_SWARM'), ('VEILED', 'crowd'), ('CROWNED', 'CHOIR'), ('WIREBOUND', 'BANDITS')]

SETUP = """async ([ch, enc]) => {
  const S = HD.state; if (!HD._sleep) { HD._sleep = HD.sleep; HD.sleep = (ms) => HD._sleep(ms * 0.2); }
  S.run = new HD.Run('qa-' + enc, ch); S.run.feed = [];
  S.run.maxHp = S.run.hp = 500; S.run.potions = ch === 'VEILED' ? ['TOXIN_FLASK', 'GHOST_JAR', 'BARK_DRAUGHT'] : ch === 'CROWNED' ? ['GLINT_FLASK', 'ROYAL_NERVE', 'BARK_DRAUGHT'] : ch === 'WIREBOUND' ? ['TUNING_DRAUGHT', 'MURK_ESSENCE', 'BARK_DRAUGHT'] : ['BARK_DRAUGHT', 'EMBER_DRAUGHT', 'TOXIN_FLASK'];
  for (const id of ({ VEILED: ['SOMERSAULT', 'KNIFE_FAN', 'LETHAL_DOSE', 'SLIP_AWAY', 'ENDURE'], CROWNED: ['WAR_PLUNDER', 'USURPER', 'STARTHROB', 'DISMISSAL', 'MOTE_WALL'], WIREBOUND: ['BOLT_BALL', 'COOL_LOGIC', 'EXTRA_CELLS', 'DOUBLE_RELEASE', 'GATHERING_MURK'] }[ch] || ['WAR_HORN', 'KINDLING_PACT', 'CLEAR_HANDS'])) S.run.addCard(id, false);
  S.run.feed.length = 0; S.overlay = null; S.sel = null;
  S.kind = 'monster'; S.screen = 'combat';
  S.g = new HD.Combat(S.run, enc === 'crowd' ? 'OOZES' : enc, HD.UI, 'monster');
  S.busy = true; HD.render(); await S.g.start();
  if (enc === 'crowd') S.g.spawn('MOSS_OOZE', {});
  for (const e of S.g.enemies) { e.hp = e.maxHp = 16; }
  S.busy = false; HD.render();
}"""

LAYOUT = r"""() => {
  const S = HD.state, g = S.g, out = [];
  if (!g || S.screen !== 'combat') return out;
  const vw = document.documentElement.clientWidth, vh = innerHeight, d = document.documentElement;
  if (d.scrollWidth > vw + 1) out.push(`page scrolls sideways (${d.scrollWidth} > ${vw})`);
  if (d.scrollHeight > vh + 1) out.push(`page scrolls down (${d.scrollHeight} > ${vh})`);
  const vis = (el, name) => { if (!el) { out.push(`${name} missing`); return null; } const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { out.push(`${name} has no size`); return r; }
    if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) out.push(`${name} off screen (${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)})`);
    return r; };
  const reachable = (el, name) => { const r = el.getBoundingClientRect(); const cx = Math.min(vw - 2, Math.max(1, r.left + r.width / 2)), cy = Math.min(vh - 2, Math.max(1, r.top + r.height / 2));
    const hit = document.elementFromPoint(cx, cy); if (!hit || !(el === hit || el.contains(hit))) out.push(`${name} covered by ${hit ? (hit.closest('.card') ? 'a card' : hit.className.toString().slice(0, 24) || hit.tagName) : 'nothing'}`); };
  const bar = document.querySelector('.bar'); vis(bar, 'top bar');
  if (bar && bar.scrollWidth > bar.clientWidth + 2) out.push('top bar overflows');
  const end = document.querySelector('[data-act=end]'); if (vis(end, 'End turn')) reachable(end, 'End turn');
  for (const a of ['draw', 'discard']) { const b = document.querySelector(`[data-act=pile][data-arg=${a}]`); if (vis(b, a + ' pile')) reachable(b, a + ' pile'); }
  vis(document.querySelector('.energy'), 'energy');
  const me = document.querySelector('.me'); if (vis(me, 'player')) reachable(me.querySelector('.sigil') || me, 'player');
  const hand = document.querySelector('.hand'); const handTop = hand ? hand.getBoundingClientRect().top : vh;
  [...document.querySelectorAll('.hand .card')].forEach((c, i) => { const r = c.getBoundingClientRect();
    if (r.left < -1 || r.right > vw + 1 || r.bottom > vh + 2) out.push(`hand card ${i + 1} off screen (${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)}; screen ${vw}x${vh}; hand ${Math.round(hand.getBoundingClientRect().top)}-${Math.round(hand.getBoundingClientRect().bottom)}; scrollY ${scrollY}; classes ${c.className.replace(/card|t-\w+|r-\w+|col-\w+/g, '').trim()})`); });
  const foes = [...document.querySelectorAll('.foe')].filter((f) => !f.classList.contains('dying') && !f.classList.contains('fled'));
  foes.forEach((f, i) => { const r = vis(f, `enemy ${i + 1}`); const s = f.querySelector('.sigil') || f; reachable(s, `enemy ${i + 1}`);
    const it = f.querySelector('.intent'); if (it && it.textContent.trim()) vis(it, `enemy ${i + 1} intent`);
    if (r && r.bottom > handTop + 6 && !S.sel) out.push(`enemy ${i + 1} overlaps the hand`); });
  for (let i = 0; i < foes.length; i++) for (let j = i + 1; j < foes.length; j++) { const a = foes[i].querySelector('.sigil').getBoundingClientRect(), b = foes[j].querySelector('.sigil').getBoundingClientRect();
    const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    if (ix * iy > 0.15 * Math.min(a.width * a.height, b.width * b.height)) out.push(`enemies ${i + 1} and ${j + 1} overlap`); }
  return out;
}"""

STATE = "() => { const S = HD.state, g = S.g; return { screen: S.screen, busy: !!S.busy, over: !!(g && g.over), phase: g && g.phase, energy: g && g.energy, hand: g ? g.hand.map((c) => c.uid) : [], playable: g && g.phase === 'player' && !S.busy ? g.hand.filter((c) => g.canPlay(c)).map((c) => [c.uid, c.id, HD.CARDS[c.id].target, HD.CARDS[c.id].type]) : [], alive: g ? g.alive().length : 0, overlay: S.overlay && S.overlay.kind, sel: !!S.sel, potions: S.run ? S.run.potions.map((p, i) => p ? [i, p, HD.POTIONS[p].target] : null).filter(Boolean) : [] }; }"
CARDPT = """(uid) => { const el = document.querySelector(`.hand .card[data-key="h${uid}"]`); if (!el) return null; const r = el.getBoundingClientRect();
  const top = document.querySelector('.hand').getBoundingClientRect().top;
  // Find a point that really lands on this card (fanned cards are tilted, so the visible part is not a neat strip).
  for (const fy of [0.55, 0.4, 0.7, 0.3, 0.8]) for (const fx of [0.15, 0.3, 0.08, 0.45, 0.6, 0.75, 0.9]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy;
    if (x < 1 || y < 1 || x > innerWidth - 1 || y > innerHeight - 1) continue;
    const hit = document.elementFromPoint(x, y);
    if (hit && el.contains(hit)) return { x, y, ok: true, what: 'card', top };
  }
  const x = r.left + r.width * 0.15, y = r.top + r.height * 0.55, hit = document.elementFromPoint(x, y);
  return { x, y, ok: false, what: hit ? (hit.closest('.card') ? 'card ' + (hit.closest('.card').dataset.cid || '?') : hit.className.toString().slice(0, 20)) : 'nothing', top }; }"""
FOEPT = "(i) => { const f = [...document.querySelectorAll('.foe')].filter((x) => !x.classList.contains('dying') && !x.classList.contains('fled'))[i]; if (!f) return null; const r = (f.querySelector('.sigil') || f).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }"

async def run_device(b, name):
    w, h, touch = DEVICES[name]
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=touch, has_touch=touch, device_scale_factor=1)
    pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
    errs, issues = [], {}
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    pg.on('console', lambda m: errs.append('console: ' + m.text[:140]) if m.type == 'error' and '403' not in m.text and 'Failed to load resource' not in m.text else None)
    def flag(kind, detail): issues.setdefault(kind, []).append(detail)
    async def tap(x, y):
        if touch:
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]}); await asyncio.sleep(0.04)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        else: await pg.mouse.click(x, y)
    async def drag(x0, y0, x1, y1):
        steps = 14
        if touch:
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
            for i in range(1, steps + 1):
                await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / steps, 'y': y0 + (y1 - y0) * i / steps}]}); await asyncio.sleep(0.012)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        else:
            await pg.mouse.move(x0, y0); await pg.mouse.down()
            for i in range(1, steps + 1): await pg.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await asyncio.sleep(0.01)
            await pg.mouse.up()
    async def settle(limit=8000):
        t = 0
        while t < limit:
            st = await pg.evaluate(STATE)
            if st['overlay'] or (not st['busy'] and (st['phase'] == 'player' or st['over'] or st['screen'] != 'combat')):
                # let card animations (draws, discards) finish before checking or touching anything
                for _ in range(50):
                    busy_fx = await pg.evaluate("() => document.querySelectorAll('.card.flying, .flyer').length + document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length")
                    if not busy_fx: break
                    await asyncio.sleep(0.05)
                return await pg.evaluate(STATE)
            await asyncio.sleep(0.05); t += 50
        flag('stuck', f'busy for {limit} ms'); return await pg.evaluate(STATE)
    await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
    await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
    rng = random.Random(name)
    fights = []
    for ch, enc in [f for f in FIGHTS if not os.environ.get('QA_FIGHTS') or f[1] in os.environ['QA_FIGHTS'].split(',')]:
        await pg.evaluate(SETUP, [ch, enc]); st = await settle()
        actions, plays, potions, turns = 0, 0, 0, 0
        while not st['over'] and st['screen'] == 'combat' and actions < 70:
            actions += 1
            if VERBOSE: print(name, enc, actions, st['phase'], st['overlay'], len(st['playable']), st['alive'], st['energy'], flush=True)
            if st['overlay']:
                kind = st['overlay']
                if kind == 'choose':
                    need = await pg.evaluate("() => { const o = HD.state.overlay; return o.n || 1; }")
                    els = await pg.query_selector_all('.overlay .card')
                    for el in els[:need]:
                        bb = await el.bounding_box()
                        if bb: await tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await asyncio.sleep(0.15)
                    conf = await pg.query_selector('.overlay [data-act=confirm]')
                    if conf:
                        bb = await conf.bounding_box()
                        if not bb or bb['y'] + bb['height'] > h + 1 or bb['x'] + bb['width'] > w + 1: flag('layout', f'{enc}: Confirm button off screen in a choice')
                        await conf.click() if not touch else await tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
                else:
                    close = await pg.query_selector('.overlay [data-act=close]')
                    if close: await close.click()
                st = await settle(); continue
            lay = await pg.evaluate(LAYOUT)
            for p in lay: flag('layout', f'{enc} turn {turns + 1}: {p}')
            if lay and os.environ.get('QA_SHOT') and not issues.get('_shot'): issues['_shot'] = {'shot': 1}; await pg.screenshot(path=f'/tmp/hollowdeep-qa-{name}.png'); print('SHOT', lay[:3], flush=True)
            if st['potions'] and rng.random() < 0.12:
                i, pid, tgt = st['potions'][0]
                vial = await pg.query_selector(f'.vial[data-act=potion][data-arg="{i}"]')
                if vial:
                    bb = await vial.bounding_box(); await tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await asyncio.sleep(0.25)
                    dr = await pg.query_selector('.overlay [data-act=drink]')
                    if not dr: flag('input', f'{enc}: potion menu has no Drink button'); await pg.evaluate("() => { HD.state.overlay = null; HD.render(); }")
                    else:
                        bb = await dr.bounding_box(); await tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await asyncio.sleep(0.25)
                        if tgt == 'enemy':
                            f = await pg.evaluate(FOEPT, 0)
                            if f: await tap(f['x'], f['y'])
                        await asyncio.sleep(0.3); st2 = await settle()
                        if len(st2['potions']) >= len(st['potions']): flag('input', f'{enc}: potion {pid} was not used')
                        else: potions += 1
                        st = st2; continue
            if not st['playable']:
                end = await pg.query_selector('[data-act=end]'); bb = await end.bounding_box()
                await tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); turns += 1
                await asyncio.sleep(0.15); st = await settle(); continue
            uid, cid, target, ctype = rng.choice(st['playable'])
            pt = await pg.evaluate(CARDPT, uid)
            if not pt: flag('input', f'{enc}: card {cid} not found in the hand'); break
            if not pt['ok']: flag('layout', f'{enc}: card {cid} cannot be reached (the point hits {pt["what"]})')
            e0, h0 = st['energy'], len(st['hand'])
            many = st['alive'] > 1
            use_click = (not touch) and rng.random() < 0.5
            if target == 'enemy':
                f = await pg.evaluate(FOEPT, rng.randrange(st['alive']))
                if use_click: await tap(pt['x'], pt['y']); await asyncio.sleep(0.15); await tap(f['x'], f['y']) if many else None
                else: await drag(pt['x'], pt['y'], f['x'], f['y']) if many else await drag(pt['x'], pt['y'], pt['x'], max(12, pt['top'] - 130))
            else:
                if use_click: await tap(pt['x'], pt['y'])
                else: await drag(pt['x'], pt['y'], pt['x'], max(12, pt['top'] - 130))
            await asyncio.sleep(0.12); st2 = await settle()
            played = uid not in st2['hand'] or st2['over'] or st2['overlay'] or st2['energy'] != e0
            if not played:
                extra = ''
                if os.environ.get('QA_DIAG') and target == 'enemy':
                    extra = ' | ' + json.dumps(await pg.evaluate("([x,y]) => ({under: document.elementsFromPoint(x,y).slice(0,3).map(e => (e.closest('.foe') ? '[foe ' + e.closest('.foe').className.trim() + '] ' : '') + e.className.toString().slice(0,20)), foes: [...document.querySelectorAll('.foe')].map(f => { const r = f.querySelector('.sigil').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), f.className.trim()]; }), sel: HD.state.sel && HD.state.sel.id, alive: HD.state.g.alive().length, aimedAt: [Math.round(x), Math.round(y)]})", [f['x'], f['y']] if f else [0, 0]))
                flag('input', f'{enc}: {"click" if use_click else ("touch drag" if touch else "mouse drag")} did not play {cid} ({target}){extra}')
            else: plays += 1
            st = st2
        if st['screen'] == 'combat' and not st['over']: flag('flow', f'{enc}: fight not finished after {actions} actions')
        await asyncio.sleep(0.6)
        rs = await pg.evaluate("() => ({ screen: HD.state.screen, cont: (() => { const c = document.querySelector('[data-act=continue]'); if (!c) return null; const r = c.getBoundingClientRect(); return [r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1, r.bottom <= document.documentElement.scrollHeight + 1]; })() })")
        if rs['screen'] != 'reward': flag('flow', f'{enc}: after the fight the screen is {rs["screen"]}, not the rewards')
        elif not rs['cont'] or not all(rs['cont']): flag('layout', f'{enc}: Continue button on the reward screen is off screen')
        fights.append({'enc': enc, 'plays': plays, 'potions': potions, 'turns': turns, 'actions': actions})
    await ctx.close()
    # keep each distinct problem once, with how often it happened
    summary = {k: {} for k in issues}
    for k, v in issues.items():
        for x in v: summary[k][x] = summary[k].get(x, 0) + 1
    return {'device': name, 'size': f'{w}x{h}', 'touch': touch, 'fights': fights, 'issues': summary, 'errors': sorted(set(errs))}

async def main():
    names = sys.argv[1:] or list(DEVICES)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for n in names:
            r = await run_device(b, n)
            _P(f'/tmp/hollowdeep-qa-{n}.json').write_text(json.dumps(r, indent=1))
            total = sum(sum(v.values()) for v in r['issues'].values())
            print(f"{n:17} {r['size']:10} {'touch' if r['touch'] else 'mouse'}  plays {sum(f['plays'] for f in r['fights'])}, potions {sum(f['potions'] for f in r['fights'])}, issues {total}, errors {len(r['errors'])}", flush=True)
        await b.close()
asyncio.run(main())

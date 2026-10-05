import asyncio, json
from playwright.async_api import async_playwright
import os as _os, tempfile as _tf
from pathlib import Path as _Path
_ROOT = _Path(__file__).resolve().parents[2]
HTML_URL = (_ROOT / 'dist' / 'hallowdeep.html').as_uri()
TMP = _os.path.join(_tf.gettempdir(), 'hallowdeep-')
JS = """([names, ver])=>{
  HD.setVersion(ver); HD.setNames(names);
  const cards=[]; for (const id of Object.keys(HD.CARDS)) { const d=HD.CARDS[id]; if (d.coop || (d.only && d.only!==HD.version)) continue; cards.push({uid:'a'+id,id,up:false}); if (['Attack','Skill','Power'].includes(d.type)) cards.push({uid:'b'+id,id,up:true}); }
  HD.state.overlay={kind:'pile',title:'all',cards}; HD.state.screen='map'; HD.render();
  const bad=[]; for (const el of document.querySelectorAll('.overlay .card')) {
    const t=el.querySelector('.ctext'), n=el.querySelector('.cname');
    const clipT = t && t.firstElementChild ? (t.firstElementChild.getBoundingClientRect().height > t.clientHeight + 1) : false;
    const clipN = n && n.scrollWidth > n.clientWidth;
    if (clipT || clipN) bad.push({name:n.textContent, text: clipT, nameClip: clipN, len:(t?t.textContent.length:0)});
  }
  return {total: document.querySelectorAll('.overlay .card').length, bad};
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp,label in [({'width':1280,'height':820},'desktop'),({'width':1000,'height':700},'laptop'),({'width':390,'height':844},'phone'),({'width':360,'height':640},'small'),({'width':844,'height':390},'sideways')]:
            pg = await b.new_page(viewport=vp, is_mobile=(label in ('phone','small','sideways')), has_touch=(label in ('phone','small','sideways')))
            await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
            await pg.click('button.hero'); await pg.wait_for_timeout(200)
            for names in ['original','hollowdeep']:
                r = await pg.evaluate(JS, [names, '0.111'])
                print(label, names, 'cards', r['total'], 'clipped', len(r['bad']))
                for x in r['bad'][:14]: print('   ', x)
            await pg.close()
        await b.close()
asyncio.run(main())

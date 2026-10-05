import asyncio
from playwright.async_api import async_playwright
from pathlib import Path as _P
HTML_URL = 'file://' + str((_P(__file__).resolve().parent.parent / 'dist' / 'hallowdeep.html'))
JS = """async(names)=>{ HD.setNames(names); HD.sleep=()=>Promise.resolve(); const S=HD.state,r=S.run; S.kind='monster'; S.g=new HD.Combat(r,'RIPJAW',HD.UI,'monster'); S.screen='combat'; S.busy=true; HD.render(); await S.g.start(); S.busy=false;
  const minFs=[]; const ids=Object.keys(HD.CARDS).filter(id=>!HD.CARDS[id].coop && (!HD.CARDS[id].only || HD.CARDS[id].only===HD.version)); const bad=[];
  for (let i=0;i<ids.length;i+=10) { for (const up of [false,true]) { S.g.hand = ids.slice(i,i+10).map(id=>S.g.makeCard(id, up && ['Attack','Skill','Power'].includes(HD.CARDS[id].type))); HD.render();
    for (const el of document.querySelectorAll('.hand .card')) { const t=el.querySelector('.ctext'), n=el.querySelector('.cname');
      const clipT = t && t.firstElementChild ? t.firstElementChild.getBoundingClientRect().height > t.getBoundingClientRect().height + 1 : false;
      const clipN = n && n.scrollWidth > n.clientWidth; if (clipT||clipN) bad.push((n?n.textContent:'?')+(clipT?' [text]':'')+(clipN?' [name]':'')); minFs.push(parseFloat(getComputedStyle(t).fontSize)); } } }
  minFs.sort((a,b)=>a-b); return {checked: ids.length*2, bad: [...new Set(bad)], smallestText: minFs[0], p10Text: minFs[Math.floor(minFs.length*0.1)]}; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp,label in [({'width':390,'height':844},'phone'),({'width':360,'height':640},'small'),({'width':844,'height':390},'sideways'),({'width':667,'height':375},'sideways-small')]:
            for names in ('original','hollowdeep'):
                pg = await b.new_page(viewport=vp, is_mobile=True, has_touch=True)
                await pg.goto(HTML_URL); await pg.wait_for_timeout(300)
                await pg.tap('button.hero'); await pg.wait_for_timeout(200)
                r = await pg.evaluate(JS, names)
                print(label, names, 'clipped:', len(r['bad']), r['bad'][:4], 'smallest text px', r['smallestText'], '10th pct', r['p10Text'])
                await pg.close()
        await b.close()
asyncio.run(main())

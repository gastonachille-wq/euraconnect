import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
HTML=Path('/mnt/data/EURACONNECT_V33_APERCU.html').read_text()
async def main():
 results=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in (1280,1440,1920,390):
   page=await b.new_page(viewport={'width':width,'height':900})
   await page.set_content(HTML,wait_until='load')
   for route in ('dashboard','needs','messages','agenda','directory','offers','company'):
    await page.evaluate('(r)=>location.hash="#"+r',route)
    await page.wait_for_timeout(180)
    m=await page.evaluate('''() => ({outer:document.documentElement.scrollWidth, viewport:innerWidth, main:!!document.querySelector('#page-content'),bad:[...document.querySelectorAll('main img, main button, main input, main select')].filter(el=>{let r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1)}).slice(0,5).map(el=>el.tagName+':'+el.className)})''')
    ok=m['main'] and m['outer']<=width+1 and not m['bad']
    results.append({'width':width,'route':route,'pass':ok,'details':m})
   await page.close()
  await b.close()
 Path('/mnt/data/euraconnect_v33/VALIDATION_VISUELLE_V33.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('pass',sum(x['pass'] for x in results),'total',len(results))
 print('fails',[(x['width'],x['route'],x['details']) for x in results if not x['pass']][:6])
asyncio.run(main())

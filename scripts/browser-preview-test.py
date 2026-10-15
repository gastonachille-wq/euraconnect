from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
css=(root/'public/app.css').read_text()
js=(root/'docs/previews/preview-runtime.js').read_text()
results=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1100})
 page.set_default_timeout(4000)
 errors=[]
 page.on('pageerror',lambda exc: errors.append(str(exc)))
 page.set_content('<html lang="fr"><head><style>'+css+'</style></head><body><div id="app"></div><div id="overlay"></div><div id="toasts"></div></body></html>')
 page.add_script_tag(content=js)
 page.wait_for_selector('h1')
 def check(label):
  page.wait_for_timeout(50)
  state=page.evaluate('''() => ({title:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,error:document.body.textContent.includes('[object Object]'),text:document.querySelector('#page-content')?.textContent.slice(0,100)})''')
  results.append({'test':label,**state})
  assert not state['error'],label
  assert not state['overflow'],label+' overflow'
  assert not errors,(label,errors)
 check('dashboard incubee desktop')
 page.screenshot(path=str(root/'docs/previews/dashboard.png'),full_page=True)
 for role in ['incube','prestataire','startup_manager','admin']:
  page.select_option('#demo-role',role)
  for route in ['dashboard','needs','directory','offers','messages','agenda','workshops','company']+(['portfolio'] if role in ['startup_manager','admin'] else [])+(['admin'] if role=='admin' else []):
   page.evaluate('(r)=>{location.hash="#"+r;}',route)
   page.wait_for_timeout(100)
   check(role+': '+route)
   if (role,route) in [('incube','directory'),('prestataire','needs'),('incube','agenda'),('startup_manager','portfolio'),('admin','admin')]:page.screenshot(path=str(root/'docs/previews'/f'{role}-{route}.png'),full_page=True)
 page.select_option('#demo-role','incube')
 page.evaluate('location.hash="#needs"')
 page.wait_for_timeout(180)
 print('NEED ACTIONS',page.locator('[data-action]').evaluate_all('(e)=>e.map(n=>[n.dataset.action,n.dataset.id]).filter(e=>e[0].includes("need"))'))
 page.locator('[data-action="open-need"]').first.click()
 page.wait_for_timeout(180)
 check('fiche besoin')
 page.screenshot(path=str(root/'docs/previews/besoin.png'),full_page=True)
 page.keyboard.press('Escape')
 page.set_viewport_size({'width':390,'height':844})
 for route in ['dashboard','needs','directory','agenda','workshops','messages']:
  page.evaluate('(r)=>location.hash="#"+r',route);page.wait_for_timeout(180)
  check('mobile '+route)
  if route=='dashboard':page.screenshot(path=str(root/'docs/previews/mobile-dashboard.png'),full_page=True)
 browser.close()
(root/'docs/previews/browser-test-results.json').write_text(json.dumps({'cases':results,'page_errors':errors},ensure_ascii=False,indent=2))
print('SUCCESS',len(results),'checks')

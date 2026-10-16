"""Offline browser checks. Requires Python Playwright + a Chromium executable.
HTML is generated from production sources by scripts/preview-offline.mjs.
Rendering/interaction tests use the actual UI and demo data. RPC tests use a fake
fetch transport, never a real Supabase. No authentication secrets are necessary.
"""
import asyncio, json, os, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.async_api import async_playwright
HTML=Path(sys.argv[1] if len(sys.argv)>1 else 'EURACONNECT_APERCU.html').read_text()
OUT=Path(sys.argv[2] if len(sys.argv)>2 else 'validation-browser'); OUT.mkdir(parents=True,exist_ok=True)
RESULTS=[]
async def ok(name, condition):
 RESULTS.append({'test':name,'passed':bool(condition)})
 print(('PASS ' if condition else 'FAIL ')+name,flush=True)
 (OUT/'rapport.json').write_text(json.dumps(RESULTS,indent=2))
 if not condition: raise AssertionError(name)
async def ready(page):
 await page.wait_for_timeout(70)
 await page.wait_for_function("document.querySelector('#page-content')?.getAttribute('aria-busy')==='false'",timeout=7000)
async def route(page,target):
 await page.evaluate('(hash)=>{location.hash=hash}',target)
 await ready(page)
async def open_page(browser,width=1440,height=900,role='incube',live_mock=False):
 page=await browser.new_page(viewport={'width':width,'height':height},timezone_id='Europe/Paris')
 page.set_default_timeout(7000)
 errors=[]; page.on('pageerror',lambda err:errors.append(str(err)))
 page._ec_errors=errors
 # Delay entrypoint to set a storage/transport adapter on the opaque about:blank origin.
 html=HTML.replace("require('./app.js');","window.__start=()=>require('./app.js');")
 await page.set_content(html,wait_until='load')
 await page.evaluate("""({role,live})=>{
  for(const name of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,name,{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});}
  window.__role=role;window.__calls=[];
  if(live){
   location.hash='#dashboard';
   SOURCES['./app.js']=SOURCES['./app.js'].replace('let demo = true;','let demo = false;');
   window.EC_CONFIG={version:'2.9.0',supabaseUrl:'https://supabase.mock.invalid',supabaseKey:'public-test-key'};
   localStorage.setItem('euraconnect.auth.v1',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Date.now()/1000+3600}));
   window.fetch=async(url,options={})=>{
    const data=options.body?JSON.parse(options.body):{};window.__calls.push({url,data});
    const demo=require('./demo.js');let result={};
    if(url.endsWith('/ec1_api')){
      const reads=['bootstrap','dashboard','needs','need','threads','messages','sessions','session','directory','company','person','offers','portfolio','admin','notifications','tags'];
      result=reads.includes(data.p_action)?demo.demoRpc(data.p_action,data.p_args||{},window.__role):{};
    }else if(url.endsWith('/ec23_manager_meeting')){
      if(data.p_action==='contacts')result=[{id:demo.demoBoot('incube').user.id,name:'Contact de recette'}];
      else if(data.p_action==='list')result=[];
      else result={id:'fake-invitation',status:'pending'};
    }else if(url.endsWith('/ec20_manager_api')) result=[];
    else if(url.endsWith('/ec22_view'))result={views:3,responses:2,providers:[]};
    else if(url.endsWith('/ec22_archive'))result={archived:true};
    else if(url.endsWith('/ec22_delete'))result={deleted:true};
    else throw new Error('Unexpected mock endpoint '+url);
    return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
   };
  }else{SOURCES['./app.js']=SOURCES['./app.js'].replace('let demoRole = "incube";',`let demoRole = "${role}";`);}
  __start();
 }""",{'role':role,'live':live_mock})
 try: await ready(page)
 except Exception:
  print(await page.locator('body').inner_text(),flush=True)
  print(await page.evaluate('JSON.stringify(window.__calls)'),flush=True)
  print(errors,flush=True)
  raise
 return page
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  for role in ['incube','prestataire','startup_manager','admin']:
   page=await open_page(browser,role=role)
   links=page.locator('.ec29-nav-link')
   count=await links.count()
   await ok(role+': every sidebar entry is visible',all([await links.nth(i).is_visible() for i in range(count)]))
   await ok(role+': no collapsible category',await page.locator('.ec29-navigation details').count()==0)
   footer=await page.locator('#sidebar-toggle').bounding_box()
   await ok(role+': toggle is at the bottom',footer['y']>830)
   for target in ['dashboard','needs','directory','offers','messages','agenda','workshops','company']+(['portfolio'] if role=='startup_manager' else [])+(['admin'] if role=='admin' else []):
    await route(page,'#'+target)
    content=await page.locator('#page-content').inner_text()
    await ok(role+': '+target+' renders',bool(content.strip()) and 'Cet espace ne peut pas encore' not in content)
   await ok(role+': no uncaught JavaScript exception',not page._ec_errors)
   await page.close()
  page=await open_page(browser)
  await route(page,'#directory')
  await page.screenshot(path=str(OUT/'annuaire-desktop.png'),full_page=True)
  await page.locator('#sidebar-toggle').click();await page.wait_for_timeout(220)
  box=await page.locator('.sidebar').bounding_box()
  await ok('Compact sidebar: 68 px',round(box['width'])==68)
  await ok('Collapsed state persisted',await page.evaluate("localStorage.getItem('euraconnect.nav.collapsed')")== '1')
  await page.locator('.ec29-nav-link[href="#offers"]').hover()
  await ok('Icon tooltip visible',await page.locator('#nav-tooltip').is_visible())
  await page.locator('.ec29-nav-link[href="#offers"]').click();await ready(page)
  await ok('All entries remain available after navigating collapsed',await page.locator('.ec29-nav-link:visible').count()==8)
  await ok('Toggle semantics stay collapsed on a new page',await page.locator('#sidebar-toggle').get_attribute('aria-expanded')=='false')
  await page.screenshot(path=str(OUT/'menu-reduit.png'),full_page=True)
  await page.locator('#sidebar-toggle').click();await page.wait_for_timeout(200)
  await route(page,'#directory')
  await page.locator('#ec28-quick-search').fill('Conseil');await page.wait_for_timeout(600);await ready(page)
  await ok('Directory search keeps focus',await page.evaluate("document.activeElement.id")== 'ec28-quick-search')
  await ok('Directory search creates a removable chip',await page.locator('.ec29-filter-chips [data-key=q]').count()==1)
  await page.locator('.ec29-filter-chips [data-key=q]').click();await ready(page)
  await page.locator('.ec22-facet-drawer>summary').click()
  await page.locator('#filter-form select[name=premium]').select_option('true');await ready(page)
  await ok('Facets stay open after selection',await page.locator('.ec22-facet-drawer').get_attribute('open') is not None)
  await page.locator('[data-action=clear-filters]').first.click();await ready(page)
  await page.locator('[data-action=close-filters]').click()
  await page.locator('[data-action=directory-kind][data-kind=person]').click();await ready(page)
  await page.locator('[data-action=directory-view][data-view=table]').click();await ready(page)
  await page.locator('#ec28-quick-search').fill('Alex');await page.wait_for_timeout(600);await ready(page)
  await page.locator('.ec22-facet-drawer>summary').click()
  await page.locator('[data-action=clear-filters]').first.click();await ready(page)
  await ok('Clear filters preserves Contacts tab and Table view',await page.evaluate("location.hash.includes('kind=person')&&location.hash.includes('view=table')"))
  await route(page,'#directory?kind=company')
  await page.locator('.ec29-avatar-link').first.click()
  await ok('Company logo opens its detail',await page.locator('.modal .ec12-entity-header').count()==1)
  await page.keyboard.press('Escape')
  await page.keyboard.press('/')
  await page.locator('#ec13-palette-query').fill('conseil');await page.wait_for_timeout(600)
  await page.keyboard.press('ArrowDown')
  await ok('Global palette: keyboard navigation reaches a result',await page.evaluate("document.activeElement.classList.contains('ec13-result')"))
  await page.keyboard.press('Escape')
  await route(page,'#messages')
  await page.locator('#message-form textarea').fill('Brouillon de test, ne pas envoyer.')
  before=await page.evaluate("location.hash.split('?')[0]")
  await page.locator('#filter-form input[name=q]').fill('financement');await page.wait_for_timeout(650);await ready(page)
  await ok('Messages: filter preserves conversation id',await page.evaluate("location.hash.split('?')[0]")==before)
  await ok('Messages: draft survives filtering',await page.locator('#message-form textarea').input_value()=='Brouillon de test, ne pas envoyer.')
  await page.locator('[data-action=refresh-thread]').click();await ready(page)
  await ok('Messages: draft survives refresh',await page.locator('#message-form textarea').input_value()=='Brouillon de test, ne pas envoyer.')
  await ok('Interactions: no JavaScript exception',not page._ec_errors)
  await page.close()
  for width,height in [(360,780),(390,844),(768,900),(1024,768),(1440,900),(1920,1080)]:
   page=await open_page(browser,width,height)
   await route(page,'#directory')
   metrics=await page.evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth})')
   await ok(str(width)+'px: no horizontal page overflow',metrics['scroll']<=metrics['width'])
   if width<=800:
    await ok(str(width)+'px: hidden drawer is inert',await page.locator('.ec29-sidebar').get_attribute('inert') is not None)
    await page.locator('.ec29-mobile-nav [data-action=menu]').click()
    await ok(str(width)+'px: all navigation entries in drawer',await page.locator('.ec29-nav-link:visible').count()==8)
    await ok(str(width)+'px: background is inert',await page.locator('.workspace').get_attribute('inert') is not None)
    await page.locator('#sidebar-toggle').click()
    await ok(str(width)+'px: footer button closes drawer',await page.locator('.app-shell.mobile-open').count()==0)
   if width==390:await page.screenshot(path=str(OUT/'annuaire-mobile.png'),full_page=True)
   await page.close()
  # Real event-dispatch and RPC adapter with a fully fake transport (not live Supabase).
  page=await open_page(browser,role='startup_manager',live_mock=True)
  await route(page,'#portfolio')
  await page.locator('[data-action=manager-invite]').first.click()
  await page.locator('#ec23-invite-form input[name=title]').fill("Point d'accompagnement")
  day=(datetime.now(timezone.utc)+timedelta(days=7)).strftime('%Y-%m-%d')
  await page.locator('#ec23-invite-form input[name=starts_at]').fill(day+'T14:00')
  await page.locator('#ec23-invite-form input[name=ends_at]').fill(day+'T13:00')
  await page.locator('#ec23-invite-form [type=submit]').click();await page.wait_for_timeout(100)
  await ok('Manager: invalid dates produce an inline error',await page.locator('#ec23-invite-form .form-error').is_visible())
  await ok('Manager: invalid dates are not sent',await page.evaluate("!__calls.some(c=>c.url.endsWith('/ec23_manager_meeting')&&c.data.p_action==='invite')"))
  await page.locator('#ec23-invite-form input[name=ends_at]').fill(day+'T14:30')
  await page.locator('#ec23-invite-form [type=submit]').click();await page.wait_for_timeout(150);await ready(page)
  await ok('Manager: invitation dispatcher calls the dedicated RPC once',await page.evaluate("__calls.filter(c=>c.url.endsWith('/ec23_manager_meeting')&&c.data.p_action==='invite').length")==1)
  await ok('Manager: submit prevents form reload and closes on success',await page.locator('#ec23-invite-form').count()==0)
  await page.evaluate("""async()=>{
    const api=__ecRequire('./api.js');
    await api.needLifecycleRpc('view','need-1','provider-1');
    await api.needLifecycleRpc('archive','need-1');
    await api.needLifecycleRpc('delete','need-1');
  }""")
  for op in ['view','archive','delete']:
   await ok('Lifecycle: '+op+' uses ec22 endpoint with p_need',await page.evaluate("op=>__calls.some(c=>c.url.endsWith('/ec22_'+op)&&c.data.p_need==='need-1'&&!c.data.p_action)",op))
  await ok('Mock transport: no uncaught JavaScript exception',not page._ec_errors)
  await page.close()
  await browser.close()
 OUT.joinpath('rapport.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2))
 print(json.dumps({'passed':sum(x['passed'] for x in RESULTS),'total':len(RESULTS),'directory':str(OUT)}))
try: asyncio.run(main())
except Exception:
 OUT.joinpath('rapport.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2));raise

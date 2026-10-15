"""Browser/controller regression tests with a mocked Supabase transport.
These tests exercise the real UI and request payloads, NOT the database policies.
Run after node scripts/build-preview.mjs. Requires Python playwright + Chromium.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
runtime=(root/'docs/previews/preview-runtime.js').read_text().replace('let demo = true;', 'let demo = false;')
css=(root/'public/app.css').read_text()
report=[]
setup='''(() => {
 const data={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}});
 localStorage.setItem('euraconnect.auth.v1',JSON.stringify({access_token:'test-only',refresh_token:'test-only',expires_at:Math.floor(Date.now()/1000)+3600}));
 window.EC_CONFIG={version:'1.0.0',supabaseUrl:'https://fixture.supabase.co',supabaseKey:'sb_publishable_fixture'};
 window.TEST_ROLE='incube';window.TEST_WRITES=[];location.hash='#dashboard';
 window.fetch=async (url,opts) => {
  if(!url.includes('/rest/v1/rpc/ec1_api')) throw new Error('Unexpected external request: '+url);
  const b=JSON.parse(opts.body);const action=b.p_action,args=b.p_args;
  const reads=['bootstrap','dashboard','needs','need','threads','messages','directory','company','tags','sessions','session','notifications','portfolio','offers','admin'];
  let result;
  if(reads.includes(action))result=window.EC_PREVIEW_MODULE('./demo.js').demoRpc(action,args,window.TEST_ROLE);
  else {window.TEST_WRITES.push({action,args}); result={id:args.id||'00000000-0000-4000-8000-000000000777',favorite:args.value,status:'confirme'};}
  return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
 };
})();'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000})
 page.set_default_timeout(4000)
 errs=[];page.on('pageerror',lambda ex:errs.append(str(ex)))
 page.set_content('<html lang="fr"><head><style>'+css+'</style></head><body><div id="app"></div><div id="overlay"></div><div id="toasts"></div></body></html>')
 page.add_script_tag(content=setup);page.add_script_tag(content=runtime);page.wait_for_selector('h1')
 def nav(route):page.evaluate('(r)=>location.hash="#"+r',route);page.wait_for_timeout(130)
 def assert_write(action,predicate,description):
  page.wait_for_timeout(180)
  entries=page.evaluate('(action)=>window.TEST_WRITES.filter(w=>w.action===action)',action)
  assert entries,(action,page.locator('.form-error').all_text_contents())
  assert predicate(entries[-1]['args']),entries[-1]
  assert not errs,errs
  report.append({'test':description,'status':'passed','action':action})
 nav('directory')
 print('actions',page.locator('.directory-card [data-action]').first.get_attribute('data-action'))
 page.locator('.directory-card [data-action="favorite"]').first.click()
 assert_write('favorite',lambda a:a['type']=='company' and a['value'] is False,'Unfavorite from directory thumbnail, desired state')
 nav('needs');page.locator('[data-action="new-need"]').click()
 page.locator('#f-title').fill('Structurer notre dossier de partenariat')
 page.locator('[data-name="context"]').fill('Nous recherchons une expertise concrete pour cadrer les objectifs de notre projet et definir les livrables attendus avec les partenaires du reseau.')
 page.locator('#tag-input').fill('Qualite');page.wait_for_timeout(320)
 # Existing normalized term is selected, while a pending custom tag must survive submit.
 page.locator('.tag-suggestions button').filter(has_text='Qualit').first.click()
 page.locator('#tag-input').fill('Interop clinique')
 page.locator('#f-budget_max').fill('1500.50')
 page.locator('#command-form button[type="submit"]').click()
 assert_write('save_need',lambda a:'Interop clinique' in a['tags'] and a['budget_max']==150050 and len(a['context'])>=50,'Create contextual need: selected/custom tags and exact cents')
 nav('needs');page.locator('[data-action="open-need"]').first.click();page.wait_for_timeout(130)
 page.locator('[data-action="view-response"]').first.click();page.wait_for_timeout(130)
 page.locator('[data-action="response-decision"][data-status="en_discussion"]').click();page.wait_for_timeout(80)
 # Decision optionally uses a confirmation form.
 if page.locator('#command-form[data-command="response_status"]').count():page.locator('#command-form button[type="submit"]').click()
 assert_write('response_status',lambda a:a['status']=='en_discussion','Startup gives suite using canonical server status')
 page.keyboard.press('Escape')
 nav('messages/00000000-0000-4000-8000-000000000200')
 page.locator('#message-form textarea').fill('Merci. Precisons le calendrier et les livrables ensemble.')
 page.locator('#message-form button[type="submit"]').click()
 assert_write('send_message',lambda a:a['id'].endswith('200') and 'calendrier' in a['body'],'Send message in existing dossier')
 nav('directory');page.locator('[data-action="directory-slots"]').first.click();page.wait_for_timeout(160)
 # Verify the actual RPC listing uses an identifier, never a provider name.
 assert 'target_company=00000000-0000-4000-8000-000000000002' in page.evaluate('location.hash'), 'Availability company UUID missing'
 report.append({'test':'Directory availability panel opens by company UUID','status':'passed'})
 browser.close()
(root/'docs/previews/interaction-test-results.json').write_text(json.dumps({'cases':report,'page_errors':errs,'transport':'mocked Supabase; no database test'},ensure_ascii=False,indent=2))
print('SUCCESS',len(report),'interaction tests')

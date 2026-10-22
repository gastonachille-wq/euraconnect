from pathlib import Path
import os, shutil
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parents[1]/'public'
html=(root/'index.html').read_text()
html=re.sub(r'<script\b[^>]*\bsrc\s*=.*?</script>','',html,flags=re.I|re.S)
html=re.sub(r'<link\s+[^>]*>','',html,flags=re.I)
html=html.replace('<head>','<head><base href="https://fake.crm.test/">',1)
uid='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';pid='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';aid='cccccccc-cccc-4ccc-cccc-cccccccccccc';prid='dddddddd-dddd-4ddd-dddd-dddddddddddd'
rows={
 'prospects':[{'id':uid,'nom_sponsor':'TEST Prospective Santé','statut':'2. À recontacter','date_maj':'2026-09-01','montant':15000,'referent':'Test','projet_cible':'Projet Démo','odj':'','commentaire':'Tester la recherche'}],
 'projets':[{'id':prid,'nom_projet':'Projet Démo','actif':True,'referent':'Test','priorite':'Haute'}],
 'sourcing':[], 'prospect_projets':[],
 'partenariats':[{'id':pid,'source_key':'test-sample','partenaire':'Partenaire Exemple','statut_convention':'active','date_fin':'2026-12-10','referent_interne':'Test'}],
 'engagements_partenariat':[],
 'actions_pilotage_partenariat':[{'id':aid,'source_key':'test-action','partenariat_id':pid,'titre':'Relancer la convention','echeance':'2026-10-20','statut':'a_faire','priorite':'haute','progression':0,'responsable':'Test'}],
 'realisations_engagement_partenariat':[],'referentiel_services_partenariats':[],
 'organisations':[], 'contacts_relation':[], 'rendez_vous':[], 'rdv_contacts':[]}
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CRM_TEST_CHROMIUM') or shutil.which('chromium'),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1366,'height':900})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.add_style_tag(content=(root/'styles.css').read_text())
 page.evaluate('''({data,config})=>{
 window.__mock={rows:data,writes:[]};
 const store=new Map(); const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>[...store.keys()][i]??null,get length(){return store.size}};
 Object.defineProperty(window,'localStorage',{configurable:true,value:storage});
 Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});
 const json=(x,status=200)=>Promise.resolve(new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}}));
 window.fetch=async (resource,options={})=>{
  const u=new URL(String(resource),'https://fake.crm.test/'),p=u.pathname,method=String(options.method||'GET').toUpperCase();
  if(p==='/config.json')return json(config);
  if(p.startsWith('/auth/v1/token'))return json({access_token:'test-access',refresh_token:'test-refresh',expires_at:1999999999,user:{id:'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',email:'tester@exemple.fr'}});
  if(p==='/auth/v1/user')return json({id:'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',email:'tester@exemple.fr'});
  if(p.startsWith('/rest/v1/')){
    const table=p.slice('/rest/v1/'.length),arr=window.__mock.rows[table]||[];
    if(method==='GET')return json(arr);
    if(method==='PATCH'){
      const id=u.searchParams.get('id')?.slice(3);
      const row=arr.find(r=>String(r.id)===id);
      if(!row)return json([]);
      const values=JSON.parse(String(options.body||'{}'));Object.assign(row,values);
      window.__mock.writes.push({table,method,id,values});return json([row]);
    }
    if(method==='POST'){const values=JSON.parse(String(options.body||'{}'));const row={id:'new-id',...values};arr.push(row);window.__mock.writes.push({table,method,values});return json([row],201);}
    if(method==='DELETE')return json([{}]);
  }
  if(p.startsWith('/templates/'))return Promise.resolve(new Response('template',{status:200}));
  return json({},404)
 };
}''', {'data':rows,'config':json.loads((root/'config.json').read_text())})
 # Inject in same order as actual html. Script executed synchronously.
 for name in ['ui_config.js','cloudflare-bridge.js','app.js']:
  page.add_script_tag(content=(root/name).read_text())
 page.locator('#loginEmail').fill('tester@exemple.fr')
 page.locator('#loginPassword').fill('TestPassword')
 page.locator('#loginBtn').click()
 page.wait_for_timeout(700)
 page.locator('#todayContent .today-col').first.wait_for(timeout=3000)
 assert page.locator('#todayContent .today-col').count()==5
 assert 'Relancer la convention' in page.locator('#todayContent').inner_text()
 assert page.locator('#todayContent [data-today-done]').count()==1
 assert page.locator('#kProspects').inner_text()=='1'
 page.locator('#todayContent [data-ui-action="partnership-detail"]').first.click()
 assert 'open' in page.locator('#drawer').get_attribute('class')
 assert 'Partenaire Exemple' in page.locator('#drawerTitle').inner_text()
 page.locator('#drawerClose').click()
 page.locator('button.kpi-link[data-section="prospects"]').first.click()
 assert 'active' in page.locator('#sec-prospects').get_attribute('class')
 page.locator('[data-prospectview="cards"]').click()
 assert page.locator('#prospectView [data-ui-action="prospect"]').count()==1
 page.locator('#prospectView [data-ui-action="prospect"]').click()
 assert 'open' in page.locator('#drawer').get_attribute('class')
 page.locator('#drawerClose').click()

 page.locator('#nav button[data-sec="dashboard"]').click()
 page.locator('button.kpi-link[data-section="pipeline"]').first.click()
 assert 'active' in page.locator('#sec-pipeline').get_attribute('class')
 assert page.locator('.pipeline-move select[data-ui-change="pipeline-move"]').count()==1
 page.locator('.pipeline-move select').select_option('3. Intéressé 2')
 page.wait_for_timeout(120)
 assert page.evaluate("window.__mock.rows.prospects[0].statut")== '3. Intéressé 2'
 page.locator('#nav button[data-sec="dashboard"]').click()
 page.locator('[data-today-done]').click()
 page.wait_for_timeout(120)
 assert page.evaluate("window.__mock.rows.actions_pilotage_partenariat[0].statut")== 'realise'
 page.screenshot(path=str(Path(__file__).resolve().parent/'cockpit_1366.png'),full_page=True)
 page.locator('#nav button[data-sec="partnerships"]').click()
 page.locator('[data-partview="tasks"]').click()
 assert page.locator('.part-task-card select[data-ui-change="action-status"]').count()==1
 page.set_viewport_size({'width':390,'height':844})
 page.locator('#nav button[data-sec="dashboard"]').click()
 page.screenshot(path=str(Path(__file__).resolve().parent/'cockpit_390.png'),full_page=True)
 assert not errors,errors
 print('PASS: 5 cockpit sections, KPI navigation, pipeline status PATCH, completed action PATCH, tasks Kanban, mobile render; writes=',page.evaluate('window.__mock.writes.length'))
 browser.close()

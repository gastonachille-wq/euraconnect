import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.document={addEventListener(){}};
const {navigationFor,activeNavigation,mobileNavigation}=await import('../dist/navigation.js');
const {filteredHash,clearFilterHash,stringList,stored}=await import('../dist/client-state.js');
const {shell}=await import('../dist/views.js');
const {demoBoot}=await import('../dist/demo.js');
const {labelChips}=await import('../dist/directory-v12.js');
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const role of ['incube','prestataire','startup_manager','admin']){
 test('V2.9 navigation is flat, named and complete for '+role,()=>{
  const items=navigationFor(role);assert.equal(new Set(items.map(x=>x.id)).size,items.length);
  const html=shell({boot:demoBoot(role),companyId:null,route:'directory',params:new URLSearchParams(),demo:true,page:0});
  const nav=html.split('aria-label="Navigation principale"')[1].split('</nav>')[0];
  assert.doesNotMatch(nav,/<details|<summary|Travailler/);
  assert.equal((nav.match(/ec29-nav-link/g)||[]).length,items.length);
  for(const item of items){assert.match(nav,new RegExp(`href="#${item.id}"`));assert.ok(item.symbol&&item.universe&&item.name);}
  assert.match(nav,/aria-current="page"/);
 });
}
test('V2.9 collapse control is in the footer, icon-only, and accessible',()=>{
 const html=shell({boot:demoBoot('incube'),companyId:null,route:'needs',params:new URLSearchParams(),page:0,demo:false});
 const footer=html.split('<footer class="ec29-sidebar-footer">')[1].split('</footer>')[0];
 assert.match(footer,/id="sidebar-toggle"/);assert.match(footer,/aria-controls="primary-sidebar"/);assert.match(footer,/<svg/);
 assert.doesNotMatch(footer,/>Reduire|>R\u00e9duire|>Agrandir/);assert.doesNotMatch(html,/company-context|ec24-nav-groups/);
});
test('V2.9 details keep the correct active navigation',()=>{
 assert.equal(activeNavigation('proposal','prestataire'),'needs');
 assert.equal(activeNavigation('needs','startup_manager'),'portfolio');
 assert.equal(activeNavigation('offers','incube'),'offers');
});
test('V2.9 manager mobile tabs lead to the portfolio, not provider opportunities',()=>{
 const items=mobileNavigation('startup_manager');assert.ok(items.some(x=>x.id==='portfolio'));assert.ok(!items.some(x=>x.id==='needs'));
});
test('V2.9 search and pagination preserve the selected conversation',()=>{
 assert.equal(filteredHash('#messages/thread-17?sort=recent&page=2',{q:'audit'}),'#messages/thread-17?sort=recent&q=audit');
 assert.equal(filteredHash('#directory?kind=person&view=table',{city:'Lille'}),'#directory?kind=person&view=table&city=Lille');
});
test('V2.9 reset keeps the selected tab and presentation but removes filters',()=>{
 assert.equal(clearFilterHash('#directory?kind=person&view=table&sort=name&q=abc&city=Lille'),'#directory?kind=person&view=table&sort=name');
 assert.equal(clearFilterHash('#messages/t-1?q=audit'),'#messages/t-1');
});
test('V2.9 invalid preference storage cannot crash app initialization',()=>{
 assert.deepEqual(stringList('missing'),[]);assert.equal(stored('missing'),null);
});
test('V2.9 compact company cards retain labels in accessible text without a tall badge stack',()=>{
 const html=labelChips({type:'prestataire',premium:true,labels:['pop','partenaire','intervenant_atelier']},true);
 assert.match(html,/Premium/);assert.match(html,/\+3 labels/);assert.match(html,/Prestataire POP/);
 assert.equal((html.match(/class="ec12-affiliation/g)||[]).length,2);
});
test('V2.9 manager invitation form belongs to the actual submit dispatcher',()=>{
 const app=read('src/app.ts');
 const allowed=app.match(/if \(!\[(.*?)\]\.includes\(form.id\)\)/s)?.[1];assert.ok(allowed?.includes('ec23-invite-form'));
 assert.match(app,/ends<=starts/);assert.match(app,/managerMeetingRpc\("invite"/);
});
test('V2.9 direct lifecycle RPCs use their actual endpoint names and payload',()=>{
 const api=read('src/api.ts'),app=read('src/app.ts');
 assert.match(api,/view: "ec22_view", archive: "ec22_archive", delete: "ec22_delete"/);
 assert.match(api,/const payload: Record<string, unknown> = \{ p_need: needId \}/);
 assert.match(app,/needLifecycleRpc\("archive", id\)/);
 assert.doesNotMatch(app,/rpc\("ec22_(?:archive|delete|view)"/);
});
test('V2.9 full package can test from a clean checkout without shipping dist',()=>{
 const pkg=JSON.parse(read('package.json'));assert.match(pkg.scripts.pretest,/npm run build/);
 assert.match(pkg.scripts.check,/npm test/);assert.equal(pkg.version,'3.6.1');
});
test('V2.9 cancellation sends the server enum, not a translated label',()=>{
 const app=read('src/app.ts');assert.doesNotMatch(app,/value=\\"annul\\u00E9/);
 assert.match(app,/value=\\"annule\\"/);
});

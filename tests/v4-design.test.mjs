import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.document={addEventListener(){}};
const {shell}=await import('../dist/views.js');
const {demoBoot}=await import('../dist/demo.js');
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V4: design layer is loaded after the preserved application layer',()=>{
 const html=read('public/index.html');
 assert.ok(html.indexOf('/interface.css')<html.indexOf('/euraconnect-v4.css'));
 assert.match(read('public/euraconnect-v4.css'),/prefers-reduced-motion:reduce/);
});
for(const role of ['incube','prestataire','startup_manager','admin']){
 test('V4: contextual quick-action is valid for '+role,()=>{
   const html=shell({boot:demoBoot(role),companyId:null,route:'dashboard',params:new URLSearchParams(),demo:true,page:0});
   assert.match(html,/ec40-quick-cta/);
   assert.equal((html.match(/ec40-quick-cta/g)||[]).length,1);
   assert.match(html,role==='incube'?/data-action="new-need"/:role==='prestataire'?/href="#needs">/:role==='startup_manager'?/href="#portfolio">/:/href="#admin\?tab=validate">/);
 });
}
test('V4: file manifest handles nested static directories and source remains configured',()=>{
 const build=read('scripts/build.mjs');
 assert.match(build,/async function listFiles\(directory/);
 assert.match(build,/entry\.isDirectory\(\)/);
 const manifest=JSON.parse(read('dist/manifest.json'));
 assert.ok(Object.keys(manifest.files).some(x=>x.startsWith('templates/')));
 assert.ok(Object.keys(manifest.files).some(x=>x.startsWith('data/')));
 assert.equal(manifest.version,'3.6.2');
});

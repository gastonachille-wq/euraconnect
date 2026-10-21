import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('V3.6.2: Netlify build refuses absent Supabase public configuration',()=>{
 const b=read('scripts/build.mjs');
 assert.match(b,/process\.env\.NETLIFY === 'true'/);
 assert.match(b,/if \(deployed && \(!url \|\| !key\)\)/);
});
test('V3.6.2: dedicated diagnostic page is bundled into dist',()=>{
 assert.ok(existsSync(new URL('../dist/diagnostic.html',import.meta.url)));
 assert.match(read('dist/diagnostic.html'),/diagnostic\.js/);
 assert.match(read('dist/diagnostic.js'),/ec20_manager_api/);
});
test('V3.6.2: diagnostic only exercises read-only APIs',()=>{
 const d=read('public/diagnostic.js');
 assert.match(d,/'bootstrap'/);
 assert.match(d,/role==='incube'\?'mine':'list'/);
 assert.doesNotMatch(d,/'recommend'|'create'|'ask'|'invite'/);
});
test('V3.6.2: diagnosis never copies API keys or access tokens',()=>{
 const d=read('public/diagnostic.js');
 assert.match(d,/host\|\|'ABSENT'/);
 assert.match(d,/\(valeur masquée\)/);
 assert.match(d,/jeton masqué/);
 assert.match(d,/report=lines\.join/);
 assert.doesNotMatch(d,/lines\.push\([^\n]*access_token/);
});
test('V3.6.2: authenticated RPC and SQL diagnostics are available',()=>{
 assert.match(read('supabase/11_DIAGNOSTIC_MANAGER_V362.sql'),/has_function_privilege/);
 assert.match(read('src/manager-diagnostics.ts'),/diagnostic\.html/);
});

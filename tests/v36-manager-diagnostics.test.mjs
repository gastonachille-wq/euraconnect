import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { managerErrorNotice } from '../dist/manager-diagnostics.js';
const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
test('Manager: a missing V20 RPC gives an actionable migration diagnostic',()=>{
 const html=managerErrorNotice({code:'PGRST202',status:404,message:'Could not find the function'},'recommendations');
 assert.match(html,/07_V20_MANAGER_RECOMMANDATIONS.sql/);
 assert.match(html,/reload schema/);
 assert.match(html,/Code : PGRST202/);
});
test('Manager: SQL permission error is NOT misreported as a missing migration',()=>{
 const html=managerErrorNotice({code:'42501',status:403,message:'Access denied'},'recommendations');
 assert.match(html,/Accès refusé/);
 assert.doesNotMatch(html,/migration 07_V20_MANAGER_RECOMMANDATIONS.sql/);
 assert.match(html,/EXECUTE/);
});
test('Manager: unexpected API error is not masked and is safely escaped',()=>{
 const html=managerErrorNotice({code:'XX000',status:500,message:'Internal <img src=x onerror=alert(1)>'},'recommendations');
 assert.match(html,/Code : XX000/);
 assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/<img/);
 assert.doesNotMatch(html,/migration 07_V20_MANAGER_RECOMMANDATIONS.sql/);
});
test('Manager: advice errors are independent from recommendation errors',()=>{
 const html=managerErrorNotice({code:'PGRST202',status:404,message:'Missing'},'advice');
 assert.match(html,/20261019173000_v35_manager_advice.sql/);
 assert.doesNotMatch(html,/07_V20_MANAGER_RECOMMANDATIONS.sql/);
 assert.match(app,/try \{ html\+=startupAdvice\(await managerAdviceRpc/);
 assert.match(app,/managerErrorNotice\(err,"recommendations"\)/);
});
test('Manager: missing table is distinguished from access/session errors',()=>{
 const html=managerErrorNotice({code:'42P01',status:400,message:'relation ec1.manager_recommendations does not exist'},'recommendations');
 assert.match(html,/table nécessaire est introuvable/);
 assert.match(managerErrorNotice({status:401,message:'token expired'},'recommendations'),/authentification Supabase/);
});

import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/app.ts'), manager=read('src/manager-v20.ts'), sql=read('supabase/07_V20_MANAGER_RECOMMANDATIONS.sql');
test('V2 manager: manager UI and follow-up are not mock buttons',()=>{assert.match(app,/managerCenter\(data,id,managerProviders,recs\)/);assert.match(manager,/data-action="task-toggle"/);assert.match(manager,/data-action="manager-open-recommend"/);});
test('V2 manager: recommendation reaches real server',()=>{assert.match(app,/managerRpc\("recommend"/);assert.match(sql,/ELSIF p_action='recommend' THEN/);assert.match(sql,/manager_recommendations/);});
test('V2 manager: incubated startup can request help securely',()=>{assert.match(app,/managerRpc\("ask"/);assert.match(sql,/ELSIF p_action='ask' THEN/);assert.match(sql,/ec1.member\(n.company_id\)/);assert.match(sql,/ec_manager_portefeuille/);});
test('V2 manager: permissions and anonymity stay server-side',()=>{assert.match(sql,/ec1.supervises\(n.company_id\)/);assert.match(sql,/organisation_id=a.organisation_id/);assert.match(sql,/REVOKE ALL ON FUNCTION public.ec20_manager_api/);assert.match(sql,/SET search_path=''/);});
test('V2 manager: recommendation notification and trace',()=>{assert.match(sql,/INSERT INTO ec1.notifications/);assert.match(sql,/ec1.audit\('need',n.id,'recommandation_manager'/);assert.match(app,/startupRecommendations\(recs\)/);});
test('V2 design: stylesheet is correctly loaded',()=>{assert.match(read('public/index.html'),/interface.css/);assert.match(read('public/interface.css'),/ec20-work-grid/);});

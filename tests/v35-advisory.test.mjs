import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('V3.5: manager advice is optional and cannot change request status',()=>{
 const sql=read('supabase/migrations/20261019173000_v35_manager_advice.sql');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS ec1\.manager_advice/);
 assert.match(sql,/ec1\.supervises\(n\.company_id\)/);
 assert.match(sql,/ec1\.member\(r\.startup_id\)/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.doesNotMatch(sql,/UPDATE\s+ec1\.needs|SET\s+status\s*=/i);
});
test('V3.5: advice UI clearly leaves decision to startup',()=>{
 const ui=read('src/manager-v20.ts');
 const app=read('src/app.ts');
 assert.match(ui,/Vous décidez seul de publier vos demandes/);
 assert.match(ui,/Donner un conseil/);
 assert.match(app,/managerAdviceRpc\("create"/);
 assert.match(app,/ec35-advice-form/);
});

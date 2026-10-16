import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
const sql=readFileSync(new URL('../supabase/09_V23_INVITATIONS_MANAGER.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/manager-v20.ts',import.meta.url),'utf8');
test('V2.3 invitation manager requires portfolio and active incubé membership',()=>{
 assert.match(sql,/ec1\.supervises\(sid\)/);
 assert.match(sql,/pm\.manager_id=a\.id/);
 assert.match(sql,/mem\.profile_id=recipient AND mem\.actif/);
 assert.match(sql,/pr\.role='incube'/);
});
test('V2.3 response is restricted to invitee and pending invitation',()=>{
 assert.match(sql,/meeting\.invitee_id<>a\.id/);
 assert.match(sql,/meeting\.status<>'pending'/);
 assert.match(sql,/FOR UPDATE/);
});
test('V2.3 startup manager invite and incubé accept or decline are wired',()=>{
 assert.match(ui,/data-action="manager-invite"/);
 assert.match(app,/case "manager-invite"/);
 assert.match(app,/case "manager-meeting-response"/);
 assert.match(app,/managerMeetingRpc\("invite"/);
 assert.match(app,/managerMeetingRpc\("respond"/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('manager needs restricted to selected startup',()=>assert.match(read('src/manager-v20.ts'),/n\.company_id===current\?\.id/));
test('manager remains advisory',()=>{const s=read('src/manager-v20.ts');assert.match(s,/la startup décide seule/);assert.doesNotMatch(s,/Co-valider la dépense/)});
test('directory displays honest availability and missing expertise',()=>{const s=read('src/directory-v12.ts');assert.match(s,/Aucun créneau annoncé/);assert.match(s,/Expertises non renseignées/)});
test('agenda list sorted by date',()=>assert.match(read('src/agenda-v12.ts'),/Date\.parse\(a\.starts_at\)-Date\.parse\(b\.starts_at\)/));

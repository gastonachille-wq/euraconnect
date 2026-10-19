import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.document={addEventListener(){}};
const {dashboardV3,messagesV3,profileV3,safeLinkedIn,minutesBetween}=await import('../dist/experience-v3.js');
const {daySegments,sessionClock,timedCalendar}=await import('../dist/agenda-v12.js');
const {demoBoot,demoRpc}=await import('../dist/demo.js');
const {shell,offerSummary,offersView}=await import('../dist/views.js');
const context=(role='incube',params='')=>({boot:demoBoot(role),companyId:demoBoot(role).memberships[0]?.id||null,route:'dashboard',params:new URLSearchParams(params),page:0,demo:true});
const sample=(id,start,end)=>({id,starts_at:start,ends_at:end,status:'ouvert',kind:'creneau',mode:'visio',title:'Session '+id,host_name:'Expert'});
test('V3: profile links reject script and deceptive domains',()=>{
 assert.equal(safeLinkedIn('javascript:alert(1)'),null);
 assert.equal(safeLinkedIn('https://linkedin.com.attacker.test/in/user'),null);
 assert.equal(safeLinkedIn('https://www.linkedin.com/in/user'),'https://www.linkedin.com/in/user');
});
test('V3: duration does not invent negative or invalid values',()=>{
 assert.equal(minutesBetween('invalid','invalid'),0);
 assert.equal(minutesBetween('2026-10-19T09:00:00Z','2026-10-19T10:00:00Z'),60);
});
test('V3: dashboard actions match the available data',()=>{
 const ctx=context(),d=demoRpc('dashboard',{},'incube');d.kpis.waiting=0;d.kpis.needs=4;
 let html=dashboardV3(ctx,d);assert.doesNotMatch(html,/Gardez le cap|VOTRE PROCHAINE ACTION/);assert.match(html,/Demandes en cours/);
 d.kpis.needs=0;html=dashboardV3(ctx,d);assert.match(html,/data-action="new-need"/);
 assert.doesNotMatch(html,/NaN|undefined/);
});
test('V3: four profile sections are deep-linkable, no invented membership',()=>{
 for(const tab of ['profile','company','team','security']){
  const html=profileV3(context('incube','tab='+tab),null);
  assert.match(html,new RegExp('href="#company\\?tab='+tab+'" aria-current="page"'));
  assert.doesNotMatch(html,/NaN|undefined/);
 }
});
test('V3: account logout is inside a named user menu',()=>{
 const html=shell(context());assert.match(html,/v3-account-menu/);assert.match(html,/data-action="logout-confirm"/);assert.doesNotMatch(html,/data-action="logout"/);
});
test('V3: empty conversations do not expose send controls',()=>{
 const html=messagesV3(context(),{items:[],total:0},null);
 assert.doesNotMatch(html,/id="message-form"/);assert.match(html,/Choisissez une conversation/);
});
test('V3: timeline positions time in Paris for summer and winter',()=>{
 assert.equal(sessionClock('2026-07-15T10:00:00Z'),720);
 assert.equal(sessionClock('2026-12-15T10:00:00Z'),660);
});
test('V3: overlapping time slots get separate lanes',()=>{
 const items=[sample('a','2026-10-19T08:00:00Z','2026-10-19T10:00:00Z'),sample('b','2026-10-19T09:00:00Z','2026-10-19T09:30:00Z'),sample('c','2026-10-19T11:00:00Z','2026-10-19T12:00:00Z')];
 const parts=daySegments(items,'2026-10-19');assert.equal(parts.length,3);assert.notEqual(parts[0].lane,parts[1].lane);assert.equal(parts[0].lanes,2);assert.equal(parts[2].lanes,1);
});
test('V3: overnight events split at local midnight without an extra day',()=>{
 const items=[sample('overnight','2026-10-19T21:30:00Z','2026-10-19T23:30:00Z')];
 assert.equal(daySegments(items,'2026-10-19')[0].end,1440);
 assert.equal(daySegments(items,'2026-10-20')[0].start,0);
 assert.equal(daySegments(items,'2026-10-21').length,0);
});
test('V3: timed calendar preserves the existing booking action',()=>{
 const html=timedCalendar([sample('slot-1','2026-10-19T08:00:00Z','2026-10-19T09:00:00Z')],['2026-10-19']);
 assert.match(html,/data-action="open-session"/);assert.match(html,/data-id="slot-1"/);assert.match(html,/--event-top:96px/);assert.doesNotMatch(html,/NaN/);
});
test('V3: incomplete service copy is neutral, never fabricates a discount or unit',()=>{
 const result=offerSummary('Lorem ipsum');assert.equal(result.incomplete,true);assert.match(result.text,/Consultez la fiche/);assert.doesNotMatch(result.text,/forfait|remise|%/);
 const html=offersView(context(),{items:[],total:0});assert.match(html,/Aucune offre/);
});
test('V3: configuration reads build variables and does not ship a secret',()=>{
 const build=fs.readFileSync('scripts/build.mjs','utf8');assert.match(build,/NEXT_PUBLIC_SUPABASE_URL/);assert.match(build,/NEXT_PUBLIC_SUPABASE_ANON_KEY/);assert.match(build,/3\.6\.0/);
});

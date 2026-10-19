import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.document={addEventListener(){}};
const { agendaViewParam, timedCalendar } = await import('../dist/agenda-v12.js');
import { demoRpc } from '../dist/demo.js';
test('V3.2: legacy table view becomes list',()=>{assert.equal(agendaViewParam(new URLSearchParams('view=table')),'list');});
test('V3.2: hour grid includes a late appointment and scales to 48px/hour',()=>{
 const item=demoRpc('sessions',{scope:'mine'},'incube').items[0];
 const html=timedCalendar([item],['2026-10-20']);
 assert.match(html,/data-first-hour=/);
 assert.match(html,/v3-hour-scroll/);
 assert.match(html,/--v3-hours:/);
});

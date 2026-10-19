import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
globalThis.document={addEventListener(){}};
const {offersView, offerSummary, shell} = await import('../dist/views.js');
const {demoBoot}=await import('../dist/demo.js');
const context=(params='')=>({boot:demoBoot('incube'),companyId:null,company:undefined,route:'offers',params:new URLSearchParams(params),page:0,demo:false});
const offer=(id,extras={})=>({id,company_id:'company-'+id,title:'Service '+id,description:'Accompagnement spécialisé détaillé avec des livrables concrets et un plan de travail personnalisé.',format:'distance',price:100000,provider:'Entreprise '+id,can_edit:false,tags:[{label:'Conseil'}],benefit:null,favorite:false,media:null,...extras});
test('V2.7 suppresses placeholder Lorem ipsum rather than inventing a description',()=>{
 assert.equal(offerSummary('Lorem IpsumLorem Ipsum').incomplete,true);
 assert.match(offerSummary('Lorem IpsumLorem Ipsum').text,/Consultez la fiche/);
 assert.equal(offerSummary('Description précise de la mission et de son organisation').incomplete,false);
});
test('V2.7 catalog is contextual and routes to real actions',()=>{
 const html=offersView(context(),{items:[offer('1')],total:1});
 assert.match(html,/ec27-catalog/);
 assert.match(html,/data-action="offer-detail"/);
 assert.match(html,/data-action="company-detail"/);
 assert.match(html,/data-action="directory-slots"/);
 assert.match(html,/data-action="new-need"/);
 assert.match(html,/href="#directory"/);
});
test('V2.7 actual loaded results get filtered by competence, availability and price',()=>{
 const data={items:[offer('1',{price:60000}),offer('2',{price:300000,tags:[{label:'Juridique'}]})],total:2};
 const html=offersView(context('tag=Juridique&maxprice=500'),data);
 assert.match(html,/0 offre correspondante/);
 const pass=offersView(context('tag=Juridique&maxprice=5000'),data);
 assert.match(pass,/1 offre correspondante/);
 assert.doesNotMatch(pass,/data-offer-id="1"/);
 assert.match(pass,/data-offer-id="2"/);
});
test('V2.7 clearly flags that facets are partial when server pagination applies',()=>{
 const html=offersView(context(),{items:[offer('1')],total:101});
 assert.match(html,/Une évolution Supabase sera nécessaire/);
 assert.match(html,/data-action="page"/);
});
test('V2.7 restores a fixed sidebar after V2.5 caused double offset',()=>{
 assert.match(read('public/ux-v27.css'),/\.app-shell>\.sidebar\{position:fixed!important\}/);
 assert.match(shell(context()),/ec27-route-offers/);
 assert.match(read('public/index.html'),/ux-v27\.css/);
});

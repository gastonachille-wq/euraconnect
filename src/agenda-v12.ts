import type { SessionItem, List } from './domain.js';
import { escapeHtml as e, label, dateText, timeText, localDate } from './domain.js';
import { icon } from './icons.js';
import { badge, button, iconButton, empty, pagination, tags } from './ui.js';
import type { Context } from './views.js';

export type AgendaView = 'day'|'week'|'month'|'list';
const isView = (s: string): s is AgendaView => ['day','week','month','list'].includes(s);
export function agendaViewParam(params: URLSearchParams): AgendaView {
    const query = params.get('view')||'';
    return (query==='table'?'list':isView(query)?query:null) || (typeof window !== 'undefined' && window.innerWidth<800?'list':'week');
}
function add(date:string, delta:number): string { const d = new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10); }
function monday(date:string):string {const d=new Date(date+'T12:00:00Z');return add(date,-((d.getUTCDay()+6)%7));}
function firstOfMonth(date:string):string{return date.slice(0,7)+'-01';}
function titleMonth(date:string):string{return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
export function agendaRange(params:URLSearchParams):{from:string,to:string,reference:string,days:string[],view:AgendaView} {
    const view=agendaViewParam(params);
    const input=params.get('from')||localDate();
    const reference=/^\d{4}-\d{2}-\d{2}$/.test(input)?input:localDate();
    const from=view==='day'?reference:view==='week'?monday(reference):view==='month'?monday(firstOfMonth(reference)):reference;
    const count=view==='day'?1:view==='week'?7:view==='month'?42:90;
    return {from,to:add(from,count),reference,view,days:Array.from({length:count},(_,i)=>add(from,i))};
}
export function shiftAgenda(params:URLSearchParams,direction:number):string{
    const {reference,view}=agendaRange(params);
    if(view==='month') {const d=new Date(firstOfMonth(reference)+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+direction);return d.toISOString().slice(0,10);}
    return add(reference,direction*(view==='day'?1:view==='week'?7:30));
}
function option(value:string|undefined, title:string|undefined,selected:string):string{return `<option value="${e(value||'')}" ${selected===value?'selected':''}>${e(title||'')}</option>`;}
const dayLong = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'});
function shortDay(date:string):string{return dayLong.format(new Date(date+'T12:00:00Z'));}
function modeLabel(s:SessionItem):string{return `${icon(s.mode==='visio'?'video':s.mode==='sur_site'?'location':'clock',14)} ${e(label(s.mode))}`;}
function statusText(s:SessionItem):string{
    if(s.status==='annule')return 'Annulé';
    if(s.registration==='confirme')return 'Confirmé';
    if(s.kind==='proposition'&&s.can_reply)return 'Votre réponse attendue';
    return label(s.kind);
}
function eventCard(s:SessionItem):string{
    return `<button class="ec12-event-card ec12-event-${e(s.kind)} ${s.can_reply?'needs-action':''}" data-action="open-session" data-id="${e(s.id)}"><span class="ec12-event-time">${timeText(s.starts_at)}–${timeText(s.ends_at)}</span><strong>${e(s.title)}</strong><small>${e(s.host_name)}</small>${s.can_reply?'<span class="ec12-pending">À confirmer</span>':''}</button>`;
}
function row(s:SessionItem):string{
    return `<button class="ec12-agenda-list-row" data-action="open-session" data-id="${e(s.id)}"><span class="ec12-date-tile"><strong>${new Intl.DateTimeFormat('fr-FR',{day:'2-digit',timeZone:'Europe/Paris'}).format(new Date(s.starts_at))}</strong><small>${new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'Europe/Paris'}).format(new Date(s.starts_at))}</small></span><span class="ec12-agenda-info"><strong>${e(s.title)}</strong><small>${timeText(s.starts_at)}–${timeText(s.ends_at)} · ${e(s.host_name)}${s.company_name?' · '+e(s.company_name):''}</small>${tags((s.tags||[]).slice(0,3))}</span><span class="ec12-agenda-facts">${modeLabel(s)}<span>${badge(s.registration||s.kind)}</span></span>${icon('arrow',17)}</button>`;
}
function proposalStrip(items:SessionItem[]):string{
    const active=items.filter(s=>s.kind==='proposition'&&s.can_reply&&s.status==='ouvert'&&new Date(s.starts_at)>new Date());
    if(!active.length)return '';
    return `<section class="ec12-proposal-inbox" aria-label="Créneaux proposés à confirmer"><div class="ec12-proposal-intro"><span class="ec12-pulse-icon">${icon('calendar',21)}</span><div><p class="eyebrow">VOTRE RÉPONSE ATTENDUE</p><h2>${active.length} proposition${active.length>1?'s':''} de créneau à examiner</h2><p>Les rendez-vous proposés sont visibles ici même s'ils se trouvent hors de la semaine affichée.</p></div></div><div class="ec12-proposal-items">${active.slice(0,4).map(s=>`<div class="ec12-proposal-item"><strong>${e(s.title)}</strong><span>${dateText(s.starts_at,true)} · ${e(s.host_name)}</span>${button('Consulter / répondre','open-session',{id:s.id,class:'small primary'})}</div>`).join('')}</div></section>`;
}

/** Place visible sessions on an hour grid in Europe/Paris. Does not change bookings. */
export function sessionClock(instant:string):number {
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
 return Number(parts.find(p=>p.type==='hour')?.value||0)*60+Number(parts.find(p=>p.type==='minute')?.value||0);
}
export interface TimedSegment { session:SessionItem;start:number;end:number;lane:number;lanes:number; }
export function daySegments(items:SessionItem[],date:string):TimedSegment[] {
 const intervals=items.filter(s=>s.status!=='annule'&&Number.isFinite(Date.parse(s.starts_at))&&Number.isFinite(Date.parse(s.ends_at))&&Date.parse(s.ends_at)>Date.parse(s.starts_at)).map(session=>{
  const startDate=localDate(new Date(session.starts_at)),endDate=localDate(new Date(session.ends_at));
  const start=startDate===date?sessionClock(session.starts_at):0;
  const end=endDate===date?sessionClock(session.ends_at):1440;
  return {session,start,end,lane:0,lanes:1,startDate,endDate};
 }).filter(i=>i.startDate<=date && i.endDate>=date && i.end>i.start).sort((a,b)=>a.start-b.start||b.end-a.end);
 let group:TimedSegment[]=[];let limit=-1;let laneEnds:number[]=[];
 const flush=()=>{for(const i of group)i.lanes=laneEnds.length;group=[];laneEnds=[];};
 for(const interval of intervals){
  if(interval.start>=limit){flush();limit=-1;}
  let lane=laneEnds.findIndex(end=>end<=interval.start);
  if(lane<0)lane=laneEnds.length;
  laneEnds[lane]=interval.end;interval.lane=lane;group.push(interval);limit=Math.max(limit,interval.end);
 }
 flush();return intervals;
}
export function timedCalendar(items:SessionItem[],days:string[]):string {
 const dayData=days.map(date=>({date,items:daySegments(items,date)}));
 const segments=dayData.flatMap(d=>d.items);
 const first=Math.min(8,...segments.map(i=>Math.floor(i.start/60))),last=Math.max(20,...segments.map(i=>Math.ceil(i.end/60)));
 const hours=last-first;
 const ruler=Array.from({length:hours},(_,i)=>`<span style="top:${i*48}px">${String(first+i).padStart(2,'0')}:00</span>`).join('');
 const grid=`<div class="v3-hour-scroll" data-first-event="${segments.length?Math.min(...segments.map(i=>i.start)):480}" data-first-hour="${first}" tabindex="0" aria-label="Calendrier horaire, d\u00e9filement horizontal et vertical"><div class="v3-hour-grid ${days.length===1?'is-day':''}" style="--v3-days:${days.length};--v3-hours:${hours}"><div class="v3-hour-head" aria-hidden="true">Paris</div>${days.map(date=>`<div class="v3-hour-head ${date===localDate()?'today':''}">${e(shortDay(date))}</div>`).join('')}<div class="v3-hour-ruler" aria-hidden="true">${ruler}</div>${dayData.map(day=>`<div class="v3-hour-day ${day.date===localDate()?'today':''}" aria-label="${e(shortDay(day.date))}">${day.items.map(i=>`<div class="v3-timed-event" style="--event-top:${(i.start-first*60)*.8}px;--event-height:${Math.max(24,(i.end-i.start)*.8)}px;--event-left:${100*i.lane/i.lanes}%;--event-width:${100/i.lanes}%" title="${e(i.session.title)} \u00b7 ${timeText(i.session.starts_at)}\u2013${timeText(i.session.ends_at)}">${eventCard(i.session)}</div>`).join('')}</div>`).join('')}</div></div>`;
 return `<div class="v3-timeline-legend"><span>${icon('clock',15)} Disponibilit\u00e9</span><span>${icon('calendar',15)} Rendez-vous</span><span>${icon('messages',15)} Proposition</span><span>${icon('workshop',15)} Atelier</span></div>`+grid;
}
export function sessionsViewV12(ctx:Context,data:List<SessionItem>,workshops=false,proposals:SessionItem[]=[]):string{
    const scope=ctx.params.get('scope')||'mine';
    const view=agendaViewParam(ctx.params);
    const range=agendaRange(ctx.params);
    const canCreate=['prestataire','startup_manager','admin'].includes(ctx.boot.user.role);
    const title=workshops?'Ateliers et rencontres':scope==='mine'?'Mon agenda':'Disponibilités du réseau';
    const action=canCreate?button(workshops?'Proposer un atelier':'Publier mes disponibilités','new-session',{icon:'plus',class:'primary',extra:`data-kind="${workshops?'atelier':'creneau'}"`}):button('Explorer les disponibilités','agenda-scope',{icon:'search',class:'primary',extra:'data-scope="all"'});
    let html=`<div class="page-head ec12-agenda-head"><div><p class="eyebrow">${workshops?'PROGRAMMATION':'AGENDA & DISPONIBILITÉS'}</p><h1>${title}</h1><p>${workshops?'Des ateliers collectifs organisés par les prestataires et les équipes d’accompagnement.':'Retrouvez vos rendez-vous, les créneaux proposés et les disponibilités du réseau.'}</p></div><div class="page-actions">${action}</div></div>`;
    if(workshops){html+=`<div class="ec12-workshops-grid">${data.items.filter(s=>s.status!=='annule').map(s=>`<article class="ec12-workshop-card"><div class="ec12-workshop-top"><span>${icon('workshop',24)} Atelier</span><time>${dateText(s.starts_at,true)}</time></div><h3>${e(s.title)}</h3><p>${e(s.description.slice(0,180))}</p><div class="ec12-workshop-meta"><span>${icon('user',15)} ${e(s.host_name)}</span><span>${modeLabel(s)}</span><span>${s.occupied}/${s.capacity} places</span></div>${tags((s.tags||[]).slice(0,4))}${button('Voir l’atelier et m’inscrire','open-session',{id:s.id,class:'primary full',icon:'arrow'})}</article>`).join('')}</div>${data.total>data.items.length?pagination(data.total,ctx.page,100):''}`;return html;}
    html+=proposalStrip(proposals);
    html+=`<div class="ec12-agenda-controls" aria-label="Navigation dans l’agenda"><div class="ec12-scope-tabs" role="group" aria-label="Périmètre de l’agenda">${[['mine','Mes rendez-vous'],['all','Créneaux disponibles']].map(([val,text])=>button(text||'','agenda-scope',{class:scope===val?'selected':'',extra:`data-scope="${val}"`})).join('')}</div><div class="ec12-view-tabs" role="group" aria-label="Modes d’affichage">${[['day','Jour'],['week','Semaine'],['month','Mois'],['list','Liste']].map(([v,text])=>button(text||'','agenda-view',{class:view===v?'selected':'',extra:`data-view="${v}"`})).join('')}</div></div>`;
    const mode=ctx.params.get('mode')||''; const kind=ctx.params.get('kind')||''; const sort=ctx.params.get('sort')||'date';
    const types=[['','Tous les rendez-vous'],['creneau','Créneau individuel'],['permanence','Permanence'],['proposition','Créneau proposé'],['atelier','Atelier']];
    const tagsAvail=[...new Set(data.items.flatMap(s=>(s.tags||[]).map(t=>t.label)))].sort((a,b)=>a.localeCompare(b,'fr'));
    html+=`<details class="v3-agenda-filters" ${['q','expertise','mode','kind'].some(key=>ctx.params.get(key))?'open':''}><summary>${icon('filter',17)} Filtres${['q','expertise','mode','kind'].filter(key=>ctx.params.get(key)).length?` · ${['q','expertise','mode','kind'].filter(key=>ctx.params.get(key)).length}`:''}</summary><form id="filter-form" class="ec12-agenda-filters"><input type="hidden" name="scope" value="${e(scope)}"><input type="hidden" name="view" value="${e(view)}">
    <label class="ec12-wide">${icon('search',16)}<span>Recherche</span><input name="q" value="${e(ctx.params.get('q')||'')}" placeholder="Intervenant ou objet du RDV"></label>
    <label>Expertise<input list="ec12-expertise" name="expertise" value="${e(ctx.params.get('expertise')||'')}" placeholder="Expertise, mot-clé…"><datalist id="ec12-expertise">${tagsAvail.map(x=>`<option value="${e(x)}"></option>`).join('')}</datalist></label>
    <label>Type de rendez-vous<select name="kind">${types.map(([v,t])=>option(v,t,kind)).join('')}</select></label>
    <label>Modalité<select name="mode">${option('','Toutes',mode)}${[['visio','Visioconférence'],['sur_site','Sur place'],['telephone','Téléphone']].map(([v,t])=>option(v,t,mode)).join('')}</select></label>
    <label>À partir du<input type="date" name="from" value="${e(range.reference)}"></label>
    <label>Tri<select name="sort">${[['date','Date / heure'],['host','Intervenant'],['kind','Type'],['mode','Modalité']].map(([v,t])=>option(v,t,sort)).join('')}</select></label>
    <button type="submit" class="btn primary">${icon('search',16)} Rechercher</button>${ctx.params.size?button('Effacer les filtres','agenda-clear',{class:'ghost small'}):''}</form></details>`;
    html+=`<div class="ec12-agenda-strip"><div class="ec12-agenda-range">${iconButton('back','Période précédente','agenda-step','','data-direction="-1"')}${button('Aujourd’hui','agenda-today',{class:'small ghost'})}${iconButton('arrow','Période suivante','agenda-step','','data-direction="1"')}<strong>${view==='month'?titleMonth(range.reference):view==='day'?shortDay(range.reference):dateText(range.from)+' → '+dateText(add(range.to,-1))}</strong></div><div><strong>${data.total}</strong> résultat${data.total>1?'s':''}<span class="ec12-timezone"> · Horaires Europe/Paris</span></div></div>`;
    if(!data.items.length)html+=empty('Aucun créneau ne correspond à vos critères','Essayez un autre type de rencontre, une période plus large ou les disponibilités du réseau.',canCreate?button('Publier un créneau','new-session',{class:'primary',extra:'data-kind="creneau"'}):'','calendar');
    else if(view==='week'||view==='day')html+=timedCalendar(data.items,range.days);
    else if(view==='month')html+=`<section class="ec12-month-calendar" aria-label="Vue mensuelle"><div class="ec12-month-days">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(x=>`<strong>${x}</strong>`).join('')}</div><div class="ec12-month-grid">${range.days.map(date=>{const events=data.items.filter(s=>localDate(new Date(s.starts_at))===date&&s.status!=='annule');return `<div class="ec12-month-day ${date.slice(0,7)===range.reference.slice(0,7)?'':'outside'} ${date===localDate()?'today':''}"><div class="ec12-month-date">${Number(date.slice(-2))}</div>${events.slice(0,3).map(s=>`<button data-action="open-session" data-id="${e(s.id)}" class="ec12-month-event ${s.kind==='proposition'?'is-proposal':''}">${timeText(s.starts_at)} ${e(s.title)}</button>`).join('')}${events.length>3?`<span class="ec12-more">+${events.length-3} autres rendez-vous</span>`:''}</div>`;}).join('')}</div></section>`;
    else if(false)html+=`<div class="table-wrap ec12-agenda-table"><table><thead><tr><th>Date</th><th>Heure</th><th>Rencontre</th><th>Intervenant</th><th>Type</th><th>Modalité</th><th>Statut</th><th>Action</th></tr></thead><tbody>${data.items.map(s=>`<tr><td>${dateText(s.starts_at)}</td><td>${timeText(s.starts_at)}–${timeText(s.ends_at)}</td><td><strong>${e(s.title)}</strong><small>${tags((s.tags||[]).slice(0,2))}</small></td><td>${e(s.host_name)}</td><td>${badge(s.kind)}</td><td>${modeLabel(s)}</td><td>${e(statusText(s))}</td><td>${button(s.can_reply?'Répondre':'Détails','open-session',{id:s.id,class:'small '+(s.can_reply?'primary':'ghost')})}</td></tr>`).join('')}</tbody></table></div>`;
    else html+=`<div class="ec12-agenda-list" aria-label="Rendez-vous classés par date">${[...data.items].sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)).map(row).join('')}</div>`;
    if(data.total>data.items.length)html+=pagination(data.total,ctx.page,100);
    return html;
}
export function conversationProposals(items:SessionItem[],threadId:string):string{
    if(!items.length)return `<div class="ec12-thread-appointments"><div class="section-heading"><h3>${icon('calendar',18)} Rendez-vous proposés</h3></div><p class="muted">Aucun créneau proposé dans ce dossier pour le moment.</p>${button('Proposer une date','propose',{id:threadId,icon:'plus',class:'small'})}</div>`;
    return `<div class="ec12-thread-appointments"><div class="section-heading"><div><h3>${icon('calendar',18)} Créneaux proposés</h3><p>Chaque proposition reste accessible depuis cette conversation, même en dehors de la semaine affichée.</p></div>${button('Autre créneau','propose',{id:threadId,icon:'plus',class:'small'})}</div><div class="ec12-thread-slots">${items.map(s=>`<article class="ec12-thread-slot ${s.can_reply&&s.status==='ouvert'?'action-required':''}"><div><strong>${dateText(s.starts_at,true)}</strong><small>${timeText(s.starts_at)}–${timeText(s.ends_at)} · ${e(label(s.mode))} · ${e(s.host_name)}</small></div><div>${badge(s.status==='annule'?'annule':s.registration||s.kind)}${button(s.can_reply&&s.status==='ouvert'?'Accepter / refuser':'Voir le créneau','open-session',{id:s.id,class:'small '+(s.can_reply&&s.status==='ouvert'?'primary':'ghost')})}</div></article>`).join('')}</div></div>`;
}

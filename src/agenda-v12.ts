import type { SessionItem, List } from './domain.js';
import { escapeHtml as e, label, dateText, timeText, localDate } from './domain.js';
import { icon } from './icons.js';
import { badge, button, iconButton, empty, pagination, tags } from './ui.js';
import type { Context } from './views.js';

export type AgendaView = 'day'|'week'|'month'|'list'|'table';
const isView = (s: string): s is AgendaView => ['day','week','month','list','table'].includes(s);
export function agendaViewParam(params: URLSearchParams): AgendaView {
    const query = params.get('view')||'';
    return isView(query) ? query : (typeof window !== 'undefined' && window.innerWidth<800?'list':'week');
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
export function sessionsViewV12(ctx:Context,data:List<SessionItem>,workshops=false,proposals:SessionItem[]=[]):string{
    const scope=ctx.params.get('scope')||'mine';
    const view=agendaViewParam(ctx.params);
    const range=agendaRange(ctx.params);
    const canCreate=['prestataire','startup_manager','admin'].includes(ctx.boot.user.role);
    const title=workshops?'Ateliers et rencontres':'Trouver un rendez-vous';
    const action=canCreate?button(workshops?'Proposer un atelier':'Publier mes disponibilités','new-session',{icon:'plus',class:'primary',extra:`data-kind="${workshops?'atelier':'creneau'}"`}):button('Explorer les disponibilités','agenda-scope',{icon:'search',class:'primary',extra:'data-scope="all"'});
    let html=`<div class="page-head ec12-agenda-head"><div><p class="eyebrow">${workshops?'PROGRAMMATION':'AGENDA & DISPONIBILITÉS'}</p><h1>${title}</h1><p>${workshops?'Des ateliers collectifs organisés par les prestataires et les équipes d’accompagnement.':'Explorez par expertise, modalité ou type de rencontre. Basculez entre calendrier et résultats détaillés.'}</p></div><div class="page-actions">${action}</div></div>`;
    if(workshops){html+=`<div class="ec12-workshops-grid">${data.items.filter(s=>s.status!=='annule').map(s=>`<article class="ec12-workshop-card"><div class="ec12-workshop-top"><span>${icon('workshop',24)} Atelier</span><time>${dateText(s.starts_at,true)}</time></div><h3>${e(s.title)}</h3><p>${e(s.description.slice(0,180))}</p><div class="ec12-workshop-meta"><span>${icon('user',15)} ${e(s.host_name)}</span><span>${modeLabel(s)}</span><span>${s.occupied}/${s.capacity} places</span></div>${tags((s.tags||[]).slice(0,4))}${button('Voir l’atelier et m’inscrire','open-session',{id:s.id,class:'primary full',icon:'arrow'})}</article>`).join('')}</div>${data.total>data.items.length?pagination(data.total,ctx.page,100):''}`;return html;}
    html+=proposalStrip(proposals);
    html+=`<div class="ec12-agenda-controls"><div class="ec12-scope-tabs">${[['mine','Mes rendez-vous'],['all','Toutes les disponibilités']].map(([val,text])=>button(text||'','agenda-scope',{class:scope===val?'selected':'',extra:`data-scope="${val}"`})).join('')}</div><div class="ec12-view-tabs" role="group" aria-label="Modes d’affichage">${[['day','Jour'],['week','Semaine'],['month','Mois'],['list','Liste'],['table','Tableau']].map(([v,text])=>button(text||'','agenda-view',{class:view===v?'selected':'',extra:`data-view="${v}"`})).join('')}</div></div>`;
    const mode=ctx.params.get('mode')||''; const kind=ctx.params.get('kind')||''; const sort=ctx.params.get('sort')||'date';
    const types=[['','Tous les rendez-vous'],['creneau','Créneau individuel'],['permanence','Permanence'],['proposition','Créneau proposé'],['atelier','Atelier']];
    const tagsAvail=[...new Set(data.items.flatMap(s=>(s.tags||[]).map(t=>t.label)))].sort((a,b)=>a.localeCompare(b,'fr'));
    html+=`<form id="filter-form" class="ec12-agenda-filters"><input type="hidden" name="scope" value="${e(scope)}"><input type="hidden" name="view" value="${e(view)}">
    <label class="ec12-wide">${icon('search',16)}<span>Recherche</span><input name="q" value="${e(ctx.params.get('q')||'')}" placeholder="Intervenant ou objet du RDV"></label>
    <label>Expertise<input list="ec12-expertise" name="expertise" value="${e(ctx.params.get('expertise')||'')}" placeholder="Expertise, mot-clé…"><datalist id="ec12-expertise">${tagsAvail.map(x=>`<option value="${e(x)}"></option>`).join('')}</datalist></label>
    <label>Type de rendez-vous<select name="kind">${types.map(([v,t])=>option(v,t,kind)).join('')}</select></label>
    <label>Modalité<select name="mode">${option('','Toutes',mode)}${[['visio','Visioconférence'],['sur_site','Sur place'],['telephone','Téléphone']].map(([v,t])=>option(v,t,mode)).join('')}</select></label>
    <label>À partir du<input type="date" name="from" value="${e(range.reference)}"></label>
    <label>Tri<select name="sort">${[['date','Date / heure'],['host','Intervenant'],['kind','Type'],['mode','Modalité']].map(([v,t])=>option(v,t,sort)).join('')}</select></label>
    <button type="submit" class="btn primary">${icon('search',16)} Rechercher</button>${ctx.params.size?button('Effacer les filtres','agenda-clear',{class:'ghost small'}):''}</form>`;
    html+=`<div class="ec12-agenda-strip"><div class="ec12-agenda-range">${iconButton('back','Période précédente','agenda-step','','data-direction="-1"')}${button('Aujourd’hui','agenda-today',{class:'small ghost'})}${iconButton('arrow','Période suivante','agenda-step','','data-direction="1"')}<strong>${view==='month'?titleMonth(range.reference):view==='day'?shortDay(range.reference):dateText(range.from)+' → '+dateText(add(range.to,-1))}</strong></div><div><strong>${data.total}</strong> résultat${data.total>1?'s':''}<span class="ec12-timezone"> · Horaires Europe/Paris</span></div></div>`;
    if(!data.items.length)html+=empty('Aucun créneau ne correspond à vos critères','Essayez un autre type de rencontre, une période plus large ou les disponibilités du réseau.',canCreate?button('Publier un créneau','new-session',{class:'primary',extra:'data-kind="creneau"'}):'','calendar');
    else if(view==='week'||view==='day')html+=`<section class="ec12-calendar-week ${view==='day'?'is-day':''}" aria-label="Vue ${view==='day'?'jour':'semaine'}">${range.days.map(date=>`<div class="ec12-calendar-column ${date===localDate()?'today':''}"><div class="ec12-calendar-day"><strong>${shortDay(date)}</strong>${date===localDate()?'<small>Aujourd’hui</small>':''}</div><div class="ec12-calendar-events">${data.items.filter(s=>localDate(new Date(s.starts_at))===date&&s.status!=='annule').map(eventCard).join('')||'<span class="ec12-calendar-blank">Pas de créneau</span>'}</div></div>`).join('')}</section>`;
    else if(view==='month')html+=`<section class="ec12-month-calendar" aria-label="Vue mensuelle"><div class="ec12-month-days">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(x=>`<strong>${x}</strong>`).join('')}</div><div class="ec12-month-grid">${range.days.map(date=>{const events=data.items.filter(s=>localDate(new Date(s.starts_at))===date&&s.status!=='annule');return `<div class="ec12-month-day ${date.slice(0,7)===range.reference.slice(0,7)?'':'outside'} ${date===localDate()?'today':''}"><div class="ec12-month-date">${Number(date.slice(-2))}</div>${events.slice(0,3).map(s=>`<button data-action="open-session" data-id="${e(s.id)}" class="ec12-month-event ${s.kind==='proposition'?'is-proposal':''}">${timeText(s.starts_at)} ${e(s.title)}</button>`).join('')}${events.length>3?`<span class="ec12-more">+${events.length-3} autre(s)</span>`:''}</div>`;}).join('')}</div></section>`;
    else if(view==='table')html+=`<div class="table-wrap ec12-agenda-table"><table><thead><tr><th>Date</th><th>Heure</th><th>Rencontre</th><th>Intervenant</th><th>Type</th><th>Modalité</th><th>Statut</th><th>Action</th></tr></thead><tbody>${data.items.map(s=>`<tr><td>${dateText(s.starts_at)}</td><td>${timeText(s.starts_at)}–${timeText(s.ends_at)}</td><td><strong>${e(s.title)}</strong><small>${tags((s.tags||[]).slice(0,2))}</small></td><td>${e(s.host_name)}</td><td>${badge(s.kind)}</td><td>${modeLabel(s)}</td><td>${e(statusText(s))}</td><td>${button(s.can_reply?'Répondre':'Détails','open-session',{id:s.id,class:'small '+(s.can_reply?'primary':'ghost')})}</td></tr>`).join('')}</tbody></table></div>`;
    else html+=`<div class="ec12-agenda-list">${data.items.map(row).join('')}</div>`;
    if(data.total>data.items.length)html+=pagination(data.total,ctx.page,100);
    return html;
}
export function conversationProposals(items:SessionItem[],threadId:string):string{
    if(!items.length)return `<div class="ec12-thread-appointments"><div class="section-heading"><h3>${icon('calendar',18)} Rendez-vous proposés</h3></div><p class="muted">Aucun créneau proposé dans ce dossier pour le moment.</p>${button('Proposer une date','propose',{id:threadId,icon:'plus',class:'small'})}</div>`;
    return `<div class="ec12-thread-appointments"><div class="section-heading"><div><h3>${icon('calendar',18)} Créneaux proposés</h3><p>Chaque proposition reste accessible depuis cette conversation, même en dehors de la semaine affichée.</p></div>${button('Autre créneau','propose',{id:threadId,icon:'plus',class:'small'})}</div><div class="ec12-thread-slots">${items.map(s=>`<article class="ec12-thread-slot ${s.can_reply&&s.status==='ouvert'?'action-required':''}"><div><strong>${dateText(s.starts_at,true)}</strong><small>${timeText(s.starts_at)}–${timeText(s.ends_at)} · ${e(label(s.mode))} · ${e(s.host_name)}</small></div><div>${badge(s.status==='annule'?'annule':s.registration||s.kind)}${button(s.can_reply&&s.status==='ouvert'?'Accepter / refuser':'Voir le créneau','open-session',{id:s.id,class:'small '+(s.can_reply&&s.status==='ouvert'?'primary':'ghost')})}</div></article>`).join('')}</div></div>`;
}

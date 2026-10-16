import type { DirectoryItem, List, CompanyDetail, Offer } from './domain.js';
import { escapeHtml as e, label, dateText, markdown, money } from './domain.js';
import { icon } from './icons.js';
import { avatar, tags, favorite, button, empty, pagination } from './ui.js';
import type { Context } from './views.js';

export const companyLabels: Record<string, string> = {
    partenaire: 'Partenaire du réseau',
    institutionnel: 'Institutionnel',
    pop: 'Prestataire POP',
    intervenant_atelier: 'Intervenant atelier'
};

export function labelChips(d: Pick<DirectoryItem, 'type' | 'premium' | 'labels'>): string {
    const values = [...new Set(d.labels || [])];
    const chips = [`<span class="ec12-type-pill">${e(label(d.type))}</span>`];
    if (d.premium) chips.push(`<span class="ec12-affiliation premium">${icon('shield', 13)} Partenaire Premium</span>`);
    for (const item of values) if (companyLabels[item]) chips.push(`<span class="ec12-affiliation ${e(item)}">${icon(item === 'intervenant_atelier' ? 'workshop' : item === 'institutionnel' ? 'company' : 'check', 13)}${e(companyLabels[item])}</span>`);
    return `<div class="ec12-labels">${chips.join('')}</div>`;
}
function option(value: string|undefined, text: string|undefined, selected: string): string { return `<option value="${e(value||'')}" ${selected === value ? 'selected' : ''}>${e(text||'')}</option>`; }
const presets = [
    ['partenaire','Partenaire'], ['premium','Premium'], ['institutionnel','Institutionnel'], ['pop','Prestataire POP'], ['intervenant_atelier','Intervenant atelier']
] as const;

export function directoryViewV12(ctx: Context, data: List<DirectoryItem>): string {
    const kind = ctx.params.get('kind') === 'person' ? 'person' : 'company';
    const layout = ['compact','detail','table'].includes(ctx.params.get('view') || '') ? ctx.params.get('view')! : 'compact';
    const type = ctx.params.get('type') || '';
    const tag = ctx.params.get('tag') || '';
    const activeLabel = ctx.params.get('label') || '';
    const premium = ctx.params.get('premium') || '';
    const sort = ctx.params.get('sort') || 'name';
    const items = data.items.filter(x => x.kind === kind);
    const actions = button('Mon profil', 'go', {extra:'data-route="company"',icon:'user',class:'ghost'});
    const title = kind === 'company' ? 'Explorer les entreprises' : 'Retrouver un contact';
    const description = kind === 'company' ? 'Chaque entreprise possède sa fiche, ses expertises et ses membres. Les contacts sont regroupés dans un onglet distinct.' : 'Les contacts sont rattachés à une entreprise et leurs informations respectent les règles de confidentialité.';
    const typeOptions = kind === 'company' ? [['startup','Startup incubée'],['prestataire','Prestataire'],['autre','Autre organisation']] : [['incube','Incubé'],['prestataire','Prestataire'],['startup_manager','Startup Manager'],['admin','Administrateur']];
    const filterCount = ['q','type','tag','city','label','premium','favorites'].filter(k=>Boolean(ctx.params.get(k))).length;
    const skills = [...new Set(items.flatMap(d=>d.tags.map(t=>t.label)))].sort((a,b)=>a.localeCompare(b,'fr')).slice(0,80);
    const cities = [...new Set(items.map(d=>d.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')).slice(0,80);
    let html = `<div class="page-head ec12-dir-head"><div><p class="eyebrow">ANNUAIRE DU RÉSEAU</p><h1>${title}</h1><p>${description}</p></div><div class="page-actions">${actions}</div></div>`;
    html += `<div class="ec12-directory-tabs" role="group" aria-label="Explorer l'annuaire">${[['company','Entreprises', 'company'],['person','Contacts','people']].map(([value,text,symbol])=>button(text||'','directory-kind',{class:'ec12-tab '+(kind===value?'selected':''),icon:symbol||'company',extra:`data-kind="${value}"`})).join('')}<span class="ec12-directory-count">${data.total} résultat${data.total>1?'s':''}</span></div>`;
    html += `<div class="ec12-dir-layout"><aside class="ec12-facets"><div class="ec12-facet-head"><strong>${icon('search',17)} Affiner les résultats</strong>${filterCount ? button('Effacer ('+filterCount+')','clear-filters',{class:'small ghost'}) : ''}</div><form id="filter-form" class="ec12-facet-form"><input name="kind" type="hidden" value="${kind}"><input name="view" type="hidden" value="${layout}">
        <label>Rechercher<input name="q" value="${e(ctx.params.get('q')||'')}" placeholder="Nom, activité, expertise…" autocomplete="off"></label>
        <label>${kind==='company'?'Type d’organisation':'Profil du contact'}<select name="type">${option('','Tous les profils',type)}${typeOptions.map(([v,t])=>option(v,t,type)).join('')}</select></label>
        ${kind === 'company' ? `<label>Appartenance au réseau<select name="label">${option('','Toutes les catégories',activeLabel)}${presets.filter(([id])=>id!=='premium').map(([id,text])=>option(id,text,activeLabel)).join('')}</select></label><label>Statut Premium<select name="premium">${option('','Tous',premium)}${option('true','Premium actif',premium)}${option('false','Non Premium',premium)}</select></label>`:''}
        <label>Expertise / mot-clé<input name="tag" list="ec12-tags" value="${e(tag)}" placeholder="Qualité, financement…"><datalist id="ec12-tags">${skills.map(t=>`<option value="${e(t)}"></option>`).join('')}</datalist></label>
        <label>Ville / territoire<input name="city" list="ec12-cities" value="${e(ctx.params.get('city')||'')}" placeholder="Lille, Arras…"><datalist id="ec12-cities">${cities.map(t=>`<option value="${e(t)}"></option>`).join('')}</datalist></label>
        <label>Trier par<select name="sort">${option('name','Nom (A → Z)',sort)}${option('city','Ville',sort)}${option('availability','Prochain créneau',sort)}${kind==='company'?option('premium','Premium en premier',sort):''}</select></label>
        <label class="ec12-favorite-check"><input type="checkbox" name="favorites" ${ctx.params.get('favorites')==='true'?'checked':''}>${icon('heart',17)} Mes favoris uniquement</label>
        <button type="submit" class="btn primary full">${icon('search',16)} Appliquer les filtres</button></form>
        <div class="ec12-privacy-hint">${icon('lock',16)} Les identités des startups ne sont visibles que selon vos droits Premium.</div></aside>
        <div class="ec12-dir-results"><div class="ec12-dir-results-head"><div><strong>${data.total} ${kind==='company'?'entreprise':'contact'}${data.total>1?'s':''}</strong><small>${kind==='company'?'Les personnes sont visibles dans chaque fiche entreprise.':'Chaque contact est associé à une entreprise.'}</small></div><div class="ec12-display-switch" role="group" aria-label="Présentation des résultats">${[['compact','Vignettes','grid'],['detail','Détaillé','list'],['table','Tableau','portfolio']].map(([mode,name,symbol])=>button(name||'','directory-view',{icon:symbol||'company',class:layout===mode?'selected':'',extra:`data-view="${mode}"`})).join('')}</div></div>`;
    if (!items.length) html += empty('Aucun résultat','Essayez de retirer un filtre ou de rechercher une autre expertise.','');
    else if(layout==='table') html += `<div class="table-wrap ec12-dir-table"><table><thead><tr><th>${kind==='company'?'Entreprise':'Contact'}</th><th>${kind==='company'?'Catégories':'Entreprise'}</th><th>Expertises</th><th>Ville</th><th>Disponibilité</th><th>Actions</th></tr></thead><tbody>${items.map(d=>`<tr><td><div class="ec12-table-identity">${avatar(d.name,d.media,kind==='company')}<div><strong>${e(d.name)}</strong><small>${e(d.subtitle)}</small></div></div></td><td>${kind==='company'?labelChips(d):e(d.company_name||'')}</td><td>${tags(d.tags.slice(0,3))}</td><td>${e(d.city||'—')}</td><td>${d.next_slot?dateText(d.next_slot,true):'À proposer'}</td><td class="ec12-table-actions">${button('Fiche','directory-detail',{id:d.id,extra:`data-kind="${d.kind}"`,class:'small primary'})}${button('RDV','directory-slots',{id:d.id,extra:`data-kind="${d.kind}"`,class:'small ghost'})}</td></tr>`).join('')}</tbody></table></div>`;
    else html+=`<div class="ec12-directory-grid ${layout==='detail'?'detailed':'compact'}">${items.map(d=>`<article class="ec12-dir-card ${layout==='detail'?'expanded':''}"><div class="ec12-dir-top"><div class="ec12-dir-avatar">${avatar(d.name,d.media,kind==='company')}</div><div class="ec12-dir-intro"><button class="text-button ec12-dir-name" data-action="directory-detail" data-id="${e(d.id)}" data-kind="${kind}">${e(d.name)}</button><small>${e(kind==='person'?(d.company_name||'Entreprise non renseignée'):d.subtitle||d.city||'Membre du réseau')}</small>${kind==='company'?labelChips(d):`<div class="ec12-labels"><span class="ec12-type-pill">${e(label(d.type))}</span></div>`}</div>${favorite(d.id,d.kind,d.favorite)}</div>${layout==='detail'?`<div class="ec12-dir-desc">${e(d.description||'La présentation de cette fiche sera prochainement enrichie.')}</div>${tags(d.tags,5)}`:`<div class="ec12-dir-mini-tags">${tags(d.tags,2)}</div>`}<div class="ec12-dir-bottom"><small>${icon('calendar',14)}${d.next_slot?'Prochain RDV : '+dateText(d.next_slot,true):'Pas de créneau affiché'}</small><div>${button('Voir la fiche','directory-detail',{id:d.id,extra:`data-kind="${kind}"`,class:'small primary'})}${button('Créneaux','directory-slots',{id:d.id,extra:`data-kind="${kind}"`,class:'small ghost'})}</div></div></article>`).join('')}</div>`;
    html += pagination(data.total,ctx.page)+'</div></div>';
    return html;
}

export function companyDetailV12(d: CompanyDetail, offers: Offer[] = []): string {
    const c = d.details || {};
    const b = labelChips({type:d.type||'autre',premium:d.premium||false,labels:d.labels||[]});
    const members = d.members||[];
    return `<div class="ec12-entity-header">${avatar(d.name,d.media,true)}<div><p class="eyebrow">FICHE ENTREPRISE</p><h2>${e(d.name)}</h2>${b}${c.sector?`<p>${e(c.sector)}</p>`:''}${c.city?`<small>${icon('location',14)} ${e(c.city)}</small>`:''}</div></div>
    <div class="ec12-entity-section"><h3>${icon('company',18)} À propos</h3><div class="prose">${markdown(c.description||'Présentation non renseignée.')}</div>${tags(d.tags||[])}</div>
    ${(c.contact_email||c.phone)?`<div class="ec12-entity-section"><h3>${icon('mail',18)} Coordonnées professionnelles</h3>${c.contact_email?`<a href="mailto:${e(c.contact_email)}">${e(c.contact_email)}</a>`:''}${c.phone?`<p>${e(c.phone)}</p>`:''}</div>`:''}
    <div class="ec12-entity-section"><div class="section-heading"><div><h3>${icon('people',19)} L'équipe et les contacts</h3><p>${members.length} contact${members.length>1?'s':''} visible${members.length>1?'s':''} selon vos droits.</p></div></div>
    ${members.length?`<div class="ec12-contact-list">${members.map(m=>`<article class="ec12-contact-mini">${avatar(m.name,m.media)}<div><strong>${e(m.name)}</strong><span>${e(m.title||label(m.contact_role||m.role))}</span>${m.linkedin_url?`<a href="${e(m.linkedin_url)}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>`:''}</div>${button('Fiche','person-detail',{id:m.id,class:'small ghost'})}</article>`).join('')}</div>`:'<p class="muted">Aucun contact public pour cette entreprise.</p>'}</div>
    <div class="ec12-entity-section"><h3>${icon('portfolio',18)} Services publiés</h3>${offers.length?`<div class="ec12-inline-offers">${offers.map(o=>`<details><summary><strong>${e(o.title)}</strong><span>${o.price==null?'Sur devis':money(o.price)}</span></summary><div class="prose">${markdown(o.description)}</div>${tags(o.tags)}</details>`).join('')}</div>`:'<p class="muted">Aucun service publié dans le catalogue.</p>'}</div>
    <footer class="form-footer">${button('Voir les disponibilités','directory-slots',{id:d.id,icon:'calendar',class:'primary',extra:'data-kind="company"'})}</footer>`;
}
export function personDetailV12(d: DirectoryItem): string {
    return `<div class="ec12-entity-header">${avatar(d.name,d.media)}<div><p class="eyebrow">FICHE CONTACT</p><h2>${e(d.name)}</h2><p>${e(d.subtitle||label(d.type))}</p>${d.company_name?`<strong>${icon('company',15)} ${e(d.company_name)}</strong>`:''}</div></div>
    <div class="ec12-entity-section"><h3>${icon('user',18)} Profil professionnel</h3><div class="prose">${markdown(d.description||'Présentation professionnelle non renseignée.')}</div>${tags(d.tags)}</div>
    <footer class="form-footer">${d.linkedin_url&&/^https:\/\/(www\.)?linkedin\.com\/(in|pub)\//i.test(d.linkedin_url)?`<a class="btn" href="${e(d.linkedin_url)}" target="_blank" rel="noopener noreferrer">Profil LinkedIn ↗</a>`:''}${d.company_id?button('Voir son entreprise','company-detail',{id:d.company_id,icon:'company'}):''}${button('Voir ses disponibilités','directory-slots',{id:d.id,icon:'calendar',class:'primary',extra:'data-kind="person"'})}</footer>`;
}

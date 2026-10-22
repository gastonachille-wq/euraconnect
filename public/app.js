/* ==========================================================================
   CONFIGURATION VISUELLE / TEXTES
   Tout ce qui est personnalisable est centralisé dans ui_config.js.
   ========================================================================== */
const CFG = window.APP_CONFIG || {};
const UI = CFG;

const DEFAULT_STATUS = [
  {v:'1. Prise de contact',l:'Prise de contact',i:'◉',c:'#64748b'},
  {v:'2. À recontacter',l:'À recontacter',i:'↻',c:'#d97706'},
  {v:'3. Intéressé 2',l:'Intéressé 2',i:'◇',c:'#0284c7'},
  {v:'4. Rdv réalisé',l:'RDV réalisé',i:'●',c:'#7c3aed'},
  {v:'5. Intéressé 1',l:'Intéressé 1',i:'★',c:'#059669'},
  {v:'6. Proposition envoyée',l:'Proposition',i:'✉',c:'#ca8a04'},
  {v:'7. Accord de principe',l:'Accord',i:'✓',c:'#2563eb'},
  {v:'8. Gagné (fermé)',l:'Gagné',i:'◆',c:'#08765a'},
  {v:'9. Perdu (fermé)',l:'Perdu',i:'✕',c:'#b91c1c'}
];

const STATUS = (CFG.statuses || []).length
  ? CFG.statuses.map((s, i) => ({
      v: s.value || DEFAULT_STATUS[i]?.v,
      l: s.label || DEFAULT_STATUS[i]?.l,
      i: s.icon || DEFAULT_STATUS[i]?.i,
      c: s.color || DEFAULT_STATUS[i]?.c
    }))
  : DEFAULT_STATUS;

const ODJN = CFG.odjNames || {AL:'Aurélien', LS:'Lise', NG:'Nathalie'};
const NAV_ORDER = ['dashboard','pipeline','prospects','projects','odj','sourcing','relations','partnerships','admin'];

let DATA={prospects:[],projects:[],sourcing:[],relations:{ready:false,organisations:[],contacts:[],rdv:[],rdv_contacts:[]},partnerships:{ready:false,actions_ready:false,services:[],partenariats:[],engagements:[],actions:[],realisations:[]}}, currentProjectChip='', pipeView='kanban', prospectView='table', projView='cards', odjView='cards', relationView='orgs', refreshTimer=null;
const selectedProjectIds=new Set();
const selectedRdvIds=new Set();
let relationRdvSort={key:'date_rdv',dir:-1};
let relationOrgSort={key:'last',dir:-1};
let relationVisibleRdvIds=[];
let relationActiveRdvId=null;
let relationAnchorRdvId=null;

function captureUiScroll(){
  const state={windowX:window.scrollX,windowY:window.scrollY,boxes:[]};
  document.querySelectorAll('.section.active .tablebox, .section.active .kanban, .section.active .chip-sidebar-body').forEach((el,i)=>{
    state.boxes.push({i,top:el.scrollTop,left:el.scrollLeft});
  });
  return state;
}
function restoreUiScroll(state){
  if(!state)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const els=[...document.querySelectorAll('.section.active .tablebox, .section.active .kanban, .section.active .chip-sidebar-body')];
    (state.boxes||[]).forEach(x=>{const el=els[x.i];if(el){el.scrollTop=x.top;el.scrollLeft=x.left}});
    window.scrollTo(state.windowX||0,state.windowY||0);
  }));
}
let favoriteOnly=false;
const FAVORITES_KEY='eurasante_crm_prospect_favorites_v1';
function getFavorites(){try{return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]'))}catch(e){return new Set()}}
function isFavorite(id){return getFavorites().has(String(id))}
function setFavorite(id,on){const fav=getFavorites(),key=String(id);on?fav.add(key):fav.delete(key);localStorage.setItem(FAVORITES_KEY,JSON.stringify([...fav]));}
function toggleFavorite(id,event){if(event){event.preventDefault();event.stopPropagation()}const on=!isFavorite(id);setFavorite(id,on);renderProspects();renderPipeline();toast(on?(CFG.messages?.favoriteAdded||'Ajouté aux favoris'):(CFG.messages?.favoriteRemoved||'Retiré des favoris'));}
function favoriteButton(x,cls=''){const on=isFavorite(x.id);return `<button class="favorite-btn ${cls} ${on?'active':''}" type="button" aria-pressed="${on}" aria-label="${on?'Retirer des favoris':'Ajouter aux favoris'}" title="${on?'Retirer des favoris':'Ajouter aux favoris'}" data-ui-action="favorite" data-id="${x.id}">${on?'★':'☆'}</button>`}
function syncFavoriteFilterButton(){const b=$('favoriteProspectFilter');if(!b)return;b.classList.toggle('active',favoriteOnly);b.setAttribute('aria-pressed',String(favoriteOnly));b.innerHTML=`<span aria-hidden="true">${favoriteOnly?'★':'☆'}</span> ${esc(CFG.filters?.favoritesOnly||'Favoris')}`;}
const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); const norm=s=>String(s??'').normalize('NFKC').trim().toLocaleLowerCase('fr-FR'); const fmtMoney=n=>n?Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}):'—'; const fmtDate=s=>{if(!s)return '—'; const d=new Date(s+'T12:00:00'); return isNaN(d)?esc(s):d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})}; const statusObj=v=>STATUS.find(s=>s.v===v)||STATUS[0];
const isProjectActive=p=>{if(!p)return false;const v=p.actif;if(v===false||v===0)return false;if(typeof v==='string'&&['false','0','non','no','inactive','inactif','désactivé','desactive'].includes(v.trim().toLowerCase()))return false;return true};
const activeProjects=()=>DATA.projects.filter(isProjectActive);
const findProjectByName=name=>DATA.projects.find(p=>norm(p.nom_projet)===norm(name));
function projectOptions(current=''){
  const currentProject=findProjectByName(current);
  const active=activeProjects().slice().sort((a,b)=>String(a.nom_projet||'').localeCompare(String(b.nom_projet||''),'fr',{sensitivity:'base'}));
  let html='<option value="">— Aucun projet —</option>';
  if(current && (!currentProject || !isProjectActive(currentProject))){
    html+=`<option value="${esc(current)}" selected disabled>${esc(current)} — ${esc(CFG.messages?.projectInactive||'Projet désactivé')} · ${esc(CFG.messages?.inactiveAttachmentKept||'rattachement existant conservé')}</option>`;
  }
  html+=active.map(p=>`<option value="${esc(p.nom_projet)}" ${norm(p.nom_projet)===norm(current)?'selected':''}>${esc(p.nom_projet)}</option>`).join('');
  return html;
}
function prospectProjects(x){
  const raw=Array.isArray(x?.projets)?x.projets:[];
  const out=[]; const seen=new Set();
  raw.forEach(p=>{const name=p?.nom_projet||'';const key=norm(name);if(name&&!seen.has(key)){seen.add(key);out.push({id:p.id||null,nom_projet:name,actif:p.actif!==false})}});
  if(x?.projet_cible&&!seen.has(norm(x.projet_cible))){const p=findProjectByName(x.projet_cible);out.push({id:p?.id||null,nom_projet:x.projet_cible,actif:p?isProjectActive(p):false})}
  return out;
}
function prospectProjectNames(x){return prospectProjects(x).map(p=>p.nom_projet)}
function prospectHasProject(x,project){const k=norm(project);return !k||prospectProjectNames(x).some(n=>norm(n)===k)}
function projectBadges(x,limit=99){const ps=prospectProjects(x);if(!ps.length)return '<span class="empty">Aucun projet</span>';const visible=ps.slice(0,limit),more=ps.length-visible.length;return `<span class="multi-project-badges">${visible.map(p=>`<span class="badge project-link-badge ${p.actif?'':'inactive'}">${esc(p.nom_projet)}${p.actif?'':' · désactivé'}</span>`).join('')}${more?`<span class="badge project-more">+${more}</span>`:''}</span>`}
function renderMultiProjectSelector(x){
  const attached=prospectProjects(x),attachedIds=new Set(attached.map(p=>String(p.id||'')).filter(Boolean));
  const active=activeProjects().slice().sort((a,b)=>String(a.nom_projet||'').localeCompare(String(b.nom_projet||''),'fr',{sensitivity:'base'}));
  const inactiveAttached=attached.filter(p=>!p.actif&&p.id).filter(p=>!active.some(a=>String(a.id)===String(p.id)));
  const list=[...inactiveAttached.map(p=>({id:p.id,nom_projet:p.nom_projet,actif:false})),...active];
  if(!list.length)return '<div class="multi-project-empty">Aucun projet actif disponible.</div>';
  const options=list.map(p=>{const checked=attachedIds.has(String(p.id)),inactive=!isProjectActive(p);return `<label class="project-option ${inactive?'inactive':''}" data-search="${esc(norm(p.nom_projet))}" data-project-id="${esc(p.id)}"><input type="checkbox" value="${esc(p.id)}" ${checked?'checked':''}><span class="project-option-check">${checked?'✓':''}</span><span class="project-option-copy"><b>${esc(p.nom_projet)}</b>${inactive?'<small>Désactivé · rattachement historique</small>':'<small>Projet actif</small>'}</span></label>`}).join('');
  return `<div class="multi-project-picker hybrid" id="fProjects">
    <div class="multi-project-summary">
      <div class="multi-project-summary-top"><div><b>Projets associés</b><span class="multi-project-count" id="fProjectsCount">0 sélectionné</span></div></div>
      <div class="multi-project-selected" id="fProjectsSelected"></div>
      <div class="multi-project-actions">
        <button class="btn mini-btn primary-soft" type="button" id="fProjectsAdd">＋ Associer un projet</button>
        <button class="btn mini-btn" type="button" id="fProjectsManage">Gérer</button>
      </div>
    </div>
    <div class="multi-project-panel hidden" id="fProjectsPanel">
      <div class="multi-project-panel-head"><b id="fProjectsPanelTitle">Associer un projet</b><button class="iconbtn project-panel-close" type="button" id="fProjectsClose" aria-label="Fermer">×</button></div>
      <div class="multi-project-search"><span aria-hidden="true">⌕</span><input type="search" id="fProjectsSearch" placeholder="Rechercher un projet actif..."></div>
      <div class="multi-project-options" id="fProjectsOptions">${options}</div>
      <div class="multi-project-manage-footer hidden" id="fProjectsManageFooter"><button class="btn mini-btn" type="button" id="fProjectsClear">Tout retirer</button><button class="btn mini-btn" type="button" id="fProjectsDone">Terminé</button></div>
    </div>
  </div>`;
}
function initMultiProjectPicker(){
  const root=$('fProjects');if(!root)return;
  const options=[...root.querySelectorAll('.project-option')],selected=$('fProjectsSelected'),count=$('fProjectsCount'),search=$('fProjectsSearch'),clear=$('fProjectsClear');
  const panel=$('fProjectsPanel'),add=$('fProjectsAdd'),manage=$('fProjectsManage'),close=$('fProjectsClose'),done=$('fProjectsDone'),footer=$('fProjectsManageFooter'),title=$('fProjectsPanelTitle');
  let mode='add';
  function redraw(){
    const checked=options.filter(o=>o.querySelector('input').checked);
    count.textContent=`${checked.length} sélectionné${checked.length>1?'s':''}`;
    selected.innerHTML=checked.length?checked.map(o=>{const input=o.querySelector('input'),p=DATA.projects.find(p=>String(p.id)===String(input.value));const name=p?.nom_projet||o.querySelector('b')?.textContent||'Projet';const inactive=o.classList.contains('inactive');return `<button type="button" class="selected-project-chip ${inactive?'inactive':''}" data-remove-project="${esc(input.value)}" title="Retirer ${esc(name)}"><span>${esc(name)}</span><b aria-hidden="true">×</b></button>`}).join(''):'<span class="multi-project-placeholder">Aucun projet associé</span>';
    options.forEach(o=>{const on=o.querySelector('input').checked;o.classList.toggle('selected',on);o.querySelector('.project-option-check').textContent=on?'✓':''});
    if(clear)clear.disabled=!checked.length;
    filterOptions();
  }
  function filterOptions(){
    const q=norm(search?.value||'');
    options.forEach(o=>{const checked=o.querySelector('input').checked;const inactive=o.classList.contains('inactive');const match=!q||o.dataset.search.includes(q);const allowed=mode==='manage'||(!checked&&!inactive);o.style.display=(match&&allowed)?'':'none'});
  }
  function openPanel(nextMode){
    mode=nextMode;panel.classList.remove('hidden');footer?.classList.toggle('hidden',mode!=='manage');title.textContent=mode==='manage'?'Gérer les projets associés':'Associer un projet';search.value='';filterOptions();setTimeout(()=>search.focus(),0);
  }
  function closePanel(){panel.classList.add('hidden');search.value='';}
  options.forEach(o=>o.querySelector('input').addEventListener('change',()=>{redraw();if(mode==='add'&&o.querySelector('input').checked)closePanel()}));
  selected.addEventListener('click',e=>{const b=e.target.closest('[data-remove-project]');if(!b)return;const input=root.querySelector(`input[value="${CSS.escape(b.dataset.removeProject)}"]`);if(input){input.checked=false;redraw()}});
  search.addEventListener('input',filterOptions);
  add.onclick=()=>openPanel('add');manage.onclick=()=>openPanel('manage');close.onclick=closePanel;done.onclick=closePanel;
  clear.addEventListener('click',()=>{options.forEach(o=>o.querySelector('input').checked=false);redraw()});
  redraw();
}

function selectedProjectIdsFromForm(){return [...document.querySelectorAll('#fProjects input[type="checkbox"]:checked')].map(x=>x.value)}


/* --------------------------------------------------------------------------
   Application des textes de ui_config.js aux éléments statiques du HTML.
   Cela permet de modifier les libellés sans toucher au HTML.
   -------------------------------------------------------------------------- */
function applyUIConfig(){
  const setText=(id,value)=>{const el=$(id);if(el&&value!==undefined)el.textContent=value};
  const setHtml=(id,value)=>{const el=$(id);if(el&&value!==undefined)el.innerHTML=value};
  const setPlaceholder=(id,value)=>{const el=$(id);if(el&&value!==undefined)el.placeholder=value};
  const setOption=(id,value,label)=>{const el=$(id);const op=el?.querySelector(`option[value=\"${value}\"]`);if(op&&label!==undefined)op.textContent=label};

  document.title=CFG.app?.browserTitle||'Eurasanté CRM';
  setHtml('brand',CFG.app?.brandHtml||'Eurasanté CRM');
  setText('dashTitle',CFG.app?.dashboardTitle||'Pilotage partenariats');
  setText('dashSub',CFG.app?.dashboardSubtitle||'');

  setHtml('loginBrand',CFG.login?.titleHtml||'Eura<span>Santé</span> CRM');
  setText('loginSubtitle',CFG.login?.subtitle||'Connexion à la base partagée Supabase.');
  setText('loginEmailLabel',CFG.login?.email||'Email');
  setText('loginPasswordLabel',CFG.login?.password||'Mot de passe');
  setText('loginBtn',CFG.buttons?.login||'Se connecter');
  setText('logoutBtn',CFG.buttons?.logout||'Quitter');
  $('refreshBtn')?.setAttribute('aria-label',CFG.buttons?.refresh||'Actualiser');

  setText('pipelineTitle',CFG.pages?.pipelineTitle||'Pipeline commercial');
  setText('prospectsTitle',CFG.pages?.prospectsTitle||'Prospects');
  setText('projectsTitle',CFG.pages?.projectsTitle||'Projets');
  setText('odjTitle',CFG.pages?.odjTitle||'ODJ Comité');
  setText('sourcingTitle',CFG.pages?.sourcingTitle||'Sourcing');
  setText('sourcingSubtitle',CFG.pages?.sourcingSubtitle||'');
  setText('adminTitle',CFG.pages?.adminTitle||'Import / Export');

  setText('kProspectsLabel',CFG.dashboard?.prospects||'Prospects');
  setText('kProjectsLabel',CFG.dashboard?.projects||'Projets');
  setText('kPipelineLabel',CFG.dashboard?.pipeline||'Pipeline');
  setText('kWonLabel',CFG.dashboard?.won||'Gagné');
  setText('kODJLabel',CFG.dashboard?.odj||'ODJ Comité');
  setText('kSourceLabel',CFG.dashboard?.sourcing||'Sourcing');
  setText('funnelTitle',CFG.dashboard?.funnelTitle||'Entonnoir commercial');
  setText('recentTitle',CFG.dashboard?.recentTitle||'Dernières mises à jour');

  setText('newProspect',CFG.buttons?.newProspect||'+ Nouveau prospect');
  setText('newProject',CFG.buttons?.newProject||'+ Projet');
  setText('selectVisibleProjects',CFG.buttons?.selectVisibleProjects||'Sélectionner les visibles');
  setText('clearProjectSelection',CFG.buttons?.clearProjectSelection||'Effacer la sélection');
  setText('bulkActivateProjects',CFG.buttons?.bulkActivateProjects||'✓ Activer la sélection');
  setText('bulkDeactivateProjects',CFG.buttons?.bulkDeactivateProjects||'⊘ Désactiver la sélection');
  setText('resetProspectFilters',CFG.buttons?.resetFilters||'Réinitialiser');
  setText('exportXlsxBtn',CFG.buttons?.exportXlsx||'⇩ Exporter XLSX — format Reporting ODJ');

  setPlaceholder('pipeQ',CFG.placeholders?.pipelineSearch||'Rechercher...');
  setPlaceholder('prospectQ',CFG.placeholders?.prospectsSearch||'Société, commentaire, projet...');
  setPlaceholder('projectQ',CFG.placeholders?.projectSearch||'Rechercher projet...');
  setPlaceholder('sourceQ',CFG.placeholders?.sourcingSearch||'Rechercher une cible...');
  setPlaceholder('chipSearch',CFG.placeholders?.projectChipSearch||'Rechercher...');

  setText('chipSidebarTitle',CFG.pages?.projectsTitle||'Projets');
  setText('adminImportTitle',CFG.admin?.importTitle||'Importer un Excel');
  setText('adminImportIntro',CFG.admin?.importIntro||'');
  setText('adminImportDropText',CFG.admin?.importDropText||'');
  setText('adminDatabaseTitle',CFG.admin?.databaseTitle||'Base centrale');
  setText('adminSupabaseProjectLabel',CFG.admin?.supabaseProject||'Projet Supabase');
  setText('adminUserLabel',CFG.admin?.user||'Utilisateur');
  setText('adminProspectsLabel',CFG.admin?.prospects||'Prospects');
  setText('adminProjectsLabel',CFG.admin?.projects||'Projets');
  setText('adminSourcingLabel',CFG.admin?.sourcing||'Sourcing');
  setText('adminExportHelp',CFG.admin?.exportHelp||'');
  setText('adminMultiUserHelp',CFG.admin?.multiUserHelp||'');

  document.querySelectorAll('[data-pipeview="kanban"]').forEach(b=>b.textContent=CFG.views?.kanban||'Kanban');
  document.querySelectorAll('[data-pipeview="list"]').forEach(b=>b.textContent=CFG.views?.listing||'Listing');
  document.querySelectorAll('[data-prospectview="table"]').forEach(b=>b.textContent=CFG.views?.table||'☷ Tableau');
  document.querySelectorAll('[data-prospectview="cards"]').forEach(b=>b.textContent=CFG.views?.cards||'▦ Cartes');
  document.querySelectorAll('[data-prospectview="compact"]').forEach(b=>b.textContent=CFG.views?.compact||'≡ Compact');
  document.querySelectorAll('[data-projview="cards"]').forEach(b=>b.textContent=(CFG.views?.cards||'▦ Cartes').replace('▦ ','') );
  document.querySelectorAll('[data-projview="table"]').forEach(b=>b.textContent=(CFG.views?.table||'☷ Tableau').replace('☷ ','') );
  document.querySelectorAll('[data-odjview="cards"]').forEach(b=>b.textContent=CFG.views?.byOwner||'Par responsable');
  document.querySelectorAll('[data-odjview="table"]').forEach(b=>b.textContent=(CFG.views?.table||'☷ Tableau').replace('☷ ','') );

  // Libellés des tris et filtres permanents
  ['pipeSort','prospectSort'].forEach(id=>{
    setOption(id,'recent',CFG.filters?.sortRecent||'Date : récent → ancien');
    setOption(id,'old',CFG.filters?.sortOld||'Date : ancien → récent');
    setOption(id,'az',CFG.filters?.sortAZ||'Nom A → Z');
    setOption(id,'amountDesc',CFG.filters?.sortAmountDesc||'Montant : décroissant');
  });
  setOption('projectODJ','',CFG.filters?.allOdj||'Tous ODJ');
  setOption('projectODJ','with',CFG.filters?.odjFilled||'ODJ renseigné');
  setOption('projectODJ','without',CFG.filters?.odjEmpty||'ODJ vide');
  setOption('projectActive','',CFG.filters?.allProjectStates||'Tous les projets');
  setOption('projectActive','active',CFG.filters?.activeProjects||'Projets actifs');
  setOption('projectActive','inactive',CFG.filters?.inactiveProjects||'Projets désactivés');
  setOption('projectSort','priority',CFG.filters?.sortPriority||'Priorité');
  setOption('projectSort','dateAsc',CFG.filters?.sortDateAsc||'Date croissante');
  setOption('projectSort','dateDesc',CFG.filters?.sortDateDesc||'Date décroissante');
  setOption('projectSort','amountDesc',CFG.filters?.sortAmountDesc||'Montant : décroissant');
  setOption('projectSort','az',CFG.filters?.sortAZ||'Nom A → Z');
  setOption('sourceState','open',CFG.filters?.sourcingOpen||'Non importées');
  setOption('sourceState','',CFG.filters?.sourcingAll||'Toutes');
  setOption('sourceState','done',CFG.filters?.sourcingDone||'Déjà importées');
}
function toast(t){const x=$('toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2600)}
function closeModal(){$('modalOverlay').classList.remove('open');$('modalBox').innerHTML=''}
function askConfirm(title,message,confirmLabel='Confirmer',danger=false){return new Promise(resolve=>{$('modalBox').className='modal'+(danger?' danger':'');$('modalBox').innerHTML=`<h3>${esc(title)}</h3><p>${esc(message)}</p><div class="modal-actions"><button class="btn" id="modalCancel">Annuler</button><button class="btn ${danger?'danger':'primary'}" id="modalOk">${esc(confirmLabel)}</button></div>`;$('modalOverlay').classList.add('open');const done=v=>{closeModal();resolve(v)};$('modalCancel').onclick=()=>done(false);$('modalOk').onclick=()=>done(true);$('modalOverlay').onclick=e=>{if(e.target.id==='modalOverlay')done(false)}})}
function askChoice(title,message,options){return new Promise(resolve=>{$('modalBox').className='modal';$('modalBox').innerHTML=`<h3>${esc(title)}</h3><p>${esc(message)}</p><select id="modalSelect"><option value="">— Aucun —</option>${options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select><div class="modal-actions"><button class="btn" id="modalCancel">Annuler</button><button class="btn primary" id="modalOk">Valider</button></div>`;$('modalOverlay').classList.add('open');const done=v=>{closeModal();resolve(v)};$('modalCancel').onclick=()=>done(null);$('modalOk').onclick=()=>done($('modalSelect').value);$('modalOverlay').onclick=e=>{if(e.target.id==='modalOverlay')done(null)}})}
function askMultiProjectChoice(title,message,projects){return new Promise(resolve=>{$('modalBox').className='modal';$('modalBox').innerHTML=`<h3>${esc(title)}</h3><p>${esc(message)}</p><div class="modal-project-list">${projects.map(p=>`<label class="project-check"><input type="checkbox" value="${esc(p.id)}"><span><b>${esc(p.nom_projet)}</b></span></label>`).join('')||'<p class="meta">Aucun projet actif disponible.</p>'}</div><div class="modal-actions"><button class="btn" id="modalCancel">Annuler</button><button class="btn primary" id="modalOk">Valider</button></div>`;$('modalOverlay').classList.add('open');const done=v=>{closeModal();resolve(v)};$('modalCancel').onclick=()=>done(null);$('modalOk').onclick=()=>done([...$('modalBox').querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value));$('modalOverlay').onclick=e=>{if(e.target.id==='modalOverlay')done(null)}})}

async function api(path,opt={}){return window.CRM_BRIDGE.request(path,opt)}
const NAV_ICONS={dashboard:'<svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="6" height="8" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="11.5" y="2.5" width="6" height="5" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="11.5" y="10.5" width="6" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="2.5" y="13.5" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.6"/></svg>',pipeline:'<svg viewBox="0 0 20 20" fill="none"><path d="M2.5 5.5h10M2.5 10h13M2.5 14.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M15.5 8l2.5 2-2.5 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',prospects:'<svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="7" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M3 17c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M15 4.3c1.4.5 2.4 1.8 2.4 3.4 0 1.5-.9 2.8-2.2 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',projects:'<svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 8h15" stroke="currentColor" stroke-width="1.6"/></svg>',odj:'<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="2.5" width="14" height="15" rx="1.8" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 7h7M6.5 10.5h7M6.5 14h4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',sourcing:'<svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6"/><path d="M16.5 16.5l-3.6-3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',partnerships:'<svg viewBox="0 0 20 20" fill="none"><path d="M7.7 6.2 5.9 4.4a2.5 2.5 0 0 0-3.5 3.5l2.7 2.7a2.5 2.5 0 0 0 3.5 0l1.2-1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="m12.3 13.8 1.8 1.8a2.5 2.5 0 0 0 3.5-3.5l-2.7-2.7a2.5 2.5 0 0 0-3.5 0l-1.2 1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="m7 13 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',admin:'<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.6" stroke="currentColor" stroke-width="1.6"/><path d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3L4.9 4.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'};
function buildNav(){const n=$('nav');n.innerHTML='';NAV_ORDER.forEach(id=>{const label=CFG.nav?.[id]||id;const b=document.createElement('button');b.innerHTML=`${NAV_ICONS[id]||''}<span>${esc(label)}</span>`;b.dataset.sec=id;b.onclick=()=>showSection(id);n.appendChild(b)})}
function showSection(id){document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));$('sec-'+id)?.classList.add('active');document.querySelectorAll('.nav button').forEach(x=>{const on=x.dataset.sec===id;x.classList.toggle('active',on);on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current')}); if(id==='pipeline')renderPipeline();if(id==='prospects')renderProspects();if(id==='projects')renderProjects();if(id==='odj')renderODJ();if(id==='sourcing')renderSourcing();if(id==='relations')renderRelations();if(id==='partnerships')renderPartnerships();if(id==='admin')renderAdmin()}
function showLogin(){$('login').classList.remove('hidden');if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null}}
function hideLogin(){$('login').classList.add('hidden')}
async function login(){try{$('loginError').style.display='none';$('loginBtn').disabled=true;const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:$('loginEmail').value,password:$('loginPassword').value})});hideLogin();$('userEmail').textContent=d.email;await loadData();startRefresh()}catch(e){$('loginError').textContent=e.message;$('loginError').style.display='block'}finally{$('loginBtn').disabled=false}}
async function logout(){await api('/api/auth/logout',{method:'POST',body:'{}'});DATA={prospects:[],projects:[],sourcing:[],relations:{ready:false,organisations:[],contacts:[],rdv:[],rdv_contacts:[]},partnerships:{ready:false,actions_ready:false,services:[],partenariats:[],engagements:[],actions:[],realisations:[]}};showLogin()}
async function authCheck(){const d=await api('/api/auth/status');if(!d.authenticated){showLogin();return false}$('userEmail').textContent=d.email;hideLogin();return true}
async function loadData(silent=false){const scrollState=silent?captureUiScroll():null;try{if(!silent)$('syncInfo').textContent=CFG.messages?.syncing||'● actualisation…';const d=await api('/api/data');DATA=d;$('userEmail').textContent=d.user||'';$('syncInfo').textContent=CFG.messages?.synced||'● synchronisé';renderAll();if(scrollState)restoreUiScroll(scrollState)}catch(e){$('syncInfo').textContent=CFG.messages?.syncError||'● erreur';if(!silent)toast(e.message)}}
function startRefresh(){if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>loadData(true),(CFG.app?.refreshSeconds||15)*1000)}
function renderAll(){renderDashboard();renderPipeline();renderProspects();renderProjects();renderODJ();renderSourcing();renderPartnerships();renderAdmin();fillFilters()}
function uniqueLabels(vals){const seen=new Map();for(const raw of vals){const v=String(raw??'').trim();if(!v)continue;const k=norm(v);if(!seen.has(k))seen.set(k,v)}return [...seen.values()].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}))}
function fillSelect(id,vals,label){const el=$(id);if(!el)return;const cur=el.value;const first=`<option value="">${esc(label)}</option>`;el.innerHTML=first+uniqueLabels(vals).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');const match=[...el.options].find(o=>norm(o.value)===norm(cur));el.value=match?match.value:''}
function fillFilters(){const prospectRefs=DATA.prospects.map(x=>x.referent),projectRefs=DATA.projects.map(x=>x.referent);fillSelect('pipeRef',prospectRefs,CFG.filters?.allRefs||'Tous référents');fillSelect('prospectRef',prospectRefs,CFG.filters?.allRefs||'Tous référents');fillSelect('projectRef',projectRefs,CFG.filters?.allRefs||'Tous référents');fillSelect('pipeProject',DATA.prospects.flatMap(x=>prospectProjectNames(x)),CFG.filters?.allProjects||'Tous projets');fillSelect('sourceName',DATA.sourcing.map(x=>x.source),CFG.filters?.allSources||'Toutes sources');fillSelect('projectPriority',DATA.projects.map(x=>x.priorite),CFG.filters?.allPriorities||'Toutes priorités');['pipeStatus','prospectStatus'].forEach(id=>{const el=$(id),cur=el.value;el.innerHTML=`<option value="">${esc(CFG.filters?.allStatuses||'Tous statuts')}</option>`+STATUS.map(st=>`<option value="${esc(st.v)}">${esc(st.l)}</option>`).join('');const match=[...el.options].find(o=>norm(o.value)===norm(cur));el.value=match?match.value:''})}
function renderDashboard(){const p=DATA.prospects,j=DATA.projects,s=DATA.sourcing; $('kProspects').textContent=p.length;$('kProjects').textContent=j.length;$('kPipeline').textContent=fmtMoney(p.reduce((a,x)=>a+(Number(x.montant)||0),0));$('kWon').textContent=fmtMoney(p.filter(x=>x.statut==='8. Gagné (fermé)').reduce((a,x)=>a+(Number(x.montant)||0),0));$('kODJ').textContent=p.filter(x=>x.odj).length+j.filter(x=>x.odj).length;$('kSource').textContent=s.filter(x=>!x.importe).length;const max=Math.max(1,...STATUS.map(st=>p.filter(x=>x.statut===st.v).length));$('funnel').innerHTML=STATUS.map(st=>{const n=p.filter(x=>x.statut===st.v).length;return `<button type="button" class="funnel-link" data-ui-action="pipeline-status" data-status="${esc(st.v)}" style="margin:9px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span>${st.i} ${esc(st.l)}</span><b style="font-family:var(--font-display)">${n}</b></div><div style="height:7px;background:var(--surface2);border:1px solid var(--line);border-radius:9px;overflow:hidden"><div style="height:100%;width:${100*n/max}%;background:${st.c}"></div></div></button>`}).join('');const rec=[...p].sort((a,b)=>String(b.updated_at||b.date_maj||'').localeCompare(String(a.updated_at||a.date_maj||''))).slice(0,8);$('recent').innerHTML=rec.map(x=>`<div class="statrow" data-ui-action="prospect" data-id="${x.id}"><span class="click">${esc(x.nom_sponsor)}</span><span>${fmtDate(x.date_maj)}</span></div>`).join('')||`<p class="meta">${esc(CFG.dashboard?.noData||'Aucune donnée')}</p>`}
function baseFilter(arr,q,ref,project,status){const nq=norm(q),nr=norm(ref),np=norm(project),ns=norm(status);return arr.filter(x=>(!nq||norm(JSON.stringify(x)).includes(nq))&&(!nr||norm(x.referent)===nr)&&(!np||prospectHasProject(x,project))&&(!ns||norm(x.statut)===ns))}
function sortProspects(arr,mode){return [...arr].sort((a,b)=>mode==='old'?String(a.date_maj||'').localeCompare(String(b.date_maj||'')):mode==='az'?a.nom_sponsor.localeCompare(b.nom_sponsor,'fr'):mode==='amountDesc'?(Number(b.montant)||0)-(Number(a.montant)||0):String(b.date_maj||'').localeCompare(String(a.date_maj||'')))}
function pipelineFiltered(){return sortProspects(baseFilter(DATA.prospects,$('pipeQ').value,$('pipeRef').value,$('pipeProject').value,$('pipeStatus').value),$('pipeSort').value)}
function renderPipeline(){if(!$('pipelineView'))return;const arr=pipelineFiltered();if(pipeView==='list'){$('pipelineView').innerHTML=`<div class="tablebox pipeline-table"><table><thead><tr><th class="fav-col" title="Favori">★</th><th>${esc(CFG.fields?.sponsor||'Sponsor')}</th><th>${esc(CFG.fields?.status||'Statut')}</th><th>${esc(CFG.fields?.dateUpdated||'Date MAJ')}</th><th>${esc(CFG.fields?.owner||'Référent')}</th><th>${esc(CFG.fields?.targetProject||'Projet')}</th><th>${esc(CFG.fields?.amount||'Montant')}</th></tr></thead><tbody>${arr.map(x=>{const st=statusObj(x.statut);return `<tr><td class="fav-col">${favoriteButton(x,'pipeline-list-fav')}</td><td class="click" data-ui-action="prospect" data-id="${x.id}">${esc(x.nom_sponsor)}</td><td><span class="badge statusbadge" style="--c:${st.c}">${st.i} ${esc(st.l)}</span></td><td>${fmtDate(x.date_maj)}</td><td>${esc(x.referent||'—')}</td><td>${projectBadges(x,3)}</td><td>${fmtMoney(x.montant)}</td></tr>`}).join('')}</tbody></table></div>`;return}$('pipelineView').innerHTML=`<div class="kanban">${STATUS.map(st=>`<div class="lane" data-status="${esc(st.v)}"><div class="lanehead" style="color:${st.c}"><span class="lane-title">${st.i} ${esc(st.l)}</span><span class="lanecount">${arr.filter(x=>x.statut===st.v).length}</span></div>${arr.filter(x=>x.statut===st.v).map(x=>`<div class="pcard" draggable="true" data-id="${x.id}" style="--status:${st.c}" title="${esc(x.nom_sponsor)}" data-ui-action="prospect-ifnotdrag">${favoriteButton(x,'pipeline-fav')}<h4>${esc(x.nom_sponsor)}</h4><div class="mini project">${projectBadges(x,2)}</div><div class="mini detail">${esc(x.referent||'Sans référent')} · ${fmtDate(x.date_maj)}</div><div class="amt">${fmtMoney(x.montant)}</div></div>`).join('')}</div>`).join('')}</div>`;enableDrag()}
function enableDrag(){document.querySelectorAll('.pcard[draggable]').forEach(c=>{c.ondragstart=e=>{window.__dragging=true;c.classList.add('dragging');e.dataTransfer.setData('text/plain',c.dataset.id)};c.ondragend=()=>{c.classList.remove('dragging');setTimeout(()=>window.__dragging=false,50)}});document.querySelectorAll('.lane').forEach(l=>{l.ondragover=e=>{e.preventDefault()};l.ondrop=async e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');const p=DATA.prospects.find(x=>x.id===id);if(!p||p.statut===l.dataset.status)return;const old=p.statut;p.statut=l.dataset.status;p.date_maj=window.CRM_BRIDGE.localDay();renderPipeline();try{await api('/api/prospect/update',{method:'POST',body:JSON.stringify({id:p.id,statut:p.statut,date_maj:p.date_maj})});toast(CFG.messages?.statusSaved||'Statut synchronisé')}catch(err){p.statut=old;renderPipeline();toast(err.message)}}})}
let chipSidebarCollapsed=false;
function renderProjectChips(){
 const counts=new Map();
 DATA.prospects.forEach(x=>prospectProjectNames(x).forEach(name=>{const k=norm(name);if(k)counts.set(k,(counts.get(k)||0)+1)}));
 const allNames=[],seen=new Set();
 DATA.projects.forEach(p=>{const k=norm(p.nom_projet);if(k&&!seen.has(k)){seen.add(k);allNames.push(p.nom_projet)}});
 DATA.prospects.flatMap(x=>prospectProjectNames(x)).forEach(name=>{const k=norm(name);if(k&&!seen.has(k)){seen.add(k);allNames.push(name)}});
 const names=allNames.sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
 const inactiveKeys=new Set(DATA.projects.filter(p=>!isProjectActive(p)).map(p=>norm(p.nom_projet)));
 const currentKey=norm(currentProjectChip);
 $('projectChips').innerHTML=`<button type="button" class="chip-row ${!currentProjectChip?'active':''}" data-project=""><span class="name">${esc(CFG.filters?.allProjects||'Tous les projets')}</span><span class="cnt">${DATA.prospects.length}</span></button>`+names.map(n=>{const k=norm(n),cnt=counts.get(k)||0,inactive=inactiveKeys.has(k);return `<button type="button" class="chip-row ${cnt?'':'zero'} ${currentKey===k?'active':''}" data-project="${esc(n)}" data-name="${esc(norm(n))}"><span class="name">${esc(n)}${inactive?' · désactivé':''}</span><span class="cnt">${cnt}</span></button>`}).join('');
 if($('chipSearch').value)filterChipList()
}
function toggleChipSidebar(){chipSidebarCollapsed=!chipSidebarCollapsed;$('chipSidebar').classList.toggle('collapsed',chipSidebarCollapsed);$('chipSidebarToggle').setAttribute('aria-expanded',!chipSidebarCollapsed);$('chipSidebarToggle').setAttribute('aria-label',chipSidebarCollapsed?'Déplier le panneau des projets':'Réduire le panneau des projets')}
function filterChipList(){const q=norm($('chipSearch').value);$('projectChips').querySelectorAll('.chip-row[data-name]').forEach(c=>{c.style.display=(!q||norm(c.dataset.name).includes(q))?'':'none'})}
let prospectColSort={key:null,dir:1};
const PROSPECT_COL_GETTERS={nom_sponsor:x=>x.nom_sponsor||'',statut:x=>STATUS.findIndex(s=>s.v===x.statut),referent:x=>x.referent||'',projet_cible:x=>prospectProjectNames(x).join(' · '),odj:x=>x.odj||'',date_maj:x=>x.date_maj||'',montant:x=>Number(x.montant)||0,commentaire:x=>x.commentaire||''};
function sortByProspectColumn(arr,key,dir){const get=PROSPECT_COL_GETTERS[key];if(!get)return arr;return [...arr].sort((a,b)=>{const va=get(a),vb=get(b);if(typeof va==='number')return (va-vb)*dir;return String(va).localeCompare(String(vb),'fr')*dir})}
function prospectColHeader(key,label){const active=prospectColSort.key===key;const arrow=active?(prospectColSort.dir===1?'<span class="sort-ind">▲</span>':'<span class="sort-ind">▼</span>'):'';return `<th data-sortcol="${key}" class="${active?'sorted':''}" aria-sort="${active?(prospectColSort.dir===1?'ascending':'descending'):'none'}">${esc(label)}${arrow}</th>`}
function prospectFiltered(){let arr=baseFilter(DATA.prospects,$('prospectQ').value,$('prospectRef').value,currentProjectChip,$('prospectStatus').value);if(favoriteOnly){const fav=getFavorites();arr=arr.filter(x=>fav.has(String(x.id)))}return prospectColSort.key?sortByProspectColumn(arr,prospectColSort.key,prospectColSort.dir):sortProspects(arr,$('prospectSort').value)}
function syncProspectViewButtons(){document.querySelectorAll('[data-prospectview]').forEach(b=>b.classList.toggle('active',b.dataset.prospectview===prospectView))}
function renderProspects(){if(!$('prospectView'))return;renderProjectChips();syncProspectViewButtons();syncFavoriteFilterButton();const arr=prospectFiltered();$('prospectCount').textContent=`${arr.length} prospect${arr.length>1?'s':''} affiché${arr.length>1?'s':''} sur ${DATA.prospects.length}`;if(prospectView==='cards'){$('prospectView').innerHTML=`<div class="prospect-cards">${arr.map(x=>{const st=statusObj(x.statut);return `<article class="prospect-card" style="--status:${st.c}" data-ui-action="prospect" data-id="${x.id}"><div class="prospect-card-head"><div class="prospect-title-fav">${favoriteButton(x)}<h3>${esc(x.nom_sponsor)}</h3></div>${x.odj?`<span class="odj-dot">${esc(x.odj)}</span>`:''}</div><span class="badge statusbadge" style="--c:${st.c}">${st.i} ${esc(st.l)}</span><div class="prospect-card-meta">${projectBadges(x,3)}<span class="badge">${esc(x.referent||'Sans référent')}</span></div><div class="comment">${esc(x.commentaire||'Aucun commentaire')}</div><div class="prospect-card-foot"><span>${fmtDate(x.date_maj)}</span><b style="color:var(--green)">${fmtMoney(x.montant)}</b></div></article>`}).join('')}</div>`;return}if(prospectView==='compact'){$('prospectView').innerHTML=`<div class="prospect-compact">${arr.map(x=>{const st=statusObj(x.statut);return `<div class="prospect-compact-row" style="--status:${st.c}" data-ui-action="prospect" data-id="${x.id}"><div class="prospect-title-fav compact-fav">${favoriteButton(x)}<div><div class="name">${esc(x.nom_sponsor)}</div><div class="sub">${esc(x.commentaire||'Aucun commentaire')}</div></div></div><div><span class="badge statusbadge" style="--c:${st.c}">${st.i} ${esc(st.l)}</span></div><div class="hide-sm">${esc(x.referent||'—')}</div><div class="hide-sm">${projectBadges(x,2)}</div><div>${x.odj?`<span class="odj-dot">${esc(x.odj)}</span>`:'—'}</div><div>${fmtDate(x.date_maj)}</div></div>`}).join('')}</div>`;return}$('prospectView').innerHTML=`<div class="tablebox prospect-table"><table><thead><tr><th class="fav-col" title="Favori">★</th>${prospectColHeader('nom_sponsor',CFG.fields?.sponsor||'Sponsor')}${prospectColHeader('statut',CFG.fields?.status||'Statut')}${prospectColHeader('referent',CFG.fields?.owner||'Référent')}${prospectColHeader('projet_cible',CFG.fields?.targetProjects||CFG.fields?.targetProject||'Projets associés')}${prospectColHeader('odj',CFG.fields?.odj||'ODJ')}${prospectColHeader('date_maj',CFG.fields?.dateUpdated||'Date MAJ')}${prospectColHeader('montant',CFG.fields?.amount||'Montant')}${prospectColHeader('commentaire',CFG.fields?.comment||'Commentaire')}</tr></thead><tbody>${arr.map(x=>{const st=statusObj(x.statut);return `<tr><td class="fav-col">${favoriteButton(x)}</td><td class="click prospect-name" data-ui-action="prospect" data-id="${x.id}">${esc(x.nom_sponsor)}</td><td><span class="badge statusbadge" style="--c:${st.c}">${st.i} ${esc(st.l)}</span></td><td>${esc(x.referent||'—')}</td><td>${projectBadges(x,4)}</td><td>${x.odj?`<span class="odj-dot">${esc(x.odj)}</span>`:'—'}</td><td>${fmtDate(x.date_maj)}</td><td>${fmtMoney(x.montant)}</td><td><div class="prospect-comment">${esc(x.commentaire||'')}</div></td></tr>`}).join('')}</tbody></table></div>`}
function openProspect(id,newOne=false){
  const x=newOne?{id:'',nom_sponsor:'',statut:'1. Prise de contact',commentaire:'',date_maj:window.CRM_BRIDGE.localDay(),montant:null,referent:'',projet_cible:'',projets:[],projet_ids:[],odj:'',lien_crm:''}:DATA.prospects.find(x=>x.id===id);
  if(!x)return;
  $('drawerTitle').textContent=newOne?'Nouveau prospect':x.nom_sponsor;
  const inactiveAttached=prospectProjects(x).filter(p=>!p.actif);
  $('drawerBody').innerHTML=`<div class="stepgrid">${STATUS.map((st,i)=>`<button class="step ${x.statut===st.v?'active':''}" style="--c:${st.c}" data-step="${esc(st.v)}"><strong>${st.i}</strong>${i+1}. ${esc(st.l)}</button>`).join('')}</div><div class="form"><div class="formgrid"><label class="span2">${esc(CFG.fields?.sponsor||'Nom sponsor')}<input id="fName" value="${esc(x.nom_sponsor)}"></label><label>${esc(CFG.fields?.status||'Statut')}<select id="fStatus">${STATUS.map(st=>`<option value="${esc(st.v)}" ${x.statut===st.v?'selected':''}>${esc(st.l)}</option>`).join('')}</select></label><label>${esc(CFG.fields?.dateUpdated||'Date MAJ')}<input id="fDate" type="date" value="${esc(x.date_maj||window.CRM_BRIDGE.localDay())}"></label><label>${esc(CFG.fields?.owner||'Référent')}<input id="fRef" value="${esc(x.referent||'')}"></label><label>${esc(CFG.fields?.odj||'ODJ')}<select id="fODJ"><option value="">—</option>${Object.entries(ODJN).map(([k,v])=>`<option value="${k}" ${x.odj===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><div class="span2 form-projects"><div class="field-label">${esc(CFG.fields?.targetProjects||CFG.fields?.targetProject||'Projets associés')}</div>${renderMultiProjectSelector(x)}${inactiveAttached.length?`<div class="attachment-warning">⚠ ${inactiveAttached.length} projet${inactiveAttached.length>1?'s':''} désactivé${inactiveAttached.length>1?'s':''} reste${inactiveAttached.length>1?'nt':''} rattaché${inactiveAttached.length>1?'s':''}. Tu peux conserver ou retirer ces rattachements historiques ; aucun nouveau rattachement vers un projet désactivé n’est possible.</div>`:''}</div><label>${esc(CFG.fields?.amount||'Montant (€)')}<input id="fAmount" type="number" step="100" value="${x.montant??''}"></label><label class="span3">${esc(CFG.fields?.comment||'Commentaire')}<textarea id="fComment">${esc(x.commentaire||'')}</textarea></label><label class="span3">${esc(CFG.fields?.crmLink||'Lien CRM')}<input id="fCRM" value="${esc(x.lien_crm||'')}"></label></div><div class="draweractions"><button class="btn primary" id="saveProspect">${esc(CFG.buttons?.save||'💾 Enregistrer')}</button>${!newOne?`<button class="btn danger" id="deleteProspect">${esc(CFG.buttons?.delete||'Supprimer')}</button>`:''}<span class="saveinfo">Base Supabase partagée</span></div></div>`;
  initMultiProjectPicker();
  document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-step]').forEach(z=>z.classList.remove('active'));b.classList.add('active');$('fStatus').value=b.dataset.step});
  $('saveProspect').onclick=async()=>{
    const payload={nom_sponsor:$('fName').value.trim(),statut:$('fStatus').value,date_maj:$('fDate').value||window.CRM_BRIDGE.localDay(),referent:$('fRef').value.trim(),odj:$('fODJ').value,projet_ids:selectedProjectIdsFromForm(),montant:$('fAmount').value||null,commentaire:$('fComment').value,lien_crm:$('fCRM').value.trim()};
    if(!payload.nom_sponsor)return toast(CFG.messages?.sponsorRequired||'Nom sponsor obligatoire');
    try{await api(newOne?'/api/prospect/add':'/api/prospect/update',{method:'POST',body:JSON.stringify(newOne?payload:{id:x.id,...payload})});closeDrawer();await loadData(true);toast(CFG.messages?.prospectSaved||'Prospect synchronisé')}catch(e){toast(e.message)}
  };
  if(!newOne)$('deleteProspect').onclick=async()=>{if(!confirm('Supprimer ce prospect ?'))return;await api('/api/prospect/delete',{method:'POST',body:JSON.stringify({id:x.id})});closeDrawer();await loadData(true);toast(CFG.messages?.prospectDeleted||'Prospect supprimé')};
  openDrawer();
}

function projectFiltered(){
  const q=norm($('projectQ').value),pri=norm($('projectPriority').value),ref=norm($('projectRef').value),odj=$('projectODJ').value,state=$('projectActive')?.value||'';
  let a=DATA.projects.filter(x=>(!q||norm(JSON.stringify(x)).includes(q))&&(!pri||norm(x.priorite)===pri)&&(!ref||norm(x.referent)===ref)&&(!odj||(odj==='with'?!!String(x.odj||'').trim():!String(x.odj||'').trim()))&&(!state||(state==='active'?isProjectActive(x):!isProjectActive(x))));
  const sort=$('projectSort').value;
  return [...a].sort((a,b)=>sort==='dateAsc'?String(a.date_projet||'').localeCompare(String(b.date_projet||'')):sort==='dateDesc'?String(b.date_projet||'').localeCompare(String(a.date_projet||'')):sort==='amountDesc'?(Number(b.montant_cible)||0)-(Number(a.montant_cible)||0):sort==='az'?a.nom_projet.localeCompare(b.nom_projet,'fr'):String(a.priorite||'').localeCompare(String(b.priorite||''),'fr'))
}
function updateProjectSelectionUI(){
  const n=selectedProjectIds.size;
  if($('projectSelectionCount'))$('projectSelectionCount').textContent=`${n} projet${n>1?'s':''} sélectionné${n>1?'s':''}`;
  ['bulkActivateProjects','bulkDeactivateProjects','clearProjectSelection'].forEach(id=>{if($(id))$(id).disabled=!n});
}
function toggleProjectSelection(id,checked){if(checked)selectedProjectIds.add(id);else selectedProjectIds.delete(id);updateProjectSelectionUI();renderProjects()}
function renderProjects(){
  if(!$('projectView'))return;
  const a=projectFiltered();
  // Nettoie les sélections de projets supprimés de la base, mais conserve celles masquées par les filtres.
  const allIds=new Set(DATA.projects.map(x=>x.id));[...selectedProjectIds].forEach(id=>{if(!allIds.has(id))selectedProjectIds.delete(id)});
  updateProjectSelectionUI();
  if(projView==='table'){
    $('projectView').innerHTML=`<div class="tablebox"><table><thead><tr><th style="width:42px">✓</th><th>${esc(CFG.fields?.projectName||'Projet')}</th><th>${esc(CFG.fields?.projectState||'État')}</th><th>${esc(CFG.fields?.priority||'Priorité')}</th><th>${esc(CFG.fields?.owner||'Référent')}</th><th>${esc(CFG.fields?.targetAmount||'Montant cible')}</th><th>${esc(CFG.fields?.projectDate||'Date')}</th><th>${esc(CFG.fields?.odj||'ODJ')}</th><th>${esc(CFG.fields?.comments||'Commentaires')}</th></tr></thead><tbody>${a.map(x=>`<tr class="${isProjectActive(x)?'':'project-row-inactive'} ${selectedProjectIds.has(x.id)?'project-selected':''}"><td><input type="checkbox" class="project-select" data-project-id="${x.id}" ${selectedProjectIds.has(x.id)?'checked':''} aria-label="Sélectionner ${esc(x.nom_projet)}"></td><td class="click" data-ui-action="project" data-id="${x.id}">${esc(x.nom_projet)}</td><td><span class="badge ${isProjectActive(x)?'project-state-active':'project-state-inactive'}">${isProjectActive(x)?esc(CFG.fields?.projectActive||'Actif'):esc(CFG.fields?.projectInactive||'Désactivé')}</span></td><td>${esc(x.priorite||'—')}</td><td>${esc(x.referent||'—')}</td><td>${fmtMoney(x.montant_cible)}</td><td>${fmtDate(x.date_projet)}</td><td>${esc(ODJN[x.odj]||x.odj||'—')}</td><td>${esc(x.commentaires||'')}</td></tr>`).join('')}</tbody></table></div>`;
  }else{
    $('projectView').innerHTML=`<div class="projectcards">${a.map(x=>`<div class="projcard ${isProjectActive(x)?'':'inactive'} ${selectedProjectIds.has(x.id)?'project-selected':''}" data-ui-action="project" data-id="${x.id}"><div class="project-card-select"><input type="checkbox" class="project-select" data-project-id="${x.id}" ${selectedProjectIds.has(x.id)?'checked':''} aria-label="Sélectionner ${esc(x.nom_projet)}"></div><div><h3>${esc(x.nom_projet)}</h3><div class="projmeta"><span class="badge ${isProjectActive(x)?'project-state-active':'project-state-inactive'}">${isProjectActive(x)?esc(CFG.fields?.projectActive||'Actif'):esc(CFG.fields?.projectInactive||'Désactivé')}</span><span class="badge statusbadge" style="--c:var(--orange)">${esc(x.priorite||'Sans priorité')}</span><span class="badge statusbadge" style="--c:var(--accent)">${esc(x.referent||'Sans référent')}</span>${x.odj?`<span class="badge statusbadge" style="--c:var(--green)">ODJ ${esc(ODJN[x.odj]||x.odj)}</span>`:''}</div><b>${fmtMoney(x.montant_cible)}</b> · ${fmtDate(x.date_projet)}<div class="comment">${esc(x.commentaires||'Aucun commentaire')}</div></div></div>`).join('')}</div>`;
  }
  document.querySelectorAll('.project-select').forEach(cb=>cb.onchange=e=>{e.stopPropagation();const id=cb.dataset.projectId;if(cb.checked)selectedProjectIds.add(id);else selectedProjectIds.delete(id);updateProjectSelectionUI();document.querySelectorAll(`.project-select[data-project-id="${CSS.escape(id)}"]`).forEach(other=>other.checked=cb.checked);cb.closest('.projcard,tr')?.classList.toggle('project-selected',cb.checked)});
}
async function bulkSetProjectsActive(active){
  const ids=[...selectedProjectIds];if(!ids.length)return toast('Sélectionne au moins un projet');
  const selected=DATA.projects.filter(p=>selectedProjectIds.has(p.id));
  let linked=0;
  if(!active){const names=new Set(selected.map(p=>norm(p.nom_projet)));linked=DATA.prospects.filter(p=>prospectProjectNames(p).some(n=>names.has(norm(n)))).length;const msg=`${ids.length} projet${ids.length>1?'s seront':' sera'} désactivé${ids.length>1?'s':''}. ${linked?`${linked} rattachement${linked>1?'s':''} prospect existant${linked>1?'s':''} sera${linked>1?'ont':''} conservé${linked>1?'s':''}. `:''}Seuls les nouveaux rattachements seront empêchés.`;if(!await askConfirm('Désactiver la sélection ?',msg,'Désactiver'))return;}
  try{
    const out=await api('/api/project/bulk-active',{method:'POST',body:JSON.stringify({ids,actif:active})});
    await loadData(true);
    const expected=new Set(ids);
    const actual=DATA.projects.filter(p=>expected.has(p.id));
    const verified=actual.length===ids.length && actual.every(p=>isProjectActive(p)===active);
    if(!verified)throw new Error('Supabase a répondu, mais la relecture ne confirme pas tous les changements de statut.');
    selectedProjectIds.clear();renderProjects();
    toast(`${out.updated||ids.length} projet${ids.length>1?'s':''} ${active?'activé'+(ids.length>1?'s':''):'désactivé'+(ids.length>1?'s':'')} · vérifié`)
  }catch(e){await loadData(true).catch(()=>{});toast(e.message)}
}
function openProject(id,newOne=false){
  const x=newOne?{id:'',nom_projet:'',priorite:'',referent:'',montant_cible:null,date_projet:'',partenaire_cible:'',site:'',campagne_crm:'',commentaires:'',slides:'',finance:'',odj:'',actif:true}:DATA.projects.find(x=>x.id===id);
  if(!x)return;
  const linkedCount=newOne?0:DATA.prospects.filter(p=>prospectProjectNames(p).some(n=>norm(n)===norm(x.nom_projet))).length;
  $('drawerTitle').textContent=newOne?'Nouveau projet':x.nom_projet;
  $('drawerBody').innerHTML=`<div class="form"><div class="formgrid"><label class="span2">${esc(CFG.fields?.projectName||'Nom projet')}<input id="jName" value="${esc(x.nom_projet)}"></label><label>${esc(CFG.fields?.projectState||'État du projet')}<select id="jActive"><option value="true" ${isProjectActive(x)?'selected':''}>${esc(CFG.fields?.projectActive||'Actif')}</option><option value="false" ${!isProjectActive(x)?'selected':''}>${esc(CFG.fields?.projectInactive||'Désactivé')}</option></select></label><label>${esc(CFG.fields?.priority||'Priorité')}<select id="jPriority"><option value="">—</option>${['1 - Haute','2 - Moyenne','3 - Basse'].map(v=>`<option ${x.priorite===v?'selected':''}>${v}</option>`).join('')}</select></label><label>${esc(CFG.fields?.owner||'Référent')}<input id="jRef" value="${esc(x.referent||'')}"></label><label>${esc(CFG.fields?.targetAmount||'Montant cible')}<input id="jAmount" type="number" value="${x.montant_cible??''}"></label><label>${esc(CFG.fields?.projectDate||'Date')}<input id="jDate" type="date" value="${esc(x.date_projet||'')}"></label><label>${esc(CFG.fields?.odj||'ODJ')}<select id="jODJ"><option value="">—</option>${Object.entries(ODJN).map(([k,v])=>`<option value="${k}" ${x.odj===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label class="span2">${esc(CFG.fields?.targetPartner||'Partenaire cible')}<input id="jTarget" value="${esc(x.partenaire_cible||'')}"></label><label>${esc(CFG.fields?.funded||'Financé')}<input id="jFinance" value="${esc(x.finance||'')}"></label><label>${esc(CFG.fields?.site||'Site')}<input id="jSite" value="${esc(x.site||'')}"></label><label>${esc(CFG.fields?.crmCampaign||'Campagne CRM')}<input id="jCampaign" value="${esc(x.campagne_crm||'')}"></label><label>${esc(CFG.fields?.slides||'Slides')}<input id="jSlides" value="${esc(x.slides||'')}"></label>${linkedCount?`<div class="attachment-warning">${linkedCount} prospect${linkedCount>1?'s sont':' est'} actuellement rattaché${linkedCount>1?'s':''} à ce projet. Une désactivation conservera intégralement ${linkedCount>1?'ces rattachements':'ce rattachement'} historique${linkedCount>1?'s':''}.</div>`:''}<label class="span3">${esc(CFG.fields?.comments||'Commentaires')}<textarea id="jComment">${esc(x.commentaires||'')}</textarea></label></div><div class="draweractions"><button class="btn primary" id="saveProject">${esc(CFG.buttons?.save||'💾 Enregistrer')}</button></div></div>`;
  $('saveProject').onclick=async()=>{
    const d={nom_projet:$('jName').value.trim(),actif:$('jActive').value==='true',priorite:$('jPriority').value,referent:$('jRef').value.trim(),montant_cible:$('jAmount').value||null,date_projet:$('jDate').value||null,odj:$('jODJ').value,partenaire_cible:$('jTarget').value.trim(),finance:$('jFinance').value.trim(),site:$('jSite').value.trim(),campagne_crm:$('jCampaign').value.trim(),slides:$('jSlides').value.trim(),commentaires:$('jComment').value};
    if(!newOne && isProjectActive(x) && !d.actif && linkedCount){
      const ok=await askConfirm('Désactiver ce projet ?',`${linkedCount} prospect${linkedCount>1?'s sont':' est'} actuellement rattaché${linkedCount>1?'s':''}. Les rattachements seront conservés, mais ce projet ne pourra plus être choisi pour de nouveaux rattachements.`,'Désactiver');
      if(!ok)return;
    }
    try{await api(newOne?'/api/project/add':'/api/project/update',{method:'POST',body:JSON.stringify(newOne?d:{id:x.id,...d})});closeDrawer();await loadData(true);toast(CFG.messages?.projectSaved||'Projet synchronisé')}catch(e){toast(e.message)}
  };
  openDrawer();
}

async function resetProspectODJ(){
  const targets=DATA.prospects.filter(x=>String(x.odj||'').trim());
  if(!targets.length){toast('Aucun ODJ prospect à réinitialiser');return;}
  const ok=await askConfirm(
    'Réinitialiser les ODJ prospects ?',
    `Cette action effacera l’affectation ODJ de ${targets.length} prospect${targets.length>1?'s':''}. Les projets et toutes les autres informations seront conservés.`,
    'Réinitialiser',true
  );
  if(!ok)return;
  const btn=$('resetProspectODJ');
  if(btn){btn.disabled=true;btn.textContent='Réinitialisation…';}
  try{
    for(const x of targets){
      await api('/api/prospect/update',{method:'POST',body:JSON.stringify({id:x.id,odj:''})});
    }
    await loadData(true);
    toast(`${targets.length} ODJ prospect${targets.length>1?'s':''} réinitialisé${targets.length>1?'s':''}`);
  }catch(e){
    await loadData(true).catch(()=>{});
    toast(e.message||'Réinitialisation incomplète');
  }finally{
    if(btn){btn.disabled=false;btn.textContent=CFG.buttons?.resetProspectODJ||'Réinitialiser ODJ prospects';}
  }
}

function renderODJ(){const people=['AL','LS','NG'];const items=[];DATA.prospects.filter(x=>x.odj).forEach(x=>items.push({owner:x.odj,type:'Prospect',name:x.nom_sponsor,status:x.statut,project:prospectProjectNames(x).join(' · '),comment:x.commentaire,id:x.id,date:x.date_maj}));DATA.projects.filter(x=>x.odj).forEach(x=>items.push({owner:x.odj,type:'Projet',name:x.nom_projet,status:x.priorite,project:'',comment:x.commentaires,id:x.id,date:x.date_projet}));if(odjView==='table'){$('odjView').innerHTML=`<div class="tablebox"><table><thead><tr><th>Responsable</th><th>Type</th><th>Sujet</th><th>Statut / priorité</th><th>Projet cible</th><th>Commentaire</th></tr></thead><tbody>${items.map(x=>{const st=x.type==='Prospect'?statusObj(x.status):null;return `<tr><td><b>${esc(ODJN[x.owner]||x.owner)}</b></td><td>${x.type}</td><td class="click" data-ui-action="${x.type==='Prospect'?'prospect':'project'}" data-id="${x.id}">${esc(x.name)}</td><td>${st?`<span class="badge statusbadge" style="--c:${st.c}">${esc(st.l)}</span>`:esc(x.status||'—')}</td><td>${esc(x.project||'—')}</td><td>${esc(x.comment||'')}</td></tr>`}).join('')}</tbody></table></div>`;return}$('odjView').innerHTML=`<div class="odjcols">${people.map(o=>`<div class="odjcol"><h3>${esc(ODJN[o])} <span class="badge">${items.filter(x=>x.owner===o).length}</span></h3>${items.filter(x=>x.owner===o).map(x=>{const st=x.type==='Prospect'?statusObj(x.status):{c:'#64748b'};return `<div class="odjitem" style="--status:${st.c}" data-ui-action="${x.type==='Prospect'?'prospect':'project'}" data-id="${x.id}"><span class="typepill">${x.type}</span><b>${esc(x.name)}</b><div>${x.type==='Prospect'?`<span class="badge statusbadge" style="--c:${st.c}">${esc(statusObj(x.status).l)}</span>`:esc(x.status||'')}</div>${x.project?`<div class="meta">${esc(x.project)}</div>`:''}<div class="comment">${esc(x.comment||'Aucun commentaire')}</div></div>`}).join('')||'<p class="meta">Aucun élément</p>'}</div>`).join('')}</div>`}
function renderSourcing(){if(!$('sourceRows'))return;const q=norm($('sourceQ').value),src=norm($('sourceName').value),state=$('sourceState').value;const arr=DATA.sourcing.filter(x=>(!q||norm(JSON.stringify(x)).includes(q))&&(!src||norm(x.source)===src)&&(!state||(state==='open'?!x.importe:x.importe)));$('sourceRows').innerHTML=arr.map(x=>`<tr><td>${esc(x.source||'')}</td><td><b>${esc(x.nom_cible)}</b></td><td style="max-width:500px"><div class="preview">${esc(Object.entries(x.donnees||{}).slice(0,8).map(([k,v])=>`${k}: ${v}`).join(' · '))}</div></td><td>${x.importe?'<span class="badge statusbadge" style="--c:var(--green)">Importé</span>':'<span class="badge">À qualifier</span>'}</td><td>${x.importe?'':`<button class="btn primary" data-ui-action="sourcing-to-crm" data-id="${x.id}">+ CRM</button>`}</td></tr>`).join('')}
async function sourceToCRM(id){
  const projects=activeProjects().slice().sort((a,b)=>String(a.nom_projet||'').localeCompare(String(b.nom_projet||''),'fr',{sensitivity:'base'}));
  const ids=await askMultiProjectChoice('Ajouter au CRM','Sélectionne un ou plusieurs projets actifs (optionnel) :',projects);
  if(ids===null)return;
  try{await api('/api/sourcing/to-crm',{method:'POST',body:JSON.stringify({id,projet_ids:ids})});await loadData(true);toast(CFG.messages?.sourceAdded||'Cible ajoutée au CRM')}catch(e){toast(e.message)}
}

function relationMaps(){const r=DATA.relations||{};return {org:new Map((r.organisations||[]).map(x=>[String(x.id),x])),contact:new Map((r.contacts||[]).map(x=>[String(x.id),x])),links:r.rdv_contacts||[]}}
function relationLabel(s){return ({realise:'Réalisé',planifie:'Planifié',annule:'Annulé',a_qualifier:'À qualifier',ignore:'Ignoré'})[s]||s||'À qualifier'}
function relationOrgLabel(s){return ({a_qualifier:'À qualifier',prospect:'Prospect',partenaire:'Partenaire',ecosysteme:'Écosystème',prestataire:'Prestataire',institutionnel:'Institutionnel',ignorer:'Ignorer'})[s]||s||'À qualifier'}
function relationSortMark(state,key){return state.key===key?`<span class="sortmark">${state.dir===1?'▲':'▼'}</span>`:''}
function relationOrgOptions(current='a_qualifier'){return ['a_qualifier','prospect','partenaire','ecosysteme','prestataire','institutionnel','ignorer'].map(v=>`<option value="${v}" ${current===v?'selected':''}>${relationOrgLabel(v)}</option>`).join('')}
function relationRdvOptions(current='a_qualifier'){return ['a_qualifier','realise','planifie','annule','ignore'].map(v=>`<option value="${v}" ${current===v?'selected':''}>${relationLabel(v)}</option>`).join('')}
function relationVal(x,key,maps){if(key==='organisation')return maps.org.get(String(x.organisation_id||''))?.nom||x.organisation_source||'';if(key==='objet')return x.objet||'';if(key==='statut')return x.statut||'';if(key==='lieu')return x.lieu||'';return x[key]||''}
function relationCmp(a,b,key,maps){const av=relationVal(a,key,maps),bv=relationVal(b,key,maps);return String(av).localeCompare(String(bv),'fr',{numeric:true,sensitivity:'base'})}
function toggleRdvSelect(id,on){const scrollState=captureUiScroll();on?selectedRdvIds.add(String(id)):selectedRdvIds.delete(String(id));relationActiveRdvId=String(id);relationAnchorRdvId=String(id);renderRelations();restoreUiScroll(scrollState)}
function selectRdvRange(fromId,toId,additive=false){const a=relationVisibleRdvIds.indexOf(String(fromId)),b=relationVisibleRdvIds.indexOf(String(toId));if(a<0||b<0)return;if(!additive)selectedRdvIds.clear();const lo=Math.min(a,b),hi=Math.max(a,b);for(let i=lo;i<=hi;i++)selectedRdvIds.add(String(relationVisibleRdvIds[i]));}
function focusRelationRdv(id,scroll=true){relationActiveRdvId=String(id);requestAnimationFrame(()=>{const row=document.querySelector(`tr[data-rdvid="${CSS.escape(String(id))}"]`);if(row){row.focus({preventScroll:!scroll});if(scroll)row.scrollIntoView({block:'nearest'})}})}
function relationRowPointerSelect(e,row){if(e.target.closest('input,select,button,a'))return;const id=String(row.dataset.rdvid||'');if(!id)return;const additive=e.metaKey||e.ctrlKey;if(e.shiftKey&&relationAnchorRdvId){selectRdvRange(relationAnchorRdvId,id,additive)}else if(additive){selectedRdvIds.has(id)?selectedRdvIds.delete(id):selectedRdvIds.add(id);relationAnchorRdvId=id}else{selectedRdvIds.clear();selectedRdvIds.add(id);relationAnchorRdvId=id}relationActiveRdvId=id;const scrollState=captureUiScroll();renderRelations();restoreUiScroll(scrollState);focusRelationRdv(id,false)}
function relationKeyboardSelect(e){if(relationView!=='rdv'||!document.getElementById('sec-relations')?.classList.contains('active'))return;if(e.target.closest('input,select,textarea,button,a'))return;const ids=relationVisibleRdvIds;if(!ids.length)return;let idx=Math.max(0,ids.indexOf(String(relationActiveRdvId||'')));if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();ids.forEach(id=>selectedRdvIds.add(String(id)));renderRelations();focusRelationRdv(ids[idx],false);return}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();idx=Math.max(0,Math.min(ids.length-1,idx+(e.key==='ArrowDown'?1:-1)));const id=String(ids[idx]);if(e.shiftKey&&relationAnchorRdvId){selectRdvRange(relationAnchorRdvId,id,e.metaKey||e.ctrlKey);renderRelations()}relationActiveRdvId=id;if(!e.shiftKey)relationAnchorRdvId=id;focusRelationRdv(id,true);return}if(e.key===' '||e.key==='Spacebar'){e.preventDefault();const id=String(relationActiveRdvId||ids[idx]);selectedRdvIds.has(id)?selectedRdvIds.delete(id):selectedRdvIds.add(id);relationAnchorRdvId=id;renderRelations();focusRelationRdv(id,false)}}
function updateRelationBulkBar(){const bar=$('relationBulkBar');if(!bar)return;bar.classList.toggle('hidden',relationView!=='rdv');const n=selectedRdvIds.size;$('relationSelectionCount').textContent=`${n} RDV sélectionné${n>1?'s':''}`;['clearRdvSelection','bulkRdvRealise','bulkRdvPlanifie','bulkRdvAnnule','bulkRdvIgnore'].forEach(id=>{if($(id))$(id).disabled=!n})}
function relationYearOptions(){const el=$('relationYear');if(!el)return;const cur=el.value;const years=[...new Set((DATA.relations?.rdv||[]).map(x=>String(x.date_rdv||'').slice(0,4)).filter(x=>/^\d{4}$/.test(x)))].sort().reverse();el.innerHTML='<option value="">Toutes années</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');if(years.includes(cur))el.value=cur}
function renderRelations(){
 const r=DATA.relations||{};
 if(!r.ready){$('relationsMigration').classList.remove('hidden');$('relationsMigration').innerHTML='<h3>Activation nécessaire</h3><p>Exécute une seule fois <b>MIGRATION_RELATIONS_RDV.sql</b> dans Supabase. Cette migration est additive : elle ne supprime ni ne modifie les prospects, projets ou sourcing existants.</p>';$('relationsKpis').innerHTML='';$('relationsView').innerHTML='';updateRelationBulkBar();return}
 $('relationsMigration').classList.add('hidden');relationYearOptions();
 const maps=relationMaps(),today=new Date(),q=norm($('relationQ')?.value||''),state=$('relationState')?.value||'',year=$('relationYear')?.value||'',mode=$('relationDormant')?.value||'',orgState=$('relationOrgStatus')?.value||'';
 const allRdv=r.rdv||[];
 const filteredRdvs=allRdv.filter(x=>(!state||x.statut===state)&&(!year||String(x.date_rdv||'').startsWith(year)));
 const orgStats=(r.organisations||[]).map(o=>{
   const all=allRdv.filter(x=>String(x.organisation_id||'')===String(o.id));
   const realised=all.filter(x=>x.statut==='realise');
   const visible=filteredRdvs.filter(x=>String(x.organisation_id||'')===String(o.id));
   const lastAll=all.filter(x=>x.statut!=='ignore').map(x=>x.date_rdv).filter(Boolean).sort().pop()||'';
   const lastRealised=realised.map(x=>x.date_rdv).filter(Boolean).sort().pop()||'';
   const referenceDate=lastRealised||lastAll;
   const days=referenceDate?Math.floor((today-new Date(referenceDate+'T12:00:00'))/86400000):99999;
   const cids=new Set((r.rdv_contacts||[]).filter(l=>all.some(x=>String(x.id)===String(l.rdv_id))).map(l=>String(l.contact_id)));
   const contacts=[...cids].map(id=>maps.contact.get(id)).filter(Boolean);
   const commercial=['a_qualifier','prospect','partenaire'].includes(o.statut_relation||'a_qualifier');
   const dormant=commercial&&realised.length>0&&days>180;
   return {...o,visible,all,realised,last:referenceDate,lastRealised,days,contacts,dormant};
 }).filter(o=>{const text=norm(JSON.stringify(o));return (!q||text.includes(q))&&(!orgState||(o.statut_relation||'a_qualifier')===orgState)&&(!mode||(mode==='dormant'?o.dormant:!o.prospect_id))});
 const realised=allRdv.filter(x=>x.statut==='realise').length,unq=allRdv.filter(x=>x.statut==='a_qualifier').length,dormant=orgStats.filter(x=>x.dormant).length;
 $('relationsKpis').innerHTML=`<div class="kpi"><b>${r.organisations.length}</b><span>Organisations</span></div><div class="kpi"><b>${allRdv.length}</b><span>RDV importés</span></div><div class="kpi"><b>${realised}</b><span>RDV qualifiés réalisés</span></div><div class="kpi"><b>${unq}</b><span>À qualifier</span></div><div class="kpi"><b>${dormant}</b><span>À réactiver</span></div>`;
 if(relationView==='orgs'){
   let list=orgStats.slice().sort((a,b)=>{let av,bv;switch(relationOrgSort.key){case'nom':av=a.nom;bv=b.nom;break;case'count':av=a.all.length;bv=b.all.length;break;case'last':av=a.last;bv=b.last;break;case'contacts':av=a.contacts.length;bv=b.contacts.length;break;case'statut':av=a.statut_relation;bv=b.statut_relation;break;default:av=a.last;bv=b.last}return String(av||'').localeCompare(String(bv||''),'fr',{numeric:true,sensitivity:'base'})*relationOrgSort.dir});
   $('relationsView').innerHTML=`<div class="tablebox"><table><thead><tr><th class="relation-sort" data-relorgsort="nom">Organisation${relationSortMark(relationOrgSort,'nom')}</th><th class="relation-sort" data-relorgsort="count">RDV${relationSortMark(relationOrgSort,'count')}</th><th class="relation-sort" data-relorgsort="last">Dernier échange${relationSortMark(relationOrgSort,'last')}</th><th class="relation-sort" data-relorgsort="contacts">Contacts${relationSortMark(relationOrgSort,'contacts')}</th><th class="relation-sort" data-relorgsort="statut">Type${relationSortMark(relationOrgSort,'statut')}</th><th>CRM</th><th></th></tr></thead><tbody>${list.map(o=>`<tr class="${(o.statut_relation||'')==='ignorer'?'relation-row-ignored':''}"><td><b>${esc(o.nom)}</b><div class="meta">${esc(o.domaine||o.organisation_source||'')}</div></td><td>${o.all.length}<div class="meta">${o.realised.length} réalisé${o.realised.length>1?'s':''}</div></td><td>${fmtDate(o.last)}${o.dormant?'<div class="relation-alert">À réactiver</div>':''}</td><td>${o.contacts.slice(0,3).map(c=>esc(c.email)).join('<br>')||'—'}</td><td><select class="relation-org-select" data-ui-change="organisation-status" data-id="${o.id}">${relationOrgOptions(o.statut_relation||'a_qualifier')}</select></td><td>${o.prospect_id?'<span class="badge">Prospect lié</span>':'<span class="meta">Non lié</span>'}</td><td>${o.prospect_id?'':`<button class="btn" data-ui-action="relation-to-prospect" data-id="${o.id}">+ Prospect</button>`}</td></tr>`).join('')||'<tr><td colspan="7">Aucun résultat</td></tr>'}</tbody></table></div>`;
 }else{
   let list=filteredRdvs.filter(x=>{const org=maps.org.get(String(x.organisation_id||''));const text=norm(JSON.stringify([x,org]));return (!q||text.includes(q))&&(!orgState||(org?.statut_relation||'a_qualifier')===orgState)&&(!mode||(mode==='unlinked'?!org?.prospect_id:true))});
   list.sort((a,b)=>relationCmp(a,b,relationRdvSort.key,maps)*relationRdvSort.dir);relationVisibleRdvIds=list.map(x=>String(x.id));
   $('relationsView').innerHTML=`<div class="tablebox"><table><thead><tr><th style="width:42px"><input class="relation-select" type="checkbox" aria-label="Sélectionner tous les RDV visibles" ${list.length&&list.every(x=>selectedRdvIds.has(String(x.id)))?'checked':''} data-ui-change="rdv-toggle-all"></th><th class="relation-sort" data-relrdvsort="date_rdv">Date${relationSortMark(relationRdvSort,'date_rdv')}</th><th class="relation-sort" data-relrdvsort="organisation">Organisation${relationSortMark(relationRdvSort,'organisation')}</th><th class="relation-sort" data-relrdvsort="objet">Objet${relationSortMark(relationRdvSort,'objet')}</th><th class="relation-sort" data-relrdvsort="statut">Statut${relationSortMark(relationRdvSort,'statut')}</th><th class="relation-sort" data-relrdvsort="lieu">Lieu${relationSortMark(relationRdvSort,'lieu')}</th></tr></thead><tbody>${list.map(x=>{const o=maps.org.get(String(x.organisation_id||''));return `<tr tabindex="0" data-rdvid="${esc(String(x.id))}" class="relation-rdv-row ${selectedRdvIds.has(String(x.id))?'selected':''} ${String(relationActiveRdvId||'')===String(x.id)?'active-row':''} ${x.statut==='ignore'?'relation-row-ignored':''}"><td><input class="relation-select" type="checkbox" ${selectedRdvIds.has(String(x.id))?'checked':''} data-ui-change="rdv-toggle" data-id="${x.id}"></td><td>${fmtDate(x.date_rdv)}</td><td>${esc(o?.nom||x.organisation_source||'À qualifier')}</td><td><b>${esc(x.objet||'')}</b></td><td><select class="relation-status-select" data-ui-change="rdv-status" data-id="${x.id}">${relationRdvOptions(x.statut)}</select></td><td>${esc(x.lieu||'—')}</td></tr>`}).join('')||'<tr><td colspan="6">Aucun résultat</td></tr>'}</tbody></table></div>`;
 }
 updateRelationBulkBar();
}
function selectVisibleRdvRows(){const st=captureUiScroll();relationVisibleRdvIds.forEach(id=>selectedRdvIds.add(String(id)));renderRelations();restoreUiScroll(st)}
function clearVisibleRdvRows(){const st=captureUiScroll();relationVisibleRdvIds.forEach(id=>selectedRdvIds.delete(String(id)));renderRelations();restoreUiScroll(st)}
function selectPastVisibleRdvRows(){const st=captureUiScroll();const today=window.CRM_BRIDGE.localDay(),byId=new Map((DATA.relations?.rdv||[]).map(x=>[String(x.id),x]));relationVisibleRdvIds.forEach(id=>{const x=byId.get(String(id));if(x?.date_rdv&&x.date_rdv<=today)selectedRdvIds.add(String(id))});renderRelations();restoreUiScroll(st)}
async function setRdvStatus(id,statut){try{await api('/api/relations/rdv/status',{method:'POST',body:JSON.stringify({id,statut})});await loadData(true);renderRelations()}catch(e){toast(e.message)}}
async function bulkSetRdvStatus(statut){const ids=[...selectedRdvIds];if(!ids.length)return;const label=relationLabel(statut);if((statut==='annule'||statut==='ignore')&&!await askConfirm(`${label} les RDV sélectionnés ?`,`${ids.length} rendez-vous seront marqués « ${label} ». Les données restent conservées.`,label,statut==='ignore'))return;const btnMap={realise:'bulkRdvRealise',planifie:'bulkRdvPlanifie',annule:'bulkRdvAnnule',ignore:'bulkRdvIgnore'},btn=$(btnMap[statut]);if(btn)btn.disabled=true;try{const out=await api('/api/relations/rdv/bulk-status',{method:'POST',body:JSON.stringify({ids,statut})});selectedRdvIds.clear();await loadData(true);renderRelations();toast(`${out.updated||ids.length} RDV → ${label}`)}catch(e){toast(e.message)}finally{updateRelationBulkBar()}}
async function setOrganisationStatus(id,statut){try{await api('/api/relations/organisation/status',{method:'POST',body:JSON.stringify({id,statut})});await loadData(true);renderRelations()}catch(e){toast(e.message)}}
async function createProspectFromOrg(id){try{await api('/api/relations/create-prospect',{method:'POST',body:JSON.stringify({organisation_id:id})});await loadData(true);renderRelations();toast('Prospect créé et relation liée')}catch(e){toast(e.message)}}
async function importRdvHistory(){
  if(!DATA.relations?.ready)return toast('Exécute d’abord la migration Supabase');
  try{
    $('importRdvHistory').disabled=true;$('importRdvHistory').textContent='Import en cours…';
    const out=await api('/api/relations/import-history',{method:'POST',body:'{}'});
    await loadData(true);renderRelations();
    const s=out.stats||{};const reasons=out.ignored_reasons||{};
    const report=$('relationsImportReport');
    if(report){
      report.classList.remove('hidden');
      report.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h3 style="margin:0 0 6px">Bilan du dernier import</h3><div class="meta">Import non destructif · UID calendrier anti-doublon</div></div><button class="btn" data-ui-action="dismiss-relation-report">Fermer</button></div><div class="grid3" style="margin-top:12px"><div class="statrow"><span>Événements analysés</span><b>${s.analysed||0}</b></div><div class="statrow"><span>RDV ajoutés</span><b>${s.inserted||0}</b></div><div class="statrow"><span>RDV actualisés</span><b>${s.updated||0}</b></div><div class="statrow"><span>Organisation identifiée</span><b>${s.with_organisation||0}</b></div><div class="statrow"><span>À qualifier sans organisation</span><b>${s.without_organisation||0}</b></div><div class="statrow"><span>Organisation ambiguë</span><b>${s.ambiguous_organisation||0}</b></div><div class="statrow"><span>Ignorés</span><b>${s.ignored||0}</b></div><div class="statrow"><span>Erreurs</span><b>${s.errors||0}</b></div><div class="statrow"><span>Contacts créés</span><b>${s.contacts_created||0}</b></div></div>${Object.keys(reasons).length?`<details style="margin-top:12px"><summary><b>Pourquoi certains événements ont été ignorés</b></summary><div style="margin-top:8px">${Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="statrow"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div></details>`:''}${(out.error_examples||[]).length?`<details style="margin-top:10px"><summary><b>Erreurs à contrôler (${out.error_examples.length} exemples)</b></summary><div class="meta" style="margin-top:8px">${out.error_examples.map(x=>`${esc(x.date||'')} · ${esc(x.objet||'')} — ${esc(x.erreur||'')}`).join('<br>')}</div></details>`:''}`;
    }
    toast(`${s.inserted||0} RDV ajoutés · ${s.updated||0} actualisés · ${s.ignored||0} ignorés`);
  }catch(e){toast(e.message)}finally{$('importRdvHistory').disabled=false;$('importRdvHistory').textContent='Importer / actualiser l’historique RDV'}
}
function renderAdmin(){$('adminUser').textContent=$('userEmail').textContent;$('adminProspects').textContent=DATA.prospects.length;$('adminProjects').textContent=DATA.projects.length;$('adminSourcing').textContent=DATA.sourcing.length}
function openDrawer(){$('drawer').classList.add('open')}function closeDrawer(){$('drawer').classList.remove('open')}
async function inspectFile(file){throw new Error('L’import Excel V5 dépendait du serveur Python ; il reste indisponible sur Cloudflare. Aucune donnée n’a été modifiée.')}
// events
applyUIConfig();
/* ========================================================================== 
   MODULE PARTENARIATS V5
   - Conventions et engagements contractuels
   - Taches operationnelles en Kanban + liste
   - Import JSON de convention, strictement additif
   - Export ICS cible pour Outlook
   ========================================================================== */
let partnershipViewMode='partners';
let partnershipTaskView='kanban';
let partnershipFacet={service:'',device:''};
let partnershipTaskDragging=false;
const PART_TASK_STATUSES=[
 {v:'a_faire',l:'À faire'},
 {v:'en_cours',l:'En cours'},
 {v:'bloque',l:'Bloqué'},
 {v:'realise',l:'Réalisé'},
 {v:'non_applicable',l:'N/A'}
];
const partList=v=>Array.isArray(v)?v:(v?String(v).split(',').map(x=>x.trim()).filter(Boolean):[]);
const partLines=v=>Array.isArray(v)?v:(v?String(v).split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[]);
function partRoot(){return DATA.partnerships||{ready:false,actions_ready:false,v5_ready:false,services:[],partenariats:[],engagements:[],actions:[],realisations:[]}}
function partServices(){return partRoot().services||[]}
function partService(code){return partServices().find(s=>s.code===code)||{code:code||'',nom:code||'Autre',ordre:999}}
function partEngagementsFor(p){return (partRoot().engagements||[]).filter(e=>String(e.partenariat_id||'')===String(p.id)||e.partenaire_source_key===p.source_key)}
function partContractEngagementsFor(p){return partEngagementsFor(p).filter(e=>e.classification!=='pilotage_interne')}
function partActionsFor(p){return (partRoot().actions||[]).filter(a=>String(a.partenariat_id||'')===String(p.id)||a.partenaire_source_key===p.source_key)}
function partActionEngagement(a){return (partRoot().engagements||[]).find(e=>String(e.id||'')===String(a.engagement_id||'')||(a.engagement_source_key&&e.source_key===a.engagement_source_key))}
function partRealisationsFor(e){return (partRoot().realisations||[]).filter(r=>String(r.engagement_id)===String(e.id))}
function partStatus(p){
 if(p.statut_convention==='a_regulariser')return {key:'issue',label:'À régulariser',cls:'bad'};
 if(p.statut_convention==='echeance_depassee_a_verifier')return {key:'issue',label:'Échéance dépassée',cls:'bad'};
 const now=new Date(),end=p.date_fin?new Date(p.date_fin+'T12:00:00'):null;
 if(end&&!isNaN(end)&&end<now)return {key:'issue',label:'Échue',cls:'bad'};
 if(!end)return {key:'warning',label:'Active · date à confirmer',cls:'warn'};
 const days=Math.ceil((end-now)/86400000);if(days<=120)return {key:'warning',label:`Échéance ${Math.max(0,days)} j`,cls:'warn'};
 return {key:'active',label:'Active',cls:'good'};
}
function partStatusBadge(p){const s=partStatus(p);return `<span class="part-badge ${s.cls}">${esc(s.label)}</span>`}
function partProgress(p){const aa=partActionsFor(p);if(aa.length)return Math.round(aa.reduce((n,a)=>n+(['realise','non_applicable'].includes(a.statut)?100:Number(a.progression)||0),0)/aa.length);const e=partContractEngagementsFor(p).filter(x=>x.partie==='eurasante');if(!e.length)return 0;return Math.round(e.reduce((n,x)=>n+(['realise','non_applicable'].includes(x.statut)?100:Number(x.progression)||0),0)/e.length)}
function partMoneyText(p){return (p.montants||[]).map(m=>[m.montant==null?'':m.montant,m.fiscalite||'',m.annee||m.periode||'',m.nature||'',m.sens||'',m.note||''].join(' | ')).join('\n')}
function parsePartMoney(text){return String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{const [amount,tax,period,nature,sens,note]=line.split('|').map(x=>x.trim());const n=amount===''?null:Number(String(amount).replace(',','.'));return {montant:Number.isFinite(n)?n:null,fiscalite:tax||'',annee:/^\d{4}$/.test(period)?Number(period):null,periode:/^\d{4}$/.test(period)?null:(period||null),nature:nature||'numéraire',sens:sens||'partenaire_vers_eurasante',note:note||''}})}
function partMoneySummary(p){const a=p.montants||[];if(!a.length)return '—';return a.slice(0,3).map(m=>m.montant==null?(m.note||'Commission'):`${Number(m.montant).toLocaleString('fr-FR')} € ${m.fiscalite||''}${m.annee?' · '+m.annee:m.periode?' · '+m.periode:''}`).join(' · ')+(a.length>3?' …':'')}
function partTaskDate(a){return a.date_planification||a.echeance||''}
function partTaskLate(a){const d=partTaskDate(a);return !!d&&!['realise','non_applicable'].includes(a.statut)&&d<window.CRM_BRIDGE.localDay()}
function partTaskSchedule(a){const d=partTaskDate(a);if(!d)return 'Aucune date';const prefix=a.date_planification?'Planifié':'Échéance';return `${prefix} ${fmtDate(d)}${a.heure_planification?' · '+esc(String(a.heure_planification).slice(0,5)):''}`}
function partTaskStatusLabel(s){return PART_TASK_STATUSES.find(x=>x.v===s)?.l||s||'À faire'}
function partFilterRows(){
 const d=partRoot(),q=norm($('partnershipQ')?.value),st=$('partnershipStatus')?.value||'',svc=$('partnershipService')?.value||partnershipFacet.service||'',dev=$('partnershipDevice')?.value||partnershipFacet.device||'',ex=$('partnershipExclusive')?.value||'',es=$('partnershipEngStatus')?.value||'',sort=$('partnershipSort')?.value||'end';
 let arr=(d.partenariats||[]).filter(p=>{const eng=partEngagementsFor(p),acts=partActionsFor(p);if(q&&!norm(JSON.stringify(p)+' '+JSON.stringify(eng)+' '+JSON.stringify(acts)).includes(q))return false;if(st&&partStatus(p).key!==st)return false;if(svc&&!eng.some(e=>e.service_code===svc)&&!acts.some(a=>a.service_code===svc))return false;if(dev&&!partList(p.dispositifs).includes(dev)&&!eng.some(e=>partList(e.dispositifs).includes(dev)))return false;if(ex==='yes'&&p.exclusif!==true)return false;if(ex==='no'&&p.exclusif!==false)return false;if(es&&!eng.some(e=>e.statut===es)&&!acts.some(a=>a.statut===es||(es==='alerte'&&a.statut==='bloque')))return false;return true});
 arr.sort((a,b)=>sort==='az'?String(a.partenaire).localeCompare(String(b.partenaire),'fr'):sort==='progress'?partProgress(a)-partProgress(b):String(a.date_fin||'9999-99-99').localeCompare(String(b.date_fin||'9999-99-99'))||String(a.partenaire).localeCompare(String(b.partenaire),'fr'));return arr;
}
function fillPartnershipFilters(){const d=partRoot();if(!d.ready)return;const sv=$('partnershipService'),dv=$('partnershipDevice');if(sv){const cur=sv.value;sv.innerHTML='<option value="">Tous services Eurasanté</option>'+partServices().map(s=>`<option value="${esc(s.code)}">${esc(s.nom)}</option>`).join('');sv.value=[...sv.options].some(o=>o.value===cur)?cur:''}if(dv){const cur=dv.value,vals=uniqueLabels((d.partenariats||[]).flatMap(p=>partList(p.dispositifs)).concat((d.engagements||[]).flatMap(e=>partList(e.dispositifs))));dv.innerHTML='<option value="">Tous dispositifs</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');dv.value=[...dv.options].some(o=>o.value===cur)?cur:''}}
function renderPartnershipFacets(){const d=partRoot(),box=$('partnershipFacets');if(!box||!d.ready)return;const serviceCounts={},deviceCounts={};(d.engagements||[]).forEach(e=>{if(e.service_code)serviceCounts[e.service_code]=(serviceCounts[e.service_code]||0)+1;partList(e.dispositifs).forEach(x=>deviceCounts[x]=(deviceCounts[x]||0)+1)});(d.actions||[]).forEach(a=>{if(a.service_code)serviceCounts[a.service_code]=(serviceCounts[a.service_code]||0)+1});(d.partenariats||[]).forEach(p=>partList(p.dispositifs).forEach(x=>deviceCounts[x]=(deviceCounts[x]||0)+1));box.innerHTML=`<div class="part-facet-card"><h4>Services Eurasanté</h4><button class="part-facet ${!partnershipFacet.service?'active':''}" data-partfacet="service" data-value=""><span>Tous</span><b>${(d.partenariats||[]).length}</b></button>${partServices().filter(s=>serviceCounts[s.code]).map(s=>`<button class="part-facet ${partnershipFacet.service===s.code?'active':''}" data-partfacet="service" data-value="${esc(s.code)}"><span>${esc(s.nom)}</span><b>${serviceCounts[s.code]}</b></button>`).join('')}</div><div class="part-facet-card"><h4>Dispositifs</h4><button class="part-facet ${!partnershipFacet.device?'active':''}" data-partfacet="device" data-value=""><span>Tous</span><b>${(d.partenariats||[]).length}</b></button>${Object.entries(deviceCounts).sort((a,b)=>a[0].localeCompare(b[0],'fr')).map(([x,n])=>`<button class="part-facet ${partnershipFacet.device===x?'active':''}" data-partfacet="device" data-value="${esc(x)}"><span>${esc(x)}</span><b>${n}</b></button>`).join('')}</div><div class="part-facet-card part-facet-info"><h4>V5 · principe</h4><p><b>Convention</b> = source contractuelle. <b>Engagement</b> = obligation extraite. <b>Tâche</b> = action opérationnelle à planifier, affecter, réaliser et prouver. Le Kanban ne modifie jamais la portée juridique du contrat.</p></div>`}
function renderPartnershipKpis(rows){const all=rows||partFilterRows(),acts=all.flatMap(partActionsFor),issues=all.filter(p=>partStatus(p).key!=='active').length,open=acts.filter(a=>!['realise','non_applicable'].includes(a.statut)).length,late=acts.filter(partTaskLate).length,blocked=acts.filter(a=>a.statut==='bloque').length,done=acts.filter(a=>a.statut==='realise').length;$('partnershipKpis').innerHTML=`<div class="kpi"><b>${all.length}</b><span>Conventions affichées</span></div><div class="kpi"><b>${issues}</b><span>Conventions à surveiller</span></div><div class="kpi"><b>${open}</b><span>Tâches ouvertes</span></div><div class="kpi"><b>${late}</b><span>Tâches en retard</span></div><div class="kpi"><b>${blocked}</b><span>Tâches bloquées</span></div><div class="kpi"><b>${done}</b><span>Tâches réalisées</span></div>`}
function renderPartnerships(){
 const d=partRoot(),migration=$('partnershipMigration'),view=$('partnershipView');if(!migration||!view)return;
 if(!d.ready){migration.classList.remove('hidden');migration.innerHTML=`<h3>Initialiser le module Partenariats</h3><p>Exécuter <b>MIGRATION_PARTENARIATS_V4.sql</b>. La migration est additive et ne supprime aucune donnée existante.</p>`;$('partnershipKpis').innerHTML='';$('partnershipFacets').innerHTML='';view.innerHTML='';return}
 if(d.actions_ready===false){migration.classList.remove('hidden');migration.innerHTML=`<h3>Activer les tâches de partenariat</h3><p>Exécuter <b>MIGRATION_PARTENARIATS_V41_ACTIONS.sql</b>. Aucune donnée existante n'est écrasée.</p>`}
 else if(d.v5_ready===false){migration.classList.remove('hidden');migration.innerHTML=`<h3>Compléter la V5</h3><p>Le Kanban fonctionne déjà. Pour planifier une tâche avec date/heure/durée/lieu et produire des rendez-vous Outlook précis, exécuter <b>MIGRATION_PARTENARIATS_V5.sql</b>. Ce script ajoute seulement des colonnes.</p>`}
 else migration.classList.add('hidden');
 fillPartnershipFilters();renderPartnershipFacets();const rows=partFilterRows();renderPartnershipKpis(rows);document.querySelectorAll('[data-partview]').forEach(b=>b.classList.toggle('active',b.dataset.partview===partnershipViewMode));
 if(partnershipViewMode==='engagements')return renderPartnershipEngagements(rows);if(partnershipViewMode==='tasks'||partnershipViewMode==='actions')return renderPartnershipTasks(rows);if(partnershipViewMode==='services')return renderPartnershipServices(rows);
 if(!rows.length){view.innerHTML=`<div class="card"><p class="meta">Aucune convention ne correspond aux filtres.</p></div>`;return}
 view.innerHTML=`<div class="part-card-grid">${rows.map(p=>{const acts=partActionsFor(p),open=acts.filter(a=>!['realise','non_applicable'].includes(a.statut)).length,late=acts.filter(partTaskLate).length,pr=partProgress(p);return `<article class="part-card" data-ui-action="partnership-detail" data-id="${p.id}"><div class="part-card-top"><div><h3>${esc(p.partenaire)}</h3><span class="meta">${esc(p.type_partenariat||p.secteur||'Partenariat')}</span></div>${partStatusBadge(p)}</div><div class="part-tags">${p.exclusif===true?'<span class="part-badge info">Exclusif</span>':p.exclusif===false?'<span class="part-badge">Non exclusif</span>':''}${partList(p.dispositifs).slice(0,4).map(x=>`<span class="part-badge">${esc(x)}</span>`).join('')}</div><p>${esc(p.resume_operationnel||p.expertise||p.objet||'')}</p><div class="part-progress"><i style="width:${pr}%"></i></div><div class="part-card-foot"><span>${pr}% · ${open} tâche${open>1?'s':''} ouverte${open>1?'s':''}${late?` · <b>${late} en retard</b>`:''}</span><span>Fin ${fmtDate(p.date_fin)}</span></div><div class="meta part-money">${esc(partMoneySummary(p))}</div></article>`}).join('')}</div>`;
}
function renderPartnershipEngagements(rows){let eng=rows.flatMap(partEngagementsFor).filter(e=>e.classification!=='pilotage_interne'),svc=$('partnershipService').value||partnershipFacet.service||'',es=$('partnershipEngStatus').value||'';if(svc)eng=eng.filter(e=>e.service_code===svc);if(es&&es!=='bloque')eng=eng.filter(e=>e.statut===es);eng.sort((a,b)=>(partService(a.service_code).ordre-partService(b.service_code).ordre)||String(a.echeance||'9999').localeCompare(String(b.echeance||'9999')));const pmap=new Map((partRoot().partenariats||[]).map(p=>[String(p.id),p]));$('partnershipView').innerHTML=`<div class="card"><div class="section-head compact"><div><h3>${eng.length} engagements contractuels</h3><div class="meta">Les engagements restent distincts des tâches opérationnelles.</div></div></div><div class="tablebox"><table class="part-eng-table"><thead><tr><th>Partenaire</th><th>Partie</th><th>Service</th><th>Engagement</th><th>Cible</th><th>Échéance</th><th>Nature</th><th>Statut</th><th>Progression</th><th>Réalisations</th></tr></thead><tbody>${eng.map(e=>{const p=pmap.get(String(e.partenariat_id)),real=partRealisationsFor(e).filter(r=>r.statut==='realise'),qty=real.reduce((n,r)=>n+(Number(r.quantite)||1),0);return `<tr><td class="click" data-ui-action="partnership-detail" data-id="${p?.id||''}"><b>${esc(p?.partenaire||'—')}</b></td><td>${e.partie==='eurasante'?'<b>Eurasanté</b>':e.partie==='partenaire'?'Partenaire':'Mutuel'}</td><td>${esc(partService(e.service_code).nom)}</td><td><b>${esc(e.titre)}</b><div class="meta">${esc(e.description||'')}</div></td><td>${e.quantite_cible!=null?`${esc(e.quantite_cible)} ${esc(e.unite||'')}`:'—'}<div class="meta">${esc(e.frequence||'')}</div></td><td>${fmtDate(e.echeance)}</td><td>${e.classification==='clause'?'<span class="part-badge info">Clause</span>':'<span class="part-badge warn">Pilotage</span>'}</td><td><select class="part-inline-select" data-ui-change="engagement-status" data-id="${e.id}"><option value="a_faire" ${e.statut==='a_faire'?'selected':''}>À faire</option><option value="en_cours" ${e.statut==='en_cours'?'selected':''}>En cours</option><option value="realise" ${e.statut==='realise'?'selected':''}>Réalisé</option><option value="alerte" ${e.statut==='alerte'?'selected':''}>Alerte</option><option value="non_applicable" ${e.statut==='non_applicable'?'selected':''}>N/A</option></select></td><td><div class="part-progress small"><i style="width:${Number(e.progression)||0}%"></i></div><input class="part-progress-input" type="number" min="0" max="100" value="${Number(e.progression)||0}" data-ui-change="engagement-progress" data-id="${e.id}"> %</td><td><button class="btn mini-btn" data-ui-action="realisation-add" data-id="${e.id}" data-partner="${p?.id||''}">+ Réalisation</button><div class="meta">${real.length} saisie${real.length>1?'s':''}${e.quantite_cible!=null?` · ${qty}/${e.quantite_cible}`:''}</div></td></tr>`}).join('')}</tbody></table></div></div>`}
function partTasksForRows(rows){let acts=rows.flatMap(partActionsFor),svc=$('partnershipService')?.value||partnershipFacet.service||'',es=$('partnershipEngStatus')?.value||'';if(svc)acts=acts.filter(a=>a.service_code===svc);if(es)acts=acts.filter(a=>a.statut===es||(es==='alerte'&&a.statut==='bloque'));acts.sort((a,b)=>String(partTaskDate(a)||'9999-99-99').localeCompare(String(partTaskDate(b)||'9999-99-99'))||(partService(a.service_code).ordre-partService(b.service_code).ordre)||String(a.titre).localeCompare(String(b.titre),'fr'));return acts}
function partTaskCard(a,p){const late=partTaskLate(a),e=partActionEngagement(a),date=partTaskDate(a);return `<article class="part-task-card ${late?'late':''}" draggable="true" data-part-action-id="${esc(a.id)}" data-ui-action="action-ifnotdrag" data-id="${a.id}" data-partner="${a.partenariat_id}"><div class="part-task-card-head"><b>${esc(a.titre)}</b>${a.priorite==='haute'?'<span class="part-badge bad">Haute</span>':''}</div><div class="part-task-partner">${esc(p?.partenaire||'—')}</div><div class="part-tags"><span class="part-badge">${esc(partService(a.service_code).nom)}</span>${late?'<span class="part-badge bad">En retard</span>':''}${a.preuve?'<span class="part-badge good">Preuve saisie</span>':''}</div><p>${esc(a.description||'')}</p><div class="part-task-meta"><span>${date?partTaskSchedule(a):'Sans date'}</span><span>${esc(a.responsable||'À affecter')}</span></div>${e?`<div class="part-task-eng">↳ ${esc(e.titre)}</div>`:''}<div class="part-progress"><i style="width:${Number(a.progression)||0}%"></i></div></article>`}
function renderPartnershipTasks(rows){const acts=partTasksForRows(rows),pmap=new Map((partRoot().partenariats||[]).map(p=>[String(p.id),p]));const tool=`<div class="part-task-tools"><div><h3>${acts.length} tâches</h3><div class="meta">Glisser une carte pour changer son statut. Les modifications sont enregistrées dans Supabase.</div></div><div class="viewtoggle"><button class="btn ${partnershipTaskView==='kanban'?'active':''}" data-taskview="kanban">Kanban</button><button class="btn ${partnershipTaskView==='list'?'active':''}" data-taskview="list">Liste</button><button class="btn" id="globalNewPartTask">+ Nouvelle tâche</button><button class="btn" id="taskIcsExport">⇩ Export ICS ciblé</button></div></div>`;
 if(partnershipTaskView==='list'){$('partnershipView').innerHTML=`<div class="card">${tool}<div class="tablebox"><table class="part-eng-table"><thead><tr><th>Partenaire</th><th>Service</th><th>Tâche</th><th>Engagement sécurisé</th><th>Planification / échéance</th><th>Preuve attendue</th><th>Responsable</th><th>Statut</th><th>Progression</th></tr></thead><tbody>${acts.map(a=>{const p=pmap.get(String(a.partenariat_id)),e=partActionEngagement(a);return `<tr class="${partTaskLate(a)?'part-row-late':''}"><td class="click" data-ui-action="partnership-detail" data-id="${p?.id||''}"><b>${esc(p?.partenaire||'—')}</b></td><td>${esc(partService(a.service_code).nom)}</td><td><b>${esc(a.titre)}</b><div class="meta">${esc(a.description||'')}</div><button class="btn mini-btn" data-ui-action="action" data-id="${a.id}" data-partner="${a.partenariat_id}">Modifier</button></td><td>${e?`<b>${esc(e.titre)}</b><div class="meta">${esc(e.source_reference||'')}</div>`:'<span class="meta">Action transverse</span>'}</td><td>${partTaskSchedule(a)}${partTaskLate(a)?'<div class="relation-alert">En retard</div>':''}</td><td>${esc(a.preuve_attendue||'—')}</td><td>${esc(a.responsable||'À affecter')}</td><td><select class="part-inline-select" data-ui-change="action-status" data-id="${a.id}">${PART_TASK_STATUSES.map(st=>`<option value="${st.v}" ${a.statut===st.v?'selected':''}>${st.l}</option>`).join('')}</select></td><td><div class="part-progress small"><i style="width:${Number(a.progression)||0}%"></i></div><input class="part-progress-input" type="number" min="0" max="100" value="${Number(a.progression)||0}" data-ui-change="action-progress" data-id="${a.id}"> %</td></tr>`}).join('')}</tbody></table></div></div>`}else{$('partnershipView').innerHTML=`<div class="card part-task-shell">${tool}<div class="part-task-kanban">${PART_TASK_STATUSES.map(st=>{const list=acts.filter(a=>a.statut===st.v);return `<section class="part-task-lane" data-part-task-status="${st.v}"><header><span>${esc(st.l)}</span><b>${list.length}</b></header><div class="part-task-drop">${list.map(a=>partTaskCard(a,pmap.get(String(a.partenariat_id)))).join('')||'<div class="part-task-empty">Déposer une tâche ici</div>'}</div></section>`}).join('')}</div></div>`;enablePartnershipTaskDrag()}
 document.querySelectorAll('[data-taskview]').forEach(b=>b.onclick=()=>{partnershipTaskView=b.dataset.taskview;renderPartnerships()});if($('globalNewPartTask'))$('globalNewPartTask').onclick=openGlobalPartActionForm;if($('taskIcsExport'))$('taskIcsExport').onclick=()=>openPartnershipIcsExport();
}
function enablePartnershipTaskDrag(){document.querySelectorAll('[data-part-action-id]').forEach(card=>{card.addEventListener('dragstart',e=>{partnershipTaskDragging=true;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',card.dataset.partActionId);card.classList.add('dragging')});card.addEventListener('dragend',()=>{card.classList.remove('dragging');setTimeout(()=>{partnershipTaskDragging=false},120)})});document.querySelectorAll('[data-part-task-status]').forEach(lane=>{lane.addEventListener('dragover',e=>{e.preventDefault();lane.classList.add('dragover')});lane.addEventListener('dragleave',()=>lane.classList.remove('dragover'));lane.addEventListener('drop',async e=>{e.preventDefault();lane.classList.remove('dragover');const id=e.dataTransfer.getData('text/plain'),status=lane.dataset.partTaskStatus;if(!id||!status)return;await updatePartAction(id,{statut:status,...(['realise','non_applicable'].includes(status)?{progression:100}:{})},{quiet:true});toast(`Tâche → ${partTaskStatusLabel(status)}`)})})}
function renderPartnershipServices(rows){const keys=new Set(rows.map(p=>String(p.id)));const cards=partServices().map(s=>{const e=(partRoot().engagements||[]).filter(x=>keys.has(String(x.partenariat_id))&&x.service_code===s.code&&x.classification!=='pilotage_interne'),a=(partRoot().actions||[]).filter(x=>keys.has(String(x.partenariat_id))&&x.service_code===s.code),open=a.filter(x=>!['realise','non_applicable'].includes(x.statut)).length,late=a.filter(partTaskLate).length,ps=new Set([...e,...a].map(x=>String(x.partenariat_id))).size;return {...s,e,a,open,late,ps}}).filter(x=>x.e.length||x.a.length);$('partnershipView').innerHTML=`<div class="part-service-grid">${cards.map(s=>`<article class="part-service-card" data-ui-action="partnership-service" data-code="${esc(s.code)}"><h3>${esc(s.nom)}</h3><p>${esc(s.description||'')}</p><div class="part-service-stats"><span><b>${s.ps}</b> partenaires</span><span><b>${s.e.length}</b> engagements</span><span><b>${s.open}</b> tâches ouvertes</span><span><b>${s.late}</b> en retard</span></div></article>`).join('')}</div>`}
function setPartnershipService(code){partnershipFacet.service=code;if($('partnershipService'))$('partnershipService').value=code;partnershipViewMode='tasks';renderPartnerships()}
async function updatePartEngagement(id,patch,{quiet=false}={}){try{if(patch.statut&&['realise','non_applicable'].includes(patch.statut)&&patch.progression==null)patch.progression=100;const out=await api('/api/partnership/engagement/update',{method:'POST',body:JSON.stringify({id,...patch})});const row=(partRoot().engagements||[]).find(x=>String(x.id)===String(id));if(row)Object.assign(row,out.row||patch);renderPartnerships();if(!quiet)toast('Engagement mis à jour');return out.row}catch(e){toast(e.message);throw e}}
async function updatePartAction(id,patch,{quiet=false}={}){try{if(patch.statut&&['realise','non_applicable'].includes(patch.statut)&&patch.progression==null)patch.progression=100;const out=await api('/api/partnership/action/update',{method:'POST',body:JSON.stringify({id,...patch})});const row=(partRoot().actions||[]).find(x=>String(x.id)===String(id));if(row)Object.assign(row,out.row||patch);renderPartnerships();if(!quiet)toast('Tâche mise à jour');return out.row}catch(e){toast(e.message);throw e}}
function partEngagementCard(e){const real=partRealisationsFor(e).filter(r=>r.statut==='realise');return `<div class="part-eng-card"><div class="part-eng-top"><b>${esc(e.titre)}</b><span class="part-badge ${e.statut==='alerte'?'bad':e.statut==='realise'?'good':''}">${esc(partTaskStatusLabel(e.statut).replace('Bloqué','Alerte'))}</span></div><p>${esc(e.description||'')}</p><div class="part-eng-meta"><span>${esc(partService(e.service_code).nom)}</span><span>${esc(e.frequence||'')}</span><span>${fmtDate(e.echeance)}</span><span>${Number(e.progression)||0}%</span></div><div class="part-eng-actions"><button class="btn mini-btn" data-ui-action="engagement" data-id="${e.id}" data-partner="${e.partenariat_id}">Modifier</button><button class="btn mini-btn" data-ui-action="realisation-add" data-id="${e.id}" data-partner="${e.partenariat_id}">+ Réalisation</button><span class="meta">${real.length} réalisation${real.length>1?'s':''}</span></div></div>`}
function partActionCard(a){const e=partActionEngagement(a);return `<div class="part-eng-card part-action-card ${partTaskLate(a)?'late':''}"><div class="part-eng-top"><b>${esc(a.titre)}</b><span class="part-badge ${a.statut==='bloque'?'bad':a.statut==='realise'?'good':partTaskLate(a)?'warn':''}">${esc(partTaskStatusLabel(a.statut))}</span></div><p>${esc(a.description||'')}</p><div class="part-eng-meta"><span>${esc(partService(a.service_code).nom)}</span><span>${partTaskSchedule(a)}</span><span>${esc(a.responsable||'À affecter')}</span><span>${Number(a.progression)||0}%</span></div>${e?`<div class="meta">Engagement sécurisé : ${esc(e.titre)}</div>`:''}<div class="meta">Preuve attendue : ${esc(a.preuve_attendue||'—')}${a.preuve?` · <b>Preuve renseignée</b>`:''}</div><div class="part-eng-actions"><button class="btn mini-btn" data-ui-action="action" data-id="${a.id}" data-partner="${a.partenariat_id}">Modifier la tâche</button></div></div>`}
function openPartnershipDetail(id){const p=(partRoot().partenariats||[]).find(x=>String(x.id)===String(id));if(!p)return;const eng=partContractEngagementsFor(p),eur=eng.filter(e=>e.partie==='eurasante'),other=eng.filter(e=>e.partie!=='eurasante'),acts=partActionsFor(p),groups={},actionGroups={};eur.forEach(e=>(groups[e.service_code||'AUTRE']??=[]).push(e));acts.forEach(a=>(actionGroups[a.service_code||'AUTRE']??=[]).push(a));$('drawerTitle').textContent=p.partenaire;$('drawerBody').innerHTML=`<div class="part-detail-actions"><button class="btn primary" data-ui-action="partnership-edit" data-id="${p.id}">Modifier la convention</button><button class="btn" data-ui-action="engagement-add" data-partner="${p.id}">+ Engagement</button><button class="btn" data-ui-action="action-add" data-partner="${p.id}">+ Tâche</button><button class="btn" data-ui-action="partnership-ics" data-partner="${p.id}">⇩ ICS de ce partenaire</button></div>${partList(p.points_vigilance).map(x=>`<div class="part-warning">${esc(x)}</div>`).join('')}<div class="part-detail-grid"><div><small>Statut</small>${partStatusBadge(p)}</div><div><small>Période</small><b>${fmtDate(p.date_debut)} → ${fmtDate(p.date_fin)}</b><span>${esc(p.duree_texte||'')}</span></div><div><small>Référent interne</small><b>${esc(p.referent_interne||'À renseigner')}</b></div><div><small>Exclusivité</small><b>${p.exclusif===true?'Oui':p.exclusif===false?'Non':'Non qualifiée'}</b><span>${esc(p.perimetre_exclusivite||'')}</span></div><div><small>Renouvellement / préavis</small><b>${esc(p.renouvellement_texte||'—')}</b><span>${esc(p.preavis_texte||'')}</span></div><div><small>Source</small><b>${esc(p.source_reference||'—')}</b><span>${esc(partList(p.source_fichiers).join(' · '))}</span></div></div><div class="part-detail-section"><h3>Comprendre le partenariat</h3><p>${esc(p.resume_operationnel||'')}</p>${p.expertise?`<p><b>Expertise :</b> ${esc(p.expertise)}</p>`:''}<div class="part-tags">${partList(p.dispositifs).map(x=>`<span class="part-badge">${esc(x)}</span>`).join('')}${partList(p.programmes).map(x=>`<span class="part-badge info">${esc(x)}</span>`).join('')}</div></div><div class="part-detail-section"><h3>Financier</h3><ul>${(p.montants||[]).map(m=>`<li>${m.montant==null?esc(m.note||'Commission'):`<b>${Number(m.montant).toLocaleString('fr-FR')} € ${esc(m.fiscalite||'')}</b> ${esc(m.annee||m.periode||'')} ${m.note?`<span class="meta"> · ${esc(m.note)}</span>`:''}`}</li>`).join('')||'<li>Non documenté</li>'}</ul><p class="meta">${esc([p.facturation_texte,p.paiement_texte].filter(Boolean).join(' · '))}</p></div><div class="part-detail-section"><h3>Engagements contractuels Eurasanté</h3>${Object.entries(groups).sort((a,b)=>partService(a[0]).ordre-partService(b[0]).ordre).map(([code,items])=>`<div class="part-service-group"><h4>${esc(partService(code).nom)} <span>${items.length}</span></h4>${items.map(partEngagementCard).join('')}</div>`).join('')||'<p class="meta">Aucun engagement Eurasanté.</p>'}</div><div class="part-detail-section part-action-section"><h3>Tâches à réaliser</h3><p class="meta">Plan d'exécution opérationnel lié à la convention : responsable, échéance, preuve et statut.</p>${Object.entries(actionGroups).sort((a,b)=>partService(a[0]).ordre-partService(b[0]).ordre).map(([code,items])=>`<div class="part-service-group"><h4>${esc(partService(code).nom)} <span>${items.length}</span></h4>${items.map(partActionCard).join('')}</div>`).join('')||'<p class="meta">Aucune tâche de pilotage.</p>'}</div>${other.length?`<div class="part-detail-section"><h3>Engagements du partenaire / mutuels</h3>${other.map(partEngagementCard).join('')}</div>`:''}<div class="part-detail-section"><h3>Traçabilité contractuelle</h3><p class="meta">Confiance : ${esc(p.niveau_confiance||'—')} · Signature : ${esc(p.signature_statut||'—')} ${p.date_signature?'· '+fmtDate(p.date_signature):''}</p>${Object.entries(p.clauses_source||{}).map(([k,v])=>`<details class="part-source"><summary>${esc(k)}</summary><pre>${esc(v)}</pre></details>`).join('')}</div>`;openDrawer()}

function openPartnershipForm(id='',newOne=false){const existing=(partRoot().partenariats||[]).find(x=>String(x.id)===String(id))||{};const x=newOne?{}:existing;$('drawerTitle').textContent=newOne?'Nouveau partenariat':`Modifier · ${x.partenaire||''}`;$('drawerBody').innerHTML=`<div class="form"><div class="formgrid"><label class="span2">Partenaire<input id="pfName" value="${esc(x.partenaire||'')}"></label><label>Type<select id="pfType"><option>${esc(x.type_partenariat||'Partenariat incubateurs')}</option><option>Partenariat incubateurs</option><option>Grand partenariat bancaire</option><option>Institutionnel</option><option>Référencement / offre négociée</option><option>Grand partenariat Euralimentaire</option></select></label><label>Statut convention<select id="pfStatus"><option value="active" ${x.statut_convention==='active'?'selected':''}>Active</option><option value="a_regulariser" ${x.statut_convention==='a_regulariser'?'selected':''}>À régulariser</option><option value="echeance_depassee_a_verifier" ${x.statut_convention==='echeance_depassee_a_verifier'?'selected':''}>Échéance dépassée à vérifier</option></select></label><label>Statut signature<input id="pfSignatureStatus" value="${esc(x.signature_statut||'signée')}"></label><label>Date signature<input id="pfSignatureDate" type="date" value="${esc(x.date_signature||'')}"></label><label>Date début<input id="pfStart" type="date" value="${esc(x.date_debut||'')}"></label><label>Date fin<input id="pfEnd" type="date" value="${esc(x.date_fin||'')}"></label><label>Référent interne<input id="pfOwner" value="${esc(x.referent_interne||'')}"></label><label>Secteur<input id="pfSector" value="${esc(x.secteur||'')}"></label><label>Représentant partenaire<input id="pfRep" value="${esc(x.representant||'')}"></label><label>Exclusivité<select id="pfExclusive"><option value="">À qualifier</option><option value="yes" ${x.exclusif===true?'selected':''}>Oui</option><option value="no" ${x.exclusif===false?'selected':''}>Non</option></select></label><label class="span3">Périmètre d'exclusivité<textarea id="pfScope">${esc(x.perimetre_exclusivite||'')}</textarea></label><label class="span2">Dispositifs (séparés par des virgules)<input id="pfDevices" value="${esc(partList(x.dispositifs).join(', '))}"></label><label>Programmes (virgules)<input id="pfPrograms" value="${esc(partList(x.programmes).join(', '))}"></label><label class="span3">Résumé opérationnel<textarea id="pfSummary">${esc(x.resume_operationnel||'')}</textarea></label><label class="span3">Expertise / objet<textarea id="pfExpertise">${esc(x.expertise||x.objet||'')}</textarea></label><label class="span2">Renouvellement<textarea id="pfRenew">${esc(x.renouvellement_texte||'')}</textarea></label><label>Préavis<textarea id="pfNotice">${esc(x.preavis_texte||'')}</textarea></label><label class="span3">Échéancier financier — 1 ligne par montant : montant | fiscalité | année/période | nature | sens | note<textarea id="pfMoney" placeholder="5000 | HT | 2026 | numéraire | partenaire_vers_eurasante | facture annuelle">${esc(partMoneyText(x))}</textarea></label><label class="span2">Facturation<textarea id="pfInvoice">${esc(x.facturation_texte||'')}</textarea></label><label>Paiement<textarea id="pfPayment">${esc(x.paiement_texte||'')}</textarea></label><label class="span2">Fichiers source — un par ligne<textarea id="pfFiles">${esc(partList(x.source_fichiers).join('\n'))}</textarea></label><label>Référence source<input id="pfSourceRef" value="${esc(x.source_reference||'')}"></label><label class="span3">Points de vigilance — un par ligne<textarea id="pfWarnings">${esc(partList(x.points_vigilance).join('\n'))}</textarea></label><label class="span3">Notes internes<textarea id="pfNotes">${esc(x.notes_internes||'')}</textarea></label></div><div class="draweractions"><button class="btn primary" id="savePartnership">💾 Enregistrer</button><span class="saveinfo">Les conventions existantes ne sont pas écrasées par le chargement du référentiel.</span></div></div>`;openDrawer();$('savePartnership').onclick=async()=>{const exv=$('pfExclusive').value;const payload={partenaire:$('pfName').value.trim(),type_partenariat:$('pfType').value,statut_convention:$('pfStatus').value,signature_statut:$('pfSignatureStatus').value,date_signature:$('pfSignatureDate').value||null,date_debut:$('pfStart').value||null,date_fin:$('pfEnd').value||null,referent_interne:$('pfOwner').value.trim(),secteur:$('pfSector').value.trim(),representant:$('pfRep').value.trim(),exclusif:exv==='yes'?true:exv==='no'?false:null,perimetre_exclusivite:$('pfScope').value.trim(),dispositifs:partList($('pfDevices').value),programmes:partList($('pfPrograms').value),resume_operationnel:$('pfSummary').value.trim(),expertise:$('pfExpertise').value.trim(),renouvellement_texte:$('pfRenew').value.trim(),preavis_texte:$('pfNotice').value.trim(),montants:parsePartMoney($('pfMoney').value),facturation_texte:$('pfInvoice').value.trim(),paiement_texte:$('pfPayment').value.trim(),source_fichiers:partLines($('pfFiles').value),source_reference:$('pfSourceRef').value.trim(),points_vigilance:partLines($('pfWarnings').value),notes_internes:$('pfNotes').value.trim()};if(!payload.partenaire)return toast('Nom du partenaire obligatoire');try{const res=await api(newOne?'/api/partnership/add':'/api/partnership/update',{method:'POST',body:JSON.stringify(newOne?payload:{id:x.id,...payload})});closeDrawer();await loadData(true);toast('Partenariat enregistré');if(newOne&&res.row?.id)openPartnershipDetail(res.row.id)}catch(e){toast(e.message)}}}
function openPartEngagementForm(partnershipId,engagementId=''){const e=(partRoot().engagements||[]).find(x=>String(x.id)===String(engagementId))||{};const isNew=!engagementId;$('drawerTitle').textContent=isNew?'Nouvel engagement':'Modifier l’engagement';$('drawerBody').innerHTML=`<div class="form"><div class="formgrid"><label>Partie<select id="peParty"><option value="eurasante" ${e.partie!=='partenaire'&&e.partie!=='mutuel'?'selected':''}>Eurasanté</option><option value="partenaire" ${e.partie==='partenaire'?'selected':''}>Partenaire</option><option value="mutuel" ${e.partie==='mutuel'?'selected':''}>Mutuel</option></select></label><label>Service Eurasanté<select id="peService"><option value="">—</option>${partServices().map(s=>`<option value="${esc(s.code)}" ${e.service_code===s.code?'selected':''}>${esc(s.nom)}</option>`).join('')}</select></label><label>Catégorie<input id="peCategory" value="${esc(e.categorie||'')}"></label><label class="span3">Titre<input id="peTitle" value="${esc(e.titre||'')}"></label><label class="span3">Description<textarea id="peDescription">${esc(e.description||'')}</textarea></label><label>Cible quantitative<input id="peQty" type="number" step="0.1" value="${e.quantite_cible??''}"></label><label>Unité<input id="peUnit" value="${esc(e.unite||'')}"></label><label>Fréquence<input id="peFreq" value="${esc(e.frequence||'')}"></label><label>Échéance<input id="peDue" type="date" value="${esc(e.echeance||'')}"></label><label>Priorité<select id="pePriority"><option value="normale" ${e.priorite!=='haute'?'selected':''}>Normale</option><option value="haute" ${e.priorite==='haute'?'selected':''}>Haute</option></select></label><label>Nature<select id="peClass"><option value="clause" ${e.classification!=='pilotage_interne'?'selected':''}>Clause contractuelle</option><option value="pilotage_interne" ${e.classification==='pilotage_interne'?'selected':''}>Pilotage interne</option><option value="mapping_interne" ${e.classification==='mapping_interne'?'selected':''}>Mapping interne</option></select></label><label>Statut<select id="peStatus"><option value="a_faire" ${e.statut==='a_faire'||!e.statut?'selected':''}>À faire</option><option value="en_cours" ${e.statut==='en_cours'?'selected':''}>En cours</option><option value="realise" ${e.statut==='realise'?'selected':''}>Réalisé</option><option value="alerte" ${e.statut==='alerte'?'selected':''}>Alerte</option><option value="non_applicable" ${e.statut==='non_applicable'?'selected':''}>N/A</option></select></label><label>Progression %<input id="peProgress" type="number" min="0" max="100" value="${Number(e.progression)||0}"></label><label>Responsable<input id="peResponsible" value="${esc(e.responsable||'')}"></label><label class="span2">Dispositifs (virgules)<input id="peDevices" value="${esc(partList(e.dispositifs).join(', '))}"></label><label>Obligatoire<select id="peMandatory"><option value="yes" ${e.obligatoire!==false?'selected':''}>Oui</option><option value="no" ${e.obligatoire===false?'selected':''}>Non / option</option></select></label><label class="span3">Référence source<input id="peSource" value="${esc(e.source_reference||'')}"></label><label class="span3">Commentaire de suivi<textarea id="peNote">${esc(e.commentaire_suivi||'')}</textarea></label></div><div class="draweractions"><button class="btn primary" id="savePartEngagement">💾 Enregistrer</button></div></div>`;openDrawer();$('savePartEngagement').onclick=async()=>{const qty=$('peQty').value;const payload={partie:$('peParty').value,service_code:$('peService').value||null,categorie:$('peCategory').value.trim(),titre:$('peTitle').value.trim(),description:$('peDescription').value.trim(),quantite_cible:qty===''?null:Number(qty),unite:$('peUnit').value.trim(),frequence:$('peFreq').value.trim(),echeance:$('peDue').value||null,priorite:$('pePriority').value,classification:$('peClass').value,statut:$('peStatus').value,progression:Math.max(0,Math.min(100,Number($('peProgress').value)||0)),responsable:$('peResponsible').value.trim(),dispositifs:partList($('peDevices').value),obligatoire:$('peMandatory').value==='yes',source_reference:$('peSource').value.trim(),commentaire_suivi:$('peNote').value.trim()};if(!payload.titre)return toast('Titre obligatoire');try{await api(isNew?'/api/partnership/engagement/add':'/api/partnership/engagement/update',{method:'POST',body:JSON.stringify(isNew?{partenariat_id:partnershipId,...payload}:{id:engagementId,...payload})});closeDrawer();await loadData(true);openPartnershipDetail(partnershipId);toast('Engagement enregistré')}catch(err){toast(err.message)}}}

function openPartActionForm(partnershipId,actionId=''){const a=(partRoot().actions||[]).find(x=>String(x.id)===String(actionId))||{};const isNew=!actionId,p=(partRoot().partenariats||[]).find(x=>String(x.id)===String(partnershipId))||{},engs=partEngagementsFor(p),v5=partRoot().v5_ready!==false;$('drawerTitle').textContent=isNew?`Nouvelle tâche · ${p.partenaire||''}`:`Modifier la tâche · ${p.partenaire||''}`;const calendarFields=v5?`<label>Date planifiée<input id="paPlanDate" type="date" value="${esc(a.date_planification||'')}"></label><label>Heure<input id="paPlanTime" type="time" value="${esc(String(a.heure_planification||'').slice(0,5))}"></label><label>Durée (min)<input id="paDuration" type="number" min="5" step="5" value="${Number(a.duree_minutes)||60}"></label><label>Lieu / lien visio<input id="paLocation" value="${esc(a.lieu||'')}"></label><label class="span3">Note calendrier<textarea id="paCalendarNote">${esc(a.notes_calendrier||'')}</textarea></label>`:`<div class="span3 part-warning">Pour renseigner date/heure/durée/lieu et exporter des rendez-vous Outlook précis, exécuter <b>MIGRATION_PARTENARIATS_V5.sql</b>. L'échéance peut néanmoins être exportée en événement journée entière.</div>`;$('drawerBody').innerHTML=`<div class="form"><div class="formgrid"><label>Service Eurasanté<select id="paService"><option value="">—</option>${partServices().map(s=>`<option value="${esc(s.code)}" ${a.service_code===s.code?'selected':''}>${esc(s.nom)}</option>`).join('')}</select></label><label>Engagement lié<select id="paEng"><option value="">Action transverse</option>${engs.map(e=>`<option value="${esc(e.id)}" ${String(a.engagement_id||'')===String(e.id)?'selected':''}>${esc(e.titre)}</option>`).join('')}</select></label><label>Type d’action<input id="paType" value="${esc(a.type_action||'suivi')}"></label><label class="span3">Tâche<input id="paTitle" value="${esc(a.titre||'')}"></label><label class="span3">Mode opératoire / description<textarea id="paDescription">${esc(a.description||'')}</textarea></label><label>Fréquence<input id="paFreq" value="${esc(a.frequence||'')}"></label><label>Échéance contractuelle / cible<input id="paDue" type="date" value="${esc(a.echeance||'')}"></label><label>Priorité<select id="paPriority"><option value="normale" ${a.priorite!=='haute'?'selected':''}>Normale</option><option value="haute" ${a.priorite==='haute'?'selected':''}>Haute</option></select></label>${calendarFields}<label>Statut<select id="paStatus">${PART_TASK_STATUSES.map(st=>`<option value="${st.v}" ${a.statut===st.v||(!a.statut&&st.v==='a_faire')?'selected':''}>${st.l}</option>`).join('')}</select></label><label>Progression %<input id="paProgress" type="number" min="0" max="100" value="${Number(a.progression)||0}"></label><label>Responsable<input id="paResponsible" value="${esc(a.responsable||'')}"></label><label class="span3">Preuve attendue<textarea id="paExpected">${esc(a.preuve_attendue||'')}</textarea></label><label class="span3">Preuve / lien / référence<textarea id="paProof">${esc(a.preuve||'')}</textarea></label><label class="span3">Commentaire de suivi<textarea id="paNote">${esc(a.commentaire_suivi||'')}</textarea></label></div><div class="draweractions"><button class="btn primary" id="savePartAction">💾 Enregistrer la tâche</button></div></div>`;openDrawer();$('savePartAction').onclick=async()=>{const payload={engagement_id:$('paEng').value||null,service_code:$('paService').value||null,type_action:$('paType').value.trim()||'suivi',titre:$('paTitle').value.trim(),description:$('paDescription').value.trim(),frequence:$('paFreq').value.trim(),echeance:$('paDue').value||null,priorite:$('paPriority').value,statut:$('paStatus').value,progression:Math.max(0,Math.min(100,Number($('paProgress').value)||0)),responsable:$('paResponsible').value.trim(),preuve_attendue:$('paExpected').value.trim(),preuve:$('paProof').value.trim(),commentaire_suivi:$('paNote').value.trim(),origine:isNew?'saisie_manuelle':(a.origine||'saisie_manuelle')};if(v5)Object.assign(payload,{date_planification:$('paPlanDate').value||null,heure_planification:$('paPlanTime').value||null,duree_minutes:Math.max(5,Number($('paDuration').value)||60),lieu:$('paLocation').value.trim(),notes_calendrier:$('paCalendarNote').value.trim()});if(!payload.titre)return toast('Titre obligatoire');if(['realise','non_applicable'].includes(payload.statut))payload.progression=100;try{await api(isNew?'/api/partnership/action/add':'/api/partnership/action/update',{method:'POST',body:JSON.stringify(isNew?{partenariat_id:partnershipId,...payload}:{id:actionId,...payload})});closeDrawer();await loadData(true);partnershipViewMode='tasks';renderPartnerships();toast('Tâche enregistrée')}catch(err){toast(err.message)}}}
function openGlobalPartActionForm(){const ps=(partRoot().partenariats||[]).slice().sort((a,b)=>String(a.partenaire).localeCompare(String(b.partenaire),'fr'));$('drawerTitle').textContent='Nouvelle tâche de partenariat';$('drawerBody').innerHTML=`<div class="form"><div class="formgrid"><label class="span3">Partenaire<select id="globalTaskPartner"><option value="">Choisir…</option>${ps.map(p=>`<option value="${esc(p.id)}">${esc(p.partenaire)}</option>`).join('')}</select></label></div><div class="draweractions"><button class="btn primary" id="globalTaskNext">Continuer</button></div></div>`;openDrawer();$('globalTaskNext').onclick=()=>{const id=$('globalTaskPartner').value;if(!id)return toast('Choisir un partenaire');openPartActionForm(id)}}

async function addPartRealisation(engagementId,partnershipId=''){const e=(partRoot().engagements||[]).find(x=>String(x.id)===String(engagementId));if(!e)return;$('drawerTitle').textContent=`Réalisation · ${e.titre}`;$('drawerBody').innerHTML=`<div class="form"><div class="formgrid"><label>Date prévue<input id="prPlanned" type="date"></label><label>Date réalisée<input id="prDone" type="date" value="${window.CRM_BRIDGE.localDay()}"></label><label>Quantité<input id="prQty" type="number" step="0.1" value="1"></label><label>Statut<select id="prStatus"><option value="realise">Réalisé</option><option value="planifie">Planifié</option><option value="reporte">Reporté</option><option value="annule">Annulé</option></select></label><label class="span2">Preuve / lien<input id="prProof"></label><label class="span3">Commentaire<textarea id="prComment"></textarea></label></div><div class="draweractions"><button class="btn primary" id="saveRealisation">Enregistrer la réalisation</button></div></div>`;openDrawer();$('saveRealisation').onclick=async()=>{try{await api('/api/partnership/realisation/add',{method:'POST',body:JSON.stringify({engagement_id:engagementId,date_prevue:$('prPlanned').value||null,date_realisation:$('prDone').value||null,quantite:$('prQty').value===''?null:Number($('prQty').value),statut:$('prStatus').value,preuve:$('prProof').value.trim(),commentaire:$('prComment').value.trim()})});closeDrawer();await loadData(true);const target=partnershipId||e.partenariat_id;if(target)openPartnershipDetail(target);toast('Réalisation ajoutée')}catch(err){toast(err.message)}}}

async function seedPartnerships(){if(!await askConfirm('Charger le référentiel conventions','Ajouter uniquement les partenariats, engagements et tâches absents ? Les données déjà présentes ne seront pas écrasées.','Charger'))return;try{const r=await api('/api/partnerships/seed',{method:'POST',body:'{}'});await loadData(true);renderPartnerships();toast(`${r.partnerships_added} partenariats · ${r.engagements_added} engagements · ${r.actions_added||0} tâches ajoutés`)}catch(e){toast(e.message)}}
async function exportPartnershipHtml(){try{await window.CRM_BRIDGE.exportHTML();toast('Rapport HTML téléchargé')}catch(e){toast(e.message)}}
function openPartnershipJsonImport(){window.__partnershipImportPackage=null;$('drawerTitle').textContent='Importer une convention JSON · V5';$('drawerBody').innerHTML=`<div class="part-warning"><b>Import non destructif.</b> Une ligne déjà présente avec le même <code>source_key</code> est ignorée, jamais remplacée.</div><div class="form"><div class="formgrid"><label class="span3">Fichier JSON<input id="pjFile" type="file" accept="application/json,.json"></label><label class="span3">Ou coller le JSON produit à partir de la convention<textarea id="pjJson" style="min-height:330px" placeholder='{"schema_version":"eurasante.partnership.v5", ...}'></textarea></label></div><div class="draweractions"><button class="btn" id="pjTemplate">⇩ Modèle JSON</button><button class="btn" id="pjPreview">Analyser sans écrire</button><button class="btn primary" id="pjApply" disabled>Importer dans Supabase</button></div><div id="pjResult"></div></div>`;openDrawer();$('pjTemplate').onclick=()=>{window.open('/templates/MODELE_IMPORT_CONVENTION_V5.json','_blank')};$('pjFile').onchange=async e=>{const f=e.target.files?.[0];if(f)$('pjJson').value=await f.text()};$('pjPreview').onclick=async()=>{try{const pack=JSON.parse($('pjJson').value);const r=await api('/api/partnerships/import-json-preview',{method:'POST',body:JSON.stringify(pack)});window.__partnershipImportPackage=pack;const s=r.summary||{};$('pjResult').innerHTML=`<div class="card" style="margin-top:12px"><h3>Prévisualisation</h3><div class="part-import-summary"><span><b>${s.partnership_create||0}</b> convention à créer</span><span><b>${s.engagements_create||0}</b> engagements à créer</span><span><b>${s.actions_create||0}</b> tâches à créer</span><span><b>${(s.partnership_skip||0)+(s.engagements_skip||0)+(s.actions_skip||0)}</b> éléments déjà présents ignorés</span></div>${(r.errors||[]).length?`<div class="part-warning"><b>Blocages :</b><ul>${r.errors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}${(r.warnings||[]).length?`<div class="meta"><b>Avertissements :</b><ul>${r.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}</div>`;$('pjApply').disabled=!r.ok;if(r.ok)toast('JSON valide · prêt à importer')}catch(err){window.__partnershipImportPackage=null;$('pjApply').disabled=true;$('pjResult').innerHTML=`<div class="part-warning">${esc(err.message)}</div>`}};$('pjApply').onclick=async()=>{const pack=window.__partnershipImportPackage;if(!pack)return;if(!await askConfirm('Importer cette convention ?','Seuls les éléments absents seront ajoutés. Aucune donnée existante ne sera remplacée.','Importer'))return;try{const r=await api('/api/partnerships/import-json',{method:'POST',body:JSON.stringify(pack)});await loadData(true);closeDrawer();partnershipViewMode='partners';renderPartnerships();toast(`${r.partnerships_added} convention · ${r.engagements_added} engagements · ${r.actions_added} tâches ajoutés`)}catch(err){toast(err.message)}}}
function openPartnershipIcsExport(initialPartnershipId=''){const all=(partRoot().actions||[]),parts=(partRoot().partenariats||[]).slice().sort((a,b)=>String(a.partenaire).localeCompare(String(b.partenaire),'fr')),selected=new Set();$('drawerTitle').textContent='Export calendrier Outlook (.ics)';$('drawerBody').innerHTML=`<div class="form"><div class="formgrid"><label>Partenaire<select id="piPartner"><option value="">Tous</option>${parts.map(p=>`<option value="${esc(p.id)}" ${String(initialPartnershipId)===String(p.id)?'selected':''}>${esc(p.partenaire)}</option>`).join('')}</select></label><label>Service<select id="piService"><option value="">Tous</option>${partServices().map(s=>`<option value="${esc(s.code)}">${esc(s.nom)}</option>`).join('')}</select></label><label>État<select id="piState"><option value="open">Tâches ouvertes</option><option value="">Tous statuts</option><option value="realise">Réalisées</option></select></label></div><div class="draweractions"><button class="btn" id="piAll">Sélectionner les visibles datées</button><button class="btn" id="piNone">Effacer</button><button class="btn primary" id="piExport">⇩ Télécharger .ics</button></div><div id="piList"></div></div>`;openDrawer();const pmap=new Map(parts.map(p=>[String(p.id),p]));const visible=()=>all.filter(a=>{const pid=$('piPartner').value,svc=$('piService').value,state=$('piState').value;if(pid&&String(a.partenariat_id)!==String(pid))return false;if(svc&&a.service_code!==svc)return false;if(state==='open'&&['realise','non_applicable'].includes(a.statut))return false;if(state==='realise'&&a.statut!=='realise')return false;return true}).sort((a,b)=>String(partTaskDate(a)||'9999').localeCompare(String(partTaskDate(b)||'9999')));const render=()=>{const rows=visible();$('piList').innerHTML=`<div class="tablebox"><table><thead><tr><th></th><th>Partenaire</th><th>Service</th><th>Tâche</th><th>Date exportée</th></tr></thead><tbody>${rows.map(a=>{const hasDate=!!partTaskDate(a);return `<tr><td><input type="checkbox" data-pics="${esc(a.id)}" ${selected.has(String(a.id))?'checked':''} ${hasDate?'':'disabled'}></td><td>${esc(pmap.get(String(a.partenariat_id))?.partenaire||'—')}</td><td>${esc(partService(a.service_code).nom)}</td><td><b>${esc(a.titre)}</b><div class="meta">${esc(a.responsable||'À affecter')}</div></td><td>${hasDate?partTaskSchedule(a):'<span class="part-badge warn">Date manquante</span>'}</td></tr>`}).join('')||'<tr><td colspan="5">Aucune tâche.</td></tr>'}</tbody></table></div>`;$('piList').querySelectorAll('[data-pics]').forEach(c=>c.onchange=()=>{c.checked?selected.add(String(c.dataset.pics)):selected.delete(String(c.dataset.pics))})};['piPartner','piService','piState'].forEach(id=>$(id).onchange=render);$('piAll').onclick=()=>{visible().filter(a=>partTaskDate(a)).forEach(a=>selected.add(String(a.id)));render()};$('piNone').onclick=()=>{selected.clear();render()};$('piExport').onclick=async()=>{if(!selected.size)return toast('Sélectionner au moins une tâche datée');try{const blob=window.CRM_BRIDGE.exportICS([...selected]),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Taches_Partenariats_Eurasante_${window.CRM_BRIDGE.localDay()}.ics`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast(`${selected.size} tâche(s) exportée(s) vers Outlook`)}catch(err){toast(err.message)}};visible().filter(a=>partTaskDate(a)&&!['realise','non_applicable'].includes(a.statut)).forEach(a=>selected.add(String(a.id)));render()}

buildNav();
if($('seedPartnerships'))$('seedPartnerships').onclick=seedPartnerships;
if($('exportPartnershipHtml'))$('exportPartnershipHtml').onclick=exportPartnershipHtml;
if($('importPartnershipJson'))$('importPartnershipJson').onclick=openPartnershipJsonImport;
if($('exportPartnershipIcs'))$('exportPartnershipIcs').onclick=()=>openPartnershipIcsExport();
if($('newPartnership'))$('newPartnership').onclick=()=>openPartnershipForm('',true);
document.querySelectorAll('[data-partview]').forEach(b=>b.onclick=()=>{partnershipViewMode=b.dataset.partview;renderPartnerships()});
if($('partnershipQ'))$('partnershipQ').oninput=renderPartnerships;
['partnershipStatus','partnershipExclusive','partnershipEngStatus','partnershipSort'].forEach(id=>{if($(id))$(id).onchange=renderPartnerships});
if($('partnershipService'))$('partnershipService').onchange=()=>{partnershipFacet.service=$('partnershipService').value;renderPartnerships()};
if($('partnershipDevice'))$('partnershipDevice').onchange=()=>{partnershipFacet.device=$('partnershipDevice').value;renderPartnerships()};
if($('partnershipFacets'))$('partnershipFacets').addEventListener('click',e=>{const b=e.target.closest('[data-partfacet]');if(!b)return;partnershipFacet[b.dataset.partfacet]=b.dataset.value||'';if(b.dataset.partfacet==='service'&&$('partnershipService'))$('partnershipService').value=b.dataset.value||'';if(b.dataset.partfacet==='device'&&$('partnershipDevice'))$('partnershipDevice').value=b.dataset.value||'';renderPartnerships()});
$('loginBtn').onclick=login;$('loginPassword').onkeydown=e=>{if(e.key==='Enter')login()};$('logoutBtn').onclick=logout;$('refreshBtn').onclick=()=>loadData();$('drawerClose').onclick=closeDrawer;$('drawer').onclick=e=>{if(e.target===$('drawer'))closeDrawer()};$('newProspect').onclick=()=>openProspect('',true);$('newProject').onclick=()=>openProject('',true);document.querySelectorAll('[data-pipeview]').forEach(b=>b.onclick=()=>{pipeView=b.dataset.pipeview;renderPipeline()});document.querySelectorAll('[data-prospectview]').forEach(b=>b.onclick=()=>{prospectView=b.dataset.prospectview;renderProspects()});document.querySelectorAll('[data-projview]').forEach(b=>b.onclick=()=>{projView=b.dataset.projview;renderProjects()});document.querySelectorAll('[data-odjview]').forEach(b=>b.onclick=()=>{odjView=b.dataset.odjview;renderODJ()});$('pipeQ').oninput=renderPipeline;['pipeRef','pipeProject','pipeStatus','pipeSort'].forEach(id=>$(id).onchange=renderPipeline);$('chipSidebarToggle').onclick=toggleChipSidebar;$('chipSearch').oninput=filterChipList;$('projectChips').addEventListener('click',e=>{const b=e.target.closest('.chip-row[data-project]');if(!b)return;currentProjectChip=b.dataset.project||'';renderProspects()});$('prospectQ').oninput=renderProspects;['prospectRef','prospectStatus'].forEach(id=>$(id).onchange=renderProspects);$('prospectSort').onchange=()=>{prospectColSort={key:null,dir:1};renderProspects()};$('favoriteProspectFilter').onclick=()=>{favoriteOnly=!favoriteOnly;renderProspects()};$('resetProspectFilters').onclick=()=>{$('prospectQ').value='';$('prospectRef').value='';$('prospectStatus').value='';$('prospectSort').value='recent';$('chipSearch').value='';currentProjectChip='';favoriteOnly=false;prospectColSort={key:null,dir:1};renderProspects()};$('prospectView').addEventListener('click',e=>{const th=e.target.closest('th[data-sortcol]');if(!th)return;const key=th.dataset.sortcol;if(prospectColSort.key===key)prospectColSort.dir*=-1;else{prospectColSort.key=key;prospectColSort.dir=1}renderProspects()});$('projectQ').oninput=renderProjects;['projectPriority','projectRef','projectODJ','projectActive','projectSort'].forEach(id=>$(id).onchange=renderProjects);$('projectView').addEventListener('click',e=>{if(e.target.closest('.project-select'))e.stopPropagation()});if($('selectVisibleProjects'))$('selectVisibleProjects').onclick=()=>{projectFiltered().forEach(p=>selectedProjectIds.add(p.id));renderProjects()};if($('clearProjectSelection'))$('clearProjectSelection').onclick=()=>{selectedProjectIds.clear();renderProjects()};if($('bulkActivateProjects'))$('bulkActivateProjects').onclick=()=>bulkSetProjectsActive(true);if($('bulkDeactivateProjects'))$('bulkDeactivateProjects').onclick=()=>bulkSetProjectsActive(false);$('sourceQ').oninput=renderSourcing;['sourceName','sourceState'].forEach(id=>$(id).onchange=renderSourcing);if($('relationQ'))$('relationQ').oninput=renderRelations;['relationState','relationDormant','relationYear','relationOrgStatus'].forEach(id=>{if($(id))$(id).onchange=renderRelations});document.querySelectorAll('[data-relview]').forEach(b=>b.onclick=()=>{relationView=b.dataset.relview;document.querySelectorAll('[data-relview]').forEach(x=>x.classList.toggle('active',x===b));renderRelations()});if($('relationsView'))$('relationsView').addEventListener('click',e=>{const ro=e.target.closest('[data-relorgsort]');if(ro){const k=ro.dataset.relorgsort;if(relationOrgSort.key===k)relationOrgSort.dir*=-1;else relationOrgSort={key:k,dir:1};renderRelations();return}const rr=e.target.closest('[data-relrdvsort]');if(rr){const k=rr.dataset.relrdvsort;if(relationRdvSort.key===k)relationRdvSort.dir*=-1;else relationRdvSort={key:k,dir:1};renderRelations()}});if($('relationsView'))$('relationsView').addEventListener('click',e=>{const row=e.target.closest('tr[data-rdvid]');if(row)relationRowPointerSelect(e,row)});document.addEventListener('keydown',relationKeyboardSelect);if($('selectVisibleRdv'))$('selectVisibleRdv').onclick=selectVisibleRdvRows;if($('selectPastVisibleRdv'))$('selectPastVisibleRdv').onclick=selectPastVisibleRdvRows;if($('clearRdvSelection'))$('clearRdvSelection').onclick=()=>{selectedRdvIds.clear();renderRelations()};if($('bulkRdvRealise'))$('bulkRdvRealise').onclick=()=>bulkSetRdvStatus('realise');if($('bulkRdvPlanifie'))$('bulkRdvPlanifie').onclick=()=>bulkSetRdvStatus('planifie');if($('bulkRdvAnnule'))$('bulkRdvAnnule').onclick=()=>bulkSetRdvStatus('annule');if($('bulkRdvIgnore'))$('bulkRdvIgnore').onclick=()=>bulkSetRdvStatus('ignore');if($('importRdvHistory'))$('importRdvHistory').onclick=importRdvHistory;if($('resetProspectODJ'))$('resetProspectODJ').onclick=resetProspectODJ;$('excelFile').onchange=e=>{const f=e.target.files[0];if(f)inspectFile(f).catch(er=>toast(er.message))};
(async()=>{try{if(await authCheck()){await loadData();startRefresh();showSection('dashboard')}}catch(e){showLogin()}})();

/* ========================================================================== */
/* V3 - TABLEAUX CONFIGURABLES                                                */
/* Toutes les vues tableau : colonnes visibles + ordre + tri par colonne.    */
/* Préférences stockées localement dans le navigateur, sans impact Supabase. */
/* ========================================================================== */
const V3_TABLE_DEFS={
  pipeline:{label:'Pipeline commercial',cols:[['favorite','Favori'],['sponsor','Sponsor'],['status','Statut'],['date','Date MAJ'],['owner','Référent'],['projects','Projet(s)'],['amount','Montant']]},
  prospects:{label:'Prospects',cols:[['favorite','Favori'],['sponsor','Sponsor'],['status','Statut'],['owner','Référent'],['projects','Projet(s)'],['odj','ODJ'],['date','Date MAJ'],['amount','Montant'],['comment','Commentaire']]},
  projects:{label:'Projets',cols:[['select','Sélection'],['project','Projet'],['state','État'],['priority','Priorité'],['owner','Référent'],['amount','Montant cible'],['date','Date'],['odj','ODJ'],['comments','Commentaires']]},
  odj:{label:'ODJ Comité',cols:[['owner','Responsable'],['type','Type'],['subject','Sujet'],['status','Statut / priorité'],['project','Projet cible'],['comment','Commentaire']]},
  sourcing:{label:'Sourcing',cols:[['source','Source'],['target','Cible'],['data','Données'],['state','État'],['actions','Action']]},
  'relations-orgs':{label:'Relations — Organisations',cols:[['organisation','Organisation'],['count','RDV'],['last','Dernier échange'],['contacts','Contacts'],['type','Type'],['crm','CRM'],['actions','Action']]},
  'relations-rdv':{label:'Relations — RDV',cols:[['select','Sélection'],['date','Date'],['organisation','Organisation'],['subject','Objet'],['status','Statut'],['location','Lieu']]}
};
const V3_TABLE_PREF_PREFIX='eurasante.crm.v3.table.';
let v3ColumnPopover=null;
function v3TableIdentity(table){
  if(table.closest('#pipelineView'))return 'pipeline';
  if(table.closest('#prospectView'))return 'prospects';
  if(table.closest('#projectView'))return 'projects';
  if(table.closest('#odjView'))return 'odj';
  if(table.closest('#sec-sourcing'))return 'sourcing';
  if(table.closest('#relationsView')){
    const first=table.querySelector('thead th');
    return first?.querySelector('input[type="checkbox"]')?'relations-rdv':'relations-orgs';
  }
  return null;
}
function v3DefaultPrefs(key){const def=V3_TABLE_DEFS[key];return {order:def.cols.map(c=>c[0]),hidden:[],sort:null,dir:1}}
function v3LoadPrefs(key){
  const base=v3DefaultPrefs(key);let raw={};try{raw=JSON.parse(localStorage.getItem(V3_TABLE_PREF_PREFIX+key)||'{}')||{}}catch{}
  const valid=new Set(base.order),order=[];
  for(const k of (raw.order||[]))if(valid.has(k)&&!order.includes(k))order.push(k);
  for(const k of base.order)if(!order.includes(k))order.push(k);
  const hidden=(raw.hidden||[]).filter(k=>valid.has(k));
  return {order,hidden,sort:valid.has(raw.sort)?raw.sort:null,dir:raw.dir===-1?-1:1};
}
function v3SavePrefs(key,p){localStorage.setItem(V3_TABLE_PREF_PREFIX+key,JSON.stringify(p))}
function v3TagTable(table,key){
  const def=V3_TABLE_DEFS[key];if(!def)return false;
  const heads=[...table.querySelectorAll('thead tr:first-child > th')];
  if(heads.length!==def.cols.length)return false;
  heads.forEach((th,i)=>{th.dataset.v3col=def.cols[i][0];th.dataset.v3label=def.cols[i][1];th.removeAttribute('data-sortcol');th.removeAttribute('data-relorgsort');th.removeAttribute('data-relrdvsort');th.querySelectorAll('.sort-ind,.sortmark,.v3-sortmark').forEach(x=>x.remove())});
  table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(def.cols[i])td.dataset.v3col=def.cols[i][0]}));
  return true;
}
function v3CellText(td){
  const sel=td.querySelector('select');if(sel)return sel.selectedOptions?.[0]?.textContent?.trim()||sel.value||'';
  const cb=td.querySelector('input[type="checkbox"]');if(cb)return cb.checked?'1':'0';
  const fav=td.querySelector('.favorite-btn,[aria-pressed]');if(fav)return fav.getAttribute('aria-pressed')==='true'?'1':'0';
  return td.textContent.trim();
}
function v3Comparable(text,key){
  const s=String(text||'').trim();
  if(['amount','count'].includes(key)){const n=Number(s.replace(/[^0-9,.-]/g,'').replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:-Infinity}
  if(key==='date'||key==='last'){
    const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    const iso=s.match(/\d{4}-\d{2}-\d{2}/);if(iso)return iso[0];
  }
  return s.toLocaleLowerCase('fr');
}
function v3SortTable(table,key,prefs,save=true){
  if(!prefs.sort)return;
  const tbody=table.tBodies[0];if(!tbody)return;
  const rows=[...tbody.rows];
  rows.sort((a,b)=>{const ac=a.querySelector(`[data-v3col="${CSS.escape(prefs.sort)}"]`),bc=b.querySelector(`[data-v3col="${CSS.escape(prefs.sort)}"]`);const av=v3Comparable(ac?v3CellText(ac):'',prefs.sort),bv=v3Comparable(bc?v3CellText(bc):'',prefs.sort);if(typeof av==='number'&&typeof bv==='number')return (av-bv)*prefs.dir;return String(av).localeCompare(String(bv),'fr',{numeric:true,sensitivity:'base'})*prefs.dir});
  rows.forEach(r=>tbody.appendChild(r));
  table.querySelectorAll('thead th').forEach(th=>{th.classList.toggle('v3-sorted',th.dataset.v3col===prefs.sort);th.setAttribute('aria-sort',th.dataset.v3col===prefs.sort?(prefs.dir===1?'ascending':'descending'):'none');th.querySelector('.v3-sortmark')?.remove();if(th.dataset.v3col===prefs.sort){const m=document.createElement('span');m.className='v3-sortmark';m.textContent=prefs.dir===1?'▲':'▼';th.appendChild(m)}});
  if(save)v3SavePrefs(key,prefs);
}
function v3ApplyColumns(table,key,prefs){
  const def=V3_TABLE_DEFS[key],ordered=prefs.order.filter(k=>def.cols.some(c=>c[0]===k));
  const allRows=[...table.querySelectorAll('thead tr:first-child'),...table.querySelectorAll('tbody tr')];
  allRows.forEach(row=>{const cells=new Map([...row.children].map(c=>[c.dataset.v3col,c]));ordered.forEach(k=>{const c=cells.get(k);if(c){c.style.display=prefs.hidden.includes(k)?'none':'';row.appendChild(c)}})});
}
function v3CloseColumns(){if(v3ColumnPopover){v3ColumnPopover.remove();v3ColumnPopover=null}}
function v3OpenColumns(btn,table,key){
  v3CloseColumns();const def=V3_TABLE_DEFS[key],prefs=v3LoadPrefs(key);const pop=document.createElement('div');pop.className='v3-column-popover';pop.innerHTML=`<div class="v3-column-head"><b>Colonnes — ${esc(def.label)}</b><button type="button" class="v3-column-close">✕</button></div><div class="v3-column-help">Afficher/masquer et réordonner les colonnes. Chaque colonne visible reste triable.</div><div class="v3-column-list"></div><div class="v3-column-foot"><button class="btn v3-reset-columns" type="button">Réinitialiser</button><button class="btn primary v3-done-columns" type="button">Terminé</button></div>`;document.body.appendChild(pop);v3ColumnPopover=pop;
  const rect=btn.getBoundingClientRect();pop.style.top=`${Math.min(window.innerHeight-pop.offsetHeight-12,rect.bottom+8)}px`;pop.style.left=`${Math.max(12,Math.min(window.innerWidth-pop.offsetWidth-12,rect.right-pop.offsetWidth))}px`;
  function draw(){const p=v3LoadPrefs(key),list=pop.querySelector('.v3-column-list');list.innerHTML=p.order.map((k,i)=>{const label=def.cols.find(c=>c[0]===k)?.[1]||k;return `<div class="v3-column-item" data-key="${esc(k)}"><label><input type="checkbox" ${p.hidden.includes(k)?'':'checked'}> <span>${esc(label)}</span></label><div><button type="button" class="v3-col-up" ${i===0?'disabled':''}>↑</button><button type="button" class="v3-col-down" ${i===p.order.length-1?'disabled':''}>↓</button></div></div>`}).join('')}
  draw();
  pop.addEventListener('change',e=>{const item=e.target.closest('.v3-column-item');if(!item)return;const p=v3LoadPrefs(key),k=item.dataset.key;if(e.target.checked)p.hidden=p.hidden.filter(x=>x!==k);else{if(p.hidden.length>=p.order.length-1){e.target.checked=true;return toast('Au moins une colonne doit rester visible')}p.hidden=[...new Set([...p.hidden,k])]};v3SavePrefs(key,p);v3ApplyColumns(table,key,p)});
  pop.addEventListener('click',e=>{if(e.target.closest('.v3-column-close,.v3-done-columns'))return v3CloseColumns();if(e.target.closest('.v3-reset-columns')){const p=v3DefaultPrefs(key);v3SavePrefs(key,p);v3ApplyColumns(table,key,p);v3SortTable(table,key,p,false);draw();return}const item=e.target.closest('.v3-column-item');if(!item)return;const p=v3LoadPrefs(key),i=p.order.indexOf(item.dataset.key);let j=i;if(e.target.closest('.v3-col-up'))j=i-1;if(e.target.closest('.v3-col-down'))j=i+1;if(j<0||j>=p.order.length||j===i)return;[p.order[i],p.order[j]]=[p.order[j],p.order[i]];v3SavePrefs(key,p);v3ApplyColumns(table,key,p);draw()});
}
function v3EnhanceTable(table){
  if(table.dataset.v3enhanced==='1')return;const key=v3TableIdentity(table);if(!key||!v3TagTable(table,key))return;table.dataset.v3enhanced='1';table.dataset.v3table=key;const prefs=v3LoadPrefs(key);v3ApplyColumns(table,key,prefs);
  table.querySelectorAll('thead th').forEach(th=>{th.classList.add('v3-sortable');th.title=(th.title?th.title+' · ':'')+'Cliquer pour trier';th.addEventListener('click',e=>{if(e.target.closest('input,select,button,a'))return;e.preventDefault();e.stopImmediatePropagation();const p=v3LoadPrefs(key),k=th.dataset.v3col;if(p.sort===k)p.dir*=-1;else{p.sort=k;p.dir=1}v3SortTable(table,key,p,true)},true)});
  v3SortTable(table,key,prefs,false);
  const box=table.closest('.tablebox')||table.parentElement;if(box&&!box.previousElementSibling?.classList?.contains('v3-table-tools')){const tools=document.createElement('div');tools.className='v3-table-tools';tools.innerHTML=`<span class="meta">${esc(V3_TABLE_DEFS[key].label)} · colonnes personnalisables</span><button type="button" class="btn v3-columns-btn">⚙ Colonnes</button>`;box.parentNode.insertBefore(tools,box);tools.querySelector('.v3-columns-btn').onclick=()=>v3OpenColumns(tools.querySelector('.v3-columns-btn'),table,key)}
}
function v3ScanTables(root=document){root.querySelectorAll?.('table').forEach(v3EnhanceTable)}
function v3RefreshEnhancedTable(table){
  if(!table||table.dataset.v3enhanced!=='1')return;const key=table.dataset.v3table,def=V3_TABLE_DEFS[key];if(!def)return;
  table.querySelectorAll('tbody tr').forEach(tr=>{if([...tr.children].every(td=>td.dataset.v3col))return;[...tr.children].forEach((td,i)=>{if(def.cols[i])td.dataset.v3col=def.cols[i][0]})});
  const p=v3LoadPrefs(key);v3ApplyColumns(table,key,p);v3SortTable(table,key,p,false);
}
// V3.0.1 — observer anti-boucle.
// On ne traite que l'arrivée de NOUVEAUX tableaux. Les déplacements de cellules
// produits par v3ApplyColumns() ne doivent jamais déclencher une nouvelle passe.
let v3ScanQueued=false;
const v3TableObserver=new MutationObserver(muts=>{
  let needsScan=false;
  for(const m of muts){
    for(const n of m.addedNodes){
      if(n.nodeType!==1) continue;
      // Un tableau neuf vient d'être inséré.
      if(n.matches?.('table:not([data-v3enhanced="1"])')){needsScan=true;break}
      // Ou un conteneur neuf contient un tableau non encore enrichi.
      if(n.querySelector?.('table:not([data-v3enhanced="1"])')){needsScan=true;break}
    }
    if(needsScan) break;
  }
  if(!needsScan || v3ScanQueued) return;
  v3ScanQueued=true;
  requestAnimationFrame(()=>{
    v3ScanQueued=false;
    v3ScanTables();
  });
});
v3TableObserver.observe(document.body,{childList:true,subtree:true});
requestAnimationFrame(()=>v3ScanTables());
document.addEventListener('click',e=>{if(v3ColumnPopover&&!v3ColumnPopover.contains(e.target)&&!e.target.closest('.v3-columns-btn'))v3CloseColumns()});
window.addEventListener('resize',v3CloseColumns);


/* RESTAURATION V5 : clics de cartes / icones / listes sans JavaScript inline. */
function v5UiClick(el, ev){
 const a=el.dataset.uiAction,id=el.dataset.id,partner=el.dataset.partner;
 // For a nested action inside a clickable card, do not open the background card.
 ev.stopPropagation();
 switch(a){
  case 'favorite':return toggleFavorite(id,ev);
  case 'prospect':return openProspect(id);
  case 'prospect-ifnotdrag':if(!window.__dragging)return openProspect(id);return;
  case 'project':return openProject(id);
  case 'sourcing-to-crm':return sourceToCRM(id);
  case 'relation-to-prospect':return createProspectFromOrg(id);
  case 'dismiss-relation-report':return $('relationsImportReport')?.classList.add('hidden');
  case 'partnership-detail':return openPartnershipDetail(id);
  case 'partnership-edit':return openPartnershipForm(id);
  case 'engagement-add':return openPartEngagementForm(partner);
  case 'engagement':return openPartEngagementForm(partner,id);
  case 'action-add':return openPartActionForm(partner);
  case 'action':return openPartActionForm(partner,id);
  case 'action-ifnotdrag':if(!partnershipTaskDragging)return openPartActionForm(partner,id);return;
  case 'realisation-add':return addPartRealisation(id,partner);
  case 'partnership-service':return setPartnershipService(el.dataset.code);
  case 'partnership-ics':return openPartnershipIcsExport(partner);
  case 'pipeline-status':$('pipeStatus').value=el.dataset.status||'';return showSection('pipeline');
  case 'go-section':return showSection(el.dataset.section);
  default:return console.warn('Clic non routé',a);
 }
}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-ui-action]');if(!el)return;
 const interactive=e.target.closest('button,input,select,textarea,a,[data-ui-change]');
 if(interactive && interactive!==el && el.contains(interactive))return;
 if(el.tagName==='A')e.preventDefault();
 v5UiClick(el,e);
});
document.addEventListener('change',e=>{
 const el=e.target.closest('[data-ui-change]');if(!el)return;
 const id=el.dataset.id;
 switch(el.dataset.uiChange){
  case 'organisation-status':return setOrganisationStatus(id,el.value);
  case 'rdv-toggle-all':return el.checked?selectVisibleRdvRows():clearVisibleRdvRows();
  case 'rdv-toggle':return toggleRdvSelect(id,el.checked);
  case 'rdv-status':return setRdvStatus(id,el.value);
  case 'engagement-status':return updatePartEngagement(id,{statut:el.value});
  case 'engagement-progress':return updatePartEngagement(id,{progression:Number(el.value)});
  case 'action-status':return updatePartAction(id,{statut:el.value});
  case 'action-progress':return updatePartAction(id,{progression:Number(el.value)});
 }
});
// The original V5 used clickable article/div cards; make them keyboard accessible.
function v5EnhanceClickable(root=document){
 root.querySelectorAll?.('[data-ui-action]').forEach(el=>{
  if(el.matches('button,a,input,select,textarea,[role="button"]'))return;
  el.setAttribute('role','button');el.tabIndex=0;
 });
}
let v5EnhancePending=false;
const v5Observer=new MutationObserver(mutations=>{
 if(v5EnhancePending)return;
 if(!mutations.some(x=>[...x.addedNodes].some(n=>n.nodeType===1)))return;
 v5EnhancePending=true;requestAnimationFrame(()=>{v5EnhancePending=false;v5EnhanceClickable()});
});
v5Observer.observe(document.body,{subtree:true,childList:true});v5EnhanceClickable();
document.addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"][data-ui-action]')){e.preventDefault();e.target.click()}
});
const v5Xlsx=$('exportXlsxBtn');if(v5Xlsx)v5Xlsx.addEventListener('click',e=>{e.preventDefault();toast('Export XLSX historique non porté sur Cloudflare. Utilisez le rapport HTML ou les exports ICS. Aucun changement en base.');});

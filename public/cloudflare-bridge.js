/* EURASANTE CRM - passerelle Cloudflare Pages -> Supabase REST/GoTrue.
   Aucun serveur local, aucune cle service_role, aucune migration automatique.
   Contrat API compatible avec les parcours d'origine V5. */
(() => {
  'use strict';
  const ALLOW = Object.freeze({
    prospects:['nom_sponsor','statut','commentaire','date_maj','montant','referent','projet_cible','odj','lien_crm'],
    projets:['nom_projet','priorite','referent','montant_cible','date_projet','partenaire_cible','site','campagne_crm','commentaires','slides','finance','odj','actif'],
    partenariats:['source_key','partenaire','raison_sociale','type_partenariat','statut_convention','signature_statut','date_signature','date_debut','date_fin','duree_texte','renouvellement_texte','preavis_texte','objet','expertise','exclusif','perimetre_exclusivite','dispositifs','programmes','representant','referent_interne','secteur','source_referent','montants','facturation_texte','paiement_texte','resume_operationnel','droits_partenaire','obligations_partenaire','points_vigilance','source_fichiers','source_reference','clauses_source','niveau_confiance','notes_internes'],
    engagements_partenariat:['partie','service_code','categorie','titre','description','quantite_cible','unite','frequence','echeance','obligatoire','priorite','statut','progression','responsable','preuve','commentaire_suivi','source_reference','classification','dispositifs'],
    actions_pilotage_partenariat:['engagement_id','service_code','type_action','titre','description','echeance','frequence','priorite','statut','progression','responsable','preuve_attendue','preuve','commentaire_suivi','origine','ordre','date_planification','heure_planification','duree_minutes','lieu','notes_calendrier'],
    realisations_engagement_partenariat:['date_prevue','date_realisation','quantite','statut','commentaire','preuve']
  });
  const localDay=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'});
  const deaccent=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const safeId=v=>String(v??'').trim();
  const slug=s=>deaccent(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,96)||'element';
  const uniq=s=>[...new Set(s.filter(Boolean).map(String))];
  let config, sess=null, latest=null, loading=null, storageKey='eurasante-crm-cloudflare-v5-session';
  let authRequest=null;
  const headers=extra=>({...extra,'apikey':config.supabase_publishable_key});
  function allowed(table,row){const keys=new Set(ALLOW[table]||[]);return Object.fromEntries(Object.entries(row||{}).filter(([k])=>keys.has(k)));}
  function errorText(response,body){
    if(response.status===401)return 'Session Supabase expirée. Veuillez vous reconnecter.';
    if(response.status===403)return 'Action refusée par les règles de sécurité Supabase (RLS).';
    return body?.message||body?.error_description||body?.error||body?.details||`Erreur Supabase HTTP ${response.status}`;
  }
  async function http(url,opts={},withAuth=true,retry=true){
    if(withAuth && sess && sess.expires_at && sess.expires_at*1000<Date.now()+45_000)await refresh();
    const h=headers(opts.headers||{});
    if(withAuth && sess?.access_token)h.Authorization=`Bearer ${sess.access_token}`;
    const response=await fetch(url,{...opts,headers:h,cache:'no-store'});
    let body=null;const raw=await response.text();try{body=raw?JSON.parse(raw):null}catch{body=raw}
    if(response.status===401 && withAuth && retry && sess?.refresh_token){await refresh();return http(url,opts,true,false)}
    if(!response.ok)throw new Error(errorText(response,body));
    return body;
  }
  function saveSession(result){
    if(!result?.access_token || !result?.refresh_token)throw Error('La session retournée par Supabase est incomplète.');
    sess={access_token:result.access_token,refresh_token:result.refresh_token,expires_at:result.expires_at||Math.floor(Date.now()/1000)+(result.expires_in||3600),user:result.user||sess?.user||null};
    localStorage.setItem(storageKey,JSON.stringify(sess));
  }
  async function refresh(){
    if(authRequest)return authRequest;
    if(!sess?.refresh_token)throw Error('Session expirée : reconnexion nécessaire.');
    authRequest=(async()=>{try{const r=await http(`${config.supabase_url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:sess.refresh_token})},false);saveSession(r);return r;}catch(e){sess=null;localStorage.removeItem(storageKey);throw Error('La session a expiré. Reconnectez-vous.')}finally{authRequest=null}})();
    return authRequest;
  }
  async function initialise(){
    if(config)return;
    const resp=await fetch('/config.json',{cache:'no-store'});
    if(!resp.ok)throw Error('Configuration Cloudflare introuvable (/config.json).');
    config=await resp.json();
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabase_url)||!/^sb_publishable_|^eyJ/.test(config.supabase_publishable_key||''))throw Error('Configuration Supabase invalide.');
    // Reprise transparente des sessions déjà ouvertes par l'ancienne V7-V9, sans les effacer.
    const project=new URL(config.supabase_url).hostname.split('.')[0];
    const existing=localStorage.getItem(storageKey)||localStorage.getItem(`sb-${project}-auth-token`);
    if(existing){try{const parsed=JSON.parse(existing);if(parsed?.access_token&&parsed?.refresh_token){sess=parsed;localStorage.setItem(storageKey,JSON.stringify(sess))}}catch{/* session non lisible */}}
  }
  async function login(email,password){
    if(!email||!password)throw Error('Renseignez votre email et votre mot de passe.');
    const r=await http(`${config.supabase_url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:String(email).trim(),password})},false);
    saveSession(r);return {email:r.user?.email||email};
  }
  async function status(){
    if(!sess?.access_token)return {authenticated:false};
    try{const r=await http(`${config.supabase_url}/auth/v1/user`,{},true);sess.user=r;return {authenticated:true,email:r.email||sess.user?.email||''}}
    catch{sess=null;localStorage.removeItem(storageKey);return {authenticated:false}}
  }
  async function logout(){
    const old=sess;
    sess=null;latest=null;localStorage.removeItem(storageKey);
    const project=new URL(config.supabase_url).hostname.split('.')[0];localStorage.removeItem(`sb-${project}-auth-token`);
    if(old?.access_token){try{await fetch(`${config.supabase_url}/auth/v1/logout`,{method:'POST',headers:headers({Authorization:`Bearer ${old.access_token}`})})}catch{/* effacement local garanti */}}
    return {ok:true};
  }
  function restUrl(table,params=''){return `${config.supabase_url}/rest/v1/${encodeURIComponent(table)}${params?'?'+params:''}`}
  async function rows(table,{optional=false,order=null}={}){
    let all=[];
    for(let offset=0;offset<100000;offset+=1000){
      let params=`select=*&limit=1000&offset=${offset}`;
      if(order)params+=`&order=${encodeURIComponent(order)}.asc.nullslast`;
      let block;
      try{block=await http(restUrl(table,params));}
      catch(e){if(optional&&/PGRST205|PGRST204|could not find the table|schema cache|relation .* does not exist|404|does not exist/i.test(e.message))return null;throw e}
      if(!Array.isArray(block))throw Error(`Réponse inattendue pour la table ${table}`);
      all.push(...block);if(block.length<1000)return all;
    }
    throw Error(`La table ${table} dépasse le seuil de chargement sécurisé (100 000 lignes).`);
  }
  async function insert(table,payload){
    const result=await http(restUrl(table),{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    if(!Array.isArray(result)||!result.length)throw Error(`Ajout ${table} non confirmé. Vérifiez les droits RLS.`);
    return result[0];
  }
  async function update(table,id,payload){
    if(!id)throw Error(`Identifiant manquant : ${table}`);
    if(!Object.keys(payload||{}).length)throw Error('Aucune modification à enregistrer.');
    const result=await http(restUrl(table,`id=eq.${encodeURIComponent(id)}`),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    if(!Array.isArray(result)||!result.length)throw Error(`Modification non effectuée (${table}). Vérifiez le rôle et les droits Supabase.`);
    return result[0];
  }
  async function remove(table,id){
    const result=await http(restUrl(table,`id=eq.${encodeURIComponent(id)}`),{method:'DELETE',headers:{'Prefer':'return=representation'}});
    if(!Array.isArray(result)||!result.length)throw Error(`Suppression non effectuée (${table}). Vérifiez les droits Supabase.`);
    return true;
  }
  async function relationsSet(prospectId,ids){
    if(!Array.isArray(ids))return;
    const projects=latest?.projects||await rows('projets');
    const valid=uniq(ids);const pmap=new Map(projects.map(p=>[String(p.id),p]));
    for(const id of valid){const p=pmap.get(id);if(!p||p.actif===false)throw Error('Un projet sélectionné est introuvable ou désactivé : '+id)}
    const previous=await http(restUrl('prospect_projets',`select=projet_id&prospect_id=eq.${encodeURIComponent(prospectId)}`));
    const oldIds=new Set(previous.map(r=>String(r.projet_id))),nextIds=new Set(valid);
    for(const id of oldIds)if(!nextIds.has(id))await http(restUrl('prospect_projets',`prospect_id=eq.${encodeURIComponent(prospectId)}&projet_id=eq.${encodeURIComponent(id)}`),{method:'DELETE'});
    for(const id of nextIds)if(!oldIds.has(id))await http(restUrl('prospect_projets'),{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({prospect_id:prospectId,projet_id:id})});
  }
  async function prospectSave(arg,newOne){
    const d=allowed('prospects',arg);
    const ids=Array.isArray(arg.projet_ids)?uniq(arg.projet_ids):null;
    if((newOne||Object.prototype.hasOwnProperty.call(d,'nom_sponsor'))&&!d.nom_sponsor?.trim())throw Error('Le nom du prospect est obligatoire.');
    d.date_maj=d.date_maj||localDay();
    d.montant=d.montant===''?null:d.montant;
    if(ids){const projects=latest?.projects||await rows('projets');d.projet_cible=projects.find(p=>String(p.id)===ids[0])?.nom_projet||null}
    const row=newOne?await insert('prospects',d):await update('prospects',arg.id,d);
    if(ids)await relationsSet(row.id,ids);
    return {ok:true,row};
  }
  async function projectSave(arg,newOne){
    const d=allowed('projets',arg);
    if(!d.nom_projet?.trim())throw Error('Le nom du projet est obligatoire.');
    d.montant_cible=d.montant_cible===''?null:d.montant_cible;
    d.date_projet=d.date_projet||null;
    const row=newOne?await insert('projets',d):await update('projets',arg.id,d);
    return {ok:true,row,verified:true};
  }
  async function load(){
    if(loading)return loading;
    loading=(async()=>{
      const req=[['prospects','prospects',false,'nom_sponsor'],['projects','projets',false,'nom_projet'],['sourcing','sourcing',true,'created_at'],['links','prospect_projets',true,null],
        ['partenariats','partenariats',true,'partenaire'],['engagements','engagements_partenariat',true,'created_at'],['actions','actions_pilotage_partenariat',true,'created_at'],['realisations','realisations_engagement_partenariat',true,'created_at'],['services','referentiel_services_partenariats',true,'ordre'],
        ['organisations','organisations',true,'nom'],['contacts','contacts_relation',true,'email'],['rdv','rendez_vous',true,'date_rdv'],['rdv_contacts','rdv_contacts',true,null]];
      const vals=await Promise.all(req.map(async([k,t,opt,order])=>[k,await rows(t,{optional:opt,order})]));
      const o=Object.fromEntries(vals);
      const projs=o.projects||[];
      const pmap=new Map(projs.map(p=>[String(p.id),p]));
      const map=new Map();
      for(const link of o.links||[]){const pr=pmap.get(String(link.projet_id));if(!pr)continue;const key=String(link.prospect_id);if(!map.has(key))map.set(key,[]);map.get(key).push({id:pr.id,nom_projet:pr.nom_projet,actif:pr.actif!==false,priorite:pr.priorite})}
      const projByName=new Map(projs.map(p=>[deaccent(p.nom_projet),p]));
      for(const p of o.prospects){p.projets=map.get(String(p.id))||[];const legacy=p.projet_cible;
        if(legacy&&!p.projets.some(x=>deaccent(x.nom_projet)===deaccent(legacy))){const pr=projByName.get(deaccent(legacy));p.projets.push({id:pr?.id||null,nom_projet:legacy,actif:pr?.actif!==false&&!!pr,priorite:pr?.priorite||null})}
        p.projet_ids=p.projets.map(x=>x.id).filter(Boolean);
      }
      const excluded=new Set(['eurasante.com','eurasante.onmicrosoft.com','clubster-nsl.com','eurasenior.com','euralimentaire.com','vivalley-campus.com']);
      const orgs=(o.organisations||[]).filter(x=>!excluded.has(String(x.domaine||'').toLowerCase()));const orgIds=new Set(orgs.map(x=>String(x.id)));
      const contacts=(o.contacts||[]).filter(x=>!x.organisation_id||orgIds.has(String(x.organisation_id)));
      const rdv=(o.rdv||[]).filter(x=>!x.organisation_id||orgIds.has(String(x.organisation_id)));
      const cs=new Set(contacts.map(x=>String(x.id))),rs=new Set(rdv.map(x=>String(x.id)));
      const sourceById=new Map((o.partenariats||[]).map(x=>[String(x.id),x.source_key]));
      const engById=new Map((o.engagements||[]).map(x=>[String(x.id),x.source_key]));
      for(const e of o.engagements||[])e.partenaire_source_key=sourceById.get(String(e.partenariat_id))||'';
      for(const a of o.actions||[]){a.partenaire_source_key=sourceById.get(String(a.partenariat_id))||'';a.engagement_source_key=engById.get(String(a.engagement_id))||'';}
      latest={prospects:o.prospects,projects:projs,sourcing:o.sourcing||[],relations:{ready:!!o.organisations,organisations:orgs,contacts,rdv,rdv_contacts:(o.rdv_contacts||[]).filter(x=>rs.has(String(x.rdv_id))&&cs.has(String(x.contact_id)))},
       partnerships:{ready:!!o.partenariats,actions_ready:!!o.actions,v5_ready:!!o.actions && (!!o.actions[0]?Object.prototype.hasOwnProperty.call(o.actions[0],'date_planification'):true),services:o.services||[],partenariats:o.partenariats||[],engagements:o.engagements||[],actions:o.actions||[],realisations:o.realisations||[],meta:{generated_date:localDay()}},
       user:sess?.user?.email||'',server_time:new Date().toISOString()};
      return latest;
    })();
    try{return await loading}finally{loading=null}
  }
  async function savePartner(arg,table,mode){
    const d=allowed(table,arg);const id=arg.id;
    if(table==='partenariats'){
      if(!d.partenaire?.trim())throw Error('Nom du partenaire obligatoire.');
      if(mode==='add'){d.source_key=d.source_key||`${slug(d.partenaire)}-${localDay()}-${Date.now().toString(36)}`;d.statut_convention=d.statut_convention||'active';}
      else delete d.source_key;
    }
    if(table==='engagements_partenariat'){
      if((mode==='add'||Object.prototype.hasOwnProperty.call(d,'titre'))&&!d.titre?.trim())throw Error('Titre de l’engagement obligatoire.');
      if(mode==='add'){if(!arg.partenariat_id)throw Error('Partenariat manquant');d.partenariat_id=arg.partenariat_id;d.source_key=arg.source_key||`manual-${slug(d.titre)}-${Date.now()}`;}
    }
    if(table==='actions_pilotage_partenariat'){
      if((mode==='add'||Object.prototype.hasOwnProperty.call(d,'titre'))&&!d.titre?.trim())throw Error('Titre de la tâche obligatoire.');
      if(mode==='add'){if(!arg.partenariat_id)throw Error('Partenariat manquant');d.partenariat_id=arg.partenariat_id;d.source_key=arg.source_key||`manual-action-${slug(d.titre)}-${Date.now()}`;}
    }
    if(table==='realisations_engagement_partenariat'){
      if(!arg.engagement_id)throw Error('Engagement manquant');d.engagement_id=arg.engagement_id;
    }
    const row=mode==='add'?await insert(table,d):await update(table,id,d);
    return {ok:true,row};
  }
  function packageParts(input){
    const p=input.partenariat||input.partnership,eng=Array.isArray(input.engagements)?input.engagements:[],acts=Array.isArray(input.actions)?input.actions:[],services=Array.isArray(input.services)?input.services:[];
    const errors=[],warnings=[];
    if(!p||typeof p!=='object'||!p.partenaire)errors.push('Le nom de la convention (partenariat.partenaire) est obligatoire.');
    if(input.meta?.template===true)errors.push('Le fichier fourni est un modèle, non une convention renseignée.');
    if(input.schema_version&&input.schema_version!=='eurasante.partnership.v5')warnings.push('Version du schéma différente de eurasante.partnership.v5.');
    for(const e of eng)if(!e.titre||!e.source_key)errors.push('Chaque engagement nécessite un titre et source_key.');
    for(const a of acts)if(!a.titre||!a.source_key)errors.push('Chaque tâche nécessite un titre et source_key.');
    return {p,eng,acts,services,errors,warnings};
  }
  async function previewImport(input){
    const {p,eng,acts,errors,warnings}=packageParts(input);
    const parts=latest?.partnerships||((await load()).partnerships);
    const pk=new Set(parts.partenariats.map(x=>String(x.source_key))),ek=new Set(parts.engagements.map(x=>String(x.source_key))),ak=new Set(parts.actions.map(x=>String(x.source_key)));
    const pname=p?.source_key||'';
    if(p&&!pname)errors.push('source_key du partenariat obligatoire pour garantir un import non destructif.');
    const s={partnership_create:p&&!pk.has(pname)?1:0,partnership_skip:pk.has(pname)?1:0,engagements_create:eng.filter(x=>x.source_key&&!ek.has(String(x.source_key))).length,engagements_skip:eng.filter(x=>ek.has(String(x.source_key))).length,actions_create:acts.filter(x=>x.source_key&&!ak.has(String(x.source_key))).length,actions_skip:acts.filter(x=>ak.has(String(x.source_key))).length};
    return {ok:errors.length===0,summary:s,errors,warnings};
  }
  async function importJSON(input){
    const prev=await previewImport(input);if(!prev.ok)throw Error(prev.errors.join(' · '));
    const {p,eng,acts,services}=packageParts(input);const existing=latest.partnerships;
    let createdP=0,createdE=0,createdA=0;
    const pmap=new Map(existing.partenariats.map(x=>[String(x.source_key),x]));
    let part=pmap.get(String(p.source_key));
    for(const s of services){if(!s.code||!s.nom)continue;if(!existing.services.some(x=>x.code===s.code)){await insert('referentiel_services_partenariats',Object.fromEntries(Object.entries(s).filter(([k])=>['code','nom','description','ordre','actif'].includes(k))));}}
    if(!part){part=await insert('partenariats',allowed('partenariats',p));createdP++}
    const emap=new Map(existing.engagements.map(x=>[String(x.source_key),x]));
    for(const e of eng){if(emap.has(String(e.source_key)))continue;const d=allowed('engagements_partenariat',e);d.source_key=e.source_key;d.partenariat_id=part.id;const row=await insert('engagements_partenariat',d);emap.set(String(e.source_key),row);createdE++}
    const actionKeys=new Set(existing.actions.map(x=>String(x.source_key)));
    for(const a of acts){if(actionKeys.has(String(a.source_key)))continue;const d=allowed('actions_pilotage_partenariat',a);d.source_key=a.source_key;d.partenariat_id=part.id;const e=emap.get(String(a.engagement_source_key||''));if(e)d.engagement_id=e.id;await insert('actions_pilotage_partenariat',d);actionKeys.add(String(a.source_key));createdA++;}
    latest=null;return {ok:true,partnerships_added:createdP,engagements_added:createdE,actions_added:createdA};
  }
  async function createProspectFromOrg(id){
    const org=(latest?.relations?.organisations||[]).find(x=>String(x.id)===String(id));if(!org)throw Error('Organisation introuvable.');
    let p=(latest?.prospects||[]).find(x=>deaccent(x.nom_sponsor)===deaccent(org.nom));
    if(!p)p=await insert('prospects',{nom_sponsor:org.nom,statut:'1. Prise de contact',date_maj:localDay(),commentaire:'Créé depuis le référentiel relations'});
    await update('organisations',org.id,{prospect_id:p.id,statut_relation:'prospect'});return {ok:true,prospect_id:p.id};
  }
  async function sourcingToCrm(arg){
    const src=(latest?.sourcing||[]).find(x=>String(x.id)===String(arg.id));if(!src)throw Error('Cible sourcing introuvable.');
    let p=(latest?.prospects||[]).find(x=>deaccent(x.nom_sponsor)===deaccent(src.nom_cible));
    if(!p)p=await insert('prospects',{nom_sponsor:src.nom_cible,statut:'1. Prise de contact',date_maj:localDay()});
    if(Array.isArray(arg.projet_ids)&&arg.projet_ids.length)await relationsSet(p.id,uniq(arg.projet_ids));
    await update('sourcing',src.id,{importe:true,prospect_id:p.id});return {ok:true,prospect_id:p.id};
  }
  async function request(path,options={}){
    await initialise();
    const arg=options.body&&typeof options.body==='string'?JSON.parse(options.body):{};
    switch(path){
      case '/api/auth/status': return status();
      case '/api/auth/login': return login(arg.email,arg.password);
      case '/api/auth/logout': return logout();
      case '/api/data': if(!sess)throw Error('Connexion requise');return load();
      case '/api/prospect/add':return prospectSave(arg,true);
      case '/api/prospect/update':return prospectSave(arg,false);
      case '/api/prospect/delete':return {ok:await remove('prospects',arg.id)};
      case '/api/project/add':return projectSave(arg,true);
      case '/api/project/update':return projectSave(arg,false);
      case '/api/project/bulk-active':{
        if(!Array.isArray(arg.ids)||!arg.ids.length||typeof arg.actif!=='boolean')throw Error('Sélection de projets invalide.');
        let updated=0;for(const id of uniq(arg.ids)){await update('projets',id,{actif:arg.actif});updated++;}
        return {ok:true,updated,requested:arg.ids.length,verified:true};
      }
      case '/api/sourcing/to-crm':return sourcingToCrm(arg);
      case '/api/relations/rdv/status':return {ok:!!(await update('rendez_vous',arg.id,{statut:arg.statut}))};
      case '/api/relations/rdv/bulk-status':{
        const ids=uniq(arg.ids||[]);let updated=0;for(const id of ids){await update('rendez_vous',id,{statut:arg.statut});updated++;}
        return {ok:true,updated};
      }
      case '/api/relations/organisation/status':return {ok:!!(await update('organisations',arg.id,{statut_relation:arg.statut}))};
      case '/api/relations/create-prospect':return createProspectFromOrg(arg.organisation_id);
      case '/api/relations/import-history':throw Error('Import massif RDV historique indisponible sans vérification préalable des doublons. Aucun enregistrement n’a été modifié.');
      case '/api/partnership/add':return savePartner(arg,'partenariats','add');
      case '/api/partnership/update':return savePartner(arg,'partenariats','update');
      case '/api/partnership/engagement/add':{
        const r=await savePartner(arg,'engagements_partenariat','add');return r;
      }
      case '/api/partnership/engagement/update':return savePartner(arg,'engagements_partenariat','update');
      case '/api/partnership/action/add':return savePartner(arg,'actions_pilotage_partenariat','add');
      case '/api/partnership/action/update':return savePartner(arg,'actions_pilotage_partenariat','update');
      case '/api/partnership/realisation/add':return savePartner(arg,'realisations_engagement_partenariat','add');
      case '/api/partnerships/import-json-preview':return previewImport(arg);
      case '/api/partnerships/import-json':return importJSON(arg);
      case '/api/import/apply':throw Error('Import Excel non disponible sur Cloudflare Pages. La base n’a pas été modifiée.');
      default:throw Error(`Action serveur non portée : ${path}. Aucune donnée modifiée.`);
    }
  }
  function icsEscape(v){return String(v??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,')}
  function icsStamp(){return new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z')}
  function exportICS(ids){
    const actions=(latest?.partnerships?.actions||[]).filter(a=>ids.map(String).includes(String(a.id)));
    const parts=new Map((latest?.partnerships?.partenariats||[]).map(x=>[String(x.id),x.partenaire]));
    const out=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Eurasante CRM V5//Cloudflare//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    for(const a of actions){const day=String(a.date_planification||a.echeance||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
      const ymd=day.replaceAll('-',''),time=String(a.heure_planification||'').slice(0,5);
      const hasTime=/^\d{2}:\d{2}$/.test(time);
      out.push('BEGIN:VEVENT',`UID:eurasante-crm-${String(a.id).replace(/[^a-zA-Z0-9-]/g,'')}@eurasante.com`,`DTSTAMP:${icsStamp()}`);
      if(hasTime){const [h,m]=time.split(':').map(Number);const dur=Number(a.duree_minutes)||60;const end=new Date(`${day}T${time}:00Z`);end.setUTCMinutes(end.getUTCMinutes()+dur);
        out.push(`DTSTART;TZID=Europe/Paris:${ymd}T${time.replace(':','')}00`,`DTEND;TZID=Europe/Paris:${end.toISOString().slice(0,10).replaceAll('-','')}T${end.toISOString().slice(11,19).replaceAll(':','')}`);
      }else{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);out.push(`DTSTART;VALUE=DATE:${ymd}`,`DTEND;VALUE=DATE:${d.toISOString().slice(0,10).replaceAll('-','')}`)}
      out.push(`SUMMARY:${icsEscape(a.titre||'Tâche partenariat')}`,`DESCRIPTION:${icsEscape([parts.get(String(a.partenariat_id)),a.description,a.responsable,a.preuve_attendue].filter(Boolean).join('\n'))}`,`LOCATION:${icsEscape(a.lieu||'')}`,'END:VEVENT');
    }
    out.push('END:VCALENDAR');return new Blob([out.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
  async function exportHTML(){
    if(!latest)await load();
    const res=await fetch('/templates/partnership_report_template.html');if(!res.ok)throw Error('Le modèle HTML historique est introuvable.');
    const template=await res.text();const {meta,services,partenariats,engagements,actions}=latest.partnerships;
    const safe=JSON.stringify({meta,services,partenariats,engagements,actions}).replace(/<\//g,'<\\/');
    download(new Blob([template.replace('__DATA_JSON__',safe)],{type:'text/html;charset=utf-8'}),`Partenariats_Eurasante_${localDay()}.html`);
  }
  async function inspectExcel(){throw Error('La prévisualisation Excel nécessite un moteur de parsing à porter sur Cloudflare. Aucun import n’a été lancé.');}
  window.CRM_BRIDGE={initialise,request,exportICS,download,exportHTML,inspectExcel,localDay,read:()=>latest};
})();

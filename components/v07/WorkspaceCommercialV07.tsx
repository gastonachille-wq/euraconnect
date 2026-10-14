'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {Building2,ClipboardList,Search,Send,MessagesSquare,UserCheck,
 RefreshCw,ArrowRight,PlusCircle,CheckCircle2,Clock,Filter,History,
 LockKeyhole,ArrowUpRight,ShieldCheck} from 'lucide-react';
import {db} from '@/lib/supabase';
import RichEditor,{RichContent,richPlainText} from '@/components/v06/RichEditor';

type Company={id:string;nom:string;type:string;statut:string;role_membre:string};
type Dossier={dossier_id:string;nature:'besoin'|'candidature';projet_id:string;titre:string;
 candidature_id:string|null;proposition:string|null;candidat:string|null;statut_candidature:string|null;
 relation_id:string|null;statut_relation:string|null;conversation_id:string|null;
 statut_opportunite:string|null;assigne_a:string|null;assigne_nom:string|null;cree_le:string};
type Need={id:string;titre:string;description:string;budget_centimes:number|null;score:number;deja_repondu:boolean;created_at:string};
type Member={profile_id:string;nom_public:string;role_membre:string;actif:boolean};
type Message={id:string;auteur_id:string;corps:string;created_at:string};
type Activity={action:string;detail:string;auteur:string;created_at:string};
type Unattached={id:string;titre:string};
const errorMessage=(e:unknown)=>e instanceof Error?e.message:String(e);
const euros=(cents:number|null)=>cents===null?'Sur devis':new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(cents/100);
const relativeDate=(date:string)=>new Date(date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
const opportunityLabels:Record<string,string>={contact:'Contact etabli',rdv:'Rendez-vous',proposition:'Proposition envoyee',gagnee:'Mission concretisee',perdue:'Sans suite'};
const relationLabels:Record<string,string>={demandee:'Validation attendue',acceptee:'Contact etabli',refusee:'Contact refuse'};

export default function WorkspaceCommercialV07({userId}:{userId:string}){
 const [companies,setCompanies]=useState<Company[]>([]);
 const [selected,setSelected]=useState('');
 const [dossiers,setDossiers]=useState<Dossier[]>([]);
 const [needs,setNeeds]=useState<Need[]>([]);
 const [members,setMembers]=useState<Member[]>([]);
 const [unattached,setUnattached]=useState<Unattached[]>([]);
 const [activeId,setActiveId]=useState('');
 const [conversationId,setConversationId]=useState('');
 const [messages,setMessages]=useState<Message[]>([]);
 const [activity,setActivity]=useState<Activity[]>([]);
 const [view,setView]=useState<'inbox'|'market'>('inbox');
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('tous');
 const [newTitle,setNewTitle]=useState('');
 const [newDescription,setNewDescription]=useState('');
 const [newBudget,setNewBudget]=useState('');
 const [responseFor,setResponseFor]=useState('');
 const [responseText,setResponseText]=useState('');
 const [draftMessage,setDraftMessage]=useState('');
 const [stage,setStage]=useState('contact');
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const company=companies.find(c=>c.id===selected);
 const isManager=company?.role_membre==='proprietaire'||company?.role_membre==='gestionnaire';
 const isStartup=company?.type==='startup';
 const isProvider=company?.type==='prestataire';
 const active=dossiers.find(d=>d.dossier_id===activeId);
 const canRespond=!!active&&(isManager||active.assigne_a===userId);

 const loadCompanies=useCallback(async()=>{
  const r=await db().rpc('ec_mes_entreprises');if(r.error)throw r.error;
  const rows=(r.data||[]) as Company[];setCompanies(rows);
  setSelected(old=>rows.some(c=>c.id===old)?old:rows[0]?.id||'');
 },[]);
 const loadData=useCallback(async(ent:Company)=>{
  const client=db();
  const [ds,mm,nn]=await Promise.all([
   client.rpc('ec07_lister_dossiers',{p_entreprise:ent.id}),
   client.rpc('ec_lister_membres',{p_entreprise:ent.id}),
   ent.type==='prestataire'?client.rpc('ec07_besoins_disponibles',{p_entreprise:ent.id,p_recherche:''}):Promise.resolve({data:[],error:null})
  ]);
  if(ds.error)throw ds.error;if(mm.error)throw mm.error;if(nn.error)throw nn.error;
  setDossiers((ds.data||[]) as Dossier[]);setMembers(((mm.data||[]) as Member[]).filter(m=>m.actif));
  setNeeds((nn.data||[]) as Need[]);
  if(ent.type==='startup'){
   const legacy=await client.from('projets').select('id,titre').eq('incube_id',userId).is('entreprise_id',null).limit(30);
   if(legacy.error)throw legacy.error;
   setUnattached((legacy.data||[]) as Unattached[]);
  }else setUnattached([]);
 },[userId]);
 const loadMessages=useCallback(async(conv:string)=>{
  const r=await db().from('messages_ec').select('id,auteur_id,corps,created_at')
    .eq('conversation_id',conv).order('created_at',{ascending:true}).limit(200);
  if(r.error)throw r.error;setMessages((r.data||[]) as Message[]);
 },[]);
 const loadActivity=useCallback(async(ent:string,caseId:string)=>{
  const r=await db().rpc('ec07_historique',{p_entreprise:ent,p_candidature:caseId});
  if(r.error)throw r.error;setActivity((r.data||[]) as Activity[]);
 },[]);
 useEffect(()=>{void loadCompanies().catch(e=>setError(errorMessage(e)));},[loadCompanies,userId]);
 useEffect(()=>{
  if(!company){setDossiers([]);setNeeds([]);setActiveId('');return;}
  setActiveId('');setConversationId('');setMessages([]);setActivity([]);setError('');
  void loadData(company).catch(e=>setError(errorMessage(e)));
 },[selected,company?.type,loadData]);
 useEffect(()=>{
  if(!active?.candidature_id||!selected){setActivity([]);return;}
  void loadActivity(selected,active.candidature_id).catch(e=>setError(errorMessage(e)));
 },[active?.candidature_id,selected,loadActivity]);
 useEffect(()=>{
  setConversationId(active?.conversation_id||'');
  setStage(active?.statut_opportunite||'contact');setNote('');
 },[active?.dossier_id,active?.conversation_id,active?.statut_opportunite]);
 useEffect(()=>{
  if(!conversationId){setMessages([]);return;}
  void loadMessages(conversationId).catch(e=>setError(errorMessage(e)));
  const timer=setInterval(()=>void loadMessages(conversationId).catch(()=>{}),12000);
  return()=>clearInterval(timer);
 },[conversationId,loadMessages]);
 async function action(f:()=>Promise<void>,success='Modifications enregistrees.'){
  setBusy(true);setError('');setNotice('');
  try {await f();setNotice(success);if(company)await loadData(company);}
  catch(e){setError(errorMessage(e));}
  finally {setBusy(false);}
 }
 async function createNeed(e:FormEvent){e.preventDefault();if(!company)return;
  await action(async()=>{
   const plain=richPlainText(newDescription);
   if(plain.length<50)throw new Error('Decrivez votre besoin sur au moins 50 caracteres.');
   const amount=newBudget.trim()?Math.round(Number(newBudget)*100):null;
   if(amount!==null&&(!Number.isSafeInteger(amount)||amount<0))throw new Error('Budget incorrect.');
   const r=await db().rpc('ec07_publier_besoin',{p_entreprise:company.id,p_titre:newTitle,
     p_description:plain,p_budget_centimes:amount,p_html:newDescription});
   if(r.error)throw r.error;setNewTitle('');setNewDescription('');setNewBudget('');
  },'Besoin publie pour votre entreprise.');
 }
 async function applyForNeed(e:FormEvent){e.preventDefault();if(!company||!responseFor)return;
  await action(async()=>{
   const r=await db().rpc('ec07_candidater',{p_entreprise:company.id,p_projet:responseFor,p_message:responseText});
   if(r.error)throw r.error;setResponseFor('');setResponseText('');
  },'Candidature transmise sous alias.');
 }
 async function beginRelation(row:Dossier){if(!company||!row.candidature_id)return;
  await action(async()=>{
   const r=await db().rpc('ec07_demander_relation',{p_entreprise:company.id,p_candidature:row.candidature_id});
   if(r.error)throw r.error;
  },'Demande de mise en relation envoyee.');
 }
 async function respondRelation(row:Dossier,accept:boolean){if(!company||!row.relation_id)return;
  await action(async()=>{
   const r=await db().rpc('ec07_repondre_relation',{p_entreprise:company.id,p_relation:row.relation_id,p_accepter:accept});
   if(r.error)throw r.error;
  },accept?'Identite partagee avec la startup.':'Demande declinee.');
 }
 async function openThread(row:Dossier){if(!row.relation_id)return;
  await action(async()=>{
   const r=await db().rpc('ec07_ouvrir_conversation',{p_relation:row.relation_id});
   if(r.error)throw r.error;if(r.data)setConversationId(r.data as string);
  },'Conversation accessible.');
 }
 async function send(e:FormEvent){e.preventDefault();if(!conversationId)return;
  await action(async()=>{
   const r=await db().rpc('ec07_envoyer_message',{p_conversation:conversationId,p_corps:draftMessage});
   if(r.error)throw r.error;setDraftMessage('');await loadMessages(conversationId);
   if(company&&active?.candidature_id)await loadActivity(company.id,active.candidature_id);
  },'Message envoye.');
 }
 async function assign(caseId:string,personId:string){if(!company)return;
  await action(async()=>{
   const r=await db().rpc('ec07_assigner_dossier',{p_entreprise:company.id,p_candidature:caseId,p_responsable:personId});
   if(r.error)throw r.error;await loadActivity(company.id,caseId);
  },'Responsable du dossier mis a jour.');
 }
 async function saveStage(e:FormEvent){e.preventDefault();if(!conversationId)return;
  await action(async()=>{
   const r=await db().rpc('ec07_suivre_opportunite',{p_conversation:conversationId,p_statut:stage,p_commentaire:note});
   if(r.error)throw r.error;
   if(company&&active?.candidature_id)await loadActivity(company.id,active.candidature_id);
  },'Etape commerciale mise a jour.');
 }
 const filtered=useMemo(()=>dossiers.filter(d=>{
  const matches=(d.titre+' '+(d.candidat||'')).toLowerCase().includes(search.toLowerCase());
  if(!matches)return false;
  if(filter==='en-attente')return !d.relation_id&&!!d.candidature_id||d.statut_relation==='demandee';
  if(filter==='actifs')return d.statut_relation==='acceptee';
  if(filter==='sans-candidat')return !d.candidature_id;
  return true;
 }),[dossiers,search,filter]);
 const stats={cases:dossiers.length,relations:dossiers.filter(d=>d.statut_relation==='acceptee').length,
   enAttente:dossiers.filter(d=>d.statut_relation==='demandee').length,
   nonAttribues:dossiers.filter(d=>d.candidature_id&&!d.assigne_a).length};
 return <div className="v07-workspace">
  <div className="v07-head"><div><span className="section-eyebrow">Operations commerciales</span>
   <h2>Votre espace de travail partage</h2><p className="muted">Besoins, candidatures, messages et suites commerciales de votre entreprise.</p></div>
   <button className="btn ghost" disabled={busy} onClick={()=>company&&void action(()=>loadData(company),'Donnees actualisees.')}><RefreshCw size={16}/> Actualiser</button>
  </div>
  {error&&<div className="alert" role="alert">{error}</div>}
  {notice&&<div className="alert ok" role="status">{notice}</div>}
  {!companies.length?<div className="panel"><Building2 size={28}/><h3>Entreprise non rattachee</h3>
   <p>Rattachez d'abord votre compte a une startup ou une entreprise prestataire depuis l'espace Entreprise.</p></div>:
   <><div className="v07-company">
    <div className="v07-company-icon"><Building2 size={23}/></div>
    <div className="v07-company-info"><b>{company?.nom}</b><small>{isStartup?'Startup incubee':isProvider?'Entreprise prestataire':'Entreprise'} · {company?.role_membre}</small></div>
    {companies.length>1&&<select aria-label="Choisir son entreprise" value={selected} onChange={e=>setSelected(e.target.value)}>
     {companies.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select>}
   </div>
   {!isStartup&&!isProvider?<div className="panel">Ce type d'entreprise ne porte pas de dossiers commerciaux.</div>:<>
    <div className="v07-metrics">
     <div><span>Dossiers</span><strong>{stats.cases}</strong><ClipboardList size={19}/></div>
     <div><span>Relations acceptees</span><strong>{stats.relations}</strong><UserCheck size={19}/></div>
     <div><span>Reponses attendues</span><strong>{stats.enAttente}</strong><Clock size={19}/></div>
     <div><span>Non attribues</span><strong>{stats.nonAttribues}</strong><ShieldCheck size={19}/></div>
    </div>
    <div className="v07-tabs"><button type="button" className={view==='inbox'?'selected':''} onClick={()=>setView('inbox')}>
     <MessagesSquare size={18}/> Boite de dossiers <span>{dossiers.length}</span></button>
     {isProvider&&<button type="button" className={view==='market'?'selected':''} onClick={()=>setView('market')}>
      <Search size={18}/> Besoins auxquels repondre</button>}
    </div>
    {isStartup&&isManager&&<details className="panel v07-compose"><summary><PlusCircle size={18}/> Publier un nouveau besoin au nom de l'entreprise</summary>
     <form onSubmit={createNeed} className="v07-compose-form">
      <div className="field"><label>Titre du besoin</label><input required minLength={8} maxLength={150} value={newTitle} onChange={e=>setNewTitle(e.target.value)}/></div>
      <RichEditor label="Description complete (50 caracteres minimum)" value={newDescription} onChange={setNewDescription}/>
      <div className="field"><label>Budget indicatif en euros (facultatif)</label><input type="number" min={0} step="0.01" value={newBudget} onChange={e=>setNewBudget(e.target.value)}/></div>
      <button className="btn" disabled={busy} type="submit">Publier le besoin <ArrowUpRight size={15}/></button>
     </form></details>}
    {isStartup&&unattached.length>0&&<div className="callout"><b>Anciens besoins non rattaches</b><p>Ces demandes restent personnelles tant que vous ne les attribuez pas a une entreprise.</p>
      {unattached.map(n=><div key={n.id} className="v07-unattached"><span>{n.titre}</span><button className="btn small ghost" disabled={!isManager||busy} onClick={()=>company&&void action(async()=>{
       const r=await db().rpc('ec07_rattacher_besoin',{p_besoin:n.id,p_entreprise:company.id});if(r.error)throw r.error;
      },'Besoin rattache.')}>Rattacher ici</button></div>)}
    </div>}
    {view==='market'&&isProvider?<section className="panel"><div className="v07-list-header"><div><h3>Appels a besoins ouverts</h3><p>Les scores utilisent les competences communes et la recherche textuelle.</p></div></div>
     <form className="v07-filterline" onSubmit={e=>{e.preventDefault();if(!company)return;void (async()=>{setBusy(true);setError('');try{const r=await db().rpc('ec07_besoins_disponibles',{p_entreprise:company.id,p_recherche:search});
      if(r.error)throw r.error;setNeeds((r.data||[]) as Need[]);}catch(ex){setError(errorMessage(ex));}finally{setBusy(false);}})();}}>
      <input aria-label="Rechercher un besoin" placeholder="Ex. strategie, comptabilite, financement" value={search} onChange={e=>setSearch(e.target.value)}/>
      <button className="btn" type="submit"><Search size={16}/> Rechercher</button>
     </form>
     <div className="v07-needs">{needs.map(n=><article key={n.id} className="v07-need"><div><span className="pill">Correspondance {n.score} points</span>
      <h4>{n.titre}</h4><p>{n.description}</p><small>{euros(n.budget_centimes)} · {relativeDate(n.created_at)}</small></div>
      <button className="btn small" disabled={busy||!isManager||n.deja_repondu} onClick={()=>setResponseFor(n.id)}>
       {n.deja_repondu?'Deja repondu':'Repondre'}</button></article>)}
      {!needs.length&&<div className="empty">Aucun besoin disponible pour cette recherche.</div>}</div>
     {responseFor&&<form className="v07-reply panel" onSubmit={applyForNeed}><h3>Proposition pour {needs.find(n=>n.id===responseFor)?.titre}</h3>
      <p className="muted">Candidature sous alias. Les contacts ne sont reveles qu'apres accord mutuel.</p>
      <div className="field"><label>Reponse construite (100 caracteres minimum)</label><textarea required minLength={100} maxLength={5000} rows={7} value={responseText} onChange={e=>setResponseText(e.target.value)}/></div>
      <button className="btn" disabled={busy} type="submit"><Send size={16}/> Envoyer ma candidature</button>
      <button className="btn ghost" type="button" onClick={()=>setResponseFor('')}>Annuler</button>
     </form>}</section>:
    <div className="v07-inbox"><section className="panel v07-list-pane"><div className="v07-list-header"><div><span className="section-eyebrow">Boite partagee</span><h3>{isStartup?'Besoins et propositions':'Mes candidatures'}</h3></div><Filter size={18}/></div>
      <div className="v07-filterline"><input aria-label="Filtrer les dossiers" placeholder="Rechercher un dossier..." value={search} onChange={e=>setSearch(e.target.value)}/>
       <select aria-label="Filtrer par etat" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="tous">Tous</option><option value="en-attente">A traiter</option>
        <option value="actifs">En relation</option>{isStartup&&<option value="sans-candidat">Sans reponse</option>}</select></div>
      <div className="v07-case-list">{filtered.map(d=><button type="button" key={d.dossier_id} onClick={()=>setActiveId(d.dossier_id)}
        className={'v07-case'+(activeId===d.dossier_id?' active':'')}>
        <span className="v07-case-name">{d.titre}</span><small>{d.candidat||'En attente de candidature'} · {relativeDate(d.cree_le)}</small>
        <span className="v07-case-meta"><span className="pill">{d.statut_opportunite?opportunityLabels[d.statut_opportunite]:d.statut_relation?relationLabels[d.statut_relation]:d.statut_candidature||'Sans reponse'}</span>
        {d.assigne_nom&&<span className="v07-assigned">{d.assigne_nom}</span>}</span>
       </button>)}{!filtered.length&&<div className="empty">Aucun dossier pour ces filtres.</div>}</div>
     </section>
     <section className="panel v07-detail">{!active?<div className="v07-no-selection"><ClipboardList size={34}/><h3>Selectionnez un dossier</h3>
      <p>Consultez la candidature, attribuez un responsable et poursuivez la relation.</p></div>:<>
       <span className="section-eyebrow">Dossier de votre entreprise</span><h3>{active.titre}</h3>
       <div className="v07-tags"><span className="pill red">{active.candidat||'Aucune candidature'}</span>
        <span className="pill">{active.statut_relation?relationLabels[active.statut_relation]||active.statut_relation:'Sans relation'}</span></div>
       {active.proposition&&<div className="v07-proposition"><b>Proposition du prestataire</b><p>{active.proposition}</p></div>}
       {active.candidature_id&&<div className="v07-assignment"><label htmlFor="v07-assignee">Responsable interne</label>
        {isManager?<select id="v07-assignee" value={active.assigne_a||''} disabled={busy}
          onChange={e=>{if(e.target.value&&active.candidature_id)void assign(active.candidature_id,e.target.value);}}>
          <option value="">Non attribue</option>{members.map(m=><option key={m.profile_id} value={m.profile_id}>{m.nom_public} ({m.role_membre})</option>)}</select>
         :<strong>{active.assigne_nom||'Non attribue'}</strong>}
        <small>Un collaborateur attribue peut repondre et suivre le dossier. Les gestionnaires pilotent l'ensemble.</small></div>}
       {isStartup&&active.candidature_id&&!active.relation_id&&isManager&&
         <button className="btn" disabled={busy} onClick={()=>void beginRelation(active)}>Demander la mise en relation <ArrowRight size={16}/></button>}
       {isProvider&&active.relation_id&&active.statut_relation==='demandee'&&isManager&&
        <div className="actions"><button className="btn" disabled={busy} onClick={()=>void respondRelation(active,true)}><CheckCircle2 size={16}/> Accepter le contact</button>
         <button className="btn ghost" disabled={busy} onClick={()=>void respondRelation(active,false)}>Refuser</button></div>}
       {active.relation_id&&active.statut_relation==='acceptee'&&!conversationId&&
         <button className="btn" disabled={busy} onClick={()=>void openThread(active)}><MessagesSquare size={16}/> Ouvrir la conversation</button>}
       {active.relation_id&&active.statut_relation==='acceptee'&&conversationId&&<div className="v07-chat">
         <div className="v07-chat-title"><MessagesSquare size={18}/> Conversation entre entreprises
          <button className="btn small ghost" onClick={()=>void loadMessages(conversationId)}><RefreshCw size={14}/> Actualiser</button></div>
         <div className="v07-chat-messages" role="log" aria-label="Messages de la conversation">
          {messages.map(m=><div className={'v07-bubble'+(m.auteur_id===userId?' mine':'')} key={m.id}>
            <small>{m.auteur_id===userId?'Moi':'Interlocuteur'} · {new Date(m.created_at).toLocaleString('fr-FR')}</small><p>{m.corps}</p></div>)}
          {!messages.length&&<p className="muted">Aucun message. Debutez l'echange.</p>}</div>
         <form onSubmit={send} className="v07-message-form"><textarea aria-label="Ecrire un message" value={draftMessage} onChange={e=>setDraftMessage(e.target.value)}
             disabled={!canRespond||busy} maxLength={4000} required placeholder={canRespond?'Votre message...':'Lecture seule : demandez une attribution'} rows={3}/>
          <button className="btn" type="submit" disabled={busy||!canRespond||!draftMessage.trim()}><Send size={15}/> Envoyer</button></form>
         <form onSubmit={saveStage} className="v07-follow"><h4>Suite commerciale</h4>
          <div className="fields"><div className="field"><label>Etape</label><select disabled={!canRespond||busy} value={stage} onChange={e=>setStage(e.target.value)}>
            {Object.entries(opportunityLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}
           </select></div><div className="field"><label>Commentaire partage</label><input disabled={!canRespond||busy} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex. Proposition envoyee"/></div></div>
          <button className="btn small" disabled={busy||!canRespond}>Mettre a jour</button></form>
        </div>}
       {active.candidature_id&&<div className="v07-history"><h4><History size={16}/> Historique interne</h4>
         {activity.map((a,i)=><div className="v07-history-line" key={i}><b>{a.action.replaceAll('_',' ')}</b><small>{a.auteur} · {relativeDate(a.created_at)}</small>
          {a.detail&&<span>{a.detail}</span>}</div>)}
         {!activity.length&&<p className="muted">Aucune action interne enregistree.</p>}</div>}
      </>}</section>
    </div>}
   </>}
  </>}
 </div>;
}

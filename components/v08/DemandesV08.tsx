'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowRight,CheckCircle2,ChevronDown,ClipboardList,Clock3,Eye,EyeOff,
 History,LockKeyhole,MessageSquare,Plus,RefreshCw,Search,Send,SlidersHorizontal,X} from 'lucide-react';
import {db} from '@/lib/supabase';
import RichEditor,{richPlainText} from '@/components/v06/RichEditor';
import {SkillPicker} from '@/components/v06/MediaAndSkills';
import FavoriteToggle,{useSavedTargets} from '@/components/v06/FavoriteToggle';
import NeedTagPicker from '@/components/v08/NeedTagPicker';
import TagEditor from '@/components/v06/TagEditor';

type Company={id:string;nom:string;type:string;role_membre:string};
type Need={id:string;entreprise_id:string|null;titre:string;titre_anonyme:string;description:string;
 annonce_anonyme:string;budget_centimes:number|null;statut_suivi:string;statut:string;
 nb_reponses:number;created_at:string;statut_modifie_le:string};
type MarketNeed={id:string;titre:string;description:string;budget_centimes:number|null;
 statut_suivi:string;score:number;deja_repondu:boolean;demandeur:string|null;
 identite_visible:boolean;created_at:string};
type HistoryEntry={ancien_statut:string;nouveau_statut:string;commentaire:string;created_at:string};
export const LABELS:Record<string,string>={ouvert:'Ouvert',en_echanges:'Échanges en cours',rdv_planifie:'RDV planifié',devis_recu:'Devis reçu',en_realisation:'En réalisation',termine:'Terminé',en_pause:'En pause',sans_suite:'Sans suite',reouvert:'Réouvert'};
const STATES=Object.keys(LABELS);
const transitions:Record<string,string[]>={
 ouvert:['en_echanges','en_pause','sans_suite'],reouvert:['en_echanges','en_pause','sans_suite'],
 en_echanges:['rdv_planifie','devis_recu','en_pause','sans_suite'],
 rdv_planifie:['en_echanges','devis_recu','en_pause','sans_suite'],
 devis_recu:['en_echanges','en_realisation','en_pause','sans_suite'],
 en_realisation:['termine','en_pause','sans_suite'],en_pause:['reouvert','sans_suite'],
 sans_suite:['reouvert'],termine:['reouvert']
};
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
const dateLabel=(v:string)=>new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
const money=(v:number|null)=>v===null?'Budget à définir':`${(v/100).toLocaleString('fr-FR',{maximumFractionDigits:0})} €`;
function Status({value}:{value:string}){return <span className={`ec08-status ec08-status-${value}`}><span className="ec08-status-dot"/>{LABELS[value]||value}</span>;}

export default function DemandesV08({role,onNavigate}:{role:'admin'|'incube'|'prestataire';onNavigate?:(page:string)=>void}){
 const [companies,setCompanies]=useState<Company[]>([]),[companyId,setCompanyId]=useState('');
 const [scope,setScope]=useState<'mine'|'marche'>(role==='incube'?'mine':'marche');
 const [mine,setMine]=useState<Need[]>([]),[market,setMarket]=useState<MarketNeed[]>([]);
 const [query,setQuery]=useState(''),[filter,setFilter]=useState(''),[busy,setBusy]=useState(false);
 const [onlySaved,setOnlySaved]=useState(false),saved=useSavedTargets('besoin'),[requestedTags,setRequestedTags]=useState<string[]>([]);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [creating,setCreating]=useState(false),[expanded,setExpanded]=useState('');
 const [title,setTitle]=useState(''),[description,setDescription]=useState('');
 const [anonTitle,setAnonTitle]=useState(''),[anonDescription,setAnonDescription]=useState('');
 const [price,setPrice]=useState(''),[skills,setSkills]=useState<string[]>([]);
 const [responseFor,setResponseFor]=useState(''),[response,setResponse]=useState('');
 const [nextStatus,setNextStatus]=useState(''),[reason,setReason]=useState('');
 const [anonEdit,setAnonEdit]=useState<string|null>(null),[editTitle,setEditTitle]=useState(''),[editSummary,setEditSummary]=useState('');
 const [history,setHistory]=useState<HistoryEntry[]>([]);
 const lastLoad=useRef(0);
 const company=companies.find(c=>c.id===companyId);
 const canPublish=role==='incube'&&company?.type==='startup'&&['proprietaire','gestionnaire'].includes(company.role_membre);
 const canApply=role==='prestataire'&&company?.type==='prestataire'&&['proprietaire','gestionnaire'].includes(company.role_membre);
 useEffect(()=>{
  let active=true;
  void db().rpc('ec_mes_entreprises').then(({data,error:e})=>{
   if(!active)return;
   if(e){setError(e.message);return;}
   const result=((data||[]) as Company[]).filter(c=>role==='incube'?c.type==='startup':role==='prestataire'?c.type==='prestataire':true);
   setCompanies(result);setCompanyId(result[0]?.id||'');
  });return()=>{active=false;};
 },[role]);
 async function loadMine(){const r=await db().rpc('ec08_mes_besoins',{p_entreprise:companyId||null});if(r.error)throw r.error;setMine((r.data||[]) as Need[]);}
 async function loadMarket(){const req=++lastLoad.current;
  const r=await db().rpc('ec08_fil_besoins',{p_entreprise:role==='prestataire'&&companyId?companyId:null,
   p_recherche:query.trim(),p_filtre_statut:filter});
  if(r.error)throw r.error;if(req===lastLoad.current)setMarket((r.data||[]) as MarketNeed[]);
 }
 async function load(){setBusy(true);setError('');try{if(role==='incube')await loadMine();await loadMarket();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 useEffect(()=>{const timeout=setTimeout(()=>{void load();},query?350:0);return()=>clearTimeout(timeout);},[companyId,query,filter,role]);
 async function act(cb:()=>Promise<void>,success='Modifications enregistrées.'){
  setError('');setNotice('');setBusy(true);
  try{await cb();setNotice(success);if(role==='incube')await loadMine();await loadMarket();}
  catch(e){setError(errorText(e));}finally{setBusy(false);}
 }
 async function publish(e:FormEvent){e.preventDefault();if(!companyId)return;
  await act(async()=>{
   const plain=richPlainText(description);if(plain.length<50)throw new Error('Ajoute une description complète d’au moins 50 caractères.');
   const cents=price.trim()?Math.round(Number(price)*100):null;
   if(cents!==null&&(!Number.isSafeInteger(cents)||cents<0))throw new Error('Budget incorrect.');
   const r=await db().rpc('ec08_publier_besoin',{p_entreprise:companyId,p_titre:title,
    p_description:plain,p_titre_anonyme:anonTitle,p_annonce_anonyme:anonDescription,
    p_budget_centimes:cents,p_html:description});
   if(r.error)throw r.error;
   if(skills.length&&r.data){const x=await db().rpc('ec_set_competences',{
    p_cible:'projet',p_id:r.data,p_competences:skills});if(x.error)throw new Error(`Besoin créé, mais compétences non enregistrées : ${x.error.message}`);}
   if(requestedTags.length&&r.data){const ids:string[]=[];for(const label of requestedTags){const t=await db().rpc('ec085_creer_tag',{p_libelle:label});if(t.error)throw new Error('Besoin publié mais tag non associé : '+t.error.message);ids.push((t.data as {id:string}).id);}const link=await db().rpc('ec085_definir_tags',{p_type:'besoin',p_id:r.data,p_tags:ids});if(link.error)throw new Error('Besoin publié mais tags non associés : '+link.error.message);}
   setCreating(false);setTitle('');setDescription('');setAnonTitle('');setAnonDescription('');setSkills([]);setRequestedTags([]);setPrice('');
  },'Besoin publié, avec une annonce anonymisée accessible aux prestataires Free/Pro.');
 }
 async function apply(e:FormEvent){e.preventDefault();if(!responseFor||!companyId)return;
  await act(async()=>{const r=await db().rpc('ec07_candidater',{
   p_entreprise:companyId,p_projet:responseFor,p_message:response});
   if(r.error)throw r.error;setResponse('');setResponseFor('');
  },'Réponse envoyée. La startup voit le nom de votre entreprise.');
 }
 async function changeStatus(e:FormEvent,need:Need){e.preventDefault();if(!nextStatus)return;
  await act(async()=>{const r=await db().rpc('ec08_changer_statut_besoin',{
   p_besoin:need.id,p_statut:nextStatus,p_commentaire:reason});
   if(r.error)throw r.error;setNextStatus('');setReason('');
   const h=await db().rpc('ec08_historique_besoin',{p_besoin:need.id});if(!h.error)setHistory((h.data||[]) as HistoryEntry[]);
  },'Statut mis à jour. Il apparaît dans la bourse des besoins.');
 }
 async function saveAnonymized(e:FormEvent,need:Need){e.preventDefault();
  await act(async()=>{const r=await db().rpc('ec08_modifier_annonce',{
   p_besoin:need.id,p_titre_anonyme:editTitle,p_annonce_anonyme:editSummary});
   if(r.error)throw r.error;setAnonEdit(null);
  },'Annonce anonyme enregistrée.');
 }
 async function expandNeed(need:Need){setExpanded(old=>old===need.id?'':need.id);setNextStatus('');setReason('');setHistory([]);
  const r=await db().rpc('ec08_historique_besoin',{p_besoin:need.id});if(!r.error)setHistory((r.data||[]) as HistoryEntry[]);
 }
 const activeCount=mine.filter(n=>!['termine','sans_suite'].includes(n.statut_suivi)).length;
 const replied=mine.filter(n=>n.nb_reponses>0).length;
 return <section className="ec08-page">
  <div className="ec08-page-title"><div><span className="section-eyebrow">Opportunités & projets</span><h1>{role==='incube'?'Mes demandes et opportunités':'Bourse des besoins'}</h1>
   <p className="sub">Des besoins clairs, des prestataires identifiés, un suivi partagé à chaque étape.</p></div>
   <button className="btn ghost" onClick={()=>void load()} disabled={busy}><RefreshCw size={15}/> Actualiser</button></div>
  {error&&<div className="alert" role="alert">{error}</div>}{notice&&<div className="alert ok" role="status">{notice}</div>}
  {companies.length>1&&<div className="ec08-inline-company"><label>Entreprise active</label><select value={companyId} onChange={e=>setCompanyId(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>}
  {role==='incube'&&<div className="ec08-overview"><div><strong>{mine.length}</strong><span>Besoins publiés</span></div><div><strong>{activeCount}</strong><span>À suivre</span></div><div><strong>{replied}</strong><span>Avec réponse</span></div><div><strong>{mine.reduce((acc,n)=>acc+Number(n.nb_reponses),0)}</strong><span>Propositions reçues</span></div></div>}
  <div className="ec08-toolbar"><div className="ec08-segment">
   {role==='incube'&&<button type="button" className={scope==='mine'?'active':''} onClick={()=>setScope('mine')}><ClipboardList size={16}/> Mes demandes</button>}
   <button type="button" className={scope==='marche'?'active':''} onClick={()=>setScope('marche')}><Search size={16}/> Bourse publique</button></div>
   {canPublish&&scope==='mine'&&<button className="btn" onClick={()=>setCreating(x=>!x)}><Plus size={16}/> Nouveau besoin</button>}
   {scope==='mine'&&role==='incube'&&<button className="btn ghost" onClick={()=>onNavigate?.('dossiers')}><MessageSquare size={16}/> Voir les réponses</button>}
  </div>
  {role==='incube'&&scope==='mine'&&<>
   {!companies.length&&<div className="callout"><b>Rattache ta startup avant de publier</b><p>Crée ou rejoins une entreprise depuis l’espace « Entreprise & profil ».</p><button className="btn small" onClick={()=>onNavigate?.('entreprise')}>Gérer mon entreprise <ArrowRight size={14}/></button></div>}
   {creating&&<form className="panel ec08-create" onSubmit={publish}>
     <div className="ec08-section-caption"><span>01</span><div><h3>Décris ton besoin</h3><p>La description complète reste dans ton espace privé. Les prestataires Premium ont accès aux détails du besoin.</p></div></div>
     <div className="field"><label>Titre interne</label><input minLength={8} maxLength={150} required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. Accompagnement réglementaire pour notre dispositif"/></div>
     <RichEditor label="Contexte et livrables (description complète)" value={description} onChange={setDescription}/>
     <div className="fields"><div className="field"><label>Budget indicatif (€)</label><input type="number" min={0} step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></div></div>
     <NeedTagPicker value={requestedTags} onChange={setRequestedTags} label="Compétences recherchées (suggestions ou création libre)"/>
     <div className="ec08-anon-box"><div className="ec08-section-caption"><EyeOff size={22}/><div><h3>Annonce visible avant Premium</h3><p>Retire noms d’entreprises, contacts, liens et indices permettant de t’identifier.</p></div></div>
      <div className="field"><label>Titre anonymisé</label><input minLength={8} maxLength={150} value={anonTitle} required onChange={e=>setAnonTitle(e.target.value)} placeholder="Ex. Recherche expertise réglementaire santé"/></div>
      <div className="field"><label>Résumé anonymisé (50 à 1 500 caractères)</label><textarea rows={4} required minLength={50} maxLength={1500} value={anonDescription} onChange={e=>setAnonDescription(e.target.value)}/></div>
     </div>
     <div className="ec08-form-actions"><button type="button" className="btn ghost" onClick={()=>setCreating(false)}>Annuler</button><button className="btn" disabled={busy}>Publier le besoin <ArrowRight size={16}/></button></div>
    </form>}
   <div className="ec08-demand-list">{mine.filter(n=>!companyId||n.entreprise_id===companyId).map(n=><article className="ec08-demand-card" key={n.id}>
    <div className="ec08-demand-top"><div className="ec08-grow"><div className="ec08-card-meta"><Status value={n.statut_suivi}/><span><Clock3 size={13}/> {dateLabel(n.created_at)}</span></div>
      <h3>{n.titre}</h3><p className="ec08-card-desc">{n.description}</p></div><button type="button" className="ec08-ghost-btn" onClick={()=>void expandNeed(n)} aria-expanded={expanded===n.id}>{expanded===n.id?'Réduire':'Gérer'} <ChevronDown size={15}/></button></div>
    <div className="ec08-demand-bottom"><span>{money(n.budget_centimes)}</span><span>{n.nb_reponses} proposition(s)</span><span>État public : <b>{LABELS[n.statut_suivi]}</b></span></div>
    {expanded===n.id&&<div className="ec08-detail-area">
       <TagEditor type="besoin" id={n.id} editable={canPublish}/><div className="ec08-detail-grid"><div>
        <h4>Faire avancer la demande</h4>
        <form onSubmit={e=>void changeStatus(e,n)}>
         <div className="field"><label>Prochaine étape</label><select value={nextStatus} required onChange={e=>setNextStatus(e.target.value)}><option value="">Choisir une étape</option>{(transitions[n.statut_suivi]||[]).map(s=><option key={s} value={s}>{LABELS[s]}</option>)}</select></div>
         <div className="field"><label>Commentaire de suivi {['termine','sans_suite'].includes(nextStatus)?'(obligatoire)':'(facultatif)'}</label><input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex. RDV confirmé, devis reçu…"/></div>
         <button className="btn small" disabled={busy||!nextStatus}>Mettre à jour le statut</button>
        </form>
       </div><div><h4><History size={16}/> Historique</h4>
        {history.map((h,i)=><div className="ec08-timeline-row" key={`${h.created_at}-${i}`}><Status value={h.nouveau_statut}/><small>{dateLabel(h.created_at)}</small>{h.commentaire&&<p>{h.commentaire}</p>}</div>)}
        {!history.length&&<p className="muted">Le statut initial est « Ouvert ».</p>}
       </div></div>
       <button className="ec08-link-button" type="button" onClick={()=>{setAnonEdit(n.id);setEditTitle(n.titre_anonyme);setEditSummary(n.annonce_anonyme);}}>Modifier l’annonce anonyme <EyeOff size={15}/></button>
       {anonEdit===n.id&&<form onSubmit={e=>void saveAnonymized(e,n)} className="ec08-edit-anon">
        <div className="field"><label>Titre anonymisé</label><input value={editTitle} onChange={e=>setEditTitle(e.target.value)} minLength={8} maxLength={150} required/></div>
        <div className="field"><label>Résumé anonymisé</label><textarea value={editSummary} onChange={e=>setEditSummary(e.target.value)} minLength={50} maxLength={1500} required rows={4}/></div>
        <button className="btn small" disabled={busy}>Enregistrer</button><button className="btn small ghost" type="button" onClick={()=>setAnonEdit(null)}>Annuler</button>
       </form>}
      </div>}
   </article>)}
    {!mine.length&&<div className="empty">Aucun besoin pour le moment. Publie le premier pour solliciter des prestataires.</div>}
   </div>
  </>}
  {scope==='marche'&&<>
   <div className="ec08-filter-bar"><button type="button" className={`btn ghost small ${onlySaved?'active':''}`} onClick={()=>setOnlySaved(v=>!v)}><ClipboardList size={15}/>{onlySaved?'Toutes les demandes':'Mes besoins épinglés'}</button><div className="ec08-search"><Search size={17}/><input aria-label="Rechercher un besoin" placeholder="Rechercher une compétence, une mission, un sujet…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Effacer la recherche" onClick={()=>setQuery('')}><X size={15}/></button>}</div>
    <label className="ec08-filter"><SlidersHorizontal size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Tous les statuts</option>{STATES.map(s=><option key={s} value={s}>{LABELS[s]}</option>)}</select></label>
   </div>
   <div className="ec08-market-hint"><LockKeyhole size={16}/>
    {role==='prestataire'?'La startup est confidentielle en Free/Pro. Son identité est accessible au prestataire Premium.':'Les statuts sont partagés, mais les informations privées des startups restent protégées.'}</div>
   <div className="ec08-market-grid">{market.filter(n=>!onlySaved||saved.ids.includes(n.id)).map(n=>{
    const canReceive=!['termine','sans_suite','en_pause','en_realisation'].includes(n.statut_suivi);
    return <article className="ec08-market-card" key={n.id}>
     <div className="ec08-card-meta"><Status value={n.statut_suivi}/><span>{dateLabel(n.created_at)}</span><FavoriteToggle type="besoin" active={saved.ids.includes(n.id)} onClick={()=>void saved.toggle(n.id)}/></div>
     <h3>{n.titre}</h3><p>{n.description}</p>
     <div className="ec08-market-tags"><span>{money(n.budget_centimes)}</span>{n.score>0&&<span>Correspondance {n.score}</span>}</div>
     <div className="ec08-market-footer"><div>{n.identite_visible?<><Eye size={15}/><b>{n.demandeur||'Startup'}</b></>:<><EyeOff size={15}/><span>{n.demandeur||'Startup confidentielle'}</span></>}</div>
       {canApply&&<button className="btn small" disabled={!canReceive||n.deja_repondu||busy} onClick={()=>{setResponseFor(n.id);setResponse('');}}>{n.deja_repondu?'Réponse envoyée':canReceive?'Répondre':'Clôturé'} <ArrowRight size={14}/></button>}
     </div>
    </article>;
   })}{!market.length&&!busy&&<div className="empty">Aucun besoin ne correspond à tes critères.</div>}</div>
   {saved.error&&<p className="field-error" role="alert">{saved.error}</p>}
   {responseFor&&<div className="ec08-modal-backdrop" onMouseDown={()=>setResponseFor('')}><div className="ec08-reply-modal" role="dialog" aria-modal="true" aria-label="Répondre au besoin" onMouseDown={e=>e.stopPropagation()}>
    <div className="ec08-modal-heading"><div><span className="section-eyebrow">Nouvelle candidature</span><h2>Répondre à un besoin</h2><p>{market.find(n=>n.id===responseFor)?.titre}</p></div><button className="ec08-ghost-btn" aria-label="Fermer" onClick={()=>setResponseFor('')}><X size={19}/></button></div>
    <div className="ec08-market-hint"><CheckCircle2 size={16}/> Le demandeur connaîtra le nom de ton entreprise. Son identité restera confidentielle jusqu’au plan Premium.</div>
    <form onSubmit={apply}><div className="field"><label>Ta proposition construite (100 caractères minimum)</label><textarea required minLength={100} maxLength={5000} rows={8} value={response} onChange={e=>setResponse(e.target.value)} placeholder="Explique ton approche, les livrables, le délai et l’ordre de grandeur de prix, sans coordonnées directes."/></div>
     <div className="ec08-form-actions"><button type="button" className="btn ghost" onClick={()=>setResponseFor('')}>Annuler</button><button className="btn" disabled={busy}><Send size={15}/> Envoyer la proposition</button></div>
    </form></div></div>}
  </>}
 </section>;
}

 'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {db} from '@/lib/supabase';

type Skill={id:string;libelle:string};
type Need={projet_id:string;titre:string;description:string;score:number;raisons:string[]};
type Conversation={id:string;relation_id:string;incube_id:string;prestataire_user_id:string;created_at:string};
type Message={id:string;conversation_id:string;auteur_id:string;corps:string;created_at:string};
type Opportunity={relation_id:string;statut:string;commentaire:string};
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function IntermediationV04({role,userId,providerId}:{role:string;userId:string;providerId?:string}){
 const [skills,setSkills]=useState<Skill[]>([]),[selected,setSelected]=useState<string[]>([]),[needId,setNeedId]=useState('');
 const [query,setQuery]=useState(''),[needs,setNeeds]=useState<Need[]>([]),[convs,setConvs]=useState<Conversation[]>([]),[current,setCurrent]=useState<string|null>(null),[messages,setMessages]=useState<Message[]>([]),[opps,setOpps]=useState<Opportunity[]>([]);
 const [body,setBody]=useState(''),[status,setStatus]=useState('contact'),[comment,setComment]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  const c=db(); const [s,v,o]=await Promise.all([c.from('competences_ec').select('id,libelle').order('libelle'),c.from('conversations_ec').select('id,relation_id,incube_id,prestataire_user_id,created_at').order('created_at',{ascending:false}),c.from('opportunites_ec').select('relation_id,statut,commentaire')]);
  if(s.error)throw s.error;if(v.error)throw v.error;if(o.error)throw o.error;
  setSkills(s.data||[]);setConvs(v.data||[]);setOpps(o.data||[]);
 },[]);
 const loadMessages=useCallback(async(id:string)=>{const r=await db().from('messages_ec').select('id,conversation_id,auteur_id,corps,created_at').eq('conversation_id',id).order('created_at',{ascending:true}).limit(200);if(r.error)throw r.error;setMessages(r.data||[]);},[]);
 useEffect(()=>{void load().catch(e=>setNotice(errorText(e)));},[load]);
 useEffect(()=>{if(current)void loadMessages(current).catch(e=>setNotice(errorText(e)));else setMessages([]);},[current,loadMessages]);
 useEffect(()=>{if(!current)return;const c=db();const channel=c.channel(`ec-messages-${current}`)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages_ec',filter:`conversation_id=eq.${current}`},()=>{void loadMessages(current)})
  .subscribe();return()=>{void c.removeChannel(channel)};},[current,loadMessages]);
 async function run(f:()=>Promise<void>){setBusy(true);setNotice('');try{await f();setNotice('Action enregistrée.');await load();}catch(e){setNotice(errorText(e))}finally{setBusy(false)}}
 async function search(e?:FormEvent){e?.preventDefault();await run(async()=>{const r=await db().rpc('ec_matching_besoins',{p_texte:query,p_limite:30});if(r.error)throw r.error;setNeeds(r.data||[])})}
 async function setSkillsFor(e:FormEvent){e.preventDefault();await run(async()=>{const target=role==='prestataire'?'prestataire':'projet';const id=target==='prestataire'?providerId:needId;if(!id)throw new Error('Selectionnez une cible.');const r=await db().rpc('ec_set_competences',{p_cible:target,p_id:id,p_competences:selected});if(r.error)throw r.error})}
 async function send(e:FormEvent){e.preventDefault();if(!current)return;await run(async()=>{const r=await db().rpc('ec_envoyer_message',{p_conversation:current,p_corps:body});if(r.error)throw r.error;setBody('');await loadMessages(current)})}
 const conv=convs.find(c=>c.id===current);const opp=opps.find(o=>o.relation_id===conv?.relation_id);
 useEffect(()=>{setStatus(opp?.statut||'contact');setComment(opp?.commentaire||'')},[current,opp?.statut,opp?.commentaire]);
 return <div className="v04">
  {notice&&<div className="alert" role="status">{notice}</div>}
  <div className="panel"><h2>Compétences et correspondances</h2><p className="sub">Les correspondances sont calculées par règles explicables. Aucune IA ni recherche externe.</p>
  {role==='prestataire'||role==='incube'?<form onSubmit={setSkillsFor}>
   {role==='incube'&&<div className="field"><label>Identifiant de mon besoin (UUID)</label><input value={needId} onChange={e=>setNeedId(e.target.value)} placeholder="Copiez l’identifiant depuis Supabase pour la recette" required/></div>}
   <div className="skillcheck">{skills.map(s=><label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e=>setSelected(v=>e.target.checked?[...v,s.id]:v.filter(id=>id!==s.id))}/>{s.libelle}</label>)}</div>
   <button className="btn" disabled={busy||(!providerId&&role==='prestataire')}>Enregistrer les compétences</button>
  </form>:<p>Les compétences sont éditées par les utilisateurs concernés.</p>}</div>
  {role==='prestataire'&&<div className="panel"><h2>Matching des besoins ouverts</h2><form onSubmit={search} className="v04-line"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex. prototype, marketing, financement"/><button className="btn" disabled={busy}>Rechercher</button></form>
   <div className="list">{needs.map(n=><article key={n.projet_id} className="item"><div><h3>{n.titre}</h3><p>{n.description}</p><span className="pill">Score {n.score}</span> {n.raisons.join(' · ')}</div></article>)}{!needs.length&&<p className="sub">Lancez une recherche pour voir les besoins.</p>}</div>
  </div>}
  <div className="panel"><h2>Messagerie et opportunités</h2><p className="sub">Une conversation devient accessible uniquement après accord mutuel de mise en relation.</p>
    <button className="btn ghost" onClick={()=>void run(async()=>{const r=await db().rpc('ec_mes_relations_acceptees');if(r.error)throw r.error;for(const row of r.data||[]){const x=await db().rpc('ec_ouvrir_conversation',{p_relation:row.relation_id});if(x.error&&x.error.code!=='P0001')throw x.error;}})} disabled={busy}>Actualiser mes conversations acceptées</button>
    <div className="v04-line" style={{marginTop:16}}><aside className="v04-convs">{convs.map(c=><button type="button" key={c.id} className={current===c.id?'chosen':''} onClick={()=>setCurrent(c.id)}>Relation {c.relation_id.slice(0,8)}<small>{new Date(c.created_at).toLocaleDateString('fr-FR')}</small></button>)}{!convs.length&&<p>Aucune conversation disponible.</p>}</aside>
    <div className="v04-chat">{conv?<><div className="v04-messages">{messages.map(m=><div className={m.auteur_id===userId?'v04-msg own':'v04-msg'} key={m.id}><small>{m.auteur_id===userId?'Moi':'Correspondant'} · {new Date(m.created_at).toLocaleString('fr-FR')}</small><p>{m.corps}</p></div>)}</div><form onSubmit={send} className="v04-line"><input value={body} onChange={e=>setBody(e.target.value)} required maxLength={4000} placeholder="Votre message"/><button className="btn" disabled={busy}>Envoyer</button></form></>:<p>Sélectionnez une relation pour échanger.</p>}</div></div>
    {conv&&<div className="v04-crm"><h3>Suivi de l’opportunité</h3><form onSubmit={e=>{e.preventDefault();void run(async()=>{const r=await db().rpc('ec_suivre_opportunite',{p_relation:conv.relation_id,p_statut:status,p_commentaire:comment});if(r.error)throw r.error})}}>
      <div className="field"><label>Avancement</label><select value={status} onChange={e=>setStatus(e.target.value)}>{[['contact','Contact établi'],['rdv','Rendez-vous'],['proposition','Proposition envoyée'],['gagnee','Mission concrétisée'],['perdue','Sans suite']].map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>
      <div className="field"><label>Note partagée avec l’autre partie</label><textarea maxLength={2000} value={comment} onChange={e=>setComment(e.target.value)}/></div><button className="btn" disabled={busy}>Enregistrer le suivi</button></form></div>}
  </div>
 </div>
}

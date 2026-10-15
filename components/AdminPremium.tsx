 'use client';
import {useEffect,useState} from 'react';
import {db} from '@/lib/supabase';
type Item={entreprise_id:string;prestataire_id:string;entreprise_nom:string;statut_validation:string;plan_code:string;premium_actif:boolean;commence_le:string|null;expire_le:string|null;commentaire:string};
const errorText=(e:unknown)=>{if(e&&typeof e==='object'&&'message'in e)return String((e as {message:unknown}).message);return String(e)};
const dateInput=(s:string|null)=>s?new Date(s).toISOString().slice(0,10):'';
export default function AdminPremium(){
 const [rows,setRows]=useState<Item[]>([]),[search,setSearch]=useState(''),[busy,setBusy]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 async function load(){setLoading(true);setError('');try{const {data,error}=await db().rpc('ec090_admin_lister_prestataires',{p_recherche:search});if(error)throw error;setRows((data||[]) as Item[])}catch(e){setError(errorText(e))}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function change(item:Item,active:boolean,until:string,reason:string){
  if(!window.confirm(`${active?'Activer':'Desactiver'} Premium pour ${item.entreprise_nom} ?`))return;
  setBusy(item.entreprise_id);setError('');setSuccess('');
  try{const date=active&&until?new Date(`${until}T23:59:59.999Z`).toISOString():null;
   const {error}=await db().rpc('ec090_admin_definir_premium',{p_entreprise:item.entreprise_id,p_actif:active,p_expire_le:date,p_commentaire:reason});
   if(error)throw error;setSuccess(`Premium ${active?'active':'desactive'} pour ${item.entreprise_nom}.`);await load();
  }catch(e){setError(errorText(e))}finally{setBusy('')}
 }
 return <section className="panel" style={{marginTop:18}}>
 <h3>Abonnements Premium — activation administrateur</h3>
 <p className="textsmall">Premium est un droit de l'entreprise prestataire. Aucune facturation en ligne. Les incubés n'ont pas d'abonnement. L'accès expire automatiquement si une date a été indiquée.</p>
 <form className="actions" onSubmit={e=>{e.preventDefault();void load()}}><input aria-label="Rechercher une entreprise prestataire" placeholder="Nom d'entreprise..." value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn" disabled={loading} type="submit">Rechercher</button></form>
 {error&&<div className="alert" role="alert">{error}</div>}{success&&<div className="alert ok" role="status">{success}</div>}
 <p className="textsmall">{loading?'Chargement...':`${rows.length} prestataire(s) trouvé(s)`}</p>
 <div style={{display:'grid',gap:12}}>{rows.map(item=><PremiumRow key={item.entreprise_id} item={item} busy={busy===item.entreprise_id} onSave={change}/>)}</div>
 {!rows.length&&!loading&&<p>Aucun prestataire enregistré.</p>}
 </section>
}
function PremiumRow({item,busy,onSave}:{item:Item;busy:boolean;onSave:(r:Item,a:boolean,d:string,c:string)=>Promise<void>}){
 const [expires,setExpires]=useState(dateInput(item.expire_le)),[reason,setReason]=useState(item.commentaire||'');
 useEffect(()=>{setExpires(dateInput(item.expire_le));setReason(item.commentaire||'')},[item.expire_le,item.commentaire]);
 const active=item.premium_actif;
 return <article style={{padding:16,border:'1px solid var(--border,#ddd)',borderRadius:12}}>
 <div className="actions" style={{justifyContent:'space-between',alignItems:'center',gap:10}}><div><strong>{item.entreprise_nom}</strong><div className="textsmall">Prestataire : {item.statut_validation} · Plan enregistré : {item.plan_code}</div></div><span style={{fontWeight:700,color:active?'#147d58':'#667085'}}>{active?'Premium actif':'Premium inactif'}</span></div>
 <div className="fields" style={{marginTop:12}}><div className="field"><label>Date de fin (facultative)</label><input type="date" value={expires} onChange={e=>setExpires(e.target.value)}/></div><div className="field"><label>Justification administrative</label><input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Accord commercial, essai, partenariat..."/></div></div>
 <div className="actions" style={{marginTop:12}}><button className="btn" disabled={busy||item.statut_validation!=='valide'} onClick={()=>void onSave(item,true,expires,reason)}>{busy?'Enregistrement...':active?'Mettre à jour Premium':'Activer Premium'}</button><button className="btn ghost" disabled={busy||(!active&&item.plan_code!=='premium')} onClick={()=>void onSave(item,false,'',reason)}>Désactiver</button></div>
 {item.expire_le&&<p className="textsmall">Échéance : {new Date(item.expire_le).toLocaleDateString('fr-FR')}</p>}
 </article>;
}

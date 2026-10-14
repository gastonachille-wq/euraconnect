'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Building2,Search,Users,Plus,RefreshCcw} from 'lucide-react';
import {db} from '@/lib/supabase';
type Company={id:string;nom:string;type:string;statut:string;nb_membres:number};
type Member={profile_id:string;nom_public:string;role_membre:string;actif:boolean};
const fail=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function AdminEntreprises(){
 const [list,setList]=useState<Company[]>([]),[q,setQ]=useState(''),[selected,setSelected]=useState(''),[members,setMembers]=useState<Member[]>([]);
 const [email,setEmail]=useState(''),[role,setRole]=useState('collaborateur'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){const {data,error:e}=await db().rpc('ec_admin_lister_entreprises',{p_recherche:q});
  if(e)throw e;const rows=(data||[]) as Company[];setList(rows);setSelected(v=>rows.some(r=>r.id===v)?v:rows[0]?.id||'');}
 useEffect(()=>{void load().catch(e=>setError(fail(e)));},[]);
 useEffect(()=>{if(!selected)return;void db().rpc('ec_lister_membres',{p_entreprise:selected}).then(({data,error:e})=>{
  if(e)setError(e.message);else setMembers((data||[]) as Member[]);});},[selected]);
 async function attach(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{
  if(!window.confirm('Rattacher ce compte existant a cette entreprise ?'))return;
  const {error:e}=await db().rpc('ec_admin_rattacher_membre',{p_entreprise:selected,p_email:email.trim(),p_role_membre:role});
  if(e)throw e;setNotice('Utilisateur rattache avec succes.');setEmail('');await load();
  const {data,error:me}=await db().rpc('ec_lister_membres',{p_entreprise:selected});if(me)throw me;setMembers((data||[]) as Member[]);
 }catch(e){setError(fail(e));}finally{setBusy(false);}}
 return <section className="panel" style={{marginTop:18}}><div className="section-heading"><div><span className="section-eyebrow">Multi-utilisateurs</span><h2>Entreprises et collaborateurs</h2></div><Building2 size={22}/></div>
  <form className="v06-line" onSubmit={e=>{e.preventDefault();void load().catch(ex=>setError(fail(ex)));}}><div className="input-icon"><Search size={16}/>
   <input aria-label="Rechercher une entreprise" placeholder="Rechercher une entreprise..." value={q} onChange={e=>setQ(e.target.value)}/></div>
   <button className="btn ghost"><RefreshCcw size={15}/> Actualiser</button></form>
  {error&&<div className="alert" role="alert">{error}</div>}{notice&&<div className="alert ok" role="status">{notice}</div>}
  <div className="company-admin-layout"><div className="company-admin-list">{list.map(c=><button className={c.id===selected?'selected':''} key={c.id} onClick={()=>setSelected(c.id)}>
   <b>{c.nom}</b><small>{c.type} | {c.statut} | {c.nb_membres} compte(s)</small></button>)}
   {!list.length&&<p className="muted">Aucune entreprise creee.</p>}</div>
   <div><h3><Users size={18}/> Collaborateurs</h3><div className="member-list">{members.map(m=><div className="member" key={m.profile_id}><div className="person-initial">{m.nom_public.slice(0,2).toUpperCase()}</div>
    <div><b>{m.nom_public}</b><small>{m.actif?'Actif':'Inactif'}</small></div><span className="pill">{m.role_membre}</span></div>)}
    {!members.length&&<p className="muted">Aucun utilisateur rattache.</p>}</div>
    <form onSubmit={attach} className="admin-member-form"><h4>Rattacher un compte Supabase existant</h4>
     <div className="field"><label>Email du compte</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="collaborateur@entreprise.fr"/></div>
     <div className="field"><label>Role dans l entreprise</label><select value={role} onChange={e=>setRole(e.target.value)}>
      <option value="collaborateur">Collaborateur</option><option value="gestionnaire">Gestionnaire</option><option value="proprietaire">Proprietaire (sous conditions)</option></select></div>
     <button className="btn" type="submit" disabled={busy||!selected}><Plus size={16}/> Rattacher</button>
     <p className="field-hint">Aucune invitation email n est envoyee : le compte doit deja exister et etre actif. Un utilisateur peut etre membre de plusieurs entreprises.</p>
    </form></div></div>
 </section>;
}

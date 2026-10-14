'use client';
import {useEffect,useState} from 'react';
import {db} from '@/lib/supabase';
type Ligne={id:string;email:string;nom:string|null;role:string|null;statut:string|null;email_confirme:boolean;cree_le:string;derniere_connexion:string|null;profil_present:boolean;nb_total:number};
const explain=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function AdminUtilisateurs(){
 const [items,setItems]=useState<Ligne[]>([]),[query,setQuery]=useState(''),[role,setRole]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(0),[loading,setLoading]=useState(false),[busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function load(target=page){setLoading(true);setError('');try{const {data,error}=await db().rpc('admin_lister_utilisateurs',{p_recherche:query,p_role:role,p_statut:status,p_limite:25,p_offset:target*25});if(error)throw error;setItems((data||[]) as Ligne[]);setPage(target)}catch(e){setError(explain(e))}finally{setLoading(false)}}
 useEffect(()=>{void load(0)},[]);
 async function change(u:Ligne,nextRole:string,nextStatus:string){if(!window.confirm(`Enregistrer ${nextRole} / ${nextStatus} pour ${u.email} ?`))return;setBusy(u.id);setError('');setMessage('');try{const {error}=await db().rpc('admin_modifier_utilisateur',{p_utilisateur_id:u.id,p_role:nextRole,p_statut:nextStatus});if(error)throw error;setMessage('Modification enregistrée et auditée.');await load()}catch(e){setError(explain(e))}finally{setBusy(null)}}
 async function repair(u:Ligne){setBusy(u.id);setError('');try{const {error}=await db().rpc('admin_reparer_profil',{p_utilisateur_id:u.id});if(error)throw error;await load()}catch(e){setError(explain(e))}finally{setBusy(null)}}
 return <section className="panel" style={{marginTop:18}}><h3>Comptes utilisateurs Supabase</h3><p className="textsmall">Liste sécurisée, réservée aux administrateurs. Les modifications sont journalisées. Les emails ne sont pas accessibles aux autres rôles.</p>
 <form onSubmit={e=>{e.preventDefault();void load(0)}} className="fields" style={{alignItems:'end'}}>
 <div className="field"><label htmlFor="adm-search">Recherche (email ou nom)</label><input id="adm-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher..."/></div>
 <div className="field"><label htmlFor="adm-role">Rôle</label><select id="adm-role" value={role} onChange={e=>setRole(e.target.value)}><option value="">Tous</option><option value="admin">Admin</option><option value="incube">Incubé</option><option value="prestataire">Prestataire</option></select></div>
 <div className="field"><label htmlFor="adm-status">Statut</label><select id="adm-status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tous</option><option value="actif">Actif</option><option value="suspendu">Suspendu</option></select></div>
 <button type="submit" className="btn" disabled={loading}>Rechercher</button></form>
 {error&&<div role="alert" className="alert">{error}</div>}{message&&<div role="status" className="alert ok">{message}</div>}
 <p className="textsmall">{loading?'Chargement...':`${items.length} compte(s) affiché(s)${items.length?` sur ${items[0].nb_total}`:''}`}</p>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:850}}><thead><tr><th style={{textAlign:'left'}}>Utilisateur</th><th>Confirmation</th><th>Rôle</th><th>Statut</th><th>Création</th><th>Action</th></tr></thead><tbody>
 {items.map(u=><UserRow key={u.id} u={u} busy={busy===u.id} onSave={change} onRepair={repair}/>)}
 </tbody></table></div>
 {!items.length&&!loading&&<p>Aucun compte trouvé.</p>}
 <div className="actions"><button className="btn ghost" disabled={page===0||loading} onClick={()=>void load(page-1)}>Précédent</button><span>Page {page+1}</span><button className="btn ghost" disabled={loading||items.length<25} onClick={()=>void load(page+1)}>Suivant</button></div>
 <p className="textsmall">Invitations par email : en attente d’un fournisseur SMTP dédié. Créez provisoirement les comptes dans Supabase Auth ; ils apparaîtront ici.</p>
 </section>
}
function UserRow({u,busy,onSave,onRepair}:{u:Ligne;busy:boolean;onSave:(u:Ligne,r:string,s:string)=>Promise<void>;onRepair:(u:Ligne)=>Promise<void>}){
 const [role,setRole]=useState(u.role||'prestataire'),[status,setStatus]=useState(u.statut||'actif');
 useEffect(()=>{setRole(u.role||'prestataire');setStatus(u.statut||'actif')},[u.role,u.statut]);
 return <tr style={{borderTop:'1px solid #ddd'}}><td style={{padding:8}}><strong>{u.email}</strong><div className="textsmall">{u.nom||'Sans nom'} · {u.id.slice(0,8)}</div></td><td style={{textAlign:'center'}}>{u.email_confirme?'Oui':'Non'}</td><td><select aria-label={`Rôle de ${u.email}`} value={role} disabled={!u.profil_present||busy} onChange={e=>setRole(e.target.value)}><option value="prestataire">Prestataire</option><option value="incube">Incubé</option><option value="admin">Admin</option></select></td><td><select aria-label={`Statut de ${u.email}`} value={status} disabled={!u.profil_present||busy} onChange={e=>setStatus(e.target.value)}><option value="actif">Actif</option><option value="suspendu">Suspendu</option></select></td><td>{new Date(u.cree_le).toLocaleDateString('fr-FR')}</td><td style={{padding:8}}>{!u.profil_present?<button className="btn" disabled={busy} onClick={()=>void onRepair(u)}>Réparer profil</button>:<button className="btn" disabled={busy||(role===u.role&&status===u.statut)} onClick={()=>void onSave(u,role,status)}>Enregistrer</button>}</td></tr>;
}

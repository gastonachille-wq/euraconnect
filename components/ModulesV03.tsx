'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Bell,Gift,RefreshCcw} from 'lucide-react';
import {db} from '@/lib/supabase';
type Role='admin'|'incube'|'prestataire';
type Offer={id:string;titre:string;prestataire_id:string};
type Benefit={id:string;offre_id:string;avantage:string;tarif_preferentiel_centimes:number|null};
type Notification={id:string;titre:string;contenu:string;lu_le:string|null;created_at:string};
const err=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function ModulesV03({role,providerId,userId,offers}:{role:Role;providerId?:string;userId:string;offers:Offer[]}){
 const [benefits,setBenefits]=useState<Benefit[]>([]),[alerts,setAlerts]=useState<Notification[]>([]);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [offerId,setOfferId]=useState(''),[advantage,setAdvantage]=useState(''),[specialPrice,setSpecialPrice]=useState('');
 async function refresh(){const c=db();const [b,n]=await Promise.all([
  c.from('offres_incubes').select('id,offre_id,avantage,tarif_preferentiel_centimes'),
  c.from('notifications_ec').select('id,titre,contenu,lu_le,created_at').order('created_at',{ascending:false}).limit(50)
 ]);if(b.error)throw b.error;if(n.error)throw n.error;
 setBenefits((b.data||[]) as Benefit[]);setAlerts((n.data||[]) as Notification[]);}
 useEffect(()=>{void refresh().catch(e=>setError(err(e)));},[userId,role]);
 async function action(cb:()=>Promise<void>,label:string){setError('');setNotice('');setBusy(true);
  try{await cb();await refresh();setNotice(label);}catch(e){setError(err(e));}finally{setBusy(false);}}
 async function saveBenefit(e:FormEvent){e.preventDefault();await action(async()=>{
  const price=specialPrice?Math.round(Number(specialPrice)*100):null;
  const r=await db().rpc('definir_avantage_incube',{p_offre:offerId,p_avantage:advantage,p_tarif:price});
  if(r.error)throw r.error;setAdvantage('');setSpecialPrice('');
 },'Avantage publié pour les incubés connectés.');}
 const own=offers.filter(o=>o.prestataire_id===providerId);
 return <section className="ec08-page"><div className="ec08-page-title"><div><span className="section-eyebrow">Votre activité</span><h1>Avantages & notifications</h1>
  <p className="sub">Offres exclusives incubés et alertes de la plateforme.</p></div>
  <button className="btn ghost" onClick={()=>void refresh().catch(e=>setError(err(e)))}><RefreshCcw size={15}/> Actualiser</button></div>
  {error&&<div className="alert" role="alert">{error}</div>}{notice&&<div className="alert ok" role="status">{notice}</div>}
  <div className="ec08-rdv-columns">
   <div className="panel"><div className="ec08-section-caption"><Gift size={20}/><div><h2>Offres préférentielles</h2><p>Avantages accessibles uniquement aux incubés authentifiés.</p></div></div>
    {role==='prestataire'&&providerId?<form onSubmit={saveBenefit}>
     <div className="field"><label>Offre concernée</label><select required value={offerId} onChange={e=>setOfferId(e.target.value)}><option value="">Sélectionner une offre</option>{own.map(o=><option key={o.id} value={o.id}>{o.titre}</option>)}</select></div>
     <div className="field"><label>Avantage spécifique (10 à 500 caractères)</label><textarea required minLength={10} maxLength={500} rows={3} value={advantage} onChange={e=>setAdvantage(e.target.value)}/></div>
     <div className="field"><label>Tarif incubé facultatif (€)</label><input type="number" min={0} step="0.01" value={specialPrice} onChange={e=>setSpecialPrice(e.target.value)}/></div>
     <button className="btn" disabled={busy||!own.length}>Publier cet avantage</button>
     {!own.length&&<p className="muted">Publiez d’abord une offre de service.</p>}
    </form>:<div className="ec08-compact-list">{benefits.map(b=><div className="ec08-slot-line" key={b.id}><div><b>{offers.find(o=>o.id===b.offre_id)?.titre||'Offre'}</b><small>{b.avantage}</small></div><span className="pill">{b.tarif_preferentiel_centimes===null?'Sur devis':`${(b.tarif_preferentiel_centimes/100).toLocaleString('fr-FR')} €`}</span></div>)}
     {!benefits.length&&<p className="muted">Aucun avantage disponible actuellement.</p>}</div>}
   </div>
   <div className="panel"><div className="ec08-section-caption"><Bell size={20}/><div><h2>Centre de notifications</h2><p>{alerts.filter(x=>!x.lu_le).length} élément(s) non lu(s).</p></div></div>
    <div className="ec08-compact-list">{alerts.map(n=><div key={n.id} className="ec08-slot-line"><div><b>{n.titre}</b><small>{n.contenu} · {new Date(n.created_at).toLocaleDateString('fr-FR')}</small></div>
      {!n.lu_le&&<button className="btn ghost small" onClick={()=>void action(async()=>{
       const r=await db().rpc('marquer_notification_lue',{p_id:n.id});if(r.error)throw r.error;
      },'Notification lue.')}>Lu</button>}</div>)}{!alerts.length&&<p className="muted">Aucune notification.</p>}</div>
   </div>
  </div>
 </section>;
}

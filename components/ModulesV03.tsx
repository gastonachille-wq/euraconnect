'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {db} from '@/lib/supabase';
type Role='admin'|'incube'|'prestataire';
type Slot={id:string;debut:string;fin:string;modalite:string;lieu_ou_lien:string|null;prestataire_id:string};
type Reserved={id:string;disponibilite_id:string;statut:string};
type Offer={id:string;titre:string;prestataire_id:string};
type Benefit={id:string;offre_id:string;avantage:string;tarif_preferentiel_centimes:number|null};
type Notification={id:string;titre:string;contenu:string;lu_le:string|null;created_at:string};
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
const euro=(n:number|null)=>n===null?'Sur devis':`${(n/100).toLocaleString('fr-FR')} €`;
export default function ModulesV03({role,providerId,userId,offers}:{role:Role;providerId?:string;userId:string;offers:Offer[]}){
 const [slots,setSlots]=useState<Slot[]>([]),[reserved,setReserved]=useState<Reserved[]>([]),[benefits,setBenefits]=useState<Benefit[]>([]),[alerts,setAlerts]=useState<Notification[]>([]);
 const [kpis,setKpis]=useState<Record<string,number>|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [start,setStart]=useState(''),[duration,setDuration]=useState(30),[mode,setMode]=useState('visio'),[place,setPlace]=useState('');
 const [offerId,setOfferId]=useState(''),[advantage,setAdvantage]=useState(''),[specialPrice,setSpecialPrice]=useState('');
 async function refresh(){
  const c=db();
  const [s,r,b,n]=await Promise.all([
   c.from('disponibilites_rdv').select('id,debut,fin,modalite,lieu_ou_lien,prestataire_id').gte('debut',new Date().toISOString()).order('debut').limit(100),
   c.from('reservations_rdv').select('id,disponibilite_id,statut').limit(100),
   c.from('offres_incubes').select('id,offre_id,avantage,tarif_preferentiel_centimes'),
   c.from('notifications_ec').select('id,titre,contenu,lu_le,created_at').order('created_at',{ascending:false}).limit(50)
  ]);
  const first=[s,r,b,n].find(x=>x.error);if(first?.error)throw first.error;
  setSlots((s.data||[]) as Slot[]);setReserved((r.data||[]) as Reserved[]);setBenefits((b.data||[]) as Benefit[]);setAlerts((n.data||[]) as Notification[]);
  if(role==='admin'){const {data,error:e}=await c.rpc('indicateurs_admin');if(e)throw e;setKpis((data||{}) as Record<string,number>)}
 }
 useEffect(()=>{void refresh().catch(e=>setError(message(e)))},[role,userId]);
 async function execute(action:()=>Promise<void>){setError('');setNotice('');try{await action();await refresh();setNotice('Opération enregistrée.')}catch(e){setError(message(e))}}
 async function createSlot(e:FormEvent){e.preventDefault();await execute(async()=>{
  if(!start)throw new Error('Choisissez une date');const d=new Date(start);const end=new Date(d.getTime()+duration*60000);
  if(Number.isNaN(d.getTime()))throw new Error('Date invalide');
  const {error:e}=await db().rpc('proposer_disponibilite',{p_debut:d.toISOString(),p_fin:end.toISOString(),p_modalite:mode,p_lieu:place||null});if(e)throw e;
  setStart('');setPlace('');
 })}
 async function createBenefit(e:FormEvent){e.preventDefault();await execute(async()=>{
  const {error:e}=await db().rpc('definir_avantage_incube',{p_offre:offerId,p_avantage:advantage,p_tarif:specialPrice?Math.round(Number(specialPrice)*100):null});if(e)throw e;
  setAdvantage('');setSpecialPrice('')
 })}
 const ownOffers=offers.filter(o=>o.prestataire_id===providerId);
 return <div className="v03-modules">
  {error&&<div className="alert" role="alert">{error}</div>}{notice&&<div className="alert ok" role="status">{notice}</div>}
  {role==='admin'&&<div className="panel"><h2>Tableau de bord administrateur</h2><p className="sub">Volumes réels dans Supabase (pas de données simulées).</p><div className="grid">{Object.entries(kpis||{}).map(([k,v])=><div className="panel" key={k}><p>{k.replaceAll('_',' ')}</p><div className="stat">{v}</div></div>)}</div><button className="btn ghost" onClick={()=>void refresh().catch(e=>setError(message(e)))}>Actualiser</button></div>}
  {role==='prestataire'&&providerId&&<><div className="panel"><h2>Offres préférentielles incubés</h2><p>Ces avantages ne sont visibles que des incubés connectés et de votre organisation.</p><form onSubmit={createBenefit}><div className="field"><label htmlFor="v03-offre">Offre concernée</label><select id="v03-offre" required value={offerId} onChange={e=>setOfferId(e.target.value)}><option value="">Choisir une offre</option>{ownOffers.map(o=><option value={o.id} key={o.id}>{o.titre}</option>)}</select></div><div className="field"><label htmlFor="v03-avantage">Avantage réservé (10 à 500 caractères)</label><textarea id="v03-avantage" minLength={10} maxLength={500} required value={advantage} onChange={e=>setAdvantage(e.target.value)}/></div><div className="field"><label htmlFor="v03-prix">Prix préférentiel facultatif (€)</label><input id="v03-prix" type="number" min="0" step="0.01" value={specialPrice} onChange={e=>setSpecialPrice(e.target.value)}/></div><button className="btn">Publier l'avantage</button></form>{!ownOffers.length&&<p>Publiez d'abord une offre de services.</p>}</div>
   <div className="panel"><h2>Mes disponibilités d'expertise</h2><form onSubmit={createSlot}><div className="fields"><div className="field"><label htmlFor="v03-start">Début du rendez-vous</label><input id="v03-start" type="datetime-local" required value={start} onChange={e=>setStart(e.target.value)}/></div><div className="field"><label htmlFor="v03-duree">Durée</label><select id="v03-duree" value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[15,30,45,60,90].map(n=><option value={n} key={n}>{n} min</option>)}</select></div></div><div className="fields"><div className="field"><label htmlFor="v03-mode">Modalité</label><select id="v03-mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="visio">Visioconférence</option><option value="telephone">Téléphone</option><option value="sur_site">Sur site</option></select></div><div className="field"><label htmlFor="v03-place">Lien ou lieu (communiqué après réservation)</label><input id="v03-place" value={place} onChange={e=>setPlace(e.target.value)}/></div></div><button className="btn">Proposer le créneau</button></form></div></>}
  {role==='incube'&&<div className="panel"><h2>Offres réservées aux incubés</h2><div className="list">{benefits.map(b=><div className="item" key={b.id}><div><b>{offers.find(o=>o.id===b.offre_id)?.titre||'Offre professionnelle'}</b><p>{b.avantage}</p><span className="pill">{euro(b.tarif_preferentiel_centimes)}</span></div></div>)}{!benefits.length&&<p>Aucune offre préférentielle publiée pour le moment.</p>}</div></div>}
  {(role==='incube'||role==='prestataire')&&<div className="panel"><h2>{role==='incube'?'Réserver une expertise':'Créneaux proposés'}</h2><div className="list">{slots.filter(s=>role==='incube'||s.prestataire_id===providerId).map(s=>{const taken=reserved.some(r=>r.disponibilite_id===s.id);return <div className="item" key={s.id}><div><b>{new Date(s.debut).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Paris'})}</b><p>{s.modalite} · {Math.round((new Date(s.fin).getTime()-new Date(s.debut).getTime())/60000)} minutes</p></div>{role==='incube'&&<button className="btn" disabled={taken} onClick={()=>void execute(async()=>{const {error:e}=await db().rpc('reserver_disponibilite',{p_disponibilite:s.id});if(e)throw e})}>{taken?'Réservé':'Réserver'}</button>}{role==='prestataire'&&<span className="pill">{taken?'Réservé':'Disponible'}</span>}</div>})}{!slots.length&&<p>Aucun créneau à afficher.</p>}</div></div>}
  <div className="panel"><h2>Notifications</h2><div className="list">{alerts.map(n=><div className="item" key={n.id}><div><b>{n.titre}</b><p>{n.contenu}</p><small>{new Date(n.created_at).toLocaleString('fr-FR')}</small></div>{!n.lu_le&&<button className="btn ghost" onClick={()=>void execute(async()=>{const {error:e}=await db().rpc('marquer_notification_lue',{p_id:n.id});if(e)throw e})}>Marquer comme lue</button>}</div>)}{!alerts.length&&<p>Aucune notification.</p>}</div></div>
 </div>
}

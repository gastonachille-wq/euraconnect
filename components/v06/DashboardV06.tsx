'use client';
import {useEffect,useState} from 'react';
import {Building2,UsersRound,BriefcaseBusiness,ClipboardList,Send,Handshake,Clock3,ArrowUpRight,RefreshCcw,Search,CalendarDays} from 'lucide-react';
import {db} from '@/lib/supabase';

type Metrics={role:string;entreprises:number;personnes:number;offres:number;besoins:number;mes_offres:number;mes_besoins:number;candidatures:number;relations:number;prestataires_en_attente:number};
type Props={role:string;displayName:string;onNavigate:(tab:string)=>void;userId:string;hasCompany:boolean};
const roles:Record<string,string>={admin:'administration',incube:'startup',prestataire:'prestataire'};
export default function DashboardV06({role,displayName,onNavigate,userId,hasCompany}:Props){
 const [data,setData]=useState<Metrics|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 async function refresh(){setBusy(true);setError('');const {data,error}=await db().rpc('ec_dashboard_v06');
  if(error)setError(error.message);else setData(data as Metrics);setBusy(false);}
 useEffect(()=>{void refresh();},[userId,role]);
 const cards=[
  {label:'Entreprises dans l’annuaire',value:data?.entreprises,icon:Building2,target:'annuaire',color:'red'},
  {label:'Personnes référencées',value:data?.personnes,icon:UsersRound,target:'annuaire',color:'gray'},
  {label:'Offres de services',value:role==='prestataire'?data?.mes_offres:data?.offres,icon:BriefcaseBusiness,target:role==='prestataire'?'prestataire':'catalogue',color:'red'},
  {label:role==='incube'?'Mes besoins actifs':'Besoins ouverts',value:role==='incube'?data?.mes_besoins:data?.besoins,icon:ClipboardList,target:role==='incube'?'mes-besoins':'besoins',color:'gray'},
  {label:'Candidatures',value:data?.candidatures,icon:Send,target:role==='incube'?'mes-besoins':'intermediation',color:'gray'},
  {label:'Mises en relation',value:data?.relations,icon:Handshake,target:'intermediation',color:'red'},
 ];
 return <div className="dashboard">
  <div className="dashboard-intro"><div><span className="section-eyebrow">Votre espace {roles[role]||'EURACONNECT'}</span>
   <h1>Bonjour{displayName?`, ${displayName.split(' ')[0]}`:''}.</h1>
   <p>Retrouvez les indicateurs de votre écosystème et les prochaines actions a mener.</p></div>
   <button className="btn ghost" onClick={()=>void refresh()} disabled={busy}><RefreshCcw size={16}/> Actualiser</button>
  </div>
  {!hasCompany&&role!=='admin'&&<div className="onboarding-banner"><Building2 size={21}/><span><b>Rattachement entreprise à compléter</b><small>Votre compte doit etre relie a votre startup ou à votre entreprise prestataire.</small></span><button className="btn small" onClick={()=>onNavigate(role==='incube'?'entreprise':'prestataire')}>Completer</button></div>}
  {error&&<div className="alert" role="alert">{error}</div>}
  <div className="kpi-grid">{cards.map((c,i)=><button className={`kpi-card ${c.color}`} key={c.label} type="button" onClick={()=>onNavigate(c.target)}>
   <div className="kpi-card-top"><span>{c.label}</span><div className="kpi-icon"><c.icon size={19}/></div></div>
   <div className="kpi-value">{busy?'--':Number(c.value||0).toLocaleString('fr-FR')}</div>
   <div className="kpi-footer">Donnees Supabase <ArrowUpRight size={15}/></div>
  </button>)}</div>
  <div className="dashboard-lower"><section className="panel dashboard-actions"><div className="section-heading"><div><span className="section-eyebrow">Acces direct</span><h2>Vos actions prioritaires</h2></div></div>
   <div className="action-tiles">
    <button onClick={()=>onNavigate('annuaire')}><div className="action-icon"><Search size={21}/></div><span><b>Explorer l annuaire</b><small>Entreprises, personnes et competences</small></span><ArrowUpRight size={18}/></button>
    <button onClick={()=>onNavigate(role==='incube'?'mes-besoins':'besoins')}><div className="action-icon"><ClipboardList size={21}/></div><span><b>{role==='incube'?'Publier un besoin':'Consulter les besoins'}</b><small>Recevoir ou envoyer des propositions</small></span><ArrowUpRight size={18}/></button>
    <button onClick={()=>onNavigate('entreprise')}><div className="action-icon"><Building2 size={21}/></div><span><b>Compléter ma fiche</b><small>Entreprise, collaborateurs et competences</small></span><ArrowUpRight size={18}/></button>
    {(role==='incube'||role==='prestataire')&&<button onClick={()=>onNavigate('dossiers')}><div className="action-icon"><Handshake size={21}/></div><span><b>Dossiers partages</b><small>Candidatures, conversations et suivi d'equipe</small></span><ArrowUpRight size={18}/></button>}
    <button onClick={()=>onNavigate('modules')}><div className="action-icon"><CalendarDays size={21}/></div><span><b>Rendez-vous d’expertise</b><small>Proposer ou reserver un creneau</small></span><ArrowUpRight size={18}/></button>
   </div></section>
   <section className="panel dashboard-aside"><span className="section-eyebrow">Pilotage</span><h2>Au coeur de la plateforme</h2>
    <p className="muted">Les données affichées sont calculees a partir des enregistrements Supabase et tiennent compte de vos droits.</p>
    <div className="aside-counter"><Handshake size={21}/><div><b>{data?.relations||0}</b><small>Relations acceptées</small></div></div>
    {role==='admin'&&<div className="aside-counter"><Clock3 size={21}/><div><b>{data?.prestataires_en_attente||0}</b><small>Prestataires en attente de validation</small></div></div>}
    <div className="aside-note">{role==='admin'?'Consultez l administration pour traiter les comptes et rattacher les collaborateurs.':'Completer votre fiche entreprise et vos competences ameliore votre presence dans l annuaire.'}</div>
    {role==='admin'&&<button className="btn" onClick={()=>onNavigate('admin')}>Ouvrir l administration <ArrowUpRight size={16}/></button>}
   </section>
  </div>
 </div>;
}

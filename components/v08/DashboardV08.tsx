'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,ArrowUpRight,Bell,BriefcaseBusiness,Building2,CalendarDays,
 CheckCircle2,ClipboardList,Handshake,Plus,RefreshCw,Search,UsersRound} from 'lucide-react';
import {db} from '@/lib/supabase';
import {PublicImage} from '@/components/v06/MediaAndSkills';

type Metrics={entreprises:number;personnes:number;offres:number;besoins:number;mes_offres:number;mes_besoins:number;candidatures:number;relations:number;prestataires_en_attente:number};
type Meeting={id:string;debut:string;fin:string;prestataire_nom:string;participant_nom:string;
 objet:string;statut:string;je_suis_incube:boolean};
type Need={statut_suivi:string;nb_reponses:number};
const err=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function DashboardV08({role,displayName,userId,hasCompany,avatarPath,onNavigate}:{
 role:'admin'|'incube'|'prestataire';displayName:string;userId:string;hasCompany:boolean;
 avatarPath:string|null;onNavigate:(section:string)=>void}){
 const [metrics,setMetrics]=useState<Metrics|null>(null),[meetings,setMeetings]=useState<Meeting[]>([]),[needs,setNeeds]=useState<Need[]>([]);
 const [busy,setBusy]=useState(true),[error,setError]=useState('');
 async function load(){setBusy(true);setError('');try{
  const c=db();const [m,r]=await Promise.all([c.rpc('ec_dashboard_v06'),c.rpc('ec08_lister_rdv')]);
  if(m.error)throw m.error;if(r.error)throw r.error;
  setMetrics(m.data as Metrics);setMeetings((r.data||[]) as Meeting[]);
  if(role==='incube'){const x=await c.rpc('ec08_mes_besoins',{p_entreprise:null});
   if(x.error)throw x.error;setNeeds((x.data||[]) as Need[]);}
 }catch(e){setError(err(e));}finally{setBusy(false);}}
 useEffect(()=>{void load();},[userId,role]);
 const upcoming=meetings.filter(m=>m.statut==='confirme'&&new Date(m.fin).getTime()>Date.now()).sort((a,b)=>a.debut.localeCompare(b.debut));
 const pending=needs.filter(n=>!['termine','sans_suite'].includes(n.statut_suivi)).length;
 const cards=role==='admin'?[
  {label:'Entreprises',n:metrics?.entreprises,icon:Building2,tab:'annuaire'},
  {label:'Profils personnels',n:metrics?.personnes,icon:UsersRound,tab:'annuaire'},
  {label:'Offres publiées',n:metrics?.offres,icon:BriefcaseBusiness,tab:'catalogue'},
  {label:'Prestataires à valider',n:metrics?.prestataires_en_attente,icon:Bell,tab:'admin'}
 ]:role==='incube'?[
  {label:'Mes besoins',n:metrics?.mes_besoins,icon:ClipboardList,tab:'demandes'},
  {label:'À suivre',n:pending,icon:Bell,tab:'demandes'},
  {label:'Rendez-vous à venir',n:upcoming.length,icon:CalendarDays,tab:'rdv'},
  {label:'Mises en relation',n:metrics?.relations,icon:Handshake,tab:'dossiers'}
 ]:[
  {label:'Mes offres',n:metrics?.mes_offres,icon:BriefcaseBusiness,tab:'prestataire'},
  {label:'Besoins ouverts',n:metrics?.besoins,icon:ClipboardList,tab:'demandes'},
  {label:'Rendez-vous à venir',n:upcoming.length,icon:CalendarDays,tab:'rdv'},
  {label:'Mises en relation',n:metrics?.relations,icon:Handshake,tab:'dossiers'}
 ];
 const actions=role==='incube'?[
  {title:'Publier ou suivre un besoin',desc:'Mises en relation et statut partagé',icon:Plus,tab:'demandes'},
  {title:'Réserver un expert',desc:'Vos prochains rendez-vous expliqués',icon:CalendarDays,tab:'rdv'},
  {title:'Explorer les experts',desc:'Entreprises, personnes, compétences',icon:Search,tab:'annuaire'}
 ]:role==='prestataire'?[
  {title:'Explorer les besoins',desc:'Candidater à de nouvelles missions',icon:Search,tab:'demandes'},
  {title:'Proposer des rendez-vous',desc:'Votre calendrier d’expertise',icon:CalendarDays,tab:'rdv'},
  {title:'Développer ma vitrine',desc:'Offres, logo et compétences',icon:Building2,tab:'entreprise'}
 ]:[
  {title:'Administrer les comptes',desc:'Rôles, validation, rattachements',icon:UsersRound,tab:'admin'},
  {title:'Voir les demandes',desc:'Statuts et besoins du réseau',icon:ClipboardList,tab:'demandes'},
  {title:'Explorer l’annuaire',desc:'Entreprises et collaborateurs',icon:Search,tab:'annuaire'}
 ];
 const date=(d:string)=>new Date(d).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'});
 return <div className="ec08-dashboard ec08-page">
  <div className="ec08-welcome"><div className="ec08-welcome-main"><PublicImage variant="avatar" path={avatarPath} alt={displayName||'Utilisateur'} className="ec08-welcome-avatar"/>
    <div><span className="section-eyebrow">VOTRE ESPACE EURACONNECT</span><h1>Bonjour{displayName?`, ${displayName.split(' ')[0]}`:''}</h1>
     <p>Votre réseau, vos opportunités et vos prochains rendez-vous au même endroit.</p></div></div>
    <button className="btn ghost small" disabled={busy} onClick={()=>void load()}><RefreshCw size={15}/> Actualiser</button></div>
  {!hasCompany&&role!=='admin'&&<div className="onboarding-banner"><Building2 size={20}/><span><b>Finaliser ton rattachement entreprise</b><small>Rejoins ou crée la fiche de ta structure pour accéder aux parcours partagés.</small></span>
   <button className="btn small" onClick={()=>onNavigate('entreprise')}>Compléter <ArrowRight size={14}/></button></div>}
  {error&&<div role="alert" className="alert">{error}</div>}
  <div className="ec08-kpi-row">{cards.map(c=><button type="button" key={c.label} onClick={()=>onNavigate(c.tab)} className="ec08-kpi">
    <div className="ec08-kpi-heading"><span>{c.label}</span><c.icon size={19}/></div>
    <div className="ec08-kpi-number">{busy?'—':Number(c.n||0).toLocaleString('fr-FR')}</div>
    <small>Voir le détail <ArrowUpRight size={13}/></small></button>)}</div>
  <div className="ec08-home-columns"><section className="panel ec08-actions-panel"><div className="ec08-section-heading"><div><span className="section-eyebrow">ACCÈS IMMÉDIAT</span><h2>Que veux-tu faire aujourd’hui ?</h2></div></div>
    <div className="ec08-action-list">{actions.map(a=><button type="button" key={a.title} onClick={()=>onNavigate(a.tab)}><span className="ec08-action-icon"><a.icon size={21}/></span>
     <span><b>{a.title}</b><small>{a.desc}</small></span><ArrowUpRight size={17}/></button>)}</div>
   </section>
   <section className="panel ec08-next-rdv"><div className="ec08-section-heading"><div><span className="section-eyebrow">PROCHAINES ÉCHÉANCES</span><h2>Agenda à venir</h2></div><button type="button" className="ec08-link-button" onClick={()=>onNavigate('rdv')}>Tout voir <ArrowRight size={14}/></button></div>
    {upcoming.slice(0,4).map(m=><button type="button" className="ec08-agenda-preview" key={m.id} onClick={()=>onNavigate('rdv')}><span className="ec08-agenda-date">{date(m.debut)}</span>
     <div><b>{m.je_suis_incube?m.prestataire_nom:m.participant_nom}</b><small>{m.objet}</small></div><CalendarDays size={16}/></button>)}
    {!upcoming.length&&<div className="ec08-agenda-empty"><CalendarDays size={28}/><b>Agenda libre</b><p>Planifie une rencontre d’expertise pour démarrer un échange.</p><button className="btn small ghost" onClick={()=>onNavigate('rdv')}>Ouvrir l’agenda <ArrowRight size={14}/></button></div>}
   </section></div>
  <div className="ec08-dashboard-bottom"><CheckCircle2 size={17}/><span>Les indicateurs proviennent des données Supabase accessibles à ton compte. Les identités des startups restent protégées selon le plan prestataire.</span></div>
 </div>;
}

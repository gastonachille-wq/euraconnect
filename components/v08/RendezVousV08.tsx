'use client';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {ArrowRight,CalendarCheck2,CalendarClock,CalendarPlus,CheckCircle2,
 Clock3,Download,MapPin,RefreshCw,ShieldCheck,Video,Phone,Building2,X} from 'lucide-react';
import {db} from '@/lib/supabase';
import {PublicImage} from '@/components/v06/MediaAndSkills';

type Role='admin'|'incube'|'prestataire';
type Slot={id:string;debut:string;fin:string;prestataire_nom:string;logo_path:string|null;
 intervenant_nom:string;avatar_path:string|null;modalite:string;est_reserve:boolean;est_mien:boolean;lieu_ou_lien:string|null};
type Meeting={id:string;debut:string;fin:string;prestataire_nom:string;prestataire_logo:string|null;
 intervenant_nom:string;intervenant_avatar:string|null;participant_nom:string;objet:string;details:string;
 besoin_titre:string|null;modalite:string;lieu_ou_lien:string|null;statut:string;je_suis_incube:boolean;demandeur_masque:boolean};
type Need={id:string;titre:string;statut_suivi:string};
const SUBJECTS=['Découverte de prestation','Cadrage de besoin','Évaluation de solution','Suivi de proposition'];
// Les valeurs RPC historiques sont sans accents.
const KEY_SUBJECTS=['Decouverte de prestation','Cadrage de besoin','Evaluation de solution','Suivi de proposition'];
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
function dateParts(v:string){const date=new Date(v);
 return {day:date.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',timeZone:'Europe/Paris'}),
  dayLong:date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'}),
  hour:date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'})};}
function modeInfo(v:string){return v==='visio'?{icon:Video,label:'Visioconférence'}:v==='telephone'?{icon:Phone,label:'Téléphone'}:{icon:MapPin,label:'Sur site'};}
function niceSubject(v:string){const index=KEY_SUBJECTS.indexOf(v);return index>=0?SUBJECTS[index]:v;}
function safeIcs(input:string){return input.replaceAll('\\','\\\\').replace(/\r?\n/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,').slice(0,500);}
function saveCalendar(m:Meeting){
 const icsDate=(value:string)=>new Date(value).toISOString().replaceAll('-','').replaceAll(':','').split('.')[0]+'Z';
 const title=m.je_suis_incube?`${niceSubject(m.objet)} - ${m.prestataire_nom}`:`${niceSubject(m.objet)} - ${m.participant_nom}`;
 const description=['Rendez-vous EURACONNECT',m.besoin_titre||'',m.details||''].filter(Boolean).join('\n');
 const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//EURACONNECT//V08//FR','BEGIN:VEVENT',
  `UID:${m.id}@euraconnect`, `DTSTAMP:${icsDate(new Date().toISOString())}`,
  `DTSTART:${icsDate(m.debut)}`,`DTEND:${icsDate(m.fin)}`,
  `SUMMARY:${safeIcs(title)}`,`DESCRIPTION:${safeIcs(description)}`,
  m.lieu_ou_lien?`LOCATION:${safeIcs(m.lieu_ou_lien)}`:'',
  'END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='rendez-vous-euraconnect.ics';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),500);
}
export default function RendezVousV08({role,userId}:{role:Role;userId:string}){
 const [slots,setSlots]=useState<Slot[]>([]),[meetings,setMeetings]=useState<Meeting[]>([]),[needs,setNeeds]=useState<Need[]>([]);
 const [view,setView]=useState<'agenda'|'disponibilites'>(role==='prestataire'?'agenda':'disponibilites');
 const [period,setPeriod]=useState<'avenir'|'historique'>('avenir');
 const [start,setStart]=useState(''),[duration,setDuration]=useState(30),[mode,setMode]=useState('visio'),[link,setLink]=useState('');
 const [selected,setSelected]=useState<Slot|null>(null),[subject,setSubject]=useState(KEY_SUBJECTS[0]),[detail,setDetail]=useState(''),[linkedNeed,setLinkedNeed]=useState('');
 const [cancelFor,setCancelFor]=useState<Meeting|null>(null),[cancelReason,setCancelReason]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){setError('');
  const c=db();const [s,m]=await Promise.all([c.rpc('ec08_lister_creneaux'),c.rpc('ec08_lister_rdv')]);
  if(s.error)throw s.error;if(m.error)throw m.error;
  setSlots((s.data||[]) as Slot[]);setMeetings((m.data||[]) as Meeting[]);
  if(role==='incube'){const x=await c.rpc('ec08_mes_besoins',{p_entreprise:null});
   if(x.error)throw x.error;setNeeds((x.data||[]) as Need[]);}
 }
 useEffect(()=>{void load().catch(e=>setError(errorText(e)));},[userId,role]);
 async function action(f:()=>Promise<void>,noticeText:string):Promise<boolean>{setBusy(true);setError('');setNotice('');
  try{await f();await load();setNotice(noticeText);return true;}catch(e){setError(errorText(e));return false;}
  finally{setBusy(false);}}
 async function propose(e:FormEvent){e.preventDefault();await action(async()=>{
  if(!start)throw new Error('Date et heure obligatoires.');const from=new Date(start);
  if(Number.isNaN(from.getTime()))throw new Error('Date invalide');
  const end=new Date(from.getTime()+duration*60000);
  const r=await db().rpc('ec08_proposer_creneau',{p_debut:from.toISOString(),p_fin:end.toISOString(),
   p_modalite:mode,p_lieu:link.trim()||null,p_intervenant:null});
  if(r.error)throw r.error;setStart('');setLink('');
 },'Créneau disponible pour les startups.');}
 async function reserve(e:FormEvent){e.preventDefault();if(!selected)return;
  const ok=await action(async()=>{const r=await db().rpc('ec08_reserver_rdv',{
   p_creneau:selected.id,p_objet:subject,p_details:detail,p_besoin:linkedNeed||null});
   if(r.error)throw r.error;setSelected(null);setDetail('');setLinkedNeed('');
  },'Rendez-vous confirmé, visible dans votre agenda.');if(ok)setView('agenda');}
 async function cancel(e:FormEvent){e.preventDefault();if(!cancelFor)return;
  await action(async()=>{const r=await db().rpc('ec08_annuler_rdv',{
   p_rdv:cancelFor.id,p_motif:cancelReason});
   if(r.error)throw r.error;setCancelFor(null);setCancelReason('');
  },'Rendez-vous annulé. Le correspondant est notifié dans EURACONNECT.');}
 const upcoming=meetings.filter(m=>m.statut==='confirme'&&new Date(m.fin).getTime()>=Date.now());
 const filtered=useMemo(()=>meetings.filter(m=>period==='avenir'?m.statut==='confirme'&&new Date(m.fin).getTime()>=Date.now():
  m.statut!=='confirme'||new Date(m.fin).getTime()<Date.now()).sort((a,b)=>period==='avenir'?a.debut.localeCompare(b.debut):b.debut.localeCompare(a.debut)),[meetings,period]);
 const openSlots=slots.filter(s=>!s.est_reserve&&new Date(s.debut).getTime()>Date.now()+(12*3600000));
 const mySlots=slots.filter(s=>s.est_mien);
 return <section className="ec08-page">
  <div className="ec08-page-title"><div><span className="section-eyebrow">Calendrier d’expertise</span><h1>Rendez-vous</h1>
   <p className="sub">Chaque rendez-vous indique l’interlocuteur, l’objet, la date et les modalités.</p></div>
   <button className="btn ghost" disabled={busy} onClick={()=>void load().catch(e=>setError(errorText(e)))}><RefreshCw size={15}/> Actualiser</button></div>
  {error&&<div className="alert" role="alert">{error}</div>}{notice&&<div className="alert ok" role="status">{notice}</div>}
  <div className="ec08-rdv-stats"><div><CalendarCheck2 size={20}/><div><strong>{upcoming.length}</strong><span>Rendez-vous à venir</span></div></div>
   <div><CalendarClock size={20}/><div><strong>{role==='prestataire'?mySlots.length:openSlots.length}</strong><span>{role==='prestataire'?'Créneaux proposés':'Créneaux disponibles'}</span></div></div>
   <div><ShieldCheck size={20}/><div><strong>Europe/Paris</strong><span>Fuseau de référence</span></div></div></div>
  <div className="ec08-toolbar"><div className="ec08-segment"><button className={view==='agenda'?'active':''} onClick={()=>setView('agenda')}><CalendarCheck2 size={16}/> Mes rendez-vous</button>
   <button className={view==='disponibilites'?'active':''} onClick={()=>setView('disponibilites')}><CalendarPlus size={16}/> {role==='prestataire'?'Mes disponibilités':'Réserver une expertise'}</button></div></div>
  {view==='agenda'&&<>
   <div className="ec08-agenda-heading"><h2>Mon agenda</h2><div className="ec08-segment mini"><button className={period==='avenir'?'active':''} onClick={()=>setPeriod('avenir')}>À venir</button><button className={period==='historique'?'active':''} onClick={()=>setPeriod('historique')}>Historique</button></div></div>
   <div className="ec08-meetings">{filtered.map(m=>{const date=dateParts(m.debut),end=dateParts(m.fin);const mode=modeInfo(m.modalite),Icon=mode.icon;
    return <article key={m.id} className="ec08-meeting">
     <div className="ec08-date-block"><strong>{date.day}</strong><span>{date.hour}</span><small>→ {end.hour}</small></div>
     <div className="ec08-meeting-main"><div className="ec08-meeting-name">
       <PublicImage variant="logo" path={m.prestataire_logo} alt={m.prestataire_nom} className="ec08-meeting-logo"/>
       <div><span className="ec08-overline">{m.je_suis_incube?'Avec le prestataire':'Avec la startup'}</span>
        <h3>{m.je_suis_incube?m.prestataire_nom:m.participant_nom}</h3>
        {m.je_suis_incube?<p>Intervenant : {m.intervenant_nom}</p>:<p>Expert désigné : {m.intervenant_nom}{m.demandeur_masque?' · Demandeur confidentiel':''}</p>}
       </div></div>
       <div className="ec08-rdv-facts"><span><Clock3 size={15}/> {date.dayLong} à {date.hour}</span><span><Icon size={15}/>{mode.label}</span>
        <span><CheckCircle2 size={15}/>{m.statut==='confirme'?'Confirmé':m.statut==='annule'?'Annulé':'Réalisé'}</span></div>
       <div className="ec08-rdv-reason"><b>Objet du rendez-vous</b><p>{niceSubject(m.objet)}{m.besoin_titre?` · ${m.besoin_titre}`:''}</p>
        {m.details&&<small>Contexte : {m.details}</small>}</div>
       {m.lieu_ou_lien&&<p className="ec08-meet-link"><MapPin size={15}/> {m.lieu_ou_lien}</p>}
      </div><div className="ec08-meeting-actions"><button className="btn small ghost" onClick={()=>saveCalendar(m)}><Download size={14}/> .ics</button>
       {m.statut==='confirme'&&new Date(m.debut).getTime()>Date.now()&&<button className="btn small ghost" onClick={()=>{setCancelFor(m);setCancelReason('');}}>Annuler</button>}</div>
    </article>;})}
    {!filtered.length&&<div className="empty"><CalendarClock size={25}/><h3>Aucun rendez-vous {period==='avenir'?'à venir':'dans l’historique'}</h3>
     <p>{role==='prestataire'?'Propose un créneau pour recevoir des demandes.':'Réserve une expertise dans les disponibilités.'}</p>
     <button className="btn" onClick={()=>setView('disponibilites')}>Voir les créneaux <ArrowRight size={16}/></button></div>}
   </div></>}
  {view==='disponibilites'&&role==='prestataire'&&<div className="ec08-rdv-columns">
   <form className="panel" onSubmit={propose}><span className="section-eyebrow">Planning prestataire</span><h2>Ouvrir un créneau</h2>
    <p className="sub">La startup verra le nom de ton entreprise et l’expert qui reçoit.</p>
    <div className="fields"><div className="field"><label>Date et heure de début</label><input type="datetime-local" value={start} required onChange={e=>setStart(e.target.value)}/></div>
     <div className="field"><label>Durée</label><select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[15,30,45,60,90].map(v=><option value={v} key={v}>{v} minutes</option>)}</select></div></div>
    <div className="field"><label>Modalité</label><select value={mode} onChange={e=>setMode(e.target.value)}><option value="visio">Visioconférence</option><option value="telephone">Téléphone</option><option value="sur_site">Sur site</option></select></div>
    <div className="field"><label>{mode==='visio'?'Lien visio':mode==='telephone'?'Consigne d’appel':'Adresse précise'}</label>
     <input maxLength={600} value={link} onChange={e=>setLink(e.target.value)} placeholder="Communiqué uniquement après réservation"/></div>
    <button className="btn" disabled={busy}><CalendarPlus size={16}/> Publier le créneau</button></form>
   <section className="panel"><h2>Créneaux de l’entreprise</h2><div className="ec08-compact-list">{mySlots.map(s=><div key={s.id} className="ec08-slot-line"><div><b>{dateParts(s.debut).dayLong}</b><small>{dateParts(s.debut).hour} → {dateParts(s.fin).hour} · {s.intervenant_nom}</small></div><span className={`ec08-status ${s.est_reserve?'ec08-status-rdv_planifie':'ec08-status-ouvert'}`}>{s.est_reserve?'Réservé':'Libre'}</span></div>)}
      {!mySlots.length&&<p className="muted">Aucun créneau ouvert.</p>}</div></section>
  </div>}
  {view==='disponibilites'&&role==='incube'&&<div className="ec08-available-grid">{openSlots.map(s=><article className="ec08-open-slot" key={s.id}>
    <div className="ec08-slot-provider"><PublicImage path={s.logo_path} variant="logo" alt={s.prestataire_nom} className="ec08-slot-logo"/>
     <div><h3>{s.prestataire_nom}</h3><p>Avec {s.intervenant_nom}</p></div></div>
    <div className="ec08-slot-time"><CalendarClock size={16}/>{dateParts(s.debut).dayLong} · {dateParts(s.debut).hour} – {dateParts(s.fin).hour}</div>
    <div className="ec08-slot-time"><span>{modeInfo(s.modalite).label}</span></div>
    <button className="btn" onClick={()=>{setSelected(s);setDetail('');setSubject(KEY_SUBJECTS[0]);}}>Réserver cette expertise <ArrowRight size={15}/></button>
   </article>)}{!openSlots.length&&<div className="empty">Aucun créneau disponible pour l’instant.</div>}</div>}
  {view==='disponibilites'&&role==='admin'&&<div className="empty">Les réservations sont gérées par les comptes startup et prestataire.</div>}
  {selected&&<div className="ec08-modal-backdrop" onMouseDown={()=>setSelected(null)}><div className="ec08-reply-modal" role="dialog" aria-modal="true" aria-label="Confirmer le rendez-vous" onMouseDown={e=>e.stopPropagation()}>
    <div className="ec08-modal-heading"><div><span className="section-eyebrow">Confirmation</span><h2>Réserver avec {selected.prestataire_nom}</h2>
     <p>{dateParts(selected.debut).dayLong} à {dateParts(selected.debut).hour} · Expert : {selected.intervenant_nom}</p></div><button className="ec08-ghost-btn" aria-label="Fermer" onClick={()=>setSelected(null)}><X size={19}/></button></div>
    <form onSubmit={reserve}><div className="field"><label>Pourquoi ce rendez-vous ?</label><select value={subject} onChange={e=>setSubject(e.target.value)}>{KEY_SUBJECTS.map((v,i)=><option key={v} value={v}>{SUBJECTS[i]}</option>)}</select></div>
     <div className="field"><label>Relier à un besoin (facultatif)</label><select value={linkedNeed} onChange={e=>setLinkedNeed(e.target.value)}><option value="">Sans besoin associé</option>{needs.map(n=><option key={n.id} value={n.id}>{n.titre}</option>)}</select></div>
     <div className="field"><label>Précisions pour le rendez-vous (facultatif)</label><textarea rows={3} maxLength={1000} value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Ces précisions restent privées si le prestataire n’est pas Premium."/></div>
     <div className="ec08-market-hint"><ShieldCheck size={17}/> En Free/Pro, le prestataire voit l’objet et l’horaire, mais pas ton identité ni tes précisions privées.</div>
     <div className="ec08-form-actions"><button type="button" className="btn ghost" onClick={()=>setSelected(null)}>Annuler</button><button className="btn" disabled={busy}>Confirmer mon rendez-vous</button></div>
    </form></div></div>}
  {cancelFor&&<div className="ec08-modal-backdrop" onMouseDown={()=>setCancelFor(null)}><form className="ec08-reply-modal" role="dialog" aria-modal="true" aria-label="Annuler le rendez-vous" onSubmit={cancel} onMouseDown={e=>e.stopPropagation()}>
    <div className="ec08-modal-heading"><div><span className="section-eyebrow">Annulation</span><h2>Annuler ce rendez-vous ?</h2><p>{dateParts(cancelFor.debut).dayLong} à {dateParts(cancelFor.debut).hour}</p></div>
      <button type="button" className="ec08-ghost-btn" onClick={()=>setCancelFor(null)} aria-label="Fermer"><X size={19}/></button></div>
    <div className="field"><label>Motif {new Date(cancelFor.debut).getTime()-Date.now()<86400000?'(obligatoire : moins de 24h)':'(facultatif)'}</label><textarea rows={3} maxLength={500} value={cancelReason} onChange={e=>setCancelReason(e.target.value)}/></div>
    <div className="ec08-form-actions"><button type="button" className="btn ghost" onClick={()=>setCancelFor(null)}>Conserver le rendez-vous</button><button className="btn" disabled={busy}>Confirmer l’annulation</button></div>
   </form></div>}
 </section>;
}

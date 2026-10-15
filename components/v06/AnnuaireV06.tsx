'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Building2,UserRound,Search,Filter,ArrowRight,X,Heart,CalendarDays,Clock3} from 'lucide-react';
import {db} from '@/lib/supabase';
import {PublicImage} from './MediaAndSkills';
import {RichContent} from './RichEditor';
import type {Skill} from './MediaAndSkills';
import FavoriteToggle from './FavoriteToggle';

type Entry={nature:'entreprise'|'personne';id:string;nom:string;sous_titre:string;description_html:string;image_path:string|null;entreprise_id:string;competences:string[];nb_total:number};
const explain=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function AnnuaireV06({role}:{role?:'admin'|'incube'|'prestataire'}){
 const [items,setItems]=useState<Entry[]>([]),[skills,setSkills]=useState<Skill[]>([]),[query,setQuery]=useState(''),[kind,setKind]=useState('tous'),[skill,setSkill]=useState('');
 const [favorites,setFavorites]=useState<string[]>([]),[slots,setSlots]=useState<any[]>([]),[booking,setBooking]=useState<any|null>(null),[subject,setSubject]=useState('Decouverte de prestation'),[feedback,setFeedback]=useState(''),[saving,setSaving]=useState(false);
 const [onlyFavorites,setOnlyFavorites]=useState(false),[page,setPage]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[opened,setOpened]=useState<Entry|null>(null);
 async function refresh(target=0){setLoading(true);setError('');try{
  const {data,error:e}=await db().rpc('ec_annuaire_rechercher',{p_texte:query.trim(),p_type:kind,p_competence:skill||null,p_limite:24,p_offset:target*24});
  if(e)throw e;setItems((data||[]) as Entry[]);setPage(target);
 }catch(e){setError(explain(e));}finally{setLoading(false);}}
 useEffect(()=>{void refresh(0);void loadFavorites();void db().from('competences_ec').select('id,libelle').eq('actif',true).order('libelle')
  .then(({data})=>setSkills((data||[]) as Skill[]));},[]);
 async function loadFavorites(){const {data:{user},error:authError}=await db().auth.getUser();if(authError||!user){setFeedback('Connectez-vous pour utiliser les favoris.');return;}
  const r=await db().from('favoris_ec').select('cible_type,cible_id').eq('utilisateur_id',user.id);
  if(r.error)setFeedback(r.error.message);else setFavorites((r.data||[]).map(x=>`${x.cible_type}:${x.cible_id}`));}
 async function toggleFavorite(item:Entry){const key=`${item.nature}:${item.id}`;setFeedback('');setSaving(true);
  try{const c=db();const {data:{user},error:authError}=await c.auth.getUser();if(authError)throw authError;if(!user)throw new Error('Session expirée. Reconnectez-vous.');
   const has=favorites.includes(key);const q=has?c.from('favoris_ec').delete().eq('utilisateur_id',user.id).eq('cible_type',item.nature).eq('cible_id',item.id):
   c.from('favoris_ec').upsert({utilisateur_id:user.id,cible_type:item.nature,cible_id:item.id},{onConflict:'utilisateur_id,cible_type,cible_id'});
   const r=await q;if(r.error)throw r.error;setFavorites(xs=>has?xs.filter(x=>x!==key):[...xs,key]);setFeedback(has?'Retiré des favoris.':'Ajouté aux favoris.');}
  catch(e){setFeedback(explain(e));}finally{setSaving(false);}}
 async function showSlots(item:Entry){setOpened(item);setFeedback('');setBooking(null);const r=await db().rpc('ec08_lister_creneaux');if(r.error){setFeedback(explain(r.error));return;}
  const list=(r.data||[]) as any[];setSlots(list.filter(x=>!x.est_reserve&&new Date(x.debut).getTime()>Date.now()+12*3600000&&x.prestataire_nom.toLowerCase()===item.nom.toLowerCase()));}
 async function reserve(){if(!booking)return;setSaving(true);setFeedback('');try{const r=await db().rpc('ec08_reserver_rdv',{p_creneau:booking.id,p_objet:subject,p_details:'Réservation depuis l’annuaire EURACONNECT',p_besoin:null});if(r.error)throw r.error;setFeedback('Rendez-vous confirmé. Retrouvez ses détails dans votre agenda.');setBooking(null);if(opened)await showSlots(opened);}catch(e){setFeedback(explain(e));}finally{setSaving(false);}}
 const total=items[0]?.nb_total||0;const displayed=onlyFavorites?items.filter(item=>favorites.includes(`${item.nature}:${item.id}`)):items;
 return <div className="directory">
  <div className="page-head"><div><div className="section-eyebrow">Explorer l’écosystème</div><h1>Annuaire</h1><p className="sub">Retrouvez les entreprises, les professionnels et leurs expertises dans un seul espace.</p></div>
   <div className="head-icon"><Search size={24}/></div></div>
  {role==='prestataire'&&<div className="panel ec86-premium"><div><b>Développez vos opportunités avec Premium</b><p>Accédez à l'identité des startups derrière les besoins et priorisez vos mises en relation. Fonction disponible selon votre abonnement prestataire.</p></div><button type="button" className="btn ghost small" onClick={()=>{setFeedback('Pour activer Premium, contactez l’administration EURACONNECT. La souscription en ligne n’est pas encore disponible.');setOpened(null);}}>Découvrir Premium</button></div>}
  {feedback&&!opened&&<div role="status" className="alert">{feedback}</div>}
  <form className="directory-filters panel" onSubmit={(e:FormEvent)=>{e.preventDefault();void refresh(0);}}>
   <div className="directory-search"><Search size={19}/><input aria-label="Recherche dans l annuaire" placeholder="Entreprise, personne, expertise..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
   <div className="filter-select"><Filter size={16}/><select aria-label="Type de fiche" value={kind} onChange={e=>setKind(e.target.value)}>
    <option value="tous">Tous les profils</option><option value="entreprise">Entreprises</option><option value="personne">Personnes</option>
    <option value="prestataire">Prestataires</option><option value="startup">Startups</option><option value="autre">Autres entreprises</option></select></div>
   <select aria-label="Competence" className="directory-skills" value={skill} onChange={e=>setSkill(e.target.value)}><option value="">Toutes les compétences</option>
    {skills.map(s=><option key={s.id} value={s.id}>{s.libelle}</option>)}</select>
   <button className="btn" type="submit"><Search size={16}/> Rechercher</button>
  </form>
  <div className="results-header"><div><strong>{loading?'Recherche...':`${total} résultat(s)`}</strong><span className="muted">Visibilité selon les règles de la plateforme</span></div>
   <button type="button" className={`btn ghost small ${onlyFavorites?'active':''}`} aria-pressed={onlyFavorites} onClick={()=>setOnlyFavorites(x=>!x)}><Heart size={15} fill={onlyFavorites?'currentColor':'none'}/> {onlyFavorites?'Afficher tout':'Mes favoris'}</button>{(query||skill||kind!=='tous')&&<button className="btn ghost small" onClick={()=>{setQuery('');setSkill('');setKind('tous');setPage(0);
    void db().rpc('ec_annuaire_rechercher',{p_texte:'',p_type:'tous',p_competence:null,p_limite:24,p_offset:0}).then(({data,error:e})=>{if(e)setError(e.message);else setItems((data||[]) as Entry[]);});}}>Effacer les filtres <X size={14}/></button>}
  </div>
  {error&&<div className="alert" role="alert">{error}</div>}
  {loading?<div className="directory-grid">{[1,2,3,4].map(i=><div className="directory-card skeleton" key={i}/>)}</div>:
   <div className="directory-grid">{displayed.map(item=><article className="directory-card ec86-directory-card" key={`${item.nature}-${item.id}`} >
    <FavoriteToggle type={item.nature} active={favorites.includes(`${item.nature}:${item.id}`)} disabled={saving} onClick={()=>void toggleFavorite(item)}/>
    <button type="button" className="ec86-directory-open" onClick={()=>{setOpened(item);setSlots([]);setBooking(null);setFeedback('');}}>
    <div className="directory-image"><PublicImage path={item.image_path} alt={item.nom} className="directory-avatar" variant={item.nature==='entreprise'?'logo':'avatar'}/></div>
    <div className="directory-card-body"><div className="entry-meta">{item.nature==='entreprise'?<Building2 size={14}/>:<UserRound size={14}/>}
      {item.nature==='entreprise'?'Entreprise':'Personne'}</div>
     <h3>{item.nom}</h3><p>{item.sous_titre}</p>
     <div className="tag-row">{item.competences.slice(0,4).map(t=><span className="skill-mini" key={t}>{t}</span>)}
      {item.competences.length>4&&<span className="skill-mini">+{item.competences.length-4}</span>}</div>
     <span className="card-action">Voir la fiche <ArrowRight size={15}/></span>
    </div></button></article>)}
    {!displayed.length&&<div className="empty directory-empty"><Search size={26}/><h3>{onlyFavorites?'Aucun favori parmi ces résultats':'Aucun résultat'}</h3><p>Essayez un autre mot-clé ou modifiez les filtres.</p></div>}
   </div>}
  <div className="pagination"><button className="btn ghost" disabled={page===0||loading} onClick={()=>void refresh(page-1)}>Precedent</button>
   <span className="muted">Page {page+1}{total?` / ${Math.ceil(total/24)}`:''}</span>
   <button className="btn ghost" disabled={loading||(page+1)*24>=total} onClick={()=>void refresh(page+1)}>Suivant</button></div>
  {opened&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>setOpened(null)}><div role="dialog" aria-modal="true" aria-label={`Fiche ${opened.nom}`} className="modal-panel" onMouseDown={e=>e.stopPropagation()}>
   <button className="modal-close" aria-label="Fermer la fiche" onClick={()=>setOpened(null)}><X size={20}/></button>
   <div className="modal-heading"><PublicImage path={opened.image_path} alt={opened.nom} className="modal-avatar" variant={opened.nature==='entreprise'?'logo':'avatar'}/><div>
    <span className="section-eyebrow">{opened.nature==='entreprise'?'Fiche entreprise':'Fiche professionnelle'}</span>
    <h2>{opened.nom}</h2><span className="muted">{opened.sous_titre}</span></div></div>
   <div className="ec84-directory-actions"><button type="button" className="btn ghost" disabled={saving} onClick={()=>void toggleFavorite(opened)}><Heart size={17} fill={favorites.includes(`${opened.nature}:${opened.id}`)?'currentColor':'none'}/>{favorites.includes(`${opened.nature}:${opened.id}`)?'Dans mes favoris':'Ajouter aux favoris'}</button>
    {opened.nature==='entreprise'&&<button type="button" className="btn" onClick={()=>void showSlots(opened)}><CalendarDays size={16}/> Voir les créneaux</button>}</div>
   {feedback&&<div className="alert" role="status">{feedback}</div>}
   {opened.nature==='entreprise'&&<div className="ec84-slot-list"><h3>Disponibilités de cette entreprise</h3>{slots.length?slots.slice(0,12).map(slot=><button key={slot.id} type="button" className={`ec84-slot ${booking?.id===slot.id?'selected':''}`} onClick={()=>setBooking(slot)}><Clock3 size={15}/>{new Date(slot.debut).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Paris'})} · {slot.intervenant_nom}</button>):<p className="muted">Aucun créneau public disponible actuellement. Cliquez sur « Voir les créneaux » pour actualiser.</p>}
   {booking&&<div className="ec84-booking"><label>Objet du rendez-vous <select value={subject} onChange={e=>setSubject(e.target.value)}><option value="Decouverte de prestation">Découverte de prestation</option><option value="Cadrage de besoin">Cadrage de besoin</option><option value="Evaluation de solution">Évaluation de solution</option><option value="Suivi de proposition">Suivi de proposition</option></select></label><button className="btn" disabled={saving} onClick={()=>void reserve()}>Confirmer ce rendez-vous</button></div>}</div>}
   <div className="modal-content"><h3>Presentation</h3><RichContent html={opened.description_html}/>
    <h3>Competences</h3><div className="tag-row">{opened.competences.map(t=><span className="skill-mini" key={t}>{t}</span>)}
    {!opened.competences.length&&<p className="muted">Aucune competence renseignee.</p>}</div>
    <div className="callout compact"><b>Mise en relation sécurisée</b><p>Les coordonnées personnelles ne sont pas rendues publiques dans cet annuaire. Les contacts s etablissent via les parcours EURACONNECT.</p></div>
   </div></div></div>}
 </div>;
}

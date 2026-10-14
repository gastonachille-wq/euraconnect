'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Building2,UserRound,Search,Filter,ArrowRight,X} from 'lucide-react';
import {db} from '@/lib/supabase';
import {PublicImage} from './MediaAndSkills';
import {RichContent} from './RichEditor';
import type {Skill} from './MediaAndSkills';

type Entry={nature:'entreprise'|'personne';id:string;nom:string;sous_titre:string;description_html:string;image_path:string|null;entreprise_id:string;competences:string[];nb_total:number};
const explain=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function AnnuaireV06(){
 const [items,setItems]=useState<Entry[]>([]),[skills,setSkills]=useState<Skill[]>([]),[query,setQuery]=useState(''),[kind,setKind]=useState('tous'),[skill,setSkill]=useState('');
 const [page,setPage]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[opened,setOpened]=useState<Entry|null>(null);
 async function refresh(target=0){setLoading(true);setError('');try{
  const {data,error:e}=await db().rpc('ec_annuaire_rechercher',{p_texte:query.trim(),p_type:kind,p_competence:skill||null,p_limite:24,p_offset:target*24});
  if(e)throw e;setItems((data||[]) as Entry[]);setPage(target);
 }catch(e){setError(explain(e));}finally{setLoading(false);}}
 useEffect(()=>{void refresh(0);void db().from('competences_ec').select('id,libelle').eq('actif',true).order('libelle')
  .then(({data})=>setSkills((data||[]) as Skill[]));},[]);
 const total=items[0]?.nb_total||0;
 return <div className="directory">
  <div className="page-head"><div><div className="section-eyebrow">Explorer l’écosystème</div><h1>Annuaire</h1><p className="sub">Retrouvez les entreprises, les professionnels et leurs expertises dans un seul espace.</p></div>
   <div className="head-icon"><Search size={24}/></div></div>
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
   {(query||skill||kind!=='tous')&&<button className="btn ghost small" onClick={()=>{setQuery('');setSkill('');setKind('tous');setPage(0);
    void db().rpc('ec_annuaire_rechercher',{p_texte:'',p_type:'tous',p_competence:null,p_limite:24,p_offset:0}).then(({data,error:e})=>{if(e)setError(e.message);else setItems((data||[]) as Entry[]);});}}>Effacer les filtres <X size={14}/></button>}
  </div>
  {error&&<div className="alert" role="alert">{error}</div>}
  {loading?<div className="directory-grid">{[1,2,3,4].map(i=><div className="directory-card skeleton" key={i}/>)}</div>:
   <div className="directory-grid">{items.map(item=><button type="button" className="directory-card" key={`${item.nature}-${item.id}`} onClick={()=>setOpened(item)}>
    <div className="directory-image"><PublicImage path={item.image_path} alt={item.nom} className="directory-avatar"/></div>
    <div className="directory-card-body"><div className="entry-meta">{item.nature==='entreprise'?<Building2 size={14}/>:<UserRound size={14}/>}
      {item.nature==='entreprise'?'Entreprise':'Personne'}</div>
     <h3>{item.nom}</h3><p>{item.sous_titre}</p>
     <div className="tag-row">{item.competences.slice(0,4).map(t=><span className="skill-mini" key={t}>{t}</span>)}
      {item.competences.length>4&&<span className="skill-mini">+{item.competences.length-4}</span>}</div>
     <span className="card-action">Voir la fiche <ArrowRight size={15}/></span>
    </div></button>)}
    {!items.length&&<div className="empty directory-empty"><Search size={26}/><h3>Aucun résultat</h3><p>Essayez un autre mot-clé ou modifiez les filtres.</p></div>}
   </div>}
  <div className="pagination"><button className="btn ghost" disabled={page===0||loading} onClick={()=>void refresh(page-1)}>Precedent</button>
   <span className="muted">Page {page+1}{total?` / ${Math.ceil(total/24)}`:''}</span>
   <button className="btn ghost" disabled={loading||(page+1)*24>=total} onClick={()=>void refresh(page+1)}>Suivant</button></div>
  {opened&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>setOpened(null)}><div role="dialog" aria-modal="true" aria-label={`Fiche ${opened.nom}`} className="modal-panel" onMouseDown={e=>e.stopPropagation()}>
   <button className="modal-close" aria-label="Fermer la fiche" onClick={()=>setOpened(null)}><X size={20}/></button>
   <div className="modal-heading"><PublicImage path={opened.image_path} alt={opened.nom} className="modal-avatar"/><div>
    <span className="section-eyebrow">{opened.nature==='entreprise'?'Fiche entreprise':'Fiche professionnelle'}</span>
    <h2>{opened.nom}</h2><span className="muted">{opened.sous_titre}</span></div></div>
   <div className="modal-content"><h3>Presentation</h3><RichContent html={opened.description_html}/>
    <h3>Competences</h3><div className="tag-row">{opened.competences.map(t=><span className="skill-mini" key={t}>{t}</span>)}
    {!opened.competences.length&&<p className="muted">Aucune competence renseignee.</p>}</div>
    <div className="callout compact"><b>Mise en relation sécurisée</b><p>Les coordonnées personnelles ne sont pas rendues publiques dans cet annuaire. Les contacts s etablissent via les parcours EURACONNECT.</p></div>
   </div></div></div>}
 </div>;
}

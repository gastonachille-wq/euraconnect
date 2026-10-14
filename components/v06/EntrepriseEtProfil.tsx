'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Building2,Globe2,Users,UserRound,Plus,Save} from 'lucide-react';
import {db} from '@/lib/supabase';
import RichEditor,{RichContent} from './RichEditor';
import {ImageUpload,PublicImage,SkillPicker} from './MediaAndSkills';

type Ent={id:string;nom:string;type:string;statut:string;presentation_html:string;site_web:string|null;logo_path:string|null;role_membre:string};
type Member={profile_id:string;nom_public:string;role_membre:string;actif:boolean};
type Person={profile_id:string;nom_public:string;titre:string;bio_html:string;avatar_path:string|null;visible:boolean};
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function EntrepriseEtProfil({userId,role,defaultName,onChanged}:{userId:string;role:string;defaultName:string;onChanged?:()=>void}){
 const [section,setSection]=useState<'entreprise'|'personne'>('entreprise');
 const [companies,setCompanies]=useState<Ent[]>([]),[selected,setSelected]=useState('');
 const [members,setMembers]=useState<Member[]>([]),[entSkills,setEntSkills]=useState<string[]>([]);
 const [personSkills,setPersonSkills]=useState<string[]>([]),[person,setPerson]=useState<Person|null>(null);
 const [name,setName]=useState(''),[html,setHtml]=useState(''),[site,setSite]=useState(''),[logo,setLogo]=useState<string|null>(null),[publish,setPublish]=useState(false);
 const [newCompany,setNewCompany]=useState(''),[newHtml,setNewHtml]=useState('');
 const [personName,setPersonName]=useState(defaultName),[title,setTitle]=useState(''),[bio,setBio]=useState(''),[avatar,setAvatar]=useState<string|null>(null),[visible,setVisible]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function loadCompanies(){const {data,error:e}=await db().rpc('ec_mes_entreprises');if(e)throw e;
  const list=(data||[]) as Ent[];setCompanies(list);setSelected(v=>list.some(e=>e.id===v)?v:(list[0]?.id||''));}
 useEffect(()=>{void loadCompanies().catch(e=>setError(message(e)));},[userId]);
 useEffect(()=>{if(!selected)return;const ent=companies.find(e=>e.id===selected);if(!ent)return;
  setName(ent.nom);setHtml(ent.presentation_html);setSite(ent.site_web||'');setLogo(ent.logo_path);setPublish(ent.statut==='publiee');
  void Promise.all([
    db().from('entreprise_competences_ec').select('competence_id').eq('entreprise_id',selected),
    db().rpc('ec_lister_membres',{p_entreprise:selected})
  ]).then(([a,b])=>{if(a.error)throw a.error;if(b.error)throw b.error;
    setEntSkills((a.data||[]).map(x=>x.competence_id));setMembers((b.data||[]) as Member[]);
   }).catch(e=>setError(message(e)));
 },[selected,companies]);
 useEffect(()=>{void Promise.all([
  db().from('personnes_annuaire_ec').select('profile_id,nom_public,titre,bio_html,avatar_path,visible').eq('profile_id',userId).maybeSingle(),
  db().from('personne_competences_ec').select('competence_id').eq('profile_id',userId)
 ]).then(([p,s])=>{if(p.error)throw p.error;if(s.error)throw s.error;
  const v=p.data as Person|null;setPerson(v);setPersonName(v?.nom_public||defaultName||'');setTitle(v?.titre||'');setBio(v?.bio_html||'');setAvatar(v?.avatar_path||null);
  setVisible(v?.visible||false);setPersonSkills((s.data||[]).map(x=>x.competence_id));
 }).catch(e=>setError(message(e)));},[userId,defaultName]);
 async function execute(callback:()=>Promise<void>){setError('');setNotice('');setBusy(true);try{await callback();setNotice('Modifications enregistrees.');onChanged?.();}
  catch(e){setError(message(e));}finally{setBusy(false);}}
 async function create(e:FormEvent){e.preventDefault();await execute(async()=>{
  const {error:e}=await db().rpc('ec_creer_entreprise',{p_nom:newCompany,p_type:'startup',p_presentation_html:newHtml});
  if(e)throw e;setNewCompany('');setNewHtml('');await loadCompanies();
 });}
 async function saveCompany(e:FormEvent){e.preventDefault();await execute(async()=>{
  const {error:e}=await db().rpc('ec_sauver_fiche_entreprise',{
   p_entreprise:selected,p_nom:name,p_presentation_html:html,p_site_web:site||null,
   p_logo_path:logo,p_publier:publish,p_competences:entSkills
  });if(e)throw e;
  await loadCompanies();
 });}
 async function savePerson(e:FormEvent){e.preventDefault();await execute(async()=>{
  const {error:e}=await db().rpc('ec_sauver_fiche_personne',{p_nom_public:personName,p_titre:title,
   p_bio_html:bio,p_visible:visible,p_avatar_path:avatar,p_competences:personSkills});if(e)throw e;
 });}
 const ent=companies.find(e=>e.id===selected),canManage=ent?.role_membre==='proprietaire'||ent?.role_membre==='gestionnaire';
 return <div className="v06-section">
  <div className="tabs"><button className={section==='entreprise'?'selected':''} onClick={()=>setSection('entreprise')}><Building2 size={17}/> Mon entreprise</button>
   <button className={section==='personne'?'selected':''} onClick={()=>setSection('personne')}><UserRound size={17}/> Ma fiche personnelle</button></div>
  {error&&<div role="alert" className="alert">{error}</div>}{notice&&<div role="status" className="alert ok">{notice}</div>}
  {section==='entreprise'&&<>
   {!companies.length&&role==='incube'&&<div className="panel"><div className="section-eyebrow">Nouveau rattachement</div><h2>Créer ma startup</h2>
    <p className="sub">Une entreprise peut ensuite rassembler plusieurs utilisateurs. L administrateur peut ajouter les collaborateurs existants.</p>
    <form onSubmit={create}><div className="field"><label>Nom de la startup</label><input minLength={2} maxLength={160} required value={newCompany} onChange={e=>setNewCompany(e.target.value)}/></div>
    <RichEditor label="Presentation" value={newHtml} onChange={setNewHtml}/>
    <button className="btn" disabled={busy}><Plus size={16}/> Créer mon entreprise</button></form></div>}
   {!companies.length&&role!=='incube'&&<div className="empty">Aucune entreprise rattachee a ce compte. Pour les prestataires, commencez par creer votre structure dans "Mon activite". Un administrateur peut rattacher un autre collaborateur.</div>}
   {!!companies.length&&<><div className="panel company-head"><div className="company-head-left"><PublicImage path={ent?.logo_path} alt={ent?.nom||'Entreprise'} className="company-logo" variant="logo"/>
    <div><span className="section-eyebrow">Espace entreprise</span><h2>{ent?.nom}</h2><div className="meta-line"><span className="pill">{ent?.type}</span><span className="pill">{ent?.statut}</span><span className="pill red">{ent?.role_membre}</span></div></div></div>
    {companies.length>1&&<select aria-label="Choisir une entreprise" value={selected} onChange={e=>setSelected(e.target.value)}>{companies.map(e=><option value={e.id} key={e.id}>{e.nom}</option>)}</select>}
   </div>
   <div className="v06-columns"><div className="panel"><div className="section-heading"><div><span className="section-eyebrow">Identite et contenu</span><h3>Fiche entreprise</h3></div><Building2 size={20}/></div>
    {canManage?<form onSubmit={saveCompany}>
     <div className="field"><label>Nom officiel / public</label><input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={160}/></div>
     <div className="field"><label>Site web (optionnel)</label><div className="input-icon"><Globe2 size={17}/><input type="url" placeholder="https://..." value={site} onChange={e=>setSite(e.target.value)}/></div></div>
     <ImageUpload folder="entreprises" id={selected} current={logo} onUploaded={setLogo} label="Importer un logo"/>
     <RichEditor label="Présentation enrichie" value={html} onChange={setHtml} hint="Décrivez vos expertises, réalisations et références."/>
     <SkillPicker value={entSkills} onChange={setEntSkills}/>
     <label className="check-row"><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/>Publier ma fiche dans l annuaire</label>
     <p className="field-hint">Une entreprise prestataire doit etre validee par l administration avant de figurer dans l annuaire.</p>
     <button className="btn" disabled={busy}><Save size={16}/> Enregistrer la fiche</button></form>
    :<><RichContent html={ent?.presentation_html||''}/><div className="selected-skills">{entSkills.length} competence(s) associee(s)</div><p className="muted">Seuls un proprietaire ou un gestionnaire peuvent modifier cette fiche.</p></>}
   </div><div className="panel"><div className="section-heading"><div><span className="section-eyebrow">Travail en equipe</span><h3>Collaborateurs</h3></div><Users size={20}/></div>
    <p className="muted">Chaque compte conserve son identite, tout en etant rattache a la meme entreprise.</p>
    <div className="member-list">{members.map(m=><div className="member" key={m.profile_id}><div className="person-initial">{m.nom_public.slice(0,2).toUpperCase()}</div>
     <div><b>{m.nom_public}</b><small>{m.actif?'Compte rattache':'Acces desactive'}</small></div><span className="pill">{m.role_membre}</span></div>)}</div>
    <div className="callout compact"><b>Ajouter un collaborateur</b><p>Depuis Administration &gt; Entreprises, rattachez un utilisateur existant par email. L invitation automatisée sera ajoutee avec le service d envoi.</p></div>
   </div></div></>}
  </>}
  {section==='personne'&&<div className="v06-columns"><div className="panel"><div className="section-heading"><div><span className="section-eyebrow">Annuaire de personnes</span><h3>Ma fiche professionnelle</h3></div><UserRound size={20}/></div>
   <form onSubmit={savePerson}>
    <ImageUpload folder="personnes" id={userId} current={avatar} onUploaded={setAvatar} label="Importer une photo"/>
    <div className="fields"><div className="field"><label>Nom affiche</label><input required minLength={2} maxLength={120} value={personName} onChange={e=>setPersonName(e.target.value)}/></div>
     <div className="field"><label>Fonction / expertise</label><input maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. Experte reglementaire"/></div></div>
    <RichEditor label="Présentation personnelle" value={bio} onChange={setBio}/>
    <SkillPicker value={personSkills} onChange={setPersonSkills}/>
    <label className="check-row"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/>Rendre ma fiche visible aux utilisateurs connectes</label>
    <p className="field-hint">La publication exige une entreprise rattachee. Votre email et votre numero de telephone ne sont jamais affiches dans cet annuaire.</p>
    <button className="btn" disabled={busy}><Save size={16}/> Enregistrer mon profil</button>
   </form></div><div className="panel"><span className="section-eyebrow">Aperçu annuaire</span><div className="profile-preview"><PublicImage path={avatar} alt={personName||'Personne'} className="profile-large-avatar" variant="avatar"/>
    <h3>{personName||'Nom non renseigne'}</h3><p className="muted">{title||'Votre fonction'}</p>
    <span className={`status-chip ${visible?'online':'offline'}`}>{visible?'Visibilite demandee':'Prive'}</span><RichContent html={bio}/>
    <p className="muted">{person?'Fiche deja enregistree':'Fiche non encore enregistree'}</p>
   </div></div></div>}
 </div>;
}

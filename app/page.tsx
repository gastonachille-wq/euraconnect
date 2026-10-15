'use client';
import TagEditor from '@/components/v06/TagEditor';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,Bell,BookOpen,BriefcaseBusiness,Building2,CalendarDays,MessageCircle,
 ClipboardList,Handshake,LayoutDashboard,LogOut,Menu,Plus,Search,ShieldCheck,
 Sparkles,UserRound,UsersRound,X} from 'lucide-react';
import type {User} from '@supabase/supabase-js';
import {db} from '@/lib/supabase';
import AdminUtilisateurs from '@/components/AdminUtilisateurs';
import AdminEntreprises from '@/components/v06/AdminEntreprises';
import AnnuaireV06 from '@/components/v06/AnnuaireV06';
import EntrepriseEtProfil from '@/components/v06/EntrepriseEtProfil';
import OffreImages from '@/components/v06/OffreImages';
import ModulesV03 from '@/components/ModulesV03';
import RichEditor,{RichContent,richPlainText} from '@/components/v06/RichEditor';
import {PublicImage} from '@/components/v06/MediaAndSkills';
import WorkspaceCommercialV07 from '@/components/v07/WorkspaceCommercialV07';
import DashboardV08 from '@/components/v08/DashboardV08';
import DemandesV08 from '@/components/v08/DemandesV08';
import RendezVousV08 from '@/components/v08/RendezVousV08';
import NotificationCenterV084 from '@/components/v08/NotificationCenterV084';

type Role='admin'|'incube'|'prestataire';
type Profile={id:string;role:Role;nom:string|null;entreprise_id:string|null;statut:string};
type Provider={id:string;nom_public:string;description:string;statut:string;proprietaire_id:string};
type Offer={id:string;titre:string;description:string;description_html:string;image_path:string|null;
 tarif_centimes:number|null;format:string;prestataire_id:string;prestataires?:{nom_public:string}|null};
const err=(e:unknown)=>e instanceof Error?e.message:String(e);
const euro=(v:number|null)=>v===null?'Sur devis':new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v/100);

export default function Home(){
 const [user,setUser]=useState<User|null>(null),[profile,setProfile]=useState<Profile|null>(null);
 const [provider,setProvider]=useState<Provider|null>(null),[avatarPath,setAvatarPath]=useState<string|null>(null);
 const [tab,setTab]=useState('dashboard'),[sideOpen,setSideOpen]=useState(false);
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [offers,setOffers]=useState<Offer[]>([]);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[signup,setSignup]=useState(false);
 const [name,setName]=useState(''),[providerName,setProviderName]=useState(''),[description,setDescription]=useState('');
 const [offerTitle,setOfferTitle]=useState(''),[offerDescription,setOfferDescription]=useState(''),[offerPrice,setOfferPrice]=useState(''),[offerFormat,setOfferFormat]=useState('distance');
 const [adminEmail,setAdminEmail]=useState(''),[adminRole,setAdminRole]=useState<'incube'|'prestataire'>('incube');
 const [catalogueQuery,setCatalogueQuery]=useState('');
 useEffect(()=>{let live=true;let unsubscribe=()=>{};
  try{const c=db();void c.auth.getUser().then(({data,error:e})=>{if(!live)return;if(e)setError(e.message);setUser(data.user);setLoading(false);})
   .catch(e=>{if(live){setError(err(e));setLoading(false);}});
   const {data}=c.auth.onAuthStateChange((_event,session)=>{if(live)setUser(session?.user||null);});
   unsubscribe=()=>data.subscription.unsubscribe();}
  catch(e){setError(err(e));setLoading(false);}
  return()=>{live=false;unsubscribe();};
 },[]);
 useEffect(()=>{if(!user){setProfile(null);setProvider(null);setAvatarPath(null);return;}void reload(user.id);},[user?.id]);
 async function reload(userId:string){try{
  const c=db();const {data:p,error:e}=await c.from('profiles')
   .select('id,role,nom,entreprise_id,statut').eq('id',userId).single();
  if(e)throw e;setProfile(p as Profile);setName(p.nom||'');
  const [offersQuery,photo]=await Promise.all([
   c.from('offres').select('id,titre,description,description_html,image_path,tarif_centimes,format,prestataire_id,prestataires(nom_public)')
     .eq('statut','publiee').order('created_at',{ascending:false}).limit(200),
   c.from('personnes_annuaire_ec').select('avatar_path').eq('profile_id',userId).maybeSingle()
  ]);
  if(offersQuery.error)throw offersQuery.error;
  setOffers((offersQuery.data||[]) as unknown as Offer[]);setAvatarPath(photo.data?.avatar_path||null);
  if(p.role==='prestataire'){
   const {data:primary}=await c.from('prestataires').select('id,nom_public,description,statut,proprietaire_id').eq('proprietaire_id',userId).maybeSingle();
   const {data:secondary}=!primary&&p.entreprise_id?
    await c.from('prestataires').select('id,nom_public,description,statut,proprietaire_id').eq('entreprise_id',p.entreprise_id).maybeSingle():{data:null};
   setProvider((primary||secondary) as Provider|null);
  }else setProvider(null);
  setError('');
 }catch(e){setError(err(e));}}
 function navigate(destination:string){setTab(destination);setSideOpen(false);setError('');setNotice('');window.scrollTo({top:0,behavior:'smooth'});}
 async function run(cb:()=>Promise<void>,success='Modifications enregistrées.'){
  setError('');setNotice('');setSending(true);
  try{await cb();setNotice(success);if(user)await reload(user.id);}
  catch(e){setError(err(e));}finally{setSending(false);}
 }
 async function authenticate(e:FormEvent){e.preventDefault();setError('');setNotice('');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError('Indique une adresse email valide.');return;}
  if(password.length<12){setError('Le mot de passe doit comporter au moins 12 caractères.');return;}
  setSending(true);
  try{
   if(signup){const {data,error:e}=await db().auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin}});
    if(e)throw e;setPassword('');if(data.session){setUser(data.session.user);navigate('dashboard');setNotice('Compte créé. Complète ton profil entreprise.');}
    else{setSignup(false);setNotice('Inscription reçue. Vérifie ton email de confirmation.');}}
   else{const {data,error:e}=await db().auth.signInWithPassword({email:email.trim(),password});if(e)throw e;
    setUser(data.user);setPassword('');navigate('dashboard');}
  }catch(e){setError(err(e));}finally{setSending(false);}
 }
 async function saveName(e:FormEvent){e.preventDefault();await run(async()=>{
  const {error:e}=await db().from('profiles').update({nom:name}).eq('id',user!.id);if(e)throw e;
 });}
 async function createProvider(e:FormEvent){e.preventDefault();await run(async()=>{
  const plain=richPlainText(description);if(plain.length<100)throw new Error('Présentation : au moins 100 caractères.');
  const r=await db().rpc('creer_prestataire',{p_nom:providerName,p_description:plain});if(r.error)throw r.error;
 },'Prestataire soumis à validation.');}
 async function addOffer(e:FormEvent){e.preventDefault();await run(async()=>{
  const plain=richPlainText(offerDescription);if(plain.length<50)throw new Error('Description : 50 caractères minimum.');
  const cents=offerPrice?Math.round(Number(offerPrice)*100):null;
  if(cents!==null&&(!Number.isSafeInteger(cents)||cents<0))throw new Error('Tarif incorrect.');
  const r=await db().rpc('ec_publier_offre_riche',{
   p_titre:offerTitle,p_description:plain,p_html:offerDescription,p_format:offerFormat,p_tarif_centimes:cents});
  if(r.error)throw r.error;setOfferTitle('');setOfferDescription('');setOfferPrice('');
 },'Offre publiée. Tu peux maintenant ajouter son illustration.');}
 async function adminAction(e:FormEvent){e.preventDefault();await run(async()=>{
  const r=await db().rpc('admin_changer_role_par_email',{p_email:adminEmail,p_role:adminRole});
  if(r.error)throw r.error;setAdminEmail('');
 });}
 const role=profile?.role;
 const navigation=[
  {key:'dashboard',label:'Vue d’ensemble',icon:LayoutDashboard},
  {key:'annuaire',label:'Annuaire',icon:UsersRound},
  {key:'catalogue',label:'Offres & expertises',icon:BriefcaseBusiness},
  {key:'demandes',label:role==='incube'?'Mes demandes':'Bourse des besoins',icon:ClipboardList},
  ...(role==='incube'||role==='prestataire'?[{key:'dossiers',label:'Dossiers & messages',icon:Handshake}]:[]),
  {key:'rdv',label:'Rendez-vous',icon:CalendarDays},
  ...(role==='prestataire'?[{key:'prestataire',label:'Mes offres',icon:BookOpen}]:[]),
  {key:'entreprise',label:'Entreprise & profil',icon:Building2},
  {key:'modules',label:role==='prestataire'?'Premium & alertes':'Alertes',icon:Bell},
  ...(role==='admin'?[{key:'admin',label:'Administration',icon:ShieldCheck}]:[]),
  {key:'compte',label:'Mon compte',icon:UserRound}
 ];
 const visibleOffers=offers.filter(o=>(o.titre+' '+o.description+' '+(o.prestataires?.nom_public||'')).toLowerCase().includes(catalogueQuery.toLowerCase()));
 return <>
  <header className="top ec08-top"><div className="shell topin">
   <div className="ec08-header-brand"><button type="button" className="ec08-mobile-nav" onClick={()=>setSideOpen(x=>!x)} aria-label={sideOpen?'Fermer le menu':'Ouvrir le menu'}>{sideOpen?<X size={21}/>:<Menu size={21}/>}</button>
    <button className="brand-button" onClick={()=>navigate('dashboard')} aria-label="Tableau de bord EURACONNECT"><span className="logo">EURA<span>CONNECT</span></span><small>Expertises & opportunités</small></button></div>
   <div className="ec08-header-right">{user&&profile?<><NotificationCenterV084 userId={user.id}/>{(role==='incube'||role==='prestataire')&&<button type="button" className="ec86-messages-shortcut" title="Ouvrir les messages et dossiers" onClick={()=>navigate('dossiers')}><MessageCircle size={19}/><span>Messages</span></button>}<button type="button" className="ec08-header-quick" onClick={()=>navigate('demandes')}><Search size={16}/> Explorer</button>
    <button className="ec08-header-identity" onClick={()=>navigate('entreprise')}><PublicImage path={avatarPath} variant="avatar" alt={profile.nom||'Utilisateur'} className="ec08-header-avatar"/>
     <span><b>{profile.nom||user.email}</b><small>{role==='admin'?'Administrateur':role==='incube'?'Startup incubée':'Prestataire'}</small></span></button>
    <button type="button" className="ec08-header-signout" aria-label="Se déconnecter" title="Se déconnecter" onClick={()=>void db().auth.signOut()}><LogOut size={18}/></button></>:
    <button className="btn" onClick={()=>navigate('connexion')}>Se connecter <ArrowRight size={15}/></button>}</div></div></header>
  <main className="shell ec08-main">{error&&<div className="alert" role="alert">{error}</div>}{notice&&<div className="alert ok" role="status">{notice}</div>}
   {!user&&tab==='connexion'?<div className="panel login ec08-login"><span className="section-eyebrow">Accès EURACONNECT</span><h1>{signup?'Créer un compte prestataire':'Bon retour sur EURACONNECT'}</h1>
     <p>{signup?'Rejoins l’annuaire des expertises professionnelles. Les incubés sont invités par l’administrateur.':'Retrouve tes entreprises, tes demandes et tes rendez-vous.'}</p>
     <form onSubmit={authenticate} noValidate><div className="field"><label>Email professionnel</label><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></div>
      <div className="field"><label>Mot de passe</label><input type="password" required autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/><small>12 caractères minimum.</small></div>
      <button className="btn ec08-wide-button" type="submit" disabled={sending}>{sending?'Connexion en cours…':signup?'Créer mon compte':'Accéder à mon espace'} <ArrowRight size={16}/></button></form>
     <div className="actions"><button className="btn ghost" onClick={()=>setSignup(!signup)}>{signup?'Déjà inscrit ? Connexion':'Devenir prestataire'}</button>
      <button className="btn ghost" onClick={()=>void run(async()=>{if(!email)throw new Error('Renseigne ton email.');
       const r=await db().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset'});
       if(r.error)throw r.error;},'Si ce compte existe, un lien de réinitialisation a été envoyé.')}>Mot de passe oublié</button></div>
    </div>:!user?<section className="ec08-landing"><div className="ec08-landing-pill"><Sparkles size={15}/> Marketplace des expertises</div>
      <h1>Les bonnes expertises.<br/><span>Au bon moment.</span></h1>
      <p>Une plateforme pour identifier les entreprises, publier des besoins, recevoir des propositions qualifiées et organiser des rendez-vous.</p>
      <div className="actions"><button className="btn" onClick={()=>navigate('connexion')}>Accéder à EURACONNECT <ArrowRight size={16}/></button></div></section>:
    loading||!profile?<div className="empty">{error?'Profil indisponible. Vérifie tes droits dans Supabase.':'Chargement de ton espace…'}</div>:
    <div className="layout ec08-layout"><aside className={`side ec08-side ${sideOpen?'ec08-side-open':''}`}>
      <span className="sidebar-heading">ESPACE DE TRAVAIL</span><nav className="sidebar-nav">{navigation.map(item=><button type="button" key={item.key}
       className={tab===item.key?'active':''} aria-current={tab===item.key?'page':undefined} onClick={()=>navigate(item.key)}><item.icon size={18}/><span>{item.label}</span></button>)}</nav>
       <div className="sidebar-footer"><small>Espace sécurisé</small><b>{role==='admin'?'Administration':role==='incube'?'Startup':'Prestataire'}</b></div>
     </aside><section className="content ec08-content">
      {tab==='dashboard'&&<DashboardV08 role={profile.role} userId={user.id} displayName={profile.nom||''}
        hasCompany={!!profile.entreprise_id} avatarPath={avatarPath} onNavigate={navigate}/>}
      {tab==='annuaire'&&<AnnuaireV06 role={profile.role}/>}
      {tab==='demandes'&&<DemandesV08 role={profile.role} onNavigate={navigate}/>}
      {tab==='rdv'&&<RendezVousV08 role={profile.role} userId={user.id}/>}
      {tab==='dossiers'&&(role==='prestataire'||role==='incube')&&<WorkspaceCommercialV07 userId={user.id} onNavigate={navigate}/>}
      {tab==='catalogue'&&<section className="ec08-page"><div className="ec08-page-title"><div><span className="section-eyebrow">Catalogue professionnel</span><h1>Offres de services</h1>
        <p className="sub">Découvre les expertises et compare les prestations disponibles.</p></div></div>
       <div className="ec08-filter-bar"><div className="ec08-search"><Search size={18}/><input aria-label="Chercher une offre" value={catalogueQuery} onChange={e=>setCatalogueQuery(e.target.value)} placeholder="Rechercher une prestation ou un prestataire…"/></div></div>
       <div className="catalogue-grid">{visibleOffers.map(o=><article className="catalogue-card" key={o.id}>
        <div className="catalogue-image"><PublicImage path={o.image_path} alt={o.titre} variant="cover"/></div><div className="catalogue-body"><span className="pill red">{o.prestataires?.nom_public||'Prestataire'}</span>
         <h3>{o.titre}</h3><RichContent html={o.description_html||o.description}/>
         <div className="catalogue-meta"><span className="pill">{o.format==='distance'?'À distance':o.format==='site'?'Sur site':'Mixte'}</span><b>{euro(o.tarif_centimes)}</b></div></div>
        </article>)}{!visibleOffers.length&&<div className="empty">Aucune offre ne correspond à cette recherche.</div>}</div>
       </section>}
      {tab==='prestataire'&&role==='prestataire'&&<section className="ec08-page"><div className="ec08-page-title"><div><span className="section-eyebrow">Vitrine professionnelle</span><h1>Mes offres</h1>
        <p className="sub">Présente tes prestations avec une description enrichie et une image au format uniforme.</p></div></div>
       {!provider?<form className="panel ec08-form-compact" onSubmit={createProvider}><h2>Créer mon entreprise prestataire</h2>
         <div className="field"><label>Nom de l’entreprise</label><input required minLength={3} value={providerName} onChange={e=>setProviderName(e.target.value)}/></div>
         <RichEditor label="Présentation de l’activité (100 caractères minimum)" value={description} onChange={setDescription}/>
         <button className="btn" disabled={sending}>Soumettre pour validation</button></form>:
        <><div className="ec08-provider-stripe"><Building2 size={19}/><b>{provider.nom_public}</b><span className="pill">{provider.statut==='valide'?'Validée':'En validation'}</span></div>
          {provider.statut==='valide'&&<details className="panel ec08-compose"><summary><Plus size={18}/> Ajouter une offre de service</summary>
            <form onSubmit={addOffer} className="ec08-form-compact"><div className="fields"><div className="field"><label>Titre de la prestation</label><input required minLength={8} maxLength={100} value={offerTitle} onChange={e=>setOfferTitle(e.target.value)}/></div>
             <div className="field"><label>Modalité</label><select value={offerFormat} onChange={e=>setOfferFormat(e.target.value)}><option value="distance">À distance</option><option value="site">Sur site</option><option value="mixte">Mixte</option></select></div></div>
             <RichEditor label="Description enrichie de la prestation" value={offerDescription} onChange={setOfferDescription}/>
             <div className="field"><label>Tarif indicatif (€)</label><input type="number" min={0} step="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)}/></div>
             <button className="btn" disabled={sending}>Publier l’offre <ArrowRight size={15}/></button></form></details>}
          <div className="panel ec08-offer-images"><h2>Illustrations et tags de mes offres</h2><OffreImages offers={offers.filter(o=>o.prestataire_id===provider.id)} onChanged={()=>void reload(user.id)}/><div className="ec85-offer-tags">{offers.filter(o=>o.prestataire_id===provider.id).map(o=><div key={o.id} className="ec85-offer-row"><b>{o.titre}</b><TagEditor type="offre" id={o.id}/></div>)}</div></div>
         </>}
      </section>}
      {tab==='entreprise'&&<section className="ec08-page"><div className="ec08-page-title"><div><span className="section-eyebrow">Votre identité professionnelle</span><h1>Entreprise, collaborateurs & profil</h1>
        <p className="sub">Logo cadré automatiquement, photo de profil, tags de compétences et équipe.</p></div></div>
        <EntrepriseEtProfil role={role ?? ''} userId={user.id} defaultName={profile.nom||'Utilisateur'} onChanged={()=>void reload(user.id)}/></section>}
      {tab==='modules'&&role&&<ModulesV03 role={role} providerId={provider?.id} userId={user.id} offers={offers.map(o=>({id:o.id,titre:o.titre,prestataire_id:o.prestataire_id}))}/>}
      {tab==='admin'&&role==='admin'&&<section className="ec08-page"><div className="ec08-page-title"><div><span className="section-eyebrow">Gestion de la plateforme</span><h1>Administration</h1>
        <p className="sub">Utilisateurs, validation des prestataires et rattachements entreprise.</p></div></div>
        <AdminUtilisateurs/><AdminEntreprises/><details className="panel ec08-compose"><summary>Activer un compte Supabase existant</summary>
         <form onSubmit={adminAction} className="ec08-form-compact"><div className="fields"><div className="field"><label>Email existant</label><input type="email" required value={adminEmail} onChange={e=>setAdminEmail(e.target.value)}/></div>
          <div className="field"><label>Rôle</label><select value={adminRole} onChange={e=>setAdminRole(e.target.value as 'incube'|'prestataire')}><option value="incube">Incubé</option><option value="prestataire">Prestataire</option></select></div></div>
         <button className="btn" disabled={sending}>Attribuer le rôle</button></form></details>
         <div className="panel ec08-admin-valid"><h2>Prestataires à valider</h2><AdminProviders onDone={()=>void reload(user.id)}/></div></section>}
      {tab==='compte'&&<section className="ec08-page"><div className="ec08-page-title"><div><span className="section-eyebrow">Compte & accès</span><h1>Mes paramètres</h1><p className="sub">Personnalise ta présence et sécurise ton accès.</p></div></div>
        <div className="panel ec08-account-card"><PublicImage path={avatarPath} variant="avatar" alt={name||'Utilisateur'} className="ec08-account-avatar"/>
         <div><h2>{profile.nom||'Votre identité'}</h2><p>{user.email} · {role}</p><button className="btn ghost small" onClick={()=>navigate('entreprise')}>Modifier ma photo et ma fiche <ArrowRight size={14}/></button></div></div>
        <form className="panel ec08-form-compact" onSubmit={saveName}><div className="field"><label>Nom d’affichage</label><input required value={name} onChange={e=>setName(e.target.value)}/></div>
         <button className="btn" disabled={sending}>Enregistrer</button></form>
        <button className="btn ghost" onClick={()=>void run(async()=>{const r=await db().auth.signOut({scope:'global'});if(r.error)throw r.error;})}>Déconnecter tous mes appareils</button></section>}
     </section></div>}
  </main><footer className="footer ec08-footer"><div className="shell">EURACONNECT V0.8.6 · Plateforme de services · Protection des identités selon le plan · Paiement Stripe non activé</div></footer>
 </>;
}
function AdminProviders({onDone}:{onDone:()=>void}){
 const [items,setItems]=useState<Provider[]>([]),[error,setError]=useState('');
 useEffect(()=>{void db().from('prestataires').select('id,nom_public,description,statut,proprietaire_id')
   .eq('statut','en_validation').then(({data,error:e})=>{if(e)setError(e.message);setItems((data||[]) as Provider[]);});},[]);
 return <div className="list">{error&&<div className="alert">{error}</div>}{items.map(p=><div className="item" key={p.id}><div><h3>{p.nom_public}</h3><p>{p.description}</p></div>
  <button className="btn" onClick={async()=>{const r=await db().rpc('admin_valider_prestataire',{p_prestataire_id:p.id});
   if(r.error)setError(r.error.message);else{setItems(xs=>xs.filter(v=>v.id!==p.id));onDone();}}}>Valider</button></div>)}
  {!items.length&&<p>Aucun prestataire en attente.</p>}</div>;
}

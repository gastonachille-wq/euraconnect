'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {db} from '@/lib/supabase';
import ModulesV03 from '@/components/ModulesV03';
import IntermediationV04 from '@/components/IntermediationV04';
import WorkspaceCommercialV07 from '@/components/v07/WorkspaceCommercialV07';
import AdminUtilisateurs from '@/components/AdminUtilisateurs';
import DashboardV06 from '@/components/v06/DashboardV06';
import AnnuaireV06 from '@/components/v06/AnnuaireV06';
import EntrepriseEtProfil from '@/components/v06/EntrepriseEtProfil';
import AdminEntreprises from '@/components/v06/AdminEntreprises';
import OffreImages from '@/components/v06/OffreImages';
import RichEditor,{RichContent,richPlainText} from '@/components/v06/RichEditor';
import {PublicImage} from '@/components/v06/MediaAndSkills';
import {LayoutDashboard,Building2,UsersRound,BriefcaseBusiness,ClipboardList,Handshake,CalendarDays,ShieldCheck,UserRound,LogOut,ArrowRight} from 'lucide-react';
import type {User} from '@supabase/supabase-js';
type Profile={id:string;role:'prestataire'|'incube'|'admin';nom:string|null;organisation_id:string;entreprise_id:string|null;statut:string};
type Provider={id:string;nom_public:string;description:string;statut:string;proprietaire_id:string};
type Offer={id:string;titre:string;description:string;description_html:string;image_path:string|null;tarif_centimes:number|null;format:string;prestataire_id:string;prestataires?:{nom_public:string}|null};
type Need={id:string;titre:string;description:string;description_html:string;budget_centimes:number|null;incube_id:string;statut:string;created_at:string};
type Candidate={id:string;alias:string;message:string;statut:string;identite_revelee:boolean;prestataire_nom:string|null;mise_en_relation:string|null;projet_id:string};
const money=(n:number|null)=>n===null?'Sur devis':new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n/100);
const err=(error:unknown)=>error instanceof Error?error.message:String(error);
export default function Home(){
 const [user,setUser]=useState<User|null>(null),[profile,setProfile]=useState<Profile|null>(null),[provider,setProvider]=useState<Provider|null>(null);
 const [tab,setTab]=useState('dashboard'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false);
 const [offers,setOffers]=useState<Offer[]>([]),[needs,setNeeds]=useState<Need[]>([]),[candidates,setCandidates]=useState<Candidate[]>([]),[ownApplications,setOwnApplications]=useState<{id:string;projet_id:string;statut:string}[]>([]);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[signup,setSignup]=useState(false);
 const [name,setName]=useState(''),[providerName,setProviderName]=useState(''),[description,setDescription]=useState('');
 const [offerTitle,setOfferTitle]=useState(''),[offerDescription,setOfferDescription]=useState(''),[offerPrice,setOfferPrice]=useState(''),[offerFormat,setOfferFormat]=useState('distance');
 const [needTitle,setNeedTitle]=useState(''),[needDescription,setNeedDescription]=useState(''),[needBudget,setNeedBudget]=useState('');
 const [replyNeed,setReplyNeed]=useState<Need|null>(null),[replyMessage,setReplyMessage]=useState('');
 const [relations,setRelations]=useState<{id:string;statut:string;candidature_id:string}[]>([]);
 const [adminEmail,setAdminEmail]=useState(''),[adminRole,setAdminRole]=useState<'incube'|'prestataire'>('incube');
 useEffect(()=>{let live=true;let unsub:(()=>void)|null=null; try {const client=db();client.auth.getUser().then(({data})=>{if(live){setUser(data.user);setLoading(false)}}).catch(e=>{if(live){setError(err(e));setLoading(false)}});const {data}=client.auth.onAuthStateChange((_event,session)=>{if(live)setUser(session?.user??null)});unsub=()=>data.subscription.unsubscribe()}catch(e){setError(err(e));setLoading(false)}return()=>{live=false;unsub?.()};},[]);
 useEffect(()=>{if(!user){setProfile(null);setProvider(null);return}void reload()},[user?.id]);
 async function reload(){try{const c=db();const {data:p,error:e}=await c.from('profiles').select('id,role,nom,organisation_id,entreprise_id,statut').eq('id',user!.id).single();if(e)throw e;if(!p)throw new Error('Profil utilisateur absent');setProfile(p as Profile);setName(p?.nom||'');const {data:o,error:oe}=await c.from('offres').select('id,titre,description,description_html,image_path,tarif_centimes,format,prestataire_id,prestataires(nom_public)').eq('statut','publiee').order('created_at',{ascending:false});if(oe)throw oe;setOffers((o||[]) as unknown as Offer[]);const {data:n,error:ne}=await c.from('projets').select('id,titre,description,description_html,budget_centimes,incube_id,statut,created_at').eq('statut','publie').order('created_at',{ascending:false});if(ne)throw ne;setNeeds((n||[]) as Need[]);if(p.role==='prestataire'){const {data:own}=await c.from('prestataires').select('id,nom_public,description,statut,proprietaire_id').eq('proprietaire_id',user!.id).maybeSingle();
 const {data:shared}=!own&&p.entreprise_id?await c.from('prestataires').select('id,nom_public,description,statut,proprietaire_id').eq('entreprise_id',p.entreprise_id).maybeSingle():{data:null};
 const pr=own||shared;setProvider(pr as Provider|null);const {data:a}=await c.from('candidatures').select('id,projet_id,statut').eq('prestataire_id',pr?.id||'00000000-0000-0000-0000-000000000000');setOwnApplications(a||[]);if(pr){const {data:rs}=await c.from('mises_en_relation').select('id,statut,candidature_id').eq('statut','demandee');setRelations(rs||[])}}if(p.role==='incube'){const {data:ca,error:ce}=await c.rpc('lister_mes_candidatures');if(ce)throw ce;setCandidates((ca||[]) as Candidate[])}setError('')}catch(e){setError(err(e))}}
 async function run(fn:()=>Promise<void>){setError('');setNotice('');try{await fn();setNotice('Action enregistrée.');await reload()}catch(e){setError(err(e))}}
 async function login(e:FormEvent){
  e.preventDefault();
  setError('');
  setNotice('');
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    setError('Saisissez une adresse email valide.');
    return;
  }
  if (password.length < 12) {
    setError('Le mot de passe doit contenir au moins 12 caractères.');
    return;
  }
  setSubmitting(true);
  try {
    const c=db();
    if(signup){
      const {data,error:authError}=await c.auth.signUp({
        email:email.trim(),
        password,
        options:{emailRedirectTo:window.location.origin}
      });
      if(authError)throw authError;
      setPassword('');
      if(data.session){
        setUser(data.session.user);
        setTab('dashboard');
        setNotice('Compte créé. Vous êtes connecté. Complétez maintenant votre profil prestataire.');
      }else{
        setNotice('Demande d’inscription reçue. Si cette adresse peut être utilisée, vérifiez votre boîte mail et les indésirables pour confirmer votre compte.');
        setSignup(false);
      }
    }else{
      const {data,error:authError}=await c.auth.signInWithPassword({email:email.trim(),password});
      if(authError)throw authError;
      setPassword('');
      setUser(data.user);
      setTab('dashboard');
      setNotice('Connexion réussie.');
    }
  }catch(e){
    setError(err(e));
  }finally{
    setSubmitting(false);
  }
 }
 async function saveName(e:FormEvent){e.preventDefault();await run(async()=>{const {error:e}=await db().from('profiles').update({nom:name}).eq('id',user!.id);if(e)throw e})}
 async function createProvider(e:FormEvent){e.preventDefault();await run(async()=>{const plain=richPlainText(description);if(plain.length<100)throw new Error('La presentation doit contenir au moins 100 caracteres.');
 const {error:e}=await db().rpc('creer_prestataire',{p_nom:providerName,p_description:plain});if(e)throw e})}
 async function addOffer(e:FormEvent){e.preventDefault();await run(async()=>{const plain=richPlainText(offerDescription);if(plain.length<50)throw new Error('La description doit contenir au moins 50 caracteres.');
 const {error:e}=await db().rpc('ec_publier_offre_riche',{p_titre:offerTitle,p_description:plain,p_html:offerDescription,p_format:offerFormat,p_tarif_centimes:offerPrice?Math.round(Number(offerPrice)*100):null});if(e)throw e;setOfferTitle('');setOfferDescription('');setOfferPrice('')})}
 async function addNeed(e:FormEvent){e.preventDefault();await run(async()=>{const plain=richPlainText(needDescription);if(plain.length<50)throw new Error('Le besoin doit contenir au moins 50 caracteres.');
 const {error:e}=await db().rpc('ec_publier_besoin_riche',{p_titre:needTitle,p_description:plain,p_html:needDescription,p_budget_centimes:needBudget?Math.round(Number(needBudget)*100):null});if(e)throw e;setNeedTitle('');setNeedDescription('');setNeedBudget('')})}
 async function reply(e:FormEvent){e.preventDefault();if(!replyNeed)return;await run(async()=>{const {error:e}=await db().rpc('envoyer_candidature_ouverte',{p_projet_id:replyNeed.id,p_message:replyMessage});if(e)throw e;setReplyNeed(null);setReplyMessage('')})}
 async function adminAction(e:FormEvent){e.preventDefault();await run(async()=>{const {error:e}=await db().rpc('admin_changer_role_par_email',{p_email:adminEmail,p_role:adminRole});if(e)throw e;setAdminEmail('')})}
 const nav=[
  ['dashboard','Tableau de bord',LayoutDashboard],
  ['annuaire','Annuaire',UsersRound],
  ['catalogue','Offres de services',BriefcaseBusiness],
  ['besoins','Besoins ouverts',ClipboardList],
  ...(profile?.role==='incube'||profile?.role==='prestataire'?[['dossiers','Dossiers partages',Handshake]]:[]),
  ...(profile?.role==='prestataire'?[['prestataire','Mon activite',BriefcaseBusiness]]:[]),
  ...(profile?.role==='incube'?[['mes-besoins','Mes demandes',ClipboardList]]:[]),
  ...(profile?[['entreprise','Entreprise & profil',Building2],['modules','Services & rendez-vous',CalendarDays],['intermediation','Intermediation & messages',Handshake]]:[]),
  ...(profile?.role==='admin'?[['admin','Administration',ShieldCheck]]:[]),
  ...(profile?[['compte','Mon compte',UserRound]]:[])
 ] as [string,string,typeof LayoutDashboard][];
 const myNeeds=needs.filter(n=>n.incube_id===user?.id);
 return <><header className="top"><div className="shell topin"><button className="brand-button" type="button" onClick={()=>setTab('dashboard')} aria-label="Accueil EURACONNECT"><div className="logo">EURA<span>CONNECT</span></div><small>Marketplace des expertises</small></button>
 <nav className="nav">{user?<><span className="user-mini"><span className="user-bubble">{(profile?.nom||user.email||'U').slice(0,1).toUpperCase()}</span><span><b>{profile?.nom||user.email}</b><small>{profile?.role||'Compte'}</small></span></span>
 <button className="signout-btn" onClick={()=>void db().auth.signOut()} aria-label="Se deconnecter"><LogOut size={17}/><span>Deconnexion</span></button></>:<button className="btn" onClick={()=>setTab('connexion')}>Se connecter <ArrowRight size={16}/></button>}</nav></div></header>
 <main className="shell">{error&&<div className="alert" role="alert">{error}</div>}{notice&&<div className="alert ok" role="status">{notice}</div>}
 {!user&&tab==='connexion'?<div className="panel login"><h1>{signup?'Créer un compte prestataire':'Connexion'}</h1><p>{signup?'L’inscription publique est réservée aux prestataires. Les incubés sont activés par un administrateur.':'Accédez à votre espace EURACONNECT.'}</p><form onSubmit={login} noValidate><div className="field"><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div><div className="field"><label>Mot de passe</label><input type="password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/><p className="textsmall">12 caractères minimum.</p></div><button className="btn" type="submit" disabled={submitting}>{submitting?"Veuillez patienter…":signup?'Créer mon compte':'Connexion'}</button></form><div className="actions"><button className="btn ghost" onClick={()=>setSignup(!signup)}>{signup?'J’ai déjà un compte':'Devenir prestataire'}</button><button className="btn ghost" onClick={()=>void run(async()=>{if(!email)throw new Error('Saisissez votre email.');const {error:e}=await db().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset'});if(e)throw e;setNotice('Email de réinitialisation envoyé si le compte existe.')})}>Mot de passe oublié</button></div></div>:
 !user?<><section className="hero"><div><div className="tag">L’écosystème de services pour l’innovation</div><h1>Les bonnes expertises.<br/>Au bon moment.</h1><p>EURACONNECT rapproche les startups incubées des experts et prestataires qualifiés. Découvrez les services et trouvez des réponses concrètes à vos besoins.</p><button className="btn" onClick={()=>setTab('connexion')}>Accéder à la plateforme</button></div></section><div className="grid"><div className="panel"><h3>Expertises visibles</h3><p>Un annuaire structuré pour identifier la bonne offre de service.</p></div><div className="panel"><h3>Besoins qualifiés</h3><p>Une demande ouverte peut recevoir des réponses adaptées.</p></div><div className="panel"><h3>Intermédiation maîtrisée</h3><p>Un modèle hybride avec des candidatures Free anonymisées.</p></div></div></>:
 loading||!profile?<div className="empty">{error?'Profil indisponible. Verifiez votre role et rechargez la page.':'Chargement du profil...'}</div>:
 <div className="layout"><aside className="side panel"><div className="sidebar-heading">ESPACE EURACONNECT</div><div className="sidebar-nav">{nav.map(([k,v,Icon])=><button key={k} type="button" className={tab===k?'active':''} onClick={()=>{setTab(k);setError('');setNotice('');}}><Icon size={18}/><span>{v}</span></button>)}</div><div className="sidebar-footer"><div className="sidebar-caption">Votre espace securise</div><div>{profile.role==='admin'?'Administrateur':profile.role==='incube'?'Incube':'Prestataire'}</div></div></aside><section className="content">
 {tab==='dashboard'&&<DashboardV06 role={profile.role} displayName={profile.nom||''} userId={user.id} hasCompany={!!profile.entreprise_id} onNavigate={setTab}/>}
 {tab==='annuaire'&&<AnnuaireV06/>}
 {tab==='catalogue'&&<><div className="page-head"><div><span className="section-eyebrow">Services experts</span><h1>Catalogue de services</h1><p className="sub">Des offres de prestataires verifies pour vos projets d innovation.</p></div></div>
 <div className="catalogue-grid">{offers.map(o=><article className="catalogue-card" key={o.id}><div className="catalogue-image">{o.image_path?<PublicImage path={o.image_path} alt={o.titre}/>:<BriefcaseBusiness size={30}/>}</div>
 <div className="catalogue-body"><span className="pill red">{o.prestataires?.nom_public||'Prestataire'}</span><h3>{o.titre}</h3><RichContent html={o.description_html||o.description}/>
 <div className="catalogue-meta"><span className="pill">{o.format}</span><span className="pill">{money(o.tarif_centimes)}</span></div></div></article>)}
 {!offers.length&&<div className="empty">Aucune offre publiee pour le moment.</div>}</div></>}
 {tab==='besoins'&&<><h1>Besoins ouverts</h1><p className="sub">Détectez les opportunités auxquelles répondre.</p><div className="list">{needs.map(n=><article className="item" key={n.id}><div><span className="tag">Demande publiée</span><h3>{n.titre}</h3><RichContent html={n.description_html||n.description}/><span className="pill">Budget {money(n.budget_centimes)}</span></div>{profile.role==='prestataire'&&provider?.statut==='valide'&&provider.proprietaire_id===user.id&&<button className="btn" disabled={ownApplications.some(a=>a.projet_id===n.id)} onClick={()=>{setReplyNeed(n);setReplyMessage('')}}>{ownApplications.some(a=>a.projet_id===n.id)?'Déjà répondu':'Répondre'}</button>}</article>)}{!needs.length&&<div className="empty">Pas de besoin ouvert actuellement.</div>}</div>{replyNeed&&<div className="panel" style={{marginTop:20}}><h3>Répondre à : {replyNeed.titre}</h3><p>Votre réponse spontanée est soumise au quota de votre plan. En Free, votre identité sera masquée pour l’incubé jusqu'à l’accord mutuel.</p><form onSubmit={reply}><div className="field"><label>Votre proposition (minimum 100 caractères, sans coordonnées personnelles)</label><textarea minLength={100} required value={replyMessage} onChange={e=>setReplyMessage(e.target.value)}/></div><div className="actions"><button className="btn">Envoyer ma candidature</button><button type="button" className="btn ghost" onClick={()=>setReplyNeed(null)}>Annuler</button></div></form></div>}</>}
 {tab==='prestataire'&&profile.role==='prestataire'&&<><h1>Mon activité prestataire</h1><p className="sub">Référencez vos services et répondez aux besoins de startups.</p>{!provider?<div className="panel"><h3>Créer mon organisation prestataire</h3><form onSubmit={createProvider}><div className="field"><label>Nom public de la structure</label><input required minLength={3} value={providerName} onChange={e=>setProviderName(e.target.value)}/></div><RichEditor label="Presentation du prestataire (100 caracteres minimum)" value={description} onChange={setDescription}/><button className="btn">Soumettre pour validation</button></form></div>:<><div className="panel"><h3>{provider.nom_public}</h3><p>{provider.description}</p><span className="pill">Statut : {provider.statut}</span>{provider.statut!=='valide'&&<p className="textsmall">Un administrateur doit valider la structure avant la publication d'offres et les candidatures.</p>}</div>{provider.statut==='valide'&&<div className="panel" style={{marginTop:18}}><h3>Publier une offre</h3><form onSubmit={addOffer}><div className="fields"><div className="field"><label>Titre</label><input required minLength={8} value={offerTitle} onChange={e=>setOfferTitle(e.target.value)}/></div><div className="field"><label>Format</label><select value={offerFormat} onChange={e=>setOfferFormat(e.target.value)}><option value="distance">À distance</option><option value="site">Sur site</option><option value="mixte">Mixte</option></select></div></div><RichEditor label="Description de l offre" value={offerDescription} onChange={setOfferDescription}/><div className="field"><label>Tarif indicatif (€), facultatif</label><input type="number" min="0" step="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)}/></div><button className="btn">Publier l'offre</button></form></div>}<div style={{marginTop:18}}><OffreImages offers={offers.filter(o=>o.prestataire_id===provider.id)} onChanged={()=>void reload()}/></div><div className="panel" style={{marginTop:18}}><h3>Demandes de mise en relation ({relations.length})</h3>{relations.map(r=><div className="item" key={r.id}><div><b>Un incubé demande à découvrir votre identité</b><p>La révélation est volontaire et gratuite, même en Free.</p></div><div className="actions"><button className="btn" onClick={()=>void run(async()=>{const {error:e}=await db().rpc('repondre_mise_en_relation',{p_relation_id:r.id,p_accepter:true});if(e)throw e})}>Accepter</button><button className="btn ghost" onClick={()=>void run(async()=>{const {error:e}=await db().rpc('repondre_mise_en_relation',{p_relation_id:r.id,p_accepter:false});if(e)throw e})}>Refuser</button></div></div>)}{!relations.length&&<p>Aucune demande en attente.</p>}</div><div className="panel" style={{marginTop:18}}><h3>Mes candidatures ({ownApplications.length})</h3>{ownApplications.map(a=><p key={a.id}>{a.statut} · {needs.find(n=>n.id===a.projet_id)?.titre||'Besoin'}</p>)}</div></>}</>}
 {tab==='mes-besoins'&&profile.role==='incube'&&<><h1>Mes demandes</h1><p className="sub">Publiez vos besoins et étudiez les propositions reçues.</p><div className="panel"><h3>Publier un besoin ouvert</h3><form onSubmit={addNeed}><div className="field"><label>Titre du besoin</label><input required minLength={8} value={needTitle} onChange={e=>setNeedTitle(e.target.value)}/></div><RichEditor label="Description detaillee du besoin" value={needDescription} onChange={setNeedDescription}/><div className="field"><label>Budget indicatif (€), facultatif</label><input type="number" step="0.01" min="0" value={needBudget} onChange={e=>setNeedBudget(e.target.value)}/></div><button className="btn">Publier le besoin</button></form></div><h2>Mes besoins publiés</h2><div className="list">{myNeeds.map(n=><div className="panel" key={n.id}><h3>{n.titre}</h3><RichContent html={n.description_html||n.description}/><div className="tag">Candidatures reçues : {candidates.filter(c=>c.projet_id===n.id).length}</div>{candidates.filter(c=>c.projet_id===n.id).map(c=><div className="item" key={c.id} style={{marginTop:12}}><div><h3>{c.prestataire_nom||c.alias}</h3><p>{c.message}</p><span className="pill">{c.statut}</span>{c.mise_en_relation&&<span className="pill">Relation : {c.mise_en_relation}</span>}</div>{!c.identite_revelee&& !c.mise_en_relation&&<button className="btn" onClick={()=>void run(async()=>{const {error:e}=await db().rpc('demander_mise_en_relation',{p_candidature_id:c.id});if(e)throw e})}>Demander la mise en relation</button>}</div>)}</div>)}{!myNeeds.length&&<div className="empty">Publiez votre premier besoin pour recevoir des réponses.</div>}</div></>}
 {tab==='admin'&&profile.role==='admin'&&<><h1>Administration</h1><AdminUtilisateurs/><AdminEntreprises/><p className="sub">Contrôle des prestataires et activation des comptes incubés.</p><div className="panel"><h3>Activer un utilisateur existant</h3><p>Pour inviter une personne, créez d’abord son compte via Supabase Auth (Invite user). Attribuez ensuite le rôle incubé avec ce formulaire.</p><form onSubmit={adminAction}><div className="fields"><div className="field"><label>Email existant</label><input required type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)}/></div><div className="field"><label>Rôle à attribuer</label><select value={adminRole} onChange={e=>setAdminRole(e.target.value as 'incube'|'prestataire')}><option value="incube">Incubé</option><option value="prestataire">Prestataire</option></select></div></div><button className="btn">Appliquer le rôle</button></form></div><div className="panel" style={{marginTop:18}}><h3>Prestataires en validation</h3><AdminProviders onDone={()=>void reload()}/></div></>}
 {tab==='entreprise'&&<><div className="page-head"><div><span className="section-eyebrow">Votre espace professionnel</span><h1>Entreprise et collaborateurs</h1><p className="sub">Une entreprise, plusieurs utilisateurs, des competences et une presence dans l annuaire.</p></div></div>
 <EntrepriseEtProfil role={profile.role} userId={user.id} defaultName={profile.nom||'Utilisateur'} onChanged={()=>void reload()}/></>}
 {tab==='dossiers'&&(profile.role==='prestataire'||profile.role==='incube')&&<><WorkspaceCommercialV07 userId={user.id}/></>}
 {tab==='modules'&&<><h1>Services & rendez-vous</h1><p className="sub">Avantages incubés, disponibilités, réservations, notifications et indicateurs.</p><ModulesV03 role={profile.role} providerId={provider?.id} userId={user.id} offers={offers.map(o=>({id:o.id,titre:o.titre,prestataire_id:o.prestataire_id}))}/></>}
 {tab==='intermediation'&&<><h1>Intermédiation & messages</h1><p className="sub">Matching, relations acceptées, conversations et suivi commercial.</p><IntermediationV04 role={profile.role} providerId={provider?.id} userId={user.id}/></>}
 {tab==='compte'&&<><h1>Mon compte</h1><p className="sub">Gérez votre identité et votre accès.</p><div className="panel"><form onSubmit={saveName}><div className="field"><label>Nom d'affichage</label><input required value={name} onChange={e=>setName(e.target.value)}/></div><p className="textsmall">Email : {user.email} · Rôle : {profile.role}</p><button className="btn">Enregistrer</button></form><div className="actions"><button className="btn ghost" onClick={()=>void run(async()=>{const {error:e}=await db().auth.signOut({scope:'global'});if(e)throw e})}>Déconnecter tous mes appareils</button></div></div></>}
 </section></div>}
 </main><footer className="footer"><div className="shell">EURACONNECT | V0.7 | Dossiers collaboratifs, annuaire entreprises et personnes | Paiements Stripe non disponibles</div></footer></>;
}
function AdminProviders({onDone}:{onDone:()=>void}){const [items,setItems]=useState<Provider[]>([]),[error,setError]=useState('');useEffect(()=>{void db().from('prestataires').select('id,nom_public,description,statut,proprietaire_id').eq('statut','en_validation').then(({data,error})=>{if(error)setError(error.message);setItems((data||[]) as Provider[])})},[]);return <div className="list">{error&&<div className="alert">{error}</div>}{items.map(p=><div className="item" key={p.id}><div><h3>{p.nom_public}</h3><p>{p.description}</p></div><button className="btn" onClick={async()=>{const {error:e}=await db().rpc('admin_valider_prestataire',{p_prestataire_id:p.id});if(e)setError(e.message);else{setItems(x=>x.filter(v=>v.id!==p.id));onDone()}}}>Valider</button></div>)}{items.length===0&&<p>Aucun prestataire en attente.</p>}</div>}

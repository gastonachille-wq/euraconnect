from pathlib import Path
r=Path('/mnt/data/euraconnect_v085')
p=r/'components/v06/AnnuaireV06.tsx'
s=p.read_text();s=s.replace("const [favorites,setFavorites]=useState<string[]>([])","const [favorites,setFavorites]=useState<string[]>([])")
s=s.replace("async function loadFavorites(){const r=await db().from('favoris_ec').select('cible_type,cible_id');if(!r.error)setFavorites((r.data||[]).map(x=>`${x.cible_type}:${x.cible_id}`));}","""async function loadFavorites(){const {data:{user},error:authError}=await db().auth.getUser();if(authError||!user){setFeedback('Connectez-vous pour utiliser les favoris.');return;}
  const r=await db().from('favoris_ec').select('cible_type,cible_id').eq('utilisateur_id',user.id);
  if(r.error)setFeedback(r.error.message);else setFavorites((r.data||[]).map(x=>`${x.cible_type}:${x.cible_id}`));}""")
s=s.replace("try{const c=db();const has=favorites.includes(key);const q=has?c.from('favoris_ec').delete().eq('cible_type',item.nature).eq('cible_id',item.id):c.from('favoris_ec').insert({cible_type:item.nature,cible_id:item.id});const r=await q;if(r.error)throw r.error;await loadFavorites();setFeedback(has?'Retiré des favoris.':'Ajouté aux favoris.');}","""try{const c=db();const {data:{user},error:authError}=await c.auth.getUser();if(authError)throw authError;if(!user)throw new Error('Session expirée. Reconnectez-vous.');
   const has=favorites.includes(key);const q=has?c.from('favoris_ec').delete().eq('utilisateur_id',user.id).eq('cible_type',item.nature).eq('cible_id',item.id):
   c.from('favoris_ec').upsert({utilisateur_id:user.id,cible_type:item.nature,cible_id:item.id},{onConflict:'utilisateur_id,cible_type,cible_id'});
   const r=await q;if(r.error)throw r.error;setFavorites(xs=>has?xs.filter(x=>x!==key):[...xs,key]);setFeedback(has?'Retiré des favoris.':'Ajouté aux favoris.');}""")
s=s.replace("const [page,setPage]=useState(0)","const [onlyFavorites,setOnlyFavorites]=useState(false),[page,setPage]=useState(0)")
s=s.replace("const total=items[0]?.nb_total||0;", "const total=items[0]?.nb_total||0;const displayed=onlyFavorites?items.filter(item=>favorites.includes(`${item.nature}:${item.id}`)):items;")
s=s.replace('<div className="results-header"><div>', '<div className="results-header"><div>')
s=s.replace("{(query||skill||kind!=='tous')&&", "<button type=\"button\" className={`btn ghost small ${onlyFavorites?'active':''}`} aria-pressed={onlyFavorites} onClick={()=>setOnlyFavorites(x=>!x)}><Heart size={15} fill={onlyFavorites?'currentColor':'none'}/> {onlyFavorites?'Afficher tout':'Mes favoris'}</button>{(query||skill||kind!=='tous')&&")
s=s.replace('items.map(item=><button type="button" className="directory-card"','displayed.map(item=><button type="button" className="directory-card"')
s=s.replace('{!items.length&&<div className="empty directory-empty">','{!displayed.length&&<div className="empty directory-empty">')
s=s.replace('Aucun résultat</h3>',"{onlyFavorites?'Aucun favori sur cette page':'Aucun résultat'}</h3>")
s=s.replace("<div className=\"directory-card-body\"><div className=\"entry-meta\">", "<div className=\"directory-card-body\"><div className=\"entry-meta\">")
p.write_text(s)
p=r/'components/v06/EntrepriseEtProfil.tsx';s=p.read_text();s=s.replace("import {ImageUpload,PublicImage,SkillPicker} from './MediaAndSkills';", "import {ImageUpload,PublicImage,SkillPicker} from './MediaAndSkills';\nimport TagEditor from './TagEditor';")
s=s.replace('<SkillPicker value={entSkills} onChange={setEntSkills}/>', '<SkillPicker value={entSkills} onChange={setEntSkills}/><TagEditor type="entreprise" id={selected}/>')
s=s.replace('<div className="selected-skills">{entSkills.length} competence(s) associee(s)</div>', '<div className="selected-skills">{entSkills.length} competence(s) associee(s)</div><TagEditor type="entreprise" id={selected} editable={false}/>')
s=s.replace('<SkillPicker value={personSkills} onChange={setPersonSkills}/>', '<SkillPicker value={personSkills} onChange={setPersonSkills}/><TagEditor type="personne" id={userId}/>')
p.write_text(s)
p=r/'app/page.tsx';s=p.read_text();s="import TagEditor from '@/components/v06/TagEditor';\n"+s
s=s.replace("<div className=\"panel ec08-offer-images\"><h2>Illustrations de mes offres</h2>","<div className=\"panel ec08-offer-images\"><h2>Illustrations et tags de mes offres</h2>")
s=s.replace('<OffreImages offers={offers.filter(o=>o.prestataire_id===provider.id)} onChanged={()=>void reload(user.id)}/>', '<OffreImages offers={offers.filter(o=>o.prestataire_id===provider.id)} onChanged={()=>void reload(user.id)}/><div className="ec85-offer-tags">{offers.filter(o=>o.prestataire_id===provider.id).map(o=><div key={o.id} className="ec85-offer-row"><b>{o.titre}</b><TagEditor type="offre" id={o.id}/></div>)}</div>')
s=s.replace('"version":"0.8.4"','"version":"0.8.5"')
p.write_text(s)
p=r/'components/v08/DemandesV08.tsx';s=p.read_text();s=s.replace("import {SkillPicker} from '@/components/v06/MediaAndSkills';", "import {SkillPicker} from '@/components/v06/MediaAndSkills';\nimport TagEditor from '@/components/v06/TagEditor';")
# add editor to owned needs cards by locating display
idx=s.find('mine.map(')
print('mine.map position',idx)
if idx>=0:
 print(s[idx:idx+1100])
p.write_text(s)
p=r/'package.json';s=p.read_text().replace('"version": "0.8.4"','"version": "0.8.5"');p.write_text(s)

'use client';
import {useState} from 'react';
import {ImageUpload,PublicImage} from './MediaAndSkills';
import {db} from '@/lib/supabase';
type Offer={id:string;titre:string;image_path?:string|null};
export default function OffreImages({offers,onChanged}:{offers:Offer[];onChanged:()=>void}){
 const [image,setImage]=useState<Record<string,string>>({});const [error,setError]=useState(''),[notice,setNotice]=useState('');
 async function save(o:Offer){setError('');setNotice('');const path=image[o.id];if(!path)return;
  const {error:e}=await db().rpc('ec_image_offre',{p_offre:o.id,p_image_path:path});
  if(e)setError(e.message);else{setNotice('Image de l offre enregistree.');onChanged();}}
 return <div className="panel"><div className="section-heading"><div><span className="section-eyebrow">Vitrine</span><h3>Images de mes offres</h3></div></div>
  <p className="muted">Valorisez vos prestations avec un visuel public. Vous pouvez importer une image par offre.</p>
  {error&&<div className="alert" role="alert">{error}</div>}{notice&&<div className="alert ok" role="status">{notice}</div>}
  <div className="list">{offers.map(o=><div className="offer-image-editor" key={o.id}><div className="offer-image-mini"><PublicImage path={o.image_path} alt={o.titre} variant="cover"/></div>
    <div><b>{o.titre}</b><ImageUpload folder="offres" id={o.id} current={o.image_path||null} onUploaded={path=>setImage(x=>({...x,[o.id]:path}))} label="Importer une image"/>
     <button className="btn small" disabled={!image[o.id]} onClick={()=>void save(o)}>Enregistrer le visuel</button></div></div>)}
   {!offers.length&&<p className="muted">Publiez votre premiere offre avant d ajouter une image.</p>}</div></div>;
}

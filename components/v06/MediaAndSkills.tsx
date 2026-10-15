'use client';
import {useEffect,useState,type ChangeEvent} from 'react';
import {db} from '@/lib/supabase';
import {Camera,Check,Search,UploadCloud,X} from 'lucide-react';

export type Skill={id:string;libelle:string};
export function SkillPicker({value,onChange,limit=20,label='Compétences et savoir-faire'}:{value:string[];onChange:(v:string[])=>void;limit?:number;label?:string}){
 const [items,setItems]=useState<Skill[]>([]),[q,setQ]=useState(''),[error,setError]=useState('');
 useEffect(()=>{void db().from('competences_ec').select('id,libelle').eq('actif',true).order('libelle').limit(300)
  .then(({data,error})=>{if(error)setError(error.message);else setItems((data||[]) as Skill[]);});},[]);
 const filtered=items.filter(s=>s.libelle.toLocaleLowerCase('fr').includes(q.toLocaleLowerCase('fr')));
 function toggle(id:string){if(value.includes(id))onChange(value.filter(x=>x!==id));else if(value.length<limit)onChange([...value,id]);}
 return <div className="field skill-field"><label>{label} <span className="muted">({value.length}/{limit})</span></label>
  <div className="selected-skills">{value.map(id=>{const skill=items.find(s=>s.id===id);return <button type="button" className="skill-tag active" key={id} onClick={()=>toggle(id)} title="Retirer cette compétence">{skill?.libelle||'Compétence'} <X size={13}/></button>;})}</div>
  <div className="skill-search"><Search size={16}/><input aria-label="Rechercher une compétence" placeholder="Rechercher une compétence..." value={q} onChange={e=>setQ(e.target.value)}/></div>
  <div className="skill-options" role="group" aria-label={label}>{filtered.slice(0,40).map(s=><button type="button" key={s.id} className={`skill-option ${value.includes(s.id)?'chosen':''}`} aria-pressed={value.includes(s.id)} disabled={!value.includes(s.id)&&value.length>=limit} onClick={()=>toggle(s.id)}>{value.includes(s.id)?<Check size={15}/>:<span className="skill-dot"/>}{s.libelle}</button>)}
   {!filtered.length&&<span className="muted">Aucune compétence correspondante.</span>}</div>
  {error&&<p role="alert" className="field-error">{error}</p>}
 </div>;
}

type ImageVariant='logo'|'avatar'|'cover';
const sizes:Record<ImageVariant,{width:number;height:number;mode:'contain'|'cover'}>={
 logo:{width:640,height:440,mode:'contain'},
 avatar:{width:512,height:512,mode:'cover'},
 cover:{width:1200,height:675,mode:'cover'}
};
async function normalizeImage(file:File,variant:ImageVariant):Promise<Blob>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Format autorisé : PNG, JPG ou WebP.');
 if(file.size>8*1024*1024)throw new Error('Image source limitée à 8 Mo.');
 const objUrl=URL.createObjectURL(file);
 try{
  const image=new Image();image.decoding='async';image.src=objUrl;await image.decode();
  const canvas=document.createElement('canvas');const spec=sizes[variant];canvas.width=spec.width;canvas.height=spec.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Impossible de préparer l’image sur ce navigateur.');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const factor=spec.mode==='cover'?Math.max(spec.width/image.naturalWidth,spec.height/image.naturalHeight):
   Math.min((spec.width-48)/image.naturalWidth,(spec.height-48)/image.naturalHeight);
  const w=image.naturalWidth*factor,h=image.naturalHeight*factor;
  ctx.drawImage(image,(spec.width-w)/2,(spec.height-h)/2,w,h);
  for(const quality of [0.88,0.76,0.62,0.5]){
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));
   if(blob&&blob.size<=2*1024*1024)return blob;
  }
  throw new Error('Image trop lourde après compression. Essayez une image plus petite.');
 }finally{URL.revokeObjectURL(objUrl);}
}

export function ImageUpload({folder,id,current,onUploaded,label='Ajouter une image'}:{folder:'entreprises'|'personnes'|'offres';id:string;current:string|null;onUploaded:(path:string)=>void;label?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState('');
 const variant:ImageVariant=folder==='entreprises'?'logo':folder==='personnes'?'avatar':'cover';
 useEffect(()=>{setPreview(current?db().storage.from('euraconnect-media').getPublicUrl(current).data.publicUrl:'');},[current]);
 async function choose(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;setError('');setBusy(true);
  try{
   const processed=await normalizeImage(file,variant);
   const path=`${folder}/${id}/${crypto.randomUUID()}.webp`;
   const {error:uploadError}=await db().storage.from('euraconnect-media').upload(path,processed,{upsert:false,contentType:'image/webp'});
   if(uploadError)throw uploadError;
   setPreview(db().storage.from('euraconnect-media').getPublicUrl(path).data.publicUrl);onUploaded(path);
  }catch(ex){setError(ex instanceof Error?ex.message:String(ex));}
  finally{setBusy(false);e.target.value='';}
 }
 return <div className={`image-picker ec08-picker ec08-picker-${variant}`}>
  <div className={`image-frame ec08-media ec08-media-${variant}`}>{preview?<img src={preview} alt="Aperçu du visuel"/>:<Camera size={26}/>}</div>
  <div><label className="btn ghost image-choose"><UploadCloud size={16}/>{busy?'Optimisation de l’image…':label}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose} disabled={busy} className="visually-hidden"/></label>
   <p className="field-hint">Redimensionnement automatique {sizes[variant].width} × {sizes[variant].height}, WebP ≤ 2 Mo. {variant==='logo'?'Logo entièrement visible.':variant==='avatar'?'Photo cadrée au centre.':'Format panoramique.'}</p>
   <p className="field-hint">Attention : les images du stockage actuel sont publiques via URL.</p>
   {error&&<p role="alert" className="field-error">{error}</p>}
   {!error&&preview&&<p className="field-hint">Visuel prêt. Enregistrez la fiche pour l’associer.</p>}
  </div></div>;
}
export function PublicImage({path,alt,className='',variant='avatar'}:{path:string|null|undefined;alt:string;className?:string;variant?:ImageVariant}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[path]);
 const css=`ec08-image ec08-image-${variant} ${className}`;
 if(!path||failed)return <span className={`ec08-image-fallback ec08-image-${variant} ${className}`} aria-label={alt}>{alt.trim().slice(0,2).toLocaleUpperCase('fr')}</span>;
 const url=db().storage.from('euraconnect-media').getPublicUrl(path).data.publicUrl;
 return <img className={css} src={url} alt={alt} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>;
}

'use client';
import {useEffect,useState,type ChangeEvent} from 'react';
import {db} from '@/lib/supabase';
import {Camera,Check,Search,X} from 'lucide-react';
export type Skill={id:string;libelle:string};
export function SkillPicker({value,onChange,limit=20,label='Compétences et savoir-faire'}:{value:string[];onChange:(v:string[])=>void;limit?:number;label?:string}){
 const [items,setItems]=useState<Skill[]>([]),[q,setQ]=useState(''),[error,setError]=useState('');
 useEffect(()=>{db().from('competences_ec').select('id,libelle').eq('actif',true).order('libelle').limit(300)
  .then(({data,error})=>{if(error)setError(error.message);else setItems((data||[]) as Skill[]);});},[]);
 const filtered=items.filter(s=>s.libelle.toLocaleLowerCase('fr').includes(q.toLocaleLowerCase('fr')));
 const toggle=(id:string)=>{if(value.includes(id))onChange(value.filter(x=>x!==id));else if(value.length<limit)onChange([...value,id]);};
 return <div className="field skill-field"><label>{label} <span className="muted">({value.length}/{limit})</span></label>
  <div className="selected-skills">{value.map(id=>{const skill=items.find(s=>s.id===id);return <button type="button" className="skill-tag active" key={id}
    onClick={()=>toggle(id)} title="Retirer cette compétence">{skill?.libelle||'Competence'} <X size={13}/></button>;})}</div>
  <div className="skill-search"><Search size={16}/><input aria-label="Rechercher une compétence" placeholder="Rechercher une compétence..." value={q} onChange={e=>setQ(e.target.value)}/></div>
  <div className="skill-options" role="group" aria-label={label}>{filtered.slice(0,45).map(s=><button
   type="button" key={s.id} className={`skill-option ${value.includes(s.id)?'chosen':''}`}
   aria-pressed={value.includes(s.id)} disabled={!value.includes(s.id)&&value.length>=limit}
   onClick={()=>toggle(s.id)}>{value.includes(s.id)?<Check size={15}/>:<span className="skill-dot"/>}{s.libelle}</button>)}
   {!filtered.length&&<span className="muted">Aucune compétence correspondante.</span>}
  </div>{error&&<p role="alert" className="field-error">{error}</p>}
 </div>;
}

export function ImageUpload({folder,id,current,onUploaded,label='Ajouter une image'}:{folder:'entreprises'|'personnes'|'offres';id:string;current:string|null;onUploaded:(path:string)=>void;label?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [preview,setPreview]=useState('');
 useEffect(()=>{setPreview(current?db().storage.from('euraconnect-media').getPublicUrl(current).data.publicUrl:'');},[current]);
 async function choose(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;setError('');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Format autorise : PNG, JPG, WEBP.');return;}
  if(file.size>2*1024*1024){setError('L image doit peser moins de 2 Mo.');return;}
  const suffix=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const path=`${folder}/${id}/${crypto.randomUUID()}.${suffix}`;
  setBusy(true);
  try{const {error:uploadError}=await db().storage.from('euraconnect-media').upload(path,file,{upsert:false,contentType:file.type});
   if(uploadError)throw uploadError;
   setPreview(db().storage.from('euraconnect-media').getPublicUrl(path).data.publicUrl);
   onUploaded(path);
  }catch(ex){setError(ex instanceof Error?ex.message:String(ex));}finally{setBusy(false);e.target.value='';}
 }
 return <div className="image-picker"><div className="image-frame">{preview?<img src={preview} alt="Aperçu de l image"/>:<Camera size={28}/>}</div>
  <div><label className="btn ghost image-choose">{busy?'Téléversement...':label}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose} disabled={busy} className="visually-hidden"/></label>
   <p className="field-hint">PNG, JPG ou WEBP, maximum 2 Mo. Image publique uniquement.</p>
   {error&&<p className="field-error" role="alert">{error}</p>}
   {!error&&preview&&<p className="field-hint">Image téléversée. Enregistrez la fiche pour l associer.</p>}
  </div></div>;
}
export function PublicImage({path,alt,className=''}:{path:string|null|undefined;alt:string;className?:string}){
 if(!path)return <div className={`avatar-placeholder ${className}`}>{alt.slice(0,2).toLocaleUpperCase('fr')}</div>;
 const url=db().storage.from('euraconnect-media').getPublicUrl(path).data.publicUrl;
 return <img className={className} src={url} alt={alt} loading="lazy"/>;
}

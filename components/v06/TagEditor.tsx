'use client';
import {useEffect,useMemo,useState} from 'react';
import {Check,Plus,Search,Tag,X} from 'lucide-react';
import {db} from '@/lib/supabase';
type TagItem={id:string;libelle:string;cle:string};
type Kind='entreprise'|'personne'|'offre'|'besoin';
function norm(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
export default function TagEditor({type,id,editable=true}:{type:Kind;id:string;editable?:boolean}){
 const [all,setAll]=useState<TagItem[]>([]),[selected,setSelected]=useState<string[]>([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 useEffect(()=>{let active=true;setSelected([]);setError('');void Promise.all([
  db().from('tags_ec').select('id,libelle,cle').order('libelle').limit(1000),
  db().from('tags_liens_ec').select('tag_id').eq('cible_type',type).eq('cible_id',id)
 ]).then(([a,b])=>{if(!active)return;if(a.error||b.error){setError(a.error?.message||b.error?.message||'Erreur de chargement');return;}
 setAll((a.data||[]) as TagItem[]);setSelected((b.data||[]).map(x=>x.tag_id));});return()=>{active=false};},[type,id]);
 const matches=useMemo(()=>{const n=norm(input);if(!n)return [];
  return all.filter(t=>norm(t.libelle).includes(n)||n.includes(norm(t.libelle))).sort((a,b)=>Number(norm(a.libelle)===n)-Number(norm(b.libelle)===n)).reverse().slice(0,8);
 },[all,input]);
 const exact=all.some(t=>norm(t.libelle)===norm(input));
 async function persist(ids:string[]){const r=await db().rpc('ec085_definir_tags',{p_type:type,p_id:id,p_tags:ids});if(r.error)throw r.error;setSelected(ids);setInfo('Tags enregistrés.');}
 async function toggle(tag:TagItem){if(busy)return;setBusy(true);setError('');setInfo('');try{const ids=selected.includes(tag.id)?selected.filter(x=>x!==tag.id):[...selected,tag.id];if(ids.length>20)throw Error('20 tags maximum.');await persist(ids);setInput('');}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 async function create(){if(busy||!editable)return;setBusy(true);setError('');setInfo('');try{const value=input.trim();if(value.length<2)throw Error('Saisissez au moins 2 caractères.');
 const found=all.find(t=>norm(t.libelle)===norm(value));if(found){if(!selected.includes(found.id))await persist([...selected,found.id]);setInput('');return;}
 const r=await db().rpc('ec085_creer_tag',{p_libelle:value});if(r.error)throw r.error;const item=r.data as TagItem;setAll(xs=>xs.some(x=>x.id===item.id)?xs:[...xs,item]);await persist([...selected,item.id]);setInput('');
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <div className="ec85-tags"><div className="ec85-tags-heading"><Tag size={16}/><b>Tags & catégories</b><span className="muted">{selected.length}/20</span></div>
 <div className="ec85-tag-chips">{selected.map(id=>{const t=all.find(x=>x.id===id);return <button type="button" key={id} className="ec85-chip" disabled={busy||!editable} onClick={()=>void toggle(t!)}>{t?.libelle||'Tag'}{editable&&<X size={12}/>}</button>;})}{selected.length===0&&<span className="muted">Aucun tag associé.</span>}</div>
 {editable&&<><div className="ec85-tag-search"><Search size={16}/><input aria-label="Rechercher ou créer un tag" placeholder="Ex. Intelligence artificielle, Biotech…" value={input} maxLength={60} onChange={e=>setInput(e.target.value)} disabled={busy}/></div>
 {input.trim().length>0&&<div className="ec85-suggestions" role="group" aria-label="Suggestions de tags">{matches.map(t=><button type="button" key={t.id} disabled={busy} onClick={()=>void toggle(t)}><span>{t.libelle}</span>{selected.includes(t.id)?<Check size={15}/>:<Plus size={15}/>}</button>)}
 {!exact&&norm(input).length>=2&&<button type="button" className="ec85-create" disabled={busy||selected.length>=20} onClick={()=>void create()}><Plus size={15}/> Créer « {input.trim()} »</button>}</div>}
 <small className="muted">Recherchez d’abord un tag existant. Les majuscules, accents et espaces ne créent pas de doublons.</small></>}
 {error&&<p role="alert" className="field-error">{error}</p>}{info&&<p role="status" className="ec85-ok">{info}</p>}
 </div>;
}

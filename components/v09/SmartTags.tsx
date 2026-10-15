'use client';
import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {Check,LoaderCircle,Plus,Search,Tags,X} from 'lucide-react';
import {db} from '@/lib/supabase';

export type Term={id:string;libelle:string};
type Suggestion=Term&{score:number};
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9+#]/g,'');

/** Un seul catalogue pour competences et mots-cles, avec creations dedoublonnees cote SQL. */
export function SmartTagPicker({value,onChange,label='Tags et mots-clés',limit=15,hint}:{value:string[];onChange:(v:string[])=>void;label?:string;limit?:number;hint?:string}){
 const [termMap,setTermMap]=useState<Record<string,string>>({});
 const [q,setQ]=useState(''),[suggestions,setSuggestions]=useState<Suggestion[]>([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const req=useRef(0);
 const valueKey=value.join(',');
 useEffect(()=>{if(!value.length)return;let active=true;
  void db().from('competences_ec').select('id,libelle').in('id',value).then(({data,error:e})=>{
    if(active&&!e)setTermMap(old=>({...old,...Object.fromEntries((data||[]).map(t=>[t.id,t.libelle]))}));
  });return()=>{active=false;};},[valueKey]);
 useEffect(()=>{const id=++req.current;setError('');if(!q.trim()){
    setSuggestions([]);setLoading(false);return;
  }
  setLoading(true);const timer=setTimeout(()=>{void db().rpc('ec09_suggerer_termes',{p_recherche:q.trim(),p_limite:12})
    .then(({data,error:e})=>{if(id!==req.current)return;if(e)setError(e.message);
     else {const list=(data||[]) as Suggestion[];setSuggestions(list);
      setTermMap(old=>({...old,...Object.fromEntries(list.map(t=>[t.id,t.libelle]))}));}
    }).finally(()=>{if(id===req.current)setLoading(false);});},220);
  return()=>clearTimeout(timer);
 },[q]);
 function toggle(t:Term){setError('');setNotice('');setTermMap(old=>({...old,[t.id]:t.libelle}));
  if(value.includes(t.id))onChange(value.filter(x=>x!==t.id));
  else if(value.length<limit){onChange([...value,t.id]);setQ('');}
  else setError(`Maximum ${limit} éléments.`);
 }
 async function create(){const texte=q.trim();if(texte.length<2||busy||value.length>=limit)return;
  setBusy(true);setError('');setNotice('');try{
   const exact=suggestions.find(s=>norm(s.libelle)===norm(texte));
   if(exact){toggle(exact);return;}
   const close=suggestions.find(s=>Number(s.score)>=0.68);
   const confirmer=Boolean(close);
   if(confirmer&&!window.confirm(`Le terme « ${close!.libelle} » existe déjà et semble proche.\n\nAnnuler pour utiliser le terme existant, ou OK pour créer « ${texte} » malgré cette suggestion.`))return;
   const r=await db().rpc('ec09_creer_terme',{p_libelle:texte,p_forcer:confirmer});
   if(r.error)throw r.error;
   const term=r.data as {id:string;libelle:string;cree:boolean};
   setTermMap(old=>({...old,[term.id]:term.libelle}));
   if(!value.includes(term.id))onChange([...value,term.id]);
   setQ('');setSuggestions([]);setNotice(term.cree?'Nouveau tag ajouté au référentiel.':'Terme existant réutilisé : aucun doublon créé.');
  }catch(e){setError(message(e));}finally{setBusy(false);}
 }
 function keyDown(e:KeyboardEvent<HTMLInputElement>){if(e.key==='Enter'){e.preventDefault();
   const exact=suggestions.find(s=>norm(s.libelle)===norm(q));
   if(exact)toggle(exact);else void create();}}
 const exact=suggestions.find(s=>norm(s.libelle)===norm(q));
 const more=value.filter(id=>!termMap[id]).length;
 return <div className="ec09-picker" data-testid="smart-tags">
  <div className="ec09-tag-heading"><label><Tags size={16}/> {label}</label><span className="muted">{value.length} / {limit}</span></div>
  {hint&&<p className="field-hint">{hint}</p>}
  <div className="ec09-selected" aria-label="Tags sélectionnés">{value.map(id=><button key={id} type="button" className="ec09-chip" onClick={()=>toggle({id,libelle:termMap[id]||'Tag'})} title="Retirer le tag">{termMap[id]||'Chargement…'} <X size={13}/></button>)}
   {!value.length&&<span className="ec09-empty">Aucun tag sélectionné.</span>}</div>
  {more>0&&<span className="field-hint">Chargement de {more} libellé(s)…</span>}
  <div className="ec09-searchbar"><Search size={17}/><input value={q} maxLength={60} disabled={busy} onChange={e=>setQ(e.target.value)} onKeyDown={keyDown} aria-label={`Rechercher ou créer : ${label}`} placeholder="Tapez un mot-clé ou une expertise…" autoComplete="off"/>
   {loading&&<LoaderCircle className="ec09-spin" size={15}/>}</div>
  {q.trim().length>0&&<div className="ec09-suggestions" role="group" aria-label="Termes suggérés">
   {suggestions.map(t=><button key={t.id} type="button" disabled={busy||(!value.includes(t.id)&&value.length>=limit)}
    onClick={()=>toggle(t)} className="ec09-suggestion"><span>{t.libelle}</span><small>{value.includes(t.id)?'Déjà sélectionné':Number(t.score)>=0.8?'Correspondance proche':'Réutiliser'}</small>{value.includes(t.id)?<Check size={16}/>:<Plus size={16}/>}</button>)}
   {!loading&&!suggestions.length&&<p className="ec09-no-match">Aucun terme similaire : vous pouvez proposer ce nouveau tag.</p>}
   {q.trim().length>=2&&<button type="button" className="ec09-create" disabled={busy||value.length>=limit}
    onClick={()=>exact?toggle(exact):void create()}>
    {busy?<LoaderCircle className="ec09-spin" size={16}/>:exact?<Check size={16}/>:<Plus size={16}/>}
    {exact?`Utiliser « ${exact.libelle} »`:`Créer « ${q.trim()} »`}</button>}
  </div>}
  {!q&&<p className="ec09-help">Commencez à écrire : le système propose les catégories existantes, corrige les variantes avec ou sans accents et signale les termes proches.</p>}
  {error&&<p className="field-error" role="alert">{error}</p>}{notice&&<p className="ec09-feedback" role="status">{notice}</p>}
 </div>;
}

export type TagTarget='entreprise'|'personne'|'offre'|'besoin';
/** Gestion autonome pour les fiches deja creees ; l'enregistrement porte uniquement sur cette cible. */
export function TagAssignmentEditor({type,id,heading='Tags associés',description}:{type:TagTarget;id:string;heading?:string;description?:string}){
 const [selected,setSelected]=useState<string[]>([]),[initial,setInitial]=useState<string[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[done,setDone]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');setSelected([]);
  void db().rpc('ec09_lire_tags',{p_type:type,p_id:id}).then(({data,error:e})=>{
   if(!active)return;if(e)setError(e.message);else{
    const ids=((data||[]) as Term[]).map(t=>t.id);setSelected(ids);setInitial(ids);
   }setLoading(false);
  });return()=>{active=false;};},[type,id]);
 const modified=selected.slice().sort().join('|')!==initial.slice().sort().join('|');
 async function save(){setError('');setDone('');setSaving(true);try{
  const r=await db().rpc('ec09_definir_tags',{p_type:type,p_id:id,p_competences:selected});
  if(r.error)throw r.error;
  setInitial([...selected]);setDone('Tags enregistrés et immédiatement disponibles dans le référentiel.');
 }catch(e){setError(message(e));}finally{setSaving(false);}}
 return <div className="ec09-assignment"><div className="ec09-assignment-head"><h3>{heading}</h3>{description&&<p className="muted">{description}</p>}</div>
  {loading?<p className="muted">Chargement des tags…</p>:<><SmartTagPicker value={selected} onChange={v=>{setSelected(v);setDone('');}}/>
   <div className="ec09-actions"><button type="button" className="btn small" disabled={!modified||saving} onClick={()=>void save()}>{saving?'Enregistrement…':'Enregistrer les tags'}</button>
   {modified&&<span className="muted">Modifications non enregistrées</span>}</div></>}
  {error&&<p role="alert" className="field-error">{error}</p>}{done&&<p role="status" className="ec09-feedback">{done}</p>}
 </div>;
}

'use client';
import {useEffect,useMemo,useState} from 'react';
import {Plus,Search,X} from 'lucide-react';
import {db} from '@/lib/supabase';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export default function NeedTagPicker({value,onChange,label}:{value:string[];onChange:(v:string[])=>void;label:string}){
 const [all,setAll]=useState<string[]>([]),[q,setQ]=useState(''),[error,setError]=useState('');
 useEffect(()=>{void db().from('tags_ec').select('libelle').order('libelle').limit(1000).then(r=>{if(r.error)setError(r.error.message);else setAll((r.data||[]).map(t=>t.libelle));});},[]);
 const suggestions=useMemo(()=>all.filter(t=>normalize(t).includes(normalize(q))&&!value.some(x=>normalize(x)===normalize(t))).slice(0,8),[all,q,value]);
 const matching=all.find(t=>normalize(t)===normalize(q));
 function add(t:string){if(value.length>=15)return;const found=value.some(x=>normalize(x)===normalize(t));if(!found)onChange([...value,t.trim()]);setQ('');}
 return <div className="field ec86-tag-picker"><label>{label} ({value.length}/15)</label><div className="ec86-tag-chips">{value.map(t=><button className="ec85-chip" type="button" key={t} onClick={()=>onChange(value.filter(x=>x!==t))}>{t}<X size={13}/></button>)}</div><div className="skill-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher ou saisir votre compétence…" maxLength={60} onKeyDown={e=>{if(e.key==='Enter'&&q.trim().length>=2){e.preventDefault();add(matching||q);}}}/></div>{q.trim()&&<div className="ec85-suggestions">{suggestions.map(t=><button key={t} type="button" onClick={()=>add(t)}><Plus size={14}/> {t}</button>)}{!matching&&q.trim().length>=2&&<button type="button" className="ec85-create" onClick={()=>add(q)}><Plus size={14}/> Créer « {q.trim()} »</button>}</div>}{error&&<small role="alert" className="field-error">{error}</small>}<small className="muted">Les termes déjà présents sont suggérés et les nouveaux tags sont enregistrés à la publication du besoin.</small></div>;
}

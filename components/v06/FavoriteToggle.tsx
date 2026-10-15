'use client';
import {useEffect,useState} from 'react';
import {Heart,Bookmark} from 'lucide-react';
import {db} from '@/lib/supabase';
type Target='entreprise'|'personne'|'besoin';
export function useSavedTargets(type:Target){
 const [ids,setIds]=useState<string[]>([]),[error,setError]=useState('');
 useEffect(()=>{let alive=true;void (async()=>{const r=await db().from('favoris_ec').select('cible_id').eq('cible_type',type);if(!alive)return;if(r.error)setError(r.error.message);else setIds((r.data||[]).map(x=>x.cible_id));})();return()=>{alive=false};},[type]);
 async function toggle(id:string){setError('');const old=ids.includes(id);setIds(v=>old?v.filter(x=>x!==id):[...v,id]);try{const {data:{user},error:auth}=await db().auth.getUser();if(auth||!user)throw auth||new Error('Veuillez vous reconnecter.');const q=old?db().from('favoris_ec').delete().eq('utilisateur_id',user.id).eq('cible_type',type).eq('cible_id',id):db().from('favoris_ec').upsert({utilisateur_id:user.id,cible_type:type,cible_id:id},{onConflict:'utilisateur_id,cible_type,cible_id'});const r=await q;if(r.error)throw r.error;}catch(e){setIds(v=>old?[...v,id]:v.filter(x=>x!==id));setError(e instanceof Error?e.message:(e as {message?:string})?.message||'Impossible de modifier le favori.');}}
 return {ids,toggle,error};
}
export default function FavoriteToggle({active,onClick,type='entreprise',disabled=false}:{active:boolean;onClick:()=>void;type?:'entreprise'|'personne'|'besoin';disabled?:boolean}){
 const Icon=type==='besoin'?Bookmark:Heart;return <button type="button" className={`ec86-favorite ${active?'is-active':''}`} aria-label={active?'Retirer des favoris':'Ajouter aux favoris'} aria-pressed={active} title={active?'Retirer des favoris':'Ajouter aux favoris'} disabled={disabled} onClick={e=>{e.stopPropagation();onClick();}}><Icon size={18} strokeWidth={2.2} fill={active?'currentColor':'none'}/></button>;
}

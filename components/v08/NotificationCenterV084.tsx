'use client';
import {useEffect,useState} from 'react';
import {Bell,Check,CheckCheck} from 'lucide-react';
import {db} from '@/lib/supabase';
type Notice={id:string;titre:string;contenu:string;lu_le:string|null;created_at:string};
export default function NotificationCenterV084({userId}:{userId:string}){
 const [items,setItems]=useState<Notice[]>([]),[open,setOpen]=useState(false),[error,setError]=useState('');
 async function load(){const r=await db().from('notifications_ec').select('id,titre,contenu,lu_le,created_at').eq('destinataire_id',userId).order('created_at',{ascending:false}).limit(40);if(r.error)setError(r.error.message);else setItems((r.data||[]) as Notice[]);}
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),60000);return()=>clearInterval(timer);},[userId]);
 async function mark(id:string){const r=await db().rpc('marquer_notification_lue',{p_id:id});if(r.error)setError(r.error.message);else await load();}
 const unread=items.filter(x=>!x.lu_le).length;
 return <div className="ec84-notif"><button className="ec84-notif-trigger" type="button" aria-label={`Notifications : ${unread} non lues`} aria-expanded={open} onClick={()=>{setOpen(!open);if(!open)void load();}}><Bell size={19}/>{unread>0&&<span className="ec84-notif-count">{unread>99?'99+':unread}</span>}</button>
 {open&&<div className="ec84-notif-panel"><div className="ec84-notif-title"><b>Notifications</b><span>{unread} non lue(s)</span><button onClick={()=>setOpen(false)} aria-label="Fermer">×</button></div>{error&&<p role="alert">{error}</p>}
 {!items.length&&<p className="muted">Aucune notification pour le moment.</p>}
 {items.map(n=><div key={n.id} className={`ec84-notif-item ${!n.lu_le?'unread':''}`}><div><b>{n.titre}</b><p>{n.contenu}</p><small>{new Date(n.created_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}</small></div>{!n.lu_le&&<button onClick={()=>void mark(n.id)} title="Marquer comme lue"><Check size={16}/></button>}</div>)}
 {unread>0&&<button className="ec84-markall" onClick={()=>void Promise.all(items.filter(x=>!x.lu_le).map(x=>mark(x.id)))}><CheckCheck size={15}/> Tout marquer comme lu</button>}</div>}</div>;
}

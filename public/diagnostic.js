// Dedicated read-only healthcheck. Never place session tokens or keys in the copied report.
const out = document.getElementById('out');
const copy = document.getElementById('copy');
let report = '';
function display(label, value, kind='') {
  const row=document.createElement('div'); row.className='row';
  const name=document.createElement('strong');name.textContent=label;
  const text=document.createElement('div');text.className=`value ${kind}`;text.textContent=String(value);
  row.append(name,text);out.append(row);
}
function errorInfo(status,data) {
 const code = typeof data?.code==='string'?data.code:'';
 const message = typeof data?.message==='string'?data.message:`Réponse HTTP ${status}`;
 return {status,code,message:message.slice(0,350)};
}
async function rpc(base,key,token,name,p_action,p_args={}) {
 const response=await fetch(`${base}/rest/v1/rpc/${name}`, {method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${token}`},body:JSON.stringify({p_action,p_args}),signal:AbortSignal.timeout(15000)});
 let data=null;try{data=await response.json();}catch{data={message:'Réponse non JSON'};}
 if(!response.ok)return {ok:false,...errorInfo(response.status,data)};
 return {ok:true,status:response.status,data};
}
async function run() {
 out.replaceChildren();copy.disabled=true;
 const lines=[];
 const add=(label,value,kind='')=>{display(label,value,kind);lines.push(`${label}: ${value}`);};
 const config=window.EC_CONFIG||{};
 add('Version compilée',config.version||'inconnue');
 add('URL du site',location.origin);
 const base=typeof config.supabaseUrl==='string'?config.supabaseUrl.trim().replace(/\/$/,''):'';
 const key=typeof config.supabaseKey==='string'?config.supabaseKey.trim():'';
 let host='';try{host=new URL(base).host;}catch{}
 add('Projet Supabase (hôte uniquement)',host||'ABSENT',host?'ok':'bad');
 add('Clé publique Supabase',key?'présente (valeur masquée)':'ABSENTE',key?'ok':'bad');
 if(!base||!key){add('Conclusion','Configuration absente du build déployé : corriger les variables Netlify puis déclencher un nouveau déploiement.','bad');report=lines.join('\n');copy.disabled=false;return;}
 let session=null;
 try { session=JSON.parse(localStorage.getItem('euraconnect.auth.v1')||'null'); }catch{}
 if(!session?.access_token){add('Session','absente : reconnectez-vous à EURACONNECT puis relancez','bad');report=lines.join('\n');copy.disabled=false;return;}
 add('Session locale','présente (jeton masqué)');
 if(session.expires_at && session.expires_at < Date.now()/1000+30) {
  add('État de session','jeton probablement expiré : rouvrir l’application et se reconnecter','bad');report=lines.join('\n');copy.disabled=false;return;
 }
 try {
   const bootstrap=await rpc(base,key,session.access_token,'ec1_api','bootstrap');
   if(!bootstrap.ok) {
    add('RPC de base ec1_api',`ÉCHEC HTTP ${bootstrap.status} ${bootstrap.code}: ${bootstrap.message}`,'bad');
    add('Conclusion','La connexion générale au backend doit être corrigée avant les recommandations.','bad');
    report=lines.join('\n');copy.disabled=false;return;
   }
   const role=bootstrap.data?.user?.role||'inconnu';
   add('RPC de base ec1_api','OK (HTTP 200)','ok');
   add('Rôle applicatif',role);
   const action=role==='incube'?'mine':'list';
   if(!['incube','startup_manager','admin'].includes(role)){
     add('RPC V20','non testée : le rôle actuel n’utilise pas cette fonctionnalité.');
     report=lines.join('\n');copy.disabled=false;return;
   }
   const v20=await rpc(base,key,session.access_token,'ec20_manager_api',action);
   if(v20.ok) add('RPC recommandations V20','OK (HTTP 200)','ok');
   else add('RPC recommandations V20',`ÉCHEC HTTP ${v20.status} ${v20.code}: ${v20.message}`,'bad');
   if(role==='incube'||role==='startup_manager'){
      const v35=await rpc(base,key,session.access_token,'ec35_advice','list');
      if(v35.ok) add('RPC conseils V3.5','OK (HTTP 200)','ok');
      else add('RPC conseils V3.5',`ÉCHEC HTTP ${v35.status} ${v35.code}: ${v35.message}`,'bad');
   }
   add('Conclusion',v20.ok?'La RPC V20 est joignable. Si le module échoue, examiner son intégration côté interface.':'Rechercher la cause du code HTTP/PostgREST indiqué ci-dessus.',v20.ok?'ok':'bad');
 }catch(error){add('Erreur de communication',String(error?.message||error).slice(0,250),'bad');}
 report=lines.join('\n');copy.disabled=false;
}
copy.addEventListener('click',async()=>{
 try {await navigator.clipboard.writeText(report);copy.textContent='Diagnostic copié';}
 catch {const p=document.createElement('pre');p.textContent=report;out.append(p);copy.textContent='Sélectionnez le rapport ci-dessus';}
});
document.getElementById('retry').addEventListener('click',()=>{copy.textContent='Copier le diagnostic';void run();});
void run();

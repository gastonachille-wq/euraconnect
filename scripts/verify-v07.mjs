import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const paths=[
 'components/v07/WorkspaceCommercialV07.tsx',
 'supabase/migrations/202610140006_collaboration_dossiers.sql',
 'supabase/tests/v07_diagnostics.sql',
 'supabase/tests/v07_smoke_acces.sql',
 'docs/INSTALLATION_V07.md','docs/RECETTE_V07.md','docs/HYPOTHESES_V07.md',
 'README_V07.md','app/page.tsx','app/globals.css'];
for(const file of paths)if(!existsSync(resolve(root,file)))throw new Error(`Missing: ${file}`);
const sql=readFileSync(resolve(root,paths[1]),'utf8');
for(const rpc of ['ec07_droit_entreprise','ec07_droit_conversation','ec07_lister_dossiers',
 'ec07_candidater','ec07_demander_relation','ec07_repondre_relation',
 'ec07_ouvrir_conversation','ec07_envoyer_message','ec07_assigner_dossier',
 'ec07_publier_besoin','ec07_rattacher_besoin'])
 if(!sql.includes(`function public.${rpc}(`))throw new Error(`Missing SQL RPC ${rpc}`);
for(const token of ['enable row level security','revoke all','create policy ec07_messages_lecture',
 'create policy ec07_conversations_lecture','for update'])
 if(!sql.includes(token))throw new Error(`Missing security token ${token}`);
const page=readFileSync(resolve(root,'app/page.tsx'),'utf8');
for(const token of ['WorkspaceCommercialV07',"['dossiers'", "tab==='dossiers'"])
 if(!page.includes(token))throw new Error(`Missing router entry ${token}`);
const component=readFileSync(resolve(root,paths[0]),'utf8');
for(const token of ['ec_mes_entreprises','ec07_lister_dossiers','ec07_candidater',
 'ec07_assigner_dossier','ec07_droit_conversation','ec07_envoyer_message'].filter(v=>v!=='ec07_droit_conversation'))
 if(!component.includes(token))throw new Error(`Missing UI operation ${token}`);
console.log('V0.7 structure OK:',paths.length,'critical files, SQL functions, and UI integrations.');

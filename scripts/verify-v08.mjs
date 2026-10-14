import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const paths=[
 'supabase/migrations/202610140007_experience_confidentialite.sql',
 'supabase/tests/v08_diagnostics.sql',
 'components/v08/DashboardV08.tsx',
 'components/v08/DemandesV08.tsx',
 'components/v08/RendezVousV08.tsx',
 'components/v06/MediaAndSkills.tsx',
 'components/v07/WorkspaceCommercialV07.tsx',
 'docs/RECETTE_V08.md','docs/INSTALLATION_V08.md',
 'docs/HYPOTHESES_V08.md','README_V08.md','app/page.tsx','app/globals.css'
];
for(const file of paths)if(!existsSync(resolve(root,file)))throw new Error(`Missing ${file}`);
const read=p=>readFileSync(resolve(root,p),'utf8');
const sql=read(paths[0]);
for(const token of [
 'ec08_publier_besoin','ec08_annonce_sure','ec08_fil_besoins','ec08_changer_statut_besoin',
 'ec08_lister_rdv','ec08_lister_messages','ec08_proposer_creneau',
 'ec08_reserver_rdv','ec08_annuler_rdv','ec08_historique_besoins',
 'ec08_opportunites_privees','ec08_projets_prives','ec08_verifier_candidature',
 'alias_demandeur','ec08_un_rdv_actif_par_creneau','enable row level security',
 'revoke all','for update','startup_entreprise_id'
])if(!sql.includes(token))throw new Error(`Missing SQL feature ${token}`);
const page=read('app/page.tsx');
for(const token of ["setTab]=useState('dashboard')",'DashboardV08','DemandesV08','RendezVousV08','PublicImage','EntrepriseEtProfil'])
 if(!page.includes(token))throw new Error(`Missing app entry ${token}`);
for(const token of ['ec08_fil_besoins','ec08_changer_statut_besoin','ec08_publier_besoin'])
 if(!read('components/v08/DemandesV08.tsx').includes(token))throw new Error(`Missing need operation ${token}`);
for(const token of ['ec08_reserver_rdv','ec08_proposer_creneau','ec08_annuler_rdv','ec08_lister_rdv'])
 if(!read('components/v08/RendezVousV08.tsx').includes(token))throw new Error(`Missing RDV operation ${token}`);
for(const token of ["folder==='entreprises'?'logo'",'canvas.toBlob','object-fit:contain','object-fit:cover']){
 const combined=read('components/v06/MediaAndSkills.tsx')+read('app/globals.css');
 if(!combined.includes(token))throw new Error(`Missing image handling ${token}`);
}
const unsafe=/\.from\(['"](?:messages_ec|conversations_ec|reservations_rdv)['"]\)\.select/;
for(const file of ['app/page.tsx','components/v08/DemandesV08.tsx','components/v08/RendezVousV08.tsx','components/v07/WorkspaceCommercialV07.tsx'])
 if(unsafe.test(read(file)))throw new Error(`Unsafe raw select in ${file}`);
console.log('EURACONNECT V0.8 static structure verified:',paths.length,'required assets. This is NOT an E2E/SQL test.');

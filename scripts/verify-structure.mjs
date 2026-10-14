import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const paths=[
 'app/page.tsx','app/globals.css','components/AdminUtilisateurs.tsx',
 'components/v06/DashboardV06.tsx','components/v06/AnnuaireV06.tsx',
 'components/v06/EntrepriseEtProfil.tsx','components/v06/RichEditor.tsx',
 'components/v06/MediaAndSkills.tsx','components/v06/AdminEntreprises.tsx',
 'supabase/migrations/202610140005_entreprises_annuaire.sql',
 'supabase/tests/v06_diagnostics.sql','docs/INSTALLATION_V06.md',
 'netlify.toml','postcss.config.mjs'
];
for(const file of paths)if(!existsSync(resolve(root,file)))throw new Error(`Missing file: ${file}`);
const sql=readFileSync(resolve(root,paths[9]),'utf8');
for(const name of ['entreprises_ec','entreprise_membres_ec','personnes_annuaire_ec',
 'ec_mes_entreprises','ec_sauver_fiche_personne','ec_sauver_fiche_entreprise',
 'ec_dashboard_v06','ec_annuaire_rechercher','euraconnect-media'])
 if(!sql.includes(name))throw new Error(`Missing migration object: ${name}`);
const page=readFileSync(resolve(root,'app/page.tsx'),'utf8');
for(const name of ['DashboardV06','AnnuaireV06','EntrepriseEtProfil','AdminEntreprises','RichEditor','OffreImages'])
 if(!page.includes(name))throw new Error(`Missing app integration: ${name}`);
const postcss=readFileSync(resolve(root,'postcss.config.mjs'),'utf8');
if(!/plugins\s*:/.test(postcss))throw new Error('PostCSS config missing plugins');
console.log(`Structure OK: ${paths.length} files, migration RPCs, components and PostCSS config.`);

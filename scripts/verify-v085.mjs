import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(import.meta.dirname,'..');
const files=[];
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(['node_modules','.next','.git'].includes(e.name))continue;
 const p=path.join(dir,e.name);
 if(e.isDirectory())visit(p);else if(/\.tsx?$/.test(e.name)&&e.name!=='next-env.d.ts')files.push(p);
}}
visit(root);
let total=0;const failures=[];
for(const f of files){const code=fs.readFileSync(f,'utf8');const source=ts.createSourceFile(f,code,ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 for(const d of source.parseDiagnostics)failures.push(`${path.relative(root,f)}:${d.start}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
 const t=ts.transpileModule(code,{fileName:f,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}});
 for(const d of t.diagnostics||[])if(d.category===ts.DiagnosticCategory.Error)failures.push(`${path.relative(root,f)}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
 total++;
}
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrations/202610150009_favoris_tags_intelligents.sql');
const picker=read('components/v09/SmartTags.tsx');
const ann=read('components/v06/AnnuaireV06.tsx');
const page=read('app/page.tsx');
const needs=read('components/v08/DemandesV08.tsx');
for(const [name,ok] of [
 ['default favoris',sql.includes('utilisateur_id set default auth.uid()')],
 ['secure favorite RPC',sql.includes('function public.ec09_basculer_favori')],
 ['favorite directory pagination',sql.includes('function public.ec09_annuaire_favoris')],
 ['normalized tags',sql.includes('function public.ec09_normaliser_terme')],
 ['synonym matching',sql.includes('ec09_cles_termes')&&sql.includes('unnest(c.synonymes)')],
 ['tags ACL',sql.includes('function public.ec09_peut_modifier_tags')],
 ['RLS tags',sql.includes('alter table public.ec09_tags_cibles enable row level security')],
 ['use transactional create',sql.includes('function public.ec09_publier_besoin_tags')&&sql.includes('function public.ec09_publier_offre_tags')],
 ['front favorite RPC',ann.includes("rpc('ec09_basculer_favori'")],
 ['favorite filter',ann.includes("rpc(fn,")&&ann.includes('favoriteOnly')],
 ['tag suggestions',picker.includes("rpc('ec09_suggerer_termes'")],
 ['tag creation',picker.includes("rpc('ec09_creer_terme'")],
 ['tag existing editor',picker.includes("rpc('ec09_definir_tags'")],
 ['offer tags',page.includes("rpc('ec09_publier_offre_tags'")],
 ['need tags',needs.includes("rpc('ec09_publier_besoin_tags'")]
])if(!ok)failures.push(name+' NOT FOUND');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`V0.8.5 static check: OK (${total} TypeScript/TSX files; 15 integration assertions).`);

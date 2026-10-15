import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
await fs.rm('dist', {recursive:true, force:true});
await fs.mkdir('dist', {recursive:true});
await fs.cp('public', 'dist', {recursive:true});
for (const file of await fs.readdir('src')) {
  if (!file.endsWith('.ts')) continue;
  const source=await fs.readFile(path.join('src',file),'utf8');
  const {outputText,diagnostics}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,strict:true},reportDiagnostics:true});
  if (diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error)) throw new Error(`Transpilation: ${file}`);
  await fs.writeFile(path.join('dist',file.replace(/\.ts$/,'.js')), outputText);
}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (key.startsWith('sb_secret_')) throw new Error('Une cle secrete ne doit jamais etre publiee.');
if (key.split('.').length===3) {
  try { const payload=JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    if(payload.role==='service_role') throw new Error('Cle service_role interdite dans le navigateur.');
  } catch(e) { if(e instanceof Error && e.message.includes('interdite')) throw e; }
}
if (url && new URL(url).protocol!=='https:') throw new Error('URL Supabase HTTPS requise.');
const config={version:'1.0.0',supabaseUrl:url.replace(/\/$/,''),supabaseKey:key};
await fs.writeFile('dist/config.js', `window.EC_CONFIG = ${JSON.stringify(config).replace(/</g,'\\u003c')};\n`);
const files=await fs.readdir('dist');
const manifest={version:'1.0.0', files:{}};
for(const file of files) { const bytes=await fs.readFile(`dist/${file}`);manifest.files[file]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}; }
await fs.writeFile('dist/manifest.json',JSON.stringify(manifest,null,2));
console.log(`EURACONNECT 1.0.0: ${files.length} fichiers compiles. Configuration Supabase ${url&&key?'presente':'a renseigner au deploiement'}.`);

// Build a standalone READ-ONLY demo from the same application sources.
// This file is not part of the production entrypoint. No Supabase keys are included.
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
const output=process.argv[2]||'EURACONNECT_APERCU.html';
const files=await fs.readdir('src');
const modules={};
for(const name of files){
 if(!name.endsWith('.ts'))continue;
 let source=await fs.readFile(path.join('src',name),'utf8');
 if(name==='app.ts')source=source.replace('let demo = new URLSearchParams(location.search).get("demo") === "1";', 'let demo = true;');
 let code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 for(const asset of ['euraconnect-64.png','euraconnect-logo.png']){
  if(code.includes('/'+asset))code=code.replaceAll('/'+asset,'data:image/png;base64,'+(await fs.readFile('public/'+asset)).toString('base64'));
 }
 modules['./'+name.replace(/\.ts$/,'.js')]=code;
}
const index=await fs.readFile('public/index.html','utf8');
const styles=[];
for(const m of index.matchAll(/<link rel="stylesheet" href="\/(.*?)">/g))styles.push(await fs.readFile('public/'+m[1],'utf8'));
const modulesJson=JSON.stringify(modules).replace(/</g,'\\u003c');
const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EURACONNECT 3.0 - Apercu sans connexion</title><style>${styles.join('\n')}</style></head><body><a class="skip-link" href="#main">Aller au contenu</a><div id="app"></div><div id="overlay"></div><div id="toasts" role="status" aria-live="polite"></div><script>
window.EC_CONFIG={version:'3.0.0',supabaseUrl:'',supabaseKey:''};
const SOURCES=${modulesJson};const CACHE={};
function require(id){if(CACHE[id])return CACHE[id].exports;if(!SOURCES[id])throw new Error('Module absent: '+id);const m={exports:{}};CACHE[id]=m;new Function('require','module','exports',SOURCES[id])(require,m,m.exports);return m.exports;}
window.__ecRequire=require;
require('./app.js');
</script></body></html>`;
await fs.writeFile(output,html);
console.log('Apercu local cree : '+output);

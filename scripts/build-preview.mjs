// Standalone, read-only design preview. Never deployed as the production API client.
import fs from 'node:fs/promises';
import ts from 'typescript';
const factories=[];
for(const file of await fs.readdir('src')){
 if(!file.endsWith('.ts'))continue;
 let source=await fs.readFile('src/'+file,'utf8');
 if(file==='app.ts')source=source.replace(/new URLSearchParams\(location.search\)\.get\(["']demo["']\)\s*===\s*["']1["']/,'true');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 factories.push(JSON.stringify('./'+file.replace(/\.ts$/,'.js'))+':function(module,exports,require){\n'+code+'\n}');
}
const bundle=`(()=>{try{void localStorage.length;}catch{const data={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>{delete data[k]}}});}const factories={${factories.join(',\n')}};const cache={};function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;factories[id](module,module.exports,require);return module.exports;}window.EC_PREVIEW_MODULE=require;require('./app.js');})();`;
const css=await fs.readFile('public/app.css','utf8');
const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EURACONNECT - Apercu fictif en lecture seule</title><style>${css}</style></head><body><a class="skip-link" href="#main">Aller au contenu</a><div id="app"></div><div id="overlay"></div><div id="toasts" role="status" aria-live="polite"></div><script>${bundle.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
await fs.mkdir('docs/previews',{recursive:true});
await fs.writeFile('docs/previews/APERCU_INTERACTIF.html',html);
await fs.writeFile('docs/previews/preview-runtime.js',bundle);
console.log('Apercu autonome genere (donnees fictives, ecritures desactivees).');

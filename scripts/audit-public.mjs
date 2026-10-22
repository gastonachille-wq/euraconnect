import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root=new URL('../public/',import.meta.url).pathname;
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
const files=walk(root),fail=[];
for(const p of files){if(/partnership_seed\.json|\.sql$|\.env$|\.xlsx$|\.pdf$/i.test(p))fail.push('fichier sensible dans public: '+p);}
if(existsSync(join(root,'_redirects')) && /^\/\*\s+\/index\.html\s+200/m.test(readFileSync(join(root,'_redirects'),'utf8')))fail.push('boucle _redirects détectée');
for(const p of files.filter(p=>p.endsWith('.js')||p.endsWith('.json'))){if(/sb_secret_|service_role\s*[:=]/i.test(readFileSync(p,'utf8')))fail.push('clé sensible potentielle dans '+p);}
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log('Audit public OK : '+files.length+' fichiers, aucun seed contractuel ni redirection circulaire.');

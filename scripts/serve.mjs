import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const root=path.resolve('dist');
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const target=path.resolve(root,`.${url.pathname==='/'?'/index.html':url.pathname}`);
 if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const data=await fs.readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end('Introuvable');}}).listen(process.env.PORT||4173,'127.0.0.1',()=>console.log('EURACONNECT http://127.0.0.1:'+(process.env.PORT||4173)));

import fs from 'node:fs';import http from 'node:http';
const source=fs.readFileSync('dist/server/index.js','utf8');const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const env={DB:{prepare(){return {bind(){return this},async first(){return null}}}}};
http.createServer(async(req,res)=>{try{const response=await worker.fetch(new Request('http://127.0.0.1:4175'+req.url),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Preview failed')}}).listen(4175,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4175'));

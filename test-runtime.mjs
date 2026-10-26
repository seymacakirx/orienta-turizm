import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {accessFixture} from './test-access-fixture.mjs';
const fixture=await accessFixture();const token=await fixture.token();fixture.restore();
const require=createRequire(fs.realpathSync('node_modules/wrangler/package.json'));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:fs.readFileSync('dist/server/index.js','utf8'),compatibilityDate:'2026-10-26',d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{STAGING:'true',...fixture.env},outboundService:async request=>request.url===fixture.env.ACCESS_ISSUER+'/cdn-cgi/access/certs'?Response.json({keys:[fixture.jwk]}):new Response('Denied',{status:403})}));
try {
const db=await mf.getD1Database('DB');await db.exec(fs.readFileSync('drizzle/0000_cms.sql','utf8').split('\n').filter(l=>!l.startsWith('--')).join(' '));
const r=await mf.dispatchFetch('https://example.test/?lang=tr');assert.equal(r.status,200);assert.match(await r.text(),/Orienta/);
assert.equal((await mf.dispatchFetch('https://example.test/admin')).status,403);
const bucket=await mf.getR2Bucket('BUCKET');await bucket.put('uploads/abc.mp4',new Uint8Array([0,1,2,3,4,5,6,7]),{httpMetadata:{contentType:'video/mp4'}});
const media=await mf.dispatchFetch('https://example.test/media/uploads/abc.mp4',{headers:{Range:'bytes=2-5'}});assert.equal(media.status,206);assert.equal(media.headers.get('Content-Range'),'bytes 2-5/8');assert.equal((await media.arrayBuffer()).byteLength,4);
const headers={'Cf-Access-Jwt-Assertion':token,Origin:'https://example.test','Content-Type':'application/json'};
assert.equal((await mf.dispatchFetch('https://example.test/admin',{headers})).status,200);
const content=await(await mf.dispatchFetch('https://example.test/api/content')).json();content.texts.tr.hero='Runtime publish';
const save=await mf.dispatchFetch('https://example.test/api/admin/draft',{method:'PUT',headers,body:JSON.stringify({content,revision:0})});assert.equal(save.status,200,await save.text());
assert.notEqual((await(await mf.dispatchFetch('https://example.test/api/content')).json()).texts.tr.hero,content.texts.tr.hero);
const publish=await mf.dispatchFetch('https://example.test/api/admin/publish',{method:'PUT',headers,body:JSON.stringify({content,revision:0})});assert.equal(publish.status,200,await publish.text());
assert.equal((await(await mf.dispatchFetch('https://example.test/api/content')).json()).texts.tr.hero,content.texts.tr.hero);
const form=new FormData();form.append('file',new Blob([fs.readFileSync('web/assets/orienta-logo.png')],{type:'image/png'}),'logo.png');
const encoded=new Request('https://example.test',{method:'POST',body:form});
const upload=await mf.dispatchFetch('https://example.test/api/admin/upload',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':token,Origin:'https://example.test','Content-Type':encoded.headers.get('Content-Type')},body:await encoded.arrayBuffer()});assert.equal(upload.status,200,await upload.clone().text());const uploaded=await upload.json();assert.equal((await mf.dispatchFetch('https://example.test'+uploaded.url)).status,200);
console.log('PASS: signed Access session, D1 draft/publish isolation, upload and media read.');
console.log('PASS: real local Workers runtime, D1 read, protected admin, R2 range response');
} finally {await mf.dispose()}

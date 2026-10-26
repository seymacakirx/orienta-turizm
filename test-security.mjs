import assert from 'node:assert/strict';
import worker from './dist/server/index.js';
import {accessFixture} from './test-access-fixture.mjs';
const fixture=await accessFixture(), env={...fixture.env};
const origin='https://example.test';
const call=(path,token,extra={})=>worker.fetch(new Request(origin+path,{headers:token?{'Cf-Access-Jwt-Assertion':token}:{},...extra}),env);
const good=await fixture.token();
for(const path of ['/admin','/admin/','/admin/index.html','/admin/admin.js','/api/admin/content','/api/admin/draft','/api/admin/publish','/api/admin/upload']) {
 assert.equal((await call(path)).status,403,path);
 assert.equal((await call(path,null,{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'dogancancelik1@gmail.com','Cf-Access-Authenticated-User-Email':'admin@example.test'}})).status,403,path);
}
for(const claims of [{exp:0},{exp:undefined},{iat:undefined},{iat:Math.floor(Date.now()/1000)+600},{nbf:Math.floor(Date.now()/1000)+600},{iss:'https://evil.test'},{aud:['other']},{email:'other@example.test'},{sub:''},{type:'service'}]) assert.equal((await call('/admin',await fixture.token(claims))).status,403,JSON.stringify(claims));
for(const header of [{alg:'none'},{alg:'HS256'},{kid:'unknown'}]) assert.equal((await call('/admin',await fixture.token({},header))).status,403);
const parts=good.split('.');parts[1]=Buffer.from(JSON.stringify({email:'admin@example.test'})).toString('base64url');
for(const token of [parts.join('.'),'bad',good.slice(0,-10)+'AAAAAAAAAA']) assert.equal((await call('/admin',token)).status,403);
let r=await call('/admin',good);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.match(await r.text(),/cdn-cgi\/access\/logout/);
assert.equal((await worker.fetch(new Request(origin+'/admin',{headers:{'Cf-Access-Jwt-Assertion':good}}),{})).status,403);
assert.equal((await worker.fetch(new Request(origin+'/admin',{headers:{'Cf-Access-Jwt-Assertion':good}}),{...env,ACCESS_ISSUER:'https://attacker.test'})).status,403);
for(const source of [undefined,'https://evil.test']) {
 const headers={'Cf-Access-Jwt-Assertion':good};if(source)headers.Origin=source;
 assert.equal((await call('/api/admin/draft',null,{method:'PUT',headers,body:'{}'})).status,403);
}
assert.equal((await call('/services/guide/index.html')).status,308);
assert.equal((await call('/blog/')).status,308);
assert.equal((await call('/admin',good,{method:'POST',headers:{'Cf-Access-Jwt-Assertion':good}})).status,405);
// Verify real signed-token outages fail closed for an uncached issuer.
globalThis.fetch=async()=>{throw new Error('JWKS unavailable')};
assert.equal((await worker.fetch(new Request(origin+'/admin',{headers:{'Cf-Access-Jwt-Assertion':await fixture.token({iss:'https://outage.cloudflareaccess.com'})}}),{...env,ACCESS_ISSUER:'https://outage.cloudflareaccess.com'})).status,403);
fixture.restore();
console.log('PASS: RSA signatures, claims, spoofed headers, missing config, JWKS outage, CSRF, protected panel and assets.');

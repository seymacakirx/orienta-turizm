import assert from 'node:assert/strict';
import worker from './dist/server/index.js';
import {databaseFixture,origin,cookie,hash} from './test-helpers.mjs';
const f=databaseFixture(),{env,db,key}=f;
const req=(path,options={})=>worker.fetch(new Request(origin+path,options),env);
const login=(body={username:'yonetici',key},headers={Origin:origin})=>req('/api/auth/login',{method:'POST',headers,body:JSON.stringify(body)});
for(const path of ['/api/admin/content','/api/admin/draft','/api/admin/publish','/api/admin/upload']){
 assert.equal((await req(path)).status,403);
 assert.equal((await req(path,{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'admin@example.test','Cf-Access-Jwt-Assertion':'fake'}})).status,403);
}
assert.equal((await req('/admin')).status,303);
assert.equal((await req('/admin/login')).status,200);
assert.equal((await login(undefined,{})).status,403);
assert.equal((await login(undefined,{Origin:'https://evil.test'})).status,403);
assert.equal((await req('/api/auth/logout')).status,405);
assert.equal((await login({username:'wrong',key})).status,401);
assert.equal((await login({username:'yonetici',key:env.ADMIN_KEY_SHA256})).status,401);
assert.equal((await login({username:'yonetici',key:'wrong'})).status,401);
let r=await login();assert.equal(r.status,200);let c=cookie(r);
assert.match(r.headers.get('Set-Cookie'),/Secure; HttpOnly; SameSite=Strict; Max-Age=28800/);
assert.doesNotMatch(r.headers.get('Set-Cookie'),/Domain=/);
const token=c.split('=')[1];assert.equal(token.length,64);
assert.equal(db.prepare('SELECT token_hash FROM admin_sessions').get().token_hash,hash(token));
assert.equal((await req('/admin',{headers:{Cookie:c}})).status,200);
assert.equal((await req('/api/admin/content?session='+token)).status,403);
assert.equal((await req('/api/admin/content',{headers:{Cookie:c+'; '+c}})).status,403);
assert.equal((await req('/api/admin/content',{headers:{Cookie:c+'x'}})).status,403);
assert.equal((await req('/api/admin/content',{headers:{Cookie:'__Host-orienta_session='+hash(token)}})).status,403);
assert.equal((await worker.fetch(new Request(origin+'/api/admin/content',{headers:{Cookie:c}}),{...env,ADMIN_KEY_SHA256:'a'.repeat(64)})).status,403);
assert.equal((await req('/api/auth/logout',{method:'POST',headers:{Cookie:c,Origin:'https://evil.test'}})).status,403);
assert.equal((await req('/api/admin/content',{headers:{Cookie:c}})).status,200);
const second=await login(undefined,{Origin:origin,Cookie:c});assert.equal(second.status,200);const c2=cookie(second);assert.notEqual(c2,c);
assert.equal((await req('/api/admin/content',{headers:{Cookie:c}})).status,403);c=c2;
assert.equal((await req('/api/auth/logout',{method:'POST',headers:{Origin:origin,Cookie:c}})).status,200);
assert.equal((await req('/api/admin/content',{headers:{Cookie:c}})).status,403);
assert.equal((await login()).status,429); // Five attempts/IP in the window, including successful ones.
db.exec('DELETE FROM admin_login_limits');
const concurrent=await Promise.all(Array.from({length:8},()=>login({username:'yonetici',key:'bad'})));
assert.equal(concurrent.filter(r=>r.status===401).length,5);assert.equal(concurrent.filter(r=>r.status===429).length,3);
db.exec('DELETE FROM admin_login_limits');
for(const field of ['expires_at','last_seen']){
 r=await login();c=cookie(r);db.prepare('UPDATE admin_sessions SET '+field+' = 0').run();
 assert.equal((await req('/api/admin/content',{headers:{Cookie:c}})).status,403);
}
assert.equal((await worker.fetch(new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin},body:'{}'}),{DB:env.DB})).status,503);
assert.equal((await worker.fetch(new Request('http://example.test/api/auth/login',{method:'POST',headers:{Origin:'http://example.test'},body:JSON.stringify({username:'yonetici',key})}),env)).status,403);
assert.equal((await req('/api/admin/draft',{method:'PUT',headers:{Cookie:c},body:'{}'})).status,403);
db.exec('DELETE FROM admin_login_limits');
for(let i=0;i<50;i++)assert.equal((await login({key:'bad'},{Origin:origin,'CF-Connecting-IP':'192.0.2.'+i})).status,401);
assert.equal((await login(undefined,{Origin:origin,'CF-Connecting-IP':'192.0.2.200'})).status,429);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admin_login_limits').get().n,51);
console.log('PASS: login, hashed/revocable cookies, fixation, replay, expiry/idle, key rotation, forged headers, CSRF, HTTPS, missing configuration and concurrent/global brute-force limits.');

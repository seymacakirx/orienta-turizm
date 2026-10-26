import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from './dist/server/index.js';
import {databaseFixture,origin,cookie} from './test-helpers.mjs';
const fixture=databaseFixture(),{env,db}=fixture;
const logged=await fixture.login(worker);assert.equal(logged.status,200);
const owner={Cookie:cookie(logged),Origin:origin,'Content-Type':'application/json'};
async function call(path,method='GET',body,headers=owner){const r=await worker.fetch(new Request(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env);return{status:r.status,data:await r.json()}}
const initial=(await call('/api/content')).data;assert.equal(initial.services.length,7);
assert.equal((await call('/api/admin/content','GET',undefined,{})).status,403);
assert.equal((await call('/api/admin/draft','PUT',{content:initial,revision:0},{...owner,Origin:'https://evil.test'})).status,403);
const updated=structuredClone(initial);updated.texts.tr.hero='Kalıcı içerik denemesi';
updated.posts=[{slug:'istanbul-test',tr:{ready:'evet',title:'İstanbul',summary:'Özet',blocks:[{text:'Deneyim'}]},en:{ready:'hayır',title:'Draft',blocks:[]}}];
assert.equal((await call('/api/admin/draft','PUT',{content:updated,revision:0})).status,200);
assert.notEqual((await call('/api/content')).data.texts.tr.hero,updated.texts.tr.hero);
assert.equal((await call('/api/admin/draft','PUT',{content:initial,revision:0})).status,409);
assert.deepEqual((await call('/api/admin/content')).data.draft.content.posts,updated.posts);
assert.equal((await call('/api/admin/publish','PUT',{content:updated,revision:0})).status,200);
assert.equal((await call('/api/content')).data.texts.tr.hero,updated.texts.tr.hero);
assert.equal((await call('/api/content')).data.posts[0].en,undefined);
assert.equal((await call('/api/admin/publish','PUT',{content:initial,revision:0})).status,409);
for(const mutate of [d=>d.services[0].id='"><script>',d=>d.texts.tr.hero=42,d=>d.config.phone={},d=>d.config.services.guide={tr:{id:'bad'}},d=>d.posts=[{slug:'ok',tr:{blocks:[{text:42}]}}]]){
 const bad=structuredClone(updated);mutate(bad);assert.equal((await call('/api/admin/publish','PUT',{content:bad,revision:1})).status,400);
}
assert.equal((await call('/api/admin/publish','PUT',null)).status,400);
const malicious=structuredClone(updated);malicious.config.services=JSON.parse('{"__proto__":{}}');
assert.equal((await call('/api/admin/draft','PUT',{content:malicious,revision:1})).status,400);
assert.equal((await call('/api/admin/draft','PUT',{content:updated,revision:-1})).status,400);
assert.equal((await call('/api/admin/draft','PUT',{content:updated,revision:1,padding:'x'.repeat(1500000)})).status,413);
let writes=0;env.BUCKET={put(){writes++;throw Error('must not upload')}};
for(const type of ['image/png','image/jpeg','video/mp4']){
 const form=new FormData();form.append('file',new Blob(['test'],{type}),'file');
 assert.equal((await worker.fetch(new Request(origin+'/api/admin/upload',{method:'POST',headers:{Cookie:owner.Cookie,Origin:origin},body:form}),env)).status,503);
}
assert.equal(writes,0);
assert.deepEqual((await call('/api/content')).data.config,updated.config);
assert.equal((await call('/api/content')).data.services[0].image,initial.services[0].image);
for(const file of ['0000_cms.sql','0001_admin_auth.sql'])db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM cms_documents').get().n,2);
console.log('PASS: session-authenticated CMS, draft/live isolation, blog languages, revision conflicts, validation, disabled uploads and preserved media/content.');

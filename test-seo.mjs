import fs from 'node:fs';import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/server/index.js','utf8');const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
let content=null;const env={DB:{prepare(){return {bind(){return this},async first(){return content?{content:JSON.stringify(content),revision:1,updated_at:'2026-10-22'}:null}}}}};
const get=path=>worker.fetch(new Request('https://example.com'+path),env);
content=await(await get('/api/content')).json();
for(const l of ['tr','en','ru'])for(const path of ['/',...content.services.map(s=>'/services/'+s.id),'/blog']){const r=await get(path+'?lang='+l);const html=await r.text();assert.equal(r.status,200,path+' '+html.slice(0,200));assert.match(html,/<h1>/);assert.match(html,/rel="canonical"/);assert.match(html,/application\/ld\+json/);assert.match(html,new RegExp('<html lang="'+l+'"'));assert.match(html,/hreflang="tr"/);}
content.posts=[{slug:'istanbul-notlari',author:'Test',image:'/assets/orienta-logo.png',tr:{ready:'evet',title:'İstanbul notları',summary:'Özet',blocks:[{heading:'Deneyim',text:'Tek sütun içerik',image:'/assets/orienta-logo.png',alt:'İstanbul'}]},en:{ready:'hayır',title:'Draft'}}];
let r=await get('/blog/istanbul-notlari?lang=tr'),html=await r.text();assert.equal(r.status,200);assert.match(html,/BlogPosting/);assert.match(html,/Tek sütun içerik/);assert.doesNotMatch(html,/class="columns"/);assert.doesNotMatch(html,/hreflang="en"/);
assert.equal((await get('/blog/istanbul-notlari?lang=en')).status,404);assert.equal((await get('/services/missing?lang=tr')).status,404);
html=await(await get('/sitemap.xml')).text();assert.match(html,/istanbul-notlari\?lang=tr/);assert.doesNotMatch(html,/istanbul-notlari\?lang=en/);assert.match(await(await get('/robots.txt')).text(),/Disallow: \/admin/);assert.match((await get('/admin')).headers.get('X-Robots-Tag'),/noindex/);
console.log('PASS: 27 localized SSR pages, metadata, published/draft blog, language alternates, 404, sitemap and admin noindex');

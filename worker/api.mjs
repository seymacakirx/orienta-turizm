
function normalizeContent(doc){
 const names={tr:['Çeviri Hizmetleri','Tercüman Hizmetleri'],en:['Translation Services','Interpreting Services'],ru:['Услуги перевода','Услуги переводчика']};
 const labels={tr:['E-Posta','Adres'],en:['Email','Address'],ru:['Электронная почта','Адрес']};
 for(const lang of ['tr','en','ru']){
  const service=doc.services.find(s=>s.id==='translation');
  if(service?.[lang]?.[0]===names[lang][0])service[lang][0]=names[lang][1];
  const over=doc.config.services?.translation?.[lang];
  if(over?.title===names[lang][0])over.title=names[lang][1];
  doc.texts[lang].emailHeading??=labels[lang][0];doc.texts[lang].addressHeading??=labels[lang][1];
 }
 doc.posts??=[];doc.config.seo??={};
 return doc;
}
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function api(request,env,defaults){
 const u=new URL(request.url),path=u.pathname;
 const admin=path.startsWith('/api/admin');
 if(admin){
  if(!await authorizedAdmin(request,env))return json({error:'Yönetici oturumu gerekli. Giriş sayfasından yeniden giriş yapın.'},403);
  if(request.method!=='GET'&&request.headers.get('Origin')!==u.origin)return json({error:'Geçersiz istek kaynağı.'},403);
 }
 if(path==='/api/geo')return json({country_code:request.cf?.country||''});
 async function read(id){const r=await env.DB.prepare('SELECT content, revision, updated_at FROM cms_documents WHERE id = ?').bind(id).first();return r?{content:normalizeContent(JSON.parse(r.content)),revision:r.revision,updatedAt:r.updated_at}:{content:normalizeContent(structuredClone(defaults)),revision:0,updatedAt:null};}
 if(path==='/api/content'){
  const publicDoc=(await read('live')).content;
  publicDoc.posts=(publicDoc.posts||[]).map(p=>{const out={...p};for(const l of ['tr','en','ru']){const t=p[l];if(!(t?.ready==='evet'&&t.title?.trim()&&t.summary?.trim()&&Array.isArray(t.blocks)&&t.blocks.some(b=>b.text?.trim())))delete out[l];}return out;}).filter(p=>p.tr||p.en||p.ru);
  return json(publicDoc);
 }
 if(path==='/api/admin/content'&&request.method==='GET')return json({draft:await read('draft'),live:await read('live')});
 if((path==='/api/admin/draft'||path==='/api/admin/publish')&&request.method==='PUT'){
  if(Number(request.headers.get('Content-Length'))>1500000)return json({error:'İçerik çok büyük.'},413);
  const raw=await boundedBody(request,1500000);if(raw===null)return json({error:'İçerik çok büyük.'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'Geçersiz içerik.'},400)}
  const doc=body?.content;
  if(!validDocument(doc,defaults)||!Number.isSafeInteger(body?.revision)||body.revision<0)return json({error:'İçerik yapısı geçersiz.'},400);
  if(!doc||!doc.config||!doc.texts||!Array.isArray(doc.services)||doc.services.length!==7||!['tr','en','ru'].every(l=>doc.texts[l])||!Number.isInteger(body.revision))return json({error:'İçerik alanları eksik.'},400);
  if(doc.posts!==undefined&&(!Array.isArray(doc.posts)||doc.posts.some(p=>!p||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)||!['tr','en','ru'].every(l=>!p[l]||typeof p[l]==='object'))||new Set(doc.posts.map(p=>p.slug)).size!==doc.posts.length))return json({error:'Blog adresleri benzersiz olmalı; küçük Latin harfleri, rakamlar ve tire kullanın.'},400);
  const id=path.endsWith('publish')?'live':'draft',now=new Date().toISOString();
  await env.DB.prepare('INSERT OR IGNORE INTO cms_documents (id, content, revision, updated_at) VALUES (?, ?, 0, ?)').bind(id,JSON.stringify(defaults),now).run();
  const r=await env.DB.prepare('UPDATE cms_documents SET content = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(doc),now,id,body.revision).run();
  if(r.meta.changes!==1)return json({error:'İçerik başka bir sekmede değişti. Sayfayı yenileyip güncel içerikle devam edin.'},409);
  return json({revision:body.revision+1,updatedAt:now});
 }
 if(path==='/api/admin/upload')return json({error:'Fotoğraf ve video yükleme geçici olarak kapalı. Mevcut görsel adresleri korunur.'},503);
 return json({error:'Bulunamadı.'},404);
}

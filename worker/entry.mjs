async function routeRequest(request, env) {
 const u = new URL(request.url);
 if (u.pathname.startsWith('/api/')) return api(request, env, DEFAULTS);
 if (u.pathname === '/admin' || u.pathname.startsWith('/admin/')) {
  if (!await authorizedAdmin(request, env)) return new Response('Yetkili Cloudflare Access oturumu gerekli. /admin adresini Access koruması üzerinden açın.', {status: 403, headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow'}});
 }
 if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD'}});
 if (u.pathname.startsWith('/media/uploads/')) {
  const key = u.pathname.slice(7);
  if (!/^uploads\/[a-f0-9-]+\.(png|jpg|mp4)$/.test(key)) return new Response('Not found', {status: 404});
  const ranged = request.headers.has('Range');
  const obj = await env.BUCKET.get(key, ranged ? {range: request.headers} : undefined);
  if (!obj) return new Response('Not found', {status: 404});
  const h = new Headers(); obj.writeHttpMetadata(h);
  h.set('X-Content-Type-Options', 'nosniff'); h.set('Accept-Ranges', 'bytes');
  h.set('Cache-Control', 'public,max-age=31536000,immutable');
  h.set('ETag', obj.httpEtag);
  const partial = ranged && obj.range;
  h.set('Content-Length', String(partial ? obj.range.length : obj.size));
  if (partial) h.set('Content-Range', 'bytes ' + obj.range.offset + '-' + (obj.range.offset + obj.range.length - 1) + '/' + obj.size);
  return new Response(request.method === 'HEAD' ? null : obj.body, {status: partial ? 206 : 200, headers: h});
 }
 if (u.pathname === '/' || u.pathname.startsWith('/services/') || u.pathname === '/blog' || u.pathname.startsWith('/blog/') || u.pathname === '/sitemap.xml' || u.pathname === '/robots.txt') {
  // Preserve old service index.html and trailing-slash links.
  const canonical = u.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  if (canonical !== u.pathname) { u.pathname = canonical; return Response.redirect(u.href, 308); }
  return seoResponse(request, env);
 }
 let p = u.pathname;
 if (p === '/admin' || p === '/admin/') p = '/admin/index.html';
 const a = ASSETS[p];
 if (!a) return new Response('Not found', {status: 404});
 const admin = p.startsWith('/admin/');
 return new Response(Uint8Array.from(atob(a.body), c => c.charCodeAt(0)), {headers: {
  'Content-Type': a.type, 'Cache-Control': admin ? 'no-store' : 'no-cache',
  ...(admin ? {'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; media-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"} : {})
 }});
}
export default {async fetch(request, env) {
 let response;
 try { response = await routeRequest(request, env); }
 catch { response = json({error: 'İşlem tamamlanamadı. Lütfen yeniden deneyin.'}, 500); }
 const headers = new Headers(response.headers);
 headers.set('X-Content-Type-Options', 'nosniff');
 headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
 headers.set('X-Frame-Options', 'DENY');
 if (env.STAGING === 'true') headers.set('X-Robots-Tag', 'noindex, nofollow');
 return new Response(request.method === 'HEAD' ? null : response.body, {status: response.status, statusText: response.statusText, headers});
}};

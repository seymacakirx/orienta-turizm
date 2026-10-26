// High-entropy generated credentials only; never use a human-chosen password here.
const SESSION_COOKIE = '__Host-orienta_session';
const SESSION_SECONDS = 8 * 60 * 60;
const IDLE_SECONDS = 30 * 60;
const hex = bytes => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
async function digest(value) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
function authConfigured(env) { return /^[a-f0-9]{64}$/.test(env.ADMIN_KEY_SHA256 || ''); }
async function credentialTag(env) { return digest((env.ADMIN_USERNAME || 'yonetici') + ':' + env.ADMIN_KEY_SHA256); }
function sessionToken(request) {
 const matches = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith(SESSION_COOKIE + '='));
 if (matches.length !== 1) return null;
 const token = matches[0].slice(SESSION_COOKIE.length + 1);
 return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
function sessionCookie(token, seconds) { return `${SESSION_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${seconds}`; }
export async function authorizedAdmin(request, env) {
 try {
  if (!authConfigured(env) || new URL(request.url).protocol !== 'https:') return false;
  const token = sessionToken(request); if (!token) return false;
  const now = Math.floor(Date.now() / 1000), hash = await digest(token);
  const row = await env.DB.prepare('SELECT credential_tag, expires_at, last_seen FROM admin_sessions WHERE token_hash = ?').bind(hash).first();
  if (!row || row.credential_tag !== await credentialTag(env) || row.expires_at <= now || row.last_seen <= now - IDLE_SECONDS) return false;
  // Do not write D1 on every asset request. Never extend the absolute deadline.
  if (row.last_seen < now - 60) await env.DB.prepare('UPDATE admin_sessions SET last_seen = ? WHERE token_hash = ? AND last_seen > ? AND expires_at > ?').bind(now, hash, now - IDLE_SECONDS, now).run();
  return true;
 } catch { return false; }
}
async function loginLimit(env, key, now, limit) {
 // Each increment/check is one atomic SQL statement, including concurrent requests.
 const row = await env.DB.prepare(`INSERT INTO admin_login_limits (bucket, window_start, attempts) VALUES (?, ?, 1)
 ON CONFLICT(bucket) DO UPDATE SET
 attempts = CASE WHEN window_start <= ? THEN 1 ELSE attempts + 1 END,
 window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END
 RETURNING attempts`).bind(key, now, now - 900, now - 900).first();
 if (key === 'global' && row.attempts === 1) await env.DB.prepare('DELETE FROM admin_login_limits WHERE window_start <= ? AND bucket != ?').bind(now - 900, 'global').run();
 return row.attempts <= limit;
}
async function authResponse(request, env) {
 const u = new URL(request.url);
 if (!['/api/auth/login', '/api/auth/logout'].includes(u.pathname)) return json({error:'Bulunamadı.'},404);
 if (request.method !== 'POST') return json({error:'POST gerekli.'},405);
 if (u.protocol !== 'https:' || request.headers.get('Origin') !== u.origin) return json({error:'Geçersiz istek kaynağı.'},403);
 if (u.pathname.endsWith('/logout')) {
  const token = sessionToken(request);
  if (token) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await digest(token)).run();
  const r = json({ok:true});r.headers.set('Set-Cookie',sessionCookie('',0));return r;
 }
 if (!authConfigured(env)) return json({error:'Yönetici girişi henüz yapılandırılmadı.'},503);
 const now = Math.floor(Date.now() / 1000);
 if (!await loginLimit(env, 'global', now, 50)) return json({error:'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'},429);
 const ipKey = await digest((request.headers.get('CF-Connecting-IP') || 'unknown') + ':' + env.ADMIN_KEY_SHA256);
 if (!await loginLimit(env, ipKey, now, 5)) return json({error:'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'},429);
 const raw = await boundedBody(request,2048);
 if (raw === null) return json({error:'İstek çok büyük.'},413);
 let body;try { body = JSON.parse(raw); } catch { return json({error:'Geçersiz istek.'},400); }
 const supplied = typeof body?.key === 'string' ? body.key : '';
 const actual = await digest(supplied);
 // Fixed-length comparison; the stored value verifies a 256-bit random key,
 // not a low-entropy password. The setup tool generates the only supported format.
 let mismatch = 0;for(let i=0;i<64;i++) mismatch |= actual.charCodeAt(i) ^ env.ADMIN_KEY_SHA256.charCodeAt(i);
 if (mismatch || !/^ot1_[A-Za-z0-9_-]{43}$/.test(supplied) || body?.username !== (env.ADMIN_USERNAME || 'yonetici')) return json({error:'Kullanıcı adı veya giriş anahtarı hatalı.'},401);
 await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ? OR last_seen <= ?').bind(now, now-IDLE_SECONDS).run();
 await env.DB.prepare('DELETE FROM admin_login_limits WHERE window_start <= ?').bind(now-900).run();
 // Rotate on login. Never adopt a client-supplied session identifier.
 const old = sessionToken(request);
 if (old) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await digest(old)).run();
 const token = hex(crypto.getRandomValues(new Uint8Array(32)));
 await env.DB.prepare('INSERT INTO admin_sessions (token_hash, credential_tag, expires_at, last_seen) VALUES (?, ?, ?, ?)').bind(await digest(token),await credentialTag(env),now+SESSION_SECONDS,now).run();
 const r=json({ok:true});r.headers.set('Set-Cookie',sessionCookie(token,SESSION_SECONDS));return r;
}

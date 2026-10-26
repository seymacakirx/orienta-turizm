// Access is the session provider. Never trust email headers or decode-only JWTs.
let accessKeys;
function decodeAccessPart(value) {
 if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid JWT');
 return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}
export async function authorizedAdmin(request, env) {
 try {
  const issuer = env.ACCESS_ISSUER;
  const audience = env.ACCESS_AUD;
  const allowed = (env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || '') || !audience || !allowed.length) return false;
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || '';
  if (token.length > 16384) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const parse = s => JSON.parse(new TextDecoder().decode(decodeAccessPart(s)));
  const header = parse(parts[0]), claims = parse(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
      claims.iss !== issuer || !Array.isArray(claims.aud) || !claims.aud.includes(audience) ||
      !Number.isFinite(claims.exp) || claims.exp <= now ||
      !Number.isFinite(claims.iat) || claims.iat > now + 30 ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30)) ||
      typeof claims.sub !== 'string' || !claims.sub || claims.type !== 'app' ||
      typeof claims.email !== 'string' || !allowed.includes(claims.email.toLowerCase())) return false;
  // Fixed, configured issuer only; token-supplied jku/x5u URLs are never followed.
  if (!accessKeys || accessKeys.issuer !== issuer || accessKeys.expires <= Date.now()) {
   const response = await fetch(issuer + '/cdn-cgi/access/certs', {signal: AbortSignal.timeout(5000), redirect: 'manual'});
   if (!response.ok) return false;
   const data = await response.json();
   if (!Array.isArray(data.keys)) return false;
   accessKeys = {issuer, keys: data.keys, expires: Date.now() + 300000};
  }
  // Unknown keys fail closed until the bounded cache refresh (at most 5 minutes).
  const jwk = accessKeys.keys.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256') && (!k.use || k.use === 'sig'));
  if (!jwk) return false;
  const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeAccessPart(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
 } catch { return false; }
}

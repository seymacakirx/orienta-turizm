// Validate before writing so malformed content cannot break public rendering.
export function validDocument(doc, defaults) {
 const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
 const languages = ['tr', 'en', 'ru'];
 const strings = v => object(v) && Object.values(v).every(x => typeof x === 'string');
 function safeTree(v, depth = 0) {
  if (depth > 20) return false;
  if (v && typeof v === 'object') return Object.entries(v).every(([k, x]) => !['__proto__', 'prototype', 'constructor'].includes(k) && safeTree(x, depth + 1));
  return v === null || ['string', 'number', 'boolean'].includes(typeof v);
 }
 if (!object(doc) || !safeTree(doc) || !object(doc.config) || !object(doc.texts) || !Array.isArray(doc.services)) return false;
 if (!languages.every(l => strings(doc.texts[l]) && Object.keys(defaults.texts[l]).every(k => typeof doc.texts[l][k] === 'string'))) return false;
 const c = doc.config;
 if (!Object.entries(defaults.config).every(([k, v]) => typeof v === 'object' ? object(c[k]) : typeof c[k] === typeof v)) return false;
 if (!strings(c.contacts) || !Object.keys(defaults.config.contacts).every(k => typeof c.contacts[k] === 'string')) return false;
 if (!Number.isFinite(c.videoLoopSeconds) || c.videoLoopSeconds < 0) return false;
 const ids = defaults.services.map(s => s.id);
 if (doc.services.length !== ids.length || new Set(doc.services.map(s => s?.id)).size !== ids.length) return false;
 if (!doc.services.every(s => object(s) && ids.includes(s.id) && typeof s.image === 'string' && languages.every(l => Array.isArray(s[l]) && s[l].length === 6 && s[l].every(t => typeof t === 'string')))) return false;
 for (const [id, over] of Object.entries(c.services)) {
  if (!ids.includes(id) || !object(over)) return false;
  for (const [k, v] of Object.entries(over)) {
   if (languages.includes(k)) { if (!strings(v) || Object.hasOwn(v, 'id')) return false; }
   else if (k === 'gallery') { if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) return false; }
   else if (k === 'id' || typeof v !== 'string') return false;
  }
 }
 if (c.seo !== undefined && (!object(c.seo) || !Object.entries(c.seo).every(([l, v]) => languages.includes(l) && strings(v)))) return false;
 if (doc.posts !== undefined) {
  if (!Array.isArray(doc.posts) || new Set(doc.posts.map(p => p?.slug)).size !== doc.posts.length) return false;
  for (const post of doc.posts) {
   if (!object(post) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug || '')) return false;
   for (const [k, v] of Object.entries(post)) {
    if (!languages.includes(k)) { if (typeof v !== 'string') return false; continue; }
    if (!object(v) || !Object.entries(v).every(([key, value]) => key === 'blocks' ? Array.isArray(value) && value.every(strings) : typeof value === 'string')) return false;
   }
  }
 }
 return true;
}

async function boundedBody(request, limit, binary = false) {
 const reader = request.body?.getReader();
 if (!reader) return binary ? new Uint8Array() : '';
 const chunks = []; let length = 0;
 try {
  while (true) {
   const {done, value} = await reader.read(); if (done) break;
   length += value.byteLength;
   if (length > limit) { await reader.cancel(); return null; }
   chunks.push(value);
  }
 } finally { reader.releaseLock(); }
 const bytes = new Uint8Array(length); let offset = 0;
 for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
 return binary ? bytes : new TextDecoder().decode(bytes);
}

import {randomBytes,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const key='ot1_'+randomBytes(32).toString('base64url');
const hash=createHash('sha256').update(key).digest('hex');
mkdirSync('backups',{recursive:true});
const file=resolve('backups','admin-setup-'+Date.now()+'.txt');
writeFileSync(file,`Kullanıcı adı: yonetici\nGiriş anahtarı: ${key}\n\nCloudflare Secret adı: ADMIN_KEY_SHA256\nSecret değeri: ${hash}\n\nBu dosyayı paylaşmayın veya GitHub'a yüklemeyin. Giriş anahtarını parola yöneticinize kaydedin. Kendi kısa parolanızla değiştirmeyin. Yeni hash Cloudflare'a kaydedilince eski oturumlar geçersiz olur.\n`,{flag:'wx',mode:0o600});
console.log('Giriş bilgileri yalnızca bu yerel dosyaya yazıldı: '+file);

# Orienta Turizm — mevcut panel, kart gerektiren hizmetler olmadan

Bu dal mevcut `web/admin/` panelini ve ziyaretçi sitesini korur. Sunucu Cloudflare Workers, içerik ve yönetici oturumları mevcut D1 veritabanında çalışır. Cloudflare Access ve R2 etkinleştirilmez. Fotoğraf/video yükleme geçici olarak kapalıdır; eski adresler ve içerikler silinmez.

**Güncel kurulum:** [CLOUDFLARE-KURULUM.md](CLOUDFLARE-KURULUM.md). Önceki Access/R2 kurulum talimatlarının yerini bu rehber alır.

## Dosyalar

- `web/`: mevcut üç dilli site, yedi hizmet ve blog.
- `web/admin/`: mevcut editör; aynı stilleri kullanan giriş ekranı.
- `worker/api.mjs`: D1 içerik okuma, taslak ve yayımlama; kapalı yükleme uç noktası.
- `worker/auth.mjs`: sunucuda doğrulanan giriş, D1 oturumları ve giriş denemesi sınırları.
- `worker/entry.mjs`, `worker/seo.mjs`: yönlendirme, medya okuma, HTML ve SEO.
- `drizzle/0000_cms.sql`: mevcut içerik tablosu; `0001_admin_auth.sql`: yalnızca ek oturum tabloları.
- `scripts/create-admin-key.mjs`: 256 bit rastgele yönetici anahtarını yerel, Git dışında bir dosyaya üretir.
- `wrangler.jsonc`: D1 bağlantılı test Worker yapılandırması; Access/R2 bağlantısı yok.
- `docs/`: değiştirilmemiş GitHub Pages yayını.

## Yerel kontrol

Node.js 24+ ve pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm run test:runtime
pnpm run cf:check
```

Son komut `wrangler deploy --dry-run` ile yalnızca paket kontrolü yapar. GitHub iş akışı test ve paket kontrolü içerir; yayın yapmaz. Node ile derleme ve temel testler üçüncü taraf paket gerektirmez. Yerel Cloudflare testi için Wrangler bağımlılıkları gerekir.

`pnpm run preview` ziyaretçi görünümünü `http://127.0.0.1:4175/?lang=tr` adresinde gösterir. Bu basit önizleme gerçek D1 veya yönetici oturumu sunmaz. Yönetici girişi HTTPS ister; yerel testlerde güvenliği atlatan bir geliştirme anahtarı yoktur.

## Güvenlik ve sınırlar

Giriş için insanın seçtiği kısa parola kullanılmaz. Kurulum aracı uzun, rastgele bir anahtar üretir; yalnızca SHA-256 doğrulayıcısı Worker Secret olarak kaydedilir. Sunucunun ürettiği rastgele oturum çerezinin de yalnızca özeti D1'de saklanır. Çerez Secure/HttpOnly/SameSite=Strict ve `__Host-` öneklidir. Oturum en fazla 8 saat, işlem yapılmazsa 30 dakika sürer. Çıkış D1 kaydını iptal eder. Anahtar değişikliği mevcut oturumları geçersiz kılar. POST/PUT işlemleri aynı kaynak kontrolüyle korunur. 15 dakikada IP başına 5, toplam 50 giriş denemesi sınırı D1'de atomik olarak uygulanır. Bu sistem tek yönetici kimliği içindir; e-posta ile sıfırlama ve çok faktörlü giriş içermez.

Mevcut içerikleri taşımak için eski live/draft kayıtları ve medya ayrıca yedeklenmelidir. Kaynak kodu canlı veritabanı yedeği değildir. R2'de veya eski Sites deposunda bulunan, depoya dahil edilmemiş dosyalar kendiliğinden taşınmaz. Ayrıntılar kurulum rehberindedir.

Canlıya dağıtım, mevcut siteyi değiştirme veya alan adı yönlendirmesi bu çalışmanın kapsamında yapılmaz.

# Orienta İstanbul — kaynak kod teslimi

## Cloudflare taşıma dalı

Mevcut tasarım korunarak Workers/D1/R2 ve Cloudflare Access uyarlaması hazırlandı.
Kurulum, güvenli giriş, özel içerik yedeği aktarımı, test ve geri dönüş adımları için
[Türkçe Cloudflare kurulum rehberini](CLOUDFLARE-KURULUM.md) okuyun.
`docs/` GitHub Pages yayını değişmez. Dağıtım veya alan adı yönlendirmesi otomatik yapılmaz.
`wrangler.jsonc` yalnızca test ortamı içindir; gerçek DB kimliği ve Access ayarları doldurulmalıdır.

Bu dalda `worker/auth.mjs` Sites başlıklarının yerini alır; `.openai/hosting.json` gerekli değildir.
Node 24+ ile `npm run build` ve `npm test`; kilitli Cloudflare aracı için `pnpm install --frozen-lockfile`
ve dağıtımsız paket kontrolü için `pnpm run cf:check` kullanılır.
Alttaki Sites açıklamaları özgün teslimatın tarihsel bağlamıdır; güncel taşıma işlemlerinde
yeni rehberi izleyin.

Bu depo ziyaretçi web sitesi, blog, içerik yönetim paneli (back-office) ve sunucu kodunu birlikte içerir. Mevcut ChatGPT Sites sürümünün kaynak kodudur; GitHub Pages için hazırlanmış bir statik site değildir.

## Dosyalar

| Konum | İşlev |
| --- | --- |
| `web/` | Web sitesi, üç dil, görseller ve blog görünümü |
| `web/admin/` | Back-office ekranı |
| `worker/api.mjs` | İçerik okuma, taslak/yayın kaydetme ve dosya yükleme |
| `worker/seo.mjs` | Sunucudan HTML, SEO etiketleri, yapılandırılmış veri, sitemap, robots |
| `drizzle/0000_cms.sql` | Veritabanı tablosunun kurulumu |
| `.openai/hosting.json` | Mevcut Sites kimliği ve DB/BUCKET bağlantı adları; yeni hosting yapılandırması değildir |
| `build-cms.cjs` | Kaynaktan Worker oluşturur |
| `test-cms.mjs`, `test-seo.mjs` | CMS ve SEO kontrolleri |
| `preview-worker.mjs` | Varsayılan içerikle yerel ziyaretçi görünümü; gerçek CMS/veritabanı sunucusu değildir |

## Yerel kontrol

Node.js 24 veya üzerini kurun. Bu klasörde terminal açın:

```sh
npm run build
npm test
npm run preview
```

Ön izleme: http://127.0.0.1:4175/?lang=tr . Yerel ön izleme verileri bellekte taklit eder ve yönetim paneli giriş/kayıt işlemlerini desteklemez. Canlı CMS için aşağıdaki altyapı kurulmalıdır. Build işlemi için üçüncü taraf npm paketi gerekmez. Üretilen `dist/server/index.js` Worker dosyasıdır; GitHub Pages giriş dosyası değildir.

## GitHub'a yükleme

1. GitHub'da örneğin `orienta-istanbul` adında **Private** bir repository oluşturun.
2. Bu klasörü GitHub Desktop ile yerel repository olarak ekleyin/oluşturun.
3. Commit ve Publish repository yapın. Otomatik olarak herkese açık depo seçmeyin.
4. Yüklenen kökte `package.json`, `web`, `worker`, `drizzle`, `.openai/hosting.json` ve `.gitignore` bulunduğunu kontrol edin. ZIP dosyasının kendisini yüklemek yerine klasör içeriğini yükleyin. Noktayla başlayan dosyalar da gereklidir.
5. `ozel-yedek` klasörünü GitHub'a yüklemeyin. Ayrı ve güvenli bir yerde saklayın.

GitHub'a yükleme canlı hosting veya mevcut Sites yayınıyla otomatik senkronizasyon kurmaz. Bu teslimatta GitHub Actions yayın bağlantısı ya da bir hosting hesabı kurulmamıştır.

## Mevcut hostingde kalma / başka yere taşıma

Mevcut Sites yayını korunabilir; GitHub yalnızca kaynak kod arşivi olarak kullanılabilir. Yeni bir GitHub deposu mevcut Sites kaynak deposunun yerine otomatik geçmez.

Harici yayın için uygun mimari: GitHub (kaynak) + Cloudflare Workers (sunucu) + D1 (içerik veritabanı) + R2 (fotoğraf/video). Bu seçim mevcut Worker koduyla uyumludur; hesaplar, kaynaklar, yapılandırma, kimlik doğrulama ve alan adı bağlantıları ayrıca kurulmalıdır. GitHub Pages tek başına back-office'i çalıştırmaz.

### Harici hosting için zorunlu güvenlik uyarlaması

Mevcut `worker/api.mjs` yönetici girişinde Sites tarafından doğrulanarak eklenen `oai-authenticated-user-*` başlıklarını kullanır. Bu güven sınırı Sites dışına taşınmaz. **Kodu bu haliyle açık bir Worker'a doğrudan yayımlamayın.** Dışarıdan gelen aynı adlı HTTP başlıklarına güvenmek yönetici taklidine yol açabilir.

Yeni sağlayıcıda imzası sunucuda doğrulanan bir oturum/JWT ve yönetici yetkilendirmesi uygulanmalı; `/api/admin/*` üzerindeki her istekte kontrol edilmelidir. `/admin` ekranının gizlenmesi tek başına koruma sağlamaz. ChatGPT giriş adresi de yeni giriş akışına göre değiştirilmelidir. Parola ve erişim anahtarlarını repository'ye koymayın; hostingin secret yönetiminde saklayın.

### Geliştirici için taşıma sırası

1. Yeni hosting hesabında D1 ve R2 oluşturun; bağlantı adlarını `DB` ve `BUCKET` olarak tanımlayın.
2. Yeni, boş veritabanında `drizzle/0000_cms.sql` dosyasını uygulayın.
3. Teslimattaki özel yedeğin `live-content.sql` dosyasını **yalnızca yeni, boş veritabanına** aktarın. Bu dosya mevcut kayıtların üzerine yazmaz.
4. Özel yedekte `media/uploads/` varsa dosyaları R2'ye `uploads/...` anahtarlarıyla yükleyin. Kod `/media/uploads/...` adreslerini bu anahtarlara eşler.
5. Yönetici girişini yukarıdaki güvenlik koşullarına göre uyarlayın; mevcut Sites başlıklarına güvenen denetimi değiştirin.
6. Worker dağıtım yapılandırmasını oluşturun: giriş `dist/server/index.js`, build `npm run build`, D1/R2 bağlantıları. `.openai/hosting.json` Cloudflare Wrangler ayarı yerine geçmez.
7. Staging ortamında giriş, yetkisiz istek reddi, taslak kaydı, yayınlama, JPEG/PNG/MP4 yükleme, üç dil, blog ve SEO yollarını test edin.
8. Alan adını ve HTTPS'i bağlayın. Ziyaretçi sayfalarını anonim erişime açın; yönetici API'sini korumalı tutun.
9. Yeni alan adına taşınmada eski URL yönlendirmelerini planlayın. Canonical ve sitemap adresleri isteğin alan adından üretilir; nihai alan adı üzerinden kontrol edin.
10. Search Console doğrulamasını panelde girin, `/sitemap.xml` gönderin. İçerikleri, iletişim alanlarını, TÜRSAB bağlantısını ve görsel kullanım haklarını tamamlayın.

## Günlük kullanım ve yedekleme

Kurulumdan sonra metin ve medya değişiklikleri `/admin` üzerinden yapılır; her içerik değişikliğinde GitHub'a kod yüklemek gerekmez. Kod değişiklikleri GitHub'da, içerik kayıtları D1'de, yüklenen dosyalar R2'de tutulur. Git deposu tek başına tam site yedeği değildir: veritabanı ve dosya deposunu ayrıca yedekleyin.

## Resmi başvuru kaynakları

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://developers.cloudflare.com/workers/runtime-apis/bindings/
- https://developers.cloudflare.com/workers/wrangler/configuration/

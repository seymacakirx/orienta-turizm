# Taşıma kontrolü — 26 Ekim 2026

Başlangıç: `main` / `c9acefd04c5933d1e68362b8ece1347f257729e6`.
Çalışma dalı: `cloudflare/migrate-existing-cms`.

## Başarılı yerel kontroller

- Node.js 24.22.1 ile derleme; tek Worker modülü üretildi.
- Mevcut CMS testleri: taslak/yayın ayrımı, kalıcı kayıt, revizyon çakışması, kaynak kontrolü ve dosya yükleme.
- Mevcut SEO testleri: 27 dil/sayfa birleşimi, canonical, yapılandırılmış veri, dil bağlantıları, yayımlanmamış blog dillerinin saklanması, sitemap ve 404.
- Yeni güvenlik testleri: gerçek RSA imzaları; sahte Sites/e-posta başlıkları; yanlış imza, süre, issuer, audience, kullanıcı, algoritma ve anahtar; eksik yapılandırma; sertifika sunucusu hatası; panel/statik yönetici dosyalarının korunması; CSRF.
- Hatalı içerik yapısı, zararlı nesne alanları, büyük istek, negatif revizyon, bozuk JSON/form, görsel boyutu ve JPEG/MP4 imza kontrolleri.
- Mevcut tablo üzerinde SQL kurulumunun tekrar çalıştırılması kayıtları koruyor.
- Cloudflare'ın gerçek yerel çalışma motoru (Wrangler bağımlılığı Miniflare/workerd): imzalı Access oturumu, D1 taslak/yayın ayrımı, PNG'nin R2'ye yüklenip okunması, MP4 kısmi yanıtı (`206`), normal medya yanıtı (`200`), yetkisiz panelin reddi.
- `git diff --check` temiz. `docs/`, ziyaretçi CSS/JS/içerik/logo dosyaları ve panel CSS'i başlangıçla aynı.

## Tamamlanması gereken kontroller

- `wrangler deploy --dry-run` başlatıldı; Windows çalışma alanı üst klasörü için esbuild “Erişim engellendi” hatası verdi. Ek okuma izninden sonra da aynı hata sürdü. Bu kontrol başarılı olarak raporlanmıyor. PR iş akışına Linux üzerinde aynı dağıtımsız kontrol eklendi; GitHub'a gönderilince sonucu ayrıca incelenmeli.
- Cloudflare hesabına bağlanılmadı; gerçek D1 şeması/kimliği, R2 kovası, Access uygulaması ve yetki politikaları doğrulanmadı. Yerel motor testinde geçici kaynaklar ve yalnızca test için üretilen RSA anahtarları kullanıldı.
- Gerçek Access giriş/çıkış ekranı, gerçek dosyalarla 40 MB video yükleme, CPU/bellek kotası ve mobil/masaüstü tarayıcı kabul testi yapılmalı.
- Özel live/draft yedeği ve yüklenen medya teslim edilmedi; gerçek veri aktarımı ve geri yükleme testi yapılmadı.
- GitHub bağlantısı son kontrolde depo için `push: false` bildiriyordu. Uzak dal ve Pull Request, yazma erişimi verilince oluşturulmalı.

Hiçbir canlı site dosyası yayımlanmadı; Cloudflare dağıtımı, uzak D1/R2 yazımı veya alan adı yönlendirmesi yapılmadı.

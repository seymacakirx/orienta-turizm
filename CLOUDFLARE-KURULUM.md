# Orienta Turizm — mevcut paneli Cloudflare'a taşıma

Bu çalışma yeni site oluşturmaz. `web/admin/` ekranları ve sitenin tasarımı korunur. GitHub Pages'in `docs/` klasörü değiştirilmez. Alan adı eklenmez; otomatik dağıtım kurulmaz. Aşağıdaki uzak kaynak işlemleri ancak site sahibinin ayrıca dağıtım/veri aktarımı onayından sonra uygulanmalıdır.

## 1. Hazırlananlar ve sınırlar

- Mevcut ana sayfa, yedi hizmet, iletişim, logo, galeri, üç dil, blog ve SEO düzenleme ekranları korunur.
- Taslağı kaydet D1'de `draft`, Yayımla `live` kaydını günceller. Aynı sürümü iki sekmeden kaydetme çakışması reddedilir.
- PNG/JPEG en fazla 8 MB, MP4 en fazla 40 MB; dosyalar R2'ye kaydedilir. Yükleme bittikten sonra ayrıca Yayımla gerekir. Desteklenmeyen biçimler reddedilir.
- Yönetici oturumlarını Cloudflare Access yönetir. Sunucu her yönetici isteğinde RSA imzasını, veren hesabı, uygulama kimliğini, süreyi ve yetkili e-postayı doğrular. Eski Sites başlıkları kabul edilmez.
- Şifre veritabanı veya ortak yönetici parolası yoktur. E-posta adresleri `ADMIN_EMAILS` gizli değişkeninde tutulur.
- Eksik Access ayarları yönetici erişimini kapatır. Ziyaretçi sayfaları Access'e zorunlu bağlı değildir.
- Test ortamında arama motorlarına `noindex` başlığı ve robots engeli gönderilir; bunlar erişim kontrolü yerine geçmez.
- Yüklenen medya URL'sini bilen kişi dosyayı açabilir. Taslak metinleri gizlidir; R2 yüklemeleri gizli belge deposu olarak kullanılmamalıdır.

## 2. Önce yedek: içerik kaybını önleme

GitHub kaynak kodu, Sites'ta sonradan kaydedilen içeriklerin yedeği değildir. Depoda canlı SQL yedeği ve `uploads/` dosyaları bulunmuyor. Yöneticinizden mevcut Sites sisteminin **live ve draft kayıtlarını**, revizyonlarını ve yüklenen tüm medya dosyalarını özel bir kanaldan alın. Bunları GitHub'a koymayın. `ozel-yedek/` ve `backups/` zaten Git dışında tutulur.

1. Eski yayını açık bırakın; son aktarım sırasında içerik düzenlemeye kısa ara verin.
2. Eski sistemin veritabanını ve medyasını tarihli, bağımsız iki kopyayla yedekleyin. SQL'in yalnızca örnek içerik değil gerçek canlı içerik olduğunu panelle karşılaştırın.
3. Cloudflare'daki mevcut `orienta-turizm-db` veritabanını da dışa aktarın. İçinde veri varsa doğrudan içe aktarım yapmayın. Ayrı bir test D1 veritabanı oluşturup Wrangler'da onun adını ve kimliğini kullanın.
4. D1 Console'da şu salt okunur sorguları çalıştırın:

```sql
PRAGMA table_info(cms_documents);
SELECT id, revision, updated_at, length(content) AS content_length FROM cms_documents;
```

Beklenen sütunlar: `id` TEXT PRIMARY KEY, `content` TEXT NOT NULL, `revision` INTEGER NOT NULL DEFAULT 0, `updated_at` TEXT NOT NULL. Sadece tablo adının aynı olması yeterli değildir. Fark varsa tabloyu silmeyin; geliştiriciniz yedek üzerinde eşleştirme hazırlamalıdır.

5. Tablo yoksa `drizzle/0000_cms.sql` ile oluşturun. `IF NOT EXISTS` mevcut kayıtları silmez; hatalı sütunları da kendiliğinden düzeltmez.
6. **Boş hedef tabloda**, incelemeden geçirilmiş özel SQL yedeğini içe aktarın. `DROP`, `DELETE` veya `INSERT OR REPLACE` içeren bir yedeği kontrolsüz kullanmayın. Var olan `live`/`draft` kayıtlarının üzerine yazmayın. Yalnızca live yedeği varsa panel ilk açılışta live içeriğini kullanır; ilk kayıtta draft oluşturur.
7. Medyayı yeni R2 kovasına aynı anahtarla yükleyin: `media/uploads/abc.jpg` dosyası kovada `uploads/abc.jpg` olmalı. İçerikteki adres `/media/uploads/abc.jpg` kalır. Kaynak ve hedef dosya sayısı, boyutu ve SHA-256 özetlerini karşılaştırın. Mevcut sunucu yalnızca `uploads/` altında küçük harfli onaltılık/tireli dosya adlarını ve png/jpg/mp4 uzantılarını sunar; eski adlar farklıysa aktarım eşleştirmesi gerekir.
8. Eski Sites alan adına tam URL veren medya adreslerini ayrıca listeleyin. Kaynak alan adını koruyarak test edin; yerel `/media/uploads/...` adreslerine dönüştürmek gerekiyorsa bunu yalnızca yedek kopyada, eşleştirme listesiyle yapın. Unsplash gibi mevcut harici görseller otomatik kopyalanmaz.
9. Üç dilde metin, yedi hizmet, blog sayısı, draft/live ayrımı, revizyonlar ve tüm medya bağlantılarını karşılaştırın. Eski ve yeni yedekleri saklayın.

## 3. Cloudflare'da gerekli ayarlar

Bu aşamada Natro'da işlem yapmayın; `orientatourism.com` alan adını bağlamayın.

1. **Workers & Pages:** test Worker adı `orienta-turizm-staging`. Gerçek adres Cloudflare'ın hesabınıza verdiği `workers.dev` adresi olacaktır; henüz oluşturulmuş bir adres yoktur.
2. **D1:** `orienta-turizm-db` sayfasındaki Database ID değerini alın. `wrangler.jsonc` içindeki sıfırlardan oluşan `database_id` yerine yazın. Bu kimlik parola değildir. Test için ayrı veritabanı kullanılıyorsa adını da değiştirin. Bağlantı adı kesinlikle `DB` olsun.
3. **R2:** `orienta-turizm-media-staging` adlı Standard kova oluşturun; bağlama adı `BUCKET`. Genel `r2.dev` erişimini açmanız gerekmez. Worker aynı alan adından dosya sunar; R2 CORS kuralı veya tarayıcıya R2 anahtarı gerekmez.
4. **Zero Trust / Access:** hesabın takım alan adını belirleyin; örneğin `https://takiminiz.cloudflareaccess.com`. Sondaki `/` olmadan `ACCESS_ISSUER` alanına yazın.
5. Test Worker'ının `workers.dev` adresini Access ile koruyun. Test aşamasında **tüm test adresini** korumak uygundur. Access'in uygulama ekranında yalnızca yetkili kişilerin tam e-posta adreslerine izin veren bir Allow kuralı oluşturun. `Everyone`, Bypass veya genel e-posta alan adı izni kullanmayın.
6. Giriş yöntemi olarak e-posta ile tek kullanımlık kod veya kuruluşunuzun Google/Microsoft girişini seçin. Hesabınız destekliyorsa çok faktörlü doğrulama kullanın. Uygulama oturum süresini örneğin bir saat yapın.
7. Aynı Access uygulamasının **Application Audience (AUD)** değerini Wrangler'daki `ACCESS_AUD` alanına yazın. Bu bir gizli anahtar değildir.
8. Worker Settings → Variables and Secrets bölümünde `ADMIN_EMAILS` adlı **Secret** ekleyin. İçine yetkili e-postaları virgülle ayırarak yazın. Access Allow listesiyle aynı kişileri içersin. Bu değeri GitHub'a veya sohbete yazmanız gerekmez.
9. `STAGING` değeri `true` kalsın. Önizleme URL'leri kapalıdır. GitHub otomatik üretim/önizleme dağıtımlarını açmayın; dalın gönderilmesi dağıtımı tetiklememelidir.

Wrangler dosyası D1 ve R2 kaynaklarını oluşturmaz. Gerçek Database ID, Access ayarları ve e-posta listesi özellikle boş bırakılmıştır. Hiçbir hesap kimliği tahmin edilmemiştir.

## 4. Geliştiriciniz için yerel kontroller

Node.js 24+ ve depoda belirtilen pnpm sürümüyle:

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm run test:runtime
pnpm run cf:check
```

`cf:check` yalnızca `wrangler deploy --dry-run` çalıştırır: yükleme/dağıtım yapmaz. Derleyici tek bir Worker modülü üretir; Sites'a ait eksik `.openai/hosting.json` dosyasına ihtiyaç yoktur. `npm run build` ve `npm test` de Node kurulu bir bilgisayarda kullanılabilir; bağımlılık kurulumu için kilit dosyalı pnpm tercih edilmiştir.

`test:runtime` Cloudflare'ın yerel motorunda geçici D1/R2 ile çalışır; gerçek hesap kaynaklarına erişmez. PR kontrol iş akışı yalnızca bu testleri ve dağıtımsız paket kontrolünü çalıştırır; canlı yayın adımı içermez.

Ziyaretçi görünümü için `pnpm run preview`: `http://127.0.0.1:4175/?lang=tr`. Bu örnek önizleme gerçek D1/R2 ve yönetici girişi içermez. Güvenliği atlatan yerel yönetici anahtarı eklenmemiştir. Gerçek giriş testi Access korumalı test ortamında yapılır.

Site sahibi dağıtımı ayrıca onayladıktan sonra geliştirici `pnpm exec wrangler login`, doğru hesap kontrolü, kaynak/secret ayarları ve `pnpm exec wrangler deploy` adımlarını uygulayabilir. Bu komut şu çalışmada çalıştırılmadı. Test ortamının da dağıtımı için onay gerekir.

## 5. Panele nasıl gireceksiniz?

Test yayını onaylanıp Access ayarları tamamlandığında test adresinin sonuna `/admin` ekleyin. Cloudflare giriş ekranı gelir. Yetkili e-postanızla giriş yapın; tek kullanımlık kod seçildiyse e-postanıza gelen kodu yazın. Sonra yöneticinizin hazırladığı mevcut panel açılır.

- Soldan bölüm, üstten Türkçe/English/Русский seçilir.
- **Taslağı kaydet:** içerik sunucuda saklanır, ziyaretçi yayını değişmez.
- **Yayımla:** önce taslak kaydedilir, ardından ziyaretçilerin göreceği sürüm güncellenir.
- Blogda ilgili dilin hazır alanı `evet` olmalı; başlık, özet ve en az bir metin bölümü gereklidir.
- **Çıkış:** Cloudflare Access oturumunu kapatır. Kimlik sağlayıcınız açık kaldıysa sonraki giriş otomatik olabilir; ortak bilgisayarda sağlayıcı hesabından da çıkın.
- Oturum biterse paneldeki işlem hata verir. Kaydedilmemiş metni kopyalayıp `/admin` adresinden tekrar giriş yapın.

## 6. Test ortamında kabul kontrolü

- İzinli e-posta giriş yapabilmeli; farklı e-posta ve oturumsuz istekler panel/API'ye erişememeli.
- Ana sayfa ve yedi hizmet, üç dilde masaüstü ve telefonda kontrol edilmeli; logo, menü ve galeri karşılaştırılmalı.
- Metin/iletişim/SEO değişikliği önce taslakta görünmeli, yayımlandıktan sonra sitede görünmeli.
- Aynı içeriği iki sekmeden kaydetmek çakışma mesajı vermeli.
- Gerçek JPEG, PNG ve MP4 yükleme, oynatma ve video ileri sarma denenmeli. Büyük dosyalarla bellek/CPU kullanımı ölçülmeli.
- Blog ekleme, düzenleme, dil bazında hazır işareti, yayımlama ve kaldırma; canonical/sitemap/404 kontrol edilmeli.
- Yeniden Worker dağıtımında D1 içerikleri ve R2 dosyaları korunmalı; yedekten geri dönüş ayrı boş veritabanında denenmeli.

## 7. Ücretsiz plan yeterli mi?

Düşük trafikte ücretsiz kotalarla başlamak mümkün olabilir; garanti değildir. 26 Ekim 2026'da kontrol edilen sınırlar: Workers günde 100.000 istek ve istek başına 10 ms CPU; D1 günde 5 milyon satır okuma, 100.000 satır yazma ve toplam 5 GB; R2 Standard ayda 10 GB-ay depolama, 1 milyon A ve 10 milyon B işlemi ücretsiz kota içerir. Bu uygulamada CSS/JS ve medya istekleri de Worker'dan geçer. R2 ücretsiz kotası ücretli kullanımın üst sınırı değildir; aşım ücretlenebilir. R2 etkinleştirirken ödeme bilgisi istenebilir. Access planınızı kullanıcı sayısına göre kontrol edin. Gerçek içerikle SSR ve 40 MB video yüklemesinin CPU/bellek ölçümleri test ortamında yapılmadan ücretsiz planın yeterli olduğu söylenemez.

Resmi kaynaklar:

- [Workers limitleri](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 ücretlendirme](https://developers.cloudflare.com/d1/platform/pricing/)
- [R2 ücretlendirme](https://developers.cloudflare.com/r2/pricing/)
- [Access JWT doğrulaması](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Wrangler yapılandırması](https://developers.cloudflare.com/workers/wrangler/configuration/)

## 8. Canlı yayından önce kalanlar

Site sahibinin PR incelemesi; gerçek içerik ve medya yedeklerinin teslimi; mevcut D1 şemasının doğrulanması; hesap kaynakları ve Access kurulumu; ayrıca onaylı test dağıtımı; test listesinin gerçek Cloudflare ortamında tamamlanması; son veri aktarımı ve geri dönüş provası gerekir.

Ancak bunlar tamamlandıktan ve ayrıca onaylandıktan sonra üretim için ayrı Worker/D1/R2 ayarları hazırlanır. Üretimde Access **yalnızca `/admin`, `/admin/*`, `/api/admin` ve `/api/admin/*`** yollarını aynı Access uygulamasında korumalı; ziyaretçi yolları açık kalmalıdır. Üretim uygulamasının kendi AUD değeri kullanılır. Alternatif workers.dev/preview adresleri kapatılır veya aynı korumaya alınır. `STAGING=false` yapılır; robots/noindex, canonical ve sitemap nihai alan adında doğrulanır.

Natro DNS değişikliği ayrı onay gerektirir. Mevcut MX ve e-posta kayıtları korunmalı; DNS değişikliğinden önce mevcut kayıtlar yedeklenmelidir. GitHub Pages yayını geçiş boyunca açık kalır. Sorun halinde trafik önceki yayına döndürülür; yeni sistemde yazılan içerikler yedeklenmeden eski veritabanı üzerine geri yükleme yapılmaz.

# Kart eklemeden Orienta Turizm paneli kurulumu

Mevcut panel korunmuştur. Bu sürüm yalnızca **Workers Free + mevcut D1** kullanır. Access, Zero Trust ve R2 etkinleştirmeyin; kart isteyen bu ekranlara ihtiyacınız yoktur. Hesabınızda Workers/D1 için ayrı bir hesap doğrulama kısıtı çıkarsa bunu kod değiştiremez; ücretli plana geçmeden Cloudflare destek bilgisiyle kontrol edin.

Bu rehber önceki Access/R2 talimatlarının yerini alır. Şu ana kadar dağıtım veya uzak veritabanı değişikliği yapılmadı. Aşağıdaki test yayını ve SQL değişiklikleri, siz ayrıca onayladıktan sonra uygulanmalıdır. Natro ve canlı alan adı ayarları değişmez.

## 1. Yedek alın

D1'daki `orienta-turizm-db` veritabanını ve eski sistemin live/draft içeriklerini yedekleyin. Eski yüklenen fotoğraf/videoları da ayrı saklayın. `cms_documents` tablosunu silmeyin veya boşaltmayın. `live` yayındaki içerik, `draft` taslaktır; revizyonları da koruyun.

Mevcut D1 Console'da şu okuma sorgusuyla yapıyı kontrol edin:

```sql
PRAGMA table_info(cms_documents);
SELECT id, revision, updated_at FROM cms_documents;
```

Beklenen sütunlar `id` (TEXT primary key), `content` (TEXT), `revision` (INTEGER), `updated_at` (TEXT). Farklıysa önce geliştiricinizle yedek üzerinde eşleştirin. Başka bir canlı site bu D1'i kullanıyorsa testte Yayımla'ya basmak onu etkileyebilir: o durumda test için yedekten ayrı D1 kopyası kullanın. Mevcut GitHub Pages sitesi D1 kullanmaz ve bu dalda `docs/` dosyaları değiştirilmez.

## 2. D1'e yalnızca giriş tablolarını ekleyin

Mevcut `cms_documents` doğru yapıdaysa yeniden oluşturmanıza gerek yok. Cloudflare → D1 → `orienta-turizm-db` → Console ekranında **`drizzle/0001_admin_auth.sql` dosyasının tamamını** çalıştırın. Bu işlem `admin_sessions`, `admin_login_limits` ve indekslerini ekler. İçerik tablosuna dokunmaz. Tekrar çalıştırmak kayıtları silmez.

Geliştiriciniz komutla yapacaksa, yalnızca ayrı onayınızdan sonra:

```sh
pnpm exec wrangler d1 execute orienta-turizm-db --remote --file=drizzle/0001_admin_auth.sql
```

Yeni ve boş bir veritabanı kullanılıyorsa önce `drizzle/0000_cms.sql`, sonra `0001_admin_auth.sql` uygulanır. Eski içerik yedeği yalnızca kontrol edilmiş boş hedefe aktarılır; var olan live/draft üzerine otomatik yazılmaz.

## 3. Yönetici giriş anahtarınızı bilgisayarınızda oluşturun

Proje klasöründe Node.js 24 veya üzeri kurulu bir bilgisayarda şu komutu çalıştırın; yöneticiniz bunu sizin bilgisayarınızda yapabilir:

```sh
node scripts/create-admin-key.mjs
```

Komut `backups/admin-setup-...txt` adlı özel bir dosya oluşturur ve sadece konumunu gösterir. Dosyada üç bilgi vardır:

- **Kullanıcı adı:** `yonetici`
- **Giriş anahtarı:** panele girerken kullanacağınız uzun değer
- **Secret değeri:** Cloudflare'a kopyalanacak farklı bir doğrulama değeri

Giriş anahtarını parola yöneticinize kaydedin. Kendi kısa parolanızla değiştirmeyin; bu sistem rastgele üretilen 256 bit anahtar için tasarlanmıştır. Dosyayı GitHub'a veya sohbete göndermeyin. `backups/` Git dışında tutulur; bilgisayarınızdaki dosyanın paylaşım izinlerini de özel tutun. Anahtar oluşturmak Cloudflare'a bir şey göndermez.

## 4. Worker ayarlarını hazırlayın

1. Workers & Pages içinde **Free** planı kullanın. Test Worker adı: `orienta-turizm-staging`.
2. D1 sayfasındaki **Database ID** değerini `wrangler.jsonc` içindeki sıfırlardan oluşan `database_id` yerine yazın. Ad `orienta-turizm-db`, bağlantı adı **`DB`** kalsın. R2/BUCKET bağlantısı eklemeyin.
3. Worker → Settings → Variables and Secrets bölümüne **Secret** türünde `ADMIN_KEY_SHA256` ekleyin. Özel dosyanızdaki **Secret değeri**ni yapıştırın. Giriş anahtarını bu alana yapıştırmayın.
4. Normal değişkenler `ADMIN_USERNAME=yonetici` ve `STAGING=true`. Kullanıcı adını değiştirmek isterseniz `ADMIN_USERNAME` değerini değiştirin; bu eski oturumları da geçersiz kılar.
5. Önceki ayarlardan kalan `ACCESS_ISSUER`, `ACCESS_AUD`, `ADMIN_EMAILS` artık kullanılmaz; test Worker'ından kaldırılabilir. Eski Access uygulaması test adresini koruyorsa, yalnızca bu test adresine ait Access korumasını yeni giriş yayına alındıktan sonra kaldırın.
6. Otomatik Cloudflare Git dağıtımını/branch preview dağıtımını açmayın. Dalın GitHub'a gönderilmesi test veya canlı yayını tetiklememeli.

Worker henüz yoksa geliştiriciniz ilk onaylı test dağıtımıyla oluşturur, ardından dashboard'da Secret'ı kaydeder. Bu arada giriş eksik yapılandırma nedeniyle kapalı kalır; varsayılan/arka kapı parolası yoktur. Alternatif olarak test Worker'ı için `pnpm exec wrangler secret put ADMIN_KEY_SHA256` kullanılabilir; bu da uzak değişikliktir ve ayrıca onay gerektirir.

## 5. Önce yerel kontroller, sonra ayrıca onaylı test yayını

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm run test:runtime
pnpm run cf:check
```

Bunlar canlıya dağıtım yapmaz. `test:runtime` geçici yerel D1 kullanır. `cf:check` paket kontrolüdür. Siz test dağıtımına ayrıca onay verdiğinizde geliştiriciniz doğru Cloudflare hesabında `pnpm exec wrangler deploy` çalıştırabilir. Bu çalışmada bu komut çalıştırılmamıştır.

Test adresi Cloudflare'ın vereceği `https://orienta-turizm-staging.<hesabınız>.workers.dev` biçiminde olur. Gerçek adresi dashboard'dan kopyalayın; Natro alan adını henüz bağlamayın. `STAGING=true` arama motorlarına indekslememe talimatı verir; test ziyaretçi sayfaları gizli değildir. Gerçek özel içerikleri genel test sayfalarında yayımlamayın.

## 6. Panele nasıl gireceksiniz?

Test adresinin sonuna `/admin` ekleyin. Giriş ekranında kullanıcı adınızı ve özel dosyanızdaki **giriş anahtarını** yazın. HTTPS zorunludur. Girişten sonra mevcut panel açılır:

- Taslağı kaydet: değişikliği D1'e kaydeder; ziyaretçi içeriğini değiştirmez.
- Yayımla: taslağı kaydeder, ardından yayındaki içeriği günceller.
- Blog: üç dilde yazı ekleme/düzenleme korunur. İlgili dilde başlık, özet, metin bölümü ve `evet` hazır işareti gerekir.
- Ana sayfa, hizmetler, SEO ve iletişim alanları aynı yerlerdedir.
- Dosya seçme alanı kapalıdır. Mevcut görsel gösterilir; gerekli olursa dosya adresini elle değiştirebilirsiniz.
- Çıkış: oturumu sunucudan siler. Tarayıcıdaki eski çerez tekrar kullanılamaz.

Oturum 8 saat sonunda veya 30 dakika işlem yapılmazsa sona erer. Uzun metin yazarken ara sıra Taslağı kaydet kullanın. Oturum sonlanırsa kaydetmediğiniz metni kopyalayıp yeniden giriş yapın. 15 dakikada IP başına 5, tüm girişler için 50 deneme sınırı vardır; başarılı girişler de sayılır. Sınır dolarsa 15 dakika bekleyin. Aynı interneti kullanan yöneticiler IP sınırını paylaşır. Yoğun saldırı girişleri geçici olarak engelleyebilir; D1 kotaları da sınırlıdır.

Anahtar kaybolursa e-posta ile sıfırlama yoktur. Anahtar üretme komutunu tekrar çalıştırıp yeni **Secret değeri**ni Cloudflare'a kaydedin. Eski anahtar ve oturumlar geçersiz olur. D1'in `cms_documents` kayıtlarını değiştirmeyin. D1 yedeğinden geri yükledikten sonra `admin_sessions` ve `admin_login_limits` kayıtlarını temizleyin; eski oturumları canlandırmayın.

## 7. Fotoğraflar ve videolar kaybolmasın

Bu değişiklik hiçbir içerik kaydını veya mevcut görsel adresini silmez. Yükleme uç noktası, mevcut bir BUCKET bağlantısı bulunsa bile yazma yapmaz.

- Depodaki logo ve statik görseller çalışmaya devam eder.
- Mevcut https görsel/video adresleri aynen korunur; kaynak sunucunun açık kalması gerekir.
- `/media/uploads/...` adresleri yalnızca eski R2/Sites deposunda bulunan bir dosyayı gösteriyorsa dosya bu depoda bulunmayabilir. **Adresin korunması, dosyanın taşındığı anlamına gelmez.** Eski kaynağı kapatmayın.
- Eski dosyalar herkese açık bir HTTPS sitede aynı `/media/uploads/...` yoluyla erişilebiliyorsa geliştiriciniz `LEGACY_MEDIA_ORIGIN` normal değişkenini o sitenin yalnızca kök adresiyle ayarlayabilir. Örnek biçim `https://eski-site.example`; gerçek adres doğrulanmalı. Worker dosyaları kopyalamaz, o kaynağa yönlendirir. Kendisine dönen veya karşılıklı yönlendirme yapan adres kullanmayın.
- Küçük mevcut dosyalar geliştirici tarafından `web/media/uploads/` altına aynı adlarla konabilir. Derleyici png/jpg/mp4 türlerini sunar. Bu panelden yükleme değildir; video dahil büyük arşivler Worker paket/bellek sınırlarına takılabilir. Dosyalar GitHub'a konursa deponuz herkese açık olduğundan genel erişilebilir olur; özel dosya koymayın.

Eski dosya yedekleri verilmediği için bu çalışmada eksik medyanın fiziksel taşınması yapılmadı. Önce eski/new adresleri ve dosya sayısı/boyut/özetlerini karşılaştırın, sonra eski kaynağı kapatma kararı alın.

## 8. Ücretsiz plan sınırları ve yayından önce kalanlar

Bu sürümde Access/R2 kaydı veya ödeme yöntemi isteyen başka bir kimlik hizmeti yoktur. Workers ve D1 ücretsiz kotalarla kullanılabilir. Trafik/CPU ve D1 sorgu sınırları vardır; sınırsız kullanım garantisi değildir. Ücretsiz kota dolunca hizmet kesilebilir; otomatik ücretli plana geçmek gerekmiyor. Gerçek içerik ve trafik yüküyle test edin.

Kaynaklar (26 Ekim 2026): [Workers planları](https://developers.cloudflare.com/workers/platform/pricing/), [D1 ücretlendirme](https://developers.cloudflare.com/d1/platform/pricing/), [Workers limitleri](https://developers.cloudflare.com/workers/platform/limits/).

PR #1 incelemesi, D1 yedeği/şema kontrolü, yeni oturum tabloları, Secret kurulumu ve ayrıca onaylı test yayını kalıyor. Testte giriş/çıkış, hatalı giriş sınırı, üç dil, taslak/yayın ayrımı, blog, medya adresleri ve telefon görünümü kontrol edilmeli. Alan adı ve gerçek üretim yayını daha sonra ayrı onayla yapılır. GitHub Pages ve mevcut DNS bu aşamada aynı kalır.

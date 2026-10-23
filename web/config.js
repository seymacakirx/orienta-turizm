// Kendi dosyalarınızı assets klasörüne koyun. JPEG, PNG ve MP4 desteklenir.
window.SITE_CONFIG = {
  pageTitle:'Orienta İstanbul', metaDescription:'İstanbul’da rehberli geziler ve size özel deneyimler.', heroSideText:'41°00′ N · 28°58′ E — ISTANBUL', footerPlace:'ISTANBUL · TÜRKİYE', brand: 'ORIENTA', brandSubtitle: 'İSTANBUL TURİZM',
  logo: '/assets/orienta-logo.png', // Örnek: /assets/logo.png
  video: '', // Örnek: /assets/istanbul-20sn.mp4 (yaklaşık 20 saniyelik dosya)
  videoLoopSeconds: 20,
  poster: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=2200&q=85',
  companyName: '', address: '', phone: '', email: '',
  instagram: '', facebook: '',
  tursabImage: '', tursabUrl: '',
  contacts: {whatsapp: '', telegram: '', viber: '', max: ''},
  // Ülke kodu döndüren sunucu uç noktası önerilir: {country_code:'TR'}.
  // Harici servis ziyaretçinin IP adresini alır. Hata halinde tarayıcı diline dönülür.
  geoEndpoint: '/api/geo',
  // Hizmet slug'ına göre resim/video/içerik değiştirilebilir.
  // Örnek: services: {guide: {image:'/assets/gezi.jpg', gallery:['/assets/1.jpg','/assets/2.png'], tr:{title:'Başlık',spot:'Spot',summary:'Özet',leftTitle:'...',leftText:'...',rightTitle:'...',rightText:'...',storyTitle:'...',storyText:'...'}}}
  services: {}
};

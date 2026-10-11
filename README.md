# Saturn — Steam Game Add · Windows 1.5.0

Windows x64 için taşınabilir Electron uygulaması. Satürn animasyonu ve canlı yıldız dokusu tüm pencereye yayılır; oyun galerisi ve panellerin arkasında da devam eder.

## Açma

Hızlı açılış için üst klasördeki Saturn.lnk kısayolunu aç. Taşınabilir paket için Saturn-Game-Add-1.5.0-Windows.exe dosyasını çift tıkla. Kurulum gerekmez. Paket dijital olarak imzalanmamıştır.

## Steam kataloğu

- Paket yerel bir Steam oyun kataloğu taşır.
- Canlı mağaza araması ve sayfalama, mevcut kaynaklarda bulunan oyunları sorgular. Tarama sürerken yüklenen sayı `+` ile alt sınır olarak gösterilir; tarama tamamlandığında toplam kesindir.
- Aynı anda en fazla 60 kart gösterilir; Sonraki/Önceki düğmeleriyle katalog gezilir.
- Arama yazarken otomatik çalışır; Steam yanıt vermez veya tam eşleşme bulamazsa yerel katalogdan yakın yazım eşleşmeleri gösterilir.
- Uygun oyunlarda 600×900 Steam kitaplık kapağı kullanılır. Portre yoksa mağaza görselleri denenir; yatay görsel oranı korunarak tam gösterilir, arkada bulanık dolgu bulunur.
- Kayıtlı kapak adreslerinin tamamı başarısız olursa güncel mağaza görseli Steam ayrıntılarından alınır, yüklenebildiği doğrulanır ve oyun kaydına saklanır. Aynı oyun için eşzamanlı istekler paylaşılır.
- Ekleme kuyruğu katalog üstündeki sayaçtan veya seçilen karttan açılır; oyunların üzerinde ortalanır ve dışarı tıklama ya da Escape ile kapanır. Kapalıyken oyun galerisi tüm genişliği kullanır. Katalog başlığı ekranın üstüne kaydırıldığında aynı kuyruk butonu sağ alt köşeye sabitlenir; sayaç ve klavye odağı korunur.
- Oyun adı, App ID veya Steam bağlantısı kullanılır. App ID sorgusu mağaza adını, türünü ve kapak bilgisini alır.
- Aksiyon, RPG, bağımsız ve favori filtreleri; isim sıralaması; kuyruk ve yerel kütüphane bulunur.
- Canlı arama ve yeni kapaklar internet gerektirir. Bağlantı kesilirse yerel katalog kullanılır.
- Mağaza yanıtında tekil App ID taşımayan paketler oyun kartlarına dönüştürülmez.

## İşlem kapsamı

Kuyruğu çalıştırmak yerel Steam kurulumundaki oyun dosyalarıyla çalışır. Başarılı eklemeler oyun yönetimine ve geçmişe kaydedilir; başarısız eklemeler hata bilgisiyle kuyrukta tutulur. Mağazada ayrıntısı bulunmayan bir App ID de kuyruğa alınabilir.

## Kumanda

DualShock 4 / DualSense doğrudan `node-hid`, Xbox ise yerel Windows XInput ile bağlanır. Üst çubuktaki kumanda simgesinden bağlantı durumunu ve tuşları görebilirsin. Y / △ sanal klavyeyi açar; A / ✕ seçer, B / ○ geri döner. Kumandayla dosya seçimi ve oyun silme onayı da uygulama içinde yapılır. Kullanım, bağlantı türleri ve test sınırları CONTROLLERS.md içindedir.

## Kaynak kod

Node.js ile bu klasörde npm ci, ardından npm start çalıştır. Tarayıcı önizlemesi için npm run preview kullan ve http://127.0.0.1:4173 adresini aç. index.html dosyasını doğrudan açmak yerel katalogla çalışır.

Windows paketini npm run dist:win ile üret; çıktı bu klasördeki dist dizinine yazılır.

Kurulum sihirbazı için `npm run dist:setup` çalıştır. `Saturn-Game-Add-1.5.0-Setup.exe` kurulum klasörünü seçtirir, masaüstü ve Başlat menüsü kısayollarını oluşturur. Kaldırma işlemi kullanıcı verilerini korur.

- index.html / style.css: arayüz ve duyarlı düzen
- app.js: katalog, kuyruk, tercihler ve tek video kaynağından canlı canvas arka planı
- controller-core.js / controller-ui.js: kumanda tuşları, odak, sanal klavye ve uygulama içi dosya seçimi
- electron/controllers.cjs: PlayStation HID bağlantısı ve Windows XInput servisi
- catalog-data.js: gerçek Steam mağaza kayıtlarının yerel anlık görüntüsü
- electron/steam-catalog.cjs: yalnızca Steam mağazasını sorgulayan arama/metadata servisi
- electron/main.cjs / preload.cjs: izole Electron penceresi ve dar IPC arayüzü
- server.mjs: yerel tarayıcı önizlemesi, aynı katalog servisi ve video byte-range desteği
- assets/: sağlanan video, yerel kapaklar, yazı tipleri, lisanslar ve kaynak kaydı

## Düzeltilen sorunlar

Geniş ekran kesilmesi, Satürn/başlık çakışması, gri panel zeminleri, dar/kısa pencere düzeni, Türkçe/İngilizce I–i araması, yazım hatalarında eşleşme sıralaması, kuyruk klavye odağı ve animasyon durumu düzeltildi. Kapaklar dikey kartlarda gösterilir; yatay görseller kırpılmaz. Pencere kullanılabilir Windows ekran alanına sığar. Azaltılmış hareket tercihi ilk açılışta uygulanır; görünmeyen pencerede video ve çizim durur. Son hata taramasının bulguları BUG_HUNT.md dosyasındadır.

## Kontroller

`npm run check` sözdizimini, `npm test` katalog ve Steam yeniden başlatma hata senaryolarını kontrol eder. `npm run test:ui`, Playwright ve Microsoft Edge ile arayüz senaryolarını çalıştırır. Playwright yerel araçlarında bulunuyorsa `SATURN_PLAYWRIGHT_MODULE` değişkeni modül yolunu gösterebilir. Testler Steam işlemlerini sahte yanıtlarla yürütür; gerçek oyun dosyalarını değiştirmez.

`npm run test:covers` eski kapak adreslerinin yenilenmesini, yatay görsel oranını, kayıtların yeniden açılışta korunmasını ve kapak servisi hata verdiğinde güvenli devam etmeyi kontrol eder.

## Kaynaklar

Katalog ve yeni kapaklar Steam mağazası ve Steam içerik sunucusundandır. Satürn videosu kullanıcı tarafından sağlandı. Manrope ve Rajdhani yazı tipleri SIL Open Font License ile paketlenir. Kaynak ayrıntıları assets/provenance.json içindedir. Steam mağaza arayüzü değişirse canlı sorgu çalışmayabilir; yerel katalog kullanılmaya devam eder.

Performans değişiklikleri ve kontrol ölçümleri PERFORMANCE.md dosyasındadır.

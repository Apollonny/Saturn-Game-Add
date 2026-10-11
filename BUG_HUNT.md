# Hata taraması — 10 Ekim 2026

Mevcut Windows uygulaması üzerinde işlevsel hata taraması yapıldı. Satürn teması ve yatay kapakların oranı korundu.

| Bulgu | Düzeltilen davranış |
| --- | --- |
| Başarısız eklemeler kuyruktan siliniyordu | Başarılı oyunlar çıkarılır; hatalı oyunlar hata bilgisiyle yeniden denemek için kalır. IPC bağlantısının kopması da yakalanır. |
| Silme bağlantısı hata verse bile oyun yönetiminden kayıt kaldırılıyordu | Yalnızca açık başarı yanıtından sonra kayıt kaldırılır. |
| Eski App ID yanıtı yeni seçimi değiştirebiliyordu | Yeni giriş ve seçim, önceki ayrıntı isteğini geçersiz kılar. |
| Katalog dışındaki App ID ayrıntısı güvenle seçilemiyordu | Geçerli ayrıntı korunarak özel seçim oluşturulur. |
| Yazım hatalarında ilgisiz oyunlar öne çıkıyordu | Tek harfli ters eşleşmeler kaldırıldı; yakın sonuçlar yazım uzaklığına göre sıralanır. `cyberpank` sorgusunda Cyberpunk 2077 öne çıkar. |
| Favorilerin son sayfasındaki son oyun silinince boş sayfada kalınıyordu | Sayfa mevcut sonuç aralığına geri alınır. |
| Önceki oyunun kaynak yanıtı yeni yönetim penceresine yazılıyordu | Yanıtlar açılan oyunla eşleştirilir. Bilgi alınamayınca kaynaklar aktif gösterilmez. |
| Bozuk kayıtlı tarih geçmiş görünümünü durduruyordu | JavaScript tarih aralığı dışında kalan kayıtlar ayıklanır. Başlatma seçenekleri ve oyun süresi kayıtları da tür kontrolünden geçer. |
| Steam yeniden başlatma başarısız olsa da başarılı gösteriliyordu | Gerçek başlatma sonucu beklenir; eksik kurulum ve kapanma hatası başarısız sonuç verir. |
| Filtrelenmiş ham Steam sayfası katalog sonu sanılıyordu | Ham sayfa ve gösterilebilen oyun sayısı ayrılır; sonraki sayfalar taranır. |
| Steam bağlantı hatası boş sonuç gibi gösteriliyordu | Hata arayüze iletilir; yerel katalog ve yeniden deneme kullanılabilir. |
| Eksik başlık içeren mağaza satırı tüm sorguyu bozuyordu | Geçersiz satır atlanır, diğer oyunlar korunur. |
| Her aramanın toplamı 10.065 oyun gösterilebiliyordu | Tarama sürerken yüklenen alt sınır `+` ile gösterilir. Sonunda gerçek filtrelenmiş toplam gösterilir. Seyrek katalog taraması yarım kaldığında aynı sayfadan devam edilebilir. |
| Yerel HTTP köprüsü her web kaynağından işlem kabul ediyordu | Yalnızca desteklenen yerel önizleme kaynakları kabul edilir; yabancı Host/Origin reddedilir. |
| Geçersiz App ID dosya yoluna taşınabiliyordu | HTTP işlemlerinde ve ekleme/silme/kontrol yöntemlerinde pozitif sayısal App ID doğrulanır. |
| Önizleme açıklamaları gerçek işlem davranışıyla çelişiyordu | Kuyruk, geçmiş, uygulama bilgisi ve README mevcut Steam entegrasyonunu anlatır. |

## Doğrulama

- `npm run check`: arayüz, Electron ve backend sözdizimi kontrolleri.
- `npm test`: 14 katalog, yeniden başlatma ve HTTP köprüsü regresyon kontrolü.
- `npm run test:ui`: Headless Microsoft Edge üzerinde 12 arayüz senaryosu. Başlangıçtaki 10 senaryonun 8'i hata gösteriyordu; düzeltmeler sonrası 12 senaryo geçer.
- 1440×980 ve 960×680 Windows pencere boyutlarında, ek olarak 390×844 tarayıcı görünümünde kayan kuyruk, Escape, odak dönüşü ve başlık logosu kontrol edildi.
- Canlı Steam mağazasında `elden ring` sorgusu ELDEN RING kaydını döndürdü.
- Eşzamanlı iki sayfa sorgusu tek isteği paylaştı; sonraki sayfa atlanmadı. Beş aynı ayrıntı sorgusu tek istek, farklı oyunlar için eşzamanlılık en fazla dört istek olarak kaldı.
- Performans kontrolünde dört saniyede 121 arka plan çizimi, sıfır maske yeniden oluşturma ve seçimde sıfır katalog kartı kaldırma gözlendi. Seçim ortancası 0,9 ms, yerel arama ortancası 1,2 ms idi; bunlar kontrollü ortam ölçümleridir.

Steam ekleme, silme, yeniden başlatma ve HTTP testlerinde sahte servis yanıtları kullanıldı; gerçek oyun dosyalarına işlem yapılmadı. Gerçek indirme, yama kurulumu, oyun çalıştırma ve fiziksel cihazda yüksek kontrast davranışı bu turda test edilmedi. Görsel denetleyicinin mevcut küçük yazı ve tasarım tokenı uyarıları kapsamlı bir görsel yenileme yapılmadan bırakıldı; dinamik yönetim kapağı kaynak ataması açılışta ayrıca kontrol edildi.

## Oyun Yönetimi kapak düzeltmesi

MECCHA CHAMELEON'un eski `/steam/apps/4704690/` görsel adresleri başarısız olduğu için kartı yalnızca App ID gösteriyordu. Kapak kaynakları tükenirse güncel mağaza ayrıntısı alınır, dönen görsel yüklenerek doğrulanır ve kapak adresi oyun kaydına saklanır. Aynı oyun için eşzamanlı onarım istekleri paylaşılır. Yatay görsel `contain` ile oranını korur; bulanık dolgu devam eder.

`npm run test:covers` başarı, kayıt kalıcılığı ve servis hatası senaryolarından geçti. MECCHA CHAMELEON için gerçek Steam görseli HTTP 200 yanıtıyla ve Edge'de 460×215 boyutlarında, kırpılmadan doğrulandı. Ana sayfadaki iki yan yazı bloğu kaldırıldı.

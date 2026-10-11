# Performans iyileştirmeleri

Ölçümler aynı bilgisayarda, Edge/Chromium ile 1440×980 pencere boyutunda ve izole oturumda alındı. Kapak ağı kontrollü yanıtlarla ölçüldü; süreler her cihaz için hız garantisi değildir.

| Kontrol ölçümü | Önce | Sonra |
| --- | ---: | ---: |
| 4 saniyede arka plan çizimi | 240 | 120 |
| 4 saniyede yeniden oluşturulan maske geçişleri | 480 | 0 |
| Oyun seçimi, ortanca JavaScript süresi | 7,9 ms | 0,9 ms |
| 20 seçimde kaldırılan katalog kartı | 1.200 | 0 |
| 500 oyunluk gizli kütüphane ile seçim süresi | 20,1 ms | 0,8 ms |
| Gizli kütüphane için oluşturulan kart | 500 | 0 |
| Yerel arama, ortanca süre | 2,9 ms | 1,3 ms |

Kartlar kimlikleriyle korunur; seçim, favori ve kuyruk göstergeleri mevcut kart üzerinde güncellenir. Kütüphane ve geçmiş ilk kez ilgili görünüm açıldığında çizilir. Arama adları ve sonuçları önbelleğe alınır; Türkçe sıralama korunur. Hata taramasında yakın eşleşmelerin sıralaması, yazım uzaklığını da dikkate alacak şekilde düzeltildi.

Satürn animasyonu 30 kare/saniyede çizilir. Maskeler yalnızca boyut değiştiğinde oluşturulur. Görünmeyen pencerede ve animasyon durdurulduğunda çizim durur. Video döngüsü, yeniden boyutlandırma ve yeniden oynatma kontrol edildi.

Yatay kapaklar özgün oranında, arkada bulanık dolgu ile gösterilir. Önceki kapak kaynağı sırası korunur. Kartların mevcut görsel elemanlarını korumak, seçim sırasında kapakların yeniden yüklenmesini azaltır.

Steam servisinde eşzamanlı aynı sayfa istekleri aynı işi paylaşır; bir sonraki sayfanın yanlışlıkla atlanması önlenir. Kontrollü testte iki aynı sayfa isteği tek ağ isteğine; beş aynı oyun bilgisi isteği tek isteğe indi. Oyun bilgisi yüklemeleri aynı anda en fazla dört istekle çalışır. Bilgi önbelleği 512 kayıt ve 10 dakika ile sınırlıdır.

Kaydırırken kuyruk butonu, kuyruk sayacı, Escape ile kapatma, klavye odağı, favoriler, arama, kütüphane ve geçmiş görünümleri ayrıca kontrol edildi.

Hızlı açılış için uygulama klasöründeki Saturn.lnk kısayolu kalıcı uygulama dosyalarını çalıştırır. Taşınabilir .exe dosyası ise her açılışta geçici klasöre çıkarma yapar; bu yüzden paylaşım için korunur.

Aynı optimize edilmiş paketin tek açılış kontrolünde taşınabilir EXE ile pencerenin görünmesi 11,10 saniye, kalıcı uygulama ile 0,59 saniye sürdü. Bu ölçüm dosya önbelleği ve cihaz hızından etkilenir; kalıcı sürüm geçici dosyaya çıkarma adımını kaldırır.

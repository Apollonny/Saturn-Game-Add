# Kumanda desteği

Windows uygulamasına kumanda bağlantısı, arayüzde gezinme ve Türkçe sanal klavye eklendi. Üst çubuktaki kumanda simgesi bağlantı durumunu gösterir ve kullanım penceresini açar. Bağlı kumanda olduğunda simgenin noktası yeşil olur.

## Bağlantı

- DualShock 4, DualSense ve DualSense Edge: `node-hid` ile doğrudan USB/Bluetooth giriş raporları.
- Xbox ve XInput uyumlu kumandalar: Windows'un `XInputGetState` işlevi, `koffi` üzerinden yerel bağlantı. Dört XInput yuvası desteklenir.
- Yerel bağlantı yoksa Chromium'un standart eşlemeli Gamepad API'si yedek olarak kullanılır.
- DS4Windows bağımlılığı yoktur. Yerel giriş varken Gamepad API yedeği aynı girdiyi tekrar çalıştırmaz.

Windows'ta Xbox 360 gibi XInput sürücüsünün yönettiği cihazlar HID üzerinden okunamayabilir; bu nedenle Xbox yolu `node-hid` yerine XInput kullanır. Kumandanın Windows tarafından tanınmış USB veya Bluetooth bağlantısı gerekir. Oyun, Steam veya başka bir pencere odaktayken uygulama kumanda girdilerini çalıştırmaz.

## Tuşlar

| Xbox | PlayStation | İşlem |
| --- | --- | --- |
| Sol analog / D-pad | Sol analog / D-pad | Odağı menüler, kartlar ve düğmeler arasında taşı |
| A | ✕ | Seç; metin alanında sanal klavyeyi aç |
| B | ○ | Geçerli pencereyi kapat / geri dön |
| Y | △ | Arama klavyesini aç; klavye açıkken boşluk ekle |
| X | □ | Kartta favori değiştir; klavyede harf sil |
| LB / RB | L1 / R1 | Ana sekmeleri değiştir; diyalogda önceki/sonraki kontrol |
| LT / RT | L2 / R2 | Katalog sayfası veya sayfa kaydırma |
| View | Share / Create | Kuyruğu aç |
| Menu | Options | Ayarları aç; klavyede metni uygula |
| Sağ analog | Sağ analog | Sayfayı veya kaydırılabilir pencereyi kaydır |

Sanal klavyede L1/LB harf büyüklüğünü, R1/RB sembol düzenini değiştirir. Türkçe harfler, rakamlar, dosya yolu karakterleri ve semboller bulunur. Arama metni yalnızca Ara/Uygula ile asıl alana aktarılır; B/○ iptal eder. Seçim kutusunda A/✕ düzenlemeyi açar, yön tuşları değeri değiştirir, A/✕ veya B/○ düzenlemeyi bitirir.

## Dosya ve işlem pencereleri

Kumandayla dosya içe aktarma ve klasör/yama seçme düğmeleri, uygulama içindeki dosya seçiciyi açar. D-pad ile sürücüler ve klasörler gezilebilir; yol alanı sanal klavyeyle düzenlenebilir. İçe aktarmada birden fazla dosya seçilebilir. Dosya listesi yalnızca kullanıcı klasöre girdiğinde okunur; listeleme dosya içeriğini değiştirmez. Oyun silme onayı da kumandayla seçilebilen bir diyalogdur; ilk odak Vazgeç düğmesindedir.

Ayarlar penceresinden pencereyi büyütüp eski boyutuna dönebilir ve uygulamadan çıkabilirsin. Kuyruk çalışırken çıkış için onay istenir.

## Giriş ve kaynak kullanımı

HID taraması eşzamanlı tekrar açılmaz. Sony aygıtları bilinen ürün kimliği ve oyun kumandası kullanım sayfasıyla filtrelenir; klavye veya fare aygıtları açılmaz. XInput bağlı yuvalarda yaklaşık 16 ms, boş yuvalarda yaklaşık 1 saniye aralıkla sorgulanır. Sony bağlantıları ön planda 3 saniye, arka planda 10 saniye aralıkla taranır; uygulama odağa döndüğünde tarama yenilenir. Bunlar yazılım aralıklarıdır, ölçülmüş fiziksel gecikme değerleri değildir.

Analog girdide ölü bölge ve yön tekrar gecikmesi vardır. Seçim tuşu basılı tutulduğunda bir kez çalışır. Harf silme tekrarı yalnızca sanal klavyede geçerlidir. Odak kaybı/yeniden bağlanma sonrası basılı tuş bırakılmadan yeni işlem yapılmaz. Büyük oyun galerilerinde yön hareketi bütün kartların geometrisini okumadan komşu kartı seçer. Pencere kapanınca zamanlayıcılar, IPC dinleyicileri ve HID bağlantıları kapatılır.

## Kontroller ve sınırları

- `npm test`: HID USB/Bluetooth raporları, Windows'ta doldurulmuş temel Bluetooth raporu, XInput eşleme, basılı tuş, analog tekrar, bağlanma/kopma ve uygulama kapanışı dahil 29 birim/regresyon kontrolü.
- `npm run test:controllers`: 1440×980 ve 960×680 üzerinde simüle yerel kumanda girişleri; arama yazma, gezinme, ayarlar, seçim kutuları, dosya/klasör seçimi, iç içe sanal klavye, onay, odak kaybı, Gamepad yedeği, devre dışı bırakma ve 1.000 kartlık galeri.
- `npm run test:controllers:native`: gerçek Electron 44.7.0 içinde modüllerin ve IPC'nin yüklenmesi, salt okunur dosya listesi ve geçersiz yol reddi. Test modu ayrı profil kullanır, HTTP köprüsünü açmaz ve protokol kaydını değiştirmez.
- Derlenmiş Windows EXE'sinde de yerel modül/IPC kontrolü geçti; paket içindeki arayüz ve kumanda kaynakları kaynak dosyalarla birebir eşleşti.
- Playwright bu kontroller için gerekir; yerel araçtaki modül `SATURN_PLAYWRIGHT_MODULE` ile belirtilebilir.

Geliştirme bilgisayarında bağlı kumanda bulunmadı. Fiziksel DualShock, DualSense veya Xbox cihazıyla USB/Bluetooth ve gerçek gecikme testi yapılmadı. Giriş eşlemeleri belgelenmiş raporlar ve simülasyonlarla kontrol edildi; yerel modüllerin Electron içinde yüklenmesi ayrıca doğrulandı.

Kaynaklar: [node-hid](https://github.com/node-hid/node-hid), [Linux PlayStation HID sürücüsü](https://github.com/torvalds/linux/blob/master/drivers/hid/hid-playstation.c), [Microsoft XINPUT_GAMEPAD](https://learn.microsoft.com/en-us/windows/win32/api/xinput/ns-xinput-xinput_gamepad), [Koffi çıktı parametreleri](https://koffi.dev/pointers), [standart Gamepad eşleme](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping).

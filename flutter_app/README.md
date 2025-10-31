# SaaS Mobile App - Flutter WebView

SaaS Multi-Tenant platformu için Flutter WebView tabanlı mobil uygulama.

## Özellikler

- 🌐 **WebView Tabanlı**: Tenant web panellerini mobil uygulamada görüntüleme
- 🔐 **Güvenlik**: SSL zorunluluğu ve domain validasyonu
- 📱 **Mobil Uyumlu**: Android ve iOS desteği
- 🎨 **Modern UI**: Material Design 3 tabanlı arayüz
- 🔄 **Auto-Sync**: Otomatik domain kaydetme ve yeniden yükleme
- 🌍 **Multi-Tenant**: Her tenant için özelleştirilebilir erişim

## Kurulum

### Gereksinimler

- Flutter SDK 3.10.0+
- Android Studio / VS Code
- Android SDK 21+
- iOS 11.0+ (iOS geliştirme için)

### Paket Bağımlılıkları

```yaml
dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.4.2
  webview_flutter_android: ^3.12.1
  webview_flutter_wkwebview: ^3.9.4
  shared_preferences: ^2.2.2
  http: ^1.1.0
  url_launcher: ^6.2.1
  flutter_spinkit: ^5.2.0
  permission_handler: ^11.0.1
```

### Build ve Çalıştırma

1. **Dependencies yükle**:
```bash
flutter pub get
```

2. **Debug modda çalıştır**:
```bash
flutter run
```

3. **Release APK build et**:
```bash
flutter build apk --release
```

4. **Android App Bundle (AAB) build et**:
```bash
flutter build appbundle --release
```

## Uygulama Yapısı

```
lib/
├── main.dart                    # Ana uygulama entry point
├── screens/
│   ├── splash_screen.dart       # Başlangıç ekranı
│   ├── domain_input_screen.dart # Tenant domain giriş ekranı
│   └── webview_screen.dart      # Ana WebView ekranı
├── widgets/
│   ├── custom_text_field.dart   # Özel text field widget
│   └── loading_button.dart      # Loading buton widget
└── utils/
    └── app_constants.dart       # Uygulama sabitleri ve yardımcılar
```

## Yapılandırma

### 1. Domain Yapılandırması

`lib/utils/app_constants.dart` dosyasında temel ayarları değiştirebilirsiniz:

```dart
class AppConstants {
  static const String baseUrl = 'https://saas.apollo12.co';
  static const List<String> allowedDomains = [
    'saas.apollo12.co',
    '*.saas.apollo12.co',
  ];
}
```

### 2. Android Yapılandırması

**android/app/src/main/AndroidManifest.xml**:
- İnternet izinleri
- Deep linking desteği  
- Güvenlik ayarları

**android/app/build.gradle**:
- Package name: `com.apollo12.saas_app`
- Min SDK: 21
- Target SDK: 34

### 3. Signing Yapılandırması

Release build için signing key oluşturun:

```bash
keytool -genkey -v -keystore ~/saas-app-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias saas-app-key
```

`android/local.properties` dosyasına ekleyin:
```properties
android.storeFile=/path/to/saas-app-key.jks
android.storePassword=your_password
android.keyAlias=saas-app-key
android.keyPassword=your_password
```

## Kullanım

### 1. İlk Çalıştırma

1. Uygulamayı açın
2. Splash screen sonrası domain giriş ekranı açılır
3. Tenant domain adını girin (örn: `test1`)
4. "Bağlan" butonuna tıklayın
5. WebView tenant panelini yükler

### 2. Domain Değiştirme

- WebView ekranında sağ üst menüden "Çıkış Yap" seçin
- Domain giriş ekranına geri döner
- Yeni domain girebilirsiniz

### 3. Deep Linking

Uygulama şu URL formatını destekler:
```
https://saas.apollo12.co/tenant-domain/path
```

Örnek:
```
https://saas.apollo12.co/test1/dashboard
```

## Güvenlik Özellikleri

### 1. Domain Whitelist

Sadece izin verilen domainlere erişim:
```dart
static const List<String> allowedDomains = [
  'saas.apollo12.co',
  '*.saas.apollo12.co',
];
```

### 2. SSL Zorunluluğu

HTTP bağlantılar engellenir, sadece HTTPS:
```dart
if (uri.scheme != 'https') return false;
```

### 3. Blocked Schemes

Güvenlik riski olan protokoller engellenir:
```dart
static const List<String> blockedSchemes = [
  'file://',
  'javascript:',
  'data:',
];
```

### 4. External Link Protection

Dış linkler kullanıcı onayı ile tarayıcıda açılır.

## Admin Panel Entegrasyonu

### 1. QR Kod Oluşturma

Admin panelden tenant'lar için QR kodları oluşturulabilir:
```javascript
generateTenantQR('test1', 'Test Mağaza')
```

### 2. APK Distribution

- Admin panelden APK dosyaları indirilebilir
- Firebase App Distribution entegrasyonu
- Toplu dağıtım desteği

### 3. Mobil İstatistikler

Admin dashboard'da mobil uygulama kullanım istatistikleri.

## Geliştirme Notları

### 1. Hot Reload

Geliştirme sırasında hot reload kullanabilirsiniz:
```bash
flutter run --hot
```

### 2. Debug Modları

Debug mesajları için:
```dart
AppConstants.debugPrint('Debug message');
```

### 3. WebView Debug

Chrome DevTools ile WebView debug:
1. Cihazı USB ile bağlayın
2. Chrome'da `chrome://inspect` açın
3. WebView inspect edin

## Build ve Deployment

### 1. Release Build

```bash
# APK oluştur
flutter build apk --release --split-per-abi

# App Bundle oluştur (Play Store için)
flutter build appbundle --release
```

### 2. Firebase App Distribution

```bash
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk \
  --app your-app-id \
  --groups testers
```

### 3. Play Store Upload

App Bundle dosyasını Google Play Console'a yükleyin:
```
build/app/outputs/bundle/release/app-release.aab
```

## Sorun Giderme

### 1. Build Hataları

**Gradle Sync başarısız**:
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
```

**WebView yüklenmiyor**:
- İnternet bağlantısını kontrol edin
- HTTPS kullandığınızdan emin olun
- Domain whitelist'i kontrol edin

### 2. Performance

**Memory kullanımı**:
- WebView cache'i temizleyin
- Uygulamayı yeniden başlatın

**Yavaş yükleme**:
- Network bağlantısını kontrol edin
- WebView'ı optimize edin

## Lisans

Bu proje özel kullanım için geliştirilmiştir.

## Destek

Teknik destek için lütfen admin panel üzerinden iletişime geçin.

---

**Son Güncelleme**: 2025-01-22
**Versiyon**: 1.0.0 
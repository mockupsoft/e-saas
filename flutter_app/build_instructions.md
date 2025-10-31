# SaaS Mobile App - Build ve Deployment Talimatları

Bu döküman SaaS Mobile App'in build edilmesi ve deploy edilmesi için step-by-step talimatları içerir.

## Ön Hazırlık

### 1. Gerekli Yazılımlar

- **Flutter SDK**: 3.10.0 veya üzeri
- **Android Studio**: Son versiyon
- **JDK**: 17 veya üzeri
- **Git**: Versiyon kontrolü için

### 2. Android SDK Kurulumu

```bash
# Android Studio'da SDK Manager'ı açın
# Şu bileşenleri yükleyin:
# - Android SDK Platform 34
# - Android SDK Build-Tools 34.0.0
# - Android SDK Command-line Tools
```

### 3. Flutter Environment Setup

```bash
# Flutter doctor çalıştırın
flutter doctor

# Eksik olan bileşenleri tamamlayın
# Android Studio plugin'leri yükleyin
```

## Development Build

### 1. Dependencies Yükleme

```bash
cd flutter_app
flutter pub get
```

### 2. Debug Build

```bash
# Android debug APK
flutter run --debug

# Debug APK oluştur
flutter build apk --debug
```

### 3. Hot Reload Development

```bash
# Cihaz/emülatör bağlı iken
flutter run --hot
```

## Production Build

### 1. Signing Key Oluşturma

```bash
# Keystore oluşturun
keytool -genkey -v -keystore ~/saas-app-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias saas-app-key

# Güvenli bir yerde saklayın
cp ~/saas-app-key.jks ./android/app/
```

### 2. Key Properties Ayarlama

`android/key.properties` dosyası oluşturun:

```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=saas-app-key
storeFile=saas-app-key.jks
```

### 3. Build Configuration

`android/app/build.gradle` signing config'i kontrol edin:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}
```

### 4. Release Build

```bash
# Release APK oluştur
flutter build apk --release

# Multi-arch APKs (recommended)
flutter build apk --release --split-per-abi

# Android App Bundle (Play Store için)
flutter build appbundle --release
```

### 5. Build Output

Build dosyaları şu lokasyonlarda oluşur:

```
build/app/outputs/flutter-apk/
├── app-arm64-v8a-release.apk     # 64-bit ARM
├── app-armeabi-v7a-release.apk   # 32-bit ARM
└── app-x86_64-release.apk        # 64-bit x86

build/app/outputs/bundle/release/
└── app-release.aab               # Play Store bundle
```

## APK Optimizasyonu

### 1. Size Optimization

```bash
# ProGuard/R8 aktif olduğunu kontrol edin
# android/app/build.gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 2. Asset Optimization

```bash
# Unused assets temizle
flutter packages pub run build_runner clean

# Asset compression
# pubspec.yaml'da asset size optimizasyonu
```

## Tenant-Specific Builds

### 1. Environment Konfigürasyonu

Her tenant için özel build oluşturmak:

```bash
# Tenant-specific flavor oluştur
# android/app/build.gradle
android {
    flavorDimensions "tenant"
    productFlavors {
        test1 {
            dimension "tenant"
            applicationIdSuffix ".test1"
            versionNameSuffix "-test1"
            resValue "string", "default_tenant", "test1"
        }
        demo {
            dimension "tenant"
            applicationIdSuffix ".demo"
            versionNameSuffix "-demo"
            resValue "string", "default_tenant", "demo"
        }
    }
}
```

### 2. Flavor Build

```bash
# Specific tenant build
flutter build apk --release --flavor test1
flutter build apk --release --flavor demo

# All flavors
flutter build apk --release --split-per-abi
```

## Firebase App Distribution

### 1. Firebase CLI Setup

```bash
# Firebase CLI yükle
npm install -g firebase-tools

# Login
firebase login

# Project init
firebase init
```

### 2. App Distribution Config

`firebase.json`:

```json
{
  "appDistribution": {
    "app": "1:your-project-id:android:your-app-id",
    "groups": ["saas-testers", "tenant-users"]
  }
}
```

### 3. Distribution Script

`scripts/distribute.sh`:

```bash
#!/bin/bash

# Build release APK
flutter build apk --release --split-per-abi

# Distribute to Firebase
firebase appdistribution:distribute \
  build/app/outputs/flutter-apk/app-arm64-v8a-release.apk \
  --app 1:your-project-id:android:your-app-id \
  --groups "saas-testers" \
  --release-notes "Latest SaaS Mobile App build with bug fixes and improvements"
```

### 4. Automated Distribution

```bash
# Script'i çalıştırılabilir yap
chmod +x scripts/distribute.sh

# Distribute
./scripts/distribute.sh
```

## CI/CD Pipeline

### 1. GitHub Actions

`.github/workflows/build.yml`:

```yaml
name: Build and Distribute

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Java
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Setup Flutter
      uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.10.0'
    
    - name: Install dependencies
      run: flutter pub get
      working-directory: flutter_app
    
    - name: Build APK
      run: flutter build apk --release --split-per-abi
      working-directory: flutter_app
    
    - name: Upload APK
      uses: actions/upload-artifact@v3
      with:
        name: release-apk
        path: flutter_app/build/app/outputs/flutter-apk/
```

### 2. Build Secrets

GitHub Secrets'e ekleyin:

- `KEYSTORE_PASSWORD`
- `KEY_PASSWORD`
- `FIREBASE_TOKEN`
- `KEYSTORE_BASE64` (keystore dosyasının base64 encode'u)

## Testing

### 1. Unit Tests

```bash
# Test çalıştır
flutter test

# Coverage report
flutter test --coverage
```

### 2. Integration Tests

```bash
# Integration test
flutter drive --target=test_driver/app.dart
```

### 3. Device Testing

```bash
# Connect device
adb devices

# Install and test
flutter install
flutter run --release
```

## Distribution Channels

### 1. Direct APK Distribution

```bash
# APK'ları web server'a yükle
scp build/app/outputs/flutter-apk/*.apk user@server:/var/www/downloads/

# Download links oluştur
# https://saas.apollo12.co/downloads/saas-mobile-latest.apk
```

### 2. Google Play Store

```bash
# App Bundle yükle
# 1. Google Play Console'a giriş yapın
# 2. App Bundle'ı upload edin
# 3. Release notes ekleyin
# 4. Review'a gönderin
```

### 3. Enterprise Distribution

```bash
# Enterprise certificate ile sign
# MDM sistemlere entegrasyon
# Silent install özelliği
```

## Monitoring ve Analytics

### 1. Crash Reporting

Firebase Crashlytics entegrasyonu:

```dart
// main.dart
import 'package:firebase_crashlytics/firebase_crashlytics.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterError;
  
  runApp(MyApp());
}
```

### 2. Performance Monitoring

```dart
// Performance tracking
final trace = FirebasePerformance.instance.newTrace('webview_load');
await trace.start();
// WebView load operation
await trace.stop();
```

## Maintenance

### 1. Dependency Updates

```bash
# Outdated packages kontrol
flutter pub outdated

# Update packages
flutter pub upgrade

# Major version updates
flutter pub upgrade --major-versions
```

### 2. Flutter SDK Updates

```bash
# Flutter version kontrol
flutter --version

# Update Flutter
flutter upgrade

# Channel değiştir (stable/beta)
flutter channel stable
flutter upgrade
```

### 3. Build Cache Temizleme

```bash
# Flutter cache temizle
flutter clean

# Pub cache temizle
flutter pub cache clean

# Android build cache
cd android
./gradlew clean
```

## Troubleshooting

### 1. Common Build Errors

**Gradle Build Failed**:
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
```

**Signing Issues**:
```bash
# Keystore path kontrol
# Passwords doğru olduğundan emin olun
# key.properties dosyası lokasyonu
```

**Memory Issues**:
```bash
# Gradle memory artır
# android/gradle.properties
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m
```

### 2. Performance Issues

**Large APK Size**:
```bash
# Multi-arch APK kullan
flutter build apk --release --split-per-abi

# Asset optimization
# Unused dependencies kaldır
```

**Slow WebView**:
```bash
# Hardware acceleration aktif
# Cache stratejisi optimize et
# Network timeouts ayarla
```

---

**Bu doküman düzenli olarak güncellenmelidir.**
**Son güncelleme**: 2025-01-22 
# Cara Build APK Android

Aplikasi ini sudah dikonfigurasi dengan **Capacitor** untuk menghasilkan file APK Android.

## Prerequisites (Yang Diperlukan)

1. **Node.js** (sudah terinstall)
2. **Java JDK 17 atau lebih baru**
   - Download: https://adoptium.net/
   - Set environment variable `JAVA_HOME`
3. **Android Studio** (untuk build APK)
   - Download: https://developer.android.com/studio
   - Install Android SDK melalui Android Studio

## Langkah-langkah Build APK

### 1. Build Web App
```bash
npm run build
```

### 2. Sync dengan Capacitor
```bash
npm run cap:sync
```

Atau gunakan script gabungan:
```bash
npm run cap:build
```

### 3. Buka di Android Studio
```bash
npm run cap:android
```

Atau manual:
```bash
npx cap open android
```

### 4. Build APK di Android Studio

1. Setelah Android Studio terbuka, tunggu hingga Gradle sync selesai
2. Klik menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Tunggu proses build selesai
4. APK akan ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Build APK Release (Untuk Publish)

Untuk build APK release yang bisa dipublish:

1. Di Android Studio, buka **Build** → **Generate Signed Bundle / APK**
2. Pilih **APK**
3. Buat keystore (jika belum ada) atau gunakan yang sudah ada
4. Pilih build variant: **release**
5. APK release akan ada di: `android/app/build/outputs/apk/release/app-release.apk`

## Build APK via Command Line (Tanpa Android Studio)

### Install Android SDK Command Line Tools

1. Download Android SDK Command Line Tools
2. Set environment variables:
   - `ANDROID_HOME` = path ke Android SDK
   - Tambahkan ke PATH: `%ANDROID_HOME%\platform-tools` dan `%ANDROID_HOME%\tools`

### Build APK via Gradle

```bash
cd android
./gradlew assembleDebug
```

APK akan ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

Untuk release:
```bash
cd android
./gradlew assembleRelease
```

## Script NPM yang Tersedia

- `npm run cap:build` - Build web app dan sync dengan Capacitor
- `npm run cap:sync` - Sync web app ke native project
- `npm run cap:android` - Buka project Android di Android Studio

## Catatan Penting

1. **Pertama kali build** memerlukan download dependencies Android SDK (bisa lama)
2. **APK Debug** bisa langsung diinstall tanpa signing
3. **APK Release** perlu keystore untuk signing (wajib untuk publish ke Play Store)
4. Pastikan **internet connection** aktif saat build pertama kali

## Troubleshooting

### Error: JAVA_HOME not set
- Set environment variable `JAVA_HOME` ke path JDK
- Contoh: `C:\Program Files\Java\jdk-17`

### Error: Android SDK not found
- Install Android Studio dan buka sekali untuk setup SDK
- Atau set `ANDROID_HOME` environment variable

### Build gagal
- Pastikan semua dependencies terinstall: `npm install`
- Pastikan Android SDK sudah terinstall lengkap
- Coba clean build: `cd android && ./gradlew clean`

## File APK yang Dihasilkan

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
  - Bisa langsung diinstall untuk testing
  - Tidak perlu signing
  
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`
  - Perlu signing dengan keystore
  - Siap untuk publish ke Play Store


# 🚀 Cara Menyamakan Tampilan Web dan APK

Panduan lengkap untuk menyinkronkan tampilan login antara aplikasi web dan APK Android.

## 📋 Daftar Isi
- [Script Otomatis](#script-otomatis)
- [Langkah Manual](#langkah-manual)
- [Troubleshooting](#troubleshooting)
- [Tips & Best Practices](#tips--best-practices)

## ⚡ Script Otomatis (REKOMENDASI)

### 1. Menggunakan Batch File (Windows)
Double-click file `build_apk.bat` atau jalankan di command prompt:
```cmd
build_apk.bat
```

Script ini akan:
- ✅ Build web app dengan design terbaru
- ✅ Sync dengan Capacitor
- ✅ Buka Android Studio
- ✅ Berikan instruksi selanjutnya

### 2. Menggunakan NPM Scripts
```bash
# Build dan sync saja
npm run cap:build:apk

# Build, sync, dan buka Android Studio
npm run cap:build:full
```

## 🔧 Langkah Manual

Jika script tidak bekerja, ikuti langkah ini:

### 1. Build Web App
```bash
npm run build
```

### 2. Sync dengan Capacitor
```bash
npx cap sync android
```

### 3. Buka Android Studio
```bash
npx cap open android
```

### 4. Build APK di Android Studio
1. Tunggu Gradle sync selesai
2. **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
3. Tunggu build selesai
4. APK ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Test APK
1. **Uninstall APK lama** dari device
2. **Install APK baru**
3. **Buka aplikasi** - tampilan login harus sama dengan web

## 🔍 Troubleshooting

### Masalah: Tampilan masih sama
**Solusi:**
1. Uninstall APK lama dari device
2. Clean build Android Studio:
   - **Build** → **Clean Project**
   - **File** → **Invalidate Caches / Restart**
3. Rebuild APK

### Masalah: Build gagal
**Solusi:**
```bash
# Clean Gradle cache
cd android
./gradlew clean
./gradlew assembleDebug
```

### Masalah: Capacitor sync gagal
**Solusi:**
```bash
# Force sync
npm run build
npx cap sync android --force
```

## 💡 Tips & Best Practices

### ✅ Yang Harus Dicek:
- [ ] Background neumorphic (#e0e5ec)
- [ ] Logo CPU dengan gradient
- [ ] Input fields dengan inset shadow
- [ ] Button dengan gradient teal
- [ ] Typography dan spacing konsisten

### 📱 Testing:
- Selalu test di device virtual dan real device
- Bandingkan screenshot web vs APK
- Test di berbagai ukuran screen

### 🔄 Workflow Rutin:
1. Update design di `src/pages/Auth.tsx`
2. Test di web (`npm run dev`)
3. Build APK menggunakan script
4. Test di device
5. Jika OK, commit changes

### 🚀 Untuk Production:
- Gunakan **Build** → **Generate Signed Bundle/APK**
- Buat keystore untuk signing
- Upload ke Play Store

## 📞 Butuh Bantuan?
Jika ada masalah, cek:
1. Android Studio sudah terinstall
2. JDK 17+ sudah terinstall
3. Environment variables sudah benar
4. Internet connection stabil

---
**Catatan:** Setiap perubahan di web perlu di-sync ulang ke APK menggunakan langkah di atas.

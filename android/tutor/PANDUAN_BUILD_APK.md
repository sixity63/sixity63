# 📱 Panduan Build APK - Step by Step

## ✅ Langkah 1: Setup Android Studio (Pertama Kali)

### 1.1 Buka Android Studio
- Buka aplikasi **Android Studio** yang baru diinstall

### 1.2 Setup Wizard (Jika Muncul)
Jika muncul **Setup Wizard** saat pertama kali buka:

1. Pilih **Standard** installation
2. Pilih **Next** dan tunggu download SDK components
3. Setuju dengan license agreement
4. Klik **Finish** dan tunggu proses selesai

**Catatan**: Proses ini bisa memakan waktu 10-30 menit tergantung koneksi internet.

### 1.3 Install Android SDK (Jika Belum)
1. Di Android Studio, klik **More Actions** → **SDK Manager**
2. Pastikan sudah terinstall:
   - ✅ Android SDK Platform-Tools
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK (versi terbaru, minimal API 33)
3. Klik **Apply** dan tunggu install selesai

---

## ✅ Langkah 2: Buka Project Android

### 2.1 Buka Project di Android Studio

**Cara 1: Via Command (Paling Mudah)**
```bash
npm run cap:android
```

**Cara 2: Manual**
1. Buka Android Studio
2. Klik **Open** atau **File** → **Open**
3. Pilih folder: `C:\Users\User\Documents\sixity\android`
4. Klik **OK**

### 2.2 Tunggu Gradle Sync
- Android Studio akan otomatis sync project
- Akan muncul notifikasi di bagian bawah: **Gradle Sync Running...**
- **Tunggu hingga selesai** (pertama kali bisa 5-15 menit)
- Jika muncul popup **Trust Project?**, klik **Trust**

**Catatan**: 
- Pastikan koneksi internet aktif
- Pertama kali akan download banyak dependencies (Gradle, Android SDK, dll)
- Jangan tutup Android Studio saat sync berjalan

---

## ✅ Langkah 3: Build APK

### 3.1 Build APK Debug (Untuk Testing)

1. Setelah Gradle sync selesai, pastikan tidak ada error (warna merah)
2. Klik menu **Build** di bagian atas
3. Pilih **Build Bundle(s) / APK(s)**
4. Klik **Build APK(s)**
5. Tunggu proses build (biasanya 2-5 menit)

### 3.2 Cek Hasil Build

Setelah build selesai, akan muncul notifikasi:
- **APK(s) generated successfully**
- Klik **locate** untuk langsung buka folder APK

**Lokasi file APK:**
```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## ✅ Langkah 4: Install APK ke HP Android

### Cara 1: Via USB (USB Debugging)
1. Aktifkan **Developer Options** di HP Android:
   - Settings → About Phone → Tap **Build Number** 7x
2. Aktifkan **USB Debugging**:
   - Settings → Developer Options → USB Debugging (ON)
3. Hubungkan HP ke PC via USB
4. Di Android Studio, klik **Run** → **Run 'app'**
5. Pilih device HP Anda
6. APK akan otomatis terinstall

### Cara 2: Transfer File Manual
1. Copy file `app-debug.apk` ke HP (via USB, email, atau cloud)
2. Di HP, buka file manager
3. Tap file APK
4. Izinkan install dari **Unknown Sources** jika diminta
5. Tap **Install**

---

## 🔧 Troubleshooting

### ❌ Error: "SDK location not found"
**Solusi:**
1. File → Project Structure → SDK Location
2. Set **Android SDK location** ke: `C:\Users\[Username]\AppData\Local\Android\Sdk`
3. Klik **Apply**

### ❌ Error: "Gradle sync failed"
**Solusi:**
1. File → Invalidate Caches → **Invalidate and Restart**
2. Tunggu Android Studio restart
3. Coba sync lagi

### ❌ Error: "JAVA_HOME not set"
**Solusi:**
1. Android Studio biasanya sudah include JDK
2. Jika masih error, install JDK 17: https://adoptium.net/
3. Set environment variable `JAVA_HOME`

### ❌ Build lama sekali
**Normal!** Pertama kali build bisa 10-30 menit karena:
- Download Gradle
- Download Android dependencies
- Compile project

### ❌ APK tidak bisa diinstall di HP
**Solusi:**
1. Pastikan **Unknown Sources** diaktifkan di HP
2. Coba install ulang dengan uninstall versi lama dulu
3. Pastikan HP Android minimal API 21 (Android 5.0)

---

## 📝 Tips

1. **Pertama kali build**: Siapkan waktu 30-60 menit (untuk download dependencies)
2. **Build berikutnya**: Hanya 2-5 menit
3. **Ukuran APK**: Sekitar 5-15 MB (tergantung dependencies)
4. **Testing**: Install APK debug dulu untuk test, baru build release untuk publish

---

## 🎯 Quick Commands

```bash
# Build web app + sync ke Android
npm run cap:build

# Sync saja (jika sudah build sebelumnya)
npm run cap:sync

# Buka Android Studio
npm run cap:android
```

---

## 📍 Lokasi File Penting

- **APK Debug**: `android\app\build\outputs\apk\debug\app-debug.apk`
- **Project Android**: `android\`
- **Web Build**: `dist\`

---

**Selamat! APK Anda siap digunakan! 🎉**


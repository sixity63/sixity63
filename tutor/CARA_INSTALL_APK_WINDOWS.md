# 📱 Cara Install APK di Windows

APK adalah file aplikasi **Android**, jadi tidak bisa langsung diinstall di Windows. Tapi ada beberapa cara:

## 🎯 Opsi 1: Install di HP Android (Paling Mudah) ⭐

### Cara Transfer APK ke HP:

**Via USB:**
1. Hubungkan HP ke PC via USB
2. Copy file `app-debug.apk` ke HP (folder Download)
3. Di HP, buka File Manager
4. Tap file APK
5. Izinkan "Install from unknown sources" jika diminta
6. Tap **Install**

**Via Email/Cloud:**
1. Upload APK ke Google Drive/Dropbox
2. Buka dari HP dan download
3. Install seperti di atas

**Via WhatsApp/Telegram:**
1. Kirim APK ke diri sendiri via WhatsApp/Telegram
2. Download di HP
3. Install

---

## 🖥️ Opsi 2: Menggunakan Android Emulator di Windows

### A. Android Studio Emulator (Recommended)

**Setup:**
1. Buka Android Studio
2. Klik **Device Manager** (ikon HP di toolbar)
3. Klik **Create Device**
4. Pilih device (misalnya Pixel 5)
5. Pilih system image (Android 11 atau lebih baru)
6. Klik **Finish**

**Install APK:**
1. Jalankan emulator (klik play button)
2. Drag & drop file `app-debug.apk` ke emulator
3. Atau gunakan command:
   ```bash
   adb install app-debug.apk
   ```

### B. BlueStacks (Paling Mudah untuk User)

1. Download BlueStacks: https://www.bluestacks.com/
2. Install BlueStacks
3. Buka BlueStacks
4. Drag & drop file APK ke BlueStacks
5. Atau klik **Install APK** di BlueStacks dan pilih file

### C. WSA (Windows Subsystem for Android) - Windows 11 Only

**Requirements:**
- Windows 11
- RAM minimal 8GB
- Virtualization enabled di BIOS

**Setup:**
1. Buka Microsoft Store
2. Cari "Amazon Appstore" atau "Windows Subsystem for Android"
3. Install
4. Setelah install, bisa install APK via:
   - Drag & drop ke WSA window
   - Atau gunakan `adb install`

---

## 🚀 Opsi 3: Test di Browser (Web Version)

Karena aplikasi ini juga bisa diakses sebagai website:

1. Build web app:
   ```bash
   npm run build
   npm run preview
   ```
2. Buka browser: `http://localhost:4173`
3. Test aplikasi di browser (tidak perlu install)

---

## 📋 Perbandingan Opsi

| Opsi | Mudah | Cocok Untuk | Kebutuhan |
|------|-------|-------------|-----------|
| **HP Android** | ⭐⭐⭐⭐⭐ | Testing di device asli | HP Android |
| **BlueStacks** | ⭐⭐⭐⭐ | Testing cepat | Download BlueStacks |
| **Android Studio** | ⭐⭐⭐ | Development | Android Studio |
| **WSA** | ⭐⭐ | Windows 11 user | Windows 11 |
| **Browser** | ⭐⭐⭐⭐⭐ | Testing web version | Browser saja |

---

## 🎯 Rekomendasi

**Untuk Testing:**
- **Paling mudah**: Install di HP Android (cara termudah dan paling akurat)
- **Alternatif**: BlueStacks (jika tidak punya HP Android)

**Untuk Development:**
- Android Studio Emulator (sudah terinstall)

---

## 💡 Tips

1. **HP Android** = Cara terbaik untuk test aplikasi mobile
2. **BlueStacks** = Paling mudah untuk test di Windows tanpa setup kompleks
3. **Browser** = Cukup untuk test fitur web, tapi tidak sama persis dengan mobile

---

**TL;DR**: 
- **Paling mudah**: Install di HP Android via USB/Email
- **Alternatif Windows**: BlueStacks (download, install, drag & drop APK)
- **Development**: Android Studio Emulator





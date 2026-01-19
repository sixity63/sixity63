# 🎨 Cara Ganti Logo Aplikasi

Ada beberapa tempat yang perlu diganti logo untuk aplikasi Android dan web:

## 📱 1. Icon Aplikasi Android (Launcher Icon)

Icon aplikasi ada di folder `android/app/src/main/res/mipmap-*/`

### Ukuran Icon yang Diperlukan:
- **mdpi**: 48x48 px
- **hdpi**: 72x72 px
- **xhdpi**: 96x96 px
- **xxhdpi**: 144x144 px
- **xxxhdpi**: 192x192 px

### File yang Perlu Diganti:
Untuk setiap folder (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi), ganti file:
- `ic_launcher.png` - Icon standar
- `ic_launcher_round.png` - Icon bulat (untuk Android 7.1+)
- `ic_launcher_foreground.png` - Foreground icon (untuk adaptive icon)

### Cara Ganti:

**Opsi 1: Manual (Mudah)**
1. Siapkan logo Anda dalam format PNG
2. Buat ukuran untuk setiap density:
   - mdpi: 48x48 px
   - hdpi: 72x72 px
   - xhdpi: 96x96 px
   - xxhdpi: 144x144 px
   - xxxhdpi: 192x192 px
3. Ganti file di folder:
   ```
   android/app/src/main/res/mipmap-mdpi/ic_launcher.png
   android/app/src/main/res/mipmap-hdpi/ic_launcher.png
   android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
   android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
   android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
   ```
4. Lakukan hal yang sama untuk `ic_launcher_round.png` dan `ic_launcher_foreground.png`

**Opsi 2: Menggunakan Android Asset Studio (Paling Mudah)**
1. Buka: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload logo Anda
3. Download semua ukuran icon
4. Extract dan copy ke folder `android/app/src/main/res/mipmap-*/`

**Opsi 3: Menggunakan Android Studio**
1. Buka Android Studio
2. Klik kanan folder `res` → New → Image Asset
3. Pilih "Launcher Icons (Adaptive and Legacy)"
4. Upload logo Anda
5. Klik Next → Finish

---

## 🌐 2. Favicon (Web/PWA)

Favicon untuk website dan PWA ada di:
- `public/favicon.ico`

### Cara Ganti:
1. Siapkan favicon.ico (ukuran 16x16, 32x32, atau 48x48 px)
2. Ganti file: `public/favicon.ico`
3. Atau gunakan generator: https://favicon.io/

---

## 🖼️ 3. Splash Screen

Splash screen ada di folder `android/app/src/main/res/drawable-*/`

### File yang Perlu Diganti:
- `splash.png` di berbagai folder:
  - `drawable/`
  - `drawable-port-*/` (portrait)
  - `drawable-land-*/` (landscape)

### Ukuran Splash Screen:
- **mdpi**: 320x480 px (portrait), 480x320 px (landscape)
- **hdpi**: 480x800 px (portrait), 800x480 px (landscape)
- **xhdpi**: 720x1280 px (portrait), 1280x720 px (landscape)
- **xxhdpi**: 1080x1920 px (portrait), 1920x1080 px (landscape)
- **xxxhdpi**: 1440x2560 px (portrait), 2560x1440 px (landscape)

### Cara Ganti:
1. Siapkan splash screen untuk setiap ukuran
2. Ganti file `splash.png` di setiap folder

---

## 🚀 4. PWA Icons (Manifest)

Untuk PWA, icon juga perlu diupdate di `vite.config.ts`:

```typescript
VitePWA({
  manifest: {
    icons: [
      {
        src: 'favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon'
      },
      {
        src: 'icon-192.png',  // Buat file ini
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'icon-512.png',  // Buat file ini
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
})
```

---

## 📝 Langkah-langkah Lengkap:

### 1. Siapkan Logo
- Format: PNG dengan transparan background
- Ukuran: Minimal 512x512 px (untuk kualitas terbaik)
- Desain: Simple, jelas, mudah dikenali di ukuran kecil

### 2. Generate Semua Ukuran
Gunakan tool online:
- **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/
- **Favicon Generator**: https://favicon.io/
- **App Icon Generator**: https://appicon.co/

### 3. Ganti File
- Copy icon ke folder `android/app/src/main/res/mipmap-*/`
- Ganti `public/favicon.ico`
- Update splash screen jika perlu

### 4. Rebuild APK
```bash
npm run cap:build
# Lalu build APK di Android Studio
```

---

## 🎯 Tips:

1. **Gunakan tool online** untuk generate semua ukuran sekaligus
2. **Test di device** setelah ganti logo
3. **Pastikan logo jelas** di ukuran kecil (48x48 px)
4. **Gunakan warna kontras** untuk visibility
5. **Hindari text kecil** di logo (sulit dibaca di icon kecil)

---

## 🔧 Quick Reference:

**Folder Icon Android:**
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
├── mipmap-hdpi/
├── mipmap-xhdpi/
├── mipmap-xxhdpi/
└── mipmap-xxxhdpi/
```

**Favicon:**
```
public/favicon.ico
```

**Splash Screen:**
```
android/app/src/main/res/drawable-*/splash.png
```

---

**Setelah ganti logo, jangan lupa rebuild APK!** 🚀





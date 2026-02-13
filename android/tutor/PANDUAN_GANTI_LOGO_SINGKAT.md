# 🎯 Panduan Ganti Logo - Versi Singkat

## Kenapa Ada Banyak Folder?

Android punya berbagai ukuran layar (HP kecil, tablet, dll), jadi perlu icon dalam berbagai ukuran:
- **mdpi** = HP kecil/lama
- **hdpi** = HP sedang
- **xhdpi** = HP besar
- **xxhdpi** = HP sangat besar
- **xxxhdpi** = HP flagship

## File yang Perlu Diganti

Untuk **SETIAP folder** (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi), ganti **3 file**:

1. ✅ `ic_launcher.png` - **WAJIB** (icon utama)
2. ✅ `ic_launcher_round.png` - **WAJIB** (icon bulat)
3. ✅ `ic_launcher_foreground.png` - **WAJIB** (untuk Android 8+)

## Cara Termudah (Recommended)

### Opsi 1: Android Asset Studio (Paling Mudah) ⭐

1. Buka: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload logo Anda (PNG, minimal 512x512 px)
3. Klik **"Generate"**
4. Download ZIP file
5. Extract ZIP
6. Copy semua folder `mipmap-*` ke:
   ```
   android/app/src/main/res/
   ```
7. **Selesai!** Semua ukuran sudah otomatis dibuat.

### Opsi 2: Android Studio (Jika Sudah Terbuka)

1. Di Android Studio, klik kanan folder `res`
2. Pilih **New → Image Asset**
3. Pilih **"Launcher Icons (Adaptive and Legacy)"**
4. Upload logo Anda
5. Klik **Next → Finish**
6. **Selesai!** Semua file otomatis diganti.

## Yang Perlu Anda Lakukan

**Cukup ganti logo di 1 tempat** (Android Asset Studio atau Android Studio), 
tool akan otomatis generate semua ukuran untuk semua folder!

## Setelah Ganti Logo

```bash
npm run cap:build
# Lalu build APK di Android Studio
```

---

**TL;DR**: Pakai Android Asset Studio, upload 1 logo, download, copy ke folder `res/`, selesai! 🎉





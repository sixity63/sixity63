# 💻 Cara Build Aplikasi Desktop Windows (.exe)

Aplikasi sudah dikonfigurasi dengan **Electron** untuk membuat aplikasi desktop Windows.

## 🚀 Cara Build Aplikasi Desktop

### 1. Build Aplikasi (.exe)

```bash
npm run electron:build:win
```

Atau:

```bash
npm run electron:build
```

### 2. File Output

Setelah build selesai, file installer akan ada di:
```
release/ESP32 Dashboard Setup x.x.x.exe
```

### 3. Install di Windows

1. Double-click file `.exe` yang ada di folder `release/`
2. Ikuti wizard installer
3. Aplikasi akan terinstall dan muncul di Start Menu

## 🧪 Test di Development Mode

Untuk test aplikasi desktop tanpa build:

```bash
# Terminal 1: Jalankan dev server
npm run dev

# Terminal 2: Jalankan Electron
npm run electron:dev
```

## 📝 Catatan

- **Pertama kali build** akan download Electron binary (bisa lama)
- File `.exe` akan cukup besar (~100-150 MB) karena include Electron runtime
- Aplikasi akan berjalan sebagai aplikasi desktop Windows native

## 🎯 Fitur

- ✅ Installer Windows (.exe)
- ✅ Desktop shortcut
- ✅ Start Menu shortcut
- ✅ Uninstaller
- ✅ Update otomatis (jika dikonfigurasi)

---

**Selamat! Aplikasi desktop Windows siap digunakan!** 🎉





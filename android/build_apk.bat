@echo off
echo ========================================
echo   ESP32 Dashboard - Build APK Script
echo ========================================
echo.

echo [1/4] Building web app...
npm run build
if %errorlevel% neq 0 (
    echo Error: Build web app gagal!
    pause
    exit /b 1
)

echo.
echo [2/4] Sync dengan Capacitor...
npx cap sync android
if %errorlevel% neq 0 (
    echo Error: Sync Capacitor gagal!
    pause
    exit /b 1
)

echo.
echo [3/4] Membuka Android Studio...
npx cap open android
if %errorlevel% neq 0 (
    echo Error: Membuka Android Studio gagal!
    pause
    exit /b 1
)

echo.
echo ========================================
echo         INSTRUKSI SELANJUTNYA:
echo ========================================
echo.
echo 1. Tunggu Android Studio terbuka
echo 2. Tunggu Gradle sync selesai
echo 3. Klik: Build → Build APK(s)
echo 4. APK akan ada di:
echo    android/app/build/outputs/apk/debug/app-debug.apk
echo.
echo 5. Test di device:
echo    - Uninstall APK lama
echo    - Install APK baru
echo    - Buka aplikasi
echo.
echo ========================================
pause

/*
 * ESP32-S3 Dashboard Controller 
 * 
 * Fitur:
 * - Membaca sensor suhu, kelembapan tanah, dan kelembapan udara
 * - Mengirim data sensor ke cloud database
 * - Kontrol LED berdasarkan jadwal dari web dashboard
 * - Auto-reconnect WiFi
 * - Kalibrasi Soil Sensor (WET: 2415, DRY: 3275)
 */

 #include <WiFi.h>
 #include <HTTPClient.h>
 #include <ArduinoJson.h>
 #include <DHT.h>
 #include <time.h>
 #include <Preferences.h>  // Untuk menyimpan kalibrasi ke flash
 #include <vector>
 
 // ===== KONFIGURASI WiFi =====
 const char* ssid = "AWP LAW OFFICE";          // Ganti dengan SSID WiFi Anda
 const char* password = "07051966";   // Ganti dengan password WiFi Anda
 
 // ===== KONFIGURASI SUPABASE =====
 const char* supabaseUrl = "https://pnrwifncqzkgxdwepdcd.supabase.co";
 const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBucndpZm5jcXprZ3hkd2VwZGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MDgyMDAsImV4cCI6MjA4MzA4NDIwMH0.pYrCCVv3WTJu9imNTgi1IMF3Lscc7CKwiZ8DiRFWMso";
 
 // ===== DEVICE ID (GANTI DENGAN ID DEVICE ANDA) =====
 // Setelah mendaftar device di dashboard, masukkan device_id di sini
 String deviceId = "fe4a4921-50be-4ad7-ac3b-b52a490feddb";  // Akan didapat dari dashboard
 
 // ===== KONFIGURASI SENSOR =====
 #define DHTPIN 11          // Pin 11 untuk DHT sensor (suhu & kelembapan udara)
 #define DHTTYPE DHT11      // Tipe DHT sensor (DHT11 atau DHT22)
 #define SOIL_SENSOR_PIN 4 // Pin 4 analog untuk sensor kelembapan tanah
 
 // ===== KONFIGURASI TDS METER (REVISI) =====
 #define TDS_PIN 3            // ADC1 pin 3, jangan pakai ADC2
 #define NUM_SAMPLES 30
 #define ADC_WIDTH 4095.0
 #define VREF 3.3
 #define TEMP_COMP_COEFF 0.02
 float tdsCalibration = 3.22;
 
 // ===== KONFIGURASI KALIBRASI SOIL SENSOR =====
 // NILAI KALIBRASI BERDASARKAN PENGUKURAN ANDA:
 int soilWetValue = 2415;    
 int soilDryValue = 3275;    // Nilai ADC saat KERING (dari pengukuran Anda)
 int soilRawValue = 0;       // Untuk menyimpan raw value
 
 Preferences preferences;
 DHT dht(DHTPIN, DHTTYPE);
 
 // ===== TIMING =====
 unsigned long lastSensorRead = 0;
 const long sensorInterval = 5000;  // Kirim data sensor setiap 5 detik
 unsigned long lastLEDCheck = 0;
 const long ledCheckInterval = 2000; // Cek konfigurasi LED setiap 2 detik
  unsigned long lastHeartbeat = 0;
  const long heartbeatInterval = 3000; // Sinyal online tiap 3 detik
 
 const char* ntpServer = "pool.ntp.org";
 const long gmtOffset_sec = 28800;  // GMT+8 untuk WITA (8 * 3600)
 const int daylightOffset_sec = 0;
 bool timeInitialized = false;
 
 // ===== LED CONTROL =====
 struct LEDConfig {
   String id;
   String name;
   int pin;
   String activeTime;
   String inactiveTime;
   String schedule;
   bool isActive;
   String mode;
 };
 
 std::vector<LEDConfig> ledConfigs;
 
 // ===== FUNGSI PROTOTYPE =====
 void connectWiFi();
 void initNTP();
 void readAndSendSensorData();
 void sendSensorData(float temp, float soilHum, float airHum, float tdsValue);
 void sendHeartbeat(); // Fungsi sinyal online
 void fetchLEDConfigs();
 void updateLEDsBasedOnSchedule();
 void updateLEDStatus(String ledId, bool isActive);
 void handleSerialCommands();
 float calibrateSoilMoisture(int rawValue);
 float readVoltageAveraged(int pin, int samples);
 float voltageToTDS(float voltage);
 float applyTemperatureCompensation(float tdsRaw, float tempC);
 
 // ===== FUNGSI UTILITY =====
 void parseTime(String timeStr, int &hour, int &minute) {
   int colonIndex = timeStr.indexOf(':');
   if (colonIndex != -1) {
     hour = timeStr.substring(0, colonIndex).toInt();
     minute = timeStr.substring(colonIndex + 1).toInt();
   } else {
     hour = 0;
     minute = 0;
   }
 }
 
 void setup() {
   Serial.begin(115200);
   delay(1000);
   
   Serial.println("\n===== ESP32-S3 Dashboard Controller =====");
   Serial.println("Dilengkapi dengan TDS Meter Monitoring");
   Serial.println("=========================================");
   
   // Load kalibrasi dari flash memory (jika ada)
   preferences.begin("soil-calib", false);
   soilWetValue = preferences.getInt("wet", 2415);  // Default dari pengukuran Anda
   soilDryValue = preferences.getInt("dry", 3275);  // Default dari pengukuran Anda
   preferences.end();
   
   Serial.println("=== KALIBRASI SOIL SENSOR ===");
   Serial.printf("Nilai BASAH (wet): %d\n", soilWetValue);
   Serial.printf("Nilai KERING (dry): %d\n", soilDryValue);
   Serial.printf("Rentang: %d - %d\n", soilWetValue, soilDryValue);
   Serial.println("=============================");
   
   // Inisialisasi sensor
   dht.begin();
   pinMode(SOIL_SENSOR_PIN, INPUT);
   pinMode(TDS_PIN, INPUT);
   
   // Inisialisasi ADC untuk TDS meter
 #if defined(ESP32)
   analogReadResolution(12);     // Set resolusi ADC ke 12 bit (0-4095)
   analogSetAttenuation(ADC_11db); // Set attenuation untuk range 0-3.3V
 #endif
   
   // Koneksi WiFi
   connectWiFi();
 
   initNTP();
   
   // Get MAC Address untuk identifikasi device
   Serial.print("MAC Address: ");
   Serial.println(WiFi.macAddress());
   
   Serial.println("Setup selesai!");
   Serial.println("Menunggu data sensor...");
   Serial.println("=========================================\n");
   
   // Kirim sinyal online pertama kali
   sendHeartbeat();
   
   // Tampilkan menu kalibrasi
   Serial.println("Ketik 'CALIB' di Serial Monitor untuk menu kalibrasi");
 }
 
 void loop() {
   // Pastikan WiFi tetap terhubung
   if (WiFi.status() != WL_CONNECTED) {
     connectWiFi();
     initNTP(); // Re-sync time after reconnect
   }
   
   unsigned long currentMillis = millis();
   
   // Baca dan kirim data sensor
   if (currentMillis - lastSensorRead >= sensorInterval) {
     lastSensorRead = currentMillis;
     readAndSendSensorData();
   }
   
   // Cek konfigurasi LED dan update berdasarkan jadwal
   if (currentMillis - lastLEDCheck >= ledCheckInterval) {
     lastLEDCheck = currentMillis;
     fetchLEDConfigs();
     updateLEDsBasedOnSchedule();
   }
   
   // Handle sinyal online (Heartbeat)
   if (currentMillis - lastHeartbeat >= heartbeatInterval) {
     lastHeartbeat = currentMillis;
     sendHeartbeat();
   }
 
   // Handle serial commands untuk kalibrasi
   handleSerialCommands();
 }
 
 // ===== FUNGSI KALIBRASI SOIL SENSOR =====
 float calibrateSoilMoisture(int rawValue) {
   // Validasi nilai kalibrasi
   if (soilDryValue <= soilWetValue) {
     Serial.println("⚠️  Soil calibration invalid! Using default mapping.");
     return map(constrain(rawValue, 0, 4095), 0, 4095, 0, 100);
   }
   
   // Kalibrasi linear dengan nilai Anda
   // Rumus: percentage = 100 * (dry - raw) / (dry - wet)
   float percentage = 100.0 * (soilDryValue - rawValue) / (soilDryValue - soilWetValue);
   
   // Constrain ke 0-100%
   return constrain(percentage, 0, 100);
 }
 
 // ===== HANDLE SERIAL COMMANDS =====
 void handleSerialCommands() {
   if (Serial.available()) {
     String cmd = Serial.readStringUntil('\n');
     cmd.trim();
     
     if (cmd.equalsIgnoreCase("CALIB")) {
       Serial.println("\n=== KALIBRASI SOIL SENSOR ===");
       Serial.println("1. Masukkan sensor ke air/tanah BASAH");
       Serial.println("   Ketik 'WET' untuk menyimpan nilai basah");
       Serial.println("2. Keringkan sensor (udara kering)");
       Serial.println("   Ketik 'DRY' untuk menyimpan nilai kering");
       Serial.println("3. Ketik 'SAVE' untuk menyimpan ke flash memory");
       Serial.println("4. Ketik 'SHOW' untuk melihat nilai saat ini");
       Serial.println("5. Ketik 'RESET' untuk reset ke nilai default Anda");
       Serial.println("===============================\n");
     }
     else if (cmd.equalsIgnoreCase("WET")) {
       soilWetValue = soilRawValue;
       Serial.printf("✅ Nilai BASAH disimpan: %d\n", soilWetValue);
     }
     else if (cmd.equalsIgnoreCase("DRY")) {
       soilDryValue = soilRawValue;
       Serial.printf("✅ Nilai KERING disimpan: %d\n", soilDryValue);
     }
     else if (cmd.equalsIgnoreCase("SAVE")) {
       preferences.begin("soil-calib", false);
       preferences.putInt("wet", soilWetValue);
       preferences.putInt("dry", soilDryValue);
       preferences.end();
       Serial.println("✅ Kalibrasi disimpan ke flash memory!");
     }
     else if (cmd.equalsIgnoreCase("SHOW")) {
       Serial.printf("\n=== NILAI KALIBRASI SAAT INI ===\n");
       Serial.printf("Nilai BASAH (wet): %d\n", soilWetValue);
       Serial.printf("Nilai KERING (dry): %d\n", soilDryValue);
       Serial.printf("Nilai RAW saat ini: %d\n", soilRawValue);
       Serial.printf("Rentang ADC: %d - %d\n", soilWetValue, soilDryValue);
       Serial.printf("===============================\n");
     }
     else if (cmd.equalsIgnoreCase("RESET")) {
       soilWetValue = 2415;
       soilDryValue = 3275;
       Serial.println("✅ Kalibrasi direset ke nilai default Anda");
       Serial.printf("  Wet: %d, Dry: %d\n", soilWetValue, soilDryValue);
     }
     else if (cmd.equalsIgnoreCase("TEST")) {
       Serial.println("\n=== TEST KALIBRASI ===");
       Serial.println("Basah (100%): " + String(calibrateSoilMoisture(soilWetValue)) + "%");
       Serial.println("Kering (0%): " + String(calibrateSoilMoisture(soilDryValue)) + "%");
       Serial.println("Mid-point: " + String(calibrateSoilMoisture((soilWetValue + soilDryValue) / 2)) + "%");
       Serial.println("=====================\n");
     }
   }
 }
 
 void initNTP() {
   Serial.println("Menginisialisasi NTP...");
   configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
   
   // Tunggu sampai waktu tersinkronisasi
   struct tm timeinfo;
   int attempts = 0;
   while (!getLocalTime(&timeinfo) && attempts < 10) {
     Serial.print(".");
     delay(500);
     attempts++;
   }
   
   if (getLocalTime(&timeinfo)) {
     timeInitialized = true;
     Serial.println("\nWaktu tersinkronisasi!");
     Serial.printf("Waktu sekarang: %02d:%02d:%02d\n", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
     Serial.printf("Tanggal: %d-%02d-%02d (Hari ke-%d)\n", timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, timeinfo.tm_wday);
   } else {
     Serial.println("\nGagal sinkronisasi waktu!");
   }
 }
 
 void connectWiFi() {
   Serial.print("Menghubungkan ke WiFi");
   WiFi.begin(ssid, password);
   
   int attempts = 0;
   while (WiFi.status() != WL_CONNECTED && attempts < 20) {
     delay(500);
     Serial.print(".");
     attempts++;
   }
   
   if (WiFi.status() == WL_CONNECTED) {
     Serial.println("\nWiFi terhubung!");
     Serial.print("IP Address: ");
     Serial.println(WiFi.localIP());
   } else {
     Serial.println("\nGagal terhubung ke WiFi!");
   }
 }
 
 // Fungsi untuk membaca voltage TDS dengan averaging
 float readVoltageAveraged(int pin, int samples) {
   long sum = 0;
   for (int i = 0; i < samples; i++) {
     sum += analogRead(pin);
     delay(2);
   }
   float avgRaw = sum / (float)samples;
   float voltage = (avgRaw / ADC_WIDTH) * VREF;
   return voltage;
 }
 
 // Fungsi untuk mengkonversi voltage ke TDS
 float voltageToTDS(float voltage) {
   float tds = (133.42 * pow(voltage, 3) - 255.86 * pow(voltage, 2) + 857.39 * voltage) * tdsCalibration;
   if (tds < 0) tds = 0;
   return tds;
 }
 
 // Fungsi untuk kompensasi suhu pada TDS
 float applyTemperatureCompensation(float tdsRaw, float tempC) {
   return tdsRaw / (1.0 + TEMP_COMP_COEFF * (tempC - 25.0));
 }
 
 void readAndSendSensorData() {
   Serial.println("\n--- Membaca Sensor ---");
   
   // Variabel untuk data sensor
   float temperature = NAN;
   float airHumidity = NAN;
   float soilHumidity = NAN;
   float tdsValue = NAN;
   
   bool dhtSuccess = false;
   bool soilSuccess = false;
   bool tdsSuccess = false;
   
   // Baca DHT22 (suhu & kelembapan udara)
   temperature = dht.readTemperature();
   airHumidity = dht.readHumidity();
   
   if (isnan(temperature) || isnan(airHumidity)) {
     Serial.println("❌ Error: Gagal membaca DHT sensor!");
     // Tetapi kita lanjutkan ke sensor lain
   } else {
     dhtSuccess = true;
     Serial.printf("✅ Suhu: %.1f°C\n", temperature);
     Serial.printf("✅ Kelembapan Udara: %.1f%%\n", airHumidity);
   }
   
   // Baca dan kalibrasi sensor tanah dengan nilai Anda
   soilRawValue = analogRead(SOIL_SENSOR_PIN);
   if (soilRawValue >= 0) {
     soilHumidity = calibrateSoilMoisture(soilRawValue);
     soilSuccess = true;
     
     Serial.printf("✅ Kelembapan Tanah: %.1f%% (Raw: %d)\n", soilHumidity, soilRawValue);
     
     // Kategori kelembaban tanah berdasarkan persentase
     Serial.print("   Status Tanah: ");
     if (soilHumidity >= 80) Serial.println("SANGAT BASAH");
     else if (soilHumidity >= 60) Serial.println("BASAH");
     else if (soilHumidity >= 40) Serial.println("NORMAL");
     else if (soilHumidity >= 20) Serial.println("KERING");
     else Serial.println("SANGAT KERING");
   } else {
     Serial.println("❌ Error: Gagal membaca sensor tanah!");
   }
   
   // Baca TDS meter dengan metode baru
   Serial.println("💦 MEMBACA TDS METER...");
   
   float voltage = readVoltageAveraged(TDS_PIN, NUM_SAMPLES);
   float tdsRaw = voltageToTDS(voltage);
   
   // Gunakan suhu dari DHT jika tersedia, jika tidak gunakan 25°C
   float tempForCompensation = dhtSuccess ? temperature : 25.0;
   float tdsCompensated = applyTemperatureCompensation(tdsRaw, tempForCompensation);
   
   tdsValue = tdsCompensated;
   tdsSuccess = true;
   
   // Tampilkan data TDS secara detail
   Serial.println("💦 DATA TDS METER:");
   Serial.printf("   - Voltage: %.3f V\n", voltage);
   Serial.printf("   - TDS Raw: %.1f ppm\n", tdsRaw);
   Serial.printf("   - TDS Compensated: %.1f ppm\n", tdsCompensated);
   Serial.printf("   - Kalibrasi: %.2f\n", tdsCalibration);
   Serial.printf("   - Suhu Kompensasi: %.1f°C\n", tempForCompensation);
   
   // Kategori kualitas air berdasarkan TDS
   Serial.print("   - Kualitas Air: ");
   if (tdsValue < 50) {
     Serial.println("Air Murni");
   } else if (tdsValue < 150) {
     Serial.println("Air Sangat Baik");
   } else if (tdsValue < 250) {
     Serial.println("Air Baik");
   } else if (tdsValue < 350) {
     Serial.println("Air Cukup Baik");
   } else if (tdsValue < 500) {
     Serial.println("Air Normal");
   } else if (tdsValue < 900) {
     Serial.println("Air Sedang");
   } else if (tdsValue < 1200) {
     Serial.println("Air Kurang Baik");
   } else {
     Serial.println("Air Tidak Layak");
   }
   
   // Kirim ke Supabase hanya jika ada data yang berhasil dibaca
   if (dhtSuccess || soilSuccess || tdsSuccess) {
     sendSensorData(temperature, soilHumidity, airHumidity, tdsValue);
   } else {
     Serial.println("❌ Semua sensor gagal dibaca!");
   }
 }
 
 void sendSensorData(float temp, float soilHum, float airHum, float tdsValue) {
   if (WiFi.status() != WL_CONNECTED) {
     Serial.println("❌ WiFi tidak terhubung!");
     return;
   }
   
   HTTPClient http;
   String url = String(supabaseUrl) + "/rest/v1/sensor_data";
   
   http.begin(url);
   http.addHeader("Content-Type", "application/json");
   http.addHeader("apikey", supabaseKey);
   http.addHeader("Authorization", "Bearer " + String(supabaseKey));
   http.addHeader("Prefer", "return=minimal");
   
   // Buat JSON payload
   StaticJsonDocument<256> doc;
   doc["device_id"] = deviceId;
   
   // Hanya tambahkan field jika nilainya valid
   if (!isnan(temp)) doc["temperature"] = temp;
   if (!isnan(soilHum)) doc["soil_humidity"] = soilHum;
   if (!isnan(airHum)) doc["air_humidity"] = airHum;
   if (!isnan(tdsValue)) doc["tds"] = tdsValue;
   
   String jsonPayload;
   serializeJson(doc, jsonPayload);
   
   Serial.println("☁️  Mengirim data ke cloud...");
   Serial.printf("Payload: %s\n", jsonPayload.c_str());
   
   int httpCode = http.POST(jsonPayload);
   
   if (httpCode > 0) {
     if (httpCode == 201 || httpCode == 200) {
       Serial.println("✅ Data berhasil dikirim!");
     } else {
       Serial.printf("❌ HTTP Error Code: %d\n", httpCode);
       String response = http.getString();
       if (response.length() > 0) {
         Serial.printf("Response: %s\n", response.c_str());
       }
     }
   } else {
     Serial.printf("❌ Error: %s\n", http.errorToString(httpCode).c_str());
   }
   
   http.end();
 }
 
 void sendHeartbeat() {
   if (WiFi.status() != WL_CONNECTED) return;
 
   HTTPClient http;
   // Memanggil RPC function yang kita buat di SQL Editor
   String url = String(supabaseUrl) + "/rest/v1/rpc/update_device_heartbeat";
 
   http.begin(url);
   http.addHeader("Content-Type", "application/json");
   http.addHeader("apikey", supabaseKey);
   http.addHeader("Authorization", "Bearer " + String(supabaseKey));
 
   StaticJsonDocument<64> doc;
   doc["dev_id"] = deviceId; // Nama parameter harus sama dengan di fungsi SQL
   
   String jsonPayload;
   serializeJson(doc, jsonPayload);
 
   Serial.println("💓 Mengirim sinyal Heartbeat (Update Status Online)...");
   int httpCode = http.POST(jsonPayload);
   
   if (httpCode == 200 || httpCode == 204) {
     Serial.println("✅ Status Online terupdate di database");
   } else {
     Serial.printf("❌ Gagal update status: %d\n", httpCode);
     String response = http.getString();
     Serial.println("Response: " + response);
   }
 
   http.end();
 }
 
 void fetchLEDConfigs() {
   if (WiFi.status() != WL_CONNECTED) {
     return;
   }
   
   HTTPClient http;
   String url = String(supabaseUrl) + "/rest/v1/led_configs?device_id=eq." + deviceId;
   
   http.begin(url);
   http.addHeader("apikey", supabaseKey);
   http.addHeader("Authorization", "Bearer " + String(supabaseKey));
   
   int httpCode = http.GET();
   
   if (httpCode == 200) {
     String payload = http.getString();
     
     DynamicJsonDocument doc(2048);
     DeserializationError error = deserializeJson(doc, payload);
     
     if (!error) {
       ledConfigs.clear();
       JsonArray array = doc.as<JsonArray>();
       
       for (JsonObject obj : array) {
         LEDConfig config;
         config.id = obj["id"].as<String>();
         config.name = obj["name"].as<String>();
         config.pin = obj["pin"].as<int>();
         config.activeTime = obj["active_time"].as<String>();
         config.inactiveTime = obj["inactive_time"].as<String>();
         config.schedule = obj["schedule"].as<String>();
         config.isActive = obj["is_active"].as<bool>();
         config.mode = obj["mode"].as<String>();
         if (config.mode.length() == 0) {
           config.mode = "manual";  // Default ke manual jika kosong
         }
         
         ledConfigs.push_back(config);
         
         // Setup pin sebagai output
         pinMode(config.pin, OUTPUT);
         
         // Untuk mode manual, langsung set LED sesuai status is_active
         if (config.mode == "manual") {
           digitalWrite(config.pin, config.isActive ? HIGH : LOW);
         }
       }
       
       Serial.printf("Loaded %d LED configurations\n", ledConfigs.size());
     }
   }
   
   http.end();
 }
 
 void updateLEDsBasedOnSchedule() {
   struct tm timeinfo;
   bool hasTime = timeInitialized && getLocalTime(&timeinfo);
   
   int currentHour = 0, currentMin = 0, currentDayOfWeek = 0, currentDayOfMonth = 1;
   if (hasTime) {
     currentHour = timeinfo.tm_hour;
     currentMin = timeinfo.tm_min;
     currentDayOfWeek = timeinfo.tm_wday;
     currentDayOfMonth = timeinfo.tm_mday;
   }
   
   Serial.printf("\n--- Update LED (Waktu: %02d:%02d, Hari: %d, Tanggal: %d) ---\n", 
                 currentHour, currentMin, currentDayOfWeek, currentDayOfMonth);
   
   for (LEDConfig& config : ledConfigs) {
     // Mode manual: LED dikontrol langsung dari dashboard, tidak perlu jadwal
     if (config.mode == "manual") {
       digitalWrite(config.pin, config.isActive ? HIGH : LOW);
       Serial.printf("LED '%s' (Pin %d): %s | Mode: MANUAL\n",
                     config.name.c_str(), config.pin, 
                     config.isActive ? "ON" : "OFF");
       continue;
     }
     
     // Mode auto: LED dikontrol berdasarkan jadwal waktu
     if (!hasTime) {
       Serial.println("Waktu belum tersinkronisasi, skip LED mode auto");
       continue;
     }
     
     // Parse waktu aktif dan tidak aktif
     int activeHour, activeMin, inactiveHour, inactiveMin;
     parseTime(config.activeTime, activeHour, activeMin);
     parseTime(config.inactiveTime, inactiveHour, inactiveMin);
     
     bool shouldBeOn = false;
     // Konversi ke menit untuk perbandingan lebih mudah
     int currentTimeInMins = currentHour * 60 + currentMin;
     int activeTimeInMins = activeHour * 60 + activeMin;
     int inactiveTimeInMins = inactiveHour * 60 + inactiveMin;
     
     // Cek apakah waktu sekarang dalam rentang aktif
     bool inTimeRange = false;
     if (activeTimeInMins <= inactiveTimeInMins) {
       // Rentang normal (misal: 08:00 - 18:00)
       inTimeRange = (currentTimeInMins >= activeTimeInMins && currentTimeInMins < inactiveTimeInMins);
     } else {
       // Rentang melewati tengah malam (misal: 22:00 - 06:00)
       inTimeRange = (currentTimeInMins >= activeTimeInMins || currentTimeInMins < inactiveTimeInMins);
     }
     
     // Cek berdasarkan jadwal
     if (config.schedule == "daily") {
       // Setiap hari
       shouldBeOn = inTimeRange;
     } 
     else if (config.schedule == "weekly") {
       // Hanya hari kerja (Senin-Jumat)
       bool isWeekday = (currentDayOfWeek >= 1 && currentDayOfWeek <= 5);
       shouldBeOn = isWeekday && inTimeRange;
     } 
     else if (config.schedule == "monthly") {
       // Hanya tanggal 1-15 setiap bulan
       bool isFirstHalf = (currentDayOfMonth >= 1 && currentDayOfMonth <= 15);
       shouldBeOn = isFirstHalf && inTimeRange;
     }
     
     // Update LED
     digitalWrite(config.pin, shouldBeOn ? HIGH : LOW);
     
     Serial.printf("LED '%s' (Pin %d): %s | Mode: AUTO | Jadwal: %s | Waktu Aktif: %s-%s\n",
                   config.name.c_str(), config.pin, 
                   shouldBeOn ? "ON" : "OFF",
                   config.schedule.c_str(),
                   config.activeTime.c_str(), config.inactiveTime.c_str());
     
     // Update status di database jika berbeda
     if (config.isActive != shouldBeOn) {
       updateLEDStatus(config.id, shouldBeOn);
       config.isActive = shouldBeOn;
     }
   }
 }
 
 void updateLEDStatus(String ledId, bool isActive) {
   if (WiFi.status() != WL_CONNECTED) {
     return;
   }
   
   HTTPClient http;
   String url = String(supabaseUrl) + "/rest/v1/led_configs?id=eq." + ledId;
   
   http.begin(url);
   http.addHeader("Content-Type", "application/json");
   http.addHeader("apikey", supabaseKey);
   http.addHeader("Authorization", "Bearer " + String(supabaseKey));
   http.addHeader("Prefer", "return=minimal");
   
   String jsonPayload = "{\"is_active\":" + String(isActive ? "true" : "false") + "}";
   
   int httpCode = http.PATCH(jsonPayload);
   
   if (httpCode == 200 || httpCode == 204) {
     Serial.printf("Status LED %s diupdate ke %s\n", ledId.c_str(), isActive ? "ON" : "OFF");
   } else {
     Serial.printf("Gagal update status LED: %d\n", httpCode);
   }
   
   http.end();
 }
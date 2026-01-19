# ☁️ Cara Mengakses Penyimpanan Data Cloud

Panduan lengkap untuk mengakses dan mengelola data di Supabase cloud database.

## 📊 Struktur Database

Aplikasi ini menggunakan **Supabase** (PostgreSQL) dengan 3 tabel utama:

### 1. **devices** - Data Perangkat ESP32
```sql
- id: string (UUID)
- name: string (nama perangkat)
- mac_address: string (alamat MAC)
- user_id: string (ID pemilik)
- wifi_ssid: string (nama WiFi)
- last_seen: timestamp (terakhir online)
- created_at: timestamp
```

### 2. **sensor_data** - Data Sensor
```sql
- id: string (UUID)
- device_id: string (relasi ke devices)
- temperature: float (suhu udara)
- air_humidity: float (kelembaban udara)
- soil_humidity: float (kelembaban tanah)
- tds: float (TDS air)
- created_at: timestamp
```

### 3. **led_configs** - Konfigurasi LED
```sql
- id: string (UUID)
- device_id: string (relasi ke devices)
- name: string (nama konfigurasi)
- pin: integer (nomor pin ESP32)
- schedule: string (jadwal on/off)
- active_time: time (waktu aktif)
- inactive_time: time (waktu non-aktif)
- is_active: boolean (status aktif)
- created_at: timestamp
```

## 🔧 Setup Environment Variables

### 1. **File .env** (Root Project)
```env
VITE_SUPABASE_URL=https://igjkpgdfybjaazzgfqtc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

### 2. **Cara Mendapatkan API Keys:**
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project: `igjkpgdfybjaazzgfqtc`
3. **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

## 📱 Cara Mengakses Data di Kode

### Import Supabase Client
```typescript
import { supabase } from '@/integrations/supabase/client';
```

### 1. **Membaca Data Devices**
```typescript
// Ambil semua devices user
const { data: devices, error } = await supabase
  .from('devices')
  .select('*')
  .eq('user_id', user.id);

// Ambil device tertentu
const { data: device, error } = await supabase
  .from('devices')
  .select('*')
  .eq('id', deviceId)
  .single();
```

### 2. **Membaca Data Sensor**
```typescript
// Data sensor terbaru dari device
const { data: sensorData, error } = await supabase
  .from('sensor_data')
  .select('*')
  .eq('device_id', deviceId)
  .order('created_at', { ascending: false })
  .limit(10);

// Data sensor dalam range waktu
const { data: historicalData, error } = await supabase
  .from('sensor_data')
  .select('*')
  .eq('device_id', deviceId)
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

### 3. **Membaca Konfigurasi LED**
```typescript
// Semua konfigurasi LED dari device
const { data: ledConfigs, error } = await supabase
  .from('led_configs')
  .select('*')
  .eq('device_id', deviceId);

// Konfigurasi aktif saja
const { data: activeConfigs, error } = await supabase
  .from('led_configs')
  .select('*')
  .eq('device_id', deviceId)
  .eq('is_active', true);
```

### 4. **Menambah Data Baru**
```typescript
// Tambah device baru
const { data, error } = await supabase
  .from('devices')
  .insert({
    name: 'ESP32 Sensor 1',
    mac_address: 'AA:BB:CC:DD:EE:FF',
    user_id: user.id,
    wifi_ssid: 'MyWiFi'
  });

// Tambah data sensor
const { data, error } = await supabase
  .from('sensor_data')
  .insert({
    device_id: deviceId,
    temperature: 25.5,
    air_humidity: 65.0,
    soil_humidity: 45.0,
    tds: 120.0
  });
```

### 5. **Update Data**
```typescript
// Update nama device
const { data, error } = await supabase
  .from('devices')
  .update({ name: 'ESP32 Greenhouse' })
  .eq('id', deviceId);

// Update status LED
const { data, error } = await supabase
  .from('led_configs')
  .update({
    is_active: false,
    schedule: '08:00-18:00'
  })
  .eq('id', configId);
```

### 6. **Menghapus Data**
```typescript
// Hapus konfigurasi LED
const { error } = await supabase
  .from('led_configs')
  .delete()
  .eq('id', configId);

// Hapus device (akan otomatis hapus data terkait)
const { error } = await supabase
  .from('devices')
  .delete()
  .eq('id', deviceId);
```

## 🔍 Real-time Subscriptions

### Subscribe ke Perubahan Data
```typescript
// Listen perubahan sensor data
const channel = supabase
  .channel('sensor-updates')
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'sensor_data',
      filter: `device_id=eq.${deviceId}`
    },
    (payload) => {
      console.log('New sensor data:', payload.new);
      // Update UI real-time
    }
  )
  .subscribe();

// Unsubscribe
channel.unsubscribe();
```

## 🛡️ Authentication & Security

### Row Level Security (RLS)
Supabase menggunakan RLS - user hanya bisa akses data mereka sendiri:
```sql
-- Policy example: users can only see their own devices
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own devices" ON devices
  FOR SELECT USING (auth.uid() = user_id);
```

### Authentication State
```typescript
import { useAuth } from '@/hooks/useAuth';

const { user, loading } = useAuth();

// Pastikan user login sebelum akses data
if (!user) {
  // Redirect to login
  navigate('/auth');
}
```

## 🌐 Mengakses dari ESP32

### HTTP Requests dari ESP32
```cpp
#include <HTTPClient.h>

// Kirim data sensor ke Supabase
void sendSensorData(float temp, float humidity, float soil) {
  HTTPClient http;
  http.begin("https://igjkpgdfybjaazzgfqtc.supabase.co/rest/v1/sensor_data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer YOUR_ANON_KEY");
  http.addHeader("apikey", "YOUR_ANON_KEY");

  String jsonData = "{";
  jsonData += "\"device_id\":\"" + deviceId + "\",";
  jsonData += "\"temperature\":" + String(temp) + ",";
  jsonData += "\"air_humidity\":" + String(humidity) + ",";
  jsonData += "\"soil_humidity\":" + String(soil);
  jsonData += "}";

  int httpResponseCode = http.POST(jsonData);
  http.end();
}
```

## 📊 Dashboard & Analytics

### Menggunakan Data untuk Charts
```typescript
// Data untuk chart suhu 24 jam terakhir
const { data: tempData, error } = await supabase
  .from('sensor_data')
  .select('temperature, created_at')
  .eq('device_id', deviceId)
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000))
  .order('created_at', { ascending: true });
```

## 🚀 Best Practices

1. **Error Handling**: Selalu check `error` dari Supabase response
2. **Loading States**: Gunakan loading indicators saat fetch data
3. **Caching**: Cache data lokal untuk performa lebih baik
4. **Pagination**: Untuk data besar, gunakan pagination
5. **Optimistic Updates**: Update UI dulu, baru sync ke cloud

## 🔧 Troubleshooting

### Error: "relation does not exist"
- Pastikan nama tabel benar (case-sensitive)
- Check Supabase dashboard untuk konfirmasi nama tabel

### Error: "permission denied"
- Pastikan user sudah login
- Check RLS policies di Supabase

### Error: "connection timeout"
- Check internet connection
- Supabase URL benar?

---

**Dashboard URL**: https://igjkpgdfybjaazzgfqtc.supabase.co
**Project ID**: `igjkpgdfybjaazzgfqtc`

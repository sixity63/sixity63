# 🚀 Setup Supabase Sendiri (Tanpa Lovable Cloud)

Panduan lengkap untuk menggunakan Supabase langsung dengan akun Anda sendiri.

## 📋 Langkah-langkah Setup

### 1. **Buat Project Supabase Baru**

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Login dengan akun Supabase Anda (atau daftar jika belum punya)
3. Klik **"New Project"**
4. Isi detail project:
   - **Name**: `sixity-iot-dashboard` (atau nama lain)
   - **Database Password**: Buat password yang kuat (simpan baik-baik!)
   - **Region**: Pilih region terdekat (misalnya: Southeast Asia)
5. Klik **"Create new project"**
6. Tunggu beberapa menit hingga project siap

### 2. **Dapatkan API Keys**

1. Di Supabase Dashboard, pilih project Anda
2. Buka **Settings** → **API**
3. Copy informasi berikut:
   - **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - **anon public key** (untuk client-side)
   - **service_role key** (untuk server-side, jangan share!)

### 3. **Setup Database Schema**

1. Di Supabase Dashboard, buka **SQL Editor**
2. Klik **"New query"**
3. Copy dan paste SQL berikut satu per satu (urutannya penting!):

#### **Migration 1: Tabel Dasar**
```sql
-- Create devices table to store ESP32 devices
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  mac_address TEXT UNIQUE NOT NULL,
  wifi_ssid TEXT,
  wifi_password TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sensor_data table for monitoring
CREATE TABLE public.sensor_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  temperature DECIMAL(5,2),
  soil_humidity DECIMAL(5,2),
  air_humidity DECIMAL(5,2),
  tds DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create led_configs table for LED control
CREATE TABLE public.led_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin INTEGER NOT NULL CHECK (pin >= 3 AND pin <= 35),
  active_time TIME,
  inactive_time TIME,
  schedule TEXT NOT NULL CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  mode TEXT NOT NULL DEFAULT 'manual',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_sensor_data_device_id ON public.sensor_data(device_id);
CREATE INDEX idx_sensor_data_created_at ON public.sensor_data(created_at DESC);
CREATE INDEX idx_led_configs_device_id ON public.led_configs(device_id);
CREATE INDEX idx_devices_mac_address ON public.devices(mac_address);
```

4. Klik **"Run"** untuk menjalankan query

#### **Migration 2: Trigger untuk updated_at**
```sql
-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update updated_at when devices table is modified
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

5. Klik **"Run"** untuk menjalankan query

#### **Migration 3: Row Level Security (RLS)**
```sql
-- Enable Row Level Security
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.led_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devices
CREATE POLICY "Users can view their own devices" 
ON public.devices FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices" 
ON public.devices FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" 
ON public.devices FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" 
ON public.devices FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for sensor_data
CREATE POLICY "Users can view sensor data from their devices" 
ON public.sensor_data FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.devices 
  WHERE devices.id = sensor_data.device_id 
  AND devices.user_id = auth.uid()
));

CREATE POLICY "Allow devices to insert sensor data" 
ON public.sensor_data FOR INSERT 
WITH CHECK (true);

-- RLS Policies for led_configs
CREATE POLICY "Users can view LED configs from their devices" 
ON public.led_configs FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.devices 
  WHERE devices.id = led_configs.device_id 
  AND devices.user_id = auth.uid()
));

CREATE POLICY "Users can insert LED configs for their devices" 
ON public.led_configs FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.devices 
  WHERE devices.id = led_configs.device_id 
  AND devices.user_id = auth.uid()
));

CREATE POLICY "Users can update LED configs for their devices" 
ON public.led_configs FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.devices 
  WHERE devices.id = led_configs.device_id 
  AND devices.user_id = auth.uid()
));

CREATE POLICY "Users can delete LED configs for their devices" 
ON public.led_configs FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.devices 
  WHERE devices.id = led_configs.device_id 
  AND devices.user_id = auth.uid()
));

CREATE POLICY "Allow devices to read LED configs" 
ON public.led_configs FOR SELECT 
USING (true);
```

6. Klik **"Run"** untuk menjalankan query

### 4. **Setup Authentication**

1. Di Supabase Dashboard, buka **Authentication** → **Settings**
2. Pastikan **"Enable Email Signup"** aktif
3. (Opsional) Atur **Site URL** ke URL aplikasi Anda
4. (Opsional) Atur **Redirect URLs** untuk email confirmation

### 5. **Update Environment Variables**

1. Di root project, buat file `.env` (jika belum ada)
2. Tambahkan/update variabel berikut:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key_here
```

**Catatan**: Ganti `xxxxx` dengan Project ID Anda dan `your_anon_public_key_here` dengan anon public key dari step 2.

### 6. **Verifikasi Setup**

1. Restart development server:
   ```bash
   npm run dev
   ```

2. Buka aplikasi di browser
3. Coba daftar/login dengan email baru
4. Jika berhasil, berarti setup sudah benar!

## 🔍 Cara Cek Database

### Melalui Supabase Dashboard:
1. Buka **Table Editor** di sidebar
2. Anda akan melihat 3 tabel:
   - `devices`
   - `sensor_data`
   - `led_configs`

### Melalui SQL Editor:
```sql
-- Lihat semua devices
SELECT * FROM devices;

-- Lihat semua sensor data
SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 10;

-- Lihat semua LED configs
SELECT * FROM led_configs;
```

## 🔐 Security Notes

1. **Jangan share service_role key** - ini untuk server-side only
2. **anon public key** aman untuk client-side (dilindungi RLS)
3. **RLS Policies** memastikan user hanya bisa akses data mereka sendiri
4. **Password database** harus disimpan dengan aman

## 🐛 Troubleshooting

### Error: "relation does not exist"
- Pastikan semua migration sudah dijalankan
- Cek nama tabel (case-sensitive)

### Error: "permission denied"
- Pastikan RLS policies sudah dibuat
- Cek apakah user sudah login

### Error: "Invalid API key"
- Pastikan environment variables sudah di-update
- Restart development server setelah update .env

### Data tidak muncul
- Cek RLS policies
- Pastikan user_id sesuai dengan auth.uid()

## 📚 Referensi

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

**Selamat!** Sekarang Anda sudah menggunakan Supabase dengan akun Anda sendiri! 🎉



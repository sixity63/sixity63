-- ============================================
-- Setup Database Lengkap untuk Sixity IoT Dashboard
-- ============================================
-- Jalankan query ini di Supabase SQL Editor
-- Urutan penting! Jangan skip langkah.

-- ============================================
-- STEP 1: Buat Tabel Dasar
-- ============================================

-- Create devices table to store ESP32 devices
CREATE TABLE IF NOT EXISTS public.devices (
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
CREATE TABLE IF NOT EXISTS public.sensor_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  temperature DECIMAL(5,2),
  soil_humidity DECIMAL(5,2),
  air_humidity DECIMAL(5,2),
  tds DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create led_configs table for LED control
CREATE TABLE IF NOT EXISTS public.led_configs (
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

-- ============================================
-- STEP 2: Buat Indexes untuk Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id ON public.sensor_data(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at ON public.sensor_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_led_configs_device_id ON public.led_configs(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_mac_address ON public.devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);

-- ============================================
-- STEP 3: Buat Function dan Trigger
-- ============================================

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update updated_at when devices table is modified
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at 
    BEFORE UPDATE ON devices
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.led_configs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Buat RLS Policies untuk devices
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can insert their own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can update their own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can delete their own devices" ON public.devices;

-- Create policies
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

-- ============================================
-- STEP 6: Buat RLS Policies untuk sensor_data
-- ============================================

DROP POLICY IF EXISTS "Users can view sensor data from their devices" ON public.sensor_data;
DROP POLICY IF EXISTS "Allow devices to insert sensor data" ON public.sensor_data;

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

-- ============================================
-- STEP 7: Buat RLS Policies untuk led_configs
-- ============================================

DROP POLICY IF EXISTS "Users can view LED configs from their devices" ON public.led_configs;
DROP POLICY IF EXISTS "Users can insert LED configs for their devices" ON public.led_configs;
DROP POLICY IF EXISTS "Users can update LED configs for their devices" ON public.led_configs;
DROP POLICY IF EXISTS "Users can delete LED configs for their devices" ON public.led_configs;
DROP POLICY IF EXISTS "Allow devices to read LED configs" ON public.led_configs;

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

-- ============================================
-- SELESAI! Database sudah siap digunakan
-- ============================================
-- Sekarang update file .env dengan:
-- VITE_SUPABASE_URL=https://xxxxx.supabase.co
-- VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here



-- Create devices table to store ESP32 devices
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  mac_address TEXT UNIQUE NOT NULL,
  wifi_ssid TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sensor_data table for monitoring
CREATE TABLE public.sensor_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  temperature DECIMAL(5,2),
  soil_humidity DECIMAL(5,2),
  air_humidity DECIMAL(5,2),
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
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_sensor_data_device_id ON public.sensor_data(device_id);
CREATE INDEX idx_sensor_data_created_at ON public.sensor_data(created_at DESC);
CREATE INDEX idx_led_configs_device_id ON public.led_configs(device_id);
CREATE INDEX idx_devices_mac_address ON public.devices(mac_address);

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
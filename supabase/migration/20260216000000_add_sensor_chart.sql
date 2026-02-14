-- ============================================
-- Tabel sensor_chart: khusus untuk chart/grafik di web
-- Data interval tiap 10 menit (diisi oleh cron dari sensor_data)
-- Realtime dashboard tetap pakai sensor_data
-- ============================================

CREATE TABLE IF NOT EXISTS public.sensor_chart (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  temperature DECIMAL(5,2),
  soil_humidity DECIMAL(5,2),
  air_humidity DECIMAL(5,2),
  tds DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_chart_device_id ON public.sensor_chart(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_chart_created_at ON public.sensor_chart(created_at DESC);

ALTER TABLE public.sensor_chart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sensor_chart from their devices"
ON public.sensor_chart FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.devices
  WHERE devices.id = sensor_chart.device_id AND devices.user_id = auth.uid()
));

CREATE POLICY "Allow insert sensor_chart"
ON public.sensor_chart FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE sensor_chart;

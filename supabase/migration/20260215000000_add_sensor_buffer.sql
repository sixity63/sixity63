-- ============================================
-- Tabel sensor_buffer: data sementara tiap 5 detik
-- Diisi ESP32 setiap 5 detik, lalu setiap 10 menit data disalin ke sensor_data dan buffer dihapus
-- ============================================

CREATE TABLE IF NOT EXISTS public.sensor_buffer (
  device_id UUID NOT NULL PRIMARY KEY REFERENCES public.devices(id) ON DELETE CASCADE,
  temperature DECIMAL(5,2),
  soil_humidity DECIMAL(5,2),
  air_humidity DECIMAL(5,2),
  tds DECIMAL(5,2),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_buffer_updated_at ON public.sensor_buffer(updated_at DESC);

ALTER TABLE public.sensor_buffer ENABLE ROW LEVEL SECURITY;

-- RLS: user bisa baca buffer device sendiri
CREATE POLICY "Users can view sensor_buffer from their devices"
ON public.sensor_buffer FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.devices
  WHERE devices.id = sensor_buffer.device_id AND devices.user_id = auth.uid()
));

CREATE POLICY "Allow insert sensor_buffer"
ON public.sensor_buffer FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update sensor_buffer"
ON public.sensor_buffer FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete sensor_buffer"
ON public.sensor_buffer FOR DELETE USING (true);

-- Trigger: update device last_seen dari buffer
CREATE OR REPLACE FUNCTION update_device_last_seen_from_buffer()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices SET last_seen = NOW() WHERE id = NEW.device_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_last_seen_from_sensor_buffer ON sensor_buffer;
CREATE TRIGGER trigger_update_last_seen_from_sensor_buffer
  AFTER INSERT OR UPDATE ON sensor_buffer
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen_from_buffer();

-- Trigger: updated_at on update
CREATE OR REPLACE FUNCTION update_sensor_buffer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sensor_buffer_updated_at ON sensor_buffer;
CREATE TRIGGER trigger_sensor_buffer_updated_at
  BEFORE UPDATE ON sensor_buffer
  FOR EACH ROW
  EXECUTE FUNCTION update_sensor_buffer_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE sensor_buffer;

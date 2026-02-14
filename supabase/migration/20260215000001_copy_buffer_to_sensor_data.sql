-- ============================================
-- Function: Copy sensor_buffer -> sensor_data, lalu kosongkan buffer
-- Dipanggil setiap 10 menit oleh pg_cron
-- ============================================

CREATE OR REPLACE FUNCTION copy_buffer_to_sensor_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Salin data dari buffer ke sensor_data (history)
  INSERT INTO sensor_data (device_id, temperature, soil_humidity, air_humidity, tds)
  SELECT device_id, temperature, soil_humidity, air_humidity, tds
  FROM sensor_buffer;
  
  -- Kosongkan buffer (data sudah dipindah)
  TRUNCATE TABLE sensor_buffer;
END;
$$;

-- ============================================
-- JADWAL: Jalankan setiap 10 menit
-- Di Supabase, enable extension pg_cron dulu (Database -> Extensions -> pg_cron)
-- Lalu jalankan query di bawah ini sekali:
-- ============================================
-- SELECT cron.schedule(
--   'copy-sensor-buffer-every-10min',
--   '*/10 * * * *',
--   $$SELECT copy_buffer_to_sensor_data()$$
-- );
-- ============================================
-- Untuk cek jadwal: SELECT * FROM cron.job;
-- Untuk hapus jadwal: SELECT cron.unschedule('copy-sensor-buffer-every-10min');

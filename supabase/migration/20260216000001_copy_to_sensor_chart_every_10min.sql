-- ============================================
-- Setiap 10 menit: salin data terbaru per device dari sensor_data ke sensor_chart
-- Chart/grafik di web baca dari sensor_chart (interval 10 menit)
-- ============================================

CREATE OR REPLACE FUNCTION copy_latest_to_sensor_chart()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO sensor_chart (device_id, temperature, soil_humidity, air_humidity, tds)
  SELECT DISTINCT ON (device_id)
    device_id,
    temperature,
    soil_humidity,
    air_humidity,
    tds
  FROM sensor_data
  ORDER BY device_id, created_at DESC;
END;
$$;

-- Jadwal: jalankan setiap 10 menit
-- Di Supabase: Database -> Extensions -> enable pg_cron, lalu jalankan sekali:
-- SELECT cron.schedule(
--   'copy-to-sensor-chart-every-10min',
--   '*/10 * * * *',
--   $$SELECT copy_latest_to_sensor_chart()$$
-- );

# Setup Tabel sensor_chart (untuk Chart/Grafik)

## Alur
- **sensor_data** (tabel lama): Data realtime dari ESP32 (mis. tiap 5 detik). Dipakai untuk **dashboard realtime**.
- **sensor_chart** (tabel baru): Khusus **chart/grafik** di web. Diisi setiap **10 menit** oleh cron (salin data terbaru dari sensor_data).

## 1. Jalankan migration

Di **Supabase Dashboard** → **SQL Editor**, jalankan berurutan:

1. Isi file `supabase/migration/20260216000000_add_sensor_chart.sql`
2. Isi file `supabase/migration/20260216000001_copy_to_sensor_chart_every_10min.sql`

## 2. Jadwal cron (setiap 10 menit)

1. **Database** → **Extensions** → aktifkan **pg_cron**
2. Di **SQL Editor** jalankan sekali:

```sql
SELECT cron.schedule(
  'copy-to-sensor-chart-every-10min',
  '*/10 * * * *',
  $$SELECT copy_latest_to_sensor_chart()$$
);
```

## Cek / Hapus jadwal

- Lihat: `SELECT * FROM cron.job;`
- Hapus: `SELECT cron.unschedule('copy-to-sensor-chart-every-10min');`

## Uji manual

```sql
SELECT copy_latest_to_sensor_chart();
```

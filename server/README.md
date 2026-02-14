MQTT Bridge (sixity)

This small Express app accepts a POST request and publishes a JSON payload to an MQTT topic for the target device.

Quick start (dev):

1. Install dependencies:
   - Open PowerShell in `server` folder and run `npm install`.

2. Configure environment:
   - Export `BRIDGE_API_KEY` (secret string used by the frontend to authenticate requests).
   - Optionally set `MQTT_URL` (default `mqtt://127.0.0.1:1883`).
   - Example (PowerShell):
     $env:BRIDGE_API_KEY = 'mysecret'
     $env:MQTT_URL = 'mqtt://192.168.1.10:1883'

3. Start the bridge:
   npm start

4. Supaya pengiriman WiFi dari halaman Settings berhasil, di folder root project (web) set di .env:
   - VITE_MQTT_BRIDGE_URL=http://localhost:3001   (atau URL tempat bridge berjalan)
   - VITE_BRIDGE_API_KEY=mysecret                  (nilai sama dengan BRIDGE_API_KEY di server)
   - CORS sudah diaktifkan di bridge sehingga request dari browser diizinkan.

Endpoint:
 - POST /api/device/:mac/config
 - Headers: `X-API-KEY: <BRIDGE_API_KEY>` or query `?api_key=`.
 - Body: { "wifi_ssid": "SSID_NAME", "wifi_password": "PASSWORD" }
 - The `:mac` path should be the device MAC without colons and lowercase, e.g. `aabbccddeeff`.

Security note:
 - Do not embed the bridge API key in a public frontend for production. Consider authenticating requests server-side (session-based) or proxying through your backend.

// Simple MQTT bridge for sending wifi config to devices
// Usage:
// - set env var BRIDGE_API_KEY to a secret key
// - set env var MQTT_URL (e.g. mqtt://localhost:1883) or hardcode below

const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');

const app = express();
app.use(bodyParser.json());

const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || 'change_me_in_production';
const MQTT_URL = process.env.MQTT_URL || 'mqtt://127.0.0.1:1883';

const mqttClient = mqtt.connect(MQTT_URL);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker:', MQTT_URL);
});

mqttClient.on('error', (err) => {
  console.error('MQTT error', err.message);
});

// Protected endpoint to publish wifi config to a device
// POST /api/device/:mac/config
// body: { wifi_ssid: string, wifi_password: string }
app.post('/api/device/:mac/config', (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey || apiKey !== BRIDGE_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const mac = req.params.mac;
  if (!mac) return res.status(400).json({ error: 'Missing mac in path' });

  const { wifi_ssid, wifi_password } = req.body;
  if (typeof wifi_ssid !== 'string' || typeof wifi_password !== 'string') {
    return res.status(400).json({ error: 'wifi_ssid and wifi_password are required' });
  }

  const topic = `devices/${mac}/config`;
  const payload = JSON.stringify({ wifi_ssid, wifi_password });

  mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error('Publish error', err);
      return res.status(500).json({ error: 'Failed to publish' });
    }
    console.log(`Published config to ${topic}`);
    res.json({ ok: true });
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`MQTT bridge listening on http://localhost:${port}`);
  console.log('Use X-API-KEY header to authenticate requests');
});

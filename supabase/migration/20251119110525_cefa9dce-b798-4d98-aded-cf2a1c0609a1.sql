-- Create function to update device last_seen timestamp
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices
  SET last_seen = NOW()
  WHERE id = NEW.device_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update last_seen when sensor data is inserted
DROP TRIGGER IF EXISTS trigger_update_device_last_seen ON sensor_data;
CREATE TRIGGER trigger_update_device_last_seen
  AFTER INSERT ON sensor_data
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();
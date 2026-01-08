-- Fix function search path security issue
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices
  SET last_seen = NOW()
  WHERE id = NEW.device_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
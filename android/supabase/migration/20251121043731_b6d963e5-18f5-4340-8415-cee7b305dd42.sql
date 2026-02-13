-- Add wifi_password column to devices table for storing WiFi credentials
ALTER TABLE devices ADD COLUMN wifi_password text;

-- Add updated_at column to track when configuration was last modified
ALTER TABLE devices ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at when devices table is modified
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
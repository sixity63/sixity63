-- Add TDS (Total Dissolved Solids) column to sensor_data table
ALTER TABLE sensor_data 
ADD COLUMN tds numeric;
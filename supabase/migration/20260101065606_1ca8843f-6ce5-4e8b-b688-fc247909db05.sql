-- Add mode column to led_configs table
ALTER TABLE public.led_configs 
ADD COLUMN mode text NOT NULL DEFAULT 'manual';

-- Add comment for clarity
COMMENT ON COLUMN public.led_configs.mode IS 'Control mode: manual or auto';
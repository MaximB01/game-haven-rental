-- Add column to store Pterodactyl server ID
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pterodactyl_server_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pterodactyl_identifier TEXT;
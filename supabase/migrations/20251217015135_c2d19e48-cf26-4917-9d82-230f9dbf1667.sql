-- Add display_type column to products
ALTER TABLE public.products 
ADD COLUMN display_type text NOT NULL DEFAULT 'grouped' CHECK (display_type IN ('own_page', 'grouped'));

-- Add page_path column for products with own_page
ALTER TABLE public.products 
ADD COLUMN page_path text;

-- Update existing game products to be grouped
UPDATE public.products SET display_type = 'grouped' WHERE category = 'game';

-- Add VPS product
INSERT INTO public.products (name, slug, description, category, is_active, min_ram, min_cpu, min_disk, display_type, page_path)
VALUES ('VPS Hosting', 'vps', 'Krachtige virtuele private servers', 'vps', true, 4096, 200, 51200, 'own_page', '/vps');

-- Add Bot Hosting product
INSERT INTO public.products (name, slug, description, category, is_active, min_ram, min_cpu, min_disk, display_type, page_path)
VALUES ('Bot Hosting', 'bot-hosting', 'Host je Discord, Telegram of andere bots', 'bot', true, 512, 50, 5120, 'own_page', '/bot-hosting');

-- Add Web Hosting product
INSERT INTO public.products (name, slug, description, category, is_active, min_ram, min_cpu, min_disk, display_type, page_path)
VALUES ('Web Hosting', 'web-hosting', 'Betrouwbare webhosting voor je website', 'web', true, 1024, 100, 10240, 'own_page', '/web-hosting');

-- Get the new product IDs and add plans
-- VPS Plans
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Basic', 9.99, 4096, 200, 51200, 0, 1 FROM public.products WHERE slug = 'vps';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Professional', 19.99, 8192, 400, 102400, 0, 2 FROM public.products WHERE slug = 'vps';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Enterprise', 39.99, 16384, 800, 204800, 0, 3 FROM public.products WHERE slug = 'vps';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Ultimate', 79.99, 32768, 1600, 409600, 0, 5 FROM public.products WHERE slug = 'vps';

-- Bot Hosting Plans
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Starter', 2.99, 512, 50, 5120, 0, 1 FROM public.products WHERE slug = 'bot-hosting';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Standard', 4.99, 1024, 100, 10240, 0, 1 FROM public.products WHERE slug = 'bot-hosting';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Pro', 9.99, 2048, 200, 20480, 0, 2 FROM public.products WHERE slug = 'bot-hosting';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Ultimate', 19.99, 4096, 400, 40960, 0, 3 FROM public.products WHERE slug = 'bot-hosting';

-- Web Hosting Plans
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Starter', 2.99, 1024, 100, 10240, 1, 1 FROM public.products WHERE slug = 'web-hosting';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Business', 7.99, 2048, 200, 51200, 5, 2 FROM public.products WHERE slug = 'web-hosting';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Enterprise', 14.99, 4096, 400, 102400, 10, 3 FROM public.products WHERE slug = 'web-hosting';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Ultimate', 29.99, 8192, 800, 204800, 25, 5 FROM public.products WHERE slug = 'web-hosting';

-- Add Ultimate plans to existing game servers
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Ultimate', 24.99, 16384, 400, 81920, 5, 5 FROM public.products WHERE slug = 'minecraft';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Ultimate', 49.99, 32768, 800, 163840, 5, 5 FROM public.products WHERE slug = 'rust';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Ultimate', 29.99, 16384, 400, 81920, 5, 5 FROM public.products WHERE slug = 'valheim';
INSERT INTO public.product_plans (product_id, name, price, ram, cpu, disk, databases, backups)
SELECT id, 'Ultimate', 39.99, 32768, 800, 204800, 5, 5 FROM public.products WHERE slug = 'ark';
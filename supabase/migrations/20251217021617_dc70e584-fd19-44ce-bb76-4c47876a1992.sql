-- Create product_variants table for different server types (e.g., Vanilla, PaperMC, Forge)
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  egg_id INTEGER,
  nest_id INTEGER,
  docker_image TEXT,
  startup_command TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active variants" 
ON public.product_variants 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all variants" 
ON public.product_variants 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert variants" 
ON public.product_variants 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update variants" 
ON public.product_variants 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete variants" 
ON public.product_variants 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add variant_id column to orders table to track which variant was ordered
ALTER TABLE public.orders ADD COLUMN variant_id UUID REFERENCES public.product_variants(id);
ALTER TABLE public.orders ADD COLUMN variant_name TEXT;
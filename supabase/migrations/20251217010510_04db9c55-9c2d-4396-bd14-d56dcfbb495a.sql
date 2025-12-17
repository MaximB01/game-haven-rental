-- Add more fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Nederland';

-- Create products table for game servers
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  category text NOT NULL DEFAULT 'game',
  is_active boolean NOT NULL DEFAULT true,
  min_ram integer NOT NULL DEFAULT 2048,
  min_cpu integer NOT NULL DEFAULT 100,
  min_disk integer NOT NULL DEFAULT 10240,
  default_port integer,
  egg_id integer,
  nest_id integer,
  docker_image text,
  startup_command text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create product plans table
CREATE TABLE public.product_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL,
  ram integer NOT NULL,
  cpu integer NOT NULL,
  disk integer NOT NULL,
  databases integer NOT NULL DEFAULT 1,
  backups integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_plans ENABLE ROW LEVEL SECURITY;

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Product plans policies
CREATE POLICY "Anyone can view active plans"
ON public.product_plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all plans"
ON public.product_plans
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert plans"
ON public.product_plans
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
ON public.product_plans
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans"
ON public.product_plans
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_plans_updated_at
BEFORE UPDATE ON public.product_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
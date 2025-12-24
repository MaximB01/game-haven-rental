-- Add is_popular field to product_plans table
ALTER TABLE public.product_plans ADD COLUMN is_popular BOOLEAN NOT NULL DEFAULT false;
-- Add is_popular field to products table
ALTER TABLE public.products ADD COLUMN is_popular BOOLEAN NOT NULL DEFAULT false;
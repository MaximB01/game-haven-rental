-- Add temporarily_unavailable column to products table
ALTER TABLE public.products 
ADD COLUMN temporarily_unavailable boolean NOT NULL DEFAULT false;
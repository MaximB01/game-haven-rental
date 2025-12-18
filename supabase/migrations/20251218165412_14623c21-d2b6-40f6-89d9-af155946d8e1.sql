-- Update user_orders view to include display_id
DROP VIEW IF EXISTS public.user_orders;

CREATE VIEW public.user_orders AS
SELECT 
  id,
  user_id,
  product_type,
  product_name,
  plan_name,
  variant_id,
  variant_name,
  price,
  status,
  display_id,
  created_at,
  updated_at
FROM public.orders;
-- Drop and recreate the view with SECURITY INVOKER to use the querying user's permissions
DROP VIEW IF EXISTS public.user_orders;

CREATE VIEW public.user_orders 
WITH (security_invoker = true)
AS
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
  created_at, 
  updated_at
FROM public.orders;

-- Grant access to the view
GRANT SELECT ON public.user_orders TO authenticated;
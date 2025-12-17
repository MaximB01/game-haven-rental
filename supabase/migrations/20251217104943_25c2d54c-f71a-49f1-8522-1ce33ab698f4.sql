-- Create a view for user-facing order queries that excludes sensitive infrastructure fields
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
  created_at, 
  updated_at
FROM public.orders;

-- Grant access to the view
GRANT SELECT ON public.user_orders TO authenticated;

-- Enable RLS on the view (views inherit from underlying table's RLS by default, but let's be explicit)
-- Note: Views don't support RLS directly, they use the underlying table's RLS
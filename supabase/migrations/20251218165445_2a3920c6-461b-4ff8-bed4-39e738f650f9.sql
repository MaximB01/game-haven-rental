-- Fix security definer view issue by setting SECURITY INVOKER
ALTER VIEW public.user_orders SET (security_invoker = true);
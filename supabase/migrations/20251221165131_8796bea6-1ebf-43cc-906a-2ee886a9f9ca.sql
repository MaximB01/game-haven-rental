-- Add Stripe columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stripe_product_id text;

-- Add Stripe columns to product_plans table
ALTER TABLE public.product_plans 
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly';

-- Add Stripe customer ID to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Add Stripe subscription columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

-- Create invoices table for billing history
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  stripe_invoice_id text NOT NULL,
  stripe_payment_intent_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL DEFAULT 'pending',
  invoice_pdf_url text,
  hosted_invoice_url text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Users can view their own invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices"
ON public.invoices FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update invoices"
ON public.invoices FOR UPDATE
USING (true);

-- Add payment-related site settings
INSERT INTO public.site_settings (key, value, category, description, is_secret) VALUES
('stripe_publishable_key', '', 'payments', 'Stripe publishable key for frontend', false),
('stripe_webhook_secret', '', 'payments', 'Stripe webhook signing secret', true),
('stripe_test_mode', 'true', 'payments', 'Enable Stripe test mode', false),
('payment_currency', 'eur', 'payments', 'Default payment currency', false),
('tax_rate_percentage', '21', 'payments', 'BTW/VAT percentage', false),
('trial_days', '0', 'payments', 'Free trial period in days', false)
ON CONFLICT (key) DO NOTHING;

-- Add trigger for updated_at on invoices
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
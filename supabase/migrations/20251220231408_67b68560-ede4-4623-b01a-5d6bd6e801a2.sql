-- Create site_settings table for storing website configuration
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_secret boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Admins can view all settings"
ON public.site_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.site_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.site_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete settings
CREATE POLICY "Admins can delete settings"
ON public.site_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.site_settings (key, value, category, description, is_secret) VALUES
-- General/Branding
('site_name', 'CloudSurf', 'branding', 'Website naam', false),
('site_tagline', 'Premium Game Server Hosting', 'branding', 'Website tagline', false),
('contact_email', 'info@cloudsurf.nl', 'branding', 'Contact e-mailadres', false),
('support_email', 'support@cloudsurf.nl', 'branding', 'Support e-mailadres', false),
('phone_number', '', 'branding', 'Telefoonnummer', false),

-- Social Media
('discord_url', '', 'social', 'Discord server link', false),
('twitter_url', '', 'social', 'Twitter/X profiel link', false),
('instagram_url', '', 'social', 'Instagram profiel link', false),
('youtube_url', '', 'social', 'YouTube kanaal link', false),
('tiktok_url', '', 'social', 'TikTok profiel link', false),

-- API Keys (secrets - values stored securely)
('pterodactyl_url', '', 'api', 'Pterodactyl Panel URL', false),
('pterodactyl_api_key', '', 'api', 'Pterodactyl API Key', true),
('pterodactyl_client_api_key', '', 'api', 'Pterodactyl Client API Key', true),
('resend_api_key', '', 'api', 'Resend API Key voor e-mails', true),

-- Email Settings
('email_from_name', 'CloudSurf', 'email', 'Afzender naam voor e-mails', false),
('email_from_address', 'noreply@cloudsurf.nl', 'email', 'Afzender e-mailadres', false),
('email_footer_text', '© 2024 CloudSurf. Alle rechten voorbehouden.', 'email', 'Footer tekst in e-mails', false),

-- Business Info
('company_name', 'CloudSurf', 'business', 'Officiële bedrijfsnaam', false),
('kvk_number', '', 'business', 'KvK nummer', false),
('btw_number', '', 'business', 'BTW nummer', false),
('address', '', 'business', 'Bedrijfsadres', false);

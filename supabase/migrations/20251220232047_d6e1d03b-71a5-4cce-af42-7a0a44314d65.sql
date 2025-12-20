-- Create email_templates table for storing customizable email templates
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  description text,
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can view templates
CREATE POLICY "Admins can view all email templates"
ON public.email_templates
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert templates
CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update templates
CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete templates
CREATE POLICY "Admins can delete email templates"
ON public.email_templates
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, html_content, description, variables) VALUES
(
  'ticket_new_reply',
  'Nieuw antwoord op ticket {{ticket_display_id}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{site_name}}</h1>
  </div>
  <div class="content">
    <h2>Hallo {{user_name}},</h2>
    <p>Er is een nieuw antwoord geplaatst op je support ticket.</p>
    <div class="ticket-info">
      <strong>Ticket:</strong> {{ticket_display_id}}<br>
      <strong>Onderwerp:</strong> {{ticket_subject}}
    </div>
    <p>Log in op je account om het antwoord te bekijken en te reageren.</p>
    <a href="{{dashboard_url}}" class="button">Bekijk Ticket</a>
  </div>
  <div class="footer">
    <p>{{footer_text}}</p>
  </div>
</body>
</html>',
  'E-mail die wordt verzonden wanneer er een nieuw antwoord op een ticket is',
  ARRAY['site_name', 'user_name', 'ticket_display_id', 'ticket_subject', 'dashboard_url', 'footer_text']
),
(
  'ticket_status_changed',
  'Status update voor ticket {{ticket_display_id}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; }
    .status-open { background: #fef3c7; color: #92400e; }
    .status-in_progress { background: #dbeafe; color: #1e40af; }
    .status-closed { background: #d1fae5; color: #065f46; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{site_name}}</h1>
  </div>
  <div class="content">
    <h2>Hallo {{user_name}},</h2>
    <p>De status van je support ticket is bijgewerkt.</p>
    <p><strong>Ticket:</strong> {{ticket_display_id}}</p>
    <p><strong>Onderwerp:</strong> {{ticket_subject}}</p>
    <p><strong>Nieuwe status:</strong> <span class="status-badge status-{{ticket_status}}">{{ticket_status_label}}</span></p>
    <a href="{{dashboard_url}}" class="button">Bekijk Ticket</a>
  </div>
  <div class="footer">
    <p>{{footer_text}}</p>
  </div>
</body>
</html>',
  'E-mail die wordt verzonden wanneer de status van een ticket verandert',
  ARRAY['site_name', 'user_name', 'ticket_display_id', 'ticket_subject', 'ticket_status', 'ticket_status_label', 'dashboard_url', 'footer_text']
),
(
  'order_confirmation',
  'Bevestiging van je bestelling {{order_display_id}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .order-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .order-total { font-size: 18px; font-weight: bold; color: #667eea; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{site_name}}</h1>
    <p>Bedankt voor je bestelling!</p>
  </div>
  <div class="content">
    <h2>Hallo {{user_name}},</h2>
    <p>We hebben je bestelling ontvangen en deze wordt zo snel mogelijk verwerkt.</p>
    <div class="order-details">
      <div class="order-row">
        <span>Bestelnummer:</span>
        <span><strong>{{order_display_id}}</strong></span>
      </div>
      <div class="order-row">
        <span>Product:</span>
        <span>{{product_name}}</span>
      </div>
      <div class="order-row">
        <span>Plan:</span>
        <span>{{plan_name}}</span>
      </div>
      <div class="order-row order-total">
        <span>Totaal:</span>
        <span>€{{price}}/maand</span>
      </div>
    </div>
    <p>Je server wordt automatisch aangemaakt. Je ontvangt een e-mail zodra deze klaar is.</p>
    <a href="{{dashboard_url}}" class="button">Ga naar Dashboard</a>
  </div>
  <div class="footer">
    <p>{{footer_text}}</p>
  </div>
</body>
</html>',
  'E-mail die wordt verzonden na het plaatsen van een bestelling',
  ARRAY['site_name', 'user_name', 'order_display_id', 'product_name', 'plan_name', 'price', 'dashboard_url', 'footer_text']
),
(
  'server_ready',
  'Je server is klaar! {{order_display_id}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .server-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎮 Server Klaar!</h1>
  </div>
  <div class="content">
    <h2>Hallo {{user_name}},</h2>
    <p>Geweldig nieuws! Je server is succesvol aangemaakt en klaar voor gebruik.</p>
    <div class="server-info">
      <strong>Server ID:</strong> {{server_id}}<br>
      <strong>Product:</strong> {{product_name}}<br>
      <strong>Plan:</strong> {{plan_name}}
    </div>
    <p>Je kunt nu inloggen op het serverpaneel om je server te beheren.</p>
    <a href="{{panel_url}}" class="button">Open Server Paneel</a>
  </div>
  <div class="footer">
    <p>{{footer_text}}</p>
  </div>
</body>
</html>',
  'E-mail die wordt verzonden wanneer een server klaar is voor gebruik',
  ARRAY['site_name', 'user_name', 'server_id', 'product_name', 'plan_name', 'panel_url', 'footer_text']
),
(
  'welcome',
  'Welkom bij {{site_name}}!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .features { margin: 20px 0; }
    .feature { padding: 10px 0; border-bottom: 1px solid #eee; }
    .feature:last-child { border-bottom: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welkom bij {{site_name}}!</h1>
    <p>{{tagline}}</p>
  </div>
  <div class="content">
    <h2>Hallo {{user_name}},</h2>
    <p>Bedankt voor je registratie! We zijn blij dat je voor ons hebt gekozen.</p>
    <div class="features">
      <div class="feature">✅ 99.9% Uptime garantie</div>
      <div class="feature">✅ DDoS bescherming inbegrepen</div>
      <div class="feature">✅ 24/7 Support beschikbaar</div>
      <div class="feature">✅ Server in 60 seconden online</div>
    </div>
    <p>Klaar om te beginnen? Bekijk onze game servers en start vandaag nog!</p>
    <a href="{{dashboard_url}}" class="button">Ga naar Dashboard</a>
  </div>
  <div class="footer">
    <p>{{footer_text}}</p>
  </div>
</body>
</html>',
  'Welkomst e-mail voor nieuwe gebruikers',
  ARRAY['site_name', 'tagline', 'user_name', 'dashboard_url', 'footer_text']
);

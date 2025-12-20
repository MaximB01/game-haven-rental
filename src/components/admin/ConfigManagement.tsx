import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Eye, EyeOff, Building2, Mail, Share2, Key, Globe } from 'lucide-react';

interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
  category: string;
  description: string | null;
  is_secret: boolean;
  updated_at: string;
}

const ConfigManagement = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;

      setSettings(data || []);
      
      // Initialize edited values with current values
      const values: Record<string, string> = {};
      data?.forEach(setting => {
        values[setting.key] = setting.value || '';
      });
      setEditedValues(values);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveCategory = async (category: string) => {
    setSaving(true);
    try {
      const categorySettings = settings.filter(s => s.category === category);
      
      for (const setting of categorySettings) {
        const newValue = editedValues[setting.key];
        if (newValue !== setting.value) {
          const { error } = await supabase
            .from('site_settings')
            .update({ value: newValue })
            .eq('key', setting.key);

          if (error) throw error;
        }
      }

      await fetchSettings();
      
      toast({
        title: language === 'nl' ? 'Opgeslagen' : 'Saved',
        description: language === 'nl' 
          ? 'Instellingen zijn bijgewerkt' 
          : 'Settings have been updated',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'branding':
        return <Globe className="h-4 w-4" />;
      case 'social':
        return <Share2 className="h-4 w-4" />;
      case 'api':
        return <Key className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'business':
        return <Building2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { nl: string; en: string }> = {
      branding: { nl: 'Branding', en: 'Branding' },
      social: { nl: 'Social Media', en: 'Social Media' },
      api: { nl: 'API Keys', en: 'API Keys' },
      email: { nl: 'E-mail Instellingen', en: 'Email Settings' },
      business: { nl: 'Bedrijfsgegevens', en: 'Business Info' },
    };
    return labels[category]?.[language] || category;
  };

  const getFieldLabel = (key: string) => {
    const labels: Record<string, { nl: string; en: string }> = {
      site_name: { nl: 'Website Naam', en: 'Site Name' },
      site_tagline: { nl: 'Tagline', en: 'Tagline' },
      contact_email: { nl: 'Contact E-mail', en: 'Contact Email' },
      support_email: { nl: 'Support E-mail', en: 'Support Email' },
      phone_number: { nl: 'Telefoonnummer', en: 'Phone Number' },
      discord_url: { nl: 'Discord URL', en: 'Discord URL' },
      twitter_url: { nl: 'Twitter/X URL', en: 'Twitter/X URL' },
      instagram_url: { nl: 'Instagram URL', en: 'Instagram URL' },
      youtube_url: { nl: 'YouTube URL', en: 'YouTube URL' },
      tiktok_url: { nl: 'TikTok URL', en: 'TikTok URL' },
      pterodactyl_url: { nl: 'Pterodactyl URL', en: 'Pterodactyl URL' },
      pterodactyl_api_key: { nl: 'Pterodactyl API Key', en: 'Pterodactyl API Key' },
      pterodactyl_client_api_key: { nl: 'Pterodactyl Client API Key', en: 'Pterodactyl Client API Key' },
      resend_api_key: { nl: 'Resend API Key', en: 'Resend API Key' },
      email_from_name: { nl: 'Afzender Naam', en: 'From Name' },
      email_from_address: { nl: 'Afzender E-mail', en: 'From Email' },
      email_footer_text: { nl: 'E-mail Footer', en: 'Email Footer' },
      company_name: { nl: 'Bedrijfsnaam', en: 'Company Name' },
      kvk_number: { nl: 'KvK Nummer', en: 'Chamber of Commerce' },
      btw_number: { nl: 'BTW Nummer', en: 'VAT Number' },
      address: { nl: 'Adres', en: 'Address' },
    };
    return labels[key]?.[language] || key;
  };

  const renderSettingField = (setting: SiteSetting) => {
    const isSecret = setting.is_secret;
    const value = editedValues[setting.key] || '';
    const isVisible = showSecrets[setting.key];

    if (setting.key === 'email_footer_text' || setting.key === 'address') {
      return (
        <div key={setting.key} className="space-y-2">
          <Label htmlFor={setting.key}>{getFieldLabel(setting.key)}</Label>
          <Textarea
            id={setting.key}
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            placeholder={setting.description || ''}
            rows={3}
          />
          {setting.description && (
            <p className="text-xs text-muted-foreground">{setting.description}</p>
          )}
        </div>
      );
    }

    return (
      <div key={setting.key} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={setting.key}>{getFieldLabel(setting.key)}</Label>
          {isSecret && (
            <Badge variant="outline" className="text-xs">
              <Key className="h-3 w-3 mr-1" />
              Secret
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            id={setting.key}
            type={isSecret && !isVisible ? 'password' : 'text'}
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            placeholder={setting.description || ''}
            className="flex-1"
          />
          {isSecret && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => toggleSecretVisibility(setting.key)}
            >
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const categories = [...new Set(settings.map(s => s.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue={categories[0] || 'branding'} className="space-y-6">
      <TabsList className="flex-wrap h-auto gap-2">
        {categories.map(category => (
          <TabsTrigger key={category} value={category} className="flex items-center gap-2">
            {getCategoryIcon(category)}
            {getCategoryLabel(category)}
          </TabsTrigger>
        ))}
      </TabsList>

      {categories.map(category => {
        const categorySettings = settings.filter(s => s.category === category);
        
        return (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {getCategoryLabel(category)}
                </CardTitle>
                <CardDescription>
                  {category === 'api' && (
                    language === 'nl' 
                      ? 'Beheer API keys voor externe diensten. Let op: wijzigingen hier overschrijven de Supabase secrets niet automatisch.'
                      : 'Manage API keys for external services. Note: changes here do not automatically override Supabase secrets.'
                  )}
                  {category === 'branding' && (
                    language === 'nl' 
                      ? 'Algemene website instellingen en branding'
                      : 'General website settings and branding'
                  )}
                  {category === 'social' && (
                    language === 'nl' 
                      ? 'Social media links voor je website'
                      : 'Social media links for your website'
                  )}
                  {category === 'email' && (
                    language === 'nl' 
                      ? 'E-mail configuratie en templates'
                      : 'Email configuration and templates'
                  )}
                  {category === 'business' && (
                    language === 'nl' 
                      ? 'Zakelijke informatie voor facturen en footer'
                      : 'Business information for invoices and footer'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {categorySettings.map(setting => renderSettingField(setting))}
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={() => handleSaveCategory(category)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {language === 'nl' ? 'Opslaan' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default ConfigManagement;

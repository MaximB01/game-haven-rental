import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, RefreshCw, CreditCard, Receipt, Settings, Check, X, ExternalLink } from 'lucide-react';

interface PaymentSettings {
  stripe_publishable_key: string;
  stripe_webhook_secret: string;
  stripe_test_mode: boolean;
  payment_currency: string;
  tax_rate_percentage: string;
  trial_days: string;
}

interface ProductSyncStatus {
  id: string;
  name: string;
  stripe_product_id: string | null;
  plans: {
    id: string;
    name: string;
    price: number;
    stripe_price_id: string | null;
  }[];
}

interface Subscription {
  id: string;
  display_id: string;
  user_name: string;
  product_name: string;
  plan_name: string;
  price: number;
  status: string;
  next_billing_date: string | null;
  stripe_subscription_id: string | null;
}

interface Invoice {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  currency: string;
  status: string;
  invoice_pdf_url: string | null;
  paid_at: string | null;
  created_at: string;
}

const PaymentManagement = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  const [settings, setSettings] = useState<PaymentSettings>({
    stripe_publishable_key: '',
    stripe_webhook_secret: '',
    stripe_test_mode: true,
    payment_currency: 'eur',
    tax_rate_percentage: '21',
    trial_days: '0',
  });

  const [products, setProducts] = useState<ProductSyncStatus[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadSettings(),
      loadProducts(),
      loadSubscriptions(),
      loadInvoices(),
      loadProfiles(),
    ]);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('category', 'payments');

    if (data) {
      const settingsMap: Partial<PaymentSettings> = {};
      data.forEach(item => {
        if (item.key === 'stripe_test_mode') {
          (settingsMap as any)[item.key] = item.value === 'true';
        } else {
          (settingsMap as any)[item.key] = item.value || '';
        }
      });
      setSettings(prev => ({ ...prev, ...settingsMap }));
    }
  };

  const loadProducts = async () => {
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, stripe_product_id')
      .eq('is_active', true)
      .order('name');

    const { data: plansData } = await supabase
      .from('product_plans')
      .select('id, product_id, name, price, stripe_price_id')
      .eq('is_active', true)
      .order('price');

    if (productsData) {
      const productsWithPlans: ProductSyncStatus[] = productsData.map(product => ({
        ...product,
        plans: plansData?.filter(plan => plan.product_id === product.id) || [],
      }));
      setProducts(productsWithPlans);
    }
  };

  const loadSubscriptions = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, display_id, user_id, product_name, plan_name, price, status, next_billing_date, stripe_subscription_id')
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false });

    if (data) {
      setSubscriptions(data.map(order => ({
        ...order,
        user_name: profiles[order.user_id] || order.user_id.slice(0, 8),
      })));
    }
  };

  const loadInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setInvoices(data.map(inv => ({
        ...inv,
        user_name: profiles[inv.user_id] || inv.user_id.slice(0, 8),
      })));
    }
  };

  const loadProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name');

    if (data) {
      const profileMap: Record<string, string> = {};
      data.forEach(p => {
        profileMap[p.user_id] = p.full_name || p.user_id.slice(0, 8);
      });
      setProfiles(profileMap);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('site_settings')
      .update({ value })
      .eq('key', key);

    if (error) {
      // Try insert if update fails
      await supabase
        .from('site_settings')
        .insert({ key, value, category: 'payments' });
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting('stripe_publishable_key', settings.stripe_publishable_key),
        saveSetting('stripe_webhook_secret', settings.stripe_webhook_secret),
        saveSetting('stripe_test_mode', settings.stripe_test_mode.toString()),
        saveSetting('payment_currency', settings.payment_currency),
        saveSetting('tax_rate_percentage', settings.tax_rate_percentage),
        saveSetting('trial_days', settings.trial_days),
      ]);

      toast({
        title: language === 'nl' ? 'Instellingen opgeslagen' : 'Settings saved',
        description: language === 'nl' ? 'Betalingsinstellingen zijn bijgewerkt' : 'Payment settings have been updated',
      });
    } catch (error: any) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      // Simple test - try to sync an empty product list
      const { data, error } = await supabase.functions.invoke('stripe-sync-products', {
        body: { productIds: [] }
      });

      if (error) throw error;

      toast({
        title: language === 'nl' ? 'Verbinding geslaagd' : 'Connection successful',
        description: language === 'nl' ? 'Stripe API verbinding werkt correct' : 'Stripe API connection is working',
      });
    } catch (error: any) {
      toast({
        title: language === 'nl' ? 'Verbinding mislukt' : 'Connection failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncProducts = async (productIds?: string[]) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-sync-products', {
        body: { productIds }
      });

      if (error) throw error;

      toast({
        title: language === 'nl' ? 'Synchronisatie voltooid' : 'Sync complete',
        description: data.message,
      });

      await loadProducts();
    } catch (error: any) {
      toast({
        title: language === 'nl' ? 'Synchronisatie mislukt' : 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
      payment_failed: 'destructive',
      suspended: 'outline',
      paid: 'default',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="config" className="space-y-6">
      <TabsList>
        <TabsTrigger value="config" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {language === 'nl' ? 'Configuratie' : 'Configuration'}
        </TabsTrigger>
        <TabsTrigger value="sync" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          {language === 'nl' ? 'Product Sync' : 'Product Sync'}
        </TabsTrigger>
        <TabsTrigger value="subscriptions" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          {language === 'nl' ? 'Subscripties' : 'Subscriptions'}
        </TabsTrigger>
        <TabsTrigger value="invoices" className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          {language === 'nl' ? 'Facturen' : 'Invoices'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config">
        <Card>
          <CardHeader>
            <CardTitle>{language === 'nl' ? 'Stripe Configuratie' : 'Stripe Configuration'}</CardTitle>
            <CardDescription>
              {language === 'nl' 
                ? 'Configureer je Stripe betalingsinstellingen' 
                : 'Configure your Stripe payment settings'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="publishable_key">Stripe Publishable Key</Label>
                <Input
                  id="publishable_key"
                  value={settings.stripe_publishable_key}
                  onChange={(e) => setSettings(prev => ({ ...prev, stripe_publishable_key: e.target.value }))}
                  placeholder="pk_test_..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_secret">Webhook Secret</Label>
                <Input
                  id="webhook_secret"
                  type="password"
                  value={settings.stripe_webhook_secret}
                  onChange={(e) => setSettings(prev => ({ ...prev, stripe_webhook_secret: e.target.value }))}
                  placeholder="whsec_..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{language === 'nl' ? 'Valuta' : 'Currency'}</Label>
                <Input
                  id="currency"
                  value={settings.payment_currency}
                  onChange={(e) => setSettings(prev => ({ ...prev, payment_currency: e.target.value }))}
                  placeholder="eur"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_rate">{language === 'nl' ? 'BTW Percentage' : 'Tax Rate %'}</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  value={settings.tax_rate_percentage}
                  onChange={(e) => setSettings(prev => ({ ...prev, tax_rate_percentage: e.target.value }))}
                  placeholder="21"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial_days">{language === 'nl' ? 'Proefperiode (dagen)' : 'Trial Days'}</Label>
                <Input
                  id="trial_days"
                  type="number"
                  value={settings.trial_days}
                  onChange={(e) => setSettings(prev => ({ ...prev, trial_days: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="test_mode"
                  checked={settings.stripe_test_mode}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, stripe_test_mode: checked }))}
                />
                <Label htmlFor="test_mode">{language === 'nl' ? 'Test Modus' : 'Test Mode'}</Label>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === 'nl' ? 'Opslaan' : 'Save'}
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
                {testingConnection && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === 'nl' ? 'Test Verbinding' : 'Test Connection'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sync">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{language === 'nl' ? 'Product Synchronisatie' : 'Product Sync'}</CardTitle>
              <CardDescription>
                {language === 'nl' 
                  ? 'Synchroniseer producten en plannen naar Stripe' 
                  : 'Sync products and plans to Stripe'}
              </CardDescription>
            </div>
            <Button onClick={() => handleSyncProducts()} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {language === 'nl' ? 'Sync Alles' : 'Sync All'}
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'nl' ? 'Product' : 'Product'}</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead>{language === 'nl' ? 'Plannen' : 'Plans'}</TableHead>
                  <TableHead>{language === 'nl' ? 'Acties' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {product.stripe_product_id ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-mono">{product.stripe_product_id.slice(0, 20)}...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4 text-red-500" />
                          <span className="text-muted-foreground">{language === 'nl' ? 'Niet gesynchroniseerd' : 'Not synced'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {product.plans.map(plan => (
                          <div key={plan.id} className="flex items-center gap-2 text-sm">
                            {plan.stripe_price_id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            <span>{plan.name}</span>
                            <span className="text-muted-foreground">€{plan.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSyncProducts([product.id])}
                        disabled={syncing}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subscriptions">
        <Card>
          <CardHeader>
            <CardTitle>{language === 'nl' ? 'Actieve Subscripties' : 'Active Subscriptions'}</CardTitle>
            <CardDescription>
              {language === 'nl' 
                ? 'Overzicht van alle Stripe subscripties' 
                : 'Overview of all Stripe subscriptions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{language === 'nl' ? 'Klant' : 'Customer'}</TableHead>
                  <TableHead>{language === 'nl' ? 'Product' : 'Product'}</TableHead>
                  <TableHead>{language === 'nl' ? 'Plan' : 'Plan'}</TableHead>
                  <TableHead>{language === 'nl' ? 'Prijs' : 'Price'}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{language === 'nl' ? 'Volgende Betaling' : 'Next Billing'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === 'nl' ? 'Geen subscripties gevonden' : 'No subscriptions found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map(sub => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-sm">{sub.display_id}</TableCell>
                      <TableCell>{profiles[sub.id.split('-')[0]] || sub.user_name}</TableCell>
                      <TableCell>{sub.product_name}</TableCell>
                      <TableCell>{sub.plan_name}</TableCell>
                      <TableCell>€{sub.price.toFixed(2)}/mo</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        {sub.next_billing_date 
                          ? new Date(sub.next_billing_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="invoices">
        <Card>
          <CardHeader>
            <CardTitle>{language === 'nl' ? 'Facturen' : 'Invoices'}</CardTitle>
            <CardDescription>
              {language === 'nl' 
                ? 'Overzicht van alle facturen' 
                : 'Overview of all invoices'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'nl' ? 'Klant' : 'Customer'}</TableHead>
                  <TableHead>{language === 'nl' ? 'Bedrag' : 'Amount'}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{language === 'nl' ? 'Betaald op' : 'Paid at'}</TableHead>
                  <TableHead>{language === 'nl' ? 'Acties' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {language === 'nl' ? 'Geen facturen gevonden' : 'No invoices found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(invoice => (
                    <TableRow key={invoice.id}>
                      <TableCell>{profiles[invoice.user_id] || invoice.user_id.slice(0, 8)}</TableCell>
                      <TableCell>€{invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {invoice.paid_at 
                          ? new Date(invoice.paid_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {invoice.invoice_pdf_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={invoice.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PaymentManagement;

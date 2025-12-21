import { useState, useEffect } from 'react';
import { CreditCard, FileText, ExternalLink, Loader2, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
}

interface Subscription {
  id: string;
  product_name: string;
  plan_name: string;
  price: number;
  status: string;
  next_billing_date: string | null;
  stripe_subscription_id: string | null;
}

const BillingSection = () => {
  const { language } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (invoicesData) setInvoices(invoicesData);

      // Fetch active subscriptions (orders with stripe_subscription_id)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, product_name, plan_name, price, status, next_billing_date, stripe_subscription_id')
        .eq('user_id', user.id)
        .not('stripe_subscription_id', 'is', null)
        .in('status', ['active', 'pending', 'past_due'])
        .order('created_at', { ascending: false });

      if (ordersData) setSubscriptions(ordersData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast.error(
        language === 'nl' 
          ? 'Kon het klantportaal niet openen' 
          : 'Could not open customer portal'
      );
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> {language === 'nl' ? 'Betaald' : 'Paid'}</Badge>;
      case 'open':
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> {language === 'nl' ? 'Open' : 'Open'}</Badge>;
      case 'failed':
      case 'uncollectible':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> {language === 'nl' ? 'Mislukt' : 'Failed'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'eur') => {
    return new Intl.NumberFormat(language === 'nl' ? 'nl-NL' : 'en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Subscriptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {language === 'nl' ? 'Actieve Abonnementen' : 'Active Subscriptions'}
            </CardTitle>
            <CardDescription>
              {language === 'nl' 
                ? 'Beheer je lopende abonnementen' 
                : 'Manage your active subscriptions'}
            </CardDescription>
          </div>
          <Button onClick={openCustomerPortal} disabled={portalLoading} variant="outline">
            {portalLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            {language === 'nl' ? 'Beheer Abonnementen' : 'Manage Subscriptions'}
          </Button>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'nl' ? 'Geen actieve abonnementen' : 'No active subscriptions'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sub.product_name}</span>
                      <Badge variant="outline">{sub.plan_name}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{formatCurrency(sub.price)}/mo</span>
                      {sub.next_billing_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {language === 'nl' ? 'Volgende facturatie:' : 'Next billing:'}{' '}
                          {new Date(sub.next_billing_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge 
                    className={
                      sub.status === 'active' 
                        ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                    }
                  >
                    {sub.status === 'active' 
                      ? (language === 'nl' ? 'Actief' : 'Active')
                      : sub.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'nl' ? 'Recente Facturen' : 'Recent Invoices'}
          </CardTitle>
          <CardDescription>
            {language === 'nl' 
              ? 'Bekijk en download je facturen' 
              : 'View and download your invoices'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'nl' ? 'Nog geen facturen' : 'No invoices yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {language === 'nl' ? 'Datum' : 'Date'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {language === 'nl' ? 'Bedrag' : 'Amount'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {language === 'nl' ? 'Periode' : 'Period'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {language === 'nl' ? 'Acties' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {invoice.period_start && invoice.period_end ? (
                          <>
                            {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                          </>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {invoice.hosted_invoice_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                {language === 'nl' ? 'Bekijk' : 'View'}
                              </a>
                            </Button>
                          )}
                          {invoice.invoice_pdf_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={invoice.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4 mr-1" />
                                PDF
                              </a>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSection;
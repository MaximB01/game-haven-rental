import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Server, Cpu, HardDrive, Shield, CreditCard, Check } from 'lucide-react';

interface CheckoutState {
  productId: string;
  productName: string;
  planId: string;
  planName: string;
  price: number;
  variantId?: string;
  variantName?: string;
  productType: string;
  ram?: number;
  cpu?: number;
  disk?: number;
}

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Get checkout data from location state
  const checkoutData = location.state as CheckoutState | null;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Redirect if no checkout data
    if (!checkoutData) {
      toast({
        title: language === 'nl' ? 'Geen product geselecteerd' : 'No product selected',
        description: language === 'nl' 
          ? 'Selecteer eerst een product en plan' 
          : 'Please select a product and plan first',
        variant: 'destructive',
      });
      navigate('/game-servers');
    }
  }, [checkoutData, navigate, toast, language]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setCheckingAuth(false);
    
    if (!user) {
      toast({
        title: language === 'nl' ? 'Inloggen vereist' : 'Login required',
        description: language === 'nl' 
          ? 'Je moet ingelogd zijn om een bestelling te plaatsen' 
          : 'You must be logged in to place an order',
      });
      navigate('/auth?redirect=/checkout');
    }
  };

  const handleCheckout = async () => {
    if (!user || !checkoutData) return;

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {
          planId: checkoutData.planId,
          variantId: checkoutData.variantId || undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message || (language === 'nl' ? 'Er ging iets mis' : 'Something went wrong'),
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  if (checkingAuth || !checkoutData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'nl' ? 'Afrekenen' : 'Checkout'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {language === 'nl' 
              ? 'Controleer je bestelling en ga door naar betaling' 
              : 'Review your order and proceed to payment'}
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    {checkoutData.productName}
                  </CardTitle>
                  {checkoutData.variantName && (
                    <CardDescription>Variant: {checkoutData.variantName}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium">{checkoutData.planName}</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      €{checkoutData.price.toFixed(2)}/mo
                    </Badge>
                  </div>

                  {(checkoutData.ram || checkoutData.cpu || checkoutData.disk) && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {checkoutData.ram && (
                        <div className="flex items-center gap-2 text-sm">
                          <Cpu className="h-4 w-4 text-primary" />
                          <span>
                            {checkoutData.ram >= 1024 
                              ? `${(checkoutData.ram / 1024).toFixed(0)} GB RAM`
                              : `${checkoutData.ram} MB RAM`}
                          </span>
                        </div>
                      )}
                      {checkoutData.cpu && (
                        <div className="flex items-center gap-2 text-sm">
                          <Cpu className="h-4 w-4 text-primary" />
                          <span>{checkoutData.cpu}% CPU</span>
                        </div>
                      )}
                      {checkoutData.disk && (
                        <div className="flex items-center gap-2 text-sm">
                          <HardDrive className="h-4 w-4 text-primary" />
                          <span>
                            {checkoutData.disk >= 1024
                              ? `${(checkoutData.disk / 1024).toFixed(0)} GB SSD`
                              : `${checkoutData.disk} MB SSD`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {language === 'nl' ? 'Inclusief' : 'Included'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {[
                      language === 'nl' ? 'DDoS Bescherming' : 'DDoS Protection',
                      language === 'nl' ? '24/7 Uptime Garantie' : '24/7 Uptime Guarantee',
                      language === 'nl' ? 'Automatische Backups' : 'Automatic Backups',
                      language === 'nl' ? 'Volledige Root Access' : 'Full Root Access',
                      language === 'nl' ? 'Mod/Plugin Support' : 'Mod/Plugin Support',
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Payment Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>{language === 'nl' ? 'Overzicht' : 'Summary'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>{checkoutData.planName}</span>
                    <span>€{checkoutData.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>BTW (21%)</span>
                    <span>{language === 'nl' ? 'Inclusief' : 'Included'}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>{language === 'nl' ? 'Totaal per maand' : 'Total per month'}</span>
                      <span>€{checkoutData.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full gaming-gradient-bg hover:opacity-90" 
                    size="lg"
                    onClick={handleCheckout}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    {language === 'nl' ? 'Doorgaan naar betaling' : 'Proceed to payment'}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {language === 'nl' 
                      ? 'Je wordt doorgestuurd naar Stripe voor veilige betaling' 
                      : 'You will be redirected to Stripe for secure payment'}
                  </p>

                  <div className="flex justify-center gap-2 pt-2">
                    <span className="text-xs text-muted-foreground">Visa • Mastercard • iDEAL • Bancontact</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
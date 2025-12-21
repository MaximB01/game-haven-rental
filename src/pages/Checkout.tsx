import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Server, Cpu, HardDrive, Database, Shield, CreditCard, Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  ram: number;
  cpu: number;
  disk: number;
  databases: number;
  backups: number;
  stripe_price_id: string | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    category: string;
  };
}

interface Variant {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
}

const Checkout = () => {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadPlan();
  }, [planId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadPlan = async () => {
    if (!planId) return;

    setLoading(true);

    // Load plan with product info
    const { data: planData, error: planError } = await supabase
      .from('product_plans')
      .select(`
        *,
        product:products (
          id,
          name,
          description,
          image_url,
          category
        )
      `)
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: language === 'nl' ? 'Plan niet gevonden' : 'Plan not found',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    // Transform to expected shape
    const transformedPlan: Plan = {
      id: planData.id,
      name: planData.name,
      price: planData.price,
      ram: planData.ram,
      cpu: planData.cpu,
      disk: planData.disk,
      databases: planData.databases,
      backups: planData.backups,
      stripe_price_id: (planData as any).stripe_price_id || null,
      product: planData.product as any,
    };

    setPlan(transformedPlan);

    // Load variants for this product
    const { data: variantsData } = await supabase
      .from('product_variants')
      .select('id, name, description, is_default')
      .eq('product_id', transformedPlan.product.id)
      .eq('is_active', true)
      .order('sort_order');

    if (variantsData && variantsData.length > 0) {
      setVariants(variantsData);
      // Set default variant from URL or first default
      const urlVariant = searchParams.get('variant');
      if (urlVariant && variantsData.some(v => v.id === urlVariant)) {
        setSelectedVariant(urlVariant);
      } else {
        const defaultVariant = variantsData.find(v => v.is_default) || variantsData[0];
        setSelectedVariant(defaultVariant.id);
      }
    }

    setLoading(false);
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: language === 'nl' ? 'Inloggen vereist' : 'Login required',
        description: language === 'nl' 
          ? 'Je moet ingelogd zijn om een bestelling te plaatsen' 
          : 'You must be logged in to place an order',
      });
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!plan?.stripe_price_id) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: language === 'nl' 
          ? 'Dit plan is nog niet beschikbaar voor aankoop. Neem contact op met support.' 
          : 'This plan is not yet available for purchase. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {
          planId: plan.id,
          variantId: selectedVariant || undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!plan) {
    return null;
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
                    {plan.product.name}
                  </CardTitle>
                  <CardDescription>{plan.product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium">{plan.name}</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      €{plan.price.toFixed(2)}/mo
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="h-4 w-4 text-primary" />
                      <span>{plan.ram / 1024} GB RAM</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="h-4 w-4 text-primary" />
                      <span>{plan.cpu}% CPU</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <HardDrive className="h-4 w-4 text-primary" />
                      <span>{plan.disk / 1024} GB SSD</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Database className="h-4 w-4 text-primary" />
                      <span>{plan.databases} DB</span>
                    </div>
                  </div>

                  {variants.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {language === 'nl' ? 'Selecteer variant' : 'Select variant'}
                      </label>
                      <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {variants.map(variant => (
                            <SelectItem key={variant.id} value={variant.id}>
                              {variant.name}
                              {variant.description && (
                                <span className="text-muted-foreground ml-2">
                                  - {variant.description}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <span>{plan.name}</span>
                    <span>€{plan.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>BTW (21%)</span>
                    <span>{language === 'nl' ? 'Inclusief' : 'Included'}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>{language === 'nl' ? 'Totaal per maand' : 'Total per month'}</span>
                      <span>€{plan.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
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
                    <img src="https://cdn.brandfolder.io/KGT2DTA4/at/8vbr8k4mr5xjwk4hxq4t9vs/Visa_Brandmark_Blue_RGB_2021.svg" alt="Visa" className="h-6" />
                    <img src="https://cdn.brandfolder.io/KGT2DTA4/at/grhj9v46b7jwrg3hmrz4q3h/mc_symbol.svg" alt="Mastercard" className="h-6" />
                    <span className="text-xs text-muted-foreground self-center">iDEAL • Bancontact</span>
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

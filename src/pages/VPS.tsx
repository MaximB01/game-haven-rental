import { useState, useEffect } from 'react';
import { Check, Cpu, HardDrive, Globe, Gauge, Loader2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface ProductPlan {
  id: string;
  name: string;
  price: number;
  ram: number;
  cpu: number;
  disk: number;
}

const VPS = () => {
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    // First get the VPS product
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', 'vps')
      .maybeSingle();

    if (product) {
      const { data: plansData } = await supabase
        .from('product_plans')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (plansData) setPlans(plansData as ProductPlan[]);
    }
    setLoading(false);
  };

  const features = language === 'nl'
    ? ['Root access', 'SSD opslag', 'DDoS bescherming', 'Dagelijkse backups', '99.9% uptime garantie', 'Nederlands datacenter']
    : ['Root access', 'SSD storage', 'DDoS protection', 'Daily backups', '99.9% uptime guarantee', 'Dutch datacenter'];

  // Mark the second plan as popular
  const plansWithPopular = plans.map((plan, index) => ({
    ...plan,
    popular: index === 1,
  }));

  if (loading) {
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
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 gaming-gradient-bg opacity-10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t('vps.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('vps.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {plansWithPopular.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl bg-card border p-8 hover-lift ${
                  plan.popular ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                    {t('pricing.popular')}
                  </span>
                )}

                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-4xl font-bold text-foreground mb-8">
                  €{plan.price.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">{t('games.perMonth')}</span>
                </p>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Cpu className="h-5 w-5 text-primary" />
                    {plan.cpu}% vCPU
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Gauge className="h-5 w-5 text-primary" />
                    {(plan.ram / 1024).toFixed(0)} GB RAM
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <HardDrive className="h-5 w-5 text-primary" />
                    {(plan.disk / 1024).toFixed(0)} GB NVMe SSD
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Globe className="h-5 w-5 text-primary" />
                    {language === 'nl' ? 'Onbeperkt verkeer' : 'Unlimited traffic'}
                  </li>
                </ul>

                <Button
                  className={`w-full ${plan.popular ? 'gaming-gradient-bg hover:opacity-90' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                >
                  {t('pricing.orderNow')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            {language === 'nl' ? 'Alle VPS servers bevatten' : 'All VPS servers include'}
          </h2>

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full gaming-gradient-bg flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default VPS;
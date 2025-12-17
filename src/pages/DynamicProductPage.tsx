import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Check, Cpu, HardDrive, Gauge, Database, Archive, Loader2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string;
  display_type: string;
  page_path: string | null;
  is_active: boolean;
}

interface ProductPlan {
  id: string;
  name: string;
  price: number;
  ram: number;
  cpu: number;
  disk: number;
  databases: number;
  backups: number;
  is_active: boolean;
}

const DynamicProductPage = () => {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine the slug - either from param or from URL path
  const getSlugFromPath = () => {
    if (paramSlug) return paramSlug;
    // Extract slug from legacy routes like /vps, /bot-hosting, /web-hosting
    const path = location.pathname.replace('/', '');
    return path || null;
  };

  useEffect(() => {
    const slug = getSlugFromPath();
    if (slug) {
      fetchProduct(slug);
    } else {
      navigate('/not-found', { replace: true });
    }
  }, [paramSlug, location.pathname]);

  const fetchProduct = async (slug: string) => {
    setLoading(true);
    
    // First try to find by slug directly
    let { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('display_type', 'own_page')
      .maybeSingle();

    // If not found by slug, try to find by page_path
    if (!productData) {
      const pagePath = '/' + slug;
      const { data: pathData } = await supabase
        .from('products')
        .select('*')
        .eq('page_path', pagePath)
        .eq('is_active', true)
        .eq('display_type', 'own_page')
        .maybeSingle();
      
      productData = pathData;
    }

    if (!productData) {
      // Product not found or not set to own_page, redirect to 404
      navigate('/not-found', { replace: true });
      return;
    }

    setProduct(productData as Product);

    // Fetch plans for this product
    const { data: plansData } = await supabase
      .from('product_plans')
      .select('*')
      .eq('product_id', productData.id)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (plansData) setPlans(plansData as ProductPlan[]);
    setLoading(false);
  };

  // Mark the second plan as popular (if exists)
  const plansWithPopular = plans.map((plan, index) => ({
    ...plan,
    popular: index === 1,
  }));

  const getFeatures = () => {
    if (!product) return [];
    
    const baseFeatures = language === 'nl'
      ? ['DDoS bescherming', 'Dagelijkse backups', '99.9% uptime garantie', 'Nederlands datacenter', '24/7 support', 'Eenvoudig beheer']
      : ['DDoS protection', 'Daily backups', '99.9% uptime guarantee', 'Dutch datacenter', '24/7 support', 'Easy management'];
    
    return baseFeatures;
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

  if (!product) {
    return null;
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 gaming-gradient-bg opacity-10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            {product.image_url && (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden mb-6">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-lg text-muted-foreground">
                {product.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className={`grid grid-cols-1 md:grid-cols-2 ${plans.length >= 3 ? 'lg:grid-cols-3' : ''} ${plans.length >= 4 ? 'xl:grid-cols-4' : ''} gap-8 max-w-6xl mx-auto`}>
            {plansWithPopular.map((plan) => (
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
                    <Gauge className="h-5 w-5 text-primary" />
                    {plan.ram >= 1024 ? `${(plan.ram / 1024).toFixed(0)} GB` : `${plan.ram} MB`} RAM
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Cpu className="h-5 w-5 text-primary" />
                    {plan.cpu}% CPU
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <HardDrive className="h-5 w-5 text-primary" />
                    {plan.disk >= 1024 ? `${(plan.disk / 1024).toFixed(0)} GB` : `${plan.disk} MB`} SSD
                  </li>
                  {plan.databases > 0 && (
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Database className="h-5 w-5 text-primary" />
                      {plan.databases} {language === 'nl' ? 'databases' : 'databases'}
                    </li>
                  )}
                  {plan.backups > 0 && (
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Archive className="h-5 w-5 text-primary" />
                      {plan.backups} {language === 'nl' ? 'backups' : 'backups'}
                    </li>
                  )}
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

          {plans.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {language === 'nl' ? 'Geen plannen beschikbaar' : 'No plans available'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            {language === 'nl' ? `Alle ${product.name} pakketten bevatten` : `All ${product.name} packages include`}
          </h2>

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getFeatures().map((feature, index) => (
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

export default DynamicProductPage;
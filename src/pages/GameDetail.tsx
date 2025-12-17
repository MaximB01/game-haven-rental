import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, HardDrive, Users, Cpu, Loader2, Server } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import minecraftImg from '@/assets/games/minecraft.jpg';
import rustImg from '@/assets/games/rust.jpg';
import valheimImg from '@/assets/games/valheim.jpg';
import arkImg from '@/assets/games/ark.jpg';

// Fallback images
const defaultImages: Record<string, string> = {
  minecraft: minecraftImg,
  rust: rustImg,
  valheim: valheimImg,
  ark: arkImg,
};

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string;
  is_active: boolean;
  temporarily_unavailable: boolean;
  egg_id: number | null;
  nest_id: number | null;
}

interface ProductPlan {
  id: string;
  product_id: string;
  name: string;
  price: number;
  ram: number;
  cpu: number;
  disk: number;
  databases: number;
  backups: number;
  is_active: boolean;
}

interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  egg_id: number | null;
  nest_id: number | null;
  docker_image: string | null;
  startup_command: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

const GameDetail = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOrdering, setIsOrdering] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (gameId) {
      fetchProductData(gameId);
    }
  }, [gameId]);

  const fetchProductData = async (slug: string) => {
    setLoading(true);

    // Fetch product
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (!productData) {
      setLoading(false);
      return;
    }

    setProduct(productData as Product);

    // Fetch plans and variants in parallel
    const [plansResult, variantsResult] = await Promise.all([
      supabase
        .from('product_plans')
        .select('*')
        .eq('product_id', productData.id)
        .eq('is_active', true)
        .order('price', { ascending: true }),
      supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productData.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
    ]);

    if (plansResult.data) setPlans(plansResult.data as ProductPlan[]);
    if (variantsResult.data) {
      const variantsList = variantsResult.data as ProductVariant[];
      setVariants(variantsList);
      // Set default variant
      const defaultVariant = variantsList.find(v => v.is_default) || variantsList[0];
      if (defaultVariant) setSelectedVariant(defaultVariant.id);
    }

    setLoading(false);
  };

  const getProductImage = () => {
    if (product?.image_url) return product.image_url;
    return defaultImages[gameId || ''] || minecraftImg;
  };

  const getFeatures = () => {
    return language === 'nl'
      ? ['DDoS bescherming', 'Automatische backups', '99.9% uptime garantie', 'Nederlands datacenter', '24/7 support', 'Eenvoudig beheer']
      : ['DDoS protection', 'Automatic backups', '99.9% uptime guarantee', 'Dutch datacenter', '24/7 support', 'Easy management'];
  };

  const handleOrder = async (plan: ProductPlan) => {
    if (!product) return;

    try {
      setIsOrdering(plan.name);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: language === 'nl' ? 'Inloggen vereist' : 'Login required',
          description: language === 'nl' 
            ? 'Je moet ingelogd zijn om te bestellen' 
            : 'You need to be logged in to place an order',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Get selected variant details
      const selectedVariantData = variants.find(v => v.id === selectedVariant);

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          product_type: 'game_server',
          product_name: product.name,
          plan_name: plan.name,
          price: plan.price,
          status: 'provisioning',
          variant_id: selectedVariant,
          variant_name: selectedVariantData?.name || null,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error('Failed to create order');
      }

      // Call edge function to create Pterodactyl server
      const { data: serverData, error: serverError } = await supabase.functions.invoke(
        'create-pterodactyl-server',
        {
          body: {
            orderId: order.id,
            gameId: gameId,
            planName: plan.name,
            ram: plan.ram,
            cpu: plan.cpu,
            disk: plan.disk,
            userId: user.id,
            userEmail: user.email,
            // Pass variant data for egg selection
            variantId: selectedVariant,
            eggId: selectedVariantData?.egg_id || product.egg_id,
            nestId: selectedVariantData?.nest_id || product.nest_id,
            dockerImage: selectedVariantData?.docker_image,
            startupCommand: selectedVariantData?.startup_command,
          },
        }
      );

      if (serverError) {
        console.error('Server creation error:', serverError);
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', order.id);
        throw new Error('Failed to create server');
      }

      if (serverData?.success) {
        toast({
          title: language === 'nl' ? 'Server aangemaakt!' : 'Server created!',
          description: language === 'nl'
            ? 'Je server wordt nu opgestart. Check je dashboard voor de status.'
            : 'Your server is now starting up. Check your dashboard for status.',
        });
        navigate('/dashboard');
      } else {
        throw new Error(serverData?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: language === 'nl' ? 'Bestelling mislukt' : 'Order failed',
        description: language === 'nl'
          ? 'Er ging iets mis bij het aanmaken van je server. Probeer het opnieuw.'
          : 'Something went wrong creating your server. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsOrdering(null);
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

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {language === 'nl' ? 'Product niet gevonden' : 'Product not found'}
          </h1>
          <Button asChild>
            <Link to="/game-servers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {language === 'nl' ? 'Terug naar Game Servers' : 'Back to Game Servers'}
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isUnavailable = product.temporarily_unavailable;

  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <img
          src={getProductImage()}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover ${isUnavailable ? 'grayscale' : ''}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="container mx-auto px-4 h-full flex items-end pb-8 relative">
          <div>
            <Link
              to="/game-servers"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('nav.gameServers')}
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">{product.name}</h1>
              {isUnavailable && (
                <span className="px-3 py-1 text-sm font-medium bg-destructive text-destructive-foreground rounded-full">
                  {language === 'nl' ? 'Tijdelijk niet beschikbaar' : 'Temporarily unavailable'}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <p className="text-lg text-muted-foreground max-w-3xl">
            {product.description || ''}
          </p>
        </div>
      </section>

      {/* Variant Selection */}
      {variants.length > 0 && (
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              {language === 'nl' ? 'Kies je server type' : 'Choose your server type'}
            </h2>
            <RadioGroup
              value={selectedVariant || ''}
              onValueChange={setSelectedVariant}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {variants.map((variant) => (
                <div key={variant.id} className="relative">
                  <RadioGroupItem
                    value={variant.id}
                    id={variant.id}
                    className="peer sr-only"
                    disabled={isUnavailable}
                  />
                  <Label
                    htmlFor={variant.id}
                    className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${isUnavailable ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
                      peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                      ${selectedVariant === variant.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <span className="font-semibold text-foreground">{variant.name}</span>
                    {variant.description && (
                      <span className="text-sm text-muted-foreground mt-1">{variant.description}</span>
                    )}
                    {variant.is_default && (
                      <span className="text-xs text-primary mt-2">
                        {language === 'nl' ? 'Aanbevolen' : 'Recommended'}
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            {language === 'nl' ? 'Kies je pakket' : 'Choose your plan'}
          </h2>

          <div className={`grid grid-cols-1 md:grid-cols-2 ${plans.length >= 3 ? 'lg:grid-cols-3' : ''} ${plans.length >= 4 ? 'xl:grid-cols-4' : ''} gap-6`}>
            {plans.map((plan, index) => {
              const isPopular = index === 1;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl bg-card border p-6 hover-lift ${
                    isPopular ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  } ${isUnavailable ? 'opacity-75' : ''}`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      {t('pricing.popular')}
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold text-foreground mb-6">
                    €{plan.price.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">{t('games.perMonth')}</span>
                  </p>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Cpu className="h-4 w-4 text-primary" />
                      {plan.ram >= 1024 ? `${(plan.ram / 1024).toFixed(0)} GB` : `${plan.ram} MB`} RAM
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      {plan.cpu}% CPU
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <HardDrive className="h-4 w-4 text-primary" />
                      {plan.disk >= 1024 ? `${(plan.disk / 1024).toFixed(0)} GB` : `${plan.disk} MB`} SSD
                    </li>
                  </ul>

                  <Button
                    className={`w-full ${isPopular && !isUnavailable ? 'gaming-gradient-bg hover:opacity-90' : ''}`}
                    variant={isPopular && !isUnavailable ? 'default' : 'outline'}
                    onClick={() => handleOrder(plan)}
                    disabled={isOrdering !== null || isUnavailable}
                  >
                    {isOrdering === plan.name ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {language === 'nl' ? 'Bezig...' : 'Processing...'}
                      </>
                    ) : isUnavailable ? (
                      language === 'nl' ? 'Niet beschikbaar' : 'Unavailable'
                    ) : (
                      t('pricing.orderNow')
                    )}
                  </Button>
                </div>
              );
            })}
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
            {t('pricing.features')}
          </h2>

          <div className="max-w-2xl mx-auto">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getFeatures().map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full gaming-gradient-bg flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default GameDetail;

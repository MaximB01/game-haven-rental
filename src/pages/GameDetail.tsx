import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, HardDrive, Users, Cpu, Loader2, Server } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  is_popular: boolean;
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
  const [minecraftVersion, setMinecraftVersion] = useState<string>('latest');

  // FiveM required settings (egg variables)
  const [fivemLicense, setFivemLicense] = useState('');
  const [steamWebApiKey, setSteamWebApiKey] = useState('');
  const [serverHostname, setServerHostname] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(32);
  const [fivemVersion, setFivemVersion] = useState('recommended');
  const [txAdminPort, setTxAdminPort] = useState<number>(40120);

  useEffect(() => {
    // sensible defaults when switching products
    if (gameId === 'fivem') {
      setServerHostname((prev) => prev || 'FiveM Server');
      setMaxPlayers((prev) => (Number.isFinite(prev) ? prev : 32));
      setFivemVersion((prev) => prev || 'recommended');
      setTxAdminPort((prev) => (Number.isFinite(prev) ? prev : 40120));
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

  // Load product data when route changes
  useEffect(() => {
    if (gameId) {
      fetchProductData(gameId);
    }
  }, [gameId]);

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

      // FiveM requires egg variables - store them for later use
      let environment: Record<string, string> | undefined;
      if (gameId === 'fivem') {
        const license = fivemLicense.trim();
        const steamKey = steamWebApiKey.trim();
        const hostname = (serverHostname || `${product.name} Server`).trim();

        if (!license || !steamKey) {
          toast({
            title: language === 'nl' ? 'Extra info vereist' : 'Extra info required',
            description: language === 'nl'
              ? 'Vul je FiveM License Key en Steam Web API Key in om de server aan te maken.'
              : 'Please provide your FiveM License Key and Steam Web API Key to create the server.',
            variant: 'destructive',
          });
          return;
        }

        const txAdminEnable = selectedVariantData?.name?.toLowerCase().includes('disabled') ? '0' : '1';

        environment = {
          FIVEM_LICENSE: license,
          STEAM_WEBAPIKEY: steamKey,
          MAX_PLAYERS: String(Math.max(1, Math.min(2048, maxPlayers || 32))),
          SERVER_HOSTNAME: hostname,
          FIVEM_VERSION: (fivemVersion || 'recommended').trim(),
          TXADMIN_PORT: String(Math.max(1, Math.min(65535, txAdminPort || 40120))),
          TXADMIN_ENABLE: txAdminEnable,
        };
      }

      // Navigate to checkout with all necessary data
      navigate('/checkout', {
        state: {
          productId: product.id,
          productName: product.name,
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          variantId: selectedVariant,
          variantName: selectedVariantData?.name,
          productType: 'game_server',
          gameId: gameId,
          eggId: selectedVariantData?.egg_id || product.egg_id,
          nestId: selectedVariantData?.nest_id || product.nest_id,
          dockerImage: selectedVariantData?.docker_image,
          startupCommand: selectedVariantData?.startup_command,
          minecraftVersion: gameId === 'minecraft' ? minecraftVersion : undefined,
          environment,
          ram: plan.ram,
          cpu: plan.cpu,
          disk: plan.disk,
        }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : undefined;
      console.error('Order error:', error);
      toast({
        title: language === 'nl' ? 'Bestelling mislukt' : 'Order failed',
        description: msg
          ? msg
          : (language === 'nl'
            ? 'Er ging iets mis bij het aanmaken van je server. Probeer het opnieuw.'
            : 'Something went wrong creating your server. Please try again.'),
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

      {/* Server Type Selection (Egg) */}
      {(variants.length > 0 || gameId === 'minecraft') && (
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              {language === 'nl' ? 'Kies je server type' : 'Choose your server type'}
            </h2>

            {variants.length > 0 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">
                {language === 'nl'
                  ? 'Op dit moment is er maar één server type beschikbaar voor dit product.'
                  : 'At the moment there is only one server type available for this product.'}
              </p>
            )}
          </div>
        </section>
      )}

      {/* FiveM Settings */}
      {gameId === 'fivem' && (
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {language === 'nl' ? 'Server instellingen' : 'Server settings'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="space-y-2">
                <Label htmlFor="fivem-hostname">{language === 'nl' ? 'Server naam' : 'Server name'}</Label>
                <Input
                  id="fivem-hostname"
                  value={serverHostname}
                  onChange={(e) => setServerHostname(e.target.value)}
                  placeholder={language === 'nl' ? 'Mijn FiveM server' : 'My FiveM server'}
                  disabled={isUnavailable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fivem-maxplayers">{language === 'nl' ? 'Max spelers' : 'Max players'}</Label>
                <Input
                  id="fivem-maxplayers"
                  type="number"
                  min={1}
                  max={2048}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value || '0', 10) || 0)}
                  disabled={isUnavailable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fivem-version">{language === 'nl' ? 'FiveM versie' : 'FiveM version'}</Label>
                <Input
                  id="fivem-version"
                  value={fivemVersion}
                  onChange={(e) => setFivemVersion(e.target.value)}
                  placeholder="recommended"
                  disabled={isUnavailable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="txadmin-port">{language === 'nl' ? 'TxAdmin poort' : 'TxAdmin port'}</Label>
                <Input
                  id="txadmin-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={txAdminPort}
                  onChange={(e) => setTxAdminPort(parseInt(e.target.value || '0', 10) || 0)}
                  disabled={isUnavailable}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fivem-license">{language === 'nl' ? 'FiveM License Key' : 'FiveM License Key'}</Label>
                <Input
                  id="fivem-license"
                  value={fivemLicense}
                  onChange={(e) => setFivemLicense(e.target.value)}
                  placeholder="cfxk_..."
                  disabled={isUnavailable}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="steam-webapikey">{language === 'nl' ? 'Steam Web API Key' : 'Steam Web API Key'}</Label>
                <Input
                  id="steam-webapikey"
                  value={steamWebApiKey}
                  onChange={(e) => setSteamWebApiKey(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  disabled={isUnavailable}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-3 max-w-3xl">
              {language === 'nl'
                ? 'Deze gegevens zijn vereist door de FiveM egg om je server aan te maken.'
                : 'These settings are required by the FiveM egg to create your server.'}
            </p>
          </div>
        </section>
      )}

      {/* Minecraft Version Selection */}
      {gameId === 'minecraft' && (
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {language === 'nl' ? 'Kies je Minecraft versie' : 'Choose your Minecraft version'}
            </h2>

            <div className="max-w-xs">
              <Select value={minecraftVersion} onValueChange={setMinecraftVersion} disabled={isUnavailable}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'nl' ? 'Selecteer een versie' : 'Select a version'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">latest</SelectItem>
                  <SelectItem value="1.21.4">1.21.4</SelectItem>
                  <SelectItem value="1.21.3">1.21.3</SelectItem>
                  <SelectItem value="1.21.1">1.21.1</SelectItem>
                  <SelectItem value="1.20.6">1.20.6</SelectItem>
                  <SelectItem value="1.20.4">1.20.4</SelectItem>
                  <SelectItem value="1.19.4">1.19.4</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                {language === 'nl'
                  ? 'Tip: als je egg geen versiekeuze ondersteunt, wordt deze instelling genegeerd.'
                  : 'Tip: if your egg does not support version selection, this setting is ignored.'}
              </p>
            </div>
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
            {plans.map((plan) => {
              const isPopular = plan.is_popular;
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

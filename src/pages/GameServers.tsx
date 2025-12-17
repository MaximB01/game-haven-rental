import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Loader2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import minecraftImg from '@/assets/games/minecraft.jpg';
import rustImg from '@/assets/games/rust.jpg';
import valheimImg from '@/assets/games/valheim.jpg';
import arkImg from '@/assets/games/ark.jpg';

// Fallback images for games without custom images
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
  display_type: string;
  is_active: boolean;
}

interface ProductPlan {
  id: string;
  product_id: string;
  price: number;
}

const GameServers = () => {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    // Fetch products that should be grouped (game servers)
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('display_type', 'grouped')
      .eq('is_active', true)
      .order('name');

    // Fetch lowest price plans for each product
    const { data: plansData } = await supabase
      .from('product_plans')
      .select('id, product_id, price')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (productsData) setProducts(productsData as Product[]);
    if (plansData) setPlans(plansData as ProductPlan[]);
    setLoading(false);
  };

  const getLowestPrice = (productId: string) => {
    const productPlans = plans.filter(p => p.product_id === productId);
    if (productPlans.length === 0) return 0;
    return Math.min(...productPlans.map(p => p.price));
  };

  const getProductImage = (product: Product) => {
    if (product.image_url) return product.image_url;
    return defaultImages[product.slug] || minecraftImg;
  };

  const filters = [
    { id: 'all', label: t('gameServers.filter.all') },
    { id: 'popular', label: t('gameServers.filter.popular') },
    { id: 'new', label: t('gameServers.filter.new') },
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
              {t('gameServers.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('gameServers.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              {filters.map((f) => (
                <Button
                  key={f.id}
                  variant={filter === f.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f.id)}
                  className={filter === f.id ? 'gaming-gradient-bg' : ''}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/game-servers/${product.slug}`}
                className="group overflow-hidden rounded-2xl bg-card border border-border hover-lift"
              >
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{product.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {product.description || ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">{t('games.from')}</span>
                      <p className="text-xl font-bold text-primary">
                        €{getLowestPrice(product.id).toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">{t('games.perMonth')}</span>
                      </p>
                    </div>
                    <Button size="sm" className="gaming-gradient-bg hover:opacity-90">
                      {t('games.configure')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No games found</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default GameServers;
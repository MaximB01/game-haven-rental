import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  image_url: string | null;
  is_popular: boolean;
}

interface ProductPlan {
  id: string;
  product_id: string;
  price: number;
}

const GamesSection = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularProducts();
  }, []);

  const fetchPopularProducts = async () => {
    // Fetch only popular products
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, slug, image_url, is_popular')
      .eq('is_active', true)
      .eq('is_popular', true)
      .eq('display_type', 'grouped')
      .order('name')
      .limit(6);

    // Fetch lowest price plans
    const { data: plansData } = await supabase
      .from('product_plans')
      .select('id, product_id, price')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (productsData) setProducts(productsData);
    if (plansData) setPlans(plansData);
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

  if (loading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't show section if no popular products
  }

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('games.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('games.subtitle')}
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/game-servers/${product.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border hover-lift"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              {/* Badge */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  {t('pricing.popular')}
                </span>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground">{product.name}</h3>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">{t('games.from')}</span>
                    <p className="text-xl font-bold text-primary">
                      €{getLowestPrice(product.id).toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground">{t('games.perMonth')}</span>
                    </p>
                  </div>
                </div>
                <Button className="w-full gaming-gradient-bg hover:opacity-90 group-hover:translate-x-0 transition-transform">
                  {t('games.configure')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <Button asChild variant="outline" size="lg">
            <Link to="/game-servers">
              {t('common.viewAll')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GamesSection;
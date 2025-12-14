import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const games = [
  {
    id: 'minecraft',
    name: 'Minecraft',
    image: 'https://images.unsplash.com/photo-1587573089734-599d584bded5?w=400&h=300&fit=crop',
    price: 4.99,
    popular: true,
  },
  {
    id: 'rust',
    name: 'Rust',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
    price: 9.99,
    popular: true,
  },
  {
    id: 'valheim',
    name: 'Valheim',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
    price: 6.99,
    popular: false,
    isNew: true,
  },
];

const GamesSection = () => {
  const { t } = useLanguage();

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
          {games.map((game) => (
            <Link
              key={game.id}
              to={`/game-servers/${game.id}`}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border hover-lift"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {game.popular && (
                  <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                    {t('pricing.popular')}
                  </span>
                )}
                {game.isNew && (
                  <span className="px-3 py-1 text-xs font-medium bg-green-500 text-white rounded-full">
                    NEW
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground">{game.name}</h3>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">{t('games.from')}</span>
                    <p className="text-xl font-bold text-primary">
                      €{game.price.toFixed(2)}
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

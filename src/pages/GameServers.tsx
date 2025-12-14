import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

const games = [
  {
    id: 'minecraft',
    name: 'Minecraft',
    image: 'https://images.unsplash.com/photo-1587573089734-599d584bded5?w=400&h=300&fit=crop',
    price: 4.99,
    category: 'popular',
    description: { nl: 'De #1 sandbox game ter wereld', en: 'The #1 sandbox game in the world' },
  },
  {
    id: 'rust',
    name: 'Rust',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
    price: 9.99,
    category: 'popular',
    description: { nl: 'Survival multiplayer op zijn best', en: 'Survival multiplayer at its best' },
  },
  {
    id: 'valheim',
    name: 'Valheim',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
    price: 6.99,
    category: 'new',
    description: { nl: 'Viking survival adventure', en: 'Viking survival adventure' },
  },
];

const GameServers = () => {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { id: 'all', label: t('gameServers.filter.all') },
    { id: 'popular', label: t('gameServers.filter.popular') },
    { id: 'new', label: t('gameServers.filter.new') },
  ];

  const filteredGames = games.filter((game) => {
    const matchesFilter = filter === 'all' || game.category === filter;
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
            {filteredGames.map((game) => (
              <Link
                key={game.id}
                to={`/game-servers/${game.id}`}
                className="group overflow-hidden rounded-2xl bg-card border border-border hover-lift"
              >
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{game.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {game.description[language]}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">{t('games.from')}</span>
                      <p className="text-xl font-bold text-primary">
                        €{game.price.toFixed(2)}
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

          {filteredGames.length === 0 && (
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

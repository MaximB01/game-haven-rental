import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, Server, HardDrive, Users, Cpu } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import minecraftImg from '@/assets/games/minecraft.jpg';
import rustImg from '@/assets/games/rust.jpg';
import valheimImg from '@/assets/games/valheim.jpg';
import arkImg from '@/assets/games/ark.jpg';

const gamesData = {
  minecraft: {
    name: 'Minecraft',
    image: minecraftImg,
    description: {
      nl: 'Host je eigen Minecraft server en speel samen met vrienden. Wij ondersteunen alle versies en modpacks.',
      en: 'Host your own Minecraft server and play with friends. We support all versions and modpacks.',
    },
    features: {
      nl: ['Alle versies ondersteund', 'Modpack support', 'Automatische backups', 'Plugin support', 'Onbeperkt slots'],
      en: ['All versions supported', 'Modpack support', 'Automatic backups', 'Plugin support', 'Unlimited slots'],
    },
    plans: [
      { name: 'Starter', ram: 2, slots: 10, storage: 10, price: 4.99 },
      { name: 'Basic', ram: 4, slots: 20, storage: 20, price: 7.99, popular: true },
      { name: 'Pro', ram: 8, slots: 50, storage: 40, price: 14.99 },
      { name: 'Ultimate', ram: 16, slots: 100, storage: 80, price: 24.99 },
    ],
  },
  rust: {
    name: 'Rust',
    image: rustImg,
    description: {
      nl: 'De ultieme survival ervaring. Bouw je basis, verzamel resources en overleef tegen andere spelers.',
      en: 'The ultimate survival experience. Build your base, gather resources and survive against other players.',
    },
    features: {
      nl: ['Oxide plugin support', 'Automatische wipes', 'Custom maps', 'Hoge performance', 'DDoS bescherming'],
      en: ['Oxide plugin support', 'Automatic wipes', 'Custom maps', 'High performance', 'DDoS protection'],
    },
    plans: [
      { name: 'Starter', ram: 8, slots: 50, storage: 30, price: 9.99 },
      { name: 'Standard', ram: 12, slots: 100, storage: 50, price: 14.99, popular: true },
      { name: 'Pro', ram: 16, slots: 200, storage: 80, price: 24.99 },
      { name: 'Ultimate', ram: 32, slots: 500, storage: 150, price: 44.99 },
    ],
  },
  valheim: {
    name: 'Valheim',
    image: valheimImg,
    description: {
      nl: 'Verken de Noorse mythologie in deze populaire Viking survival game. Perfect voor co-op met vrienden.',
      en: 'Explore Norse mythology in this popular Viking survival game. Perfect for co-op with friends.',
    },
    features: {
      nl: ['Mod support', 'Automatische backups', 'Wereldbeheer', 'Cross-platform', 'Lage latency'],
      en: ['Mod support', 'Automatic backups', 'World management', 'Cross-platform', 'Low latency'],
    },
    plans: [
      { name: 'Duo', ram: 2, slots: 2, storage: 10, price: 4.99 },
      { name: 'Squad', ram: 4, slots: 5, storage: 20, price: 6.99, popular: true },
      { name: 'Clan', ram: 6, slots: 10, storage: 30, price: 9.99 },
      { name: 'Legion', ram: 8, slots: 20, storage: 50, price: 14.99 },
    ],
  },
  ark: {
    name: 'Ark: Survival Evolved',
    image: arkImg,
    description: {
      nl: 'Waar overleven evolutie wordt — tem kolossale wezens, bouw beschavingen en vecht om je plaats aan de top.',
      en: 'Where survival becomes evolution — tame colossal creatures, build civilizations, and fight for your place at the top.',
    },
    features: {
      nl: ['Mod support', 'Automatische backups', 'Wereldbeheer', 'Lage latency'],
      en: ['Mod support', 'Automatic backups', 'World management', 'Low latency'],
    },
    plans: [
      { name: 'Starter', ram: 2, slots: 10, storage: 10, price: 5.99 },
      { name: 'Standard', ram: 4, slots: 20, storage: 20, price: 6.99 },
      { name: 'Pro', ram: 6, slots: 50, storage: 30, price: 11.99, popular: true },
      { name: 'Ultimate', ram: 8, slots: 100, storage: 50, price: 16.99 },
    ],
  },
};

const GameDetail = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { t, language } = useLanguage();

  const game = gamesData[gameId as keyof typeof gamesData];

  if (!game) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Game not found</h1>
          <Button asChild>
            <Link to="/game-servers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Game Servers
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <img
          src={game.image}
          alt={game.name}
          className="absolute inset-0 w-full h-full object-cover"
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
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">{game.name}</h1>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <p className="text-lg text-muted-foreground max-w-3xl">
            {game.description[language]}
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            {language === 'nl' ? 'Kies je pakket' : 'Choose your plan'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {game.plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl bg-card border p-6 hover-lift ${
                  plan.popular ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                {plan.popular && (
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
                    {plan.ram} GB RAM
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    {plan.slots} {language === 'nl' ? 'spelers' : 'players'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HardDrive className="h-4 w-4 text-primary" />
                    {plan.storage} GB SSD
                  </li>
                </ul>

                <Button
                  className={`w-full ${plan.popular ? 'gaming-gradient-bg hover:opacity-90' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
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
            {t('pricing.features')}
          </h2>

          <div className="max-w-2xl mx-auto">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {game.features[language].map((feature, index) => (
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

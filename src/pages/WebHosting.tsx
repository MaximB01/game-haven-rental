import { Check, Globe, HardDrive, Mail, Shield } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const WebHosting = () => {
  const { t, language } = useLanguage();

  const plans = [
    {
      name: 'Starter',
      websites: 1,
      storage: 10,
      email: 5,
      price: 2.99,
    },
    {
      name: 'Business',
      websites: 10,
      storage: 50,
      email: 25,
      price: 7.99,
      popular: true,
    },
    {
      name: 'Enterprise',
      websites: language === 'nl' ? 'Onbeperkt' : 'Unlimited',
      storage: 100,
      email: 100,
      price: 14.99,
    },
  ];

  const features = language === 'nl'
    ? ['Gratis SSL certificaat', 'cPanel toegang', 'One-click WordPress', 'Dagelijkse backups', '99.9% uptime', 'Gratis migratie']
    : ['Free SSL certificate', 'cPanel access', 'One-click WordPress', 'Daily backups', '99.9% uptime', 'Free migration'];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 gaming-gradient-bg opacity-10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gaming-gradient-bg mb-6">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t('web.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('web.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
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
                    <Globe className="h-5 w-5 text-primary" />
                    {plan.websites} {language === 'nl' ? 'websites' : 'websites'}
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <HardDrive className="h-5 w-5 text-primary" />
                    {plan.storage} GB SSD
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-5 w-5 text-primary" />
                    {plan.email} {language === 'nl' ? 'e-mail accounts' : 'email accounts'}
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Shield className="h-5 w-5 text-primary" />
                    {language === 'nl' ? 'Gratis SSL' : 'Free SSL'}
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
            {language === 'nl' ? 'Alle webhosting bevatten' : 'All web hosting includes'}
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

export default WebHosting;

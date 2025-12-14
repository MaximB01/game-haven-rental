import { Check, Users, Server, Shield, Headphones } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

const About = () => {
  const { t, language } = useLanguage();

  const values = [
    {
      icon: Server,
      title: language === 'nl' ? 'Premium Hardware' : 'Premium Hardware',
      description: language === 'nl'
        ? 'Alleen de beste servers met de nieuwste processors en NVMe SSD opslag.'
        : 'Only the best servers with the latest processors and NVMe SSD storage.',
    },
    {
      icon: Shield,
      title: language === 'nl' ? 'Veiligheid Eerst' : 'Security First',
      description: language === 'nl'
        ? 'Enterprise-grade DDoS bescherming en dagelijkse backups voor al je data.'
        : 'Enterprise-grade DDoS protection and daily backups for all your data.',
    },
    {
      icon: Headphones,
      title: language === 'nl' ? '24/7 Support' : '24/7 Support',
      description: language === 'nl'
        ? 'Ons team staat altijd voor je klaar, dag en nacht, 7 dagen per week.'
        : 'Our team is always ready to help you, day and night, 7 days a week.',
    },
    {
      icon: Users,
      title: language === 'nl' ? 'Community Gedreven' : 'Community Driven',
      description: language === 'nl'
        ? 'Wij luisteren naar onze klanten en passen onze diensten aan op basis van feedback.'
        : 'We listen to our customers and adapt our services based on feedback.',
    },
  ];

  const whyUs = language === 'nl'
    ? [t('about.why.experience'), t('about.why.hardware'), t('about.why.support'), t('about.why.prices')]
    : [t('about.why.experience'), t('about.why.hardware'), t('about.why.support'), t('about.why.prices')];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 gaming-gradient-bg opacity-10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t('about.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {t('about.mission.title')}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('about.mission.text')}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl gaming-gradient-bg flex items-center justify-center flex-shrink-0">
                  <value.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            {t('about.why.title')}
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {whyUs.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full gaming-gradient-bg flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 gaming-gradient-bg">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-white mb-2">2019</p>
              <p className="text-white/80">{language === 'nl' ? 'Opgericht' : 'Founded'}</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-2">2,500+</p>
              <p className="text-white/80">{language === 'nl' ? 'Actieve Servers' : 'Active Servers'}</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-2">10,000+</p>
              <p className="text-white/80">{language === 'nl' ? 'Tevreden Klanten' : 'Happy Customers'}</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-2">99.9%</p>
              <p className="text-white/80">{language === 'nl' ? 'Uptime' : 'Uptime'}</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;

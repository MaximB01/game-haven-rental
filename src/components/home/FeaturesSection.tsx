import { Shield, Clock, Headphones, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Clock,
      title: t('feature.uptime'),
      description: t('feature.uptimeDesc'),
    },
    {
      icon: Shield,
      title: t('feature.ddos'),
      description: t('feature.ddosDesc'),
    },
    {
      icon: Headphones,
      title: t('feature.support'),
      description: t('feature.supportDesc'),
    },
    {
      icon: Zap,
      title: t('feature.instant'),
      description: t('feature.instantDesc'),
    },
  ];

  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-6 rounded-xl bg-background hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-lg gaming-gradient-bg flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

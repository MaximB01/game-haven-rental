import { Server, Clock, Gauge, HeadphonesIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const StatsSection = () => {
  const { t } = useLanguage();

  const stats = [
    {
      icon: Server,
      value: '2,500+',
      label: t('stats.servers'),
    },
    {
      icon: Clock,
      value: '99.9%',
      label: t('stats.uptime'),
    },
    {
      icon: Gauge,
      value: '<10ms',
      label: t('stats.latency'),
    },
    {
      icon: HeadphonesIcon,
      value: '<15min',
      label: t('stats.support'),
    },
  ];

  return (
    <section className="py-16 gaming-gradient-bg">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 mb-4">
                <stat.icon className="h-7 w-7 text-white" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</p>
              <p className="text-white/80 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

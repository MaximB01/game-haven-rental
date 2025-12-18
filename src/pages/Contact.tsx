import { useState } from 'react';
import { Mail, MessageCircle, Clock, Send } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: language === 'nl' ? 'Bericht verzonden!' : 'Message sent!',
      description: language === 'nl'
        ? 'We nemen zo snel mogelijk contact met je op.'
        : 'We will get back to you as soon as possible.',
    });

    setIsSubmitting(false);
    (e.target as HTMLFormElement).reset();
  };

  const contactInfo = [
    {
      icon: Mail,
      label: t('contact.info.email'),
      value: 'support@cloudsurf.be',
      href: 'mailto:support@cloudsurf.be',
    },
    {
      icon: MessageCircle,
      label: t('contact.info.discord'),
      value: 'discord.gg/cloudsurf',
      href: 'https://discord.gg/cloudsurf',
    },
    {
      icon: Clock,
      label: t('contact.info.hours'),
      value: language === 'nl' ? '24/7 beschikbaar' : '24/7 available',
    },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 gaming-gradient-bg opacity-10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t('contact.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Form */}
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {language === 'nl' ? 'Stuur ons een bericht' : 'Send us a message'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    {t('contact.form.name')}
                  </label>
                  <Input id="name" name="name" required placeholder={language === 'nl' ? 'Je naam' : 'Your name'} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    {t('contact.form.email')}
                  </label>
                  <Input id="email" name="email" type="email" required placeholder="email@voorbeeld.nl" />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                    {t('contact.form.subject')}
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    required
                    placeholder={language === 'nl' ? 'Onderwerp van je bericht' : 'Subject of your message'}
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    {t('contact.form.message')}
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    placeholder={language === 'nl' ? 'Je bericht...' : 'Your message...'}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gaming-gradient-bg hover:opacity-90"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    language === 'nl' ? 'Verzenden...' : 'Sending...'
                  ) : (
                    <>
                      {t('contact.form.submit')}
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {language === 'nl' ? 'Andere manieren om contact op te nemen' : 'Other ways to reach us'}
                </h2>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl gaming-gradient-bg flex items-center justify-center flex-shrink-0">
                        <info.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{info.label}</p>
                        {info.href ? (
                          <a
                            href={info.href}
                            className="text-primary hover:underline"
                            target={info.href.startsWith('http') ? '_blank' : undefined}
                            rel={info.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-muted-foreground">{info.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discord Banner */}
              <div className="bg-[#5865F2] rounded-2xl p-8 text-white">
                <MessageCircle className="h-10 w-10 mb-4" />
                <h3 className="text-xl font-bold mb-2">
                  {language === 'nl' ? 'Join onze Discord' : 'Join our Discord'}
                </h3>
                <p className="text-white/80 mb-4">
                  {language === 'nl'
                    ? 'Krijg direct hulp van ons team en de community.'
                    : 'Get instant help from our team and the community.'}
                </p>
                <Button variant="secondary" className="bg-white text-[#5865F2] hover:bg-white/90">
                  {language === 'nl' ? 'Open Discord' : 'Open Discord'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;

import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'nl' | 'en';

interface Translations {
  [key: string]: {
    nl: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.home': { nl: 'Home', en: 'Home' },
  'nav.gameServers': { nl: 'Game Servers', en: 'Game Servers' },
  'nav.vps': { nl: 'VPS Hosting', en: 'VPS Hosting' },
  'nav.botHosting': { nl: 'Bot Hosting', en: 'Bot Hosting' },
  'nav.webHosting': { nl: 'Web Hosting', en: 'Web Hosting' },
  'nav.about': { nl: 'Over Ons', en: 'About Us' },
  'nav.contact': { nl: 'Contact', en: 'Contact' },
  'nav.login': { nl: 'Inloggen', en: 'Login' },
  'nav.getStarted': { nl: 'Aan de slag', en: 'Get Started' },

  // Hero
  'hero.announcement': { nl: '🎮 Nieuw: Valheim servers nu beschikbaar!', en: '🎮 New: Valheim servers now available!' },
  'hero.title': { nl: 'Premium Game Server Hosting', en: 'Premium Game Server Hosting' },
  'hero.subtitle': { nl: 'Start je eigen game server in minuten. Betrouwbaar, snel en betaalbaar.', en: 'Start your own game server in minutes. Reliable, fast and affordable.' },
  'hero.cta.primary': { nl: 'Bekijk Servers', en: 'View Servers' },
  'hero.cta.secondary': { nl: 'Meer Info', en: 'Learn More' },

  // Features
  'feature.uptime': { nl: '99.9% Uptime', en: '99.9% Uptime' },
  'feature.uptimeDesc': { nl: 'Gegarandeerde beschikbaarheid', en: 'Guaranteed availability' },
  'feature.ddos': { nl: 'DDoS Bescherming', en: 'DDoS Protection' },
  'feature.ddosDesc': { nl: 'Enterprise-grade beveiliging', en: 'Enterprise-grade security' },
  'feature.support': { nl: '24/7 Support', en: '24/7 Support' },
  'feature.supportDesc': { nl: 'Altijd bereikbaar voor hulp', en: 'Always available to help' },
  'feature.instant': { nl: 'Direct Online', en: 'Instant Setup' },
  'feature.instantDesc': { nl: 'Server in 60 seconden', en: 'Server in 60 seconds' },

  // Games Section
  'games.title': { nl: 'Populaire Games', en: 'Popular Games' },
  'games.subtitle': { nl: 'Kies uit onze selectie van top games', en: 'Choose from our selection of top games' },
  'games.from': { nl: 'Vanaf', en: 'From' },
  'games.perMonth': { nl: '/maand', en: '/month' },
  'games.configure': { nl: 'Configureer', en: 'Configure' },

  // Stats
  'stats.servers': { nl: 'Actieve Servers', en: 'Active Servers' },
  'stats.uptime': { nl: 'Uptime', en: 'Uptime' },
  'stats.latency': { nl: 'Gemiddelde Latency', en: 'Average Latency' },
  'stats.support': { nl: 'Support Respons', en: 'Support Response' },

  // Game Servers Page
  'gameServers.title': { nl: 'Game Servers', en: 'Game Servers' },
  'gameServers.subtitle': { nl: 'Kies je favoriete game en start direct', en: 'Choose your favorite game and start instantly' },
  'gameServers.filter.all': { nl: 'Alle Games', en: 'All Games' },
  'gameServers.filter.popular': { nl: 'Populair', en: 'Popular' },
  'gameServers.filter.new': { nl: 'Nieuw', en: 'New' },

  // VPS Page
  'vps.title': { nl: 'VPS Hosting', en: 'VPS Hosting' },
  'vps.subtitle': { nl: 'Krachtige virtual private servers voor al je projecten', en: 'Powerful virtual private servers for all your projects' },
  'vps.basic': { nl: 'Basis', en: 'Basic' },
  'vps.professional': { nl: 'Professional', en: 'Professional' },
  'vps.enterprise': { nl: 'Enterprise', en: 'Enterprise' },

  // Bot Hosting Page
  'bot.title': { nl: 'Bot Hosting', en: 'Bot Hosting' },
  'bot.subtitle': { nl: 'Host je Discord of Telegram bot 24/7', en: 'Host your Discord or Telegram bot 24/7' },

  // Web Hosting Page
  'web.title': { nl: 'Web Hosting', en: 'Web Hosting' },
  'web.subtitle': { nl: 'Snelle en betrouwbare webhosting voor je website', en: 'Fast and reliable web hosting for your website' },

  // About Page
  'about.title': { nl: 'Over CloudServe', en: 'About CloudServe' },
  'about.subtitle': { nl: 'Jouw partner in game server hosting', en: 'Your partner in game server hosting' },
  'about.mission.title': { nl: 'Onze Missie', en: 'Our Mission' },
  'about.mission.text': { nl: 'Wij geloven dat iedereen toegang moet hebben tot premium game server hosting. Daarom bieden wij betrouwbare, betaalbare en gebruiksvriendelijke oplossingen.', en: 'We believe everyone should have access to premium game server hosting. That\'s why we offer reliable, affordable and user-friendly solutions.' },
  'about.why.title': { nl: 'Waarom CloudServe?', en: 'Why CloudServe?' },
  'about.why.experience': { nl: 'Jarenlange ervaring in hosting', en: 'Years of hosting experience' },
  'about.why.hardware': { nl: 'Premium hardware', en: 'Premium hardware' },
  'about.why.support': { nl: 'Nederlandse support', en: 'Dutch support' },
  'about.why.prices': { nl: 'Scherpe prijzen', en: 'Competitive prices' },

  // Contact Page
  'contact.title': { nl: 'Contact', en: 'Contact' },
  'contact.subtitle': { nl: 'Neem contact met ons op', en: 'Get in touch with us' },
  'contact.form.name': { nl: 'Naam', en: 'Name' },
  'contact.form.email': { nl: 'E-mail', en: 'Email' },
  'contact.form.subject': { nl: 'Onderwerp', en: 'Subject' },
  'contact.form.message': { nl: 'Bericht', en: 'Message' },
  'contact.form.submit': { nl: 'Verstuur', en: 'Send' },
  'contact.info.email': { nl: 'E-mail', en: 'Email' },
  'contact.info.discord': { nl: 'Discord', en: 'Discord' },
  'contact.info.hours': { nl: 'Openingstijden', en: 'Business Hours' },

  // Footer
  'footer.description': { nl: 'Premium game server hosting voor gamers, door gamers.', en: 'Premium game server hosting for gamers, by gamers.' },
  'footer.services': { nl: 'Diensten', en: 'Services' },
  'footer.company': { nl: 'Bedrijf', en: 'Company' },
  'footer.support': { nl: 'Support', en: 'Support' },
  'footer.faq': { nl: 'FAQ', en: 'FAQ' },
  'footer.knowledgebase': { nl: 'Kennisbank', en: 'Knowledge Base' },
  'footer.status': { nl: 'Server Status', en: 'Server Status' },
  'footer.rights': { nl: 'Alle rechten voorbehouden.', en: 'All rights reserved.' },

  // Pricing
  'pricing.popular': { nl: 'Populair', en: 'Popular' },
  'pricing.orderNow': { nl: 'Bestel Nu', en: 'Order Now' },
  'pricing.features': { nl: 'Features', en: 'Features' },

  // Common
  'common.learnMore': { nl: 'Meer Info', en: 'Learn More' },
  'common.getStarted': { nl: 'Aan de slag', en: 'Get Started' },
  'common.viewAll': { nl: 'Bekijk Alles', en: 'View All' },
  'common.loading': { nl: 'Laden...', en: 'Loading...' },

  // Auth
  'auth.welcomeBack': { nl: 'Welkom terug', en: 'Welcome back' },
  'auth.createAccount': { nl: 'Account aanmaken', en: 'Create account' },
  'auth.loginSubtitle': { nl: 'Log in op je CloudServe account', en: 'Log in to your CloudServe account' },
  'auth.signupSubtitle': { nl: 'Maak een nieuw account aan', en: 'Create a new account' },
  'auth.fullName': { nl: 'Volledige naam', en: 'Full name' },
  'auth.fullNamePlaceholder': { nl: 'Jan Jansen', en: 'John Doe' },
  'auth.email': { nl: 'E-mailadres', en: 'Email address' },
  'auth.emailPlaceholder': { nl: 'jouw@email.nl', en: 'your@email.com' },
  'auth.password': { nl: 'Wachtwoord', en: 'Password' },
  'auth.passwordPlaceholder': { nl: '••••••••', en: '••••••••' },
  'auth.login': { nl: 'Inloggen', en: 'Login' },
  'auth.signup': { nl: 'Registreren', en: 'Sign up' },
  'auth.noAccount': { nl: 'Nog geen account?', en: "Don't have an account?" },
  'auth.hasAccount': { nl: 'Al een account?', en: 'Already have an account?' },
  'auth.signupLink': { nl: 'Registreer nu', en: 'Sign up now' },
  'auth.loginLink': { nl: 'Log in', en: 'Log in' },
  'auth.loginSuccess': { nl: 'Succesvol ingelogd!', en: 'Successfully logged in!' },
  'auth.signupSuccess': { nl: 'Account aangemaakt!', en: 'Account created!' },
  'auth.logoutSuccess': { nl: 'Succesvol uitgelogd', en: 'Successfully logged out' },
  'auth.logout': { nl: 'Uitloggen', en: 'Logout' },
  'auth.userExists': { nl: 'Dit e-mailadres is al in gebruik', en: 'This email is already registered' },
  'auth.invalidCredentials': { nl: 'Ongeldige inloggegevens', en: 'Invalid login credentials' },

  // Dashboard
  'dashboard.title': { nl: 'Dashboard', en: 'Dashboard' },
  'dashboard.welcome': { nl: 'Welkom', en: 'Welcome' },
  'dashboard.settings': { nl: 'Instellingen', en: 'Settings' },
  'dashboard.activeServers': { nl: 'Actieve Servers', en: 'Active Servers' },
  'dashboard.pendingOrders': { nl: 'In behandeling', en: 'Pending Orders' },
  'dashboard.totalOrders': { nl: 'Totaal Bestellingen', en: 'Total Orders' },
  'dashboard.yourOrders': { nl: 'Jouw Bestellingen', en: 'Your Orders' },
  'dashboard.newOrder': { nl: 'Nieuwe Bestelling', en: 'New Order' },
  'dashboard.noOrders': { nl: 'Je hebt nog geen bestellingen', en: "You don't have any orders yet" },
  'dashboard.startNow': { nl: 'Begin Nu', en: 'Start Now' },
  'dashboard.product': { nl: 'Product', en: 'Product' },
  'dashboard.plan': { nl: 'Plan', en: 'Plan' },
  'dashboard.price': { nl: 'Prijs', en: 'Price' },
  'dashboard.status': { nl: 'Status', en: 'Status' },
  'dashboard.date': { nl: 'Datum', en: 'Date' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('nl');

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

import { Link } from 'react-router-dom';
import { Server, Mail, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 gaming-gradient-bg rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-bold text-foreground">CloudServe</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              {t('footer.description')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.services')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/game-servers" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('nav.gameServers')}
                </Link>
              </li>
              <li>
                <Link to="/vps" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('nav.vps')}
                </Link>
              </li>
              <li>
                <Link to="/bot-hosting" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('nav.botHosting')}
                </Link>
              </li>
              <li>
                <Link to="/web-hosting" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('nav.webHosting')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.company')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.support')}</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('footer.faq')}
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('footer.knowledgebase')}
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                  {t('footer.status')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CloudServe. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

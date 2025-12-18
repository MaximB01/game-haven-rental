import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, Globe, Sun, Moon, User, LogOut, Settings, Shield, MessageSquare, HelpCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
interface DynamicProduct {
  id: string;
  name: string;
  slug: string;
  page_path: string | null;
  display_type: string;
}
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dynamicProducts, setDynamicProducts] = useState<DynamicProduct[]>([]);
  const {
    language,
    setLanguage,
    t
  } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch products with own_page display type
  useEffect(() => {
    const fetchDynamicProducts = async () => {
      const {
        data
      } = await supabase.from('products').select('id, name, slug, page_path, display_type').eq('display_type', 'own_page').eq('is_active', true).order('name');
      if (data) {
        setDynamicProducts(data);
      }
    };
    fetchDynamicProducts();
  }, []);
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          checkAdminStatus(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const checkAdminStatus = async (userId: string) => {
    const {
      data: isAdmin
    } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });
    const {
      data: isModerator
    } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'moderator'
    });
    setIsAdmin(!!isAdmin || !!isModerator);
  };
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || !savedTheme && prefersDark;
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);
  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  // Build navigation links dynamically
  const getProductPath = (product: DynamicProduct) => {
    // If page_path contains {slug}, replace it with actual slug
    if (product.page_path?.includes('{slug}')) {
      return product.page_path.replace('{slug}', product.slug);
    }
    // Use page_path if it's a valid path, otherwise use /product/slug
    return product.page_path || `/product/${product.slug}`;
  };
  const navLinks = [{
    href: '/',
    label: t('nav.home')
  }, {
    href: '/game-servers',
    label: t('nav.gameServers')
  },
  // Add dynamic product pages
  ...dynamicProducts.map(product => ({
    href: getProductPath(product),
    label: product.name
  })), {
    href: '/about',
    label: t('nav.about')
  }, {
    href: '/contact',
    label: t('nav.contact')
  }];
  const isActive = (path: string) => location.pathname === path;
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t('auth.logoutSuccess'));
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return t('nav.account');
  };
  return <nav className="fixed top-0 left-0 right-0 z-50 glass-effect">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 gaming-gradient-bg rounded-lg flex items-center justify-center">
              {/* <span className="text-primary-foreground font-bold text-xl">C</span> */}
              <img alt="" className="border-0" src="/lovable-uploads/3909e484-a3d5-44a9-b88b-c8e1c747e6b2.png" />
            </div>
            <span className="text-xl font-bold text-foreground">CloudSurf Hosting </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => <Link key={link.href} to={link.href} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                {link.label}
              </Link>)}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  {language.toUpperCase()}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => setLanguage('nl')}>
                  🇳🇱 Nederlands
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')}>
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {getUserDisplayName()}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    {t('nav.dashboard')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    {t('dashboard.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/tickets')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {language === 'nl' ? 'Support Tickets' : 'Support Tickets'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/faq')}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/knowledge-base')}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    {language === 'nl' ? 'Kennisbank' : 'Knowledge Base'}
                  </DropdownMenuItem>
                  {isAdmin && <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="h-4 w-4 mr-2" />
                        {t('admin.title')}
                      </DropdownMenuItem>
                    </>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('auth.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> : <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/game-servers">
                  <Button size="sm" className="gaming-gradient-bg hover:opacity-90">
                    {t('nav.getStarted')}
                  </Button>
                </Link>
              </>}
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2 text-foreground" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && <div className="lg:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navLinks.map(link => <Link key={link.href} to={link.href} onClick={() => setIsOpen(false)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  {link.label}
                </Link>)}
              <div className="flex items-center gap-2 px-4 pt-4 border-t border-border mt-2">
                <Button variant="ghost" size="sm" onClick={toggleTheme} className="gap-2">
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {isDark ? 'Light' : 'Dark'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'nl' ? 'en' : 'nl')} className="gap-2">
                  <Globe className="h-4 w-4" />
                  {language === 'nl' ? '🇳🇱 NL' : '🇬🇧 EN'}
                </Button>
              </div>
              <div className="flex flex-col gap-2 px-4 pt-2">
                {user ? <>
                    <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" size="sm" className="justify-start w-full">
                        <User className="h-4 w-4 mr-2" />
                        {getUserDisplayName()}
                      </Button>
                    </Link>

                    <Link to="/settings" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" size="sm" className="justify-start w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        {t('dashboard.settings')}
                      </Button>
                    </Link>

                    <Link to="/tickets" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" size="sm" className="justify-start w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {language === 'nl' ? 'Support Tickets' : 'Support Tickets'}
                      </Button>
                    </Link>

                    <Link to="/faq" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" size="sm" className="justify-start w-full">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        FAQ
                      </Button>
                    </Link>

                    <Link to="/knowledge-base" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" size="sm" className="justify-start w-full">
                        <BookOpen className="h-4 w-4 mr-2" />
                        {language === 'nl' ? 'Kennisbank' : 'Knowledge Base'}
                      </Button>
                    </Link>

                    {isAdmin && <Link to="/admin" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <Shield className="h-4 w-4 mr-2" />
                          {t('admin.title')}
                        </Button>
                      </Link>}

                    <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start w-full">
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('auth.logout')}
                    </Button>
                  </> : <>
                    <Link to="/auth" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" size="sm" className="justify-start w-full">
                        <User className="h-4 w-4 mr-2" />
                        {t('nav.login')}
                      </Button>
                    </Link>
                    <Link to="/game-servers" onClick={() => setIsOpen(false)}>
                      <Button size="sm" className="gaming-gradient-bg hover:opacity-90 w-full">
                        {t('nav.getStarted')}
                      </Button>
                    </Link>
                  </>}
              </div>
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navbar;
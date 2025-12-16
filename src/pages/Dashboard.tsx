import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, LogOut, Settings, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Order {
  id: string;
  product_type: string;
  product_name: string;
  plan_name: string;
  price: number;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate('/auth');
      } else {
        setUser(session.user);
        fetchOrders(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t('auth.logoutSuccess'));
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-500';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'cancelled':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
              <p className="text-muted-foreground">{t('dashboard.welcome')}, {user?.user_metadata?.full_name || user?.email}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                {t('dashboard.settings')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth.logout')}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 gaming-gradient-bg rounded-xl flex items-center justify-center">
                  <Server className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.activeServers')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {orders.filter(o => o.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.pendingOrders')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {orders.filter(o => o.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.totalOrders')}</p>
                  <p className="text-2xl font-bold text-foreground">{orders.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="glass-effect rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">{t('dashboard.yourOrders')}</h2>
              <Button asChild className="gaming-gradient-bg hover:opacity-90">
                <a href="/game-servers">{t('dashboard.newOrder')}</a>
              </Button>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noOrders')}</p>
                <Button asChild className="mt-4 gaming-gradient-bg hover:opacity-90">
                  <a href="/game-servers">{t('dashboard.startNow')}</a>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.product')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.plan')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.price')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.status')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{order.product_name}</div>
                          <div className="text-sm text-muted-foreground">{order.product_type}</div>
                        </td>
                        <td className="py-3 px-4 text-foreground">{order.plan_name}</td>
                        <td className="py-3 px-4 text-foreground">€{order.price.toFixed(2)}/mo</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;

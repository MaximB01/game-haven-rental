import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, LogOut, Settings, Server, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import ServerDetailModal from '@/components/dashboard/ServerDetailModal';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// User-facing order data (without internal infrastructure IDs)
interface Order {
  id: string;
  product_type: string;
  product_name: string;
  plan_name: string;
  price: number;
  status: string;
  display_id: string;
  created_at: string;
}

// Full order data for server management (only fetched when needed)
interface OrderWithServerDetails extends Order {
  pterodactyl_server_id?: number;
  pterodactyl_identifier?: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithServerDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
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
      // Use user_orders view to exclude internal infrastructure IDs from listing
      const { data, error } = await supabase
        .from('user_orders')
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

  // Fetch full order details including server identifiers when user opens details modal
  const fetchOrderDetails = async (orderId: string) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setSelectedOrder(data);
      setModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoadingDetails(false);
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
      case 'provisioning':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'cancelled':
      case 'failed':
      case 'suspended':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    return t(`order.status.${status}`) || status;
  };

  // Active orders (not cancelled, failed, suspended, or deleted)
  const activeOrders = orders.filter(o => !['cancelled', 'failed', 'suspended', 'deleted'].includes(o.status));
  // Archived orders (cancelled, failed, suspended, or deleted)
  const archivedOrders = orders.filter(o => ['cancelled', 'failed', 'suspended', 'deleted'].includes(o.status));

  const renderOrdersTable = (ordersList: Order[], emptyMessage: string) => (
    ordersList.length === 0 ? (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.serverId')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.product')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.plan')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.price')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.status')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.date')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('dashboard.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {ordersList.map((order) => (
              <tr 
                key={order.id} 
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => {
                  fetchOrderDetails(order.id);
                }}
              >
                <td className="py-3 px-4">
                  <span className="font-mono text-sm text-primary">{order.display_id}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-foreground">{order.product_name}</div>
                  <div className="text-sm text-muted-foreground">{order.product_type}</div>
                </td>
                <td className="py-3 px-4 text-foreground">{order.plan_name}</td>
                <td className="py-3 px-4 text-foreground">€{order.price.toFixed(2)}/mo</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingDetails}
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchOrderDetails(order.id);
                    }}
                  >
                    {t('dashboard.viewDetails')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

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
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                    {orders.filter(o => o.status === 'pending' || o.status === 'provisioning').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Archive className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.archivedServers')}</p>
                  <p className="text-2xl font-bold text-foreground">{archivedOrders.length}</p>
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

          {/* Orders with Tabs */}
          <div className="glass-effect rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">{t('dashboard.yourOrders')}</h2>
              <Button asChild className="gaming-gradient-bg hover:opacity-90">
                <a href="/game-servers">{t('dashboard.newOrder')}</a>
              </Button>
            </div>

            <Tabs defaultValue="active" className="space-y-4">
              <TabsList>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  {t('dashboard.activeTab')} ({activeOrders.length})
                </TabsTrigger>
                <TabsTrigger value="archive" className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  {t('dashboard.archiveTab')} ({archivedOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {renderOrdersTable(activeOrders, t('dashboard.noActiveOrders'))}
              </TabsContent>

              <TabsContent value="archive">
                {renderOrdersTable(archivedOrders, t('dashboard.noArchivedOrders'))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <ServerDetailModal
        order={selectedOrder}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onOrderUpdated={() => {
          if (user) fetchOrders(user.id);
        }}
      />
    </Layout>
  );
};

export default Dashboard;

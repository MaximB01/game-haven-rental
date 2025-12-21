import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, ShoppingCart, Shield, Loader2, Search, UserPlus, Archive, Package, Plus, Pencil, Trash2, Eye, ChevronDown, ChevronUp, HelpCircle, BookOpen, RefreshCw, ExternalLink, Settings, Mail, CreditCard } from 'lucide-react';
import ProductImageUpload from '@/components/admin/ProductImageUpload';
import FAQManagement from '@/components/admin/FAQManagement';
import KnowledgeBaseManagement from '@/components/admin/KnowledgeBaseManagement';
import ConfigManagement from '@/components/admin/ConfigManagement';
import EmailTemplateManagement from '@/components/admin/EmailTemplateManagement';
import PaymentManagement from '@/components/admin/PaymentManagement';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string;
  is_active: boolean;
  is_popular: boolean;
  temporarily_unavailable: boolean;
  min_ram: number;
  min_cpu: number;
  min_disk: number;
  default_port: number | null;
  egg_id: number | null;
  nest_id: number | null;
  docker_image: string | null;
  startup_command: string | null;
  display_type: 'own_page' | 'grouped';
  page_path: string | null;
  created_at: string;
}

interface ProductPlan {
  id: string;
  product_id: string;
  name: string;
  price: number;
  ram: number;
  cpu: number;
  disk: number;
  databases: number;
  backups: number;
  is_active: boolean;
}

interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  egg_id: number | null;
  nest_id: number | null;
  docker_image: string | null;
  startup_command: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}


const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productPlans, setProductPlans] = useState<ProductPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingPlan, setEditingPlan] = useState<ProductPlan | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  
  const [syncingPterodactyl, setSyncingPterodactyl] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    category: 'game',
    is_active: true,
    is_popular: false,
    temporarily_unavailable: false,
    min_ram: 2048,
    min_cpu: 100,
    min_disk: 10240,
    default_port: 25565,
    egg_id: 0,
    nest_id: 0,
    docker_image: '',
    startup_command: '',
    display_type: 'grouped' as 'own_page' | 'grouped',
    page_path: '',
  });

  // Plan form state
  const [planForm, setPlanForm] = useState({
    product_id: '',
    name: '',
    price: 0,
    ram: 2048,
    cpu: 100,
    disk: 10240,
    databases: 1,
    backups: 1,
    is_active: true,
  });

  // Variant form state
  const [variantForm, setVariantForm] = useState({
    product_id: '',
    name: '',
    description: '',
    egg_id: 0,
    nest_id: 0,
    docker_image: '',
    startup_command: '',
    is_default: false,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    

    // Check for admin OR moderator role
    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    const { data: hasModeratorRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'moderator'
    });

    if (!hasAdminRole && !hasModeratorRole) {
      toast({
        title: t('admin.accessDenied'),
        description: t('admin.noPermission'),
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    await Promise.all([fetchUsers(), fetchOrders(), fetchUserRoles(), fetchProducts(), fetchProductPlans(), fetchProductVariants()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
  };

  const handleSyncPterodactyl = async () => {
    setSyncingPterodactyl(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-pterodactyl-servers');
      
      if (error) {
        toast({
          title: language === 'nl' ? 'Fout bij synchroniseren' : 'Sync Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        toast({
          title: language === 'nl' ? 'Synchronisatie voltooid' : 'Sync Complete',
          description: data.message,
        });
        await fetchOrders();
      } else {
        toast({
          title: language === 'nl' ? 'Fout' : 'Error',
          description: data?.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSyncingPterodactyl(false);
    }
  };

  const fetchUserRoles = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('*');
    
    if (data) setUserRoles(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data as Product[]);
  };

  const fetchProductPlans = async () => {
    const { data } = await supabase
      .from('product_plans')
      .select('*')
      .order('price', { ascending: true });
    
    if (data) setProductPlans(data as ProductPlan[]);
  };

  const fetchProductVariants = async () => {
    const { data } = await supabase
      .from('product_variants')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (data) setProductVariants(data as ProductVariant[]);
  };


  const getUserRole = (userId: string) => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', selectedUser.user_id);

    if (selectedRole !== 'user') {
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: selectedUser.user_id,
          role: selectedRole as 'admin' | 'moderator' | 'user'
        }]);

      if (error) {
        toast({
          title: t('admin.error'),
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
    }

    toast({
      title: t('admin.success'),
      description: t('admin.roleUpdated'),
    });
    
    setRoleDialogOpen(false);
    fetchUserRoles();
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      // For suspend/unsuspend, call the Pterodactyl API via edge function
      if (status === 'suspended' || status === 'active') {
        const order = orders.find(o => o.id === orderId);
        
        // Only call Pterodactyl if the server has a pterodactyl_server_id
        if (order?.pterodactyl_server_id) {
          const action = status === 'suspended' ? 'suspend' : 'unsuspend';
          const { data, error: fnError } = await supabase.functions.invoke('suspend-pterodactyl-server', {
            body: { orderId, action }
          });

          if (fnError) throw fnError;
          if (!data?.success) throw new Error(data?.error || `Failed to ${action} server`);

          toast({
            title: t('admin.success'),
            description: t('admin.orderUpdated'),
          });
          fetchOrders();
          return;
        }
      }

      // Fallback: just update database status (for orders without pterodactyl_server_id or other statuses)
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) {
        toast({
          title: t('admin.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('admin.success'),
          description: t('admin.orderUpdated'),
        });
        fetchOrders();
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: t('admin.error'),
        description: error.message || 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProduct = async () => {
    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productForm)
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([productForm]);

      if (error) {
        toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
        return;
      }
    }

    toast({ title: t('admin.success'), description: t('admin.productSaved') });
    setProductDialogOpen(false);
    resetProductForm();
    fetchProducts();
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.success'), description: t('admin.productDeleted') });
      fetchProducts();
    }
  };

  const handleSavePlan = async () => {
    if (editingPlan) {
      const { error } = await supabase
        .from('product_plans')
        .update(planForm)
        .eq('id', editingPlan.id);

      if (error) {
        toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('product_plans')
        .insert([planForm]);

      if (error) {
        toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
        return;
      }
    }

    toast({ title: t('admin.success'), description: t('admin.planSaved') });
    setPlanDialogOpen(false);
    resetPlanForm();
    fetchProductPlans();
  };

  const handleDeletePlan = async (id: string) => {
    const { error } = await supabase
      .from('product_plans')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.success'), description: t('admin.planDeleted') });
      fetchProductPlans();
    }
  };

  const handleSaveVariant = async () => {
    if (editingVariant) {
      const { error } = await supabase
        .from('product_variants')
        .update(variantForm)
        .eq('id', editingVariant.id);

      if (error) {
        toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('product_variants')
        .insert([variantForm]);

      if (error) {
        toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
        return;
      }
    }

    toast({ title: t('admin.success'), description: 'Variant opgeslagen' });
    setVariantDialogOpen(false);
    resetVariantForm();
    fetchProductVariants();
  };

  const handleDeleteVariant = async (id: string) => {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: t('admin.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.success'), description: 'Variant verwijderd' });
      fetchProductVariants();
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      category: 'game',
      is_active: true,
      is_popular: false,
      temporarily_unavailable: false,
      min_ram: 2048,
      min_cpu: 100,
      min_disk: 10240,
      default_port: 25565,
      egg_id: 0,
      nest_id: 0,
      docker_image: '',
      startup_command: '',
      display_type: 'grouped',
      page_path: '',
    });
  };

  const resetPlanForm = () => {
    setEditingPlan(null);
    setPlanForm({
      product_id: '',
      name: '',
      price: 0,
      ram: 2048,
      cpu: 100,
      disk: 10240,
      databases: 1,
      backups: 1,
      is_active: true,
    });
  };

  const resetVariantForm = () => {
    setEditingVariant(null);
    setVariantForm({
      product_id: '',
      name: '',
      description: '',
      egg_id: 0,
      nest_id: 0,
      docker_image: '',
      startup_command: '',
      is_default: false,
      is_active: true,
      sort_order: 0,
    });
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      image_url: product.image_url || '',
      category: product.category,
      is_active: product.is_active,
      is_popular: product.is_popular || false,
      temporarily_unavailable: product.temporarily_unavailable || false,
      min_ram: product.min_ram,
      min_cpu: product.min_cpu,
      min_disk: product.min_disk,
      default_port: product.default_port || 25565,
      egg_id: product.egg_id || 0,
      nest_id: product.nest_id || 0,
      docker_image: product.docker_image || '',
      startup_command: product.startup_command || '',
      display_type: product.display_type || 'grouped',
      page_path: product.page_path || '',
    });
    setProductDialogOpen(true);
  };

  const openEditPlan = (plan: ProductPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      product_id: plan.product_id,
      name: plan.name,
      price: plan.price,
      ram: plan.ram,
      cpu: plan.cpu,
      disk: plan.disk,
      databases: plan.databases,
      backups: plan.backups,
      is_active: plan.is_active,
    });
    setPlanDialogOpen(true);
  };

  const openAddPlan = (productId: string) => {
    resetPlanForm();
    setPlanForm(prev => ({ ...prev, product_id: productId }));
    setPlanDialogOpen(true);
  };

  const openEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setVariantForm({
      product_id: variant.product_id,
      name: variant.name,
      description: variant.description || '',
      egg_id: variant.egg_id || 0,
      nest_id: variant.nest_id || 0,
      docker_image: variant.docker_image || '',
      startup_command: variant.startup_command || '',
      is_default: variant.is_default,
      is_active: variant.is_active,
      sort_order: variant.sort_order,
    });
    setVariantDialogOpen(true);
  };

  const openAddVariant = (productId: string) => {
    resetVariantForm();
    setVariantForm(prev => ({ ...prev, product_id: productId }));
    setVariantDialogOpen(true);
  };

  const toggleProductExpanded = (productId: string) => {
    setExpandedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(order =>
    order.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
      failed: 'destructive',
      suspended: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      admin: 'destructive',
      moderator: 'default',
      user: 'secondary',
    };
    return <Badge variant={variants[role] || 'secondary'}>{role}</Badge>;
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user?.full_name || '-';
  };


  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalOrders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.activeOrders')}</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.filter(o => o.status === 'active').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalProducts')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('admin.users')}
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {t('admin.orders')}
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('admin.products')}
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="knowledge-base" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {language === 'nl' ? 'Kennisbank' : 'Knowledge Base'}
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {language === 'nl' ? 'Configuratie' : 'Configuration'}
            </TabsTrigger>
            <TabsTrigger value="email-templates" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {language === 'nl' ? 'E-mail Templates' : 'Email Templates'}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {language === 'nl' ? 'Betalingen' : 'Payments'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.userManagement')}</CardTitle>
                <CardDescription>{t('admin.userDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.name')}</TableHead>
                      <TableHead>{t('admin.email')}</TableHead>
                      <TableHead>{t('admin.phone')}</TableHead>
                      <TableHead>{t('admin.role')}</TableHead>
                      <TableHead>{t('admin.createdAt')}</TableHead>
                      <TableHead>{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>{getRoleBadge(getUserRole(user.user_id))}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setUserDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setSelectedRole(getUserRole(user.user_id));
                                setRoleDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>{t('admin.orderManagement')}</CardTitle>
                  <CardDescription>{t('admin.orderDescriptionActive')}</CardDescription>
                </div>
                <Button 
                  onClick={handleSyncPterodactyl} 
                  disabled={syncingPterodactyl}
                  variant="outline"
                >
                  {syncingPterodactyl ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {language === 'nl' ? 'Sync Pterodactyl' : 'Sync Pterodactyl'}
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="active">
                      {language === 'nl' ? 'Actief' : 'Active'}
                      <Badge variant="outline" className="ml-2">
                        {filteredOrders.filter(o => !['cancelled', 'failed', 'suspended', 'deleted', 'archived'].includes(o.status)).length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="flex items-center gap-1">
                      <Archive className="h-4 w-4" />
                      {language === 'nl' ? 'Archief' : 'Archive'}
                      <Badge variant="outline" className="ml-1">
                        {filteredOrders.filter(o => ['cancelled', 'failed', 'suspended', 'deleted', 'archived'].includes(o.status)).length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="active">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dashboard.serverId')}</TableHead>
                          <TableHead>{t('admin.product')}</TableHead>
                          <TableHead>{t('admin.plan')}</TableHead>
                          <TableHead>{t('admin.price')}</TableHead>
                          <TableHead>{t('admin.status')}</TableHead>
                          <TableHead>{t('admin.customer')}</TableHead>
                          <TableHead>{t('admin.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.filter(o => !['cancelled', 'failed', 'suspended', 'deleted', 'archived'].includes(o.status)).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              {language === 'nl' ? 'Geen actieve bestellingen' : 'No active orders'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders.filter(o => !['cancelled', 'failed', 'suspended', 'deleted', 'archived'].includes(o.status)).map((order) => (
                            <TableRow key={order.id}>
                              <TableCell><span className="font-mono text-sm text-primary">{order.display_id}</span></TableCell>
                              <TableCell>{order.product_name}</TableCell>
                              <TableCell>{order.plan_name}</TableCell>
                              <TableCell>€{order.price.toFixed(2)}</TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{getUserName(order.user_id)}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{order.user_id.slice(0, 8)}...</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setOrderDetailOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {order.pterodactyl_server_id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                    >
                                      <a 
                                        href={`https://panel.smpmetdeboys.be/admin/servers/view/${order.pterodactyl_server_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  <Select
                                    value={order.status}
                                    onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="provisioning">Provisioning</SelectItem>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="suspended">Suspended</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                      <SelectItem value="failed">Failed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  
                  <TabsContent value="archived">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dashboard.serverId')}</TableHead>
                          <TableHead>{t('admin.product')}</TableHead>
                          <TableHead>{t('admin.plan')}</TableHead>
                          <TableHead>{t('admin.price')}</TableHead>
                          <TableHead>{t('admin.status')}</TableHead>
                          <TableHead>{t('admin.customer')}</TableHead>
                          <TableHead>{t('admin.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.filter(o => ['cancelled', 'failed', 'suspended', 'deleted', 'archived'].includes(o.status)).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              {t('admin.noArchivedOrders')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders.filter(o => ['cancelled', 'failed', 'suspended', 'deleted', 'archived'].includes(o.status)).map((order) => (
                            <TableRow key={order.id}>
                              <TableCell><span className="font-mono text-sm text-primary">{order.display_id}</span></TableCell>
                              <TableCell>{order.product_name}</TableCell>
                              <TableCell>{order.plan_name}</TableCell>
                              <TableCell>€{order.price.toFixed(2)}</TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{getUserName(order.user_id)}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{order.user_id.slice(0, 8)}...</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setOrderDetailOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Select
                                    value={order.status}
                                    onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                                    disabled={order.status === 'deleted' || order.status === 'archived'}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Reactivate</SelectItem>
                                      <SelectItem value="suspended">Suspended</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                      <SelectItem value="failed">Failed</SelectItem>
                                      <SelectItem value="deleted">Deleted</SelectItem>
                                      <SelectItem value="archived" disabled>Archived</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('admin.productManagement')}</CardTitle>
                  <CardDescription>{t('admin.productDescription')}</CardDescription>
                </div>
                <Button onClick={() => { resetProductForm(); setProductDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('admin.addProduct')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {products.map((product) => (
                  <Collapsible 
                    key={product.id} 
                    open={expandedProducts.includes(product.id)}
                    onOpenChange={() => toggleProductExpanded(product.id)}
                  >
                    <Card>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {expandedProducts.includes(product.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{product.name}</span>
                                <Badge variant={product.is_active ? 'default' : 'secondary'}>
                                  {product.is_active ? 'Actief' : 'Inactief'}
                                </Badge>
                                <Badge variant="outline">{product.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{product.slug}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditProduct(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-8">
                          {/* Plans Section */}
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-medium">{t('admin.plans')}</h4>
                              <Button variant="outline" size="sm" onClick={() => openAddPlan(product.id)}>
                                <Plus className="h-4 w-4 mr-1" />
                                {t('admin.addPlan')}
                              </Button>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t('admin.name')}</TableHead>
                                  <TableHead>{t('admin.price')}</TableHead>
                                  <TableHead>RAM</TableHead>
                                  <TableHead>CPU</TableHead>
                                  <TableHead>Disk</TableHead>
                                  <TableHead>{t('admin.status')}</TableHead>
                                  <TableHead>{t('admin.actions')}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {productPlans.filter(p => p.product_id === product.id).map((plan) => (
                                  <TableRow key={plan.id}>
                                    <TableCell>{plan.name}</TableCell>
                                    <TableCell>€{plan.price.toFixed(2)}</TableCell>
                                    <TableCell>{plan.ram} MB</TableCell>
                                    <TableCell>{plan.cpu}%</TableCell>
                                    <TableCell>{plan.disk} MB</TableCell>
                                    <TableCell>
                                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                                        {plan.is_active ? 'Actief' : 'Inactief'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openEditPlan(plan)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeletePlan(plan.id)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {productPlans.filter(p => p.product_id === product.id).length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                      {t('admin.noPlans')}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Variants Section */}
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-medium">Varianten (Server Types)</h4>
                              <Button variant="outline" size="sm" onClick={() => openAddVariant(product.id)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Variant Toevoegen
                              </Button>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t('admin.name')}</TableHead>
                                  <TableHead>Beschrijving</TableHead>
                                  <TableHead>Egg ID</TableHead>
                                  <TableHead>Standaard</TableHead>
                                  <TableHead>{t('admin.status')}</TableHead>
                                  <TableHead>{t('admin.actions')}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {productVariants.filter(v => v.product_id === product.id).map((variant) => (
                                  <TableRow key={variant.id}>
                                    <TableCell>{variant.name}</TableCell>
                                    <TableCell className="max-w-xs truncate">{variant.description || '-'}</TableCell>
                                    <TableCell>{variant.egg_id || '-'}</TableCell>
                                    <TableCell>
                                      {variant.is_default && (
                                        <Badge variant="outline">Standaard</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={variant.is_active ? 'default' : 'secondary'}>
                                        {variant.is_active ? 'Actief' : 'Inactief'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openEditVariant(variant)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteVariant(variant.id)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {productVariants.filter(v => v.product_id === product.id).length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                                      Geen varianten. Voeg varianten toe om klanten te laten kiezen (bijv. Vanilla, PaperMC, Forge).
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
                {products.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('admin.noProducts')}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ Management Tab */}
          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'nl' ? 'FAQ Beheer' : 'FAQ Management'}</CardTitle>
                <CardDescription>
                  {language === 'nl' 
                    ? 'Beheer veelgestelde vragen en antwoorden'
                    : 'Manage frequently asked questions and answers'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FAQManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Knowledge Base Management Tab */}
          <TabsContent value="knowledge-base">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'nl' ? 'Kennisbank Beheer' : 'Knowledge Base Management'}</CardTitle>
                <CardDescription>
                  {language === 'nl' 
                    ? 'Beheer handleidingen, tutorials en documentatie'
                    : 'Manage guides, tutorials and documentation'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KnowledgeBaseManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Management Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'nl' ? 'Website Configuratie' : 'Website Configuration'}</CardTitle>
                <CardDescription>
                  {language === 'nl' 
                    ? 'Beheer website instellingen, API keys, branding en meer'
                    : 'Manage website settings, API keys, branding and more'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Template Management Tab */}
          <TabsContent value="email-templates">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'nl' ? 'E-mail Templates' : 'Email Templates'}</CardTitle>
                <CardDescription>
                  {language === 'nl' 
                    ? 'Pas de HTML templates voor notificatie e-mails aan'
                    : 'Customize HTML templates for notification emails'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailTemplateManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Management Tab */}
          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>
        </Tabs>

        {/* User Detail Dialog */}
        <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('admin.userDetails')}</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('admin.name')}</Label>
                    <p className="font-medium">{selectedUser.full_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.role')}</Label>
                    <p>{getRoleBadge(getUserRole(selectedUser.user_id))}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.email')}</Label>
                    <p className="font-medium">{selectedUser.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.phone')}</Label>
                    <p className="font-medium">{selectedUser.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.address')}</Label>
                    <p className="font-medium">{selectedUser.address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.city')}</Label>
                    <p className="font-medium">{selectedUser.city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.postalCode')}</Label>
                    <p className="font-medium">{selectedUser.postal_code || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.country')}</Label>
                    <p className="font-medium">{selectedUser.country || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t('admin.userId')}</Label>
                    <p className="font-mono text-xs">{selectedUser.user_id}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t('admin.createdAt')}</Label>
                    <p className="font-medium">{new Date(selectedUser.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* User Servers Section */}
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground mb-3 block">{t('admin.userServers')}</Label>
                  {(() => {
                    const userOrders = orders.filter(order => order.user_id === selectedUser.user_id);
                    if (userOrders.length === 0) {
                      return (
                        <p className="text-muted-foreground text-sm">{t('admin.noServersFound')}</p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {userOrders.map((order) => (
                          <div 
                            key={order.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-primary">{order.display_id}</span>
                                <span className="font-medium">{order.product_name}</span>
                                {order.variant_name && (
                                  <span className="text-muted-foreground text-sm">({order.variant_name})</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {order.plan_name} • €{order.price}/mo
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(order.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                order.status === 'active' ? 'default' :
                                order.status === 'pending' ? 'secondary' :
                                order.status === 'provisioning' ? 'secondary' :
                                order.status === 'suspended' ? 'outline' :
                                'destructive'
                              }>
                                {t(`order.status.${order.status}`)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setOrderDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Detail Dialog */}
        <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('admin.orderDetails')}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Display ID prominently at top */}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <Label className="text-muted-foreground text-xs">{t('dashboard.serverId')}</Label>
                  <p className="font-mono text-lg text-primary font-bold">{selectedOrder.display_id}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('admin.product')}</Label>
                    <p className="font-medium">{selectedOrder.product_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.plan')}</Label>
                    <p className="font-medium">{selectedOrder.plan_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.price')}</Label>
                    <p className="font-medium">€{selectedOrder.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.status')}</Label>
                    <p>{getStatusBadge(selectedOrder.status)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.customer')}</Label>
                    <p className="font-medium">{getUserName(selectedOrder.user_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.userId')}</Label>
                    <p className="font-mono text-xs">{selectedOrder.user_id}</p>
                  </div>
                  {selectedOrder.pterodactyl_server_id && (
                    <div>
                      <Label className="text-muted-foreground">Pterodactyl Server ID</Label>
                      <p className="font-mono">{selectedOrder.pterodactyl_server_id}</p>
                    </div>
                  )}
                  {selectedOrder.pterodactyl_identifier && (
                    <div>
                      <Label className="text-muted-foreground">Server Identifier</Label>
                      <p className="font-mono">{selectedOrder.pterodactyl_identifier}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t('admin.orderId')}</Label>
                    <p className="font-mono text-xs">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.createdAt')}</Label>
                    <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('admin.updatedAt')}</Label>
                    <p className="font-medium">{new Date(selectedOrder.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Role Assignment Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.assignRole')}</DialogTitle>
              <DialogDescription>
                {t('admin.assignRoleDescription')} {selectedUser?.full_name || selectedUser?.user_id}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                {t('admin.cancel')}
              </Button>
              <Button onClick={handleAssignRole}>
                {t('admin.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? t('admin.editProduct') : t('admin.addProduct')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('admin.name')}</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={productForm.slug}
                  onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('admin.description')}</Label>
                <Textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <ProductImageUpload
                  value={productForm.image_url}
                  onChange={(url) => setProductForm({ ...productForm, image_url: url })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="game">Game Server</SelectItem>
                    <SelectItem value="vps">VPS</SelectItem>
                    <SelectItem value="bot">Bot Hosting</SelectItem>
                    <SelectItem value="web">Web Hosting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weergave Type</Label>
                <Select value={productForm.display_type} onValueChange={(v: 'own_page' | 'grouped') => setProductForm({ ...productForm, display_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grouped">Gegroepeerd (bijv. Game Servers)</SelectItem>
                    <SelectItem value="own_page">Eigen Pagina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {productForm.display_type === 'own_page' && (
                <div className="space-y-2">
                  <Label>Pagina Pad</Label>
                  <Input
                    value={productForm.page_path}
                    onChange={(e) => setProductForm({ ...productForm, page_path: e.target.value })}
                    placeholder="/vps, /bot-hosting, etc."
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Egg ID (Pterodactyl)</Label>
                <Input
                  type="number"
                  value={productForm.egg_id}
                  onChange={(e) => setProductForm({ ...productForm, egg_id: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nest ID (Pterodactyl)</Label>
                <Input
                  type="number"
                  value={productForm.nest_id}
                  onChange={(e) => setProductForm({ ...productForm, nest_id: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Port</Label>
                <Input
                  type="number"
                  value={productForm.default_port}
                  onChange={(e) => setProductForm({ ...productForm, default_port: parseInt(e.target.value) || 25565 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Docker Image</Label>
                <Input
                  value={productForm.docker_image}
                  onChange={(e) => setProductForm({ ...productForm, docker_image: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Startup Command</Label>
                <Textarea
                  value={productForm.startup_command}
                  onChange={(e) => setProductForm({ ...productForm, startup_command: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={productForm.is_active}
                  onCheckedChange={(v) => setProductForm({ ...productForm, is_active: v })}
                />
                <Label>{t('admin.active')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={productForm.temporarily_unavailable}
                  onCheckedChange={(v) => setProductForm({ ...productForm, temporarily_unavailable: v })}
                />
                <Label>Tijdelijk niet beschikbaar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={productForm.is_popular}
                  onCheckedChange={(v) => setProductForm({ ...productForm, is_popular: v })}
                />
                <Label>{language === 'nl' ? 'Populair' : 'Popular'}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProductDialogOpen(false)}>{t('admin.cancel')}</Button>
              <Button onClick={handleSaveProduct}>{t('admin.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Plan Dialog */}
        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlan ? t('admin.editPlan') : t('admin.addPlan')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('admin.name')}</Label>
                <Input
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.price')} (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>RAM (MB)</Label>
                <Input
                  type="number"
                  value={planForm.ram}
                  onChange={(e) => setPlanForm({ ...planForm, ram: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>CPU (%)</Label>
                <Input
                  type="number"
                  value={planForm.cpu}
                  onChange={(e) => setPlanForm({ ...planForm, cpu: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Disk (MB)</Label>
                <Input
                  type="number"
                  value={planForm.disk}
                  onChange={(e) => setPlanForm({ ...planForm, disk: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Databases</Label>
                <Input
                  type="number"
                  value={planForm.databases}
                  onChange={(e) => setPlanForm({ ...planForm, databases: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Backups</Label>
                <Input
                  type="number"
                  value={planForm.backups}
                  onChange={(e) => setPlanForm({ ...planForm, backups: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={planForm.is_active}
                  onCheckedChange={(v) => setPlanForm({ ...planForm, is_active: v })}
                />
                <Label>{t('admin.active')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>{t('admin.cancel')}</Button>
              <Button onClick={handleSavePlan}>{t('admin.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Variant Dialog */}
        <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingVariant ? 'Variant Bewerken' : 'Variant Toevoegen'}</DialogTitle>
              <DialogDescription>
                Varianten bepalen welke server type de klant kan kiezen (bijv. Vanilla, PaperMC, Forge).
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('admin.name')}</Label>
                <Input
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  placeholder="bijv. Vanilla, PaperMC, Forge"
                />
              </div>
              <div className="space-y-2">
                <Label>Volgorde</Label>
                <Input
                  type="number"
                  value={variantForm.sort_order}
                  onChange={(e) => setVariantForm({ ...variantForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Beschrijving</Label>
                <Textarea
                  value={variantForm.description}
                  onChange={(e) => setVariantForm({ ...variantForm, description: e.target.value })}
                  placeholder="Korte beschrijving van deze variant"
                />
              </div>
              <div className="space-y-2">
                <Label>Egg ID (Pterodactyl)</Label>
                <Input
                  type="number"
                  value={variantForm.egg_id}
                  onChange={(e) => setVariantForm({ ...variantForm, egg_id: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nest ID (Pterodactyl)</Label>
                <Input
                  type="number"
                  value={variantForm.nest_id}
                  onChange={(e) => setVariantForm({ ...variantForm, nest_id: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Docker Image</Label>
                <Input
                  value={variantForm.docker_image}
                  onChange={(e) => setVariantForm({ ...variantForm, docker_image: e.target.value })}
                  placeholder="bijv. ghcr.io/pterodactyl/yolks:java_17"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Startup Command</Label>
                <Textarea
                  value={variantForm.startup_command}
                  onChange={(e) => setVariantForm({ ...variantForm, startup_command: e.target.value })}
                  placeholder="Server startup command"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={variantForm.is_default}
                  onCheckedChange={(v) => setVariantForm({ ...variantForm, is_default: v })}
                />
                <Label>Standaard variant</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={variantForm.is_active}
                  onCheckedChange={(v) => setVariantForm({ ...variantForm, is_active: v })}
                />
                <Label>{t('admin.active')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>{t('admin.cancel')}</Button>
              <Button onClick={handleSaveVariant}>{t('admin.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Admin;
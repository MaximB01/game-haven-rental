import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, ShoppingCart, Shield, Loader2, Search, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('user');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user is admin using the has_role function
    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      toast({
        title: t('admin.accessDenied'),
        description: t('admin.noPermission'),
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    await Promise.all([fetchUsers(), fetchOrders(), fetchUserRoles()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
  };

  const fetchUserRoles = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*');
    
    if (data) setUserRoles(data);
  };

  const getUserRole = (userId: string) => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    // First remove existing role
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', selectedUser.user_id);

    // Add new role if not 'user' (default)
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
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                      <TableHead>{t('admin.userId')}</TableHead>
                      <TableHead>{t('admin.role')}</TableHead>
                      <TableHead>{t('admin.createdAt')}</TableHead>
                      <TableHead>{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{user.user_id.slice(0, 8)}...</TableCell>
                        <TableCell>{getRoleBadge(getUserRole(user.user_id))}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedRole(getUserRole(user.user_id));
                              setRoleDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            {t('admin.manageRole')}
                          </Button>
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
              <CardHeader>
                <CardTitle>{t('admin.orderManagement')}</CardTitle>
                <CardDescription>{t('admin.orderDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.product')}</TableHead>
                      <TableHead>{t('admin.plan')}</TableHead>
                      <TableHead>{t('admin.price')}</TableHead>
                      <TableHead>{t('admin.status')}</TableHead>
                      <TableHead>{t('admin.userId')}</TableHead>
                      <TableHead>{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>{order.plan_name}</TableCell>
                        <TableCell>€{order.price.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="font-mono text-xs">{order.user_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
      </div>
    </Layout>
  );
};

export default Admin;

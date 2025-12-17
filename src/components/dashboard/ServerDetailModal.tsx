import { ExternalLink, XCircle, Server, Calendar, CreditCard, Package, Loader2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import ServerStatus from './ServerStatus';

const PTERODACTYL_PANEL_URL = 'https://panel.smpmetdeboys.be';

interface Order {
  id: string;
  product_type: string;
  product_name: string;
  plan_name: string;
  price: number;
  status: string;
  created_at: string;
  pterodactyl_server_id?: number;
  pterodactyl_identifier?: string;
}

interface ServerDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated: () => void;
}

const ServerDetailModal = ({ order, open, onOpenChange, onOrderUpdated }: ServerDetailModalProps) => {
  const { t } = useLanguage();
  const [suspending, setSuspending] = useState(false);

  if (!order) return null;

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

  const handleSuspendServer = async () => {
    setSuspending(true);
    try {
      // Check if server has a Pterodactyl ID
      if (order.pterodactyl_server_id) {
        // Call the suspend edge function
        const { data, error } = await supabase.functions.invoke('suspend-pterodactyl-server', {
          body: {
            orderId: order.id,
            action: 'suspend'
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to suspend server');
      } else {
        // No Pterodactyl ID, just update status locally
        const { error } = await supabase
          .from('orders')
          .update({ status: 'suspended' })
          .eq('id', order.id);

        if (error) throw error;
      }

      toast.success(t('dashboard.serverSuspended'));
      onOrderUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error suspending server:', error);
      toast.error(t('dashboard.suspendError'));
    } finally {
      setSuspending(false);
    }
  };

  const isGameServer = order.product_type === 'game_server' || order.product_type === 'Game Server';
  const isActive = order.status === 'active';
  const canSuspend = order.status === 'active';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {order.product_name}
          </DialogTitle>
          <DialogDescription>
            {order.plan_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              {t('serverStatus.info')}
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2" disabled={!order.pterodactyl_identifier}>
              <Activity className="h-4 w-4" />
              {t('serverStatus.status')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="space-y-4 pt-4">
            {/* Server Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('dashboard.product')}:</span>
                <span className="text-foreground font-medium">{order.product_type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('dashboard.price')}:</span>
                <span className="text-foreground font-medium">€{order.price.toFixed(2)}/mo</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('dashboard.date')}:</span>
                <span className="text-foreground font-medium">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t('dashboard.status')}:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {t(`order.status.${order.status}`) || order.status}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t('dashboard.actions')}</h4>
              
              {isGameServer && isActive && (
                <Button
                  className="w-full gaming-gradient-bg hover:opacity-90"
                  onClick={() => window.open(PTERODACTYL_PANEL_URL, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('dashboard.openServerPanel')}
                </Button>
              )}

              {canSuspend && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('dashboard.suspendServer')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dashboard.suspendConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('dashboard.suspendConfirmDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSuspendServer}
                        disabled={suspending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {suspending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('common.loading')}
                          </>
                        ) : (
                          t('dashboard.confirmSuspend')
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {order.status === 'failed' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = '/contact'}
                >
                  {t('dashboard.contactSupport')}
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="status" className="pt-4">
            <ServerStatus identifier={order.pterodactyl_identifier || null} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ServerDetailModal;

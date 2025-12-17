import { ExternalLink, XCircle, Server, Calendar, CreditCard, Package } from 'lucide-react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const PTERODACTYL_PANEL_URL = 'https://panel.smpmetdeboys.be';

interface Order {
  id: string;
  product_type: string;
  product_name: string;
  plan_name: string;
  price: number;
  status: string;
  created_at: string;
}

interface ServerDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated: () => void;
}

const ServerDetailModal = ({ order, open, onOpenChange, onOrderUpdated }: ServerDetailModalProps) => {
  const { t } = useLanguage();
  const [cancelling, setCancelling] = useState(false);

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
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleCancelServer = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      if (error) throw error;

      toast.success(t('dashboard.serverCancelled'));
      onOrderUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error cancelling server:', error);
      toast.error(t('dashboard.cancelError'));
    } finally {
      setCancelling(false);
    }
  };

  const isGameServer = order.product_type === 'Game Server';
  const isActive = order.status === 'active';
  const canCancel = order.status !== 'cancelled' && order.status !== 'failed';

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

        <div className="space-y-4 py-4">
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

            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('dashboard.cancelServer')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('dashboard.cancelConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dashboard.cancelConfirmDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelServer}
                      disabled={cancelling}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelling ? t('common.loading') : t('dashboard.confirmCancel')}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerDetailModal;

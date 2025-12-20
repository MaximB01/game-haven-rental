import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface TicketPayload {
  id: string;
  display_id: string | null;
  subject: string;
  user_id: string;
  status: string;
  assigned_to: string | null;
}

export const useTicketNotifications = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isStaff, setIsStaff] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkStaffAndSubscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Check if user is staff (admin or moderator)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasStaffRole = roles?.some(r => r.role === 'admin' || r.role === 'moderator') || false;
      setIsStaff(hasStaffRole);

      if (!hasStaffRole) {
        console.log('User is not staff, skipping ticket notifications');
        return;
      }

      console.log('Setting up ticket realtime notifications for staff user');

      // Subscribe to new tickets
      const ticketChannel = supabase
        .channel('staff-ticket-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tickets',
          },
          (payload) => {
            console.log('New ticket created:', payload);
            const newTicket = payload.new as TicketPayload;
            
            // Show toast notification
            toast({
              title: language === 'nl' ? 'Nieuw ticket' : 'New ticket',
              description: `${newTicket.display_id || 'Ticket'}: ${newTicket.subject}`,
              duration: 10000,
            });

            // Play notification sound (optional)
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {
                // Ignore audio play errors (e.g., if file doesn't exist)
              });
            } catch (e) {
              // Ignore audio errors
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tickets',
          },
          async (payload) => {
            const updatedTicket = payload.new as TicketPayload;
            const oldTicket = payload.old as Partial<TicketPayload>;
            
            // Check if status changed to awaiting_reply and ticket is assigned to current user
            if (
              updatedTicket.status === 'awaiting_reply' && 
              oldTicket.status !== 'awaiting_reply' &&
              updatedTicket.assigned_to === user.id
            ) {
              console.log('Assigned ticket received reply, sending email notification');
              
              // Show toast
              toast({
                title: language === 'nl' ? 'Reactie ontvangen' : 'Reply received',
                description: `${updatedTicket.display_id || 'Ticket'}: ${updatedTicket.subject}`,
                duration: 10000,
              });

              // Call edge function to send email
              try {
                const { error } = await supabase.functions.invoke('send-ticket-notification', {
                  body: {
                    type: 'ticket_reply',
                    ticketId: updatedTicket.id,
                    ticketSubject: updatedTicket.subject,
                    ticketDisplayId: updatedTicket.display_id,
                    assignedToUserId: updatedTicket.assigned_to,
                  },
                });

                if (error) {
                  console.error('Error sending email notification:', error);
                }
              } catch (e) {
                console.error('Error invoking notification function:', e);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('Ticket notification subscription status:', status);
        });

      return () => {
        console.log('Cleaning up ticket notification subscription');
        supabase.removeChannel(ticketChannel);
      };
    };

    checkStaffAndSubscribe();
  }, [toast, language]);

  return { isStaff, currentUserId };
};

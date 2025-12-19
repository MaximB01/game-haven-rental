import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Plus, MessageSquare, Clock, ArrowLeft, Send, Archive, ArchiveRestore, UserCircle, MoreVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Ticket {
  id: string;
  display_id: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'awaiting_reply' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  is_archived: boolean;
}

interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff: boolean;
  created_at: string;
}

interface StaffMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const Tickets = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'general',
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Check if user is admin or moderator
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const hasStaffRole = roles?.some(r => r.role === 'admin' || r.role === 'moderator') || false;
    setIsStaff(hasStaffRole);
    
    if (hasStaffRole) {
      await fetchStaffMembers();
    }
    
    await fetchTickets();
    setLoading(false);
  };

  const fetchStaffMembers = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'moderator']);
    
    if (error || !data) return;
    
    const userIds = data.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    
    setStaffMembers(profiles || []);
  };

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return;
    }

    setTickets(data as Ticket[]);
  };

  const fetchReplies = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      return;
    }

    setReplies(data as TicketReply[]);
  };

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: language === 'nl' ? 'Vul alle velden in' : 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setCreatingTicket(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('tickets')
      .insert({
        user_id: user.id,
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        category: newTicket.category,
      });

    if (error) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: language === 'nl' ? 'Ticket aangemaakt' : 'Ticket created',
        description: language === 'nl' ? 'Ons team zal zo snel mogelijk reageren.' : 'Our team will respond as soon as possible.',
      });
      setCreateDialogOpen(false);
      setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' });
      await fetchTickets();
    }
    setCreatingTicket(false);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !newReply.trim()) return;

    setSendingReply(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('ticket_replies')
      .insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: newReply.trim(),
        is_staff: isStaff,
      });

    if (error) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNewReply('');
      await fetchReplies(selectedTicket.id);
      // Update ticket status based on who is replying
      if (isStaff && selectedTicket.status === 'awaiting_reply') {
        await handleUpdateStatus(selectedTicket.id, 'in_progress');
      } else if (!isStaff && selectedTicket.status === 'open') {
        await handleUpdateStatus(selectedTicket.id, 'awaiting_reply');
      }
    }
    setSendingReply(false);
  };

  const handleUpdateStatus = async (ticketId: string, status: Ticket['status']) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId);

    if (error) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: language === 'nl' ? 'Status bijgewerkt' : 'Status updated',
      });
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status } : null);
      }
    }
  };

  const handleUpdatePriority = async (ticketId: string, priority: Ticket['priority']) => {
    const { error } = await supabase
      .from('tickets')
      .update({ priority })
      .eq('id', ticketId);

    if (error) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: language === 'nl' ? 'Prioriteit bijgewerkt' : 'Priority updated',
      });
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, priority } : null);
      }
    }
  };

  const handleAssignTicket = async (ticketId: string, assignedTo: string | null) => {
    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: assignedTo })
      .eq('id', ticketId);

    if (error) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: language === 'nl' ? 'Ticket toegewezen' : 'Ticket assigned',
      });
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, assigned_to: assignedTo } : null);
      }
    }
  };

  const handleArchiveTicket = async (ticketId: string, archive: boolean) => {
    const updateData: { is_archived: boolean; status?: 'closed' } = { is_archived: archive };
    if (archive) {
      updateData.status = 'closed';
    }
    
    const { error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: archive 
          ? (language === 'nl' ? 'Ticket gearchiveerd' : 'Ticket archived')
          : (language === 'nl' ? 'Ticket hersteld' : 'Ticket restored'),
      });
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'info'> = {
      open: 'default',
      in_progress: 'warning',
      awaiting_reply: 'info',
      closed: 'destructive',
    };
    const labels: Record<string, string> = {
      open: language === 'nl' ? 'Open' : 'Open',
      in_progress: language === 'nl' ? 'In behandeling' : 'In Progress',
      awaiting_reply: language === 'nl' ? 'Wacht op reactie' : 'Awaiting Reply',
      closed: language === 'nl' ? 'Gesloten' : 'Closed',
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'outline',
      medium: 'secondary',
      high: 'default',
      urgent: 'destructive',
    };
    const labels: Record<string, string> = {
      low: language === 'nl' ? 'Laag' : 'Low',
      medium: language === 'nl' ? 'Normaal' : 'Medium',
      high: language === 'nl' ? 'Hoog' : 'High',
      urgent: language === 'nl' ? 'Urgent' : 'Urgent',
    };
    return <Badge variant={variants[priority] || 'outline'}>{labels[priority] || priority}</Badge>;
  };

  const getStaffName = (userId: string | null) => {
    if (!userId) return null;
    const staff = staffMembers.find(s => s.user_id === userId);
    return staff?.full_name || staff?.email || userId;
  };

  const filteredTickets = tickets.filter(t => {
    const matchesTab = activeTab === 'archived' ? t.is_archived : !t.is_archived;
    if (!matchesTab) return false;
    
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      t.display_id?.toLowerCase().includes(query) ||
      t.subject.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {language === 'nl' ? 'Support Tickets' : 'Support Tickets'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'nl' ? 'Heb je hulp nodig? Open een ticket en we helpen je verder.' : 'Need help? Open a ticket and we\'ll assist you.'}
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'nl' ? 'Nieuw Ticket' : 'New Ticket'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="py-3 space-y-3">
                <Input
                  placeholder={language === 'nl' ? 'Zoek op ticket ID of onderwerp...' : 'Search by ticket ID or subject...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                />
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="active" className="flex-1">
                      {language === 'nl' ? 'Actief' : 'Active'}
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="flex-1">
                      <Archive className="h-4 w-4 mr-1" />
                      {language === 'nl' ? 'Archief' : 'Archived'}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                {filteredTickets.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{activeTab === 'archived' 
                      ? (language === 'nl' ? 'Geen gearchiveerde tickets' : 'No archived tickets')
                      : (language === 'nl' ? 'Nog geen tickets' : 'No tickets yet')
                    }</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                          selectedTicket?.id === ticket.id ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {ticket.display_id && (
                                <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                  {ticket.display_id}
                                </span>
                              )}
                              <p className="font-medium text-foreground truncate">{ticket.subject}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {getStatusBadge(ticket.status)}
                              {getPriorityBadge(ticket.priority)}
                            </div>
                            {ticket.assigned_to && isStaff && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <UserCircle className="h-3 w-3" />
                                {getStaffName(ticket.assigned_to)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(ticket.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ticket Detail / Chat */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mb-2 -ml-2 lg:hidden"
                        onClick={() => setSelectedTicket(null)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        {language === 'nl' ? 'Terug' : 'Back'}
                      </Button>
                      <div className="flex items-center gap-2 mb-1">
                        {selectedTicket.display_id && (
                          <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {selectedTicket.display_id}
                          </span>
                        )}
                      </div>
                      <CardTitle>{selectedTicket.subject}</CardTitle>
                      <CardDescription className="mt-2">
                        {selectedTicket.description}
                      </CardDescription>
                      {selectedTicket.assigned_to && isStaff && (
                        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                          <UserCircle className="h-4 w-4" />
                          {language === 'nl' ? 'Toegewezen aan:' : 'Assigned to:'} {getStaffName(selectedTicket.assigned_to)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                      
                      {/* Staff Actions */}
                      {isStaff && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                              {language === 'nl' ? 'Ticket Acties' : 'Ticket Actions'}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* Status submenu */}
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                {language === 'nl' ? 'Status wijzigen' : 'Change Status'}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(selectedTicket.id, 'open')}>
                                  {language === 'nl' ? 'Open' : 'Open'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(selectedTicket.id, 'in_progress')}>
                                  {language === 'nl' ? 'In behandeling' : 'In Progress'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(selectedTicket.id, 'awaiting_reply')}>
                                  {language === 'nl' ? 'Wacht op reactie' : 'Awaiting Reply'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}>
                                  {language === 'nl' ? 'Gesloten' : 'Closed'}
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            
                            {/* Priority submenu */}
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                {language === 'nl' ? 'Prioriteit wijzigen' : 'Change Priority'}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleUpdatePriority(selectedTicket.id, 'low')}>
                                  {language === 'nl' ? 'Laag' : 'Low'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdatePriority(selectedTicket.id, 'medium')}>
                                  {language === 'nl' ? 'Normaal' : 'Medium'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdatePriority(selectedTicket.id, 'high')}>
                                  {language === 'nl' ? 'Hoog' : 'High'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdatePriority(selectedTicket.id, 'urgent')}>
                                  {language === 'nl' ? 'Urgent' : 'Urgent'}
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            
                            {/* Assign submenu */}
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                {language === 'nl' ? 'Toewijzen aan' : 'Assign to'}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleAssignTicket(selectedTicket.id, null)}>
                                  {language === 'nl' ? 'Niemand' : 'Unassigned'}
                                </DropdownMenuItem>
                                {staffMembers.map(staff => (
                                  <DropdownMenuItem 
                                    key={staff.user_id}
                                    onClick={() => handleAssignTicket(selectedTicket.id, staff.user_id)}
                                  >
                                    {staff.full_name || staff.email || staff.user_id}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            
                            <DropdownMenuSeparator />
                            
                            {/* Archive/Restore */}
                            {selectedTicket.is_archived ? (
                              <DropdownMenuItem onClick={() => handleArchiveTicket(selectedTicket.id, false)}>
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                {language === 'nl' ? 'Herstellen uit archief' : 'Restore from archive'}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleArchiveTicket(selectedTicket.id, true)}>
                                <Archive className="h-4 w-4 mr-2" />
                                {language === 'nl' ? 'Archiveren' : 'Archive'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {replies.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{language === 'nl' ? 'Nog geen reacties' : 'No replies yet'}</p>
                    </div>
                  ) : (
                    replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`flex ${reply.is_staff ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            reply.is_staff
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <p className="text-sm">{reply.message}</p>
                          <p className={`text-xs mt-1 ${reply.is_staff ? 'text-muted-foreground/70' : 'text-primary-foreground/70'}`}>
                            {reply.is_staff ? '👨‍💻 Support' : language === 'nl' ? 'Jij' : 'You'} • {new Date(reply.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
                {selectedTicket.status !== 'closed' && !selectedTicket.is_archived && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder={language === 'nl' ? 'Typ je bericht...' : 'Type your message...'}
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        className="min-h-[60px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                      />
                      <Button onClick={handleSendReply} disabled={sendingReply || !newReply.trim()}>
                        {sendingReply ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">
                    {language === 'nl' ? 'Selecteer een ticket' : 'Select a ticket'}
                  </p>
                  <p className="text-sm mt-1">
                    {language === 'nl' 
                      ? 'Of maak een nieuw ticket aan voor hulp'
                      : 'Or create a new ticket for assistance'}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'nl' ? 'Nieuw Support Ticket' : 'New Support Ticket'}
            </DialogTitle>
            <DialogDescription>
              {language === 'nl' 
                ? 'Beschrijf je probleem zo duidelijk mogelijk.'
                : 'Describe your issue as clearly as possible.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'nl' ? 'Onderwerp' : 'Subject'}</Label>
              <Input
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder={language === 'nl' ? 'Kort onderwerp' : 'Brief subject'}
              />
            </div>
            <div>
              <Label>{language === 'nl' ? 'Categorie' : 'Category'}</Label>
              <Select
                value={newTicket.category}
                onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{language === 'nl' ? 'Algemeen' : 'General'}</SelectItem>
                  <SelectItem value="billing">{language === 'nl' ? 'Facturatie' : 'Billing'}</SelectItem>
                  <SelectItem value="technical">{language === 'nl' ? 'Technisch' : 'Technical'}</SelectItem>
                  <SelectItem value="server">{language === 'nl' ? 'Server problemen' : 'Server Issues'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'nl' ? 'Prioriteit' : 'Priority'}</Label>
              <Select
                value={newTicket.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setNewTicket({ ...newTicket, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{language === 'nl' ? 'Laag' : 'Low'}</SelectItem>
                  <SelectItem value="medium">{language === 'nl' ? 'Normaal' : 'Medium'}</SelectItem>
                  <SelectItem value="high">{language === 'nl' ? 'Hoog' : 'High'}</SelectItem>
                  <SelectItem value="urgent">{language === 'nl' ? 'Urgent' : 'Urgent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'nl' ? 'Beschrijving' : 'Description'}</Label>
              <Textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder={language === 'nl' ? 'Beschrijf je probleem in detail...' : 'Describe your issue in detail...'}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {language === 'nl' ? 'Annuleren' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateTicket} disabled={creatingTicket}>
              {creatingTicket && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'nl' ? 'Ticket Aanmaken' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Tickets;

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Save, Eye, Pencil, Mail, Code, FileText, X } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  description: string | null;
  variables: string[] | null;
  is_active: boolean;
  updated_at: string;
}

const EmailTemplateManagement = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    subject: '',
    html_content: '',
    is_active: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      subject: template.subject,
      html_content: template.html_content,
      is_active: template.is_active,
    });
    setEditDialogOpen(true);
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: editForm.subject,
          html_content: editForm.html_content,
          is_active: editForm.is_active,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      await fetchTemplates();
      setEditDialogOpen(false);
      
      toast({
        title: language === 'nl' ? 'Opgeslagen' : 'Saved',
        description: language === 'nl' 
          ? 'E-mail template is bijgewerkt' 
          : 'Email template has been updated',
      });
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getTemplateLabel = (name: string) => {
    const labels: Record<string, { nl: string; en: string }> = {
      ticket_new_reply: { nl: 'Nieuw ticket antwoord', en: 'New Ticket Reply' },
      ticket_status_changed: { nl: 'Ticket status gewijzigd', en: 'Ticket Status Changed' },
      order_confirmation: { nl: 'Bestelbevestiging', en: 'Order Confirmation' },
      server_ready: { nl: 'Server gereed', en: 'Server Ready' },
      welcome: { nl: 'Welkomstmail', en: 'Welcome Email' },
    };
    return labels[name]?.[language] || name;
  };

  const renderPreviewHtml = (html: string) => {
    // Replace variables with example values for preview
    return html
      .replace(/\{\{site_name\}\}/g, 'CloudSurf')
      .replace(/\{\{tagline\}\}/g, 'Premium Game Server Hosting')
      .replace(/\{\{user_name\}\}/g, 'Jan Jansen')
      .replace(/\{\{ticket_display_id\}\}/g, 'TKT-000001')
      .replace(/\{\{ticket_subject\}\}/g, 'Hulp nodig met server')
      .replace(/\{\{ticket_status\}\}/g, 'open')
      .replace(/\{\{ticket_status_label\}\}/g, 'Open')
      .replace(/\{\{order_display_id\}\}/g, 'SRV-000001')
      .replace(/\{\{product_name\}\}/g, 'Minecraft Server')
      .replace(/\{\{plan_name\}\}/g, 'Premium')
      .replace(/\{\{price\}\}/g, '9.99')
      .replace(/\{\{server_id\}\}/g, 'srv-abc123')
      .replace(/\{\{dashboard_url\}\}/g, '#')
      .replace(/\{\{panel_url\}\}/g, '#')
      .replace(/\{\{footer_text\}\}/g, '© 2024 CloudSurf. Alle rechten voorbehouden.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(template => (
          <Card key={template.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">
                    {getTemplateLabel(template.name)}
                  </CardTitle>
                </div>
                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                  {template.is_active 
                    ? (language === 'nl' ? 'Actief' : 'Active')
                    : (language === 'nl' ? 'Inactief' : 'Inactive')}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {language === 'nl' ? 'Onderwerp' : 'Subject'}
                  </Label>
                  <p className="text-sm font-medium truncate">{template.subject}</p>
                </div>
                
                {template.variables && template.variables.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {language === 'nl' ? 'Variabelen' : 'Variables'}
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.variables.slice(0, 4).map(variable => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                      {template.variables.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {language === 'nl' ? 'Preview' : 'Preview'}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {language === 'nl' ? 'Bewerken' : 'Edit'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {selectedTemplate && getTemplateLabel(selectedTemplate.name)}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="content" className="mt-4">
            <TabsList>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {language === 'nl' ? 'Inhoud' : 'Content'}
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{language === 'nl' ? 'Onderwerp' : 'Subject'}</Label>
                <Input
                  value={editForm.subject}
                  onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={language === 'nl' ? 'E-mail onderwerp...' : 'Email subject...'}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">
                  {language === 'nl' ? 'Template actief' : 'Template active'}
                </Label>
              </div>

              {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">
                    {language === 'nl' ? 'Beschikbare variabelen' : 'Available variables'}
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.variables.map(variable => (
                      <Badge 
                        key={variable} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${variable}}}`);
                          toast({
                            title: language === 'nl' ? 'Gekopieerd' : 'Copied',
                            description: `{{${variable}}}`,
                          });
                        }}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {language === 'nl' 
                      ? 'Klik op een variabele om te kopiëren'
                      : 'Click a variable to copy'}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="code" className="mt-4">
              <div className="space-y-2">
                <Label>HTML Content</Label>
                <Textarea
                  value={editForm.html_content}
                  onChange={(e) => setEditForm(prev => ({ ...prev, html_content: e.target.value }))}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder="HTML content..."
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={renderPreviewHtml(editForm.html_content)}
                  className="w-full h-[500px]"
                  title="Email Preview"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {language === 'nl' ? 'Annuleren' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {language === 'nl' ? 'Opslaan' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {language === 'nl' ? 'E-mail Preview' : 'Email Preview'}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate && getTemplateLabel(selectedTemplate.name)}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {language === 'nl' ? 'Onderwerp' : 'Subject'}
                </Label>
                <p className="font-medium">
                  {renderPreviewHtml(selectedTemplate.subject)}
                </p>
              </div>
              
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={renderPreviewHtml(selectedTemplate.html_content)}
                  className="w-full h-[500px]"
                  title="Email Preview"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplateManagement;

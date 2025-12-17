import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react';

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const KnowledgeBaseManagement = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    category: 'general',
    tags: [] as string[],
    sort_order: 0,
    is_active: true,
  });

  const categories = [
    { value: 'general', label: language === 'nl' ? 'Algemeen' : 'General' },
    { value: 'getting_started', label: language === 'nl' ? 'Aan de slag' : 'Getting Started' },
    { value: 'servers', label: 'Servers' },
    { value: 'billing', label: language === 'nl' ? 'Facturatie' : 'Billing' },
    { value: 'technical', label: language === 'nl' ? 'Technisch' : 'Technical' },
  ];

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('knowledge_base_articles')
      .select('*')
      .order('sort_order', { ascending: true });

    if (data) setArticles(data);
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const resetForm = () => {
    setForm({
      title: '',
      slug: '',
      content: '',
      category: 'general',
      tags: [],
      sort_order: 0,
      is_active: true,
    });
    setTagsInput('');
    setEditingArticle(null);
  };

  const handleEdit = (article: KBArticle) => {
    setEditingArticle(article);
    setForm({
      title: article.title,
      slug: article.slug,
      content: article.content,
      category: article.category,
      tags: article.tags || [],
      sort_order: article.sort_order,
      is_active: article.is_active,
    });
    setTagsInput((article.tags || []).join(', '));
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm({ 
      ...form, 
      title,
      slug: editingArticle ? form.slug : generateSlug(title)
    });
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tags = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
    setForm({ ...form, tags });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: language === 'nl' ? 'Vul alle verplichte velden in' : 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    if (editingArticle) {
      const { error } = await supabase
        .from('knowledge_base_articles')
        .update(form)
        .eq('id', editingArticle.id);

      if (error) {
        toast({ title: language === 'nl' ? 'Fout' : 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: language === 'nl' ? 'Succes' : 'Success', description: language === 'nl' ? 'Artikel bijgewerkt' : 'Article updated' });
      }
    } else {
      const { error } = await supabase
        .from('knowledge_base_articles')
        .insert([form]);

      if (error) {
        toast({ title: language === 'nl' ? 'Fout' : 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: language === 'nl' ? 'Succes' : 'Success', description: language === 'nl' ? 'Artikel toegevoegd' : 'Article added' });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'nl' ? 'Weet je zeker dat je dit artikel wilt verwijderen?' : 'Are you sure you want to delete this article?')) {
      return;
    }

    const { error } = await supabase
      .from('knowledge_base_articles')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: language === 'nl' ? 'Fout' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: language === 'nl' ? 'Succes' : 'Success', description: language === 'nl' ? 'Artikel verwijderd' : 'Article deleted' });
      fetchArticles();
    }
  };

  const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.label || value;
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {language === 'nl' ? 'Kennisbank Beheer' : 'Knowledge Base Management'}
        </h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'nl' ? 'Nieuw artikel' : 'New article'}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{language === 'nl' ? 'Titel' : 'Title'}</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>{language === 'nl' ? 'Categorie' : 'Category'}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">{language === 'nl' ? 'Acties' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((article) => (
            <TableRow key={article.id}>
              <TableCell className="font-medium">{article.title}</TableCell>
              <TableCell className="text-muted-foreground">{article.slug}</TableCell>
              <TableCell>
                <Badge variant="outline">{getCategoryLabel(article.category)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={article.is_active ? 'default' : 'secondary'}>
                  {article.is_active ? (language === 'nl' ? 'Actief' : 'Active') : (language === 'nl' ? 'Inactief' : 'Inactive')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" asChild>
                  <a href={`/knowledge-base/${article.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {articles.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                {language === 'nl' ? 'Nog geen artikelen' : 'No articles yet'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle 
                ? (language === 'nl' ? 'Artikel bewerken' : 'Edit article')
                : (language === 'nl' ? 'Nieuw artikel' : 'New article')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'nl' ? 'Titel' : 'Title'} *</Label>
              <Input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={language === 'nl' ? 'Voer de titel in...' : 'Enter the title...'}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="artikel-url-slug"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'nl' ? 'Inhoud' : 'Content'} *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={language === 'nl' ? 'Voer de inhoud in...' : 'Enter the content...'}
                rows={12}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'nl' ? 'Categorie' : 'Category'}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'nl' ? 'Volgorde' : 'Sort Order'}</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags ({language === 'nl' ? 'gescheiden door komma' : 'comma separated'})</Label>
              <Input
                value={tagsInput}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="minecraft, server, setup"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>{language === 'nl' ? 'Actief' : 'Active'}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {language === 'nl' ? 'Annuleren' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'nl' ? 'Opslaan' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBaseManagement;
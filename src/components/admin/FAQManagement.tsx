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
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const FAQManagement = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    question: '',
    answer: '',
    category: 'general',
    sort_order: 0,
    is_active: true,
  });

  const categories = [
    { value: 'general', label: language === 'nl' ? 'Algemeen' : 'General' },
    { value: 'billing', label: language === 'nl' ? 'Facturatie' : 'Billing' },
    { value: 'technical', label: language === 'nl' ? 'Technisch' : 'Technical' },
    { value: 'account', label: 'Account' },
  ];

  useEffect(() => {
    fetchFAQItems();
  }, []);

  const fetchFAQItems = async () => {
    const { data } = await supabase
      .from('faq_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (data) setFaqItems(data);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      question: '',
      answer: '',
      category: 'general',
      sort_order: 0,
      is_active: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: FAQItem) => {
    setEditingItem(item);
    setForm({
      question: item.question,
      answer: item.answer,
      category: item.category,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast({
        title: language === 'nl' ? 'Fout' : 'Error',
        description: language === 'nl' ? 'Vul alle verplichte velden in' : 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    if (editingItem) {
      const { error } = await supabase
        .from('faq_items')
        .update(form)
        .eq('id', editingItem.id);

      if (error) {
        toast({ title: language === 'nl' ? 'Fout' : 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: language === 'nl' ? 'Succes' : 'Success', description: language === 'nl' ? 'FAQ item bijgewerkt' : 'FAQ item updated' });
      }
    } else {
      const { error } = await supabase
        .from('faq_items')
        .insert([form]);

      if (error) {
        toast({ title: language === 'nl' ? 'Fout' : 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: language === 'nl' ? 'Succes' : 'Success', description: language === 'nl' ? 'FAQ item toegevoegd' : 'FAQ item added' });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchFAQItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'nl' ? 'Weet je zeker dat je dit item wilt verwijderen?' : 'Are you sure you want to delete this item?')) {
      return;
    }

    const { error } = await supabase
      .from('faq_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: language === 'nl' ? 'Fout' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: language === 'nl' ? 'Succes' : 'Success', description: language === 'nl' ? 'FAQ item verwijderd' : 'FAQ item deleted' });
      fetchFAQItems();
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
          {language === 'nl' ? 'FAQ Beheer' : 'FAQ Management'}
        </h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'nl' ? 'Nieuw item' : 'New item'}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{language === 'nl' ? 'Vraag' : 'Question'}</TableHead>
            <TableHead>{language === 'nl' ? 'Categorie' : 'Category'}</TableHead>
            <TableHead>{language === 'nl' ? 'Volgorde' : 'Order'}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">{language === 'nl' ? 'Acties' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faqItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-md truncate">{item.question}</TableCell>
              <TableCell>
                <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
              </TableCell>
              <TableCell>{item.sort_order}</TableCell>
              <TableCell>
                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                  {item.is_active ? (language === 'nl' ? 'Actief' : 'Active') : (language === 'nl' ? 'Inactief' : 'Inactive')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {faqItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                {language === 'nl' ? 'Nog geen FAQ items' : 'No FAQ items yet'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem 
                ? (language === 'nl' ? 'FAQ item bewerken' : 'Edit FAQ item')
                : (language === 'nl' ? 'Nieuw FAQ item' : 'New FAQ item')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'nl' ? 'Vraag' : 'Question'} *</Label>
              <Input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder={language === 'nl' ? 'Voer de vraag in...' : 'Enter the question...'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'nl' ? 'Antwoord' : 'Answer'} *</Label>
              <Textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder={language === 'nl' ? 'Voer het antwoord in...' : 'Enter the answer...'}
                rows={5}
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

export default FAQManagement;
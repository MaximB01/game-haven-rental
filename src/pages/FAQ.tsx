import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, HelpCircle, Loader2 } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

const FAQ = () => {
  const { language } = useLanguage();
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchFAQItems();
  }, []);

  const fetchFAQItems = async () => {
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (data) {
      setFaqItems(data);
    }
    setLoading(false);
  };

  const categories = [...new Set(faqItems.map(item => item.category))];

  const filteredItems = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { nl: string; en: string }> = {
      general: { nl: 'Algemeen', en: 'General' },
      billing: { nl: 'Facturatie', en: 'Billing' },
      technical: { nl: 'Technisch', en: 'Technical' },
      account: { nl: 'Account', en: 'Account' },
    };
    return labels[category]?.[language] || category;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {language === 'nl' ? 'Veelgestelde Vragen' : 'Frequently Asked Questions'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {language === 'nl' 
                ? 'Vind snel antwoorden op de meest gestelde vragen'
                : 'Find quick answers to the most common questions'}
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={language === 'nl' ? 'Zoek in FAQ...' : 'Search FAQ...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            <Badge
              variant={selectedCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              {language === 'nl' ? 'Alle' : 'All'}
            </Badge>
            {categories.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryLabel(category)}
              </Badge>
            ))}
          </div>

          {/* FAQ Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {language === 'nl' 
                  ? 'Geen FAQ items gevonden'
                  : 'No FAQ items found'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Badge variant="secondary">{getCategoryLabel(category)}</Badge>
                  </h2>
                  <Accordion type="single" collapsible className="space-y-2">
                    {items.map((item) => (
                      <AccordionItem
                        key={item.id}
                        value={item.id}
                        className="bg-card border rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FAQ;
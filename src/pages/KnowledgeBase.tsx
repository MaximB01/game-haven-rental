import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Loader2, ArrowRight } from 'lucide-react';

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  sort_order: number;
  created_at: string;
}

const KnowledgeBase = () => {
  const { language } = useLanguage();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('knowledge_base_articles')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (data) {
      setArticles(data);
    }
    setLoading(false);
  };

  const categories = [...new Set(articles.map(article => article.category))];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedArticles = filteredArticles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, KBArticle[]>);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { nl: string; en: string }> = {
      general: { nl: 'Algemeen', en: 'General' },
      getting_started: { nl: 'Aan de slag', en: 'Getting Started' },
      servers: { nl: 'Servers', en: 'Servers' },
      billing: { nl: 'Facturatie', en: 'Billing' },
      technical: { nl: 'Technisch', en: 'Technical' },
    };
    return labels[category]?.[language] || category;
  };

  const getExcerpt = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {language === 'nl' ? 'Kennisbank' : 'Knowledge Base'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {language === 'nl' 
                ? 'Handleidingen, tutorials en documentatie'
                : 'Guides, tutorials and documentation'}
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-8 max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={language === 'nl' ? 'Zoek in kennisbank...' : 'Search knowledge base...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
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

          {/* Articles */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {language === 'nl' 
                  ? 'Geen artikelen gevonden'
                  : 'No articles found'}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedArticles).map(([category, categoryArticles]) => (
                <div key={category}>
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    {getCategoryLabel(category)}
                    <Badge variant="secondary">{categoryArticles.length}</Badge>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryArticles.map((article) => (
                      <Link key={article.id} to={`/knowledge-base/${article.slug}`}>
                        <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                          <CardHeader>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center justify-between">
                              {article.title}
                              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardTitle>
                            <CardDescription>
                              {getExcerpt(article.content)}
                            </CardDescription>
                          </CardHeader>
                          {article.tags && article.tags.length > 0 && (
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-1">
                                {article.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default KnowledgeBase;
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Loader2, Calendar } from 'lucide-react';

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const KnowledgeBaseArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const [article, setArticle] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    const { data, error } = await supabase
      .from('knowledge_base_articles')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setArticle(data);
    }
    setLoading(false);
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24">
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">
              {language === 'nl' ? 'Artikel niet gevonden' : 'Article not found'}
            </h1>
            <Link to="/knowledge-base">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'nl' ? 'Terug naar kennisbank' : 'Back to knowledge base'}
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to="/knowledge-base" className="inline-block mb-8">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {language === 'nl' ? 'Terug naar kennisbank' : 'Back to knowledge base'}
            </Button>
          </Link>

          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">{getCategoryLabel(article.category)}</Badge>
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(article.updated_at)}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Article Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {article.content}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KnowledgeBaseArticle;
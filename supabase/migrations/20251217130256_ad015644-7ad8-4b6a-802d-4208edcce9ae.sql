-- Create FAQ table
CREATE TABLE public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Knowledge Base table
CREATE TABLE public.knowledge_base_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- FAQ RLS Policies
CREATE POLICY "Anyone can view active FAQ items"
ON public.faq_items
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all FAQ items"
ON public.faq_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert FAQ items"
ON public.faq_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update FAQ items"
ON public.faq_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete FAQ items"
ON public.faq_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Knowledge Base RLS Policies
CREATE POLICY "Anyone can view active KB articles"
ON public.knowledge_base_articles
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all KB articles"
ON public.knowledge_base_articles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert KB articles"
ON public.knowledge_base_articles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update KB articles"
ON public.knowledge_base_articles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete KB articles"
ON public.knowledge_base_articles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Update triggers
CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at
BEFORE UPDATE ON public.knowledge_base_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
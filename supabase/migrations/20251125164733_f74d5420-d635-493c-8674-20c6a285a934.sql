-- Criar tabela de categorias
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de modelos de piscina
CREATE TABLE public.pool_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  differentials TEXT[] DEFAULT '{}',
  included_items TEXT[] DEFAULT '{}',
  not_included_items TEXT[] DEFAULT '{}',
  base_price DECIMAL(10,2) NOT NULL,
  delivery_days INTEGER DEFAULT 30,
  installation_days INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de opcionais
CREATE TABLE public.optionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de propostas
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  model_id UUID REFERENCES public.pool_models(id) ON DELETE SET NULL,
  selected_optionals JSONB DEFAULT '[]',
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura pública (qualquer um pode ver os dados)
CREATE POLICY "Anyone can view active categories"
  ON public.categories FOR SELECT
  USING (active = true);

CREATE POLICY "Anyone can view active pool models"
  ON public.pool_models FOR SELECT
  USING (active = true);

CREATE POLICY "Anyone can view active optionals"
  ON public.optionals FOR SELECT
  USING (active = true);

-- Políticas para inserção de propostas (qualquer um pode criar)
CREATE POLICY "Anyone can create proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (true);

-- Políticas para admin (depois implementaremos autenticação)
CREATE POLICY "Authenticated users can manage categories"
  ON public.categories FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage pool models"
  ON public.pool_models FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage optionals"
  ON public.optionals FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all proposals"
  ON public.proposals FOR SELECT
  USING (auth.role() = 'authenticated');

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pool_models_updated_at
  BEFORE UPDATE ON public.pool_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optionals_updated_at
  BEFORE UPDATE ON public.optionals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
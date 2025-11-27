-- Adicionar novos campos aos modelos de piscina
ALTER TABLE public.pool_models 
  ADD COLUMN length DECIMAL(10,2),
  ADD COLUMN width DECIMAL(10,2),
  ADD COLUMN depth DECIMAL(10,2),
  ADD COLUMN photo_url TEXT,
  ADD COLUMN payment_terms TEXT DEFAULT 'À vista',
  ADD COLUMN notes TEXT;

-- Criar tabela de grupos de opcionais
CREATE TABLE public.optional_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  selection_type TEXT NOT NULL CHECK (selection_type IN ('single', 'multiple')),
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar group_id aos opcionais
ALTER TABLE public.optionals 
  ADD COLUMN group_id uuid REFERENCES public.optional_groups(id) ON DELETE SET NULL,
  ADD COLUMN display_order INTEGER DEFAULT 0,
  ADD COLUMN warning_note TEXT;

-- Enable RLS para optional_groups
ALTER TABLE public.optional_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies para optional_groups
CREATE POLICY "Users can view their store optional groups"
  ON public.optional_groups FOR SELECT
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their store optional groups"
  ON public.optional_groups FOR ALL
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Anyone can view active optional groups"
  ON public.optional_groups FOR SELECT
  USING (active = true);

-- Trigger para updated_at
CREATE TRIGGER update_optional_groups_updated_at
  BEFORE UPDATE ON public.optional_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir grupos padrão para lojas existentes (com store_id nulo para serem públicos inicialmente)
-- Os lojistas poderão criar seus próprios grupos depois
INSERT INTO public.optional_groups (name, description, selection_type, display_order) VALUES
  ('Iluminação', 'Escolha a quantidade de LEDs para sua piscina', 'single', 1),
  ('Hidromassagem', 'Selecione o sistema de hidromassagem', 'single', 2),
  ('Cascata', 'Adicione cascatas decorativas', 'multiple', 3),
  ('Itens Adicionais', 'Equipamentos essenciais para funcionamento', 'multiple', 4),
  ('Sistemas de Aquecimento', 'Mantenha a água sempre na temperatura ideal', 'multiple', 5),
  ('Tratamento da Água', 'Sistemas avançados de tratamento', 'multiple', 6);
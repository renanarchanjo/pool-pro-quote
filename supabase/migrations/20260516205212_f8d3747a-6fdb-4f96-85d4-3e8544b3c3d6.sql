
CREATE TABLE public.financeiro_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  cor text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.financeiro_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own store categorias"
ON public.financeiro_categorias FOR ALL TO authenticated
USING ((store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)) OR public.has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK ((store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE public.financeiro_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  categoria_id uuid REFERENCES public.financeiro_categorias(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  competencia text NOT NULL DEFAULT to_char(CURRENT_DATE,'YYYY-MM'),
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_fin_lanc_store_comp ON public.financeiro_lancamentos(store_id, competencia);
CREATE INDEX idx_fin_lanc_categoria ON public.financeiro_lancamentos(categoria_id);

CREATE OR REPLACE FUNCTION public.set_financeiro_competencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.competencia := to_char(NEW.data_lancamento,'YYYY-MM');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_fin_lanc_competencia
BEFORE INSERT OR UPDATE OF data_lancamento ON public.financeiro_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.set_financeiro_competencia();

CREATE POLICY "Owners manage own store lancamentos"
ON public.financeiro_lancamentos FOR ALL TO authenticated
USING ((store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)) OR public.has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK ((store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.seed_financeiro_categorias_default(_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.financeiro_categorias (store_id, nome, tipo, cor) VALUES
    (_store_id, 'Infraestrutura', 'saida', '#6366f1'),
    (_store_id, 'Marketing e Ads', 'saida', '#f59e0b'),
    (_store_id, 'Despesas Operacionais', 'saida', '#ef4444'),
    (_store_id, 'Receita de Assinaturas', 'entrada', '#22c55e');
END; $$;

CREATE OR REPLACE FUNCTION public.trg_seed_financeiro_categorias()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_financeiro_categorias_default(NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER stores_seed_financeiro_categorias
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_financeiro_categorias();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.stores LOOP
    PERFORM public.seed_financeiro_categorias_default(r.id);
  END LOOP;
END $$;

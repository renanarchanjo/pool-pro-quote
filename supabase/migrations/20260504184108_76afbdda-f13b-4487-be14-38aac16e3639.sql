
-- ENUM status
DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('rascunho','enviado','aguardando_assinatura','assinado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  proposal_id uuid,
  status public.contract_status NOT NULL DEFAULT 'rascunho',
  pdf_path text,
  signed_pdf_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  signed_at timestamptz
);
CREATE INDEX idx_contracts_store ON public.contracts(store_id);
CREATE INDEX idx_contracts_proposal ON public.contracts(proposal_id);

-- contract_seller_data
CREATE TABLE public.contract_seller_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE UNIQUE,
  company_name text,
  cnpj text,
  address text,
  city text,
  state text,
  cep text,
  phone text,
  website text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- contract_buyer_data
CREATE TABLE public.contract_buyer_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE UNIQUE,
  name text NOT NULL,
  rg text,
  cpf text,
  address text,
  city text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- contract_product_data
CREATE TABLE public.contract_product_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE UNIQUE,
  pool_model text,
  brand text,
  size text,
  color text,
  total_value numeric NOT NULL DEFAULT 0,
  payment_conditions text,
  payment_installments jsonb NOT NULL DEFAULT '[]'::jsonb,
  contract_date date NOT NULL DEFAULT (now()::date),
  city_forum text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger on contracts
CREATE TRIGGER trg_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_seller_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_buyer_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_product_data ENABLE ROW LEVEL SECURITY;

-- contracts policies
CREATE POLICY "Store members can view contracts"
ON public.contracts FOR SELECT TO authenticated
USING (store_id = public.get_user_store_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Store members can create contracts"
ON public.contracts FOR INSERT TO authenticated
WITH CHECK (store_id = public.get_user_store_id(auth.uid()) AND (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'seller'::app_role)));

CREATE POLICY "Owners can update contracts"
ON public.contracts FOR UPDATE TO authenticated
USING ((store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)) OR public.has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK ((store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Owners can delete contracts"
ON public.contracts FOR DELETE TO authenticated
USING ((store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- shared policy generator for child tables
-- contract_seller_data
CREATE POLICY "view_seller_data" ON public.contract_seller_data FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (c.store_id = public.get_user_store_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'::app_role))));
CREATE POLICY "insert_seller_data" ON public.contract_seller_data FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'seller'::app_role))));
CREATE POLICY "update_seller_data" ON public.contract_seller_data FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)));
CREATE POLICY "delete_seller_data" ON public.contract_seller_data FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)));

-- contract_buyer_data
CREATE POLICY "view_buyer_data" ON public.contract_buyer_data FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (c.store_id = public.get_user_store_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'::app_role))));
CREATE POLICY "insert_buyer_data" ON public.contract_buyer_data FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'seller'::app_role))));
CREATE POLICY "update_buyer_data" ON public.contract_buyer_data FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)));
CREATE POLICY "delete_buyer_data" ON public.contract_buyer_data FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)));

-- contract_product_data
CREATE POLICY "view_product_data" ON public.contract_product_data FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (c.store_id = public.get_user_store_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'::app_role))));
CREATE POLICY "insert_product_data" ON public.contract_product_data FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'seller'::app_role))));
CREATE POLICY "update_product_data" ON public.contract_product_data FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)));
CREATE POLICY "delete_product_data" ON public.contract_product_data FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.store_id = public.get_user_store_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role)));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts','contracts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Store members read contracts files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contracts'
  AND (
    public.has_role(auth.uid(),'super_admin'::app_role)
    OR (storage.foldername(name))[1] = public.get_user_store_id(auth.uid())::text
  )
);

CREATE POLICY "Store members upload contracts files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_user_store_id(auth.uid())::text
  AND (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'seller'::app_role))
);

CREATE POLICY "Owners update contracts files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_user_store_id(auth.uid())::text
  AND public.has_role(auth.uid(),'owner'::app_role)
);

CREATE POLICY "Owners delete contracts files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'contracts'
  AND (storage.foldername(name))[1] = public.get_user_store_id(auth.uid())::text
  AND public.has_role(auth.uid(),'owner'::app_role)
);

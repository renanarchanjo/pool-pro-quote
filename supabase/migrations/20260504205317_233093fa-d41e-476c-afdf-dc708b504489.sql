CREATE TABLE public.store_contract_clauses (
  store_id uuid PRIMARY KEY,
  clauses jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.store_contract_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own clauses"
ON public.store_contract_clauses FOR ALL
TO authenticated
USING (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(),'owner'::app_role))
WITH CHECK (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(),'owner'::app_role));

CREATE POLICY "Store members can view own clauses"
ON public.store_contract_clauses FOR SELECT
TO authenticated
USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Super admins full access clauses"
ON public.store_contract_clauses FOR ALL
TO authenticated
USING (has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_store_contract_clauses_updated
BEFORE UPDATE ON public.store_contract_clauses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
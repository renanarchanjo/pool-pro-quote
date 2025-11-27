-- Permitir que qualquer pessoa veja stores (necessário para simulações públicas)
CREATE POLICY "Anyone can view stores"
ON public.stores
FOR SELECT
USING (true);
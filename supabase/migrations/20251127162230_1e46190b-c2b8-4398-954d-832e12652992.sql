-- Permitir que usuários autenticados criem stores durante o signup
CREATE POLICY "Users can create stores during signup"
ON public.stores
FOR INSERT
WITH CHECK (true);
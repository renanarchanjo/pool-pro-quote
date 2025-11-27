-- Permitir que qualquer visitante (anon ou autenticado) insira propostas
CREATE POLICY "Public can insert proposals for simulation"
ON public.proposals
AS PERMISSIVE
FOR INSERT
WITH CHECK (true);

-- Create status enum for proposals
CREATE TYPE public.proposal_status AS ENUM ('nova', 'enviada', 'em_negociacao', 'fechada', 'perdida');

-- Add status column to proposals
ALTER TABLE public.proposals ADD COLUMN status public.proposal_status NOT NULL DEFAULT 'nova';

-- Allow authenticated users to update their store proposals
CREATE POLICY "Users can update their store proposals" ON public.proposals FOR UPDATE TO authenticated
USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));

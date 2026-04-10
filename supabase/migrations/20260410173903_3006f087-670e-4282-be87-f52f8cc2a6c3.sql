
ALTER TABLE public.proposals ADD COLUMN is_test boolean NOT NULL DEFAULT false;

CREATE INDEX idx_proposals_is_test ON public.proposals (is_test) WHERE is_test = true;

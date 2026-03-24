
-- Table for lead/proposal follow-up notes (status history + notepad)
CREATE TABLE public.proposal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'note', -- 'note', 'status_change', 'follow_up'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_notes ENABLE ROW LEVEL SECURITY;

-- Store members can view their own store's notes
CREATE POLICY "Users can view their store proposal_notes"
ON public.proposal_notes FOR SELECT TO authenticated
USING (store_id = get_user_store_id(auth.uid()));

-- Store members can insert notes for their store
CREATE POLICY "Users can insert their store proposal_notes"
ON public.proposal_notes FOR INSERT TO authenticated
WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Super admins full access
CREATE POLICY "Super admins full access proposal_notes"
ON public.proposal_notes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

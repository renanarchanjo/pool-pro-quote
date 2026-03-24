
-- Add daily lead limit per team member
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_lead_limit integer DEFAULT 0;

-- Add assigned_to column for internal lead assignment by owner
ALTER TABLE public.lead_distributions ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);

-- Comment: daily_lead_limit = 0 means unlimited
COMMENT ON COLUMN public.profiles.daily_lead_limit IS 'Max leads this user can accept per day. 0 = unlimited.';
COMMENT ON COLUMN public.lead_distributions.assigned_to IS 'Team member this lead was assigned to by the owner.';

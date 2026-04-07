-- Remove proposals and lead_distributions from Realtime publication
-- to prevent cross-store data leaks. Use polling instead.
ALTER PUBLICATION supabase_realtime DROP TABLE public.proposals;
ALTER PUBLICATION supabase_realtime DROP TABLE public.lead_distributions;
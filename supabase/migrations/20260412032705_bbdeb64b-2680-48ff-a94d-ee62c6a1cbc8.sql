
-- Create security_events table
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  user_id uuid,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access security_events"
ON public.security_events FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role can insert security_events"
ON public.security_events FOR INSERT TO service_role
WITH CHECK (true);

CREATE INDEX idx_security_events_type_date ON public.security_events (event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON public.security_events (severity, resolved, created_at DESC);
CREATE INDEX idx_security_events_user ON public.security_events (user_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events;

-- Helper function for logging security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _severity text,
  _user_id uuid DEFAULT NULL,
  _store_id uuid DEFAULT NULL,
  _ip_address text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (event_type, severity, user_id, store_id, ip_address, details)
  VALUES (_event_type, _severity, _user_id, _store_id, _ip_address, _details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated, service_role;

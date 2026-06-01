-- Per-client assumptions table
-- Stores a JSONB blob of assumption overrides keyed by client_id.
-- When a new scenario is created for a client, it seeds from these defaults.
-- When assumptions are edited on the dashboard, they sync back here.

CREATE TABLE IF NOT EXISTS public.client_assumptions (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own client assumptions"
ON public.client_assumptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own client assumptions"
ON public.client_assumptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client assumptions"
ON public.client_assumptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client assumptions"
ON public.client_assumptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

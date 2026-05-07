-- Allow an authenticated client user to read the scenario row they are linked
-- to via scenarios.client_user_id, plus the corresponding client record.
--
-- Without this, the only matching SELECT policy on scenarios was
-- "Users can view own scenarios" which checks clients.user_id = auth.uid()
-- — that's the AGENT who owns the client record, never the client user
-- themselves. Same problem for the clients table. Result:
-- usePortalClient + ScenarioSaveContext.loadScenarioForClientUser both got
-- 0 rows back, so the portal showed "No plan available yet" even after the
-- agent had successfully shared the scenario via the Share button (cofounder
-- report 2026-05-07).

CREATE POLICY "Client user can read their linked scenario"
ON public.scenarios
FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

-- The clients-side policy needs to look up which client_id is linked to the
-- current user via scenarios.client_user_id. A naive `id IN (SELECT ...
-- FROM scenarios)` subquery in the policy USING clause causes infinite
-- recursion: clients' RLS triggers scenarios' RLS, which triggers the
-- existing "Users can view own scenarios" policy that re-queries clients,
-- looping back. Wrap the lookup in a SECURITY DEFINER helper so the
-- subquery skips RLS entirely.
CREATE OR REPLACE FUNCTION public.client_id_for_user(uid uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT client_id
  FROM public.scenarios
  WHERE client_user_id = uid
  ORDER BY updated_at DESC
  LIMIT 1
$$;

CREATE POLICY "Linked client user can read their client record"
ON public.clients
FOR SELECT
TO authenticated
USING (id = public.client_id_for_user(auth.uid()));

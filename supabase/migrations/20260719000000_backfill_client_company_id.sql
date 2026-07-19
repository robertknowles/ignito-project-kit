-- Connect firm branding to portal clients.
--
-- Background: create-client-user historically wrote the firm's company_id into
-- the public.users row but NOT into the auth user_metadata. The handle_new_user
-- trigger reads company_id from raw_user_meta_data, so every client provisioned
-- before the metadata fix got profiles.company_id = NULL. With a null company,
-- BrandingContext.fetchBranding bails early and the portal falls back to the
-- default "My Company" name + generic logo instead of the BA firm's branding
-- (2026-07-19).
--
-- 1) Backfill: copy company_id from public.users (which already has it) onto the
--    matching client profile, but only where the profile's company is still null
--    so we never clobber an existing link.
UPDATE public.profiles p
SET company_id = u.company_id
FROM public.users u
WHERE p.id = u.id
  AND p.role = 'client'
  AND p.company_id IS NULL
  AND u.company_id IS NOT NULL;

-- 2) RLS: let a signed-in member read their own company row so BrandingContext
--    can load name/logo/colour. Owners/agents may already have an equivalent
--    policy created in the Supabase dashboard; RLS policies are OR-ed, so a
--    second, clearly-named policy is additive and harmless. Guarded with DROP
--    IF EXISTS to stay idempotent.
--
-- A SECURITY DEFINER helper looks up the caller's company_id without tripping
-- profiles RLS inside the policy (same approach as client_id_for_user in
-- 20260507000000_client_user_portal_rls.sql).
CREATE OR REPLACE FUNCTION public.company_id_for_user(uid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = uid
  LIMIT 1
$$;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read their own company" ON public.companies;
CREATE POLICY "Members can read their own company"
ON public.companies
FOR SELECT
TO authenticated
USING (id = public.company_id_for_user(auth.uid()));

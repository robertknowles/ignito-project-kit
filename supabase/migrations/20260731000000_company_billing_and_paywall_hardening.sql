-- Per-company billing + paywall hardening (31 Jul 2026)
--
-- Re-enabling Stripe safely requires closing the holes found in the pre-launch
-- audit: subscription state was per-profile, self-writable via RLS, and every
-- gate was client-side. This migration:
--   1. moves billing onto companies (the unit that actually pays),
--   2. backfills owner profiles/companies for pre-trigger team accounts,
--   3. comps team + beta companies so the gate never touches them,
--   4. locks role/company/billing columns against client-side writes,
--   5. enforces the client-roadmap quota server-side,
--   6. replaces the wide-open anon scenario policies with RPCs scoped to the
--      exact share/onboarding link id.

-- 1) Billing columns on companies -------------------------------------------

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS client_roadmaps_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS billing_period_end timestamptz;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'founding', 'starter', 'professional'));

ALTER TABLE public.companies
  ADD CONSTRAINT companies_subscription_status_check
  CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'comped'));

CREATE UNIQUE INDEX IF NOT EXISTS companies_stripe_customer_id_uniq
  ON public.companies (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2) Backfill pre-profiles-era team accounts --------------------------------
-- These auth users predate the handle_new_user trigger and have no profile;
-- under the subscription gate they would hang on the loading screen forever.

DO $$
DECLARE
  r record;
  v_company uuid;
BEGIN
  FOR r IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE lower(u.email) IN (
      'robert.knowles2884@gmail.com',
      'jamescb40@gmail.com',
      'co@hyperhq.com'
    )
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  LOOP
    -- companies.owner_id references profiles(id), so the profile goes first
    INSERT INTO public.profiles (id, role)
    VALUES (r.id, 'owner');

    INSERT INTO public.companies (name, owner_id, seat_limit)
    VALUES ('PropPath', r.id, 10)
    RETURNING id INTO v_company;

    UPDATE public.profiles SET company_id = v_company WHERE id = r.id;
  END LOOP;
END $$;

-- 3) Comp team + beta companies ---------------------------------------------
-- 'comped' is a status the Stripe webhook is forbidden to touch, so real
-- customers' renewals/cancellations can never downgrade these companies.

WITH exempt_users AS (
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) IN (
    -- team
    'rk@hyperhq.com', 'jcb@hyperhq.com', 'co@hyperhq.com',
    'robert.knowles2884@gmail.com', 'jamescb40@gmail.com',
    'robertjknowles@hotmail.com', 'robert.knowles@gmail.com',
    'rob@caseybrown.com', 'test@proppath.com', 'sdb@stat.app',
    -- beta users
    'adam@compoundproperty.com.au',
    'anugrahv.freshstartadvisory@gmail.com',
    'ella@meccapropertygroup.com.au',
    'ella@caseventsgroup.com',
    'julian@searchpartyproperty.com.au',
    'josh@chsecure.com.au'
  )
),
exempt_companies AS (
  SELECT c.id FROM public.companies c
  WHERE c.owner_id IN (SELECT id FROM exempt_users)
  UNION
  SELECT p.company_id FROM public.profiles p
  WHERE p.id IN (SELECT id FROM exempt_users) AND p.company_id IS NOT NULL
)
UPDATE public.companies
SET subscription_status = 'comped'
WHERE id IN (SELECT id FROM exempt_companies);

-- 4) Lock privileged columns against client-side writes ---------------------

-- True when the caller is the service role (edge functions), a migration, or
-- an internal Supabase admin role — i.e. anything that is not an end-user
-- request through PostgREST with an anon/authenticated JWT.
CREATE OR REPLACE FUNCTION public.is_service_context()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
      OR current_user IN ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin');
$$;

CREATE OR REPLACE FUNCTION public.guard_profiles_protected_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  IF public.is_service_context() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.client_roadmaps_limit IS DISTINCT FROM OLD.client_roadmaps_limit
     OR NEW.client_roadmaps_used IS DISTINCT FROM OLD.client_roadmaps_used
     OR NEW.billing_period_start IS DISTINCT FROM OLD.billing_period_start
     OR NEW.billing_period_end IS DISTINCT FROM OLD.billing_period_end
  THEN
    RAISE EXCEPTION 'PROTECTED_COLUMNS: role, company and subscription fields can only be changed server-side';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_profiles_protected ON public.profiles;
CREATE TRIGGER trg_guard_profiles_protected
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_protected_columns();

CREATE OR REPLACE FUNCTION public.guard_companies_protected_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  IF public.is_service_context() THEN
    RETURN NEW;
  END IF;
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.client_roadmaps_limit IS DISTINCT FROM OLD.client_roadmaps_limit
     OR NEW.billing_period_start IS DISTINCT FROM OLD.billing_period_start
     OR NEW.billing_period_end IS DISTINCT FROM OLD.billing_period_end
     OR NEW.seat_limit IS DISTINCT FROM OLD.seat_limit
  THEN
    RAISE EXCEPTION 'PROTECTED_COLUMNS: billing and seat fields can only be changed server-side';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_companies_protected ON public.companies;
CREATE TRIGGER trg_guard_companies_protected
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.guard_companies_protected_columns();

-- 5) Server-side client-roadmap quota ---------------------------------------
-- The Starter-3/Professional-10 limits were previously marketing copy only:
-- nothing counted roadmaps and nothing blocked creation. Enforce per billing
-- period, at the database, keyed to the creator's company.

CREATE OR REPLACE FUNCTION public.enforce_roadmap_quota()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_company uuid;
  v_status text;
  v_limit integer;
  v_start timestamptz;
  v_used integer;
BEGIN
  IF public.is_service_context() THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_company FROM public.profiles WHERE id = NEW.user_id;
  v_company := coalesce(v_company, NEW.company_id);

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED: an active PropPath subscription is needed to create client roadmaps';
  END IF;

  SELECT subscription_status, client_roadmaps_limit, billing_period_start
    INTO v_status, v_limit, v_start
  FROM public.companies WHERE id = v_company;

  IF v_status = 'comped' THEN
    RETURN NEW;
  END IF;

  IF v_status IS DISTINCT FROM 'active' AND v_status IS DISTINCT FROM 'past_due' THEN
    RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED: an active PropPath subscription is needed to create client roadmaps';
  END IF;

  IF v_limit > 0 THEN
    SELECT count(*) INTO v_used
    FROM public.clients c
    WHERE (c.company_id = v_company
           OR c.user_id IN (SELECT p.id FROM public.profiles p WHERE p.company_id = v_company))
      AND c.created_at >= coalesce(v_start, date_trunc('month', now()));

    IF v_used >= v_limit THEN
      RAISE EXCEPTION 'ROADMAP_LIMIT_REACHED: this billing period''s client roadmap limit has been reached';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_roadmap_quota ON public.clients;
CREATE TRIGGER trg_enforce_roadmap_quota
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_roadmap_quota();

-- 6) Scope public scenario access to the exact link id ----------------------
-- The old anon policies exposed every scenario with a non-null share/onboarding
-- id to unauthenticated list queries (and allowed overwriting them). Replace
-- with SECURITY DEFINER lookups that require the exact unguessable id.

DROP POLICY IF EXISTS "Public read access for shared scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Public read for onboarding" ON public.scenarios;
DROP POLICY IF EXISTS "Public update via onboarding_id" ON public.scenarios;

CREATE OR REPLACE FUNCTION public.get_shared_scenario(p_share_id text)
RETURNS TABLE (
  id bigint,
  client_id bigint,
  data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  client_display_name text,
  agent_display_name text,
  company_display_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.client_id, s.data, s.created_at, s.updated_at,
         s.client_display_name, s.agent_display_name, s.company_display_name
  FROM public.scenarios s
  WHERE p_share_id IS NOT NULL AND s.share_id = p_share_id;
$$;

-- Bundles company branding: the onboarding page previously tried to read
-- companies anonymously, which RLS silently blocked (white-label branding
-- never showed on onboarding forms).
CREATE OR REPLACE FUNCTION public.get_onboarding_scenario(p_onboarding_id text)
RETURNS TABLE (
  id bigint,
  data jsonb,
  company_id uuid,
  client_display_name text,
  agent_display_name text,
  company_display_name text,
  company_name text,
  company_logo_url text,
  company_primary_color text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.data, s.company_id,
         s.client_display_name, s.agent_display_name, s.company_display_name,
         c.name, c.logo_url, c.primary_color
  FROM public.scenarios s
  LEFT JOIN public.companies c ON c.id = s.company_id
  WHERE p_onboarding_id IS NOT NULL AND s.onboarding_id = p_onboarding_id;
$$;

CREATE OR REPLACE FUNCTION public.submit_onboarding_scenario(p_onboarding_id text, p_data jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_onboarding_id IS NULL OR p_data IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.scenarios
  SET data = p_data, updated_at = now()
  WHERE onboarding_id = p_onboarding_id;
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.get_shared_scenario(text) FROM public;
REVOKE ALL ON FUNCTION public.get_onboarding_scenario(text) FROM public;
REVOKE ALL ON FUNCTION public.submit_onboarding_scenario(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_scenario(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_scenario(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_onboarding_scenario(text, jsonb) TO anon, authenticated;

-- Follow-up hardening after the paywall re-audit (31 Jul 2026).
-- Closes gaps that undermine the column-lock guards shipped earlier today,
-- plus one pre-existing critical PII leak that is trivially safe to fix.

-- 1) owner_id was NOT covered by the companies guard, so a company member
--    (including a portal client with a company_id) could rewrite owner_id to
--    themselves and then delete/own the company. Add it to the guard.
CREATE OR REPLACE FUNCTION public.guard_companies_protected_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_service_context() THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.client_roadmaps_limit IS DISTINCT FROM OLD.client_roadmaps_limit
     OR NEW.billing_period_start IS DISTINCT FROM OLD.billing_period_start
     OR NEW.billing_period_end IS DISTINCT FROM OLD.billing_period_end
     OR NEW.seat_limit IS DISTINCT FROM OLD.seat_limit
  THEN
    RAISE EXCEPTION 'PROTECTED_COLUMNS: ownership, billing and seat fields can only be changed server-side';
  END IF;
  RETURN NEW;
END $$;

-- 2) The profiles guard only fired on UPDATE. The INSERT policy checks only
--    id = auth.uid(), so a user with no profile row (e.g. if handle_new_user's
--    exception handler swallowed an error) could self-insert role='owner' with
--    an arbitrary company_id and escalate. Guard INSERT too. The only benign
--    client-side insert path (a profile upsert that writes just id + data)
--    leaves role/company_id NULL, so it still passes.
CREATE OR REPLACE FUNCTION public.guard_profiles_protected_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_service_context() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NOT NULL
       OR NEW.company_id IS NOT NULL
       OR NEW.subscription_status IS DISTINCT FROM 'inactive'
       OR NEW.subscription_tier IS DISTINCT FROM 'free'
       OR NEW.stripe_customer_id IS NOT NULL
       OR NEW.stripe_subscription_id IS NOT NULL
       OR coalesce(NEW.client_roadmaps_limit, 0) <> 0
    THEN
      RAISE EXCEPTION 'PROTECTED_COLUMNS: role, company and subscription fields are assigned server-side only';
    END IF;
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
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_protected_columns();

-- 3) get_team_members (SECURITY DEFINER, joins auth.users for email) had no
--    authorization check and anon EXECUTE, so anyone could dump a company's
--    staff names + emails by passing its id. Gate the body to callers who are
--    actually members of that company, and drop anon access.
CREATE OR REPLACE FUNCTION public.get_team_members(p_company_id uuid)
RETURNS TABLE(id uuid, full_name text, email text, role text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, u.email, p.role::text, p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.company_id = p_company_id
    AND p.role IN ('owner', 'agent')
    AND EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid() AND me.company_id = p_company_id
    );
$$;

REVOKE ALL ON FUNCTION public.get_team_members(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_team_members(uuid) TO authenticated;

-- 4) upsert_ai_usage is an accounting function only ever called by the
--    service-role nl-parse edge function, yet anon could call it with an
--    arbitrary user_id to corrupt usage counters. Remove it from the public
--    REST surface (service-role calls are unaffected).
--    NOTE: client_id_for_user / company_id_for_user are intentionally left
--    executable — they are referenced inside the clients/companies/scenarios
--    RLS policies, and revoking `authenticated` EXECUTE breaks those policies
--    (verified: "permission denied for function company_id_for_user"). Their
--    uuid-linkage leak is tracked as a separate follow-up.
REVOKE ALL ON FUNCTION public.upsert_ai_usage(uuid, text, bigint, bigint, bigint) FROM anon, authenticated, public;

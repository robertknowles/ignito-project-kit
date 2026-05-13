-- =====================================================================
-- PropPath internal CRM tables
-- =====================================================================

-- Enums --------------------------------------------------------------
CREATE TYPE public.crm_relevance_tier AS ENUM ('high', 'medium', 'low');

CREATE TYPE public.crm_contact_status AS ENUM (
  'not_contacted',
  'connection_sent',
  'connected',
  'video_sent',
  'replied',
  'demo_booked',
  'beta_tester',
  'dead'
);

-- Admin gate ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_proppath_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT lower(email)
     FROM auth.users
     WHERE id = auth.uid()) IN (
       'rob@proppath.com.au',
       'james@proppath.com.au',
       'rk@hyperhq.com'
     ),
    false
  );
$$;

COMMENT ON FUNCTION public.is_proppath_admin() IS
  'Returns true if the current authenticated user is a PropPath internal admin (Rob or James). Used in RLS policies on crm_* tables.';

-- Companies ----------------------------------------------------------
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  relevance_tier public.crm_relevance_tier NOT NULL DEFAULT 'medium',
  employees integer,
  state text,
  website text,
  blurb text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.crm_companies IS
  'PropPath sales target accounts. One row per BA agency. size_tier is derived in the application layer from employees.';

CREATE INDEX idx_crm_companies_relevance_employees
  ON public.crm_companies(relevance_tier, employees ASC NULLS LAST);

-- Contacts -----------------------------------------------------------
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  title text,
  linkedin_url text,
  status public.crm_contact_status NOT NULL DEFAULT 'not_contacted',
  connection_sent_at timestamptz,
  video_sent_at timestamptz,
  replied_at timestamptz,
  last_touch_at timestamptz,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.crm_contacts IS
  'Individual people inside CRM companies. Status drives the pipeline kanban.';

CREATE INDEX idx_crm_contacts_company_id ON public.crm_contacts(company_id);
CREATE INDEX idx_crm_contacts_status ON public.crm_contacts(status);
CREATE INDEX idx_crm_contacts_next_action_at
  ON public.crm_contacts(next_action_at)
  WHERE next_action_at IS NOT NULL;

-- updated_at triggers ------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_crm_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_companies_updated_at
  BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_crm_set_updated_at();

CREATE TRIGGER trg_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_crm_set_updated_at();

-- RLS ----------------------------------------------------------------
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PropPath admins manage crm_companies"
  ON public.crm_companies
  FOR ALL
  USING (public.is_proppath_admin())
  WITH CHECK (public.is_proppath_admin());

CREATE POLICY "PropPath admins manage crm_contacts"
  ON public.crm_contacts
  FOR ALL
  USING (public.is_proppath_admin())
  WITH CHECK (public.is_proppath_admin());

-- =====================================================================
-- Custom pipeline stages for the CRM kanban (View 2)
-- =====================================================================
-- Built-in stages stay hard-coded in the app (lib/crmHelpers.ts).
-- This table holds admin-created columns; contacts sit in one via
-- crm_contacts.status = stage_key.

CREATE TABLE public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key text NOT NULL UNIQUE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  duration_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_pipeline_stages_key_format
    CHECK (stage_key ~ '^[a-z0-9_]+$'),
  CONSTRAINT crm_pipeline_stages_key_not_reserved
    CHECK (stage_key NOT IN (
      'not_contacted', 'connection_sent', 'connected', 'video_sent',
      'replied', 'demo_booked', 'beta_tester', 'dead'
    ))
);

COMMENT ON TABLE public.crm_pipeline_stages IS
  'Admin-created kanban columns for the CRM pipeline view. duration_days drives the overdue flag, same as the built-in stages.';

CREATE TRIGGER trg_crm_pipeline_stages_updated_at
  BEFORE UPDATE ON public.crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.tg_crm_set_updated_at();

ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PropPath admins manage crm_pipeline_stages"
  ON public.crm_pipeline_stages
  FOR ALL
  USING (public.is_proppath_admin())
  WITH CHECK (public.is_proppath_admin());

-- Loosen contact status from enum to text so contacts can sit in
-- custom stages. The app still treats the original eight as built-ins.
ALTER TABLE public.crm_contacts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.crm_contacts ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.crm_contacts ALTER COLUMN status SET DEFAULT 'not_contacted';

DROP TYPE public.crm_contact_status;

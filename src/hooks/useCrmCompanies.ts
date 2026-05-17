import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyWithContacts, sortCompaniesForMap } from '@/lib/crmHelpers';

export function useCrmCompanies() {
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('crm_companies')
      .select(`
        id, name, relevance_tier, employees, state, website, blurb, notes,
        contacts:crm_contacts (
          id, company_id, full_name, title, linkedin_url, status,
          connection_sent_at, video_sent_at, replied_at,
          last_touch_at, next_action_at, notes, assigned_to
        )
      `);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCompanies(sortCompaniesForMap((data ?? []) as unknown as CompanyWithContacts[]));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { companies, loading, error, refetch: fetchAll };
}

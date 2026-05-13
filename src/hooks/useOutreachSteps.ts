import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OutreachStep {
  id: string;
  step_key: string;
  step_order: number;
  day_label: string;
  step_title: string;
  description: string | null;
  template_male: string | null;
  template_female: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useOutreachSteps() {
  const [steps, setSteps] = useState<OutreachStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('crm_outreach_steps')
      .select('*')
      .order('step_order', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setSteps((data ?? []) as OutreachStep[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { steps, loading, error, refetch: fetchAll };
}

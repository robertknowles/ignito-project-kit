import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OutreachStep } from './useOutreachSteps';

export function useUpdateOutreachStep() {
  const updateStep = useCallback(
    async (stepId: string, patch: Partial<OutreachStep>) => {
      const { error } = await supabase
        .from('crm_outreach_steps')
        .update(patch)
        .eq('id', stepId);

      if (error) {
        toast.error(`Failed to save: ${error.message}`);
        throw error;
      }
      toast.success('Saved');
    },
    []
  );

  return updateStep;
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PipelineStageRow, RESERVED_STAGE_KEYS, stageKeyFromLabel } from '@/lib/crmHelpers';
import { toast } from 'sonner';

export function useCrmPipelineStages() {
  const [stages, setStages] = useState<PipelineStageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStages = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_pipeline_stages')
      .select('id, stage_key, label, position, duration_days')
      .order('position', { ascending: true });
    if (error) {
      toast.error('Failed to load pipeline columns');
    } else {
      setStages((data ?? []) as PipelineStageRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  const addStage = useCallback(async (label: string): Promise<boolean> => {
    const trimmed = label.trim();
    if (!trimmed) return false;

    const stageKey = stageKeyFromLabel(trimmed);
    if (!stageKey) {
      toast.error('Column name needs at least one letter or number');
      return false;
    }
    if ((RESERVED_STAGE_KEYS as readonly string[]).includes(stageKey)) {
      toast.error('That column already exists in the pipeline');
      return false;
    }
    if (stages.some(s => s.stage_key === stageKey)) {
      toast.error('A column with that name already exists');
      return false;
    }

    const nextPosition = stages.reduce((max, s) => Math.max(max, s.position), 0) + 1;
    const { error } = await supabase
      .from('crm_pipeline_stages')
      .insert({ stage_key: stageKey, label: trimmed, position: nextPosition });

    if (error) {
      toast.error('Failed to add column');
      return false;
    }
    toast.success(`Column "${trimmed}" added`);
    await fetchStages();
    return true;
  }, [stages, fetchStages]);

  const deleteStage = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('crm_pipeline_stages')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete column');
    } else {
      toast.success('Column deleted');
      await fetchStages();
    }
  }, [fetchStages]);

  const updateStageDuration = useCallback(async (id: string, days: number | null) => {
    const { error } = await supabase
      .from('crm_pipeline_stages')
      .update({ duration_days: days })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update follow-up duration');
    } else {
      await fetchStages();
    }
  }, [fetchStages]);

  return { stages, loading, addStage, deleteStage, updateStageDuration };
}

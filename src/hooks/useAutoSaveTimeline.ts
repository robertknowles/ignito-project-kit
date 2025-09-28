import { useEffect } from 'react';
import { useAutoSave } from '@/contexts/AutoSaveContext';
import { useClient } from '@/contexts/ClientContext';

interface TimelineResults {
  properties: any[];
  calculations: any;
  status: string;
  lastCalculated: string;
}

// Hook for auto-saving timeline calculation results
export const useAutoSaveTimeline = (timelineData: any, calculations: any) => {
  const { saveClientData, markAsChanged } = useAutoSave();
  const { activeClient } = useClient();

  useEffect(() => {
    if (activeClient?.id && timelineData && calculations) {
      const timelineResults: TimelineResults = {
        properties: timelineData,
        calculations,
        status: 'calculated',
        lastCalculated: new Date().toISOString(),
      };

      markAsChanged();
      saveClientData({ timelineResults });
    }
  }, [timelineData, calculations, activeClient?.id, saveClientData, markAsChanged]);
};
import React from 'react';
import { Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useClient } from '@/contexts/ClientContext';

export const SaveButton: React.FC = () => {
  const { hasUnsavedChanges, isLoading, saveScenario } = useScenarioSave();
  const { activeClient } = useClient();

  if (!activeClient || !hasUnsavedChanges) {
    return null;
  }

  return (
    <Button
      onClick={saveScenario}
      disabled={isLoading}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isLoading ? (
        <Clock className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {isLoading ? 'Saving...' : 'Save Scenario'}
    </Button>
  );
};
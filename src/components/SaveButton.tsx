import React from 'react';
import { Save, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useClient } from '@/contexts/ClientContext';

export const SaveButton: React.FC = () => {
  const { hasUnsavedChanges, isLoading, lastSaved, saveScenario } = useScenarioSave();
  const { activeClient } = useClient();

  if (!activeClient || !hasUnsavedChanges) {
    return null;
  }

  const formatLastSaved = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `Last saved: ${date.toLocaleTimeString()}`;
  };

  return (
    <div className="flex items-center gap-3">
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
      
      {lastSaved && !hasUnsavedChanges && (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle className="h-3 w-3" />
          {formatLastSaved(lastSaved)}
        </div>
      )}
    </div>
  );
};
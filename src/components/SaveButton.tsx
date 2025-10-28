import React from 'react';
import { Save, Clock } from 'lucide-react';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useClient } from '@/contexts/ClientContext';

interface SaveButtonProps {
  iconOnly?: boolean;
}

export const SaveButton: React.FC<SaveButtonProps> = ({ iconOnly = false }) => {
  const { hasUnsavedChanges, isLoading, saveScenario } = useScenarioSave();
  const { activeClient } = useClient();

  if (!activeClient || !hasUnsavedChanges) {
    return null;
  }

  if (iconOnly) {
    return (
      <button
        onClick={saveScenario}
        disabled={isLoading}
        className="w-8 h-8 text-[#6b7280] hover:text-[#3b82f6] hover:opacity-60 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Clock size={15} className="animate-spin" />
        ) : (
          <Save size={15} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={saveScenario}
      disabled={isLoading}
      className="flex items-center gap-2 h-8 bg-[#3b82f6] bg-opacity-60 hover:bg-opacity-80 text-white px-3 rounded-md text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Clock className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      {isLoading ? 'Saving...' : 'Save Scenario'}
    </button>
  );
};
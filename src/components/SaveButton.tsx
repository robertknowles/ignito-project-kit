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

  // Don't show button at all if no client selected
  if (!activeClient) {
    return null;
  }

  if (iconOnly) {
    return (
      <button
        onClick={saveScenario}
        disabled={isLoading || !hasUnsavedChanges}
        className="w-8 h-8 text-gray-500 hover:text-gray-900 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
      disabled={isLoading || !hasUnsavedChanges}
      className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg font-medium text-[12px] hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Clock size={14} className="animate-spin" />
      ) : (
        <Save size={14} />
      )}
      {isLoading ? 'Saving...' : 'Save Scenario'}
    </button>
  );
};
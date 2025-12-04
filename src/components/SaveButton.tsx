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
        className="w-8 h-8 text-[#6b7280] hover:text-[#3b82f6] hover:opacity-60 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Clock size={16} className="animate-spin" />
      ) : (
        <Save size={16} />
      )}
      {isLoading ? 'Saving...' : 'Save Scenario'}
    </button>
  );
};
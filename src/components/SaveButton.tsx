import React from 'react';
import { Save, Clock } from 'lucide-react';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useClient } from '@/contexts/ClientContext';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';

interface SaveButtonProps {
  iconOnly?: boolean;
}

export const SaveButton: React.FC<SaveButtonProps> = ({ iconOnly = false }) => {
  const { hasUnsavedChanges, isLoading, saveScenario } = useScenarioSave();
  const { activeClient } = useClient();
  const { isMultiScenarioMode, scenarios } = useMultiScenario();

  // Don't show button at all if no client selected
  if (!activeClient) {
    return null;
  }

  if (iconOnly) {
    return (
      <button
        onClick={() => saveScenario()}
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

  // Determine button text based on mode
  const buttonText = isLoading 
    ? 'Saving...' 
    : isMultiScenarioMode && scenarios.length >= 2
      ? `Save ${scenarios.length} Scenarios`
      : 'Save Scenario';

  return (
    <button
      onClick={() => saveScenario()}
      disabled={isLoading || !hasUnsavedChanges}
      className="flex items-center gap-1.5 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-[13px] hover:bg-gray-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Clock size={15} className="animate-spin" />
      ) : (
        <Save size={15} />
      )}
      {buttonText}
    </button>
  );
};
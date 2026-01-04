import React, { useState } from 'react';
import { RotateCcw, Clock } from 'lucide-react';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useClient } from '@/contexts/ClientContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ResetButtonProps {
  iconOnly?: boolean;
}

export const ResetButton: React.FC<ResetButtonProps> = ({ iconOnly = false }) => {
  const { hasUnsavedChanges, isLoading, resetScenario, scenarioId } = useScenarioSave();
  const { activeClient } = useClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Don't show button at all if no client selected
  if (!activeClient) {
    return null;
  }

  // Enable reset if there's a saved scenario OR unsaved changes (i.e., any data to clear)
  const hasDataToClear = scenarioId !== null || hasUnsavedChanges;

  const handleResetClick = () => {
    if (hasDataToClear) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmReset = () => {
    setShowConfirmDialog(false);
    resetScenario();
  };

  if (iconOnly) {
    return (
      <>
        <button
          onClick={handleResetClick}
          disabled={isLoading || !hasDataToClear}
          className="w-8 h-8 text-gray-500 hover:text-gray-900 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Clear scenario"
        >
          {isLoading ? (
            <Clock size={15} className="animate-spin" />
          ) : (
            <RotateCcw size={15} />
          )}
        </button>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Scenario?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all scenario data for {activeClient.name} and delete it from the database. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmReset}
                className="bg-red-600 hover:bg-red-700"
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleResetClick}
        disabled={isLoading || !hasDataToClear}
        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg font-medium text-[13px] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Clock size={16} className="animate-spin" />
        ) : (
          <RotateCcw size={16} />
        )}
        {isLoading ? 'Resetting...' : 'Reset Scenario'}
      </button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Scenario?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all scenario data for {activeClient.name} and delete it from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-red-600 hover:bg-red-700"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


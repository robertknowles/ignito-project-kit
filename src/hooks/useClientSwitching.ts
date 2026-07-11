import { useEffect, useRef } from 'react';
import { useClient } from '@/contexts/ClientContext';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { useLocation } from 'react-router-dom';

export const useClientSwitching = () => {
  const { activeClient } = useClient();
  const { hasUnsavedChanges } = useScenarioSave();
  const { loadClientData: loadPropertyData, isLoading } = usePropertySelection();
  const location = useLocation();

  // Track the last loaded client to prevent unnecessary reloads
  const lastLoadedClientRef = useRef<number | null>(null);

  // Handle client switching - only when client ID actually changes.
  //
  // Removed the "Client Loaded" toast (founder report 2026-05-06): on the
  // Home → new-client flow it fires after the new client lands but before
  // the pending prompt's AI response, looking like a competing system
  // notification. The toast added no information the UI doesn't already
  // show via the ClientSelector / chat panel.
  //
  // Removed activeClient?.name from the deps too - name updates (e.g. when
  // the AI extracts a real name and replaces "Untitled Client") would
  // re-fire this effect even though id was unchanged, which was wasteful.
  useEffect(() => {
    if (activeClient && activeClient.id !== lastLoadedClientRef.current) {
      lastLoadedClientRef.current = activeClient.id;
      loadPropertyData(activeClient.id);
    }
  }, [activeClient?.id, loadPropertyData]);

  return {
    hasUnsavedChanges,
    isLoading,
  };
};
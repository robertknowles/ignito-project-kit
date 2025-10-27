import { useEffect, useRef } from 'react';
import { useClient } from '@/contexts/ClientContext';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { toast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';

export const useClientSwitching = () => {
  const { activeClient } = useClient();
  const { hasUnsavedChanges } = useScenarioSave();
  const { loadClientData: loadPropertyData, isLoading, selections } = usePropertySelection();
  const location = useLocation();

  // Track the last loaded client to prevent unnecessary reloads
  const lastLoadedClientRef = useRef<number | null>(null);
  
  // Log selection changes for debugging
  useEffect(() => {
    console.log('useClientSwitching: selections updated', {
      pathname: location.pathname,
      selections,
      activeClientId: activeClient?.id
    });
  }, [selections, location.pathname, activeClient?.id]);
  
  // Handle client switching - only when client ID actually changes
  useEffect(() => {
    console.log('useClientSwitching: Effect triggered', {
      pathname: location.pathname,
      activeClientId: activeClient?.id,
      activeClientName: activeClient?.name,
      lastLoaded: lastLoadedClientRef.current,
      shouldLoad: activeClient && activeClient.id !== lastLoadedClientRef.current
    });
    
    if (activeClient && activeClient.id !== lastLoadedClientRef.current) {
      console.log('useClientSwitching: Client changed, loading new data for:', activeClient.id, 'on path:', location.pathname);
      lastLoadedClientRef.current = activeClient.id;
      
      // Load property selection data
      loadPropertyData(activeClient.id);
      
      // Show toast notification
      toast({
        title: "Client Loaded",
        description: `Switched to ${activeClient.name}'s scenario`,
      });
    }
  }, [activeClient?.id, activeClient?.name, loadPropertyData, location.pathname]);

  return {
    hasUnsavedChanges,
    isLoading,
  };
};
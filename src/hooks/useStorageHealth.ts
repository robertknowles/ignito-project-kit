import { useState, useEffect, useCallback } from 'react';
import { ClientDataManager } from '@/utils/clientDataManager';

interface StorageHealth {
  isAvailable: boolean;
  usage: {
    used: number;
    available: number;
    percentage: number;
  };
  clientCount: number;
  isLowSpace: boolean;
  isNearLimit: boolean;
}

export const useStorageHealth = () => {
  const [health, setHealth] = useState<StorageHealth>({
    isAvailable: false,
    usage: { used: 0, available: 0, percentage: 0 },
    clientCount: 0,
    isLowSpace: false,
    isNearLimit: false,
  });

  const checkHealth = useCallback(() => {
    const isAvailable = ClientDataManager.checkStorageAvailability();
    const usage = ClientDataManager.getStorageUsage();
    const clientCount = ClientDataManager.getAllClientIds().length;
    const isLowSpace = usage.percentage > 75;
    const isNearLimit = usage.percentage > 90;

    setHealth({
      isAvailable,
      usage,
      clientCount,
      isLowSpace,
      isNearLimit,
    });
  }, []);

  const cleanup = useCallback(() => {
    const cleaned = ClientDataManager.cleanupCorruptedData();
    checkHealth(); // Refresh after cleanup
    return cleaned;
  }, [checkHealth]);

  const clearAll = useCallback(() => {
    ClientDataManager.clearAllClientData();
    checkHealth(); // Refresh after clearing
  }, [checkHealth]);

  const createBackup = useCallback(() => {
    return ClientDataManager.createBackup();
  }, []);

  const restoreBackup = useCallback((backupData: string) => {
    const success = ClientDataManager.restoreFromBackup(backupData);
    if (success) {
      checkHealth(); // Refresh after restore
    }
    return success;
  }, [checkHealth]);

  // Check health on mount and set up periodic checks
  useEffect(() => {
    checkHealth();
    
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    health,
    checkHealth,
    cleanup,
    clearAll,
    createBackup,
    restoreBackup,
  };
};
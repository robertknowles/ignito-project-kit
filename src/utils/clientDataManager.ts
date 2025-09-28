import { ClientScenarioData } from '@/contexts/AutoSaveContext';

const STORAGE_KEY_PREFIX = 'lovable_client_scenario_';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

export class ClientDataManager {
  static getStorageKey(clientId: number): string {
    return `${STORAGE_KEY_PREFIX}${clientId}`;
  }

  static checkStorageAvailability(): boolean {
    try {
      const testKey = 'storage_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  static getStorageUsage(): { used: number; available: number; percentage: number } {
    let used = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            used += new Blob([value]).size;
          }
        }
      }
    } catch (error) {
      console.warn('Could not calculate storage usage:', error);
    }

    const available = MAX_STORAGE_SIZE - used;
    const percentage = (used / MAX_STORAGE_SIZE) * 100;

    return { used, available, percentage };
  }

  static getAllClientIds(): number[] {
    const clientIds: number[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          const clientId = parseInt(key.replace(STORAGE_KEY_PREFIX, ''), 10);
          if (!isNaN(clientId)) {
            clientIds.push(clientId);
          }
        }
      }
    } catch (error) {
      console.warn('Could not retrieve client IDs:', error);
    }
    return clientIds.sort((a, b) => a - b);
  }

  static validateClientData(data: any): data is ClientScenarioData {
    if (!data || typeof data !== 'object') return false;
    
    const required = ['clientId', 'lastSaved', 'propertySelections', 'globalFactors', 'propertyAssumptions', 'investmentProfile'];
    
    for (const field of required) {
      if (!(field in data)) return false;
    }

    // Basic type checks
    if (typeof data.clientId !== 'number') return false;
    if (typeof data.lastSaved !== 'string') return false;
    if (typeof data.propertySelections !== 'object') return false;
    if (typeof data.globalFactors !== 'object') return false;
    if (!Array.isArray(data.propertyAssumptions)) return false;
    if (typeof data.investmentProfile !== 'object') return false;

    return true;
  }

  static cleanupCorruptedData(): number {
    let cleaned = 0;
    const toRemove: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              if (!this.validateClientData(parsed)) {
                toRemove.push(key);
              }
            } catch {
              toRemove.push(key);
            }
          }
        }
      }

      // Remove corrupted entries
      toRemove.forEach(key => {
        localStorage.removeItem(key);
        cleaned++;
      });

      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} corrupted client data entries`);
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }

    return cleaned;
  }

  static exportClientData(clientId: number): string | null {
    try {
      const key = this.getStorageKey(clientId);
      const data = localStorage.getItem(key);
      return data;
    } catch (error) {
      console.error('Error exporting client data:', error);
      return null;
    }
  }

  static importClientData(clientId: number, data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (!this.validateClientData(parsed)) {
        throw new Error('Invalid data format');
      }

      // Update client ID to match import target
      parsed.clientId = clientId;
      parsed.lastSaved = new Date().toISOString();

      const key = this.getStorageKey(clientId);
      localStorage.setItem(key, JSON.stringify(parsed));
      return true;
    } catch (error) {
      console.error('Error importing client data:', error);
      return false;
    }
  }

  static createBackup(): string {
    const backup: Record<string, any> = {};
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            backup[key] = JSON.parse(value);
          }
        }
      }
    } catch (error) {
      console.error('Error creating backup:', error);
    }

    return JSON.stringify(backup, null, 2);
  }

  static restoreFromBackup(backupData: string): boolean {
    try {
      const backup = JSON.parse(backupData);
      
      // Validate backup format
      for (const [key, data] of Object.entries(backup)) {
        if (!key.startsWith(STORAGE_KEY_PREFIX) || !this.validateClientData(data)) {
          throw new Error('Invalid backup format');
        }
      }

      // Clear existing client data
      this.clearAllClientData();

      // Restore from backup
      for (const [key, data] of Object.entries(backup)) {
        localStorage.setItem(key, JSON.stringify(data));
      }

      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }

  static clearAllClientData(): void {
    const toRemove: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          toRemove.push(key);
        }
      }

      toRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${toRemove.length} client data entries`);
    } catch (error) {
      console.error('Error clearing all client data:', error);
    }
  }

  static getLastModified(clientId: number): Date | null {
    try {
      const key = this.getStorageKey(clientId);
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return new Date(parsed.lastSaved);
      }
    } catch (error) {
      console.warn('Error getting last modified date:', error);
    }
    return null;
  }
}
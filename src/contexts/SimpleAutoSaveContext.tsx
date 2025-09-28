import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface SaveStatus {
  isSaving: boolean;
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

interface SimpleAutoSaveContextType {
  saveStatus: SaveStatus;
  saveData: (key: string, data: any) => void;
  loadData: (key: string) => any | null;
  setSaveIndicator: (saving: boolean) => void;
}

const SimpleAutoSaveContext = createContext<SimpleAutoSaveContextType | undefined>(undefined);

export const useSimpleAutoSave = () => {
  const context = useContext(SimpleAutoSaveContext);
  if (context === undefined) {
    throw new Error('useSimpleAutoSave must be used within a SimpleAutoSaveProvider');
  }
  return context;
};

interface SimpleAutoSaveProviderProps {
  children: ReactNode;
}

export const SimpleAutoSaveProvider: React.FC<SimpleAutoSaveProviderProps> = ({ children }) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
  });

  const saveData = useCallback((key: string, data: any) => {
    setSaveStatus(prev => ({ ...prev, isSaving: true }));
    
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
      
      setSaveStatus(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date().toISOString(),
        hasUnsavedChanges: false,
        error: null
      }));
    } catch (error) {
      setSaveStatus(prev => ({
        ...prev,
        isSaving: false,
        error: 'Failed to save data'
      }));
    }
  }, []);

  const loadData = useCallback((key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.data;
      }
    } catch (error) {
      console.warn('Failed to load data for key:', key);
    }
    return null;
  }, []);

  const setSaveIndicator = useCallback((saving: boolean) => {
    setSaveStatus(prev => ({ ...prev, isSaving: saving }));
  }, []);

  const value = {
    saveStatus,
    saveData,
    loadData,
    setSaveIndicator,
  };

  return (
    <SimpleAutoSaveContext.Provider value={value}>
      {children}
    </SimpleAutoSaveContext.Provider>
  );
};
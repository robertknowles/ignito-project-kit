import React, { createContext, useContext, useState, useCallback } from 'react';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { getPropertyInstanceDefaults } from '../utils/propertyInstanceDefaults';

interface PropertyInstanceContextType {
  instances: Record<string, PropertyInstanceDetails>;
  createInstance: (instanceId: string, propertyType: string, period: number) => void;
  updateInstance: (instanceId: string, updates: Partial<PropertyInstanceDetails>) => void;
  deleteInstance: (instanceId: string) => void;
  getInstance: (instanceId: string) => PropertyInstanceDetails | undefined;
  setInstances: (instances: Record<string, PropertyInstanceDetails>) => void;
}

const PropertyInstanceContext = createContext<PropertyInstanceContextType | undefined>(undefined);

export const usePropertyInstance = () => {
  const context = useContext(PropertyInstanceContext);
  if (!context) {
    throw new Error('usePropertyInstance must be used within PropertyInstanceProvider');
  }
  return context;
};

export const PropertyInstanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [instances, setInstances] = useState<Record<string, PropertyInstanceDetails>>({});

  const createInstance = useCallback((instanceId: string, propertyType: string, period: number) => {
    console.log('Creating instance:', instanceId, propertyType, period);
    const defaults = getPropertyInstanceDefaults(propertyType);
    setInstances(prev => ({
      ...prev,
      [instanceId]: defaults,
    }));
  }, []);

  const updateInstance = useCallback((instanceId: string, updates: Partial<PropertyInstanceDetails>) => {
    setInstances(prev => ({
      ...prev,
      [instanceId]: {
        ...prev[instanceId],
        ...updates,
      },
    }));
  }, []);

  const deleteInstance = useCallback((instanceId: string) => {
    setInstances(prev => {
      const newInstances = { ...prev };
      delete newInstances[instanceId];
      return newInstances;
    });
  }, []);

  const getInstance = useCallback((instanceId: string) => {
    return instances[instanceId];
  }, [instances]);

  return (
    <PropertyInstanceContext.Provider
      value={{
        instances,
        createInstance,
        updateInstance,
        deleteInstance,
        getInstance,
        setInstances,
      }}
    >
      {children}
    </PropertyInstanceContext.Provider>
  );
};


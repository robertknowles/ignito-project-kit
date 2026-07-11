import React, { createContext, useContext, useState, useCallback } from 'react';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { getPropertyInstanceDefaults, applyGlobalCostDefaults } from '../utils/propertyInstanceDefaults';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';

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
  const { profile } = useInvestmentProfile();

  const createInstance = useCallback((instanceId: string, propertyType: string, period: number) => {
    // Overlay the BA's global Next-Purchase cost defaults (Assumptions page)
    // onto the per-type defaults. Applied here at materialisation so only
    // FUTURE purchases pick them up - existing instances are untouched.
    const defaults = applyGlobalCostDefaults(getPropertyInstanceDefaults(propertyType), profile);

    // Ensure state is always set (fallback to VIC if missing)
    // Set valuationAtPurchase to purchasePrice by default so users don't have to manually enter it
    const instanceWithState: PropertyInstanceDetails = {
      ...defaults,
      state: defaults.state || 'VIC',
      valuationAtPurchase: defaults.purchasePrice,
    };
    
    setInstances(prev => ({
      ...prev,
      [instanceId]: instanceWithState,
    }));
  }, [profile]);

  const updateInstance = useCallback((instanceId: string, updates: Partial<PropertyInstanceDetails>) => {
    setInstances(prev => {
      const existing = prev[instanceId];
      const merged = { ...existing, ...updates };

      // Auto-sync: when purchasePrice changes and valuation hasn't been
      // manually overridden, keep valuationAtPurchase in lockstep.
      if (
        updates.purchasePrice !== undefined &&
        updates.valuationAtPurchase === undefined &&
        !existing?.valuationAtPurchaseManual
      ) {
        merged.valuationAtPurchase = updates.purchasePrice;
      }

      // Flag manual override: when valuationAtPurchase is edited directly
      // (without purchasePrice in the same update), mark it as manual.
      if (
        updates.valuationAtPurchase !== undefined &&
        updates.purchasePrice === undefined
      ) {
        merged.valuationAtPurchaseManual = true;
      }

      return { ...prev, [instanceId]: merged };
    });
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

  // Wrapper for setInstances
  const setInstancesWrapper = useCallback((newInstances: Record<string, PropertyInstanceDetails>) => {
    setInstances(newInstances);
  }, []);

  return (
    <PropertyInstanceContext.Provider
      value={{
        instances,
        createInstance,
        updateInstance,
        deleteInstance,
        getInstance,
        setInstances: setInstancesWrapper,
      }}
    >
      {children}
    </PropertyInstanceContext.Provider>
  );
};


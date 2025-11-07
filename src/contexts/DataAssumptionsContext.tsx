import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import propertyDefaults from '../data/property-defaults.json';

export interface PropertyAssumption extends PropertyInstanceDetails {
  // Keep existing fields for backward compatibility
  type: string;
  averageCost: string;
  yield: string;
  growthYear1: string;
  growthYears2to3: string;
  growthYear4: string;
  growthYear5plus: string;
  deposit: string;
  loanType?: 'IO' | 'PI';
}

export interface GlobalEconomicFactors {
  growthRate: string;
  loanToValueRatio: string;
  interestRate: string;
}

interface DataAssumptionsContextType {
  globalFactors: GlobalEconomicFactors;
  propertyAssumptions: PropertyAssumption[];
  updateGlobalFactor: (factor: keyof GlobalEconomicFactors, value: string) => void;
  updatePropertyAssumption: (index: number, field: keyof PropertyAssumption, value: string) => void;
  getPropertyData: (propertyType: string) => PropertyAssumption | undefined;
}

const DataAssumptionsContext = createContext<DataAssumptionsContextType | undefined>(undefined);

export const useDataAssumptions = () => {
  const context = useContext(DataAssumptionsContext);
  if (context === undefined) {
    throw new Error('useDataAssumptions must be used within a DataAssumptionsProvider');
  }
  return context;
};

interface DataAssumptionsProviderProps {
  children: React.ReactNode;
}

/**
 * Converts property defaults key to display name
 */
const keyToDisplayName = (key: string): string => {
  const map: Record<string, string> = {
    'units-apartments': 'Units / Apartments',
    'villas-townhouses': 'Villas / Townhouses',
    'houses-regional': 'Houses (Regional focus)',
    'duplexes': 'Duplexes',
    'small-blocks-3-4-units': 'Small Blocks (3-4 units)',
    'metro-houses': 'Metro Houses',
    'larger-blocks-10-20-units': 'Larger Blocks (10-20 units)',
    'commercial-property': 'Commercial Property',
  };
  return map[key] || key;
};

/**
 * Converts property defaults JSON to PropertyAssumption format
 */
const convertToPropertyAssumption = (key: string, defaults: PropertyInstanceDetails): PropertyAssumption => {
  return {
    // Existing fields (for backward compatibility)
    type: keyToDisplayName(key),
    averageCost: defaults.purchasePrice.toString(),
    yield: ((defaults.rentPerWeek * 52 / defaults.purchasePrice) * 100).toFixed(1),
    growthYear1: '12.5',
    growthYears2to3: '10',
    growthYear4: '7.5',
    growthYear5plus: '6',
    deposit: (100 - defaults.lvr).toString(),
    loanType: defaults.loanProduct,
    
    // All 34 new fields
    ...defaults,
  };
};

/**
 * Initialize default property assumptions from property-defaults.json
 */
const initializePropertyAssumptions = (): PropertyAssumption[] => {
  return Object.keys(propertyDefaults).map(key => 
    convertToPropertyAssumption(
      key, 
      propertyDefaults[key as keyof typeof propertyDefaults] as PropertyInstanceDetails
    )
  );
};

export const DataAssumptionsProvider: React.FC<DataAssumptionsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevAssumptionsRef = useRef<string>('');

  const [globalFactors, setGlobalFactors] = useState<GlobalEconomicFactors>({
    growthRate: '7',
    loanToValueRatio: '80',
    interestRate: '6',
  });

  const [propertyAssumptions, setPropertyAssumptions] = useState<PropertyAssumption[]>(
    initializePropertyAssumptions()
  );

  const saveAssumptionsToProfile = useCallback(async () => {
    if (!user) {
      console.log('DataAssumptionsContext: No user, skipping save');
      return;
    }

    console.log('DataAssumptionsContext: Saving assumptions to profile for user:', user.id);
    console.log('DataAssumptionsContext: Data to save:', {
      propertyAssumptions: propertyAssumptions,
      globalFactors: globalFactors,
    });

    try {
      const dataToSave = {
        propertyAssumptions: propertyAssumptions,
        globalFactors: globalFactors,
      };

      // Use upsert to handle both insert and update cases
      const { error, data } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          data: dataToSave,
        })
        .select();

      if (error) {
        console.error('DataAssumptionsContext: Error saving:', error);
        throw error;
      }

      console.log('DataAssumptionsContext: Successfully saved assumptions:', data);
    } catch (error) {
      console.error('DataAssumptionsContext: Failed to save assumptions to profile:', error);
    }
  }, [user, propertyAssumptions, globalFactors]);

  const loadAssumptionsFromProfile = async () => {
    if (!user) {
      console.log('DataAssumptionsContext: No user, skipping load');
      return;
    }

    console.log('DataAssumptionsContext: Loading assumptions from profile for user:', user.id);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('data')
        .eq('id', user.id)
        .single();

      if (error) {
        // PGRST116 means no rows found - this is normal for new users
        if (error.code === 'PGRST116') {
          console.log('DataAssumptionsContext: No profile data found, using defaults');
          return;
        }
        throw error;
      }

      console.log('DataAssumptionsContext: Profile data retrieved:', data);

      if (data?.data) {
        const profileData = data.data as {
          propertyAssumptions?: PropertyAssumption[];
          globalFactors?: GlobalEconomicFactors;
        };

        console.log('DataAssumptionsContext: Parsing profile data:', profileData);

        if (profileData.propertyAssumptions) {
          console.log('DataAssumptionsContext: Loading property assumptions:', profileData.propertyAssumptions);
          setPropertyAssumptions(profileData.propertyAssumptions);
        }

        if (profileData.globalFactors) {
          console.log('DataAssumptionsContext: Loading global factors:', profileData.globalFactors);
          setGlobalFactors(profileData.globalFactors);
        }
      }
    } catch (error) {
      console.error('DataAssumptionsContext: Error loading assumptions from profile:', error);
    }
  };

  // Load assumptions when component mounts
  useEffect(() => {
    if (user) {
      loadAssumptionsFromProfile();
    }
  }, [user]);

  // Save assumptions with debounce when they change
  useEffect(() => {
    if (!user) return;
    
    const currentAssumptions = JSON.stringify({
      propertyAssumptions,
      globalFactors
    });
    
    // Only save if actually changed
    if (currentAssumptions === prevAssumptionsRef.current) {
      return;
    }
    
    // Skip the first render (initial load)
    if (prevAssumptionsRef.current === '') {
      prevAssumptionsRef.current = currentAssumptions;
      console.log('DataAssumptionsContext: Initial load, skipping save');
      return;
    }
    
    console.log('DataAssumptionsContext: Assumptions changed, scheduling auto-save in 1 second');
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      console.log('DataAssumptionsContext: Debounce complete, executing save');
      saveAssumptionsToProfile();
      prevAssumptionsRef.current = currentAssumptions;
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [propertyAssumptions, globalFactors, user]);

  const updateGlobalFactor = (factor: keyof GlobalEconomicFactors, value: string) => {
    setGlobalFactors(prev => ({
      ...prev,
      [factor]: value,
    }));
  };

  const updatePropertyAssumption = (index: number, field: keyof PropertyAssumption, value: string) => {
    setPropertyAssumptions(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const getPropertyData = (propertyType: string): PropertyAssumption | undefined => {
    return propertyAssumptions.find(prop => prop.type === propertyType);
  };

  const value = {
    globalFactors,
    propertyAssumptions,
    updateGlobalFactor,
    updatePropertyAssumption,
    getPropertyData,
  };

  return (
    <DataAssumptionsContext.Provider value={value}>
      {children}
    </DataAssumptionsContext.Provider>
  );
};
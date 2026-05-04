import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import propertyDefaults from '../data/property-defaults.json';
import { GROWTH_RATE_TIERS } from '../constants/financialParams';
import {
  CELL_IDS,
  type CellId,
  getCellDisplayLabel,
  translateLegacyTypeKey,
  isCellId,
} from '../utils/propertyCells';

// Property Type Template: Contains all PropertyInstanceDetails fields plus identity.
export interface PropertyTypeTemplate extends PropertyInstanceDetails {
  propertyType: string; // Display label (e.g., "Metro House — Growth")
  cellId: CellId;       // v4 cell ID (e.g., "metro-house-growth")
}

// DEPRECATED: Old property assumptions interface - kept for migration only
export interface PropertyAssumption extends PropertyInstanceDetails {
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

// DEPRECATED: Global economic factors - kept for backward compatibility only
// These should NOT be used in affordability calculations anymore
export interface GlobalEconomicFactors {
  growthRate: string;
  loanToValueRatio: string;
  interestRate: string;
}

interface DataAssumptionsContextType {
  // NEW: Property type templates (single source of truth)
  propertyTypeTemplates: PropertyTypeTemplate[];
  getPropertyTypeTemplate: (propertyType: string) => PropertyTypeTemplate | undefined;
  updatePropertyTypeTemplate: (propertyType: string, updates: Partial<PropertyInstanceDetails>) => void;
  
  // DEPRECATED: Old system (kept for backward compatibility)
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

type GrowthAssumption = 'High' | 'Medium' | 'Low';

/**
 * Converts a property type key to its display label.
 * v4 cell IDs use propertyCells.getCellDisplayLabel.
 * Legacy v3 keys translate through the alias map first.
 */
const keyToDisplayName = (key: string): string => {
  if (isCellId(key)) return getCellDisplayLabel(key);
  const translation = translateLegacyTypeKey(key);
  if (translation) return getCellDisplayLabel(translation.newCellId);
  return key;
};

/**
 * Converts property defaults JSON to PropertyAssumption format
 */
const convertToPropertyAssumption = (key: string, defaults: PropertyInstanceDetails): PropertyAssumption => {
  // Get growth assumption from defaults, fallback to "Medium" for safety
  const growthAssumption = (defaults.growthAssumption || 'Medium') as GrowthAssumption;
  
  // Validate and get growth rates, fallback to Medium if invalid
  const rates = GROWTH_RATE_TIERS[growthAssumption] || GROWTH_RATE_TIERS.Medium;
  
  return {
    // Existing fields (for backward compatibility)
    type: keyToDisplayName(key),
    averageCost: defaults.purchasePrice.toString(),
    yield: ((defaults.rentPerWeek * 52 / defaults.purchasePrice) * 100).toFixed(1),
    growthYear1: rates.year1.toString(),
    growthYears2to3: rates.years2to3.toString(),
    growthYear4: rates.year4.toString(),
    growthYear5plus: rates.year5plus.toString(),
    deposit: (100 - defaults.lvr).toString(),
    loanType: defaults.loanProduct,
    
    // All 34 new fields
    ...defaults,
  };
};

/**
 * Initialize the deprecated PropertyAssumption[] from v4 cells.
 * Kept until consumers of getPropertyData migrate to propertyTypeTemplates.
 */
const initializePropertyAssumptions = (): PropertyAssumption[] => {
  return CELL_IDS.map((cellId) =>
    convertToPropertyAssumption(
      cellId,
      propertyDefaults[cellId] as PropertyInstanceDetails
    )
  );
};

/**
 * Initialize property type templates from v4 cells (10 cells, type×mode matrix).
 * Each template carries both the display label (legacy match key) and cellId
 * (canonical match key), so callers can look up by either.
 */
const initializePropertyTypeTemplates = (): PropertyTypeTemplate[] => {
  return CELL_IDS.map((cellId) => ({
    ...(propertyDefaults[cellId] as PropertyInstanceDetails),
    propertyType: getCellDisplayLabel(cellId),
    cellId,
  }));
};

export const DataAssumptionsProvider: React.FC<DataAssumptionsProviderProps> = ({ children }) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevAssumptionsRef = useRef<string>('');
  // Track consecutive autosave failures so we surface a toast on the second
  // failure (the first might be a transient blip; two in a row is real).
  const saveFailureCountRef = useRef<number>(0);
  const saveFailureToastShownRef = useRef<boolean>(false);

  // NEW: Property type templates (single source of truth)
  const [propertyTypeTemplates, setPropertyTypeTemplates] = useState<PropertyTypeTemplate[]>(
    initializePropertyTypeTemplates()
  );

  // DEPRECATED: Old global factors (kept for backward compatibility)
  const [globalFactors, setGlobalFactors] = useState<GlobalEconomicFactors>({
    growthRate: '7',
    loanToValueRatio: '80',
    interestRate: '6',
  });

  // DEPRECATED: Old property assumptions (kept for backward compatibility)
  const [propertyAssumptions, setPropertyAssumptions] = useState<PropertyAssumption[]>(
    initializePropertyAssumptions()
  );

  const saveAssumptionsToProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const dataToSave = {
        propertyTypeTemplates: propertyTypeTemplates, // NEW: Save templates
        propertyAssumptions: propertyAssumptions, // DEPRECATED: For backward compatibility
        globalFactors: globalFactors, // DEPRECATED: For backward compatibility
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
        throw error;
      }
      // Reset failure tracking on success so we re-arm the toast for any
      // future streak of failures.
      saveFailureCountRef.current = 0;
      saveFailureToastShownRef.current = false;
    } catch (error) {
      console.error('[DataAssumptions] save failed:', error);
      saveFailureCountRef.current += 1;
      // Surface once after two consecutive failures, then suppress until a
      // save succeeds. Avoids spamming the user on every keystroke during an
      // outage while still making the failure visible.
      if (saveFailureCountRef.current >= 2 && !saveFailureToastShownRef.current) {
        saveFailureToastShownRef.current = true;
        toast({
          title: 'Could not save assumptions',
          description: 'Your changes are still on screen but haven\'t been saved. Check your connection and try editing again.',
          variant: 'destructive',
        });
      }
    }
  }, [user, propertyTypeTemplates, propertyAssumptions, globalFactors, toast]);

  const loadAssumptionsFromProfile = async () => {
    if (!user) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('data')
        .eq('id', user.id)
        .single();

      if (error) {
        // PGRST116 means no rows found - this is normal for new users
        if (error.code === 'PGRST116') {
          return;
        }
        throw error;
      }

      if (data?.data) {
        const profileData = data.data as {
          propertyTypeTemplates?: PropertyTypeTemplate[];
          propertyAssumptions?: PropertyAssumption[];
          globalFactors?: GlobalEconomicFactors;
        };

        // Load property type templates if available — but only if every saved
        // template carries a v4 `cellId`. Pre-pivot saves stored the 8-template
        // model without cell IDs; loading those would leave propertyTypes with
        // `id: undefined` and break engine lookups. Discard pre-pivot saves
        // and fall through to the freshly initialised v4 cell templates.
        if (profileData.propertyTypeTemplates) {
          const allHaveCellId = profileData.propertyTypeTemplates.every(
            (t) => typeof (t as PropertyTypeTemplate).cellId === 'string'
          );
          if (allHaveCellId) {
            setPropertyTypeTemplates(profileData.propertyTypeTemplates);
          }
          // else: keep the in-memory v4 init from initializePropertyTypeTemplates().
        }

        // DEPRECATED: Load old property assumptions for backward compatibility
        if (profileData.propertyAssumptions) {
          setPropertyAssumptions(profileData.propertyAssumptions);
        }

        // DEPRECATED: Load old global factors for backward compatibility
        if (profileData.globalFactors) {
          setGlobalFactors(profileData.globalFactors);
        }
      }
    } catch (error) {
      // Failed to load assumptions from profile
    }
  };

  // Load assumptions when component mounts
  useEffect(() => {
    if (user) {
      loadAssumptionsFromProfile();
    }
  }, [user]);

  // Save assumptions with debounce when they change
  // NOTE: Blocked for client role (sandbox mode - no saving)
  useEffect(() => {
    if (!user) return;
    
    // Block auto-save for client role - sandbox mode
    if (role === 'client') {
      return;
    }
    
    const currentAssumptions = JSON.stringify({
      propertyTypeTemplates,
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
      return;
    }
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveAssumptionsToProfile();
      prevAssumptionsRef.current = currentAssumptions;
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [propertyTypeTemplates, propertyAssumptions, globalFactors, user, role]);

  /**
   * Resolve any caller-supplied property identifier to its template.
   * Accepts:
   *   - v4 cell ID ("metro-house-growth")
   *   - v4 display label ("Metro House — Growth")
   *   - Legacy v3 key ("duplexes") — translated to v4 cell ID
   *   - Legacy v3 display label ("Duplexes") — translated by normalising and re-checking
   */
  const getPropertyTypeTemplate = (propertyType: string): PropertyTypeTemplate | undefined => {
    // 1. Direct cell ID match
    if (isCellId(propertyType)) {
      return propertyTypeTemplates.find((t) => t.cellId === propertyType);
    }

    // 2. Direct display label match
    let result = propertyTypeTemplates.find((t) => t.propertyType === propertyType);
    if (result) return result;

    // 3. Legacy v3 key → translate to v4 cell ID
    const translation = translateLegacyTypeKey(propertyType);
    if (translation) {
      return propertyTypeTemplates.find((t) => t.cellId === translation.newCellId);
    }

    // 4. Normalised display label match (handles "Houses (Regional focus)" → "houses-regional")
    const normalizeForMatch = (name: string) => name.toLowerCase().replace(' focus', '').trim();
    const normalizedInput = normalizeForMatch(propertyType);
    result = propertyTypeTemplates.find((t) => normalizeForMatch(t.propertyType) === normalizedInput);
    if (result) return result;

    // 5. Try v3-key-shaped form of the normalised display label
    const v3Key = normalizedInput.replace(/\s*\/\s*/g, '-').replace(/\s+/g, '-').replace(/[()]/g, '');
    const v3Translation = translateLegacyTypeKey(v3Key);
    if (v3Translation) {
      return propertyTypeTemplates.find((t) => t.cellId === v3Translation.newCellId);
    }

    return undefined;
  };

  const updatePropertyTypeTemplate = (propertyType: string, updates: Partial<PropertyInstanceDetails>) => {
    const target = getPropertyTypeTemplate(propertyType);
    if (!target) return;
    setPropertyTypeTemplates((prev) =>
      prev.map((t) => (t.cellId === target.cellId ? { ...t, ...updates } : t))
    );
  };

  // DEPRECATED: Old methods (kept for backward compatibility)
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
    // First try to get from propertyTypeTemplates (source of truth for editable values)
    const template = getPropertyTypeTemplate(propertyType);
    
    if (template) {
      // Convert template to PropertyAssumption format
      const growthTier = (template.growthAssumption || 'Medium') as GrowthAssumption;
      const rates = GROWTH_RATE_TIERS[growthTier] || GROWTH_RATE_TIERS.Medium;
      
      return {
        // Legacy fields (derived from template)
        type: template.propertyType,
        averageCost: template.purchasePrice.toString(),
        yield: ((template.rentPerWeek * 52 / template.purchasePrice) * 100).toFixed(1),
        growthYear1: rates.year1.toString(),
        growthYears2to3: rates.years2to3.toString(),
        growthYear4: rates.year4.toString(),
        growthYear5plus: rates.year5plus.toString(),
        deposit: (100 - template.lvr).toString(),
        loanType: template.loanProduct,
        
        // All PropertyInstanceDetails fields from template
        ...template,
      };
    }
    
    // Fallback to deprecated propertyAssumptions for backward compatibility
    return propertyAssumptions.find(prop => prop.type === propertyType);
  };

  const value: DataAssumptionsContextType = {
    // NEW: Property type templates
    propertyTypeTemplates,
    getPropertyTypeTemplate,
    updatePropertyTypeTemplate,
    
    // DEPRECATED: Old system (kept for backward compatibility)
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
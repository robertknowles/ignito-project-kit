import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface BrandingSettings {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  isClientInteractiveEnabled: boolean;
}

interface BrandingContextType {
  branding: BrandingSettings;
  loading: boolean;
  error: string | null;
  updateBranding: (updates: Partial<BrandingSettings>) => Promise<{ success: boolean; error?: string }>;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: BrandingSettings = {
  companyName: 'My Company',
  logoUrl: null,
  primaryColor: '#2563EB',
  isClientInteractiveEnabled: true,
};

const BRANDING_CACHE_KEY = 'proppath:branding-cache';

const readCachedBranding = (): BrandingSettings | null => {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.primaryColor !== 'string') return null;
    return {
      companyName: parsed.companyName ?? defaultBranding.companyName,
      logoUrl: parsed.logoUrl ?? null,
      primaryColor: parsed.primaryColor,
      isClientInteractiveEnabled:
        parsed.isClientInteractiveEnabled ?? defaultBranding.isClientInteractiveEnabled,
    };
  } catch {
    return null;
  }
};

const writeCachedBranding = (branding: BrandingSettings) => {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch {
    // ignore quota errors
  }
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

// Helper to inject CSS variables into document root
const injectCSSVariables = (primaryColor: string) => {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', primaryColor);
};

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings>(
    () => readCachedBranding() ?? defaultBranding
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, companyId, loading: authLoading } = useAuth();

  const fetchBranding = useCallback(async () => {
    if (!companyId || authLoading) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('name, logo_url, primary_color, is_client_interactive_enabled')
        .eq('id', companyId)
        .single();

      if (fetchError) {
        setError('Failed to fetch branding settings');
        setLoading(false);
        return;
      }

      const brandingData: BrandingSettings = {
        companyName: data.name || defaultBranding.companyName,
        logoUrl: data.logo_url,
        primaryColor: data.primary_color || defaultBranding.primaryColor,
        isClientInteractiveEnabled: data.is_client_interactive_enabled ?? true,
      };

      setBranding(brandingData);
      writeCachedBranding(brandingData);

      // Inject CSS variables
      injectCSSVariables(brandingData.primaryColor);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [companyId, authLoading]);

  const updateBranding = async (
    updates: Partial<BrandingSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!companyId) {
      return { success: false, error: 'No company ID available' };
    }

    try {
      // Map frontend keys to database column names
      const dbUpdates: Record<string, any> = {};
      if (updates.companyName !== undefined) dbUpdates.name = updates.companyName;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
      if (updates.primaryColor !== undefined) dbUpdates.primary_color = updates.primaryColor;
      if (updates.isClientInteractiveEnabled !== undefined) {
        dbUpdates.is_client_interactive_enabled = updates.isClientInteractiveEnabled;
      }
      dbUpdates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('companies')
        .update(dbUpdates)
        .eq('id', companyId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Update local state
      const newBranding = { ...branding, ...updates };
      setBranding(newBranding);
      writeCachedBranding(newBranding);

      // Update CSS variables if colors changed
      if (updates.primaryColor) {
        injectCSSVariables(updates.primaryColor || branding.primaryColor);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const refreshBranding = async () => {
    await fetchBranding();
  };

  // Fetch branding on mount and when companyId changes
  useEffect(() => {
    // Only proceed once auth is done loading
    if (authLoading) {
      return;
    }
    
    // If user is logged in with a company, fetch branding
    if (user && companyId) {
      fetchBranding();
    } else {
      // No user or no company - stop loading and use defaults
      setLoading(false);
    }
  }, [user, companyId, authLoading, fetchBranding]);

  // Set CSS variables on initial load using current (possibly cached) branding
  useEffect(() => {
    injectCSSVariables(branding.primaryColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    branding,
    loading,
    error,
    updateBranding,
    refreshBranding,
  };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};


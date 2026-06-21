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
  // Black is the neutral fallback — avoids a blue flash before the
  // company's actual primary colour is fetched from Supabase on first login.
  primaryColor: '#000000',
  isClientInteractiveEnabled: true,
};

// Branding is cached per company so one account's logo/name can never bleed
// into another account viewed in the same browser. The "last company" pointer
// lets us restore instantly on refresh (avoiding a flash) without keying off a
// shared global cache.
const BRANDING_CACHE_PREFIX = 'proppath:branding-cache:';
const LAST_COMPANY_KEY = 'proppath:branding-company';

const cacheKeyFor = (companyId: string) => `${BRANDING_CACHE_PREFIX}${companyId}`;

const readCachedBranding = (companyId: string | null): BrandingSettings | null => {
  if (!companyId) return null;
  try {
    const raw = localStorage.getItem(cacheKeyFor(companyId));
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

const writeCachedBranding = (companyId: string | null, branding: BrandingSettings) => {
  if (!companyId) return;
  try {
    localStorage.setItem(cacheKeyFor(companyId), JSON.stringify(branding));
    localStorage.setItem(LAST_COMPANY_KEY, companyId);
  } catch {
    // ignore quota errors
  }
};

// Drop every cached branding entry — used on sign-out so the next account
// starts from a clean slate instead of inheriting the previous user's branding.
const clearCachedBranding = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key === LAST_COMPANY_KEY || key.startsWith(BRANDING_CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
};

// On a cold load auth hasn't resolved yet, so restore the last-known company's
// branding to avoid a flash. If a different user logs in, fetchBranding
// overwrites it once their companyId resolves.
const readLastKnownBranding = (): BrandingSettings | null => {
  try {
    return readCachedBranding(localStorage.getItem(LAST_COMPANY_KEY));
  } catch {
    return null;
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
    () => readLastKnownBranding() ?? defaultBranding
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
      writeCachedBranding(companyId, brandingData);

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
      writeCachedBranding(companyId, newBranding);

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
      // Signed out (or a user without a company): wipe any cached branding so
      // the previous account's logo/name can't leak onto this screen, and reset
      // to neutral defaults.
      clearCachedBranding();
      setBranding(defaultBranding);
      injectCSSVariables(defaultBranding.primaryColor);
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


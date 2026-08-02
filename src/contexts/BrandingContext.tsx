import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

/** Which chrome surfaces the brand colour is allowed to paint. Charts are
 *  deliberately excluded so the product's curated palette always looks good. */
export interface BrandedSurfaces {
  sidebar: boolean;
}

export interface BrandingSettings {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  isClientInteractiveEnabled: boolean;
  brandedSurfaces: BrandedSurfaces;
}

/** A pending, unsaved branding edit shown live across the app. */
export type BrandingPreview = {
  primaryColor?: string;
  brandedSurfaces?: BrandedSurfaces;
} | null;

interface BrandingContextType {
  /** Effective branding = saved values with any live preview merged on top. */
  branding: BrandingSettings;
  /** Saved values only (no preview) - editors seed/compare against this to
   *  avoid a feedback loop with their own live preview. */
  savedBranding: BrandingSettings;
  loading: boolean;
  error: string | null;
  updateBranding: (updates: Partial<BrandingSettings>) => Promise<{ success: boolean; error?: string }>;
  refreshBranding: () => Promise<void>;
  /** Live preview - set while editing so the real chrome recolours instantly.
   *  Pass null to clear (revert to saved). Not persisted. */
  setBrandingPreview: (preview: BrandingPreview) => void;
  /** Persist the surface toggles. Frontend-only for now (localStorage) until the
   *  companies.branding_surfaces column lands. */
  saveBrandedSurfaces: (surfaces: BrandedSurfaces) => void;
}

const defaultSurfaces: BrandedSurfaces = { sidebar: false };

const defaultBranding: BrandingSettings = {
  companyName: 'My Company',
  logoUrl: null,
  // Black is the neutral fallback - avoids a blue flash before the
  // company's actual primary colour is fetched from Supabase on first login.
  primaryColor: '#000000',
  isClientInteractiveEnabled: true,
  brandedSurfaces: defaultSurfaces,
};

// Surface toggles persist to localStorage for now (frontend-first). Keyed per
// company so one account's choices never leak into another.
const SURFACES_PREFIX = 'proppath:branding-surfaces:';
const surfacesKeyFor = (companyId: string) => `${SURFACES_PREFIX}${companyId}`;

const readSurfaces = (companyId: string | null): BrandedSurfaces => {
  if (!companyId) return defaultSurfaces;
  try {
    const raw = localStorage.getItem(surfacesKeyFor(companyId));
    if (!raw) return defaultSurfaces;
    const parsed = JSON.parse(raw);
    return { sidebar: !!parsed?.sidebar };
  } catch {
    return defaultSurfaces;
  }
};

const writeSurfaces = (companyId: string | null, surfaces: BrandedSurfaces) => {
  if (!companyId) return;
  try {
    localStorage.setItem(surfacesKeyFor(companyId), JSON.stringify(surfaces));
  } catch {
    // ignore quota errors
  }
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
      brandedSurfaces: defaultSurfaces,
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

// Drop every cached branding entry - used on sign-out so the next account
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
  // Live, unsaved edit merged on top of saved branding for instant preview.
  const [preview, setPreview] = useState<BrandingPreview>(null);
  const { user, companyId, loading: authLoading } = useAuth();

  // What the app actually renders: saved values with any live preview on top.
  const effectiveBranding: BrandingSettings = {
    ...branding,
    primaryColor: preview?.primaryColor ?? branding.primaryColor,
    brandedSurfaces: preview?.brandedSurfaces ?? branding.brandedSurfaces,
  };

  // Keep the CSS var in sync with the effective colour so var-driven styles
  // (and the live preview) update immediately.
  useEffect(() => {
    injectCSSVariables(effectiveBranding.primaryColor);
  }, [effectiveBranding.primaryColor]);

  const setBrandingPreview = useCallback((next: BrandingPreview) => setPreview(next), []);

  const saveBrandedSurfaces = useCallback(
    (surfaces: BrandedSurfaces) => {
      writeSurfaces(companyId, surfaces);
      setBranding((prev) => ({ ...prev, brandedSurfaces: surfaces }));
    },
    [companyId],
  );

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
        brandedSurfaces: readSurfaces(companyId),
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
    branding: effectiveBranding,
    savedBranding: branding,
    loading,
    error,
    updateBranding,
    refreshBranding,
    setBrandingPreview,
    saveBrandedSurfaces,
  };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};


import { supabase } from '@/integrations/supabase/client'

export interface PropertyImageResult {
  url: string
  source: 'streetview' | 'staticmap'
}

/**
 * Fetch a Street View (or satellite fallback) image for a property via the
 * property-image edge function. Returns null on any failure — callers treat
 * the image as a nice-to-have and never block on it.
 */
export const fetchPropertyImage = async (
  lat: number,
  lng: number,
  placeId?: string
): Promise<PropertyImageResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('property-image', {
      body: { lat, lng, placeId },
    })
    if (error || !data?.url) return null
    return data as PropertyImageResult
  } catch {
    return null
  }
}

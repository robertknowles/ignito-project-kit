/**
 * useStrategyProfiles — load/save the firm's named company strategies.
 *
 * Each strategy is free text describing the firm's preferred approach. The BA
 * picks one per client (pills in the chat input); its text is injected into the
 * AI prompt and the AI infers the best-fit engine preset from it + the client
 * brief. Stored as a JSONB array on profiles.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface StrategyProfile {
  id: string
  name: string
  text: string
}

/** Generate an id for a new strategy. */
export const newStrategyId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const coerce = (raw: unknown): StrategyProfile[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => ({
      id: typeof p.id === 'string' ? p.id : newStrategyId(),
      name: typeof p.name === 'string' ? p.name : '',
      text: typeof p.text === 'string' ? p.text : '',
    }))
}

export function useStrategyProfiles() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<StrategyProfile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) {
      setProfiles([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('strategy_profiles')
      .eq('id', user.id)
      .single()
    setProfiles(coerce((data as Record<string, unknown>)?.strategy_profiles))
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (next: StrategyProfile[]): Promise<boolean> => {
      if (!user?.id) return false
      const { error } = await supabase
        .from('profiles')
        .update({ strategy_profiles: next } as Record<string, unknown>)
        .eq('id', user.id)
      if (!error) setProfiles(next)
      return !error
    },
    [user?.id]
  )

  return { profiles, loading, save, reload: load }
}

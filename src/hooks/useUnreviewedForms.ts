import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

/**
 * useUnreviewedForms — powers the "new form submissions" badge on the Client
 * Management sidebar item.
 *
 * A client submitting their onboarding form stamps
 * scenarios.data.onboardingCompletedAt (see ClientOnboarding.tsx). We count how
 * many of the BA's clients completed a form more recently than the last time
 * this BA opened Client Management (stored per-user in localStorage). Opening
 * the section calls markSeen(), which clears the badge — the same unread-count
 * pattern as an inbox. RLS scopes the scenarios query to the BA's own clients,
 * so no company filter is needed here.
 */
const seenKey = (userId?: string) => `proppath:forms-seen-at:${userId ?? 'anon'}`

export function useUnreviewedForms() {
  const { user, role } = useAuth()
  const isStaff = role === 'owner' || role === 'agent'
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user?.id || !isStaff) {
      setCount(0)
      return
    }
    try {
      // Select only the completion timestamp out of the JSON blob (not the whole
      // plan) for each of the BA's scenarios.
      const { data, error } = await supabase
        .from('scenarios')
        .select('client_id, completedAt:data->>onboardingCompletedAt')

      if (error || !data) {
        setCount(0)
        return
      }

      let seenAt = 0
      try {
        seenAt = Number(localStorage.getItem(seenKey(user.id)) ?? 0)
      } catch {
        seenAt = 0
      }

      // One entry per client; a form submitted after seenAt is "new".
      const newClientIds = new Set<number>()
      for (const row of data as { client_id: number | null; completedAt: string | null }[]) {
        if (!row.completedAt || row.client_id == null) continue
        if (new Date(row.completedAt).getTime() > seenAt) newClientIds.add(row.client_id)
      }
      setCount(newClientIds.size)
    } catch {
      setCount(0)
    }
  }, [user?.id, isStaff])

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(seenKey(user?.id), String(Date.now()))
    } catch {
      // ignore quota / privacy-mode errors
    }
    setCount(0)
  }, [user?.id])

  // Refresh on mount, when the tab regains focus, and on a light interval so a
  // submission that lands while the BA is elsewhere still surfaces.
  useEffect(() => {
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    const interval = window.setInterval(refresh, 60_000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
    }
  }, [refresh])

  return { count, markSeen, refresh }
}

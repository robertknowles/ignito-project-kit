import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { Client } from '@/contexts/ClientContext'

/**
 * Hook for portal (client role) pages.
 * Finds the client record linked to the current user via scenarios.client_user_id.
 * Returns the client data and helpers to update it.
 */
export function usePortalClient() {
  const { user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClient = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Find the scenario linked to this user
        const { data: scenario, error: scenarioError } = await supabase
          .from('scenarios')
          .select('client_id')
          .eq('client_user_id', user.id)
          .limit(1)
          .single()

        if (scenarioError || !scenario) {
          setLoading(false)
          return
        }

        // Fetch the full client record
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', scenario.client_id)
          .single()

        if (!clientError && clientData) {
          setClient(clientData as Client)
        }
      } catch {
        // Fetch failed silently
      }
      setLoading(false)
    }

    fetchClient()
  }, [user?.id])

  // Update client fields in the database and local state
  const updateClientFields = async (updates: Partial<Client>): Promise<boolean> => {
    if (!client || !user) return false

    try {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', client.id)

      if (error) throw error

      // Update local state
      setClient(prev => prev ? { ...prev, ...updates } : prev)

      // Update last_active_at
      await supabase
        .from('clients')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', client.id)

      // Log activity so BA sees the change in their feed
      const changedFields = Object.keys(updates).filter(k => k !== 'updated_at')
      await supabase.from('activity_log').insert({
        client_id: client.id,
        company_id: client.company_id || null,
        actor_id: user.id,
        event_type: 'profile_updated',
        metadata: { changed_fields: changedFields },
      })

      return true
    } catch {
      return false
    }
  }

  return { client, loading, updateClientFields }
}

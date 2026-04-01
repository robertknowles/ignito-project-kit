/**
 * useAIUsage — Fetches current month's AI usage for the logged-in user.
 * Used in SettingsHub to display token counts and request totals.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface AIUsageData {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  requestCount: number
  month: string
}

export function useAIUsage() {
  const { user } = useAuth()
  const [usage, setUsage] = useState<AIUsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const fetchUsage = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('ai_usage')
        .select('input_tokens, output_tokens, total_tokens, request_count, month')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle()

      if (error) {
        console.error('Failed to fetch AI usage:', error)
        setUsage(null)
      } else if (data) {
        setUsage({
          inputTokens: data.input_tokens ?? 0,
          outputTokens: data.output_tokens ?? 0,
          totalTokens: data.total_tokens ?? 0,
          requestCount: data.request_count ?? 0,
          month: data.month,
        })
      } else {
        // No usage this month yet
        setUsage({
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          requestCount: 0,
          month: currentMonth,
        })
      }
      setIsLoading(false)
    }

    fetchUsage()
  }, [user?.id])

  return { usage, isLoading }
}

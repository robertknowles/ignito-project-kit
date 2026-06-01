import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useClient } from './ClientContext'
import { useAuth } from './AuthContext'
import { INITIAL_INVESTMENT_PROFILE, type InvestmentProfileData } from './InvestmentProfileContext'

const ASSUMPTION_KEYS: (keyof InvestmentProfileData)[] = [
  'interestRate', 'vacancyRate', 'wageGrowthRate', 'inflationRate',
  'valuationPremiumResidential', 'valuationPremiumCommercial',
  'targetPassiveIncome', 'ioToPiTransitionYears',
  'rentEscalationRate', 'sellingCostsPercent',
  'existingPortfolioGrowthRate', 'maxPurchasesPerYear', 'equityReleaseFactor',
  'marginalTaxRate', 'companyTaxRate', 'trustTaxRate', 'smsfTaxRate',
  'marginalTaxRateAtConsolidation', 'cgtOneYearDiscount',
  'growthCurve',
]

type AssumptionOverrides = Partial<Pick<InvestmentProfileData, typeof ASSUMPTION_KEYS[number]>>

interface ClientAssumptionsContextType {
  clientAssumptions: AssumptionOverrides
  updateClientAssumptions: (updates: AssumptionOverrides) => void
  loading: boolean
}

const ClientAssumptionsContext = createContext<ClientAssumptionsContextType | undefined>(undefined)

export const ClientAssumptionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeClient } = useClient()
  const { session } = useAuth()
  const [clientAssumptions, setClientAssumptions] = useState<AssumptionOverrides>({})
  const [loading, setLoading] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeClientIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activeClient?.id || !session?.user?.id) {
      setClientAssumptions({})
      activeClientIdRef.current = null
      return
    }

    activeClientIdRef.current = activeClient.id
    setLoading(true)

    const load = async () => {
      const { data, error } = await supabase
        .from('client_assumptions' as any)
        .select('assumptions')
        .eq('client_id', activeClient.id)
        .maybeSingle()

      if (activeClientIdRef.current !== activeClient.id) return

      if (!error && data) {
        setClientAssumptions((data as any).assumptions || {})
      } else {
        setClientAssumptions({})
      }
      setLoading(false)
    }
    load()
  }, [activeClient?.id, session?.user?.id])

  const updateClientAssumptions = useCallback(
    (updates: AssumptionOverrides) => {
      setClientAssumptions(prev => {
        const next = { ...prev, ...updates }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          const clientId = activeClientIdRef.current
          if (!clientId) return
          supabase
            .from('client_assumptions' as any)
            .upsert(
              { client_id: clientId, assumptions: next, updated_at: new Date().toISOString() } as any,
              { onConflict: 'client_id' }
            )
            .then()
        }, 1000)
        return next
      })
    },
    []
  )

  return (
    <ClientAssumptionsContext.Provider value={{ clientAssumptions, updateClientAssumptions, loading }}>
      {children}
    </ClientAssumptionsContext.Provider>
  )
}

export const useClientAssumptions = () => {
  const ctx = useContext(ClientAssumptionsContext)
  if (!ctx) throw new Error('useClientAssumptions must be used within ClientAssumptionsProvider')
  return ctx
}

export function extractAssumptionOverrides(profile: InvestmentProfileData): AssumptionOverrides {
  const overrides: any = {}
  for (const key of ASSUMPTION_KEYS) {
    if ((profile as any)[key] !== undefined) {
      overrides[key] = (profile as any)[key]
    }
  }
  return overrides
}

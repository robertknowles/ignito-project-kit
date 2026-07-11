/**
 * ClientInputsModal - read-only view of the raw answers a client submitted
 * through their onboarding / Client Details Form.
 *
 * Purely informational: it reads the verbatim snapshot stored on the client's
 * scenario (`data.clientSubmittedInputs`, written on submit in
 * ClientOnboarding). For clients who submitted before that snapshot existed it
 * falls back to `data.investmentProfile`. Nothing here feeds the calculation
 * engine or the dashboard - it just surfaces what the client told the agent.
 */

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import type { Client } from '@/contexts/ClientContext'
import type { ExistingProperty } from '@/pages/ClientOnboarding'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client
}

// The eight fields the client fills out, in display order.
type FieldFormat = 'currency' | 'years'
const FIELDS: { key: string; label: string; section: string; format: FieldFormat }[] = [
  { key: 'depositPool', label: 'Available Deposit', section: 'Financial position', format: 'currency' },
  { key: 'borrowingCapacity', label: 'Borrowing Capacity', section: 'Financial position', format: 'currency' },
  { key: 'annualSavings', label: 'Annual Savings', section: 'Financial position', format: 'currency' },
  { key: 'portfolioValue', label: 'Current Property Value', section: 'Current portfolio', format: 'currency' },
  { key: 'currentDebt', label: 'Current Investment Debt', section: 'Current portfolio', format: 'currency' },
  { key: 'timelineYears', label: 'Investment Horizon', section: 'Investment goals', format: 'years' },
  { key: 'equityGoal', label: 'Equity Goal', section: 'Investment goals', format: 'currency' },
  { key: 'cashflowGoal', label: 'Annual Cashflow Goal', section: 'Investment goals', format: 'currency' },
]

const formatValue = (value: unknown, format: FieldFormat): string => {
  if (value === null || value === undefined || value === '') return ''
  // Client marked "I don't have this" on the onboarding form.
  if (value === 'N/A') return 'N/A'
  if (format === 'currency') return `$${Number(value).toLocaleString('en-AU')}`
  if (format === 'years') return `${value} year${Number(value) === 1 ? '' : 's'}`
  return String(value)
}

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-AU')}`

// Read the per-property breakdown the client submitted, tolerating older
// snapshots that predate it (returns []).
const readExistingProperties = (inputs: Record<string, unknown> | null): ExistingProperty[] => {
  const raw = inputs?.existingProperties
  if (!Array.isArray(raw)) return []
  return raw.map((p: any) => ({
    value: Number(p?.value) || 0,
    debt: Number(p?.debt) || 0,
    weeklyRent: Number(p?.weeklyRent) || 0,
    entity: p?.entity || 'Personal',
  }))
}

export const ClientInputsModal: React.FC<Props> = ({ open, onOpenChange, client }) => {
  const [loading, setLoading] = useState(true)
  const [inputs, setInputs] = useState<Record<string, unknown> | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setInputs(null)
      setSubmittedAt(null)
      try {
        // Most recently touched scenario for this client holds the snapshot.
        const { data, error } = await supabase
          .from('scenarios')
          .select('data')
          .eq('client_id', client.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cancelled) return
        const sd = (data?.data as any) || {}
        const snapshot = sd.clientSubmittedInputs || sd.investmentProfile || null
        if (!error && snapshot) {
          setInputs(snapshot)
          setSubmittedAt(sd.clientSubmittedInputs?.submittedAt || sd.onboardingCompletedAt || null)
        }
      } catch {
        // Leave inputs null → empty state.
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [open, client.id])

  const hasAny = inputs && FIELDS.some((f) => {
    const v = (inputs as Record<string, unknown>)[f.key]
    return v !== null && v !== undefined && v !== ''
  })

  const existingProperties = readExistingProperties(inputs)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Inputs</DialogTitle>
          <DialogDescription className="mt-0.5">
            {client.name}
            {submittedAt
              ? ` · submitted ${new Date(submittedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center">
            <span className="text-sm text-[#717680]">Loading...</span>
          </div>
        ) : !hasAny ? (
          <p className="py-10 text-center text-sm text-[#717680]">
            This client hasn't submitted their details yet.
          </p>
        ) : (
          <>
            <div className="divide-y divide-[#F2F4F7] -mt-1">
              {FIELDS.map((f) => {
                const raw = (inputs as Record<string, unknown>)[f.key]
                const has = raw !== null && raw !== undefined && raw !== ''
                return (
                  <div key={f.key} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[#717680] uppercase tracking-wide mb-0.5">{f.section}</p>
                      <p className="text-sm font-medium text-[#414651]">{f.label}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {!has
                        ? <p className="text-sm text-[#D5D7DA]">-</p>
                        : raw === 'N/A'
                          ? <p className="text-sm font-semibold text-[#A4A7AE]">N/A</p>
                          : <p className="text-sm font-semibold text-[#111827]">{formatValue(raw, f.format)}</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            {existingProperties.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold text-[#717680] uppercase tracking-wide mb-2">
                  Current portfolio breakdown
                </p>
                <div className="space-y-2">
                  {existingProperties.map((p, i) => {
                    const grossYield = p.value > 0 ? ((p.weeklyRent * 52) / p.value) * 100 : 0
                    return (
                      <div key={i} className="rounded-lg border border-[#E9EAEB] px-3.5 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-[#414651]">Property {i + 1}</span>
                          <span className="text-[11px] font-medium text-[#717680] bg-[#F2F4F7] rounded-full px-2 py-0.5">
                            {p.entity}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <span className="text-[#717680]">Value</span>
                          <span className="text-right font-medium text-[#111827]">{money(p.value)}</span>
                          <span className="text-[#717680]">Debt</span>
                          <span className="text-right font-medium text-[#111827]">{money(p.debt)}</span>
                          <span className="text-[#717680]">Equity</span>
                          <span className="text-right font-medium text-[#111827]">{money(p.value - p.debt)}</span>
                          <span className="text-[#717680]">Rent</span>
                          <span className="text-right font-medium text-[#111827]">
                            {money(p.weeklyRent)}/wk{p.value > 0 && p.weeklyRent > 0 ? ` · ${grossYield.toFixed(1)}%` : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2.5 text-sm font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-all duration-150"
              >
                Close
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * BriefTab - the dashboard "Next Purchase Brief".
 *
 * A thin host around the shared <BriefView>: it wires the presentational brief
 * to the LIVE portfolio contexts (affordability, instances, profile, existing
 * portfolio) and owns the portfolio-only "Mark as purchased" flow. All UI lives
 * in BriefView so the standalone Toolkit calculator stays identical.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react'
import { Target, CheckCircle2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import type { ExistingProperty } from '@/types/existingProperty'
import { BriefView, type BriefEditAdapter } from './BriefView'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useChangeReceipt } from '../contexts/ChangeReceiptContext'
import { usePortfolioProjection } from '../hooks/usePortfolioProjection'
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator'
import { calcGrossYield } from '../utils/sharedFinancialCalcs'
import { useRemoveTimelineProperty, parseInstanceId } from '../hooks/useRemoveTimelineProperty'
import type { PropertyInstanceDetails } from '../types/propertyInstance'

// ── Main component ──────────────────────────────────────────────────────────

export const BriefTab: React.FC<{
  /** Switches the dashboard to Portfolio Plan → Purchases (the editable source). */
  onNavigateToPurchases?: () => void
  /** When set, the brief targets this specific property instead of the next feasible one. */
  selectedInstanceId?: string
  /** When provided, renders a back button (used by the standalone per-property page). */
  onBack?: () => void
}> = ({ onNavigateToPurchases, selectedInstanceId, onBack }) => {
  const { timelineProperties } = useAffordabilityCalculator()
  const { instances, updateInstance } = usePropertyInstance()
  const { updateProfile } = useInvestmentProfile()
  const { notifyEdit } = useChangeReceipt()
  const removeTimelineProperty = useRemoveTimelineProperty()

  const { existingProperties, setExistingProperties } = useScenarioSave()
  const { propertyProjections } = usePortfolioProjection()

  // Purchase animation: clicking "Purchased property" plays a pull-away on the
  // brief content first, then commits the data move once it completes. The
  // commit is scheduled from the click itself (not an animation callback) so
  // nothing but the button can ever trigger it.
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseSeq, setPurchaseSeq] = useState(0)
  const completePurchaseRef = useRef<() => void>(() => {})

  // When a specific property was clicked (per-property page), target it; otherwise
  // fall back to the next feasible purchase (the dashboard "Next Purchase Brief").
  const nextProp = (selectedInstanceId
    ? timelineProperties.find(p => p.instanceId === selectedInstanceId)
    : undefined) ?? timelineProperties.find(p => p.status === 'feasible')
  const instanceData = nextProp ? instances[nextProp.instanceId] : null

  const completePurchase = useCallback(() => {
    if (!nextProp || !instanceData) {
      setPurchasing(false)
      return
    }
    const acqCosts = nextProp.acquisitionCosts
    const newExisting: ExistingProperty = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      address: nextProp.title || '',
      state: instanceData.state || 'NSW',
      boughtYear: Math.floor(nextProp.affordableYear),
      purchasePrice: instanceData.purchasePrice || nextProp.cost,
      currentValue: instanceData.valuationAtPurchase || instanceData.purchasePrice || nextProp.cost,
      loan: nextProp.loanAmount || 0,
      rentPerWeek: instanceData.rentPerWeek || 0,
      yield: instanceData.rentPerWeek ? calcGrossYield(instanceData.rentPerWeek, instanceData.purchasePrice || 1) : 0,
      interestRate: instanceData.interestRate || 0,
      loanType: instanceData.loanProduct === 'IO' ? 'IO' : 'PI',
      stampDuty: acqCosts?.stampDuty ?? instanceData.stampDutyOverride ?? 0,
      legals: instanceData.conveyancing || 0,
      buildingPest: instanceData.buildingPestInspection || 0,
      baFee: instanceData.engagementFee || 0,
      cashDeposit: nextProp.depositRequired || 0,
      propertyMgmtPercent: instanceData.propertyManagementPercent || 0,
      councilWater: instanceData.councilRatesWater || 0,
      insurance: instanceData.buildingInsuranceAnnual || 0,
      maintenance: instanceData.maintenanceAllowanceAnnual || 0,
      growthAssumption: instanceData.growthAssumption || 'Medium',
      loanTerm: instanceData.loanTerm || 30,
      ioTermYears: instanceData.ioTermYears ?? 5,
      strata: instanceData.strata || 0,
      entity: instanceData.entity ?? 'individual',
    }
    // Capture what we're removing from the timeline so the portfolio can revert
    // this purchase later. seq marks it as the newest (only the latest is
    // revertable). instanceData is the exact instance detail being removed.
    const parsed = parseInstanceId(nextProp.instanceId)
    newExisting.revert = {
      seq: 1 + existingProperties.reduce((m, p) => Math.max(m, p.revert?.seq ?? 0), 0),
      propertyId: parsed?.propertyId ?? '',
      instanceId: nextProp.instanceId,
      details: instanceData,
    }
    const next = [...existingProperties, newExisting]
    setExistingProperties(next)
    // Keep profile aggregates in sync, same as PortfolioTab does on add/edit
    updateProfile({
      currentDebt: next.reduce((s, p) => s + p.loan, 0),
      portfolioValue: next.reduce((s, p) => s + p.currentValue, 0),
      existingAnnualRent: next.reduce((s, p) => s + (p.rentPerWeek || 0) * 52, 0),
    })
    removeTimelineProperty(nextProp.instanceId)
    notifyEdit('brief', `${nextProp.title || 'Next purchase'} marked as purchased`)
    toast.success('Property moved to Existing Portfolio')
    setPurchasing(false)
    setPurchaseSeq(s => s + 1)
  }, [nextProp, instanceData, existingProperties, setExistingProperties, updateProfile, removeTimelineProperty, notifyEdit])
  completePurchaseRef.current = completePurchase

  const projection = useMemo(() => {
    if (!nextProp) return null
    return propertyProjections.get(nextProp.instanceId) ?? null
  }, [nextProp, propertyProjections])

  const cashflow = useMemo(() => {
    if (!instanceData || !nextProp) return null
    try {
      return calculateDetailedCashflow(instanceData, nextProp.loanAmount)
    } catch (e) {
      console.error('[BriefTab] cashflow error:', e)
      return null
    }
  }, [instanceData, nextProp])

  // Commit adapter → live PropertyInstanceContext + change receipt.
  const iid = nextProp?.instanceId ?? ''
  const edit = useMemo<BriefEditAdapter>(() => ({
    commit: (field, value) => updateInstance(iid, { [field]: value } as Partial<PropertyInstanceDetails>),
    notify: (fieldLabel, from, to) => notifyEdit('brief', { subject: 'Next purchase', fieldLabel, from, to }),
  }), [iid, updateInstance, notifyEdit])

  if (!nextProp || !instanceData || !projection || !cashflow) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
        <Target size={48} className="mb-4 text-neutral-300" />
        <p className="text-sm">No properties in the plan yet - add one via chat to see the brief.</p>
      </div>
    )
  }

  // 1-based position in the purchase sequence, for the "Property N" heading.
  const propNumber = timelineProperties.findIndex(p => p.instanceId === nextProp.instanceId) + 1

  const header = onBack ? (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#535862] hover:text-[#181D27] transition-colors"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        Back to dashboard
      </button>
      {propNumber > 0 && (
        <>
          <div className="h-4 w-px bg-[#E9EAEB]" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-[#7C3AED]">
              Property {propNumber}
            </span>
            <span className="text-sm font-semibold text-[#181D27]">{nextProp.title}</span>
          </div>
        </>
      )}
    </div>
  ) : undefined

  const fundingAction = (
    <button
      onClick={() => {
        if (purchasing) return
        setPurchasing(true)
        window.setTimeout(() => completePurchaseRef.current(), 380)
      }}
      disabled={purchasing}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      <CheckCircle2 size={14} />
      Mark as purchased
    </button>
  )

  return (
    <BriefView
      nextProp={nextProp}
      instanceData={instanceData}
      projection={projection}
      cashflow={cashflow}
      edit={edit}
      header={header}
      fundingAction={fundingAction}
      onNavigateToPurchases={onNavigateToPurchases}
      animateKey={purchaseSeq}
      animatePull={purchasing}
    />
  )
}

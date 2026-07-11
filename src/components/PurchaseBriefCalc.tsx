/**
 * PurchaseBriefCalc - the standalone Toolkit "Purchase Brief Calc".
 *
 * A self-contained twin of the dashboard "Next Purchase Brief": a BA can model
 * ONE property in isolation - no client profile, nothing written back to the
 * portfolio. It reuses the shared <BriefView> so the UI stays pixel-identical
 * to the dashboard brief, but wires it to LOCAL component state via the edit
 * adapter instead of PropertyInstanceContext.
 *
 * The one thing it DOES connect to is the Settings → Assumptions: the live
 * `profile` (interest, vacancy, wage/inflation growth, valuation premiums, tax,
 * global cost defaults) and the live growth curves (via useScenarioRunner's env
 * `getPropertyData`) feed the headless run, so assumption changes reflect here.
 * Affordability inputs (deposit pool / borrowing capacity) are deliberately
 * neutralised so the single property always places on year one - this is a
 * what-if projection, not a client feasibility test.
 */

import React, { useMemo, useState, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { BriefView, type BriefEditAdapter } from './BriefView'
import { useScenarioRunner } from '../hooks/useScenarioRunner'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { getPropertyInstanceDefaults, applyGlobalCostDefaults } from '../utils/propertyInstanceDefaults'
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator'
import type { PropertyInstanceDetails } from '../types/propertyInstance'
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'
import type { ScenarioInput } from '../engine/scenarioRunner'

/**
 * Seed a single local instance from a property type's defaults, overlaying the
 * global cost defaults (Assumptions page) and the settings interest rate so the
 * starting figures match what the rest of the platform would materialise.
 */
const seedInstance = (
  typeId: string,
  profile: Partial<InvestmentProfileData>,
): PropertyInstanceDetails => {
  const base = applyGlobalCostDefaults(getPropertyInstanceDefaults(typeId), profile)
  const rate = profile.interestRate ?? 0.0625 // decimal → per-property field is a %
  return {
    ...base,
    state: base.state || 'VIC',
    valuationAtPurchase: base.purchasePrice,
    interestRate: Math.round(rate * 100 * 100) / 100,
  }
}

export const PurchaseBriefCalc: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { run } = useScenarioRunner()
  const { profile } = useInvestmentProfile()
  const { propertyTypes } = usePropertySelection()

  // The base property type drives engine resolution (instanceId prefix must be a
  // real propertyType.id) and the seed defaults. Default to the first available.
  const [baseTypeId, setBaseTypeId] = useState<string>(() => propertyTypes[0]?.id ?? '')
  const [instance, setInstance] = useState<PropertyInstanceDetails>(() =>
    seedInstance(propertyTypes[0]?.id ?? '', profile),
  )

  const iid = baseTypeId ? `${baseTypeId}_instance_0` : ''

  // Reseed when the BA picks a different property type (fresh starting figures).
  const onChangeType = useCallback(
    (typeId: string) => {
      setBaseTypeId(typeId)
      setInstance(seedInstance(typeId, profile))
    },
    [profile],
  )

  // Field edits commit to local state only - never to any shared context.
  const edit = useMemo<BriefEditAdapter>(
    () => ({
      commit: (field, value) =>
        setInstance(prev => ({ ...prev, [field]: value }) as PropertyInstanceDetails),
    }),
    [],
  )

  // Isolate affordability: keep every assumption from the live profile but give
  // the run unlimited funds so the single property always places on year one.
  const calcProfile = useMemo<Partial<InvestmentProfileData>>(
    () => ({
      ...profile,
      depositPool: 10_000_000,
      borrowingCapacity: 100_000_000,
      currentDebt: 0,
      portfolioValue: 0,
      existingAnnualRent: 0,
      annualSavings: 0,
      timelineYears: 40,
    }),
    [profile],
  )

  const scenario = useMemo<ScenarioInput>(
    () => ({
      propertySelections: { [baseTypeId]: 1 },
      propertyOrder: [iid],
      investmentProfile: calcProfile,
      propertyInstances: { [iid]: instance },
      existingProperties: [],
      eventBlocks: [],
      pauseBlocks: [],
    }),
    [baseTypeId, iid, calcProfile, instance],
  )

  const result = useMemo(() => (iid ? run(scenario) : null), [run, scenario, iid])

  const nextProp = result?.timelineProperties[0] ?? null
  const projection = nextProp ? result?.projection.propertyProjections.get(nextProp.instanceId) ?? null : null
  const runInstance = nextProp ? result?.instances[nextProp.instanceId] ?? instance : instance

  const cashflow = useMemo(() => {
    if (!nextProp || !runInstance) return null
    try {
      return calculateDetailedCashflow(runInstance, nextProp.loanAmount)
    } catch (e) {
      console.error('[PurchaseBriefCalc] cashflow error:', e)
      return null
    }
  }, [nextProp, runInstance])

  const header = (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#535862] hover:text-[#181D27] transition-colors"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Back to toolkit
          </button>
        )}
        <div className="h-4 w-px bg-[#E9EAEB]" />
        <span className="text-sm font-semibold text-[#181D27]">
          Purchase Brief
        </span>
        {propertyTypes.length > 0 && (
          <select
            value={baseTypeId}
            onChange={e => onChangeType(e.target.value)}
            className="ml-auto text-sm font-medium text-[#181D27] bg-white border border-[#D5D7DA] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
          >
            {propertyTypes.map(pt => (
              <option key={pt.id} value={pt.id}>
                {pt.title}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="text-xs text-[#535862]">
        A standalone purchase brief for modelling a single property. It's not tied to any client and has no effect on their plans.
      </p>
    </div>
  )

  if (!nextProp || !projection || !cashflow || !runInstance) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
          <p className="text-sm">Select a property type to model a purchase.</p>
        </div>
      </div>
    )
  }

  return (
    <BriefView
      nextProp={nextProp}
      instanceData={runInstance}
      projection={projection}
      cashflow={cashflow}
      edit={edit}
      header={header}
    />
  )
}

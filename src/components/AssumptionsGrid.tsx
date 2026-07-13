import React, { useState, useRef, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { trackDebounced, EVENTS } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { InfoPopover } from './RetirementScenario/InfoPopover'
import {
  DEFAULT_INTEREST_RATE,
  DEFAULT_VACANCY_RATE,
  ANNUAL_INFLATION_RATE,
} from '../constants/financialParams'

const sliderClassName =
  'w-full appearance-none cursor-pointer bg-gray-200 rounded-full h-1.5 ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-[#6B7280] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.15)] ' +
  '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-[#6B7280] [&::-moz-range-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.15)]'

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #6B7280 0%, #6B7280 ${
    ((value - min) / (max - min)) * 100
  }%, #E5E7EB ${((value - min) / (max - min)) * 100}%, #E5E7EB 100%)`,
})

interface DialTileProps {
  label: string
  value: number
  defaultValue: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  format: 'percent' | 'count' | 'multiplier'
  description: string
}

const DialTile: React.FC<DialTileProps> = ({
  label,
  value,
  defaultValue,
  onChange,
  min,
  max,
  step,
  format,
  description,
}) => {
  const [expanded, setExpanded] = useState(false)
  const tileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    const handler = (e: MouseEvent) => {
      if (tileRef.current && !tileRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expanded])

  const formatValue = (v: number) => {
    if (format === 'percent') {
      return Number.isInteger(v) || step >= 1 ? `${Math.round(v)}%` : `${v.toFixed(1)}%`
    }
    if (format === 'multiplier') return `${v.toFixed(step < 1 ? 2 : 0)}×`
    return `${v}`
  }

  const isDefault = Math.abs(value - defaultValue) < 0.001
  // Defaults render in neutral grey so the assumption grid doesn't look
  // like Gameplans' amber-on-white. Overrides remain blue for contrast.
  const valueColor = isDefault ? 'text-gray-700' : 'text-blue-600'

  return (
    <div
      ref={tileRef}
      className={`bg-white rounded-lg border transition-all ${
        expanded
          ? 'border-blue-300 shadow-sm col-span-2'
          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
      }`}
      onClick={() => !expanded && setExpanded(true)}
    >
      <div className="px-4 py-4 flex flex-col items-center text-center">
        <div className={`text-xl font-semibold ${valueColor} tabular-nums leading-tight`}>
          {formatValue(value)}
        </div>
        <div className="text-[11px] text-gray-500 mt-1 leading-tight">{label}</div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-gray-400">
              {!isDefault && (
                <span className="italic">default {formatValue(defaultValue)}</span>
              )}
            </span>
            <button
              className="text-[11px] text-gray-500 hover:text-gray-900 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(false)
              }}
            >
              Done
            </button>
          </div>
          <input
            type="range"
            className={sliderClassName}
            style={getSliderStyle(value, min, max)}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              onChange(parseFloat(e.target.value))
              trackDebounced(EVENTS.assumptionChanged, { assumption: label }, `assumption:${label}`)
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
            <span>{formatValue(min)}</span>
            <span>{formatValue(max)}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  )
}

// ── LVR Tile (collapsed/expanded like DialTile) ────────────────────────────

const LVR_OPTIONS = [
  { value: 'client_comfort', label: 'Comfort' },
  { value: 'prudent_80', label: '80%' },
  { value: 'custom', label: 'Custom' },
] as const

const LvrTile: React.FC<{
  value: string
  customPercent: number
  onChange: (strategy: string, customPct?: number) => void
}> = ({ value, customPercent, onChange }) => {
  const [expanded, setExpanded] = useState(false)
  const tileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    const handler = (e: MouseEvent) => {
      if (tileRef.current && !tileRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expanded])

  const displayValue = value === 'custom'
    ? `${customPercent}%`
    : LVR_OPTIONS.find(o => o.value === value)?.label ?? 'Comfort'

  return (
    <div
      ref={tileRef}
      className={`bg-white rounded-lg border transition-all ${
        expanded
          ? 'border-blue-300 shadow-sm col-span-2'
          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
      }`}
      onClick={() => !expanded && setExpanded(true)}
    >
      <div className="px-4 py-4 flex flex-col items-center text-center">
        <div className="text-xl font-semibold text-gray-700 leading-tight">
          {displayValue}
        </div>
        <div className="text-[11px] text-gray-500 mt-1 leading-tight">AI Default LVR</div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          <div className="flex justify-end mb-2">
            <button
              className="text-[11px] text-gray-500 hover:text-gray-900 transition-colors"
              onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
            >
              Done
            </button>
          </div>
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-0.5">
            {LVR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); onChange(opt.value) }}
                className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-colors ${
                  value === opt.value
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {value === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={customPercent}
                onChange={e => { e.stopPropagation(); onChange('custom', Number(e.target.value)) }}
                onClick={e => e.stopPropagation()}
                min={50} max={95} step={1}
                className="w-16 text-xs px-2 py-1 border border-neutral-200 rounded-md text-center"
              />
              <span className="text-xs text-neutral-500">%</span>
            </div>
          )}
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            LVR the AI proposes for new purchases. Per-row edits always override.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Cost Tile ($ / % money default, collapsed/expanded like DialTile) ───────
//
// Backs the global Next-Purchase cost defaults. `value` is the profile override
// (undefined => the per-type default is used, tile renders grey). When
// `allowPercent` is set the tile offers a $ / % toggle; in percent mode `value`
// is a percentage and `mode` is 'percent'.

interface CostTileProps {
  label: string
  /** Profile override; undefined = not overridden (use per-type default). */
  value: number | undefined
  /** Baseline shown when not overridden (from createMinimalDefaults). */
  defaultValue: number
  mode: 'flat' | 'percent'
  onChange: (value: number | undefined, mode: 'flat' | 'percent') => void
  description: string
  /** Enables the $ / % segmented toggle. */
  allowPercent?: boolean
  /** Seed % used when switching flat → percent. */
  percentSeed?: number
  /** e.g. "of purchase price" - appended to the description in percent mode. */
  percentBasis?: string
}

const CostTile: React.FC<CostTileProps> = ({
  label,
  value,
  defaultValue,
  mode,
  onChange,
  description,
  allowPercent = false,
  percentSeed = 2,
  percentBasis,
}) => {
  const [expanded, setExpanded] = useState(false)
  const tileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    const handler = (e: MouseEvent) => {
      if (tileRef.current && !tileRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expanded])

  const isOverridden = value !== undefined
  const displayValue = value ?? defaultValue
  const formatMoney = (v: number) => `$${Math.round(v).toLocaleString('en-AU')}`
  const formatValue = (v: number, m: 'flat' | 'percent') =>
    m === 'percent' ? `${v}%` : formatMoney(v)

  // Defaults render grey; overrides blue - matches DialTile.
  const valueColor = isOverridden ? 'text-blue-600' : 'text-gray-700'

  // A "% of purchase/value" override is genuine even at the baseline number;
  // a plain flat-$ (or percent-of-rent) value equal to the baseline reverts to
  // the per-type default so the tile shows grey again.
  const percentBasisMode = allowPercent && mode === 'percent'

  const commitNumber = (raw: number) => {
    const v = Number.isFinite(raw) ? raw : 0
    if (!percentBasisMode && Math.abs(v - defaultValue) < 0.001) {
      onChange(undefined, mode)
    } else {
      onChange(v, mode)
    }
    trackDebounced(EVENTS.assumptionChanged, { assumption: label }, `assumption:${label}`)
  }

  const setMode = (m: 'flat' | 'percent') => {
    if (m === mode) return
    if (m === 'percent') onChange(percentSeed, 'percent')
    else onChange(undefined, 'flat') // back to per-type default dollars
  }

  return (
    <div
      ref={tileRef}
      className={`bg-white rounded-lg border transition-all ${
        expanded
          ? 'border-blue-300 shadow-sm col-span-2'
          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
      }`}
      onClick={() => !expanded && setExpanded(true)}
    >
      <div className="px-4 py-4 flex flex-col items-center text-center">
        <div className={`text-xl font-semibold ${valueColor} tabular-nums leading-tight`}>
          {formatValue(displayValue, mode)}
        </div>
        <div className="text-[11px] text-gray-500 mt-1 leading-tight">{label}</div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-gray-400">
              {isOverridden && (
                <span className="italic">
                  default {formatValue(defaultValue, allowPercent ? 'flat' : mode)}
                </span>
              )}
            </span>
            <button
              className="text-[11px] text-gray-500 hover:text-gray-900 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(false)
              }}
            >
              Done
            </button>
          </div>

          {allowPercent && (
            <div className="flex gap-1 rounded-lg bg-neutral-100 p-0.5 mb-2">
              {(['flat', 'percent'] as const).map((m) => (
                <button
                  key={m}
                  onClick={(e) => { e.stopPropagation(); setMode(m) }}
                  className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-colors ${
                    mode === m
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {m === 'flat' ? '$ Fixed' : '% Percentage'}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{mode === 'percent' ? '%' : '$'}</span>
            <input
              type="number"
              value={displayValue}
              min={0}
              step={mode === 'percent' ? 0.1 : 50}
              onChange={(e) => { e.stopPropagation(); commitNumber(parseFloat(e.target.value)) }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-xs px-2 py-1 border border-neutral-200 rounded-md text-right tabular-nums"
            />
          </div>

          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            {description}
            {mode === 'percent' && percentBasis ? ` Applied as a percentage ${percentBasis}.` : ''}
          </p>
        </div>
      )}
    </div>
  )
}

interface AssumptionsGridProps {
  /** Whether to render an internal heading + reset button row. AgentHome supplies its own external header so passes false. */
  showHeader?: boolean
  /** Externally-triggered reset, exposed so the parent's heading row can wire its own button. */
  onResetExposed?: (resetFn: () => void) => void
}

/**
 * Reusable Assumptions tile grid + reset behaviour.
 * Used inside the standalone page (legacy) and inlined on AgentHome.
 */
export const AssumptionsGrid: React.FC<AssumptionsGridProps> = ({ showHeader = true, onResetExposed }) => {
  const { profile, updateProfile } = useInvestmentProfile()

  const interestPct = profile.interestRate * 100
  const vacancyPct = profile.vacancyRate * 100
  const inflationPct = profile.inflationRate * 100
  const existingGrowthPct = profile.existingPortfolioGrowthRate * 100
  const equityReleasePct = profile.equityReleaseFactor * 100
  const rentEscalationPct = (profile.rentEscalationRate ?? 0.05) * 100

  const marginalTaxPct = (profile.marginalTaxRate ?? 0.45) * 100
  const companyTaxPct = (profile.companyTaxRate ?? 0.25) * 100
  const trustTaxPct = (profile.trustTaxRate ?? 0.30) * 100
  const smsfTaxPct = (profile.smsfTaxRate ?? 0.15) * 100
  const consolidationTaxPct = (profile.marginalTaxRateAtConsolidation ?? 0.39) * 100
  const cgtDiscountPct = (profile.cgtOneYearDiscount ?? 0.50) * 100
  const depNewBuildPct = (profile.depreciationRateNewBuild ?? 0.02) * 100
  const depEstablishedPct = (profile.depreciationRateEstablished ?? 0.005) * 100

  const handleResetAll = () => {
    updateProfile({
      growthCurve: { year1: 6, years2to3: 5.5, year4: 5, year5plus: 5 },
      existingPortfolioGrowthRate: 0.05,
      interestRate: DEFAULT_INTEREST_RATE,
      vacancyRate: DEFAULT_VACANCY_RATE,
      inflationRate: ANNUAL_INFLATION_RATE,
      maxPurchasesPerYear: 3,
      equityReleaseFactor: 0.7,
      rentEscalationRate: 0.05,
      sellingCostsPercent: 3,
      lvrStrategy: 'client_comfort' as const,
      lvrStrategyCustomPercent: 80,
      marginalTaxRate: 0.45,
      companyTaxRate: 0.25,
      trustTaxRate: 0.30,
      smsfTaxRate: 0.15,
      marginalTaxRateAtConsolidation: 0.39,
      cgtOneYearDiscount: 0.50,
      depreciationRateNewBuild: 0.02,
      depreciationRateEstablished: 0.005,
      // Clear global Next-Purchase cost overrides → restore per-type defaults.
      defaultEngagementFee: undefined,
      defaultEngagementFeeMode: undefined,
      defaultConveyancing: undefined,
      defaultMortgageFees: undefined,
      defaultBuildingPestInspection: undefined,
      defaultBuildingInsuranceUpfront: undefined,
      defaultPlumbingElectricalInspections: undefined,
      defaultIndependentValuation: undefined,
      defaultMaintenancePostSettlement: undefined,
      defaultPropertyManagementPercent: undefined,
      defaultBuildingInsuranceAnnual: undefined,
      defaultCouncilRatesWater: undefined,
      defaultStrata: undefined,
      defaultMaintenanceAnnual: undefined,
      defaultMaintenanceAnnualMode: undefined,
    })
  }

  // Expose reset to parents that supply their own header (AgentHome).
  useEffect(() => {
    onResetExposed?.(handleResetAll)
    // handleResetAll is stable enough for our purposes - re-running would
    // re-publish the same closure each render which is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResetExposed])

  return (
    <div className="flex flex-col gap-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Assumptions</h2>
          <Button variant="outline" size="sm" onClick={handleResetAll} className="flex items-center gap-2">
            <RotateCcw size={14} />
            Reset to defaults
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 auto-rows-min">
        <DialTile
          label="New Purchase Y1 Growth"
          value={profile.growthCurve.year1}
          defaultValue={6}
          onChange={(v) => updateProfile({ growthCurve: { ...profile.growthCurve, year1: v } })}
          min={2}
          max={15}
          step={0.5}
          format="percent"
          description="First-year capital growth on newly acquired properties. Higher in early years to reflect post-purchase boost."
        />
        <DialTile
          label="New Purchase Y5+ Growth"
          value={profile.growthCurve.year5plus}
          defaultValue={5}
          onChange={(v) => updateProfile({ growthCurve: { ...profile.growthCurve, year5plus: v } })}
          min={2}
          max={10}
          step={0.5}
          format="percent"
          description="Long-term growth from year 5 onwards. Dominant driver of horizon equity. Gameplans default: 5% flat."
        />
        <DialTile
          label="Existing Portfolio Growth"
          value={existingGrowthPct}
          defaultValue={5}
          onChange={(v) => updateProfile({ existingPortfolioGrowthRate: v / 100 })}
          min={1}
          max={10}
          step={0.5}
          format="percent"
          description="Growth rate for mature properties already in the client's portfolio. Override if you know specific suburb performance."
        />
        <DialTile
          label="Rent Escalation"
          value={rentEscalationPct}
          defaultValue={5}
          onChange={(v) => updateProfile({ rentEscalationRate: v / 100 })}
          min={1}
          max={10}
          step={0.5}
          format="percent"
          description="Annual rent increase applied uniformly to all properties. Decoupled from property growth tiers. Gameplans default: 5%."
        />
        <DialTile
          label="Selling Costs"
          value={profile.sellingCostsPercent ?? 3}
          defaultValue={3}
          onChange={(v) => updateProfile({ sellingCostsPercent: v })}
          min={0}
          max={10}
          step={0.5}
          format="percent"
          description="Agent commission + marketing + conveyancing deducted from sale proceeds. Gameplans default: 3%."
        />
        <LvrTile
          value={profile.lvrStrategy ?? 'client_comfort'}
          customPercent={profile.lvrStrategyCustomPercent ?? 80}
          onChange={(strategy, customPct) => {
            updateProfile({
              lvrStrategy: strategy as any,
              ...(customPct !== undefined ? { lvrStrategyCustomPercent: customPct } : {}),
            })
          }}
        />
        <DialTile
          label="Inflation Rate"
          value={inflationPct}
          defaultValue={ANNUAL_INFLATION_RATE * 100}
          onChange={(v) => updateProfile({ inflationRate: v / 100 })}
          min={0}
          max={6}
          step={0.25}
          format="percent"
          description="Cost inflation applied to operating expenses (council, insurance, maintenance). RBA target band 2–3%."
        />
        <DialTile
          label="Interest Rate"
          value={interestPct}
          defaultValue={DEFAULT_INTEREST_RATE * 100}
          onChange={(v) => updateProfile({ interestRate: v / 100 })}
          min={3}
          max={10}
          step={0.25}
          format="percent"
          description="Default interest rate for loans. Per-property rates can still be overridden in the property detail panel."
        />
        <DialTile
          label="Vacancy Rate"
          value={vacancyPct}
          defaultValue={DEFAULT_VACANCY_RATE * 100}
          onChange={(v) => updateProfile({ vacancyRate: v / 100 })}
          min={0}
          max={15}
          step={0.5}
          format="percent"
          description="Annual vacancy allowance reducing rental income. 4% ≈ 2 weeks/year, within typical lender consensus."
        />
        <DialTile
          label="Max Purchases / Year"
          value={profile.maxPurchasesPerYear}
          defaultValue={3}
          onChange={(v) => updateProfile({ maxPurchasesPerYear: Math.round(v) })}
          min={1}
          max={4}
          step={1}
          format="count"
          description="Caps how many properties can be purchased annually. Higher allows faster portfolio growth if funds permit."
        />
        <DialTile
          label="Equity Recycling"
          value={equityReleasePct}
          defaultValue={70}
          onChange={(v) => updateProfile({ equityReleaseFactor: v / 100 })}
          min={0}
          max={100}
          step={5}
          format="percent"
          description="What percentage of extractable equity gets recycled into new deposits. Higher = faster portfolio building."
        />
        <DialTile
          label="Marginal Tax Rate"
          value={marginalTaxPct}
          defaultValue={45}
          onChange={(v) => updateProfile({ marginalTaxRate: v / 100 })}
          min={0}
          max={47}
          step={0.5}
          format="percent"
          description="Personal marginal tax rate. Used for Individual entity CGT and income tax calculations."
        />
        <DialTile
          label="Company Tax Rate"
          value={companyTaxPct}
          defaultValue={25}
          onChange={(v) => updateProfile({ companyTaxRate: v / 100 })}
          min={15}
          max={30}
          step={0.5}
          format="percent"
          description="Corporate tax rate for properties held in a company entity. No CGT discount applies."
        />
        <DialTile
          label="Trust Tax Rate"
          value={trustTaxPct}
          defaultValue={30}
          onChange={(v) => updateProfile({ trustTaxRate: v / 100 })}
          min={15}
          max={47}
          step={0.5}
          format="percent"
          description="Tax rate for trust-held properties. CGT discount applies when distributed to individual beneficiaries."
        />
        <DialTile
          label="SMSF Tax Rate"
          value={smsfTaxPct}
          defaultValue={15}
          onChange={(v) => updateProfile({ smsfTaxRate: v / 100 })}
          min={0}
          max={15}
          step={0.5}
          format="percent"
          description="Concessional super fund tax rate. SMSF receives a 33.3% CGT discount on assets held over 12 months."
        />
        <DialTile
          label="Tax at Consolidation"
          value={consolidationTaxPct}
          defaultValue={39}
          onChange={(v) => updateProfile({ marginalTaxRateAtConsolidation: v / 100 })}
          min={0}
          max={47}
          step={0.5}
          format="percent"
          description="Expected marginal tax rate at the consolidation year. Often lower than current rate if client plans to reduce work income."
        />
        <DialTile
          label="CGT 1-Year Discount"
          value={cgtDiscountPct}
          defaultValue={50}
          onChange={(v) => updateProfile({ cgtOneYearDiscount: v / 100 })}
          min={0}
          max={50}
          step={5}
          format="percent"
          description="Capital gains tax discount for assets held over 12 months. Standard Australian discount is 50% for individuals."
        />
        <DialTile
          label="Depreciation – new build"
          value={depNewBuildPct}
          defaultValue={2}
          onChange={(v) => updateProfile({ depreciationRateNewBuild: v / 100 })}
          min={0}
          max={5}
          step={0.1}
          format="percent"
          description="Annual depreciation as a % of cost for new builds (Div 43 capital works + Div 40 plant & equipment). Drives the negative-gearing tax benefit. Per-property overrides take precedence."
        />
        <DialTile
          label="Depreciation – established"
          value={depEstablishedPct}
          defaultValue={0.5}
          onChange={(v) => updateProfile({ depreciationRateEstablished: v / 100 })}
          min={0}
          max={5}
          step={0.1}
          format="percent"
          description="Annual depreciation as a % of cost for established (second-hand) properties — capital works on the original structure only. Per-property overrides take precedence."
        />

        {/* ── Next-purchase cost defaults ─────────────────────────────── */}
        <div className="col-span-full flex items-center gap-1 mt-3 pt-3 border-t border-gray-200">
          <h3 className="text-[13px] font-semibold text-gray-700">Next-purchase cost defaults</h3>
          <InfoPopover
            title="Next-purchase cost defaults"
            body={[
              'These set the starting purchase and holding costs for future purchases - any property added after you change them.',
              "Properties already in the plan keep their current figures, so existing projections aren't changed.",
              'Leave a tile on its grey default to use the cost tailored to each property type.',
            ]}
          />
        </div>

        <CostTile
          label="Engagement Fee"
          value={profile.defaultEngagementFee}
          defaultValue={8000}
          mode={profile.defaultEngagementFeeMode ?? 'flat'}
          onChange={(value, mode) =>
            updateProfile({ defaultEngagementFee: value, defaultEngagementFeeMode: value === undefined ? undefined : mode })
          }
          allowPercent
          percentSeed={2}
          percentBasis="of the purchase price"
          description="Buyer's agent engagement fee for a new purchase."
        />
        <CostTile
          label="Conveyancing"
          value={profile.defaultConveyancing}
          defaultValue={2200}
          mode="flat"
          onChange={(value) => updateProfile({ defaultConveyancing: value })}
          description="Conveyancing / legal fees including searches."
        />
        <CostTile
          label="Mortgage Fees"
          value={profile.defaultMortgageFees}
          defaultValue={1000}
          mode="flat"
          onChange={(value) => updateProfile({ defaultMortgageFees: value })}
          description="Loan setup and discharge fees."
        />
        <CostTile
          label="Building & Pest"
          value={profile.defaultBuildingPestInspection}
          defaultValue={700}
          mode="flat"
          onChange={(value) => updateProfile({ defaultBuildingPestInspection: value })}
          description="Building and pest inspection cost."
        />
        <CostTile
          label="Insurance (Upfront)"
          value={profile.defaultBuildingInsuranceUpfront}
          defaultValue={1500}
          mode="flat"
          onChange={(value) => updateProfile({ defaultBuildingInsuranceUpfront: value })}
          description="Upfront building and landlord insurance premium."
        />
        <CostTile
          label="Plumbing & Electrical"
          value={profile.defaultPlumbingElectricalInspections}
          defaultValue={300}
          mode="flat"
          onChange={(value) => updateProfile({ defaultPlumbingElectricalInspections: value })}
          description="Plumbing and electrical inspection cost."
        />
        <CostTile
          label="Independent Valuation"
          value={profile.defaultIndependentValuation}
          defaultValue={0}
          mode="flat"
          onChange={(value) => updateProfile({ defaultIndependentValuation: value })}
          description="Independent property valuation cost (optional)."
        />
        <CostTile
          label="Post-Settlement Maint."
          value={profile.defaultMaintenancePostSettlement}
          defaultValue={1500}
          mode="flat"
          onChange={(value) => updateProfile({ defaultMaintenancePostSettlement: value })}
          description="Post-settlement maintenance buffer fund."
        />
        <CostTile
          label="Property Management"
          value={profile.defaultPropertyManagementPercent}
          defaultValue={8}
          mode="percent"
          onChange={(value) => updateProfile({ defaultPropertyManagementPercent: value })}
          description="Property management fee as a percentage of rent."
        />
        <CostTile
          label="Insurance (Annual)"
          value={profile.defaultBuildingInsuranceAnnual}
          defaultValue={1200}
          mode="flat"
          onChange={(value) => updateProfile({ defaultBuildingInsuranceAnnual: value })}
          description="Annual building and landlord insurance cost."
        />
        <CostTile
          label="Council Rates & Water"
          value={profile.defaultCouncilRatesWater}
          defaultValue={2000}
          mode="flat"
          onChange={(value) => updateProfile({ defaultCouncilRatesWater: value })}
          description="Annual council rates and water charges."
        />
        <CostTile
          label="Strata"
          value={profile.defaultStrata}
          defaultValue={2000}
          mode="flat"
          onChange={(value) => updateProfile({ defaultStrata: value })}
          description="Annual strata / body corporate fees. $0 for houses."
        />
        <CostTile
          label="Annual Maintenance"
          value={profile.defaultMaintenanceAnnual}
          defaultValue={1600}
          mode={profile.defaultMaintenanceAnnualMode ?? 'flat'}
          onChange={(value, mode) =>
            updateProfile({ defaultMaintenanceAnnual: value, defaultMaintenanceAnnualMode: value === undefined ? undefined : mode })
          }
          allowPercent
          percentSeed={0.5}
          percentBasis="of the property value"
          description="Annual maintenance allowance."
        />
      </div>
    </div>
  )
}

import React, { useState, useRef, useEffect } from 'react'
import { LeftRail } from '../components/LeftRail'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { Button } from '@/components/ui/button'
import { RotateCcw, Info } from 'lucide-react'
import {
  DEFAULT_INTEREST_RATE,
  DEFAULT_VACANCY_RATE,
  ANNUAL_INFLATION_RATE,
  ANNUAL_WAGE_GROWTH_RATE,
} from '../constants/financialParams'

// Slider styles — match the rest of the app
const sliderClassName =
  'w-full appearance-none cursor-pointer bg-gray-200 rounded-full h-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-[#9CA3AF] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-[1.5px] [&::-moz-range-thumb]:border-[#9CA3AF] [&::-moz-range-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)]'

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${
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

  // Close expanded state on outside click
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
      // Show 1 decimal only if needed
      return Number.isInteger(v) || step >= 1 ? `${Math.round(v)}%` : `${v.toFixed(1)}%`
    }
    if (format === 'multiplier') return `${v.toFixed(step < 1 ? 2 : 0)}×`
    return `${v}`
  }

  const isDefault = Math.abs(value - defaultValue) < 0.001
  const valueColor = isDefault ? 'text-amber-600' : 'text-blue-600'

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
            onChange={(e) => onChange(parseFloat(e.target.value))}
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

const Assumptions: React.FC = () => {
  const { profile, updateProfile } = useInvestmentProfile()

  // Convert profile decimals to display percentages (and back)
  const interestPct = profile.interestRate * 100
  const vacancyPct = profile.vacancyRate * 100
  const inflationPct = profile.inflationRate * 100
  const wageGrowthPct = profile.wageGrowthRate * 100
  const valuationResPct = profile.valuationPremiumResidential * 100
  const valuationComPct = profile.valuationPremiumCommercial * 100
  const existingGrowthPct = profile.existingPortfolioGrowthRate * 100
  const equityReleasePct = profile.equityReleaseFactor * 100

  const handleResetAll = () => {
    updateProfile({
      growthCurve: { year1: 6, years2to3: 5.5, year4: 5, year5plus: 5 },
      existingPortfolioGrowthRate: 0.05,
      interestRate: DEFAULT_INTEREST_RATE,
      vacancyRate: DEFAULT_VACANCY_RATE,
      inflationRate: ANNUAL_INFLATION_RATE,
      wageGrowthRate: ANNUAL_WAGE_GROWTH_RATE,
      valuationPremiumResidential: 0.03,
      valuationPremiumCommercial: 0.05,
      maxPurchasesPerYear: 3,
      equityReleaseFactor: 0.7,
    })
  }

  return (
    <div className="main-app flex h-screen w-full bg-white">
      <LeftRail />

      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: 64 }}
      >
        <div className="flex-1 overflow-auto bg-white">
          <div
            className="flex flex-col gap-6 mx-auto"
            style={{ padding: '40px 0 80px 0', width: '90%', maxWidth: 1200, minWidth: 500 }}
          >
            {/* Page header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Assumptions</h1>
                <p className="text-sm text-gray-500 max-w-2xl">
                  Tune the financial assumptions for this client's scenario. Tap any tile to
                  adjust. Defaults match Gameplans benchmark calibration (2026-04-30).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                className="flex items-center gap-2 shrink-0"
              >
                <RotateCcw size={14} />
                Reset to defaults
              </Button>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-blue-50/40 border border-blue-100 rounded-lg p-3">
              <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Changes affect dashboard charts and projections for this client only. The AI's
                initial plan still uses platform defaults — assumption tweaks refine what you show
                the client after generation. Tiles in <span className="text-blue-600 font-medium">blue</span> indicate values you've
                overridden. Saves automatically.
              </p>
            </div>

            {/* Dial grid — Gameplans-style compact tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 auto-rows-min">
              <DialTile
                label="New Purchase Y1 Growth"
                value={profile.growthCurve.year1}
                defaultValue={6}
                onChange={(v) =>
                  updateProfile({ growthCurve: { ...profile.growthCurve, year1: v } })
                }
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
                onChange={(v) =>
                  updateProfile({ growthCurve: { ...profile.growthCurve, year5plus: v } })
                }
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
                label="Wage Growth Rate"
                value={wageGrowthPct}
                defaultValue={ANNUAL_WAGE_GROWTH_RATE * 100}
                onChange={(v) => updateProfile({ wageGrowthRate: v / 100 })}
                min={0}
                max={6}
                step={0.25}
                format="percent"
                description="Annual increase in client's salary, applied to projected savings over the horizon."
              />
              <DialTile
                label="Residential Valuation Premium"
                value={valuationResPct}
                defaultValue={3}
                onChange={(v) => updateProfile({ valuationPremiumResidential: v / 100 })}
                min={0}
                max={10}
                step={0.5}
                format="percent"
                description="Day-zero equity boost from buying residential under valuation. Reflects BA value-add through off-market sourcing or negotiation."
              />
              <DialTile
                label="Commercial Valuation Premium"
                value={valuationComPct}
                defaultValue={5}
                onChange={(v) => updateProfile({ valuationPremiumCommercial: v / 100 })}
                min={0}
                max={15}
                step={0.5}
                format="percent"
                description="Commercial deals typically have more under-value opportunity from distressed sellers. Higher default than residential."
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
            </div>

            {/* Footer note */}
            <div className="text-[11px] text-gray-400 px-1 mt-2">
              Assumption changes save to this client's scenario and persist across sessions. They
              do not affect other clients' scenarios.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Assumptions

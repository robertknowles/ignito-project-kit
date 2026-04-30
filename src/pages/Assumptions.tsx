import React from 'react'
import { LeftRail } from '../components/LeftRail'
import { ChartCard } from '../components/ui/ChartCard'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { Button } from '@/components/ui/button'
import { RotateCcw, Info } from 'lucide-react'
import {
  DEFAULT_INTEREST_RATE,
  DEFAULT_VACANCY_RATE,
  ANNUAL_INFLATION_RATE,
  ANNUAL_WAGE_GROWTH_RATE,
} from '../constants/financialParams'

// Slider styles — match AdvancedSettingsModal styling for consistency
const sliderClassName =
  'w-full appearance-none cursor-pointer bg-gray-200 rounded-full h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-[#9CA3AF] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-[1.5px] [&::-moz-range-thumb]:border-[#9CA3AF] [&::-moz-range-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)] active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all'

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${
    ((value - min) / (max - min)) * 100
  }%, #E5E7EB ${((value - min) / (max - min)) * 100}%, #E5E7EB 100%)`,
})

interface SliderRowProps {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  format: 'percent' | 'count' | 'multiplier'
  description: string
  defaultValue: number
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  description,
  defaultValue,
}) => {
  const formatValue = (v: number) => {
    if (format === 'percent') return `${v.toFixed(step < 1 ? 1 : 0)}%`
    if (format === 'multiplier') return `${v.toFixed(step < 1 ? 2 : 0)}×`
    return `${v}`
  }

  const isDefault = Math.abs(value - defaultValue) < 0.001

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <span className="text-[11px] text-gray-400 italic">
              default {formatValue(defaultValue)}
            </span>
          )}
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {formatValue(value)}
          </span>
        </div>
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
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
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
            style={{ padding: '40px 0 80px 0', width: '80%', maxWidth: 1280, minWidth: 500 }}
          >
            {/* Page header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Assumptions</h1>
                <p className="text-sm text-gray-500 max-w-2xl">
                  Tune the financial assumptions for this client's scenario. Changes update the
                  dashboard charts in real-time. Defaults are calibrated against industry consensus
                  (Gameplans benchmark, 2026-04-30).
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
            <div className="flex items-start gap-3 bg-blue-50/50 border border-blue-100 rounded-lg p-4">
              <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                These assumptions affect the dashboard charts and projections for this client only.
                The AI's initial plan is generated using platform defaults — assumption tweaks are
                for refining what the BA shows the client after generation. Changes save
                automatically as you adjust each slider.
              </p>
            </div>

            {/* Growth Assumptions */}
            <ChartCard title="Growth Assumptions">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 p-2">
                <SliderRow
                  label="New Purchase — Year 1 Growth"
                  value={profile.growthCurve.year1}
                  onChange={(v) =>
                    updateProfile({ growthCurve: { ...profile.growthCurve, year1: v } })
                  }
                  min={2}
                  max={15}
                  step={0.5}
                  format="percent"
                  defaultValue={6}
                  description="First-year capital growth applied to newly acquired properties. Higher in early years to reflect post-purchase boost; tapers in later years."
                />
                <SliderRow
                  label="New Purchase — Year 5+ Growth"
                  value={profile.growthCurve.year5plus}
                  onChange={(v) =>
                    updateProfile({ growthCurve: { ...profile.growthCurve, year5plus: v } })
                  }
                  min={2}
                  max={10}
                  step={0.5}
                  format="percent"
                  defaultValue={5}
                  description="Long-term growth rate from year 5 onwards. The dominant driver of horizon equity. Gameplans default: 5% flat."
                />
                <SliderRow
                  label="Existing Portfolio Growth"
                  value={existingGrowthPct}
                  onChange={(v) => updateProfile({ existingPortfolioGrowthRate: v / 100 })}
                  min={1}
                  max={10}
                  step={0.5}
                  format="percent"
                  defaultValue={5}
                  description="Annual growth rate applied to mature properties already in the client's portfolio. Override if you know specific suburb performance."
                />
                <SliderRow
                  label="Inflation Rate"
                  value={inflationPct}
                  onChange={(v) => updateProfile({ inflationRate: v / 100 })}
                  min={0}
                  max={6}
                  step={0.25}
                  format="percent"
                  defaultValue={ANNUAL_INFLATION_RATE * 100}
                  description="Cost inflation applied to operating expenses (council, insurance, maintenance) over time. RBA target band 2–3%."
                />
              </div>
            </ChartCard>

            {/* Costs & Income */}
            <ChartCard title="Costs & Income">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 p-2">
                <SliderRow
                  label="Interest Rate"
                  value={interestPct}
                  onChange={(v) => updateProfile({ interestRate: v / 100 })}
                  min={3}
                  max={10}
                  step={0.25}
                  format="percent"
                  defaultValue={DEFAULT_INTEREST_RATE * 100}
                  description="Default interest rate for loans on this scenario. Per-property rates can still be overridden in the property detail panel."
                />
                <SliderRow
                  label="Vacancy Rate"
                  value={vacancyPct}
                  onChange={(v) => updateProfile({ vacancyRate: v / 100 })}
                  min={0}
                  max={15}
                  step={0.5}
                  format="percent"
                  defaultValue={DEFAULT_VACANCY_RATE * 100}
                  description="Annual vacancy allowance reducing rental income. 4% ≈ 2 weeks/year — within typical lender consensus."
                />
                <SliderRow
                  label="Wage Growth Rate"
                  value={wageGrowthPct}
                  onChange={(v) => updateProfile({ wageGrowthRate: v / 100 })}
                  min={0}
                  max={6}
                  step={0.25}
                  format="percent"
                  defaultValue={ANNUAL_WAGE_GROWTH_RATE * 100}
                  description="Annual increase in client's salary, applied to projected annual savings over the horizon."
                />
              </div>
            </ChartCard>

            {/* Manufactured Equity */}
            <ChartCard title="Manufactured Equity at Purchase">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 p-2">
                <SliderRow
                  label="Residential — Valuation Premium"
                  value={valuationResPct}
                  onChange={(v) => updateProfile({ valuationPremiumResidential: v / 100 })}
                  min={0}
                  max={10}
                  step={0.5}
                  format="percent"
                  defaultValue={3}
                  description="Day-zero equity boost from buying residential property under valuation. Reflects BA value-add through off-market sourcing or negotiation."
                />
                <SliderRow
                  label="Commercial — Valuation Premium"
                  value={valuationComPct}
                  onChange={(v) => updateProfile({ valuationPremiumCommercial: v / 100 })}
                  min={0}
                  max={15}
                  step={0.5}
                  format="percent"
                  defaultValue={5}
                  description="Commercial deals typically have more under-value opportunity from distressed sellers and net-lease pricing. Higher default than residential."
                />
              </div>
            </ChartCard>

            {/* Engine Behaviour */}
            <ChartCard title="Engine Behaviour">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 p-2">
                <SliderRow
                  label="Maximum Purchases Per Year"
                  value={profile.maxPurchasesPerYear}
                  onChange={(v) => updateProfile({ maxPurchasesPerYear: Math.round(v) })}
                  min={1}
                  max={4}
                  step={1}
                  format="count"
                  defaultValue={3}
                  description="Limits how many properties can be purchased annually for realistic planning. Higher values allow faster portfolio growth if funds permit."
                />
                <SliderRow
                  label="Equity Recycling Aggressiveness"
                  value={equityReleasePct}
                  onChange={(v) => updateProfile({ equityReleaseFactor: v / 100 })}
                  min={0}
                  max={100}
                  step={5}
                  format="percent"
                  defaultValue={70}
                  description="What percentage of extractable equity gets recycled into new deposits. Higher = faster portfolio building, more leverage; lower = more conservative pacing."
                />
              </div>
            </ChartCard>

            {/* Footer note */}
            <div className="text-xs text-gray-400 px-2">
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

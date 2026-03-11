import React, { useState } from 'react'
import { ChevronDown, ChevronRight, CalculatorIcon, Settings2 } from 'lucide-react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { BorrowingCalculatorModal } from './BorrowingCalculatorModal'
import { AdvancedSettingsModal } from './AdvancedSettingsModal'
import { Switch } from '@/components/ui/switch'
import { TourStep } from '@/components/TourManager'

// Slider styles for consistent appearance - Clean black track and handle
const sliderClassName = "w-full appearance-none cursor-pointer bg-slate-200 rounded-full h-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2563EB] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#2563EB] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all"

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #2563EB 0%, #2563EB ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
})

// Format compact currency
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`
  }
  return `$${value}`
}

interface CompactSliderProps {
  label: string
  value: number
  onChange: (val: number) => void
  min: number
  max: number
  step: number
  formatValue?: (val: number) => string
}

const CompactSlider: React.FC<CompactSliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue = formatCompactCurrency,
}) => {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide truncate">
          {label}
        </span>
        <span className="text-[11px] font-semibold text-slate-700 ml-1">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        className={sliderClassName}
        style={getSliderStyle(value, min, max)}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
      />
    </div>
  )
}

// Format years display
const formatYears = (years: number): string => `${years} years`

interface ClientDetailsCardProps {
  defaultExpanded?: boolean
}

export const ClientDetailsCard: React.FC<ClientDetailsCardProps> = ({ defaultExpanded = true }) => {
  const { profile, updateProfile, handleEquityGoalChange, handleCashflowGoalChange } = useInvestmentProfile()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isCalcOpen, setIsCalcOpen] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  // Collapsed state metrics
  const collapsedMetrics = `${formatCompactCurrency(profile.depositPool)} deposit | ${formatCompactCurrency(profile.borrowingCapacity)} capacity | ${formatCompactCurrency(profile.annualSavings)}/yr savings`

  return (
    <TourStep
      id="client-details"
      title="Client Details"
      content="Set your client's financial position: deposit pool, borrowing capacity, annual savings, and current portfolio. These inputs drive the affordability calculations for the investment timeline."
      order={6}
      position="bottom"
    >
      <div 
        id="client-details-card"
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
      >
        {/* Header - Always visible, clickable to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={18} className="text-gray-500" />
            ) : (
              <ChevronRight size={18} className="text-gray-500" />
            )}
            <h3 className="text-sm font-semibold text-gray-900">Client Details</h3>
          </div>
          <span className="text-xs text-gray-500">{collapsedMetrics}</span>
        </button>

        {/* Expanded Content - 3 Column Layout */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-6">
              {/* Column 1: Investment Goals */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">Investment Goals</h4>
                <div className="space-y-3">
                  <CompactSlider
                    label="Investment Horizon"
                    value={profile.timelineYears}
                    onChange={(val) => updateProfile({ timelineYears: val })}
                    min={5}
                    max={30}
                    step={1}
                    formatValue={formatYears}
                  />
                  <CompactSlider
                    label="Equity Goal"
                    value={profile.equityGoal}
                    onChange={handleEquityGoalChange}
                    min={100000}
                    max={5000000}
                    step={50000}
                  />
                  <CompactSlider
                    label="Cashflow Goal (Annual)"
                    value={profile.cashflowGoal}
                    onChange={handleCashflowGoalChange}
                    min={10000}
                    max={200000}
                    step={5000}
                  />
                </div>
              </div>

              {/* Column 2: Personal Details */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">Personal Details</h4>
                <div className="space-y-3">
                  <CompactSlider
                    label="Deposit Pool"
                    value={profile.depositPool}
                    onChange={(val) => updateProfile({ depositPool: val })}
                    min={10000}
                    max={500000}
                    step={5000}
                  />
                  <CompactSlider
                    label="Borrowing Capacity"
                    value={profile.borrowingCapacity}
                    onChange={(val) => updateProfile({ borrowingCapacity: val })}
                    min={100000}
                    max={2000000}
                    step={50000}
                  />
                  <CompactSlider
                    label="Annual Savings"
                    value={profile.annualSavings}
                    onChange={(val) => updateProfile({ annualSavings: val })}
                    min={0}
                    max={100000}
                    step={1000}
                  />
                </div>
              </div>

              {/* Column 3: Current Portfolio */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">Current Portfolio</h4>
                <div className="space-y-3">
                  <CompactSlider
                    label="Current Value"
                    value={profile.portfolioValue}
                    onChange={(val) => updateProfile({ portfolioValue: val })}
                    min={0}
                    max={5000000}
                    step={50000}
                  />
                  <CompactSlider
                    label="Current Debt"
                    value={profile.currentDebt}
                    onChange={(val) => updateProfile({ currentDebt: val })}
                    min={0}
                    max={4000000}
                    step={50000}
                  />
                  
                  {/* Use Existing Equity Toggle */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide">
                        Use Existing Equity
                      </span>
                      <span className="text-[8px] text-slate-400">
                        Include in purchase calculations
                      </span>
                    </div>
                    <Switch
                      checked={profile.useExistingEquity}
                      onCheckedChange={(checked) => updateProfile({ useExistingEquity: checked })}
                      className="data-[state=checked]:bg-[#2563EB] scale-90"
                    />
                  </div>

                  {/* Advanced Settings Button */}
                  <button
                    onClick={() => setIsAdvancedOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <Settings2 size={14} />
                    <span className="font-medium">Advanced Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Calculate Borrowing Capacity Button - Full Width */}
            <button
              onClick={() => setIsCalcOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 mt-4 rounded-lg bg-slate-50 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <CalculatorIcon size={14} />
              <span className="font-medium">Calculate Borrowing Capacity</span>
              <span className="text-slate-400">— Estimate how much your client can borrow</span>
            </button>
          </div>
        )}
      </div>

      {/* Borrowing Calculator Modal */}
      <BorrowingCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
      />

      {/* Advanced Settings Modal */}
      <AdvancedSettingsModal
        isOpen={isAdvancedOpen}
        onClose={() => setIsAdvancedOpen(false)}
      />
    </TourStep>
  )
}

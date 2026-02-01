import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useRoadmapData } from '../hooks/useRoadmapData'

// Slider styles for consistent appearance - Clean black track and handle (matching ClientDetailsCard)
const sliderClassName = "w-full appearance-none cursor-pointer bg-slate-200 rounded-full h-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all"

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #0f172a 0%, #0f172a ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
})

// Format currency
const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString()}`
}

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

// Format time display
const formatTime = (years: number, months: number): string => {
  if (months === 0) return `${years} years`
  return `${years}y ${months}m`
}

// Format percentage
const formatPercent = (value: number): string => `${value}%`

interface RetirementSnapshotProps {
  defaultExpanded?: boolean
}

export const RetirementSnapshot: React.FC<RetirementSnapshotProps> = ({ defaultExpanded = true }) => {
  const { profile } = useInvestmentProfile()
  const { years } = useRoadmapData()
  
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  
  // Snapshot time slider (years from now)
  const [snapshotYears, setSnapshotYears] = useState(10)
  const [snapshotMonths, setSnapshotMonths] = useState(0)
  
  // Sell-off percentage slider
  const [sellOffPercent, setSellOffPercent] = useState(0)
  
  // Calculate metrics at the snapshot time
  const snapshotMetrics = useMemo(() => {
    const targetYear = 2025 + snapshotYears
    
    // Find the year data closest to our snapshot
    const yearData = years.find(y => y.year === targetYear) || years[years.length - 1]
    
    if (!yearData) {
      return {
        value: 0,
        debt: 0,
        equity: 0,
        netCashflow: 0,
        liquidity: 0,
        serviceability: 0,
      }
    }
    
    const portfolioValue = yearData.portfolioValueRaw || 0
    const totalDebt = yearData.totalDebt || 0
    const totalEquity = yearData.totalEquityRaw || 0
    const netCashflow = yearData.annualCashflow || 0
    
    // Apply sell-off percentage
    const sellOffFactor = 1 - (sellOffPercent / 100)
    const adjustedValue = portfolioValue * sellOffFactor
    const adjustedDebt = totalDebt * sellOffFactor
    const adjustedEquity = totalEquity * sellOffFactor
    const adjustedCashflow = netCashflow * sellOffFactor
    
    // Liquidity = cash from selling properties (value - debt for sold portion)
    const liquidity = (portfolioValue - totalDebt) * (sellOffPercent / 100)
    
    // Serviceability surplus from yearBreakdownData
    const serviceability = yearData.yearBreakdownData?.serviceabilityTest?.surplus || 
      (yearData.availableFundsRaw || 0)
    
    return {
      value: Math.round(adjustedValue),
      debt: Math.round(adjustedDebt),
      equity: Math.round(adjustedEquity),
      netCashflow: Math.round(adjustedCashflow),
      liquidity: Math.round(liquidity),
      serviceability: Math.round(serviceability * sellOffFactor + liquidity * 0.05), // Simplified calculation
    }
  }, [years, snapshotYears, sellOffPercent])

  // Combined slider value for snapshot time
  const totalMonths = snapshotYears * 12 + snapshotMonths
  const maxMonths = profile.timelineYears * 12

  const handleTimeSliderChange = (value: number) => {
    const years = Math.floor(value / 12)
    const months = value % 12
    setSnapshotYears(years)
    setSnapshotMonths(months)
  }

  // Collapsed state metrics
  const collapsedMetrics = `${snapshotYears}y ${snapshotMonths}m | ${sellOffPercent}% sell-off | ${formatCompactCurrency(snapshotMetrics.equity)} equity`

  return (
    <div 
      id="retirement-snapshot-card"
      className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm"
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
          <h3 className="text-sm font-semibold text-gray-900">Retirement Scenario</h3>
        </div>
        <span className="text-xs text-gray-500">{collapsedMetrics}</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1.5 border-t border-gray-100">
          {/* Sliders Row */}
          <div className="flex items-center gap-4">
            <CompactSlider
              label="Snapshot Time"
              value={totalMonths}
              onChange={handleTimeSliderChange}
              min={0}
              max={maxMonths}
              step={1}
              formatValue={() => formatTime(snapshotYears, snapshotMonths)}
            />
            <CompactSlider
              label="Sell-off Portfolio"
              value={sellOffPercent}
              onChange={setSellOffPercent}
              min={0}
              max={100}
              step={5}
              formatValue={formatPercent}
            />
          </div>
          
          {/* Metrics Row */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide mb-2">Portfolio Snapshot</h4>
            <div className="grid grid-cols-6 gap-3">
              {/* Value */}
              <div className="text-center">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide block mb-0.5">Value</span>
                <span className="text-xs font-semibold text-slate-700">{formatCompactCurrency(snapshotMetrics.value)}</span>
              </div>
              {/* Debt */}
              <div className="text-center">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide block mb-0.5">Debt</span>
                <span className="text-xs font-semibold text-red-500">{formatCompactCurrency(snapshotMetrics.debt)}</span>
              </div>
              {/* Equity */}
              <div className="text-center">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide block mb-0.5">Equity</span>
                <span className="text-xs font-semibold text-green-600">{formatCompactCurrency(snapshotMetrics.equity)}</span>
              </div>
              {/* Net Cashflow */}
              <div className="text-center">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide block mb-0.5">Cashflow</span>
                <span className={`text-xs font-semibold ${snapshotMetrics.netCashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatCompactCurrency(snapshotMetrics.netCashflow)}
                </span>
              </div>
              {/* Liquidity */}
              <div className="text-center">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide block mb-0.5">Liquidity</span>
                <span className="text-xs font-semibold text-amber-500">{formatCompactCurrency(snapshotMetrics.liquidity)}</span>
              </div>
              {/* Serviceability */}
              <div className="text-center">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide block mb-0.5">Service</span>
                <span className="text-xs font-semibold text-green-600">{formatCompactCurrency(snapshotMetrics.serviceability)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

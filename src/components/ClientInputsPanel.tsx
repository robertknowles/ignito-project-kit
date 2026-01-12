import React, { useState } from 'react'
import { CalculatorIcon } from 'lucide-react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { BorrowingCalculatorModal } from './BorrowingCalculatorModal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TourStep } from '@/components/TourManager'

// Slider styles for consistent appearance - Clean black track and handle
const sliderClassName = "w-full appearance-none cursor-pointer bg-slate-200 rounded-full h-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all"

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #0f172a 0%, #0f172a ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
})

// Format value for display
const formatValue = (value: number, formatAsCurrency: boolean, suffix?: string) => {
  if (formatAsCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }
  return suffix ? `${value} ${suffix}` : value.toString()
}

interface SliderFieldProps {
  label: string
  value: number
  onChange: (val: number) => void
  min: number
  max: number
  step: number
  minLabel: string
  maxLabel: string
  formatAsCurrency?: boolean
  suffix?: string
}

const SliderField: React.FC<SliderFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  formatAsCurrency = true,
  suffix,
}) => {
  const [isActive, setIsActive] = useState(false)

  return (
    <div 
      className={`bg-white rounded-lg border px-2.5 py-1.5 transition-all duration-150 ${
        isActive 
          ? 'border-slate-900 shadow-sm' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Header: Label left, Value right */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] uppercase font-semibold text-slate-500 tracking-wide">
          {label}
        </span>
        <span className="text-xs font-bold text-slate-900">
          {formatValue(value, formatAsCurrency, suffix)}
        </span>
      </div>
      
      {/* Slider Track */}
      <div>
        <input
          type="range"
          className={sliderClassName}
          style={getSliderStyle(value, min, max)}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          onMouseDown={() => setIsActive(true)}
          onMouseUp={() => setIsActive(false)}
          onMouseLeave={() => setIsActive(false)}
          onTouchStart={() => setIsActive(true)}
          onTouchEnd={() => setIsActive(false)}
        />
      </div>
      
      {/* Min/Max Labels - Only visible when active */}
      <div className={`flex justify-between items-center mt-0.5 transition-opacity duration-150 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}>
        <span className="text-[8px] text-slate-400">{minLabel}</span>
        <span className="text-[8px] text-slate-400">{maxLabel}</span>
      </div>
    </div>
  )
}

export const ClientInputsPanel: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    handleEquityGoalChange, 
    handleCashflowGoalChange 
  } = useInvestmentProfile()
  
  const [isCalcOpen, setIsCalcOpen] = useState(false)

  return (
    <TooltipProvider>
      <div id="client-inputs-panel" className="flex flex-col gap-5">
        {/* Investment Goals Section */}
        <TourStep
          id="investment-goals"
          title="Investment Goals"
          content="Set your client's targets here: Investment Horizon (how many years to model), Equity Goal (wealth target), and Cashflow Goal (passive income target). These goals drive the entire strategy."
          order={6}
          position="right"
        >
        <div id="investment-goals-section">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              Investment Goals
            </h3>
          </div>
        <div className="flex flex-col gap-1.5">
          {/* Timeline */}
          <SliderField
            label="Investment Horizon"
            value={profile.timelineYears}
            onChange={(val) => updateProfile({ timelineYears: val })}
            min={5}
            max={20}
            step={1}
            minLabel="5 yrs"
            maxLabel="20 yrs"
            formatAsCurrency={false}
            suffix="years"
          />

          {/* Equity Goal */}
          <SliderField
            label="Equity Goal"
            value={profile.equityGoal}
            onChange={handleEquityGoalChange}
            min={0}
            max={5000000}
            step={50000}
            minLabel="$0"
            maxLabel="$5M"
          />

          {/* Cashflow Goal */}
          <SliderField
            label="Cashflow Goal (Annual)"
            value={profile.cashflowGoal}
            onChange={handleCashflowGoalChange}
            min={0}
            max={200000}
            step={5000}
            minLabel="$0"
            maxLabel="$200k"
          />
        </div>
      </div>
      </TourStep>

      {/* Personal Details Section */}
      <div id="personal-details">
        <h3 className="text-[9px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          Personal Details
        </h3>
        <div className="flex flex-col gap-1.5">
          {/* Deposit Pool */}
          <SliderField
            label="Deposit Pool"
            value={profile.depositPool}
            onChange={(val) => updateProfile({ depositPool: val })}
            min={10000}
            max={500000}
            step={5000}
            minLabel="$10k"
            maxLabel="$500k"
          />

          {/* Borrowing Capacity */}
          <SliderField
            label="Borrowing Capacity"
            value={profile.borrowingCapacity}
            onChange={(val) => updateProfile({ borrowingCapacity: val })}
            min={100000}
            max={2000000}
            step={50000}
            minLabel="$100k"
            maxLabel="$2M"
          />

          {/* Annual Savings */}
          <SliderField
            label="Annual Savings"
            value={profile.annualSavings}
            onChange={(val) => updateProfile({ annualSavings: val })}
            min={0}
            max={100000}
            step={1000}
            minLabel="$0"
            maxLabel="$100k"
          />
        </div>
      </div>

      {/* Current Portfolio Section */}
      <div>
        <h3 className="text-[9px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          Current Portfolio
        </h3>
        <div className="flex flex-col gap-1.5">
          {/* Current Portfolio Value */}
          <SliderField
            label="Current Value"
            value={profile.portfolioValue}
            onChange={(val) => updateProfile({ portfolioValue: val })}
            min={0}
            max={5000000}
            step={50000}
            minLabel="$0"
            maxLabel="$5M"
          />

          {/* Current Debt */}
          <SliderField
            label="Current Debt"
            value={profile.currentDebt}
            onChange={(val) => updateProfile({ currentDebt: val })}
            min={0}
            max={4000000}
            step={50000}
            minLabel="$0"
            maxLabel="$4M"
          />
        </div>
      </div>

      {/* Borrowing Capacity Calculator */}
      <button
        onClick={() => setIsCalcOpen(true)}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-lg bg-slate-50 text-xs text-slate-600 hover:bg-slate-100 transition-colors group"
      >
        <div className="w-6 h-6 rounded-md bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-slate-600">
          <CalculatorIcon size={14} />
        </div>
        <div className="text-left">
          <div className="font-medium text-slate-700">Calculate Borrowing Capacity</div>
          <div className="text-[10px] text-slate-400">Estimate how much your client can borrow</div>
        </div>
      </button>
      </div>

      {/* Borrowing Calculator Modal */}
      <BorrowingCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
      />
    </TooltipProvider>
  )
}


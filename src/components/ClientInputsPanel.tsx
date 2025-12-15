import React, { useState, useEffect } from 'react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'

// Buffered input component to prevent "bouncing" while typing
interface BufferedInputProps {
  value: number
  onChange: (val: number) => void
  min: number
  max: number
  formatAsCurrency?: boolean
  suffix?: string
}

const BufferedInput: React.FC<BufferedInputProps> = ({
  value,
  onChange,
  min,
  max,
  formatAsCurrency = true,
  suffix,
}) => {
  const [localValue, setLocalValue] = useState(value.toString())
  const [isFocused, setIsFocused] = useState(false)

  // Sync local value when external value changes (e.g., from slider)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString())
    }
  }, [value, isFocused])

  const formatDisplayValue = (val: string) => {
    if (isFocused) return val
    const num = parseFloat(val) || 0
    if (formatAsCurrency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(num)
    }
    return val
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }

  const commitValue = () => {
    const cleaned = localValue.replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned) || 0
    const clamped = Math.min(max, Math.max(min, parsed))
    onChange(clamped)
    setLocalValue(clamped.toString())
  }

  const handleBlur = () => {
    setIsFocused(false)
    commitValue()
  }

  const handleFocus = () => {
    setIsFocused(true)
    setLocalValue(value.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="text"
        value={formatDisplayValue(localValue)}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className="w-20 text-center bg-transparent focus:outline-none text-xs text-[#6b7280] font-medium"
      />
      {suffix && <span className="text-xs text-[#6b7280]">{suffix}</span>}
    </div>
  )
}

// Slider styles for consistent appearance
const sliderClassName = "w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((value - min) / (max - min)) * 100}%, #f3f4f6 ${((value - min) / (max - min)) * 100}%, #f3f4f6 100%)`,
  height: '4px',
  opacity: '0.8',
})

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
}) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-2">
      {label}
    </label>
    <div className="mb-1">
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
    <div className="flex justify-between items-center">
      <span className="text-xs text-[#9ca3af]">{minLabel}</span>
      <BufferedInput
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        formatAsCurrency={formatAsCurrency}
        suffix={suffix}
      />
      <span className="text-xs text-[#9ca3af]">{maxLabel}</span>
    </div>
  </div>
)

export const ClientInputsPanel: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    handleEquityGoalChange, 
    handleCashflowGoalChange 
  } = useInvestmentProfile()

  return (
    <div className="flex flex-col gap-6">
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

      {/* Current Portfolio Value */}
      <SliderField
        label="Current Portfolio Value"
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

      {/* Investment Goals Section */}
      <div className="pt-2 border-t border-gray-100">
        <h3 className="text-xs font-semibold text-[#374151] mb-4 uppercase tracking-wide">
          Investment Goals
        </h3>
        <div className="flex flex-col gap-5">
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

      {/* Timeline */}
      <div className="pt-2 border-t border-gray-100">
        <SliderField
          label="Timeline (Years)"
          value={profile.timelineYears}
          onChange={(val) => updateProfile({ timelineYears: val })}
          min={5}
          max={30}
          step={1}
          minLabel="5 yrs"
          maxLabel="30 yrs"
          formatAsCurrency={false}
          suffix="years"
        />
      </div>
    </div>
  )
}

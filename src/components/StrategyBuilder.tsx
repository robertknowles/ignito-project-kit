import React, { useState, useMemo, useEffect } from 'react'
import { ClipboardIcon, SlidersIcon, Plus, X, Pause, Pencil, ChevronUp, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PropertyCard } from './PropertyCardMemo'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { CustomBlockModal } from './CustomBlockModal'
import type { CustomPropertyBlock } from './CustomBlockModal'
import { PropertyDetailModal } from './PropertyDetailModal'

// Buffered input component to prevent "bouncing" while typing
interface BufferedStrategyInputProps {
  value: number
  onChange: (val: number) => void
  min: number
  max: number
  formatAsCurrency?: boolean
  suffix?: string
  className?: string
}

const BufferedStrategyInput: React.FC<BufferedStrategyInputProps> = ({
  value,
  onChange,
  min,
  max,
  formatAsCurrency = true,
  suffix,
  className = "w-24 text-center bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-[#6b7280] font-medium"
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
    // Allow any input while typing (including empty string)
    setLocalValue(e.target.value)
  }

  const commitValue = () => {
    // Parse the value, removing any non-numeric characters
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
    // Show raw number when focused for easier editing
    setLocalValue(value.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={formatDisplayValue(localValue)}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {suffix && <span className="text-xs text-[#6b7280]">{suffix}</span>}
    </div>
  )
}

interface StrategyBuilderProps {
  profileOnly?: boolean
  propertyOnly?: boolean
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  profileOnly = false,
  propertyOnly = false,
}) => {
  const { 
    profile, 
    calculatedValues, 
    updateProfile, 
    handleEquityGoalChange, 
    handleCashflowGoalChange 
  } = useInvestmentProfile()

  const {
    calculations,
    checkFeasibility,
    incrementProperty,
    decrementProperty,
    getPropertyQuantity,
    propertyTypes,
    pauseBlocks,
    addPause,
    removePause,
    updatePauseDuration,
    getPauseCount,
    customBlocks,
    addCustomBlock,
    removeCustomBlock,
  } = usePropertySelection()

  const [showCustomBlockModal, setShowCustomBlockModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: 'default' | 'cost'; direction: 'asc' | 'desc' }>({ key: 'default', direction: 'asc' })
  const navigate = useNavigate()
  const { getPropertyTypeTemplate } = useDataAssumptions()

  // Parse currency input (handles "$125,000" format)
  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  // Extract cost from priceRange string (e.g., "$250k-$450k" -> 250000)
  const extractMinCost = (priceRange: string): number => {
    const match = priceRange.match(/\$?([\d.]+)([kKmM])?/)
    if (!match) return 0
    let value = parseFloat(match[1])
    const suffix = match[2]?.toLowerCase()
    if (suffix === 'k') value *= 1000
    if (suffix === 'm') value *= 1000000
    return value
  }

  // Sort properties based on sortConfig
  const sortedProperties = useMemo(() => {
    if (sortConfig.key === 'default') {
      return propertyTypes
    }
    return [...propertyTypes].sort((a, b) => {
      const costA = extractMinCost(a.priceRange)
      const costB = extractMinCost(b.priceRange)
      return sortConfig.direction === 'asc' ? costA - costB : costB - costA
    })
  }, [propertyTypes, sortConfig])

  const handleSaveCustomBlock = (block: CustomPropertyBlock) => {
    addCustomBlock(block)
  }
  
  const handleEditTemplate = (propertyTitle: string) => {
    // Open modal to edit the template
    setEditingTemplate(propertyTitle)
  }
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })
      .format(value)
  }
  // Render only the client profile section
  if (profileOnly) {
    return (
      <div className="pt-4">
        <div className="mb-5">
          <label className="block text-xs font-normal text-[#374151] mb-3">
            Deposit Pool
          </label>
          <div className="relative mb-2">
            <input
              type="range"
              className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((profile.depositPool - 10000) / (500000 - 10000)) * 100}%, #f3f4f6 ${((profile.depositPool - 10000) / (500000 - 10000)) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="10000"
              max="500000"
              step="5000"
              value={profile.depositPool}
              onChange={(e) => updateProfile({ depositPool: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-[#6b7280] w-16 text-left">$10k</span>
            <div className="flex-1 flex justify-center">
              <BufferedStrategyInput
                value={profile.depositPool}
                onChange={(val) => updateProfile({ depositPool: val })}
                min={10000}
                max={500000}
              />
            </div>
            <span className="text-xs text-[#6b7280] w-16 text-right">$500k</span>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-normal text-[#374151] mb-3">
            Borrowing Capacity
          </label>
          <div className="relative mb-2">
            <input
              type="range"
              className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((profile.borrowingCapacity - 100000) / (2000000 - 100000)) * 100}%, #f3f4f6 ${((profile.borrowingCapacity - 100000) / (2000000 - 100000)) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="100000"
              max="2000000"
              step="50000"
              value={profile.borrowingCapacity}
              onChange={(e) => updateProfile({ borrowingCapacity: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-[#6b7280] w-16 text-left">$100k</span>
            <div className="flex-1 flex justify-center">
              <BufferedStrategyInput
                value={profile.borrowingCapacity}
                onChange={(val) => updateProfile({ borrowingCapacity: val })}
                min={100000}
                max={2000000}
              />
            </div>
            <span className="text-xs text-[#6b7280] w-16 text-right">$2M</span>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-normal text-[#374151] mb-3">
            Current Portfolio Value
          </label>
          <div className="relative mb-2">
            <input
              type="range"
              className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(profile.portfolioValue / 5000000) * 100}%, #f3f4f6 ${(profile.portfolioValue / 5000000) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="0"
              max="5000000"
              step="50000"
              value={profile.portfolioValue}
              onChange={(e) => updateProfile({ portfolioValue: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-[#6b7280] w-16 text-left">$0</span>
            <div className="flex-1 flex justify-center">
              <BufferedStrategyInput
                value={profile.portfolioValue}
                onChange={(val) => updateProfile({ portfolioValue: val })}
                min={0}
                max={5000000}
              />
            </div>
            <span className="text-xs text-[#6b7280] w-16 text-right">$5M</span>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-normal text-[#374151] mb-3">
            Current Debt
          </label>
          <div className="relative mb-2">
            <input
              type="range"
              className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(profile.currentDebt / 4000000) * 100}%, #f3f4f6 ${(profile.currentDebt / 4000000) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="0"
              max="4000000"
              step="50000"
              value={profile.currentDebt}
              onChange={(e) => updateProfile({ currentDebt: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-[#6b7280] w-16 text-left">$0</span>
            <div className="flex-1 flex justify-center">
              <BufferedStrategyInput
                value={profile.currentDebt}
                onChange={(val) => updateProfile({ currentDebt: val })}
                min={0}
                max={4000000}
              />
            </div>
            <span className="text-xs text-[#6b7280] w-16 text-right">$4M</span>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-normal text-[#374151] mb-3">
            Annual Savings
          </label>
          <div className="relative mb-2">
            <input
              type="range"
              className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(profile.annualSavings / 100000) * 100}%, #f3f4f6 ${(profile.annualSavings / 100000) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="0"
              max="100000"
              step="1000"
              value={profile.annualSavings}
              onChange={(e) => updateProfile({ annualSavings: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-[#6b7280] w-16 text-left">$0</span>
            <div className="flex-1 flex justify-center">
              <BufferedStrategyInput
                value={profile.annualSavings}
                onChange={(val) => updateProfile({ annualSavings: val })}
                min={0}
                max={100000}
              />
            </div>
            <span className="text-xs text-[#6b7280] w-16 text-right">$100k</span>
          </div>
        </div>
        {/* Investment Goals Section */}
        <div className="mb-5">
          {/* Equity Goal Slider */}
          <div className="mb-3">
            <span className="text-xs text-[#374151] block mb-1">Equity Goal</span>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(profile.equityGoal / 5000000) * 100}%, #f3f4f6 ${(profile.equityGoal / 5000000) * 100}%, #f3f4f6 100%)`,
                  height: '4px',
                  opacity: '0.8',
                }}
                min="0"
                max="5000000"
                step="50000"
                value={profile.equityGoal}
                onChange={(e) => handleEquityGoalChange(parseInt(e.target.value))}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-[#6b7280] w-16 text-left">$0</span>
              <div className="flex-1 flex justify-center">
                <BufferedStrategyInput
                  value={profile.equityGoal}
                  onChange={(val) => handleEquityGoalChange(val)}
                  min={0}
                  max={5000000}
                />
              </div>
              <span className="text-xs text-[#6b7280] w-16 text-right">$5M</span>
            </div>
          </div>
          {/* Cashflow Goal Slider */}
          <div>
            <span className="text-xs text-[#374151] block mb-1">Cashflow Goal (Annual)</span>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(profile.cashflowGoal / 200000) * 100}%, #f3f4f6 ${(profile.cashflowGoal / 200000) * 100}%, #f3f4f6 100%)`,
                  height: '4px',
                  opacity: '0.8',
                }}
                min="0"
                max="200000"
                step="5000"
                value={profile.cashflowGoal}
                onChange={(e) => handleCashflowGoalChange(parseInt(e.target.value))}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-[#6b7280] w-16 text-left">$0</span>
              <div className="flex-1 flex justify-center">
                <BufferedStrategyInput
                  value={profile.cashflowGoal}
                  onChange={(val) => handleCashflowGoalChange(val)}
                  min={0}
                  max={200000}
                />
              </div>
              <span className="text-xs text-[#6b7280] w-16 text-right">$200k</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-normal text-[#374151] mb-3">
            Timeline (Years)
          </label>
          <div className="relative mb-2">
            <input
              type="range"
              className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((profile.timelineYears - 5) / 25) * 100}%, #f3f4f6 ${((profile.timelineYears - 5) / 25) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="5"
              max="30"
              step="1"
              value={profile.timelineYears}
              onChange={(e) => updateProfile({ timelineYears: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-[#6b7280] w-16 text-left">5 yrs</span>
            <div className="flex-1 flex justify-center">
              <BufferedStrategyInput
                value={profile.timelineYears}
                onChange={(val) => updateProfile({ timelineYears: val })}
                min={5}
                max={30}
                formatAsCurrency={false}
                suffix="years"
                className="w-12 text-center bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-[#6b7280] font-medium"
              />
            </div>
            <span className="text-xs text-[#6b7280] w-16 text-right">30 yrs</span>
          </div>
        </div>
      </div>
    )
  }
  // Render only the property building blocks section
  if (propertyOnly) {
    const pauseCount = getPauseCount();
    const defaultPauseDuration = pauseBlocks.length > 0 ? pauseBlocks[pauseBlocks.length - 1].duration : 1;

    return (
      <div>
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setSortConfig({ key: 'default', direction: 'asc' })}
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded transition-colors border ${
              sortConfig.key === 'default' 
                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                : 'bg-white text-[#374151] hover:bg-[#f9fafb] border-[#f3f4f6]'
            }`}
          >
            <span>All...</span>
          </button>
          <button 
            onClick={() => setSortConfig(prev => ({
              key: 'cost',
              direction: prev.key === 'cost' && prev.direction === 'asc' ? 'desc' : 'asc'
            }))}
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded transition-colors border ${
              sortConfig.key === 'cost' 
                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                : 'bg-white text-[#374151] hover:bg-[#f9fafb] border-[#f3f4f6]'
            }`}
          >
            <SlidersIcon size={12} />
            <span>By Cost</span>
            {sortConfig.key === 'cost' && (
              sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
            )}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {sortedProperties.map((property) => {
            const isCustomProperty = property.isCustom;
            
            return (
              <div key={property.id} className="relative">
                <PropertyCard
                  title={property.title}
                  priceRange={property.priceRange}
                  yield={property.yield}
                  cashFlow={property.cashFlow}
                  riskLevel={property.riskLevel}
                  count={getPropertyQuantity(property.id)}
                  selected={getPropertyQuantity(property.id) > 0}
                  onIncrement={() => incrementProperty(property.id)}
                  onDecrement={() => decrementProperty(property.id)}
                />
                {/* Edit template button for non-custom properties */}
                {!isCustomProperty && (
                  <button
                    onClick={() => handleEditTemplate(property.title)}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded shadow-sm text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors z-20 border border-gray-200"
                    title="Edit template"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {/* Delete button for custom properties */}
                {isCustomProperty && (
                  <button
                    onClick={() => removeCustomBlock(property.id)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                    title="Delete custom block"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Pause Period Block */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Pause size={16} className="text-gray-400" />
                  Pause Period
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Strategic pause in acquisitions
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex-1">
                <select 
                  value={defaultPauseDuration}
                  onChange={(e) => {
                    const newDuration = parseFloat(e.target.value);
                    if (pauseBlocks.length > 0) {
                      updatePauseDuration(pauseBlocks[pauseBlocks.length - 1].id, newDuration);
                    }
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 w-full"
                >
                  <option value="0.5">6 months</option>
                  <option value="1">1 year</option>
                  <option value="1.5">1.5 years</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 ml-3">
                <button 
                  onClick={() => removePause()}
                  disabled={pauseCount === 0}
                  className={`w-7 h-7 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                    pauseCount === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  -
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[1.5rem] text-center">
                  {pauseCount}
                </span>
                <button 
                  onClick={() => addPause(defaultPauseDuration)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="text-xs text-gray-400 mt-3">
              {pauseCount} pause{pauseCount !== 1 ? 's' : ''} added to timeline
            </div>
          </div>
        </div>

        {/* Add Custom Block Button */}
        <button
          onClick={() => setShowCustomBlockModal(true)}
          className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add Custom Property Block
        </button>

        {/* Custom Block Modal */}
        <CustomBlockModal
          isOpen={showCustomBlockModal}
          onClose={() => setShowCustomBlockModal(false)}
          onSave={handleSaveCustomBlock}
        />
        
        {/* Property Template Edit Modal */}
        {editingTemplate && (
          <PropertyDetailModal
            isOpen={!!editingTemplate}
            onClose={() => setEditingTemplate(null)}
            instanceId={`template_${editingTemplate}`}
            propertyType={editingTemplate}
            isTemplate={true}
          />
        )}
      </div>
    )
  }
  // Default render (full component) - not used in the new layout
  return (
    <div className="bg-white rounded-lg p-8 border border-[#f3f4f6]">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardIcon size={16} className="text-[#6b7280]" />
        <h2 className="text-[#111827] font-medium text-sm">
          Investment Strategy Builder
        </h2>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Client Profile - Left Column */}
        <div className="w-full lg:w-1/2 bg-[#f9fafb] rounded-lg p-6">
          <div className="mb-5">
            <label className="block text-xs font-normal text-[#374151] mb-3">
              Deposit Pool
            </label>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full h-2 appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${profile.depositPool / 5000}%, #f3f4f6 ${profile.depositPool / 5000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="10000"
                max="500000"
                step="5000"
                value={profile.depositPool}
                onChange={(e) => updateProfile({ depositPool: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-[#6b7280]">$10k</span>
              <span className="text-xs text-[#6b7280]">$250k</span>
              <span className="text-xs text-[#6b7280]">$500k</span>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-normal text-[#374151] mb-3">
              Borrowing Capacity
            </label>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${profile.borrowingCapacity / 20000}%, #f3f4f6 ${profile.borrowingCapacity / 20000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="100000"
                max="2000000"
                step="50000"
                value={profile.borrowingCapacity}
                onChange={(e) => updateProfile({ borrowingCapacity: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-[#6b7280]">$100k</span>
              <span className="text-xs text-[#6b7280]">$1M</span>
              <span className="text-xs text-[#6b7280]">$2M</span>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-normal text-[#374151] mb-3">
              Current Portfolio Value
            </label>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${profile.portfolioValue / 50000}%, #f3f4f6 ${profile.portfolioValue / 50000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="0"
                max="5000000"
                step="50000"
                value={profile.portfolioValue}
                onChange={(e) => updateProfile({ portfolioValue: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-[#6b7280]">$0</span>
              <span className="text-xs text-[#6b7280]">$2.5M</span>
              <span className="text-xs text-[#6b7280]">$5M</span>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-normal text-[#374151] mb-3">
              Current Debt
            </label>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${profile.currentDebt / 40000}%, #f3f4f6 ${profile.currentDebt / 40000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="0"
                max="4000000"
                step="50000"
                value={profile.currentDebt}
                onChange={(e) => updateProfile({ currentDebt: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-[#6b7280]">$0</span>
              <span className="text-xs text-[#6b7280]">$2M</span>
              <span className="text-xs text-[#6b7280]">$4M</span>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-normal text-[#374151] mb-3">
              Annual Savings
            </label>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${profile.annualSavings / 1000}%, #f3f4f6 ${profile.annualSavings / 1000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="0"
                max="100000"
                step="1000"
                value={profile.annualSavings}
                onChange={(e) => updateProfile({ annualSavings: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-[#6b7280]">$0</span>
              <span className="text-xs text-[#6b7280]">$50k</span>
              <span className="text-xs text-[#6b7280]">$100k</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-normal text-[#374151] mb-3">
              Timeline (Years)
            </label>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((profile.timelineYears - 5) / 25) * 100}%, #f3f4f6 ${((profile.timelineYears - 5) / 25) * 100}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="5"
                max="30"
                step="1"
                value={profile.timelineYears}
                onChange={(e) => updateProfile({ timelineYears: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-[#6b7280]">5 years</span>
              <span className="text-xs text-[#6b7280]">15 years</span>
              <span className="text-xs text-[#6b7280]">30 years</span>
            </div>
          </div>
        </div>
        {/* Property Building Blocks - Right Column */}
        <div className="w-full lg:w-1/2">
          <div className="flex gap-4 mb-6">
            <button className="flex items-center gap-2 text-xs bg-white px-4 py-2 rounded text-[#374151] hover:bg-[#f9fafb] transition-colors border border-[#f3f4f6]">
              <span>All...</span>
            </button>
            <button className="flex items-center gap-2 text-xs bg-white px-4 py-2 rounded text-[#374151] hover:bg-[#f9fafb] transition-colors border border-[#f3f4f6]">
              <SlidersIcon size={12} />
              <span>By Cost</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PropertyCard
              title="Granny Flats"
              priceRange="$170k-$400k"
              yield="-9%"
              cashFlow="Positive"
              riskLevel="Medium"
            />
            <PropertyCard
              title="Villas / Townhouses"
              priceRange="$250k-$400k"
              yield="6-8%"
              cashFlow="Negative"
              riskLevel="High"
            />
            <PropertyCard
              title="Units / Apartments"
              priceRange="$250k-$450k"
              yield="6-8%"
              cashFlow="Neutral → Positive"
              riskLevel="High"
              selected={true}
            />
            <PropertyCard
              title="Houses (Regional)"
              priceRange="$250k-$450k"
              yield="6-8%"
              cashFlow="Neutral → Positive"
              riskLevel="Medium"
            />
            <PropertyCard
              title="Duplexes"
              priceRange="$250k-$450k"
              yield="6-8%"
              cashFlow="Neutral → Positive"
              riskLevel="Medium"
            />
            <PropertyCard
              title="Metro Houses"
              priceRange="$600k-$800k"
              yield="4-5%"
              cashFlow="Negative"
              riskLevel="Medium-Low"
            />
            <PropertyCard
              title="Commercial Retail"
              priceRange="$400k-$1.2M"
              yield="7-9%"
              cashFlow="Positive"
              riskLevel="High"
            />
            <PropertyCard
              title="Office Space"
              priceRange="$500k-$2M"
              yield="6-8%"
              cashFlow="Positive"
              riskLevel="Very High"
            />
            <PropertyCard
              title="Industrial Units"
              priceRange="$350k-$1.5M"
              yield="7-10%"
              cashFlow="Positive"
              riskLevel="High"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
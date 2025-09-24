import React, { useState } from 'react'
import { ClipboardIcon, SlidersIcon } from 'lucide-react'
import { PropertyCard } from './PropertyCard'
interface StrategyBuilderProps {
  profileOnly?: boolean
  propertyOnly?: boolean
}
export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  profileOnly = false,
  propertyOnly = false,
}) => {
  const [depositPool, setDepositPool] = useState(50000)
  const [borrowingCapacity, setBorrowingCapacity] = useState(500000)
  const [portfolioValue, setPortfolioValue] = useState(0)
  const [currentDebt, setCurrentDebt] = useState(0)
  const [annualSavings, setAnnualSavings] = useState(24000)
  const [equityGrowth, setEquityGrowth] = useState(75)
  const [cashflow, setCashflow] = useState(25)
  const [timeline, setTimeline] = useState(15)
  // Handle equity growth slider change
  const handleEquityGrowthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEquityGrowth = parseInt(e.target.value)
    setEquityGrowth(newEquityGrowth)
    setCashflow(100 - newEquityGrowth)
  }
  // Handle cashflow slider change
  const handleCashflowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCashflow = parseInt(e.target.value)
    setCashflow(newCashflow)
    setEquityGrowth(100 - newCashflow)
  }
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })
      .format(value)
      .replace('$', '')
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
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((depositPool - 10000) / (500000 - 10000)) * 100}%, #f3f4f6 ${((depositPool - 10000) / (500000 - 10000)) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="10000"
              max="500000"
              step="5000"
              value={depositPool}
              onChange={(e) => setDepositPool(parseInt(e.target.value))}
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
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((borrowingCapacity - 100000) / (2000000 - 100000)) * 100}%, #f3f4f6 ${((borrowingCapacity - 100000) / (2000000 - 100000)) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="100000"
              max="2000000"
              step="50000"
              value={borrowingCapacity}
              onChange={(e) => setBorrowingCapacity(parseInt(e.target.value))}
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
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(portfolioValue / 5000000) * 100}%, #f3f4f6 ${(portfolioValue / 5000000) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="0"
              max="5000000"
              step="50000"
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(parseInt(e.target.value))}
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
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentDebt / 4000000) * 100}%, #f3f4f6 ${(currentDebt / 4000000) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="0"
              max="4000000"
              step="50000"
              value={currentDebt}
              onChange={(e) => setCurrentDebt(parseInt(e.target.value))}
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
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(annualSavings / 100000) * 100}%, #f3f4f6 ${(annualSavings / 100000) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="0"
              max="100000"
              step="1000"
              value={annualSavings}
              onChange={(e) => setAnnualSavings(parseInt(e.target.value))}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-[#6b7280]">$0</span>
            <span className="text-xs text-[#6b7280]">$50k</span>
            <span className="text-xs text-[#6b7280]">$100k</span>
          </div>
        </div>
        {/* Investment Goal Weighting Section */}
        <div className="mb-5">
          <label className="block text-xs font-normal text-[#374151] mb-3">
            Investment Goal Weighting
          </label>
          {/* Equity Growth Slider */}
          <div className="mb-3">
            <div className="mb-1">
              <span className="text-xs text-[#374151]">Equity Growth</span>
            </div>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${equityGrowth}%, #f3f4f6 ${equityGrowth}%, #f3f4f6 100%)`,
                  height: '4px',
                  opacity: '0.8',
                }}
                min="0"
                max="100"
                step="5"
                value={equityGrowth}
                onChange={handleEquityGrowthChange}
              />
            </div>
            <div className="flex justify-end mt-1">
              <span className="text-xs text-[#374151]">{equityGrowth}%</span>
            </div>
          </div>
          {/* Cashflow Slider */}
          <div>
            <div className="mb-1">
              <span className="text-xs text-[#374151]">Cashflow</span>
            </div>
            <div className="relative mb-2">
              <input
                type="range"
                className="w-full appearance-none cursor-pointer bg-[#f3f4f6] rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:opacity-60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:opacity-60 [&::-moz-range-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:opacity-70 hover:[&::-moz-range-thumb]:opacity-70 focus:[&::-webkit-slider-thumb]:opacity-70 focus:[&::-moz-range-thumb]:opacity-70"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${cashflow}%, #f3f4f6 ${cashflow}%, #f3f4f6 100%)`,
                  height: '4px',
                  opacity: '0.8',
                }}
                min="0"
                max="100"
                step="5"
                value={cashflow}
                onChange={handleCashflowChange}
              />
            </div>
            <div className="flex justify-end mt-1">
              <span className="text-xs text-[#374151]">{cashflow}%</span>
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
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((timeline - 5) / 25) * 100}%, #f3f4f6 ${((timeline - 5) / 25) * 100}%, #f3f4f6 100%)`,
                height: '4px',
                opacity: '0.8',
              }}
              min="5"
              max="30"
              step="1"
              value={timeline}
              onChange={(e) => setTimeline(parseInt(e.target.value))}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-[#6b7280]">5 years</span>
            <span className="text-xs text-[#6b7280]">15 years</span>
            <span className="text-xs text-[#6b7280]">30 years</span>
          </div>
        </div>
      </div>
    )
  }
  // Render only the property building blocks section
  if (propertyOnly) {
    return (
      <div>
        <div className="flex gap-4 mb-6">
          <button className="flex items-center gap-2 text-xs bg-white px-4 py-2 rounded text-[#374151] hover:bg-[#f9fafb] transition-colors border border-[#f3f4f6]">
            <span>All...</span>
          </button>
          <button className="flex items-center gap-2 text-xs bg-white px-4 py-2 rounded text-[#374151] hover:bg-[#f9fafb] transition-colors border border-[#f3f4f6]">
            <SlidersIcon size={12} />
            <span>By Cost</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
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
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${depositPool / 5000}%, #f3f4f6 ${depositPool / 5000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="10000"
                max="500000"
                step="5000"
                value={depositPool}
                onChange={(e) => setDepositPool(parseInt(e.target.value))}
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
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${borrowingCapacity / 20000}%, #f3f4f6 ${borrowingCapacity / 20000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="100000"
                max="2000000"
                step="50000"
                value={borrowingCapacity}
                onChange={(e) => setBorrowingCapacity(parseInt(e.target.value))}
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
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${portfolioValue / 50000}%, #f3f4f6 ${portfolioValue / 50000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="0"
                max="5000000"
                step="50000"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(parseInt(e.target.value))}
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
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${currentDebt / 40000}%, #f3f4f6 ${currentDebt / 40000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="0"
                max="4000000"
                step="50000"
                value={currentDebt}
                onChange={(e) => setCurrentDebt(parseInt(e.target.value))}
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
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${annualSavings / 1000}%, #f3f4f6 ${annualSavings / 1000}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="0"
                max="100000"
                step="1000"
                value={annualSavings}
                onChange={(e) => setAnnualSavings(parseInt(e.target.value))}
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
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((timeline - 5) / 25) * 100}%, #f3f4f6 ${((timeline - 5) / 25) * 100}%, #f3f4f6 100%)`,
                  height: '2px',
                  opacity: '0.6',
                }}
                min="5"
                max="30"
                step="1"
                value={timeline}
                onChange={(e) => setTimeline(parseInt(e.target.value))}
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
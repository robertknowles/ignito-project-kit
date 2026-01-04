import React from 'react'
import { Pencil } from 'lucide-react'
import { PropertyTypeIcon } from '../utils/propertyTypeIcon'
import type { PropertyTypeTemplate } from '../contexts/DataAssumptionsContext'

// Growth rate tiers matching DataAssumptionsContext
const GROWTH_RATES = {
  High: { year1: 12.5, years2to3: 10, year4: 7.5, year5plus: 6 },
  Medium: { year1: 8, years2to3: 6, year4: 5, year5plus: 4 },
  Low: { year1: 5, years2to3: 4, year4: 3.5, year5plus: 3 },
} as const

interface TitleDeedCardProps {
  template: PropertyTypeTemplate
  onEdit: () => void
}

export const TitleDeedCard: React.FC<TitleDeedCardProps> = ({ template, onEdit }) => {
  // Calculate derived values
  const yieldPercent = ((template.rentPerWeek * 52) / template.purchasePrice) * 100
  const mortgageValue = (template.purchasePrice * template.lvr) / 100
  const growthRates = GROWTH_RATES[template.growthAssumption] || GROWTH_RATES.Medium
  
  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`
    }
    return `$${(value / 1000).toFixed(0)}k`
  }

  return (
    <div className="flex flex-col rounded-xl">
      {/* Main Card */}
      <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors rounded-t-xl border-b-0 overflow-hidden">
        {/* Header with icon and title */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
          <div className="flex-shrink-0 bg-gray-100 p-1.5 rounded-md">
            <PropertyTypeIcon propertyTitle={template.propertyType} size={16} className="text-gray-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-wider text-gray-400">Title Deed</div>
            <h4 className="font-medium text-gray-900 text-xs truncate">{template.propertyType}</h4>
          </div>
        </div>
        
        {/* Card Body */}
        <div className="px-3 py-2.5 space-y-2.5">
          {/* Price - Centered */}
          <div className="text-center pb-2 border-b border-gray-100">
            <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-0.5">
              Purchase Price
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(template.purchasePrice)}
            </div>
          </div>
          
          {/* Rent & Yield */}
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-400">Rent</span>
            <span className="text-gray-700">${template.rentPerWeek}/wk</span>
          </div>
          
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-400">Annual Yield</span>
            <span className="text-gray-700">{yieldPercent.toFixed(1)}%</span>
          </div>
          
          {/* Growth Rates Section */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
              Growth ({template.growthAssumption})
            </div>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div>
                <div className="text-[9px] text-gray-400">Y1</div>
                <div className="text-[10px] text-gray-700">{growthRates.year1}%</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-400">Y2-3</div>
                <div className="text-[10px] text-gray-700">{growthRates.years2to3}%</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-400">Y4</div>
                <div className="text-[10px] text-gray-700">{growthRates.year4}%</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-400">Y5+</div>
                <div className="text-[10px] text-gray-700">{growthRates.year5plus}%</div>
              </div>
            </div>
          </div>
          
          {/* Mortgage Value */}
          <div className="text-center pt-2 border-t border-gray-100">
            <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-0.5">
              Mortgage Value
            </div>
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(mortgageValue)}
            </div>
          </div>
          
          {/* Loan Details - Compact */}
          <div className="bg-gray-50 rounded-lg px-2.5 py-2">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
              <div className="flex justify-between">
                <span className="text-gray-400">LVR</span>
                <span className="text-gray-600">{template.lvr}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rate</span>
                <span className="text-gray-600">{template.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="text-gray-600">{template.loanProduct === 'IO' ? 'Interest Only' : 'P&I'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Term</span>
                <span className="text-gray-600">{template.loanTerm}yr</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-400">State</span>
                <span className="text-gray-600">{template.state}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Template Footer */}
      <button
        onClick={onEdit}
        className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 rounded-b-xl transition-colors border border-t-0 border-gray-200"
      >
        <Pencil size={10} className="text-gray-500" />
        <span className="text-[10px] text-gray-500">Edit Template</span>
      </button>
    </div>
  )
}

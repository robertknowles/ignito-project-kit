import React from 'react'
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
    <div className="flex flex-col rounded border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
      {/* White content area */}
      <div className="bg-white px-3 py-2.5">
        <div className="flex flex-col gap-2">
          {/* Row 1: Property Title with icon */}
          <div className="flex items-center gap-1.5">
            <div className="bg-gray-100 rounded p-1 flex items-center justify-center">
              <PropertyTypeIcon propertyTitle={template.propertyType} size={14} className="text-gray-500" />
            </div>
            <span className="text-[11px] flex items-center">
              <span className="font-medium text-gray-900">{template.propertyType}</span>
              <span className="text-gray-300 mx-1">|</span>
              <span className="text-gray-600">
                Growth: {template.growthAssumption}
              </span>
            </span>
          </div>
          
          {/* Row 2: PURCHASE */}
          <div className="text-[10px] text-gray-600">
            <span className="text-gray-400 uppercase tracking-wide mr-1">Purchase:</span>
            <span className="text-gray-700">{formatCurrency(template.purchasePrice)}</span>
            <span className="mx-1 text-gray-300">|</span>
            <span className="text-gray-700">{template.lvr}%</span>
          </div>
          
          {/* Row 3: DETAILS */}
          <div className="text-[10px] text-gray-600">
            <span className="text-gray-400 uppercase tracking-wide mr-1">Details:</span>
            <span className="text-gray-700">{template.state}</span>
            <span className="mx-1 text-gray-300">|</span>
            <span>Rental Yield: {yieldPercent.toFixed(1)}%</span>
            <span className="mx-1 text-gray-300">|</span>
            <span className="text-gray-700">${template.rentPerWeek}/wk</span>
          </div>
          
          {/* Row 4: LOAN */}
          <div className="text-[10px] text-gray-600">
            <span className="text-gray-400 uppercase tracking-wide mr-1">Loan:</span>
            <span className="text-gray-700">{formatCurrency(mortgageValue)}</span>
            <span className="mx-1 text-gray-300">|</span>
            <span className="text-gray-700">{template.interestRate}%</span>
            <span className="mx-1 text-gray-300">|</span>
            <span className="text-gray-700">{template.loanProduct === 'IO' ? 'Interest Only' : 'P&I'}</span>
            <span className="mx-1 text-gray-300">|</span>
            <span className="text-gray-700">{template.loanTerm}yr</span>
          </div>
          
          {/* Row 5: GROWTH RATES */}
          <div className="text-[10px] text-gray-600">
            <span className="text-gray-400 uppercase tracking-wide mr-1">Growth:</span>
            <span className="text-gray-700">Y1: {growthRates.year1}%</span>
            <span className="mx-1 text-gray-300">→</span>
            <span className="text-gray-700">Y2-3: {growthRates.years2to3}%</span>
            <span className="mx-1 text-gray-300">→</span>
            <span className="text-gray-700">Y4: {growthRates.year4}%</span>
            <span className="mx-1 text-gray-300">→</span>
            <span className="text-gray-700">Y5+: {growthRates.year5plus}%</span>
          </div>
        </div>
      </div>
      
      {/* Grey footer with edit link */}
      <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5 flex items-center">
        <button
          onClick={onEdit}
          className="text-[10px] hover:underline"
          style={{ color: '#87B5FA' }}
        >
          Edit Template →
        </button>
      </div>
    </div>
  )
}

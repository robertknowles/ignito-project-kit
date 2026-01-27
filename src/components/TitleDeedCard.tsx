import React from 'react'
import { PropertyTypeIcon } from '../utils/propertyTypeIcon'
import type { PropertyTypeTemplate } from '../contexts/DataAssumptionsContext'

// Growth rate tiers matching DataAssumptionsContext
const GROWTH_RATES = {
  High: { year1: 12.5, years2to3: 10, year4: 7.5, year5plus: 6 },
  Medium: { year1: 8, years2to3: 6, year4: 5, year5plus: 4 },
  Low: { year1: 5, years2to3: 4, year4: 3.5, year5plus: 3 },
} as const

// Property images mapping - matches PropertyBlocksPanel.tsx
const PROPERTY_IMAGES: Record<string, string> = {
  'Metro Houses': '/images/properties/metro-house.png',
  'Units / Apartments': '/images/properties/units-apartments.png',
  'Villas / Townhouses': '/images/properties/townhouses.png',
  'Houses (Regional)': '/images/properties/regional-house.png',
  'Duplexes': '/images/properties/duplex.png',
  'Small Blocks (3-4 Units)': '/images/properties/smaller-blocks-3-4.png',
  'Larger Blocks (10-20 Units)': '/images/properties/larger-blocks-10-20.png',
  'Commercial Property': '/images/properties/commercial-property.png',
}

// Get property image with normalization to handle legacy name mismatches
const getPropertyImage = (propertyTitle: string): string | undefined => {
  if (PROPERTY_IMAGES[propertyTitle]) {
    return PROPERTY_IMAGES[propertyTitle]
  }
  const normalizeForMatch = (name: string) => name.toLowerCase().replace(' focus', '').trim()
  const normalizedInput = normalizeForMatch(propertyTitle)
  const matchingKey = Object.keys(PROPERTY_IMAGES).find(
    key => normalizeForMatch(key) === normalizedInput
  )
  return matchingKey ? PROPERTY_IMAGES[matchingKey] : undefined
}

// Get image style for settings page cards
const getSettingsImageStyle = (propertyTitle: string): React.CSSProperties | undefined => {
  const normalizedTitle = propertyTitle.toLowerCase()
  
  // Units / Apartments
  if (normalizedTitle.includes('units / apartments')) {
    return { transform: 'scale(0.85)', objectPosition: 'center 75%' }
  }
  
  // Small Blocks and Larger Blocks
  if (normalizedTitle.includes('small blocks') || normalizedTitle.includes('larger blocks')) {
    return { transform: 'scale(0.85)', objectPosition: 'center 60%' }
  }
  
  // Commercial Property
  if (normalizedTitle.includes('commercial')) {
    return { transform: 'scale(0.85)', objectPosition: 'center' }
  }
  
  return undefined
}

// Check if property needs special positioning (no object-center class)
const needsCustomPosition = (propertyTitle: string): boolean => {
  const normalizedTitle = propertyTitle.toLowerCase()
  return (
    normalizedTitle.includes('units / apartments') || 
    normalizedTitle.includes('small blocks') || 
    normalizedTitle.includes('larger blocks') ||
    normalizedTitle.includes('commercial')
  )
}

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

  const imageUrl = getPropertyImage(template.propertyType)

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
      {/* Image header area - matches PropertyBlocksPanel */}
      {imageUrl ? (
        <div className="w-full h-48 bg-white border-b border-gray-200 overflow-hidden">
          <img 
            src={imageUrl} 
            alt={template.propertyType}
            className={`w-full h-full object-cover ${needsCustomPosition(template.propertyType) ? '' : 'object-center'}`}
            style={getSettingsImageStyle(template.propertyType)}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      ) : (
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded p-1.5 flex items-center justify-center border border-gray-200">
              <PropertyTypeIcon propertyTitle={template.propertyType} size={16} className="text-gray-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium tracking-wide text-gray-900">{template.propertyType}</span>
              <span className="text-[10px] font-medium tracking-wide text-gray-500">
                Growth: {template.growthAssumption}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Property name and growth below image */}
      {imageUrl && (
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded p-1.5 flex items-center justify-center border border-gray-200">
              <PropertyTypeIcon propertyTitle={template.propertyType} size={16} className="text-gray-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium tracking-wide text-gray-900">{template.propertyType}</span>
              <span className="text-[10px] font-medium tracking-wide text-gray-500">
                Growth: {template.growthAssumption}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* White content area */}
      <div className="bg-white px-4 py-3">
        <div className="flex flex-col gap-2">
          {/* PURCHASE PRICE Section */}
          <div className="text-center py-1.5 border-b border-gray-100">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Purchase Price</div>
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(template.purchasePrice)}</div>
          </div>
          
          {/* Rent & Yield Rows */}
          <div className="space-y-1 pb-2 border-b border-gray-100">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-medium text-gray-600">Rent</span>
              <span className="text-gray-700">${template.rentPerWeek}/wk</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-medium text-gray-600">Annual Yield</span>
              <span className="text-gray-700">{yieldPercent.toFixed(1)}%</span>
            </div>
          </div>
          
          {/* GROWTH Section */}
          <div className="pb-2 border-b border-gray-100">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Growth ({template.growthAssumption})
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
              <div>
                <div className="font-medium text-gray-400">Y1</div>
                <div className="text-gray-700">{growthRates.year1}%</div>
              </div>
              <div>
                <div className="font-medium text-gray-400">Y2-3</div>
                <div className="text-gray-700">{growthRates.years2to3}%</div>
              </div>
              <div>
                <div className="font-medium text-gray-400">Y4</div>
                <div className="text-gray-700">{growthRates.year4}%</div>
              </div>
              <div>
                <div className="font-medium text-gray-400">Y5+</div>
                <div className="text-gray-700">{growthRates.year5plus}%</div>
              </div>
            </div>
          </div>
          
          {/* MORTGAGE VALUE Section */}
          <div>
            <div className="text-center mb-1.5">
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Mortgage Value</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(mortgageValue)}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] bg-gray-50 rounded p-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">LVR</span>
                <span className="text-gray-700">{template.lvr}%</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Rate</span>
                <span className="text-gray-700">{template.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Type</span>
                <span className="text-gray-700">{template.loanProduct === 'IO' ? 'Interest Only' : 'P&I'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Term</span>
                <span className="text-gray-700">{template.loanTerm}yr</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">State</span>
                <span className="text-gray-700">{template.state}</span>
              </div>
            </div>
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

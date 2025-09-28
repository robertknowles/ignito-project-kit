import React from 'react'
import {
  CalendarIcon,
  BuildingIcon,
  HomeIcon,
  Building2Icon,
} from 'lucide-react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { calculateBorrowingCapacityProgression } from '../utils/metricsCalculator'
import { useAutoSaveTimeline } from '../hooks/useAutoSaveTimeline'
import type { PropertyPurchase } from '../types/property'
export const InvestmentTimeline = () => {
  const { calculatedValues, profile } = useInvestmentProfile()
  const { calculations, checkFeasibility } = usePropertySelection()
  const { timelineProperties } = useAffordabilityCalculator()
  const { globalFactors, getPropertyData } = useDataAssumptions()
  
  // Auto-save timeline results
  useAutoSaveTimeline(timelineProperties, calculations);
  
  // Get feasibility status based on current selections
  const feasibility = checkFeasibility(calculatedValues.availableDeposit, profile.borrowingCapacity)
  
  // Determine status based on timeline results
  const getTimelineStatus = (): 'feasible' | 'delayed' | 'challenging' => {
    if (calculations.totalProperties === 0) return 'feasible'
    
    const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible')
    const challengingProperties = timelineProperties.filter(p => p.status === 'challenging')
    
    if (challengingProperties.length > 0) return 'challenging'
    if (feasibleProperties.length < timelineProperties.length) return 'delayed'
    return 'feasible'
  }

  const timelineStatus = getTimelineStatus()

  // Generate timeline items using affordability calculator with improved progression display
  const generateTimelineItems = () => {
    if (calculations.totalProperties === 0) {
      return [
        {
          year: "2025",
          quarter: "Yr 0",
          type: "No properties selected",
          deposit: "$0",
          price: "$0",
          loanAmount: "$0",
          portfolioValue: "$0",
          equity: "$0",
          status: 'feasible' as const
        }
      ]
    }

    return timelineProperties.map((property, index) => {
      // Improved year display logic for realistic progression
      const isAffordable = property.status === 'feasible';
      const timelineEndYear = 2025 + profile.timelineYears;
      
      let yearDisplay: string;
      let quarterDisplay: string;
      
      if (isAffordable && property.affordableYear <= timelineEndYear) {
        // Show actual calculated year for affordable properties within timeline
        yearDisplay = property.affordableYear.toString();
        quarterDisplay = `Yr ${property.affordableYear - 2025}`;
      } else if (property.affordableYear > timelineEndYear) {
        // Property is affordable but beyond the set timeline
        yearDisplay = `${property.affordableYear}`;
        quarterDisplay = `Yr ${property.affordableYear - 2025}`;
      } else {
        // Property is not affordable within reasonable timeframe
        yearDisplay = "Beyond Timeline";
        quarterDisplay = "N/A";
      }

      return {
        year: yearDisplay,
        quarter: quarterDisplay,
        type: property.title,
        deposit: `$${Math.round(property.depositRequired / 1000)}k`,
        price: `$${Math.round(property.cost / 1000)}k`,
        loanAmount: `$${Math.round(property.loanAmount / 1000)}k`,
        portfolioValue: `$${Math.round(property.portfolioValueAfter / 1000)}k`,
        equity: `$${Math.round(property.totalEquityAfter / 1000)}k`,
        status: property.status,
        number: property.propertyIndex > 0 ? `#${property.propertyIndex + 1}` : undefined,
        affordableYear: property.affordableYear
      };
    }).slice(0, 8); // Show more properties to demonstrate progression
  }

  const timelineItems = generateTimelineItems()

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <CalendarIcon size={16} className="text-[#6b7280]" />
        <h3 className="text-[#111827] font-medium text-sm">
          Investment Timeline
        </h3>
      </div>
      <div className="flex gap-4 mb-8">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f9fafb] text-[#374151] rounded-full text-xs font-normal">
          <span className="w-1.5 h-1.5 bg-[#10b981] bg-opacity-50 rounded-full"></span>{' '}
          Feasible
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f9fafb] text-[#374151] rounded-full text-xs font-normal">
          <span className="w-1.5 h-1.5 bg-[#3b82f6] bg-opacity-60 rounded-full"></span>{' '}
          Delayed
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f9fafb] text-[#374151] rounded-full text-xs font-normal">
          <span className="w-1.5 h-1.5 bg-[#3b82f6] bg-opacity-60 rounded-full"></span>{' '}
          Challenging
        </span>
      </div>
      <div className="flex flex-col gap-6">
        {timelineItems.map((item, index) => (
          <TimelineItem
            key={`${item.year}-${item.type}-${index}`}
            year={item.year}
            quarter={item.quarter}
            type={item.type}
            number={item.number}
            deposit={item.deposit}
            loanAmount={item.loanAmount}
            source="Savings & Equity"
            equity={item.equity}
            portfolioValue={item.portfolioValue}
            price={item.price}
            status={item.status}
            isLast={index === timelineItems.length - 1}
          />
        ))}
      </div>
      <div className="mt-8 text-xs text-[#374151] bg-[#f9fafb] p-6 rounded-md leading-relaxed">
        <p className="mb-3">
          {calculations.totalProperties > 0 
            ? `Timeline shows ${timelineProperties.length} properties with realistic purchase progression. ${timelineProperties.filter(p => p.status === 'feasible').length} properties are feasible within timeline. Total investment: $${Math.round(calculations.totalCost / 1000)}k.`
            : "Select properties to generate an investment timeline. Timeline shows sequential property purchases based on accumulated equity and cash flow."
          }
        </p>
        {timelineProperties.length > 0 && (
          <div className="mb-3">
            <p>Properties by year: {timelineProperties.filter(p => p.status === 'feasible').map(p => `${p.title} (${p.affordableYear})`).join(', ') || 'None within timeline'}</p>
            <p className="mt-2 text-[#059669]">
              💡 Borrowing capacity improves over time: Rental income (70% counted by banks) increases your borrowing power for subsequent purchases, enabling faster property accumulation.
            </p>
          </div>
        )}
        {timelineProperties.some(p => p.status === 'challenging') && (
          <p className="text-[#dc2626] text-xs mt-2">
            Warning: {timelineProperties.filter(p => p.status === 'challenging').length} properties are not affordable within your financial capacity or timeline.
            Consider adjusting your investment profile or property selections.
          </p>
        )}
      </div>
    </div>
  )
}
interface TimelineItemProps {
  year: string
  quarter: string
  type: string
  number?: string
  deposit: string
  loanAmount: string
  source: string
  equity: string
  portfolioValue: string
  price: string
  status: 'feasible' | 'delayed' | 'challenging'
  isLast?: boolean
}
const TimelineItem: React.FC<TimelineItemProps> = ({
  year,
  quarter,
  type,
  number,
  deposit,
  loanAmount,
  source,
  equity,
  portfolioValue,
  price,
  status,
  isLast = false,
}) => {
  const statusColors = {
    feasible: 'text-[#374151]',
    delayed: 'text-[#374151]',
    challenging: 'text-[#374151]',
  }
  const statusDots = {
    feasible: 'bg-[#10b981] bg-opacity-50',
    delayed: 'bg-[#3b82f6] bg-opacity-60',
    challenging: 'bg-[#3b82f6] bg-opacity-60',
  }
  const getPropertyIcon = () => {
    switch (type) {
      case 'Metro Houses':
        return <HomeIcon size={18} className="text-[#6b7280]" />
      case 'Duplexes':
        return <Building2Icon size={18} className="text-[#6b7280]" />
      case 'Units / Apartments':
      default:
        return <BuildingIcon size={18} className="text-[#6b7280]" />
    }
  }
  return (
    <div className="relative bg-white rounded-lg border border-[#f3f4f6] shadow-sm">
      <div className="flex items-center p-6">
        {/* Year circle */}
        <div className="flex-shrink-0 w-16 h-16 bg-white rounded-full flex items-center justify-center mr-6 border border-[#f3f4f6]">
          <div className="text-center">
            <div className={`text-xs font-medium ${
              year === "Beyond Timeline" ? "text-[#dc2626]" : 
              parseInt(year) > 2024 ? "text-[#111827]" : 
              "text-[#6b7280]"
            }`}>
              {year === "Beyond Timeline" ? "N/A" : 
               parseInt(year) > 2024 ? year : 
               year}
            </div>
            <div className="text-[10px] text-[#9ca3af] mt-1">
              {quarter}
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h4 className="text-[#111827] font-medium">{type}</h4>
              <div className="flex items-center gap-1">{getPropertyIcon()}</div>
            </div>
            <div className="text-sm text-[#6b7280] mt-3 leading-relaxed font-normal">
              Deposit: {deposit} • Loan: {loanAmount} • Purchase Price: {price}
              <br />
              <span className="text-[#9ca3af]">Portfolio Value: {portfolioValue} • Total Equity: {equity}</span>
            </div>
          </div>
        </div>
        {/* Status indicator */}
        <div className="ml-4 flex items-center">
          <span className={`w-2 h-2 rounded-full ${statusDots[status]}`}></span>
          <span className={`ml-2 text-xs ${statusColors[status]} font-normal`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  )
}
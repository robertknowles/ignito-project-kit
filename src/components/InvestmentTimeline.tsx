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
import type { PropertyPurchase } from '../types/property'
export const InvestmentTimeline = React.memo(() => {
  const { calculatedValues, profile } = useInvestmentProfile()
  const { calculations, checkFeasibility } = usePropertySelection()
  const { timelineProperties, isCalculating } = useAffordabilityCalculator()
  const { globalFactors, getPropertyData } = useDataAssumptions()
  
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

  // Generate timeline items including both purchases and consolidations
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
          status: 'feasible' as const,
          eventType: 'purchase' as const
        }
      ]
    }

    const allTimelineEvents: Array<{
      year: string;
      quarter: string;
      type: string;
      deposit?: string;
      price?: string;
      loanAmount?: string;
      portfolioValue: string;
      equity: string;
      status: 'feasible' | 'delayed' | 'challenging' | 'consolidation' | 'waiting' | 'blocked';
      number?: string;
      affordableYear: number;
      eventType: 'purchase' | 'consolidation';
      consolidationDetails?: {
        propertiesSold: string[];
        equityFreed: string;
        newLVR: string;
        newBorrowingCapacity: string;
        reason: string;
      };
    }> = [];

    // Add purchase events - ONLY for actual purchases
    timelineProperties
      .filter(property => property.title !== '' && property.propertyIndex >= 0)
      .forEach((property, index) => {
      const isAffordable = property.status === 'feasible' || property.status === 'consolidation';
      const timelineEndYear = 2025 + profile.timelineYears;
      
      let yearDisplay: string;
      let quarterDisplay: string;
      
      if (property.affordableYear === Infinity) {
        yearDisplay = "Beyond Timeline";
        quarterDisplay = "N/A";
      } else if (isAffordable && property.affordableYear <= timelineEndYear) {
        yearDisplay = property.affordableYear.toString();
        quarterDisplay = `Yr ${property.affordableYear - 2025}`;
      } else if (property.affordableYear > timelineEndYear) {
        yearDisplay = `${property.affordableYear}`;
        quarterDisplay = `Yr ${property.affordableYear - 2025}`;
      } else {
        yearDisplay = "Beyond Timeline";
        quarterDisplay = "N/A";
      }

      // Add consolidation event if this property triggered it
      if (property.isConsolidationPhase && property.consolidationDetails) {
        const consolidationYear = property.affordableYear;
        allTimelineEvents.push({
          year: consolidationYear.toString(),
          quarter: `Yr ${consolidationYear - 2025}`,
          type: "Consolidation Phase",
          portfolioValue: `$${Math.round(property.portfolioValueAfter / 1000)}k`,
          equity: `$${Math.round((property.portfolioValueAfter * 0.8 - property.totalEquityAfter) / 1000)}k`,
          status: 'consolidation',
          affordableYear: consolidationYear,
          eventType: 'consolidation',
          consolidationDetails: {
            propertiesSold: [`${property.consolidationDetails.propertiesSold} properties`],
            equityFreed: `$${Math.round(property.consolidationDetails.equityFreed / 1000)}k`,
            newLVR: `${Math.round((property.portfolioValueAfter * 0.8 - property.totalEquityAfter) / property.portfolioValueAfter * 100)}%`,
            newBorrowingCapacity: `$${Math.round((profile.borrowingCapacity + property.consolidationDetails.equityFreed * 0.7) / 1000)}k`,
            reason: 'Borrowing capacity maxed'
          }
        });
      }

      // Add purchase event
      allTimelineEvents.push({
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
        affordableYear: property.affordableYear,
        eventType: 'purchase'
      });
    });

    // Sort all events by year chronologically
    return allTimelineEvents
      .sort((a, b) => a.affordableYear - b.affordableYear)
      .slice(0, 12); // Show more events to include consolidations
  }

  const timelineItems = generateTimelineItems()

  return (
    <div className="relative">
      {isCalculating && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
          <div className="text-sm text-[#6b7280] bg-white px-4 py-2 rounded-md shadow-sm border border-[#f3f4f6]">
            Calculating timeline...
          </div>
        </div>
      )}
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
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f9fafb] text-[#374151] rounded-full text-xs font-normal">
          <span className="w-1.5 h-1.5 bg-[#f59e0b] bg-opacity-60 rounded-full"></span>{' '}
          Consolidation
        </span>
      </div>
      <div className="flex flex-col gap-6">
        {timelineItems.map((item, index) => 
          item.eventType === 'consolidation' ? (
            <ConsolidationTimelineItem
              key={`consolidation-${item.year}-${index}`}
              year={item.year}
              quarter={item.quarter}
              consolidationDetails={item.consolidationDetails!}
              portfolioValue={item.portfolioValue}
              equity={item.equity}
            />
          ) : (
            <TimelineItem
              key={`${item.year}-${item.type}-${index}`}
              year={item.year}
              quarter={item.quarter}
              type={item.type}
              number={item.number}
              deposit={item.deposit!}
              loanAmount={item.loanAmount!}
              source="Savings & Equity"
              equity={item.equity}
              portfolioValue={item.portfolioValue}
              price={item.price!}
              status={item.status as 'feasible' | 'delayed' | 'challenging'}
              isLast={index === timelineItems.length - 1}
            />
          )
        )}
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
});
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

interface ConsolidationTimelineItemProps {
  year: string
  quarter: string
  consolidationDetails: {
    propertiesSold: string[]
    equityFreed: string
    newLVR: string
    newBorrowingCapacity: string
    reason: string
  }
  portfolioValue: string
  equity: string
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
    consolidation: 'text-[#374151]',
  }
  const statusDots = {
    feasible: 'bg-[#10b981] bg-opacity-50',
    delayed: 'bg-[#3b82f6] bg-opacity-60',
    challenging: 'bg-[#3b82f6] bg-opacity-60',
    consolidation: 'bg-[#f59e0b] bg-opacity-60',
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

const ConsolidationTimelineItem: React.FC<ConsolidationTimelineItemProps> = ({
  year,
  quarter,
  consolidationDetails,
  portfolioValue,
  equity,
}) => {
  return (
    <div className="relative rounded-lg border border-[#f3f4f6] shadow-sm" style={{ backgroundColor: '#FFF9E6' }}>
      <div className="flex items-center p-6">
        {/* Year circle */}
        <div className="flex-shrink-0 w-16 h-16 bg-white rounded-full flex items-center justify-center mr-6 border border-[#f3f4f6]">
          <div className="text-center">
            <div className="text-xs font-medium text-[#111827]">
              {year}
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
              <h4 className="text-[#111827] font-medium">Consolidation Phase</h4>
            </div>
            <div className="text-sm text-[#6b7280] mt-3 leading-relaxed font-normal">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Sold:</span> {consolidationDetails.propertiesSold.join(', ')}
                  <br />
                  <span className="font-medium">Equity Freed:</span> {consolidationDetails.equityFreed}
                </div>
                <div>
                  <span className="font-medium">New LVR:</span> {consolidationDetails.newLVR}
                  <br />
                  <span className="font-medium">Borrowing Capacity:</span> {consolidationDetails.newBorrowingCapacity}
                </div>
              </div>
              <div className="mt-2">
                <span className="font-medium">Reason:</span> {consolidationDetails.reason}
              </div>
              <div className="mt-2 text-[#9ca3af]">
                Portfolio Value: {portfolioValue} • Total Equity: {equity}
              </div>
            </div>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="ml-4 flex items-center">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b] bg-opacity-60"></span>
          <span className="ml-2 text-xs text-[#374151] font-normal">
            consolidation
          </span>
        </div>
      </div>
    </div>
  )
}
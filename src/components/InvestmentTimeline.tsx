import React from 'react'
import {
  CalendarIcon,
  BuildingIcon,
  HomeIcon,
  Building2Icon,
} from 'lucide-react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
export const InvestmentTimeline = () => {
  const { calculatedValues, profile } = useInvestmentProfile()
  const { calculations, checkFeasibility, selections, propertyTypes } = usePropertySelection()
  
  // Get feasibility status based on current selections
  const feasibility = checkFeasibility(calculatedValues.availableDeposit, profile.borrowingCapacity)
  
  // Determine status based on feasibility and selections
  const getTimelineStatus = (): 'feasible' | 'delayed' | 'challenging' => {
    if (calculations.totalProperties === 0) return 'feasible' // No properties selected
    if (!feasibility.overallFeasible) return 'challenging'
    if (calculations.totalCost > calculatedValues.availableDeposit * 4) return 'delayed' // High leverage scenario
    return 'feasible'
  }

  const timelineStatus = getTimelineStatus()

  // Simple affordability calculator for a single property
  const calculateAffordabilityYear = (property: any, propertyIndex: number = 0) => {
    const baseYear = 2025
    let currentYear = 1
    let cumulativeCash = calculatedValues.availableDeposit
    let currentPortfolioValue = profile.portfolioValue
    let currentDebt = profile.currentDebt
    
    // Account for properties purchased before this one
    let previousPropertyCosts = 0
    let previousPropertyEquity = 0
    
    // For subsequent properties of the same type, consider cumulative costs
    if (propertyIndex > 0) {
      previousPropertyCosts = property.cost * propertyIndex
      previousPropertyEquity = property.depositRequired * propertyIndex
      cumulativeCash -= previousPropertyEquity
    }
    
    while (currentYear <= profile.timelineYears) {
      // Add annual savings each year (except year 1 where we start with initial deposit)
      if (currentYear > 1) {
        cumulativeCash += profile.annualSavings
      }
      
      // Calculate usable equity from growing portfolio
      const usableEquity = Math.max(0, currentPortfolioValue * 0.8 - currentDebt)
      const totalAvailableDeposit = cumulativeCash + usableEquity
      
      // Check if we can afford this property
      const canAffordDeposit = totalAvailableDeposit >= property.depositRequired
      const canAffordBorrowing = (currentDebt + (property.cost - property.depositRequired)) <= profile.borrowingCapacity
      
      if (canAffordDeposit && canAffordBorrowing) {
        return baseYear + currentYear - 1
      }
      
      // Grow portfolio value for next year (assuming 5% growth on existing properties)
      if (currentPortfolioValue > 0) {
        currentPortfolioValue *= 1.05
      }
      
      currentYear++
    }
    
    // If never affordable within timeline, return timeline end + property index
    return baseYear + profile.timelineYears + propertyIndex
  }

  // Generate timeline items based on affordability calculations
  const generateTimelineItems = () => {
    if (calculations.totalProperties === 0) {
      return [
        {
          year: "2025",
          quarter: "Yr 0",
          type: "No properties selected",
          deposit: "$0",
          price: "$0",
          status: 'feasible' as const
        }
      ]
    }

    const timelineItems: any[] = []
    
    Object.entries(selections).forEach(([propertyId, quantity]) => {
      if (quantity > 0) {
        const property = propertyTypes.find(p => p.id === propertyId)
        if (property) {
          for (let i = 0; i < quantity; i++) {
            const affordableYear = calculateAffordabilityYear(property, i)
            const isAffordable = affordableYear <= (2025 + profile.timelineYears)
            
            timelineItems.push({
              year: affordableYear.toString(),
              quarter: `Yr ${affordableYear - 2025}`,
              type: property.title,
              deposit: `$${Math.round(property.depositRequired / 1000)}k`,
              price: `$${Math.round(property.cost / 1000)}k`,
              status: isAffordable ? 'feasible' : 'challenging',
              number: quantity > 1 ? `#${i + 1}` : undefined,
              affordableYear
            })
          }
        }
      }
    })

    // Sort by affordable year
    timelineItems.sort((a, b) => a.affordableYear - b.affordableYear)
    
    return timelineItems.slice(0, 5) // Limit to 5 items for UI
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
            source="Savings & Equity"
            equity="TBD"
            portfolioValue="TBD"
            price={item.price}
            status={item.status}
            isLast={index === timelineItems.length - 1}
          />
        ))}
      </div>
      <div className="mt-8 text-xs text-[#374151] bg-[#f9fafb] p-6 rounded-md leading-relaxed">
        <p className="mb-3">
          {calculations.totalProperties > 0 
            ? `Timeline shows ${calculations.totalProperties} selected properties. Total investment: $${Math.round(calculations.totalCost / 1000)}k, Deposit required: $${Math.round(calculations.totalDepositRequired / 1000)}k.`
            : "Select properties to generate an investment timeline. Timeline assumes 5% annual property growth, 80% LVR, and systematic acquisition strategy."
          }
        </p>
        {!feasibility.overallFeasible && calculations.totalProperties > 0 && (
          <p className="text-[#dc2626] text-xs mt-2">
            Warning: Selected properties exceed your financial capacity. 
            {!feasibility.hasAdequateDeposit && " Insufficient deposit funds."}
            {!feasibility.withinBorrowingCapacity && " Exceeds borrowing capacity."}
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
            <div className="text-[#111827] font-medium">{year}</div>
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
              Deposit: {deposit} • Purchase Price: {price} •{' '}
              <span className="text-[#9ca3af]">Source: Savings & Equity</span>
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
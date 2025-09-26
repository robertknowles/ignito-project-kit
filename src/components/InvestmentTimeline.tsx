import React from 'react'
import {
  CalendarIcon,
  BuildingIcon,
  HomeIcon,
  Building2Icon,
} from 'lucide-react'
import { SimulationResults } from '../hooks/useSimulationEngine'

interface InvestmentTimelineProps {
  simulationResults: SimulationResults | null;
}

export const InvestmentTimeline: React.FC<InvestmentTimelineProps> = ({ simulationResults }) => {

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
        {simulationResults?.timeline && simulationResults.timeline.length > 0 ? (
          simulationResults.timeline.map((item, index) => (
            <TimelineItem
              key={index}
              year={(2025 + item.year).toString()}
              quarter={item.quarter}
              type={item.propertyType}
              deposit={`$${(item.depositUsed / 1000).toFixed(0)}k`}
              source={item.fundingSource}
              equity={`$${(item.totalEquityAfter / 1000).toFixed(0)}k`}
              portfolioValue={`$${(item.portfolioValueAfter / 1000000).toFixed(1)}M`}
              price={`$${(item.purchasePrice / 1000).toFixed(0)}k`}
              status={item.feasibilityStatus}
              isLast={index === simulationResults.timeline.length - 1}
            />
          ))
        ) : (
          <div className="text-center py-12 text-[#6b7280]">
            <CalendarIcon size={48} className="mx-auto mb-4 text-[#d1d5db]" />
            <h4 className="text-sm font-medium mb-2">No Investment Timeline</h4>
            <p className="text-xs">Select properties to generate your investment roadmap</p>
          </div>
        )}
      </div>
      <div className="mt-8 text-xs text-[#374151] bg-[#f9fafb] p-6 rounded-md leading-relaxed">
        <p className="mb-3">
          Timeline assumes: 5% annual property growth, 80% LVR, equity
          accessible at 80% of value, $24,000 annual savings capacity.
        </p>
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
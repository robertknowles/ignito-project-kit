import React from 'react'
import { TrendingUp, Wallet, ArrowUpRight, PiggyBank } from 'lucide-react'

interface TimelineCardProps {
  propertyNumber: number
  title?: string // Specific property title (e.g., "Metro House", "Commercial Warehouse")
  year: number
  purchasePrice: string
  equity: string
  yield: string
  cashflow: string
  milestone: string
  nextMove: string
  isLast?: boolean
  // Commitment breakdown fields
  savedAmount?: string
  equityReleased?: string
  totalDeposit?: string
  monthsToSave?: number
}

export function TimelineCard({
  propertyNumber,
  title,
  year,
  purchasePrice,
  equity,
  yield: yieldValue,
  cashflow,
  milestone,
  nextMove,
  isLast = false,
  savedAmount,
  equityReleased,
  totalDeposit,
  monthsToSave,
}: TimelineCardProps) {
  // Use specific title if provided, otherwise fallback to generic "Property X"
  const displayTitle = title || `Property ${propertyNumber}`;
  
  // Check if we have commitment breakdown data
  const hasCommitmentData = savedAmount && totalDeposit;
  
  // Parse equity released to check if it's > 0
  const equityReleasedValue = equityReleased ? parseFloat(equityReleased.replace(/[^0-9.-]/g, '')) : 0;
  const showEquityReleased = equityReleasedValue > 0;
  
  return (
    <div className="relative pl-14 mb-3">
      {/* Timeline dot */}
      <div className="absolute left-0 top-3 w-10 h-10 rounded-full bg-slate-50 border-2 border-slate-300 flex items-center justify-center z-10">
        <span className="text-xs font-semibold text-slate-700">{year}</span>
      </div>
      {/* Card - grey background */}
      <div className="bg-slate-50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200/60">
          <span className="text-sm">🏡</span>
          <h3
            className="text-xs font-semibold text-slate-800 flex-1"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {displayTitle}
          </h3>
          <span className="text-[9px] text-slate-400 font-medium bg-white px-1.5 py-0.5 rounded">#{propertyNumber}</span>
        </div>
        
        {/* Main Content - Side by Side Layout */}
        <div className="flex flex-col sm:flex-row">
          {/* Left Side - Property Metrics */}
          <div className="flex-1 p-2.5 sm:border-r border-slate-200/60">
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-white rounded p-1.5">
                <p className="text-[9px] text-slate-500">Purchase</p>
                <p className="text-xs font-semibold text-slate-800">{purchasePrice}</p>
              </div>
              <div className="bg-white rounded p-1.5">
                <p className="text-[9px] text-slate-500">Equity</p>
                <p className="text-xs font-semibold text-slate-800">{equity}</p>
              </div>
              <div className="bg-white rounded p-1.5">
                <p className="text-[9px] text-slate-500">Yield</p>
                <p className="text-xs font-semibold text-slate-800">{yieldValue}</p>
              </div>
              <div className="bg-white rounded p-1.5">
                <p className="text-[9px] text-slate-500">Cashflow</p>
                <p className={`text-xs font-semibold ${cashflow.startsWith('−') || cashflow.startsWith('-') ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {cashflow}
                </p>
              </div>
            </div>
          </div>
          
          {/* Right Side - Funding Breakdown */}
          {hasCommitmentData && (
            <div className="sm:w-[35%] p-2.5 bg-sky-50/80">
              <div className="flex items-center gap-1 mb-1.5">
                <Wallet className="w-3 h-3 text-sky-600" />
                <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wide">
                  How Funded
                </p>
              </div>
              <div className="space-y-1 text-[11px]">
                {/* Saved Amount */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <PiggyBank className="w-2.5 h-2.5 text-slate-400" />
                    <span className="text-slate-600">Saved</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-slate-800">{savedAmount}</span>
                    {monthsToSave !== undefined && monthsToSave > 0 && (
                      <span className="text-slate-400 text-[9px] ml-0.5">({monthsToSave}mo)</span>
                    )}
                  </div>
                </div>
                
                {/* Equity Released (only show if > 0) */}
                {showEquityReleased && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-slate-600">Equity</span>
                    </div>
                    <span className="font-medium text-slate-800">{equityReleased}</span>
                  </div>
                )}
                
                {/* Total Deposit */}
                <div className="flex items-center justify-between pt-1 mt-1 border-t border-sky-200/70">
                  <span className="font-medium text-slate-700">Total</span>
                  <span className="font-bold text-sky-700 text-xs">{totalDeposit}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Section - Milestone & Next Move */}
        <div className="px-3 py-2 border-t border-slate-200/60">
          {/* Milestone Tag */}
          <p className="text-[10px] text-slate-600 leading-snug">{milestone}</p>
          
          {/* Next Move */}
          {!isLast && (
            <div className="flex items-start gap-1 pt-1.5 mt-1.5 border-t border-slate-200/60">
              <TrendingUp className="w-2.5 h-2.5 text-sky-500 mt-0.5 flex-shrink-0" />
              <p className="text-[9px] text-slate-500 leading-snug">
                <span className="font-medium text-slate-600">Next:</span> {nextMove}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

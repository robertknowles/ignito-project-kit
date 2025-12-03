import React from 'react'
import { TrendingUp } from 'lucide-react'

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
}: TimelineCardProps) {
  // Use specific title if provided, otherwise fallback to generic "Property X"
  const displayTitle = title || `Property ${propertyNumber}`;
  return (
    <div className="relative pl-14 mb-6">
      {/* Timeline dot */}
      <div className="absolute left-0 top-4 w-10 h-10 rounded-full bg-white border-3 border-blue-500 flex items-center justify-center shadow-md z-10">
        <span className="text-xs font-semibold text-gray-900">{year}</span>
      </div>
      {/* Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🏡</span>
          <h3
            className="text-base font-semibold text-[#0A0F1C]"
            style={{
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            {displayTitle}
          </h3>
          <span className="text-xs text-gray-400 font-normal">#{propertyNumber}</span>
        </div>
        {/* Snapshot Row */}
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-600 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Purchase Price</span>
            <span className="text-gray-900 font-semibold">{purchasePrice}</span>
          </div>
          <div className="w-px h-3 bg-gray-300"></div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Equity</span>
            <span className="text-gray-900 font-semibold">{equity}</span>
          </div>
          <div className="w-px h-3 bg-gray-300"></div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Yield</span>
            <span className="text-gray-900 font-semibold">{yieldValue}</span>
          </div>
          <div className="w-px h-3 bg-gray-300"></div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Cashflow</span>
            <span
              className={`font-semibold ${cashflow.startsWith('−') ? 'text-red-600' : 'text-green-600'}`}
            >
              {cashflow}
            </span>
          </div>
        </div>
        {/* Milestone Tag */}
        <div className="bg-blue-50 rounded-md p-3 mb-3">
          <p className="text-xs text-gray-700 leading-relaxed">{milestone}</p>
        </div>
        {/* Next Move */}
        {!isLast && (
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                Next Move
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">
                {nextMove}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


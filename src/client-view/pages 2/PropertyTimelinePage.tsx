import React from 'react'

import { TimelineCard } from '../components/TimelineCard'
import { GoalAchievedCard } from '../components/GoalAchievedCard'

export function PropertyTimelinePage() {
  const timelineData = [
    {
      propertyNumber: 1,
      year: 2026,
      purchasePrice: '$500k',
      equity: '$80k',
      yield: '5.2%',
      cashflow: '−$2,400 p.a.',
      milestone:
        "You've built $80k in usable equity — foundation property established with stable rental yield.",
      nextMove:
        'Property 2 feasible in 2028 → $80k equity released to fund deposit for second residential asset.',
    },
    {
      propertyNumber: 2,
      year: 2028,
      purchasePrice: '$600k',
      equity: '$180k',
      yield: '5.5%',
      cashflow: '+$1,800 p.a.',
      milestone:
        "You've built $180k in combined equity — portfolio now generating positive cashflow.",
      nextMove:
        'Property 3 feasible in 2030 → $200k equity available for third residential property.',
    },
    {
      propertyNumber: 3,
      year: 2030,
      purchasePrice: '$550k',
      equity: '$320k',
      yield: '5.8%',
      cashflow: '+$8,400 p.a.',
      milestone:
        "You've built $320k in total equity — three-property residential portfolio established.",
      nextMove:
        'Commercial property feasible in 2035 → $400k equity available for high-yield commercial asset.',
    },
    {
      propertyNumber: 4,
      year: 2035,
      purchasePrice: '$1.5M',
      equity: '$600k',
      yield: '7.2%',
      cashflow: '+$18,000 p.a.',
      milestone:
        "You've acquired commercial property with $100k equity injection — portfolio now diversified across residential and commercial.",
      nextMove:
        'Continue holding and building equity. Long-term growth phase — portfolio review scheduled for 2038.',
      isLast: true,
    },
  ]

  return (
    <div className="w-full min-h-[297mm] bg-[#f9fafb] p-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-gray-500 mb-1">20-Year Investment Roadmap</p>
        <h1
          className="text-3xl font-semibold text-gray-900 mb-6"
          style={{
            fontFamily: 'Figtree, sans-serif',
          }}
        >
          Property Investment Timeline
        </h1>
        {/* Summary Snapshot Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-8 shadow-sm">
          <div className="grid grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">Starting Cash</p>
              <p className="font-semibold text-gray-900">$220k</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Borrowing Capacity</p>
              <p className="font-semibold text-gray-900">$1.05M</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Annual Savings</p>
              <p className="font-semibold text-gray-900">$48k</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Goal</p>
              <p className="font-semibold text-blue-600">
                Financial Independence by 2045 — $7M Portfolio
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-blue-200"></div>
        {/* Timeline items */}
        {timelineData.map((property, index) => (
          <TimelineCard
            key={index}
            propertyNumber={property.propertyNumber}
            year={property.year}
            purchasePrice={property.purchasePrice}
            equity={property.equity}
            yield={property.yield}
            cashflow={property.cashflow}
            milestone={property.milestone}
            nextMove={property.nextMove}
            isLast={property.isLast}
          />
        ))}
        {/* Mid-point markers */}
        <div className="relative pl-14 mb-6">
          <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center shadow-sm">
            <span className="text-xs font-semibold text-gray-600">2032</span>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-600">
              Portfolio review & equity assessment
            </p>
          </div>
        </div>
        <div className="relative pl-14 mb-6">
          <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center shadow-sm">
            <span className="text-xs font-semibold text-gray-600">2038</span>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-600">
              Mid-term refinance & consolidation
            </p>
          </div>
        </div>
        {/* Goal Achieved Card */}
        <GoalAchievedCard />
      </div>
      {/* Footer */}
      <div className="mt-8 flex justify-between items-center">
        <div className="text-sm font-semibold text-gray-900">IGNITO</div>
        <div className="text-sm text-gray-500">Page 3</div>
      </div>
    </div>
  )
}


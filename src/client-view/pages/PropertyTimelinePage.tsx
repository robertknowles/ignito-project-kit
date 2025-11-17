import React, { useMemo } from 'react'

import { TimelineCard } from '../components/TimelineCard'
import { GoalAchievedCard } from '../components/GoalAchievedCard'
import { generateTimelineData, generateSummaryData } from '../utils/timelineGenerator'

interface PropertyTimelinePageProps {
  investmentProfile: any;
  propertySelections: any[];
}

export function PropertyTimelinePage({ investmentProfile, propertySelections }: PropertyTimelinePageProps) {
  // Generate timeline data from real property selections
  const timelineData = useMemo(() => {
    return generateTimelineData(propertySelections, investmentProfile);
  }, [propertySelections, investmentProfile]);

  // Generate summary data for the snapshot card
  const summaryData = useMemo(() => {
    return generateSummaryData(investmentProfile);
  }, [investmentProfile]);

  // If no timeline data, show a message
  if (timelineData.length === 0) {
    return (
      <div className="w-full min-h-[297mm] bg-[#f9fafb] p-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-2">No properties in timeline yet</p>
          <p className="text-gray-500 text-sm">Properties will appear here once they are added to your investment strategy.</p>
        </div>
      </div>
    );
  }

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
              <p className="font-semibold text-gray-900">{summaryData.startingCash}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Borrowing Capacity</p>
              <p className="font-semibold text-gray-900">{summaryData.borrowingCapacity}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Annual Savings</p>
              <p className="font-semibold text-gray-900">{summaryData.annualSavings}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Goal</p>
              <p className="font-semibold text-blue-600">
                {summaryData.goal}
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


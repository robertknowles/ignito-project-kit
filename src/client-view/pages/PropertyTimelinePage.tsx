import React, { useMemo } from 'react'

import { TimelineCard } from '../components/TimelineCard'
import { MilestoneCard } from '../components/MilestoneCard'
import { GoalAchievedCard } from '../components/GoalAchievedCard'
import { generateTimelineData, generateSummaryData, TimelineItem } from '../utils/timelineGenerator'

interface PropertyTimelinePageProps {
  investmentProfile: any;
  propertySelections: any[];
  companyDisplayName?: string;
}

export function PropertyTimelinePage({ investmentProfile, propertySelections, companyDisplayName = 'PropPath' }: PropertyTimelinePageProps) {
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
        {/* Starting Position Card - Point A */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-8 shadow-sm">
          {/* Starting Position Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">A</div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Starting Position</h3>
              <p className="text-xs text-gray-500">Your initial capital, borrowing power, and savings capacity</p>
            </div>
          </div>
          {/* Starting Position Metrics */}
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 mb-1">Starting Cash</p>
              <p className="text-lg font-semibold text-gray-900">{summaryData.startingCash}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 mb-1">Borrowing Capacity</p>
              <p className="text-lg font-semibold text-gray-900">{summaryData.borrowingCapacity}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 mb-1">Annual Savings</p>
              <p className="text-lg font-semibold text-gray-900">{summaryData.annualSavings}</p>
            </div>
          </div>
        </div>
        {/* Goal Card - Point B (Destination) */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4 mb-8 flex items-center gap-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">B</div>
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Your Goal</p>
            <p className="text-sm font-semibold text-blue-800">{summaryData.goal}</p>
          </div>
        </div>
      </div>
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-blue-200"></div>
        {/* Timeline items */}
        {timelineData.map((item, index) => {
          if (item.type === 'milestone') {
            return (
              <MilestoneCard
                key={`milestone-${index}`}
                year={item.year}
                title={item.title}
                description={item.description}
                isLast={item.isLast}
              />
            );
          } else {
            return (
              <TimelineCard
                key={`property-${index}`}
                propertyNumber={item.propertyNumber}
                title={item.title}
                year={item.year}
                purchasePrice={item.purchasePrice}
                equity={item.equity}
                yield={item.yield}
                cashflow={item.cashflow}
                milestone={item.milestone}
                nextMove={item.nextMove}
                isLast={item.isLast}
              />
            );
          }
        })}
        {/* Goal Achieved Card */}
        <GoalAchievedCard />
      </div>
      {/* Footer */}
      <div className="mt-8 flex justify-between items-center">
        <div className="text-sm font-semibold text-gray-900">{companyDisplayName.toUpperCase()}</div>
        <div className="text-sm text-gray-500">Page 3</div>
      </div>
    </div>
  )
}


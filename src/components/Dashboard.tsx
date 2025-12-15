import React, { useRef } from 'react';
import { SummaryBar } from './SummaryBar';
import { InvestmentTimeline, TimelineProgressBar, useTimelineData } from './InvestmentTimeline';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { CashflowChart } from './CashflowChart';
import { useChartDataSync } from '../hooks/useChartDataSync';

export const Dashboard = () => {
  // Sync chart data to scenario save context for Client Report consistency
  useChartDataSync();
  
  // Ref for InvestmentTimeline to call scrollToYear
  const timelineRef = useRef<{ scrollToYear: (year: number) => void }>(null);
  
  // Get timeline data for progress bar
  const timelineData = useTimelineData();
  
  const handleYearClick = (year: number) => {
    if (timelineRef.current) {
      timelineRef.current.scrollToYear(year);
    }
  };

  // Root: Fills the App.tsx container exactly.
  // Using 'h-full' instead of 'h-screen' to respect parent container.
  // Bento Grid Layout - Single page view with all components visible
  return (
    <div className="h-full w-full overflow-y-auto bg-[#f9fafb]">
      {/* Bento Grid Container */}
      <div className="p-8 flex flex-col gap-8">
        {/* ROW 1: Scoreboard - Key Metrics */}
        <SummaryBar />
        
        {/* ROW 2: Purchase Timeline (Investment Roadmap) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {/* Header */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Roadmap</h2>
          
          {/* Year Navigation */}
          <TimelineProgressBar
            startYear={timelineData.startYear}
            endYear={timelineData.endYear}
            latestPurchaseYear={timelineData.latestPurchaseYear}
            purchaseYears={timelineData.purchaseYears}
            onYearClick={handleYearClick}
          />
          
          {/* Timeline Content */}
          <div className="mt-4">
            <InvestmentTimeline ref={timelineRef} />
          </div>
        </div>
        
        {/* ROW 3: Consolidated Charts - Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Wealth Trajectory (Portfolio Value & Equity Growth) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Wealth Trajectory</h2>
            <PortfolioGrowthChart />
          </div>
          
          {/* RIGHT COLUMN: Cashflow Position (Cashflow Analysis) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cashflow Position</h2>
            <CashflowChart />
          </div>
        </div>
      </div>
    </div>
  );
};
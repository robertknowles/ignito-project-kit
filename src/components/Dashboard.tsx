import React, { useRef, useState } from 'react';
import { SummaryBar } from './SummaryBar';
import { InvestmentTimeline, TimelineProgressBar, useTimelineData } from './InvestmentTimeline';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { CashflowChart } from './CashflowChart';
import { PropertyDetailPanel } from './PropertyDetailPanel';
import { useChartDataSync } from '../hooks/useChartDataSync';

export const Dashboard = () => {
  // Sync chart data to scenario save context for Client Report consistency
  useChartDataSync();
  
  // Ref for InvestmentTimeline to call scrollToYear
  const timelineRef = useRef<{ scrollToYear: (year: number) => void }>(null);
  
  // Get timeline data for progress bar
  const timelineData = useTimelineData();
  
  // State for Property Detail Panel (Inspector)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  
  const handleYearClick = (year: number) => {
    if (timelineRef.current) {
      timelineRef.current.scrollToYear(year);
    }
  };
  
  // Handle property inspection from timeline
  const handleInspectProperty = (propertyInstanceId: string) => {
    setSelectedPropertyId(propertyInstanceId);
    setIsDetailPanelOpen(true);
  };
  
  // Handle closing the detail panel
  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    // Clear selection after animation completes
    setTimeout(() => {
      setSelectedPropertyId(null);
    }, 300);
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
        <div className="bento-card p-6">
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
            <InvestmentTimeline ref={timelineRef} onInspectProperty={handleInspectProperty} />
          </div>
        </div>
        
        {/* ROW 3: Consolidated Charts - Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Wealth Trajectory (Portfolio Value & Equity Growth) */}
          <div className="bento-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Wealth Trajectory</h2>
            <PortfolioGrowthChart />
          </div>
          
          {/* RIGHT COLUMN: Cashflow Position (Cashflow Analysis) */}
          <div className="bento-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cashflow Position</h2>
            <CashflowChart />
          </div>
        </div>
      </div>
      
      {/* Property Detail Panel (Inspector) */}
      <PropertyDetailPanel
        isOpen={isDetailPanelOpen}
        onClose={handleCloseDetailPanel}
        selectedPropertyId={selectedPropertyId}
      />
    </div>
  );
};
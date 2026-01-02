import React, { useRef, useState } from 'react';
import { SummaryBar } from './SummaryBar';
import { TimelineColumn } from './TimelineColumn';
import { PropertyPerformanceTabs } from './PropertyPerformanceTabs';
import { PropertyDetailPanel } from './PropertyDetailPanel';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { InvestmentTimeline, TimelineProgressBar, useTimelineData } from './InvestmentTimeline';

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
      <div className="flex flex-col gap-4">
        {/* ROW 1: Scoreboard + Chart Toggle (Wealth/Cashflow) - Attached as single unit */}
        <div className="flex flex-col">
          <SummaryBar />
          <TimelineColumn />
        </div>
        
        {/* ROW 2: Two Column Grid - Timeline (LHS) + Property Workbench (RHS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Investment Timeline */}
          <div className="bento-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Timeline</h2>
            {/* Year Navigation */}
            <TimelineProgressBar
              startYear={timelineData.startYear}
              endYear={timelineData.endYear}
              latestPurchaseYear={timelineData.latestPurchaseYear}
              purchaseYears={timelineData.purchaseYears}
              onYearClick={(year) => {
                if (timelineRef.current) {
                  timelineRef.current.scrollToYear(year);
                }
              }}
            />
            
            {/* Timeline Content */}
            <div className="mt-4">
              <InvestmentTimeline ref={timelineRef} onInspectProperty={handleInspectProperty} />
            </div>
          </div>
          
          {/* RIGHT COLUMN: Property Workbench (Per-Property Deep Dive) */}
          <div className="bento-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Workbench</h2>
            <PropertyPerformanceTabs />
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
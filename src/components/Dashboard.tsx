import React, { useRef, useState } from 'react';
import { CalendarIcon, BarChart3 } from 'lucide-react';
import { SummaryBar } from './SummaryBar';
import { TimelineColumn } from './TimelineColumn';
import { PropertyPerformanceTabs } from './PropertyPerformanceTabs';
import { PropertyDetailPanel } from './PropertyDetailPanel';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { InvestmentTimeline } from './InvestmentTimeline';
import { TourStep } from '@/components/TourManager';

export const Dashboard = () => {
  // Sync chart data to scenario save context for Client Report consistency
  useChartDataSync();
  
  // Ref for InvestmentTimeline to call scrollToYear
  const timelineRef = useRef<{ scrollToYear: (year: number) => void }>(null);
  
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
          <TourStep
            id="timeline-section"
            title="Investment Timeline"
            content="This is the heart of the system - the Decision Engine. It shows WHEN each property can be purchased based on your client's affordability. Each card shows a purchase with timing and key metrics. Click 'Inspect' to see detailed breakdowns."
            order={10}
            position="right"
          >
          <div id="timeline-section-container" className="bento-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon size={18} className="text-gray-500" />
              Investment Timeline
            </h2>
            
            {/* Timeline Content */}
            <InvestmentTimeline ref={timelineRef} onInspectProperty={handleInspectProperty} />
          </div>
          </TourStep>
          
          {/* RIGHT COLUMN: Property Workbench (Per-Property Deep Dive) */}
          <TourStep
            id="property-performance-section"
            title="Per-Property Performance"
            content="Dive deep into individual property performance. Switch between properties using the tabs. Each property shows Growth (equity over time) and Cashflow (rental income vs expenses) analysis."
            order={11}
            position="left"
          >
          <div id="property-performance-container" className="bento-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-gray-500" />
              Individual Property Performance
            </h2>
            <PropertyPerformanceTabs />
          </div>
          </TourStep>
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
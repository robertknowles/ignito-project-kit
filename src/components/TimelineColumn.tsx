import React, { useState } from 'react';
import { ChartWithRoadmap } from './ChartWithRoadmap';
import { CashflowRoadmap } from './CashflowRoadmap';
import { TourStep } from '@/components/TourManager';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

type ViewMode = 'wealth' | 'cashflow';

interface TimelineColumnProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
  noBorder?: boolean;
}

export const TimelineColumn: React.FC<TimelineColumnProps> = ({ scenarioData, noBorder }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('wealth');

  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'wealth', label: 'Wealth' },
    { id: 'cashflow', label: 'Cashflow' },
  ];

  return (
    <TourStep
      id="wealth-cashflow-chart"
      title="Portfolio Growth Chart"
      content="This chart visualizes your portfolio journey. The colored area shows equity building over time, with property icons marking each purchase. Toggle between Wealth and Cashflow views using the buttons in the top-right."
      order={10}
      position="top"
    >
    <div id="wealth-cashflow-chart-container" className="bg-white overflow-hidden relative border-t border-gray-200">
      {/* View Toggle - floating over the chart */}
      <div id="chart-toggle" className="absolute top-2 right-4 z-20 flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-md px-1 py-0.5">
        {tabs.map((tab) => {
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`relative px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {/* Active indicator - blue underline */}
              {isActive && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: '#87B5FA' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Conditional Content Based on View Mode - fills full space */}
      {viewMode === 'wealth' ? (
        /* Wealth View - Synced Strategy Roadmap */
        <ChartWithRoadmap scenarioData={scenarioData} />
      ) : (
        /* Cashflow View - Cashflow Roadmap */
        <CashflowRoadmap scenarioData={scenarioData} />
      )}
    </div>
    </TourStep>
  );
};

TimelineColumn.displayName = 'TimelineColumn';

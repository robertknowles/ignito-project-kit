import React, { useState } from 'react';
import { ChartWithRoadmap } from './ChartWithRoadmap';
import { CashflowRoadmap } from './CashflowRoadmap';

type ViewMode = 'wealth' | 'cashflow';

export const TimelineColumn: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('wealth');

  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'wealth', label: 'Wealth' },
    { id: 'cashflow', label: 'Cashflow' },
  ];

  return (
    <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-hidden relative">
      {/* View Toggle - floating over the chart */}
      <div className="absolute top-2 right-4 z-20 flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-md px-1 py-0.5">
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
        <ChartWithRoadmap />
      ) : (
        /* Cashflow View - Cashflow Roadmap */
        <CashflowRoadmap />
      )}
    </div>
  );
};

TimelineColumn.displayName = 'TimelineColumn';

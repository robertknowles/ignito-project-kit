import React, { useState } from 'react';
import { ChartWithRoadmap } from './ChartWithRoadmap';
import { CashflowChart } from './CashflowChart';

type ViewMode = 'wealth' | 'cashflow';

export const TimelineColumn: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('wealth');

  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'wealth', label: 'Wealth' },
    { id: 'cashflow', label: 'Cashflow' },
  ];

  return (
    <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl p-6 pt-2">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-end mb-2">
        {/* View Toggle - styled to match Client Inputs tabs */}
        <div className="flex items-center gap-1">
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
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === 'wealth' ? (
        /* Wealth View - Synced Strategy Roadmap */
        <div className="mt-4">
          <ChartWithRoadmap />
        </div>
      ) : (
        /* Cashflow View - Cashflow Chart */
        <div className="mt-4">
          <CashflowChart />
        </div>
      )}
    </div>
  );
};

TimelineColumn.displayName = 'TimelineColumn';

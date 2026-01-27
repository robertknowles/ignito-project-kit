import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { TimelineCard } from './TimelineCard';
import { MilestoneCard } from './MilestoneCard';
import type { TimelineItem } from '../utils/timelineGenerator';

interface SummaryData {
  startingCash: string;
  borrowingCapacity: string;
  annualSavings: string;
  goal: string;
}

interface TabbedTimelineProps {
  timelineDataA: TimelineItem[];
  timelineDataB: TimelineItem[];
  summaryDataA: SummaryData;
  summaryDataB: SummaryData;
  scenarioAName?: string;
  scenarioBName?: string;
}

export function TabbedTimeline({
  timelineDataA,
  timelineDataB,
  summaryDataA,
  summaryDataB,
  scenarioAName = 'Scenario A',
  scenarioBName = 'Scenario B',
}: TabbedTimelineProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

  const activeTimeline = activeTab === 'A' ? timelineDataA : timelineDataB;
  const activeSummary = activeTab === 'A' ? summaryDataA : summaryDataB;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      {/* Header with title and tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Property Investment Timeline
          </h2>
        </div>
        
        {/* Tab buttons */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('A')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'A'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeTab === 'A' ? 'bg-teal-500' : 'bg-slate-300'}`}></span>
              {scenarioAName}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('B')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'B'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeTab === 'B' ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
              {scenarioBName}
            </span>
          </button>
        </div>
      </div>
      
      {/* Starting Position Card */}
      <div className="bg-slate-50 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-200/60">
          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
            activeTab === 'A' ? 'bg-teal-100 text-teal-600' : 'bg-blue-100 text-blue-600'
          }`}>A</div>
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Starting Position</h3>
            <p className="text-[10px] text-slate-500">Initial capital & borrowing power</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-md p-2">
            <p className="text-[10px] text-slate-500 mb-0.5">Starting Cash</p>
            <p className="text-xs font-semibold text-slate-800">{activeSummary.startingCash}</p>
          </div>
          <div className="bg-white rounded-md p-2">
            <p className="text-[10px] text-slate-500 mb-0.5">Borrowing</p>
            <p className="text-xs font-semibold text-slate-800">{activeSummary.borrowingCapacity}</p>
          </div>
          <div className="bg-white rounded-md p-2">
            <p className="text-[10px] text-slate-500 mb-0.5">Annual Savings</p>
            <p className="text-xs font-semibold text-slate-800">{activeSummary.annualSavings}</p>
          </div>
        </div>
      </div>

      {/* Goal Banner */}
      <div className={`rounded-lg p-3 mb-3 flex items-center gap-3 ${
        activeTab === 'A' ? 'bg-teal-50' : 'bg-blue-50'
      }`}>
        <div className={`flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold ${
          activeTab === 'A' ? 'bg-teal-500' : 'bg-blue-500'
        }`}>B</div>
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-wide ${
            activeTab === 'A' ? 'text-teal-600' : 'text-blue-600'
          }`}>Your Goal</p>
          <p className={`text-xs font-semibold ${
            activeTab === 'A' ? 'text-teal-700' : 'text-blue-700'
          }`}>{activeSummary.goal}</p>
        </div>
      </div>

      {/* Property Timeline */}
      {activeTimeline.length > 0 ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200"></div>
          
          {/* Timeline items */}
          {activeTimeline.map((item, index) => {
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
                  savedAmount={item.savedAmount}
                  equityReleased={item.equityReleased}
                  totalDeposit={item.totalDeposit}
                  monthsToSave={item.monthsToSave}
                />
              );
            }
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          No properties in this scenario's timeline.
        </div>
      )}
      
      {/* Scenario indicator at bottom */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2">
        <span className={`w-2 h-2 rounded-full ${activeTab === 'A' ? 'bg-teal-500' : 'bg-blue-500'}`}></span>
        <span className="text-[10px] text-slate-400">
          Viewing {activeTab === 'A' ? scenarioAName : scenarioBName} timeline
        </span>
      </div>
    </div>
  );
}

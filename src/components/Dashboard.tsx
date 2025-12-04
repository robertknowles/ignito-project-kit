import React, { useState, useRef } from 'react';
import { SummaryBar } from './SummaryBar';
import { StrategyBuilder } from './StrategyBuilder';
import { InvestmentTimeline, TimelineProgressBar, useTimelineData } from './InvestmentTimeline';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { CashflowChart } from './CashflowChart';
import { CashFlowAnalysis } from './CashFlowAnalysis';
import { GrowthProjections } from './GrowthProjections';
import { PropertyCard } from './PropertyCard';
import { PerPropertyTracking } from './PerPropertyTracking';
import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, SlidersIcon } from 'lucide-react';
import { usePropertySelection } from '../contexts/PropertySelectionContext';

// Feature flag to show/hide advanced analysis tabs
const SHOW_ADVANCED_TABS = false;

export const Dashboard = () => {
  // State for expandable panes - separate state for each to allow both open
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [propertyExpanded, setPropertyExpanded] = useState(false);
  
  // State for tabs
  const [activeTab, setActiveTab] = useState('timeline');

  // Debug logging for tab changes
  const handleTabChange = (tab: string) => {
    console.log('Dashboard: Tab changing to:', tab);
    console.log('Dashboard: Current activeTab:', activeTab);
    setActiveTab(tab);
    console.log('Dashboard: Tab change completed');
  };
  
  const { calculations } = usePropertySelection();
  
  // Ref for InvestmentTimeline to call scrollToYear
  const timelineRef = useRef<{ scrollToYear: (year: number) => void }>(null);
  
  // Get timeline data for progress bar
  const timelineData = useTimelineData();
  
  const handleYearClick = (year: number) => {
    if (timelineRef.current) {
      timelineRef.current.scrollToYear(year);
    }
  };

  return <div className="flex h-full overflow-hidden bg-white">
      {/* Left Side - Strategy Builder with Vertical Expandable Panes */}
      <div className="w-2/5 h-full p-4">
        <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden h-full flex flex-col">
          <div className="flex-1 overflow-y-auto scrollable-content">
            {/* Client Investment Profile Pane */}
            <div className="border-b border-[#f3f4f6]">
              <div className="flex items-center justify-between p-6 cursor-pointer" onClick={() => setProfileExpanded(!profileExpanded)}>
                <div className="flex items-center gap-3">
                  <SlidersIcon size={16} className="text-[#6b7280]" />
                  <h2 className="text-[#111827] font-medium text-sm">
                    Client Investment Profile
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-[#6b7280]">
                  <span className="text-xs">
                    {calculations.totalProperties} {calculations.totalProperties === 1 ? 'property' : 'properties'} selected
                  </span>
                  {profileExpanded ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                </div>
              </div>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${profileExpanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 pt-0 bg-[#f9fafb]">
                  <StrategyBuilder profileOnly={true} />
                </div>
              </div>
            </div>
            {/* Property Building Blocks Pane */}
            <div>
              <div className="flex items-center justify-between p-6 cursor-pointer" onClick={() => setPropertyExpanded(!propertyExpanded)}>
                <div className="flex items-center gap-3">
                  <ClipboardIcon size={16} className="text-[#6b7280]" />
                  <h2 className="text-[#111827] font-medium text-sm">
                    Property Building Blocks
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-[#6b7280]">
                  <span className="text-xs">
                    {calculations.totalProperties} selected
                  </span>
                  {propertyExpanded ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                </div>
              </div>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${propertyExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 pt-0">
                  <StrategyBuilder propertyOnly={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Results Analysis with Fixed Header */}
      <div className="w-3/5 h-full overflow-hidden p-4">
        <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden flex flex-col h-full">
          {/* Fixed Header Section */}
          <div className="flex-shrink-0 bg-white">
            {/* Summary Bar */}
            <div className="border-b border-[#f3f4f6]">
              <SummaryBar />
            </div>
            {/* Tabs */}
            <div className="flex border-b border-[#f3f4f6]">
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'timeline' ? 'border-b-2' : 'text-[#6b7280] hover:text-[#374151]'}`} style={activeTab === 'timeline' ? { color: '#87B5FA', borderColor: '#87B5FA' } : {}} onClick={() => handleTabChange('timeline')}>
                Purchase Timeline
              </button>
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'portfolio' ? 'border-b-2' : 'text-[#6b7280] hover:text-[#374151]'}`} style={activeTab === 'portfolio' ? { color: '#87B5FA', borderColor: '#87B5FA' } : {}} onClick={() => handleTabChange('portfolio')}>
                Portfolio Growth
              </button>
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'cashflow' ? 'border-b-2' : 'text-[#6b7280] hover:text-[#374151]'}`} style={activeTab === 'cashflow' ? { color: '#87B5FA', borderColor: '#87B5FA' } : {}} onClick={() => handleTabChange('cashflow')}>
                Portfolio Cashflow
              </button>
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'per-property' ? 'border-b-2' : 'text-[#6b7280] hover:text-[#374151]'}`} style={activeTab === 'per-property' ? { color: '#87B5FA', borderColor: '#87B5FA' } : {}} onClick={() => handleTabChange('per-property')}>
                Per Property Stats
              </button>
              {SHOW_ADVANCED_TABS && (
                <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => handleTabChange('analysis')}>
                  Cash Flow Analysis
                </button>
              )}
              {SHOW_ADVANCED_TABS && (
                <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'projections' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => handleTabChange('projections')}>
                  Growth Projections
                </button>
              )}
            </div>
            {/* Year Navigation - Only show for Timeline tab */}
            {activeTab === 'timeline' && (
              <TimelineProgressBar
                startYear={timelineData.startYear}
                endYear={timelineData.endYear}
                latestPurchaseYear={timelineData.latestPurchaseYear}
                purchaseYears={timelineData.purchaseYears}
                onYearClick={handleYearClick}
              />
            )}
          </div>
          
          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-y-auto scrollable-content">
            <div className="w-full max-w-7xl mx-auto px-6 py-6">
              {activeTab === 'timeline' && <InvestmentTimeline ref={timelineRef} />}
              {activeTab === 'portfolio' && <PortfolioGrowthChart />}
              {activeTab === 'cashflow' && <CashflowChart />}
              {activeTab === 'per-property' && <PerPropertyTracking />}
              {SHOW_ADVANCED_TABS && activeTab === 'analysis' && <CashFlowAnalysis />}
              {SHOW_ADVANCED_TABS && activeTab === 'projections' && <GrowthProjections />}
            </div>
          </div>
        </div>
      </div>
    </div>;
};
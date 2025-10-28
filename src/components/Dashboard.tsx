import React, { useState } from 'react';
import { SummaryBar } from './SummaryBar';
import { StrategyBuilder } from './StrategyBuilder';
import { InvestmentTimeline } from './InvestmentTimeline';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { CashflowChart } from './CashflowChart';
import { CashFlowAnalysis } from './CashFlowAnalysis';
import { GrowthProjections } from './GrowthProjections';
import { DecisionEngineView } from './DecisionEngineView';
import { PropertyCard } from './PropertyCard';
import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, SlidersIcon } from 'lucide-react';
import { usePropertySelection } from '../contexts/PropertySelectionContext';

// Feature flag to show/hide advanced analysis tabs
const SHOW_ADVANCED_TABS = false;

export const Dashboard = () => {
  // State for expandable panes
  // const [profileExpanded, setProfileExpanded] = useState(true);
  // const [propertyExpanded, setPropertyExpanded] = useState(true);

  const closed = 0
  const profile = 1 
  const property = 2
  const [accordian, setAccordian] = useState(profile)
  
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

  function expandTab(acc:number){
    if (acc === accordian){
        setAccordian(closed)
    }else{
      setAccordian(acc)
    }
  }

  return <div className="flex-1 overflow-auto p-8 bg-white">
      <div className="flex gap-8">
        {/* Left Side - Strategy Builder with Vertical Expandable Panes */}
        <div className="w-1/2">
          <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
            {/* Client Investment Profile Pane */}
            <div className="border-b border-[#f3f4f6]">
              <div className="flex items-center justify-between p-6 cursor-pointer" onClick={() => expandTab(profile)}>
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
                  {accordian == profile ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                </div>
              </div>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${accordian === profile ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 pt-0 bg-[#f9fafb]">
                  <StrategyBuilder profileOnly={true} />
                </div>
              </div>
            </div>
            {/* Property Building Blocks Pane */}
            <div>
              <div className="flex items-center justify-between p-6 cursor-pointer" onClick={() => expandTab(property)}>
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
                  {accordian === property ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                </div>
              </div>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${accordian === property ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 pt-0">
                  <StrategyBuilder propertyOnly={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Right Side - Results Analysis with Tabs */}
        <div className="w-1/2">
          <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
            {/* Summary Bar */}
            <div className="border-b border-[#f3f4f6]">
              <SummaryBar />
            </div>
            {/* Tabs */}
            <div className="flex border-b border-[#f3f4f6]">
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'timeline' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => handleTabChange('timeline')}>
                Timeline
              </button>
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'portfolio' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => handleTabChange('portfolio')}>
                Portfolio Growth
              </button>
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'cashflow' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => handleTabChange('cashflow')}>
                Cashflow Chart
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
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'breakdown' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => handleTabChange('breakdown')}>
                Decision Engine
              </button>
            </div>
            {/* Tab Content */}
            <div className="p-6">
              {(() => {
                console.log('Dashboard: Rendering tab content for activeTab:', activeTab);
                return null;
              })()}
              {activeTab === 'timeline' && <InvestmentTimeline />}
              {activeTab === 'portfolio' && <PortfolioGrowthChart />}
              {activeTab === 'cashflow' && <CashflowChart />}
              {SHOW_ADVANCED_TABS && activeTab === 'analysis' && <CashFlowAnalysis />}
              {SHOW_ADVANCED_TABS && activeTab === 'projections' && <GrowthProjections />}
              {activeTab === 'breakdown' && (
                <div>
                  {(() => {
                    console.log('Dashboard: About to render DecisionEngineView');
                    return null;
                  })()}
                  <DecisionEngineView />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>;
};
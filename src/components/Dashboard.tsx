import React, { useState } from 'react';
import { SummaryBar } from './SummaryBar';
import { StrategyBuilder } from './StrategyBuilder';
import { InvestmentTimeline } from './InvestmentTimeline';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { CashflowChart } from './CashflowChart';
import { PropertyCard } from './PropertyCard';
import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, SlidersIcon } from 'lucide-react';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { usePropertySelection } from '../hooks/usePropertySelection';
import { useSimulationEngine } from '../hooks/useSimulationEngine';
export const Dashboard = () => {
  // State for expandable panes
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [propertyExpanded, setPropertyExpanded] = useState(true);
  // State for tabs
  const [activeTab, setActiveTab] = useState('timeline');
  
  // Hooks for real data
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, calculations, propertyTypes } = usePropertySelection();
  const { simulationResults } = useSimulationEngine(profile, calculatedValues, selections, propertyTypes);
  
  // Calculate selected properties count
  const selectedPropertiesCount = Object.values(selections).reduce((sum, quantity) => sum + quantity, 0);
  return <div className="flex-1 overflow-auto p-8 bg-white relative">
      <div className="flex gap-8">
        {/* Left Side - Strategy Builder with Vertical Expandable Panes */}
        <div className="w-1/2">
          <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
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
                    ${profile.depositPool.toLocaleString()} deposit • $
                    {profile.borrowingCapacity.toLocaleString()} capacity
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
                    {selectedPropertiesCount} selected
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
        {/* Right Side - Results Analysis with Tabs */}
        <div className="w-1/2">
          <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
            {/* Summary Bar */}
            <div className="border-b border-[#f3f4f6]">
              <SummaryBar simulationResults={simulationResults} />
            </div>
            {/* Tabs */}
            <div className="flex border-b border-[#f3f4f6]">
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'timeline' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => setActiveTab('timeline')}>
                Timeline
              </button>
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'portfolio' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => setActiveTab('portfolio')}>
                Portfolio Growth
              </button>
              <button className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'cashflow' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#6b7280] hover:text-[#374151]'}`} onClick={() => setActiveTab('cashflow')}>
                Cashflow Analysis
              </button>
            </div>
            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'timeline' && <InvestmentTimeline simulationResults={simulationResults} />}
              {activeTab === 'portfolio' && <PortfolioGrowthChart simulationResults={simulationResults} />}
              {activeTab === 'cashflow' && <CashflowChart simulationResults={simulationResults} />}
            </div>
          </div>
        </div>
      </div>
    </div>;
};
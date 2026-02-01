import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { Button } from '@/components/ui/button';
import { SummaryBar } from './SummaryBar';
import { TimelineColumn } from './TimelineColumn';
import { ResetButton } from './ResetButton';

interface ScenarioCanvasProps {
  scenarioId: string;
}

export const ScenarioCanvas: React.FC<ScenarioCanvasProps> = ({ scenarioId }) => {
  const { scenarios, activeScenarioId, setActiveScenario, removeScenario, isMultiScenarioMode } = useMultiScenario();
  const { saveScenario } = useScenarioSave();
  
  // Get live calculated timeline for the active scenario
  // This ensures the active scenario always shows fresh data, not stale stored data
  const { timelineProperties: liveTimelineProperties } = useAffordabilityCalculator();
  const { profile: liveProfile } = useInvestmentProfile();
  
  const [isExpanded, setIsExpanded] = useState(true);
  
  const scenario = scenarios.find(s => s.id === scenarioId);
  const isActive = scenarioId === activeScenarioId;
  
  if (!scenario) return null;
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Don't activate if clicking on remove button or other interactive elements
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (!isActive) {
      setActiveScenario(scenarioId);
    }
  };
  
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeScenario(scenarioId);
    // Auto-save to ensure client report reflects the change
    // Longer delay to ensure React state updates propagate fully
    // (especially isMultiScenarioMode which changes when going from 2->1 scenarios)
    setTimeout(() => {
      saveScenario();
    }, 300);
  };
  
  return (
    <div
      className={`scenario-canvas relative transition-all duration-200 ${
        isMultiScenarioMode
          ? (isActive 
              ? '' 
              : 'cursor-pointer')
          : ''
      }`}
      onClick={isMultiScenarioMode ? handleCanvasClick : undefined}
    >
      {/* Scenario Header - Only show in multi-scenario mode */}
      {isMultiScenarioMode && (
        <div className={`flex items-center justify-between px-4 py-1.5 mb-4 rounded-lg border bg-white ${isActive ? 'border-2 border-black shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{scenario.name}</h2>
            {isActive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-black text-white rounded">
                Active
              </span>
            )}
          </div>
          
          {/* Remove button - only show if more than 1 scenario */}
          {scenarios.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 w-8 h-8 p-0"
              aria-label={`Remove ${scenario.name}`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
      
      {/* Main Content - SummaryBar at top, TimelineColumn (Roadmap Charts) */}
      {/* CRITICAL: For the ACTIVE scenario, use live calculated data to ensure fresh values.
          For inactive scenarios, use stored data from the scenario object.
          This prevents stale timeline data from being displayed for the active scenario. */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Investment Timeline Header */}
        <div className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:bg-gray-50 transition-colors rounded -ml-1 pl-1 pr-2 py-0.5"
          >
            {isExpanded ? (
              <ChevronDown size={18} className="text-gray-500" />
            ) : (
              <ChevronRight size={18} className="text-gray-500" />
            )}
            <h3 className="text-sm font-semibold text-gray-900">Investment Timeline</h3>
          </button>
          <ResetButton iconOnly />
        </div>
        
        {/* Collapsible Content */}
        {isExpanded && (
          <>
            {/* Summary Cards - attached to chart */}
            <SummaryBar 
              scenarioData={isMultiScenarioMode ? {
                timelineProperties: isActive ? liveTimelineProperties : scenario.timeline,
                profile: isActive ? liveProfile : scenario.investmentProfile,
              } : undefined}
              noBorder={true}
            />
            
            <TimelineColumn 
              scenarioData={isMultiScenarioMode ? {
                timelineProperties: isActive ? liveTimelineProperties : scenario.timeline,
                profile: isActive ? liveProfile : scenario.investmentProfile,
              } : undefined}
              noBorder={true}
            />
          </>
        )}
      </div>
    </div>
  );
};

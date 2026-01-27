import React from 'react';
import { X } from 'lucide-react';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { Button } from '@/components/ui/button';
import { SummaryBar } from './SummaryBar';
import { TimelineColumn } from './TimelineColumn';
import { ResetButton } from './ResetButton';

interface ScenarioCanvasProps {
  scenarioId: string;
}

export const ScenarioCanvas: React.FC<ScenarioCanvasProps> = ({ scenarioId }) => {
  const { scenarios, activeScenarioId, setActiveScenario, removeScenario, isMultiScenarioMode } = useMultiScenario();
  
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
  };
  
  return (
    <div
      className={`scenario-canvas relative transition-all duration-200 ${
        isMultiScenarioMode
          ? (isActive 
              ? 'rounded-lg overflow-hidden border-2 border-black shadow-lg bg-white' 
              : 'rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 cursor-pointer bg-white')
          : 'rounded-lg overflow-hidden border border-gray-200 bg-white'
      }`}
      onClick={isMultiScenarioMode ? handleCanvasClick : undefined}
    >
      {/* Scenario Header - Show in both modes but with different content */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          {isMultiScenarioMode ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900">{scenario.name}</h2>
              {isActive && (
                <span className="px-2 py-0.5 text-xs font-medium bg-black text-white rounded">
                  Active
                </span>
              )}
            </>
          ) : (
            <h2 className="text-sm font-medium text-gray-700">Investment Roadmap</h2>
          )}
        </div>
        
        {/* Action buttons - Reset and Remove (multi-scenario only) */}
        <div className="flex items-center gap-2">
          <ResetButton iconOnly />
          
          {/* Remove button - only show if more than 1 scenario */}
          {isMultiScenarioMode && scenarios.length > 1 && (
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
      </div>
      
      {/* Main Content - SummaryBar + TimelineColumn (Roadmap Chart) */}
      <div className="flex flex-col">
        <SummaryBar 
          scenarioData={isMultiScenarioMode ? {
            timelineProperties: scenario.timeline,
            profile: scenario.investmentProfile,
          } : undefined}
          noBorder={isMultiScenarioMode}
        />
        <TimelineColumn 
          scenarioData={isMultiScenarioMode ? {
            timelineProperties: scenario.timeline,
            profile: scenario.investmentProfile,
          } : undefined}
          noBorder={isMultiScenarioMode}
        />
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { ScenarioCanvas } from './ScenarioCanvas';
import { AddScenarioButton } from './AddScenarioButton';
import { ComparisonInsights } from './ComparisonInsights';
import { ClientDetailsCard } from './ClientDetailsCard';
import { RetirementSnapshot } from './RetirementSnapshot';
import { compareScenarios } from '@/utils/comparisonCalculator';

export const Dashboard = () => {
  // Sync chart data to scenario save context for Client Report consistency
  useChartDataSync();
  
  const { scenarios, isMultiScenarioMode } = useMultiScenario();
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();
  
  // Check if this is a saved scenario (has properties in timeline)
  // This determines default expanded states for cards
  const hasSavedProperties = timelineProperties.length > 0;

  // Calculate comparison metrics when 2 scenarios exist
  const comparison = useMemo(() => {
    if (scenarios.length === 2) {
      return compareScenarios(scenarios[0], scenarios[1], profile);
    }
    return null;
  }, [scenarios, profile]);

  // Root: Fills the App.tsx container exactly.
  // Using 'h-full' instead of 'h-screen' to respect parent container.
  return (
    <div className="h-full w-full overflow-y-auto bg-[#f9fafb]">
      <div className={`flex flex-col gap-4 px-12 pt-4 ${scenarios.length < 2 ? 'pb-20' : 'pb-5'}`}>
        {/* Render scenario canvases vertically with gap */}
        <div className="flex flex-col gap-6">
          {scenarios.map(scenario => (
            <ScenarioCanvas key={scenario.id} scenarioId={scenario.id} />
          ))}
        </div>
        
        {/* Comparison Insights - Only show when 2 scenarios exist */}
        {comparison && <ComparisonInsights comparison={comparison} />}
        
        {/* Bottom Section: Client Details (LHS) + Retirement Snapshot (RHS) */}
        {/* Default: Both cards expanded when Dashboard opens */}
        <div className="grid grid-cols-2 gap-4">
          {/* Client Details Card - Bottom LHS */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <ClientDetailsCard defaultExpanded={true} />
          </div>
          
          {/* Retirement Snapshot - Bottom RHS */}
          <RetirementSnapshot defaultExpanded={true} />
        </div>
      </div>
      
      {/* Fixed Add Scenario Button - Only show if < 2 scenarios */}
      {scenarios.length < 2 && <AddScenarioButton />}
    </div>
  );
};
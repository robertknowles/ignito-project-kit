import React, { useMemo } from 'react';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { ScenarioCanvas } from './ScenarioCanvas';
import { AddScenarioButton } from './AddScenarioButton';
import { ComparisonInsights } from './ComparisonInsights';
import { compareScenarios } from '@/utils/comparisonCalculator';

export const Dashboard = () => {
  // Sync chart data to scenario save context for Client Report consistency
  useChartDataSync();
  
  const { scenarios, isMultiScenarioMode } = useMultiScenario();
  const { profile } = useInvestmentProfile();

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
      <div className="flex flex-col gap-6 px-12 pt-10 pb-5">
        {/* Render scenario canvases vertically */}
        {scenarios.map(scenario => (
          <ScenarioCanvas key={scenario.id} scenarioId={scenario.id} />
        ))}
        
        {/* Add Scenario Button - Only show if < 2 scenarios */}
        {scenarios.length < 2 && <AddScenarioButton />}
        
        {/* Comparison Insights - Only show when 2 scenarios exist */}
        {comparison && <ComparisonInsights comparison={comparison} />}
      </div>
    </div>
  );
};
import React, { useMemo } from 'react';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { ScenarioCanvas } from './ScenarioCanvas';
import { AddScenarioButton } from './AddScenarioButton';
import { ComparisonInsights } from './ComparisonInsights';
import { NetWorthChart } from './NetWorthChart';
import { FinancialFreedomPanel } from './FinancialFreedomPanel';
import { compareScenarios } from '@/utils/comparisonCalculator';

export const Dashboard = () => {
  // Sync chart data to scenario save context for Client Report consistency
  useChartDataSync();
  
  const { scenarios, activeScenarioId, isMultiScenarioMode } = useMultiScenario();
  const { profile: liveProfile } = useInvestmentProfile();
  const { timelineProperties: liveTimelineProperties } = useAffordabilityCalculator();
  
  // Helper to get scenario data - use live data for active scenario, stored for inactive
  // This matches the pattern in ScenarioCanvas to ensure consistency
  const getScenarioData = (scenario: typeof scenarios[0]) => {
    const isActive = scenario.id === activeScenarioId;
    return {
      timelineProperties: isActive ? liveTimelineProperties : scenario.timeline,
      profile: isActive ? liveProfile : scenario.investmentProfile,
    };
  };

  // Generate chart data for each scenario using scenario-specific data
  // CRITICAL: Use live data for active scenario to prevent stale data issues
  // These hooks must be called unconditionally (React hooks rules)
  const scenarioAData = scenarios.length >= 1 ? getScenarioData(scenarios[0]) : undefined;
  const scenarioBData = scenarios.length >= 2 ? getScenarioData(scenarios[1]) : undefined;
  
  const chartDataA = useChartDataGenerator(scenarioAData);
  const chartDataB = useChartDataGenerator(scenarioBData);

  // Build scenario objects with live data for comparison
  const scenarioAForComparison = useMemo(() => {
    if (scenarios.length < 1) return null;
    const isActive = scenarios[0].id === activeScenarioId;
    return {
      ...scenarios[0],
      timeline: isActive ? liveTimelineProperties : scenarios[0].timeline,
      investmentProfile: isActive ? liveProfile : scenarios[0].investmentProfile,
    };
  }, [scenarios, activeScenarioId, liveTimelineProperties, liveProfile]);

  const scenarioBForComparison = useMemo(() => {
    if (scenarios.length < 2) return null;
    const isActive = scenarios[1].id === activeScenarioId;
    return {
      ...scenarios[1],
      timeline: isActive ? liveTimelineProperties : scenarios[1].timeline,
      investmentProfile: isActive ? liveProfile : scenarios[1].investmentProfile,
    };
  }, [scenarios, activeScenarioId, liveTimelineProperties, liveProfile]);

  // Calculate comparison metrics when 2 scenarios exist
  // Use chart data for final values to match what charts display
  const comparison = useMemo(() => {
    if (scenarios.length === 2 && scenarioAForComparison && scenarioBForComparison) {
      return compareScenarios(scenarioAForComparison, scenarioBForComparison, liveProfile, chartDataA, chartDataB);
    }
    return null;
  }, [scenarios, scenarioAForComparison, scenarioBForComparison, liveProfile, chartDataA, chartDataB]);

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
        
        {/* Bottom Section: Net Worth (LHS) + Financial Freedom (RHS) */}
        <div className="grid grid-cols-2 gap-4">
          <NetWorthChart />
          <FinancialFreedomPanel />
        </div>
      </div>
      
      {/* Fixed Add Scenario Button - Only show if < 2 scenarios */}
      {scenarios.length < 2 && <AddScenarioButton />}
    </div>
  );
};
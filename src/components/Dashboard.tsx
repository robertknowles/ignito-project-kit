import React, { useMemo } from 'react';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { ScenarioCanvas } from './ScenarioCanvas';
import { ComparisonInsights } from './ComparisonInsights';
import { NetWorthChart, NW_COLORS } from './NetWorthChart';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { ChartCard } from '@/components/ui/ChartCard';
import { compareScenarios } from '@/utils/comparisonCalculator';
import { HoldingCostPanel } from './HoldingCostPanel/HoldingCostPanel';
import { FundingSourcesChart } from './FundingSourcesChart/FundingSourcesChart';
import { EquityUnlockChart } from './EquityUnlockChart/EquityUnlockChart';
import { RetirementScenarioPanel } from './RetirementScenario/RetirementScenarioPanel';
import { CashflowChart } from './CashflowChart';
import { CHART_COLORS } from '@/constants/chartColors';

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
      <div className="flex flex-col gap-6 px-12 pt-6 pb-8">
        {/* Render scenario canvases vertically with gap */}
        <div className="flex flex-col gap-6">
          {scenarios.map(scenario => (
            <ScenarioCanvas key={scenario.id} scenarioId={scenario.id} />
          ))}
        </div>
        
        {/* Comparison Insights - Only show when 2 scenarios exist */}
        {comparison && <ComparisonInsights comparison={comparison} />}

        {/* ── Deep Dive Charts ────────────────────────────────────── */}

        {/* Funding Sources — full width */}
        <ChartCard
          title="Funding Sources"
          legend={[
            { color: CHART_COLORS.series[0], label: 'Cash Deposit' },
            { color: CHART_COLORS.series[1], label: 'Equity Extraction' },
            { color: CHART_COLORS.series[2], label: 'Accumulated Savings' },
          ]}
        >
          <FundingSourcesChart />
        </ChartCard>

        {/* Equity Unlock — per-property extractable equity with BA triggers */}
        <ChartCard
          title="Equity Unlock Timeline"
        >
          <EquityUnlockChart />
        </ChartCard>

        {/* Cashflow Projection — full width */}
        <ChartCard
          title="Cashflow Projection"
          legend={[
            { color: CHART_COLORS.barPositive, label: 'Positive Cashflow' },
            { color: CHART_COLORS.barNegative, label: 'Negative Cashflow' },
          ]}
        >
          <CashflowChart />
        </ChartCard>

        {/* Retirement Scenario + Monthly Holding Cost — side by side */}
        <div className="grid grid-cols-2 gap-6">
          <ChartCard title="Retirement Scenario" contentClassName="px-6 pt-6 pb-6">
            <RetirementScenarioPanel />
          </ChartCard>

          <ChartCard title="Monthly Holding Cost" contentClassName="px-6 pt-6 pb-6">
            <HoldingCostPanel />
          </ChartCard>
        </div>

        {/* Net Worth Trajectory — full width */}
        <ChartCard
          title="Net Worth Trajectory"
          legend={[
            { color: NW_COLORS.totalAssets, label: 'Total Assets' },
            { color: NW_COLORS.netWorth, label: 'Net Worth' },
            { color: NW_COLORS.totalDebt, label: 'Total Debt' },
          ]}
        >
          <NetWorthChart />
        </ChartCard>

        {/* Financial Summary Table — full width at bottom */}
        <ChartCard title="Financial Summary" contentClassName="pl-12 pb-12 pt-5 pr-12">
          <FinancialSummaryTable />
        </ChartCard>
      </div>
    </div>
  );
};
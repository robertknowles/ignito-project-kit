import React, { useMemo } from 'react';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { ScenarioCanvas } from './ScenarioCanvas';
import { ComparisonInsights } from './ComparisonInsights';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { ChartCard } from '@/components/ui/ChartCard';
import { compareScenarios } from '@/utils/comparisonCalculator';
import { HoldingCostPanel } from './HoldingCostPanel/HoldingCostPanel';
import { FundingSourcesChart } from './FundingSourcesChart/FundingSourcesChart';
import { EquityUnlockChart, EquityUnlockSummary } from './EquityUnlockChart/EquityUnlockChart';
import { RetirementScenarioPanel } from './RetirementScenario/RetirementScenarioPanel';
import { CashflowChart } from './CashflowChart';
import { CHART_COLORS } from '@/constants/chartColors';
import { useLayout } from '@/contexts/LayoutContext';
import { PacingToggle } from './PacingToggle';
import { Skeleton } from '@/components/ui/skeleton';
const DashboardSkeleton = () => (
  <div className="h-full w-full overflow-y-auto bg-[#f9fafb]">
    <div className="flex flex-col gap-6 px-12 pt-6 pb-8">
      {/* Section 1 heading */}
      <Skeleton className="h-6 w-40" />

      {/* ScenarioCanvas skeleton — summary cards row */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        {/* Chart area */}
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>

      {/* Funding + Equity row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  // Sync chart data to scenario save context for Client Report consistency
  useChartDataSync();
  
  const { scenarios, activeScenarioId, isMultiScenarioMode } = useMultiScenario();
  const { profile: liveProfile } = useInvestmentProfile();
  const { timelineProperties: liveTimelineProperties } = useAffordabilityCalculator();
  const { planGenerating } = useLayout();

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

  // Show skeleton while first plan is generating and no data exists yet
  // IMPORTANT: This check must come AFTER all hooks to avoid "rendered fewer hooks" error
  if (planGenerating && liveTimelineProperties.length === 0) {
    return <DashboardSkeleton />;
  }

  // Root: Fills the App.tsx container exactly.
  // Using 'h-full' instead of 'h-screen' to respect parent container.
  return (
    <div className="h-full w-full overflow-y-auto bg-[#f9fafb]">
      <div className="flex flex-col gap-6 px-12 pt-6 pb-8">
        {/* ── Section 1: Investment Plan ──────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-600 mb-0">Investment Plan</h2>
          <PacingToggle />
        </div>

        {/* Render scenario canvases vertically with gap */}
        <div className="flex flex-col gap-6">
          {scenarios.map(scenario => (
            <ScenarioCanvas key={scenario.id} scenarioId={scenario.id} />
          ))}
        </div>
        
        {/* Comparison Insights - Only show when 2 scenarios exist */}
        {comparison && <ComparisonInsights comparison={comparison} />}

        {/* Funding Sources + Equity Unlock — side by side */}
        <div className="grid grid-cols-2 gap-6">
          <ChartCard title="Funding Sources">
            <FundingSourcesChart />
          </ChartCard>

          <ChartCard title="Equity Unlock Timeline" action={<EquityUnlockSummary />}>
            <EquityUnlockChart />
          </ChartCard>
        </div>

        {/* ── Section 2: Cash Flow & Costs ────────────────────────── */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-600 mb-4">Cash Flow & Costs</h2>
          <div className="flex flex-col gap-6">
            {/* Cashflow + Holding Cost — side by side */}
            <div className="grid grid-cols-2 gap-6">
              <ChartCard
                title="Cashflow Projection"
                legend={[
                  { color: CHART_COLORS.barPositive, label: 'Positive' },
                  { color: CHART_COLORS.barNegative, label: 'Negative' },
                ]}
              >
                <CashflowChart />
              </ChartCard>

              <ChartCard title="Monthly Holding Cost">
                <HoldingCostPanel />
              </ChartCard>
            </div>

            <ChartCard
              title="Financial Summary"
              contentClassName="px-8 pt-6 pb-8"
              collapsible
              defaultCollapsed
            >
              <FinancialSummaryTable />
            </ChartCard>
          </div>
        </div>

        {/* ── Section 3: The Goal ─────────────────────────────────── */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-600 mb-4">The Goal</h2>
          <div className="flex flex-col gap-6">
            <ChartCard title="Retirement Scenario">
              <RetirementScenarioPanel />
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
};
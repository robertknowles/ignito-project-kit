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
import { HoldingCostPanel, HoldingCostSection } from './HoldingCostPanel/HoldingCostPanel';
import { FundingSourcesChart } from './FundingSourcesChart/FundingSourcesChart';
import { EquityUnlockChart, EquityUnlockSummary, useEquityUnlockLegend } from './EquityUnlockChart/EquityUnlockChart';
import { RetirementScenarioPanel } from './RetirementScenario/RetirementScenarioPanel';
import { CashflowChart } from './CashflowChart';
import { CHART_COLORS } from '@/constants/chartColors';
import { PacingToggle } from './PacingToggle';
import { useLayout } from '@/contexts/LayoutContext';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardSkeleton = () => (
  <div className="h-full w-full overflow-y-auto bg-[#f9fafb]">
    <div className="flex flex-col gap-3 mx-auto" style={{ padding: '32px 0 80px 0', width: '70%', minWidth: 500 }}>
      {/* KPI row skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      {/* Chart skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </div>
      ))}
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

  const getScenarioData = (scenario: typeof scenarios[0]) => {
    const isActive = scenario.id === activeScenarioId;
    return {
      timelineProperties: isActive ? liveTimelineProperties : scenario.timeline,
      profile: isActive ? liveProfile : scenario.investmentProfile,
    };
  };

  const scenarioAData = scenarios.length >= 1 ? getScenarioData(scenarios[0]) : undefined;
  const scenarioBData = scenarios.length >= 2 ? getScenarioData(scenarios[1]) : undefined;

  const chartDataA = useChartDataGenerator(scenarioAData);
  const chartDataB = useChartDataGenerator(scenarioBData);

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

  const comparison = useMemo(() => {
    if (scenarios.length === 2 && scenarioAForComparison && scenarioBForComparison) {
      return compareScenarios(scenarioAForComparison, scenarioBForComparison, liveProfile, chartDataA, chartDataB);
    }
    return null;
  }, [scenarios, scenarioAForComparison, scenarioBForComparison, liveProfile, chartDataA, chartDataB]);

  const equityLegend = useEquityUnlockLegend();

  if (planGenerating && liveTimelineProperties.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#f9fafb]">
      <div className="flex flex-col gap-3 mx-auto" style={{ padding: '32px 0 80px 0', width: '70%', minWidth: 500 }}>
        {/* 1. KPI Row + Investment Timeline (inside ScenarioCanvas) */}
        {scenarios.map(scenario => (
          <ScenarioCanvas key={scenario.id} scenarioId={scenario.id} />
        ))}

        {/* Comparison Insights - Only show when 2 scenarios exist */}
        {comparison && <ComparisonInsights comparison={comparison} />}

        {/* 2. Equity Unlock Timeline */}
        <ChartCard title="Equity Unlock Timeline" action={<EquityUnlockSummary />} legend={equityLegend} contentClassName="px-6 pt-6 pb-6">
          <EquityUnlockChart />
        </ChartCard>

        {/* 3. Funding Sources */}
        <ChartCard title="Funding Sources">
          <FundingSourcesChart />
        </ChartCard>

        {/* 4. Cashflow Projection */}
        <ChartCard
          title="Cashflow Projection"
          legend={[
            { color: '#2563EB', label: 'Rental Income' },
            { color: '#9CA3AF', label: 'Expenses' },
          ]}
                 >
          <CashflowChart />
        </ChartCard>

        {/* 5. Monthly Holding Costs */}
        <HoldingCostSection>
          {(dropdown, panel) => (
            <ChartCard title="Monthly Holding Costs" action={dropdown}>
              {panel}
            </ChartCard>
          )}
        </HoldingCostSection>

        {/* 6. Financial Summary — collapsible */}
        <ChartCard
          title="Financial Summary"
                   collapsible
          defaultCollapsed
        >
          <FinancialSummaryTable />
        </ChartCard>

        {/* 7. Retirement Scenario — unchanged */}
        <ChartCard title="Retirement Scenario">
          <RetirementScenarioPanel />
        </ChartCard>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { ScenarioCanvas } from './ScenarioCanvas';
import { PropertyCardRow } from './PropertyCardRow';
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
import { useLayout } from '@/contexts/LayoutContext';
import { Skeleton } from '@/components/ui/skeleton';

/** Static placeholder block — only shimmers when animating */
const SkeletonBlock = ({ className, animate }: { className?: string; animate?: boolean }) => (
  <div className={`rounded-md bg-gray-200 relative overflow-hidden ${className ?? ''}`}>
    {animate && (
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    )}
  </div>
);

const DashboardSkeleton = ({ animate = false }: { animate?: boolean }) => (
  <div className="h-full w-full overflow-y-auto bg-white">
    <div className="flex flex-col gap-3 mx-auto" style={{ padding: '32px 0 80px 0', width: '70%', minWidth: 500 }}>
      {/* KPI row skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 space-y-2">
            <SkeletonBlock className="h-4 w-24" animate={animate} />
            <SkeletonBlock className="h-8 w-32" animate={animate} />
          </div>
        ))}
      </div>
      {/* Chart skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#FAFAFA] rounded-lg border border-gray-200 p-6">
          <SkeletonBlock className="h-5 w-40 mb-4" animate={animate} />
          <SkeletonBlock className="h-[220px] w-full rounded-lg" animate={animate} />
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

  // Show skeleton when no plan exists yet; shimmer only while generating
  if (liveTimelineProperties.length === 0) {
    return <DashboardSkeleton animate={planGenerating} />;
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-white">
      <div className="flex flex-col gap-6 mx-auto" style={{ padding: '40px 0 80px 0', width: '80%', maxWidth: 1280, minWidth: 500 }}>
        {/* 1. KPI Row + Investment Timeline (inside ScenarioCanvas) */}
        {scenarios.map(scenario => (
          <ScenarioCanvas key={scenario.id} scenarioId={scenario.id} />
        ))}

        {/* Comparison Insights - Only show when 2 scenarios exist */}
        {comparison && <ComparisonInsights comparison={comparison} />}

        {/* 2. Property Cards — pivot between Investment Timeline and Equity Unlock */}
        <ChartCard title="Properties">
          <PropertyCardRow />
        </ChartCard>

        {/* 3. Equity Unlock Timeline */}
        <ChartCard title="Equity Unlock Timeline" action={<EquityUnlockSummary />} legend={equityLegend}>
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

        {/* Retirement Scenario moved to /retirement tab */}
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useRef } from 'react';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useClient } from '@/contexts/ClientContext';
import { ScenarioCanvas } from './ScenarioCanvas';
import { PropertyCardRow } from './PropertyCardRow';
import { ComparisonInsights } from './ComparisonInsights';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { ChartCard } from '@/components/ui/ChartCard';
import { compareScenarios } from '@/utils/comparisonCalculator';
import { CashflowChart } from './CashflowChart';
import { TimelineColumn } from './TimelineColumn';
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
  const { propertyOrder: livePropertyOrder } = usePropertySelection();
  const { loadClientScenario } = useScenarioSave();
  const { activeClient } = useClient();

  // Belt-and-suspenders self-heal from a blank dashboard.
  //
  // Primary recovery now lives in ScenarioSaveContext (covers all pathways and
  // pages, not just Dashboard). This stays as a redundant fallback for the
  // narrow case where Dashboard mounts with an active client but the
  // context-level effect hasn't yet had a chance to run — and it lets us track
  // whether the bug recurs specifically on Dashboard mount.
  //
  // The ref resets when activeClient changes so a long-lived session can
  // recover more than once if state gets wiped multiple times.
  const recoveryAttemptedRef = useRef(false);
  const recoveryClientIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (recoveryClientIdRef.current !== activeClient?.id) {
      recoveryAttemptedRef.current = false;
      recoveryClientIdRef.current = activeClient?.id ?? null;
    }
    if (recoveryAttemptedRef.current) return;
    if (livePropertyOrder.length > 0) return;
    if (!activeClient?.id) return;
    recoveryAttemptedRef.current = true;
    loadClientScenario(activeClient.id);
  }, [livePropertyOrder.length, activeClient?.id, loadClientScenario]);

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

  // Show skeleton only when there's genuinely no plan (no properties in the order
  // yet) AND we're not actively generating. Previously this checked just
  // liveTimelineProperties.length, which would skeleton-out the page if the
  // affordability calculator transiently returned empty (e.g. during a
  // re-mount after navigation) even when the underlying selections were
  // intact. Anchoring on propertyOrder (the source of truth for "do we have
  // a plan?") prevents the dashboard from blanking on nav-back.
  const hasPlan = livePropertyOrder.length > 0 || liveTimelineProperties.length > 0;
  if (!hasPlan) {
    return <DashboardSkeleton animate={planGenerating} />;
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-white relative">
      {planGenerating && (
        <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-blue-50/90 border-b border-blue-200 py-2 text-sm text-blue-700 backdrop-blur-sm">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Updating plan...
        </div>
      )}
      <div className="flex flex-col gap-6 mx-auto" style={{ padding: '40px 0 80px 0', width: '80%', maxWidth: 1280, minWidth: 500 }}>
        {/* 1. KPI Row + Investment Timeline (inside ScenarioCanvas) */}
        {scenarios.map(scenario => (
          <ScenarioCanvas key={scenario.id} scenarioId={scenario.id} />
        ))}

        {/* Comparison Insights - Only show when 2 scenarios exist */}
        {comparison && <ComparisonInsights comparison={comparison} />}

        {/* 2. Property Cards */}
        <ChartCard title="Properties" flush>
          <PropertyCardRow />
        </ChartCard>

        {/* 3. Investment Timeline */}
        <ChartCard
          title="Investment Timeline"
          legend={[
            { color: '#7F56D9', label: 'Portfolio Value' },
            { color: '#B692F6', label: 'Total Equity' },
            { color: '#6941C6', label: 'Savings Only', variant: 'ring' },
          ]}
        >
          <TimelineColumn />
        </ChartCard>

        {/* 4. Cashflow Projection */}
        <ChartCard
          title="Cashflow Projection"
          legend={[
            { color: '#7F56D9', label: 'Net Cashflow' },
          ]}
        >
          <CashflowChart />
        </ChartCard>

        {/* 5. Financial Summary */}
        <ChartCard title="Financial Summary" flush>
          <FinancialSummaryTable />
        </ChartCard>
      </div>
    </div>
  );
};

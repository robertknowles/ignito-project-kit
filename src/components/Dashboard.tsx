import React, { useMemo, useState, useRef, useEffect } from 'react';
import { TrendingUpIcon, FileTextIcon, Building2Icon, BarChart3Icon, TableIcon, Plus, ListIcon, SlidersHorizontalIcon, RotateCcw, XIcon, AlertTriangle, PiggyBankIcon, DownloadIcon, Loader2, ClipboardListIcon, Check, MoreHorizontal } from 'lucide-react';
import { AssumptionsGrid } from '@/components/AssumptionsGrid';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { usePortfolioProjection } from '../hooks/usePortfolioProjection';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { useTabDwellTracking } from '@/hooks/useInteractionTracking';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { useClient } from '@/contexts/ClientContext';
import { PropertyCardRow } from './PropertyCardRow';
import { CustomBlockModal, type CustomPropertyBlock } from './CustomBlockModal';
import { track, EVENTS } from '@/lib/analytics';
import { ComparisonInsights } from './ComparisonInsights';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { ChartCard } from '@/components/ui/ChartCard';
import { PlaceholderChart } from '@/components/ui/PlaceholderChart';
import { compareScenarios } from '@/utils/comparisonCalculator';
import { CashflowChart } from './CashflowChart';
import { PortfolioCashflow } from './PortfolioCashflow';
import { BorrowingCapacityChart } from './BorrowingCapacityChart';
import { PropertyRoadmapChart, PropertyRoadmapSummary, ROADMAP_LEGEND } from './PropertyRoadmapChart/PropertyRoadmapChart';
// EquityMortgageChart and HoldingCostChart hidden for now — components preserved in their files
import { TimelineColumn } from './TimelineColumn';
import { BriefTab } from './BriefTab';
import { PortfolioTab } from './PortfolioTab';
import { ClientInputsTab } from './ClientInputsTab';
import { RetirementScenarioPanel } from './RetirementScenario/RetirementScenarioPanel';
import { InfoPopover } from './RetirementScenario/InfoPopover';
import { useLayout } from '@/contexts/LayoutContext';
import { TopBar } from './TopBar';
import { ReportExportRenderer } from './export/ReportExportRenderer';
import { ConfirmationBrief } from './ConfirmationBrief';
import { ChangeReceiptProvider, type ReceiptMetrics } from '@/contexts/ChangeReceiptContext';
import { ChangeLogPanel, ChangeLogBell } from './ChangeLogPanel';
import {
  BASE_YEAR,
  ANNUAL_WAGE_GROWTH_RATE,
  RENTAL_RECOGNITION_RATE,
  PERIODS_PER_YEAR,
} from '../constants/financialParams';
import { calculateBorrowingCeiling } from '../utils/borrowingCapacityCeiling';
import { COLORS, TYPOGRAPHY } from '../constants/designTokens';

/* ── Tab components ──────────────────────────────────────────────── */

type PlanSubTab = 'purchases' | 'projections' | 'retirement';
interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

// Top tabs — §2.4 underline style: 13px/600, active violet text + 2px violet
// underline overlapping the header hairline, inactive meta-grey.
const PrimaryTabItem: React.FC<TabItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3.5 h-full self-stretch -mb-px border-b-2 text-[13px] font-semibold transition-colors ${
      active
        ? 'text-[#7C3AED] border-[#7C3AED]'
        : 'text-[#717680] border-transparent hover:text-[#414651]'
    }`}
  >
    {icon}
    {label}
  </button>
);

// Sub-tabs — §2.4 segmented control: active = white pill (radius 7 + shadow,
// #181D27), inactive meta-grey, 13px/600. The grey track wraps these.
const SubTabItem: React.FC<TabItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] text-[13px] font-semibold transition-colors ${
      active
        ? 'bg-white text-[#181D27] shadow-sm'
        : 'text-[#717680] hover:text-[#414651]'
    }`}
  >
    {icon}
    {label}
  </button>
);

const formatCompact = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs).toLocaleString()}`;
  return `${sign}$${Math.round(abs)}`;
};

/** Compact money for summary cards — trims trailing zeros ($5M, $6.59M, $165k). */
const formatMoney = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = Math.round((abs / 1_000_000) * 100) / 100;
    return `${sign}$${m}M`;
  }
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
};

const TimeRangeTabs: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden">
    {[10, 20, 30].map((years, i) => (
      <button
        key={years}
        onClick={() => onChange(years)}
        className={`px-3 py-1 text-xs font-medium transition-colors ${
          value === years
            ? 'bg-white text-neutral-800 shadow-sm'
            : 'bg-neutral-50 text-neutral-500 hover:text-neutral-700'
        } ${i !== 0 ? 'border-l border-neutral-200' : ''}`}
      >
        {years}y
      </button>
    ))}
  </div>
);

/** Static placeholder block — only shimmers when animating */
const SkeletonBlock = ({ className, animate }: { className?: string; animate?: boolean }) => (
  <div className={`rounded-md bg-gray-200 relative overflow-hidden ${className ?? ''}`}>
    {animate && (
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    )}
  </div>
);

/**
 * PlanLoadingBar — determinate-looking progress bar shown at the top of the
 * skeleton while a plan is being generated. The fill is simulated (the request
 * has no true progress): it eases toward 92% and the whole bar unmounts the
 * moment the plan lands. Mirrors the Compare page's ScenarioLoadingBar.
 */
const PlanLoadingBar = () => {
  const [progress, setProgress] = useState(6);
  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => Math.min(92, p + (92 - p) * 0.055 + 0.35));
    }, 110);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full mx-auto" style={{ maxWidth: 440 }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-medium text-[#414651]">Building plan…</span>
        <span className="text-[13px] font-medium text-[#717680] tabular-nums">{Math.round(progress)}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[#F0F1F4] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#7C3AED] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * PlanLoadingSteps — a single progress line beneath the loading bar showing what
 * the engine is doing right now. Each step replaces the previous one (no stacking):
 * the old line fades out and the next fades up in its place. Steps advance on their
 * own timers (the request has no true progress signal — same approximation the chat
 * panel's ChatLoadingSteps uses).
 *
 * Timings are deliberately IRREGULAR so it doesn't feel like a mechanical loop —
 * each step "works" for a different duration. Just before a line is replaced its
 * spinner flips to a green tick for a beat, so the user sees each step complete
 * before the next appears. The final step holds (spinner only) until the plan
 * lands and the whole skeleton unmounts.
 */
// Per-step "work" durations before the tick shows (irregular on purpose).
const PLAN_LOADING_STEP_HOLDS = [900, 1650, 1150, 1900];
const PLAN_LOADING_TICK_PAUSE = 450; // how long the green tick lingers before the next line
const PlanLoadingSteps = ({ clientName }: { clientName?: string }) => {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    PLAN_LOADING_STEP_HOLDS.forEach((hold, i) => {
      const tickAt = elapsed + hold;
      // show the tick on the current line
      timers.push(setTimeout(() => setChecked(true), tickAt));
      // then advance to the next line and reset the tick
      const advanceAt = tickAt + PLAN_LOADING_TICK_PAUSE;
      timers.push(
        setTimeout(() => {
          setStep(i + 1);
          setChecked(false);
        }, advanceAt),
      );
      elapsed = advanceAt;
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const name = (clientName ?? '').trim();
  const steps = [
    name ? `Reading ${name}'s profile` : 'Reading client profile',
    'Selecting properties',
    'Running affordability checks',
    'Modelling against market assumptions',
    'Building your roadmap',
  ];
  const current = Math.min(step, steps.length - 1);

  return (
    <div className="w-full mx-auto mt-5 flex justify-center" style={{ maxWidth: 440, height: 20 }}>
      {/* key={current} remounts the line each step → old fades out, new fades in */}
      <div
        key={current}
        className="flex items-center gap-2.5 text-[13px] animate-in fade-in slide-in-from-bottom-1 duration-300"
      >
        {checked ? (
          <Check size={15} className="text-emerald-500 shrink-0 animate-in zoom-in duration-200" />
        ) : (
          <Loader2 size={15} className="animate-spin text-[#7C3AED] shrink-0" />
        )}
        <span className="text-[#414651] font-medium">{steps[current]}</span>
      </div>
    </div>
  );
};

const DashboardSkeleton = ({ animate = false, showProgress = false, clientName }: { animate?: boolean; showProgress?: boolean; clientName?: string }) => (
  <div className="h-full w-full overflow-y-auto bg-white">
    <div className="flex flex-col gap-3 mx-auto" style={{ padding: '32px 24px 80px 24px', width: '100%', minWidth: 500 }}>
      {/* Loading header — bar + progress checks, only while actively generating */}
      {showProgress && (
        <div className="flex flex-col items-center pt-6 pb-3">
          <PlanLoadingBar />
          <PlanLoadingSteps clientName={clientName} />
        </div>
      )}
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
  useChartDataSync();

  const { scenarios, activeScenarioId, isMultiScenarioMode } = useMultiScenario();
  const { profile: liveProfile } = useInvestmentProfile();
  const { timelineProperties: liveTimelineProperties } = useAffordabilityCalculator();
  const { planGenerating, pendingPlanResponse } = useLayout();
  const { propertyOrder: livePropertyOrder, eventBlocks, addCustomBlock, incrementProperty } = usePropertySelection();
  const { activeClient } = useClient();

  const getScenarioData = (scenario: typeof scenarios[0]) => {
    const isActive = scenario.id === activeScenarioId;
    return {
      timelineProperties: isActive ? liveTimelineProperties : scenario.timeline,
      profile: isActive ? liveProfile : scenario.investmentProfile,
    };
  };

  const scenarioAData = scenarios.length >= 1 ? getScenarioData(scenarios[0]) : undefined;
  const scenarioBData = scenarios.length >= 2 ? getScenarioData(scenarios[1]) : undefined;

  const [displayYears, setDisplayYears] = useState(20);

  const displayScenarioAData = useMemo(() => {
    if (!scenarioAData) return undefined;
    return { ...scenarioAData, profile: { ...scenarioAData.profile, timelineYears: displayYears } };
  }, [scenarioAData, displayYears]);

  const displayScenarioBData = useMemo(() => {
    if (!scenarioBData) return undefined;
    return { ...scenarioBData, profile: { ...scenarioBData.profile, timelineYears: displayYears } };
  }, [scenarioBData, displayYears]);

  const chartDataA = usePortfolioProjection(displayScenarioAData);
  const chartDataB = usePortfolioProjection(displayScenarioBData);

  const blockedProperties = useMemo(() => {
    return liveTimelineProperties.filter(p => p.status === 'challenging' && p.affordableYear !== Infinity);
  }, [liveTimelineProperties]);
  const totalProperties = livePropertyOrder.length;
  const hasBlockedProperties = blockedProperties.length > 0 && totalProperties > 0;

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

  // Tab state — must be before the early return to satisfy React hooks rules
  const { dashboardTab: activeTab, setDashboardTab: setActiveTab } = useLayout();
  const [planSubTab, setPlanSubTab] = useState<PlanSubTab>('purchases');
  // Analytics: time spent on the main dashboard tab and the Plan sub-tab.
  useTabDwellTracking('main_tab', activeTab);
  useTabDwellTracking('plan_subtab', planSubTab);
  // "Add property" opens the blank custom-property form directly — the old
  // template-picker modal (AddToTimelineModal) is deliberately bypassed; the
  // templates still exist in data for the AI/presets, just no picker UI.
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const handleSaveCustomProperty = (block: CustomPropertyBlock) => {
    addCustomBlock(block);
    incrementProperty(block.id);
    track(EVENTS.propertyAddedToTimeline, { property_id: block.id, source: 'custom' });
    setIsAddPropertyOpen(false);
  };
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const resetAssumptionsRef = useRef<() => void>(() => {});

  // PDF export — a single unified Portfolio Brief, always available regardless
  // of the active tab.
  const [isExporting, setIsExporting] = useState(false);

  // Kebab (⋯) actions menu in the navbar: holds Assumptions, Export PDF and
  // Send to Client. Closes on outside click or Escape.
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!actionsMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActionsMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [actionsMenuOpen]);

  const kpis = useMemo(() => {
    const growthData = chartDataA.portfolioGrowthData;
    const cfData = chartDataA.cashflowData;
    const lastGrowth = growthData[growthData.length - 1];
    const lastCf = cfData[cfData.length - 1];
    return {
      portfolioValue: lastGrowth?.portfolioValue ?? 0,
      propertyEquity: lastGrowth?.propertyEquity ?? 0,
      totalEquity: lastGrowth?.equity ?? 0,
      cashFromSales: lastGrowth?.cashFromSales ?? 0,
      totalDebt: lastGrowth?.totalDebt ?? 0,
      netCashflowAnnual: lastCf
        ? Math.round(lastCf.rentalIncome - lastCf.expenses - lastCf.loanRepayments)
        : 0,
      rentalIncomeAnnual: lastCf ? Math.round(lastCf.rentalIncome) : 0,
      holdingCostsAnnual: lastCf ? Math.round(lastCf.expenses + lastCf.loanRepayments) : 0,
      ...(() => {
        // Cashflow headroom: stated annual savings less the worst shortfall on the
        // timeline. Raw input — deliberately not scaled by SAVINGS_DEPLOYMENT_RATE.
        const annualSavings = Math.max(0, Math.round(displayScenarioAData?.profile?.annualSavings ?? 0));
        const endYear = BASE_YEAR + displayYears - 1;
        let tightestHeadroom: number | null = null;
        let tightestHeadroomYear: string | null = null;
        for (const d of cfData) {
          if (Number(d.year) > endYear) continue;
          const headroom = annualSavings + Math.round(d.rentalIncome - d.expenses - d.loanRepayments);
          if (tightestHeadroom === null || headroom < tightestHeadroom) {
            tightestHeadroom = headroom;
            tightestHeadroomYear = d.year;
          }
        }
        return { annualSavings, tightestHeadroom, tightestHeadroomYear };
      })(),
      borrowingHeadroom: (() => {
        const profile = displayScenarioAData?.profile;
        if (!lastGrowth || !profile) return 0;
        const yearsElapsed = displayYears - 1;
        const wageGrowth = profile.wageGrowthRate ?? ANNUAL_WAGE_GROWTH_RATE;
        const multiplier = profile.salaryServiceabilityMultiplier ?? 6.0;
        const baseSalary = profile.baseSalary ?? 60000;
        const projectedSalary = baseSalary * Math.pow(1 + wageGrowth, yearsElapsed);
        const grossRental = lastCf?.rentalIncome ?? 0;
        const capturedRental = grossRental * RENTAL_RECOGNITION_RATE;
        const capacity = Math.round((projectedSalary + capturedRental) * multiplier);
        const debt = lastGrowth.totalDebt ?? 0;
        return capacity - debt;
      })(),
      // Classify borrowing health across the displayed horizon using the SAME
      // two lines the chart draws: Debt not Offset (real exposure) vs Borrowing
      // Capacity. Over capacity = exposure climbs above the capacity line.
      borrowingStatus: (() => {
        const profile = displayScenarioAData?.profile;
        const fallback = {
          state: 'comfortable' as 'comfortable' | 'tight' | 'broken',
          headroom: 0,
          tightestYear: null as string | null,
          peakUtilization: 0,
          brokenYear: null as string | null,
        };
        if (!profile) return fallback;
        const endYear = BASE_YEAR + displayYears - 1;
        const wageGrowth = profile.wageGrowthRate ?? ANNUAL_WAGE_GROWTH_RATE;

        let minHeadroom: number | null = null;
        let tightestYear: string | null = null;
        let peakUtilization = 0;
        let brokenYear: string | null = null;

        for (const g of growthData) {
          const year = Number(g.year);
          if (year > endYear) continue;
          const yearsElapsed = year - BASE_YEAR;
          const period = yearsElapsed * PERIODS_PER_YEAR + 1;
          const grossRental = cfData.find(c => c.year === g.year)?.rentalIncome ?? 0;

          const ceiling = calculateBorrowingCeiling(period, {
            statedBC: profile.borrowingCapacity ?? 0,
            baseSalary: profile.baseSalary ?? 60000,
            salaryMultiplier: profile.salaryServiceabilityMultiplier ?? 6.0,
            wageGrowth,
            grossRentalIncome: grossRental,
            eventBlocks,
          }) + (g.newBuildBcUplift ?? 0);

          // Real exposure the lender counts: entity-discounted debt less cash
          // reserves — identical to the chart's "Offset Debt" series.
          const lenderDebt = g.entityDiscountedDebt ?? g.totalDebt ?? 0;
          const cashOffset = Math.min(g.cashOffset ?? 0, lenderDebt);
          const offsetDebt = Math.round(Math.max(0, lenderDebt - cashOffset));

          const headroom = ceiling - offsetDebt;
          const utilization = ceiling > 0 ? offsetDebt / ceiling : 0;
          if (minHeadroom === null || headroom < minHeadroom) {
            minHeadroom = headroom;
            tightestYear = g.year;
          }
          if (utilization > peakUtilization) peakUtilization = utilization;
          if (offsetDebt > ceiling && brokenYear === null) brokenYear = g.year;
        }

        const state: 'comfortable' | 'tight' | 'broken' = brokenYear
          ? 'broken'
          : peakUtilization >= 0.9
            ? 'tight'
            : 'comfortable';
        return { state, headroom: minHeadroom ?? 0, tightestYear, peakUtilization, brokenYear };
      })(),
    };
  }, [chartDataA, displayScenarioAData, displayYears, eventBlocks]);

  // "The Goal" / "What it takes" summary above the Purchases table.
  const planHeader = useMemo(() => {
    const growthData = chartDataA.portfolioGrowthData;
    const cashflowGoal = liveProfile?.cashflowGoal ?? 0;
    const equityGoal = liveProfile?.equityGoal ?? 0;

    // Target year = first year BOTH goals are projected to be met — the goal
    // isn't achieved while cashflow is still short of target, even if equity
    // got there first. A goal set to $0 means "no target" for that dimension.
    // Falls back to the plan horizon end when never met (goalMet = false).
    const planEndYear = BASE_YEAR + (liveProfile?.timelineYears ?? displayYears) - 1;
    const cashflowByYear = new Map(
      (chartDataA.cashflowData ?? []).map(c => [Number(c.year), c.cashflow ?? 0]),
    );
    let targetYear: number | null = null;
    if (equityGoal > 0 || cashflowGoal > 0) {
      for (const g of growthData) {
        const year = Number(g.year);
        const equityMet = equityGoal <= 0 || (g.equity ?? 0) >= equityGoal;
        const cashflowMet = cashflowGoal <= 0 || (cashflowByYear.get(year) ?? 0) >= cashflowGoal;
        if (equityMet && cashflowMet) {
          targetYear = year;
          break;
        }
      }
    }
    const goalMet = targetYear !== null;
    const resolvedTargetYear = targetYear ?? planEndYear;

    // Equity projected at the target year (falls back to the horizon figure).
    const projectedEquity =
      growthData.find(g => Number(g.year) === resolvedTargetYear)?.equity ?? kpis.totalEquity;

    // Acquisitions on the timeline + total upfront cash.
    const bought = liveTimelineProperties.filter(p => Number.isFinite(p.affordableYear));
    const years = bought.map(p => Math.floor(p.affordableYear));
    const firstYear = years.length ? Math.min(...years) : null;
    const lastYear = years.length ? Math.max(...years) : null;
    const depositsTotal = bought.reduce(
      (sum, p) => sum + (p.totalCashRequired ?? p.depositRequired ?? 0),
      0,
    );

    return {
      cashflowGoal,
      equityGoal,
      targetYear: resolvedTargetYear,
      goalMet,
      projectedEquity,
      count: bought.length,
      firstYear,
      lastYear,
      depositsTotal,
    };
  }, [chartDataA, liveProfile, displayYears, liveTimelineProperties, kpis.totalEquity]);

  // Headline metrics the change receipt diffs across edits — equity at the
  // displayed horizon, annual cashflow, borrowing headroom, and per-property
  // placement outcomes.
  const receiptMetrics = useMemo<ReceiptMetrics>(() => {
    const growthData = chartDataA.portfolioGrowthData;
    const lastGrowth = growthData[growthData.length - 1];
    return {
      horizonYear: lastGrowth ? parseInt(lastGrowth.year, 10) : BASE_YEAR,
      totalEquity: kpis.totalEquity,
      netCashflowAnnual: kpis.netCashflowAnnual,
      borrowingHeadroom: kpis.borrowingHeadroom,
      properties: liveTimelineProperties.map(tp => ({
        instanceId: tp.instanceId,
        year: Number.isFinite(tp.affordableYear) ? Math.floor(tp.affordableYear) : null,
        challenging: tp.status === 'challenging',
      })),
    };
  }, [chartDataA, kpis, liveTimelineProperties]);

  const hasPlan = livePropertyOrder.length > 0 || liveTimelineProperties.length > 0;
  if (pendingPlanResponse) {
    return (
      <div className="h-full w-full relative">
        <DashboardSkeleton animate />
        <ConfirmationBrief response={pendingPlanResponse} />
      </div>
    );
  }
  if (!hasPlan) {
    return <DashboardSkeleton animate={planGenerating} showProgress={planGenerating} clientName={activeClient?.name} />;
  }

  return (
    <ChangeReceiptProvider metrics={receiptMetrics}>
    <div className="h-full w-full flex bg-[#FAFAFA]">
    <div className="h-full flex-1 min-w-0 overflow-y-auto relative bg-[#FAFAFA]">
      {planGenerating && (
        <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-blue-50/90 border-b border-blue-200 py-2 text-sm text-blue-700 backdrop-blur-sm">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Updating plan...
        </div>
      )}
      {/* ── Sticky top navbar (white bar over the grey content) ── */}
      <div className="sticky top-0 z-20 bg-white px-7">
        <div className="flex items-center gap-1 border-b border-[#E9EAEB] h-[62px]">
          <PrimaryTabItem
            icon={<TrendingUpIcon size={16} />}
            label="Portfolio Plan"
            active={activeTab === 'plan'}
            onClick={() => setActiveTab('plan')}
          />
          <PrimaryTabItem
            icon={<FileTextIcon size={16} />}
            label="Next Purchase Brief"
            active={activeTab === 'brief'}
            onClick={() => setActiveTab('brief')}
          />
          <PrimaryTabItem
            icon={<Building2Icon size={16} />}
            label="Existing Portfolio"
            active={activeTab === 'portfolio'}
            onClick={() => setActiveTab('portfolio')}
          />
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setActiveTab('inputs')}
              title="Client inputs"
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[13px] font-semibold transition-colors shadow-sm ${
                activeTab === 'inputs'
                  ? 'text-[#414651] bg-[#F5F5F6] border-[#D5D7DA]'
                  : 'text-neutral-600 bg-white border-neutral-200 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              <ClipboardListIcon size={15} />
              Client Inputs
            </button>
            <ChangeLogBell />
            {/* Kebab menu: Assumptions · Export PDF · Send to Client */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setActionsMenuOpen(prev => !prev)}
                title="More actions"
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors shadow-sm ${
                  actionsMenuOpen
                    ? 'text-[#414651] bg-[#F5F5F6] border-[#D5D7DA]'
                    : 'text-neutral-500 bg-white border-neutral-200 hover:text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <MoreHorizontal size={16} />
              </button>
              {actionsMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-[#E9EAEB] z-[10000] py-1">
                  <button
                    onClick={() => { setAssumptionsOpen(true); setActionsMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#414651] bg-transparent border-none cursor-pointer hover:bg-[#F5F5F6] transition-colors text-left"
                  >
                    <SlidersHorizontalIcon size={15} className="text-[#717680]" />
                    Assumptions
                  </button>
                  <button
                    onClick={() => { if (!isExporting) setIsExporting(true); setActionsMenuOpen(false); }}
                    disabled={isExporting}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#414651] bg-transparent border-none cursor-pointer hover:bg-[#F5F5F6] transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? <Loader2 size={15} className="animate-spin text-[#717680]" /> : <DownloadIcon size={15} className="text-[#717680]" />}
                    Export PDF
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-neutral-100 text-neutral-500">Beta</span>
                  </button>
                  <TopBar variant="menuItem" onAction={() => setActionsMenuOpen(false)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll content column (grey #FAFAFA page, white cards) ── */}
      <div className="flex flex-col gap-6 mx-auto" style={{ padding: '24px 28px 80px 28px', width: '100%', minWidth: 500 }}>
        {/* ── Assumptions modal overlay ── */}
        {assumptionsOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setAssumptionsOpen(false)}>
            <div
              className="bg-[#F9FAFB] border border-[#E9EAEB] rounded-xl p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#181D27]">Assumptions</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetAssumptionsRef.current?.()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#535862] hover:text-[#414651] transition-colors"
                  >
                    <RotateCcw size={12} />
                    Reset to defaults
                  </button>
                  <button
                    onClick={() => setAssumptionsOpen(false)}
                    className="w-6 h-6 inline-flex items-center justify-center rounded-md text-[#717680] hover:text-[#414651] hover:bg-[#F2F4F7] transition-colors"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
              <AssumptionsGrid
                showHeader={false}
                onResetExposed={(fn) => { resetAssumptionsRef.current = fn; }}
              />
            </div>
          </div>
        )}

        {/* ── Plan sub-tabs (Equity | Cashflow | Projections) ── */}
        {activeTab === 'plan' && (
          <div className="flex items-center -mt-3">
            <div className="flex items-center gap-1.5 bg-[#F2F2F3] p-[3px] rounded-[9px]">
              <SubTabItem
                icon={<ListIcon size={15} />}
                label="Purchases"
                active={planSubTab === 'purchases'}
                onClick={() => setPlanSubTab('purchases')}
              />
              <SubTabItem
                icon={<TableIcon size={15} />}
                label="Projections"
                active={planSubTab === 'projections'}
                onClick={() => setPlanSubTab('projections')}
              />
              <SubTabItem
                icon={<PiggyBankIcon size={15} />}
                label="Retirement"
                active={planSubTab === 'retirement'}
                onClick={() => setPlanSubTab('retirement')}
              />
            </div>
          </div>
        )}

        {/* Blocked properties: no banner — indicated inline via red year text and red chart icons */}

        {/* ── Tab content ── */}

        {/* Portfolio Plan > Purchases: Table + charts */}
        {activeTab === 'plan' && planSubTab === 'purchases' && (
          <>
            {/* ── Plan summary: goal panel + outcome panel ── */}
            {(() => {
              const ph = planHeader;
              const ff = TYPOGRAPHY.fontFamily;

              // Client first name (uppercased) for the panel headings.
              const firstName =
                ((activeClient?.name ?? '').trim().split(/\s+/)[0] || 'Client').toUpperCase();

              // Years to reach the goal — target year is the first year BOTH
              // goals are met. When neither year exists in the projection the
              // header shows "N+ years" rather than claiming the goal is hit.
              const yearsToGoal = Math.max(1, ph.targetYear - BASE_YEAR);
              const yearsToGoalLabel = `${yearsToGoal}${ph.goalMet ? '' : '+'}`;

              // Projected outcomes at the target year (fall back to horizon KPIs).
              const growthAtTarget = chartDataA.portfolioGrowthData.find(
                g => Number(g.year) === ph.targetYear,
              );
              const cashflowAtTarget = chartDataA.cashflowData?.find(
                c => Number(c.year) === ph.targetYear,
              );
              const equityAtTarget = growthAtTarget?.equity ?? kpis.totalEquity;
              const portfolioAtTarget = growthAtTarget?.portfolioValue ?? kpis.portfolioValue;
              const netCashflowAtTarget = cashflowAtTarget?.cashflow ?? kpis.netCashflowAnnual;

              const lastBuyYearRel = ph.lastYear ? ph.lastYear - BASE_YEAR : null;

              // ── PropPath §2.1 unified hero pair + §1.4 stat ramp ──────────
              // Shared uppercase kicker (11/600/0.06em/#717680).
              const kicker: React.CSSProperties = {
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: '#717680', fontFamily: ff,
              };

              // Outcome rows. Net cashflow carries semantic sign colour (§1.3);
              // the rest stay neutral. "Properties bought" splits its "by year N"
              // qualifier into a muted 13px suffix.
              const rows: {
                label: string; value: string; suffix?: string; color?: string;
              }[] = [
                {
                  label: 'Net cashflow',
                  value: `${formatMoney(netCashflowAtTarget)}/yr`,
                  color: netCashflowAtTarget >= 0 ? '#17B26A' : '#F04438',
                },
                { label: 'Equity', value: formatMoney(equityAtTarget) },
                { label: 'Portfolio value', value: formatMoney(portfolioAtTarget) },
                {
                  label: 'Properties bought',
                  value: String(ph.count),
                  suffix: lastBuyYearRel != null ? `by year ${lastBuyYearRel}` : undefined,
                },
              ];

              return (
                // One bordered card, split goal (violet tint) / outcome (white).
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '0.85fr 1.4fr',
                    background: '#FFFFFF',
                    border: '1px solid #E9EAEB',
                    borderRadius: 14,
                    overflow: 'hidden',
                    fontFamily: ff,
                  }}
                >
                  {/* Goal half — violet-50 tint */}
                  <div
                    style={{
                      background: '#F5F3FF',
                      padding: '30px 32px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      borderRight: '1px solid #E9EAEB',
                    }}
                  >
                    <div style={kicker}>{firstName}'S GOAL</div>
                    <div
                      style={{
                        fontSize: 46, fontWeight: 600, letterSpacing: '-0.025em',
                        lineHeight: 1.05, color: '#181D27', marginTop: 14,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {yearsToGoalLabel} {yearsToGoal === 1 ? 'year' : 'years'}
                    </div>
                    <div style={{ fontSize: 13, color: '#535862', marginTop: 10, maxWidth: 240, lineHeight: 1.45 }}>
                      to reach <span style={{ fontWeight: 600, color: '#414651' }}>{formatMoney(ph.equityGoal)} equity</span>
                      {' '}and <span style={{ fontWeight: 600, color: '#414651' }}>{formatMoney(ph.cashflowGoal)}/yr income</span>
                    </div>
                  </div>

                  {/* Outcome half */}
                  <div style={{ padding: '24px 32px' }}>
                    <div style={{ ...kicker, marginBottom: 6 }}>
                      IN {yearsToGoalLabel} {yearsToGoal === 1 ? 'YEAR' : 'YEARS'}, {firstName} HAS
                    </div>
                    {rows.map((r, i) => (
                      <div
                        key={r.label}
                        className="flex items-center justify-between"
                        style={{
                          padding: '13px 0',
                          borderBottom: i < rows.length - 1 ? '1px solid #F2F2F2' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 13, color: '#535862' }}>{r.label}</span>
                        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: r.color ?? '#181D27' }}>
                          {r.value}
                          {r.suffix && (
                            <span style={{ fontSize: 13, fontWeight: 400, color: '#717680' }}> {r.suffix}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <ChartCard title="Purchases" flush action={
              <button
                onClick={() => setIsAddPropertyOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <Plus size={14} />
                Add property
              </button>
            }>
              <PropertyCardRow mode="purchases" onAddClick={() => setIsAddPropertyOpen(true)} />
            </ChartCard>

            {/* ── 2×2 grid of financial charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Total Equity chart */}
              <ChartCard
                title="Total Equity"
                expandable
                legend={[
                  { color: '#8B5CF6', label: kpis.cashFromSales > 0 ? 'Total Equity (incl. cash from sales)' : 'Total Equity' },
                  { color: '#C4C4CC', label: 'Portfolio Value', variant: 'line' },
                ]}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    <span
                      style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: '#181D27', fontFamily: 'Inter, system-ui, sans-serif' }}
                      title={kpis.cashFromSales > 0 ? `Property equity ${formatCompact(kpis.propertyEquity)} + cash from sales ${formatCompact(kpis.cashFromSales)}` : undefined}
                    >
                      {formatCompact(kpis.totalEquity)}
                    </span>
                    <span style={{ fontSize: 12, color: '#717680' }}>
                      by {BASE_YEAR + displayYears - 1}
                    </span>
                  </div>
                  <TimeRangeTabs value={displayYears} onChange={setDisplayYears} />
                </div>
                <TimelineColumn scenarioData={displayScenarioAData} />
              </ChartCard>

              {/* Net Cashflow chart */}
              <ChartCard
                title="Net Cashflow"
                expandable
                legend={[
                  { color: '#8B5CF6', label: 'Net Cashflow' },
                  ...(kpis.annualSavings > 0 ? [{ color: '#C4C4CC', label: 'Client Savings Rate', variant: 'line' as const }] : []),
                ]}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="whitespace-nowrap"
                      style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', fontFamily: 'Inter, system-ui, sans-serif', color: kpis.netCashflowAnnual > 0 ? '#17B26A' : kpis.netCashflowAnnual < 0 ? '#F04438' : '#181D27' }}
                    >
                      {formatCompact(kpis.netCashflowAnnual)}
                    </span>
                    <span className="whitespace-nowrap" style={{ fontSize: 12, color: '#717680' }}>/yr by {BASE_YEAR + displayYears - 1}</span>
                  </div>
                  <TimeRangeTabs value={displayYears} onChange={setDisplayYears} />
                </div>
                <CashflowChart scenarioData={displayScenarioAData} />
              </ChartCard>

              {/* Borrowing Capacity chart */}
              <ChartCard
                title="Borrowing Capacity"
                expandable
                legend={[
                  { color: '#8B5CF6', label: 'Capacity' },
                  { color: '#D9D2F2', label: 'Headroom', variant: 'swatch' },
                  { color: '#A1A1AA', label: 'Debt not Offset', variant: 'line' },
                ]}
                action={
                  <div className="relative group">
                    <AlertTriangle
                      size={14}
                      className={`cursor-help ${
                        kpis.borrowingStatus.state === 'broken'
                          ? 'text-red-500'
                          : kpis.borrowingStatus.state === 'tight'
                            ? 'text-amber-500'
                            : 'text-neutral-400'
                      }`}
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block w-56 px-3 py-2 rounded-lg bg-neutral-800 text-white text-xs leading-relaxed shadow-lg">
                      {kpis.borrowingStatus.state === 'broken'
                        ? `Total liabilities overrun borrowing capacity in ${kpis.borrowingStatus.brokenYear}. The plan needs reworking before this point — pace acquisitions or adjust the entity structure.`
                        : kpis.borrowingStatus.state === 'tight'
                          ? `Capacity gets tight in ${kpis.borrowingStatus.tightestYear} (${Math.round(kpis.borrowingStatus.peakUtilization * 100)}% used). Little room for slippage around this point.`
                          : 'If total liabilities exceed borrowing capacity, this is due to the trust entity structure allowing acquisitions beyond individual serviceability limits.'}
                    </div>
                  </div>
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    {kpis.borrowingStatus.state === 'broken' ? (
                      <>
                        <span className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          Over capacity
                        </span>
                        <span className="text-sm text-red-500">in {kpis.borrowingStatus.brokenYear}</span>
                      </>
                    ) : kpis.borrowingStatus.state === 'tight' ? (
                      <>
                        <span className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          Tightest in {kpis.borrowingStatus.tightestYear}
                        </span>
                        <span className="text-sm text-neutral-500">{Math.round(kpis.borrowingStatus.peakUtilization * 100)}% used</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {formatCompact(kpis.borrowingStatus.headroom)}
                        </span>
                        <span className="text-sm text-neutral-500">headroom</span>
                      </>
                    )}
                  </div>
                  <TimeRangeTabs value={displayYears} onChange={setDisplayYears} />
                </div>
                <BorrowingCapacityChart scenarioData={displayScenarioAData} />
              </ChartCard>

              {/* Portfolio Cashflow — per-property IN vs OUT with year slider */}
              <ChartCard
                title="Portfolio Cashflow"
                expandable
                legend={[
                  { color: '#8B5CF6', label: 'In' },
                  { color: '#D9D2F2', label: 'Out' },
                ]}
              >
                <PortfolioCashflow />
              </ChartCard>
            </div>

            {/* Property Roadmap — Gantt chart (full width) */}
            <ChartCard
              title="Property Roadmap"
              expandable
              legend={[...ROADMAP_LEGEND]}
              action={<PropertyRoadmapSummary />}
            >
              <div className="flex items-center justify-end mb-4">
                <TimeRangeTabs value={displayYears} onChange={setDisplayYears} />
              </div>
              <PropertyRoadmapChart displayYears={displayYears} />
            </ChartCard>

            {/* Equity vs Mortgage + What It Costs to Hold — hidden for now, charts preserved in components */}
          </>
        )}

        {/* Portfolio Plan > Projections: Financial Summary */}
        {activeTab === 'plan' && planSubTab === 'projections' && (
          <ChartCard
            title="Financial Summary"
            flush
            titleInfo={
              <InfoPopover
                accent
                title="Calculated view"
                body={['Every figure here is calculated from your plan. Nothing in this table is edited directly.']}
                action={{ label: 'Go to Purchases', onClick: () => setPlanSubTab('purchases') }}
              />
            }
          >
            <FinancialSummaryTable />
          </ChartCard>
        )}

        {activeTab === 'plan' && planSubTab === 'retirement' && (
          <ChartCard title="Retirement Scenario">
            <RetirementScenarioPanel />
          </ChartCard>
        )}

        {/* Next Purchase Brief */}
        {activeTab === 'brief' && (
          <BriefTab onNavigateToPurchases={() => { setActiveTab('plan'); setPlanSubTab('purchases'); }} />
        )}

        {/* Existing Portfolio */}
        {activeTab === 'portfolio' && <PortfolioTab />}

        {/* Client Inputs */}
        {activeTab === 'inputs' && <ClientInputsTab />}
      </div>
      <CustomBlockModal
        isOpen={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onSave={handleSaveCustomProperty}
      />
    </div>
    <ReportExportRenderer active={isExporting} onDone={() => setIsExporting(false)} />
    <ChangeLogPanel />
    </div>
    </ChangeReceiptProvider>
  );
};

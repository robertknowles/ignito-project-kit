import React, { useMemo, useState, useRef } from 'react';
import { TrendingUpIcon, FileTextIcon, Building2Icon, BarChart3Icon, TableIcon, Plus, ListIcon, UserIcon, SlidersHorizontalIcon, RotateCcw, XIcon, LayoutGridIcon, AlertTriangle } from 'lucide-react';
import { AssumptionsGrid } from '@/components/AssumptionsGrid';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { usePortfolioProjection } from '../hooks/usePortfolioProjection';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { useClient } from '@/contexts/ClientContext';
import { PropertyCardRow } from './PropertyCardRow';
import { AddToTimelineModal } from './AddToTimelineModal';
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
import { useLayout } from '@/contexts/LayoutContext';
import { TopBar } from './TopBar';
import { ConfirmationBrief } from './ConfirmationBrief';
import {
  BASE_YEAR,
  ANNUAL_WAGE_GROWTH_RATE,
  RENTAL_RECOGNITION_RATE,
} from '../constants/financialParams';

/* ── Tab components ──────────────────────────────────────────────── */

type PlanSubTab = 'purchases' | 'projections';
type PurchasesView = 'table' | 'blocks';
interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const PrimaryTabItem: React.FC<TabItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active
        ? 'bg-neutral-50 text-neutral-800'
        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
    }`}
  >
    {icon}
    {label}
  </button>
);

const SubTabItem: React.FC<TabItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
      active
        ? 'bg-neutral-50 text-neutral-800'
        : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
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
        {years} years
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

const DashboardSkeleton = ({ animate = false }: { animate?: boolean }) => (
  <div className="h-full w-full overflow-y-auto bg-white">
    <div className="flex flex-col gap-3 mx-auto" style={{ padding: '32px 24px 80px 24px', width: '100%', minWidth: 500 }}>
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
  const { propertyOrder: livePropertyOrder } = usePropertySelection();
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
  const [purchasesView, setPurchasesView] = useState<PurchasesView>('table');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const resetAssumptionsRef = useRef<() => void>(() => {});

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
    };
  }, [chartDataA, displayScenarioAData, displayYears]);

  const addPropertyBtn = (
    <button
      onClick={() => setIsLibraryOpen(true)}
      className="flex items-center gap-1 px-2 text-[12px] font-medium text-neutral-500 hover:text-neutral-700 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
    style={{ height: 20, lineHeight: '20px' }}
    >
      <Plus size={14} />
      Add property
    </button>
  );

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
      <div className="flex flex-col gap-6 mx-auto" style={{ padding: '40px 24px 80px 24px', width: '100%', minWidth: 500 }}>
        {/* ── Primary tab bar ── */}
        <div className="flex items-center gap-1 border-b border-neutral-200 pb-2">
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
          <PrimaryTabItem
            icon={<UserIcon size={16} />}
            label="Client Inputs"
            active={activeTab === 'inputs'}
            onClick={() => setActiveTab('inputs')}
          />
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setAssumptionsOpen(prev => !prev)}
              title="Assumptions"
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors shadow-sm ${
                assumptionsOpen
                  ? 'text-[#414651] bg-[#F5F5F6] border-[#D5D7DA]'
                  : 'text-neutral-500 bg-white border-neutral-200 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <SlidersHorizontalIcon size={15} />
            </button>
            <TopBar />
          </div>
        </div>

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
          <div className="flex items-center gap-1 -mt-3">
            <SubTabItem
              icon={<ListIcon size={14} />}
              label="Purchases"
              active={planSubTab === 'purchases'}
              onClick={() => setPlanSubTab('purchases')}
            />
            <SubTabItem
              icon={<TableIcon size={14} />}
              label="Projections"
              active={planSubTab === 'projections'}
              onClick={() => setPlanSubTab('projections')}
            />
            {planSubTab === 'purchases' && (
              <div className="ml-auto flex items-center rounded-lg border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setPurchasesView('table')}
                  title="Table view"
                  className={`flex items-center justify-center w-8 h-7 transition-colors ${
                    purchasesView === 'table'
                      ? 'bg-white text-neutral-800 shadow-sm'
                      : 'bg-neutral-50 text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <TableIcon size={14} />
                </button>
                <button
                  onClick={() => setPurchasesView('blocks')}
                  title="Card view"
                  className={`flex items-center justify-center w-8 h-7 border-l border-neutral-200 transition-colors ${
                    purchasesView === 'blocks'
                      ? 'bg-white text-neutral-800 shadow-sm'
                      : 'bg-neutral-50 text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <LayoutGridIcon size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Blocked properties: no banner — indicated inline via red year text and red chart icons */}

        {/* ── Tab content ── */}

        {/* Portfolio Plan > Purchases: Table + charts */}
        {activeTab === 'plan' && planSubTab === 'purchases' && (
          <>
            <ChartCard title="Purchases" flush>
              <PropertyCardRow mode={purchasesView === 'blocks' ? 'blocks' : 'purchases'} onAddClick={() => setIsLibraryOpen(true)} />
            </ChartCard>

            {/* Total Equity chart */}
            <ChartCard
              title="Total Equity"
              legend={[
                { color: '#7F56D9', label: kpis.cashFromSales > 0 ? 'Total Equity (incl. cash from sales)' : 'Total Equity' },
                { color: '#737373', label: 'Portfolio Value' },
              ]}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-2xl font-semibold text-neutral-900"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    title={kpis.cashFromSales > 0 ? `Property equity ${formatCompact(kpis.propertyEquity)} + cash from sales ${formatCompact(kpis.cashFromSales)}` : undefined}
                  >
                    {formatCompact(kpis.totalEquity)}
                  </span>
                  <span className="text-sm text-neutral-500">
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
              legend={[{ color: '#7F56D9', label: 'Net Cashflow' }]}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {formatCompact(kpis.netCashflowAnnual)}
                  </span>
                  <span className="text-sm text-neutral-500">/yr by {BASE_YEAR + displayYears - 1}</span>
                </div>
                <TimeRangeTabs value={displayYears} onChange={setDisplayYears} />
              </div>
              <CashflowChart scenarioData={displayScenarioAData} />
            </ChartCard>

            {/* Borrowing Capacity chart */}
            <ChartCard
              title="Borrowing Capacity"
              legend={[
                { color: '#7F56D9', label: 'Borrowing Capacity' },
                { color: '#414651', label: 'Total Liabilities' },
                { color: '#9E77ED', label: 'Offset Debt' },
              ]}
              action={
                <div className="relative group">
                  <AlertTriangle size={14} className="text-neutral-400 cursor-help" />
                  <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block w-56 px-3 py-2 rounded-lg bg-neutral-800 text-white text-xs leading-relaxed shadow-lg">
                    If total liabilities exceed borrowing capacity, this is due to the trust entity structure allowing acquisitions beyond individual serviceability limits.
                  </div>
                </div>
              }
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {formatCompact(kpis.borrowingHeadroom)}
                  </span>
                  <span className="text-sm text-neutral-500">headroom by {BASE_YEAR + displayYears - 1}</span>
                </div>
                <TimeRangeTabs value={displayYears} onChange={setDisplayYears} />
              </div>
              <BorrowingCapacityChart scenarioData={displayScenarioAData} />
            </ChartCard>

            {/* Property Roadmap — Gantt chart */}
            <ChartCard
              title="Property Roadmap"
              legend={[...ROADMAP_LEGEND]}
              action={<PropertyRoadmapSummary />}
            >
              <div className="flex items-center justify-end mb-4">
                <TimeRangeTabs value={displayYears} onChange={setDisplayYears} />
              </div>
              <PropertyRoadmapChart displayYears={displayYears} />
            </ChartCard>

            {/* Portfolio Cashflow — per-property IN vs OUT with year slider */}
            <ChartCard
              title="Portfolio Cashflow"
              legend={[
                { color: '#7F56D9', label: 'Rental Income (IN)' },
                { color: 'rgba(127, 86, 217, 0.25)', label: 'Total Outgoings (OUT)' },
              ]}
            >
              <PortfolioCashflow />
            </ChartCard>

            {/* Equity vs Mortgage + What It Costs to Hold — hidden for now, charts preserved in components */}
          </>
        )}

        {/* Portfolio Plan > Projections: Financial Summary */}
        {activeTab === 'plan' && planSubTab === 'projections' && (
          <ChartCard title="Financial Summary" flush>
            <FinancialSummaryTable />
          </ChartCard>
        )}

        {/* Next Purchase Brief */}
        {activeTab === 'brief' && <BriefTab />}

        {/* Existing Portfolio */}
        {activeTab === 'portfolio' && <PortfolioTab />}

        {/* Client Inputs */}
        {activeTab === 'inputs' && <ClientInputsTab />}
      </div>
      <AddToTimelineModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
    </div>
  );
};

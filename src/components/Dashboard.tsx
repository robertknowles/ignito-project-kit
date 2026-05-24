import React, { useMemo, useState } from 'react';
import { TrendingUpIcon, FileTextIcon, Building2Icon, BarChart3Icon, TableIcon, Plus, ListIcon } from 'lucide-react';
import { useChartDataSync } from '../hooks/useChartDataSync';
import { useChartDataGenerator } from '../hooks/useChartDataGenerator';
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
import { TimelineColumn } from './TimelineColumn';
import { BriefTab } from './BriefTab';
import { PortfolioTab } from './PortfolioTab';
import { useLayout } from '@/contexts/LayoutContext';
import { TopBar } from './TopBar';
import { BASE_YEAR } from '../constants/financialParams';

/* ── Tab components ──────────────────────────────────────────────── */

type PlanSubTab = 'purchases' | 'equity' | 'cashflow' | 'projections';
type PortfolioSubTab = 'graphs' | 'tables';

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
  const { planGenerating } = useLayout();
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

  const chartDataA = useChartDataGenerator(displayScenarioAData);
  const chartDataB = useChartDataGenerator(displayScenarioBData);

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
  const [portfolioSubTab, setPortfolioSubTab] = useState<PortfolioSubTab>('graphs');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const kpis = useMemo(() => {
    const growthData = chartDataA.portfolioGrowthData;
    const cfData = chartDataA.cashflowData;
    const lastGrowth = growthData[growthData.length - 1];
    const lastCf = cfData[cfData.length - 1];
    return {
      portfolioValue: lastGrowth?.portfolioValue ?? 0,
      totalEquity: lastGrowth?.equity ?? 0,
      netCashflowMonthly: lastCf
        ? Math.round((lastCf.rentalIncome - lastCf.expenses - lastCf.loanRepayments) / 12)
        : 0,
    };
  }, [chartDataA]);

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
  if (!hasPlan) {
    return <DashboardSkeleton animate={planGenerating} />;
  }

  const hasPortfolioSubTabs = activeTab === 'portfolio';

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
          <div className="ml-auto">
            <TopBar />
          </div>
        </div>

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
              icon={<TrendingUpIcon size={14} />}
              label="Equity"
              active={planSubTab === 'equity'}
              onClick={() => setPlanSubTab('equity')}
            />
            <SubTabItem
              icon={<BarChart3Icon size={14} />}
              label="Cashflow"
              active={planSubTab === 'cashflow'}
              onClick={() => setPlanSubTab('cashflow')}
            />
            <SubTabItem
              icon={<TableIcon size={14} />}
              label="Projections"
              active={planSubTab === 'projections'}
              onClick={() => setPlanSubTab('projections')}
            />
          </div>
        )}

        {/* ── Portfolio sub-tabs (Graphs | Tables) ── */}
        {hasPortfolioSubTabs && (
          <div className="flex items-center gap-1 -mt-3">
            <SubTabItem
              icon={<BarChart3Icon size={14} />}
              label="Graphs"
              active={portfolioSubTab === 'graphs'}
              onClick={() => setPortfolioSubTab('graphs')}
            />
            <SubTabItem
              icon={<TableIcon size={14} />}
              label="Tables"
              active={portfolioSubTab === 'tables'}
              onClick={() => setPortfolioSubTab('tables')}
            />
          </div>
        )}

        {/* ── Tab content ── */}

        {/* Portfolio Plan > Purchases: Full editable properties table */}
        {activeTab === 'plan' && planSubTab === 'purchases' && (
          <ChartCard title="Purchases" flush action={addPropertyBtn}>
            <PropertyCardRow mode="purchases" onAddClick={() => setIsLibraryOpen(true)} />
          </ChartCard>
        )}

        {/* Portfolio Plan > Equity: Investment Timeline with KPI header */}
        {activeTab === 'plan' && planSubTab === 'equity' && (
          <>
            <ChartCard
              title="Total Equity"
              legend={[
                { color: '#7F56D9', label: 'Total Equity' },
                { color: '#737373', label: 'Portfolio Value' },
              ]}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
            <ChartCard title="Loan / Borrowing Capacity">
              <PlaceholderChart label="Loan & borrowing capacity with equity releases" height={200} />
            </ChartCard>
          </>
        )}

        {/* Portfolio Plan > Cashflow: Cashflow Projection with KPI header */}
        {activeTab === 'plan' && planSubTab === 'cashflow' && (
          <>
            <ChartCard
              title="Net Cashflow"
              legend={[{ color: '#7F56D9', label: 'Net Cashflow' }]}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {formatCompact(kpis.netCashflowMonthly)}
                  </span>
                  <span className="text-sm text-neutral-500">/mo by {BASE_YEAR + displayYears - 1}</span>
                </div>
                <TimeRangeTabs value={displayYears} onChange={setDisplayYears} />
              </div>
              <CashflowChart scenarioData={displayScenarioAData} />
            </ChartCard>
            <ChartCard title="What It Costs to Hold">
              <PlaceholderChart label="Stacked holding costs breakdown over time" height={200} />
            </ChartCard>
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
        {activeTab === 'portfolio' && <PortfolioTab mode={portfolioSubTab} />}
      </div>
      <AddToTimelineModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
    </div>
  );
};

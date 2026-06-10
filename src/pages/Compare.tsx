import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar';
import { Slider } from '@/components/ui/slider';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { CHART_COLORS, CHART_STYLE } from '@/constants/chartColors';
import { ArrowLeftRight, TrendingUp, Banknote, Flag } from 'lucide-react';

interface ChartDataPoint {
  year: string;
  portfolioValue?: number;
  equity?: number;
  properties?: string[];
}

interface CashflowDataPoint {
  year: string;
  cashflow?: number;
  rentalIncome?: number;
  loanRepayments?: number;
}

interface ScenarioOption {
  scenarioId: number;
  clientId: number;
  clientName: string;
  scenarioName: string;
  portfolioGrowthData: ChartDataPoint[];
  cashflowData: CashflowDataPoint[];
  targetYear: number | null;
}

const formatCompact = (v: number): string => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
};

const CompareTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="text-xs font-semibold text-neutral-900 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-medium text-neutral-900">{formatCompact(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Marks purchase years on a scenario's chart line with a simple dot.
const makePurchaseDot = (propsKey: 'propertiesA' | 'propertiesB', color: string) => {
  const PurchaseDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return null;

    const list: string[] | undefined = payload?.[propsKey];
    if (!list || list.length === 0) return null;

    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />;
  };
  return <PurchaseDot />;
};

export const Compare: React.FC = () => {
  const { clients } = useClient();
  const [allScenarios, setAllScenarios] = useState<ScenarioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>('');
  const [selectedYearIdx, setSelectedYearIdx] = useState<number>(0);

  useEffect(() => {
    const fetchScenarios = async () => {
      if (clients.length === 0) {
        setLoading(false);
        return;
      }

      const options: ScenarioOption[] = [];

      for (const client of clients) {
        const { data: scenarios, error } = await supabase
          .from('scenarios')
          .select('id, name, data, client_id')
          .eq('client_id', client.id)
          .order('updated_at', { ascending: false });

        if (error || !scenarios) continue;

        for (const scenario of scenarios) {
          const d = scenario.data as any;
          if (!d?.chartData?.portfolioGrowthData || !d?.chartData?.cashflowData) continue;

          options.push({
            scenarioId: scenario.id,
            clientId: client.id,
            clientName: client.name,
            scenarioName: scenario.name || 'Scenario',
            portfolioGrowthData: d.chartData.portfolioGrowthData,
            cashflowData: d.chartData.cashflowData,
            targetYear: d.investmentProfile?.targetYear ?? null,
          });
        }
      }

      setAllScenarios(options);
      setLoading(false);
    };

    fetchScenarios();
  }, [clients]);

  const scenarioA = useMemo(() => allScenarios.find(s => String(s.scenarioId) === selectedA), [allScenarios, selectedA]);
  const scenarioB = useMemo(() => allScenarios.find(s => String(s.scenarioId) === selectedB), [allScenarios, selectedB]);

  const equityData = useMemo(() => {
    if (!scenarioA || !scenarioB) return [];
    const yearMap = new Map<string, { year: string; equityA?: number; equityB?: number; propertiesA?: string[]; propertiesB?: string[] }>();

    for (const pt of scenarioA.portfolioGrowthData) {
      yearMap.set(pt.year, { year: pt.year, equityA: pt.equity ?? pt.portfolioValue, propertiesA: pt.properties });
    }
    for (const pt of scenarioB.portfolioGrowthData) {
      const existing = yearMap.get(pt.year) || { year: pt.year };
      yearMap.set(pt.year, { ...existing, equityB: pt.equity ?? pt.portfolioValue, propertiesB: pt.properties });
    }

    return Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [scenarioA, scenarioB]);

  const cashflowData = useMemo(() => {
    if (!scenarioA || !scenarioB) return [];
    // Purchases live on portfolioGrowthData — map them by year so they can
    // also be plotted on the cashflow line.
    const propsA = new Map(scenarioA.portfolioGrowthData.map(p => [p.year, p.properties]));
    const propsB = new Map(scenarioB.portfolioGrowthData.map(p => [p.year, p.properties]));

    const yearMap = new Map<string, { year: string; cashflowA?: number; cashflowB?: number; propertiesA?: string[]; propertiesB?: string[] }>();

    for (const pt of scenarioA.cashflowData) {
      yearMap.set(pt.year, { year: pt.year, cashflowA: pt.cashflow, propertiesA: propsA.get(pt.year) });
    }
    for (const pt of scenarioB.cashflowData) {
      const existing = yearMap.get(pt.year) || { year: pt.year };
      yearMap.set(pt.year, { ...existing, cashflowB: pt.cashflow, propertiesB: propsB.get(pt.year) });
    }

    return Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [scenarioA, scenarioB]);

  const bothSelected = scenarioA && scenarioB;

  const labelA = scenarioA ? `${scenarioA.clientName} — ${scenarioA.scenarioName}` : 'A';
  const labelB = scenarioB ? `${scenarioB.clientName} — ${scenarioB.scenarioName}` : 'B';

  const COLOR_A = '#2563EB';
  const COLOR_B = '#8B5CF6';

  // Sorted list of years available across both scenarios (drives the scrubber)
  const years = useMemo(() => equityData.map(d => d.year), [equityData]);

  // Reset / clamp the scrubber to the final year whenever the year range changes
  useEffect(() => {
    setSelectedYearIdx(years.length > 0 ? years.length - 1 : 0);
  }, [years.length]);

  const yearIdx = Math.min(selectedYearIdx, Math.max(years.length - 1, 0));
  const selectedYear = years[yearIdx];

  // Goal year — prefer A's target, fall back to B's. Positioned on the scrubber.
  const goalYear = scenarioA?.targetYear ?? scenarioB?.targetYear ?? null;
  const goalPct = useMemo(() => {
    if (goalYear == null || years.length < 2) return null;
    const min = parseInt(years[0], 10);
    const max = parseInt(years[years.length - 1], 10);
    if (isNaN(min) || isNaN(max) || max === min) return null;
    if (goalYear < min || goalYear > max) return null;
    return ((goalYear - min) / (max - min)) * 100;
  }, [goalYear, years]);

  const yearStats = useMemo(() => {
    if (!scenarioA || !scenarioB || !selectedYear) return null;
    const eq = equityData[yearIdx];
    const cf = cashflowData.find(d => d.year === selectedYear);
    return {
      equityA: eq?.equityA ?? 0,
      equityB: eq?.equityB ?? 0,
      cashflowA: cf?.cashflowA ?? 0,
      cashflowB: cf?.cashflowB ?? 0,
    };
  }, [scenarioA, scenarioB, selectedYear, yearIdx, equityData, cashflowData]);

  return (
    <div className="main-app flex h-screen w-full bg-white">
      <AppSidebar />
      <div className="flex-1 overflow-hidden flex flex-col" style={{ marginLeft: SIDEBAR_WIDTH }}>
        <div className="flex-1 overflow-auto">
          <div className="flex-1 overflow-auto p-8">
            <h2 className="page-title mb-6">Compare Scenarios</h2>

            {/* Dropdowns */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">
                  Scenario A
                </label>
                <select
                  value={selectedA}
                  onChange={e => setSelectedA(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select a scenario...</option>
                  {allScenarios.map(s => (
                    <option key={s.scenarioId} value={String(s.scenarioId)} disabled={String(s.scenarioId) === selectedB}>
                      {s.clientName} — {s.scenarioName}
                    </option>
                  ))}
                </select>
              </div>

              <ArrowLeftRight size={20} className="text-neutral-300 mt-5 shrink-0" />

              <div className="flex-1">
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">
                  Scenario B
                </label>
                <select
                  value={selectedB}
                  onChange={e => setSelectedB(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select a scenario...</option>
                  {allScenarios.map(s => (
                    <option key={s.scenarioId} value={String(s.scenarioId)} disabled={String(s.scenarioId) === selectedA}>
                      {s.clientName} — {s.scenarioName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && (
              <p className="text-sm text-neutral-400">Loading scenarios...</p>
            )}

            {!loading && allScenarios.length === 0 && (
              <p className="text-sm text-neutral-400">No scenarios with chart data found. Save a scenario from the dashboard first.</p>
            )}

            {!loading && allScenarios.length > 0 && !bothSelected && (
              <p className="text-sm text-neutral-400">Select two scenarios above to compare them.</p>
            )}

            {bothSelected && yearStats && years.length > 0 && (
              <>
                {/* Year scrubber */}
                <div className="mb-6 flex items-center gap-5">
                  <span className="metric-label shrink-0">Compare at year</span>
                  <div className="relative flex-1 pt-7">
                    {goalPct !== null && (
                      <div
                        className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col items-center"
                        style={{ left: `${goalPct}%` }}
                      >
                        <div className="meta flex items-center gap-1 whitespace-nowrap">
                          <Flag size={11} className="text-neutral-400" />
                          Goal {goalYear}
                        </div>
                        <div className="mt-1 h-3 w-px bg-neutral-300" />
                      </div>
                    )}
                    <Slider
                      value={[yearIdx]}
                      min={0}
                      max={Math.max(years.length - 1, 0)}
                      step={1}
                      onValueChange={([v]) => setSelectedYearIdx(v)}
                    />
                  </div>
                  <span className="stat-number shrink-0 text-right tabular-nums" style={{ minWidth: '3rem' }}>
                    {selectedYear}
                  </span>
                </div>

                {/* Headline comparison cards */}
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Equity */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <TrendingUp size={15} className="text-neutral-400" />
                      <span className="section-heading">Equity at {selectedYear}</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="metric-label" style={{ color: COLOR_A, fontWeight: 500 }}>Scenario A</span>
                        <span className="stat-number">{formatCompact(yearStats.equityA)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="metric-label" style={{ color: COLOR_B, fontWeight: 500 }}>Scenario B</span>
                        <span className="stat-number">{formatCompact(yearStats.equityB)}</span>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-neutral-100 pt-3">
                      {yearStats.equityA === yearStats.equityB ? (
                        <span className="body-secondary">Even</span>
                      ) : (
                        <span className="body-secondary">
                          {yearStats.equityA > yearStats.equityB ? 'A' : 'B'} higher by{' '}
                          <span className="body-dark" style={{ fontWeight: 500 }}>
                            {formatCompact(Math.abs(yearStats.equityA - yearStats.equityB))}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cashflow */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Banknote size={15} className="text-neutral-400" />
                      <span className="section-heading">Cashflow p/a at {selectedYear}</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="metric-label" style={{ color: COLOR_A, fontWeight: 500 }}>Scenario A</span>
                        <span className="stat-number" style={yearStats.cashflowA < 0 ? { color: '#B42318' } : undefined}>
                          {formatCompact(yearStats.cashflowA)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="metric-label" style={{ color: COLOR_B, fontWeight: 500 }}>Scenario B</span>
                        <span className="stat-number" style={yearStats.cashflowB < 0 ? { color: '#B42318' } : undefined}>
                          {formatCompact(yearStats.cashflowB)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-neutral-100 pt-3">
                      {yearStats.cashflowA === yearStats.cashflowB ? (
                        <span className="body-secondary">Even</span>
                      ) : (
                        <span className="body-secondary">
                          {yearStats.cashflowA > yearStats.cashflowB ? 'A' : 'B'} higher by{' '}
                          <span className="body-dark" style={{ fontWeight: 500 }}>
                            {formatCompact(Math.abs(yearStats.cashflowA - yearStats.cashflowB))}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {bothSelected && (
              <div className="space-y-8">
                {/* Equity chart */}
                <div className="rounded-xl border border-neutral-200 p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-4">Portfolio Equity</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="compareEqA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLOR_A} stopOpacity={0.12} />
                            <stop offset="95%" stopColor={COLOR_A} stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="compareEqB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLOR_B} stopOpacity={0.12} />
                            <stop offset="95%" stopColor={COLOR_B} stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...CHART_STYLE.grid} />
                        <XAxis
                          dataKey="year"
                          {...CHART_STYLE.xAxis}
                          tickMargin={8}
                          interval="preserveStartEnd"
                        />
                        <Tooltip content={<CompareTooltip />} cursor={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }} />
                        <Legend
                          verticalAlign="bottom"
                          height={32}
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 12, color: CHART_COLORS.labelText }}
                        />
                        <Area
                          type="monotone"
                          dataKey="equityA"
                          name={labelA}
                          stroke={COLOR_A}
                          strokeWidth={2}
                          fill="url(#compareEqA)"
                          dot={makePurchaseDot('propertiesA', COLOR_A)}
                          activeDot={false}
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="equityB"
                          name={labelB}
                          stroke={COLOR_B}
                          strokeWidth={2}
                          fill="url(#compareEqB)"
                          dot={makePurchaseDot('propertiesB', COLOR_B)}
                          activeDot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cashflow chart */}
                <div className="rounded-xl border border-neutral-200 p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-4">Annual Cashflow</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashflowData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="compareCfA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLOR_A} stopOpacity={0.12} />
                            <stop offset="95%" stopColor={COLOR_A} stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="compareCfB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLOR_B} stopOpacity={0.12} />
                            <stop offset="95%" stopColor={COLOR_B} stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...CHART_STYLE.grid} />
                        <XAxis
                          dataKey="year"
                          {...CHART_STYLE.xAxis}
                          tickMargin={8}
                          interval="preserveStartEnd"
                        />
                        <Tooltip content={<CompareTooltip />} cursor={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }} />
                        <Legend
                          verticalAlign="bottom"
                          height={32}
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 12, color: CHART_COLORS.labelText }}
                        />
                        <Area
                          type="monotone"
                          dataKey="cashflowA"
                          name={labelA}
                          stroke={COLOR_A}
                          strokeWidth={2}
                          fill="url(#compareCfA)"
                          dot={makePurchaseDot('propertiesA', COLOR_A)}
                          activeDot={false}
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="cashflowB"
                          name={labelB}
                          stroke={COLOR_B}
                          strokeWidth={2}
                          fill="url(#compareCfB)"
                          dot={makePurchaseDot('propertiesB', COLOR_B)}
                          activeDot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

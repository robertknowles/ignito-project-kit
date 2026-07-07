import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar';
import { ChartCard } from '@/components/ui/ChartCard';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { CHART_COLORS, CHART_STYLE } from '@/constants/chartColors';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';
import { calcGrossYield, calcAnnualRent } from '@/utils/sharedFinancialCalcs';
import { track, EVENTS } from '@/lib/analytics';
import { useCompareRemodel } from '@/hooks/useCompareRemodel';
import { useScenarioRunner } from '@/hooks/useScenarioRunner';
import type { ScenarioInput } from '@/engine/scenarioRunner';
import type { ScenarioData } from '@/contexts/ScenarioSaveContext';
import type { InvestmentProfileData } from '@/contexts/InvestmentProfileContext';
import { Sparkles, ArrowUp, FileText, Wand2, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Compare — two scenarios side by side, dashboard-styled.
 *
 * Layout (above the fold): Scenario A/B pickers → grey rule → output:
 * two purchases tables with horizon stats (row click → full detail),
 * Total Equity chart. Net Cashflow chart below.
 *
 * Scenario B is a saved scenario or an AI "Remodel" draft: nl-parse mutates
 * a COPY of the base plan and the headless engine re-runs it. The client's
 * saved scenario is never written. See COMPARE-EVOLUTION-PLAN.md.
 */

// Big central loading bar while scenarios fetch. The fill is simulated
// (a fetch has no true progress) — it eases toward 92% and the whole bar
// unmounts the moment data lands.
const ScenarioLoadingBar: React.FC = () => {
  const [progress, setProgress] = useState(6);
  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => Math.min(92, p + (92 - p) * 0.055 + 0.35));
    }, 110);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex justify-center py-20">
      <div className="w-full" style={{ maxWidth: 440 }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-medium text-[#414651]">Loading scenarios…</span>
          <span className="meta tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-[#F0F1F4] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#7C3AED] transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface ChartDataPoint {
  year: string;
  portfolioValue?: number;
  equity?: number;
  properties?: string[];
}

interface CashflowDataPoint {
  year: string;
  cashflow?: number;
}

interface ScenarioOption {
  scenarioId: number;
  clientId: number;
  clientName: string;
  scenarioName: string;
  portfolioGrowthData: ChartDataPoint[];
  cashflowData: CashflowDataPoint[];
  propertyOrder: string[];
  propertyInstances: Record<string, PropertyInstanceDetails>;
  /** The full scenarios.data blob — hydrates ScenarioInput for live engine runs. */
  raw: ScenarioData;
}

const toScenarioInput = (raw: ScenarioData): ScenarioInput => ({
  propertySelections: raw?.propertySelections ?? {},
  propertyOrder: raw?.propertyOrder ?? [],
  // The persisted profile is a full spread of InvestmentProfileData at save
  // time; ScenarioData just types the guaranteed subset.
  investmentProfile: (raw?.investmentProfile ?? {}) as Partial<InvestmentProfileData>,
  propertyInstances: raw?.propertyInstances ?? {},
  existingProperties: raw?.existingProperties ?? [],
});

// Two clearly-separated hues (Rob, 4 Jul): deep violet vs lighter purple.
const COLOR_A = '#6D28D9';   // violet-700
const COLOR_B = '#A855F7';   // purple-500

const formatCompact = (v: number): string => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
};

const fmtMoney = (n: number | null | undefined): string =>
  n == null || isNaN(n) ? '—' : `$${Math.round(n).toLocaleString('en-AU')}`;

// LVR is stored as a percentage (88) in instances; guard against ratio saves.
const fmtLvr = (lvr: number | null | undefined): string =>
  lvr == null || isNaN(lvr) ? '—' : `${Math.round(lvr <= 1 ? lvr * 100 : lvr)}%`;

// ── Purchase rows: join purchase years (chart data) to instance details ─────
interface PurchaseTableRow {
  year: string;
  title: string;
  instance?: PropertyInstanceDetails;
  /** AI-modified row (remodel draft) — violet tint. */
  changed?: boolean;
  /** Engine couldn't fully place/fund this purchase — red year. */
  infeasible?: boolean;
}

const buildPurchaseRows = (s: ScenarioOption): PurchaseTableRow[] => {
  const rows: PurchaseTableRow[] = [];
  for (const pt of s.portfolioGrowthData) {
    for (const title of pt.properties ?? []) {
      rows.push({ year: pt.year, title });
    }
  }
  // propertyOrder is the purchase sequence, so the Nth purchase on the chart
  // corresponds to the Nth instance id. Only trust the join when every planned
  // property made it onto the chart — a blocked property would shift the
  // mapping and silently attach the wrong details. (Phase 1 replaces this with
  // the live engine timeline, which carries instance ids directly.)
  if (rows.length === s.propertyOrder.length) {
    rows.forEach((row, i) => {
      const id = s.propertyOrder[i];
      if (id && s.propertyInstances[id]) row.instance = s.propertyInstances[id];
    });
  }
  return rows;
};

const CompareTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E9EAEB] bg-white px-3 py-2.5 shadow-lg">
      <p className="text-xs font-semibold text-[#181D27] mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs text-[#535862]">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-medium text-[#181D27]">{formatCompact(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Marks purchase years on a scenario's chart line. Solid dot = saved plan;
// ring = remodel draft (matches the pin language for drafts).
const makePurchaseDot = (propsKey: 'propertiesA' | 'propertiesB', color: string, ring = false) => {
  const PurchaseDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    const list: string[] | undefined = payload?.[propsKey];
    if (cx == null || cy == null || isNaN(cx) || isNaN(cy) || !list || list.length === 0) {
      return <React.Fragment key={`${propsKey}-${index}`} />;
    }
    return ring
      ? <circle key={`${propsKey}-${index}`} cx={cx} cy={cy} r={4} fill="#FFFFFF" stroke={color} strokeWidth={1.5} />
      : <circle key={`${propsKey}-${index}`} cx={cx} cy={cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />;
  };
  return PurchaseDot;
};

// ── Condensed purchases table (row click → full detail) ─────────────────────
// Front-facing numbers only (Rob, 4 Jul) — the descriptive fields (state,
// LVR, rent, entity, costs breakdown) live in the row-detail dialog.
const TABLE_COLS: { key: string; header: string; numeric?: boolean; width?: number }[] = [
  { key: 'year', header: 'Year', width: 54 },
  { key: 'title', header: 'Property' },
  { key: 'price', header: 'Price', numeric: true },
  { key: 'yield', header: 'Yield', numeric: true, width: 58 },
  { key: 'growth', header: 'Growth', width: 72 },
  { key: 'holding', header: 'Holding $/yr', numeric: true, width: 92 },
];

// The scenario's projected equity and cashflow at its plan horizon, pinned
// above its purchases table.
const StatStrip: React.FC<{ growth: ChartDataPoint[]; cashflow: CashflowDataPoint[] }> = ({ growth, cashflow }) => {
  const g = growth[growth.length - 1];
  const c = cashflow[cashflow.length - 1];
  if (!g && !c) return null;
  const year = g?.year ?? c?.year;
  const equity = g ? (g.equity ?? g.portfolioValue ?? 0) : null;
  const cf = c?.cashflow ?? null;

  return (
    <div className="flex items-center gap-7 px-3 pb-2 border-b border-[#F0F1F4]">
      {equity != null && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[12px] text-[#535862]">Equity at {year}</span>
          <span className="text-[13px] font-semibold text-[#181D27] tabular-nums">{formatCompact(equity)}</span>
        </span>
      )}
      {cf != null && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[12px] text-[#535862]">Cashflow p/a at {year}</span>
          <span
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: cf < 0 ? CHART_COLORS.semanticNegative : '#181D27' }}
          >
            {formatCompact(cf)}
          </span>
        </span>
      )}
    </div>
  );
};

const PurchasesTable: React.FC<{
  rows: PurchaseTableRow[];
  onRowClick: (row: PurchaseTableRow, index: number) => void;
}> = ({ rows, onRowClick }) => (
  <table className="w-full" style={{ tableLayout: 'fixed' }}>
    <thead>
      <tr>
        {TABLE_COLS.map(col => (
          <th
            key={col.key}
            className={`px-3 py-1.5 text-[11px] font-medium text-[#717680] border-b border-[#E9EAEB] ${col.numeric ? 'text-right' : 'text-left'}`}
            style={col.width ? { width: col.width } : undefined}
          >
            {col.header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.length === 0 && (
        <tr>
          <td colSpan={TABLE_COLS.length} className="px-3 py-3">
            <span className="meta">No purchases in this plan.</span>
          </td>
        </tr>
      )}
      {rows.map((row, i) => {
        const inst = row.instance;
        // Holding $/yr — identical expression to the dashboard purchases
        // table's HoldingCostCell (override ?? mgmt% × annual rent + annual
        // expense fields). fmtMoney renders NaN from missing legacy fields
        // as "—".
        const holding = inst
          ? inst.holdingCostOverride ??
            Math.round(
              (inst.propertyManagementPercent / 100) * calcAnnualRent(inst.rentPerWeek) +
                inst.buildingInsuranceAnnual +
                inst.councilRatesWater +
                inst.strata +
                inst.maintenanceAllowanceAnnual,
            )
          : null;
        const cells: Record<string, string> = {
          year: row.year,
          title: row.title,
          price: fmtMoney(inst?.purchasePrice),
          yield:
            inst?.rentPerWeek != null && inst?.purchasePrice
              ? `${calcGrossYield(inst.rentPerWeek, inst.purchasePrice).toFixed(1)}%`
              : '—',
          growth: inst?.growthAssumption ?? '—',
          holding: fmtMoney(holding),
        };
        return (
          <tr
            key={`${row.year}-${i}`}
            className="cursor-pointer hover:bg-[#FAFAFA]"
            style={row.changed ? { backgroundColor: '#F5F3FF' } : undefined}
            onClick={() => onRowClick(row, i)}
          >
            {TABLE_COLS.map(col => (
              <td
                key={col.key}
                className={`px-3 py-1.5 text-[12px] truncate ${i < rows.length - 1 ? 'border-b border-[#F0F1F4]' : ''} ${col.numeric ? 'text-right tabular-nums' : 'text-left'}`}
                style={{ color: col.key === 'year' && row.infeasible ? CHART_COLORS.semanticNegative : '#181D27' }}
                title={col.key === 'title' ? row.title : undefined}
              >
                {cells[col.key]}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  </table>
);

// ── Row detail dialog — the full purchase picture in four groups ────────────
const getRowDetail = (row: PurchaseTableRow) => {
  const inst = row.instance;
  if (!inst) return [];
  const price = inst.purchasePrice;
  const lvrPct = inst.lvr == null ? null : (inst.lvr <= 1 ? inst.lvr * 100 : inst.lvr);
  const loan = price != null && lvrPct != null ? price * (lvrPct / 100) : null;
  const rentYr = inst.rentPerWeek != null ? inst.rentPerWeek * 52 : null;

  return [
    {
      group: 'Contract',
      items: [
        { label: 'Purchase price', value: fmtMoney(price) },
        { label: 'Valuation at purchase', value: fmtMoney(inst.valuationAtPurchase) },
        { label: 'State', value: inst.state ?? '—' },
        { label: 'Growth assumption', value: inst.growthAssumption ?? '—' },
      ],
    },
    {
      group: 'Loan',
      items: [
        { label: 'LVR', value: fmtLvr(inst.lvr) },
        { label: 'Loan amount', value: fmtMoney(loan) },
        { label: 'Product', value: inst.loanProduct === 'IO' ? 'Interest only' : inst.loanProduct === 'PI' ? 'Principal & interest' : '—' },
        { label: 'Rate', value: inst.interestRate != null ? `${inst.interestRate}%` : '—' },
        { label: 'Term', value: inst.loanTerm != null ? `${inst.loanTerm} yrs` : '—' },
        { label: 'LMI waiver', value: inst.lmiWaiver ? 'Yes' : 'No' },
      ],
    },
    {
      group: 'Purchase costs',
      items: [
        { label: 'Deposit', value: price != null && loan != null ? fmtMoney(price - loan) : '—' },
        { label: 'Stamp duty', value: inst.stampDutyOverride != null ? fmtMoney(inst.stampDutyOverride) : 'Auto (by state)' },
        { label: 'Engagement fee', value: fmtMoney(inst.engagementFee) },
        { label: 'Conveyancing', value: fmtMoney(inst.conveyancing) },
        { label: 'Building & pest', value: fmtMoney(inst.buildingPestInspection) },
        { label: 'Mortgage fees', value: fmtMoney(inst.mortgageFees) },
      ],
    },
    {
      group: 'Cashflow',
      items: [
        { label: 'Rent', value: inst.rentPerWeek != null ? `$${Math.round(inst.rentPerWeek).toLocaleString('en-AU')}/wk` : '—' },
        { label: 'Gross yield', value: rentYr != null && price ? `${((rentYr / price) * 100).toFixed(1)}%` : '—' },
        { label: 'Management', value: inst.propertyManagementPercent != null ? `${inst.propertyManagementPercent}%` : '—' },
        { label: 'Insurance p/a', value: fmtMoney(inst.buildingInsuranceAnnual) },
        { label: 'Council rates & water', value: fmtMoney(inst.councilRatesWater) },
        { label: 'Strata', value: fmtMoney(inst.strata) },
        { label: 'Maintenance p/a', value: fmtMoney(inst.maintenanceAllowanceAnnual) },
      ],
    },
  ];
};

const RowDetailDialog: React.FC<{
  row: PurchaseTableRow | null;
  purchaseNo: number;
  onClose: () => void;
}> = ({ row, purchaseNo, onClose }) => {
  const sections = row ? getRowDetail(row) : [];
  return (
    <Dialog open={!!row} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl p-6">
        {row && (
          <>
            <DialogTitle
              style={{ fontSize: 15, fontWeight: 600, color: '#181D27', fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Purchase {purchaseNo} — {row.title} · {row.year}
            </DialogTitle>
            {sections.length === 0 ? (
              <p className="body-secondary mt-3">
                No detail saved for this purchase — open the scenario in the dashboard to complete it.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-10 gap-y-5 mt-4">
                {sections.map(section => (
                  <div key={section.group}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#717680] mb-2">
                      {section.group}
                    </p>
                    {section.items.map(item => (
                      <div key={item.label} className="flex items-center justify-between py-[5px] border-b border-[#F0F1F4] last:border-0">
                        <span className="text-[12px] text-[#535862]">{item.label}</span>
                        <span className="text-[12px] tabular-nums text-[#181D27]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// "Remodel with AI" — enabled in production 4 Jul 2026 (see
// COMPARE-EVOLUTION-PLAN.md). Flip to `import.meta.env.DEV` to pull it
// from prod builds again; the bundle strips the whole UI when false.
const REMODEL_ENABLED = true;

type SlotBMode = 'saved' | 'remodel';

const MODES: { key: SlotBMode; label: string; icon: React.ReactNode }[] = [
  { key: 'saved', label: 'Saved scenario', icon: <FileText size={13} /> },
  { key: 'remodel', label: 'Remodel with AI', icon: <Wand2 size={13} /> },
];

export const Compare: React.FC = () => {
  const { clients } = useClient();
  const [allScenarios, setAllScenarios] = useState<ScenarioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>('');
  const [modeB, setModeB] = useState<SlotBMode>('saved');
  const [detailRow, setDetailRow] = useState<{ row: PurchaseTableRow; index: number } | null>(null);

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
            propertyOrder: d.propertyOrder ?? [],
            propertyInstances: d.propertyInstances ?? {},
            raw: d,
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

  // ── Remodel with AI (dev-gated) ─────────────────────────────────────
  const { run } = useScenarioRunner();
  const baseInput = useMemo(() => (scenarioA ? toScenarioInput(scenarioA.raw) : null), [scenarioA]);
  const remodel = useCompareRemodel(baseInput);
  const { draft } = remodel;
  const isRemodelMode = REMODEL_ENABLED && modeB === 'remodel';
  const [remodelText, setRemodelText] = useState('');

  // A different base plan means any existing draft is meaningless.
  useEffect(() => {
    remodel.reset();
    setRemodelText('');
    // remodel.reset is stable (useCallback with no deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioA?.scenarioId]);

  // Base scenario run — powers the placement-diff notes in the model-check
  // strip, and (in dev) a parity check of headless output vs the saved
  // snapshot. Guarded: a malformed legacy blob must not take the page down.
  const baseRun = useMemo(() => {
    if (!isRemodelMode || !baseInput) return null;
    try {
      return run(baseInput);
    } catch (e) {
      console.error('[Compare] headless base run failed', e);
      return null;
    }
  }, [isRemodelMode, baseInput, run]);

  // DEV parity check: the headless runner must reproduce the saved snapshot
  // for the same inputs. A mismatch is either an input-assembly bug or the
  // scenario was saved under different global assumptions — both worth eyes.
  useEffect(() => {
    if (!import.meta.env.DEV || !baseRun || !scenarioA) return;
    const saved = scenarioA.portfolioGrowthData[scenarioA.portfolioGrowthData.length - 1];
    const live = baseRun.projection.portfolioGrowthData[baseRun.projection.portfolioGrowthData.length - 1];
    if (!saved || !live) return;
    const savedEq = saved.equity ?? saved.portfolioValue ?? 0;
    if (saved.year !== live.year || Math.abs(savedEq - live.equity) > 1) {
      console.warn('[Compare parity] headless run differs from saved snapshot', {
        savedFinal: saved,
        liveFinal: live,
        note: 'input-assembly bug OR scenario saved under different assumptions',
      });
    } else {
      console.info('[Compare parity] headless run matches saved snapshot', {
        year: live.year,
        equity: live.equity,
      });
    }
  }, [baseRun, scenarioA]);

  // Side B is either a saved scenario or the live remodel draft — everything
  // below (KPIs, table, charts) reads from this one view object.
  interface SideBView {
    label: string;
    growth: ChartDataPoint[];
    cashflow: CashflowDataPoint[];
    rows: PurchaseTableRow[];
    isDraft: boolean;
  }
  const sideB: SideBView | null = useMemo(() => {
    if (isRemodelMode) {
      if (!draft || !scenarioA) return null;
      const changedSet = new Set(draft.changedInstanceIds);
      const rows: PurchaseTableRow[] = [...draft.run.timelineProperties]
        .sort((a, b) => (a.period === Infinity ? 1 : b.period === Infinity ? -1 : a.period - b.period))
        .map(tp => ({
          year: tp.period === Infinity ? '—' : String(Math.floor(tp.affordableYear)),
          title: tp.title,
          instance: draft.run.instances[tp.instanceId],
          changed: changedSet.has(tp.instanceId),
          infeasible: tp.status !== 'feasible' || tp.period === Infinity,
        }));
      return {
        label: 'Remodel draft',
        growth: draft.run.projection.portfolioGrowthData,
        cashflow: draft.run.projection.cashflowData,
        rows,
        isDraft: true,
      };
    }
    if (!scenarioB) return null;
    return {
      label: scenarioB.scenarioName,
      growth: scenarioB.portfolioGrowthData,
      cashflow: scenarioB.cashflowData,
      rows: buildPurchaseRows(scenarioB),
      isDraft: false,
    };
  }, [isRemodelMode, draft, scenarioA, scenarioB]);

  // Model-check notes — the engine's honest response to the remodel: mapper
  // warnings, placements it had to move, purchases it couldn't fully fund.
  const modelCheckNotes = useMemo(() => {
    if (!isRemodelMode || !draft) return [];
    const notes: string[] = [...draft.warnings];
    const baseByInstance = new Map(
      (baseRun?.timelineProperties ?? []).map(tp => [tp.instanceId, tp]),
    );
    draft.run.timelineProperties.forEach(tp => {
      const draftYear = tp.period === Infinity ? null : Math.floor(tp.affordableYear);
      if (draftYear == null) {
        notes.push(`${tp.title} doesn't fit within the plan timeline.`);
        return;
      }
      if (tp.status !== 'feasible') {
        notes.push(`${tp.title} (${draftYear}) doesn't pass every affordability test.`);
        return;
      }
      const base = baseByInstance.get(tp.instanceId);
      if (
        draft.changedInstanceIds.includes(tp.instanceId) &&
        base && base.period !== Infinity &&
        Math.floor(base.affordableYear) !== draftYear
      ) {
        notes.push(`${tp.title} moved ${Math.floor(base.affordableYear)} → ${draftYear}.`);
      }
    });
    return notes;
  }, [isRemodelMode, draft, baseRun]);

  // Fire once whenever a fresh pair of scenarios is fully selected for comparison.
  useEffect(() => {
    if (scenarioA && scenarioB) {
      track(EVENTS.scenariosCompared, {
        same_client: scenarioA.clientId === scenarioB.clientId,
      });
    }
  }, [scenarioA?.scenarioId, scenarioB?.scenarioId]);

  const equityData = useMemo(() => {
    if (!scenarioA || !sideB) return [];
    const yearMap = new Map<string, { year: string; equityA?: number; equityB?: number; propertiesA?: string[]; propertiesB?: string[] }>();

    for (const pt of scenarioA.portfolioGrowthData) {
      yearMap.set(pt.year, { year: pt.year, equityA: pt.equity ?? pt.portfolioValue, propertiesA: pt.properties });
    }
    for (const pt of sideB.growth) {
      const existing = yearMap.get(pt.year) || { year: pt.year };
      yearMap.set(pt.year, { ...existing, equityB: pt.equity ?? pt.portfolioValue, propertiesB: pt.properties });
    }

    return Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [scenarioA, sideB]);

  const cashflowChartData = useMemo(() => {
    if (!scenarioA || !sideB) return [];
    // Purchases live on portfolioGrowthData — map them by year so they can
    // also be plotted on the cashflow line.
    const propsA = new Map(scenarioA.portfolioGrowthData.map(p => [p.year, p.properties]));
    const propsB = new Map(sideB.growth.map(p => [p.year, p.properties]));

    const yearMap = new Map<string, { year: string; cashflowA?: number; cashflowB?: number; propertiesA?: string[]; propertiesB?: string[] }>();

    for (const pt of scenarioA.cashflowData) {
      yearMap.set(pt.year, { year: pt.year, cashflowA: pt.cashflow, propertiesA: propsA.get(pt.year) });
    }
    for (const pt of sideB.cashflow) {
      const existing = yearMap.get(pt.year) || { year: pt.year };
      yearMap.set(pt.year, { ...existing, cashflowB: pt.cashflow, propertiesB: propsB.get(pt.year) });
    }

    return Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [scenarioA, sideB]);

  const bothSelected = scenarioA && sideB;

  const labelA = scenarioA ? scenarioA.scenarioName : 'Scenario A';
  const labelB = sideB?.label ?? 'Scenario B';

  const rowsA = useMemo(() => (scenarioA ? buildPurchaseRows(scenarioA) : []), [scenarioA]);
  const rowsB = sideB?.rows ?? [];

  const scenarioSelect = (
    value: string,
    onChange: (v: string) => void,
    excludeId: string,
  ) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-[#D5D7DA] bg-white px-3 py-2 text-[13px] text-[#181D27] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]"
    >
      <option value="">Select a scenario...</option>
      {allScenarios.map(s => (
        <option key={s.scenarioId} value={String(s.scenarioId)} disabled={String(s.scenarioId) === excludeId}>
          {s.clientName} — {s.scenarioName}
        </option>
      ))}
    </select>
  );

  return (
    <div className="main-app flex h-screen w-full bg-[#FAFAFA]">
      <AppSidebar />
      <div className="flex-1 overflow-hidden flex flex-col" style={{ marginLeft: SIDEBAR_WIDTH }}>
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-6 mx-auto" style={{ padding: '24px 28px 80px 28px', width: '100%', minWidth: 500 }}>
            <h2 className="page-title">Compare</h2>

            {/* ── Scenario slots ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch">
              <ChartCard
                title="Scenario A"
                legend={[{ color: COLOR_A, label: 'Saved plan', variant: 'dot' }]}
              >
                {scenarioSelect(selectedA, setSelectedA, selectedB)}
                {scenarioA && (
                  <p className="meta mt-2">
                    {rowsA.length} purchase{rowsA.length === 1 ? '' : 's'}
                  </p>
                )}
              </ChartCard>

              <ChartCard
                title="Scenario B"
                legend={isRemodelMode ? undefined : [{ color: COLOR_B, label: 'Saved plan', variant: 'dot' }]}
                action={
                  isRemodelMode && draft ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] border border-[#D9D2F2] px-2 py-0.5 text-[11px] font-medium text-[#7C3AED]">
                      <Sparkles size={11} />
                      Draft
                    </span>
                  ) : undefined
                }
              >
                <div className="flex flex-col gap-2">
                  {REMODEL_ENABLED && (
                    <div className="inline-flex self-start rounded-lg border border-[#E9EAEB] bg-[#FAFAFA] p-0.5">
                      {MODES.map(m => (
                        <button
                          key={m.key}
                          onClick={() => setModeB(m.key)}
                          className={
                            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ' +
                            (modeB === m.key
                              ? 'bg-white text-[#181D27] shadow-sm border border-[#E9EAEB]'
                              : 'text-[#717680] hover:text-[#414651]')
                          }
                        >
                          {m.icon}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {modeB === 'saved' && scenarioSelect(selectedB, setSelectedB, selectedA)}

                  {modeB === 'remodel' && (
                    <>
                      <p className="meta">
                        Based on{' '}
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#414651' }}>
                          {scenarioA ? `${scenarioA.clientName} — ${scenarioA.scenarioName}` : 'select Scenario A first'}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 rounded-lg border border-[#D5D7DA] bg-white pl-3 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-[#7C3AED]/20 focus-within:border-[#7C3AED]">
                        <Sparkles size={14} className="shrink-0 text-[#7C3AED]" />
                        <input
                          value={remodelText}
                          onChange={e => setRemodelText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !remodel.isThinking && remodelText.trim()) {
                              void remodel.submit(remodelText);
                              setRemodelText('');
                            }
                          }}
                          disabled={!scenarioA || remodel.isThinking}
                          className="flex-1 text-[13px] text-[#181D27] placeholder-[#A4A7AE] outline-none bg-transparent disabled:opacity-60"
                          placeholder={draft ? 'Refine the draft… e.g. ‘Push the first commercial to 2033’' : 'e.g. ‘Switch purchases 3 and 4 to commercial’'}
                        />
                        <button
                          onClick={() => {
                            if (!remodel.isThinking && remodelText.trim()) {
                              void remodel.submit(remodelText);
                              setRemodelText('');
                            }
                          }}
                          disabled={!scenarioA || remodel.isThinking}
                          className="flex items-center justify-center w-7 h-7 rounded-md bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors disabled:opacity-60"
                        >
                          {remodel.isThinking ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
                        </button>
                      </div>
                      {remodel.error && (
                        <p className="text-[12px]" style={{ color: CHART_COLORS.semanticNegative }}>
                          {remodel.error}
                        </p>
                      )}
                      {!remodel.error && remodel.aiMessage && (
                        <p className="meta whitespace-pre-line">{remodel.aiMessage}</p>
                      )}
                    </>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* Central loading bar while scenarios fetch */}
            {loading && <ScenarioLoadingBar />}

            {!loading && allScenarios.length === 0 && (
              <p className="body-secondary">
                No scenarios with chart data found. Save a scenario from the dashboard first.
              </p>
            )}

            {!loading && allScenarios.length > 0 && !bothSelected && (
              <p className="body-secondary">
                {isRemodelMode
                  ? scenarioA
                    ? 'Describe a change above to model it against the saved plan.'
                    : 'Select Scenario A, then describe a change to model against it.'
                  : 'Select two scenarios above to compare them.'}
              </p>
            )}

            {/* ── Output — grey rule separates inputs from results ────── */}
            {bothSelected && (
              <div className="flex flex-col gap-6 border-t border-[#E9EAEB] pt-6">
                {/* Model check — the engine's honest response to the remodel */}
                {isRemodelMode && draft && modelCheckNotes.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#B54708]" />
                    <span className="text-[12px] leading-snug text-[#93370D]">
                      <span className="font-semibold">Model check:</span>{' '}
                      {modelCheckNotes.join(' ')}
                    </span>
                  </div>
                )}

                {/* Purchases tables, side by side, horizon stats pinned on top
                    (row click → detail) */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
                  <ChartCard title="Scenario A" flush>
                    <StatStrip growth={scenarioA.portfolioGrowthData} cashflow={scenarioA.cashflowData} />
                    <PurchasesTable rows={rowsA} onRowClick={(row, index) => setDetailRow({ row, index })} />
                  </ChartCard>
                  <ChartCard title="Scenario B" flush>
                    <StatStrip growth={sideB.growth} cashflow={sideB.cashflow} />
                    <PurchasesTable rows={rowsB} onRowClick={(row, index) => setDetailRow({ row, index })} />
                  </ChartCard>
                </div>

                <RowDetailDialog
                  row={detailRow?.row ?? null}
                  purchaseNo={(detailRow?.index ?? 0) + 1}
                  onClose={() => setDetailRow(null)}
                />

                {/* Equity chart */}
                <ChartCard
                  title="Total Equity"
                  expandable
                  legend={[
                    { color: COLOR_A, label: labelA, variant: 'dot' },
                    { color: COLOR_B, label: labelB, variant: sideB.isDraft ? 'line' : 'dot' },
                  ]}
                >
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid {...CHART_STYLE.grid} />
                        <XAxis dataKey="year" {...CHART_STYLE.xAxis} tickMargin={8} interval="preserveStartEnd" />
                        <YAxis {...CHART_STYLE.yAxis} tickFormatter={formatCompact} />
                        <Tooltip content={<CompareTooltip />} cursor={{ stroke: CHART_COLORS.referenceLine, strokeWidth: 1.5 }} />
                        <Area
                          type="monotone"
                          dataKey="equityA"
                          name={labelA}
                          stroke={COLOR_A}
                          strokeWidth={2}
                          fill="none"
                          dot={makePurchaseDot('propertiesA', COLOR_A)}
                          activeDot={{ r: 5, fill: '#FFFFFF', stroke: COLOR_A, strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="equityB"
                          name={labelB}
                          stroke={COLOR_B}
                          strokeWidth={2}
                          strokeDasharray={sideB.isDraft ? CHART_STYLE.dashedPattern : undefined}
                          fill="none"
                          dot={makePurchaseDot('propertiesB', COLOR_B, sideB.isDraft)}
                          activeDot={{ r: 5, fill: '#FFFFFF', stroke: COLOR_B, strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* Cashflow chart */}
                <ChartCard
                  title="Net Cashflow"
                  expandable
                  legend={[
                    { color: COLOR_A, label: labelA, variant: 'dot' },
                    { color: COLOR_B, label: labelB, variant: sideB.isDraft ? 'line' : 'dot' },
                  ]}
                >
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashflowChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid {...CHART_STYLE.grid} />
                        <XAxis dataKey="year" {...CHART_STYLE.xAxis} tickMargin={8} interval="preserveStartEnd" />
                        <YAxis {...CHART_STYLE.yAxis} tickFormatter={formatCompact} />
                        <Tooltip content={<CompareTooltip />} cursor={{ stroke: CHART_COLORS.referenceLine, strokeWidth: 1.5 }} />
                        <Area
                          type="monotone"
                          dataKey="cashflowA"
                          name={labelA}
                          stroke={COLOR_A}
                          strokeWidth={2}
                          fill="none"
                          dot={makePurchaseDot('propertiesA', COLOR_A)}
                          activeDot={{ r: 5, fill: '#FFFFFF', stroke: COLOR_A, strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="cashflowB"
                          name={labelB}
                          stroke={COLOR_B}
                          strokeWidth={2}
                          strokeDasharray={sideB.isDraft ? CHART_STYLE.dashedPattern : undefined}
                          fill="none"
                          dot={makePurchaseDot('propertiesB', COLOR_B, sideB.isDraft)}
                          activeDot={{ r: 5, fill: '#FFFFFF', stroke: COLOR_B, strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

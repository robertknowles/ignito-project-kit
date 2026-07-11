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
import { BorrowingCapacityChart } from '@/components/BorrowingCapacityChart';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { CHART_COLORS, CHART_STYLE } from '@/constants/chartColors';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';
import { calcGrossYield, calcAnnualRent } from '@/utils/sharedFinancialCalcs';
import { track, EVENTS } from '@/lib/analytics';
import { useCompareRemodel, type RemodelDraft } from '@/hooks/useCompareRemodel';
import { useScenarioRunner } from '@/hooks/useScenarioRunner';
import type { ScenarioInput } from '@/engine/scenarioRunner';
import type { ScenarioData } from '@/contexts/ScenarioSaveContext';
import type { InvestmentProfileData } from '@/contexts/InvestmentProfileContext';
import { PERIODS_PER_YEAR } from '@/constants/financialParams';
import { Sparkles, ArrowUp, AlertTriangle, Loader2, Minus, Plus, Check, ChevronDown } from 'lucide-react';

/**
 * Compare - two scenarios side by side, dashboard-styled.
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
// (a fetch has no true progress) - it eases toward 92% and the whole bar
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
  /** The full scenarios.data blob - hydrates ScenarioInput for live engine runs. */
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
  n == null || isNaN(n) ? '-' : `$${Math.round(n).toLocaleString('en-AU')}`;

// LVR is stored as a percentage (88) in instances; guard against ratio saves.
const fmtLvr = (lvr: number | null | undefined): string =>
  lvr == null || isNaN(lvr) ? '-' : `${Math.round(lvr <= 1 ? lvr * 100 : lvr)}%`;

// ── Purchase rows: join purchase years (chart data) to instance details ─────
interface PurchaseTableRow {
  year: string;
  title: string;
  instance?: PropertyInstanceDetails;
  /** Instance id - only present on Scenario B (draft) rows; gates editability. */
  instanceId?: string;
  /** Engine-assigned placement period (Scenario B only) - base for the year
   *  +/- steppers. `Infinity` when the property couldn't be placed. */
  period?: number;
  /** AI-modified row (remodel draft) - violet tint. */
  changed?: boolean;
  /** Engine couldn't fully place/fund this purchase - red year. */
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
  // property made it onto the chart - a blocked property would shift the
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
// Front-facing numbers only (Rob, 4 Jul) - the descriptive fields (state,
// LVR, rent, entity, costs breakdown) live in the row-detail dialog.
// `width` - compact px used when both scenarios sit side by side (half width).
// `spread` - % used when Scenario A previews on its own (full width) so the
// columns fan out evenly instead of bunching left-and-right (sums to 100%).
const TABLE_COLS: { key: string; header: string; numeric?: boolean; width?: number; spread: string }[] = [
  { key: 'year', header: 'Year', width: 96, spread: '64px' },
  { key: 'title', header: 'Property', spread: '32%' },
  { key: 'price', header: 'Price', numeric: true, spread: '18%' },
  { key: 'yield', header: 'Yield', numeric: true, width: 58, spread: '13%' },
  { key: 'growth', header: 'Growth', width: 72, spread: '15%' },
  { key: 'holding', header: 'Holding $/yr', numeric: true, width: 92, spread: '18%' },
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
  /** Fan the columns across the full width (Scenario A previewing solo). */
  spread?: boolean;
  /** Scenario B only - nudges a purchase's placement year by ±1 (writes a
   *  manual placement period, re-runs the engine). Renders +/- in the Year
   *  cell. Omitted for Scenario A (read-only saved plan). */
  onShiftYear?: (row: PurchaseTableRow, deltaYears: number) => void;
}> = ({ rows, onRowClick, spread, onShiftYear }) => (
  <table className="w-full" style={{ tableLayout: 'fixed' }}>
    <thead>
      <tr>
        {TABLE_COLS.map(col => (
          <th
            key={col.key}
            className={`px-3 py-1.5 text-[11px] font-medium text-[#717680] border-b border-[#E9EAEB] ${col.numeric ? 'text-right' : 'text-left'}`}
            style={{ width: spread ? col.spread : col.width }}
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
        // Holding $/yr - identical expression to the dashboard purchases
        // table's HoldingCostCell (override ?? mgmt% × annual rent + annual
        // expense fields). fmtMoney renders NaN from missing legacy fields
        // as "-".
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
              : '-',
          growth: inst?.growthAssumption ?? '-',
          holding: fmtMoney(holding),
        };
        return (
          <tr
            key={`${row.year}-${i}`}
            className="cursor-pointer hover:bg-[#FAFAFA]"
            style={row.changed ? { backgroundColor: '#F5F3FF' } : undefined}
            onClick={() => onRowClick(row, i)}
          >
            {TABLE_COLS.map(col => {
              const isYearStepper = col.key === 'year' && !!onShiftYear && !!row.instanceId;
              return (
                <td
                  key={col.key}
                  className={`px-3 py-1.5 text-[12px] ${isYearStepper ? '' : 'truncate'} ${i < rows.length - 1 ? 'border-b border-[#F0F1F4]' : ''} ${col.numeric ? 'text-right tabular-nums' : 'text-left'}`}
                  style={{ color: col.key === 'year' && row.infeasible ? CHART_COLORS.semanticNegative : '#181D27' }}
                  title={col.key === 'title' ? row.title : undefined}
                >
                  {isYearStepper ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label="Move purchase a year earlier"
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#717680] hover:bg-[#F0F1F4] hover:text-[#181D27]"
                        onClick={() => onShiftYear!(row, -1)}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="tabular-nums" style={{ minWidth: 30, textAlign: 'center' }}>
                        {row.year}
                      </span>
                      <button
                        type="button"
                        aria-label="Move purchase a year later"
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#717680] hover:bg-[#F0F1F4] hover:text-[#181D27]"
                        onClick={() => onShiftYear!(row, 1)}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  ) : (
                    cells[col.key]
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  </table>
);

// ── Row detail dialog - the full purchase picture in four groups ────────────
// Scenario B (draft) rows pass `editable` + a live instance so each non-derived
// field renders an input; derived rows (Loan amount, Deposit, Gross yield) have
// no `edit` and stay read-only, recomputed from the live instance each render.
type EditKind = 'money' | 'number' | 'percent' | 'rate' | 'select' | 'toggle';

interface RowDetailEdit {
  field: keyof PropertyInstanceDetails;
  kind: EditKind;
  /** Current editable value (raw number / string / boolean). */
  current: number | string | boolean | null;
  /** Select options (value === label). */
  options?: string[];
  /** Empty text input commits null (e.g. stamp duty → Auto). */
  nullable?: boolean;
}

interface RowDetailItem {
  label: string;
  display: string;
  edit?: RowDetailEdit;
}

const STATE_OPTIONS = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const GROWTH_OPTIONS = ['High', 'Medium', 'Low'];

const getRowDetail = (
  inst: PropertyInstanceDetails | undefined,
): { group: string; items: RowDetailItem[] }[] => {
  if (!inst) return [];
  const price = inst.purchasePrice;
  const lvrPct = inst.lvr == null ? null : (inst.lvr <= 1 ? inst.lvr * 100 : inst.lvr);
  const loan = price != null && lvrPct != null ? price * (lvrPct / 100) : null;
  const rentYr = inst.rentPerWeek != null ? inst.rentPerWeek * 52 : null;

  return [
    {
      group: 'Contract',
      items: [
        { label: 'Purchase price', display: fmtMoney(price), edit: { field: 'purchasePrice', kind: 'money', current: price ?? null } },
        { label: 'Valuation at purchase', display: fmtMoney(inst.valuationAtPurchase), edit: { field: 'valuationAtPurchase', kind: 'money', current: inst.valuationAtPurchase ?? null } },
        { label: 'State', display: inst.state ?? '-', edit: { field: 'state', kind: 'select', current: inst.state ?? '', options: STATE_OPTIONS } },
        { label: 'Growth assumption', display: inst.growthAssumption ?? '-', edit: { field: 'growthAssumption', kind: 'select', current: inst.growthAssumption ?? '', options: GROWTH_OPTIONS } },
      ],
    },
    {
      group: 'Loan',
      items: [
        { label: 'LVR', display: fmtLvr(inst.lvr), edit: { field: 'lvr', kind: 'percent', current: lvrPct } },
        { label: 'Loan amount', display: fmtMoney(loan) },
        { label: 'Product', display: inst.loanProduct === 'IO' ? 'Interest only' : inst.loanProduct === 'PI' ? 'Principal & interest' : '-', edit: { field: 'loanProduct', kind: 'select', current: inst.loanProduct ?? '', options: ['IO', 'PI'] } },
        { label: 'Rate', display: inst.interestRate != null ? `${inst.interestRate}%` : '-', edit: { field: 'interestRate', kind: 'rate', current: inst.interestRate ?? null } },
        { label: 'Term', display: inst.loanTerm != null ? `${inst.loanTerm} yrs` : '-', edit: { field: 'loanTerm', kind: 'number', current: inst.loanTerm ?? null } },
        { label: 'LMI waiver', display: inst.lmiWaiver ? 'Yes' : 'No', edit: { field: 'lmiWaiver', kind: 'toggle', current: !!inst.lmiWaiver } },
      ],
    },
    {
      group: 'Purchase costs',
      items: [
        { label: 'Deposit', display: price != null && loan != null ? fmtMoney(price - loan) : '-' },
        { label: 'Stamp duty', display: inst.stampDutyOverride != null ? fmtMoney(inst.stampDutyOverride) : 'Auto (by state)', edit: { field: 'stampDutyOverride', kind: 'money', current: inst.stampDutyOverride ?? null, nullable: true } },
        { label: 'Engagement fee', display: fmtMoney(inst.engagementFee), edit: { field: 'engagementFee', kind: 'money', current: inst.engagementFee ?? null } },
        { label: 'Conveyancing', display: fmtMoney(inst.conveyancing), edit: { field: 'conveyancing', kind: 'money', current: inst.conveyancing ?? null } },
        { label: 'Building & pest', display: fmtMoney(inst.buildingPestInspection), edit: { field: 'buildingPestInspection', kind: 'money', current: inst.buildingPestInspection ?? null } },
        { label: 'Mortgage fees', display: fmtMoney(inst.mortgageFees), edit: { field: 'mortgageFees', kind: 'money', current: inst.mortgageFees ?? null } },
      ],
    },
    {
      group: 'Cashflow',
      items: [
        { label: 'Rent', display: inst.rentPerWeek != null ? `$${Math.round(inst.rentPerWeek).toLocaleString('en-AU')}/wk` : '-', edit: { field: 'rentPerWeek', kind: 'money', current: inst.rentPerWeek ?? null } },
        { label: 'Gross yield', display: rentYr != null && price ? `${((rentYr / price) * 100).toFixed(1)}%` : '-' },
        { label: 'Management', display: inst.propertyManagementPercent != null ? `${inst.propertyManagementPercent}%` : '-', edit: { field: 'propertyManagementPercent', kind: 'percent', current: inst.propertyManagementPercent ?? null } },
        { label: 'Insurance p/a', display: fmtMoney(inst.buildingInsuranceAnnual), edit: { field: 'buildingInsuranceAnnual', kind: 'money', current: inst.buildingInsuranceAnnual ?? null } },
        { label: 'Council rates & water', display: fmtMoney(inst.councilRatesWater), edit: { field: 'councilRatesWater', kind: 'money', current: inst.councilRatesWater ?? null } },
        { label: 'Strata', display: fmtMoney(inst.strata), edit: { field: 'strata', kind: 'money', current: inst.strata ?? null } },
        { label: 'Maintenance p/a', display: fmtMoney(inst.maintenanceAllowanceAnnual), edit: { field: 'maintenanceAllowanceAnnual', kind: 'money', current: inst.maintenanceAllowanceAnnual ?? null } },
      ],
    },
  ];
};

// Neutral gray form controls to match the dashboard's PropertyDetailModal /
// PropertyDetailPanel editors (gray-200 border, gray-400 focus) - kept at the
// compact 12px inline scale of the read-only detail rows.
const editInputClass =
  'text-[12px] text-right tabular-nums text-gray-900 bg-white border border-gray-200 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400';

const EditableSelect: React.FC<{
  edit: RowDetailEdit;
  onCommit: (edit: RowDetailEdit, value: string) => void;
}> = ({ edit, onCommit }) => (
  <select
    value={String(edit.current ?? '')}
    onChange={e => onCommit(edit, e.target.value)}
    className={`${editInputClass} cursor-pointer`}
  >
    {(edit.options ?? []).map(o => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
);

// Switch styled to match the dashboard's PropertyDetailPanel LMI toggle
// (gray-700 when on, sliding white thumb).
const EditableToggle: React.FC<{
  edit: RowDetailEdit;
  onCommit: (edit: RowDetailEdit, value: boolean) => void;
}> = ({ edit, onCommit }) => {
  const on = !!edit.current;
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={on}
        onChange={() => onCommit(edit, !on)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-700" />
    </label>
  );
};

const EditableText: React.FC<{
  edit: RowDetailEdit;
  onCommit: (edit: RowDetailEdit, value: number | null) => void;
}> = ({ edit, onCommit }) => {
  const initial = edit.current == null ? '' : String(edit.current);
  const [text, setText] = useState(initial);
  useEffect(() => {
    setText(edit.current == null ? '' : String(edit.current));
  }, [edit.current]);

  const commit = () => {
    const cleaned = text.replace(/[^0-9.-]/g, '');
    if (cleaned === '') {
      if (edit.nullable) onCommit(edit, null);
      else setText(initial);
      return;
    }
    const n = Number(cleaned);
    if (isNaN(n)) { setText(initial); return; }
    onCommit(edit, n);
  };

  return (
    <input
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      inputMode="decimal"
      placeholder={edit.nullable ? 'Auto' : undefined}
      className={`w-24 ${editInputClass}`}
    />
  );
};

const EditableField: React.FC<{
  edit: RowDetailEdit;
  onCommit: (edit: RowDetailEdit, value: number | string | boolean | null) => void;
}> = ({ edit, onCommit }) => {
  if (edit.kind === 'select') return <EditableSelect edit={edit} onCommit={onCommit} />;
  if (edit.kind === 'toggle') return <EditableToggle edit={edit} onCommit={onCommit} />;
  return <EditableText edit={edit} onCommit={onCommit} />;
};

const RowDetailDialog: React.FC<{
  row: PurchaseTableRow | null;
  purchaseNo: number;
  editable?: boolean;
  instance?: PropertyInstanceDetails;
  onEdit?: (patch: Partial<PropertyInstanceDetails>) => void;
  onClose: () => void;
}> = ({ row, purchaseNo, editable = false, instance, onEdit, onClose }) => {
  const sections = getRowDetail(instance);

  const handleCommit = (edit: RowDetailEdit, value: number | string | boolean | null) => {
    if (!onEdit || !instance) return;
    if (edit.field === 'lvr') {
      // Preserve stored scale: instances may keep LVR as a ratio (≤1) or a
      // percentage. The input always reads/writes a percentage.
      const scaled = instance.lvr != null && instance.lvr <= 1 ? (value as number) / 100 : (value as number);
      onEdit({ lvr: scaled });
      return;
    }
    onEdit({ [edit.field]: value } as Partial<PropertyInstanceDetails>);
  };

  return (
    <Dialog open={!!row} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl p-6">
        {row && (
          <>
            <DialogTitle
              style={{ fontSize: 15, fontWeight: 600, color: '#181D27', fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Purchase {purchaseNo} - {row.title} · {row.year}
            </DialogTitle>
            {sections.length === 0 ? (
              <p className="body-secondary mt-3">
                No detail saved for this purchase - open the scenario in the dashboard to complete it.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-10 gap-y-5 mt-4">
                {sections.map(section => (
                  <div key={section.group}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#717680] mb-2">
                      {section.group}
                    </p>
                    {section.items.map(item => (
                      <div key={item.label} className="flex items-center justify-between gap-2 py-[5px] min-h-[30px] border-b border-[#F0F1F4] last:border-0">
                        <span className="text-[12px] text-[#535862]">{item.label}</span>
                        {editable && item.edit ? (
                          <EditableField edit={item.edit} onCommit={handleCommit} />
                        ) : (
                          <span className="text-[12px] tabular-nums text-[#181D27]">{item.display}</span>
                        )}
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

// ── Scenario B review brief ─────────────────────────────────────────────────
// The first AI proposal is held here for the BA to tune BEFORE it lands in the
// tables and charts (mirrors the dashboard's ConfirmationBrief gate: new plan →
// review, later tweaks → live). Compact by design - Year steppers, Price, LVR,
// Growth and Rent inline; the full per-property picture stays in RowDetailDialog
// once the draft is approved.
// Dashboard "UUI" tokens (mirrors ConfirmationBrief.tsx) so the review brief
// reads with the same headings, fonts, neutral palette and purple accent.
const BRIEF_FONT = 'Inter, system-ui, -apple-system, sans-serif';

// ── Dashboard-brief primitives ───────────────────────────────────────────────
// Mirror ConfirmationBrief's UUI atoms so the Compare review reads identically:
// Inter, neutral palette, purple accent, and green "from brief" / amber "AI
// estimate" source dots. Kept local to Compare so the dashboard flow is untouched.
const BRIEF = {
  neutral900: '#181D27',
  neutral700: '#404040',
  neutral500: '#717680',
  neutral400: '#A3A3A3',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  neutral50: '#FAFAFA',
  white: '#FFFFFF',
  purple600: '#7C3AED',
  purple700: '#6D28D9',
  green500: '#22C55E',
  amber500: '#F59E0B',
} as const;

const BRIEF_STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

/** Source dot after a field label - green = carried from the plan, amber = AI-set. */
type BriefSource = 'user' | 'assumed';

const BriefDot: React.FC<{ source: BriefSource }> = ({ source }) => (
  <span
    className="ml-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
    style={{ backgroundColor: source === 'user' ? BRIEF.green500 : BRIEF.amber500 }}
  />
);

const BriefSourceLegend: React.FC = () => (
  <div className="flex items-center gap-3" style={{ fontFamily: BRIEF_FONT, fontSize: 11, color: BRIEF.neutral400 }}>
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BRIEF.green500 }} />
      From brief
    </div>
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BRIEF.amber500 }} />
      AI estimate
    </div>
  </div>
);

const BriefSegmented: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex items-center overflow-hidden rounded-lg" style={{ border: `1px solid ${BRIEF.neutral200}` }}>
    {options.map((opt, i) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="flex-1 px-2 transition-colors"
          style={{
            fontFamily: BRIEF_FONT,
            fontSize: 11,
            fontWeight: 500,
            height: 30,
            whiteSpace: 'nowrap',
            backgroundColor: active ? BRIEF.white : BRIEF.neutral50,
            color: active ? BRIEF.neutral700 : BRIEF.neutral500,
            borderLeft: i !== 0 ? `1px solid ${BRIEF.neutral200}` : 'none',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const BriefYearStepper: React.FC<{ value: number; onChange: (v: number) => void; danger?: boolean }> = ({ value, onChange, danger }) => (
  <div className="flex items-center overflow-hidden rounded-lg" style={{ border: `1px solid ${danger ? '#EF4444' : BRIEF.neutral200}`, height: 30 }}>
    <button type="button" onClick={() => onChange(value - 1)} className="h-full px-2 hover:bg-neutral-50" style={{ color: BRIEF.neutral400 }}><Minus size={12} /></button>
    <span className="flex h-full flex-1 items-center justify-center" style={{ fontFamily: BRIEF_FONT, fontSize: 12, fontWeight: 500, color: danger ? '#EF4444' : BRIEF.neutral700, backgroundColor: BRIEF.neutral50 }}>{value}</span>
    <button type="button" onClick={() => onChange(value + 1)} className="h-full px-2 hover:bg-neutral-50" style={{ color: BRIEF.neutral400 }}><Plus size={12} /></button>
  </div>
);

const BriefDropdown: React.FC<{ value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-1 rounded-lg bg-white px-2.5 hover:bg-neutral-50"
        style={{ fontFamily: BRIEF_FONT, fontSize: 12, fontWeight: 500, color: BRIEF.neutral700, border: `1px solid ${BRIEF.neutral200}`, height: 30 }}
      >
        {selected?.label ?? value}
        <ChevronDown size={12} style={{ color: BRIEF.neutral400 }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg bg-white py-0.5 shadow-lg" style={{ border: `1px solid ${BRIEF.neutral200}` }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full px-3 py-1.5 text-left transition-colors ${opt.value === value ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
              style={{ fontFamily: BRIEF_FONT, fontSize: 12, color: opt.value === value ? BRIEF.neutral900 : BRIEF.neutral500, fontWeight: opt.value === value ? 600 : 400 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const briefFmtNum = (v: number) => Math.round(v).toLocaleString('en-AU');

// Uncontrolled bordered number box. `key={value}` reseeds the default when the
// engine re-run changes the value out from under an un-focused input.
const BriefNumInput: React.FC<{ value: number; onCommit: (v: number) => void }> = ({ value, onCommit }) => (
  <input
    key={value}
    type="text"
    inputMode="decimal"
    defaultValue={briefFmtNum(value)}
    onBlur={e => { const n = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')); if (!isNaN(n) && n !== value) onCommit(n); }}
    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    className="w-full px-2 outline-none focus:ring-1 focus:ring-neutral-300"
    style={{ fontFamily: BRIEF_FONT, fontSize: 12, color: BRIEF.neutral500, border: `1px solid ${BRIEF.neutral200}`, borderRadius: 8, height: 30 }}
  />
);

const BriefSellToggle: React.FC<{ value: number | null | undefined; onChange: (v: number | null) => void }> = ({ value, onChange }) => {
  const on = !!value && value > 0;
  return (
    <div className="flex items-center gap-1.5" style={{ height: 30 }}>
      <button
        type="button"
        aria-label="Toggle sale"
        onClick={() => onChange(on ? null : new Date().getFullYear() + 10)}
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? 'bg-violet-500' : 'bg-neutral-200'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-3' : ''}`} />
      </button>
      {on && <span style={{ fontFamily: BRIEF_FONT, fontSize: 12, fontWeight: 500, color: BRIEF.purple600 }}>{value}</span>}
    </div>
  );
};

// Card-based review brief - matches the dashboard's ConfirmationBrief: a
// "Proposed plan" summary card, a "Proposed Purchases" header with the
// from-brief/AI-estimate legend, and one editable property card per purchase.
const ScenarioBReviewBrief: React.FC<{
  rows: PurchaseTableRow[];
  instances: Record<string, PropertyInstanceDetails>;
  summary: string | null;
  modelCheck: string[];
  onShiftYear: (row: PurchaseTableRow, deltaYears: number) => void;
  onEdit: (instanceId: string, patch: Partial<PropertyInstanceDetails>) => void;
  onApprove: () => void;
  onDiscard: () => void;
}> = ({ rows, instances, summary, modelCheck, onShiftYear, onEdit, onApprove, onDiscard }) => {
  const fieldLabel = (text: string, source: BriefSource) => (
    <div className="flex items-center" style={{ fontFamily: BRIEF_FONT, fontSize: 10, color: BRIEF.neutral400, marginBottom: 4 }}>
      {text}<BriefDot source={source} />
    </div>
  );

  return (
    <Dialog open onOpenChange={open => { if (!open) onDiscard(); }}>
      <DialogContent className="max-h-[88vh] w-[94vw] overflow-y-auto p-6" style={{ fontFamily: BRIEF_FONT, maxWidth: 1320 }}>
        <DialogTitle style={{ fontSize: 15, fontWeight: 600, color: BRIEF.neutral900, fontFamily: BRIEF_FONT }}>
          Review Scenario B
        </DialogTitle>

        {summary && (
          <div
            className="mt-3"
            style={{ background: BRIEF.neutral50, borderRadius: 10, boxShadow: `${BRIEF.neutral200} 0px 0px 0px 1px inset`, padding: '10px 14px' }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: BRIEF.neutral400, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
              Proposed plan
            </div>
            <div style={{ fontSize: 11, color: BRIEF.neutral500, lineHeight: '17px' }}>{summary}</div>
          </div>
        )}

        {modelCheck.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#B54708]" />
            <span className="text-[12px] leading-snug text-[#93370D]">
              <span className="font-semibold">Model check:</span>{' '}
              {modelCheck.join(' ')}
            </span>
          </div>
        )}

        <div className="mb-2 mt-5 flex items-center justify-between">
          <span style={{ fontFamily: BRIEF_FONT, fontSize: 13, fontWeight: 600, color: BRIEF.neutral700 }}>Proposed Purchases</span>
          <BriefSourceLegend />
        </div>

        {rows.length === 0 ? (
          <p style={{ fontFamily: BRIEF_FONT, fontSize: 12, color: BRIEF.neutral400 }}>No purchases in this proposal.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {rows.map((row, i) => {
              const inst = row.instanceId ? instances[row.instanceId] : undefined;
              if (!row.instanceId || !inst) return null;
              const id = row.instanceId;
              const source: BriefSource = row.changed ? 'assumed' : 'user';
              const parsedYear = parseInt(row.year, 10);
              const displayYear = Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear;
              const category = row.title.replace(/ Property$/, '');
              return (
                <div
                  key={id}
                  className="flex flex-col gap-2.5"
                  style={{
                    flex: '0 0 auto',
                    width: 'calc(25% - 9px)',
                    minWidth: 210,
                    background: BRIEF.white,
                    borderRadius: 12,
                    border: `1px solid ${row.infeasible ? '#EF4444' : BRIEF.neutral200}`,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontFamily: BRIEF_FONT, fontSize: 12, fontWeight: 600, color: BRIEF.neutral700 }}>
                    Property {i + 1}
                    <span style={{ fontWeight: 400, color: BRIEF.neutral400 }}> · {category}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      {fieldLabel('Growth', source)}
                      <BriefSegmented
                        options={[{ value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Med' }, { value: 'High', label: 'High' }]}
                        value={inst.growthAssumption ?? 'Medium'}
                        onChange={v => onEdit(id, { growthAssumption: v as 'High' | 'Medium' | 'Low' })}
                      />
                    </div>
                    <div>
                      {fieldLabel('Entity', source)}
                      <BriefSegmented
                        options={[{ value: 'individual', label: 'Individual' }, { value: 'trust', label: 'Trust' }]}
                        value={inst.entity ?? 'individual'}
                        onChange={v => onEdit(id, { entity: v as 'individual' | 'trust' })}
                      />
                    </div>
                  </div>

                  <div>
                    {fieldLabel('Type', source)}
                    <BriefSegmented
                      options={[{ value: 'established', label: 'Established' }, { value: 'new', label: 'New build' }]}
                      value={inst.isNewBuild ? 'new' : 'established'}
                      onChange={v => onEdit(id, { isNewBuild: v === 'new' })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      {fieldLabel('State', source)}
                      <BriefDropdown value={inst.state} options={BRIEF_STATE_OPTIONS.map(s => ({ value: s, label: s }))} onChange={v => onEdit(id, { state: v })} />
                    </div>
                    <div>
                      {fieldLabel('Purchase year', source)}
                      <BriefYearStepper value={displayYear} danger={row.infeasible} onChange={v => onShiftYear(row, v - displayYear)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>{fieldLabel('Price ($)', source)}<BriefNumInput value={inst.purchasePrice ?? 0} onCommit={v => onEdit(id, { purchasePrice: v })} /></div>
                    <div>{fieldLabel('Rent / wk ($)', source)}<BriefNumInput value={inst.rentPerWeek ?? 0} onCommit={v => onEdit(id, { rentPerWeek: v })} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      {fieldLabel('Loan', source)}
                      <BriefSegmented options={[{ value: 'IO', label: 'IO' }, { value: 'PI', label: 'P&I' }]} value={inst.loanProduct ?? 'IO'} onChange={v => onEdit(id, { loanProduct: v as 'IO' | 'PI' })} />
                    </div>
                    <div>
                      <div className="flex items-center" style={{ fontFamily: BRIEF_FONT, fontSize: 10, color: BRIEF.neutral400, marginBottom: 4 }}>Sell</div>
                      <BriefSellToggle value={inst.saleYear} onChange={v => onEdit(id, { saleYear: v })} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 pt-4" style={{ borderTop: `1px solid ${BRIEF.neutral100}` }}>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-lg px-4 py-2 transition-colors hover:bg-[#F5F5F5]"
            style={{ fontFamily: BRIEF_FONT, fontSize: 13, fontWeight: 500, color: BRIEF.neutral500 }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2 transition-colors"
            style={{ fontFamily: BRIEF_FONT, fontSize: 13, fontWeight: 600, color: BRIEF.white, backgroundColor: BRIEF.purple600 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRIEF.purple700)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRIEF.purple600)}
          >
            <Check size={14} />
            Approve &amp; compare
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// "Remodel with AI" - enabled in production 4 Jul 2026 (see
// COMPARE-EVOLUTION-PLAN.md). Flip to `import.meta.env.DEV` to pull it
// from prod builds again; the bundle strips the whole UI when false.
// Strategy starters - one-click ways for a BA to model a *different* approach
// off the same client starting position, to hold against their ideal plan.
const STRATEGY_SUGGESTIONS = [
  'Focus on $500k properties',
  'Low-priced units, high yields',
  'Fewer, higher-growth buys',
  'Reach the equity goal sooner',
];

export const Compare: React.FC = () => {
  const { clients } = useClient();
  const [allScenarios, setAllScenarios] = useState<ScenarioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string>('');
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

  // ── Remodel with AI - Scenario B is always an AI-modelled draft ──────
  const { run } = useScenarioRunner();
  const baseInput = useMemo(() => (scenarioA ? toScenarioInput(scenarioA.raw) : null), [scenarioA]);
  const remodel = useCompareRemodel(baseInput);
  const { draft, pending } = remodel;
  const [remodelText, setRemodelText] = useState('');

  // A different base plan means any existing draft is meaningless.
  useEffect(() => {
    remodel.reset();
    setRemodelText('');
    // remodel.reset is stable (useCallback with no deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioA?.scenarioId]);

  // Base scenario run - powers the placement-diff notes in the model-check
  // strip, and (in dev) a parity check of headless output vs the saved
  // snapshot. Guarded: a malformed legacy blob must not take the page down.
  const baseRun = useMemo(() => {
    if (!baseInput) return null;
    try {
      return run(baseInput);
    } catch (e) {
      console.error('[Compare] headless base run failed', e);
      return null;
    }
  }, [baseInput, run]);

  // DEV parity check: the headless runner must reproduce the saved snapshot
  // for the same inputs. A mismatch is either an input-assembly bug or the
  // scenario was saved under different global assumptions - both worth eyes.
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

  // Side B is either a saved scenario or the live remodel draft - everything
  // below (KPIs, table, charts) reads from this one view object.
  interface SideBView {
    label: string;
    growth: ChartDataPoint[];
    cashflow: CashflowDataPoint[];
    rows: PurchaseTableRow[];
    isDraft: boolean;
  }
  const sideB: SideBView | null = useMemo(() => {
    if (!draft || !scenarioA) return null;
    const changedSet = new Set(draft.changedInstanceIds);
    const rows: PurchaseTableRow[] = [...draft.run.timelineProperties]
      .sort((a, b) => (a.period === Infinity ? 1 : b.period === Infinity ? -1 : a.period - b.period))
      .map(tp => ({
        year: tp.period === Infinity ? '-' : String(Math.floor(tp.affordableYear)),
        title: tp.title,
        instance: draft.run.instances[tp.instanceId],
        instanceId: tp.instanceId,
        period: tp.period,
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
  }, [draft, scenarioA]);

  // Model-check notes - the engine's honest response to the remodel: mapper
  // warnings, placements it had to move, purchases it couldn't fully fund.
  const modelCheckNotes = useMemo(() => {
    if (!draft) return [];
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
  }, [draft, baseRun]);

  // Proposed Scenario B rows for the review brief - same shape/logic as
  // `sideB.rows`, but read off the un-approved `pending` draft.
  const pendingRows: PurchaseTableRow[] = useMemo(() => {
    if (!pending) return [];
    const changedSet = new Set(pending.changedInstanceIds);
    return [...pending.run.timelineProperties]
      .sort((a, b) => (a.period === Infinity ? 1 : b.period === Infinity ? -1 : a.period - b.period))
      .map(tp => ({
        year: tp.period === Infinity ? '-' : String(Math.floor(tp.affordableYear)),
        title: tp.title,
        instance: pending.run.instances[tp.instanceId],
        instanceId: tp.instanceId,
        period: tp.period,
        changed: changedSet.has(tp.instanceId),
        infeasible: tp.status !== 'feasible' || tp.period === Infinity,
      }));
  }, [pending]);

  // Model-check notes for the review brief - identical logic to
  // `modelCheckNotes`, but read off `pending`.
  const pendingModelCheck = useMemo(() => {
    if (!pending) return [];
    const notes: string[] = [...pending.warnings];
    const baseByInstance = new Map(
      (baseRun?.timelineProperties ?? []).map(tp => [tp.instanceId, tp]),
    );
    pending.run.timelineProperties.forEach(tp => {
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
        pending.changedInstanceIds.includes(tp.instanceId) &&
        base && base.period !== Infinity &&
        Math.floor(base.affordableYear) !== draftYear
      ) {
        notes.push(`${tp.title} moved ${Math.floor(base.affordableYear)} → ${draftYear}.`);
      }
    });
    return notes;
  }, [pending, baseRun]);

  // Fire once whenever a remodel draft lands against the selected Scenario A.
  useEffect(() => {
    if (scenarioA && draft) {
      track(EVENTS.scenariosCompared, { same_client: true });
    }
  }, [scenarioA?.scenarioId, draft]);

  const equityData = useMemo(() => {
    if (!scenarioA) return [];
    const yearMap = new Map<string, { year: string; equityA?: number; equityB?: number; propertiesA?: string[]; propertiesB?: string[] }>();

    for (const pt of scenarioA.portfolioGrowthData) {
      yearMap.set(pt.year, { year: pt.year, equityA: pt.equity ?? pt.portfolioValue, propertiesA: pt.properties });
    }
    if (sideB) {
      for (const pt of sideB.growth) {
        const existing = yearMap.get(pt.year) || { year: pt.year };
        yearMap.set(pt.year, { ...existing, equityB: pt.equity ?? pt.portfolioValue, propertiesB: pt.properties });
      }
    }

    return Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [scenarioA, sideB]);

  const cashflowChartData = useMemo(() => {
    if (!scenarioA) return [];
    // Purchases live on portfolioGrowthData - map them by year so they can
    // also be plotted on the cashflow line.
    const propsA = new Map(scenarioA.portfolioGrowthData.map(p => [p.year, p.properties]));

    const yearMap = new Map<string, { year: string; cashflowA?: number; cashflowB?: number; propertiesA?: string[]; propertiesB?: string[] }>();

    for (const pt of scenarioA.cashflowData) {
      yearMap.set(pt.year, { year: pt.year, cashflowA: pt.cashflow, propertiesA: propsA.get(pt.year) });
    }
    if (sideB) {
      const propsB = new Map(sideB.growth.map(p => [p.year, p.properties]));
      for (const pt of sideB.cashflow) {
        const existing = yearMap.get(pt.year) || { year: pt.year };
        yearMap.set(pt.year, { ...existing, cashflowB: pt.cashflow, propertiesB: propsB.get(pt.year) });
      }
    }

    return Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [scenarioA, sideB]);

  const labelA = scenarioA ? scenarioA.scenarioName : 'Scenario A';
  const labelB = sideB?.label ?? 'Scenario B';

  const rowsA = useMemo(() => (scenarioA ? buildPurchaseRows(scenarioA) : []), [scenarioA]);
  const rowsB = sideB?.rows ?? [];

  // Nudge a Scenario B purchase earlier/later by whole years. Writes a manual
  // placement period on the given draft's instance and lets the engine re-run -
  // the property lands on the new year if it passes affordability there, so the
  // BA can walk an infeasible (red) purchase forward to a year it can be funded.
  // Factory so the same behaviour drives both the live draft table and the
  // pre-approval review brief.
  const makeShiftYear =
    (source: RemodelDraft | null, edit: (id: string, patch: Partial<PropertyInstanceDetails>) => void) =>
    (row: PurchaseTableRow, deltaYears: number) => {
      if (!row.instanceId || !source) return;
      const inst = source.run.instances[row.instanceId];
      const maxPeriod = (source.run.profile.timelineYears || 20) * PERIODS_PER_YEAR;
      // Base off the stored manual placement if set, else the engine's assigned
      // period; unplaceable rows (period === Infinity) start from the horizon so
      // the first "−" pulls them into range.
      const basePeriod =
        inst?.isManuallyPlaced && inst?.manualPlacementPeriod
          ? inst.manualPlacementPeriod
          : row.period != null && row.period !== Infinity
            ? row.period
            : maxPeriod;
      const next = Math.min(maxPeriod, Math.max(1, basePeriod + deltaYears * PERIODS_PER_YEAR));
      if (next === basePeriod) return;
      edit(row.instanceId, { isManuallyPlaced: true, manualPlacementPeriod: next });
    };

  const shiftYear = makeShiftYear(draft, remodel.editInstance);
  const shiftPendingYear = makeShiftYear(pending, remodel.editPending);

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
          {s.clientName} - {s.scenarioName}
        </option>
      ))}
    </select>
  );

  return (
    <div className="main-app flex h-screen w-full bg-[#FAFAFA]">
      <AppSidebar />
      <div className="flex-1 overflow-hidden flex flex-col" style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)`, transition: 'margin-left 200ms ease-in-out' }}>
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-6 mx-auto" style={{ padding: '24px 28px 80px 28px', width: '100%', minWidth: 500 }}>
            <h2 className="page-title">Compare</h2>

            {/* ── Scenario slots ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch">
              <ChartCard
                title="Scenario A"
                legend={[{ color: COLOR_A, label: 'Saved plan', variant: 'dot' }]}
              >
                {scenarioSelect(selectedA, setSelectedA, '')}
                {scenarioA && (
                  <p className="meta mt-2">
                    {rowsA.length} purchase{rowsA.length === 1 ? '' : 's'}
                  </p>
                )}
              </ChartCard>

              <ChartCard
                title="Scenario B"
                legend={undefined}
                action={
                  draft ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] border border-[#D9D2F2] px-2 py-0.5 text-[11px] font-medium text-[#7C3AED]">
                      <Sparkles size={11} />
                      Draft
                    </span>
                  ) : undefined
                }
              >
                <div className="flex flex-col gap-2">
                  <p className="meta">
                    Based on{' '}
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#414651' }}>
                      {scenarioA ? `${scenarioA.clientName} - ${scenarioA.scenarioName}` : 'select Scenario A first'}
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
                      placeholder={draft ? 'Refine the draft… e.g. ‘Push the first commercial to 2033’' : 'Describe a strategy… e.g. ‘Focus on $500k properties’'}
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
                  {/* Strategy starters - model a different approach in one
                      click. Shown until the BA has a draft going. */}
                  {scenarioA && !draft && !remodel.isThinking && (
                    <div className="flex flex-wrap gap-1.5">
                      {STRATEGY_SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setRemodelText('');
                            void remodel.submit(s);
                          }}
                          className="rounded-full border border-[#E9EAEB] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#535862] transition-colors hover:border-[#D9D2F2] hover:bg-[#F5F3FF] hover:text-[#7C3AED]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {remodel.error && (
                    <p className="text-[12px]" style={{ color: CHART_COLORS.semanticNegative }}>
                      {remodel.error}
                    </p>
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

            {!loading && allScenarios.length > 0 && !scenarioA && (
              <p className="body-secondary">
                Select Scenario A, then describe a different strategy to model against it.
              </p>
            )}

            {/* ── Output - grey rule separates inputs from results ────── */}
            {scenarioA && (
              <div className="flex flex-col gap-6 border-t border-[#E9EAEB] pt-6">
                {/* Model check - the engine's honest response to the remodel */}
                {draft && modelCheckNotes.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#B54708]" />
                    <span className="text-[12px] leading-snug text-[#93370D]">
                      <span className="font-semibold">Model check:</span>{' '}
                      {modelCheckNotes.join(' ')}
                    </span>
                  </div>
                )}

                {/* Purchases tables, side by side, horizon stats pinned on top
                    (row click → detail). Scenario A previews on its own until
                    Scenario B is chosen. */}
                <div className={`grid grid-cols-1 gap-6 items-start ${sideB ? 'md:grid-cols-2' : ''}`}>
                  <ChartCard title="Scenario A" flush>
                    <StatStrip growth={scenarioA.portfolioGrowthData} cashflow={scenarioA.cashflowData} />
                    <PurchasesTable rows={rowsA} spread={!sideB} onRowClick={(row, index) => setDetailRow({ row, index })} />
                  </ChartCard>
                  {sideB && (
                    <ChartCard title="Scenario B" flush>
                      <StatStrip growth={sideB.growth} cashflow={sideB.cashflow} />
                      <PurchasesTable rows={rowsB} onRowClick={(row, index) => setDetailRow({ row, index })} onShiftYear={shiftYear} />
                    </ChartCard>
                  )}
                </div>

                {!sideB && (
                  <p className="meta">
                    Describe a strategy above to model Scenario B against this plan.
                  </p>
                )}

                <RowDetailDialog
                  row={detailRow?.row ?? null}
                  purchaseNo={(detailRow?.index ?? 0) + 1}
                  editable={!!detailRow?.row.instanceId}
                  instance={
                    detailRow?.row.instanceId
                      ? draft?.run.instances[detailRow.row.instanceId]
                      : detailRow?.row.instance
                  }
                  onEdit={patch => {
                    if (detailRow?.row.instanceId) remodel.editInstance(detailRow.row.instanceId, patch);
                  }}
                  onClose={() => setDetailRow(null)}
                />

                {/* Review brief - the first AI proposal, gated for tuning
                    before it lands in the tables and charts. While it is open
                    there is no `draft`, so nothing below renders behind it. */}
                {pending && (
                  <ScenarioBReviewBrief
                    rows={pendingRows}
                    instances={pending.run.instances}
                    summary={remodel.aiMessage}
                    modelCheck={pendingModelCheck}
                    onShiftYear={shiftPendingYear}
                    onEdit={remodel.editPending}
                    onApprove={remodel.approvePending}
                    onDiscard={remodel.discardPending}
                  />
                )}

                {/* Equity chart */}
                <ChartCard
                  title="Total Equity"
                  expandable
                  legend={[
                    { color: COLOR_A, label: labelA, variant: 'dot' },
                    ...(sideB ? [{ color: COLOR_B, label: labelB, variant: sideB.isDraft ? 'line' as const : 'dot' as const }] : []),
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
                        {sideB && (
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
                        )}
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
                    ...(sideB ? [{ color: COLOR_B, label: labelB, variant: sideB.isDraft ? 'line' as const : 'dot' as const }] : []),
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
                        {sideB && (
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
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* Borrowing capacity - one card per scenario, side by side.
                    Each plots its own headless run's projection (passed in), so
                    Scenario A and the Scenario B draft stay isolated instead of
                    recomputing from the live/active dashboard scenario. */}
                {baseRun && (
                  <div className={`grid grid-cols-1 gap-6 items-stretch ${sideB ? 'md:grid-cols-2' : ''}`}>
                    <ChartCard title="Borrowing Capacity - Scenario A">
                      <BorrowingCapacityChart
                        scenarioData={{ timelineProperties: baseRun.timelineProperties, profile: baseRun.profile }}
                        projection={baseRun.projection}
                        eventBlocksOverride={[]}
                      />
                    </ChartCard>
                    {sideB && draft && (
                      <ChartCard title="Borrowing Capacity - Scenario B">
                        <BorrowingCapacityChart
                          scenarioData={{ timelineProperties: draft.run.timelineProperties, profile: draft.run.profile }}
                          projection={draft.run.projection}
                          eventBlocksOverride={[]}
                        />
                      </ChartCard>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

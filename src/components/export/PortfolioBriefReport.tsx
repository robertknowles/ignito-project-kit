import React from 'react';
import { usePortfolioProjection, type PerPropertyYearRow } from '../../hooks/usePortfolioProjection';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { calculateDetailedCashflow } from '../../utils/detailedCashflowCalculator';
import { calcGrossYield } from '../../utils/sharedFinancialCalcs';
import { calculateCgtComparison } from '../../utils/cgtCalculator';
import { BASE_YEAR } from '../../constants/financialParams';
import { type ReportMeta } from './ReportShell';

/**
 * PortfolioBriefReport — the unified "Portfolio Brief (Descriptive)" export.
 *
 * Reproduces the proppath-portfolio-export mockup while wiring every figure to
 * the same live hooks the dashboard uses, so the brief is always parallel to
 * what's on screen. The document flows as a stack of `.brief-part` sections;
 * the browser's print engine paginates them across A4 pages via the CSS
 * fragmentation rules in the `@media print` block (index.css). Inline hex
 * styling throughout so backgrounds print faithfully with
 * `print-color-adjust: exact`.
 */

// ── Mockup palette (fixed greys; accent derived from branding) ───────────────
const INK = '#16161D';
const MUTED = '#6B7280';
const FAINT = '#9CA3AF';
const LINE = '#E6E6EC';
const LINE_STRONG = '#D5D5DE';
const NEG = '#D8442F';
const POS = '#1F9D62';
const SHADE = '#FAFAFC';
const FONT =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif';

// ── Colour helpers (derive soft/deep tints from the firm's primary colour) ───
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const hexToRgb = (hex: string): [number, number, number] => {
  const h = (hex || '#7C5CFC').replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')}`;
const mixWhite = (hex: string, amt: number) => {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
};
const darken = (hex: string, amt: number) => {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
};

// ── Formatting ───────────────────────────────────────────────────────────────
const money = (v: number): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '–';
  const s = v < 0 ? '-' : '';
  return `${s}$${Math.round(Math.abs(v)).toLocaleString('en-AU')}`;
};
const moneyNoSign = (v: number): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '–';
  return Math.round(Math.abs(v)).toLocaleString('en-AU');
};
// Signed number, no dollar sign (e.g. "-12,824"), for projection-table cells.
const numSigned = (v: number): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '–';
  const s = v < 0 ? '-' : '';
  return `${s}${Math.round(Math.abs(v)).toLocaleString('en-AU')}`;
};
const compact = (v: number): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '–';
  const s = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${s}$${(Math.round((a / 1_000_000) * 100) / 100).toFixed(2)}M`;
  if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}k`;
  return `${s}$${Math.round(a)}`;
};
const pct = (v: number, d = 1): string =>
  v === null || v === undefined || Number.isNaN(v) ? '–' : `${v.toFixed(d)}%`;

const todayLabel = (): string =>
  new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

// Axis-tick money label (e.g. $9M, $150k, -$50k, $800K).
const axisLabel = (v: number): string => {
  const s = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) {
    const m = a / 1_000_000;
    return `${s}$${m % 1 === 0 ? m : m.toFixed(2).replace(/0$/, '')}M`;
  }
  if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}k`;
  if (a === 0) return '$0';
  return `${s}$${Math.round(a)}`;
};

// Round an axis range to clean "nice" bounds so tick labels read $2M, $4M, $6M
// rather than $5.67M — mirroring the round numbers used in the reference design.
const niceAxis = (min: number, max: number, intervals = 3): { min: number; max: number; step: number } => {
  if (min === max) max = min + 1;
  const rawStep = (max - min) / intervals;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  const step = nice * mag;
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline line chart (viewBox 0 0 1000 300), mirroring the mockup SVGs.
// ─────────────────────────────────────────────────────────────────────────────
interface ChartProps {
  values: number[];
  years: number[];
  stroke: string;
  area?: string;
  baselineZero?: boolean;
  /** index where the goal is hit; draws a marker + pill */
  goalIndex?: number | null;
  goalLabel?: string;
  goalColor?: string;
}
const LineChartSvg: React.FC<ChartProps> = ({
  values, years, stroke, area, baselineZero, goalIndex, goalLabel, goalColor,
}) => {
  const X0 = 70, X1 = 960, Y0 = 40, Y1 = 270;
  const n = values.length;
  if (n < 2) return null;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const rawMin = baselineZero ? Math.min(0, dataMin) : dataMin;
  const { min: yMin, max: yMax, step: yStep } = niceAxis(rawMin, dataMax);

  const xAt = (i: number) => X0 + (i / (n - 1)) * (X1 - X0);
  const yAt = (v: number) => Y1 - ((v - yMin) / (yMax - yMin)) * (Y1 - Y0);

  const pointsStr = values.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
  const areaStr = area
    ? `${pointsStr} ${X1},${Y1} ${X0},${Y1}`
    : '';

  // y gridlines / labels at the nice step (clean round values, top → bottom)
  const tickVals: number[] = [];
  for (let v = yMax; v >= yMin - yStep * 0.001; v -= yStep) tickVals.push(v);
  const ticks = tickVals.length;

  // zero baseline (dashed) when the range crosses zero
  const showZero = yMin < 0 && yMax > 0;

  // x labels — first, ~quarters, last
  const xIdx = Array.from(new Set([0, Math.round((n - 1) * 0.25), Math.round((n - 1) * 0.5), Math.round((n - 1) * 0.75), n - 1]));

  return (
    <svg viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', display: 'block', marginTop: 6 }}>
      {tickVals.map((tv, i) => {
        const isFloor = i === ticks - 1 && yMin >= 0;
        return (
          <line key={`g${i}`} x1={X0} y1={yAt(tv)} x2={X1} y2={yAt(tv)}
            stroke={isFloor ? LINE : '#F0F0F4'} strokeWidth={isFloor ? 1.5 : 1} />
        );
      })}
      {tickVals.map((tv, i) => (
        <text key={`yl${i}`} x={60} y={yAt(tv) + 4} textAnchor="end" fontSize={12} fill={FAINT}>
          {axisLabel(tv)}
        </text>
      ))}
      {showZero && (
        <line x1={X0} y1={yAt(0)} x2={X1} y2={yAt(0)} stroke={LINE_STRONG} strokeWidth={1.5} strokeDasharray="5 5" />
      )}
      {area && <polygon fill={area} points={areaStr} />}
      <polyline fill="none" stroke={stroke} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" points={pointsStr} />
      {goalIndex !== null && goalIndex !== undefined && goalIndex >= 0 && goalIndex < n && (
        <>
          <circle cx={xAt(goalIndex)} cy={yAt(values[goalIndex])} r={5} fill={goalColor || stroke} />
          <rect x={xAt(goalIndex) - 40} y={yAt(values[goalIndex]) - 30} width={80} height={22} rx={11} fill={goalColor || stroke} />
          <text x={xAt(goalIndex)} y={yAt(values[goalIndex]) - 15} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">
            {goalLabel}
          </text>
        </>
      )}
      {xIdx.map((i, k) => (
        <text key={`xl${k}`} x={xAt(i)} y={288}
          textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={13} fill={FAINT}>
          {years[i]}
        </text>
      ))}
    </svg>
  );
};

// ── Small primitives ─────────────────────────────────────────────────────────
const BrandMark: React.FC<{ accent: string }> = ({ accent }) => (
  <div style={{ width: 26, height: 26, borderRadius: 7, background: accent, position: 'relative', flex: 'none' }}>
    <div style={{ position: 'absolute', width: 8, height: 8, border: '2px solid #fff', borderRadius: '50%', top: 6, right: 6, boxSizing: 'border-box' }} />
    <div style={{ position: 'absolute', width: 2, height: 8, background: '#fff', left: 9, bottom: 6, transform: 'rotate(-30deg)', transformOrigin: 'bottom' }} />
  </div>
);

const Brand: React.FC<{ name: string; accent: string; logoUrl?: string | null }> = ({ name, accent, logoUrl }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    {logoUrl
      ? <img src={logoUrl} alt="" style={{ height: 26, width: 'auto', objectFit: 'contain' }} crossOrigin="anonymous" />
      : <BrandMark accent={accent} />}
    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px', color: INK }}>{name}</div>
  </div>
);

const RunHead: React.FC<{ left: string; right: string }> = ({ left, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: FAINT, borderBottom: `1px solid ${LINE}`, paddingBottom: 4, marginBottom: 14 }}>
    <i>{left}</i><i>{right}</i>
  </div>
);

// Print-only running footer (repeats on every printed page via `position: fixed`
// in the print stylesheet). Page numbers come from the browser's native print
// header/footer — Chrome can't render a styled page counter.
const RunningFoot: React.FC = () => (
  <div className="brief-foot" style={{ background: '#fff', padding: '6px 22mm 8mm', borderTop: `1px solid ${LINE}` }}>
    <div style={{ fontSize: 7.5, color: FAINT, lineHeight: 1.4 }}>
      This document is a financial model, not financial, credit or tax advice. Figures are estimates based on the inputs entered and are not a forecast or guarantee of future performance. Your buyers' agent remains responsible for any advice. &nbsp;·&nbsp; Portfolio Brief (Descriptive)
    </div>
  </div>
);

const SectionH: React.FC<{ children: React.ReactNode; center?: boolean; mt?: number }> = ({ children, center, mt }) => (
  <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', margin: `${mt ?? 16}px 0 9px`, textAlign: center ? 'center' : 'left' }}>
    {children}
  </h2>
);

interface NoteProps { num: string; title: string; accent: string; children: React.ReactNode; }
const Note: React.FC<NoteProps> = ({ num, title, accent, children }) => (
  <div className="brief-avoid" style={{ marginBottom: 15 }}>
    <h3 style={{ display: 'flex', alignItems: 'baseline', gap: 9, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 6px' }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: accent, border: `1px solid ${accent}`, borderRadius: 4, padding: '1px 5px', letterSpacing: 0, flex: 'none' }}>{num}</span>
      <span>{title}</span>
    </h3>
    {children}
  </div>
);

const P: React.FC<{ children: React.ReactNode; mt?: number }> = ({ children, mt }) => (
  <p style={{ margin: `${mt ?? 0}px 0 9px`, fontSize: 10.5, lineHeight: 1.55 }}>{children}</p>
);

interface MiniRow { label: React.ReactNode; value: React.ReactNode; neg?: boolean; tot?: boolean; }
const MiniTable: React.FC<{ rows: MiniRow[]; minWidth?: string }> = ({ rows, minWidth }) => (
  <table style={{ width: '100%', minWidth, borderCollapse: 'collapse', fontSize: 10.5, margin: '6px 0', fontVariantNumeric: 'tabular-nums' }}>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i}>
          <td style={{ padding: '5px 10px 5px 0', borderBottom: r.tot ? 'none' : `1px solid ${LINE}`, borderTop: r.tot ? `1.5px solid ${LINE_STRONG}` : undefined, fontWeight: r.tot ? 700 : undefined }}>{r.label}</td>
          <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: r.tot ? 700 : 600, borderBottom: r.tot ? 'none' : `1px solid ${LINE}`, borderTop: r.tot ? `1.5px solid ${LINE_STRONG}` : undefined, color: r.neg ? NEG : undefined }}>{r.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Callout: React.FC<{ accent: string; soft: string; deep: string; children: React.ReactNode }> = ({ accent, soft, deep, children }) => (
  <div className="brief-avoid" style={{ background: soft, border: `1px solid ${mixWhite(accent, 0.6)}`, borderRadius: 8, padding: '11px 14px', margin: '6px 0 14px', fontSize: 10, lineHeight: 1.55, color: INK }}>
    {children}
  </div>
);

// ── KV row used in the goal hero + summary grid ──────────────────────────────
const KV: React.FC<{ k: string; v: React.ReactNode; neg?: boolean; pos?: boolean; total?: boolean }> = ({ k, v, neg, pos, total }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2.5px 0', fontSize: 10.5, borderTop: total ? `1px solid ${LINE}` : undefined, marginTop: total ? 5 : undefined, paddingTop: total ? 5 : undefined }}>
    <span style={{ color: total ? INK : MUTED, fontWeight: total ? 700 : 400 }}>{k}</span>
    <span style={{ fontWeight: total ? 700 : 600, fontVariantNumeric: 'tabular-nums', color: neg ? NEG : pos ? POS : INK }}>{v}</span>
  </div>
);

// ── Major part wrapper ───────────────────────────────────────────────────────
// Each Part starts on a fresh printed page (`.brief-part { break-before: page }`
// in the print stylesheet); the first Part suppresses the leading break. Physical
// page size and margins come from `@page`, so no fixed width/height here — content
// flows and the browser print engine paginates it cleanly across data sizes.
const Part: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <section
    className="brief-part"
    style={{
      background: '#fff',
      color: INK,
      fontFamily: FONT,
      fontSize: 11,
      lineHeight: 1.5,
    }}
  >
    {children}
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
export const PortfolioBriefReport: React.FC<{ meta: ReportMeta }> = ({ meta }) => {
  const { portfolioGrowthData, cashflowData, roadmapData, propertyProjections } = usePortfolioProjection();
  const { timelineProperties } = useAffordabilityCalculator();
  const { instances } = usePropertyInstance();
  const { profile } = useInvestmentProfile();

  // Accent tracks the firm's brand colour. Branding defaults primaryColor to a
  // neutral black (`#000000`) when a firm hasn't picked a real brand colour, and
  // a greyscale accent would render the whole brief monochrome. So treat any
  // unset/greyscale brand colour as "use the PropPath purple", giving the brief
  // its designed look unless the firm has chosen an actual hue. When the accent
  // is the purple default, use the mockup's exact soft/deep tokens so the brief
  // is pixel-faithful; for real custom colours, derive matching tints.
  const DEFAULT_ACCENT = '#7C5CFC';
  const isNeutralBrand = (hex: string): boolean => {
    const [r, g, b] = hexToRgb(hex);
    return Math.max(r, g, b) - Math.min(r, g, b) <= 12; // greyscale → no real hue
  };
  const rawAccent = meta.branding.primaryColor || DEFAULT_ACCENT;
  const accent = isNeutralBrand(rawAccent) ? DEFAULT_ACCENT : rawAccent;
  const isDefaultAccent = accent.toLowerCase() === DEFAULT_ACCENT.toLowerCase();
  const accentSoft = isDefaultAccent ? '#F4F1FE' : mixWhite(accent, 0.92);
  const accentDeep = isDefaultAccent ? '#5B3FD6' : darken(accent, 0.2);
  const accentAreaFill = `rgba(${hexToRgb(accent).join(',')},0.10)`;
  const companyName = meta.branding.companyName || 'Your Firm';
  const clientName = meta.clientName || 'Your Portfolio';
  const dateLabel = todayLabel();

  // ── Portfolio-level figures ────────────────────────────────────────────────
  const horizonYears = profile?.timelineYears ?? 20;
  const planEndYear = BASE_YEAR + horizonYears - 1;
  const equityGoal = profile?.equityGoal ?? 0;
  const cashflowGoal = profile?.cashflowGoal ?? 0;

  const lastGrowth = portfolioGrowthData[portfolioGrowthData.length - 1];
  const portfolioValueEnd = lastGrowth?.portfolioValue ?? 0;
  const totalEquityEnd = lastGrowth?.equity ?? 0;

  const netCfOf = (cf: (typeof cashflowData)[number] | null | undefined) =>
    cf ? (cf.cashflow ?? (cf.rentalIncome - cf.expenses - cf.loanRepayments)) : 0;
  const lastCf = cashflowData[cashflowData.length - 1];
  const netCashflowEnd = Math.round(netCfOf(lastCf));

  // equity goal year
  let equityTargetYear: number | null = null;
  let equityGoalIdx: number | null = null;
  portfolioGrowthData.forEach((g, i) => {
    if (equityTargetYear === null && equityGoal > 0 && (g.equity ?? 0) >= equityGoal) {
      equityTargetYear = Number(g.year);
      equityGoalIdx = i;
    }
  });
  // first cashflow-positive year index
  let cfPositiveIdx: number | null = null;
  let cfPositiveYear: number | null = null;
  cashflowData.forEach((cf, i) => {
    if (cfPositiveIdx === null && netCfOf(cf) >= 0) { cfPositiveIdx = i; cfPositiveYear = Number(cf.year); }
  });

  const bought = timelineProperties.filter(p => p.status === 'feasible' || p.status === 'challenging');
  const propertyCount = bought.length;
  const purchaseYears = bought.map(p => Math.floor(p.affordableYear));
  const lastPurchaseYear = purchaseYears.length ? Math.max(...purchaseYears) : BASE_YEAR;
  const propertiesByYearOffset = Math.max(1, lastPurchaseYear - BASE_YEAR);

  // borrowing headroom after the last purchase
  const lastBought = bought[bought.length - 1];
  const borrowingHeadroom =
    lastBought?.borrowingCapacityRemaining ??
    Math.max(0, (profile?.borrowingCapacity ?? 0) - (lastGrowth?.totalDebt ?? 0));

  // per-property annual holding figures for the timeline table
  const holdingFor = (p: (typeof timelineProperties)[number]) => {
    const inst = instances[p.instanceId];
    if (!inst) return { net: p.netCashflow ?? 0, costs: 0 };
    try {
      const cf = calculateDetailedCashflow(inst, p.loanAmount, profile?.vacancyRate);
      return {
        net: inst.netAnnualCashflowOverride ?? cf.netAnnualCashflow,
        costs: (inst.totalExpensesOverride ?? cf.totalOperatingExpenses) + cf.totalNonDeductibleExpenses,
      };
    } catch {
      return { net: p.netCashflow ?? 0, costs: 0 };
    }
  };

  // ── Next purchase deep-dive ────────────────────────────────────────────────
  const nextProp = timelineProperties.find(p => p.status === 'feasible') || bought[0];
  const inst = nextProp ? instances[nextProp.instanceId] : null;
  const projection = nextProp ? propertyProjections.get(nextProp.instanceId) ?? null : null;
  let cashflow: ReturnType<typeof calculateDetailedCashflow> | null = null;
  try {
    if (inst && nextProp) cashflow = calculateDetailedCashflow(inst, nextProp.loanAmount, profile?.vacancyRate);
  } catch { cashflow = null; }

  const hasNext = !!(nextProp && inst && projection && cashflow);

  // Derived next-purchase figures (only valid when hasNext)
  const purchasePrice = inst?.purchasePrice ?? 0;
  const acqCosts = nextProp?.acquisitionCosts;
  const deposit = inst?.depositOverride ?? nextProp?.depositRequired ?? 0;
  const stampDuty = acqCosts?.stampDuty ?? inst?.stampDutyOverride ?? 0;
  const lmi = inst?.lmiOverride ?? acqCosts?.lmi ?? 0;
  const totalCash = inst?.totalCashRequiredOverride ?? nextProp?.totalCashRequired ?? 0;
  const loanAmount = inst?.loanAmountOverride ?? nextProp?.loanAmount ?? 0;
  const valuation = inst?.valuationAtPurchase ?? purchasePrice;
  const lvr = inst?.lvr ?? 0;
  const interestRate = inst?.interestRate ?? 0;
  const entity = inst?.entity ?? 'individual';
  const entityLabel = entity.charAt(0).toUpperCase() + entity.slice(1);
  const state = inst?.state ?? '–';
  const grossYield = purchasePrice > 0 ? calcGrossYield(inst?.rentPerWeek ?? 0, purchasePrice) : 0;
  const purchaseYear = projection?.purchaseYear ?? (nextProp ? Math.floor(nextProp.affordableYear) : BASE_YEAR);

  const opexExclInterest = cashflow
    ? (cashflow.totalOperatingExpenses - cashflow.loanInterest) + cashflow.totalNonDeductibleExpenses
    : 0;
  const totalExpenses = cashflow
    ? (inst?.totalExpensesOverride ?? cashflow.totalOperatingExpenses) + cashflow.totalNonDeductibleExpenses
    : 0;
  const netAnnualCf = cashflow ? (inst?.netAnnualCashflowOverride ?? cashflow.netAnnualCashflow) : 0;
  const netYield = purchasePrice > 0 && cashflow ? ((cashflow.adjustedIncome - opexExclInterest) / purchasePrice) * 100 : 0;

  // growth stepped label
  const growthAssumption = inst?.growthAssumption ?? 'Medium';
  const growthLabel =
    growthAssumption === 'High' ? '12.5% → 6%'
      : growthAssumption === 'Low' ? '5% → 3%'
        : '6% → 5%';

  // year rows lookups
  const yearRows: PerPropertyYearRow[] = projection?.yearRows ?? [];
  const rowAt = (yr: number) => yearRows.find(r => r.year === yr) || null;
  const maxYear = yearRows.reduce((m, r) => Math.max(m, r.year), 0);
  const SELL = Math.min(10, maxYear || 10);
  const r10 = rowAt(SELL);
  const r20 = rowAt(Math.min(20, maxYear)) || yearRows[yearRows.length - 1] || null;
  const r1 = rowAt(1);

  // projection table columns (At purchase, Yr1,2,3,5,10)
  const projCols = [1, 2, 3, 5, SELL];

  // equity / cashflow series for the next-purchase charts
  const npYears = yearRows.map(r => BASE_YEAR + r.year).filter((_, i) => yearRows[i].year >= 1);
  const npEquity = yearRows.filter(r => r.year >= 1).map(r => r.equity);
  const npCashflow = yearRows.filter(r => r.year >= 1).map(r => r.netCashflow);
  const npEndYear = npYears.length ? npYears[npYears.length - 1] : planEndYear;

  // ── "If sold at year 10" CGT ───────────────────────────────────────────────
  const saleValue = r10?.propertyValue ?? 0;
  const sellingCostsPct = profile?.sellingCostsPercent ?? 3;
  const sellingCosts = saleValue * (sellingCostsPct / 100);
  const loanPayout = r10?.loanBalance ?? loanAmount;
  const cashBeforeTax = saleValue - sellingCosts - loanPayout;
  const cgtCostBase = purchasePrice + (acqCosts?.total ?? 0);
  const cgtGain = Math.max(0, saleValue - cgtCostBase);
  const cgt = hasNext && profile ? calculateCgtComparison({
    entity: entity as 'individual' | 'trust' | 'company' | 'smsf',
    profile,
    capitalGain: cgtGain,
    costBase: cgtCostBase,
    holdStartYear: purchaseYear,
    saleYear: purchaseYear + SELL,
    isNewBuild: inst?.isNewBuild,
  }) : null;
  const discount = profile?.cgtOneYearDiscount ?? 0.5;
  const marginalRate = profile?.marginalTaxRate ?? 0.45;
  const cgtAmount = cgt?.current.cgt ?? 0;
  const netCashReleased = cashBeforeTax - cgtAmount;

  // portfolio chart series
  const equitySeries = portfolioGrowthData.map(g => g.equity ?? 0);
  const equityYears = portfolioGrowthData.map(g => Number(g.year));
  const cfSeries = cashflowData.map(cf => Math.round(netCfOf(cf)));
  const cfYears = cashflowData.map(cf => Number(cf.year));

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ═══════════ PART 1 — GOAL · TIMELINE ═══════════ */}
      <Part>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${INK}`, paddingBottom: 10, marginBottom: 14 }}>
          <Brand name={companyName} accent={accent} logoUrl={meta.branding.logoUrl} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Portfolio Brief</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Descriptive analysis · {dateLabel}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 14px', marginBottom: 14, fontSize: 11 }}>
          <div style={{ color: MUTED, textAlign: 'right' }}>Prepared for</div><div style={{ fontWeight: 600 }}>{clientName}</div>
          <div style={{ color: MUTED, textAlign: 'right' }}>Buyers' agent</div><div style={{ fontWeight: 600 }}>{companyName}</div>
        </div>

        {/* Goal hero */}
        <div className="brief-avoid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', border: `1px solid ${LINE_STRONG}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ background: accentSoft, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: accentDeep }}>Client's goal</div>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, margin: '6px 0 5px', letterSpacing: '-1px' }}>{horizonYears} years</div>
            <div style={{ fontSize: 11, color: accentDeep, lineHeight: 1.45 }}>to reach {compact(equityGoal)} equity and {compact(cashflowGoal)} a year in income</div>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: MUTED, marginBottom: 5 }}>Where the plan reaches in {horizonYears} years</div>
            {[
              ['Equity', compact(totalEquityEnd)],
              ['Portfolio value', compact(portfolioValueEnd)],
              ['Net cashflow', `${compact(netCashflowEnd)}/yr`],
              ['Properties', `${propertyCount} by year ${propertiesByYearOffset}`],
            ].map(([k, v], i, arr) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${LINE}` }}>
                <span style={{ fontSize: 11, color: MUTED }}>{k}</span>
                <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <SectionH>The property timeline</SectionH>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5, fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              {['Year', 'Growth', 'Entity', 'State', 'Price', 'LVR', 'Rate', 'Rent/wk', 'Yield', 'Holding /yr', 'Costs'].map((h, i) => (
                <th key={h} style={{ padding: '7px 6px', textAlign: i === 0 ? 'left' : 'right', borderBottom: `1.5px solid ${LINE_STRONG}`, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.2px', color: MUTED, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bought.map((p, idx) => {
              const pi = instances[p.instanceId];
              const h = holdingFor(p);
              const gy = pi && pi.purchasePrice > 0 ? calcGrossYield(pi.rentPerWeek, pi.purchasePrice) : 0;
              const isFirst = nextProp && p.instanceId === nextProp.instanceId;
              return (
                <tr key={p.instanceId} style={{ background: isFirst ? accentSoft : undefined }}>
                  <td style={{ padding: '7px 6px', textAlign: 'left', borderBottom: `1px solid ${LINE}`, fontWeight: 700, whiteSpace: 'nowrap' }}>{Math.floor(p.affordableYear)}</td>
                  <td style={tdR}>{pi?.growthAssumption ?? '–'}</td>
                  <td style={tdR}>{pi?.entity ? pi.entity.charAt(0).toUpperCase() + pi.entity.slice(1) : '–'}</td>
                  <td style={tdR}>{pi?.state ?? '–'}</td>
                  <td style={tdR}>{money(pi?.purchasePrice ?? p.cost)}</td>
                  <td style={tdR}>{pct(pi?.lvr ?? 0, 0)}</td>
                  <td style={tdR}>{pct(pi?.interestRate ?? 0, 2)}</td>
                  <td style={tdR}>{money(pi?.rentPerWeek ?? 0)}</td>
                  <td style={tdR}>{pct(gy)}</td>
                  <td style={{ ...tdR, color: h.net < 0 ? NEG : POS }}>{money(h.net)}</td>
                  <td style={tdR}>{money(h.costs)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 8.5, color: FAINT, marginTop: 7, lineHeight: 1.45 }}>
          {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} in the plan, bought interest only. The first purchase (highlighted) is detailed in full in the next-purchase section. Holding /yr is the modelled annual net cashflow for that property; Costs is its total annual holding cost.
        </p>
      </Part>

      {/* ═══════════ PART 2 — EQUITY & CASHFLOW CHARTS ═══════════ */}
      <Part>
        <RunHead left={`${companyName} — Portfolio Brief`} right="Equity & cashflow" />
        <SectionH mt={4}>Equity and cashflow over the plan</SectionH>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={chartCard}>
            <div style={chHead}><span style={chTitle}>Total equity</span><span style={chVal}>{equityYears[0]} – {equityYears[equityYears.length - 1]}</span></div>
            <div style={chBig}>{compact(totalEquityEnd)} <small style={chSmall}>by {equityYears[equityYears.length - 1]}</small></div>
            <LineChartSvg values={equitySeries} years={equityYears} stroke={accent} area={accentAreaFill} baselineZero goalIndex={equityGoalIdx} goalLabel="Goal ✓" goalColor={accent} />
          </div>
          <div style={chartCard}>
            <div style={chHead}><span style={chTitle}>Net cashflow</span><span style={chVal}>{cfYears[0]} – {cfYears[cfYears.length - 1]}</span></div>
            <div style={chBig}>{money(netCashflowEnd)} <small style={chSmall}>/yr by {cfYears[cfYears.length - 1]}</small></div>
            <LineChartSvg values={cfSeries} years={cfYears} stroke={accent} goalIndex={cfPositiveIdx} goalLabel="CF positive ✓" goalColor={POS} />
          </div>
        </div>
      </Part>

      {/* ═══════════ PART 3 — HOW THE PLAN WORKS ═══════════ */}
      <Part>
        <RunHead left={`${companyName} — Portfolio Brief`} right="The plan" />
        <Callout accent={accent} soft={accentSoft} deep={accentDeep}>
          <b style={{ color: accentDeep }}>How to read this plan.</b> The plan is anchored to the client's goal and timeframe. Each figure is shown as progress toward that goal, not as a fixed forecast. Properties are added one at a time, and each new purchase updates the equity, cashflow and borrowing position. {cfPositiveYear ? `The plan is modelled to turn cashflow positive around ${cfPositiveYear}.` : 'The plan runs at a holding cost in the early years.'} The income goal is reached in the retirement phase through a partial sell-down, set out in the separate retirement scenario.
        </Callout>

        <SectionH mt={6}>How the plan works</SectionH>
        <Note num="A" title="Goal first" accent={accent}>
          <P>Every number in this brief is expressed as progress toward the client's stated goal and timeframe, {compact(equityGoal)} equity and {compact(cashflowGoal)} a year in income within {horizonYears} years. The equity and cashflow curves shown earlier show the shape of that path. {equityTargetYear ? `The goal marker shows the point the equity target is modelled to be reached, around ${equityTargetYear}.` : 'The goal marker shows the modelled progress toward the equity target.'}</P>
        </Note>
        <Note num="B" title="One property at a time" accent={accent}>
          <P>The plan is built incrementally. Each purchase decision is based on the client's position at that point, the equity available, the borrowing capacity, and the cashflow the existing properties carry. Adding a property updates every downstream figure. The plan is a living document that moves with the client's real position, not a single forecast run once and filed away.</P>
        </Note>
        <Note num="C" title="Borrowing capacity" accent={accent}>
          <P>The plan tracks remaining borrowing headroom, modelled here at about {money(borrowingHeadroom)} after the {propertyCount === 1 ? 'purchase' : `${propertyCount} purchases`}. These figures are indicative estimates to support planning. They are not a credit assessment and not an offer of finance. Actual borrowing capacity is determined by a lender at the time of each application.</P>
        </Note>
        <Note num="D" title="Cashflow over the plan" accent={accent}>
          <P>In the early years the portfolio runs at a holding cost as each new property is added. As rents rise and the loans hold under interest only, the combined position improves each year{cfPositiveYear ? ` and is modelled to turn cashflow positive around ${cfPositiveYear}` : ''}, building toward an estimated {money(netCashflowEnd)} a year by {cfYears[cfYears.length - 1]}. The income goal is met in the retirement phase, where selected properties are sold down to clear debt and lift net income.</P>
        </Note>
      </Part>

      {hasNext ? (
        <>
          {/* ═══════════ PART 4 — NEXT PURCHASE SUMMARY ═══════════ */}
          <Part>
            <RunHead left={`${companyName} — Portfolio Brief`} right="The next purchase" />
            <div style={{ background: INK, color: '#fff', borderRadius: 8, padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.6px', textTransform: 'uppercase', color: mixWhite(accent, 0.5) }}>Part 2</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>The next purchase</div>
              </div>
              <div style={{ fontSize: 10, color: '#C9C4E4', textAlign: 'right' }}>
                Property 1 of {propertyCount}<br />{nextProp.title || 'Next purchase'}
              </div>
            </div>

            <SectionH center mt={4}>Summary</SectionH>
            <div className="brief-avoid" style={{ border: `1px solid ${LINE_STRONG}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr 1fr' }}>
                <div style={{ padding: '13px 15px' }}>
                  <h3 style={sumH(accentDeep)}>Assumptions</h3>
                  <KV k="Purchase price" v={money(purchasePrice)} />
                  <KV k="Cash required" v={money(totalCash)} />
                  <KV k="Gross yield" v={pct(grossYield, 2)} />
                  <KV k="Net yield" v={pct(netYield, 2)} />
                  <KV k="Growth (stepped)" v={growthLabel} />
                  <KV k="Inflation" v={pct((profile?.inflationRate ?? 0.03) * 100, 2)} />
                  <KV k="Interest rate" v={pct(interestRate, 2)} />
                  <KV k="Entity" v={entityLabel} />
                  <KV k="State" v={state} />
                </div>
                <div style={{ padding: '13px 15px', borderLeft: `1px solid ${LINE}` }}>
                  <h3 style={sumH(accentDeep)}>Projected over {SELL} years</h3>
                  <KV k="Property value" v={money(r10?.propertyValue ?? 0)} />
                  <KV k="Equity" v={money(r10?.equity ?? 0)} />
                  <KV k="Total performance" v={money(r10?.totalPerformance ?? 0)} />
                  <KV k="Net cashflow /yr" v={money(r10?.netCashflow ?? 0)} neg={(r10?.netCashflow ?? 0) < 0} pos={(r10?.netCashflow ?? 0) >= 0} />
                  <KV k="Return on capital" v={pct(r10?.roic ?? 0)} />
                  <KV k="Capital returned in" v={`${projection.capitalReturnedInYears} years`} total />
                </div>
                <div style={{ padding: '13px 15px', borderLeft: `1px solid ${LINE}` }}>
                  <h3 style={sumH(accentDeep)}>If sold at year {SELL}</h3>
                  <KV k="Sale price" v={money(saleValue)} />
                  <KV k="Selling costs" v={money(-sellingCosts)} neg />
                  <KV k="Loan payout" v={money(-loanPayout)} neg />
                  <KV k="Estimated CGT" v={money(-cgtAmount)} neg />
                  <KV k="Net cash released" v={money(netCashReleased)} total />
                </div>
              </div>
            </div>

            <SectionH center>Projections over {SELL} years</SectionH>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr>
                  {['Investment analysis', 'At purchase', ...projCols.map(y => `Yr ${y}`)].map((h, i) => (
                    <th key={h} style={{ padding: '5px 6px', textAlign: i === 0 ? 'left' : 'right', borderBottom: `1.5px solid ${LINE_STRONG}`, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.3px', color: i === 0 ? INK : MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ProjRow label="Property value" lead vals={[money(purchasePrice), ...projCols.map(y => money(rowAt(y)?.propertyValue ?? 0))]} />
                <ProjRow label="Loan amount" vals={[moneyNoSign(loanAmount), ...projCols.map(y => moneyNoSign(rowAt(y)?.loanBalance ?? 0))]} />
                <ProjRow label="Equity" lead vals={[money(purchasePrice - loanAmount), ...projCols.map(y => money(rowAt(y)?.equity ?? 0))]} />
                <SpacerRow />
                <ProjRow label="Gross rent /wk" vals={[money(inst.rentPerWeek), ...projCols.map(y => money((rowAt(y)?.grossIncome ?? 0) / 52))]} />
                <ProjRow label="Interest (I/O)" vals={['–', ...projCols.map(y => moneyNoSign(rowAt(y)?.interestExpense ?? 0))]} />
                <ProjRow label="Operating expenses" vals={['–', ...projCols.map(y => moneyNoSign(rowAt(y)?.operatingExpenses ?? 0))]} />
                <ProjRow label="Net cashflow /yr" band vals={['–', ...projCols.map(y => ({ t: numSigned(rowAt(y)?.netCashflow ?? 0), neg: (rowAt(y)?.netCashflow ?? 0) < 0 }))]} />
                <ProjRow label="Net cashflow /wk" vals={['–', ...projCols.map(y => ({ t: numSigned((rowAt(y)?.netCashflow ?? 0) / 52), neg: (rowAt(y)?.netCashflow ?? 0) < 0 }))]} />
                <SpacerRow />
                <ProjRow label="Capital growth (cumulative)" vals={['–', ...projCols.map(y => moneyNoSign(rowAt(y)?.capitalGrowthCumulative ?? 0))]} />
                <ProjRow label="Total performance" lead vals={['–', ...projCols.map(y => money(rowAt(y)?.totalPerformance ?? 0))]} />
                <ProjRow label="Return on invested capital" vals={['–', ...projCols.map(y => pct(rowAt(y)?.roic ?? 0))]} />
              </tbody>
            </table>
            <p style={{ fontSize: 8.5, color: FAINT, marginTop: 7, lineHeight: 1.45 }}>
              Forward years reflect rent grown with inflation; the current-rent position of {money(netAnnualCf)} per year is set out under Annual cashflow. The loan is interest only, so the balance holds until the interest only period ends.
            </p>
          </Part>

          {/* ═══════════ PART 5 — NEXT PURCHASE PROJECTIONS ═══════════ */}
          <Part>
            <RunHead left={`${companyName} — The next purchase`} right="Projections" />
            <SectionH mt={4}>Cashflow and equity over the first purchase</SectionH>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={chartCard}>
                <div style={chHead}><span style={chTitle}>Equity growth</span><span style={chVal}>{BASE_YEAR} – {npEndYear}</span></div>
                <div style={chBig}>{compact(npEquity[npEquity.length - 1] ?? 0)} <small style={chSmall}>by {npEndYear}</small></div>
                <LineChartSvg values={npEquity} years={npYears} stroke={POS} area="rgba(31,157,98,0.10)" baselineZero />
                <div style={projStats}>
                  <div>
                    <div style={statT}>Capital growth (cumulative)</div>
                    <StatRow k="Year 1" v={money(r1?.capitalGrowthCumulative ?? 0)} />
                    <StatRow k={`Year ${SELL}`} v={money(r10?.capitalGrowthCumulative ?? 0)} />
                    <StatRow k={`Year ${r20?.year ?? ''}`} v={money(r20?.capitalGrowthCumulative ?? 0)} />
                  </div>
                  <div>
                    <div style={statT}>Equity</div>
                    <StatRow k="Year 1" v={money(r1?.equity ?? 0)} />
                    <StatRow k={`Year ${SELL}`} v={money(r10?.equity ?? 0)} />
                    <StatRow k={`Year ${r20?.year ?? ''}`} v={money(r20?.equity ?? 0)} />
                  </div>
                </div>
              </div>
              <div style={chartCard}>
                <div style={chHead}><span style={chTitle}>Net cashflow</span><span style={chVal}>{BASE_YEAR} – {npEndYear}</span></div>
                <div style={chBig}>{money(npCashflow[npCashflow.length - 1] ?? 0)} <small style={chSmall}>/yr by {npEndYear}</small></div>
                <LineChartSvg values={npCashflow} years={npYears} stroke={accent} />
                <div style={projStats}>
                  <div>
                    <div style={statT}>Net cashflow</div>
                    <StatRow k="Year 1" v={money(r1?.netCashflow ?? 0)} neg={(r1?.netCashflow ?? 0) < 0} />
                    <StatRow k={`Year ${SELL}`} v={money(r10?.netCashflow ?? 0)} neg={(r10?.netCashflow ?? 0) < 0} />
                    <StatRow k={`Year ${r20?.year ?? ''}`} v={money(r20?.netCashflow ?? 0)} neg={(r20?.netCashflow ?? 0) < 0} />
                  </div>
                  <div>
                    <div style={statT}>Gross yield</div>
                    <StatRow k="Year 1" v={pct(r1?.grossYieldPct ?? 0)} />
                    <StatRow k={`Year ${SELL}`} v={pct(r10?.grossYieldPct ?? 0)} />
                    <StatRow k={`Year ${r20?.year ?? ''}`} v={pct(r20?.grossYieldPct ?? 0)} />
                  </div>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 8.5, color: FAINT, marginTop: 11, lineHeight: 1.45 }}>
              First purchase only. Equity grows through capital growth while the loan holds under interest only. Net cashflow improves as rent rises against the fixed interest only repayment. Figures are estimates based on the assumptions entered.
            </p>
          </Part>

          {/* ═══════════ PART 6 — NOTES 1-4 ═══════════ */}
          <Part>
            <RunHead left={`${companyName} — The next purchase`} right="Detailed notes" />
            <Callout accent={accent} soft={accentSoft} deep={accentDeep}>
              <b style={{ color: accentDeep }}>How this section works.</b> This part models the first purchase in full. Every figure is calculated from the inputs your buyers' agent has entered. Confirmed numbers, such as the purchase price and current rent, are shown as entered. Forward numbers, such as future value and rent, are estimates based on the assumptions listed and will not play out exactly. This is a planning tool, not a recommendation.
            </Callout>
            <Note num="1" title="Purchase price and valuation" accent={accent}>
              <P>The purchase price is what the property is being bought for. The valuation is the lender's assessed value, used to set the loan. The loan is calculated against the valuation, not the price, so a valuation below price increases the cash you need to contribute at settlement.</P>
              <MiniTable rows={[
                { label: 'Purchase price', value: money(purchasePrice) },
                { label: 'Valuation', value: money(valuation) },
                { label: 'Loan to value ratio (LVR)', value: pct(lvr, 0) },
                { label: 'Loan amount', value: money(loanAmount), tot: true },
              ]} />
            </Note>
            <Note num="2" title="Purchase costs and cash required" accent={accent}>
              <P>These are the one-off costs to complete the purchase, on top of your deposit. Stamp duty is the largest and is set by the state, in this case {state}. Lenders mortgage insurance (LMI) applies when the loan is above 80% of value. The remaining items cover inspections, conveyancing, your buyers' agent engagement fee, and a buffer for early holding and maintenance costs.</P>
              <MiniTable rows={[
                { label: 'Deposit', value: money(deposit) },
                { label: 'Stamp duty', value: money(stampDuty) },
                { label: 'LMI (capitalised to loan)', value: money(lmi) },
                { label: 'Engagement fee', value: money(inst.engagementFee ?? 0) },
                { label: 'Holding deposit', value: money(inst.conditionalHoldingDeposit ?? 0) },
                { label: 'Insurance, inspections, legals, fees', value: money((inst.buildingInsuranceUpfront ?? 0) + (inst.buildingPestInspection ?? 0) + (inst.plumbingElectricalInspections ?? 0) + (inst.independentValuation ?? 0) + (inst.conveyancing ?? 0) + (inst.mortgageFees ?? 0)) },
                { label: 'Total cash required', value: money(totalCash), tot: true },
              ]} />
            </Note>
            <Note num="3" title="Funding and loan" accent={accent}>
              <P>This shows where the settlement cash comes from and how the loan is structured. Cash is funds you contribute directly. Savings and equity release are other sources your buyers' agent can model if you draw on existing assets. The loan is {inst.loanProduct === 'IO' ? 'interest only for the first term, which keeps holding costs lower while the portfolio is built, then converts to principal and interest' : 'principal and interest'}.</P>
              <MiniTable rows={[
                { label: 'Cash', value: money(nextProp.fundingBreakdown?.cash ?? totalCash) },
                { label: 'Savings', value: money(nextProp.fundingBreakdown?.savings ?? 0) },
                { label: 'Equity release', value: money(nextProp.fundingBreakdown?.equity ?? 0) },
                { label: 'Total funded', value: money(nextProp.fundingBreakdown?.total ?? totalCash), tot: true },
              ]} />
              <p style={{ marginTop: 8, fontSize: 10.5 }}>
                <span style={{ display: 'inline-block', background: accentSoft, color: accentDeep, borderRadius: 5, padding: '1px 7px', fontSize: 9, fontWeight: 600 }}>Loan</span>
                &nbsp; {money(loanAmount)} &nbsp;·&nbsp; {inst.loanProduct === 'IO' ? 'Interest only' : 'Principal & interest'} &nbsp;·&nbsp; {pct(interestRate, 2)} &nbsp;·&nbsp; {inst.loanTerm ?? 30} year term
              </p>
            </Note>
            <Note num="4" title="Capital growth and inflation" accent={accent}>
              <P>Capital growth is the assumed annual rate the property value rises. This brief uses a stepped {growthAssumption} assumption ({growthLabel}), reflecting stronger early growth settling to a long-run rate. Inflation is assumed at {pct((profile?.inflationRate ?? 0.03) * 100, 1)}, applied to rents and costs. These are assumptions, not forecasts, and should be read as a direction, not a promise.</P>
            </Note>
          </Part>

          {/* ═══════════ PART 7 — NOTES 5-9 ═══════════ */}
          <Part>
            <RunHead left={`${companyName} — The next purchase`} right="Detailed notes" />
            <Note num="5" title="Equity" accent={accent}>
              <P>Equity is the property value less the loan. On an interest only loan, equity grows mainly through capital growth rather than debt reduction. It builds from {money(purchasePrice - loanAmount)} at purchase to an estimated {money(r10?.equity ?? 0)} by year {SELL}. This is the equity that can later support the next purchase or be realised on sale.</P>
            </Note>
            <Note num="6" title="Loan product and interest" accent={accent}>
              <P>The loan is {inst.loanProduct === 'IO' ? 'interest only' : 'principal and interest'} at {pct(interestRate, 2)} over a {inst.loanTerm ?? 30} year term. {inst.loanProduct === 'IO' ? 'Interest only means repayments cover interest with no reduction in the loan balance during the interest only period. This lowers the holding cost while the portfolio is built.' : ''} Interest of {money(cashflow.loanInterest)} a year is the largest single holding cost in this brief.</P>
            </Note>
            <Note num="7" title="Rent and vacancy" accent={accent}>
              <P>Rent is set at {money(inst.rentPerWeek)} per week, a gross yield of {pct(grossYield)} on the purchase price. A vacancy allowance is deducted to reflect periods the property is untenanted, giving adjusted income. Rent is assumed to rise with inflation, so the gross yield drifts down over time as the value grows faster than the rent.</P>
              <MiniTable rows={[
                { label: 'Rent per week', value: money(inst.rentPerWeek) },
                { label: 'Gross annual income', value: money(cashflow.grossAnnualIncome) },
                { label: 'Vacancy allowance', value: money(-cashflow.vacancyAmount), neg: true },
                { label: 'Adjusted income', value: money(cashflow.adjustedIncome), tot: true },
              ]} />
            </Note>
            <Note num="8" title="Operating expenses" accent={accent}>
              <P>These are the ongoing costs of holding the property. Property management is charged at {pct(inst.propertyManagementPercent ?? 8, 0)} of rent. The remaining items, building insurance, council rates and water, strata where it applies, maintenance and land tax, are the standard running costs.</P>
              <MiniTable rows={[
                { label: 'Loan interest', value: money(cashflow.loanInterest) },
                { label: `Property management (${pct(inst.propertyManagementPercent ?? 8, 0)})`, value: money(cashflow.propertyManagementFee) },
                { label: 'Building insurance', value: money(cashflow.buildingInsurance) },
                { label: 'Council rates + water', value: money(cashflow.councilRatesWater) },
                { label: 'Maintenance', value: money(cashflow.maintenance) },
                { label: 'Strata / land tax', value: money(cashflow.strata + cashflow.landTax) },
                { label: 'Total expenses', value: money(totalExpenses), tot: true },
              ]} />
            </Note>
            <Note num="9" title="Annual cashflow" accent={accent}>
              <P>Net cashflow is the cash position after rent, loan interest and all operating costs, before tax. On the current rent the property runs at about {money(netAnnualCf)} a year, or {money(cashflow.netWeeklyCashflow)} a week. As rent rises and the loan holds under interest only, the shortfall narrows each year. This brief does not model tax offsets; any negative gearing benefit would reduce the holding cost further and is a matter for your accountant.</P>
              <MiniTable rows={[
                { label: 'Adjusted rental income', value: money(cashflow.adjustedIncome) },
                { label: 'Less total expenses', value: money(-totalExpenses), neg: true },
                { label: 'Net annual cashflow', value: money(netAnnualCf), neg: netAnnualCf < 0, tot: true },
              ]} />
            </Note>
          </Part>

          {/* ═══════════ PART 8 — NOTES 10-12 ═══════════ */}
          <Part>
            <RunHead left={`${companyName} — The next purchase`} right="Performance" />
            <Note num="10" title="Capital growth and total performance" accent={accent}>
              <P>Capital growth is the increase in property value. Net cashflow is the holding cost. Total performance combines the two: the growth gained less the cashflow spent. By year {SELL} total performance is an estimated {money(r10?.totalPerformance ?? 0)}. This is the number that captures whether the property is working, not the cashflow alone.</P>
              <MiniTable rows={[
                { label: `Capital growth (cumulative, year ${SELL})`, value: money(r10?.capitalGrowthCumulative ?? 0) },
                { label: `Net cashflow (cumulative, year ${SELL})`, value: money(r10?.netCashflowCumulative ?? 0), neg: (r10?.netCashflowCumulative ?? 0) < 0 },
                { label: `Total performance (year ${SELL})`, value: money(r10?.totalPerformance ?? 0), tot: true },
              ]} />
            </Note>
            <Note num="11" title="Return on invested capital and cash on cash" accent={accent}>
              <P>Return on invested capital measures total performance against the cash you put in, {money(totalCash)}. It reaches an estimated {pct(r10?.roic ?? 0)} by year {SELL}. Initial capital is estimated to be returned, in growth terms, within {projection.capitalReturnedInYears} years. Cash on cash return is the cumulative cash position alone against the cash invested, and stays negative while the property is held at a holding cost. The two read very differently because one counts growth and the other counts only cash in hand.</P>
              <MiniTable rows={[
                { label: 'Cash invested', value: money(totalCash) },
                { label: `Return on invested capital (year ${SELL})`, value: pct(r10?.roic ?? 0) },
                { label: `Cash on cash return (cumulative, year ${SELL})`, value: pct(r10?.cocReturnCumulative ?? 0), neg: (r10?.cocReturnCumulative ?? 0) < 0 },
                { label: 'Initial capital returned in', value: `${projection.capitalReturnedInYears} years`, tot: true },
              ]} />
            </Note>
            <Note num="12" title="Reading this against the goal" accent={accent}>
              <P>This property is the first of {propertyCount} in the plan toward {compact(equityGoal)} equity and {compact(cashflowGoal)} a year in income within {horizonYears} years. On its own it carries a holding cost in the early years and contributes the equity and growth that the next purchases build on. It should be read as one step in the portfolio, not as a standalone result. The full roadmap, borrowing capacity and retirement sell-down are set out in the portfolio plan at the start of this brief.</P>
            </Note>
          </Part>

          {/* ═══════════ PART 9 — IF SOLD ═══════════ */}
          <Part>
            <RunHead left={`${companyName} — The next purchase`} right="If sold" />
            <Note num="13" title={`If sold at year ${SELL}`} accent={accent}>
              <P>This illustrates the cash released if the property were sold at year {SELL}. From the sale price, selling costs (agent, marketing and legals) and the remaining loan are deducted to reach cash before tax. Capital gains tax is then estimated on the gain. {entity === 'individual' || entity === 'trust' ? `As ${entity === 'individual' ? 'an individual' : 'a trust'} holding longer than twelve months, the ${pct(discount * 100, 0)} discount method applies, shown here at a ${pct(marginalRate * 100, 0)} marginal rate.` : `The ${entityLabel} entity rate applies to the gain.`}</P>
              <MiniTable minWidth="70%" rows={[
                { label: `Sale price (year ${SELL})`, value: money(saleValue) },
                { label: 'Selling costs (agent, marketing, legal)', value: money(-sellingCosts), neg: true },
                { label: 'Loan payout', value: money(-loanPayout), neg: true },
                { label: 'Cash before tax', value: money(cashBeforeTax), tot: true },
              ]} />
              <div style={{ marginTop: 10 }}>
                <MiniTable minWidth="70%" rows={[
                  { label: 'Estimated capital gain', value: money(cgtGain) },
                  ...(entity === 'individual' || entity === 'trust'
                    ? [{ label: `Less ${pct(discount * 100, 0)} discount`, value: money(-(cgtGain * discount)), neg: true }]
                    : []),
                  { label: `Estimated CGT${entity === 'individual' || entity === 'trust' ? ` (at ${pct(marginalRate * 100, 0)})` : ''}`, value: money(-cgtAmount), neg: true },
                  { label: 'Net cash released', value: money(netCashReleased), tot: true },
                ]} />
              </div>
            </Note>
            <Callout accent={accent} soft={accentSoft} deep={accentDeep}>
              <b style={{ color: accentDeep }}>Two CGT methods, shown side by side.</b> PropPath presents both the {pct(discount * 100, 0)} discount method (current law) and the proposed indexation method, which would replace the discount with indexation of the cost base plus a 30% minimum rate from 1 July 2027. SMSFs would retain a one-third discount. The indexation change is proposed in the 2026 federal budget and is not yet law. The figures above use the {pct(discount * 100, 0)} discount method{cgt?.reform.inScope ? `; under the proposed indexation method the estimated CGT would be ${money(cgt.reform.cgt)}` : ''}. Which method produces a lower tax outcome depends on the holding period and the gain, which is why both are shown rather than one being chosen for you.
            </Callout>
          </Part>
        </>
      ) : (
        <>
          {/* Fallback parts when no next purchase exists */}
          {[4, 5, 6, 7, 8, 9].map(pn => (
            <Part key={pn}>
              <RunHead left={`${companyName} — The next purchase`} right="The next purchase" />
              <SectionH>The next purchase</SectionH>
              <P>No properties in the plan yet — add one to generate the next-purchase detail.</P>
            </Part>
          ))}
        </>
      )}

      {/* ═══════════ PART 10 — DISCLAIMER ═══════════ */}
      <Part>
        <RunHead left={`${companyName} — Portfolio Brief`} right="Important information" />
        <SectionH mt={6}>Important information</SectionH>
        <div style={{ border: `1px solid ${LINE_STRONG}`, borderRadius: 8, padding: '14px 16px', fontSize: 9.5, color: '#4B5563', lineHeight: 1.6, background: SHADE }}>
          <h3 style={{ margin: '0 0 7px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px', color: INK }}>This is a model, not advice</h3>
          <p style={{ margin: '0 0 8px' }}>This document is a financial model. It is not financial, investment, credit or tax advice, and it is not a product recommendation. {companyName} illustrates outcomes calculated from the inputs and assumptions entered by your buyers' agent. The figures are estimates and will change as those inputs change.</p>
          <p style={{ margin: '0 0 8px' }}>Projections of capital growth, rent, interest rates, costs and tax are assumptions only. They are not a forecast and not a guarantee of future performance. Property values and rents vary year to year, and the actual result will differ, potentially materially, from the figures shown.</p>
          <p style={{ margin: '0 0 8px' }}>Your buyers' agent remains responsible for any advice or recommendation provided to you. Tax figures, including capital gains tax, are general illustrations to support discussion and are not tax advice; confirm your position with a registered tax agent or accountant. The indexation capital gains method shown reflects a proposed 2027 change and is not law.</p>
          <p style={{ margin: 0 }}>Borrowing capacity and lender figures shown are indicative estimates and do not constitute a credit assessment or an offer of finance. Before acting, you should consider your own circumstances and obtain advice from a licensed professional.</p>
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Brand name={companyName} accent={accent} logoUrl={meta.branding.logoUrl} />
          <div style={{ textAlign: 'right', fontSize: 9, color: MUTED }}>
            Prepared for {clientName}<br />{dateLabel} · Prepared by {companyName}
          </div>
        </div>
      </Part>

      {/* Print-only running footer — repeats on every printed page */}
      <RunningFoot />
    </>
  );
};

// ── Style constants / helper rows ────────────────────────────────────────────
const tdR: React.CSSProperties = { padding: '7px 6px', textAlign: 'right', borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' };
const chartCard: React.CSSProperties = { border: `1px solid ${LINE}`, borderRadius: 10, padding: '14px 16px 10px', breakInside: 'avoid' };
const chHead: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' };
const chTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700 };
const chVal: React.CSSProperties = { fontSize: 9.5, color: MUTED };
const chBig: React.CSSProperties = { fontSize: 23, fontWeight: 700, letterSpacing: '-0.6px', marginTop: 2 };
const chSmall: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: MUTED, letterSpacing: 0 };
const projStats: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, marginTop: 11, paddingTop: 9, borderTop: `1px solid ${LINE}` };
const statT: React.CSSProperties = { fontSize: 8.5, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: MUTED, marginBottom: 4 };
const sumH = (deep: string): React.CSSProperties => ({ margin: '0 0 9px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: deep });

const StatRow: React.FC<{ k: string; v: string; neg?: boolean }> = ({ k, v, neg }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '2.5px 0' }}>
    <span style={{ color: MUTED }}>{k}</span>
    <b style={{ fontVariantNumeric: 'tabular-nums', color: neg ? NEG : POS }}>{v}</b>
  </div>
);

const SpacerRow: React.FC = () => <tr><td colSpan={7} style={{ height: 5, padding: 0, border: 'none' }} /></tr>;

type Cell = string | { t: string; neg?: boolean };
const ProjRow: React.FC<{ label: string; vals: Cell[]; lead?: boolean; band?: boolean }> = ({ label, vals, lead, band }) => (
  <tr style={{ background: band ? SHADE : undefined }}>
    <td style={{ padding: '5px 6px', textAlign: 'left', borderBottom: `1px solid ${LINE}`, color: lead ? INK : MUTED, fontWeight: lead ? 700 : 400 }}>{label}</td>
    {vals.map((c, i) => {
      const t = typeof c === 'string' ? c : c.t;
      const neg = typeof c === 'string' ? false : !!c.neg;
      return (
        <td key={i} style={{ padding: '5px 6px', textAlign: 'right', borderBottom: `1px solid ${LINE}`, fontWeight: lead ? 700 : 400, color: neg ? NEG : lead ? INK : INK }}>{t}</td>
      );
    })}
  </tr>
);

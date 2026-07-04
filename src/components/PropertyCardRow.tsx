/**
 * PropertyCardRow — editable property table on the dashboard.
 *
 * Two modes controlled by `mode` prop:
 *   equity   → value, growth, financing columns
 *   cashflow → income, expenses, purchase costs columns
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, Landmark, CalendarDays } from 'lucide-react';
import { AffordabilityAlert } from './ui/AffordabilityAlert';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { track, EVENTS } from '@/lib/analytics';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { usePortfolioProjection } from '../hooks/usePortfolioProjection';
import { useChangeReceipt } from '../contexts/ChangeReceiptContext';

// Human labels for the change log's cause line ("Property 2 — Rent/wk ($) 480 → 520").
// High-traffic instance fields; anything missing falls back to a humanized key.
const CHANGE_LOG_FIELD_LABELS: Partial<Record<keyof PropertyInstanceDetails, string>> = {
  purchasePrice: 'Price ($)',
  valuationAtPurchase: 'Valuation ($)',
  lvr: 'LVR (%)',
  interestRate: 'Rate (%)',
  loanTerm: 'Loan term',
  loanProduct: 'Loan product',
  rentPerWeek: 'Rent/wk ($)',
  yieldOverride: 'Yield (%)',
  growthAssumption: 'Growth',
  entity: 'Entity',
  isNewBuild: 'Type',
  state: 'State',
  saleYear: 'Sell year',
  lmiWaiver: 'LMI waiver',
  holdingCostOverride: 'Holding $/yr',
  purchaseCostsOverride: 'Purchase costs ($)',
  depositOverride: 'Deposit ($)',
  stampDutyOverride: 'Stamp duty ($)',
  engagementFee: 'Engagement fee ($)',
  buildingPestInspection: 'Building & pest ($)',
  plumbingElectricalInspections: 'Plumbing & electrical ($)',
  buildingInsuranceUpfront: 'Upfront insurance ($)',
  mortgageFees: 'Mortgage fees ($)',
  conveyancing: 'Conveyancing ($)',
};

const humanizeField = (field: string) =>
  field
    .replace(/Override$/, '')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase());
import { getCategoryLabel, type CellId } from '../utils/propertyCells';
import { yearToPeriod, BASE_YEAR, PERIODS_PER_YEAR } from '../constants/financialParams';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { TimelineProperty } from '../types/property';
import { calcGrossYield, calcAnnualRent } from '../utils/sharedFinancialCalcs';
import { parseShorthandNumber } from '../utils/parseShorthandNumber';
import { useRemoveTimelineProperty, parseInstanceId } from '../hooks/useRemoveTimelineProperty';
import { calculateStampDuty } from '../utils/stampDutyCalculator';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const GROWTH_OPTIONS = [
  { value: 'High', label: 'High', dropdownLabel: 'High (12.5% → 10% → 7.5% → 6%)' },
  { value: 'Medium', label: 'Medium', dropdownLabel: 'Medium (6% → 5.5% → 5% → 5%)' },
  { value: 'Low', label: 'Low', dropdownLabel: 'Low (5% → 4% → 3.5% → 3%)' },
];
const PRODUCT_OPTIONS = [
  { value: 'IO', label: 'IO' },
  { value: 'PI', label: 'P&I' },
];

const DEFAULT_NEW_CELL_ID: CellId = 'metro-unit-cashflow';

// ── Inline cell components ───────────────────────────────────────────────────

// Shared inline-cell input styling (§2.2 record table — 13px cells). Text colour
// is set per input type: numerics recede to #535862 and right-align, string
// selects use body #414651. Focus ring picks up the violet accent.
const cellBase = 'w-full bg-transparent text-xs py-1 px-1 border-0 outline-none rounded hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 transition-colors';
const numberInputClass = `${cellBase} text-center text-[#535862] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

const NumberInput: React.FC<{
  value: number | null | undefined;
  onChange: (v: number) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : value ?? ''}
      onFocus={() => { setFocused(true); setDraft(value != null ? String(value) : ''); }}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (draft.trim() === '') {
          if (value != null) onChange(0);
          return;
        }
        const n = parseShorthandNumber(draft);
        if (n !== null && n !== value) onChange(n);
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      className={numberInputClass}
      onClick={e => e.stopPropagation()}
    />
  );
};

const SelectInput: React.FC<{
  value: string;
  options: { value: string; label: string; dropdownLabel?: string }[] | string[];
  onChange: (v: string) => void;
  className?: string;
}> = ({ value, options, onChange, className }) => {
  const hasDropdownLabels = options.some(opt => typeof opt !== 'string' && opt.dropdownLabel);

  if (!hasDropdownLabels) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${cellBase} cursor-pointer text-[#414651] ${className ?? ''}`}
        onClick={e => e.stopPropagation()}
      >
        {options.map(opt => {
          const v = typeof opt === 'string' ? opt : opt.value;
          const l = typeof opt === 'string' ? opt : opt.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    );
  }

  // For options with dropdownLabel: show short label in the cell,
  // full label only in the open dropdown
  const selectedOpt = (options as { value: string; label: string; dropdownLabel?: string }[]).find(o => o.value === value);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${cellBase} cursor-pointer text-left text-[#414651]`}
      >
        {selectedOpt?.label ?? value}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-0.5 bg-white border border-neutral-200 rounded-md shadow-lg min-w-[280px] py-0.5">
          {(options as { value: string; label: string; dropdownLabel?: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors ${
                opt.value === value ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {opt.dropdownLabel ?? opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CheckboxInput: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={e => onChange(e.target.checked)}
    onClick={e => e.stopPropagation()}
    className="cursor-pointer"
  />
);

// ── Sale year toggle ────────────────────────────────────────────────────────

const SaleYearToggle: React.FC<{
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  estimate?: { cgt: number; netProceeds: number } | null;
}> = ({ value, onChange, estimate }) => {
  const isOn = !!value && value > 0;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (isOn) {
      onChange(null);
      setOpen(false);
    } else {
      setDraft(String(new Date().getFullYear() + 10));
      setOpen(true);
    }
  };

  const handleConfirm = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n > 2000) {
      onChange(n);
      // Keep the popover open so the freshly-computed "Est. CGT · Net proceeds"
      // estimate is visible immediately on setting the sale year (it only exists
      // once a sale year is set). User dismisses by clicking away.
    }
  };

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggle}
        className={`relative w-7 h-4 rounded-full transition-colors ${isOn ? 'bg-violet-500' : 'bg-neutral-200'}`}
        style={{ flexShrink: 0 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-3' : ''}`}
        />
      </button>
      {isOn && (
        <button
          type="button"
          onClick={() => { setDraft(String(value)); setOpen(true); }}
          className="text-xs text-violet-600 font-medium hover:text-violet-700 transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          {value}
        </button>
      )}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 flex flex-col gap-1.5" style={{ minWidth: 180 }}>
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} className="text-neutral-400 flex-shrink-0" />
            <input
              type="number"
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setOpen(false); }}
              className="w-16 text-xs border border-neutral-200 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-violet-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              placeholder="Year"
            />
            <button
              type="button"
              onClick={handleConfirm}
              className="text-xs font-medium text-white bg-violet-500 hover:bg-violet-600 rounded px-2 py-1 transition-colors cursor-pointer border-none"
            >
              Set
            </button>
          </div>
          {isOn && estimate && (
            <div className="text-[10px] text-neutral-500 leading-snug border-t border-neutral-100 pt-1.5">
              Est. CGT <span className="text-neutral-700 font-medium">${fmtNum(estimate.cgt)}</span> · Net proceeds <span className="text-neutral-700 font-medium">${fmtNum(estimate.netProceeds)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Column definitions ───────────────────────────────────────────────────────

interface CardData {
  instanceId: string;
  instanceData: PropertyInstanceDetails | undefined;
  propertyType: string;
  purchaseYear: number | undefined;
  isUnplaceable: boolean;
  isBCBlocked: boolean;
  timelineProp?: TimelineProperty;
}

type RenderFn = (
  card: CardData,
  onChange: (instanceId: string, field: keyof PropertyInstanceDetails, value: any) => void
) => React.ReactNode;

interface Column {
  key: string;
  header: string;
  group?: string;
  numeric?: boolean;
  headerTip?: string;
  render: RenderFn;
}

// Fixed-layout width hints for the purchases table (px). Without these the
// fixed layout splits width equally, so narrow data (Term, LVR) gets the same
// column as Price and the gaps read unevenly.
// Two width tiers only, so the grid reads evenly: 72 for short numerics,
// 88 for text/selects/money, 104 where the header itself is long.
const PURCHASES_COL_WIDTHS: Record<string, number> = {
  year: 72, growth: 88, entity: 88, isNewBuild: 88, state: 88,
  price: 88, valuation: 88, lvr: 72, rate: 72, term: 72, product: 88,
  ioTerm: 72, rent: 88, yield: 72, deposit: 88, purchaseCosts: 104, holdingCost: 104,
  saleYear: 72,
};

// ── Aggregate-cost breakdown cells ───────────────────────────────────────────
// The Holding $/yr and Purchase Costs columns are deliberate roll-ups; hovering
// the cell reveals an editable popover itemising what's inside (see
// PurchaseCostsCell / HoldingCostCell below).

const fmtTip = (v: number) => `$${Math.round(v).toLocaleString('en-AU')}`;

const HeaderTip: React.FC<{ tip: string; children: React.ReactNode }> = ({ tip, children }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] px-3 py-2">
        <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 }}>{tip}</span>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// The six editable fee/inspection components + stamp duty shown in the
// Purchase Costs cell's hover popover. Each maps directly to a PropertyInstance
// field so edits flow straight into the engine (calculateOneOffCosts).
const PURCHASE_FEE_ROWS: { label: string; field: keyof PropertyInstanceDetails }[] = [
  { label: 'Engagement fee', field: 'engagementFee' },
  { label: 'Building & pest', field: 'buildingPestInspection' },
  { label: 'Plumbing & electrical', field: 'plumbingElectricalInspections' },
  { label: 'Upfront insurance', field: 'buildingInsuranceUpfront' },
  { label: 'Mortgage fees', field: 'mortgageFees' },
  { label: 'Conveyancing', field: 'conveyancing' },
];

// The six fee fields whose direct edit supersedes the legacy lump
// `purchaseCostsOverride` (used by handleFieldChange to clear it).
const PURCHASE_FEE_FIELDS = new Set<string>(PURCHASE_FEE_ROWS.map(r => r.field as string));

// The five holding-cost component fields whose direct edit supersedes the
// legacy lump `holdingCostOverride` (used by handleFieldChange to clear it).
const HOLDING_COMPONENT_FIELDS = new Set<string>([
  'propertyManagementPercent',
  'buildingInsuranceAnnual',
  'councilRatesWater',
  'strata',
  'maintenanceAllowanceAnnual',
]);

// Effective purchase-cost figures for a property. `fees` respects the legacy
// lump `purchaseCostsOverride` (scales the six parts) so existing scenarios
// don't jump; editing any part in the popover clears that override (see
// handleFieldChange) so raw values then drive both display and engine. Stamp
// duty IS included in the headline total — matching the engine's
// settlementTotal, which always adds stamp into totalCashRequired.
const purchaseCostFigures = (d: PropertyInstanceDetails) => {
  const rawFees =
    d.engagementFee +
    (d.buildingPestInspection ?? 0) +
    (d.plumbingElectricalInspections ?? 0) +
    d.buildingInsuranceUpfront +
    d.mortgageFees +
    d.conveyancing;
  const fees = d.purchaseCostsOverride ?? rawFees;
  const stamp = d.stampDutyOverride ?? calculateStampDuty(d.state, d.purchasePrice);
  const deposit = d.depositOverride ?? (d.purchasePrice * (100 - d.lvr) / 100);
  const extras =
    (d.conditionalHoldingDeposit ?? 0) +
    (d.independentValuation ?? 0) +
    (d.maintenanceAllowancePostSettlement ?? 0);
  return {
    fees,
    stamp,
    deposit,
    // Headline "Purchase Costs" = fees + stamp duty.
    purchaseCostsTotal: fees + stamp,
    // Full cash to complete = fees + deposit + stamp + settlement extras.
    totalCashRequired: fees + deposit + stamp + extras,
  };
};

// Popover row — editable component. Shows a formatted "$x,xxx" value at rest
// (matching the record-table style) and switches to a raw editable number on
// focus. Styling mirrors the Holding $/yr BreakdownTip: 11px, muted labels and
// a 500-weight value, so both cost breakdowns read identically.
const popRowLabelCls = 'text-[11px] text-[#717680] whitespace-nowrap';
const popEditInputCls =
  'w-full bg-transparent text-right outline-none rounded px-1 py-0.5 text-[11px] font-medium text-[#181D27] hover:bg-[#F5F3FF] focus:bg-white focus:ring-1 focus:ring-[#7C3AED] transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const PopEditRow: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <div className="flex items-center justify-between gap-6 py-0.5">
      <span className={popRowLabelCls}>{label}</span>
      <div style={{ width: 96 }}>
        <input
          type="text"
          inputMode="decimal"
          value={focused ? draft : fmtTip(value)}
          onFocus={() => { setFocused(true); setDraft(value ? String(Math.round(value)) : ''); }}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false);
            if (draft.trim() === '') { if (value !== 0) onChange(0); return; }
            const n = parseShorthandNumber(draft);
            if (n !== null && n !== value) onChange(n);
          }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className={popEditInputCls}
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

const PopStaticRow: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex items-center justify-between gap-6 py-0.5">
    <span className={popRowLabelCls}>{label}</span>
    <span className="text-[11px] text-[#181D27] px-1" style={{ fontWeight: strong ? 600 : 500 }}>{fmtTip(value)}</span>
  </div>
);

// Shared hover-popover behaviour for the editable cost cells (Purchase Costs,
// Holding $/yr). Returns refs + handlers for a portal-rendered popover with
// fixed positioning that flips above the trigger when there's no room below, so
// it floats over the table's horizontal-scroll container.
const useHoverPopover = (popW: number, popHEst: number) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>();
  const GAP = 6;

  const computePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = r.left + r.width / 2 - popW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow < popHEst + GAP && r.top > popHEst + GAP
      ? r.top - popHEst - GAP
      : r.bottom + GAP;
    setCoords({ left, top });
  };

  const openNow = () => { window.clearTimeout(closeTimer.current); computePos(); setOpen(true); };
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return { open, coords, triggerRef, popRef, openNow, scheduleClose, popW };
};

// Portal-rendered popover panel positioned by useHoverPopover.
const HoverPopoverPanel: React.FC<{
  pop: ReturnType<typeof useHoverPopover>;
  children: React.ReactNode;
}> = ({ pop, children }) => {
  if (!pop.open || !pop.coords) return null;
  return createPortal(
    <div
      ref={pop.popRef}
      onMouseEnter={pop.openNow}
      onMouseLeave={pop.scheduleClose}
      style={{ position: 'fixed', top: pop.coords.top, left: pop.coords.left, width: pop.popW, zIndex: 1000, fontFamily: 'Inter, system-ui, sans-serif' }}
      className="bg-white border border-[#E9EAEB] rounded-xl shadow-xl px-3 py-2.5"
    >
      {children}
    </div>,
    document.body
  );
};

// Purchase Costs cell — read-only headline total (fees + stamp) that reveals an
// interactive popover on hover. The popover exposes the six fee components plus
// stamp duty as editable inputs, then a read-only Deposit + Total cash required
// footer.
const PurchaseCostsCell: React.FC<{
  card: CardData;
  onChange: (instanceId: string, field: keyof PropertyInstanceDetails, value: any) => void;
}> = ({ card, onChange }) => {
  const d = card.instanceData;
  const pop = useHoverPopover(240, 300);

  if (!d) return null;

  const { stamp, deposit, purchaseCostsTotal, totalCashRequired } = purchaseCostFigures(d);

  return (
    <div ref={pop.triggerRef} className="w-full" onMouseEnter={pop.openNow} onMouseLeave={pop.scheduleClose}>
      <div className="w-full text-center text-xs text-[#535862] rounded px-1 py-1 hover:bg-[#F4F4F5] cursor-default transition-colors">
        {fmtTip(purchaseCostsTotal)}
      </div>
      <HoverPopoverPanel pop={pop}>
        {PURCHASE_FEE_ROWS.map(r => (
          <PopEditRow
            key={r.field}
            label={r.label}
            value={(d[r.field] as number) ?? 0}
            onChange={v => onChange(card.instanceId, r.field, v)}
          />
        ))}
        <PopEditRow label="Stamp duty" value={stamp} onChange={v => onChange(card.instanceId, 'stampDutyOverride', v || null)} />
        <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid #E9EAEB' }}>
          <PopStaticRow label="Deposit" value={deposit} />
          <PopStaticRow label="Total cash required" value={totalCashRequired} strong />
        </div>
      </HoverPopoverPanel>
    </div>
  );
};

// Holding $/yr cell — read-only headline total that reveals an editable popover
// mirroring Purchase Costs. Management is edited as a dollar figure and
// back-solved into propertyManagementPercent; the other four map straight to
// their annual-expense fields. Editing any component clears the legacy
// holdingCostOverride lump (see handleFieldChange) so raw values drive both the
// display and the engine, keeping every projection and later purchase brief in
// sync.
const HoldingCostCell: React.FC<{
  card: CardData;
  onChange: (instanceId: string, field: keyof PropertyInstanceDetails, value: any) => void;
}> = ({ card, onChange }) => {
  const d = card.instanceData;
  const pop = useHoverPopover(240, 280);

  if (!d) return null;

  const annualRent = calcAnnualRent(d.rentPerWeek);
  const mgmtDollar = (d.propertyManagementPercent / 100) * annualRent;
  const rawTotal =
    mgmtDollar + d.buildingInsuranceAnnual + d.councilRatesWater + d.strata + d.maintenanceAllowanceAnnual;
  const headline = d.holdingCostOverride ?? Math.round(rawTotal);

  const setMgmtDollar = (v: number) => {
    const pct = annualRent > 0 ? Math.round((v / annualRent) * 10000) / 100 : 0;
    onChange(card.instanceId, 'propertyManagementPercent', pct);
  };

  return (
    <div ref={pop.triggerRef} className="w-full" onMouseEnter={pop.openNow} onMouseLeave={pop.scheduleClose}>
      <div className="w-full text-center text-xs text-[#535862] rounded px-1 py-1 hover:bg-[#F4F4F5] cursor-default transition-colors">
        {fmtTip(headline)}
      </div>
      <HoverPopoverPanel pop={pop}>
        <PopEditRow label={`Management (${d.propertyManagementPercent}%)`} value={mgmtDollar} onChange={setMgmtDollar} />
        <PopEditRow label="Building insurance" value={d.buildingInsuranceAnnual} onChange={v => onChange(card.instanceId, 'buildingInsuranceAnnual', v)} />
        <PopEditRow label="Council rates & water" value={d.councilRatesWater} onChange={v => onChange(card.instanceId, 'councilRatesWater', v)} />
        <PopEditRow label="Strata" value={d.strata} onChange={v => onChange(card.instanceId, 'strata', v)} />
        <PopEditRow label="Maintenance" value={d.maintenanceAllowanceAnnual} onChange={v => onChange(card.instanceId, 'maintenanceAllowanceAnnual', v)} />
        <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid #E9EAEB' }}>
          <PopStaticRow label="Total per year" value={headline} strong />
        </div>
      </HoverPopoverPanel>
    </div>
  );
};

const readonlyCell = (text: string | number | undefined) => (
  <span className="text-xs text-[#535862]">{text ?? '—'}</span>
);

const yearCellPlaceholder: RenderFn = (card) => readonlyCell(card.purchaseYear);

const EQUITY_COLUMNS: Column[] = [
  { key: 'year', header: 'Year', render: yearCellPlaceholder },
  {
    key: 'growth', header: 'Growth',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.growthAssumption} options={GROWTH_OPTIONS} onChange={v => onChange(c.instanceId, 'growthAssumption', v)} />
      : null,
  },
  {
    key: 'entity', header: 'Entity',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.entity ?? 'individual'} options={[{value:'individual',label:'Indiv.'},{value:'trust',label:'Trust'},{value:'company',label:'Co.'},{value:'smsf',label:'SMSF'}]} onChange={v => onChange(c.instanceId, 'entity', v)} />
      : null,
  },
  {
    key: 'isNewBuild', header: 'Type',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.isNewBuild ? 'new' : 'established'} options={[{value:'established',label:'Estab.'},{value:'new',label:'New'}]} onChange={v => onChange(c.instanceId, 'isNewBuild', (v === 'new') as any)} />
      : null,
  },
  {
    key: 'state', header: 'State',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.state} options={STATE_OPTIONS} onChange={v => onChange(c.instanceId, 'state', v)} />
      : null,
  },
  {
    key: 'price', header: 'Price ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.purchasePrice} onChange={v => onChange(c.instanceId, 'purchasePrice', v)} />
      : null,
  },
  {
    key: 'valuation', header: 'Val. ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.valuationAtPurchase} onChange={v => onChange(c.instanceId, 'valuationAtPurchase', v)} />
      : null,
  },
  {
    key: 'lvr', header: 'LVR (%)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.lvr} onChange={v => onChange(c.instanceId, 'lvr', v)} />
      : null,
  },
  {
    key: 'rate', header: 'Rate (%)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.interestRate} onChange={v => onChange(c.instanceId, 'interestRate', v)} />
      : null,
  },
  {
    key: 'term', header: 'Term',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.loanTerm} onChange={v => onChange(c.instanceId, 'loanTerm', v)} />
      : null,
  },
  {
    key: 'product', header: 'Product',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.loanProduct} options={PRODUCT_OPTIONS} onChange={v => onChange(c.instanceId, 'loanProduct', v as any)} />
      : null,
  },
  {
    key: 'ioTerm', header: 'IO Term',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.ioTermYears ?? 5} onChange={v => onChange(c.instanceId, 'ioTermYears', v)} />
      : null,
  },
  {
    key: 'lmi', header: 'LMI Waiver',
    render: (c, onChange) => c.instanceData
      ? <CheckboxInput checked={c.instanceData.lmiWaiver} onChange={v => onChange(c.instanceId, 'lmiWaiver', v)} />
      : null,
  },
];

const CASHFLOW_COLUMNS: Column[] = [
  { key: 'year', header: 'Year', render: yearCellPlaceholder },
  // ── Income ──
  {
    key: 'rent', header: 'Rent/wk ($)', group: 'Income',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.rentPerWeek} onChange={v => onChange(c.instanceId, 'rentPerWeek', v)} />
      : null,
  },
  {
    key: 'yield', header: 'Yield (%)', group: 'Income',
    render: (c, onChange) => {
      if (!c.instanceData) return null;
      const computed = c.instanceData.purchasePrice > 0
        ? parseFloat(calcGrossYield(c.instanceData.rentPerWeek, c.instanceData.purchasePrice).toFixed(1))
        : 0;
      const display = c.instanceData.yieldOverride ?? computed;
      return <NumberInput value={display} onChange={v => onChange(c.instanceId, 'yieldOverride', v || null)} />;
    },
  },
  // ── Annual Expenses ──
  {
    key: 'mgmt', header: 'Mgmt (%)', group: 'Annual Expenses',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.propertyManagementPercent} onChange={v => onChange(c.instanceId, 'propertyManagementPercent', v)} />
      : null,
  },
  {
    key: 'insAnn', header: 'Ins ($)', group: 'Annual Expenses',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.buildingInsuranceAnnual} onChange={v => onChange(c.instanceId, 'buildingInsuranceAnnual', v)} />
      : null,
  },
  {
    key: 'rates', header: 'Rates ($)', group: 'Annual Expenses',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.councilRatesWater} onChange={v => onChange(c.instanceId, 'councilRatesWater', v)} />
      : null,
  },
  {
    key: 'strata', header: 'Strata ($)', group: 'Annual Expenses',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.strata} onChange={v => onChange(c.instanceId, 'strata', v)} />
      : null,
  },
  {
    key: 'maintAnn', header: 'Maint ($)', group: 'Annual Expenses',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.maintenanceAllowanceAnnual} onChange={v => onChange(c.instanceId, 'maintenanceAllowanceAnnual', v)} />
      : null,
  },
  {
    key: 'landTax', header: 'Land Tax ($)', group: 'Annual Expenses',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.landTaxOverride} onChange={v => onChange(c.instanceId, 'landTaxOverride', v || null)} placeholder="Auto" />
      : null,
  },
  // ── One-Off Purchase Costs ──
  {
    key: 'engage', header: 'Engage ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.engagementFee} onChange={v => onChange(c.instanceId, 'engagementFee', v)} />
      : null,
  },
  {
    key: 'deposit', header: 'Hold Dep ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.conditionalHoldingDeposit} onChange={v => onChange(c.instanceId, 'conditionalHoldingDeposit', v)} />
      : null,
  },
  {
    key: 'insUp', header: 'Ins Up ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.buildingInsuranceUpfront} onChange={v => onChange(c.instanceId, 'buildingInsuranceUpfront', v)} />
      : null,
  },
  {
    key: 'bp', header: 'B&P ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.buildingPestInspection} onChange={v => onChange(c.instanceId, 'buildingPestInspection', v)} />
      : null,
  },
  {
    key: 'plumb', header: 'Plumb ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.plumbingElectricalInspections} onChange={v => onChange(c.instanceId, 'plumbingElectricalInspections', v)} />
      : null,
  },
  {
    key: 'indVal', header: 'Ind Val ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.independentValuation} onChange={v => onChange(c.instanceId, 'independentValuation', v)} />
      : null,
  },
  {
    key: 'mortFees', header: 'Mort ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.mortgageFees} onChange={v => onChange(c.instanceId, 'mortgageFees', v)} />
      : null,
  },
  {
    key: 'convey', header: 'Convey ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.conveyancing} onChange={v => onChange(c.instanceId, 'conveyancing', v)} />
      : null,
  },
  {
    key: 'maintPost', header: 'Maint Post ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.maintenanceAllowancePostSettlement} onChange={v => onChange(c.instanceId, 'maintenanceAllowancePostSettlement', v)} />
      : null,
  },
  {
    key: 'stamp', header: 'Stamp ($)', group: 'Purchase Costs',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.stampDutyOverride} onChange={v => onChange(c.instanceId, 'stampDutyOverride', v || null)} placeholder="Auto" />
      : null,
  },
];

// ── Combined "Purchases" columns — streamlined ──────────────────────────────

const PURCHASES_COLUMNS: Column[] = [
  // ── Identity ──
  { key: 'year', header: 'Year', render: yearCellPlaceholder },
  {
    key: 'growth', header: 'Growth',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.growthAssumption} options={GROWTH_OPTIONS} onChange={v => onChange(c.instanceId, 'growthAssumption', v)} />
      : null,
  },
  {
    key: 'entity', header: 'Entity',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.entity ?? 'individual'} options={[{value:'individual',label:'Indiv.'},{value:'trust',label:'Trust'},{value:'company',label:'Co.'},{value:'smsf',label:'SMSF'}]} onChange={v => onChange(c.instanceId, 'entity', v)} />
      : null,
  },
  {
    key: 'isNewBuild', header: 'Type',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.isNewBuild ? 'new' : 'established'} options={[{value:'established',label:'Estab.'},{value:'new',label:'New'}]} onChange={v => onChange(c.instanceId, 'isNewBuild', (v === 'new') as any)} />
      : null,
  },
  {
    key: 'state', header: 'State',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.state} options={STATE_OPTIONS} onChange={v => onChange(c.instanceId, 'state', v)} />
      : null,
  },
  // ── Financing ──
  {
    key: 'price', header: 'Price ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.purchasePrice} onChange={v => onChange(c.instanceId, 'purchasePrice', v)} />
      : null,
  },
  {
    key: 'valuation', header: 'Val. ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.valuationAtPurchase} onChange={v => onChange(c.instanceId, 'valuationAtPurchase', v)} />
      : null,
  },
  {
    key: 'lvr', header: 'LVR (%)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.lvr} onChange={v => onChange(c.instanceId, 'lvr', v)} />
      : null,
  },
  {
    key: 'rate', header: 'Rate (%)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.interestRate} onChange={v => onChange(c.instanceId, 'interestRate', v)} />
      : null,
  },
  {
    key: 'term', header: 'Term',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.loanTerm} onChange={v => onChange(c.instanceId, 'loanTerm', v)} />
      : null,
  },
  {
    key: 'product', header: 'Product',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.loanProduct} options={PRODUCT_OPTIONS} onChange={v => onChange(c.instanceId, 'loanProduct', v as any)} />
      : null,
  },
  {
    key: 'ioTerm', header: 'IO Term',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.ioTermYears ?? 5} onChange={v => onChange(c.instanceId, 'ioTermYears', v)} />
      : null,
  },
  // ── Income ──
  {
    key: 'rent', header: 'Rent/wk ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.rentPerWeek} onChange={v => onChange(c.instanceId, 'rentPerWeek', v)} />
      : null,
  },
  {
    key: 'yield', header: 'Yield (%)',
    render: (c, onChange) => {
      if (!c.instanceData) return null;
      const computed = c.instanceData.purchasePrice > 0
        ? parseFloat(calcGrossYield(c.instanceData.rentPerWeek, c.instanceData.purchasePrice).toFixed(1))
        : 0;
      const display = c.instanceData.yieldOverride ?? computed;
      return <NumberInput value={display} onChange={v => onChange(c.instanceId, 'yieldOverride', v || null)} />;
    },
  },
  // ── Deposit (own column; editable, defaults to price × (100−LVR)) ──
  {
    key: 'deposit', header: 'Deposit ($)',
    render: (c, onChange) => {
      if (!c.instanceData) return null;
      const d = c.instanceData;
      const computed = Math.round(d.purchasePrice * (100 - d.lvr) / 100);
      const display = d.depositOverride ?? computed;
      return <NumberInput value={display} onChange={v => onChange(c.instanceId, 'depositOverride', v || null)} placeholder="Auto" />;
    },
  },
  // ── Purchase Costs (fees + stamp duty; hover to edit the components) ──
  {
    key: 'purchaseCosts', header: 'Purchase Costs',
    headerTip: 'One-off acquisition costs: engagement, building & pest, plumbing & electrical, upfront insurance, mortgage fees, conveyancing and stamp duty. Hover a cell to edit each component; the footer shows deposit and total cash required.',
    render: (c, onChange) => <PurchaseCostsCell card={c as CardData} onChange={onChange} />,
  },
  // ── Annual Holding Cost (merged total) ──
  {
    key: 'holdingCost', header: 'Holding $/yr',
    headerTip: 'Per-year running costs rolled into one figure: management, building insurance, council rates & water, strata, maintenance. Hover a cell to edit each component; edits flow into every projection and the later purchase briefs.',
    render: (c, onChange) => <HoldingCostCell card={c as CardData} onChange={onChange} />,
  },
  // ── Sale ──
  {
    key: 'saleYear', header: 'Sell',
    render: (c, onChange) => c.instanceData
      ? <SaleYearToggle value={c.instanceData.saleYear} onChange={v => onChange(c.instanceId, 'saleYear', v as any)} />
      : null,
  },
];

// Numeric columns centre (header + cell) so the grid reads evenly between the
// column dividers. NumberInput cells align themselves; this drives the
// matching header alignment.
const NUMERIC_KEYS = new Set([
  'price', 'valuation', 'lvr', 'rate', 'term', 'ioTerm', 'rent', 'yield',
  'holdingCost', 'purchaseCosts', 'mgmt', 'insAnn', 'rates', 'strata',
  'maintAnn', 'landTax', 'engage', 'deposit', 'insUp', 'bp', 'plumb',
  'indVal', 'mortFees', 'convey', 'maintPost', 'stamp',
]);

// ── Build group header row for cashflow ──────────────────────────────────────

function buildGroupHeaders(columns: Column[]): { label: string; span: number }[] | null {
  const groups: { label: string; span: number }[] = [];
  let current: string | undefined;
  let span = 0;

  for (const col of columns) {
    const g = col.group ?? '';
    if (g === current) {
      span++;
    } else {
      if (span > 0) groups.push({ label: current ?? '', span });
      current = g;
      span = 1;
    }
  }
  if (span > 0) groups.push({ label: current ?? '', span });

  const hasGroups = groups.some(g => g.label !== '');
  return hasGroups ? groups : null;
}

// ── Block cards — replicates BriefTab "Property summary" table style ────────

const fmtNum = (v: number) => Math.round(v).toLocaleString('en-AU');

// §2.5 record-row family (same classes as BriefTab's Deal details): label
// #717680/500, value right-aligned #535862/500, #F2F2F2 dividers, no vertical
// rule; editable values get the quiet violet hover pill (§2.7).
const blockLabelCls = 'py-2 px-3 text-[13px] font-medium text-[#717680] whitespace-nowrap';
const blockInputCls = 'w-full bg-transparent text-right outline-none rounded-md px-1.5 py-0.5 text-[13px] text-[#535862] font-medium hover:bg-[#F5F3FF] focus:bg-white focus:ring-1 focus:ring-[#7C3AED] transition-colors';

const BlockKVRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <tr className="border-b border-[#F2F2F2] last:border-b-0">
    <td className={blockLabelCls}>{label}</td>
    <td className="py-2 px-3 text-[13px] text-right font-medium text-[#535862]">{value}</td>
  </tr>
);

const BlockNumRow: React.FC<{
  label: string;
  value: number;
  instanceId: string;
  field: keyof PropertyInstanceDetails;
  onChange: (id: string, field: keyof PropertyInstanceDetails, value: any) => void;
  decimals?: number;
}> = ({ label, value, instanceId, field, onChange, decimals }) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const display = decimals !== undefined ? value.toFixed(decimals) : fmtNum(value);

  return (
    <tr className="border-b border-[#F2F2F2] last:border-b-0">
      <td className={blockLabelCls}>{label}</td>
      <td className="py-1 px-2">
        <input
          type="text"
          inputMode="decimal"
          value={focused ? draft : display}
          onFocus={() => { setFocused(true); setDraft(String(value)); }}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false);
            const n = parseShorthandNumber(draft);
            if (n !== null && n !== value) onChange(instanceId, field, n);
          }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className={blockInputCls}
        />
      </td>
    </tr>
  );
};

const BlockSelectRow: React.FC<{
  label: string;
  value: string;
  instanceId: string;
  field: keyof PropertyInstanceDetails;
  options: { value: string; label: string; dropdownLabel?: string }[];
  onChange: (id: string, field: keyof PropertyInstanceDetails, value: any) => void;
}> = ({ label, value, instanceId, field, options, onChange }) => {
  const selectedOpt = options.find(o => o.value === value);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  return (
    <tr className="border-b border-[#F2F2F2] last:border-b-0">
      <td className={blockLabelCls}>{label}</td>
      <td className="py-1 px-2">
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full bg-transparent text-right outline-none rounded-md px-1.5 py-0.5 text-[13px] text-[#535862] font-medium hover:bg-[#F5F3FF] cursor-pointer transition-colors"
          >
            {selectedOpt?.label ?? value}
          </button>
          {open && (
            <div className="absolute z-50 top-full left-0 mt-0.5 bg-white border border-neutral-200 rounded-md shadow-lg min-w-[280px] py-0.5">
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(instanceId, field, opt.value); setOpen(false); }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors ${
                    opt.value === value ? 'bg-[#F5F3FF] text-[#7C3AED] font-medium' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {opt.dropdownLabel ?? opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

const BLOCK_STATE_OPTIONS = [
  { value: 'NSW', label: 'NSW' }, { value: 'VIC', label: 'VIC' }, { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' }, { value: 'WA', label: 'WA' }, { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' }, { value: 'ACT', label: 'ACT' },
];

const BLOCK_LOAN_PRODUCT_OPTIONS = [
  { value: 'IO', label: 'Interest only' },
  { value: 'PI', label: 'Principal & interest' },
];

const BLOCK_GROWTH_OPTIONS = [
  { value: 'High', label: 'High', dropdownLabel: 'High (12.5% → 10% → 7.5% → 6%)' },
  { value: 'Medium', label: 'Medium', dropdownLabel: 'Medium (6% → 5.5% → 5% → 5%)' },
  { value: 'Low', label: 'Low', dropdownLabel: 'Low (5% → 4% → 3.5% → 3%)' },
];

const BLOCK_ENTITY_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'trust', label: 'Trust' },
  { value: 'company', label: 'Company' },
  { value: 'smsf', label: 'SMSF' },
];

// ── Component ────────────────────────────────────────────────────────────────

interface PropertyCardRowProps {
  mode?: 'equity' | 'cashflow' | 'purchases' | 'blocks';
  onAddClick?: () => void;
}

export const PropertyCardRow: React.FC<PropertyCardRowProps> = ({ mode = 'equity', onAddClick }) => {
  const { propertyOrder, propertyTypes } = usePropertySelection();
  const { instances, updateInstance } = usePropertyInstance();
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();
  const { salesCgtBreakdown } = usePortfolioProjection();
  const { notifyEdit } = useChangeReceipt();

  // CGT + net proceeds per planned sale (2027 basis), keyed by instance id, so
  // the Sell control can show the estimate inline in its popup.
  const saleEstimates = useMemo(() => {
    const m: Record<string, { cgt: number; netProceeds: number }> = {};
    salesCgtBreakdown.forEach(r => { m[r.id] = { cgt: r.cgt, netProceeds: r.netProceeds }; });
    return m;
  }, [salesCgtBreakdown]);

  const cards = useMemo(() => {
    const items = propertyOrder.map((instanceId, orderIdx) => {
      const instanceData = instances[instanceId];
      const timelineProp = timelineProperties.find(tp => tp.instanceId === instanceId);
      const rawYear = timelineProp?.affordableYear;
      const purchaseYear = Number.isFinite(rawYear) ? Math.floor(rawYear as number) : undefined;
      const isUnplaceable = rawYear === Infinity && profile.timelineYearsExplicit === true;
      const isBCBlocked = timelineProp?.status === 'challenging' && rawYear !== Infinity;

      const parsed = parseInstanceId(instanceId);
      const propertyTypeMeta = parsed ? propertyTypes.find(p => p.id === parsed.propertyId) : undefined;
      const propertyType = getCategoryLabel(propertyTypeMeta?.title ?? timelineProp?.title ?? DEFAULT_NEW_CELL_ID);

      return { instanceId, instanceData, propertyType, purchaseYear, isUnplaceable, isBCBlocked, timelineProp, orderIdx };
    });

    return items.sort((a, b) => {
      if (a.purchaseYear === undefined && b.purchaseYear === undefined) return a.orderIdx - b.orderIdx;
      if (a.purchaseYear === undefined) return 1;
      if (b.purchaseYear === undefined) return -1;
      if (a.purchaseYear !== b.purchaseYear) return a.purchaseYear - b.purchaseYear;
      return a.orderIdx - b.orderIdx;
    });
  }, [propertyOrder, instances, timelineProperties, propertyTypes, profile.timelineYearsExplicit]);

  const handleRemove = useRemoveTimelineProperty();

  const changeLogSubject = (instanceId: string) => `Property ${propertyOrder.indexOf(instanceId) + 1}`;

  const handleFieldChange = (instanceId: string, field: keyof PropertyInstanceDetails, value: any) => {
    notifyEdit('purchases', {
      subject: changeLogSubject(instanceId),
      fieldLabel: CHANGE_LOG_FIELD_LABELS[field] ?? humanizeField(field),
      from: instances[instanceId]?.[field],
      to: value,
    });
    // Editing an individual component supersedes the matching legacy lump
    // override (which scales the parts). Clear it so the raw component values
    // drive both the display and the engine (scale = 1).
    const clearsPurchaseLump = PURCHASE_FEE_FIELDS.has(field as string);
    const clearsHoldingLump = HOLDING_COMPONENT_FIELDS.has(field as string);
    updateInstance(instanceId, {
      [field]: value,
      ...(clearsPurchaseLump ? { purchaseCostsOverride: null } : {}),
      ...(clearsHoldingLump ? { holdingCostOverride: null } : {}),
      alertDismissed: false,
    });
    track(EVENTS.tableCellEdited, { table: 'purchases', field: String(field) });
  };

  const handleYearChange = (instanceId: string, year: number) => {
    const rawYear = timelineProperties.find(tp => tp.instanceId === instanceId)?.affordableYear;
    const oldYear = Number.isFinite(rawYear) ? Math.floor(rawYear as number) : undefined;
    notifyEdit('purchases', {
      subject: changeLogSubject(instanceId),
      fieldLabel: 'Purchase year',
      from: oldYear,
      to: year,
    });
    updateInstance(instanceId, { isManuallyPlaced: true, manualPlacementPeriod: yearToPeriod(year), alertDismissed: false });
  };

  const handleDismissAlert = (instanceId: string) => {
    updateInstance(instanceId, { alertDismissed: true });
  };

  const yearCellEditable: RenderFn = (card) => {
    if (card.isUnplaceable) {
      return <span className="text-amber-600 text-xs" title="Doesn't fit in current timeline">—</span>;
    }

    const year = card.purchaseYear ?? BASE_YEAR;
    const isDismissed = card.instanceData?.alertDismissed === true;
    const tp = card.timelineProp;

    const stepper = (
      // Compact centred stepper — flush −/+ so the year cell stays as tight as
      // the other numeric cells (§2.2). Buttons keep a py hit-area but no width.
      <div className="flex items-center justify-center gap-0">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); handleYearChange(card.instanceId, year - 1); }}
          className="py-0.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
        >
          <Minus size={10} />
        </button>
        <span className={`text-xs font-medium tabular-nums px-0.5 ${card.isBCBlocked && !isDismissed ? 'text-red-500' : 'text-[#181D27]'}`}>
          {year}
        </span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); handleYearChange(card.instanceId, year + 1); }}
          className="py-0.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
        >
          <Plus size={10} />
        </button>
      </div>
    );

    if (card.isBCBlocked && !isDismissed && tp) {
      return (
        <AffordabilityAlert
          depositTestPass={tp.depositTestPass}
          serviceabilityTestPass={tp.serviceabilityTestPass}
          borrowingCapacityRemaining={tp.borrowingCapacityRemaining}
          depositTestSurplus={tp.depositTestSurplus}
          serviceabilityTestSurplus={tp.serviceabilityTestSurplus}
          onDismiss={() => handleDismissAlert(card.instanceId)}
        >
          {stepper}
        </AffordabilityAlert>
      );
    }

    return stepper;
  };

  const baseColumns = mode === 'purchases' || mode === 'blocks' ? PURCHASES_COLUMNS : mode === 'equity' ? EQUITY_COLUMNS : CASHFLOW_COLUMNS;
  const columns = useMemo(() =>
    baseColumns.map(col => col.key === 'year' ? { ...col, render: yearCellEditable } : col),
    [baseColumns, instances, timelineProperties]
  );
  const groupHeaders = buildGroupHeaders(columns);

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-neutral-500">
        No properties added yet
      </div>
    );
  }

  // ── Blocks mode: property cards matching BriefTab style ──
  const [loanExpanded, setLoanExpanded] = useState<Record<string, boolean>>({});
  const toggleLoan = (id: string) => setLoanExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (mode === 'blocks') {
    return (
      <div className="overflow-x-auto">
        <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
          {cards.map((card, idx) => {
            if (!card.instanceData) return null;
            const d = card.instanceData;
            const mgmtDollar = (d.propertyManagementPercent / 100) * calcAnnualRent(d.rentPerWeek);
            const holdingTotal = Math.round(mgmtDollar + d.buildingInsuranceAnnual + d.councilRatesWater + d.strata + d.maintenanceAllowanceAnnual);
            const purchaseCosts = Math.round(
              d.engagementFee + (d.buildingPestInspection ?? 0) + (d.plumbingElectricalInspections ?? 0) +
              d.buildingInsuranceUpfront + d.mortgageFees + d.conveyancing
            );
            const loanSummary = `${d.lvr}% · ${d.interestRate.toFixed(1)}% · ${d.loanTerm}yr ${d.loanProduct === 'IO' ? 'IO' : 'P&I'}`;
            const iid = card.instanceId;
            const loanOpen = !!loanExpanded[iid];

            return (
              <div
                key={iid}
                style={{
                  width: 280,
                  minWidth: 280,
                  flexShrink: 0,
                  background: '#FFFFFF',
                  borderRadius: 12,
                  boxShadow: '#E9EAEB 0px 0px 0px 1px inset',
                  overflow: 'hidden',
                }}
              >
                {/* Card header — single, clean title row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderBottom: '1px solid #F2F2F2',
                  }}
                >
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#181D27',
                      lineHeight: '20px',
                      margin: 0,
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    }}
                  >
                    {`Property ${idx + 1}`}
                    <span style={{ fontSize: 12, fontWeight: 400, color: '#A3A3A3' }}>
                      {` · ${card.propertyType.replace(/ Property$/, '')}`}
                    </span>
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => toggleLoan(iid)}
                      className={`p-1 transition-colors bg-transparent border-none cursor-pointer ${loanOpen ? 'text-neutral-700' : 'text-neutral-300 hover:text-neutral-500'}`}
                      title={loanOpen ? 'Hide loan details' : `Loan: ${loanSummary}`}
                    >
                      <Landmark size={14} />
                    </button>
                    <button
                      onClick={() => handleRemove(iid)}
                      className="p-1 text-neutral-300 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
                      title="Remove property"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                      <BlockKVRow label="Purchase year" value={card.isUnplaceable ? '—' : (card.purchaseYear ?? '—')} />
                      <BlockSelectRow label="State" value={d.state} instanceId={iid} field="state" options={BLOCK_STATE_OPTIONS} onChange={handleFieldChange} />
                      <BlockSelectRow label="Growth" value={d.growthAssumption} instanceId={iid} field="growthAssumption" options={BLOCK_GROWTH_OPTIONS} onChange={handleFieldChange} />
                      <BlockSelectRow label="Entity" value={d.entity ?? 'individual'} instanceId={iid} field="entity" options={BLOCK_ENTITY_OPTIONS} onChange={handleFieldChange} />
                      <tr className="border-b border-[#F2F2F2] last:border-b-0">
                        <td className={blockLabelCls}>Type</td>
                        <td className="py-1 px-2">
                          <SelectInput value={d.isNewBuild ? 'new' : 'established'} options={[{value:'established',label:'Established'},{value:'new',label:'New build'}]} onChange={v => handleFieldChange(iid, 'isNewBuild', (v === 'new') as any)} className="text-right text-[#535862] font-medium hover:bg-[#F5F3FF]" />
                        </td>
                      </tr>
                      <BlockNumRow label="Price ($)" value={d.purchasePrice} instanceId={iid} field="purchasePrice" onChange={handleFieldChange} />
                      <BlockNumRow label="Valuation ($)" value={d.valuationAtPurchase} instanceId={iid} field="valuationAtPurchase" onChange={handleFieldChange} />
                      <BlockNumRow label="Rent/wk ($)" value={d.rentPerWeek} instanceId={iid} field="rentPerWeek" onChange={handleFieldChange} />
                      <BlockNumRow label="Yield (%)" value={d.yieldOverride ?? (d.purchasePrice > 0 ? parseFloat(calcGrossYield(d.rentPerWeek, d.purchasePrice).toFixed(1)) : 0)} instanceId={iid} field="yieldOverride" onChange={handleFieldChange} />
                      <BlockNumRow label="Purchase costs" value={d.purchaseCostsOverride ?? purchaseCosts} instanceId={iid} field="purchaseCostsOverride" onChange={handleFieldChange} />
                      <BlockNumRow label="Holding $/yr" value={d.holdingCostOverride ?? holdingTotal} instanceId={iid} field="holdingCostOverride" onChange={handleFieldChange} />
                      <tr className="border-b border-[#F2F2F2] last:border-b-0">
                        <td className={blockLabelCls}>Sell</td>
                        <td className="py-1 px-2">
                          <SaleYearToggle value={d.saleYear} onChange={v => handleFieldChange(iid, 'saleYear', v)} estimate={saleEstimates[iid]} />
                        </td>
                      </tr>
                      {loanOpen && (
                        <>
                          <BlockNumRow label="LVR (%)" value={d.lvr} instanceId={iid} field="lvr" onChange={handleFieldChange} />
                          <BlockNumRow label="Interest rate (%)" value={d.interestRate} instanceId={iid} field="interestRate" onChange={handleFieldChange} decimals={2} />
                          <BlockNumRow label="Loan term (yrs)" value={d.loanTerm} instanceId={iid} field="loanTerm" onChange={handleFieldChange} />
                          <BlockSelectRow label="Loan product" value={d.loanProduct} instanceId={iid} field="loanProduct" options={BLOCK_LOAN_PRODUCT_OPTIONS} onChange={handleFieldChange} />
                        </>
                      )}
                  </tbody>
                </table>
              </div>
            );
          })}
          {/* Add property card */}
          <button
            onClick={onAddClick}
            style={{
              background: '#FAFAFA',
              borderRadius: 12,
              boxShadow: '#E9EAEB 0px 0px 0px 1px inset',
              width: 280,
              minWidth: 280,
              flexShrink: 0,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 24,
            }}
            className="hover:bg-neutral-100 transition-colors"
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px dashed #D5D7DA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} className="text-neutral-400" />
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#717680',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              Add property
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── Table mode (equity / cashflow / purchases) ──
  // Editable-grid language (Option A, refined): faint internal column dividers
  // inset from the card edges (px-5 keeps every border clear of the sides),
  // centred numeric values so cells read evenly. No outer box, no header band.
  // Read-only tables stay borderless and hover-free by contrast.
  return (
    <div className="px-5 pb-5">
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth: mode === 'purchases' ? 1548 : mode === 'cashflow' ? 1200 : 700, tableLayout: 'fixed' }}>
          <thead>
            {/* Column headers — §2.2 record table: 11px / 500 / #717680, numerics right-aligned */}
            <tr className="border-b border-[#E9EAEB]">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`text-[11px] font-medium text-[#717680] py-2.5 ${col.key === 'year' ? 'px-1.5' : 'px-4'} whitespace-nowrap ${
                    NUMERIC_KEYS.has(col.key) || col.key === 'year' ? 'text-center' : 'text-left'
                  } ${i > 0 ? 'border-l border-[#F2F4F7]' : ''}`}
                  style={mode === 'purchases' ? { width: PURCHASES_COL_WIDTHS[col.key] } : undefined}
                >
                  {col.headerTip
                    ? <HeaderTip tip={col.headerTip}>{col.header}</HeaderTip>
                    : col.header}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {cards.map(card => {
              if (!card.instanceData) return null;
              return (
                <tr key={card.instanceId} className="border-b border-[#F2F2F2] last:border-b-0 hover:bg-[#FAFAFA] transition-colors">
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`${col.key === 'year' ? 'px-1.5' : 'px-4'} py-2 align-middle ${i > 0 ? 'border-l border-[#F2F4F7]' : ''}`}
                    >
                      {col.key === 'saleYear' && card.instanceData
                        ? <SaleYearToggle value={card.instanceData.saleYear} onChange={v => handleFieldChange(card.instanceId, 'saleYear', v as any)} estimate={saleEstimates[card.instanceId]} />
                        : col.render(card as CardData, handleFieldChange)}
                    </td>
                  ))}
                  <td className="py-1 px-1">
                    <button
                      onClick={() => handleRemove(card.instanceId)}
                      className="p-1 text-[#C4B5FD] hover:text-[#7C3AED] transition-colors bg-transparent border-none cursor-pointer"
                      title="Remove property"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

      </div>
    </div>
  );
};

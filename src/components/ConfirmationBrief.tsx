import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Lock, Check, ChevronDown, Minus, Plus, X, Copy, CalendarDays } from 'lucide-react';
import { useLayout } from '@/contexts/LayoutContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useExistingPropertiesSafe } from '@/contexts/ScenarioSaveContext';
import { AffordabilityAlert } from '@/components/ui/AffordabilityAlert';
import { runPlanPreCheck, analyzePlanTimings, type PreCheckFailure, type PropertyTimingInsight, type BindingTest } from '@/engine/planPreCheck';
import type { NLParseResponse, FieldSource, FieldSourceMap } from '@/types/nlParse';
import { getPropertyInstanceDefaults } from '@/utils/propertyInstanceDefaults';
import { getCategoryLabel } from '@/utils/propertyCells';
import { BASE_YEAR, PERIODS_PER_YEAR } from '@/constants/financialParams';
import { InfoPopover } from './RetirementScenario/InfoPopover';
import { queueAiInsight, type ReceiptItem } from '@/contexts/ChangeReceiptContext';

// ── UUI Design Tokens (matching ChartCard / Dashboard) ───────────────────────
const UUI = {
  font: 'Inter, system-ui, -apple-system, sans-serif',
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

const BRIEF_STYLE = `
@keyframes briefFieldIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes briefBlockIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.brief-scroll::-webkit-scrollbar { display: none; }
`;

const STRATEGY_LABELS: Record<string, string> = {
  'eg-low': 'Equity growth · low entry',
  'eg-high': 'Equity growth · high entry',
  'cf-low': 'Cash flow · low entry',
  'cf-high': 'Cash flow · high entry',
  'commercial-transition': 'Commercial transition',
  'eg-to-cf': 'Growth to cash flow',
};

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

const getSource = (map: FieldSourceMap | undefined, field: string): FieldSource =>
  map?.[field] ?? 'assumed';

const periodToYear = (p: number) => BASE_YEAR + Math.floor((p - 1) / PERIODS_PER_YEAR);

// Only offer a pull-forward when it changes the DISPLAYED year. The engine
// works in half-year periods, so "earlier" can mean H2 → H1 of the same
// year — invisible in the year-granular UI and confusing to offer.
const isPullForward = (t: PropertyTimingInsight) =>
  t.feasibleAtTested &&
  t.earliestFeasiblePeriod !== null &&
  periodToYear(t.earliestFeasiblePeriod) < periodToYear(t.testedPeriod);

const fmtNum = (v: number) => Math.round(v).toLocaleString('en-AU');
const fmtDollar = (v: number) => `$${fmtNum(v)}`;

// ── Source dot (after label) ─────────────────────────────────────────────────

const Dot: React.FC<{ source: FieldSource }> = ({ source }) => {
  if (source === 'derived') return null;
  return (
    <div
      className="w-1.5 h-1.5 rounded-full shrink-0 ml-1 inline-block"
      style={{ backgroundColor: source === 'user' ? UUI.green500 : UUI.amber500 }}
    />
  );
};

const SourceLegend: React.FC = () => (
  <div className="flex items-center gap-3" style={{ fontFamily: UUI.font, fontSize: 11, color: UUI.neutral400 }}>
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: UUI.green500 }} />
      From brief
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: UUI.amber500 }} />
      AI estimate
    </div>
  </div>
);

// ── Editable number input ────────────────────────────────────────────────────

const NumInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}> = ({ value, onChange, prefix }) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const display = prefix ? `${prefix}${fmtNum(value)}` : fmtNum(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : display}
      onFocus={() => { setFocused(true); setDraft(String(value)); }}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const n = parseFloat(draft.replace(/[^0-9.-]/g, ''));
        if (!isNaN(n) && n !== value) onChange(n);
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      style={{ fontFamily: UUI.font, fontSize: 12, color: UUI.neutral500 }}
      className="w-full bg-transparent outline-none text-right px-1 py-0.5 rounded hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300"
    />
  );
};

// ── Segmented button group ───────────────────────────────────────────────────

const Segmented: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${UUI.neutral200}` }}>
    {options.map((opt, i) => {
      const isActive = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            fontFamily: UUI.font,
            fontSize: 11,
            fontWeight: 500,
            backgroundColor: isActive ? UUI.white : UUI.neutral50,
            color: isActive ? UUI.neutral700 : UUI.neutral500,
            borderLeft: i !== 0 ? `1px solid ${UUI.neutral200}` : 'none',
            boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            height: 30,
            whiteSpace: 'nowrap' as const,
          }}
          className="flex-1 px-2 transition-colors cursor-pointer"
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

// ── Year stepper ─────────────────────────────────────────────────────────────

const YearStepper: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${UUI.neutral200}`, height: 30 }}>
    <button type="button" onClick={() => onChange(value - 1)} className="px-2 hover:bg-neutral-50 cursor-pointer h-full" style={{ color: UUI.neutral400 }}><Minus size={12} /></button>
    <span style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 500, color: UUI.neutral700, backgroundColor: UUI.neutral50 }} className="flex-1 text-center h-full flex items-center justify-center">{value}</span>
    <button type="button" onClick={() => onChange(value + 1)} className="px-2 hover:bg-neutral-50 cursor-pointer h-full" style={{ color: UUI.neutral400 }}><Plus size={12} /></button>
  </div>
);

// ── Dropdown select ──────────────────────────────────────────────────────────

const Dropdown: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}> = ({ value, options, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 500, color: UUI.neutral700, border: `1px solid ${UUI.neutral200}`, height: 30 }}
        className="flex items-center justify-between gap-1 w-full bg-white rounded-lg px-2.5 hover:bg-neutral-50 cursor-pointer"
      >
        {selected?.label ?? value}
        <ChevronDown size={12} style={{ color: UUI.neutral400 }} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-lg shadow-lg min-w-[180px] py-0.5" style={{ border: `1px solid ${UUI.neutral200}` }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{ fontFamily: UUI.font, fontSize: 12, color: opt.value === value ? UUI.neutral900 : UUI.neutral500, fontWeight: opt.value === value ? 600 : 400 }}
              className={`w-full text-left px-3 py-1.5 transition-colors cursor-pointer ${
                opt.value === value ? 'bg-neutral-50' : 'hover:bg-neutral-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Sale year toggle (brief blocks) ─────────────────────────────────────────

const BriefSaleYearToggle: React.FC<{
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}> = ({ value, onChange }) => {
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
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative flex items-center gap-1.5" style={{ height: 30 }}>
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
          style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 500, color: '#7C3AED' }}
          className="hover:opacity-80 transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          {value}
        </button>
      )}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-lg shadow-lg p-2 flex items-center gap-1.5" style={{ border: `1px solid ${UUI.neutral200}`, minWidth: 140 }}>
          <CalendarDays size={12} className="text-neutral-400 flex-shrink-0" />
          <input
            type="number"
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setOpen(false); }}
            style={{ fontFamily: UUI.font, fontSize: 12, width: 64 }}
            className="border border-neutral-200 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-violet-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
      )}
    </div>
  );
};

// ── Client card field row ────────────────────────────────────────────────────

const ClientRow: React.FC<{
  label: string;
  source: FieldSource;
  children: React.ReactNode;
  delay?: number;
  /** (i) popover for read-only rows whose value is set elsewhere. */
  info?: React.ReactNode;
}> = ({ label, source, children, delay = 0, info }) => (
  <div
    className="flex items-center justify-between py-1.5"
    style={{
      borderBottom: `1px solid ${UUI.neutral100}`,
      animation: 'briefFieldIn 0.3s ease-out both',
      animationDelay: `${delay}ms`,
    }}
  >
    <span style={{ fontFamily: UUI.font, fontSize: 12, color: UUI.neutral500 }} className="flex items-center">
      {label}
      <Dot source={source} />
      {info}
    </span>
    <div className="text-right">{children}</div>
  </div>
);

// ── Property block ───────────────────────────────────────────────────────────

interface PropertyBlockProps {
  index: number;
  total: number;
  property: NonNullable<NLParseResponse['properties']>[0];
  sources: FieldSourceMap;
  onFieldChange: (field: string, value: any) => void;
  onRemove: () => void;
  failure?: PreCheckFailure;
  isDismissed?: boolean;
  onDismissAlert?: () => void;
  insight?: PropertyTimingInsight;
}

// One-line timing hint under the purchase year. Shown ONLY when the property
// could be bought earlier than planned — failures are covered by the
// affordability alert popup, and properties at their earliest need no note.
const TimingHint: React.FC<{ insight: PropertyTimingInsight; onMove: (period: number) => void }> = ({ insight, onMove }) => {
  const earliest = insight.earliestFeasiblePeriod;
  if (!isPullForward(insight) || earliest === null) return null;

  return (
    <div
      className="flex items-center justify-between"
      style={{ background: UUI.neutral50, borderRadius: 6, padding: '4px 8px', boxShadow: `${UUI.neutral200} 0px 0px 0px 1px inset` }}
    >
      <span className="flex items-center gap-1.5" style={{ fontFamily: UUI.font, fontSize: 10, color: UUI.neutral500 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: UUI.green500, display: 'inline-block', flexShrink: 0 }} />
        Could buy in {periodToYear(earliest)}
      </span>
      <button
        type="button"
        onClick={() => onMove(earliest)}
        style={{ fontFamily: UUI.font, fontSize: 10, fontWeight: 600, color: UUI.neutral900 }}
        className="hover:underline cursor-pointer bg-transparent border-none p-0"
      >
        Move
      </button>
    </div>
  );
};

const PropertyBlock: React.FC<PropertyBlockProps> = ({ index, total, property, sources, onFieldChange, onRemove, failure, isDismissed, onDismissAlert, insight }) => {
  const purchaseYear = property.targetPeriod
    ? BASE_YEAR + Math.floor((property.targetPeriod - 1) / PERIODS_PER_YEAR)
    : BASE_YEAR + index;
  const blockDelay = 400 + index * 100;

  const fieldLabel = (text: string, sourceKey: string) => (
    <div style={{ fontFamily: UUI.font, fontSize: 10, color: UUI.neutral400, marginBottom: 4 }} className="flex items-center">{text}<Dot source={getSource(sources, sourceKey)} /></div>
  );

  const borderedInput = (defaultVal: string, field: string) => (
    <input
      type="text"
      inputMode="decimal"
      defaultValue={defaultVal}
      onBlur={e => { const n = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')); if (!isNaN(n)) onFieldChange(field, n); }}
      style={{ fontFamily: UUI.font, fontSize: 12, color: UUI.neutral500, border: `1px solid ${UUI.neutral200}`, borderRadius: 8, height: 30 }}
      className="w-full px-2 outline-none focus:ring-1 focus:ring-neutral-300"
    />
  );

  const hasActiveFailure = failure && !isDismissed;

  return (
    <div
      style={{
        flex: '0 0 auto',
        width: 'calc(25% - 9px)',
        minWidth: 200,
        background: UUI.white,
        borderRadius: 12,
        border: `1px solid ${hasActiveFailure ? '#EF4444' : UUI.neutral200}`,
        padding: '12px 14px',
        animation: 'briefBlockIn 0.35s ease-out both',
        animationDelay: `${blockDelay}ms`,
      }}
      className="flex flex-col gap-2.5"
    >
      {/* Header: title + actions */}
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 600, color: UUI.neutral700 }}>
          Property {index + 1}
          <span style={{ fontWeight: 400, color: UUI.neutral400 }}> · {getCategoryLabel(property.type).replace(/ Property$/, '')}</span>
        </span>
        <div className="flex items-center gap-0.5">
          <button className="p-0.5 transition-colors cursor-pointer" style={{ color: UUI.neutral200 }} onMouseEnter={e => e.currentTarget.style.color = UUI.neutral500} onMouseLeave={e => e.currentTarget.style.color = UUI.neutral200}><Copy size={12} /></button>
          {total > 1 && (
            <button onClick={onRemove} className="p-0.5 transition-colors cursor-pointer" style={{ color: UUI.neutral200 }} onMouseEnter={e => e.currentTarget.style.color = '#EF4444'} onMouseLeave={e => e.currentTarget.style.color = UUI.neutral200}><X size={12} /></button>
          )}
        </div>
      </div>

      {/* Growth + Entity side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          {fieldLabel('Growth', 'growthAssumption')}
          <Segmented options={[{ value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Med' }, { value: 'High', label: 'High' }]} value={property.growthAssumption} onChange={v => onFieldChange('growthAssumption', v)} />
        </div>
        <div>
          {fieldLabel('Entity', 'entity')}
          <Segmented options={[{ value: 'individual', label: 'Individual' }, { value: 'trust', label: 'Trust' }]} value={property.entity ?? 'individual'} onChange={v => onFieldChange('entity', v)} />
        </div>
      </div>

      {/* Type (new build vs established — affects proposed 2027 CGT) */}
      <div>
        {fieldLabel('Type', 'isNewBuild')}
        <Segmented options={[{ value: 'established', label: 'Established' }, { value: 'new', label: 'New build' }]} value={property.isNewBuild ? 'new' : 'established'} onChange={v => onFieldChange('isNewBuild', v === 'new')} />
      </div>

      {/* State + Year side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          {fieldLabel('State', 'state')}
          <Dropdown value={property.state} options={STATE_OPTIONS.map(s => ({ value: s, label: s }))} onChange={v => onFieldChange('state', v)} />
        </div>
        <div>
          {fieldLabel('Purchase year', 'targetPeriod')}
          {hasActiveFailure && onDismissAlert ? (
            <AffordabilityAlert
              depositTestPass={failure.depositTestPass}
              serviceabilityTestPass={failure.serviceabilityTestPass}
              borrowingCapacityRemaining={failure.borrowingCapacityRemaining}
              depositTestSurplus={failure.depositTestSurplus}
              serviceabilityTestSurplus={failure.serviceabilityTestSurplus}
              onDismiss={onDismissAlert}
            >
              <div style={{ border: '1px solid #EF4444', borderRadius: 8 }}>
                <YearStepper value={purchaseYear} onChange={v => onFieldChange('targetPeriod', ((v - BASE_YEAR) * PERIODS_PER_YEAR) + 1)} />
              </div>
            </AffordabilityAlert>
          ) : (
            <YearStepper value={purchaseYear} onChange={v => onFieldChange('targetPeriod', ((v - BASE_YEAR) * PERIODS_PER_YEAR) + 1)} />
          )}
        </div>
      </div>

      {/* Timing insight — pull-forward opportunity or binding constraint */}
      {insight && <TimingHint insight={insight} onMove={period => onFieldChange('targetPeriod', period)} />}

      {/* Price + Rent */}
      <div className="grid grid-cols-2 gap-2">
        <div>{fieldLabel('Price ($)', 'purchasePrice')}{borderedInput(fmtNum(property.purchasePrice), 'purchasePrice')}</div>
        <div>{fieldLabel('Rent / wk ($)', 'rentPerWeek')}{borderedInput(fmtNum(property.rentPerWeek ?? 0), 'rentPerWeek')}</div>
      </div>

      {/* Loan + Sell side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          {fieldLabel('Loan', 'loanProduct')}
          <Segmented options={[{ value: 'IO', label: 'IO' }, { value: 'PI', label: 'P&I' }]} value={property.loanProduct} onChange={v => onFieldChange('loanProduct', v)} />
        </div>
        <div>
          <div style={{ fontFamily: UUI.font, fontSize: 10, color: UUI.neutral400, marginBottom: 4 }} className="flex items-center">Sell</div>
          <BriefSaleYearToggle value={property.saleYear} onChange={v => onFieldChange('saleYear', v)} />
        </div>
      </div>
    </div>
  );
};

// ── Existing property block ──────────────────────────────────────────────────

type ExistingProp = NonNullable<NonNullable<NLParseResponse['clientProfile']>['existingPortfolio']>[0];

const EMPTY_EXISTING: ExistingProp = { state: 'NSW', purchasePrice: 0, currentValue: 0, loan: 0, allowEquityRelease: true };

interface ExistingBlockProps {
  index: number;
  total: number;
  property: ExistingProp;
  onFieldChange: (field: string, value: any) => void;
  onRemove: () => void;
  delay: number;
}

const ExistingBlock: React.FC<ExistingBlockProps> = ({ index, total, property, onFieldChange, onRemove, delay }) => {
  const boughtYear = property.boughtYear ?? 2020;

  const fieldLabel = (text: string) => (
    <div style={{ fontFamily: UUI.font, fontSize: 10, color: UUI.neutral400, marginBottom: 4 }} className="flex items-center">{text}</div>
  );

  const borderedInput = (defaultVal: string, field: string) => (
    <input
      type="text"
      inputMode="decimal"
      defaultValue={defaultVal}
      onBlur={e => { const n = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')); if (!isNaN(n)) onFieldChange(field, n); }}
      style={{ fontFamily: UUI.font, fontSize: 12, color: UUI.neutral500, border: `1px solid ${UUI.neutral200}`, borderRadius: 8, height: 30 }}
      className="w-full px-2 outline-none focus:ring-1 focus:ring-neutral-300"
    />
  );

  return (
    <div
      style={{
        flex: '0 0 auto',
        width: 'calc(25% - 9px)',
        minWidth: 200,
        background: UUI.white,
        borderRadius: 12,
        border: `1px solid ${UUI.neutral200}`,
        padding: '12px 14px',
        animation: 'briefBlockIn 0.35s ease-out both',
        animationDelay: `${delay}ms`,
      }}
      className="flex flex-col gap-2.5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 600, color: UUI.neutral700 }}>{property.address || `Property ${index + 1}`}</span>
        <div className="flex items-center gap-0.5">
          {total > 0 && (
            <button onClick={onRemove} className="p-0.5 transition-colors cursor-pointer" style={{ color: UUI.neutral200 }} onMouseEnter={e => e.currentTarget.style.color = '#EF4444'} onMouseLeave={e => e.currentTarget.style.color = UUI.neutral200}><X size={12} /></button>
          )}
        </div>
      </div>

      {/* Entity + State side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          {fieldLabel('Entity')}
          <Segmented options={[{ value: 'individual', label: 'Individual' }, { value: 'trust', label: 'Trust' }]} value={(property as any).entity ?? 'individual'} onChange={v => onFieldChange('entity', v)} />
        </div>
        <div>
          {fieldLabel('State')}
          <Dropdown value={property.state} options={STATE_OPTIONS.map(s => ({ value: s, label: s }))} onChange={v => onFieldChange('state', v)} />
        </div>
      </div>

      {/* Bought year + Loan type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          {fieldLabel('Bought year')}
          <YearStepper value={boughtYear} onChange={v => onFieldChange('boughtYear', v)} />
        </div>
        <div>
          {fieldLabel('Loan type')}
          <Segmented options={[{ value: 'IO', label: 'IO' }, { value: 'PI', label: 'P&I' }]} value={property.loanType ?? 'IO'} onChange={v => onFieldChange('loanType', v)} />
        </div>
      </div>

      {/* Purchase price + Rent */}
      <div className="grid grid-cols-2 gap-2">
        <div>{fieldLabel('Price ($)')}{borderedInput(fmtNum(property.purchasePrice), 'purchasePrice')}</div>
        <div>{fieldLabel('Rent / wk ($)')}{borderedInput(fmtNum(property.rentPerWeek ?? 0), 'rentPerWeek')}</div>
      </div>

      {/* Current value + Loan balance */}
      <div className="grid grid-cols-2 gap-2">
        <div>{fieldLabel('Current value ($)')}{borderedInput(fmtNum(property.currentValue), 'currentValue')}</div>
        <div>{fieldLabel('Loan balance ($)')}{borderedInput(fmtNum(property.loan), 'loan')}</div>
      </div>

      {/* Refinance + Sell side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          {fieldLabel('Refinance')}
          <Segmented options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} value={(property as any).allowEquityRelease !== false ? 'yes' : 'no'} onChange={v => onFieldChange('allowEquityRelease', v === 'yes')} />
        </div>
        <div>
          {fieldLabel('Sell')}
          <BriefSaleYearToggle value={(property as any).saleYear} onChange={v => onFieldChange('saleYear', v)} />
        </div>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

interface ConfirmationBriefProps {
  response: NLParseResponse;
}

/**
 * Merge the brief's edited existing-portfolio rows into the response. Used by
 * BOTH the live pre-check and handleConfirm so the affordability alerts always
 * test exactly what approval will submit to the dashboard.
 */
function mergeExistingIntoResponse(response: NLParseResponse, existingProps: ExistingProp[]): NLParseResponse {
  if (!response.clientProfile) return response;
  return {
    ...response,
    clientProfile: {
      ...response.clientProfile,
      existingPortfolio: existingProps.length > 0 ? existingProps : undefined,
    },
  };
}

/**
 * Enrich raw AI properties with template defaults (rent, interest rate, etc.)
 * so the confirmation screen shows realistic values instead of zeros.
 * Mirrors what mapToPropertySelections does in nlDataMapper.ts.
 */
function enrichProperties(response: NLParseResponse): NLParseResponse {
  if (!response.properties) return response;
  const enriched = structuredClone(response);
  enriched.properties = enriched.properties!.map(prop => {
    const defaults = getPropertyInstanceDefaults(prop.type);
    return {
      ...prop,
      rentPerWeek: prop.rentPerWeek ?? defaults.rentPerWeek,
    };
  });
  return enriched;
}

export const ConfirmationBrief: React.FC<ConfirmationBriefProps> = ({ response }) => {
  const { confirmPlanHandler } = useLayout();
  const [editedResponse, setEditedResponse] = useState<NLParseResponse>(() => enrichProperties(response));
  const editedResponseRef = useRef(editedResponse);
  editedResponseRef.current = editedResponse;
  const [editedClientSources, setEditedClientSources] = useState<FieldSourceMap>(() => ({ ...(response.clientProfileSources ?? {}) }));
  const [editedProfileSources, setEditedProfileSources] = useState<FieldSourceMap>(() => ({ ...(response.investmentProfileSources ?? {}) }));
  const [editedPropertySources, setEditedPropertySources] = useState<FieldSourceMap[]>(() => (response.propertySources ?? []).map(s => ({ ...s })));

  const cp = editedResponse.clientProfile;
  const ip = editedResponse.investmentProfile;

  const updateClientField = (field: string, value: number) => {
    setEditedResponse(prev => {
      if (!prev.clientProfile) return prev;
      const next = { ...prev, clientProfile: { ...prev.clientProfile, [field]: value } };
      // The "Deposit / cash" row edits clientProfile.currentDeposit, but the
      // engine's depositPool comes from investmentProfile.depositPool, which
      // OVERRIDES currentDeposit in mapToInvestmentProfile. Keep the two in
      // sync so editing the deposit actually re-runs affordability + the
      // pull-forward insight (and so the edit isn't dropped on confirm).
      if (field === 'currentDeposit' && next.investmentProfile) {
        next.investmentProfile = { ...next.investmentProfile, depositPool: value };
      }
      return next;
    });
    setEditedClientSources(prev => ({ ...prev, [field]: 'user' }));
    if (field === 'currentDeposit') {
      setEditedProfileSources(prev => ({ ...prev, depositPool: 'user' }));
    }
  };
  const updateProfileField = (field: string, value: any) => {
    setEditedResponse(prev => ({ ...prev, investmentProfile: prev.investmentProfile ? { ...prev.investmentProfile, [field]: value } : prev.investmentProfile }));
    setEditedProfileSources(prev => ({ ...prev, [field]: 'user' }));
  };
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());
  const { profile } = useInvestmentProfile();
  const contextExistingProps = useExistingPropertiesSafe();

  // Existing portfolio — declared before the pre-check so edits to it
  // immediately re-test affordability.
  const [existingProps, setExistingProps] = useState<ExistingProp[]>(
    () => cp?.existingPortfolio ? structuredClone(cp.existingPortfolio) : []
  );
  const existingPropsRef = useRef(existingProps);
  existingPropsRef.current = existingProps;

  // Single source of truth: the exact response that confirm will submit.
  // Pre-check and insights run against THIS object, so what the alerts say
  // is guaranteed to match what lands on the dashboard.
  const responseForCheck = useMemo(
    () => mergeExistingIntoResponse(editedResponse, existingProps),
    [editedResponse, existingProps]
  );

  // Falls back to the dashboard's existing properties when neither the AI
  // nor the user supplied any — the same data the dashboard tests with.
  const preCheckResult = useMemo(
    () => runPlanPreCheck(responseForCheck, profile, contextExistingProps),
    [responseForCheck, profile, contextExistingProps]
  );

  // Per-property timing insights: earliest feasible year + binding constraint
  const timingInsights = useMemo(
    () => analyzePlanTimings(responseForCheck, profile, contextExistingProps),
    [responseForCheck, profile, contextExistingProps]
  );

  // Pull every property forward to its earliest feasible year, re-analyzing
  // after each move so earlier purchases (which consume funds sooner) can't
  // silently break the ones behind them.
  const pullForwardCount = timingInsights.filter(isPullForward).length;
  const applyPullForwards = () => {
    let resp = mergeExistingIntoResponse(editedResponseRef.current, existingPropsRef.current);
    const movedIndexes: number[] = [];
    for (let guard = 0; guard < 10; guard++) {
      const insights = analyzePlanTimings(resp, profile, contextExistingProps);
      const move = insights.find(isPullForward);
      if (!move) break;
      movedIndexes.push(move.propertyIndex);
      resp = {
        ...resp,
        properties: resp.properties!.map((p, idx) =>
          idx === move.propertyIndex ? { ...p, targetPeriod: move.earliestFeasiblePeriod! } : p
        ),
      };
    }
    if (movedIndexes.length === 0) return;
    const movedProperties = resp.properties;
    setEditedResponse(prev => ({ ...prev, properties: movedProperties }));
    setEditedPropertySources(prev => {
      const updated = [...prev];
      for (const idx of movedIndexes) {
        updated[idx] = { ...(updated[idx] ?? {}), targetPeriod: 'user' };
      }
      return updated;
    });
  };

  // High-level constraint notes for the plan-explanation card: which tests
  // are holding the plan back, ordered by how many purchases each one binds,
  // with the lever that improves it.
  const constraintNotes = useMemo(() => {
    const counts: Record<BindingTest, number> = { deposit: 0, serviceability: 0, borrowingCapacity: 0 };
    // Only count a constraint as "limiting" when the property actually FAILS at
    // its placed period — i.e. it doesn't fit where the plan puts it. A purchase
    // that is feasible where it sits but simply couldn't be brought earlier is
    // normal sequencing, not a problem; counting those made the note claim
    // "deposit holds back N purchases" on plans where every purchase is fine.
    timingInsights
      .filter(t => !t.feasibleAtTested)
      .forEach(t => new Set(t.bindingTests).forEach(k => counts[k]++));
    const plural = (n: number) => (n === 1 ? '1 purchase' : `${n} purchases`);
    return ([
      {
        n: counts.deposit,
        text: `Deposit cash holds back ${plural(counts.deposit)} — improve with higher savings, equity release from existing properties, or lower purchase prices.`,
      },
      {
        n: counts.serviceability,
        text: `Loan serviceability limits ${plural(counts.serviceability)} — trust structures, stronger rents, or higher income lift it.`,
      },
      {
        n: counts.borrowingCapacity,
        text: `The borrowing capacity ceiling limits ${plural(counts.borrowingCapacity)} — trust entities or an updated lending pre-approval raise it.`,
      },
    ] as const)
      .filter(e => e.n > 0)
      .sort((a, b) => b.n - a.n)
      .map(e => e.text);
  }, [timingInsights]);
  const failureByIndex = useMemo(() => {
    const map = new Map<number, PreCheckFailure>();
    preCheckResult.failures.forEach(f => map.set(f.propertyIndex - 1, f));
    return map;
  }, [preCheckResult]);

  const updatePropertyField = (index: number, field: string, value: any) => {
    console.warn(`[Brief] updatePropertyField(${index}, ${field}, ${value})`);
    if (field !== 'alertDismissed') {
      setDismissedAlerts(prev => { const next = new Set(prev); next.delete(index); return next; });
    }
    setEditedResponse(prev => {
      const props = [...(prev.properties ?? [])];
      props[index] = { ...props[index], [field]: value };
      console.warn(`[Brief] setEditedResponse: P${index+1} targetPeriod=${props[index].targetPeriod}`);
      return { ...prev, properties: props };
    });
    setEditedPropertySources(prev => {
      const updated = [...prev];
      if (!updated[index]) updated[index] = {};
      updated[index] = { ...updated[index], [field]: 'user' };
      return updated;
    });
  };
  const removeProperty = (index: number) => {
    setEditedResponse(prev => ({ ...prev, properties: (prev.properties ?? []).filter((_, i) => i !== index) }));
    setEditedPropertySources(prev => prev.filter((_, i) => i !== index));
  };

  const updateExistingField = (index: number, field: string, value: any) => {
    setExistingProps(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const removeExisting = (index: number) => setExistingProps(prev => prev.filter((_, i) => i !== index));
  const addExisting = () => setExistingProps(prev => [...prev, { ...EMPTY_EXISTING }]);

  const handleConfirm = () => {
    const current = editedResponseRef.current;
    console.warn('[Brief] handleConfirm targetPeriods:', (current.properties ?? []).map((p, i) => `P${i+1}=${p.targetPeriod}`).join(', '));
    const finalResponse = {
      ...mergeExistingIntoResponse(current, existingPropsRef.current),
      clientProfileSources: editedClientSources,
      investmentProfileSources: editedProfileSources,
      propertySources: editedPropertySources,
    };

    // AI decisions land in the change bell so they stay findable after the
    // brief closes: timing hints the user didn't act on, and properties the
    // auto-fix dropped. (The brief renders outside the provider — queued.)
    const insightItems: ReceiptItem[] = [];
    timingInsights.filter(isPullForward).forEach(t => {
      insightItems.push({
        text: `Property ${t.propertyIndex + 1} could be bought in ${periodToYear(t.earliestFeasiblePeriod!)} — earlier than planned. Move it in Purchases.`,
        positive: true,
      });
    });
    (current._autoFixChanges ?? []).filter(c => c.changeType === 'dropped').forEach(c => {
      insightItems.push({
        text: `${c.propertyLabel} removed — could not fit within borrowing capacity.`,
        positive: false,
      });
    });
    queueAiInsight('Plan approved — AI notes', insightItems);

    confirmPlanHandler.current?.(finalResponse);
  };

  const clientName = cp?.members?.map(m => m.name).filter(Boolean).join(' & ') || 'Client';
  const propertyCount = editedResponse.properties?.length ?? 0;
  const timelineYears = ip?.timelineYears ?? 20;
  const strategyLabel = STRATEGY_LABELS[editedResponse.strategyPreset ?? ''] ?? 'Equity growth · low entry';
  const initial = clientName.charAt(0).toUpperCase();

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(3px)' }}>
      <style>{BRIEF_STYLE}</style>
      <div
        style={{
          width: '94%',
          maxWidth: 1320,
          maxHeight: '90vh',
          background: UUI.white,
          borderRadius: 16,
          border: `1px solid ${UUI.neutral200}`,
          boxShadow: 'rgba(0, 0, 0, 0.08) 0px 8px 40px, rgba(0, 0, 0, 0.04) 0px 2px 8px',
        }}
        className="overflow-hidden flex flex-col"
      >
        {/* Scrollable content */}
        <div className="brief-scroll overflow-y-auto flex-1" style={{ scrollbarWidth: 'none', padding: '24px 24px 16px 24px' }}>
          <div className="flex flex-col gap-4">

          {/* ── Client card (UUI outer/inner card pattern) ── */}
          <div
            style={{
              background: UUI.neutral50,
              borderRadius: 12,
              boxShadow: `${UUI.neutral200} 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`,
              animation: 'briefBlockIn 0.35s ease-out both',
            }}
          >
            {/* Card header */}
            <div style={{ padding: '12px 16px 0 16px' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: UUI.neutral700, color: UUI.white, fontFamily: UUI.font, fontSize: 11, fontWeight: 600 }}>{initial}</div>
                  <div>
                    <div style={{ fontFamily: UUI.font, fontSize: 14, fontWeight: 600, color: UUI.neutral900, lineHeight: '18px' }}>{clientName}</div>
                    <div style={{ fontFamily: UUI.font, fontSize: 11, color: UUI.neutral400, lineHeight: '16px' }}>Client plan · {propertyCount} properties · {timelineYears} yrs</div>
                  </div>
                </div>
                <SourceLegend />
              </div>
            </div>

            {/* Inner white card */}
            <div style={{ background: UUI.white, borderRadius: 12, margin: '12px 0 0 0', boxShadow: `${UUI.neutral200} 0px 0px 0px 1px inset`, padding: '12px 16px' }}>
              <div className="grid grid-cols-2 gap-6">
                {/* Position */}
                <div>
                  <div style={{ fontFamily: UUI.font, fontSize: 10, fontWeight: 600, color: UUI.neutral400, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Position</div>
                  <ClientRow label="Deposit / cash" source={getSource(editedClientSources, 'currentDeposit')} delay={80}>
                    <NumInput value={cp?.currentDeposit ?? 0} prefix="$" onChange={v => updateClientField('currentDeposit', v)} />
                  </ClientRow>
                  <ClientRow label="Borrowing capacity" source={getSource(editedClientSources, 'borrowingCapacity')} delay={130}>
                    <NumInput value={cp?.borrowingCapacity ?? 0} prefix="$" onChange={v => updateClientField('borrowingCapacity', v)} />
                  </ClientRow>
                  <ClientRow label="Base salary" source={getSource(editedProfileSources, 'baseSalary')} delay={180}>
                    <NumInput value={ip?.baseSalary ?? 0} prefix="$" onChange={v => updateProfileField('baseSalary', v)} />
                  </ClientRow>
                  <ClientRow label="Annual savings" source={getSource(editedProfileSources, 'annualSavings')} delay={230}>
                    <NumInput value={ip?.annualSavings ?? 0} prefix="$" onChange={v => updateProfileField('annualSavings', v)} />
                  </ClientRow>
                  <ClientRow
                    label="Usable equity"
                    source={getSource(editedClientSources, 'existingPropertyEquity')}
                    delay={280}
                    info={existingProps.length > 0 ? (
                      <InfoPopover
                        iconSize={13}
                        title="Usable equity"
                        body={[
                          'Calculated from the existing portfolio below — 80% of each property’s value minus its loan.',
                          'Edit the property values in the Existing Portfolio section to change it.',
                        ]}
                      />
                    ) : undefined}
                  >
                    {existingProps.length > 0 ? (
                      // Derived from the existing portfolio blocks below — the engine
                      // uses per-property values when they exist, so show that figure
                      // instead of an editable field that would be ignored.
                      <span style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 500, color: UUI.neutral900 }} title="Derived from the existing portfolio below (80% of value less loans)">
                        {fmtDollar(existingProps.reduce((s, p) => s + Math.max(0, (p.currentValue ?? 0) * 0.8 - (p.loan ?? 0)), 0))}
                      </span>
                    ) : (
                      <NumInput value={cp?.existingPropertyEquity ?? 0} prefix="$" onChange={v => updateClientField('existingPropertyEquity', v)} />
                    )}
                  </ClientRow>
                </div>

                {/* Goals */}
                <div>
                  <div style={{ fontFamily: UUI.font, fontSize: 10, fontWeight: 600, color: UUI.neutral400, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Goals</div>
                  <ClientRow
                    label="Timeline"
                    source={getSource(editedProfileSources, 'timelineYears')}
                    delay={100}
                    info={
                      <InfoPopover
                        iconSize={13}
                        title="Timeline"
                        body={[
                          'Set from the client brief.',
                          'Ask in chat to change the timeline — the whole plan replans around it.',
                        ]}
                      />
                    }
                  >
                    <span style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 500, color: UUI.neutral900 }}>{timelineYears} yrs</span>
                  </ClientRow>
                  <ClientRow label="Equity goal" source={getSource(editedProfileSources, 'equityGoal')} delay={150}>
                    <NumInput value={ip?.equityGoal ?? 0} prefix="$" onChange={v => updateProfileField('equityGoal', v)} />
                  </ClientRow>
                  <ClientRow label="Cashflow goal" source={getSource(editedProfileSources, 'cashflowGoal')} delay={200}>
                    <NumInput value={ip?.cashflowGoal ?? 0} prefix="$" onChange={v => updateProfileField('cashflowGoal', v)} />
                  </ClientRow>
                  {/* Strategy is read-only here — the AI picks it from the brief
                      and company strategy; changing it belongs in chat, where a
                      full replan happens. */}
                  <ClientRow
                    label="Strategy"
                    source={getSource(editedProfileSources, 'strategyPreset')}
                    delay={250}
                    info={
                      <InfoPopover
                        iconSize={13}
                        title="Strategy"
                        body={[
                          'Chosen by the AI from the brief and your company strategy.',
                          'Ask in chat to change strategy — the whole plan replans.',
                        ]}
                      />
                    }
                  >
                    <span style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 500, color: UUI.neutral700 }}>
                      {strategyLabel}
                    </span>
                  </ClientRow>
                </div>
              </div>
            </div>
          </div>

          {/* ── Existing portfolio ── */}
          <div>
            <div className="mb-2">
              <span style={{ fontFamily: UUI.font, fontSize: 13, fontWeight: 600, color: UUI.neutral700 }}>Existing Portfolio</span>
            </div>
            {existingProps.length === 0 ? (
              <div
                onClick={addExisting}
                style={{
                  fontFamily: UUI.font, fontSize: 12, color: UUI.neutral400,
                  border: `1px dashed ${UUI.neutral200}`, borderRadius: 12,
                  padding: '14px 16px', textAlign: 'center', cursor: 'pointer',
                }}
                className="hover:bg-neutral-50 transition-colors"
              >
                No existing properties — click to add
              </div>
            ) : (
              <div className="flex gap-3">
                {existingProps.map((ep, i) => (
                  <ExistingBlock
                    key={i}
                    index={i}
                    total={existingProps.length}
                    property={ep}
                    onFieldChange={(field, value) => updateExistingField(i, field, value)}
                    onRemove={() => removeExisting(i)}
                    delay={350 + i * 80}
                  />
                ))}
                <button
                  onClick={addExisting}
                  style={{
                    background: UUI.neutral50,
                    borderRadius: 12,
                    boxShadow: `${UUI.neutral200} 0px 0px 0px 1px inset`,
                    flex: '0 0 auto',
                    width: 'calc(25% - 9px)',
                    minWidth: 200,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: 20,
                  }}
                  className="hover:bg-neutral-100 transition-colors"
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px dashed ${UUI.neutral200}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} style={{ color: UUI.neutral400 }} />
                  </div>
                  <span style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 500, color: UUI.neutral500 }}>Add property</span>
                </button>
              </div>
            )}
          </div>

          {/* ── AI strategy explanation + plan constraint notes ── */}
          {(editedResponse.message || constraintNotes.length > 0) && (
            <div
              style={{
                background: UUI.neutral50,
                borderRadius: 10,
                boxShadow: `${UUI.neutral200} 0px 0px 0px 1px inset`,
                padding: '10px 14px',
                fontFamily: UUI.font,
                animation: 'briefBlockIn 0.35s ease-out both',
              }}
            >
              {editedResponse.message && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: UUI.neutral400, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 5 }}>
                    Proposed plan
                  </div>
                  <div style={{ fontSize: 11, color: UUI.neutral500, lineHeight: '17px' }}>
                    {editedResponse.message}
                  </div>
                </>
              )}
              {constraintNotes.length > 0 && (
                <div style={{ marginTop: editedResponse.message ? 10 : 0, paddingTop: editedResponse.message ? 10 : 0, borderTop: editedResponse.message ? `1px solid ${UUI.neutral200}` : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: UUI.neutral400, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 5 }}>
                    What's limiting this plan
                  </div>
                  {constraintNotes.map((note, i) => (
                    <div key={i} className="flex items-start gap-2" style={{ fontSize: 11, color: UUI.neutral500, lineHeight: '17px' }}>
                      <span style={{ color: UUI.neutral400 }}>·</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Dropped-property notice (auto-fix removed infeasible properties) ── */}
          {editedResponse._autoFixChanges?.some(c => c.changeType === 'dropped') && (() => {
            const dropped = editedResponse._autoFixChanges!.filter(c => c.changeType === 'dropped');
            const labels = dropped.map(c => c.propertyLabel);
            const listStr = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
            return (
              <div
                style={{
                  background: '#FEF3C7',
                  borderRadius: 10,
                  boxShadow: '#F59E0B33 0px 0px 0px 1px inset',
                  padding: '10px 14px',
                  fontFamily: UUI.font,
                  animation: 'briefBlockIn 0.35s ease-out both',
                }}
              >
                <div style={{ fontSize: 11, color: '#92400E', lineHeight: '17px' }}>
                  {listStr} removed — could not fit within borrowing capacity even after adjusting timing and entity structures. You can add properties back using the + button below.
                </div>
              </div>
            );
          })()}

          {/* ── Pull-forward opportunity strip ── */}
          {pullForwardCount > 0 && (
            <div
              style={{
                background: UUI.white,
                borderRadius: 10,
                border: `1px solid ${UUI.neutral200}`,
                padding: '8px 14px',
                fontFamily: UUI.font,
                animation: 'briefBlockIn 0.35s ease-out both',
              }}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2" style={{ fontSize: 11, color: UUI.neutral500, lineHeight: '17px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: UUI.green500, display: 'inline-block', flexShrink: 0 }} />
                <span>
                  <span style={{ fontWeight: 600, color: UUI.neutral700 }}>
                    {pullForwardCount === 1 ? '1 purchase' : `${pullForwardCount} purchases`} could happen earlier.
                  </span>
                  {' '}The plan has more funding capacity than its current timing uses.
                </span>
              </div>
              <button
                type="button"
                onClick={applyPullForwards}
                style={{ fontFamily: UUI.font, fontSize: 11, fontWeight: 600, color: UUI.neutral700, backgroundColor: UUI.white, border: `1px solid ${UUI.neutral200}`, borderRadius: 8, padding: '4px 12px', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                className="transition-colors cursor-pointer hover:bg-neutral-50"
              >
                Pull forward
              </button>
            </div>
          )}

          {/* ── Planned property blocks ── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span style={{ fontFamily: UUI.font, fontSize: 13, fontWeight: 600, color: UUI.neutral700 }}>Proposed Purchases</span>
              <SourceLegend />
            </div>
            <div className="flex gap-3">
              {(editedResponse.properties ?? []).map((prop, i) => (
                <PropertyBlock
                  key={i}
                  index={i}
                  total={propertyCount}
                  property={prop}
                  sources={editedPropertySources[i] ?? {}}
                  onFieldChange={(field, value) => updatePropertyField(i, field, value)}
                  onRemove={() => removeProperty(i)}
                  failure={failureByIndex.get(i)}
                  isDismissed={dismissedAlerts.has(i)}
                  onDismissAlert={() => {
                    setDismissedAlerts(prev => new Set(prev).add(i));
                    updatePropertyField(i, 'alertDismissed', true);
                  }}
                  insight={timingInsights[i]}
                />
              ))}
              <button
                onClick={() => {
                  const defaultProp = { type: 'regional-house-growth', purchasePrice: 450000, state: 'QLD', growthAssumption: 'Medium' as const, loanProduct: 'IO' as const, lvr: 80 };
                  setEditedResponse(prev => ({ ...prev, properties: [...(prev.properties ?? []), defaultProp] }));
                  setEditedPropertySources(prev => [...prev, {}]);
                }}
                style={{
                  background: UUI.neutral50,
                  borderRadius: 12,
                  boxShadow: `${UUI.neutral200} 0px 0px 0px 1px inset`,
                  flex: '0 0 auto',
                  width: 'calc(25% - 9px)',
                  minWidth: 200,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: 20,
                }}
                className="hover:bg-neutral-100 transition-colors"
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px dashed ${UUI.neutral200}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={16} style={{ color: UUI.neutral400 }} />
                </div>
                <span style={{ fontFamily: UUI.font, fontSize: 12, fontWeight: 500, color: UUI.neutral500 }}>Add property</span>
              </button>
            </div>
          </div>

          </div>
        </div>

        {/* ── Sticky footer ── */}
        <div className="flex items-center justify-end px-6 py-3" style={{ borderTop: `1px solid ${UUI.neutral100}`, background: UUI.white }}>
            <button
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg transition-colors cursor-pointer"
              style={{ fontFamily: UUI.font, fontSize: 13, fontWeight: 600, color: UUI.white, backgroundColor: UUI.purple600 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = UUI.purple700)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = UUI.purple600)}
            >
              <Check size={14} />
              Approve
            </button>
        </div>
      </div>
    </div>
  );
};

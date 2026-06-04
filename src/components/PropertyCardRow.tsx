/**
 * PropertyCardRow — editable property table on the dashboard.
 *
 * Two modes controlled by `mode` prop:
 *   equity   → value, growth, financing columns
 *   cashflow → income, expenses, purchase costs columns
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, Plus, Landmark, CalendarDays } from 'lucide-react';
import { ChartCard } from './ui/ChartCard';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { getCellDisplayLabel, type CellId } from '../utils/propertyCells';
import type { PropertyInstanceDetails } from '../types/propertyInstance';

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

const parseInstanceId = (
  instanceId: string
): { propertyId: string; index: number } | null => {
  const match = instanceId.match(/^(.+)_instance_(\d+)$/);
  if (!match) return null;
  return { propertyId: match[1], index: parseInt(match[2], 10) };
};

// ── Inline cell components ───────────────────────────────────────────────────

const cellBase = 'w-full bg-transparent text-xs text-neutral-600 py-1 px-1 border-0 outline-none rounded hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-colors';
const numberInputClass = `${cellBase} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

const NumberInput: React.FC<{
  value: number | null | undefined;
  onChange: (v: number) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
  <input
    type="number"
    value={value ?? ''}
    onChange={e => onChange(Number(e.target.value))}
    placeholder={placeholder}
    className={numberInputClass}
    onClick={e => e.stopPropagation()}
  />
);

const SelectInput: React.FC<{
  value: string;
  options: { value: string; label: string; dropdownLabel?: string }[] | string[];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => {
  const hasDropdownLabels = options.some(opt => typeof opt !== 'string' && opt.dropdownLabel);

  if (!hasDropdownLabels) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${cellBase} cursor-pointer`}
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
        className={`${cellBase} cursor-pointer text-left`}
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
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 flex items-center gap-1.5" style={{ minWidth: 140 }}>
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
}

type RenderFn = (
  card: CardData,
  onChange: (instanceId: string, field: keyof PropertyInstanceDetails, value: any) => void
) => React.ReactNode;

interface Column {
  key: string;
  header: string;
  group?: string;
  render: RenderFn;
}

const readonlyCell = (text: string | number | undefined) => (
  <span className="text-xs text-neutral-600">{text ?? '—'}</span>
);

const yearCell: RenderFn = (card) =>
  card.isUnplaceable
    ? <span className="text-amber-600 text-xs" title="Doesn't fit in current timeline">—</span>
    : readonlyCell(card.purchaseYear);

const EQUITY_COLUMNS: Column[] = [
  { key: 'year', header: 'Year', render: yearCell },
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
  { key: 'year', header: 'Year', render: yearCell },
  // ── Income ──
  {
    key: 'rent', header: 'Rent/wk ($)', group: 'Income',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.rentPerWeek} onChange={v => onChange(c.instanceId, 'rentPerWeek', v)} />
      : null,
  },
  {
    key: 'yield', header: 'Yield (%)', group: 'Income',
    render: (c) => {
      if (!c.instanceData) return null;
      const y = c.instanceData.purchasePrice > 0
        ? ((c.instanceData.rentPerWeek * 52) / c.instanceData.purchasePrice * 100).toFixed(1)
        : '0.0';
      return readonlyCell(`${y}%`);
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
  { key: 'year', header: 'Year', render: yearCell },
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
    render: (c) => {
      if (!c.instanceData) return null;
      const y = c.instanceData.purchasePrice > 0
        ? ((c.instanceData.rentPerWeek * 52) / c.instanceData.purchasePrice * 100).toFixed(1)
        : '0.0';
      return readonlyCell(`${y}%`);
    },
  },
  // ── Annual Holding Cost (merged total) ──
  {
    key: 'holdingCost', header: 'Holding $/yr',
    render: (c) => {
      if (!c.instanceData) return null;
      const d = c.instanceData;
      const mgmtDollar = (d.propertyManagementPercent / 100) * d.rentPerWeek * 52;
      const total = Math.round(
        mgmtDollar + d.buildingInsuranceAnnual + d.councilRatesWater + d.strata + d.maintenanceAllowanceAnnual
      );
      return readonlyCell(total.toLocaleString());
    },
  },
  // ── Sale ──
  {
    key: 'saleYear', header: 'Sell',
    render: (c, onChange) => c.instanceData
      ? <SaleYearToggle value={c.instanceData.saleYear} onChange={v => onChange(c.instanceId, 'saleYear', v as any)} />
      : null,
  },
  // ── Purchase Costs (rolled up, matching blocks view) ──
  {
    key: 'purchaseCosts', header: 'Purchase Costs',
    render: (c) => {
      if (!c.instanceData) return null;
      const d = c.instanceData;
      const total = Math.round(
        d.engagementFee + (d.buildingPestInspection ?? 0) + (d.plumbingElectricalInspections ?? 0) +
        d.buildingInsuranceUpfront + d.mortgageFees + d.conveyancing
      );
      return readonlyCell(total.toLocaleString());
    },
  },
];

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

const BlockKVRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <tr className="border-b border-neutral-200 last:border-b-0">
    <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">{label}</td>
    <td className="py-2 px-3 text-xs text-neutral-600">{value}</td>
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
    <tr className="border-b border-neutral-200 last:border-b-0">
      <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">{label}</td>
      <td className="py-1.5 px-2">
        <input
          type="text"
          inputMode="decimal"
          value={focused ? draft : display}
          onFocus={() => { setFocused(true); setDraft(String(value)); }}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false);
            const n = parseFloat(draft);
            if (!isNaN(n) && n !== value) onChange(instanceId, field, n);
          }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300"
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
    <tr className="border-b border-neutral-200 last:border-b-0">
      <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">{label}</td>
      <td className="py-1.5 px-2">
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full bg-transparent text-left outline-none rounded px-1 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50 cursor-pointer"
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
                    opt.value === value ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
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
  const {
    propertyOrder,
    setPropertyOrder,
    propertyTypes,
    updatePropertyQuantity,
    getPropertyQuantity,
  } = usePropertySelection();
  const { instances, setInstances, updateInstance } = usePropertyInstance();
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();

  const cards = useMemo(() => {
    const items = propertyOrder.map((instanceId, orderIdx) => {
      const instanceData = instances[instanceId];
      const timelineProp = timelineProperties.find(tp => tp.instanceId === instanceId);
      const rawYear = timelineProp?.affordableYear;
      const purchaseYear = Number.isFinite(rawYear) ? Math.floor(rawYear as number) : undefined;
      const isUnplaceable = rawYear === Infinity && profile.timelineYearsExplicit === true;

      const parsed = parseInstanceId(instanceId);
      const propertyTypeMeta = parsed ? propertyTypes.find(p => p.id === parsed.propertyId) : undefined;
      const propertyType = propertyTypeMeta?.title ?? timelineProp?.title ?? getCellDisplayLabel(DEFAULT_NEW_CELL_ID);

      return { instanceId, instanceData, propertyType, purchaseYear, isUnplaceable, orderIdx };
    });

    return items.sort((a, b) => {
      if (a.purchaseYear === undefined && b.purchaseYear === undefined) return a.orderIdx - b.orderIdx;
      if (a.purchaseYear === undefined) return 1;
      if (b.purchaseYear === undefined) return -1;
      if (a.purchaseYear !== b.purchaseYear) return a.purchaseYear - b.purchaseYear;
      return a.orderIdx - b.orderIdx;
    });
  }, [propertyOrder, instances, timelineProperties, propertyTypes, profile.timelineYearsExplicit]);

  const handleRemove = (instanceIdToRemove: string) => {
    const parsed = parseInstanceId(instanceIdToRemove);
    if (!parsed) return;
    const { propertyId, index: removedIndex } = parsed;

    const idsToRenumber = propertyOrder
      .map(id => ({ id, parsed: parseInstanceId(id) }))
      .filter(x => x.parsed?.propertyId === propertyId && x.parsed.index > removedIndex)
      .sort((a, b) => a.parsed!.index - b.parsed!.index);

    setPropertyOrder(
      propertyOrder
        .filter(id => id !== instanceIdToRemove)
        .map(id => {
          const p = parseInstanceId(id);
          if (p && p.propertyId === propertyId && p.index > removedIndex) {
            return `${propertyId}_instance_${p.index - 1}`;
          }
          return id;
        })
    );

    const nextInstances: Record<string, PropertyInstanceDetails> = { ...instances };
    delete nextInstances[instanceIdToRemove];
    idsToRenumber.forEach(({ id, parsed: p }) => {
      const newId = `${propertyId}_instance_${p!.index - 1}`;
      const data = instances[id];
      if (data) {
        nextInstances[newId] = data;
        delete nextInstances[id];
      }
    });
    setInstances(nextInstances);
    updatePropertyQuantity(propertyId, Math.max(0, getPropertyQuantity(propertyId) - 1));
  };

  const handleFieldChange = (instanceId: string, field: keyof PropertyInstanceDetails, value: any) => {
    updateInstance(instanceId, { [field]: value });
  };

  const columns = mode === 'purchases' || mode === 'blocks' ? PURCHASES_COLUMNS : mode === 'equity' ? EQUITY_COLUMNS : CASHFLOW_COLUMNS;
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
            const mgmtDollar = (d.propertyManagementPercent / 100) * d.rentPerWeek * 52;
            const holdingTotal = Math.round(mgmtDollar + d.buildingInsuranceAnnual + d.councilRatesWater + d.strata + d.maintenanceAllowanceAnnual);
            const purchaseCosts = Math.round(
              d.engagementFee + (d.buildingPestInspection ?? 0) + (d.plumbingElectricalInspections ?? 0) +
              d.buildingInsuranceUpfront + d.mortgageFees + d.conveyancing
            );
            const loanSummary = `${d.lvr}% · ${d.interestRate.toFixed(1)}% · ${d.loanTerm}yr ${d.loanProduct === 'IO' ? 'IO' : 'P&I'}`;
            const iid = card.instanceId;
            const loanOpen = !!loanExpanded[iid];

            return (
              <div key={iid} style={{ width: 280, minWidth: 280, flexShrink: 0 }}>
                <ChartCard
                  title={`Property ${idx + 1}`}
                  flush
                  action={
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
                  }
                >
                  <table className="w-full text-xs">
                    <tbody>
                      <BlockKVRow label="Purchase year" value={card.isUnplaceable ? '—' : (card.purchaseYear ?? '—')} />
                      <BlockSelectRow label="State" value={d.state} instanceId={iid} field="state" options={BLOCK_STATE_OPTIONS} onChange={handleFieldChange} />
                      <BlockSelectRow label="Growth" value={d.growthAssumption} instanceId={iid} field="growthAssumption" options={BLOCK_GROWTH_OPTIONS} onChange={handleFieldChange} />
                      <BlockSelectRow label="Entity" value={d.entity ?? 'individual'} instanceId={iid} field="entity" options={BLOCK_ENTITY_OPTIONS} onChange={handleFieldChange} />
                      <BlockNumRow label="Price ($)" value={d.purchasePrice} instanceId={iid} field="purchasePrice" onChange={handleFieldChange} />
                      <BlockNumRow label="Valuation ($)" value={d.valuationAtPurchase} instanceId={iid} field="valuationAtPurchase" onChange={handleFieldChange} />
                      <BlockNumRow label="Rent/wk ($)" value={d.rentPerWeek} instanceId={iid} field="rentPerWeek" onChange={handleFieldChange} />
                      <BlockKVRow label="Yield (%)" value={d.purchasePrice > 0 ? `${((d.rentPerWeek * 52) / d.purchasePrice * 100).toFixed(1)}%` : '—'} />
                      <BlockKVRow label="Holding $/yr" value={fmtNum(holdingTotal)} />
                      <BlockKVRow label="Purchase costs" value={fmtNum(purchaseCosts)} />
                      <tr className="border-b border-neutral-200 last:border-b-0">
                        <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">Sell</td>
                        <td className="py-1.5 px-2">
                          <SaleYearToggle value={d.saleYear} onChange={v => handleFieldChange(iid, 'saleYear', v)} />
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
                </ChartCard>
              </div>
            );
          })}
          {/* Add property card */}
          <button
            onClick={onAddClick}
            style={{
              background: '#FAFAFA',
              borderRadius: 12,
              boxShadow: '#E5E5E5 0px 0px 0px 1px inset',
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
                border: '2px dashed #D4D4D4',
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
                color: '#737373',
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
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth: mode === 'purchases' ? 1400 : mode === 'cashflow' ? 1200 : 700, tableLayout: 'fixed' }}>
          <thead>
            {/* Column headers */}
            <tr className="border-b border-neutral-200">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap ${
                    i < columns.length - 1 ? 'border-r border-neutral-100' : ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {cards.map(card => {
              if (!card.instanceData) return null;
              return (
                <tr key={card.instanceId} className="border-b border-neutral-200 last:border-b-0">
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`py-1 px-3 ${
                        i < columns.length - 1 ? 'border-r border-neutral-100' : ''
                      }`}
                    >
                      {col.render(card as CardData, handleFieldChange)}
                    </td>
                  ))}
                  <td className="py-1 px-1">
                    <button
                      onClick={() => handleRemove(card.instanceId)}
                      className="p-1 text-neutral-300 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
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

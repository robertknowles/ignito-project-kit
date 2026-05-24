/**
 * PropertyCardRow — editable property table on the dashboard.
 *
 * Two modes controlled by `mode` prop:
 *   equity   → value, growth, financing columns
 *   cashflow → income, expenses, purchase costs columns
 */

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { getCellDisplayLabel, type CellId } from '../utils/propertyCells';
import type { PropertyInstanceDetails } from '../types/propertyInstance';

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const GROWTH_OPTIONS = ['High', 'Medium', 'Low'];
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

const cellBase = 'w-full bg-transparent text-sm text-neutral-600 py-1.5 px-0 border-0 focus:outline-none focus:bg-blue-50/30 transition-colors';
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
  options: { value: string; label: string }[] | string[];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
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
  <span className="text-sm text-neutral-600">{text ?? '—'}</span>
);

const yearCell: RenderFn = (card) =>
  card.isUnplaceable
    ? <span className="text-amber-600 text-sm" title="Doesn't fit in current timeline">—</span>
    : readonlyCell(card.purchaseYear);

const EQUITY_COLUMNS: Column[] = [
  { key: 'year', header: 'Year', render: yearCell },
  {
    key: 'state', header: 'State',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.state} options={STATE_OPTIONS} onChange={v => onChange(c.instanceId, 'state', v)} />
      : null,
  },
  {
    key: 'growth', header: 'Growth',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.growthAssumption} options={GROWTH_OPTIONS} onChange={v => onChange(c.instanceId, 'growthAssumption', v)} />
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

// ── Combined "Purchases" columns — ALL fields from equity + cashflow ─────────

const PURCHASES_COLUMNS: Column[] = [
  // ── Core identity ──
  { key: 'year', header: 'Year', render: yearCell },
  {
    key: 'state', header: 'State',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.state} options={STATE_OPTIONS} onChange={v => onChange(c.instanceId, 'state', v)} />
      : null,
  },
  {
    key: 'growth', header: 'Growth',
    render: (c, onChange) => c.instanceData
      ? <SelectInput value={c.instanceData.growthAssumption} options={GROWTH_OPTIONS} onChange={v => onChange(c.instanceId, 'growthAssumption', v)} />
      : null,
  },
  // ── Purchase / Loan ──
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
    key: 'lmi', header: 'LMI Waiver',
    render: (c, onChange) => c.instanceData
      ? <CheckboxInput checked={c.instanceData.lmiWaiver} onChange={v => onChange(c.instanceId, 'lmiWaiver', v)} />
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
  // ── Annual Expenses ──
  {
    key: 'mgmt', header: 'Mgmt (%)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.propertyManagementPercent} onChange={v => onChange(c.instanceId, 'propertyManagementPercent', v)} />
      : null,
  },
  {
    key: 'insAnn', header: 'Ins ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.buildingInsuranceAnnual} onChange={v => onChange(c.instanceId, 'buildingInsuranceAnnual', v)} />
      : null,
  },
  {
    key: 'rates', header: 'Rates ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.councilRatesWater} onChange={v => onChange(c.instanceId, 'councilRatesWater', v)} />
      : null,
  },
  {
    key: 'strata', header: 'Strata ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.strata} onChange={v => onChange(c.instanceId, 'strata', v)} />
      : null,
  },
  {
    key: 'maintAnn', header: 'Maint ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.maintenanceAllowanceAnnual} onChange={v => onChange(c.instanceId, 'maintenanceAllowanceAnnual', v)} />
      : null,
  },
  {
    key: 'landTax', header: 'Land Tax ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.landTaxOverride} onChange={v => onChange(c.instanceId, 'landTaxOverride', v || null)} placeholder="Auto" />
      : null,
  },
  // ── One-Off Purchase Costs ──
  {
    key: 'engage', header: 'Engage ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.engagementFee} onChange={v => onChange(c.instanceId, 'engagementFee', v)} />
      : null,
  },
  {
    key: 'deposit', header: 'Hold Dep ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.conditionalHoldingDeposit} onChange={v => onChange(c.instanceId, 'conditionalHoldingDeposit', v)} />
      : null,
  },
  {
    key: 'insUp', header: 'Ins Up ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.buildingInsuranceUpfront} onChange={v => onChange(c.instanceId, 'buildingInsuranceUpfront', v)} />
      : null,
  },
  {
    key: 'bp', header: 'B&P ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.buildingPestInspection} onChange={v => onChange(c.instanceId, 'buildingPestInspection', v)} />
      : null,
  },
  {
    key: 'plumb', header: 'Plumb ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.plumbingElectricalInspections} onChange={v => onChange(c.instanceId, 'plumbingElectricalInspections', v)} />
      : null,
  },
  {
    key: 'indVal', header: 'Ind Val ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.independentValuation} onChange={v => onChange(c.instanceId, 'independentValuation', v)} />
      : null,
  },
  {
    key: 'mortFees', header: 'Mort ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.mortgageFees} onChange={v => onChange(c.instanceId, 'mortgageFees', v)} />
      : null,
  },
  {
    key: 'convey', header: 'Convey ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.conveyancing} onChange={v => onChange(c.instanceId, 'conveyancing', v)} />
      : null,
  },
  {
    key: 'maintPost', header: 'Maint Post ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.maintenanceAllowancePostSettlement} onChange={v => onChange(c.instanceId, 'maintenanceAllowancePostSettlement', v)} />
      : null,
  },
  {
    key: 'stamp', header: 'Stamp ($)',
    render: (c, onChange) => c.instanceData
      ? <NumberInput value={c.instanceData.stampDutyOverride} onChange={v => onChange(c.instanceId, 'stampDutyOverride', v || null)} placeholder="Auto" />
      : null,
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

// ── Component ────────────────────────────────────────────────────────────────

interface PropertyCardRowProps {
  mode?: 'equity' | 'cashflow' | 'purchases';
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

  const columns = mode === 'purchases' ? PURCHASES_COLUMNS : mode === 'equity' ? EQUITY_COLUMNS : CASHFLOW_COLUMNS;
  const groupHeaders = buildGroupHeaders(columns);

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-neutral-500">
        No properties added yet
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: mode === 'purchases' ? 2200 : mode === 'cashflow' ? 1200 : 700 }}>
          <thead>
            {/* Column headers only — no group header row */}
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
                <tr key={card.instanceId} className="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50/50 transition-colors">
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

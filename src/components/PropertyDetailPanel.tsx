/**
 * PropertyDetailPanel — wide editor surface for a single property card.
 *
 * Lives on the dashboard, opens below the PropertyCardRow when a summary
 * card is clicked. 4 tabs (Property / Loan / Assumptions / Costs) with
 * sliders and dropdowns. Field DNA mirrors the deprecated TimelinePanel's
 * PropertyExpandedDetails; copy-pasted and adapted, originals left intact.
 *
 * Slider edits = math cascades only.
 * Property type bucket change = AI re-plan via dispatched chat message.
 */

import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { calculateStampDuty } from '../utils/stampDutyCalculator';
import {
  CELL_IDS,
  isCellId,
  getCellDisplayLabel,
  translateLegacyTypeKey,
  type CellId,
} from '../utils/propertyCells';

// Slider styling — matches TimelinePanel
const sliderClassName =
  'w-full appearance-none cursor-pointer bg-gray-200 rounded-full h-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-[#9CA3AF] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)] [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-[1.5px] [&::-moz-range-thumb]:border-[#9CA3AF] [&::-moz-range-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)] active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all';

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${
    ((value - min) / (max - min)) * 100
  }%, #E5E7EB ${((value - min) / (max - min)) * 100}%, #E5E7EB 100%)`,
});

const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: 'currency' | 'percent' | 'years' | 'number';
  hint?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = 'currency',
  hint,
}) => {
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return formatCompactCurrency(val);
      case 'percent':
        return formatPercent(val);
      case 'years':
        return `${val} yrs`;
      default:
        return val.toString();
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-gray-500 tracking-wide">
          {label}
        </span>
        <span className="text-[13px] font-semibold text-gray-800 ml-1">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        className={sliderClassName}
        style={getSliderStyle(value, min, max)}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && (
        <div className="text-[10px] text-gray-400 mt-1">{hint}</div>
      )}
    </div>
  );
};

const AUS_STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

const growthToValue = (growth: string): number => {
  switch (growth) {
    case 'Low':
      return 0;
    case 'Medium':
      return 1;
    case 'High':
      return 2;
    default:
      return 2;
  }
};

const valueToGrowth = (value: number): 'Low' | 'Medium' | 'High' => {
  if (value <= 0.5) return 'Low';
  if (value <= 1.5) return 'Medium';
  return 'High';
};

interface PropertyDetailPanelProps {
  instanceId: string;
  instanceData: PropertyInstanceDetails;
  propertyType: string;
  /** Generic field write — for slider/numeric edits; cascades math only. */
  onFieldChange: (field: keyof PropertyInstanceDetails, value: any) => void;
  /** Cell change — fires AI re-plan via chatBus instead of writing directly. */
  onBucketChange: (newCellId: CellId) => void;
}

/** Resolve any propertyType identifier (cell ID, legacy v3 key, display label) to a v4 CellId. */
const resolveCellId = (propertyType: string): CellId => {
  if (isCellId(propertyType)) return propertyType as CellId;
  const translation = translateLegacyTypeKey(propertyType);
  if (translation) return translation.newCellId;
  // Fallback: assume metro-unit-cashflow when input is unrecognised.
  return 'metro-unit-cashflow';
};

export const PropertyDetailPanel: React.FC<PropertyDetailPanelProps> = ({
  instanceData,
  propertyType,
  onFieldChange,
  onBucketChange,
}) => {
  const [activeTab, setActiveTab] = useState<
    'property' | 'loan' | 'assumptions' | 'costs'
  >('property');

  const calculatedStampDuty = useMemo(
    () => calculateStampDuty(instanceData.state, instanceData.purchasePrice, false),
    [instanceData.state, instanceData.purchasePrice]
  );

  const calculatedDeposit = useMemo(
    () => Math.round((instanceData.purchasePrice * (100 - instanceData.lvr)) / 100),
    [instanceData.purchasePrice, instanceData.lvr]
  );

  const calculatedLoanAmount = useMemo(
    () => Math.round((instanceData.purchasePrice * instanceData.lvr) / 100),
    [instanceData.purchasePrice, instanceData.lvr]
  );

  const oneOffCostsTotal = useMemo(() => {
    const stampDuty = instanceData.stampDutyOverride ?? calculatedStampDuty;
    return (
      stampDuty +
      instanceData.engagementFee +
      instanceData.conditionalHoldingDeposit +
      instanceData.buildingInsuranceUpfront +
      instanceData.buildingPestInspection +
      instanceData.plumbingElectricalInspections +
      instanceData.independentValuation +
      instanceData.unconditionalHoldingDeposit +
      instanceData.mortgageFees +
      instanceData.conveyancing +
      instanceData.ratesAdjustment +
      instanceData.maintenanceAllowancePostSettlement
    );
  }, [instanceData, calculatedStampDuty]);

  const annualExpensesTotal = useMemo(() => {
    const annualRent = instanceData.rentPerWeek * 52;
    const managementFees = (annualRent * instanceData.propertyManagementPercent) / 100;
    return (
      instanceData.councilRatesWater +
      instanceData.buildingInsuranceAnnual +
      instanceData.strata +
      instanceData.maintenanceAllowanceAnnual +
      managementFees
    );
  }, [instanceData]);

  const currentCellId = resolveCellId(propertyType);

  const tabs = [
    { id: 'property' as const, label: 'PROPERTY' },
    { id: 'loan' as const, label: 'LOAN' },
    { id: 'assumptions' as const, label: 'ASSUMPTIONS' },
    { id: 'costs' as const, label: 'COSTS' },
  ];

  return (
    <div className="bg-white">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-[11px] font-semibold tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content — 4 columns side-by-side on wide screens */}
      <div className="px-6 py-5">
        {/* PROPERTY */}
        {activeTab === 'property' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {/* Property type bucket dropdown — fires AI re-plan on change */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                  Property Type
                </span>
              </div>
              <select
                value={currentCellId}
                onChange={(e) => onBucketChange(e.target.value as CellId)}
                className="w-full text-[13px] font-semibold text-gray-800 bg-white border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-gray-400 cursor-pointer"
              >
                {CELL_IDS.map((cellId) => (
                  <option key={cellId} value={cellId}>
                    {getCellDisplayLabel(cellId)}
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-gray-400 mt-1">
                Changing type triggers an AI re-plan via chat.
              </div>
            </div>

            <SliderInput
              label="Purchase Price"
              value={instanceData.purchasePrice}
              onChange={(v) => onFieldChange('purchasePrice', v)}
              min={100000}
              max={2000000}
              step={10000}
              format="currency"
            />
            <SliderInput
              label="Valuation at Purchase"
              value={instanceData.valuationAtPurchase}
              onChange={(v) => onFieldChange('valuationAtPurchase', v)}
              min={100000}
              max={2000000}
              step={10000}
              format="currency"
            />
            <SliderInput
              label="Weekly Rent"
              value={instanceData.rentPerWeek}
              onChange={(v) => onFieldChange('rentPerWeek', v)}
              min={100}
              max={2000}
              step={10}
              format="currency"
            />
            <SliderInput
              label="Deposit %"
              value={100 - instanceData.lvr}
              onChange={(v) => onFieldChange('lvr', 100 - v)}
              min={5}
              max={40}
              step={1}
              format="percent"
              hint={`Auto: ${formatCompactCurrency(calculatedDeposit)}`}
            />
            <SliderInput
              label="Loan Amount"
              value={calculatedLoanAmount}
              onChange={() => {}}
              min={0}
              max={2000000}
              step={10000}
              format="currency"
              hint="Auto-derived from price × LVR"
            />
          </div>
        )}

        {/* LOAN */}
        {activeTab === 'loan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            <SliderInput
              label="Interest Rate"
              value={instanceData.interestRate}
              onChange={(v) => onFieldChange('interestRate', v)}
              min={3}
              max={10}
              step={0.1}
              format="percent"
            />
            <SliderInput
              label="Loan Term"
              value={instanceData.loanTerm}
              onChange={(v) => onFieldChange('loanTerm', v)}
              min={10}
              max={30}
              step={1}
              format="years"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                  Loan Product
                </span>
              </div>
              <select
                value={instanceData.loanProduct}
                onChange={(e) => onFieldChange('loanProduct', e.target.value)}
                className="w-full text-[13px] font-semibold text-gray-800 bg-white border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-gray-400 cursor-pointer"
              >
                <option value="IO">Interest Only</option>
                <option value="PI">Principal &amp; Interest</option>
              </select>
            </div>
            {instanceData.lvr > 80 && (
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                  LMI Waiver
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instanceData.lmiWaiver}
                    onChange={(e) => onFieldChange('lmiWaiver', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-700" />
                </label>
              </div>
            )}
            {instanceData.lvr > 80 && !instanceData.lmiWaiver && (
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                  LMI Capitalised
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                    Add LMI to loan instead of paying cash at settlement
                  </span>
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!instanceData.lmiCapitalized}
                    onChange={(e) => onFieldChange('lmiCapitalized', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-700" />
                </label>
              </div>
            )}
          </div>
        )}

        {/* ASSUMPTIONS */}
        {activeTab === 'assumptions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {/* Growth — Low/Med/High slider, simplified per §4 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                  Growth
                </span>
                <span className="text-[13px] font-semibold text-gray-800">
                  {instanceData.growthAssumption}
                </span>
              </div>
              <input
                type="range"
                className={sliderClassName}
                style={getSliderStyle(growthToValue(instanceData.growthAssumption), 0, 2)}
                min={0}
                max={2}
                step={1}
                value={growthToValue(instanceData.growthAssumption)}
                onChange={(e) =>
                  onFieldChange('growthAssumption', valueToGrowth(parseFloat(e.target.value)))
                }
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <Info size={10} />
                {instanceData.growthAssumption === 'High'
                  ? 'Early years 12.5%, tapering to 6% mature'
                  : instanceData.growthAssumption === 'Medium'
                  ? 'Early years 8%, tapering to 4% mature'
                  : 'Early years 5%, tapering to 3% mature'}
              </div>
            </div>

            {/* Stamp Duty — auto-with-override */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                  Stamp Duty
                </span>
                <span className="text-[13px] font-semibold text-gray-800">
                  {instanceData.stampDutyOverride
                    ? formatCompactCurrency(instanceData.stampDutyOverride)
                    : `Auto: ${formatCompactCurrency(calculatedStampDuty)}`}
                </span>
              </div>
              <input
                type="range"
                className={sliderClassName}
                style={getSliderStyle(
                  instanceData.stampDutyOverride ?? calculatedStampDuty,
                  0,
                  100000
                )}
                min={0}
                max={100000}
                step={1000}
                value={instanceData.stampDutyOverride ?? calculatedStampDuty}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onFieldChange(
                    'stampDutyOverride',
                    Math.abs(val - calculatedStampDuty) < 500 ? null : val
                  );
                }}
              />
            </div>

            <SliderInput
              label="Property Mgmt Fee"
              value={instanceData.propertyManagementPercent}
              onChange={(v) => onFieldChange('propertyManagementPercent', v)}
              min={0}
              max={15}
              step={0.5}
              format="percent"
            />
            <SliderInput
              label="Vacancy Rate"
              value={instanceData.vacancyRate ?? 4}
              onChange={(v) => onFieldChange('vacancyRate', v)}
              min={0}
              max={10}
              step={0.5}
              format="percent"
            />
          </div>
        )}

        {/* COSTS */}
        {activeTab === 'costs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-[11px] font-medium text-gray-500 mb-2">
                One-Off Purchase Costs
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCompactCurrency(
                    oneOffCostsTotal -
                      (instanceData.stampDutyOverride ?? calculatedStampDuty)
                  )}
                </div>
                <div className="text-[11px] text-gray-500">
                  excl. stamp duty
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>Engagement Fee</span>
                  <span>${instanceData.engagementFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conditional Deposit</span>
                  <span>${instanceData.conditionalHoldingDeposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conveyancing</span>
                  <span>${instanceData.conveyancing.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mortgage Fees</span>
                  <span>${instanceData.mortgageFees.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Building &amp; Pest</span>
                  <span>${instanceData.buildingPestInspection.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-[11px] font-medium text-gray-500 mb-2">
                Annual Expenses
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCompactCurrency(annualExpensesTotal)}
                </div>
                <div className="text-[11px] text-gray-500">/ year</div>
              </div>
              <div className="text-[10px] text-gray-400 mt-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>Council &amp; Water</span>
                  <span>${instanceData.councilRatesWater.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Insurance</span>
                  <span>${instanceData.buildingInsuranceAnnual.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Strata</span>
                  <span>${instanceData.strata.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance</span>
                  <span>${instanceData.maintenanceAllowanceAnnual.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mgmt ({instanceData.propertyManagementPercent}%)</span>
                  <span>
                    $
                    {Math.round(
                      (instanceData.rentPerWeek *
                        52 *
                        instanceData.propertyManagementPercent) /
                        100
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

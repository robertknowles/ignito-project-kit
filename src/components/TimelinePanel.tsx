import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Calendar, Home, Pause, ChevronUp, ChevronDown, Settings, Info } from 'lucide-react';
import { usePropertySelection, type EventBlock } from '../contexts/PropertySelectionContext';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { EVENT_TYPES, getEventLabel } from '../constants/eventTypes';
import { EventTypeIcon } from '../utils/eventIcons';
import { EventConfigModal } from './EventConfigModal';
import { AddToTimelineModal } from './AddToTimelineModal';
import { PropertyDetailModal } from './PropertyDetailModal';
import { PERIODS_PER_YEAR, BASE_YEAR } from '../constants/financialParams';
import { TourStep } from '@/components/TourManager';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { getPropertyTypeImagePath } from '../utils/propertyTypeIcon';
import { calculateStampDuty } from '../utils/stampDutyCalculator';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';

// Convert period to year for display
const periodToYear = (period: number): number => {
  return BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
};

// =============================================================================
// SLIDER INPUT COMPONENT - Matching ClientDetailsCard style
// =============================================================================

// Slider styles matching ClientDetailsCard - Clean black track and handle
const sliderClassName = "w-full appearance-none cursor-pointer bg-slate-200 rounded-full h-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2563EB] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#2563EB] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all";

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #2563EB 0%, #2563EB ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
});

// Format compact currency
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return `$${value}`;
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: 'currency' | 'percent' | 'years' | 'number';
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = 'currency',
}) => {
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return formatCompactCurrency(val);
      case 'percent':
        return formatPercent(val);
      case 'years':
        return `${val} yrs`;
      case 'number':
      default:
        return val.toString();
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-medium text-slate-400 tracking-wide truncate">
          {label}
        </span>
        <span className="text-[11px] font-semibold text-slate-700 ml-1">
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
    </div>
  );
};

// =============================================================================
// TOOLTIP COMPONENT - For showing breakdown details
// =============================================================================

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // 8px above the trigger
        left: rect.left + rect.width / 2,
      });
    }
  }, [show]);
  
  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && createPortal(
        <div 
          className="fixed z-[9999] px-3 py-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>,
        document.body
      )}
    </div>
  );
};

// =============================================================================
// PROPERTY EXPANDED DETAILS - Shows all fields when expanded (CONDENSED VERSION)
// =============================================================================

interface PropertyExpandedDetailsProps {
  instanceId: string;
  instanceData: PropertyInstanceDetails | null;
  onFieldChange: (field: keyof PropertyInstanceDetails, value: any) => void;
  propertyType: string;
  onOpenAdvanced: () => void;
  onOpenPurchaseCosts: () => void;
  onOpenAnnualExpenses: () => void;
}

const PropertyExpandedDetails: React.FC<PropertyExpandedDetailsProps> = ({
  instanceId,
  instanceData,
  onFieldChange,
  propertyType,
  onOpenAdvanced,
  onOpenPurchaseCosts,
  onOpenAnnualExpenses,
}) => {
  const [activeTab, setActiveTab] = useState<'property' | 'loan' | 'assumptions' | 'costs'>('property');
  
  // Calculate totals for summary displays
  const calculatedStampDuty = useMemo(() => {
    if (!instanceData) return 0;
    return calculateStampDuty(instanceData.state, instanceData.purchasePrice, false);
  }, [instanceData?.state, instanceData?.purchasePrice]);
  
  const oneOffCostsTotal = useMemo(() => {
    if (!instanceData) return 0;
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
    if (!instanceData) return 0;
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
  
  if (!instanceData) {
    return (
      <div className="p-3 text-center text-xs text-slate-500">
        Loading property details...
      </div>
    );
  }
  
  const tabs = [
    { id: 'property' as const, label: 'PROPERTY' },
    { id: 'loan' as const, label: 'LOAN' },
    { id: 'assumptions' as const, label: 'ASSUMPTIONS' },
    { id: 'costs' as const, label: 'COSTS' },
  ];
  
  // Growth assumption to slider value mapping
  const growthToValue = (growth: string): number => {
    switch (growth) {
      case 'Low': return 0;
      case 'Medium': return 1;
      case 'High': return 2;
      default: return 2;
    }
  };
  
  const valueToGrowth = (value: number): 'Low' | 'Medium' | 'High' => {
    if (value <= 0.5) return 'Low';
    if (value <= 1.5) return 'Medium';
    return 'High';
  };
  
  return (
    <div className="bg-white">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-[9px] font-medium tracking-wide transition-colors ${
              activeTab === tab.id
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content - Scrollable */}
      <div className="max-h-[320px] overflow-y-auto px-3 py-2">
        
        {/* ============ PROPERTY TAB ============ */}
        {activeTab === 'property' && (
          <div className="space-y-3">
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
              label="Deposit"
              value={100 - instanceData.lvr}
              onChange={(v) => onFieldChange('lvr', 100 - v)}
              min={5}
              max={40}
              step={1}
              format="percent"
            />
            {/* State Dropdown */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-medium text-slate-400 tracking-wide">
                  State
                </span>
                <select
                  value={instanceData.state}
                  onChange={(e) => onFieldChange('state', e.target.value)}
                  className="text-[11px] font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  {['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* ============ LOAN TAB ============ */}
        {activeTab === 'loan' && (
          <div className="space-y-3">
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
            {/* Loan Product Dropdown */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-medium text-slate-400 tracking-wide">
                  Loan Product
                </span>
                <select
                  value={instanceData.loanProduct}
                  onChange={(e) => onFieldChange('loanProduct', e.target.value)}
                  className="text-[11px] font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="IO">Interest Only</option>
                  <option value="PI">Principal & Interest</option>
                </select>
              </div>
            </div>
            {/* LMI Waiver Checkbox - only show if LVR > 80% */}
            {instanceData.lvr > 80 && (
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] font-medium text-slate-400 tracking-wide">
                  LMI Waiver
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instanceData.lmiWaiver}
                    onChange={(e) => onFieldChange('lmiWaiver', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#2563EB]"></div>
                </label>
              </div>
            )}
          </div>
        )}
        
        {/* ============ ASSUMPTIONS TAB ============ */}
        {activeTab === 'assumptions' && (
          <div className="space-y-3">
            {/* Growth Rate Slider - TOP PRIORITY */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-medium text-slate-400 tracking-wide">
                  Growth
                </span>
                <span className="text-[8px] text-slate-400">
                  {instanceData.growthAssumption === 'High' 
                    ? '12.5→10→7.5→6%'
                    : instanceData.growthAssumption === 'Medium'
                    ? '8→6→5→4%'
                    : '5→4→3.5→3%'
                  }
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
                onChange={(e) => onFieldChange('growthAssumption', valueToGrowth(parseFloat(e.target.value)))}
              />
              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
            
            {/* Stamp Duty Override */}
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-medium text-slate-400 tracking-wide">
                  Stamp Duty
                </span>
                <span className="text-[11px] font-semibold text-slate-700">
                  {instanceData.stampDutyOverride 
                    ? formatCompactCurrency(instanceData.stampDutyOverride)
                    : `Auto: ${formatCompactCurrency(calculatedStampDuty)}`
                  }
                </span>
              </div>
              <input
                type="range"
                className={sliderClassName}
                style={getSliderStyle(instanceData.stampDutyOverride ?? calculatedStampDuty, 0, 100000)}
                min={0}
                max={100000}
                step={1000}
                value={instanceData.stampDutyOverride ?? calculatedStampDuty}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  // Only set override if different from auto-calculated
                  onFieldChange('stampDutyOverride', Math.abs(val - calculatedStampDuty) < 500 ? null : val);
                }}
              />
            </div>
            
            {/* Property Management Fee */}
            <SliderInput
              label="Property Mgmt Fee"
              value={instanceData.propertyManagementPercent}
              onChange={(v) => onFieldChange('propertyManagementPercent', v)}
              min={0}
              max={15}
              step={0.5}
              format="percent"
            />
            
            {/* Vacancy Rate */}
            <SliderInput
              label="Vacancy Rate"
              value={instanceData.vacancyRate}
              onChange={(v) => onFieldChange('vacancyRate', v)}
              min={0}
              max={10}
              step={0.5}
              format="percent"
            />
          </div>
        )}
        
        {/* ============ COSTS & EXPENSES TAB ============ */}
        {activeTab === 'costs' && (
          <div className="space-y-3">
            {/* One-Off Purchase Costs Summary (excluding stamp duty - that's in Assumptions) */}
            <div className="bg-slate-50 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-600">Purchase Costs</span>
                  <Tooltip content={
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span>Engagement Fee:</span>
                        <span className="font-medium">${instanceData.engagementFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Conditional Deposit:</span>
                        <span className="font-medium">${instanceData.conditionalHoldingDeposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Insurance Upfront:</span>
                        <span className="font-medium">${instanceData.buildingInsuranceUpfront.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Building & Pest:</span>
                        <span className="font-medium">${instanceData.buildingPestInspection.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Plumbing/Electrical:</span>
                        <span className="font-medium">${instanceData.plumbingElectricalInspections.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Independent Valuation:</span>
                        <span className="font-medium">${instanceData.independentValuation.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Unconditional Deposit:</span>
                        <span className="font-medium">${instanceData.unconditionalHoldingDeposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Mortgage Fees:</span>
                        <span className="font-medium">${instanceData.mortgageFees.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Conveyancing:</span>
                        <span className="font-medium">${instanceData.conveyancing.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Rates Adjustment:</span>
                        <span className="font-medium">${instanceData.ratesAdjustment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Maintenance Post Settlement:</span>
                        <span className="font-medium">${instanceData.maintenanceAllowancePostSettlement.toLocaleString()}</span>
                      </div>
                    </div>
                  }>
                    <Info size={10} className="text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-900">
                    {formatCompactCurrency(oneOffCostsTotal - (instanceData.stampDutyOverride ?? calculatedStampDuty))}
                  </span>
                  <button
                    onClick={onOpenPurchaseCosts}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                    title="Edit Purchase Costs"
                  >
                    <Settings size={12} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Annual Expenses Summary */}
            <div className="bg-slate-50 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-600">Annual Expenses</span>
                  <Tooltip content={
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span>Council & Water:</span>
                        <span className="font-medium">${instanceData.councilRatesWater.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Insurance:</span>
                        <span className="font-medium">${instanceData.buildingInsuranceAnnual.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Strata:</span>
                        <span className="font-medium">${instanceData.strata.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Maintenance:</span>
                        <span className="font-medium">${instanceData.maintenanceAllowanceAnnual.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Mgmt ({instanceData.propertyManagementPercent}%):</span>
                        <span className="font-medium">${Math.round((instanceData.rentPerWeek * 52 * instanceData.propertyManagementPercent) / 100).toLocaleString()}</span>
                      </div>
                    </div>
                  }>
                    <Info size={10} className="text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-900">
                    {formatCompactCurrency(annualExpensesTotal)}/yr
                  </span>
                  <button
                    onClick={onOpenAnnualExpenses}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                    title="Edit Annual Expenses"
                  >
                    <Settings size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// PURCHASE COSTS EDIT MODAL
// =============================================================================

interface PurchaseCostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  propertyType: string;
  instanceData: PropertyInstanceDetails | null;
  onFieldChange: (field: keyof PropertyInstanceDetails, value: any) => void;
}

const PurchaseCostsModal: React.FC<PurchaseCostsModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  propertyType,
  instanceData,
  onFieldChange,
}) => {
  if (!isOpen || !instanceData) return null;
  
  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500";
  
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Purchase Costs</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Engagement Fee ($)</label>
              <input
                type="number"
                value={instanceData.engagementFee}
                onChange={(e) => onFieldChange('engagementFee', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Conditional Deposit ($)</label>
              <input
                type="number"
                value={instanceData.conditionalHoldingDeposit}
                onChange={(e) => onFieldChange('conditionalHoldingDeposit', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Insurance Upfront ($)</label>
              <input
                type="number"
                value={instanceData.buildingInsuranceUpfront}
                onChange={(e) => onFieldChange('buildingInsuranceUpfront', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Building & Pest ($)</label>
              <input
                type="number"
                value={instanceData.buildingPestInspection}
                onChange={(e) => onFieldChange('buildingPestInspection', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Plumbing/Electrical ($)</label>
              <input
                type="number"
                value={instanceData.plumbingElectricalInspections}
                onChange={(e) => onFieldChange('plumbingElectricalInspections', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Independent Valuation ($)</label>
              <input
                type="number"
                value={instanceData.independentValuation}
                onChange={(e) => onFieldChange('independentValuation', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Unconditional Deposit ($)</label>
              <input
                type="number"
                value={instanceData.unconditionalHoldingDeposit}
                onChange={(e) => onFieldChange('unconditionalHoldingDeposit', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mortgage Fees ($)</label>
              <input
                type="number"
                value={instanceData.mortgageFees}
                onChange={(e) => onFieldChange('mortgageFees', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Conveyancing ($)</label>
              <input
                type="number"
                value={instanceData.conveyancing}
                onChange={(e) => onFieldChange('conveyancing', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rates Adjustment ($)</label>
              <input
                type="number"
                value={instanceData.ratesAdjustment}
                onChange={(e) => onFieldChange('ratesAdjustment', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Maintenance Post Settlement ($)</label>
            <input
              type="number"
              value={instanceData.maintenanceAllowancePostSettlement}
              onChange={(e) => onFieldChange('maintenanceAllowancePostSettlement', parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
};

// =============================================================================
// ANNUAL EXPENSES EDIT MODAL
// =============================================================================

interface AnnualExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  propertyType: string;
  instanceData: PropertyInstanceDetails | null;
  onFieldChange: (field: keyof PropertyInstanceDetails, value: any) => void;
}

const AnnualExpensesModal: React.FC<AnnualExpensesModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  propertyType,
  instanceData,
  onFieldChange,
}) => {
  if (!isOpen || !instanceData) return null;
  
  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500";
  
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Annual Expenses</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Council & Water ($/yr)</label>
              <input
                type="number"
                value={instanceData.councilRatesWater}
                onChange={(e) => onFieldChange('councilRatesWater', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Insurance ($/yr)</label>
              <input
                type="number"
                value={instanceData.buildingInsuranceAnnual}
                onChange={(e) => onFieldChange('buildingInsuranceAnnual', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Strata ($/yr)</label>
              <input
                type="number"
                value={instanceData.strata}
                onChange={(e) => onFieldChange('strata', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Maintenance ($/yr)</label>
              <input
                type="number"
                value={instanceData.maintenanceAllowanceAnnual}
                onChange={(e) => onFieldChange('maintenanceAllowanceAnnual', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
          
          {/* Deductions/Depreciation Section */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tax Deductions / Depreciation ($/yr)</label>
              <input
                type="number"
                value={instanceData.potentialDeductionsRebates || 0}
                onChange={(e) => onFieldChange('potentialDeductionsRebates', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-2">
                Estimated annual depreciation deductions. Reduces expenses and improves net cashflow.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
};

// =============================================================================
// TIMELINE ITEM CARD - Displays a property or event in the timeline list
// =============================================================================

interface TimelineItemCardProps {
  type: 'property' | 'event' | 'pause';
  title: string;
  subtitle?: string;
  subtitleText?: string; // For events/pauses - displayed instead of price
  period?: number;
  icon?: React.ReactNode;
  imageUrl?: string;
  bgColor?: string;
  onRemove: () => void;
  onEdit?: () => void;
  // Property-specific props for expansion
  instanceId?: string;
  instanceData?: PropertyInstanceDetails | null;
  onFieldChange?: (field: keyof PropertyInstanceDetails, value: any) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  propertyType?: string;
  onOpenAdvanced?: () => void;
  onOpenPurchaseCosts?: () => void;
  onOpenAnnualExpenses?: () => void;
  isCustom?: boolean;
}

// State colors matching AddToTimelineModal
const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  'VIC': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'NSW': { bg: 'bg-sky-100', text: 'text-sky-700' },
  'QLD': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'SA': { bg: 'bg-red-100', text: 'text-red-700' },
  'WA': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'TAS': { bg: 'bg-green-100', text: 'text-green-700' },
  'NT': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'ACT': { bg: 'bg-purple-100', text: 'text-purple-700' },
};

const TimelineItemCard: React.FC<TimelineItemCardProps> = ({
  type,
  title,
  subtitle,
  subtitleText,
  period,
  icon,
  imageUrl,
  bgColor = 'bg-gray-100',
  onRemove,
  onEdit,
  instanceId,
  instanceData,
  onFieldChange,
  isExpanded,
  onToggleExpand,
  propertyType,
  onOpenAdvanced,
  onOpenPurchaseCosts,
  onOpenAnnualExpenses,
  isCustom,
}) => {
  const isProperty = type === 'property';
  const isEvent = type === 'event';
  const isPause = type === 'pause';
  
  // Format price for display
  const priceDisplay = instanceData?.purchasePrice 
    ? `$${(instanceData.purchasePrice / 1000).toFixed(0)}k`
    : null;
  
  // Calculate yield
  const yieldDisplay = instanceData?.purchasePrice && instanceData?.rentPerWeek
    ? `${((instanceData.rentPerWeek * 52 / instanceData.purchasePrice) * 100).toFixed(1)}%`
    : null;

  // Calculate monthly holding cost
  const monthlyCostDisplay = (() => {
    if (!instanceData?.purchasePrice || !instanceData?.lvr) return null;
    const loanAmount = instanceData.purchasePrice * (instanceData.lvr / 100);
    const cashflow = calculateDetailedCashflow(instanceData, loanAmount);
    const monthly = Math.round(cashflow.netWeeklyCashflow * 52 / 12);
    const abs = Math.abs(monthly);
    const sign = monthly < 0 ? '-' : '+';
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k/mo`;
    return `${sign}$${abs}/mo`;
  })();

  // Get state info
  const stateDisplay = instanceData?.state;
  const stateColors = stateDisplay ? STATE_COLORS[stateDisplay] || { bg: 'bg-gray-100', text: 'text-gray-700' } : null;
  
  return (
    <div className={`bg-white border border-gray-200 rounded-xl transition-colors overflow-hidden ${isExpanded ? '' : 'hover:border-gray-400'}`}>
      {/* Header Row */}
      <div 
        className={`group flex items-center gap-2 cursor-pointer ${isProperty && isExpanded ? 'border-b border-gray-100' : ''} pr-2`}
        onClick={isProperty ? onToggleExpand : onEdit}
      >
        {/* Left side - Image for properties, Icon for events/pauses, Home icon for custom properties */}
        {isProperty && isCustom ? (
          <div className="w-16 self-stretch flex-shrink-0 flex items-center justify-center bg-slate-50 border-r border-gray-100">
            <Home size={24} className="text-slate-500" />
          </div>
        ) : isProperty && imageUrl ? (
          <div className="w-16 self-stretch flex-shrink-0 flex items-center justify-center overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover scale-110"
            />
          </div>
        ) : (
          <div className={`flex-shrink-0 w-16 self-stretch ${bgColor} flex items-center justify-center border-r border-gray-100`}>
            {icon}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0 py-2 flex items-center justify-between gap-2">
          {/* Left: title and subtitle */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm truncate">{title}</h4>
            <p className="text-gray-500 text-xs mt-0.5">
              {isProperty ? (
                <>
                  {priceDisplay || '$0'}
                  {monthlyCostDisplay && (
                    <span className={`ml-1.5 ${monthlyCostDisplay.startsWith('+') ? 'text-green-500' : 'text-rose-400'}`}>
                      {monthlyCostDisplay}
                    </span>
                  )}
                </>
              ) : (subtitleText || '')}
            </p>
          </div>
          {/* Right: expand and delete buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isProperty && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded Details for Properties */}
      {isProperty && isExpanded && instanceId && onFieldChange && (
        <PropertyExpandedDetails
          instanceId={instanceId}
          instanceData={instanceData ?? null}
          onFieldChange={onFieldChange}
          propertyType={propertyType || title}
          onOpenAdvanced={onOpenAdvanced || (() => {})}
          onOpenPurchaseCosts={onOpenPurchaseCosts || (() => {})}
          onOpenAnnualExpenses={onOpenAnnualExpenses || (() => {})}
        />
      )}
    </div>
  );
};

// =============================================================================
// MAIN TIMELINE PANEL COMPONENT
// =============================================================================

interface TimelinePanelProps {
  defaultFirstPropertyExpanded?: boolean;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({ defaultFirstPropertyExpanded = true }) => {
  const {
    propertyTypes,
    getPropertyQuantity,
    decrementProperty,
    eventBlocks,
    removeEvent,
    pauseBlocks,
    removePause,
  } = usePropertySelection();
  
  // Get timeline properties with purchase years
  const { timelineProperties } = useAffordabilityCalculator();
  
  // Get property instance data
  const { getInstance, updateInstance } = usePropertyInstance();
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventBlock | null>(null);
  const [advancedModalProperty, setAdvancedModalProperty] = useState<{
    instanceId: string;
    propertyType: string;
  } | null>(null);
  const [purchaseCostsModal, setPurchaseCostsModal] = useState<{
    instanceId: string;
    propertyType: string;
  } | null>(null);
  const [annualExpensesModal, setAnnualExpensesModal] = useState<{
    instanceId: string;
    propertyType: string;
  } | null>(null);
  
  // Expanded card state - track which cards are expanded (all start expanded)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Build timeline items list from properties, events, and pauses
  // Sort by period/order
  const buildTimelineList = () => {
    const items: Array<{
      id: string;
      type: 'property' | 'event' | 'pause';
      title: string;
      subtitle?: string;
      period?: number;
      propertyId?: string;
      instanceIndex?: number;
      event?: EventBlock;
      pauseDuration?: number;
      pauseIndex?: number;
      isCustom?: boolean;
    }> = [];
    
    // Add properties - each instance separately, with purchase year from timeline
    propertyTypes.forEach(property => {
      const count = getPropertyQuantity(property.id);
      for (let i = 0; i < count; i++) {
        const instanceId = `${property.id}_instance_${i}`;
        // Find the matching timeline property to get the purchase year
        const timelineProp = timelineProperties.find(tp => tp.instanceId === instanceId);
        const purchaseYear = timelineProp?.affordableYear 
          ? Math.floor(timelineProp.affordableYear) 
          : undefined;
        
        items.push({
          id: instanceId,
          type: 'property',
          title: property.title,
          subtitle: purchaseYear ? String(purchaseYear) : undefined,
          propertyId: property.id,
          instanceIndex: i,
          isCustom: property.isCustom,
        });
      }
    });
    
    // Add events
    eventBlocks.forEach(event => {
      const eventYear = periodToYear(event.period);
      // Always compute label dynamically to ensure it reflects current payload
      const eventLabel = getEventLabel(event.eventType, event.payload);
      items.push({
        id: event.id,
        type: 'event',
        title: eventLabel,
        subtitle: String(eventYear),
        period: event.period,
        event,
      });
    });
    
    // Add pauses
    pauseBlocks.forEach((pause, index) => {
      items.push({
        id: `pause_${index}`,
        type: 'pause',
        title: `Pause ${pause.duration === 0.5 ? '6 months' : pause.duration === 1 ? '1 year' : `${pause.duration} years`}`,
        pauseDuration: pause.duration,
        pauseIndex: index,
      });
    });
    
    return items;
  };
  
  const timelineList = buildTimelineList();
  const totalItems = timelineList.length;
  
  // Handle removing items
  const handleRemoveProperty = (propertyId: string) => {
    decrementProperty(propertyId);
  };
  
  const handleRemoveEvent = (eventId: string) => {
    removeEvent(eventId);
  };
  
  const handleRemovePause = (pauseIndex: number) => {
    removePause(pauseIndex);
  };
  
  // Handle editing
  const handleEditEvent = (event: EventBlock) => {
    setEditingEvent(event);
  };
  
  // Handle toggling card expansion - allow multiple to be expanded
  const handleToggleExpand = (itemId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  // Check if a card is expanded (default to expanded for properties)
  const isCardExpanded = (itemId: string, type: string) => {
    // Properties start expanded by default
    if (type === 'property' && !expandedCards.has(`collapsed_${itemId}`)) {
      return !expandedCards.has(`collapsed_${itemId}`);
    }
    return expandedCards.has(itemId);
  };
  
  // Toggle with inverted logic for default-expanded items
  const handleToggleExpandProperty = (itemId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      const collapsedKey = `collapsed_${itemId}`;
      if (newSet.has(collapsedKey)) {
        newSet.delete(collapsedKey);
      } else {
        newSet.add(collapsedKey);
      }
      return newSet;
    });
  };
  
  // Handle field changes for property instances
  const handlePropertyFieldChange = (instanceId: string, field: keyof PropertyInstanceDetails, value: any) => {
    updateInstance(instanceId, { [field]: value });
  };
  
  // Get image URL for property type
  const getPropertyImageUrl = (propertyTitle: string) => 
    getPropertyTypeImagePath(propertyTitle);
  
  return (
    <TourStep
      id="timeline-panel"
      title="Your Investment Timeline"
      content="This is your timeline - showing all properties and events you've added. Click '+ Add to Timeline' to add properties or life events. Drag items to reorder them."
      order={6}
      position="right"
    >
      <div id="timeline-panel" className="flex flex-col gap-3 h-full">
        {/* Add to Timeline Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 bg-white"
        >
          <Plus size={16} />
          Add to Timeline
          {totalItems > 0 && (
            <span className="text-[10px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
              {totalItems}
            </span>
          )}
        </button>
        
        {/* Timeline Items List - Grouped by Year */}
        {timelineList.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {(() => {
              // Group items by year
              const groupedByYear: Record<string, typeof timelineList> = {};
              
              timelineList.forEach(item => {
                const year = item.subtitle || 'Other';
                if (!groupedByYear[year]) {
                  groupedByYear[year] = [];
                }
                groupedByYear[year].push(item);
              });
              
              // Sort years
              const sortedYears = Object.keys(groupedByYear).sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return parseInt(a) - parseInt(b);
              });
              
              let globalIndex = 0;
              
              return sortedYears.map((year) => (
                <div key={year} className="space-y-2">
                  {/* Year Header */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-semibold text-gray-900">{year}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  
                  {/* Items for this year */}
                  <div className="space-y-2">
                    {groupedByYear[year].map((item) => {
                      const currentIndex = globalIndex++;
                      
                      if (item.type === 'property') {
                        const instanceData = getInstance(item.id);
                        const isFirstProperty = currentIndex === 0;
                        const isExpanded = isFirstProperty 
                          ? (defaultFirstPropertyExpanded && !expandedCards.has(`collapsed_${item.id}`))
                          : expandedCards.has(`expanded_${item.id}`);
                        return (
                          <TimelineItemCard
                            key={item.id}
                            type="property"
                            title={item.title}
                            subtitle={item.subtitle}
                            imageUrl={getPropertyImageUrl(item.title)}
                            bgColor="bg-gray-100"
                            onRemove={() => handleRemoveProperty(item.propertyId!)}
                            instanceId={item.id}
                            instanceData={instanceData}
                            onFieldChange={(field, value) => handlePropertyFieldChange(item.id, field, value)}
                            isExpanded={isExpanded}
                            onToggleExpand={() => isFirstProperty ? handleToggleExpandProperty(item.id) : handleToggleExpand(`expanded_${item.id}`)}
                            propertyType={item.title}
                            onOpenAdvanced={() => setAdvancedModalProperty({ instanceId: item.id, propertyType: item.title })}
                            onOpenPurchaseCosts={() => setPurchaseCostsModal({ instanceId: item.id, propertyType: item.title })}
                            onOpenAnnualExpenses={() => setAnnualExpensesModal({ instanceId: item.id, propertyType: item.title })}
                            isCustom={item.isCustom}
                          />
                        );
                      }
                      
                      if (item.type === 'event') {
                        const payload = item.event!.payload;
                        // Generate subtitle showing the change amount
                        const getEventSubtitle = (): string => {
                          switch (item.event!.eventType) {
                            case 'salary_change':
                              if (payload.newSalary !== undefined && payload.previousSalary !== undefined) {
                                const diff = payload.newSalary - payload.previousSalary;
                                return diff >= 0 ? `+$${diff.toLocaleString()}` : `-$${Math.abs(diff).toLocaleString()}`;
                              }
                              return payload.newSalary ? `$${payload.newSalary.toLocaleString()}` : 'Salary';
                            case 'partner_income_change':
                              if (payload.newPartnerSalary !== undefined && payload.previousPartnerSalary !== undefined) {
                                const diff = payload.newPartnerSalary - payload.previousPartnerSalary;
                                return diff >= 0 ? `+$${diff.toLocaleString()}` : `-$${Math.abs(diff).toLocaleString()}`;
                              }
                              return payload.newPartnerSalary ? `$${payload.newPartnerSalary.toLocaleString()}` : 'Partner';
                            case 'bonus_windfall':
                              return payload.bonusAmount ? `+$${payload.bonusAmount.toLocaleString()}` : 'Bonus';
                            case 'inheritance':
                              return payload.cashAmount ? `+$${payload.cashAmount.toLocaleString()}` : 'Inheritance';
                            case 'major_expense':
                              return payload.cashAmount ? `-$${payload.cashAmount.toLocaleString()}` : 'Expense';
                            case 'interest_rate_change':
                              return payload.rateChange !== undefined 
                                ? `${payload.rateChange > 0 ? '+' : ''}${payload.rateChange}%` 
                                : 'Rate change';
                            case 'dependent_change':
                              return payload.dependentChange 
                                ? `${payload.dependentChange > 0 ? '+' : ''}${payload.dependentChange} dependent${Math.abs(payload.dependentChange) !== 1 ? 's' : ''}`
                                : 'Dependents';
                            case 'market_correction':
                              return payload.growthAdjustment !== undefined 
                                ? `${payload.growthAdjustment}% growth`
                                : 'Market';
                            case 'refinance':
                              return payload.newInterestRate ? `${payload.newInterestRate}% rate` : 'Refinance';
                            default:
                              return EVENT_TYPES[item.event!.eventType].shortLabel;
                          }
                        };
                        
                        return (
                          <TimelineItemCard
                            key={item.id}
                            type="event"
                            title={item.title}
                            subtitle={item.subtitle}
                            subtitleText={getEventSubtitle()}
                            period={item.period}
                            icon={<EventTypeIcon eventType={item.event!.eventType} size={24} className="text-slate-500" />}
                            bgColor="bg-white"
                            onRemove={() => handleRemoveEvent(item.id)}
                            onEdit={() => handleEditEvent(item.event!)}
                          />
                        );
                      }
                      
                      if (item.type === 'pause') {
                        return (
                          <TimelineItemCard
                            key={item.id}
                            type="pause"
                            title={item.title}
                            subtitleText="Strategic break"
                            icon={<Pause size={24} className="text-slate-500" />}
                            bgColor="bg-white"
                            onRemove={() => handleRemovePause(item.pauseIndex!)}
                          />
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
        
        {/* Empty State */}
        {timelineList.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Home size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 font-medium">No items yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add properties and events to build your investment timeline
              </p>
            </div>
          </div>
        )}
        
        {/* Add to Timeline Modal */}
        <AddToTimelineModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
        
        {/* Event Edit Modal */}
        {editingEvent && (
          <EventConfigModal
            isOpen={true}
            onClose={() => setEditingEvent(null)}
            category={editingEvent.category}
            editingEvent={editingEvent}
          />
        )}
        
        {/* Advanced Property Settings Modal */}
        {advancedModalProperty && (
          <PropertyDetailModal
            isOpen={true}
            onClose={() => setAdvancedModalProperty(null)}
            instanceId={advancedModalProperty.instanceId}
            propertyType={advancedModalProperty.propertyType}
          />
        )}
        
        {/* Purchase Costs Edit Modal */}
        {purchaseCostsModal && (
          <PurchaseCostsModal
            isOpen={true}
            onClose={() => setPurchaseCostsModal(null)}
            instanceId={purchaseCostsModal.instanceId}
            propertyType={purchaseCostsModal.propertyType}
            instanceData={getInstance(purchaseCostsModal.instanceId)}
            onFieldChange={(field, value) => handlePropertyFieldChange(purchaseCostsModal.instanceId, field, value)}
          />
        )}
        
        {/* Annual Expenses Edit Modal */}
        {annualExpensesModal && (
          <AnnualExpensesModal
            isOpen={true}
            onClose={() => setAnnualExpensesModal(null)}
            instanceId={annualExpensesModal.instanceId}
            propertyType={annualExpensesModal.propertyType}
            instanceData={getInstance(annualExpensesModal.instanceId)}
            onFieldChange={(field, value) => handlePropertyFieldChange(annualExpensesModal.instanceId, field, value)}
          />
        )}
      </div>
    </TourStep>
  );
};

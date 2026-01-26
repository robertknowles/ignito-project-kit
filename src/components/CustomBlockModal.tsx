import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import type { PropertyInstanceDetails } from '../types/propertyInstance';

interface CustomBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: CustomPropertyBlock) => void;
}

// Extended CustomPropertyBlock interface with all PropertyInstanceDetails fields
export interface CustomPropertyBlock extends PropertyInstanceDetails {
  id: string;
  title: string;
  cost: number; // Alias for purchasePrice for backward compatibility
  yieldPercent: number; // Calculated from rentPerWeek
  lvr: number; // Already in PropertyInstanceDetails
  loanType: 'IO' | 'PI'; // Alias for loanProduct
  isCustom: true;
  growthPercent: number; // Single growth rate for custom blocks
}

// Default values based on "Units / Apartments" template - most common property type
const getDefaultFormData = (): Omit<CustomPropertyBlock, 'id' | 'isCustom'> => ({
  title: '',
  
  // Section A: Property Overview
  state: 'VIC',
  purchasePrice: 350000,
  cost: 350000,
  valuationAtPurchase: 378000,
  rentPerWeek: 471,
  growthAssumption: 'High',
  minimumYield: 6.5,
  yieldPercent: 7,
  growthPercent: 5,
  
  // Section B: Contract & Loan Details
  daysToUnconditional: 21,
  daysForSettlement: 42,
  lvr: 85,
  lmiWaiver: false,
  loanProduct: 'IO',
  loanType: 'IO',
  interestRate: 6.5,
  loanTerm: 30,
  loanOffsetAccount: 0,
  
  // Section D: One-Off Purchase Costs
  engagementFee: 8000,
  conditionalHoldingDeposit: 7000,
  buildingInsuranceUpfront: 1400,
  buildingPestInspection: 600,
  plumbingElectricalInspections: 250,
  independentValuation: 0,
  unconditionalHoldingDeposit: 0,
  mortgageFees: 1000,
  conveyancing: 2200,
  ratesAdjustment: 0,
  maintenanceAllowancePostSettlement: 1000,
  stampDutyOverride: null,
  
  // Section E: Cashflow
  vacancyRate: 0,
  propertyManagementPercent: 6.6,
  buildingInsuranceAnnual: 350,
  councilRatesWater: 2000,
  strata: 3200,
  maintenanceAllowanceAnnual: 1750,
  landTaxOverride: null,
  potentialDeductionsRebates: 0,
});

// Scale defaults based on purchase price
const scaleDefaultsForPrice = (price: number): Partial<CustomPropertyBlock> => {
  const ratio = price / 350000; // Base price is 350k
  
  return {
    valuationAtPurchase: Math.round(price * 1.08), // 8% above purchase
    conditionalHoldingDeposit: Math.round(price * 0.02), // 2% of price
    engagementFee: Math.round(Math.min(8000 + (ratio - 1) * 2000, 15000)), // Scale up to 15k
    buildingInsuranceUpfront: Math.round(1400 * Math.sqrt(ratio)),
    buildingPestInspection: Math.round(600 * Math.sqrt(ratio)),
    mortgageFees: Math.round(1000 + (ratio - 1) * 200),
    conveyancing: Math.round(2200 + (ratio - 1) * 300),
    maintenanceAllowancePostSettlement: Math.round(1000 * ratio),
    buildingInsuranceAnnual: Math.round(350 * ratio),
    councilRatesWater: Math.round(2000 * Math.sqrt(ratio)),
    strata: Math.round(3200 * Math.sqrt(ratio)),
    maintenanceAllowanceAnnual: Math.round(1750 * ratio),
  };
};

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

export const CustomBlockModal: React.FC<CustomBlockModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState(getDefaultFormData());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    contract: false,
    costs: false,
    cashflow: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Update derived values when price changes
  const handlePriceChange = (newPrice: number) => {
    const scaledDefaults = scaleDefaultsForPrice(newPrice);
    const newRentPerWeek = Math.round((newPrice * (formData.yieldPercent / 100)) / 52);
    
    setFormData(prev => ({
      ...prev,
      purchasePrice: newPrice,
      cost: newPrice,
      rentPerWeek: newRentPerWeek,
      ...scaledDefaults,
    }));
  };

  // Update rent when yield changes
  const handleYieldChange = (newYield: number) => {
    const newRentPerWeek = Math.round((formData.purchasePrice * (newYield / 100)) / 52);
    setFormData(prev => ({
      ...prev,
      yieldPercent: newYield,
      rentPerWeek: newRentPerWeek,
    }));
  };

  // Update yield when rent changes
  const handleRentChange = (newRent: number) => {
    const newYield = ((newRent * 52) / formData.purchasePrice) * 100;
    setFormData(prev => ({
      ...prev,
      rentPerWeek: newRent,
      yieldPercent: parseFloat(newYield.toFixed(2)),
    }));
  };

  const handleSave = () => {
    const customBlock: CustomPropertyBlock = {
      id: `custom-${Date.now()}`,
      isCustom: true,
      ...formData,
      cost: formData.purchasePrice,
      loanType: formData.loanProduct,
    };
    
    onSave(customBlock);
    onClose();
    
    // Reset form
    setFormData(getDefaultFormData());
  };

  // Calculated preview values
  const loanAmount = (formData.purchasePrice * formData.lvr) / 100;
  const depositRequired = formData.purchasePrice - loanAmount;
  const annualRentalIncome = formData.rentPerWeek * 52;
  const totalOneOffCosts = useMemo(() => {
    return (
      formData.engagementFee +
      formData.conditionalHoldingDeposit +
      formData.buildingInsuranceUpfront +
      formData.buildingPestInspection +
      formData.plumbingElectricalInspections +
      formData.independentValuation +
      formData.unconditionalHoldingDeposit +
      formData.mortgageFees +
      formData.conveyancing +
      formData.ratesAdjustment +
      formData.maintenanceAllowancePostSettlement
    );
  }, [formData]);

  const totalAnnualExpenses = useMemo(() => {
    const managementFees = (annualRentalIncome * formData.propertyManagementPercent) / 100;
    return (
      formData.buildingInsuranceAnnual +
      formData.councilRatesWater +
      formData.strata +
      formData.maintenanceAllowanceAnnual +
      managementFees
    );
  }, [formData, annualRentalIncome]);

  if (!isOpen) return null;

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-gray-900 text-sm";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";
  const sectionHeaderClass = "flex items-center justify-between w-full py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors";

  // Use createPortal to render modal at document.body level, avoiding stacking context issues
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#111827]">Create Custom Property Block</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 space-y-4">
          {/* Property Name - Always visible */}
          <div>
            <label className={labelClass}>Property Name</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Premium Apartment"
              className={inputClass}
            />
          </div>

          {/* Section A: Property Overview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('overview')}
              className={sectionHeaderClass}
            >
              <span className="text-sm font-medium text-gray-700">Property Overview</span>
              {expandedSections.overview ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {expandedSections.overview && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>State</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={inputClass}
                    >
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Growth Assumption</label>
                    <select
                      value={formData.growthAssumption}
                      onChange={(e) => setFormData({ ...formData, growthAssumption: e.target.value as 'High' | 'Medium' | 'Low' })}
                      className={inputClass}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Purchase Price ($)</label>
                    <input
                      type="number"
                      value={formData.purchasePrice}
                      onChange={(e) => handlePriceChange(parseInt(e.target.value) || 0)}
                      step="10000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Valuation at Purchase ($)</label>
                    <input
                      type="number"
                      value={formData.valuationAtPurchase}
                      onChange={(e) => setFormData({ ...formData, valuationAtPurchase: parseInt(e.target.value) || 0 })}
                      step="10000"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Rent/Week ($)</label>
                    <input
                      type="number"
                      value={formData.rentPerWeek}
                      onChange={(e) => handleRentChange(parseInt(e.target.value) || 0)}
                      step="10"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Yield (%)</label>
                    <input
                      type="number"
                      value={formData.yieldPercent}
                      onChange={(e) => handleYieldChange(parseFloat(e.target.value) || 0)}
                      step="0.1"
                      min="0"
                      max="20"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Growth Rate (%)</label>
                    <input
                      type="number"
                      value={formData.growthPercent}
                      onChange={(e) => setFormData({ ...formData, growthPercent: parseFloat(e.target.value) || 0 })}
                      step="0.1"
                      min="0"
                      max="20"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Minimum Yield (%)</label>
                  <input
                    type="number"
                    value={formData.minimumYield}
                    onChange={(e) => setFormData({ ...formData, minimumYield: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section B: Contract & Loan Details */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('contract')}
              className={sectionHeaderClass}
            >
              <span className="text-sm font-medium text-gray-700">Contract & Loan Details</span>
              {expandedSections.contract ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {expandedSections.contract && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Days to Unconditional</label>
                    <input
                      type="number"
                      value={formData.daysToUnconditional}
                      onChange={(e) => setFormData({ ...formData, daysToUnconditional: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Days for Settlement</label>
                    <input
                      type="number"
                      value={formData.daysForSettlement}
                      onChange={(e) => setFormData({ ...formData, daysForSettlement: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>LVR (%)</label>
                    <input
                      type="number"
                      value={formData.lvr}
                      onChange={(e) => setFormData({ ...formData, lvr: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="95"
                      step="5"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Interest Rate (%)</label>
                    <input
                      type="number"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                      step="0.1"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Loan Term (years)</label>
                    <input
                      type="number"
                      value={formData.loanTerm}
                      onChange={(e) => setFormData({ ...formData, loanTerm: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="40"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Loan Product</label>
                    <select
                      value={formData.loanProduct}
                      onChange={(e) => setFormData({ ...formData, loanProduct: e.target.value as 'IO' | 'PI', loanType: e.target.value as 'IO' | 'PI' })}
                      className={inputClass}
                    >
                      <option value="IO">Interest Only</option>
                      <option value="PI">Principal & Interest</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Offset Account ($)</label>
                    <input
                      type="number"
                      value={formData.loanOffsetAccount}
                      onChange={(e) => setFormData({ ...formData, loanOffsetAccount: parseInt(e.target.value) || 0 })}
                      step="1000"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lmiWaiver"
                    checked={formData.lmiWaiver}
                    onChange={(e) => setFormData({ ...formData, lmiWaiver: e.target.checked })}
                    className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                  />
                  <label htmlFor="lmiWaiver" className="text-sm text-gray-700">LMI Waiver</label>
                </div>
              </div>
            )}
          </div>

          {/* Section D: One-Off Purchase Costs */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('costs')}
              className={sectionHeaderClass}
            >
              <span className="text-sm font-medium text-gray-700">One-Off Purchase Costs</span>
              {expandedSections.costs ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {expandedSections.costs && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Engagement Fee ($)</label>
                    <input
                      type="number"
                      value={formData.engagementFee}
                      onChange={(e) => setFormData({ ...formData, engagementFee: parseInt(e.target.value) || 0 })}
                      step="500"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Conditional Holding Deposit ($)</label>
                    <input
                      type="number"
                      value={formData.conditionalHoldingDeposit}
                      onChange={(e) => setFormData({ ...formData, conditionalHoldingDeposit: parseInt(e.target.value) || 0 })}
                      step="500"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Building Insurance Upfront ($)</label>
                    <input
                      type="number"
                      value={formData.buildingInsuranceUpfront}
                      onChange={(e) => setFormData({ ...formData, buildingInsuranceUpfront: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Building & Pest Inspection ($)</label>
                    <input
                      type="number"
                      value={formData.buildingPestInspection}
                      onChange={(e) => setFormData({ ...formData, buildingPestInspection: parseInt(e.target.value) || 0 })}
                      step="50"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Plumbing/Electrical Inspections ($)</label>
                    <input
                      type="number"
                      value={formData.plumbingElectricalInspections}
                      onChange={(e) => setFormData({ ...formData, plumbingElectricalInspections: parseInt(e.target.value) || 0 })}
                      step="50"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Independent Valuation ($)</label>
                    <input
                      type="number"
                      value={formData.independentValuation}
                      onChange={(e) => setFormData({ ...formData, independentValuation: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Unconditional Holding Deposit ($)</label>
                    <input
                      type="number"
                      value={formData.unconditionalHoldingDeposit}
                      onChange={(e) => setFormData({ ...formData, unconditionalHoldingDeposit: parseInt(e.target.value) || 0 })}
                      step="500"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Mortgage Fees ($)</label>
                    <input
                      type="number"
                      value={formData.mortgageFees}
                      onChange={(e) => setFormData({ ...formData, mortgageFees: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Conveyancing ($)</label>
                    <input
                      type="number"
                      value={formData.conveyancing}
                      onChange={(e) => setFormData({ ...formData, conveyancing: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Rates Adjustment ($)</label>
                    <input
                      type="number"
                      value={formData.ratesAdjustment}
                      onChange={(e) => setFormData({ ...formData, ratesAdjustment: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Maintenance Allowance Post Settlement ($)</label>
                    <input
                      type="number"
                      value={formData.maintenanceAllowancePostSettlement}
                      onChange={(e) => setFormData({ ...formData, maintenanceAllowancePostSettlement: parseInt(e.target.value) || 0 })}
                      step="500"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Stamp Duty Override ($)</label>
                    <input
                      type="number"
                      value={formData.stampDutyOverride ?? ''}
                      onChange={(e) => setFormData({ ...formData, stampDutyOverride: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Auto-calculated"
                      step="1000"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* One-off costs total */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total One-Off Costs:</span>
                    <span className="font-medium text-gray-900">${totalOneOffCosts.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section E: Cashflow */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('cashflow')}
              className={sectionHeaderClass}
            >
              <span className="text-sm font-medium text-gray-700">Annual Cashflow Expenses</span>
              {expandedSections.cashflow ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {expandedSections.cashflow && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Vacancy Rate (%)</label>
                    <input
                      type="number"
                      value={formData.vacancyRate}
                      onChange={(e) => setFormData({ ...formData, vacancyRate: parseFloat(e.target.value) || 0 })}
                      step="0.5"
                      min="0"
                      max="20"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Property Management (%)</label>
                    <input
                      type="number"
                      value={formData.propertyManagementPercent}
                      onChange={(e) => setFormData({ ...formData, propertyManagementPercent: parseFloat(e.target.value) || 0 })}
                      step="0.1"
                      min="0"
                      max="15"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Building Insurance Annual ($)</label>
                    <input
                      type="number"
                      value={formData.buildingInsuranceAnnual}
                      onChange={(e) => setFormData({ ...formData, buildingInsuranceAnnual: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Council Rates & Water ($)</label>
                    <input
                      type="number"
                      value={formData.councilRatesWater}
                      onChange={(e) => setFormData({ ...formData, councilRatesWater: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Strata / Body Corporate ($)</label>
                    <input
                      type="number"
                      value={formData.strata}
                      onChange={(e) => setFormData({ ...formData, strata: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Maintenance Allowance Annual ($)</label>
                    <input
                      type="number"
                      value={formData.maintenanceAllowanceAnnual}
                      onChange={(e) => setFormData({ ...formData, maintenanceAllowanceAnnual: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Land Tax Override ($)</label>
                    <input
                      type="number"
                      value={formData.landTaxOverride ?? ''}
                      onChange={(e) => setFormData({ ...formData, landTaxOverride: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Auto-calculated"
                      step="100"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Potential Deductions/Rebates ($)</label>
                    <input
                      type="number"
                      value={formData.potentialDeductionsRebates}
                      onChange={(e) => setFormData({ ...formData, potentialDeductionsRebates: parseInt(e.target.value) || 0 })}
                      step="100"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Annual expenses total */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Annual Expenses:</span>
                    <span className="font-medium text-gray-900">${Math.round(totalAnnualExpenses).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Preview */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-3">Summary Preview</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Purchase Price:</span>
                <span className="font-medium text-blue-900">${formData.purchasePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Loan Amount:</span>
                <span className="font-medium text-blue-900">${loanAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Deposit Required:</span>
                <span className="font-medium text-blue-900">${depositRequired.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Annual Rental Income:</span>
                <span className="font-medium text-blue-900">${annualRentalIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Total One-Off Costs:</span>
                <span className="font-medium text-blue-900">${totalOneOffCosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Annual Expenses:</span>
                <span className="font-medium text-blue-900">${Math.round(totalAnnualExpenses).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Add Block
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

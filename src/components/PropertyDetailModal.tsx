import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { Loader2 } from 'lucide-react';
import { usePerPropertyTracking } from '../hooks/usePerPropertyTracking';

// Validation helper
const validateField = (field: string, value: any): string | null => {
  switch (field) {
    case 'purchasePrice':
    case 'valuationAtPurchase':
      if (value < 0) return 'Must be positive';
      if (value > 50000000) return 'Must be under $50M';
      return null;
    
    case 'rentPerWeek':
      if (value < 0) return 'Must be positive';
      if (value > 10000) return 'Must be under $10,000/week';
      return null;
    
    case 'lvr':
      if (value < 0 || value > 100) return 'Must be 0-100%';
      return null;
    
    case 'interestRate':
      if (value < 0 || value > 20) return 'Must be 0-20%';
      return null;
    
    case 'loanTerm':
      if (value < 1 || value > 40) return 'Must be 1-40 years';
      return null;
    
    case 'vacancyRate':
    case 'propertyManagementPercent':
      if (value < 0 || value > 100) return 'Must be 0-100%';
      return null;
    
    default:
      return null;
  }
};

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  propertyType: string;
  isTemplate?: boolean; // NEW: Indicates this is editing a template, not an instance
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  propertyType,
  isTemplate = false,
}) => {
  const { getInstance, updateInstance, createInstance } = usePropertyInstance();
  const { getPropertyData, getPropertyTypeTemplate, updatePropertyTypeTemplate } = useDataAssumptions();
  
  // Get data based on whether this is a template or instance
  const existingInstance = !isTemplate ? getInstance(instanceId) : null;
  const existingTemplate = isTemplate ? getPropertyTypeTemplate(propertyType) : null;
  
  // Local state for form fields
  const [formData, setFormData] = useState<PropertyInstanceDetails | null>(
    isTemplate ? existingTemplate : existingInstance
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Get tracking data for projections tab (only for instances, not templates)
  const { trackingData } = usePerPropertyTracking(isTemplate ? '' : instanceId);
  
  // Initialize form data
  useEffect(() => {
    if (isTemplate) {
      // Load template data
      const template = getPropertyTypeTemplate(propertyType);
      if (template) {
        setFormData(template);
      }
    } else {
      // Load or create instance data
      const instance = getInstance(instanceId);
      if (!instance) {
        createInstance(instanceId, propertyType, 1);
        // Get the newly created instance
        const newInstance = getInstance(instanceId);
        if (newInstance) {
          setFormData(newInstance);
        }
      } else {
        setFormData(instance);
      }
    }
  }, [instanceId, createInstance, getInstance, propertyType, isTemplate, getPropertyTypeTemplate]);
  
  // Update local state when field changes
  const handleFieldChange = (field: keyof PropertyInstanceDetails, value: any) => {
    const error = validateField(field, value);
    
    setValidationErrors(prev => ({
      ...prev,
      [field]: error || '',
    }));
    
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  };
  
  // Save changes to context
  const handleSave = async () => {
    setIsSaving(true);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (formData) {
      if (isTemplate) {
        // Save to property type template
        updatePropertyTypeTemplate(propertyType, formData);
      } else {
        // Save to property instance
        updateInstance(instanceId, formData);
      }
    }
    setIsSaving(false);
    onClose();
  };
  
  // Cancel and revert changes
  const handleCancel = () => {
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isTemplate 
              ? `Edit Template: ${propertyType}` 
              : `Property Details - ${propertyType}`
            }
          </DialogTitle>
          {isTemplate && (
            <p className="text-sm text-[#6b7280] mt-1">
              These defaults will apply to all new properties of this type.
              Existing properties in the timeline will not be affected.
            </p>
          )}
        </DialogHeader>
        
        {!formData ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
        <Tabs defaultValue="property-loan" className="w-full">
          <TabsList className={`grid w-full ${isTemplate ? 'grid-cols-3' : 'grid-cols-4'}`}>
            <TabsTrigger value="property-loan">Property & Loan</TabsTrigger>
            <TabsTrigger value="purchase-costs">Purchase Costs</TabsTrigger>
            <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
            {!isTemplate && <TabsTrigger value="projections">Projections</TabsTrigger>}
          </TabsList>
          
          {/* TAB 1: Property & Loan Details */}
          <TabsContent value="property-loan" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              
              {/* State */}
              <div>
                <Label htmlFor="state">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleFieldChange('state', value)}
                >
                  <SelectTrigger id="state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIC">VIC</SelectItem>
                    <SelectItem value="NSW">NSW</SelectItem>
                    <SelectItem value="QLD">QLD</SelectItem>
                    <SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="WA">WA</SelectItem>
                    <SelectItem value="TAS">TAS</SelectItem>
                    <SelectItem value="NT">NT</SelectItem>
                    <SelectItem value="ACT">ACT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Purchase Price */}
              <div>
                <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => handleFieldChange('purchasePrice', parseFloat(e.target.value))}
                  className={validationErrors.purchasePrice ? 'border-red-300' : ''}
                />
                {validationErrors.purchasePrice && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.purchasePrice}</p>
                )}
              </div>
              
              {/* Valuation */}
              <div>
                <Label htmlFor="valuationAtPurchase">Valuation at Purchase ($)</Label>
                <Input
                  id="valuationAtPurchase"
                  type="number"
                  value={formData.valuationAtPurchase}
                  onChange={(e) => handleFieldChange('valuationAtPurchase', parseFloat(e.target.value))}
                  className={validationErrors.valuationAtPurchase ? 'border-red-300' : ''}
                />
                {validationErrors.valuationAtPurchase && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.valuationAtPurchase}</p>
                )}
              </div>
              
              {/* Rent Per Week */}
              <div>
                <Label htmlFor="rentPerWeek">Rent Per Week ($)</Label>
                <Input
                  id="rentPerWeek"
                  type="number"
                  value={formData.rentPerWeek}
                  onChange={(e) => handleFieldChange('rentPerWeek', parseFloat(e.target.value))}
                  className={validationErrors.rentPerWeek ? 'border-red-300' : ''}
                />
                {validationErrors.rentPerWeek && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.rentPerWeek}</p>
                )}
              </div>
              
              {/* Growth Assumption */}
              <div>
                <Label htmlFor="growthAssumption">Growth Assumption</Label>
                <Select
                  value={formData.growthAssumption}
                  onValueChange={(value) => handleFieldChange('growthAssumption', value)}
                >
                  <SelectTrigger id="growthAssumption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Minimum Yield */}
              <div>
                <Label htmlFor="minimumYield">Minimum Yield (%)</Label>
                <Input
                  id="minimumYield"
                  type="number"
                  step="0.1"
                  value={formData.minimumYield}
                  onChange={(e) => handleFieldChange('minimumYield', parseFloat(e.target.value))}
                />
              </div>
              
              {/* Days to Unconditional */}
              <div>
                <Label htmlFor="daysToUnconditional">Days to Unconditional</Label>
                <Input
                  id="daysToUnconditional"
                  type="number"
                  value={formData.daysToUnconditional}
                  onChange={(e) => handleFieldChange('daysToUnconditional', parseInt(e.target.value))}
                />
              </div>
              
              {/* Days for Settlement */}
              <div>
                <Label htmlFor="daysForSettlement">Days for Settlement</Label>
                <Input
                  id="daysForSettlement"
                  type="number"
                  value={formData.daysForSettlement}
                  onChange={(e) => handleFieldChange('daysForSettlement', parseInt(e.target.value))}
                />
              </div>
              
              {/* LVR */}
              <div>
                <Label htmlFor="lvr">LVR (%)</Label>
                <Input
                  id="lvr"
                  type="number"
                  step="0.1"
                  value={formData.lvr}
                  onChange={(e) => handleFieldChange('lvr', parseFloat(e.target.value))}
                  className={validationErrors.lvr ? 'border-red-300' : ''}
                />
                {validationErrors.lvr && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.lvr}</p>
                )}
              </div>
              
              {/* LMI Waiver */}
              <div>
                <Label htmlFor="lmiWaiver">LMI Waiver</Label>
                <Select
                  value={formData.lmiWaiver ? 'true' : 'false'}
                  onValueChange={(value) => handleFieldChange('lmiWaiver', value === 'true')}
                >
                  <SelectTrigger id="lmiWaiver">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Loan Product */}
              <div>
                <Label htmlFor="loanProduct">Loan Product</Label>
                <Select
                  value={formData.loanProduct}
                  onValueChange={(value) => handleFieldChange('loanProduct', value)}
                >
                  <SelectTrigger id="loanProduct">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IO">Interest Only (IO)</SelectItem>
                    <SelectItem value="PI">Principal & Interest (P&I)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Interest Rate */}
              <div>
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => handleFieldChange('interestRate', parseFloat(e.target.value))}
                  className={validationErrors.interestRate ? 'border-red-300' : ''}
                />
                {validationErrors.interestRate && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.interestRate}</p>
                )}
              </div>
              
              {/* Loan Term */}
              <div>
                <Label htmlFor="loanTerm">Loan Term (Years)</Label>
                <Input
                  id="loanTerm"
                  type="number"
                  value={formData.loanTerm}
                  onChange={(e) => handleFieldChange('loanTerm', parseInt(e.target.value))}
                  className={validationErrors.loanTerm ? 'border-red-300' : ''}
                />
                {validationErrors.loanTerm && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.loanTerm}</p>
                )}
              </div>
              
              {/* Loan Offset Account */}
              <div>
                <Label htmlFor="loanOffsetAccount">Loan Offset Account ($)</Label>
                <Input
                  id="loanOffsetAccount"
                  type="number"
                  value={formData.loanOffsetAccount}
                  onChange={(e) => handleFieldChange('loanOffsetAccount', parseFloat(e.target.value))}
                />
              </div>
              
            </div>
          </TabsContent>
          
          {/* TAB 2: Purchase Costs */}
          <TabsContent value="purchase-costs" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              
              <div>
                <Label htmlFor="engagementFee">Engagement Fee ($)</Label>
                <Input
                  id="engagementFee"
                  type="number"
                  value={formData.engagementFee}
                  onChange={(e) => handleFieldChange('engagementFee', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="conditionalHoldingDeposit">Conditional Holding Deposit ($)</Label>
                <Input
                  id="conditionalHoldingDeposit"
                  type="number"
                  value={formData.conditionalHoldingDeposit}
                  onChange={(e) => handleFieldChange('conditionalHoldingDeposit', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="buildingInsuranceUpfront">Building Insurance Upfront ($)</Label>
                <Input
                  id="buildingInsuranceUpfront"
                  type="number"
                  value={formData.buildingInsuranceUpfront}
                  onChange={(e) => handleFieldChange('buildingInsuranceUpfront', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="buildingPestInspection">Building & Pest Inspection ($)</Label>
                <Input
                  id="buildingPestInspection"
                  type="number"
                  value={formData.buildingPestInspection}
                  onChange={(e) => handleFieldChange('buildingPestInspection', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="plumbingElectricalInspections">Plumbing & Electrical Inspections ($)</Label>
                <Input
                  id="plumbingElectricalInspections"
                  type="number"
                  value={formData.plumbingElectricalInspections}
                  onChange={(e) => handleFieldChange('plumbingElectricalInspections', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="independentValuation">Independent Valuation ($)</Label>
                <Input
                  id="independentValuation"
                  type="number"
                  value={formData.independentValuation}
                  onChange={(e) => handleFieldChange('independentValuation', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="unconditionalHoldingDeposit">Unconditional Holding Deposit ($)</Label>
                <Input
                  id="unconditionalHoldingDeposit"
                  type="number"
                  value={formData.unconditionalHoldingDeposit}
                  onChange={(e) => handleFieldChange('unconditionalHoldingDeposit', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="mortgageFees">Mortgage Fees & Discharge ($)</Label>
                <Input
                  id="mortgageFees"
                  type="number"
                  value={formData.mortgageFees}
                  onChange={(e) => handleFieldChange('mortgageFees', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="conveyancing">Conveyancing (Fees + Searches) ($)</Label>
                <Input
                  id="conveyancing"
                  type="number"
                  value={formData.conveyancing}
                  onChange={(e) => handleFieldChange('conveyancing', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="ratesAdjustment">Rates Adjustment ($)</Label>
                <Input
                  id="ratesAdjustment"
                  type="number"
                  value={formData.ratesAdjustment}
                  onChange={(e) => handleFieldChange('ratesAdjustment', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="maintenanceAllowancePostSettlement">Maintenance Allowance (Post-Settlement) ($)</Label>
                <Input
                  id="maintenanceAllowancePostSettlement"
                  type="number"
                  value={formData.maintenanceAllowancePostSettlement}
                  onChange={(e) => handleFieldChange('maintenanceAllowancePostSettlement', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="stampDutyOverride">Stamp Duty Override ($)</Label>
                <Input
                  id="stampDutyOverride"
                  type="number"
                  value={formData.stampDutyOverride ?? ''}
                  onChange={(e) => handleFieldChange('stampDutyOverride', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Leave empty to auto-calculate"
                />
              </div>
              
            </div>
          </TabsContent>
          
          {/* TAB 3: Cashflow */}
          <TabsContent value="cashflow" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              
              <div>
                <Label htmlFor="vacancyRate">Vacancy Rate (%)</Label>
                <Input
                  id="vacancyRate"
                  type="number"
                  step="0.1"
                  value={formData.vacancyRate}
                  onChange={(e) => handleFieldChange('vacancyRate', parseFloat(e.target.value))}
                  className={validationErrors.vacancyRate ? 'border-red-300' : ''}
                />
                {validationErrors.vacancyRate && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.vacancyRate}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="propertyManagementPercent">Property Management (%)</Label>
                <Input
                  id="propertyManagementPercent"
                  type="number"
                  step="0.1"
                  value={formData.propertyManagementPercent}
                  onChange={(e) => handleFieldChange('propertyManagementPercent', parseFloat(e.target.value))}
                  className={validationErrors.propertyManagementPercent ? 'border-red-300' : ''}
                />
                {validationErrors.propertyManagementPercent && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.propertyManagementPercent}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="buildingInsuranceAnnual">Building Insurance (Annual) ($)</Label>
                <Input
                  id="buildingInsuranceAnnual"
                  type="number"
                  value={formData.buildingInsuranceAnnual}
                  onChange={(e) => handleFieldChange('buildingInsuranceAnnual', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="councilRatesWater">Council Rates + Water ($)</Label>
                <Input
                  id="councilRatesWater"
                  type="number"
                  value={formData.councilRatesWater}
                  onChange={(e) => handleFieldChange('councilRatesWater', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="strata">Strata ($)</Label>
                <Input
                  id="strata"
                  type="number"
                  value={formData.strata}
                  onChange={(e) => handleFieldChange('strata', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="maintenanceAllowanceAnnual">Maintenance Allowance (Annual) ($)</Label>
                <Input
                  id="maintenanceAllowanceAnnual"
                  type="number"
                  value={formData.maintenanceAllowanceAnnual}
                  onChange={(e) => handleFieldChange('maintenanceAllowanceAnnual', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="landTaxOverride">Land Tax Override ($)</Label>
                <Input
                  id="landTaxOverride"
                  type="number"
                  value={formData.landTaxOverride ?? ''}
                  onChange={(e) => handleFieldChange('landTaxOverride', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Leave empty to auto-calculate"
                />
              </div>
              
              <div>
                <Label htmlFor="potentialDeductionsRebates">Potential Deductions / Rebates ($)</Label>
                <Input
                  id="potentialDeductionsRebates"
                  type="number"
                  value={formData.potentialDeductionsRebates}
                  onChange={(e) => handleFieldChange('potentialDeductionsRebates', parseFloat(e.target.value))}
                />
              </div>
              
            </div>
          </TabsContent>
          
          {/* TAB 4: Projections (Read-only 10-year projections) */}
          <TabsContent value="projections" className="space-y-4">
            {!trackingData ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="animate-spin text-gray-400" size={32} />
                <p className="text-sm text-gray-500">Calculating projections...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header with context */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    10-Year Financial Projections
                  </h3>
                  <p className="text-xs text-blue-700">
                    Based on {trackingData.propertyTitle} purchased in {trackingData.purchasePeriod}
                  </p>
                </div>
                
                {/* Projections Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Metric
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                          Year 1
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                          Year 5
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                          Year 10
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Property Value */}
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">
                          Property Value
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          ${trackingData.equityOverTime[0]?.propertyValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          ${trackingData.equityOverTime[4]?.propertyValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          ${trackingData.equityOverTime[9]?.propertyValue.toLocaleString()}
                        </td>
                      </tr>
                      
                      {/* Total Equity */}
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">
                          Total Equity
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          ${trackingData.equityOverTime[0]?.equity.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          ${trackingData.equityOverTime[4]?.equity.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          ${trackingData.equityOverTime[9]?.equity.toLocaleString()}
                        </td>
                      </tr>
                      
                      {/* Net Annual Cashflow */}
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">
                          Net Annual Cashflow
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className={trackingData.cashflowOverTime[0]?.netCashflow >= 0 ? 'text-green-700' : 'text-red-700'}>
                            {trackingData.cashflowOverTime[0]?.netCashflow >= 0 ? '+' : ''}
                            ${trackingData.cashflowOverTime[0]?.netCashflow.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className={trackingData.cashflowOverTime[4]?.netCashflow >= 0 ? 'text-green-700' : 'text-red-700'}>
                            {trackingData.cashflowOverTime[4]?.netCashflow >= 0 ? '+' : ''}
                            ${trackingData.cashflowOverTime[4]?.netCashflow.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className={trackingData.cashflowOverTime[9]?.netCashflow >= 0 ? 'text-green-700' : 'text-red-700'}>
                            {trackingData.cashflowOverTime[9]?.netCashflow >= 0 ? '+' : ''}
                            ${trackingData.cashflowOverTime[9]?.netCashflow.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                      
                      {/* COC Return */}
                      <tr className="border-b border-gray-100 hover:bg-gray-50 bg-amber-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">
                          COC Return %
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className={trackingData.cashOnCashReturn >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                            {trackingData.cashOnCashReturn.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-400">
                          —
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-400">
                          —
                        </td>
                      </tr>
                      
                      {/* Annualized ROIC */}
                      <tr className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">
                          Annualized ROIC %
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-400">
                          —
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-400">
                          —
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className={trackingData.roic >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                            {trackingData.roic.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Footer with additional context */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Cash Invested:</span>
                    <span className="font-semibold text-gray-900">
                      ${trackingData.totalCashInvested.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-300">
                    <p><strong>COC Return:</strong> Year 1 net cashflow divided by total cash invested (deposit + acquisition costs)</p>
                    <p className="mt-1"><strong>Annualized ROIC:</strong> Total return (equity gain + cumulative cashflow) divided by cash invested over 10 years</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
        </Tabs>
        )}
        
        {/* Action Buttons */}
        {formData && (
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={Object.values(validationErrors).some(err => err) || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        )}
        
      </DialogContent>
    </Dialog>
  );
};



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

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  propertyType: string;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  propertyType,
}) => {
  const { getInstance, updateInstance, createInstance } = usePropertyInstance();
  const { getPropertyData } = useDataAssumptions();
  
  // Get existing instance
  const existingInstance = getInstance(instanceId);
  
  // Local state for form fields
  const [formData, setFormData] = useState<PropertyInstanceDetails | null>(existingInstance);
  
  // Create instance if it doesn't exist (in useEffect, not during render)
  useEffect(() => {
    if (!existingInstance) {
      createInstance(instanceId, propertyType, 1);
      const newInstance = getInstance(instanceId);
      if (newInstance) {
        setFormData(newInstance);
      }
    } else {
      setFormData(existingInstance);
    }
  }, [instanceId, existingInstance, createInstance, getInstance, propertyType]);
  
  // Update local state when field changes
  const handleFieldChange = (field: keyof PropertyInstanceDetails, value: any) => {
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  };
  
  // Save changes to context
  const handleSave = () => {
    if (formData) {
      updateInstance(instanceId, formData);
    }
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
          <DialogTitle>Property Details - {propertyType}</DialogTitle>
        </DialogHeader>
        
        {!formData ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
        <Tabs defaultValue="property-loan" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="property-loan">Property & Loan</TabsTrigger>
            <TabsTrigger value="purchase-costs">Purchase Costs</TabsTrigger>
            <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
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
                />
              </div>
              
              {/* Valuation */}
              <div>
                <Label htmlFor="valuationAtPurchase">Valuation at Purchase ($)</Label>
                <Input
                  id="valuationAtPurchase"
                  type="number"
                  value={formData.valuationAtPurchase}
                  onChange={(e) => handleFieldChange('valuationAtPurchase', parseFloat(e.target.value))}
                />
              </div>
              
              {/* Rent Per Week */}
              <div>
                <Label htmlFor="rentPerWeek">Rent Per Week ($)</Label>
                <Input
                  id="rentPerWeek"
                  type="number"
                  value={formData.rentPerWeek}
                  onChange={(e) => handleFieldChange('rentPerWeek', parseFloat(e.target.value))}
                />
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
                />
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
                />
              </div>
              
              {/* Loan Term */}
              <div>
                <Label htmlFor="loanTerm">Loan Term (Years)</Label>
                <Input
                  id="loanTerm"
                  type="number"
                  value={formData.loanTerm}
                  onChange={(e) => handleFieldChange('loanTerm', parseInt(e.target.value))}
                />
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
                />
              </div>
              
              <div>
                <Label htmlFor="propertyManagementPercent">Property Management (%)</Label>
                <Input
                  id="propertyManagementPercent"
                  type="number"
                  step="0.1"
                  value={formData.propertyManagementPercent}
                  onChange={(e) => handleFieldChange('propertyManagementPercent', parseFloat(e.target.value))}
                />
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
          
          {/* TAB 4: Summary (Read-only calculated values) */}
          <TabsContent value="summary" className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">
                This tab will show calculated values like loan amount, LMI, deposit balance, net cashflow, etc.
              </p>
              <p className="text-sm text-gray-600">
                These values are calculated automatically based on the inputs in the other tabs.
              </p>
              <p className="text-sm font-medium text-gray-800 mt-4">
                Coming soon: Full summary with all calculated metrics.
              </p>
            </div>
          </TabsContent>
          
        </Tabs>
        )}
        
      </DialogContent>
    </Dialog>
  );
};



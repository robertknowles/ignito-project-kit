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
import { Loader2, AlertCircle } from 'lucide-react';
import { usePerPropertyTracking } from '../hooks/usePerPropertyTracking';
import { toast } from '@/hooks/use-toast';

// Helper to safely parse numeric input (prevents NaN bugs)
const parseNumericInput = (value: string, defaultValue: number = 0): number => {
  // Handle empty, null, or undefined
  if (value === '' || value === null || value === undefined) {
    return defaultValue;
  }
  
  const parsed = parseFloat(value);
  // Return default if parsing resulted in NaN
  return isNaN(parsed) ? defaultValue : parsed;
};

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
  readOnly?: boolean; // NEW: When true, all inputs are disabled and save button is hidden
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  propertyType,
  isTemplate = false,
  readOnly = false,
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState<PropertyInstanceDetails | null>(null);
  
  // Get tracking data for projections tab (only for instances, not templates)
  const { trackingData } = usePerPropertyTracking(isTemplate ? '' : instanceId);
  
  // Initialize form data
  useEffect(() => {
    if (isTemplate) {
      // Load template data
      const template = getPropertyTypeTemplate(propertyType);
      if (template) {
        setFormData(template);
        setInitialFormData(template);
      }
    } else {
      // Load or create instance data
      const instance = getInstance(instanceId);
      if (!instance) {
        // Create instance with template defaults
        createInstance(instanceId, propertyType, 1);
        // Use template defaults immediately while instance is being created
        // Set valuationAtPurchase to purchasePrice for new instances
        const template = getPropertyTypeTemplate(propertyType);
        if (template) {
          const templateWithDefaultValuation = {
            ...template,
            valuationAtPurchase: template.purchasePrice, // Default valuation to purchase price
          };
          setFormData(templateWithDefaultValuation);
          setInitialFormData(templateWithDefaultValuation);
        }
      } else {
        setFormData(instance);
        setInitialFormData(instance);
      }
    }
    setHasUnsavedChanges(false);
  }, [instanceId, createInstance, getInstance, propertyType, isTemplate, getPropertyTypeTemplate]);
  
  // Update local state when field changes
  const handleFieldChange = (field: keyof PropertyInstanceDetails, value: any) => {
    console.log(`PropertyDetailModal: Field "${field}" changed to:`, value);
    
    const error = validateField(field, value);
    
    if (error) {
      console.warn(`PropertyDetailModal: Validation error for "${field}":`, error);
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [field]: error || '',
    }));
    
    setFormData(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        [field]: value,
      };
      console.log(`PropertyDetailModal: Updated formData for "${field}"`);
      
      // Check if data has changed from initial
      if (initialFormData) {
        const hasChanged = JSON.stringify(updated) !== JSON.stringify(initialFormData);
        setHasUnsavedChanges(hasChanged);
      }
      
      return updated;
    });
  };
  
  // Save changes to context
  const handleSave = async () => {
    console.log('PropertyDetailModal: === SAVE OPERATION STARTED ===');
    console.log('PropertyDetailModal: Instance ID:', instanceId);
    console.log('PropertyDetailModal: Is Template:', isTemplate);
    
    try {
      setIsSaving(true);
      setSaveError(null);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!formData) {
        throw new Error('Cannot save - form data is null or undefined');
      }
      
      console.log('PropertyDetailModal: FormData contains', Object.keys(formData).length, 'fields');
      
      // Log all fields being saved
      const fieldsList = [
        'state', 'purchasePrice', 'valuationAtPurchase', 'rentPerWeek', 'growthAssumption',
        'daysToUnconditional', 'daysForSettlement', 'lvr', 'lmiWaiver', 'loanProduct', 'interestRate', 
        'loanTerm', 'loanOffsetAccount', 'engagementFee', 'conditionalHoldingDeposit', 
        'buildingInsuranceUpfront', 'buildingPestInspection', 'plumbingElectricalInspections',
        'independentValuation', 'unconditionalHoldingDeposit', 'mortgageFees', 'conveyancing',
        'ratesAdjustment', 'maintenanceAllowancePostSettlement', 'stampDutyOverride',
        'vacancyRate', 'propertyManagementPercent', 'buildingInsuranceAnnual', 'councilRatesWater',
        'strata', 'maintenanceAllowanceAnnual', 'landTaxOverride', 'potentialDeductionsRebates'
      ];
      
      console.log('PropertyDetailModal: Field values being saved:');
      fieldsList.forEach(field => {
        if (field in formData) {
          console.log(`  - ${field}:`, (formData as any)[field]);
        } else {
          console.warn(`  - ${field}: MISSING`);
        }
      });
      
      // Check for validation errors before saving
      const hasValidationErrors = Object.values(validationErrors).some(err => err);
      if (hasValidationErrors) {
        throw new Error('Cannot save - form has validation errors');
      }
      
      if (isTemplate) {
        // Save to property type template
        console.log('PropertyDetailModal: Saving template for', propertyType);
        updatePropertyTypeTemplate(propertyType, formData);
        
        toast({
          title: "Template Saved",
          description: `${propertyType} template updated successfully`,
        });
      } else {
        // Save to property instance
        console.log('PropertyDetailModal: Calling updateInstance() with all fields');
        updateInstance(instanceId, formData);
        
        // Verify save by retrieving the instance
        setTimeout(() => {
          const savedInstance = getInstance(instanceId);
          if (savedInstance) {
            console.log('PropertyDetailModal: ✓ Instance saved successfully to context');
            console.log('PropertyDetailModal: Verifying saved fields...');
            
            const missingFields = fieldsList.filter(field => !(field in savedInstance));
            if (missingFields.length > 0) {
              console.error('PropertyDetailModal: ✗ Missing fields in saved instance:', missingFields);
              toast({
                title: "Warning",
                description: `Some fields may not have saved correctly. Check console for details.`,
                variant: "destructive",
              });
            } else {
              console.log('PropertyDetailModal: ✓ All fields present in saved instance');
              toast({
                title: "Property Saved",
                description: "All changes saved successfully to context. Click 'Save' in the main app to persist to database.",
              });
            }
          } else {
            console.error('PropertyDetailModal: ✗ Failed to verify instance save - getInstance returned undefined');
            throw new Error('Failed to verify save operation');
          }
        }, 100);
      }
      
      console.log('PropertyDetailModal: === SAVE OPERATION COMPLETED ===');
      setHasUnsavedChanges(false);
      setInitialFormData(formData);
      onClose();
      
    } catch (error) {
      console.error('PropertyDetailModal: ✗ Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSaveError(errorMessage);
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Cancel and revert changes
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isTemplate 
                ? `Edit Template: ${propertyType}` 
                : readOnly 
                  ? `View Details - ${propertyType}`
                  : `Property Details - ${propertyType}`
              }
              {hasUnsavedChanges && !isSaving && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></span>
                  Unsaved changes
                </span>
              )}
            </DialogTitle>
          </div>
          {isTemplate && (
            <p className="text-sm text-[#6b7280] mt-1">
              These defaults will apply to all new properties of this type.
              Existing properties in the timeline will not be affected.
            </p>
          )}
          {saveError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Save Error</p>
                <p className="text-xs text-red-700 mt-1">{saveError}</p>
              </div>
            </div>
          )}
        </DialogHeader>
        
        {!formData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="animate-spin text-gray-400" size={32} />
            <p className="text-sm text-gray-500">Loading property data...</p>
          </div>
        ) : (
        <Tabs defaultValue="property-loan" className="w-full">
          <TabsList className={`grid w-full ${isTemplate ? 'grid-cols-3' : 'grid-cols-4'}`}>
            <TabsTrigger value="property-loan" disabled={isSaving}>Property & Loan</TabsTrigger>
            <TabsTrigger value="purchase-costs" disabled={isSaving}>Purchase Costs</TabsTrigger>
            <TabsTrigger value="cashflow" disabled={isSaving}>Cashflow</TabsTrigger>
            {!isTemplate && <TabsTrigger value="projections" disabled={isSaving}>Projections</TabsTrigger>}
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
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('purchasePrice', parseNumericInput(e.target.value))}
                  className={validationErrors.purchasePrice ? 'border-red-300' : ''}
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('valuationAtPurchase', parseNumericInput(e.target.value))}
                  className={validationErrors.valuationAtPurchase ? 'border-red-300' : ''}
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('rentPerWeek', parseNumericInput(e.target.value))}
                  className={validationErrors.rentPerWeek ? 'border-red-300' : ''}
                  disabled={isSaving || readOnly}
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
                  disabled={isSaving || readOnly}
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
              
              {/* Days to Unconditional */}
              <div>
                <Label htmlFor="daysToUnconditional">Days to Unconditional</Label>
                <Input
                  id="daysToUnconditional"
                  type="number"
                  value={formData.daysToUnconditional}
                  onChange={(e) => handleFieldChange('daysToUnconditional', parseInt(e.target.value))}
                  disabled={isSaving || readOnly}
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
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('lvr', parseNumericInput(e.target.value))}
                  className={validationErrors.lvr ? 'border-red-300' : ''}
                  disabled={isSaving || readOnly}
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
                  disabled={isSaving || readOnly}
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
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('interestRate', parseNumericInput(e.target.value))}
                  className={validationErrors.interestRate ? 'border-red-300' : ''}
                  disabled={isSaving || readOnly}
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
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('loanOffsetAccount', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
            </div>
            
            {/* Property Loan Section - Read-only calculated values */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Property Loan Summary</h3>
              <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <Label className="text-gray-600">%MV (Market Value Difference)</Label>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {((formData.purchasePrice / formData.valuationAtPurchase - 1) * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Price vs Valuation
                  </p>
                </div>
                
                <div>
                  <Label className="text-gray-600">Loan Type</Label>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {formData.loanProduct === 'IO' ? 'Interest Only (IO)' : 'Principal & Interest (P&I)'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    @ {formData.interestRate}%
                  </p>
                </div>
                
                <div>
                  <Label className="text-gray-600">Total Loan Amount</Label>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    ${(((formData.purchasePrice * (formData.lvr / 100)) + 
                       (formData.lmiWaiver || formData.lvr <= 80 ? 0 : 
                        (formData.purchasePrice * (formData.lvr / 100)) * 
                        (formData.lvr <= 85 ? 0.015 : formData.lvr <= 90 ? 0.020 : formData.lvr <= 95 ? 0.035 : 0.045)
                       )) / 1000).toFixed(0)}k
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Loan + LMI
                  </p>
                </div>
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
                  onChange={(e) => handleFieldChange('engagementFee', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="conditionalHoldingDeposit">Conditional Holding Deposit ($)</Label>
                <Input
                  id="conditionalHoldingDeposit"
                  type="number"
                  value={formData.conditionalHoldingDeposit}
                  onChange={(e) => handleFieldChange('conditionalHoldingDeposit', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="buildingInsuranceUpfront">Building Insurance Upfront ($)</Label>
                <Input
                  id="buildingInsuranceUpfront"
                  type="number"
                  value={formData.buildingInsuranceUpfront}
                  onChange={(e) => handleFieldChange('buildingInsuranceUpfront', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="buildingPestInspection">Building & Pest Inspection ($)</Label>
                <Input
                  id="buildingPestInspection"
                  type="number"
                  value={formData.buildingPestInspection}
                  onChange={(e) => handleFieldChange('buildingPestInspection', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="plumbingElectricalInspections">Plumbing & Electrical Inspections ($)</Label>
                <Input
                  id="plumbingElectricalInspections"
                  type="number"
                  value={formData.plumbingElectricalInspections}
                  onChange={(e) => handleFieldChange('plumbingElectricalInspections', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="independentValuation">Independent Valuation ($)</Label>
                <Input
                  id="independentValuation"
                  type="number"
                  value={formData.independentValuation}
                  onChange={(e) => handleFieldChange('independentValuation', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="unconditionalHoldingDeposit">Unconditional Holding Deposit ($)</Label>
                <Input
                  id="unconditionalHoldingDeposit"
                  type="number"
                  value={formData.unconditionalHoldingDeposit}
                  onChange={(e) => handleFieldChange('unconditionalHoldingDeposit', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="mortgageFees">Mortgage Fees & Discharge ($)</Label>
                <Input
                  id="mortgageFees"
                  type="number"
                  value={formData.mortgageFees}
                  onChange={(e) => handleFieldChange('mortgageFees', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="conveyancing">Conveyancing (Fees + Searches) ($)</Label>
                <Input
                  id="conveyancing"
                  type="number"
                  value={formData.conveyancing}
                  onChange={(e) => handleFieldChange('conveyancing', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="ratesAdjustment">Rates Adjustment ($)</Label>
                <Input
                  id="ratesAdjustment"
                  type="number"
                  value={formData.ratesAdjustment}
                  onChange={(e) => handleFieldChange('ratesAdjustment', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="maintenanceAllowancePostSettlement">Maintenance Allowance (Post-Settlement) ($)</Label>
                <Input
                  id="maintenanceAllowancePostSettlement"
                  type="number"
                  value={formData.maintenanceAllowancePostSettlement}
                  onChange={(e) => handleFieldChange('maintenanceAllowancePostSettlement', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="stampDutyOverride">Stamp Duty Override ($)</Label>
                <Input
                  id="stampDutyOverride"
                  type="number"
                  value={formData.stampDutyOverride ?? ''}
                  onChange={(e) => handleFieldChange('stampDutyOverride', e.target.value ? parseNumericInput(e.target.value) : null)}
                  placeholder="Leave empty to auto-calculate"
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('vacancyRate', parseNumericInput(e.target.value))}
                  className={validationErrors.vacancyRate ? 'border-red-300' : ''}
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('propertyManagementPercent', parseNumericInput(e.target.value))}
                  className={validationErrors.propertyManagementPercent ? 'border-red-300' : ''}
                  disabled={isSaving || readOnly}
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
                  onChange={(e) => handleFieldChange('buildingInsuranceAnnual', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="councilRatesWater">Council Rates + Water ($)</Label>
                <Input
                  id="councilRatesWater"
                  type="number"
                  value={formData.councilRatesWater}
                  onChange={(e) => handleFieldChange('councilRatesWater', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="strata">Strata ($)</Label>
                <Input
                  id="strata"
                  type="number"
                  value={formData.strata}
                  onChange={(e) => handleFieldChange('strata', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="maintenanceAllowanceAnnual">Maintenance Allowance (Annual) ($)</Label>
                <Input
                  id="maintenanceAllowanceAnnual"
                  type="number"
                  value={formData.maintenanceAllowanceAnnual}
                  onChange={(e) => handleFieldChange('maintenanceAllowanceAnnual', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="landTaxOverride">Land Tax Override ($)</Label>
                <Input
                  id="landTaxOverride"
                  type="number"
                  value={formData.landTaxOverride ?? ''}
                  onChange={(e) => handleFieldChange('landTaxOverride', e.target.value ? parseNumericInput(e.target.value) : null)}
                  placeholder="Leave empty to auto-calculate"
                  disabled={isSaving || readOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="potentialDeductionsRebates">Potential Deductions / Rebates ($)</Label>
                <Input
                  id="potentialDeductionsRebates"
                  type="number"
                  value={formData.potentialDeductionsRebates}
                  onChange={(e) => handleFieldChange('potentialDeductionsRebates', parseNumericInput(e.target.value))}
                  disabled={isSaving || readOnly}
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
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && (
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
            )}
          </div>
        )}
        
      </DialogContent>
    </Dialog>
  );
};



import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
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

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  propertyType: string;
  isTemplate?: boolean; // Indicates this is editing a template, not an instance
  readOnly?: boolean; // When true, all inputs are disabled and save button is hidden
  isDuplicating?: boolean; // Indicates this is duplicating from a source instance
  sourceInstanceId?: string; // The source instance to copy data from when duplicating
  onDuplicateSave?: () => void; // Callback when duplication is saved (to increment property count)
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  propertyType,
  isTemplate = false,
  readOnly = false,
  isDuplicating = false,
  sourceInstanceId,
  onDuplicateSave,
}) => {
  const { getInstance, updateInstance, createInstance } = usePropertyInstance();
  const { getPropertyTypeTemplate, updatePropertyTypeTemplate } = useDataAssumptions();
  
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
  
  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    loan: false,
    costs: false,
    cashflow: false,
    projections: false,
  });
  
  // Get tracking data for projections (only for instances, not templates)
  const { trackingData } = usePerPropertyTracking(isTemplate ? '' : instanceId);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Initialize form data
  useEffect(() => {
    if (isDuplicating && sourceInstanceId) {
      // Duplicating: Load data from source instance to pre-fill the form
      const sourceInstance = getInstance(sourceInstanceId);
      if (sourceInstance) {
        setFormData({ ...sourceInstance });
        setInitialFormData({ ...sourceInstance });
        // Mark as having changes since this is a new property being created
        setHasUnsavedChanges(true);
      } else {
        // Fallback to template if source instance not found
        const template = getPropertyTypeTemplate(propertyType);
        if (template) {
          setFormData({ ...template });
          setInitialFormData({ ...template });
          setHasUnsavedChanges(true);
        }
      }
    } else if (isTemplate) {
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
    if (!isDuplicating) {
      setHasUnsavedChanges(false);
    }
  }, [instanceId, createInstance, getInstance, propertyType, isTemplate, getPropertyTypeTemplate, isDuplicating, sourceInstanceId]);
  
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
      
      if (isDuplicating) {
        // Duplicating: First call the callback to increment property count, then save the new instance
        console.log('PropertyDetailModal: Duplicating property - calling onDuplicateSave callback');
        
        if (onDuplicateSave) {
          onDuplicateSave();
        }
        
        // Save the form data to the new instance (instanceId is the new instance ID)
        // Small delay to ensure the instance is created first
        setTimeout(() => {
          console.log('PropertyDetailModal: Saving duplicated instance data to:', instanceId);
          updateInstance(instanceId, formData);
          
          toast({
            title: "Property Duplicated",
            description: `${propertyType} duplicated successfully. Click 'Save' in the main app to persist to database.`,
          });
        }, 100);
        
      } else if (isTemplate) {
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
  
  // Calculate one-off costs total
  const totalOneOffCosts = useMemo(() => {
    if (!formData) return 0;
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

  // Calculate annual expenses total
  const totalAnnualExpenses = useMemo(() => {
    if (!formData) return 0;
    const annualRentalIncome = formData.rentPerWeek * 52;
    const managementFees = (annualRentalIncome * formData.propertyManagementPercent) / 100;
    return (
      formData.buildingInsuranceAnnual +
      formData.councilRatesWater +
      formData.strata +
      formData.maintenanceAllowanceAnnual +
      managementFees
    );
  }, [formData]);

  if (!isOpen) return null;

  // Styling classes matching CustomBlockModal
  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-gray-900 text-sm";
  const inputErrorClass = "w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 text-gray-900 text-sm";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";
  const sectionHeaderClass = "flex items-center justify-between w-full py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors";

  // Use createPortal to render modal at document.body level, avoiding stacking context issues
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#111827] flex items-center gap-2">
              {isDuplicating
                ? `Duplicate Property: ${propertyType}`
                : isTemplate 
                  ? `Edit Template: ${propertyType}` 
                  : readOnly 
                    ? `View Details - ${propertyType}`
                    : `Property Details - ${propertyType}`
              }
              {hasUnsavedChanges && !isSaving && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></span>
                  Unsaved
                </span>
              )}
            </h3>
            {isDuplicating && (
              <p className="text-sm text-gray-500 mt-1">
                Edit the property details below and click "Add Duplicate" to create a new property.
              </p>
            )}
            {isTemplate && !isDuplicating && (
              <p className="text-sm text-gray-500 mt-1">
                These defaults will apply to all new properties of this type.
              </p>
            )}
          </div>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Error Banner */}
        {saveError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Save Error</p>
              <p className="text-xs text-red-700 mt-1">{saveError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!formData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="animate-spin text-gray-400" size={32} />
            <p className="text-sm text-gray-500">Loading property data...</p>
          </div>
        ) : (
          <>
            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 pr-2 space-y-4">
              
              {/* Section 1: Property Overview */}
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
                          onChange={(e) => handleFieldChange('state', e.target.value)}
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        >
                          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Growth Assumption</label>
                        <select
                          value={formData.growthAssumption}
                          onChange={(e) => handleFieldChange('growthAssumption', e.target.value as 'High' | 'Medium' | 'Low')}
                          className={inputClass}
                          disabled={isSaving || readOnly}
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
                          onChange={(e) => handleFieldChange('purchasePrice', parseNumericInput(e.target.value))}
                          step="10000"
                          className={validationErrors.purchasePrice ? inputErrorClass : inputClass}
                          disabled={isSaving || readOnly}
                        />
                        {validationErrors.purchasePrice && (
                          <p className="text-xs text-red-700 mt-1">{validationErrors.purchasePrice}</p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Valuation at Purchase ($)</label>
                        <input
                          type="number"
                          value={formData.valuationAtPurchase}
                          onChange={(e) => handleFieldChange('valuationAtPurchase', parseNumericInput(e.target.value))}
                          step="10000"
                          className={validationErrors.valuationAtPurchase ? inputErrorClass : inputClass}
                          disabled={isSaving || readOnly}
                        />
                        {validationErrors.valuationAtPurchase && (
                          <p className="text-xs text-red-700 mt-1">{validationErrors.valuationAtPurchase}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Rent/Week ($)</label>
                        <input
                          type="number"
                          value={formData.rentPerWeek}
                          onChange={(e) => handleFieldChange('rentPerWeek', parseNumericInput(e.target.value))}
                          step="10"
                          className={validationErrors.rentPerWeek ? inputErrorClass : inputClass}
                          disabled={isSaving || readOnly}
                        />
                        {validationErrors.rentPerWeek && (
                          <p className="text-xs text-red-700 mt-1">{validationErrors.rentPerWeek}</p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Days to Unconditional</label>
                        <input
                          type="number"
                          value={formData.daysToUnconditional}
                          onChange={(e) => handleFieldChange('daysToUnconditional', parseInt(e.target.value) || 0)}
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Days for Settlement</label>
                      <input
                        type="number"
                        value={formData.daysForSettlement}
                        onChange={(e) => handleFieldChange('daysForSettlement', parseInt(e.target.value) || 0)}
                        className={inputClass}
                        disabled={isSaving || readOnly}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Loan Details */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('loan')}
                  className={sectionHeaderClass}
                >
                  <span className="text-sm font-medium text-gray-700">Loan Details</span>
                  {expandedSections.loan ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                
                {expandedSections.loan && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>LVR (%)</label>
                        <input
                          type="number"
                          value={formData.lvr}
                          onChange={(e) => handleFieldChange('lvr', parseNumericInput(e.target.value))}
                          min="0"
                          max="95"
                          step="5"
                          className={validationErrors.lvr ? inputErrorClass : inputClass}
                          disabled={isSaving || readOnly}
                        />
                        {validationErrors.lvr && (
                          <p className="text-xs text-red-700 mt-1">{validationErrors.lvr}</p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Interest Rate (%)</label>
                        <input
                          type="number"
                          value={formData.interestRate}
                          onChange={(e) => handleFieldChange('interestRate', parseNumericInput(e.target.value))}
                          step="0.1"
                          className={validationErrors.interestRate ? inputErrorClass : inputClass}
                          disabled={isSaving || readOnly}
                        />
                        {validationErrors.interestRate && (
                          <p className="text-xs text-red-700 mt-1">{validationErrors.interestRate}</p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Loan Term (years)</label>
                        <input
                          type="number"
                          value={formData.loanTerm}
                          onChange={(e) => handleFieldChange('loanTerm', parseInt(e.target.value) || 0)}
                          min="1"
                          max="40"
                          className={validationErrors.loanTerm ? inputErrorClass : inputClass}
                          disabled={isSaving || readOnly}
                        />
                        {validationErrors.loanTerm && (
                          <p className="text-xs text-red-700 mt-1">{validationErrors.loanTerm}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Loan Product</label>
                        <select
                          value={formData.loanProduct}
                          onChange={(e) => handleFieldChange('loanProduct', e.target.value as 'IO' | 'PI')}
                          className={inputClass}
                          disabled={isSaving || readOnly}
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
                          onChange={(e) => handleFieldChange('loanOffsetAccount', parseNumericInput(e.target.value))}
                          step="1000"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="lmiWaiver"
                        checked={formData.lmiWaiver}
                        onChange={(e) => handleFieldChange('lmiWaiver', e.target.checked)}
                        className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                        disabled={isSaving || readOnly}
                      />
                      <label htmlFor="lmiWaiver" className="text-sm text-gray-700">LMI Waiver</label>
                    </div>

                    {/* Loan Summary - Read-only calculated values */}
                    <div className="bg-gray-50 p-3 rounded-md space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">%MV (Market Value Diff):</span>
                        <span className="font-medium text-gray-900">
                          {((formData.purchasePrice / formData.valuationAtPurchase - 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Loan Amount (+ LMI):</span>
                        <span className="font-medium text-gray-900">
                          ${(((formData.purchasePrice * (formData.lvr / 100)) + 
                             (formData.lmiWaiver || formData.lvr <= 80 ? 0 : 
                              (formData.purchasePrice * (formData.lvr / 100)) * 
                              (formData.lvr <= 85 ? 0.015 : formData.lvr <= 90 ? 0.020 : formData.lvr <= 95 ? 0.035 : 0.045)
                             )) / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: One-Off Purchase Costs */}
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
                          onChange={(e) => handleFieldChange('engagementFee', parseNumericInput(e.target.value))}
                          step="500"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Conditional Holding Deposit ($)</label>
                        <input
                          type="number"
                          value={formData.conditionalHoldingDeposit}
                          onChange={(e) => handleFieldChange('conditionalHoldingDeposit', parseNumericInput(e.target.value))}
                          step="500"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Building Insurance Upfront ($)</label>
                        <input
                          type="number"
                          value={formData.buildingInsuranceUpfront}
                          onChange={(e) => handleFieldChange('buildingInsuranceUpfront', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Building & Pest Inspection ($)</label>
                        <input
                          type="number"
                          value={formData.buildingPestInspection}
                          onChange={(e) => handleFieldChange('buildingPestInspection', parseNumericInput(e.target.value))}
                          step="50"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Plumbing/Electrical Inspections ($)</label>
                        <input
                          type="number"
                          value={formData.plumbingElectricalInspections}
                          onChange={(e) => handleFieldChange('plumbingElectricalInspections', parseNumericInput(e.target.value))}
                          step="50"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Independent Valuation ($)</label>
                        <input
                          type="number"
                          value={formData.independentValuation}
                          onChange={(e) => handleFieldChange('independentValuation', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Unconditional Holding Deposit ($)</label>
                        <input
                          type="number"
                          value={formData.unconditionalHoldingDeposit}
                          onChange={(e) => handleFieldChange('unconditionalHoldingDeposit', parseNumericInput(e.target.value))}
                          step="500"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Mortgage Fees ($)</label>
                        <input
                          type="number"
                          value={formData.mortgageFees}
                          onChange={(e) => handleFieldChange('mortgageFees', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Conveyancing ($)</label>
                        <input
                          type="number"
                          value={formData.conveyancing}
                          onChange={(e) => handleFieldChange('conveyancing', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Rates Adjustment ($)</label>
                        <input
                          type="number"
                          value={formData.ratesAdjustment}
                          onChange={(e) => handleFieldChange('ratesAdjustment', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Maintenance Allowance Post Settlement ($)</label>
                        <input
                          type="number"
                          value={formData.maintenanceAllowancePostSettlement}
                          onChange={(e) => handleFieldChange('maintenanceAllowancePostSettlement', parseNumericInput(e.target.value))}
                          step="500"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Stamp Duty Override ($)</label>
                        <input
                          type="number"
                          value={formData.stampDutyOverride ?? ''}
                          onChange={(e) => handleFieldChange('stampDutyOverride', e.target.value ? parseNumericInput(e.target.value) : null)}
                          placeholder="Auto-calculated"
                          step="1000"
                          className={inputClass}
                          disabled={isSaving || readOnly}
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

              {/* Section 4: Annual Cashflow */}
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
                          onChange={(e) => handleFieldChange('vacancyRate', parseNumericInput(e.target.value))}
                          step="0.5"
                          min="0"
                          max="20"
                          className={validationErrors.vacancyRate ? inputErrorClass : inputClass}
                          disabled={isSaving || readOnly}
                        />
                        {validationErrors.vacancyRate && (
                          <p className="text-xs text-red-700 mt-1">{validationErrors.vacancyRate}</p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Property Management (%)</label>
                        <input
                          type="number"
                          value={formData.propertyManagementPercent}
                          onChange={(e) => handleFieldChange('propertyManagementPercent', parseNumericInput(e.target.value))}
                          step="0.1"
                          min="0"
                          max="15"
                          className={validationErrors.propertyManagementPercent ? inputErrorClass : inputClass}
                          disabled={isSaving || readOnly}
                        />
                        {validationErrors.propertyManagementPercent && (
                          <p className="text-xs text-red-700 mt-1">{validationErrors.propertyManagementPercent}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Building Insurance Annual ($)</label>
                        <input
                          type="number"
                          value={formData.buildingInsuranceAnnual}
                          onChange={(e) => handleFieldChange('buildingInsuranceAnnual', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Council Rates & Water ($)</label>
                        <input
                          type="number"
                          value={formData.councilRatesWater}
                          onChange={(e) => handleFieldChange('councilRatesWater', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Strata / Body Corporate ($)</label>
                        <input
                          type="number"
                          value={formData.strata}
                          onChange={(e) => handleFieldChange('strata', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Maintenance Allowance Annual ($)</label>
                        <input
                          type="number"
                          value={formData.maintenanceAllowanceAnnual}
                          onChange={(e) => handleFieldChange('maintenanceAllowanceAnnual', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Land Tax Override ($)</label>
                        <input
                          type="number"
                          value={formData.landTaxOverride ?? ''}
                          onChange={(e) => handleFieldChange('landTaxOverride', e.target.value ? parseNumericInput(e.target.value) : null)}
                          placeholder="Auto-calculated"
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Potential Deductions/Rebates ($)</label>
                        <input
                          type="number"
                          value={formData.potentialDeductionsRebates}
                          onChange={(e) => handleFieldChange('potentialDeductionsRebates', parseNumericInput(e.target.value))}
                          step="100"
                          className={inputClass}
                          disabled={isSaving || readOnly}
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

              {/* Section 5: Projections (only for instances, not templates) */}
              {!isTemplate && !isDuplicating && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('projections')}
                    className={sectionHeaderClass}
                  >
                    <span className="text-sm font-medium text-gray-700">10-Year Projections</span>
                    {expandedSections.projections ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  
                  {expandedSections.projections && (
                    <div className="p-4">
                      {!trackingData ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                          <Loader2 className="animate-spin text-gray-400" size={24} />
                          <p className="text-sm text-gray-500">Calculating projections...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Header with context */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-700">
                              Based on {trackingData.propertyTitle} purchased in {trackingData.purchasePeriod}
                            </p>
                          </div>
                          
                          {/* Projections Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Metric</th>
                                  <th className="text-right py-2 px-3 font-medium text-gray-700">Year 1</th>
                                  <th className="text-right py-2 px-3 font-medium text-gray-700">Year 5</th>
                                  <th className="text-right py-2 px-3 font-medium text-gray-700">Year 10</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-100">
                                  <td className="py-2 px-3 text-gray-700">Property Value</td>
                                  <td className="py-2 px-3 text-right text-gray-900">${trackingData.equityOverTime[0]?.propertyValue.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right text-gray-900">${trackingData.equityOverTime[4]?.propertyValue.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right text-gray-900">${trackingData.equityOverTime[9]?.propertyValue.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                  <td className="py-2 px-3 text-gray-700">Total Equity</td>
                                  <td className="py-2 px-3 text-right text-gray-900">${trackingData.equityOverTime[0]?.equity.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right text-gray-900">${trackingData.equityOverTime[4]?.equity.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right text-gray-900">${trackingData.equityOverTime[9]?.equity.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                  <td className="py-2 px-3 text-gray-700">Net Annual Cashflow</td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={trackingData.cashflowOverTime[0]?.netCashflow >= 0 ? 'text-green-700' : 'text-red-700'}>
                                      {trackingData.cashflowOverTime[0]?.netCashflow >= 0 ? '+' : ''}${trackingData.cashflowOverTime[0]?.netCashflow.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={trackingData.cashflowOverTime[4]?.netCashflow >= 0 ? 'text-green-700' : 'text-red-700'}>
                                      {trackingData.cashflowOverTime[4]?.netCashflow >= 0 ? '+' : ''}${trackingData.cashflowOverTime[4]?.netCashflow.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={trackingData.cashflowOverTime[9]?.netCashflow >= 0 ? 'text-green-700' : 'text-red-700'}>
                                      {trackingData.cashflowOverTime[9]?.netCashflow >= 0 ? '+' : ''}${trackingData.cashflowOverTime[9]?.netCashflow.toLocaleString()}
                                    </span>
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 bg-amber-50">
                                  <td className="py-2 px-3 text-gray-700">COC Return %</td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={trackingData.cashOnCashReturn >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                                      {trackingData.cashOnCashReturn.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-gray-400">—</td>
                                  <td className="py-2 px-3 text-right text-gray-400">—</td>
                                </tr>
                                <tr className="bg-blue-50">
                                  <td className="py-2 px-3 text-gray-700">Annualized ROIC %</td>
                                  <td className="py-2 px-3 text-right text-gray-400">—</td>
                                  <td className="py-2 px-3 text-right text-gray-400">—</td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={trackingData.roic >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                                      {trackingData.roic.toFixed(2)}%
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Footer with additional context */}
                          <div className="bg-gray-50 p-3 rounded-md">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Total Cash Invested:</span>
                              <span className="font-medium text-gray-900">${trackingData.totalCashInvested.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button
                  onClick={handleSave}
                  disabled={Object.values(validationErrors).some(err => err) || isSaving}
                  className="flex-1 py-2.5 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      {isDuplicating ? 'Adding...' : 'Saving...'}
                    </>
                  ) : (
                    isDuplicating ? 'Add Duplicate' : 'Save Changes'
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

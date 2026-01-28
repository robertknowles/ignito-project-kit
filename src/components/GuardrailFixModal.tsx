import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertTriangle, Check, X, ArrowRight, ChevronDown, ChevronRight, Edit3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TimelineProperty } from '@/types/property';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';
import type { GuardrailViolation, GuardrailViolationType, ValidationResult } from '@/utils/guardrailValidator';
import { validatePropertyPlacement } from '@/utils/guardrailValidator';
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { calculateSuggestedFixes, type SuggestedFix, type ExtendedPropertyValues } from '@/utils/suggestedFixes';
import { calculateOneOffCosts, calculateDepositBalance } from '@/utils/oneOffCostsCalculator';
import { calculateLMI } from '@/utils/lmiCalculator';
import { calculateStampDuty } from '@/utils/stampDutyCalculator';
import { getPropertyInstanceDefaults } from '@/utils/propertyInstanceDefaults';

/** One-off costs fields that can be adjusted */
interface OneOffCostsState {
  engagementFee: number;
  conditionalHoldingDeposit: number;
  buildingInsuranceUpfront: number;
  buildingPestInspection: number;
  plumbingElectricalInspections: number;
  independentValuation: number;
  unconditionalHoldingDeposit: number;
  mortgageFees: number;
  conveyancing: number;
  ratesAdjustment: number;
  maintenanceAllowancePostSettlement: number;
  stampDutyOverride: number | null;
}

interface GuardrailFixModalProps {
  property: TimelineProperty;
  violations: GuardrailViolation[];
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: (updatedFields: Partial<PropertyInstanceDetails>) => void;
  onViewDetails: () => void;
}

// Format currency for display
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format compact currency
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Get constraint label for display
const getConstraintLabel = (type: GuardrailViolationType): string => {
  switch (type) {
    case 'deposit':
      return 'Deposit Test';
    case 'borrowing':
      return 'Borrowing Capacity Test';
    case 'serviceability':
      return 'Serviceability Test';
    default:
      return type;
  }
};

// Get fields relevant to specific violation types
const getRelevantFieldsForViolations = (violations: GuardrailViolation[]): Set<string> => {
  const fields = new Set<string>();

  violations.forEach((v) => {
    switch (v.type) {
      case 'deposit':
        fields.add('purchasePrice');
        fields.add('lvr');
        break;
      case 'borrowing':
        fields.add('purchasePrice');
        fields.add('lvr');
        break;
      case 'serviceability':
        fields.add('purchasePrice');
        fields.add('rentPerWeek');
        fields.add('interestRate');
        fields.add('lvr');
        break;
    }
  });

  return fields;
};

export const GuardrailFixModal: React.FC<GuardrailFixModalProps> = ({
  property,
  violations,
  isOpen,
  onClose,
  onApplyChanges,
  onViewDetails,
}) => {
  const { getInstance } = usePropertyInstance();
  const { timelineProperties, calculateAffordabilityForProperty } = useAffordabilityCalculator();
  const costsRef = useRef<HTMLDivElement>(null);

  // Get the current property instance
  const propertyInstance = getInstance(property.instanceId);
  
  // Get defaults for this property type
  const propertyDefaults = useMemo(() => {
    return getPropertyInstanceDefaults(property.title);
  }, [property.title]);

  // Local state for adjusted values
  const [adjustedValues, setAdjustedValues] = useState<{
    purchasePrice: number;
    lvr: number;
    rentPerWeek: number;
    interestRate: number;
  }>({
    purchasePrice: property.cost,
    lvr: propertyInstance?.lvr ?? 80,
    rentPerWeek: propertyInstance?.rentPerWeek ?? 0,
    interestRate: propertyInstance?.interestRate ?? 6.5,
  });

  // State for one-off costs
  const [adjustedOneOffCosts, setAdjustedOneOffCosts] = useState<OneOffCostsState>({
    engagementFee: propertyInstance?.engagementFee ?? propertyDefaults.engagementFee,
    conditionalHoldingDeposit: propertyInstance?.conditionalHoldingDeposit ?? propertyDefaults.conditionalHoldingDeposit,
    buildingInsuranceUpfront: propertyInstance?.buildingInsuranceUpfront ?? propertyDefaults.buildingInsuranceUpfront,
    buildingPestInspection: propertyInstance?.buildingPestInspection ?? propertyDefaults.buildingPestInspection,
    plumbingElectricalInspections: propertyInstance?.plumbingElectricalInspections ?? propertyDefaults.plumbingElectricalInspections,
    independentValuation: propertyInstance?.independentValuation ?? propertyDefaults.independentValuation,
    unconditionalHoldingDeposit: propertyInstance?.unconditionalHoldingDeposit ?? propertyDefaults.unconditionalHoldingDeposit,
    mortgageFees: propertyInstance?.mortgageFees ?? propertyDefaults.mortgageFees,
    conveyancing: propertyInstance?.conveyancing ?? propertyDefaults.conveyancing,
    ratesAdjustment: propertyInstance?.ratesAdjustment ?? propertyDefaults.ratesAdjustment,
    maintenanceAllowancePostSettlement: propertyInstance?.maintenanceAllowancePostSettlement ?? propertyDefaults.maintenanceAllowancePostSettlement,
    stampDutyOverride: propertyInstance?.stampDutyOverride ?? null,
  });

  // State for expandable one-off costs section
  const [isOneOffCostsExpanded, setIsOneOffCostsExpanded] = useState(false);

  // State for LMI capitalization option
  const [capitalizeLmi, setCapitalizeLmi] = useState(false);

  // Live validation state
  const [liveValidation, setLiveValidation] = useState<{
    deposit: { pass: boolean; surplus: number };
    borrowing: { pass: boolean; surplus: number };
    serviceability: { pass: boolean; surplus: number };
  }>({
    deposit: { pass: property.depositTestPass, surplus: property.depositTestSurplus },
    borrowing: { pass: property.borrowingCapacityRemaining >= 0, surplus: property.borrowingCapacityRemaining },
    serviceability: { pass: property.serviceabilityTestPass, surplus: property.serviceabilityTestSurplus },
  });

  // Reset adjusted values when property changes
  useEffect(() => {
    if (propertyInstance) {
      setAdjustedValues({
        purchasePrice: propertyInstance.purchasePrice ?? property.cost,
        lvr: propertyInstance.lvr ?? 80,
        rentPerWeek: propertyInstance.rentPerWeek ?? 0,
        interestRate: propertyInstance.interestRate ?? 6.5,
      });
      
      // Reset one-off costs
      setAdjustedOneOffCosts({
        engagementFee: propertyInstance.engagementFee ?? propertyDefaults.engagementFee,
        conditionalHoldingDeposit: propertyInstance.conditionalHoldingDeposit ?? propertyDefaults.conditionalHoldingDeposit,
        buildingInsuranceUpfront: propertyInstance.buildingInsuranceUpfront ?? propertyDefaults.buildingInsuranceUpfront,
        buildingPestInspection: propertyInstance.buildingPestInspection ?? propertyDefaults.buildingPestInspection,
        plumbingElectricalInspections: propertyInstance.plumbingElectricalInspections ?? propertyDefaults.plumbingElectricalInspections,
        independentValuation: propertyInstance.independentValuation ?? propertyDefaults.independentValuation,
        unconditionalHoldingDeposit: propertyInstance.unconditionalHoldingDeposit ?? propertyDefaults.unconditionalHoldingDeposit,
        mortgageFees: propertyInstance.mortgageFees ?? propertyDefaults.mortgageFees,
        conveyancing: propertyInstance.conveyancing ?? propertyDefaults.conveyancing,
        ratesAdjustment: propertyInstance.ratesAdjustment ?? propertyDefaults.ratesAdjustment,
        maintenanceAllowancePostSettlement: propertyInstance.maintenanceAllowancePostSettlement ?? propertyDefaults.maintenanceAllowancePostSettlement,
        stampDutyOverride: propertyInstance.stampDutyOverride ?? null,
      });
      
      setCapitalizeLmi(false);
    }
  }, [property, propertyInstance, propertyDefaults]);

  // Build purchase history for validation (exclude current property)
  const purchaseHistory = useMemo(() => {
    return timelineProperties
      .filter((p) => p.instanceId !== property.instanceId && p.period !== Infinity && p.period < property.period)
      .map((p) => ({
        period: p.period,
        cost: p.cost,
        depositRequired: p.depositRequired,
        loanAmount: p.loanAmount,
        title: p.title,
        instanceId: p.instanceId,
        loanType: p.loanType,
        cumulativeEquityReleased: 0,
      }));
  }, [timelineProperties, property.instanceId, property.period]);

  // Calculate stamp duty, LMI, and total one-off costs
  const calculatedCosts = useMemo(() => {
    const state = propertyInstance?.state ?? propertyDefaults.state;
    const lmiWaiver = propertyInstance?.lmiWaiver ?? false;
    
    // Calculate stamp duty
    const stampDuty = adjustedOneOffCosts.stampDutyOverride ?? calculateStampDuty(
      state,
      adjustedValues.purchasePrice,
      false // Not first home buyer
    );
    
    // Calculate LMI
    const loanAmount = adjustedValues.purchasePrice * (adjustedValues.lvr / 100);
    const lmi = calculateLMI(loanAmount, adjustedValues.lvr, lmiWaiver);
    
    // Calculate deposit balance
    const depositBalance = calculateDepositBalance(
      adjustedValues.purchasePrice,
      adjustedValues.lvr,
      adjustedOneOffCosts.conditionalHoldingDeposit,
      adjustedOneOffCosts.unconditionalHoldingDeposit
    );
    
    // Build temporary instance for calculating one-off costs
    const tempInstance: PropertyInstanceDetails = {
      ...(propertyInstance ?? propertyDefaults),
      ...adjustedOneOffCosts,
      purchasePrice: adjustedValues.purchasePrice,
      lvr: adjustedValues.lvr,
    };
    
    // Calculate one-off costs
    const oneOffCosts = calculateOneOffCosts(tempInstance, stampDuty, depositBalance);
    
    // Total one-off costs excluding LMI (LMI is separate)
    const totalOneOffCostsExLmi = oneOffCosts.totalCashRequired;
    
    // LMI can be capitalized into loan or paid upfront
    const lmiCashRequired = capitalizeLmi ? 0 : lmi;
    
    // Total cash required
    const totalCashRequired = totalOneOffCostsExLmi + lmiCashRequired;
    
    return {
      stampDuty,
      lmi,
      lmiCashRequired,
      depositBalance,
      totalOneOffCostsExLmi,
      totalCashRequired,
      oneOffCosts,
    };
  }, [adjustedValues, adjustedOneOffCosts, propertyInstance, propertyDefaults, capitalizeLmi]);

  // Real-time validation as fields change
  useEffect(() => {
    // Calculate new deposit and loan amounts based on adjusted values
    const newDepositRequired = adjustedValues.purchasePrice * (1 - adjustedValues.lvr / 100);
    const baseLoanAmount = adjustedValues.purchasePrice * (adjustedValues.lvr / 100);
    // If capitalizing LMI, add it to the loan amount
    const newLoanAmount = capitalizeLmi ? baseLoanAmount + calculatedCosts.lmi : baseLoanAmount;

    // Create a modified property object for validation
    const modifiedProperty = {
      ...property,
      cost: adjustedValues.purchasePrice,
      depositRequired: newDepositRequired,
      loanAmount: newLoanAmount,
      title: property.title,
      instanceId: property.instanceId,
      totalCashRequired: calculatedCosts.totalCashRequired,
    };

    // Run affordability calculation
    const result = calculateAffordabilityForProperty(
      property.period,
      modifiedProperty,
      purchaseHistory
    );

    // Calculate adjusted deposit test using our calculated total cash required
    // The standard affordability calculation may not account for our adjusted one-off costs
    const availableFunds = property.availableFundsUsed;
    const adjustedDepositSurplus = availableFunds - calculatedCosts.totalCashRequired;
    const adjustedDepositPass = adjustedDepositSurplus >= 0;

    // Update live validation state
    setLiveValidation({
      deposit: {
        pass: adjustedDepositPass,
        surplus: adjustedDepositSurplus,
      },
      borrowing: {
        pass: result.borrowingCapacityPass ?? true,
        surplus: result.borrowingCapacityRemaining ?? 0,
      },
      serviceability: {
        pass: result.serviceabilityTestPass,
        surplus: result.serviceabilityTestSurplus,
      },
    });
  }, [adjustedValues, adjustedOneOffCosts, property, purchaseHistory, calculateAffordabilityForProperty, calculatedCosts, capitalizeLmi]);

  // Get relevant fields based on violations
  const relevantFields = useMemo(() => getRelevantFieldsForViolations(violations), [violations]);

  // Calculate suggested fixes with extended values
  const suggestedFixes = useMemo(() => {
    const extendedValues: ExtendedPropertyValues = {
      purchasePrice: adjustedValues.purchasePrice,
      lvr: adjustedValues.lvr,
      rentPerWeek: adjustedValues.rentPerWeek,
      totalOneOffCosts: calculatedCosts.totalOneOffCostsExLmi,
      lmiAmount: calculatedCosts.lmi,
      lmiWaiver: propertyInstance?.lmiWaiver ?? false,
      propertyInstance: propertyInstance ?? null,
    };
    
    return calculateSuggestedFixes(
      property,
      violations,
      {
        purchasePrice: adjustedValues.purchasePrice,
        lvr: adjustedValues.lvr,
        rentPerWeek: adjustedValues.rentPerWeek,
      },
      property.availableFundsUsed, // Use available funds at purchase time
      extendedValues
    );
  }, [property, violations, adjustedValues, calculatedCosts, propertyInstance]);

  // Check if all violations are now resolved
  const allViolationsResolved = useMemo(() => {
    return liveValidation.deposit.pass &&
      liveValidation.borrowing.pass &&
      liveValidation.serviceability.pass;
  }, [liveValidation]);

  // Handle field changes for primary fields
  const handleFieldChange = useCallback((field: string, value: number) => {
    setAdjustedValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Handle one-off cost field changes
  const handleOneOffCostChange = useCallback((field: keyof OneOffCostsState, value: number | null) => {
    setAdjustedOneOffCosts((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Handle apply suggested fix
  const handleApplySuggestedFix = useCallback((fix: SuggestedFix) => {
    if (fix.actionType === 'editCosts') {
      // Expand the costs section and scroll to it
      setIsOneOffCostsExpanded(true);
      setTimeout(() => {
        costsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (fix.actionType === 'capitalizeLmi') {
      // Enable LMI capitalization
      setCapitalizeLmi(true);
    } else if (fix.field === 'purchasePrice' || fix.field === 'lvr' || fix.field === 'rentPerWeek' || fix.field === 'interestRate') {
      handleFieldChange(fix.field, fix.suggestedValue);
    }
  }, [handleFieldChange]);

  // Handle apply changes - includes all modified fields
  const handleApplyChanges = useCallback(() => {
    const updates: Partial<PropertyInstanceDetails> = {
      // Primary fields
      purchasePrice: adjustedValues.purchasePrice,
      lvr: adjustedValues.lvr,
      rentPerWeek: adjustedValues.rentPerWeek,
      interestRate: adjustedValues.interestRate,
      // One-off cost fields
      engagementFee: adjustedOneOffCosts.engagementFee,
      conditionalHoldingDeposit: adjustedOneOffCosts.conditionalHoldingDeposit,
      buildingInsuranceUpfront: adjustedOneOffCosts.buildingInsuranceUpfront,
      buildingPestInspection: adjustedOneOffCosts.buildingPestInspection,
      plumbingElectricalInspections: adjustedOneOffCosts.plumbingElectricalInspections,
      independentValuation: adjustedOneOffCosts.independentValuation,
      unconditionalHoldingDeposit: adjustedOneOffCosts.unconditionalHoldingDeposit,
      mortgageFees: adjustedOneOffCosts.mortgageFees,
      conveyancing: adjustedOneOffCosts.conveyancing,
      ratesAdjustment: adjustedOneOffCosts.ratesAdjustment,
      maintenanceAllowancePostSettlement: adjustedOneOffCosts.maintenanceAllowancePostSettlement,
      stampDutyOverride: adjustedOneOffCosts.stampDutyOverride,
    };

    onApplyChanges(updates);
  }, [adjustedValues, adjustedOneOffCosts, onApplyChanges]);

  // Check if values have changed
  const hasChanges = useMemo(() => {
    const originalPrimary = {
      purchasePrice: propertyInstance?.purchasePrice ?? property.cost,
      lvr: propertyInstance?.lvr ?? 80,
      rentPerWeek: propertyInstance?.rentPerWeek ?? 0,
      interestRate: propertyInstance?.interestRate ?? 6.5,
    };

    const originalCosts = {
      engagementFee: propertyInstance?.engagementFee ?? propertyDefaults.engagementFee,
      conditionalHoldingDeposit: propertyInstance?.conditionalHoldingDeposit ?? propertyDefaults.conditionalHoldingDeposit,
      buildingInsuranceUpfront: propertyInstance?.buildingInsuranceUpfront ?? propertyDefaults.buildingInsuranceUpfront,
      buildingPestInspection: propertyInstance?.buildingPestInspection ?? propertyDefaults.buildingPestInspection,
      plumbingElectricalInspections: propertyInstance?.plumbingElectricalInspections ?? propertyDefaults.plumbingElectricalInspections,
      independentValuation: propertyInstance?.independentValuation ?? propertyDefaults.independentValuation,
      unconditionalHoldingDeposit: propertyInstance?.unconditionalHoldingDeposit ?? propertyDefaults.unconditionalHoldingDeposit,
      mortgageFees: propertyInstance?.mortgageFees ?? propertyDefaults.mortgageFees,
      conveyancing: propertyInstance?.conveyancing ?? propertyDefaults.conveyancing,
      ratesAdjustment: propertyInstance?.ratesAdjustment ?? propertyDefaults.ratesAdjustment,
      maintenanceAllowancePostSettlement: propertyInstance?.maintenanceAllowancePostSettlement ?? propertyDefaults.maintenanceAllowancePostSettlement,
      stampDutyOverride: propertyInstance?.stampDutyOverride ?? null,
    };

    const primaryChanged = (
      adjustedValues.purchasePrice !== originalPrimary.purchasePrice ||
      adjustedValues.lvr !== originalPrimary.lvr ||
      adjustedValues.rentPerWeek !== originalPrimary.rentPerWeek ||
      adjustedValues.interestRate !== originalPrimary.interestRate
    );

    const costsChanged = (
      adjustedOneOffCosts.engagementFee !== originalCosts.engagementFee ||
      adjustedOneOffCosts.conditionalHoldingDeposit !== originalCosts.conditionalHoldingDeposit ||
      adjustedOneOffCosts.buildingInsuranceUpfront !== originalCosts.buildingInsuranceUpfront ||
      adjustedOneOffCosts.buildingPestInspection !== originalCosts.buildingPestInspection ||
      adjustedOneOffCosts.plumbingElectricalInspections !== originalCosts.plumbingElectricalInspections ||
      adjustedOneOffCosts.independentValuation !== originalCosts.independentValuation ||
      adjustedOneOffCosts.unconditionalHoldingDeposit !== originalCosts.unconditionalHoldingDeposit ||
      adjustedOneOffCosts.mortgageFees !== originalCosts.mortgageFees ||
      adjustedOneOffCosts.conveyancing !== originalCosts.conveyancing ||
      adjustedOneOffCosts.ratesAdjustment !== originalCosts.ratesAdjustment ||
      adjustedOneOffCosts.maintenanceAllowancePostSettlement !== originalCosts.maintenanceAllowancePostSettlement ||
      adjustedOneOffCosts.stampDutyOverride !== originalCosts.stampDutyOverride
    );

    return primaryChanged || costsChanged || capitalizeLmi;
  }, [adjustedValues, adjustedOneOffCosts, propertyInstance, property, propertyDefaults, capitalizeLmi]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>This property violates constraints</span>
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {property.title} - {property.displayPeriod}
          </p>
        </DialogHeader>

        {/* Violation Summary Section */}
        <div className="space-y-2 bg-red-50 border border-red-200 p-4 rounded-lg">
          <h3 className="font-medium text-sm text-red-800 mb-3">Constraint Failures</h3>
          {violations.map((v) => (
            <div
              key={v.type}
              className="flex items-center justify-between py-2 border-b border-red-100 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm">{getConstraintLabel(v.type)}</span>
              </div>
              <div className="text-right">
                <span className="text-red-600 text-sm font-medium">
                  Shortfall: {formatCompactCurrency(v.shortfall)}
                </span>
                <p className="text-xs text-red-500">{v.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Fixes Section */}
        {suggestedFixes.length > 0 && (
          <div className="space-y-2 bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h3 className="font-medium text-sm text-blue-800 mb-3">Suggested Fixes</h3>
            {suggestedFixes.map((fix, idx) => (
              <div
                key={`${fix.field}-${idx}`}
                className="flex items-center justify-between py-2 border-b border-blue-100 last:border-b-0"
              >
                <div className="flex-1">
                  <p className="text-sm text-blue-700">{fix.explanation}</p>
                  {fix.actionType !== 'editCosts' && fix.actionType !== 'capitalizeLmi' && (
                    <p className="text-xs text-blue-500 mt-1">
                      {formatCompactCurrency(fix.currentValue)} <ArrowRight className="h-3 w-3 inline" /> {formatCompactCurrency(fix.suggestedValue)}
                    </p>
                  )}
                  {fix.actionType === 'capitalizeLmi' && (
                    <p className="text-xs text-blue-500 mt-1">
                      Upfront LMI: {formatCompactCurrency(fix.currentValue)} <ArrowRight className="h-3 w-3 inline" /> $0 (added to loan)
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplySuggestedFix(fix)}
                  className="ml-3 text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  {fix.actionType === 'editCosts' ? (
                    <span className="flex items-center gap-1">
                      <Edit3 className="h-3 w-3" />
                      Edit Costs
                    </span>
                  ) : fix.actionType === 'capitalizeLmi' ? (
                    capitalizeLmi ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Applied
                      </span>
                    ) : 'Apply'
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Adjustment Fields Section */}
        <div className="space-y-4 border border-slate-200 p-4 rounded-lg">
          <h3 className="font-medium text-sm text-slate-700">Adjust Property to Fix</h3>

          {/* Purchase Price */}
          {relevantFields.has('purchasePrice') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="purchasePrice" className="text-sm">
                  Purchase Price
                </Label>
                <span className="text-sm font-medium">
                  {formatCurrency(adjustedValues.purchasePrice)}
                </span>
              </div>
              <Input
                id="purchasePrice"
                type="number"
                value={adjustedValues.purchasePrice}
                onChange={(e) => handleFieldChange('purchasePrice', Number(e.target.value))}
                step={5000}
                min={50000}
                max={2000000}
                className="text-right"
              />
              <p className="text-xs text-slate-500">
                Reduce price to lower deposit/loan requirements
              </p>
            </div>
          )}

          {/* LVR (Loan-to-Value Ratio) */}
          {relevantFields.has('lvr') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="lvr" className="text-sm">
                  LVR (Loan-to-Value Ratio)
                </Label>
                <span className="text-sm font-medium">{adjustedValues.lvr}%</span>
              </div>
              <Slider
                id="lvr"
                value={[adjustedValues.lvr]}
                onValueChange={([val]) => handleFieldChange('lvr', val)}
                min={50}
                max={95}
                step={1}
              />
              <p className="text-xs text-slate-500">
                Lower LVR = larger deposit, smaller loan. Higher LVR = smaller deposit, larger loan (may need LMI).
              </p>
            </div>
          )}

          {/* Rent Per Week */}
          {relevantFields.has('rentPerWeek') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rentPerWeek" className="text-sm">
                  Weekly Rent
                </Label>
                <span className="text-sm font-medium">
                  ${adjustedValues.rentPerWeek}/week
                </span>
              </div>
              <Input
                id="rentPerWeek"
                type="number"
                value={adjustedValues.rentPerWeek}
                onChange={(e) => handleFieldChange('rentPerWeek', Number(e.target.value))}
                step={10}
                min={100}
                max={2000}
                className="text-right"
              />
              <p className="text-xs text-slate-500">
                Higher rent improves serviceability (cash flow)
              </p>
            </div>
          )}

          {/* Interest Rate */}
          {relevantFields.has('interestRate') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="interestRate" className="text-sm">
                  Interest Rate
                </Label>
                <span className="text-sm font-medium">{adjustedValues.interestRate}%</span>
              </div>
              <Slider
                id="interestRate"
                value={[adjustedValues.interestRate]}
                onValueChange={([val]) => handleFieldChange('interestRate', val)}
                min={4}
                max={10}
                step={0.1}
              />
              <p className="text-xs text-slate-500">
                Lower interest rate improves serviceability
              </p>
            </div>
          )}

          {/* One-Off Purchase Costs Section */}
          <div ref={costsRef} className="pt-2 border-t border-slate-100">
            <Collapsible open={isOneOffCostsExpanded} onOpenChange={setIsOneOffCostsExpanded}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-slate-50 rounded transition-colors">
                <div className="flex items-center gap-2">
                  {isOneOffCostsExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  )}
                  <Label className="text-sm cursor-pointer">One-Off Purchase Costs</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCurrency(calculatedCosts.totalCashRequired)}</span>
                  {!isOneOffCostsExpanded && (
                    <span className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </span>
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-4 space-y-4">
                {/* Cost Breakdown Summary */}
                <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Deposit Balance:</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.depositBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Stamp Duty:</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.stampDuty)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">LMI:</span>
                    <span className="font-medium">
                      {capitalizeLmi ? (
                        <span className="text-green-600">$0 (capitalized)</span>
                      ) : (
                        formatCurrency(calculatedCosts.lmi)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other Costs:</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.totalOneOffCostsExLmi - calculatedCosts.depositBalance - calculatedCosts.stampDuty)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-medium">Total Cash Required:</span>
                    <span className="font-semibold">{formatCurrency(calculatedCosts.totalCashRequired)}</span>
                  </div>
                </div>

                {/* Editable Cost Fields - Row 1 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Engagement Fee</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.engagementFee}
                      onChange={(e) => handleOneOffCostChange('engagementFee', Number(e.target.value))}
                      step={500}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Conditional Deposit</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.conditionalHoldingDeposit}
                      onChange={(e) => handleOneOffCostChange('conditionalHoldingDeposit', Number(e.target.value))}
                      step={500}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                </div>

                {/* Editable Cost Fields - Row 2 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Building Insurance Upfront</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.buildingInsuranceUpfront}
                      onChange={(e) => handleOneOffCostChange('buildingInsuranceUpfront', Number(e.target.value))}
                      step={100}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Building & Pest Inspection</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.buildingPestInspection}
                      onChange={(e) => handleOneOffCostChange('buildingPestInspection', Number(e.target.value))}
                      step={50}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                </div>

                {/* Editable Cost Fields - Row 3 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Plumbing/Electrical Inspections</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.plumbingElectricalInspections}
                      onChange={(e) => handleOneOffCostChange('plumbingElectricalInspections', Number(e.target.value))}
                      step={50}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Independent Valuation</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.independentValuation}
                      onChange={(e) => handleOneOffCostChange('independentValuation', Number(e.target.value))}
                      step={100}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                </div>

                {/* Editable Cost Fields - Row 4 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Unconditional Deposit</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.unconditionalHoldingDeposit}
                      onChange={(e) => handleOneOffCostChange('unconditionalHoldingDeposit', Number(e.target.value))}
                      step={500}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Mortgage Fees</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.mortgageFees}
                      onChange={(e) => handleOneOffCostChange('mortgageFees', Number(e.target.value))}
                      step={100}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                </div>

                {/* Editable Cost Fields - Row 5 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Conveyancing</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.conveyancing}
                      onChange={(e) => handleOneOffCostChange('conveyancing', Number(e.target.value))}
                      step={100}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Rates Adjustment</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.ratesAdjustment}
                      onChange={(e) => handleOneOffCostChange('ratesAdjustment', Number(e.target.value))}
                      step={100}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                </div>

                {/* Editable Cost Fields - Row 6 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Maintenance Allowance</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.maintenanceAllowancePostSettlement}
                      onChange={(e) => handleOneOffCostChange('maintenanceAllowancePostSettlement', Number(e.target.value))}
                      step={500}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Stamp Duty Override</Label>
                    <Input
                      type="number"
                      value={adjustedOneOffCosts.stampDutyOverride ?? ''}
                      onChange={(e) => handleOneOffCostChange('stampDutyOverride', e.target.value ? Number(e.target.value) : null)}
                      placeholder="Auto-calculated"
                      step={1000}
                      min={0}
                      className="text-right text-sm h-8"
                    />
                  </div>
                </div>

                {/* LMI Capitalization Toggle */}
                {calculatedCosts.lmi > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div>
                      <Label className="text-sm text-amber-800">Capitalize LMI into Loan</Label>
                      <p className="text-xs text-amber-600 mt-0.5">
                        Add {formatCurrency(calculatedCosts.lmi)} to loan instead of paying upfront
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={capitalizeLmi}
                      onChange={(e) => setCapitalizeLmi(e.target.checked)}
                      className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Live Feedback Section */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
          <h3 className="font-medium text-sm text-slate-700 mb-3">Live Preview</h3>
          
          {/* Cash Required vs Available Summary */}
          <div className="bg-white p-3 rounded border border-slate-200 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Available Funds:</span>
              <span className="font-medium">{formatCurrency(property.availableFundsUsed)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-600">Total Cash Required:</span>
              <span className="font-medium">{formatCurrency(calculatedCosts.totalCashRequired)}</span>
            </div>
            <div className={`flex justify-between text-sm mt-1 pt-1 border-t border-slate-100 ${liveValidation.deposit.pass ? 'text-green-600' : 'text-red-600'}`}>
              <span className="font-medium">{liveValidation.deposit.pass ? 'Surplus:' : 'Shortfall:'}</span>
              <span className="font-semibold">{formatCurrency(Math.abs(liveValidation.deposit.surplus))}</span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Deposit Test */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">Deposit Test</span>
              <div className="flex items-center gap-2">
                {liveValidation.deposit.pass ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 text-sm">Passes</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 text-sm">
                      Short by {formatCompactCurrency(Math.abs(liveValidation.deposit.surplus))}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Borrowing Test */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">Borrowing Capacity Test</span>
              <div className="flex items-center gap-2">
                {liveValidation.borrowing.pass ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 text-sm">
                      Passes {liveValidation.borrowing.surplus > 0 && `(${formatCompactCurrency(liveValidation.borrowing.surplus)} remaining)`}
                    </span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 text-sm">
                      Exceeds by {formatCompactCurrency(Math.abs(liveValidation.borrowing.surplus))}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Serviceability Test */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">Serviceability Test</span>
              <div className="flex items-center gap-2">
                {liveValidation.serviceability.pass ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 text-sm">Passes</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 text-sm">
                      Short by {formatCompactCurrency(Math.abs(liveValidation.serviceability.surplus))}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Success message */}
          {allViolationsResolved && hasChanges && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-center">
              <span className="text-green-700 text-sm font-medium">
                All constraints now pass! Click "Apply Changes" to save.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onViewDetails}>
            View Property Details
          </Button>
          <Button
            onClick={handleApplyChanges}
            disabled={!allViolationsResolved || !hasChanges}
            className={allViolationsResolved && hasChanges ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

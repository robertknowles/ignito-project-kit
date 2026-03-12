import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertTriangle, Check, X, ArrowRight, ChevronDown, ChevronRight, Edit3, Plus, Lightbulb } from 'lucide-react';
import { EventTypeIcon } from '@/utils/eventIcons';
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
import { usePropertySelection } from '@/contexts/PropertySelectionContext';
import { useInvestmentProfile } from '@/contexts/InvestmentProfileContext';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { calculateSuggestedFixes, calculateEventBasedFixes, type SuggestedFix, type SuggestedEventFix, type ExtendedPropertyValues } from '@/utils/suggestedFixes';
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
  const { addEvent } = usePropertySelection();
  const { profile } = useInvestmentProfile();
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
      
      // Restore LMI capitalization state from instance
      setCapitalizeLmi(propertyInstance.lmiCapitalized ?? false);
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
        totalCashRequired: p.totalCashRequired, // CRITICAL: Include for accurate funding calculations
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

    // Run affordability calculation - SINGLE SOURCE OF TRUTH for all test results
    const result = calculateAffordabilityForProperty(
      property.period,
      modifiedProperty,
      purchaseHistory
    );

    // Update live validation state using ONLY the calculator results
    // This ensures consistency between the modal preview and actual engine calculations
    setLiveValidation({
      deposit: {
        pass: result.depositTestPass,
        surplus: result.depositTestSurplus,
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

  // Create live violations based on current validation state (not just initial violations)
  // This ensures suggested fixes are recalculated when tests pass/fail after adjustments
  const liveViolations = useMemo((): GuardrailViolation[] => {
    const currentViolations: GuardrailViolation[] = [];
    
    if (!liveValidation.deposit.pass) {
      currentViolations.push({
        type: 'deposit',
        severity: 'error',
        message: `Deposit shortfall of ${Math.abs(liveValidation.deposit.surplus).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })}`,
        shortfall: Math.abs(liveValidation.deposit.surplus),
      });
    }
    
    if (!liveValidation.borrowing.pass) {
      currentViolations.push({
        type: 'borrowing',
        severity: 'error',
        message: `Borrowing capacity exceeded by ${Math.abs(liveValidation.borrowing.surplus).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })}`,
        shortfall: Math.abs(liveValidation.borrowing.surplus),
      });
    }
    
    if (!liveValidation.serviceability.pass) {
      currentViolations.push({
        type: 'serviceability',
        severity: 'error',
        message: `Serviceability shortfall of ${Math.abs(liveValidation.serviceability.surplus).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })}`,
        shortfall: Math.abs(liveValidation.serviceability.surplus),
      });
    }
    
    return currentViolations;
  }, [liveValidation]);

  // Get relevant fields based on current live violations (not just initial)
  const relevantFields = useMemo(() => getRelevantFieldsForViolations(liveViolations), [liveViolations]);

  // Calculate suggested fixes with extended values based on CURRENT violations
  const suggestedFixes = useMemo(() => {
    // If no violations, no fixes needed
    if (liveViolations.length === 0) return [];
    
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
      liveViolations, // Use LIVE violations, not initial
      {
        purchasePrice: adjustedValues.purchasePrice,
        lvr: adjustedValues.lvr,
        rentPerWeek: adjustedValues.rentPerWeek,
      },
      property.availableFundsUsed, // Use available funds at purchase time
      extendedValues
    );
  }, [property, liveViolations, adjustedValues, calculatedCosts, propertyInstance]);

  // Track which events have been added during this session
  const [addedEventTypes, setAddedEventTypes] = useState<Set<string>>(new Set());

  // Reset added events when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAddedEventTypes(new Set());
    }
  }, [isOpen]);

  // Calculate event-based suggestions based on CURRENT violations
  const suggestedEventFixes = useMemo(() => {
    // If no violations, no event fixes needed
    if (liveViolations.length === 0) return [];
    
    // Get client salary info (default to 0 for partner if not tracked)
    const currentSalary = profile.baseSalary || 60000;
    const partnerSalary = 0; // We don't track partner salary as base assumption, user can add via event
    
    return calculateEventBasedFixes(
      liveViolations,
      currentSalary,
      partnerSalary,
      property.period
    );
  }, [liveViolations, profile.baseSalary, property.period]);

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

  // Handle adding an event from suggestions
  const handleAddEventFix = useCallback((eventFix: SuggestedEventFix) => {
    // Add the event to the timeline at the period before the property purchase
    // This ensures the event takes effect before the property is purchased
    const eventPeriod = Math.max(1, property.period - 1);
    
    addEvent({
      type: 'event',
      eventType: eventFix.eventType,
      category: eventFix.category,
      period: eventPeriod,
      order: 0, // Will be sorted by period anyway
      payload: eventFix.payload,
    });
    
    // Mark this event type as added
    setAddedEventTypes(prev => new Set([...prev, eventFix.eventType]));
  }, [property.period, addEvent]);

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
      // LMI capitalization flag
      lmiCapitalized: capitalizeLmi,
    };

    onApplyChanges(updates);
  }, [adjustedValues, adjustedOneOffCosts, capitalizeLmi, onApplyChanges]);

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
          <p className="text-sm text-gray-500 mt-1">
            {property.title} - {property.displayPeriod}
          </p>
        </DialogHeader>

        {/* Success Banner - shown when all tests pass */}
        {allViolationsResolved && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center">
                <Check className="text-green-600" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">All Tests Passed</h4>
                <p className="text-sm text-gray-500">This property can now be placed in this year.</p>
              </div>
            </div>
          </div>
        )}

        {/* Violation Summary Section - shows LIVE violations, hidden when all pass */}
        {liveViolations.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-3">
              Constraint Failures ({liveViolations.length} remaining)
            </p>
            <div className="space-y-2">
              {liveViolations.map((v) => (
                <div
                  key={v.type}
                  className="flex items-center justify-between py-2.5 px-3 bg-gray-50 border border-gray-100 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
                      <X className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="font-medium text-sm text-gray-900">{getConstraintLabel(v.type)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 text-sm font-semibold">
                      {formatCompactCurrency(v.shortfall)}
                    </span>
                    <p className="text-[10px] text-gray-500">{v.type === 'deposit' ? 'deposit shortfall' : v.type === 'borrowing' ? 'over capacity' : 'annual shortfall'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Fixes Section */}
        {suggestedFixes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-gray-400" />
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                Quick Fixes
              </p>
            </div>
            <div className="space-y-2">
              {suggestedFixes.map((fix, idx) => (
                <div
                  key={`${fix.field}-${idx}`}
                  className="flex items-center justify-between py-3 px-3 bg-gray-50 border border-gray-100 rounded-xl"
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{fix.explanation}</p>
                    {fix.actionType !== 'editCosts' && fix.actionType !== 'capitalizeLmi' && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span className="font-medium">{formatCompactCurrency(fix.currentValue)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-gray-700">{formatCompactCurrency(fix.suggestedValue)}</span>
                      </p>
                    )}
                    {fix.actionType === 'capitalizeLmi' && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span>Upfront LMI:</span>
                        <span className="font-medium">{formatCompactCurrency(fix.currentValue)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-gray-700">$0</span>
                        <span className="text-gray-400">(added to loan)</span>
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplySuggestedFix(fix)}
                    className="ml-3 text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  >
                    {fix.actionType === 'editCosts' ? (
                      <span className="flex items-center gap-1">
                        <Edit3 className="h-3 w-3" />
                        Edit Costs
                      </span>
                    ) : fix.actionType === 'capitalizeLmi' ? (
                      capitalizeLmi ? (
                        <span className="flex items-center gap-1 text-green-600">
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
          </div>
        )}

        {/* Event-Based Solutions Section */}
        {suggestedEventFixes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Alternative Solutions
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Consider these life events instead of adjusting the property:
            </p>
            <div className="space-y-2">
              {suggestedEventFixes.map((eventFix, idx) => {
                const isAdded = addedEventTypes.has(eventFix.eventType);
                return (
                  <div
                    key={`${eventFix.eventType}-${idx}`}
                    className="flex items-center justify-between py-3 px-3 bg-gray-50 border border-gray-100 rounded-xl"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                        <EventTypeIcon eventType={eventFix.eventType} size={20} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{eventFix.explanation}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Addresses <span className="capitalize font-medium text-gray-600">{eventFix.violationType}</span> test
                          {' · '}
                          <span className="font-medium text-gray-600">{eventFix.formattedAmount}</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddEventFix(eventFix)}
                      disabled={isAdded}
                      className={`ml-3 flex-shrink-0 ${
                        isAdded 
                          ? 'text-green-600 border-green-200 bg-green-50' 
                          : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {isAdded ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Added
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          Add Event
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            {addedEventTypes.size > 0 && (
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                Events are added to the period before this property purchase. Close this modal to see the updated timeline.
              </p>
            )}
          </div>
        )}

        {/* Adjustment Fields Section */}
        <div className="space-y-4 bg-white border border-gray-200 p-4 rounded-xl">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            Adjust Property to Fix
          </p>

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
              <p className="text-xs text-gray-500">
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
              <p className="text-xs text-gray-500">
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
              <p className="text-xs text-gray-500">
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
              <p className="text-xs text-gray-500">
                Lower interest rate improves serviceability
              </p>
            </div>
          )}

          {/* One-Off Purchase Costs Section */}
          <div ref={costsRef} className="pt-2 border-t border-gray-100">
            <Collapsible open={isOneOffCostsExpanded} onOpenChange={setIsOneOffCostsExpanded}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-gray-50 rounded transition-colors">
                <div className="flex items-center gap-2">
                  {isOneOffCostsExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <Label className="text-sm cursor-pointer">One-Off Purchase Costs</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCurrency(calculatedCosts.totalCashRequired)}</span>
                  {!isOneOffCostsExpanded && (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#4A7BF7' }}>
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </span>
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-4 space-y-4">
                {/* Cost Breakdown Summary */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deposit Balance:</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.depositBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stamp Duty:</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.stampDuty)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">LMI:</span>
                    <span className="font-medium">
                      {capitalizeLmi ? (
                        <span className="text-green-600">$0 (capitalized)</span>
                      ) : (
                        formatCurrency(calculatedCosts.lmi)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Costs:</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.totalOneOffCostsExLmi - calculatedCosts.depositBalance - calculatedCosts.stampDuty)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-200">
                    <span className="text-gray-700 font-medium">Total Cash Required:</span>
                    <span className="font-semibold">{formatCurrency(calculatedCosts.totalCashRequired)}</span>
                  </div>
                </div>

                {/* Editable Cost Fields - Row 1 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Engagement Fee</Label>
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
                    <Label className="text-xs text-gray-600">Conditional Deposit</Label>
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
                    <Label className="text-xs text-gray-600">Building Insurance Upfront</Label>
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
                    <Label className="text-xs text-gray-600">Building & Pest Inspection</Label>
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
                    <Label className="text-xs text-gray-600">Plumbing/Electrical Inspections</Label>
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
                    <Label className="text-xs text-gray-600">Independent Valuation</Label>
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
                    <Label className="text-xs text-gray-600">Unconditional Deposit</Label>
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
                    <Label className="text-xs text-gray-600">Mortgage Fees</Label>
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
                    <Label className="text-xs text-gray-600">Conveyancing</Label>
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
                    <Label className="text-xs text-gray-600">Rates Adjustment</Label>
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
                    <Label className="text-xs text-gray-600">Maintenance Allowance</Label>
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
                    <Label className="text-xs text-gray-600">Stamp Duty Override</Label>
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
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <div>
                      <Label className="text-sm text-gray-700">Capitalize LMI into Loan</Label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Add {formatCurrency(calculatedCosts.lmi)} to loan instead of paying upfront
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={capitalizeLmi}
                      onChange={(e) => setCapitalizeLmi(e.target.checked)}
                      className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Live Feedback Section */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-3">
            Live Preview
          </p>
          
          {/* Cash Required vs Available Summary */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Available Funds:</span>
              <span className="font-medium text-gray-700">{formatCurrency(property.availableFundsUsed)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Total Cash Required:</span>
              <span className="font-medium text-gray-700">{formatCurrency(calculatedCosts.totalCashRequired)}</span>
            </div>
            <div className={`flex justify-between text-sm mt-1 pt-1 border-t border-gray-200 ${liveValidation.deposit.pass ? 'text-green-600' : 'text-red-600'}`}>
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
            <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
              <span className="text-gray-700 text-sm font-medium">
                All constraints now pass. Click "Apply Changes" to save.
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

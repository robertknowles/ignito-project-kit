import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, Check, X, ArrowRight } from 'lucide-react';
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
import type { TimelineProperty } from '@/types/property';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';
import type { GuardrailViolation, GuardrailViolationType, ValidationResult } from '@/utils/guardrailValidator';
import { validatePropertyPlacement } from '@/utils/guardrailValidator';
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { calculateSuggestedFixes, type SuggestedFix } from '@/utils/suggestedFixes';

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

  // Get the current property instance
  const propertyInstance = getInstance(property.instanceId);

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
    }
  }, [property, propertyInstance]);

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

  // Real-time validation as fields change
  useEffect(() => {
    // Calculate new deposit and loan amounts based on adjusted values
    const newDepositRequired = adjustedValues.purchasePrice * (1 - adjustedValues.lvr / 100);
    const newLoanAmount = adjustedValues.purchasePrice * (adjustedValues.lvr / 100);

    // Create a modified property object for validation
    const modifiedProperty = {
      ...property,
      cost: adjustedValues.purchasePrice,
      depositRequired: newDepositRequired,
      loanAmount: newLoanAmount,
      title: property.title,
      instanceId: property.instanceId,
    };

    // Run affordability calculation
    const result = calculateAffordabilityForProperty(
      property.period,
      modifiedProperty,
      purchaseHistory
    );

    // Update live validation state
    setLiveValidation({
      deposit: {
        pass: result.depositTestPass,
        surplus: result.depositTestSurplus,
      },
      borrowing: {
        pass: result.canAfford, // Borrowing capacity is part of canAfford check
        surplus: 0, // Would need more detailed calculation
      },
      serviceability: {
        pass: result.serviceabilityTestPass,
        surplus: result.serviceabilityTestSurplus,
      },
    });
  }, [adjustedValues, property, purchaseHistory, calculateAffordabilityForProperty]);

  // Get relevant fields based on violations
  const relevantFields = useMemo(() => getRelevantFieldsForViolations(violations), [violations]);

  // Calculate suggested fixes
  const suggestedFixes = useMemo(() => {
    return calculateSuggestedFixes(
      property,
      violations,
      {
        purchasePrice: adjustedValues.purchasePrice,
        lvr: adjustedValues.lvr,
        rentPerWeek: adjustedValues.rentPerWeek,
      },
      property.availableFundsUsed // Use available funds at purchase time
    );
  }, [property, violations, adjustedValues]);

  // Check if all violations are now resolved
  const allViolationsResolved = useMemo(() => {
    return liveValidation.deposit.pass &&
      liveValidation.borrowing.pass &&
      liveValidation.serviceability.pass;
  }, [liveValidation]);

  // Handle field changes
  const handleFieldChange = useCallback((field: string, value: number) => {
    setAdjustedValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Handle apply suggested fix
  const handleApplySuggestedFix = useCallback((fix: SuggestedFix) => {
    handleFieldChange(fix.field, fix.suggestedValue);
  }, [handleFieldChange]);

  // Handle apply changes
  const handleApplyChanges = useCallback(() => {
    // Calculate derived values
    const newDepositRequired = adjustedValues.purchasePrice * (1 - adjustedValues.lvr / 100);

    const updates: Partial<PropertyInstanceDetails> = {
      purchasePrice: adjustedValues.purchasePrice,
      lvr: adjustedValues.lvr,
      rentPerWeek: adjustedValues.rentPerWeek,
      interestRate: adjustedValues.interestRate,
    };

    onApplyChanges(updates);
  }, [adjustedValues, onApplyChanges]);

  // Check if values have changed
  const hasChanges = useMemo(() => {
    const original = {
      purchasePrice: propertyInstance?.purchasePrice ?? property.cost,
      lvr: propertyInstance?.lvr ?? 80,
      rentPerWeek: propertyInstance?.rentPerWeek ?? 0,
      interestRate: propertyInstance?.interestRate ?? 6.5,
    };

    return (
      adjustedValues.purchasePrice !== original.purchasePrice ||
      adjustedValues.lvr !== original.lvr ||
      adjustedValues.rentPerWeek !== original.rentPerWeek ||
      adjustedValues.interestRate !== original.interestRate
    );
  }, [adjustedValues, propertyInstance, property]);

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
                  <p className="text-xs text-blue-500 mt-1">
                    {formatCompactCurrency(fix.currentValue)} <ArrowRight className="h-3 w-3 inline" /> {formatCompactCurrency(fix.suggestedValue)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplySuggestedFix(fix)}
                  className="ml-3 text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  Apply
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
        </div>

        {/* Live Feedback Section */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
          <h3 className="font-medium text-sm text-slate-700 mb-3">Live Preview</h3>
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
                    <span className="text-green-600 text-sm">Passes</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 text-sm">Fails</span>
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

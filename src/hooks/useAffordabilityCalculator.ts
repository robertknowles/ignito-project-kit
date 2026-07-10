import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import type { TimelineProperty } from '../types/property';
import { useClient } from '../contexts/ClientContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { useExistingPropertiesSafe } from '../contexts/ScenarioSaveContext';
import { calculateOneOffCosts, calculateDepositBalance } from '../utils/oneOffCostsCalculator';
import { calculateLMI } from '../utils/lmiCalculator';
import { calculateStampDuty } from '../utils/stampDutyCalculator';
import { getPropertyInstanceDefaults } from '../utils/propertyInstanceDefaults';
import {
  checkAffordability as engineCheckAffordability,
  calculateAnnualLoanPayment as engineCalculateAnnualLoanPayment,
} from '../engine/affordabilityEngine';
import { computeTimelineProperties, createAffordabilityBridge } from '../engine/timelineEngine';

export interface AffordabilityResult {
  period: number;
  canAfford: boolean;
  availableFunds: number;
  usableEquity: number;
  totalPortfolioValue: number;
  totalDebt: number;
}

export const useAffordabilityCalculator = () => {
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, propertyTypes, pauseBlocks, propertyOrder, eventBlocks } = usePropertySelection();
  const { globalFactors, getPropertyData, propertyAssumptions, getPropertyTypeTemplate, propertyTypeTemplates } = useDataAssumptions();
  const { activeClient } = useClient();
  const { getInstance, createInstance, instances } = usePropertyInstance();
  const existingProperties = useExistingPropertiesSafe();
  // Per-instance loan type state (keyed by instanceId). In-memory only;
  // persists across a session but not across reloads. Saved scenarios
  // restore their own loan types via PropertyInstanceDetails.loanProduct.
  const [timelineLoanTypes, setTimelineLoanTypes] = useState<Record<string, 'IO' | 'PI'>>({});

  // Reset loan-type overrides when the active client changes.
  useEffect(() => {
    setTimelineLoanTypes({});
  }, [activeClient?.id]);
  
  // Function to update loan type for a specific timeline property instance
  const updateTimelinePropertyLoanType = useCallback((instanceId: string, loanType: 'IO' | 'PI') => {
    setTimelineLoanTypes(prev => ({
      ...prev,
      [instanceId]: loanType,
    }));
  }, []);

  // Create stable selections hash to avoid expensive JSON.stringify on every render
  const selectionsHash = useMemo(() => {
    return Object.entries(selections)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, qty]) => `${id}:${qty}`)
      .join('|');
  }, [selections]);

  // Delegate to engine for loan payment calculation
  const calculateAnnualLoanPayment = engineCalculateAnnualLoanPayment;

  // Affordability helpers (growth curve, engine deps, funds, affordability) -
  // moved to src/engine/timelineEngine.ts. The bridge closes over the same
  // context values the inline helpers used to capture.
  const { calculatePropertyGrowth, engineDeps, calculateAvailableFunds, checkAffordability } =
    createAffordabilityBridge({ profile, existingProperties, eventBlocks, getInstance, getPropertyData });

  const calculateTimelineProperties = useMemo((): TimelineProperty[] => {
    // Pure placement computation - moved verbatim to src/engine/timelineEngine.ts
    return computeTimelineProperties({
      profile,
      propertyOrder,
      selections,
      propertyTypes,
      instances,
      existingProperties,
      eventBlocks,
      pauseBlocks,
      timelineLoanTypes,
      getPropertyData,
    });
  }, [
    // Only re-calculate when these specific values change
    selectionsHash,
    propertyTypes.length,
    profile.timelineYears,
    profile.borrowingCapacity,
    profile.depositPool,
    profile.annualSavings,
    profile.portfolioValue, // Trigger recalculation when existing portfolio changes
    profile.currentDebt, // Trigger recalculation when existing debt changes
    profile.useExistingEquity, // Trigger recalculation when equity toggle changes
    profile.existingPortfolioGrowthRate, // Trigger recalculation when growth rate changes
    profile.maxPurchasesPerYear, // Trigger recalculation when purchase limit changes
    calculatedValues.availableDeposit,
    profile.interestRate,
    profile.vacancyRate,
    profile.inflationRate,
    profile.equityReleaseFactor,
    profile.existingAnnualRent,
    profile.baseSalary,
    profile.wageGrowthRate,
    profile.salaryServiceabilityMultiplier,
    existingProperties,
    getPropertyData,
    propertyAssumptions,
    propertyTypeTemplates,
    pauseBlocks,
    eventBlocks, // Trigger recalculation when events change (Custom Events System)
    timelineLoanTypes,
    getInstance, // Keep getInstance as it depends on instances state
    instances, // Trigger recalculation when property instances change (e.g., purchasePrice updates)
    propertyOrder, // Trigger recalculation when property order changes
  ]);

  // Function to calculate affordability for any period and property
  const calculateAffordabilityForPeriod = useCallback((
    period: number,
    property: any,
    previousPurchases: Array<{ period: number; cost: number; depositRequired: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI'; cumulativeEquityReleased?: number }>
  ) => {
    const availableFunds = calculateAvailableFunds(period, previousPurchases);
    const affordabilityResult = checkAffordability(property, availableFunds.total, previousPurchases, period);
    
    // Calculate all purchase costs using property instance (includes all 39 fields)
    const baseLoanAmount = property.cost - property.depositRequired;
    const affordabilityPropertyInstance = getInstance(property.instanceId);
    const affordabilityPropertyInstanceForCosts = affordabilityPropertyInstance ?? getPropertyInstanceDefaults(property.title || 'Default');
    
    // Use LVR from instance
    const affordabilityInstanceLvr = affordabilityPropertyInstance?.lvr ?? ((baseLoanAmount / property.cost) * 100);
    
    // Check if LMI is being capitalized into the loan
    const isAffordabilityLmiCapitalized = affordabilityPropertyInstance?.lmiCapitalized ?? false;
    
    // Calculate stamp duty (with override support)
    const affordabilityStampDuty = affordabilityPropertyInstanceForCosts.stampDutyOverride ?? calculateStampDuty(
      affordabilityPropertyInstanceForCosts.state,
      property.cost,
      false
    );
    
    // Calculate LMI (using valuationAtPurchase for effective LVR calculation)
    // LMI is calculated on base loan amount, before any capitalization adjustment
    const affordabilityLmi = calculateLMI(
      baseLoanAmount,
      affordabilityInstanceLvr,
      affordabilityPropertyInstanceForCosts.lmiWaiver ?? false,
      affordabilityPropertyInstanceForCosts.valuationAtPurchase,
      property.cost
    );
    
    // Final loan amount: prefer passed value if available (for live preview in modals)
    // This allows the modal to pass pre-calculated loan amount including LMI capitalization
    const calculatedLoanAmount = isAffordabilityLmiCapitalized ? baseLoanAmount + affordabilityLmi : baseLoanAmount;
    const newLoanAmount = property.loanAmount !== undefined ? property.loanAmount : calculatedLoanAmount;
    
    // Calculate deposit balance
    const affordabilityDepositBalance = calculateDepositBalance(
      property.cost,
      affordabilityInstanceLvr,
      affordabilityPropertyInstanceForCosts.conditionalHoldingDeposit
    );
    
    // Calculate all one-off costs using property instance
    const affordabilityOneOffCosts = calculateOneOffCosts(
      affordabilityPropertyInstanceForCosts,
      affordabilityStampDuty,
      affordabilityDepositBalance
    );
    
    // Add LMI to total cash required ONLY if not capitalized into the loan
    const lmiCashRequired = isAffordabilityLmiCapitalized ? 0 : affordabilityLmi;
    const calculatedTotalCashRequired = affordabilityOneOffCosts.totalCashRequired + lmiCashRequired;
    
    // Use passed totalCashRequired if available (for live preview in modals)
    // This allows the modal to pass pre-calculated values including adjusted costs and LMI capitalization
    const totalCashRequired = property.totalCashRequired !== undefined ? property.totalCashRequired : calculatedTotalCashRequired;
    
    // Run all three tests via the engine (single source of truth)
    const engineResult = engineCheckAffordability(
      { cost: property.cost, depositRequired: property.depositRequired, loanAmount: newLoanAmount, instanceId: property.instanceId, title: property.title, loanType: property.loanType },
      availableFunds, previousPurchases, period, totalCashRequired,
      profile, existingProperties, eventBlocks, engineDeps,
    );

    return {
      canAfford: engineResult.canAfford,
      depositTestSurplus: engineResult.depositTestSurplus,
      depositTestPass: engineResult.depositTestPass,
      serviceabilityTestSurplus: engineResult.serviceabilityTestSurplus,
      serviceabilityTestPass: engineResult.serviceabilityTestPass,
      borrowingCapacityPass: engineResult.borrowingCapacityTestPass,
      borrowingCapacityRemaining: engineResult.borrowingCapacityRemaining,
      availableFunds: availableFunds.total
    };
  }, [profile, globalFactors, calculatedValues, getPropertyData, propertyAssumptions, propertyTypeTemplates]);

  // AUTO-CREATE MISSING PROPERTY INSTANCES
  // This useEffect runs after render to create any property instances that don't exist yet
  // This prevents the "setState during render" error
  useEffect(() => {
    const timeline = calculateTimelineProperties;
    if (!timeline || timeline.length === 0) return;
    
    const instancesToCreate: Array<{ instanceId: string; propertyType: string; period: number }> = [];
    
    // Check all timeline properties for missing instances
    timeline.forEach(timelineProp => {
      if (timelineProp.instanceId) {
        const instance = getInstance(timelineProp.instanceId);
        if (!instance) {
          instancesToCreate.push({
            instanceId: timelineProp.instanceId,
            propertyType: timelineProp.title,
            period: timelineProp.period !== Infinity ? timelineProp.period : 1
          });
        }
      }
    });
    
    // Create all missing instances in a batch
    if (instancesToCreate.length > 0) {
instancesToCreate.forEach(({ instanceId, propertyType, period }) => {
createInstance(instanceId, propertyType, period);
      });
    }
    // Note: createInstance is stable (useCallback), so we don't need it in deps
    // getInstance depends on instances state, which is already tracked via calculateTimelineProperties
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateTimelineProperties]);

  // Trigger recalculation when property instances change
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    // Debounce recalculation to avoid excessive updates
    setIsRecalculating(true);
    const timer = setTimeout(() => {
      setIsRecalculating(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [instances]);

  // PREVIEW PLACEMENT: Evaluate what would happen if a property were placed at a specific period
  // This uses the SAME logic as the auto-placer to ensure consistent validation
  const previewPlacementAtPeriod = useCallback((
    instanceId: string,
    targetPeriod: number
  ): { isValid: boolean; depositTestPass: boolean; serviceabilityTestPass: boolean; borrowingCapacityPass: boolean } => {
    // Find the property in timelineProperties
    const property = calculateTimelineProperties.find(p => p.instanceId === instanceId);
    if (!property) {
      return { isValid: false, depositTestPass: false, serviceabilityTestPass: false, borrowingCapacityPass: false };
    }
    
    // Get the property's position in the FIFO order
    const draggedPropertyOrderIndex = propertyOrder.indexOf(instanceId);
    
    // Build purchase history for all properties that would come BEFORE this one
    // This includes:
    // 1. Properties at periods before the target period
    // 2. Properties at the same period but earlier in FIFO order
    const purchaseHistoryForValidation: Array<{
      period: number;
      cost: number;
      depositRequired: number;
      totalCashRequired?: number;
      loanAmount: number;
      title: string;
      instanceId: string;
      loanType?: 'IO' | 'PI';
      cumulativeEquityReleased?: number;
    }> = [];
    
    // Process properties in FIFO order to build correct purchase history
    propertyOrder.forEach((orderId, orderIndex) => {
      if (orderId === instanceId) return; // Skip the property being validated
      
      const tp = calculateTimelineProperties.find(p => p.instanceId === orderId);
      if (!tp || tp.period === Infinity) return;
      
      // Include this property if:
      // 1. Its period is before the target period, OR
      // 2. Its period equals target period AND it comes before the dragged property in FIFO order
      let shouldInclude = false;
      if (tp.period < targetPeriod) {
        shouldInclude = true;
      } else if (tp.period === targetPeriod && orderIndex < draggedPropertyOrderIndex) {
        shouldInclude = true;
      }
      
      if (shouldInclude) {
        purchaseHistoryForValidation.push({
          period: tp.period,
          cost: tp.cost,
          depositRequired: tp.depositRequired,
          totalCashRequired: tp.totalCashRequired,
          loanAmount: tp.loanAmount,
          // Resolvable cell id, not the category-label title (see note above).
          title: tp.instanceId.replace(/_instance_\d+$/, ''),
          instanceId: tp.instanceId,
          loanType: tp.loanType,
          cumulativeEquityReleased: 0, // Will be recalculated by calculateAvailableFunds
        });
      }
    });
    
    // Sort by period then by FIFO order for consistent processing
    purchaseHistoryForValidation.sort((a, b) => {
      if (a.period !== b.period) return a.period - b.period;
      return propertyOrder.indexOf(a.instanceId) - propertyOrder.indexOf(b.instanceId);
    });
    
    // Run all three tests via the engine (single source of truth)
    // This fixes the previous entity discount bug where drag-drop used raw debt
    const availableFunds = calculateAvailableFunds(targetPeriod, purchaseHistoryForValidation);
    const engineResult = engineCheckAffordability(
      { cost: property.cost, depositRequired: property.depositRequired, loanAmount: property.loanAmount, instanceId: property.instanceId, title: property.title, loanType: property.loanType },
      availableFunds, purchaseHistoryForValidation, targetPeriod, property.totalCashRequired,
      profile, existingProperties, eventBlocks, engineDeps,
    );

    return {
      isValid: engineResult.canAfford,
      depositTestPass: engineResult.depositTestPass,
      serviceabilityTestPass: engineResult.serviceabilityTestPass,
      borrowingCapacityPass: engineResult.borrowingCapacityTestPass,
    };
  }, [calculateTimelineProperties, propertyOrder, calculateAvailableFunds, checkAffordability, getPropertyData, getInstance, profile.interestRate, profile.borrowingCapacity, profile.equityFactor, calculatePropertyGrowth]);

  // Only expose the memoized result
  return {
    timelineProperties: calculateTimelineProperties,
    isCalculating: false, // Could add state tracking if needed
    calculateAffordabilityForProperty: calculateAffordabilityForPeriod,
    previewPlacementAtPeriod,
    updateTimelinePropertyLoanType,
    isRecalculating,
  };
};
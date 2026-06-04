/**
 * Event Processing Utilities
 * 
 * Shared helper functions for processing event blocks across different calculators.
 * These functions are used by useChartDataGenerator, useAffordabilityCalculator,
 * and useRoadmapData to apply event effects to calculations.
 */

import type { EventBlock } from '../contexts/PropertySelectionContext';
import { DEFAULT_INTEREST_RATE } from '../constants/financialParams';

// =============================================================================
// INTEREST RATE EVENT PROCESSING
// =============================================================================

/**
 * Get the cumulative interest rate adjustment from market events up to a period.
 * Interest rate changes are persistent - once a rate change event occurs,
 * it affects all future periods.
 * 
 * @param period - The period number (1, 2, 3...)
 * @param events - Array of event blocks to process
 * @returns Cumulative rate adjustment as a decimal (e.g., 0.005 for +0.5%)
 */
export const getInterestRateAdjustment = (period: number, events: EventBlock[]): number => {
  let adjustment = 0;
  
  const rateEvents = events
    .filter(e => e.eventType === 'interest_rate_change' && e.period <= period)
    .sort((a, b) => a.period - b.period);
  
  for (const event of rateEvents) {
    if (event.payload.rateChange !== undefined) {
      adjustment += event.payload.rateChange / 100; // Convert percentage points to decimal
    }
  }
  
  return adjustment;
};

/**
 * Get the effective interest rate at a specific period, incorporating all
 * interest rate change events that have occurred up to that period.
 * 
 * @param period - The period number
 * @param events - Array of event blocks
 * @param baseRate - Base interest rate (defaults to DEFAULT_INTEREST_RATE)
 * @returns Effective interest rate as a decimal
 */
export const getEffectiveInterestRate = (
  period: number, 
  events: EventBlock[], 
  baseRate: number = DEFAULT_INTEREST_RATE
): number => {
  const adjustment = getInterestRateAdjustment(period, events);
  return Math.max(0.001, baseRate + adjustment); // Minimum 0.1% rate
};

// =============================================================================
// REFINANCE EVENT PROCESSING
// =============================================================================

/**
 * Get the effective interest rate for a specific property after refinance events.
 * Refinance events can target a specific property or all properties.
 * 
 * @param period - The period number
 * @param events - Array of event blocks
 * @param propertyInstanceId - The instance ID of the property (optional)
 * @returns The new interest rate as a decimal, or null if no refinance applies
 */
export const getRefinanceRateForProperty = (
  period: number,
  events: EventBlock[],
  propertyInstanceId?: string
): number | null => {
  // Find refinance events up to this period
  const refinanceEvents = events
    .filter(e => e.eventType === 'refinance' && e.period <= period)
    .sort((a, b) => a.period - b.period);
  
  let effectiveRate: number | null = null;
  
  for (const event of refinanceEvents) {
    // Check if this refinance applies to this property
    // If no propertyInstanceId is specified in the event, it applies to all properties
    // If propertyInstanceId is specified, it only applies to that property
    const appliesToProperty = 
      !event.payload.propertyInstanceId || 
      event.payload.propertyInstanceId === propertyInstanceId;
    
    if (appliesToProperty && event.payload.newInterestRate !== undefined) {
      effectiveRate = event.payload.newInterestRate / 100; // Convert percentage to decimal
    }
  }
  
  return effectiveRate;
};

/**
 * Get the final effective interest rate for a property, considering both
 * market-wide interest rate changes and property-specific refinance events.
 * Refinance rate takes precedence over market rate.
 * 
 * @param period - The period number
 * @param events - Array of event blocks
 * @param propertyInstanceId - The instance ID of the property
 * @param baseRate - Base interest rate
 * @returns Effective interest rate as a decimal
 */
export const getPropertyEffectiveRate = (
  period: number,
  events: EventBlock[],
  propertyInstanceId: string,
  baseRate: number = DEFAULT_INTEREST_RATE
): number => {
  // First check for property-specific refinance
  const refinanceRate = getRefinanceRateForProperty(period, events, propertyInstanceId);
  
  if (refinanceRate !== null) {
    return refinanceRate;
  }
  
  // Fall back to market rate (base + adjustments)
  return getEffectiveInterestRate(period, events, baseRate);
};

// =============================================================================
// MARKET CORRECTION EVENT PROCESSING
// =============================================================================

/**
 * Get the growth rate adjustment from market correction events at a specific period.
 * Market corrections are temporary - they only affect periods within their duration window.
 * 
 * @param period - The period number (1, 2, 3...)
 * @param events - Array of event blocks to process
 * @returns Growth adjustment as a decimal (e.g., -0.03 for -3%)
 */
export const getGrowthRateAdjustment = (period: number, events: EventBlock[]): number => {
  let adjustment = 0;
  
  const correctionEvents = events
    .filter(e => e.eventType === 'market_correction')
    .sort((a, b) => a.period - b.period);
  
  for (const event of correctionEvents) {
    const startPeriod = event.period;
    const endPeriod = startPeriod + (event.payload.durationPeriods || 0);
    
    // Check if current period is within the correction window
    if (period >= startPeriod && period < endPeriod) {
      if (event.payload.growthAdjustment !== undefined) {
        adjustment += event.payload.growthAdjustment / 100; // Convert percentage points to decimal
      }
    }
  }
  
  return adjustment;
};

/**
 * Check if a market correction is active at a specific period.
 * 
 * @param period - The period number
 * @param events - Array of event blocks
 * @returns True if a market correction is affecting this period
 */
export const isMarketCorrectionActive = (period: number, events: EventBlock[]): boolean => {
  return events.some(e => {
    if (e.eventType !== 'market_correction') return false;
    const startPeriod = e.period;
    const endPeriod = startPeriod + (e.payload.durationPeriods || 0);
    return period >= startPeriod && period < endPeriod;
  });
};

// =============================================================================
// RENOVATION EVENT PROCESSING
// =============================================================================

/**
 * Get the cumulative value increase from renovation events for a specific property.
 * Multiple renovations can be applied to the same property over time.
 * 
 * @param propertyInstanceId - The instance ID of the property
 * @param upToPeriod - Include renovations up to this period
 * @param events - Array of event blocks
 * @returns Cumulative value increase in dollars
 */
export const getRenovationValueIncrease = (
  propertyInstanceId: string,
  upToPeriod: number,
  events: EventBlock[]
): number => {
  return events
    .filter(e => 
      e.eventType === 'renovate' && 
      e.payload.propertyInstanceId === propertyInstanceId &&
      e.period <= upToPeriod
    )
    .reduce((sum, e) => sum + (e.payload.valueIncrease || 0), 0);
};

/**
 * Get all renovation events for a specific property up to a period.
 * Useful for detailed breakdown displays.
 * 
 * @param propertyInstanceId - The instance ID of the property
 * @param upToPeriod - Include renovations up to this period
 * @param events - Array of event blocks
 * @returns Array of renovation events
 */
export const getRenovationEventsForProperty = (
  propertyInstanceId: string,
  upToPeriod: number,
  events: EventBlock[]
): EventBlock[] => {
  return events
    .filter(e => 
      e.eventType === 'renovate' && 
      e.payload.propertyInstanceId === propertyInstanceId &&
      e.period <= upToPeriod
    )
    .sort((a, b) => a.period - b.period);
};

// =============================================================================
// GROWTH CURVE ADJUSTMENT
// =============================================================================

/**
 * Apply growth rate adjustment to a growth curve.
 * Used to temporarily reduce growth rates during market corrections.
 * 
 * @param growthCurve - The original growth curve
 * @param adjustment - Growth adjustment as a decimal (e.g., -0.03)
 * @returns Adjusted growth curve with all tiers reduced
 */
export const applyGrowthAdjustment = (
  growthCurve: { year1: number; years2to3: number; year4: number; year5plus: number },
  adjustment: number
): { year1: number; years2to3: number; year4: number; year5plus: number } => {
  // Convert decimal adjustment to percentage points
  const adjustmentPercent = adjustment * 100;
  
  return {
    year1: Math.max(0, growthCurve.year1 + adjustmentPercent),
    years2to3: Math.max(0, growthCurve.years2to3 + adjustmentPercent),
    year4: Math.max(0, growthCurve.year4 + adjustmentPercent),
    year5plus: Math.max(0, growthCurve.year5plus + adjustmentPercent),
  };
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all events that affect a specific period.
 * Includes one-time events at that period and ongoing effects.
 * 
 * @param period - The period number
 * @param events - Array of event blocks
 * @returns Object with categorized events affecting this period
 */
export const getEventsAffectingPeriod = (period: number, events: EventBlock[]): {
  oneTimeEvents: EventBlock[];
  ongoingEffects: EventBlock[];
  activeMarketCorrections: EventBlock[];
} => {
  const oneTimeEvents: EventBlock[] = [];
  const ongoingEffects: EventBlock[] = [];
  const activeMarketCorrections: EventBlock[] = [];
  
  for (const event of events) {
    // One-time events exactly at this period
    if (event.period === period) {
      oneTimeEvents.push(event);
    }
    
    // Persistent events that occurred before this period
    if (event.period < period) {
      const isPersistent = [
        'salary_change',
        'partner_income_change',
        'dependent_change',
        'interest_rate_change',
        'refinance',
      ].includes(event.eventType);
      
      if (isPersistent) {
        ongoingEffects.push(event);
      }
    }
    
    // Market corrections with duration
    if (event.eventType === 'market_correction') {
      const startPeriod = event.period;
      const endPeriod = startPeriod + (event.payload.durationPeriods || 0);
      if (period >= startPeriod && period < endPeriod) {
        activeMarketCorrections.push(event);
      }
    }
  }
  
  return { oneTimeEvents, ongoingEffects, activeMarketCorrections };
};

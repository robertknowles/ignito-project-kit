/**
 * Centralized Financial Parameters
 * 
 * This file is the SINGLE SOURCE OF TRUTH for all financial constants used across
 * the investment calculator. Any changes to these values will automatically propagate
 * to all calculation and display components.
 * 
 * DO NOT define these constants elsewhere - always import from this file.
 */

// =============================================================================
// PERIOD & TIME CONSTANTS
// =============================================================================

/** Number of calculation periods per year (H1/H2 = semi-annual) */
export const PERIODS_PER_YEAR = 2;

/** Base year for all timeline calculations */
export const BASE_YEAR = 2025;

// =============================================================================
// SERVICEABILITY CONSTANTS
// =============================================================================

/**
 * Serviceability Factor: Percentage of borrowing capacity representing realistic annual debt service
 * 
 * Based on bank assessment methodology:
 * - ~35% of gross income available for debt service
 * - Borrowing capacity typically ~6x income
 * - Therefore: annual payment capacity = capacity / 6 * 0.35 ≈ capacity * 0.06
 */
export const SERVICEABILITY_FACTOR = 0.06;

/**
 * Rental Income Contribution Rate for Serviceability
 * 
 * Banks typically "shade" rental income by 30%, recognizing only 70% for serviceability.
 * This accounts for vacancy, expenses, and conservative assessment.
 */
export const RENTAL_SERVICEABILITY_CONTRIBUTION_RATE = 0.70;

// =============================================================================
// RENTAL RECOGNITION RATE
// =============================================================================

/**
 * Flat Rental Recognition Rate for all portfolio sizes
 *
 * Australian banks typically use a flat 80% rental income recognition
 * regardless of portfolio size. This aligns with standard bank assessment
 * practice (separate from the RENTAL_SERVICEABILITY_CONTRIBUTION_RATE shading).
 *
 * Previously used a tiered system (75%/70%/65%) which penalised larger
 * portfolios more aggressively than banks actually do.
 */
export const RENTAL_RECOGNITION_RATE = 0.80;

/**
 * Calculate rental recognition rate based on portfolio size
 * Now returns a flat 80% for all portfolio sizes, matching bank practice.
 */
export const calculateRentalRecognitionRate = (portfolioSize: number): number => {
  return RENTAL_RECOGNITION_RATE;
};

// =============================================================================
// EQUITY & LVR CONSTANTS
// =============================================================================

/**
 * Maximum LVR for equity extraction (refinancing)
 * 
 * NOTE: This is different from the PURCHASE LVR (which is set per property instance).
 * 
 * - PURCHASE LVR: Configured per property block (e.g., 80%, 85%, 90%)
 *   Determines the loan amount for a new purchase.
 *   Stored in PropertyInstance.lvr
 * 
 * - EQUITY EXTRACTION LVR CAP: The maximum LVR banks allow when refinancing
 *   to extract equity from existing properties. Even if you bought at 90% LVR,
 *   you can only refinance up to 80% LVR to pull equity out.
 * 
 * Usable equity = (Property Value × 0.80) - Current Loan
 */
export const EQUITY_EXTRACTION_LVR_CAP = 0.80;

/**
 * Default equity factor for borrowing capacity boost
 * 
 * When portfolio equity is used to boost borrowing capacity,
 * lenders typically apply a factor (e.g., 75%) to the extractable equity.
 */
export const DEFAULT_EQUITY_FACTOR = 0.75;

// =============================================================================
// INTEREST RATE DEFAULTS
// =============================================================================

/**
 * Default interest rate for calculations when not specified
 * 
 * Used for:
 * - Existing portfolio debt service
 * - Fallback when property instance doesn't have specific rate
 */
export const DEFAULT_INTEREST_RATE = 0.065; // 6.5%

/** Default interest rate as percentage (for display) */
export const DEFAULT_INTEREST_RATE_PERCENT = 6.5;

// =============================================================================
// INFLATION & GROWTH
// =============================================================================

/**
 * Annual inflation rate for expense projections
 * 
 * Expenses grow with inflation, NOT with property value.
 * Standard assumption: 3% annual inflation.
 */
export const ANNUAL_INFLATION_RATE = 0.03;

/**
 * Default property growth rate (fallback)
 * 
 * Used when property-specific growth curve is not available.
 */
export const DEFAULT_GROWTH_RATE = 0.06; // 6%

// =============================================================================
// VACANCY & EXPENSE DEFAULTS
// =============================================================================

/** Default vacancy rate */
export const DEFAULT_VACANCY_RATE = 0.04; // 4%

/** Default rental yield for existing portfolio */
export const DEFAULT_RENTAL_YIELD = 0.04; // 4%

/** Default expense ratio for simplified existing portfolio calculations */
export const DEFAULT_EXPENSE_RATIO = 0.30; // 30% of rental income

// =============================================================================
// PURCHASE VELOCITY LIMITS
// =============================================================================

/**
 * Maximum properties that can be purchased in a single 6-month period
 * 
 * Limits portfolio scaling velocity for realistic modeling.
 * Note: This is a fallback default. The actual value comes from profile.maxPurchasesPerYear.
 */
export const MAX_PURCHASES_PER_PERIOD = 3;

/**
 * Default growth rate for existing/mature portfolio properties
 * 
 * Mature properties grow at a conservative flat rate (not tiered like new purchases).
 * Note: This is a fallback default. The actual value comes from profile.existingPortfolioGrowthRate.
 */
export const DEFAULT_EXISTING_PORTFOLIO_GROWTH_RATE = 0.03; // 3% annual

// =============================================================================
// LMI THRESHOLDS
// =============================================================================

/** LVR threshold below which LMI is not required */
export const LMI_FREE_LVR_THRESHOLD = 80;

// =============================================================================
// SAVINGS & EQUITY THRESHOLDS
// =============================================================================

/** Interest rate for savings not yet deployed (high-interest savings account rate) */
export const SAVINGS_INTEREST_RATE = 0.045; // 4.5% p.a.

/** Minimum extractable equity to trigger refinance indicator */
export const MIN_EXTRACTABLE_EQUITY_THRESHOLD = 50000; // $50k

// =============================================================================
// GROWTH RATE TIERS (per property type's growthAssumption)
// =============================================================================

import type { GrowthCurve } from '../types/property';

/**
 * Maps growthAssumption tier (High/Medium/Low) to specific annual growth rates.
 * Used by property templates to determine property-specific growth curves.
 * Must stay in sync with DataAssumptionsContext's GROWTH_RATES.
 */
export const GROWTH_RATE_TIERS: Record<string, GrowthCurve> = {
  High: { year1: 12.5, years2to3: 10, year4: 7.5, year5plus: 6 },
  Medium: { year1: 8, years2to3: 6, year4: 5, year5plus: 4 },
  Low: { year1: 5, years2to3: 4, year4: 3.5, year5plus: 3 },
};

/**
 * Get a property-specific growth curve from its instance's growthAssumption tier.
 * Falls back to profile.growthCurve if no tier specified.
 */
export const getGrowthCurveForTier = (
  tier: string | undefined,
  fallback: GrowthCurve
): GrowthCurve => {
  if (tier && GROWTH_RATE_TIERS[tier]) return GROWTH_RATE_TIERS[tier];
  return fallback;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert annual rate to per-period rate using compound interest formula
 */
export const annualRateToPeriodRate = (annualRate: number): number => {
  return Math.pow(1 + annualRate, 1 / PERIODS_PER_YEAR) - 1;
};

/**
 * Convert period number to display format (e.g., "2026 H1")
 */
export const periodToDisplay = (period: number): string => {
  const year = BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
  const half = ((period - 1) % PERIODS_PER_YEAR) + 1;
  return `${year} H${half}`;
};

/**
 * Convert period to absolute year (for backwards compatibility)
 */
export const periodToYear = (period: number): number => {
  return BASE_YEAR + (period - 1) / PERIODS_PER_YEAR;
};

/**
 * Convert year to period
 */
export const yearToPeriod = (year: number): number => {
  return Math.round((year - BASE_YEAR) * PERIODS_PER_YEAR) + 1;
};

/**
 * Calculate inflation factor for a given number of periods
 */
export const calculateInflationFactor = (periodsOwned: number): number => {
  return Math.pow(1 + ANNUAL_INFLATION_RATE, periodsOwned / PERIODS_PER_YEAR);
};

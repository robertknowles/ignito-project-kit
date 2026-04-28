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

/** Base year for all timeline calculations (current calendar year) */
export const BASE_YEAR = new Date().getFullYear();

// =============================================================================
// SERVICEABILITY CONSTANTS
// =============================================================================

/**
 * Serviceability Factor: Percentage of borrowing capacity representing realistic annual debt service
 *
 * Aggressive Pacing default (per BA-research calibration 2026-04-29). Tier-linked:
 *   Conservative 0.06 / Moderate 0.08 / Aggressive 0.10
 * Calibrated to lender DSR consensus (BA-research workstream B).
 */
export const SERVICEABILITY_FACTOR = 0.10;

/**
 * Rental Income Contribution Rate for Serviceability
 *
 * Aggressive Pacing default. Tier-linked:
 *   Conservative 0.70 / Moderate 0.75 / Aggressive 0.80
 * 0.80 matches universal Australian lender practice (80% rental shading).
 */
export const RENTAL_SERVICEABILITY_CONTRIBUTION_RATE = 0.80;

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
 * Aggressive Pacing default. Tier-linked:
 *   Conservative 0.65 / Moderate 0.75 / Aggressive 0.80
 * When portfolio equity is used to boost borrowing capacity,
 * lenders typically apply a factor (0.65–0.80) to the extractable equity.
 */
export const DEFAULT_EQUITY_FACTOR = 0.80;

// =============================================================================
// INTEREST RATE DEFAULTS
// =============================================================================

/**
 * Default interest rate for calculations when not specified
 *
 * Refresh quarterly. Currently 6.25% — median variable investor P&I
 * across the Big 4 as of Q1 2026.
 *
 * Used for:
 * - Existing portfolio debt service
 * - Fallback when property instance doesn't have specific rate
 */
export const DEFAULT_INTEREST_RATE = 0.0625; // 6.25%

/** Default interest rate as percentage (for display) */
export const DEFAULT_INTEREST_RATE_PERCENT = 6.25;

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

/**
 * Default vacancy rate
 *
 * Aggressive Pacing default. Tier-linked:
 *   Conservative 0.06 / Moderate 0.04 / Aggressive 0.02 (≈1 week/yr)
 * Per-cell vacancy override for commercial cells (5–8%) handled at instance level.
 */
export const DEFAULT_VACANCY_RATE = 0.02; // 2%

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
 * Aggressive Pacing default = 2 per 6-month period (4/year ceiling).
 * Tier-linked: Conservative 1 / Moderate 2 / Aggressive 2.
 * 4/year is the realistic per-client ceiling — the prior 6/year
 * (3 per period) was institutional-velocity territory and produced
 * plausibility-breaking bursts.
 *
 * Note: This is a fallback default. The actual value comes from profile.maxPurchasesPerYear.
 */
export const MAX_PURCHASES_PER_PERIOD = 2;

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

/**
 * Proportion of annual savings deployed to investment pool each period.
 * The remainder stays liquid (living expenses, emergency buffer, etc.).
 * Also used to project how a salary delta from an income event flows
 * into the savings stream (this rate of income delta → savings delta).
 *
 * Aggressive Pacing default. Tier-linked:
 *   Conservative 0.20 / Moderate 0.40 / Aggressive 0.60
 * Calibrated against BA-research consensus: real households trap surplus
 * into living expenses, school fees, holidays. 0.60 is the realistic
 * Aggressive ceiling for ambitious investors.
 */
export const SAVINGS_DEPLOYMENT_RATE = 0.60;

/** Minimum extractable equity to trigger refinance indicator */
export const MIN_EXTRACTABLE_EQUITY_THRESHOLD = 50000; // $50k

// =============================================================================
// DEPENDENT PENALTIES
// =============================================================================

/** Borrowing capacity reduction per dependent (bank assessment policy) */
export const DEPENDENT_BC_PENALTY = 12000;

/** Annual savings reduction per dependent (estimated extra household expense) */
export const DEPENDENT_SAVINGS_PENALTY = 6000;

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
  // Medium tier flatter through the long tail per Yardney/Pressley/national-avg
  // 7% long-term consensus. Previous 8/6/5/4 tapered too fast in years 10-15
  // and was a meaningful contributor to the "outputs are too slow" symptom.
  Medium: { year1: 8, years2to3: 7, year4: 6, year5plus: 5 },
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

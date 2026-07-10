/**
 * Borrowing Capacity Ceiling - SINGLE SOURCE OF TRUTH
 *
 * This function computes the borrowing capacity ceiling for a given period.
 * It is used by BOTH the BorrowingCapacityChart (for display) and the
 * affordability calculator (for purchase gating). They must always agree.
 *
 * Two modes:
 * - Stated BC (when profile.borrowingCapacity > 0): broker-assessed figure
 *   grown with wage growth. This is what a real lender would approve.
 * - Computed fallback (when BC is 0 or empty): 6× (income + rental).
 *   Matches Gameplans convention for gross capacity.
 *
 * The equity boost from portfolio appreciation is NOT added to this ceiling.
 * Equity release is a funding mechanism (helps with deposits), not a lending
 * ceiling expansion. A bank doesn't give you a higher BC just because your
 * existing properties appreciated - they assess your income capacity.
 */

import {
  BASE_YEAR,
  PERIODS_PER_YEAR,
  ANNUAL_WAGE_GROWTH_RATE,
  RENTAL_RECOGNITION_RATE,
} from '../constants/financialParams';
import {
  getEffectiveSalary,
  getEffectivePartnerIncome,
} from './eventProcessing';
import type { EventBlock } from '../contexts/PropertySelectionContext';

export interface BorrowingCeilingParams {
  /** The broker-assessed borrowing capacity (0 = use computed fallback) */
  statedBC: number;
  /** Base salary before wage growth */
  baseSalary: number;
  /** Multiplier for income-based BC (default 6.0) */
  salaryMultiplier: number;
  /** Annual wage growth rate (e.g. 0.03 for 3%) */
  wageGrowth: number;
  /** Gross annual rental income at this period (before vacancy/recognition) */
  grossRentalIncome: number;
  /** Event blocks for salary/partner income overrides */
  eventBlocks: EventBlock[];
}

/**
 * Calculate the borrowing capacity ceiling for a specific period.
 *
 * @param period - The semi-annual period (1, 2, 3, ...)
 * @param params - All inputs needed for the calculation
 * @returns The borrowing ceiling in dollars (rounded)
 */
export function calculateBorrowingCeiling(
  period: number,
  params: BorrowingCeilingParams
): number {
  const {
    statedBC,
    baseSalary,
    salaryMultiplier,
    wageGrowth,
    grossRentalIncome,
    eventBlocks,
  } = params;

  const yearsElapsed = (period - 1) / PERIODS_PER_YEAR;

  if (statedBC > 0) {
    // Mode A: Stated BC grown with wage growth
    return Math.round(statedBC * Math.pow(1 + wageGrowth, yearsElapsed));
  }

  // Mode B: Computed from income
  const projectedSalary = baseSalary * Math.pow(1 + wageGrowth, yearsElapsed);
  const effectiveSalary = getEffectiveSalary(period, projectedSalary, eventBlocks);
  const partnerIncome = getEffectivePartnerIncome(period, eventBlocks);
  const totalIncome = effectiveSalary + partnerIncome;
  const capturedRental = grossRentalIncome * RENTAL_RECOGNITION_RATE;

  return Math.round(Math.max(0, (totalIncome + capturedRental) * salaryMultiplier));
}

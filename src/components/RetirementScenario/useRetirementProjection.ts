import { useMemo } from 'react';
import type { TimelineProperty } from '../../types/property';
import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext';
import type { PropertyInstanceDetails } from '../../types/propertyInstance';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import { calculateDetailedCashflow } from '../../utils/detailedCashflowCalculator';
import { DEFAULT_INTEREST_RATE, BASE_YEAR, PERIODS_PER_YEAR, ANNUAL_INFLATION_RATE } from '../../constants/financialParams';

export interface RetirementPropertyProjection {
  instanceId: string;
  title: string;
  propertyType: string | null;
  purchasePrice: number;
  /** Year the property is purchased (from affordableYear) */
  purchaseYear: number;
  /** Whether the property has been purchased by the retirement year */
  purchasedByRetirement: boolean;
  /** Projected property value at retirement year */
  futureValue: number;
  /** Projected remaining loan at retirement year */
  futureDebt: number;
  /** futureValue - futureDebt */
  futureEquity: number;
  /** Annual net cashflow (rent - all costs) at retirement year */
  annualCashflow: number;
  /** Annual rent at retirement year */
  annualRent: number;
  /** Annual total costs at retirement year */
  annualCosts: number;
}

export interface RetirementSummary {
  /** Properties with their projected financials */
  properties: RetirementPropertyProjection[];
  /** Set of sold instanceIds */
  soldIds: Set<string>;
  /** Cash from selling (sum of sold equity) */
  cashInHand: number;
  /** Total value of held properties */
  portfolioValue: number;
  /** Total equity across held properties */
  totalEquity: number;
  /** Remaining debt on held properties */
  debtRemaining: number;
  /** Annual cashflow from held properties */
  annualCashflow: number;
  /** Strategy zone label */
  zone: 'hold' | 'balanced' | 'exit';
  /** Strategy display name */
  zoneName: string;
  /** Chip label */
  chipLabel: string;
}

/**
 * Projects all feasible properties forward to a retirement year,
 * then calculates sell/hold outcomes.
 *
 * Uses projectPropertyTimeline() — NO duplicate calculation logic.
 */
export function useRetirementProjection(
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData,
  retirementYears: number,
  soldIds: Set<string>,
  getInstance?: (instanceId: string) => PropertyInstanceDetails | undefined,
): RetirementSummary {
  return useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) {
      return {
        properties: [],
        soldIds,
        cashInHand: 0,
        portfolioValue: 0,
        totalEquity: 0,
        debtRemaining: 0,
        annualCashflow: 0,
        zone: 'hold',
        zoneName: 'Hold Strategy',
        chipLabel: 'Maximum Wealth',
      };
    }

    const retirementYear = BASE_YEAR + retirementYears;

    const properties: RetirementPropertyProjection[] = feasible.map(prop => {
      const propPurchaseYear = Math.ceil(prop.affordableYear);
      const purchasedByRetirement = propPurchaseYear <= retirementYear;

      const projected = projectPropertyTimeline(
        prop,
        retirementYear,
        profile.growthCurve,
        DEFAULT_INTEREST_RATE,
      );

      // Get the last snapshot (retirement year)
      const lastSnapshot = projected.snapshots[projected.snapshots.length - 1];

      if (!lastSnapshot) {
        return {
          instanceId: prop.instanceId,
          title: prop.title,
          propertyType: prop.propertyType ?? null,
          purchasePrice: prop.cost,
          purchaseYear: propPurchaseYear,
          purchasedByRetirement,
          futureValue: prop.cost,
          futureDebt: prop.loanAmount,
          futureEquity: prop.cost - prop.loanAmount,
          annualCashflow: 0,
          annualRent: 0,
          annualCosts: 0,
        };
      }

      // Calculate cashflow matching the main chart's methodology:
      // Main chart uses: adjustedIncome - totalExpenses - loanInterest + deductions
      // metricsCalculator's annualTotalCosts already includes mortgage + operating expenses
      // We need to ADD deductions and SUBTRACT land tax to align
      let annualCashflow = lastSnapshot.annualRent - lastSnapshot.annualTotalCosts;
      const annualLandTax = lastSnapshot.annualLandTax || 0;
      const annualDeductions = lastSnapshot.annualDeductions || 0;

      // If we have access to the property instance, use its detailed cashflow
      // grown to the retirement year for more accurate alignment
      if (getInstance) {
        const instance = getInstance(prop.instanceId);
        if (instance) {
          const detailedCashflow = calculateDetailedCashflow(instance, prop.loanAmount);
          const yearsOwned = retirementYear - propPurchaseYear;
          const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
          const growthFactor = lastSnapshot.propertyValue / prop.cost;
          const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, yearsOwned);

          // Grow the detailed cashflow to the retirement year
          const adjustedIncome = detailedCashflow.adjustedIncome * growthFactor;
          const adjustedLoanInterest = lastSnapshot.loanBalance > 0
            ? lastSnapshot.loanBalance * DEFAULT_INTEREST_RATE
            : 0;
          const adjustedOperatingExpenses = (
            detailedCashflow.propertyManagementFee * growthFactor +
            detailedCashflow.buildingInsurance * inflationFactor +
            detailedCashflow.councilRatesWater * inflationFactor +
            detailedCashflow.strata * inflationFactor +
            detailedCashflow.maintenance * inflationFactor
          );
          const adjustedNonDeductible = detailedCashflow.totalNonDeductibleExpenses * inflationFactor;
          const adjustedDeductions = detailedCashflow.potentialDeductions;

          annualCashflow = adjustedIncome - adjustedOperatingExpenses - adjustedNonDeductible - adjustedLoanInterest + adjustedDeductions;
        }
      } else {
        // Fallback: adjust with land tax and deductions from snapshot
        annualCashflow = annualCashflow - annualLandTax + annualDeductions;
      }

      return {
        instanceId: prop.instanceId,
        title: prop.title,
        propertyType: prop.propertyType ?? null,
        purchasePrice: prop.cost,
        purchaseYear: propPurchaseYear,
        purchasedByRetirement,
        futureValue: lastSnapshot.propertyValue,
        futureDebt: lastSnapshot.loanBalance,
        futureEquity: lastSnapshot.propertyValue - lastSnapshot.loanBalance,
        annualCashflow: Math.round(annualCashflow),
        annualRent: lastSnapshot.annualRent,
        annualCosts: lastSnapshot.annualTotalCosts,
      };
    });

    // Split into sold and held
    const sold = properties.filter(p => soldIds.has(p.instanceId));
    const held = properties.filter(p => !soldIds.has(p.instanceId));

    const rawSaleProceeds = sold.reduce((sum, p) => sum + Math.max(0, p.futureEquity), 0);
    const portfolioValue = held.reduce((sum, p) => sum + p.futureValue, 0);
    const rawHeldDebt = held.reduce((sum, p) => sum + p.futureDebt, 0);
    const annualCashflow = held.reduce((sum, p) => sum + p.annualCashflow, 0);

    // Apply sale proceeds against held property debt first, surplus becomes free cash
    const debtRemaining = Math.max(0, rawHeldDebt - rawSaleProceeds);
    const cashInHand = Math.max(0, rawSaleProceeds - rawHeldDebt);

    // Total equity reflects the ADJUSTED debt after applying sale proceeds
    // When debt = 0, totalEquity = portfolioValue (they should match)
    const totalEquity = portfolioValue - debtRemaining;

    // Determine zone
    const soldCount = soldIds.size;
    const totalCount = properties.length;
    let zone: RetirementSummary['zone'];
    let zoneName: string;
    let chipLabel: string;

    if (soldCount === 0) {
      zone = 'hold';
      zoneName = 'Hold Strategy';
      chipLabel = 'Maximum Wealth';
    } else if (soldCount >= totalCount) {
      zone = 'exit';
      zoneName = 'Full Exit Strategy';
      chipLabel = 'Full Liquidity';
    } else {
      zone = 'balanced';
      zoneName = 'Balanced Strategy';
      chipLabel = 'Balanced Exit';
    }

    return {
      properties,
      soldIds,
      cashInHand,
      portfolioValue,
      totalEquity,
      debtRemaining,
      annualCashflow,
      zone,
      zoneName,
      chipLabel,
    };
  }, [timelineProperties, profile, retirementYears, soldIds, getInstance]);
}

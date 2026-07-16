import { useMemo } from 'react';
import type { TimelineProperty } from '../../types/property';
import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext';
import type { PropertyInstanceDetails } from '../../types/propertyInstance';
import type { ExistingProperty } from '../../types/existingProperty';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import { calculateDetailedCashflow } from '../../utils/detailedCashflowCalculator';
import { convertExistingToInstance } from '../../utils/existingPropertyAdapter';
import { DEFAULT_INTEREST_RATE, BASE_YEAR, PERIODS_PER_YEAR, ANNUAL_INFLATION_RATE } from '../../constants/financialParams';

export interface RetirementPropertyProjection {
  instanceId: string;
  title: string;
  propertyType: string | null;
  purchasePrice: number;
  /** Acquisition costs (stamp duty, LMI, legal, etc.) - cost-base add-on */
  acquisitionCosts: number;
  /** CGT cost base = purchasePrice + acquisitionCosts */
  costBase: number;
  /** Ownership entity (drives CGT treatment - smsf uses its own discount) */
  entity?: 'individual' | 'trust' | 'company' | 'smsf';
  /** New build (may choose either CGT method) */
  isNewBuild?: boolean;
  /** Year the property is purchased (from affordableYear, or boughtYear for existing) */
  purchaseYear: number;
  /** Already-owned existing-portfolio property (vs a future modelled purchase) */
  isExisting?: boolean;
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
 * Uses projectPropertyTimeline() - NO duplicate calculation logic.
 */
export function useRetirementProjection(
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData,
  retirementYears: number,
  saleYearById: Record<string, number>,
  getInstance?: (instanceId: string) => PropertyInstanceDetails | undefined,
  existingProperties: ExistingProperty[] = [],
): RetirementSummary {
  return useMemo(() => {
    // Each key in saleYearById is a property flagged to be sold, mapped to the
    // year it's sold in. Held properties simply have no entry.
    const soldIds = new Set(Object.keys(saleYearById));
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0 && existingProperties.length === 0) {
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

    const futureProjections: RetirementPropertyProjection[] = feasible.map(prop => {
      const propPurchaseYear = Math.ceil(prop.affordableYear);
      const purchasedByRetirement = propPurchaseYear <= retirementYear;

      // CGT cost-base inputs: purchase price + acquisition costs, plus the
      // ownership entity / build type from the editable instance (when available).
      const acquisitionCosts = prop.acquisitionCosts?.total ?? 0;
      const costBase = prop.cost + acquisitionCosts;
      const instanceForCgt = getInstance?.(prop.instanceId);
      const entity = instanceForCgt?.entity;
      const isNewBuild = instanceForCgt?.isNewBuild;

      const projected = projectPropertyTimeline(
        prop,
        retirementYear,
        profile.growthCurve,
        DEFAULT_INTEREST_RATE,
        profile.rentEscalationRate ?? 0.05,
      );

      // Get the last snapshot (retirement year)
      const lastSnapshot = projected.snapshots[projected.snapshots.length - 1];

      // Value the property at ITS OWN sale year when it's being sold, so its
      // price is locked to that year rather than the shared retirement year.
      // Held properties (no sale year) keep the retirement-year snapshot.
      const valuationYear = saleYearById[prop.instanceId] ?? retirementYear;
      const saleSnapshot =
        projected.snapshots.find(s => s.year === valuationYear) ?? lastSnapshot;

      if (!lastSnapshot) {
        return {
          instanceId: prop.instanceId,
          title: prop.title,
          propertyType: prop.propertyType ?? null,
          purchasePrice: prop.cost,
          acquisitionCosts,
          costBase,
          entity,
          isNewBuild,
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
      // Main chart uses: GROSS rent - totalExpenses - loanInterest + deductions
      // (vacancy is an assessment-side allowance, not deducted from the line)
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
          const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, yearsOwned);
          const retRentEscalationFactor = Math.pow(1 + (profile?.rentEscalationRate ?? 0.05), yearsOwned);

          const adjustedIncome = detailedCashflow.grossAnnualIncome * retRentEscalationFactor;
          const adjustedLoanInterest = lastSnapshot.loanBalance > 0
            ? lastSnapshot.loanBalance * DEFAULT_INTEREST_RATE
            : 0;
          const adjustedOperatingExpenses = (
            detailedCashflow.propertyManagementFee * retRentEscalationFactor +
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
        acquisitionCosts,
        costBase,
        entity,
        isNewBuild,
        purchaseYear: propPurchaseYear,
        purchasedByRetirement,
        futureValue: saleSnapshot.propertyValue,
        futureDebt: saleSnapshot.loanBalance,
        futureEquity: saleSnapshot.propertyValue - saleSnapshot.loanBalance,
        annualCashflow: Math.round(annualCashflow),
        annualRent: lastSnapshot.annualRent,
        annualCosts: lastSnapshot.annualTotalCosts,
      };
    });

    // ── Existing portfolio (already-owned properties) ──────────────────────
    // These aren't in the timeline (which only models *future* purchases), so
    // we project them forward from today's value to the retirement year. The
    // real acquisition year (boughtYear) is kept for CGT cost base, holding
    // period and grandfathering - most are pre-2027 → keep the 50% discount.
    const existingProjections: RetirementPropertyProjection[] = existingProperties.map(ep => {
      const boughtYear = ep.boughtYear && ep.boughtYear > 0 ? ep.boughtYear : BASE_YEAR;
      const currentValue = ep.currentValue || ep.purchasePrice || 0;
      const acquisitionCosts =
        (ep.stampDuty ?? 0) + (ep.legals ?? 0) + (ep.buildingPest ?? 0) + (ep.baFee ?? 0);
      const costBase = (ep.purchasePrice || currentValue) + acquisitionCosts;

      // Project value/debt from NOW (today's value) to the retirement year.
      const projected = projectPropertyTimeline(
        {
          instanceId: ep.id,
          title: ep.address || `${ep.state} ${boughtYear || 'Existing'}`,
          cost: currentValue,
          growthBasis: currentValue,
          loanAmount: ep.loan ?? 0,
          affordableYear: BASE_YEAR,
          grossRentalIncome: ((ep.rentPerWeek ?? 0) * 52) / PERIODS_PER_YEAR,
          loanType: ep.loanType,
        } as any,
        retirementYear,
        profile.growthCurve,
        ep.interestRate ? ep.interestRate / 100 : DEFAULT_INTEREST_RATE,
        profile.rentEscalationRate ?? 0.05,
      );
      const last = projected.snapshots[projected.snapshots.length - 1];
      // Lock value/debt to the property's own sale year when it's being sold.
      const valuationYear = saleYearById[ep.id] ?? retirementYear;
      const saleSnap = projected.snapshots.find(s => s.year === valuationYear) ?? last;
      const futureValue = saleSnap ? saleSnap.propertyValue : currentValue;
      const futureDebt = saleSnap ? saleSnap.loanBalance : (ep.loan ?? 0);

      // Cashflow grown from today's rent/expenses (existing-property values are
      // current, so escalate over years-from-now, not from acquisition).
      const yearsFromNow = Math.max(0, retirementYear - BASE_YEAR);
      const inflationFactor = Math.pow(1 + ANNUAL_INFLATION_RATE, yearsFromNow);
      const rentEscalationFactor = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsFromNow);

      const instance = convertExistingToInstance(ep, DEFAULT_INTEREST_RATE);
      const detailed = calculateDetailedCashflow(instance, ep.loan ?? 0);
      const adjustedIncome = detailed.grossAnnualIncome * rentEscalationFactor;
      const adjustedLoanInterest = futureDebt > 0 ? futureDebt * DEFAULT_INTEREST_RATE : 0;
      const adjustedOperatingExpenses =
        detailed.propertyManagementFee * rentEscalationFactor +
        detailed.buildingInsurance * inflationFactor +
        detailed.councilRatesWater * inflationFactor +
        detailed.strata * inflationFactor +
        detailed.maintenance * inflationFactor;
      const adjustedNonDeductible = detailed.totalNonDeductibleExpenses * inflationFactor;
      const adjustedDeductions = detailed.potentialDeductions;
      const annualCashflow =
        adjustedIncome - adjustedOperatingExpenses - adjustedNonDeductible - adjustedLoanInterest + adjustedDeductions;

      return {
        instanceId: ep.id,
        title: ep.address || `${ep.state} ${boughtYear || 'Existing'}`,
        propertyType: null,
        purchasePrice: ep.purchasePrice || currentValue,
        acquisitionCosts,
        costBase,
        entity: ep.entity,
        isNewBuild: ep.isNewBuild,
        purchaseYear: boughtYear,
        isExisting: true,
        purchasedByRetirement: true,
        futureValue,
        futureDebt,
        futureEquity: futureValue - futureDebt,
        annualCashflow: Math.round(annualCashflow),
        annualRent: Math.round(adjustedIncome),
        annualCosts: Math.round(adjustedOperatingExpenses + adjustedNonDeductible + adjustedLoanInterest),
      };
    });

    // Existing (already-owned) first, then future modelled purchases.
    const properties: RetirementPropertyProjection[] = [...existingProjections, ...futureProjections];

    // Split into sold and held
    const sold = properties.filter(p => soldIds.has(p.instanceId));
    const held = properties.filter(p => !soldIds.has(p.instanceId));

    // Sold and held are reported as independent gross figures:
    //   • Cash in hand   = sale proceeds (equity released by sold properties)
    //   • Debt remaining = debt still owed on held properties
    //   • Equity retained= equity locked in held properties (value − debt)
    // Sale cash is NOT netted against held debt - the BA decides what to do
    // with the cash separately, so both numbers are shown at face value.
    const cashInHand = sold.reduce((sum, p) => sum + Math.max(0, p.futureEquity), 0);
    const portfolioValue = held.reduce((sum, p) => sum + p.futureValue, 0);
    const debtRemaining = held.reduce((sum, p) => sum + p.futureDebt, 0);
    const annualCashflow = held.reduce((sum, p) => sum + p.annualCashflow, 0);

    // Equity retained in held properties
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
  }, [timelineProperties, profile, retirementYears, saleYearById, getInstance, existingProperties]);
}

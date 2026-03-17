import { useMemo } from 'react';
import type { TimelineProperty } from '../../types/property';
import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import { DEFAULT_INTEREST_RATE, BASE_YEAR } from '../../constants/financialParams';

export interface RetirementPropertyProjection {
  instanceId: string;
  title: string;
  propertyType: string | null;
  purchasePrice: number;
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
  /** Equity still in held properties */
  equityRetained: number;
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
): RetirementSummary {
  return useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) {
      return {
        properties: [],
        soldIds,
        cashInHand: 0,
        equityRetained: 0,
        debtRemaining: 0,
        annualCashflow: 0,
        zone: 'hold',
        zoneName: 'Hold Strategy',
        chipLabel: 'Maximum Wealth',
      };
    }

    const retirementYear = BASE_YEAR + retirementYears;

    const properties: RetirementPropertyProjection[] = feasible.map(prop => {
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
          futureValue: prop.cost,
          futureDebt: prop.loanAmount,
          futureEquity: prop.cost - prop.loanAmount,
          annualCashflow: 0,
          annualRent: 0,
          annualCosts: 0,
        };
      }

      return {
        instanceId: prop.instanceId,
        title: prop.title,
        propertyType: prop.propertyType ?? null,
        purchasePrice: prop.cost,
        futureValue: lastSnapshot.propertyValue,
        futureDebt: lastSnapshot.loanBalance,
        futureEquity: lastSnapshot.propertyValue - lastSnapshot.loanBalance,
        annualCashflow: lastSnapshot.annualRent - lastSnapshot.annualTotalCosts,
        annualRent: lastSnapshot.annualRent,
        annualCosts: lastSnapshot.annualTotalCosts,
      };
    });

    // Split into sold and held
    const sold = properties.filter(p => soldIds.has(p.instanceId));
    const held = properties.filter(p => !soldIds.has(p.instanceId));

    const rawSaleProceeds = sold.reduce((sum, p) => sum + Math.max(0, p.futureEquity), 0);
    const equityRetained = held.reduce((sum, p) => sum + Math.max(0, p.futureEquity), 0);
    const rawHeldDebt = held.reduce((sum, p) => sum + p.futureDebt, 0);
    const annualCashflow = held.reduce((sum, p) => sum + p.annualCashflow, 0);

    // Apply sale proceeds against held property debt first, surplus becomes free cash
    const debtRemaining = Math.max(0, rawHeldDebt - rawSaleProceeds);
    const cashInHand = Math.max(0, rawSaleProceeds - rawHeldDebt);

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
      equityRetained,
      debtRemaining,
      annualCashflow,
      zone,
      zoneName,
      chipLabel,
    };
  }, [timelineProperties, profile, retirementYears, soldIds]);
}

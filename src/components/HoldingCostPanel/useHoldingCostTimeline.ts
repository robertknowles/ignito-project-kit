import { useMemo } from 'react';
import type { TimelineProperty } from '../../types/property';
import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import type { ProjectedPropertyTimeline } from '../../utils/metricsCalculator';
import { calculateDetailedCashflow } from '../../utils/detailedCashflowCalculator';
import type { PropertyInstanceDetails } from '../../types/propertyInstance';
import { DEFAULT_INTEREST_RATE, BASE_YEAR, PERIODS_PER_YEAR } from '../../constants/financialParams';
import { PROPERTY_COLORS, PROPERTY_DASH_PATTERNS } from '../../constants/chartColors';

export interface HoldingCostPropertyData extends ProjectedPropertyTimeline {
  color: string;
  dashPattern: string;
}

export interface HoldingCostTimelineData {
  properties: HoldingCostPropertyData[];
  startYear: number;
  endYear: number;
}

/**
 * Data hook for the Holding Cost Panel.
 * Uses per-property cashflow from property instances (not accumulated portfolio totals).
 */
export function useHoldingCostTimeline(
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData,
  getInstance: (id: string) => PropertyInstanceDetails | undefined,
): HoldingCostTimelineData {
  return useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) {
      return { properties: [], startYear: BASE_YEAR, endYear: BASE_YEAR };
    }

    const endYear = BASE_YEAR + profile.timelineYears - 1;

    const properties: HoldingCostPropertyData[] = feasible.map((prop, i) => {
      // Get per-property rent & expenses from the property instance
      const instance = getInstance(prop.instanceId);

      let perPropertyRent: number;
      let perPropertyExpenseBreakdown: TimelineProperty['expenseBreakdown'] | undefined;

      if (instance) {
        const breakdown = calculateDetailedCashflow(instance, prop.loanAmount);
        // Convert annual values to per-period (semi-annual) to match projectPropertyTimeline's expectation
        perPropertyRent = breakdown.adjustedIncome / PERIODS_PER_YEAR;
        perPropertyExpenseBreakdown = {
          councilRatesWater: breakdown.councilRatesWater / PERIODS_PER_YEAR,
          strataFees: breakdown.strata / PERIODS_PER_YEAR,
          insurance: breakdown.buildingInsurance / PERIODS_PER_YEAR,
          managementFees: breakdown.propertyManagementFee / PERIODS_PER_YEAR,
          repairsMaintenance: breakdown.maintenance / PERIODS_PER_YEAR,
          landTax: breakdown.landTax / PERIODS_PER_YEAR,
          other: breakdown.vacancyAmount / PERIODS_PER_YEAR,
        };
      } else {
        // Fallback: use the TimelineProperty values as-is (first property is usually correct)
        perPropertyRent = prop.grossRentalIncome;
        perPropertyExpenseBreakdown = prop.expenseBreakdown;
      }

      const timeline = projectPropertyTimeline(
        {
          ...prop,
          grossRentalIncome: perPropertyRent,
          expenseBreakdown: perPropertyExpenseBreakdown,
        },
        endYear,
        profile.growthCurve,
        DEFAULT_INTEREST_RATE,
      );
      return {
        ...timeline,
        color: PROPERTY_COLORS[i % PROPERTY_COLORS.length],
        dashPattern: PROPERTY_DASH_PATTERNS[i % PROPERTY_DASH_PATTERNS.length],
      };
    });

    const startYear = Math.min(...properties.map(p => p.buyYear));

    return { properties, startYear, endYear };
  }, [timelineProperties, profile, getInstance]);
}

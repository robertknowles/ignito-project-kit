import { calculatePropertyGrowth } from './metricsCalculator';
import { BASE_YEAR, EQUITY_EXTRACTION_LVR_CAP, MIN_EXTRACTABLE_EQUITY_THRESHOLD, PERIODS_PER_YEAR } from '../constants/financialParams';
import type { TimelineProperty } from '../types/property';

export interface RefinanceTrigger {
  propertyTitle: string;
  instanceId: string;
  triggerYear: number;
  extractableEquity: number;
  currentLVR: number;
  propertyValue: number;
}

/**
 * For each feasible property on the timeline, find the first year where
 * extractable equity exceeds the threshold.
 *
 * Extractable equity = (value * EQUITY_EXTRACTION_LVR_CAP) - loanBalance
 * Assumes IO loans (loan balance stays constant) during accumulation.
 */
export function calculateRefinanceTriggers(
  timelineProperties: TimelineProperty[],
  profileGrowthCurve: { year1: number; years2to3: number; year4: number; year5plus: number },
  timelineYears: number,
  minExtractableEquity: number = MIN_EXTRACTABLE_EQUITY_THRESHOLD
): RefinanceTrigger[] {
  const triggers: RefinanceTrigger[] = [];
  const startYear = BASE_YEAR;

  const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible');

  feasibleProperties.forEach(property => {
    const purchaseYear = property.affordableYear;

    for (let year = Math.ceil(purchaseYear) + 1; year <= startYear + timelineYears; year++) {
      const yearsOwned = year - purchaseYear;
      const periodsOwned = Math.round(yearsOwned * PERIODS_PER_YEAR);

      const currentValue = calculatePropertyGrowth(property.cost, periodsOwned, profileGrowthCurve);
      const loanBalance = property.loanAmount; // IO loan — balance unchanged
      const extractableEquity = (currentValue * EQUITY_EXTRACTION_LVR_CAP) - loanBalance;

      if (extractableEquity >= minExtractableEquity) {
        const currentLVR = loanBalance / currentValue;
        triggers.push({
          propertyTitle: property.title,
          instanceId: property.instanceId,
          triggerYear: year,
          extractableEquity: Math.round(extractableEquity),
          currentLVR: Math.round(currentLVR * 100) / 100,
          propertyValue: Math.round(currentValue),
        });
        break; // Only first trigger per property
      }
    }
  });

  return triggers;
}

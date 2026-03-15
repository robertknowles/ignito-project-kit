import { useMemo } from 'react';
import type { TimelineProperty } from '../../types/property';
import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import type { ProjectedPropertyTimeline } from '../../utils/metricsCalculator';
import { DEFAULT_INTEREST_RATE, BASE_YEAR } from '../../constants/financialParams';
import { CHART_COLORS } from '../../constants/chartColors';

export interface HoldingCostPropertyData extends ProjectedPropertyTimeline {
  color: string;
}

export interface HoldingCostTimelineData {
  properties: HoldingCostPropertyData[];
  startYear: number;
  endYear: number;
}

/**
 * Thin data hook for the Holding Cost Panel.
 * Calls projectPropertyTimeline() for each feasible property and assigns colors.
 * No calculation logic here — just orchestration.
 */
export function useHoldingCostTimeline(
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData,
): HoldingCostTimelineData {
  return useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) {
      return { properties: [], startYear: BASE_YEAR, endYear: BASE_YEAR };
    }

    const endYear = BASE_YEAR + profile.timelineYears + 5; // Project 5 years beyond timeline

    const properties: HoldingCostPropertyData[] = feasible.map((prop, i) => {
      const timeline = projectPropertyTimeline(
        prop,
        endYear,
        profile.growthCurve,
        DEFAULT_INTEREST_RATE,
      );
      return {
        ...timeline,
        color: CHART_COLORS.series[i % CHART_COLORS.series.length],
      };
    });

    const startYear = Math.min(...properties.map(p => p.buyYear));

    return { properties, startYear, endYear };
  }, [timelineProperties, profile]);
}

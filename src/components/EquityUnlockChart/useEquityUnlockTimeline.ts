import { useMemo } from 'react';
import type { TimelineProperty } from '../../types/property';
import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import { DEFAULT_INTEREST_RATE, BASE_YEAR, MIN_EXTRACTABLE_EQUITY_THRESHOLD } from '../../constants/financialParams';
// Distinct colors per property line — blue, purple, aqua (same palette as Net Worth)
const EQUITY_LINE_COLORS = [
  '#3B82F6',  // Blue
  '#8B5CF6',  // Purple
  '#22D3EE',  // Aqua
] as const;

export interface EquityTimelinePoint {
  year: number;
  propertyValue: number;
  loanBalance: number;
  lvr: number;
  extractableEquity: number;
}

export interface PropertyEquityTimeline {
  instanceId: string;
  title: string;
  color: string;
  buyYear: number;
  purchasePrice: number;
  timeline: EquityTimelinePoint[];
  refinanceReadyYear: number | null;
  extractionEvent: { year: number; amount: number } | null;
}

/**
 * Thin data hook for the Equity Unlock chart.
 * Uses projectPropertyTimeline() for the heavy lifting — extracts only
 * the equity-related fields and identifies refinance-ready years.
 */
export function useEquityUnlockTimeline(
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData,
): { propertyTimelines: PropertyEquityTimeline[] } {
  return useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) return { propertyTimelines: [] };

    const endYear = BASE_YEAR + profile.timelineYears - 1;

    const propertyTimelines: PropertyEquityTimeline[] = feasible.map((prop, i) => {
      const projected = projectPropertyTimeline(
        prop,
        endYear,
        profile.growthCurve,
        DEFAULT_INTEREST_RATE,
      );

      // Extract equity timeline from snapshots
      const timeline: EquityTimelinePoint[] = projected.snapshots.map(s => ({
        year: s.year,
        propertyValue: s.propertyValue,
        loanBalance: s.loanBalance,
        lvr: s.lvr,
        extractableEquity: s.extractableEquity,
      }));

      // Find refinance-ready year (first year extractable >= $50K)
      const refinanceReadyYear = timeline.find(
        t => t.extractableEquity >= MIN_EXTRACTABLE_EQUITY_THRESHOLD,
      )?.year ?? null;

      // Check if equity was actually extracted for the NEXT property
      let extractionEvent: PropertyEquityTimeline['extractionEvent'] = null;
      const nextProp = feasible[i + 1];
      if (nextProp && nextProp.fundingBreakdown.equity > 0) {
        extractionEvent = {
          year: Math.floor(nextProp.affordableYear),
          amount: nextProp.fundingBreakdown.equity,
        };
      }

      return {
        instanceId: prop.instanceId,
        title: prop.title,
        color: EQUITY_LINE_COLORS[i % EQUITY_LINE_COLORS.length],
        buyYear: projected.buyYear,
        purchasePrice: prop.cost,
        timeline,
        refinanceReadyYear,
        extractionEvent,
      };
    });

    return { propertyTimelines };
  }, [timelineProperties, profile]);
}

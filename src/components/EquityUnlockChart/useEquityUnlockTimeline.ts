import { useMemo } from 'react';
import type { TimelineProperty } from '../../types/property';
import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import { DEFAULT_INTEREST_RATE, BASE_YEAR, MIN_EXTRACTABLE_EQUITY_THRESHOLD, getGrowthCurveForTier } from '../../constants/financialParams';
import type { PropertyInstanceDetails } from '../../types/propertyInstance';
import { PROPERTY_COLORS, PROPERTY_DASH_PATTERNS } from '../../constants/chartColors';

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
  dashPattern: string;
  buyYear: number;
  purchasePrice: number;
  timeline: EquityTimelinePoint[];
  refinanceReadyYear: number | null;
  extractionEvents: { year: number; amount: number }[];
}

/**
 * Data hook for the Equity Unlock chart.
 * Uses projectPropertyTimeline() for the heavy lifting — extracts only
 * the equity-related fields and identifies refinance-ready years.
 *
 * Extraction events are calculated by finding later purchases that used equity,
 * then attributing proportional amounts back to each donor property based on
 * their extractable equity at the time of that purchase.
 */
export function useEquityUnlockTimeline(
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData,
  getInstance?: (id: string) => PropertyInstanceDetails | undefined,
): { propertyTimelines: PropertyEquityTimeline[] } {
  return useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) return { propertyTimelines: [] };

    const endYear = BASE_YEAR + profile.timelineYears - 1;

    // First pass: build timelines and find refinance-ready years
    const timelines = feasible.map((prop) => {
      // Use property-specific growth rate to match affordability calculator
      const propInstance = getInstance?.(prop.instanceId);
      const propGrowthCurve = getGrowthCurveForTier(propInstance?.growthAssumption, profile.growthCurve);
      const projected = projectPropertyTimeline(
        prop,
        endYear,
        propGrowthCurve,
        DEFAULT_INTEREST_RATE,
      );

      const timeline: EquityTimelinePoint[] = projected.snapshots.map(s => ({
        year: s.year,
        propertyValue: s.propertyValue,
        loanBalance: s.loanBalance,
        lvr: s.lvr,
        extractableEquity: s.extractableEquity,
      }));

      const refinanceReadyYear = timeline.find(
        t => t.extractableEquity >= MIN_EXTRACTABLE_EQUITY_THRESHOLD,
      )?.year ?? null;

      return { prop, projected, timeline, refinanceReadyYear };
    });

    // Second pass: for each property that used equity, attribute proportional shares
    // to donor properties using their pre-computed timeline extractable equity values
    const extractionEvents = new Map<number, { year: number; amount: number }[]>();

    feasible.forEach((buyer, buyerIdx) => {
      const equityUsed = buyer.fundingBreakdown.equity;
      if (equityUsed <= 0) return;

      const buyYear = Math.floor(buyer.affordableYear);

      // Look up each earlier property's extractable equity at buyYear from pre-computed timelines
      const donorContributions: { donorIdx: number; extractable: number }[] = [];
      timelines.forEach(({ timeline }, donorIdx) => {
        if (donorIdx >= buyerIdx) return;
        // Find the snapshot at or just before the buyer's purchase year
        const snap = timeline.find(t => t.year === buyYear)
          ?? timeline.filter(t => t.year < buyYear).pop();
        const extractable = snap?.extractableEquity ?? 0;
        if (extractable > 0) {
          donorContributions.push({ donorIdx, extractable });
        }
      });

      const totalExtractable = donorContributions.reduce((s, d) => s + d.extractable, 0);

      // Attribute proportional share to each donor — accumulate ALL events
      donorContributions.forEach(({ donorIdx, extractable }) => {
        const share = totalExtractable > 0
          ? Math.round((extractable / totalExtractable) * equityUsed)
          : Math.round(equityUsed / donorContributions.length);

        const events = extractionEvents.get(donorIdx) ?? [];
        events.push({ year: buyYear, amount: share });
        extractionEvents.set(donorIdx, events);
      });
    });

    // Build final result
    const propertyTimelines: PropertyEquityTimeline[] = timelines.map(({ prop, projected, timeline, refinanceReadyYear }, i) => ({
      instanceId: prop.instanceId,
      title: prop.title,
      color: PROPERTY_COLORS[i % PROPERTY_COLORS.length],
      dashPattern: PROPERTY_DASH_PATTERNS[i % PROPERTY_DASH_PATTERNS.length],
      buyYear: projected.buyYear,
      purchasePrice: prop.cost,
      timeline,
      refinanceReadyYear,
      extractionEvents: extractionEvents.get(i) ?? [],
    }));

    return { propertyTimelines };
  }, [timelineProperties, profile, getInstance]);
}

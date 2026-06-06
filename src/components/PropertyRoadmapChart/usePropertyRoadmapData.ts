import { useMemo } from 'react';
import type { TimelineProperty } from '../../types/property';
import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext';
import type { EventBlock } from '../../contexts/PropertySelectionContext';
import type { PropertyInstanceDetails } from '../../types/propertyInstance';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import {
  BASE_YEAR,
  DEFAULT_INTEREST_RATE,
  MIN_EXTRACTABLE_EQUITY_THRESHOLD,
  EQUITY_EXTRACTION_LVR_CAP,
  getGrowthCurveForTier,
  periodToYear,
} from '../../constants/financialParams';
import { PROPERTY_COLORS } from '../../constants/chartColors';

export interface RoadmapEvent {
  year: number;
  type: 'purchase' | 'equity_unlock' | 'equity_pull' | 'refinance';
  amount?: number;
  label?: string;
  destinationYear?: number;
}

export interface PropertyRoadmapBar {
  instanceId: string;
  title: string;
  color: string;
  purchaseYear: number;
  equityUnlockYear: number | null;
  events: RoadmapEvent[];
  segments: {
    startYear: number;
    endYear: number;
    phase: 'holding' | 'post-unlock';
  }[];
}

export interface PropertyRoadmapResult {
  properties: PropertyRoadmapBar[];
  startYear: number;
  endYear: number;
  releasableNow: number;
}

/**
 * Data hook for the Property Roadmap Gantt chart.
 *
 * Sources all data from the same engine chain as the rest of the dashboard:
 *   useAffordabilityCalculator → TimelineProperty[]
 *   useEquityUnlockTimeline pattern → per-property equity projections
 *   EventBlock[] → refinance events
 *
 * Returns per-property horizontal bars with event markers.
 */
export function usePropertyRoadmapData(
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData,
  eventBlocks: EventBlock[],
  getInstance?: (id: string) => PropertyInstanceDetails | undefined,
): PropertyRoadmapResult {
  return useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');

    if (feasible.length === 0) {
      return { properties: [], startYear: BASE_YEAR, endYear: BASE_YEAR + 15, releasableNow: 0 };
    }

    const endYear = BASE_YEAR + profile.timelineYears - 1;
    const currentYear = BASE_YEAR;

    // Project each property's equity timeline (same approach as useEquityUnlockTimeline)
    const projections = feasible.map((prop) => {
      const propInstance = getInstance?.(prop.instanceId);
      const propGrowthCurve = getGrowthCurveForTier(propInstance?.growthAssumption, profile.growthCurve);
      const projected = projectPropertyTimeline(
        prop,
        endYear,
        propGrowthCurve,
        DEFAULT_INTEREST_RATE,
        profile.rentEscalationRate ?? 0.05,
      );
      return { prop, projected };
    });

    // Build per-property roadmap bars
    const properties: PropertyRoadmapBar[] = projections.map(({ prop, projected }, idx) => {
      const purchaseYear = Math.floor(prop.affordableYear);
      const events: RoadmapEvent[] = [];

      // Purchase event
      events.push({
        year: purchaseYear,
        type: 'purchase',
        amount: prop.cost,
        label: `Buy ${prop.title}`,
      });

      // Equity unlock: first year extractable equity crosses threshold
      const equityUnlockYear = projected.snapshots.find(
        s => s.extractableEquity >= MIN_EXTRACTABLE_EQUITY_THRESHOLD,
      )?.year ?? null;

      if (equityUnlockYear !== null) {
        const snap = projected.snapshots.find(s => s.year === equityUnlockYear);
        events.push({
          year: equityUnlockYear,
          type: 'equity_unlock',
          amount: snap?.extractableEquity,
          label: 'Equity unlocked',
        });
      }

      // Equity pull: when this property's equity was used to fund later purchases
      // Attribution: find later purchases that used equity and distribute proportionally
      const laterBuyers = feasible.filter((_, laterIdx) => {
        if (laterIdx <= idx) return false;
        return feasible[laterIdx].fundingBreakdown.equity > 0;
      });

      laterBuyers.forEach(buyer => {
        const buyerYear = Math.floor(buyer.affordableYear);
        const equityUsed = buyer.fundingBreakdown.equity;

        // Check if this property had extractable equity at that year
        const snap = projected.snapshots.find(s => s.year === buyerYear)
          ?? projected.snapshots.filter(s => s.year < buyerYear).pop();

        if (snap && snap.extractableEquity > 0) {
          // Get total extractable from all earlier properties at buyer's year
          const totalExtractable = projections
            .filter((_, donorIdx) => donorIdx < feasible.indexOf(buyer))
            .reduce((sum, { projected: dp }) => {
              const ds = dp.snapshots.find(s => s.year === buyerYear)
                ?? dp.snapshots.filter(s => s.year < buyerYear).pop();
              return sum + (ds?.extractableEquity ?? 0);
            }, 0);

          const share = totalExtractable > 0
            ? Math.round((snap.extractableEquity / totalExtractable) * equityUsed)
            : 0;

          if (share > 0) {
            events.push({
              year: buyerYear,
              type: 'equity_pull',
              amount: share,
              label: `Equity pulled → ${buyer.title}`,
              destinationYear: buyerYear,
            });
          }
        }
      });

      // Refinance events from the event system
      eventBlocks
        .filter(e => e.eventType === 'refinance')
        .forEach(e => {
          const appliesToThis = !e.payload.propertyInstanceId
            || e.payload.propertyInstanceId === prop.instanceId;
          if (!appliesToThis) return;

          const refiYear = Math.floor(periodToYear(e.period));
          if (refiYear < purchaseYear || refiYear > endYear) return;

          events.push({
            year: refiYear,
            type: 'refinance',
            amount: e.payload.newInterestRate,
            label: `Refinance${e.payload.newInterestRate ? ` @ ${e.payload.newInterestRate}%` : ''}`,
          });
        });

      // Sort events chronologically
      events.sort((a, b) => a.year - b.year);

      // Build bar segments: holding (pre-unlock) and post-unlock
      const segments: PropertyRoadmapBar['segments'] = [];
      if (equityUnlockYear !== null && equityUnlockYear > purchaseYear) {
        segments.push({
          startYear: purchaseYear,
          endYear: equityUnlockYear,
          phase: 'holding',
        });
        segments.push({
          startYear: equityUnlockYear,
          endYear: endYear,
          phase: 'post-unlock',
        });
      } else {
        segments.push({
          startYear: purchaseYear,
          endYear: endYear,
          phase: equityUnlockYear === purchaseYear ? 'post-unlock' : 'holding',
        });
      }

      return {
        instanceId: prop.instanceId,
        title: prop.title,
        color: PROPERTY_COLORS[idx % PROPERTY_COLORS.length],
        purchaseYear,
        equityUnlockYear,
        events,
        segments,
      };
    });

    // Releasable now: total extractable equity across all properties at current year
    const releasableNow = projections.reduce((sum, { prop, projected }) => {
      const snap = projected.snapshots.find(s => s.year === currentYear)
        ?? projected.snapshots.filter(s => s.year <= currentYear).pop();
      return sum + (snap?.extractableEquity ?? 0);
    }, 0);

    return {
      properties,
      startYear: BASE_YEAR,
      endYear,
      releasableNow: Math.round(releasableNow),
    };
  }, [timelineProperties, profile, eventBlocks, getInstance]);
}

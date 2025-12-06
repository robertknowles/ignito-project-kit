import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

/**
 * Timeline dynamics analysis result
 */
interface TimelineDynamics {
  velocity: number;  // properties per year
  significantGaps: { startYear: number; endYear: number; duration: number }[];
  hasAssetPivot: boolean;
  pivotYear: number | null;
}

/**
 * Check if a property title indicates a commercial property
 */
const isCommercialProperty = (title: string): boolean => {
  const lowerTitle = title.toLowerCase();
  return ['commercial', 'retail', 'office', 'warehouse', 'industrial'].some(
    keyword => lowerTitle.includes(keyword)
  );
};

/**
 * Analyze timeline dynamics to understand purchase velocity, gaps, and asset pivots
 * 
 * @param feasibleProperties - Array of feasible timeline properties
 * @returns TimelineDynamics analysis result
 */
const analyzeTimelineDynamics = (
  feasibleProperties: TimelineProperty[]
): TimelineDynamics => {
  // Handle edge cases
  if (feasibleProperties.length < 2) {
    return {
      velocity: feasibleProperties.length > 0 ? 1 : 0,
      significantGaps: [],
      hasAssetPivot: false,
      pivotYear: null,
    };
  }

  // Sort by affordable year
  const sorted = [...feasibleProperties].sort((a, b) => a.affordableYear - b.affordableYear);
  const firstYear = sorted[0].affordableYear;
  const lastYear = sorted[sorted.length - 1].affordableYear;
  const yearSpan = lastYear - firstYear;

  // Calculate velocity: properties per year
  const velocity = yearSpan > 0 ? feasibleProperties.length / yearSpan : feasibleProperties.length;

  // Find significant gaps (> 4 years between purchases)
  const significantGaps: TimelineDynamics['significantGaps'] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].affordableYear - sorted[i].affordableYear;
    if (gap > 4) {
      significantGaps.push({
        startYear: Math.floor(sorted[i].affordableYear),
        endYear: Math.floor(sorted[i + 1].affordableYear),
        duration: gap,
      });
    }
  }

  // Analyze first half vs second half for asset pivot detection
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstHalfCommercialRatio = firstHalf.filter(p => isCommercialProperty(p.title)).length / firstHalf.length;
  const secondHalfCommercialRatio = secondHalf.filter(p => isCommercialProperty(p.title)).length / secondHalf.length;

  // Asset pivot: starts residential (< 30% commercial) and ends more commercial (> 30% increase)
  const hasAssetPivot = firstHalfCommercialRatio <= 0.3 && 
    (secondHalfCommercialRatio >= 0.7 || secondHalfCommercialRatio - firstHalfCommercialRatio > 0.3);

  // Find pivot year (first commercial in second half)
  let pivotYear: number | null = null;
  if (hasAssetPivot) {
    const firstCommercialInSecondHalf = secondHalf.find(p => isCommercialProperty(p.title));
    if (firstCommercialInSecondHalf) {
      pivotYear = Math.floor(firstCommercialInSecondHalf.affordableYear);
    }
  }

  return {
    velocity,
    significantGaps,
    hasAssetPivot,
    pivotYear,
  };
};

/**
 * Generate a plain language strategy summary based on timeline properties and profile
 * 
 * This function creates a narrative summary that explains the investment strategy
 * in simple terms, including the first purchase, subsequent properties, and the
 * long-term goal. It also summarizes performance against key goals.
 * 
 * @param timelineProperties - Array of timeline properties
 * @param profile - Investment profile data
 * @returns A plain language strategy summary
 */
export const generateStrategySummary = (
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData
): string => {
  // Handle empty timeline
  if (timelineProperties.length === 0) {
    return 'Add properties to the timeline to generate an AI-powered strategy summary.';
  }

  // Filter to only feasible properties
  const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible');
  
  // Handle case where no properties are feasible
  if (feasibleProperties.length === 0) {
    return 'Based on the current inputs, none of the selected properties are affordable. Adjust the client profile or property selections to generate a strategy.';
  }

  // Analyze timeline dynamics
  const dynamics = analyzeTimelineDynamics(feasibleProperties);

  // Get metrics for narrative
  const numberOfProperties = feasibleProperties.length;
  const finalProperty = feasibleProperties[feasibleProperties.length - 1];
  const finalEquity = finalProperty.totalEquityAfter;
  const finalCashflow = feasibleProperties.reduce((sum, prop) => sum + prop.netCashflow, 0);

  // Determine dominant asset type for narrative
  const propertyTypes = [...new Set(feasibleProperties.map(p => p.title))];
  const dominantType = propertyTypes.length > 0 ? propertyTypes[0] : 'property';

  // Format currency values
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  // === BUILD THE OPENER ===
  let opener: string;
  if (dynamics.velocity > 0.5) {
    // Aggressive: buying every 2 years or less
    opener = `The strategy initiates with an aggressive accumulation phase, securing ${numberOfProperties} assets early to maximize compounding.`;
  } else {
    // Steady: more conservative pace
    opener = `The strategy follows a steady acquisition rhythm, carefully timing purchases to match borrowing capacity growth.`;
  }

  // === BUILD THE MIDDLE (The Journey) ===
  let middle: string;
  if (dynamics.significantGaps.length > 0) {
    // Has consolidation periods
    const gap = dynamics.significantGaps[0];
    middle = `A strategic consolidation period is utilized mid-timeline (${gap.startYear}-${gap.endYear}), allowing equity to compound naturally before leveraged expansion resumes.`;
  } else if (dynamics.hasAssetPivot && dynamics.pivotYear) {
    // Asset pivot detected
    middle = `The portfolio pivots in ${dynamics.pivotYear}, transitioning from growth-focused residential assets into high-yield commercial property to boost passive income.`;
  } else {
    // Standard equity recycling narrative
    middle = `Equity is systematically recycled into further ${dominantType} acquisitions, compounding the asset base.`;
  }

  // === BUILD THE CLOSER (Goal Analysis) ===
  const equityGoalAchieved = finalEquity >= profile.equityGoal;
  const cashflowGoalAchieved = finalCashflow >= profile.cashflowGoal;

  const goalStatuses: string[] = [];
  
  if (equityGoalAchieved) {
    goalStatuses.push(`${formatCurrency(finalEquity)} equity target achieved`);
  } else {
    goalStatuses.push(`${formatCurrency(finalEquity)} equity (${formatCurrency(profile.equityGoal - finalEquity)} from goal)`);
  }
  
  if (cashflowGoalAchieved) {
    goalStatuses.push(`${formatCurrency(finalCashflow)} annual cashflow achieved`);
  } else {
    goalStatuses.push(`${formatCurrency(finalCashflow)} cashflow (${formatCurrency(profile.cashflowGoal - finalCashflow)} from goal)`);
  }

  const closer = `By Year ${profile.timelineYears}, the portfolio positions for ${goalStatuses.join(' and ')}.`;

  // Combine into flowing narrative
  return `${opener} ${middle} ${closer}`;
};


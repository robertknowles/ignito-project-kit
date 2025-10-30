import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

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

  // Get the first property
  const firstProperty = feasibleProperties[0];
  
  // Get unique property types
  const propertyTypes = [...new Set(feasibleProperties.map(p => p.title))];
  
  // Build the subsequent types description
  const subsequentTypes = propertyTypes.slice(1).join(', ') || 'additional properties';

  // Get final property metrics (last property in timeline)
  const finalProperty = feasibleProperties[feasibleProperties.length - 1];
  const numberOfProperties = feasibleProperties.length;
  const finalPortfolioValue = finalProperty.portfolioValueAfter;
  const finalEquity = finalProperty.totalEquityAfter;
  const finalDebt = finalProperty.totalDebtAfter;
  
  // Calculate total portfolio cashflow by summing all property cashflows
  const finalCashflow = feasibleProperties.reduce((sum, prop) => sum + prop.netCashflow, 0);

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

  // Calculate goal achievement status
  const equityGoalAchieved = finalEquity >= profile.equityGoal;
  const cashflowGoalAchieved = finalCashflow >= profile.cashflowGoal;

  // Build goals achievement summary
  const goalsText = [
    `${numberOfProperties} ${numberOfProperties === 1 ? 'property' : 'properties'}`,
    `portfolio value of ${formatCurrency(finalPortfolioValue)}`,
    `equity of ${formatCurrency(finalEquity)}${equityGoalAchieved ? ' (goal achieved)' : ` (${formatCurrency(profile.equityGoal)} goal)`}`,
    `annual cashflow of ${formatCurrency(finalCashflow)}${cashflowGoalAchieved ? ' (goal achieved)' : ` (${formatCurrency(profile.cashflowGoal)} goal)`}`,
    `total debt of ${formatCurrency(finalDebt)}`
  ].join(', ');

  // Generate the summary
  const summary = `We begin with a ${firstProperty.title} purchase in ${firstProperty.displayPeriod} to build a foundation. As equity grows, it's recycled into ${subsequentTypes} that compound over time. By Year ${profile.timelineYears}, your portfolio achieves: ${goalsText}.`;

  return summary;
};


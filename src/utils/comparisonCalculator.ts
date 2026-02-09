import type { Scenario } from '../contexts/MultiScenarioContext';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import type { TimelineProperty } from '../types/property';

// Chart data type matching useChartDataGenerator output
export interface ChartDataForComparison {
  portfolioGrowthData: Array<{
    year: string;
    portfolioValue: number;
    equity: number;
    properties?: string[];
  }>;
  cashflowData: Array<{
    year: string;
    cashflow: number;
    rentalIncome: number;
    expenses: number;
    loanRepayments: number;
  }>;
}

export interface ScenarioMetrics {
  totalProperties: number;
  timelineYears: number;
  finalEquity: number;
  finalCashflow: number;
  totalDebt: number;
  averageLVR: number;
  portfolioValue: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  // New metrics for detailed comparison
  equityGoalYear: number | null;
  cashflowGoalYear: number | null;
  totalDepositRequired: number;
}

export interface MetricDifferences {
  equityDiff: number;
  equityDiffPercent: number;
  cashflowDiff: number;
  cashflowDiffPercent: number;
  propertiesDiff: number;
  timelineDiff: number;
  debtDiff: number;
  portfolioValueDiff: number;
}

export interface ComparisonMetrics {
  scenarioA: ScenarioMetrics;
  scenarioB: ScenarioMetrics;
  differences: MetricDifferences;
  winner: 'A' | 'B' | 'tie';
  winnerReason: string;
  insights: string[];
}

// Format currency for display
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(0)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
};

/**
 * Extract final-year values from chart data
 * This ensures comparison shows the same values as charts and summary bar
 */
const getFinalValuesFromChartData = (chartData: ChartDataForComparison): {
  finalEquity: number;
  finalCashflow: number;
  portfolioValue: number;
} => {
  const finalPortfolioData = chartData.portfolioGrowthData[chartData.portfolioGrowthData.length - 1];
  const finalCashflowData = chartData.cashflowData[chartData.cashflowData.length - 1];
  
  return {
    finalEquity: finalPortfolioData?.equity ?? 0,
    portfolioValue: finalPortfolioData?.portfolioValue ?? 0,
    finalCashflow: finalCashflowData?.cashflow ?? 0,
  };
};

/**
 * Find goal achievement year from chart data
 * Returns the year when the goal is first reached, or null if not reached
 */
const findGoalYearFromChartData = (
  chartData: ChartDataForComparison,
  equityGoal: number,
  cashflowGoal: number
): { equityGoalYear: number | null; cashflowGoalYear: number | null } => {
  let equityGoalYear: number | null = null;
  let cashflowGoalYear: number | null = null;
  
  // Find equity goal year
  if (equityGoal > 0) {
    const equityReached = chartData.portfolioGrowthData.find(d => d.equity >= equityGoal);
    if (equityReached) {
      equityGoalYear = parseInt(equityReached.year, 10);
    }
  }
  
  // Find cashflow goal year
  if (cashflowGoal > 0) {
    const cashflowReached = chartData.cashflowData.find(d => d.cashflow >= cashflowGoal);
    if (cashflowReached) {
      cashflowGoalYear = parseInt(cashflowReached.year, 10);
    }
  }
  
  return { equityGoalYear, cashflowGoalYear };
};

/**
 * Calculate metrics for a single scenario
 * When chartData is provided, uses chart's final-year values for consistency with charts/summary
 * When sharedTimelineYears is provided, uses that instead of scenario's own timelineYears (for consistent comparison)
 */
export const calculateScenarioMetrics = (
  scenario: Scenario,
  chartData?: ChartDataForComparison,
  sharedTimelineYears?: number
): ScenarioMetrics => {
  const { timeline, investmentProfile } = scenario;
  
  // Filter to feasible properties only
  const feasibleProperties = timeline.filter(p => p.status === 'feasible');
  
  const totalProperties = feasibleProperties.length;
  
  // Calculate final values - use chart data if provided for consistency
  let finalEquity: number;
  let portfolioValue: number;
  let finalCashflow: number;
  let totalDebt: number;
  let equityGoalYear: number | null;
  let cashflowGoalYear: number | null;
  let endOfTimelineLVR: number | undefined; // End-of-timeline LVR when chart data available
  
  if (chartData && chartData.portfolioGrowthData.length > 0) {
    // Use chart data for final values - this matches what charts display
    const finalValues = getFinalValuesFromChartData(chartData);
    finalEquity = finalValues.finalEquity;
    portfolioValue = finalValues.portfolioValue;
    finalCashflow = finalValues.finalCashflow;
    
    // Calculate debt from portfolio value and equity
    totalDebt = portfolioValue - finalEquity;
    
    // Calculate end-of-timeline LVR from chart data (more meaningful than purchase-time)
    endOfTimelineLVR = portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0;
    
    // Find goal years from chart data (matches milestone markers on charts)
    const goalYears = findGoalYearFromChartData(
      chartData, 
      investmentProfile.equityGoal, 
      investmentProfile.cashflowGoal
    );
    equityGoalYear = goalYears.equityGoalYear;
    cashflowGoalYear = goalYears.cashflowGoalYear;
  } else {
    // Fallback: Use timeline data (snapshot at purchase time)
    const lastProperty = feasibleProperties[feasibleProperties.length - 1];
    finalEquity = lastProperty?.totalEquityAfter ?? 0;
    totalDebt = lastProperty?.totalDebtAfter ?? 0;
    portfolioValue = lastProperty?.portfolioValueAfter ?? 0;
    finalCashflow = feasibleProperties.reduce((sum, p) => sum + (p.netCashflow || 0), 0);
    
    // Find equity goal achievement year from timeline
    equityGoalYear = investmentProfile.equityGoal > 0
      ? feasibleProperties.find(p => (p.totalEquityAfter || 0) >= investmentProfile.equityGoal)?.affordableYear ?? null
      : null;
    
    // Find cashflow goal achievement year from timeline
    cashflowGoalYear = investmentProfile.cashflowGoal > 0
      ? feasibleProperties.find((_, index) => {
          const cumulativeCashflow = feasibleProperties.slice(0, index + 1).reduce((sum, p) => sum + (p.netCashflow || 0), 0);
          return cumulativeCashflow >= investmentProfile.cashflowGoal;
        })?.affordableYear ?? null
      : null;
  }
  
  // Calculate LVR - use end-of-timeline LVR when chart data available (more meaningful)
  // Otherwise fall back to purchase-time LVR
  let averageLVR: number;
  if (chartData && chartData.portfolioGrowthData.length > 0 && typeof endOfTimelineLVR !== 'undefined') {
    // Use end-of-timeline LVR calculated from chart data
    averageLVR = endOfTimelineLVR;
  } else {
    // Fallback: purchase-time LVR from timeline data
    const totalLoanAmount = feasibleProperties.reduce((sum, p) => sum + (p.loanAmount || 0), 0);
    const totalCost = feasibleProperties.reduce((sum, p) => sum + (p.cost || 0), 0);
    averageLVR = totalCost > 0 ? (totalLoanAmount / totalCost) * 100 : 0;
  }
  
  // Determine risk level based on LVR and debt
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
  if (averageLVR < 70) {
    riskLevel = 'Low';
  } else if (averageLVR >= 85) {
    riskLevel = 'High';
  }
  
  // Calculate total deposit required
  const totalDepositRequired = feasibleProperties.reduce((sum, p) => sum + (p.depositRequired || 0), 0);
  
  // Calculate timeline years - use shared timeline if provided (for consistent comparison)
  // Otherwise fall back to scenario's own investment profile timeline
  // This is the full investment horizon, not just the span of property purchases
  const timelineYears = sharedTimelineYears ?? investmentProfile.timelineYears ?? 15;
  
  return {
    totalProperties,
    timelineYears,
    finalEquity,
    finalCashflow,
    totalDebt,
    averageLVR,
    portfolioValue,
    riskLevel,
    equityGoalYear,
    cashflowGoalYear,
    totalDepositRequired,
  };
};

/**
 * Calculate differences between two sets of metrics
 */
export const calculateDifferences = (metricsA: ScenarioMetrics, metricsB: ScenarioMetrics): MetricDifferences => {
  const equityDiff = metricsA.finalEquity - metricsB.finalEquity;
  const equityDiffPercent = metricsB.finalEquity !== 0 
    ? ((metricsA.finalEquity - metricsB.finalEquity) / metricsB.finalEquity) * 100 
    : 0;
  
  const cashflowDiff = metricsA.finalCashflow - metricsB.finalCashflow;
  const cashflowDiffPercent = metricsB.finalCashflow !== 0 
    ? ((metricsA.finalCashflow - metricsB.finalCashflow) / Math.abs(metricsB.finalCashflow)) * 100 
    : 0;
  
  return {
    equityDiff,
    equityDiffPercent,
    cashflowDiff,
    cashflowDiffPercent,
    propertiesDiff: metricsA.totalProperties - metricsB.totalProperties,
    timelineDiff: metricsA.timelineYears - metricsB.timelineYears,
    debtDiff: metricsA.totalDebt - metricsB.totalDebt,
    portfolioValueDiff: metricsA.portfolioValue - metricsB.portfolioValue,
  };
};

/**
 * Determine the winning scenario based on goals and metrics
 */
export const determineWinner = (
  metricsA: ScenarioMetrics, 
  metricsB: ScenarioMetrics, 
  profile: InvestmentProfileData
): { winner: 'A' | 'B' | 'tie'; reason: string } => {
  let scoreA = 0;
  let scoreB = 0;
  const reasons: string[] = [];
  
  // Equity comparison (weighted higher if equity goal is set)
  const equityWeight = profile.equityGoal > 0 ? 3 : 2;
  if (metricsA.finalEquity > metricsB.finalEquity * 1.05) {
    scoreA += equityWeight;
    reasons.push('higher equity');
  } else if (metricsB.finalEquity > metricsA.finalEquity * 1.05) {
    scoreB += equityWeight;
    reasons.push('higher equity');
  }
  
  // Cashflow comparison (weighted higher if cashflow goal is set)
  const cashflowWeight = profile.cashflowGoal > 0 ? 3 : 2;
  if (metricsA.finalCashflow > metricsB.finalCashflow + 5000) {
    scoreA += cashflowWeight;
    reasons.push('better cashflow');
  } else if (metricsB.finalCashflow > metricsA.finalCashflow + 5000) {
    scoreB += cashflowWeight;
    reasons.push('better cashflow');
  }
  
  // Portfolio size (more properties = more diversification)
  if (metricsA.totalProperties > metricsB.totalProperties) {
    scoreA += 1;
    reasons.push('more properties');
  } else if (metricsB.totalProperties > metricsA.totalProperties) {
    scoreB += 1;
    reasons.push('more properties');
  }
  
  // Risk comparison (lower LVR = lower risk)
  if (metricsA.averageLVR < metricsB.averageLVR - 5) {
    scoreA += 1;
    reasons.push('lower risk');
  } else if (metricsB.averageLVR < metricsA.averageLVR - 5) {
    scoreB += 1;
    reasons.push('lower risk');
  }
  
  // Goal achievement speed
  if (metricsA.equityGoalYear && metricsB.equityGoalYear) {
    if (metricsA.equityGoalYear < metricsB.equityGoalYear) {
      scoreA += 2;
      reasons.push('faster equity goal');
    } else if (metricsB.equityGoalYear < metricsA.equityGoalYear) {
      scoreB += 2;
      reasons.push('faster equity goal');
    }
  }
  
  // Determine winner
  if (scoreA > scoreB + 1) {
    const winningReasons = reasons.filter(r => 
      (r.includes('equity') && metricsA.finalEquity > metricsB.finalEquity) ||
      (r.includes('cashflow') && metricsA.finalCashflow > metricsB.finalCashflow) ||
      (r.includes('properties') && metricsA.totalProperties > metricsB.totalProperties) ||
      (r.includes('risk') && metricsA.averageLVR < metricsB.averageLVR)
    );
    return { winner: 'A', reason: winningReasons.slice(0, 2).join(' and ') || 'overall performance' };
  } else if (scoreB > scoreA + 1) {
    const winningReasons = reasons.filter(r => 
      (r.includes('equity') && metricsB.finalEquity > metricsA.finalEquity) ||
      (r.includes('cashflow') && metricsB.finalCashflow > metricsA.finalCashflow) ||
      (r.includes('properties') && metricsB.totalProperties > metricsA.totalProperties) ||
      (r.includes('risk') && metricsB.averageLVR < metricsA.averageLVR)
    );
    return { winner: 'B', reason: winningReasons.slice(0, 2).join(' and ') || 'overall performance' };
  }
  
  return { winner: 'tie', reason: 'both strategies perform similarly' };
};

/**
 * Generate plain language insights about the comparison
 */
export const generateInsights = (
  metricsA: ScenarioMetrics, 
  metricsB: ScenarioMetrics, 
  differences: MetricDifferences,
  profile: InvestmentProfileData
): string[] => {
  const insights: string[] = [];
  
  // Equity comparison insight
  if (Math.abs(differences.equityDiff) > 50000) {
    const higher = differences.equityDiff > 0 ? 'A' : 'B';
    const amount = formatCurrency(Math.abs(differences.equityDiff));
    insights.push(`Scenario ${higher} builds ${amount} more equity over the timeline.`);
  }
  
  // Cashflow comparison insight
  if (Math.abs(differences.cashflowDiff) > 5000) {
    const better = differences.cashflowDiff > 0 ? 'A' : 'B';
    const amount = formatCurrency(Math.abs(differences.cashflowDiff));
    insights.push(`Scenario ${better} generates ${amount}/year more in cashflow.`);
  }
  
  // Property count insight
  if (differences.propertiesDiff !== 0) {
    const more = differences.propertiesDiff > 0 ? 'A' : 'B';
    const count = Math.abs(differences.propertiesDiff);
    insights.push(`Scenario ${more} includes ${count} more ${count === 1 ? 'property' : 'properties'}.`);
  }
  
  // Risk comparison insight
  if (Math.abs(metricsA.averageLVR - metricsB.averageLVR) > 5) {
    const lowerRisk = metricsA.averageLVR < metricsB.averageLVR ? 'A' : 'B';
    const higherRisk = lowerRisk === 'A' ? 'B' : 'A';
    insights.push(`Scenario ${lowerRisk} has lower leverage (${metricsA.averageLVR < metricsB.averageLVR ? metricsA.averageLVR.toFixed(0) : metricsB.averageLVR.toFixed(0)}% LVR) vs ${higherRisk} (${metricsA.averageLVR >= metricsB.averageLVR ? metricsA.averageLVR.toFixed(0) : metricsB.averageLVR.toFixed(0)}% LVR).`);
  }
  
  // Goal achievement insights
  if (profile.equityGoal > 0) {
    if (metricsA.equityGoalYear && !metricsB.equityGoalYear) {
      insights.push(`Only Scenario A achieves your ${formatCurrency(profile.equityGoal)} equity goal (in ${metricsA.equityGoalYear}).`);
    } else if (!metricsA.equityGoalYear && metricsB.equityGoalYear) {
      insights.push(`Only Scenario B achieves your ${formatCurrency(profile.equityGoal)} equity goal (in ${metricsB.equityGoalYear}).`);
    } else if (metricsA.equityGoalYear && metricsB.equityGoalYear && metricsA.equityGoalYear !== metricsB.equityGoalYear) {
      const faster = metricsA.equityGoalYear < metricsB.equityGoalYear ? 'A' : 'B';
      const yearsDiff = Math.abs(metricsA.equityGoalYear - metricsB.equityGoalYear);
      insights.push(`Scenario ${faster} reaches your equity goal ${yearsDiff} ${yearsDiff === 1 ? 'year' : 'years'} faster.`);
    }
  }
  
  if (profile.cashflowGoal > 0) {
    if (metricsA.cashflowGoalYear && !metricsB.cashflowGoalYear) {
      insights.push(`Only Scenario A achieves your ${formatCurrency(profile.cashflowGoal)}/year cashflow goal.`);
    } else if (!metricsA.cashflowGoalYear && metricsB.cashflowGoalYear) {
      insights.push(`Only Scenario B achieves your ${formatCurrency(profile.cashflowGoal)}/year cashflow goal.`);
    }
  }
  
  // Add a general summary if no specific insights
  if (insights.length === 0) {
    insights.push('Both scenarios show similar performance. Consider your risk tolerance and property preferences.');
  }
  
  return insights.slice(0, 4); // Limit to 4 insights
};

/**
 * Main comparison function - compares two scenarios
 * When chart data is provided, uses final-year values from charts for consistency
 * with the displayed charts and summary bar
 */
export const compareScenarios = (
  scenarioA: Scenario, 
  scenarioB: Scenario, 
  profile: InvestmentProfileData,
  chartDataA?: ChartDataForComparison,
  chartDataB?: ChartDataForComparison
): ComparisonMetrics => {
  // Pass chart data to calculateScenarioMetrics for consistent final values
  // Use the passed profile's timelineYears as the shared baseline for both scenarios
  // This ensures apples-to-apples comparison over the same time horizon
  const sharedTimelineYears = profile.timelineYears || 15;
  const metricsA = calculateScenarioMetrics(scenarioA, chartDataA, sharedTimelineYears);
  const metricsB = calculateScenarioMetrics(scenarioB, chartDataB, sharedTimelineYears);
  const differences = calculateDifferences(metricsA, metricsB);
  const { winner, reason } = determineWinner(metricsA, metricsB, profile);
  const insights = generateInsights(metricsA, metricsB, differences, profile);
  
  return {
    scenarioA: metricsA,
    scenarioB: metricsB,
    differences,
    winner,
    winnerReason: reason,
    insights,
  };
};

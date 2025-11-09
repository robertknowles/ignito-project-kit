import React from 'react';
import type { YearBreakdownData } from '@/types/property';

interface AISummaryForGapProps {
  gapData: YearBreakdownData[];
}

export const AISummaryForGap: React.FC<AISummaryForGapProps> = ({ gapData }) => {
  if (!gapData || gapData.length === 0) {
    return null;
  }

  // Analyze the gap to find the primary bottleneck
  const analyzeBottleneck = () => {
    let depositFailCount = 0;
    let serviceabilityFailCount = 0;
    let borrowingFailCount = 0;
    let firstYear = gapData[0].year;
    let lastYear = gapData[gapData.length - 1].year;
    
    let depositResolvedYear: number | null = null;
    let serviceabilityResolvedYear: number | null = null;
    let borrowingResolvedYear: number | null = null;
    
    // Count failures and find resolution years
    gapData.forEach((yearData, index) => {
      if (!yearData.depositTest.pass) {
        depositFailCount++;
      } else if (depositResolvedYear === null && index > 0 && !gapData[index - 1].depositTest.pass) {
        depositResolvedYear = yearData.year;
      }
      
      if (!yearData.serviceabilityTest.pass) {
        serviceabilityFailCount++;
      } else if (serviceabilityResolvedYear === null && index > 0 && !gapData[index - 1].serviceabilityTest.pass) {
        serviceabilityResolvedYear = yearData.year;
      }
      
      if (!yearData.borrowingCapacityTest.pass) {
        borrowingFailCount++;
      } else if (borrowingResolvedYear === null && index > 0 && !gapData[index - 1].borrowingCapacityTest.pass) {
        borrowingResolvedYear = yearData.year;
      }
    });
    
    // Determine primary bottleneck
    let primaryBottleneck = 'None';
    let bottleneckDetails = '';
    let resolvedYear: number | null = null;
    
    if (depositFailCount > serviceabilityFailCount && depositFailCount > borrowingFailCount) {
      primaryBottleneck = 'Deposit Test';
      resolvedYear = depositResolvedYear;
      const avgShortfall = gapData
        .filter(y => !y.depositTest.pass)
        .reduce((sum, y) => sum + Math.abs(y.depositTest.surplus), 0) / (depositFailCount || 1);
      bottleneckDetails = `Average shortfall: $${(avgShortfall / 1000).toFixed(0)}k. Needed to accumulate more savings and cashflow to meet deposit requirements.`;
    } else if (serviceabilityFailCount > borrowingFailCount) {
      primaryBottleneck = 'Serviceability Test';
      resolvedYear = serviceabilityResolvedYear;
      bottleneckDetails = `Rental income and borrowing capacity weren't sufficient to service additional loan repayments. Needed existing properties to grow in value and generate more rental income.`;
    } else if (borrowingFailCount > 0) {
      primaryBottleneck = 'Borrowing Capacity Test';
      resolvedYear = borrowingResolvedYear;
      bottleneckDetails = `Total debt would have exceeded borrowing capacity limits. Needed portfolio to grow to release more usable equity.`;
    } else {
      primaryBottleneck = 'Multiple Factors';
      bottleneckDetails = `Various constraints were in play during this period. The strategy was to wait for portfolio growth and cash accumulation.`;
    }
    
    return {
      primaryBottleneck,
      bottleneckDetails,
      resolvedYear,
      firstYear,
      lastYear,
      depositFailCount,
      serviceabilityFailCount,
      borrowingFailCount,
    };
  };

  const analysis = analyzeBottleneck();
  
  const startYear = Math.floor(gapData[0].year);
  const endYear = Math.floor(gapData[gapData.length - 1].year);
  const resolvedYearNum = analysis.resolvedYear ? Math.floor(analysis.resolvedYear) : endYear;

  return (
    <p className="text-sm text-gray-500 italic mb-3">
      The {gapData.length}-year wait from {startYear} to {endYear} was primarily due to the{' '}
      <strong>{analysis.primaryBottleneck}</strong> test. This constraint was resolved in {resolvedYearNum}, 
      allowing the next purchase to proceed.
    </p>
  );
};


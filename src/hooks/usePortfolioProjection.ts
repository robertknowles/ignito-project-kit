/**
 * usePortfolioProjection - Unified projection engine.
 *
 * Replaces three separate hooks that previously computed year-by-year
 * projections independently (useChartDataGenerator, useRoadmapData,
 * usePortfolioCashflow) plus the calculatePerPropertyProjection side
 * calculator.
 *
 * Every chart, table, brief, and KPI reads from this single hook.
 * One calculation pass → one set of numbers → zero drift.
 *
 * "Best of" logic origins:
 *   Growth with events       → useRoadmapData  (period-by-period, more accurate)
 *   Existing property loans  → useChartDataGenerator (amortisation)
 *   Borrowing capacity       → useChartDataGenerator (entity-discounted ceiling)
 *   Do-nothing baseline      → useChartDataGenerator (wage-grown savings)
 *   Funding / available funds→ useRoadmapData  (running balances from calculator SSOT)
 *   Pass/fail gates          → useRoadmapData  (unique)
 *   Per-property projections → perPropertyProjections (P&I, ROI metrics)
 *   Inflation                → useChartDataGenerator (profile override)
 */

import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useExistingPropertiesSafe } from '../contexts/ScenarioSaveContext';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import {
  computeProjection,
  type PortfolioGrowthDataPoint,
  type CashflowDataPoint,
  type PortfolioProjectionResult,
} from '../engine/projectionEngine';

// ─────────────────────────────────────────────────────────────
// Types - moved verbatim to the pure engine (src/engine/projectionEngine.ts).
// Re-exported here so existing import sites keep working unchanged.
// ─────────────────────────────────────────────────────────────

export type {
  PortfolioGrowthDataPoint,
  CashflowDataPoint,
  PropertyCashflowEntry,
  YearCashflowSnapshot,
  PerPropertyYearRow,
  YearRow,
  PerPropertyProjection,
  FundingBreakdown,
  PurchaseDetail,
  EventSummary,
  YearData,
  RoadmapData,
  SaleCgtRow,
  PortfolioProjectionResult,
} from '../engine/projectionEngine';

// Optional scenario data for multi-scenario mode
interface ScenarioDataInput {
  timelineProperties: TimelineProperty[];
  profile: InvestmentProfileData;
}

// ─────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────

export const usePortfolioProjection = (
  scenarioData?: ScenarioDataInput,
): PortfolioProjectionResult => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimelineProperties } = useAffordabilityCalculator();
  const { globalFactors, getPropertyData } = useDataAssumptions();
  const { getInstance } = usePropertyInstance();
  const { eventBlocks } = usePropertySelection();
  const existingProperties = useExistingPropertiesSafe();

  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties;

  // ───────────────────────────────────────────────────────────
  // SINGLE COMPUTATION PASS
  // Moved verbatim to src/engine/projectionEngine.ts - this hook
  // is now a thin context adapter over the pure engine.
  // ───────────────────────────────────────────────────────────
  const projectionResult = useMemo((): PortfolioProjectionResult => {
    return computeProjection({
      profile,
      timelineProperties,
      getInstance,
      existingProperties,
      eventBlocks,
      getPropertyData,
    });
  }, [
    timelineProperties,
    profile,
    globalFactors,
    getPropertyData,
    eventBlocks,
    getInstance,
    existingProperties,
  ]);

  return projectionResult;
};

/**
 * Generate comparison chart data by merging two scenarios' data.
 * Used for overlay charts in comparison reports.
 */
export interface ComparisonPortfolioDataPoint {
  year: string;
  portfolioValueA: number;
  portfolioValueB: number;
  equityA: number;
  equityB: number;
  propertiesA?: string[];
  propertiesB?: string[];
}

export interface ComparisonCashflowDataPoint {
  year: string;
  cashflowA: number;
  cashflowB: number;
  rentalIncomeA: number;
  rentalIncomeB: number;
  expensesA: number;
  expensesB: number;
}

export interface ComparisonChartData {
  portfolioData: ComparisonPortfolioDataPoint[];
  cashflowData: ComparisonCashflowDataPoint[];
  equityGoalYearA: number | null;
  equityGoalYearB: number | null;
  incomeGoalYearA: number | null;
  incomeGoalYearB: number | null;
}

export const generateComparisonChartData = (
  dataA: { portfolioGrowthData: PortfolioGrowthDataPoint[]; cashflowData: CashflowDataPoint[] },
  dataB: { portfolioGrowthData: PortfolioGrowthDataPoint[]; cashflowData: CashflowDataPoint[] },
  equityGoal: number,
  incomeGoal: number,
): ComparisonChartData => {
  const allYearsSet = new Set<string>();
  dataA.portfolioGrowthData.forEach(d => allYearsSet.add(d.year));
  dataB.portfolioGrowthData.forEach(d => allYearsSet.add(d.year));
  const allYears = Array.from(allYearsSet).sort((a, b) => parseInt(a) - parseInt(b));

  const portfolioData: ComparisonPortfolioDataPoint[] = allYears.map(year => {
    const pointA = dataA.portfolioGrowthData.find(d => d.year === year);
    const pointB = dataB.portfolioGrowthData.find(d => d.year === year);
    return {
      year,
      portfolioValueA: pointA?.portfolioValue ?? 0,
      portfolioValueB: pointB?.portfolioValue ?? 0,
      equityA: pointA?.equity ?? 0,
      equityB: pointB?.equity ?? 0,
      propertiesA: pointA?.properties,
      propertiesB: pointB?.properties,
    };
  });

  const cashflowData: ComparisonCashflowDataPoint[] = allYears.map(year => {
    const pointA = dataA.cashflowData.find(d => d.year === year);
    const pointB = dataB.cashflowData.find(d => d.year === year);
    return {
      year,
      cashflowA: pointA?.cashflow ?? 0,
      cashflowB: pointB?.cashflow ?? 0,
      rentalIncomeA: pointA?.rentalIncome ?? 0,
      rentalIncomeB: pointB?.rentalIncome ?? 0,
      expensesA: pointA?.expenses ?? 0,
      expensesB: pointB?.expenses ?? 0,
    };
  });

  const equityGoalYearA = dataA.portfolioGrowthData.find(d => d.equity >= equityGoal)?.year
    ? parseInt(dataA.portfolioGrowthData.find(d => d.equity >= equityGoal)!.year)
    : null;
  const equityGoalYearB = dataB.portfolioGrowthData.find(d => d.equity >= equityGoal)?.year
    ? parseInt(dataB.portfolioGrowthData.find(d => d.equity >= equityGoal)!.year)
    : null;
  const incomeGoalYearA = dataA.cashflowData.find(d => d.cashflow >= incomeGoal)?.year
    ? parseInt(dataA.cashflowData.find(d => d.cashflow >= incomeGoal)!.year)
    : null;
  const incomeGoalYearB = dataB.cashflowData.find(d => d.cashflow >= incomeGoal)?.year
    ? parseInt(dataB.cashflowData.find(d => d.cashflow >= incomeGoal)!.year)
    : null;

  return { portfolioData, cashflowData, equityGoalYearA, equityGoalYearB, incomeGoalYearA, incomeGoalYearB };
};

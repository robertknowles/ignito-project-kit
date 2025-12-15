import { useEffect } from 'react';
import { useChartDataGenerator } from './useChartDataGenerator';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useScenarioSave } from '../contexts/ScenarioSaveContext';

/**
 * This hook syncs chart data to the ScenarioSaveContext so that it's
 * included when saving scenarios. This ensures the Client Report shows
 * the exact same data as the Dashboard.
 */
export const useChartDataSync = () => {
  const { portfolioGrowthData, cashflowData } = useChartDataGenerator();
  const { profile } = useInvestmentProfile();
  const { setChartData } = useScenarioSave();

  useEffect(() => {
    // Calculate goal achievement years based on the same logic as Dashboard charts
    let equityGoalYear: number | null = null;
    let incomeGoalYear: number | null = null;

    // Find when equity goal is reached
    const equityGoalReached = portfolioGrowthData.find(d => d.equity >= (profile.equityGoal || 0));
    if (equityGoalReached) {
      equityGoalYear = parseInt(equityGoalReached.year, 10);
    }

    // Find when income/cashflow goal is reached
    const incomeGoalReached = cashflowData.find(d => d.cashflow >= (profile.cashflowGoal || 0));
    if (incomeGoalReached) {
      incomeGoalYear = parseInt(incomeGoalReached.year, 10);
    }

    // Only sync if we have actual data
    if (portfolioGrowthData.length > 0 || cashflowData.length > 0) {
      setChartData({
        portfolioGrowthData,
        cashflowData,
        equityGoalYear,
        incomeGoalYear,
      });
    }
  }, [portfolioGrowthData, cashflowData, profile.equityGoal, profile.cashflowGoal, setChartData]);
};







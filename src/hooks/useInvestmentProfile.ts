import { useState, useEffect, useMemo } from 'react';

export interface InvestmentProfileData {
  depositPool: number;
  borrowingCapacity: number;
  portfolioValue: number;
  currentDebt: number;
  annualSavings: number;
  timelineYears: number;
  equityGrowth: number;
  cashflow: number;
}

export interface CalculatedValues {
  currentUsableEquity: number;
  availableDeposit: number;
}

export const useInvestmentProfile = () => {
  const [profile, setProfile] = useState<InvestmentProfileData>({
    depositPool: 50000,
    borrowingCapacity: 500000,
    portfolioValue: 0,
    currentDebt: 0,
    annualSavings: 24000,
    timelineYears: 15,
    equityGrowth: 75,
    cashflow: 25,
  });

  // Background calculations - not displayed in UI but available for simulation engine
  const calculatedValues = useMemo((): CalculatedValues => {
    // Current Usable Equity = Current Portfolio × 0.8 - Current Debt
    const currentUsableEquity = profile.portfolioValue * 0.8 - profile.currentDebt;
    
    // Available Deposit = Deposit Pool + Usable Equity
    const availableDeposit = profile.depositPool + currentUsableEquity;

    return {
      currentUsableEquity,
      availableDeposit,
    };
  }, [profile.portfolioValue, profile.currentDebt, profile.depositPool]);

  // Log calculations for development (can be removed in production)
  useEffect(() => {
    console.log('Investment Profile Updated:', {
      profile,
      calculated: calculatedValues,
    });
  }, [profile, calculatedValues]);

  const updateProfile = (updates: Partial<InvestmentProfileData>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const handleEquityGrowthChange = (newEquityGrowth: number) => {
    updateProfile({
      equityGrowth: newEquityGrowth,
      cashflow: 100 - newEquityGrowth,
    });
  };

  const handleCashflowChange = (newCashflow: number) => {
    updateProfile({
      cashflow: newCashflow,
      equityGrowth: 100 - newCashflow,
    });
  };

  return {
    profile,
    calculatedValues,
    updateProfile,
    handleEquityGrowthChange,
    handleCashflowChange,
  };
};
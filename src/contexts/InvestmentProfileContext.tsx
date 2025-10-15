import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export interface InvestmentProfileData {
  depositPool: number;
  borrowingCapacity: number;
  portfolioValue: number;
  currentDebt: number;
  annualSavings: number;
  timelineYears: number;
  equityGoal: number; // Changed from equityGrowth percentage to dollar amount
  cashflowGoal: number; // Changed from cashflow percentage to dollar amount
  // Enhanced dynamic features
  equityFactor: number; // Factor for equity contribution to borrowing capacity (0.5-1.0)
  // NEW: Dual serviceability model
  baseSalary: number; // Annual base salary for serviceability calculations
  salaryServiceabilityMultiplier: number; // Salary multiplier for debt serviceability (typically 6.0)
  serviceabilityRatio: number; // Rental income multiplier for debt serviceability (1.0-1.2)
  // NEW: Engine fine-tuning parameters
  equityReleaseFactor: number; // Factor to slow down equity recycling (0.5-0.7)
  depositBuffer: number; // Extra cash buffer required for deposits (£30k)
  rentFactor: number; // Factor to temper rental income boost (0.7-0.8)
}

export interface CalculatedValues {
  currentUsableEquity: number;
  availableDeposit: number;
}

interface InvestmentProfileContextType {
  profile: InvestmentProfileData;
  calculatedValues: CalculatedValues;
  updateProfile: (updates: Partial<InvestmentProfileData>) => void;
  handleEquityGoalChange: (newEquityGoal: number) => void;
  handleCashflowGoalChange: (newCashflowGoal: number) => void;
}

const InvestmentProfileContext = createContext<InvestmentProfileContextType | undefined>(undefined);

interface InvestmentProfileProviderProps {
  children: ReactNode;
}

export const InvestmentProfileProvider: React.FC<InvestmentProfileProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<InvestmentProfileData>({
    depositPool: 50000,
    borrowingCapacity: 500000,
    portfolioValue: 0,
    currentDebt: 0,
    annualSavings: 24000,
    timelineYears: 15,
    equityGoal: 1000000, // Default $1M equity goal
    cashflowGoal: 50000, // Default $50k annual cashflow goal
    // Enhanced dynamic features
    equityFactor: 0.75, // 75% of usable equity can boost borrowing capacity
    // NEW: Dual serviceability model
    baseSalary: 60000, // £60,000 annual salary
    salaryServiceabilityMultiplier: 4.0, // 4x salary lending capacity (reduced from 5x)
    serviceabilityRatio: 1.2, // 120% rental income serviceability ratio (tightened)
    // NEW: Engine fine-tuning parameters
    equityReleaseFactor: 0.35, // 35% of equity available for recycling (reduced)
    depositBuffer: 40000, // £40k extra cash buffer for deposits
    rentFactor: 0.75, // 75% factor to temper rental income boost
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

  const handleEquityGoalChange = (newEquityGoal: number) => {
    updateProfile({
      equityGoal: newEquityGoal,
    });
  };

  const handleCashflowGoalChange = (newCashflowGoal: number) => {
    updateProfile({
      cashflowGoal: newCashflowGoal,
    });
  };

  const value = {
    profile,
    calculatedValues,
    updateProfile,
    handleEquityGoalChange,
    handleCashflowGoalChange,
  };

  return (
    <InvestmentProfileContext.Provider value={value}>
      {children}
    </InvestmentProfileContext.Provider>
  );
};

export const useInvestmentProfile = (): InvestmentProfileContextType => {
  const context = useContext(InvestmentProfileContext);
  if (context === undefined) {
    throw new Error('useInvestmentProfile must be used within an InvestmentProfileProvider');
  }
  return context;
};
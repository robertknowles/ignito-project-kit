import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export interface InvestmentProfileData {
  depositPool: number;
  borrowingCapacity: number;
  portfolioValue: number;
  currentDebt: number;
  annualSavings: number;
  timelineYears: number;
  equityGrowth: number;
  cashflow: number;
  // Enhanced dynamic features
  equityFactor: number; // Factor for equity contribution to borrowing capacity (0.5-1.0)
  consecutiveFailureThreshold: number; // Years of consecutive debt test failures before consolidation
  // NEW: Dual serviceability model
  baseSalary: number; // Annual base salary for serviceability calculations
  salaryServiceabilityMultiplier: number; // Salary multiplier for debt serviceability (typically 6.0)
  serviceabilityRatio: number; // Rental income multiplier for debt serviceability (1.0-1.2)
  // NEW: Engine fine-tuning parameters
  equityReleaseFactor: number; // Factor to slow down equity recycling (0.5-0.7)
  depositBuffer: number; // Extra cash buffer required for deposits (£30k)
  rentFactor: number; // Factor to temper rental income boost (0.7-0.8)
  maxConsolidations: number; // Maximum consolidations allowed per plan
  minConsolidationGap: number; // Minimum years between consolidations
  // Consolidation tracking (updated to be more flexible)
  consolidationsRemaining: number; // No longer hard-capped
  lastConsolidationYear: number;
}

export interface CalculatedValues {
  currentUsableEquity: number;
  availableDeposit: number;
}

interface InvestmentProfileContextType {
  profile: InvestmentProfileData;
  calculatedValues: CalculatedValues;
  updateProfile: (updates: Partial<InvestmentProfileData>) => void;
  handleEquityGrowthChange: (newEquityGrowth: number) => void;
  handleCashflowChange: (newCashflow: number) => void;
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
    equityGrowth: 75,
    cashflow: 25,
    // Enhanced dynamic features
    equityFactor: 0.75, // 75% of usable equity can boost borrowing capacity
    consecutiveFailureThreshold: 3, // Trigger consolidation after 3 consecutive failures
    // NEW: Dual serviceability model
    baseSalary: 60000, // £60,000 annual salary
    salaryServiceabilityMultiplier: 6.0, // 6x salary lending capacity
    serviceabilityRatio: 1.2, // 120% rental income serviceability ratio (tightened)
    // NEW: Engine fine-tuning parameters
    equityReleaseFactor: 0.4, // 40% of equity available for recycling (reduced)
    depositBuffer: 30000, // £30k extra cash buffer for deposits
    rentFactor: 0.75, // 75% factor to temper rental income boost
    maxConsolidations: 3, // Maximum 3 consolidations per plan
    minConsolidationGap: 5, // Minimum 5 years between consolidations
    // Flexible consolidation tracking
    consolidationsRemaining: 99, // Effectively unlimited
    lastConsolidationYear: 0,
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

  const value = {
    profile,
    calculatedValues,
    updateProfile,
    handleEquityGrowthChange,
    handleCashflowChange,
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
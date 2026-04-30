import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import type { GrowthCurve } from '../types/property';

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
  depositBuffer: number; // Extra cash buffer required for deposits ($30k)
  rentFactor: number; // Factor to temper rental income boost (0.7-0.8)
  // NEW: Growth curve
  growthCurve: GrowthCurve; // Tiered growth (default matches Medium tier per 2026-04-30 calibration)
  // NEW: Advanced portfolio settings
  useExistingEquity: boolean; // Toggle for existing equity in purchases (default: true)
  maxPurchasesPerYear: number; // Annual purchase cap (default: 3, range: 1-4)
  existingPortfolioGrowthRate: number; // Growth rate for mature properties as decimal (default: 0.05 = 5%, matches Gameplans)
  // NEW: Financial Freedom projection
  targetPassiveIncome: number; // Annual passive income target for "freedom" (default: $80,000)
  ioToPiTransitionYears: number; // Years after last purchase to switch IO→P&I (default: 5)
  /**
   * Strategic preset selected by the BA. Drives chatbot cell selection and
   * property sequencing per the 10-cell matrix.
   */
  strategyPreset: 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition';
  /**
   * Internal pacing lever — tier-links across ~9 dials (multiplier, savings
   * deployment, equity release, vacancy, BC factor, rental contribution,
   * equity factor, max purchases, low-tier LVR). Default 'aggressive' for
   * 4 of 5 presets (sales tool: ambitious-but-achievable). cf-high default
   * 'moderate' (Property Couch retire-on-yield is a fundamentally
   * conservative thesis). BA can override via chat hint
   * ("let's be conservative" / "go aggressive").
   */
  pacingMode: 'conservative' | 'moderate' | 'aggressive';
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
  // Bulk setter for scenario restoration
  setProfile: (profile: InvestmentProfileData) => void;
}

const InvestmentProfileContext = createContext<InvestmentProfileContextType | undefined>(undefined);

interface InvestmentProfileProviderProps {
  children: ReactNode;
}

/**
 * Default investment profile shape. Used as the initial state for the
 * provider AND as the reset target when a client switch leaves no saved
 * scenario in Supabase (see ScenarioSaveContext.loadClientScenario).
 */
export const INITIAL_INVESTMENT_PROFILE: InvestmentProfileData = {
  depositPool: 50000,
  borrowingCapacity: 500000,
  portfolioValue: 0,
  currentDebt: 0,
  annualSavings: 24000,
  timelineYears: 15,
  equityGoal: 1000000, // Default $1M equity goal
  cashflowGoal: 50000, // Default $50k annual cashflow goal
  // Enhanced dynamic features
  // Aggressive default. Tier-link: Conservative 0.65 / Moderate 0.75 / Aggressive 0.80
  equityFactor: 0.80,
  // Dual serviceability model
  baseSalary: 60000,
  // Aggressive default. Tier-link: Conservative 4.0 / Moderate 5.0 / Aggressive 6.0
  // APRA-derived "max borrowing ~5–6× gross household income" consensus across
  // Henderson, PK Gupta, Paliwal sources.
  salaryServiceabilityMultiplier: 6.0,
  serviceabilityRatio: 1.2,
  // Engine fine-tuning parameters (Aggressive Pacing defaults).
  // Tier-link: equityReleaseFactor Conservative 0.35 / Moderate 0.50 / Aggressive 0.70
  // depositBuffer = max($5k, 6 × monthly holding cost) at runtime; $5k is the absolute floor.
  equityReleaseFactor: 0.70, // recycle 70% of extractable equity
  depositBuffer: 5000,       // floor; engine derives 6-month-of-holding-cost target above this
  rentFactor: 0.75,
  // Growth curve — matches GROWTH_RATE_TIERS.Medium (Gameplans-replication
  // calibration 2026-04-30). Previous default was the High tier curve
  // (12.5/10/7.5/6) which was inappropriate as the universal fallback.
  growthCurve: {
    year1: 6,
    years2to3: 5.5,
    year4: 5,
    year5plus: 5,
  },
  // Advanced portfolio settings
  useExistingEquity: true,
  maxPurchasesPerYear: 3,
  existingPortfolioGrowthRate: 0.05,
  // Financial Freedom projection
  targetPassiveIncome: 80000,
  ioToPiTransitionYears: 5,
  strategyPreset: 'eg-low',
  pacingMode: 'aggressive',
};

export const InvestmentProfileProvider: React.FC<InvestmentProfileProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<InvestmentProfileData>({ ...INITIAL_INVESTMENT_PROFILE });

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

  // Bulk setter for scenario restoration - replaces entire profile
  const setProfileFull = (newProfile: InvestmentProfileData) => {
    setProfile({ ...newProfile });
  };

  const value = {
    profile,
    calculatedValues,
    updateProfile,
    handleEquityGoalChange,
    handleCashflowGoalChange,
    setProfile: setProfileFull,
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
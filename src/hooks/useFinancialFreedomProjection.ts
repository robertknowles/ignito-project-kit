import { useMemo } from 'react';
import type { PortfolioGrowthDataPoint, CashflowDataPoint } from './useChartDataGenerator';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import type { TimelineProperty } from '../types/property';
import {
  DEFAULT_INTEREST_RATE,
  DEFAULT_GROWTH_RATE,
  ANNUAL_INFLATION_RATE,
  BASE_YEAR,
} from '../constants/financialParams';

export interface FreedomYearData {
  year: number;
  netCashflow: number;        // Annual net cashflow (income - expenses - loan payments)
  totalDebt: number;          // Remaining debt balance
  rentalIncome: number;       // Annual rental income
  totalExpenses: number;      // Annual expenses (ex-loan)
  loanPayments: number;       // Annual loan payments (IO or P&I)
  portfolioValue: number;     // Total portfolio value
  isPiPhase: boolean;         // Whether this year is in P&I phase
}

export interface Milestone {
  year: number;
  label: string;
  type: 'transition' | 'positive' | 'freedom' | 'debt-free';
}

export interface FinancialFreedomProjection {
  freedomYear: number | null;          // Year when net cashflow >= target, null if never
  freedomYearIndex: number | null;     // How many years from now
  yearlyData: FreedomYearData[];       // 30-year projection data
  milestones: Milestone[];             // Key milestone events
  piTransitionYear: number | null;     // Year IO→P&I switch happens
  debtFreeYear: number | null;         // Year debt reaches zero
  cashflowPositiveYear: number | null; // First year net cashflow > 0
}

interface UseFinancialFreedomProjectionProps {
  portfolioGrowthData: PortfolioGrowthDataPoint[];
  cashflowData: CashflowDataPoint[];
  profile: InvestmentProfileData;
  timelineProperties: TimelineProperty[];
}

/**
 * Projects financial freedom timeline beyond the accumulation phase.
 *
 * Models:
 * - IO loans during accumulation + transition buffer
 * - P&I amortization after ioToPiTransitionYears from last purchase
 * - Rent growing with property value, expenses with inflation
 * - Finds the year where net passive income >= targetPassiveIncome
 */
export function useFinancialFreedomProjection({
  portfolioGrowthData,
  cashflowData,
  profile,
  timelineProperties,
}: UseFinancialFreedomProjectionProps): FinancialFreedomProjection {
  return useMemo(() => {
    const PROJECTION_YEARS = 30;
    const PI_LOAN_TERM_YEARS = 25; // Remaining P&I term

    const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible');

    // If no properties, return empty projection
    if (feasibleProperties.length === 0 || portfolioGrowthData.length === 0) {
      return {
        freedomYear: null,
        freedomYearIndex: null,
        yearlyData: [],
        milestones: [],
        piTransitionYear: null,
        debtFreeYear: null,
        cashflowPositiveYear: null,
      };
    }

    // Find the last purchase year
    const lastPurchaseYear = Math.max(
      ...feasibleProperties.map(p => p.affordableYear)
    );

    // P&I transition year
    const piTransitionYear = lastPurchaseYear + profile.ioToPiTransitionYears;

    // Get end-of-accumulation snapshot from chart data
    const finalPortfolioPoint = portfolioGrowthData[portfolioGrowthData.length - 1];
    const finalCashflowPoint = cashflowData[cashflowData.length - 1];

    if (!finalPortfolioPoint || !finalCashflowPoint) {
      return {
        freedomYear: null,
        freedomYearIndex: null,
        yearlyData: [],
        milestones: [],
        piTransitionYear,
        debtFreeYear: null,
        cashflowPositiveYear: null,
      };
    }

    // Snapshot at end of timeline
    const accumulationEndYear = BASE_YEAR + profile.timelineYears - 1;
    let currentDebt = finalPortfolioPoint.totalDebt ?? 0;
    let currentPortfolioValue = finalPortfolioPoint.portfolioValue;
    let currentRentalIncome = finalCashflowPoint.rentalIncome;
    let currentExpenses = finalCashflowPoint.expenses;
    let currentLoanPayments = finalCashflowPoint.loanRepayments;

    const interestRate = DEFAULT_INTEREST_RATE;
    const growthRate = DEFAULT_GROWTH_RATE;

    // Calculate P&I annual payment once debt transitions
    // Using standard amortization formula: P = L * [r(1+r)^n] / [(1+r)^n - 1]
    const calcPiPayment = (principal: number, rate: number, years: number): number => {
      if (principal <= 0 || years <= 0) return 0;
      const r = rate; // annual rate
      const n = years;
      const factor = Math.pow(1 + r, n);
      return principal * (r * factor) / (factor - 1);
    };

    const yearlyData: FreedomYearData[] = [];
    const milestones: Milestone[] = [];
    let freedomYear: number | null = null;
    let debtFreeYear: number | null = null;
    let cashflowPositiveYear: number | null = null;
    let piPaymentStartDebt = 0; // Debt at P&I transition for amortization calc
    let annualPiPayment = 0;
    let piYearsElapsed = 0;

    for (let i = 0; i < PROJECTION_YEARS; i++) {
      const year = accumulationEndYear + 1 + i;
      const yearsFromNow = year - BASE_YEAR;
      const isPiPhase = year >= piTransitionYear;

      // Grow portfolio value and rental income
      if (i > 0) {
        currentPortfolioValue *= (1 + growthRate);
        currentRentalIncome *= (1 + growthRate);
        currentExpenses *= (1 + ANNUAL_INFLATION_RATE);
      }

      // Handle IO→P&I transition
      if (isPiPhase) {
        if (piPaymentStartDebt === 0 && currentDebt > 0) {
          // First year of P&I — calculate payment based on remaining debt
          piPaymentStartDebt = currentDebt;
          annualPiPayment = calcPiPayment(piPaymentStartDebt, interestRate, PI_LOAN_TERM_YEARS);
        }

        if (currentDebt > 0 && annualPiPayment > 0) {
          piYearsElapsed++;
          const interestPortion = currentDebt * interestRate;
          const principalPortion = Math.min(annualPiPayment - interestPortion, currentDebt);
          currentDebt = Math.max(0, currentDebt - principalPortion);
          currentLoanPayments = annualPiPayment;
        } else {
          currentLoanPayments = 0;
        }
      } else {
        // IO phase — interest only, debt stays constant
        currentLoanPayments = currentDebt * interestRate;
      }

      const netCashflow = currentRentalIncome - currentExpenses - currentLoanPayments;

      yearlyData.push({
        year,
        netCashflow: Math.round(netCashflow),
        totalDebt: Math.round(currentDebt),
        rentalIncome: Math.round(currentRentalIncome),
        totalExpenses: Math.round(currentExpenses),
        loanPayments: Math.round(currentLoanPayments),
        portfolioValue: Math.round(currentPortfolioValue),
        isPiPhase,
      });

      // Detect milestones
      if (year === piTransitionYear) {
        milestones.push({ year, label: 'IO → P&I transition', type: 'transition' });
      }

      if (cashflowPositiveYear === null && netCashflow > 0) {
        cashflowPositiveYear = year;
        milestones.push({ year, label: 'Cashflow positive', type: 'positive' });
      }

      if (freedomYear === null && netCashflow >= profile.targetPassiveIncome) {
        freedomYear = year;
        milestones.push({ year, label: 'Financial freedom', type: 'freedom' });
      }

      if (debtFreeYear === null && currentDebt <= 0 && piPaymentStartDebt > 0) {
        debtFreeYear = year;
        milestones.push({ year, label: 'Debt free', type: 'debt-free' });
      }
    }

    return {
      freedomYear,
      freedomYearIndex: freedomYear ? freedomYear - BASE_YEAR : null,
      yearlyData,
      milestones,
      piTransitionYear,
      debtFreeYear,
      cashflowPositiveYear,
    };
  }, [portfolioGrowthData, cashflowData, profile, timelineProperties]);
}

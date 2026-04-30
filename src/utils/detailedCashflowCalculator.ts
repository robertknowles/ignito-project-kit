import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { DEFAULT_VACANCY_RATE } from '../constants/financialParams';

export interface CashflowBreakdown {
  // Income
  weeklyRent: number;
  grossAnnualIncome: number;
  vacancyAmount: number;
  adjustedIncome: number;

  // Expenses
  loanInterest: number;
  propertyManagementFee: number;
  buildingInsurance: number;
  councilRatesWater: number;
  strata: number;
  maintenance: number;
  totalOperatingExpenses: number;

  // Non-deductible
  landTax: number;
  principalPayments: number;
  totalNonDeductibleExpenses: number;

  // Deductions (kept on the breakdown for backward compatibility — always 0 now)
  potentialDeductions: number;

  // Net
  netAnnualCashflow: number;
  netMonthlyCashflow: number;
  netWeeklyCashflow: number;
}

/**
 * Calculate detailed cashflow breakdown for a property instance
 */
export function calculateDetailedCashflow(
  property: PropertyInstanceDetails,
  loanAmount: number
): CashflowBreakdown {
  // Income — vacancy honours per-instance override (set via PropertyDetailPanel
  // slider) when available, falling back to global DEFAULT_VACANCY_RATE.
  // Per-instance vacancyRate is stored as a percentage (e.g. 4 for 4%);
  // DEFAULT_VACANCY_RATE is stored as a decimal (e.g. 0.04). Normalise.
  const weeklyRent = property.rentPerWeek;
  const grossAnnualIncome = weeklyRent * 52;
  const effectiveVacancyRate = (property.vacancyRate !== undefined && property.vacancyRate !== null && property.vacancyRate >= 0)
    ? property.vacancyRate / 100
    : DEFAULT_VACANCY_RATE;
  const vacancyAmount = grossAnnualIncome * effectiveVacancyRate;
  const adjustedIncome = grossAnnualIncome - vacancyAmount;

  // Expenses
  const loanInterest = loanAmount * (property.interestRate / 100);
  const propertyManagementFee = adjustedIncome * (property.propertyManagementPercent / 100);
  const buildingInsurance = property.buildingInsuranceAnnual;
  const councilRatesWater = property.councilRatesWater;
  const strata = property.strata;
  const maintenance = property.maintenanceAllowanceAnnual;

  const totalOperatingExpenses =
    loanInterest +
    propertyManagementFee +
    buildingInsurance +
    councilRatesWater +
    strata +
    maintenance;

  // Non-deductible (will be calculated by other utilities)
  const landTax = property.landTaxOverride ?? 0; // Will be calculated by landTaxCalculator
  const principalPayments = property.loanProduct === 'PI'
    ? calculatePrincipalPayment(loanAmount, property.interestRate, property.loanTerm)
    : 0;

  const totalNonDeductibleExpenses = landTax + principalPayments;

  const potentialDeductions = 0;

  // Net cashflow
  const netAnnualCashflow = adjustedIncome - totalOperatingExpenses - totalNonDeductibleExpenses;
  const netMonthlyCashflow = netAnnualCashflow / 12;
  const netWeeklyCashflow = netAnnualCashflow / 52;

  return {
    weeklyRent,
    grossAnnualIncome,
    vacancyAmount,
    adjustedIncome,
    loanInterest,
    propertyManagementFee,
    buildingInsurance,
    councilRatesWater,
    strata,
    maintenance,
    totalOperatingExpenses,
    landTax,
    principalPayments,
    totalNonDeductibleExpenses,
    potentialDeductions,
    netAnnualCashflow,
    netMonthlyCashflow,
    netWeeklyCashflow,
  };
}

/**
 * Calculate annual principal payment for P&I loan
 */
function calculatePrincipalPayment(
  loanAmount: number,
  annualInterestRate: number,
  loanTermYears: number
): number {
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  
  // Monthly payment formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  const annualPayment = monthlyPayment * 12;
  const annualInterest = loanAmount * (annualInterestRate / 100);
  const annualPrincipal = annualPayment - annualInterest;
  
  return annualPrincipal;
}




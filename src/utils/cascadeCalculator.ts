import type { PropertyInstanceDetails } from '../types/propertyInstance';

export interface CascadeState {
  availableFunds: number;
  borrowingCapacity: number;
  portfolioValue: number;
  totalDebt: number;
  totalEquity: number;
}

/**
 * Calculate how property N affects available resources for property N+1
 */
export function calculateCascadeEffect(
  previousState: CascadeState,
  propertyNetCashflow: number,
  propertyValue: number,
  propertyLoanAmount: number,
  totalCashRequired: number,
  equityReleaseFactor: number
): CascadeState {
  // Update available funds
  // Funds decrease by cash required, increase by net cashflow
  const newAvailableFunds = previousState.availableFunds - totalCashRequired + propertyNetCashflow;
  
  // Update portfolio value
  const newPortfolioValue = previousState.portfolioValue + propertyValue;
  
  // Update total debt
  const newTotalDebt = previousState.totalDebt + propertyLoanAmount;
  
  // Update total equity
  const newTotalEquity = newPortfolioValue - newTotalDebt;
  
  // Calculate usable equity (can be recycled for next purchase)
  const usableEquity = newTotalEquity * equityReleaseFactor;
  
  // Borrowing capacity decreases by loan amount used
  const newBorrowingCapacity = previousState.borrowingCapacity - propertyLoanAmount;
  
  return {
    availableFunds: newAvailableFunds + usableEquity, // Funds + equity available for next property
    borrowingCapacity: newBorrowingCapacity,
    portfolioValue: newPortfolioValue,
    totalDebt: newTotalDebt,
    totalEquity: newTotalEquity,
  };
}

/**
 * Initialize cascade state from investment profile
 */
export function initializeCascadeState(
  depositPool: number,
  borrowingCapacity: number
): CascadeState {
  return {
    availableFunds: depositPool,
    borrowingCapacity: borrowingCapacity,
    portfolioValue: 0,
    totalDebt: 0,
    totalEquity: 0,
  };
}


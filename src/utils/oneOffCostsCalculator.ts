import type { PropertyInstanceDetails } from '../types/propertyInstance';

export interface OneOffCosts {
  // Engagement
  engagementFee: number;
  engagementTotal: number;
  
  // Exchange
  conditionalHoldingDeposit: number;
  buildingInsuranceUpfront: number;
  buildingPestInspection: number;
  plumbingElectricalInspections: number;
  independentValuation: number;
  exchangeTotal: number;
  
  // Unconditional
  unconditionalHoldingDeposit: number;
  unconditionalTotal: number;
  
  // Settlement
  depositBalance: number;
  stampDuty: number;
  mortgageFees: number;
  conveyancing: number;
  ratesAdjustment: number;
  settlementTotal: number;
  
  // Post-settlement
  maintenanceAllowancePostSettlement: number;
  postSettlementTotal: number;
  
  // Totals
  totalCashRequired: number;
}

/**
 * Calculate all one-off purchase costs
 */
export function calculateOneOffCosts(
  property: PropertyInstanceDetails,
  stampDuty: number,
  depositBalance: number
): OneOffCosts {
  // Engagement
  const engagementFee = property.engagementFee;
  const engagementTotal = engagementFee;
  
  // Exchange
  const conditionalHoldingDeposit = property.conditionalHoldingDeposit;
  const buildingInsuranceUpfront = property.buildingInsuranceUpfront;
  const buildingPestInspection = property.buildingPestInspection;
  const plumbingElectricalInspections = property.plumbingElectricalInspections;
  const independentValuation = property.independentValuation;
  const exchangeTotal = 
    conditionalHoldingDeposit +
    buildingInsuranceUpfront +
    buildingPestInspection +
    plumbingElectricalInspections +
    independentValuation;
  
  // Unconditional
  const unconditionalHoldingDeposit = property.unconditionalHoldingDeposit;
  const unconditionalTotal = unconditionalHoldingDeposit;
  
  // Settlement
  const mortgageFees = property.mortgageFees;
  const conveyancing = property.conveyancing;
  const ratesAdjustment = property.ratesAdjustment;
  const settlementTotal = 
    depositBalance +
    stampDuty +
    mortgageFees +
    conveyancing +
    ratesAdjustment;
  
  // Post-settlement
  const maintenanceAllowancePostSettlement = property.maintenanceAllowancePostSettlement;
  const postSettlementTotal = maintenanceAllowancePostSettlement;
  
  // Total
  const totalCashRequired = 
    engagementTotal +
    exchangeTotal +
    unconditionalTotal +
    settlementTotal +
    postSettlementTotal;
  
  return {
    engagementFee,
    engagementTotal,
    conditionalHoldingDeposit,
    buildingInsuranceUpfront,
    buildingPestInspection,
    plumbingElectricalInspections,
    independentValuation,
    exchangeTotal,
    unconditionalHoldingDeposit,
    unconditionalTotal,
    depositBalance,
    stampDuty,
    mortgageFees,
    conveyancing,
    ratesAdjustment,
    settlementTotal,
    maintenanceAllowancePostSettlement,
    postSettlementTotal,
    totalCashRequired,
  };
}

/**
 * Calculate deposit balance (total deposit - deposits already paid)
 */
export function calculateDepositBalance(
  purchasePrice: number,
  lvr: number,
  conditionalDeposit: number,
  unconditionalDeposit: number
): number {
  const totalDepositPercent = 100 - lvr;
  const totalDeposit = purchasePrice * (totalDepositPercent / 100);
  const depositsPaid = conditionalDeposit + unconditionalDeposit;
  return totalDeposit - depositsPaid;
}





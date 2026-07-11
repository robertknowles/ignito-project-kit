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

  // Settlement
  depositBalance: number;
  stampDuty: number;
  mortgageFees: number;
  conveyancing: number;
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
  // "Purchase Costs" override (purchases table) replaces the six fee/inspection
  // components as a lump sum - deposit, stamp duty, holding deposit, independent
  // valuation and post-settlement maintenance sit outside it, matching the
  // table's rolled-up column. Scale the parts proportionally so itemised views
  // and totalCashRequired reflect the edited figure.
  const computedFees =
    property.engagementFee +
    property.buildingPestInspection +
    property.plumbingElectricalInspections +
    property.buildingInsuranceUpfront +
    property.mortgageFees +
    property.conveyancing;
  const feeScale =
    property.purchaseCostsOverride != null && computedFees > 0
      ? property.purchaseCostsOverride / computedFees
      : 1;

  // Engagement
  const engagementFee = property.engagementFee * feeScale;
  const engagementTotal = engagementFee;

  // Exchange
  const conditionalHoldingDeposit = property.conditionalHoldingDeposit;
  const buildingInsuranceUpfront = property.buildingInsuranceUpfront * feeScale;
  const buildingPestInspection = property.buildingPestInspection * feeScale;
  const plumbingElectricalInspections = property.plumbingElectricalInspections * feeScale;
  const independentValuation = property.independentValuation;
  const exchangeTotal =
    conditionalHoldingDeposit +
    buildingInsuranceUpfront +
    buildingPestInspection +
    plumbingElectricalInspections +
    independentValuation;

  // Settlement
  const mortgageFees = property.mortgageFees * feeScale;
  const conveyancing = property.conveyancing * feeScale;
  const settlementTotal = depositBalance + stampDuty + mortgageFees + conveyancing;

  // Post-settlement
  const maintenanceAllowancePostSettlement = property.maintenanceAllowancePostSettlement;
  const postSettlementTotal = maintenanceAllowancePostSettlement;

  // Total
  const totalCashRequired =
    engagementTotal +
    exchangeTotal +
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
    depositBalance,
    stampDuty,
    mortgageFees,
    conveyancing,
    settlementTotal,
    maintenanceAllowancePostSettlement,
    postSettlementTotal,
    totalCashRequired,
  };
}

/**
 * Calculate deposit balance (total deposit - conditional deposit already paid)
 */
export function calculateDepositBalance(
  purchasePrice: number,
  lvr: number,
  conditionalDeposit: number
): number {
  const totalDepositPercent = 100 - lvr;
  const totalDeposit = purchasePrice * (totalDepositPercent / 100);
  return totalDeposit - conditionalDeposit;
}






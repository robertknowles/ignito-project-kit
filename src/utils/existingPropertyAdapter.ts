import type { ExistingProperty } from '../types/existingProperty';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { BASE_YEAR } from '../constants/financialParams';

export interface ExistingPropertyEngineEntry {
  instanceId: string;
  title: string;
  cost: number;
  growthBasis: number;
  loanAmount: number;
  affordableYear: number;
  status: 'feasible';
  isExisting: true;
}

export function convertExistingToInstance(
  ep: ExistingProperty,
  profileInterestRate: number = 0.0625,
): PropertyInstanceDetails {
  return {
    state: ep.state,
    purchasePrice: ep.purchasePrice || ep.currentValue,
    valuationAtPurchase: ep.currentValue,
    rentPerWeek: ep.rentPerWeek,
    growthAssumption: ep.growthAssumption ?? 'Medium',
    lvr: ep.currentValue > 0 ? (ep.loan / ep.currentValue) * 100 : 80,
    lmiWaiver: true,
    loanProduct: ep.loanType,
    interestRate: ep.interestRate || profileInterestRate * 100,
    loanTerm: ep.loanTerm ?? 30,
    engagementFee: ep.baFee ?? 0,
    conditionalHoldingDeposit: 0,
    buildingInsuranceUpfront: 0,
    buildingPestInspection: ep.buildingPest ?? 0,
    plumbingElectricalInspections: 0,
    independentValuation: 0,
    mortgageFees: 0,
    conveyancing: ep.legals ?? 0,
    maintenanceAllowancePostSettlement: 0,
    stampDutyOverride: ep.stampDuty ?? null,
    propertyManagementPercent: ep.propertyMgmtPercent ?? 0,
    buildingInsuranceAnnual: ep.insurance ?? 0,
    councilRatesWater: ep.councilWater ?? 0,
    strata: ep.strata ?? 0,
    maintenanceAllowanceAnnual: ep.maintenance ?? 0,
    landTaxOverride: null,
    vacancyRate: ep.vacancyRate,
    saleYear: ep.saleYear,
  };
}

export function convertExistingToEngineEntry(
  ep: ExistingProperty,
): ExistingPropertyEngineEntry {
  return {
    instanceId: ep.id,
    title: ep.address || `${ep.state} ${ep.boughtYear || 'Existing'}`,
    cost: ep.purchasePrice || ep.currentValue,
    growthBasis: ep.currentValue,
    loanAmount: ep.loan,
    affordableYear: ep.boughtYear || BASE_YEAR,
    status: 'feasible',
    isExisting: true,
  };
}

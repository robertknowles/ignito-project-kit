import { EQUITY_EXTRACTION_LVR_CAP } from '../constants/financialParams';

export const calcAnnualRent = (rentPerWeek: number): number =>
  rentPerWeek * 52;

export const calcGrossYield = (rentPerWeek: number, purchasePrice: number): number =>
  purchasePrice > 0 ? (rentPerWeek * 52 / purchasePrice) * 100 : 0;

export const calcLoanAmount = (purchasePrice: number, lvr: number): number =>
  purchasePrice * (lvr / 100);

export const calcDeposit = (purchasePrice: number, lvr: number): number =>
  purchasePrice * ((100 - lvr) / 100);

export const calcReleasableEquity = (
  propertyValue: number,
  debt: number,
  lvrCap: number = EQUITY_EXTRACTION_LVR_CAP,
): number => Math.max(0, propertyValue * lvrCap - debt);

export const calcMonthlyFromAnnual = (annual: number): number =>
  annual / 12;

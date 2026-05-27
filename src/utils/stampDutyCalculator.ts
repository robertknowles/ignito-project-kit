/**
 * Stamp duty / transfer duty calculator — investor (non-owner-occupier) rates.
 * Last verified: 2026-05-27 against each state revenue office.
 *
 * Sources:
 *   QLD — https://qro.qld.gov.au/duties/transfer-duty/calculate/rates/
 *   NSW — https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty (2025-26 indexed)
 *   VIC — https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates/land-transfer-duty-non-principal-place-residence-current-rates
 *   SA  — https://www.revenuesa.sa.gov.au/stamp-duty-land/rate-of-stamp-duty
 *   WA  — https://apps.osr.wa.gov.au/portal/0/calculators/transferduty
 *   TAS — https://www.service.tas.gov.au/services/housing-and-property/rates-land-tax-and-duty/calculate-property-transfer-duty/
 *   NT  — https://treasury.nt.gov.au/dtf/territory-revenue-office/stamp-duty/stamp-duty-calculators
 *   ACT — https://www.revenue.act.gov.au/rates-and-property-charges/conveyance-duty-stamp-duty/conveyance-duty-for-non-commercial-property
 *
 * TODO: Foreign buyer surcharges not implemented (QLD/NSW/VIC/SA/WA/TAS have surcharges; ACT/NT do not).
 * Users can override via stampDutyOverride field.
 */
export function calculateStampDuty(
  state: string,
  purchasePrice: number,
  isFirstHomeBuyer: boolean = false
): number {
  switch (state.toUpperCase()) {
    case 'VIC': return calculateStampDutyVIC(purchasePrice);
    case 'NSW': return calculateStampDutyNSW(purchasePrice);
    case 'QLD': return calculateStampDutyQLD(purchasePrice);
    case 'SA':  return calculateStampDutySA(purchasePrice);
    case 'WA':  return calculateStampDutyWA(purchasePrice);
    case 'TAS': return calculateStampDutyTAS(purchasePrice);
    case 'NT':  return calculateStampDutyNT(purchasePrice);
    case 'ACT': return calculateStampDutyACT(purchasePrice);
    default: return 0;
  }
}

function calculateStampDutyVIC(price: number): number {
  if (price <= 25000) return price * 0.014;
  if (price <= 130000) return 350 + (price - 25000) * 0.024;
  if (price <= 960000) return 2870 + (price - 130000) * 0.06;
  if (price <= 2000000) return price * 0.055;
  return 110000 + (price - 2000000) * 0.065;
}

function calculateStampDutyNSW(price: number): number {
  if (price <= 17000) return price * 0.0125;
  if (price <= 37000) return 212 + (price - 17000) * 0.015;
  if (price <= 99000) return 512 + (price - 37000) * 0.0175;
  if (price <= 372000) return 1597 + (price - 99000) * 0.035;
  if (price <= 1240000) return 11152 + (price - 372000) * 0.045;
  if (price <= 3721000) return 50212 + (price - 1240000) * 0.055;
  return 186667 + (price - 3721000) * 0.07;
}

function calculateStampDutyQLD(price: number): number {
  if (price <= 5000) return 0;
  if (price <= 75000) return (price - 5000) * 0.015;
  if (price <= 540000) return 1050 + (price - 75000) * 0.035;
  if (price <= 1000000) return 17325 + (price - 540000) * 0.045;
  return 38025 + (price - 1000000) * 0.0575;
}

function calculateStampDutySA(price: number): number {
  if (price <= 12000) return price * 0.01;
  if (price <= 30000) return 120 + (price - 12000) * 0.02;
  if (price <= 50000) return 480 + (price - 30000) * 0.03;
  if (price <= 100000) return 1080 + (price - 50000) * 0.035;
  if (price <= 200000) return 2830 + (price - 100000) * 0.04;
  if (price <= 250000) return 6830 + (price - 200000) * 0.0425;
  if (price <= 300000) return 8955 + (price - 250000) * 0.0475;
  if (price <= 500000) return 11330 + (price - 300000) * 0.05;
  return 21330 + (price - 500000) * 0.055;
}

function calculateStampDutyWA(price: number): number {
  if (price <= 120000) return price * 0.019;
  if (price <= 150000) return 2280 + (price - 120000) * 0.0285;
  if (price <= 360000) return 3135 + (price - 150000) * 0.038;
  if (price <= 725000) return 11115 + (price - 360000) * 0.0475;
  return 28453 + (price - 725000) * 0.0515;
}

function calculateStampDutyTAS(price: number): number {
  if (price <= 3000) return 50;
  if (price <= 25000) return 50 + (price - 3000) * 0.0175;
  if (price <= 75000) return 435 + (price - 25000) * 0.0225;
  if (price <= 200000) return 1560 + (price - 75000) * 0.035;
  if (price <= 375000) return 5935 + (price - 200000) * 0.04;
  if (price <= 725000) return 12935 + (price - 375000) * 0.0425;
  return 27810 + (price - 725000) * 0.045;
}

function calculateStampDutyNT(price: number): number {
  if (price <= 525000) {
    const v = price / 1000;
    return v * v * 0.06571441 * 0.06571441 * 15;
  }
  if (price <= 3000000) return price * 0.0495;
  if (price <= 5000000) return price * 0.0575;
  return price * 0.0595;
}

function calculateStampDutyACT(price: number): number {
  if (price <= 200000) return Math.max(20, price * 0.012);
  if (price <= 300000) return 2400 + (price - 200000) * 0.022;
  if (price <= 500000) return 4600 + (price - 300000) * 0.034;
  if (price <= 750000) return 11400 + (price - 500000) * 0.0432;
  if (price <= 1000000) return 22200 + (price - 750000) * 0.059;
  if (price <= 1455000) return 36950 + (price - 1000000) * 0.064;
  return price * 0.0454;
}

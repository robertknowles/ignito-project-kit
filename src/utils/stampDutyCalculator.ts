/**
 * Calculate stamp duty based on state and purchase price
 * Note: These are simplified calculations. Users can override via stampDutyOverride field.
 */
export function calculateStampDuty(
  state: string,
  purchasePrice: number,
  isFirstHomeBuyer: boolean = false
): number {
  switch (state.toUpperCase()) {
    case 'VIC':
      return calculateStampDutyVIC(purchasePrice, isFirstHomeBuyer);
    case 'NSW':
      return calculateStampDutyNSW(purchasePrice, isFirstHomeBuyer);
    case 'QLD':
      return calculateStampDutyQLD(purchasePrice, isFirstHomeBuyer);
    case 'SA':
      return calculateStampDutySA(purchasePrice, isFirstHomeBuyer);
    case 'WA':
      return calculateStampDutyWA(purchasePrice, isFirstHomeBuyer);
    case 'TAS':
      return calculateStampDutyTAS(purchasePrice, isFirstHomeBuyer);
    case 'NT':
      return calculateStampDutyNT(purchasePrice, isFirstHomeBuyer);
    case 'ACT':
      return calculateStampDutyACT(purchasePrice, isFirstHomeBuyer);
    default:
      return 0;
  }
}

function calculateStampDutyVIC(purchasePrice: number, isFirstHomeBuyer: boolean): number {
  if (purchasePrice <= 25000) {
    return purchasePrice * 0.014;
  } else if (purchasePrice <= 130000) {
    return 350 + (purchasePrice - 25000) * 0.024;
  } else if (purchasePrice <= 960000) {
    return 2870 + (purchasePrice - 130000) * 0.06;
  } else {
    return 52670 + (purchasePrice - 960000) * 0.055;
  }
}

function calculateStampDutyNSW(purchasePrice: number, isFirstHomeBuyer: boolean): number {
  if (purchasePrice <= 14000) return purchasePrice * 0.0125;
  if (purchasePrice <= 32000) return 175 + (purchasePrice - 14000) * 0.015;
  if (purchasePrice <= 85000) return 445 + (purchasePrice - 32000) * 0.0175;
  if (purchasePrice <= 319000) return 1372.50 + (purchasePrice - 85000) * 0.035;
  if (purchasePrice <= 1064000) return 9562.50 + (purchasePrice - 319000) * 0.045;
  return 43072.50 + (purchasePrice - 1064000) * 0.055;
}

function calculateStampDutyQLD(purchasePrice: number, isFirstHomeBuyer: boolean): number {
  if (purchasePrice <= 5000) return 0;
  if (purchasePrice <= 75000) return (purchasePrice - 5000) * 0.015;
  if (purchasePrice <= 540000) return 1050 + (purchasePrice - 75000) * 0.035;
  if (purchasePrice <= 1000000) return 17325 + (purchasePrice - 540000) * 0.045;
  return 38025 + (purchasePrice - 1000000) * 0.0575;
}

function calculateStampDutySA(purchasePrice: number, isFirstHomeBuyer: boolean): number {
  if (purchasePrice <= 12000) return purchasePrice * 0.01;
  if (purchasePrice <= 30000) return 120 + (purchasePrice - 12000) * 0.02;
  if (purchasePrice <= 50000) return 480 + (purchasePrice - 30000) * 0.03;
  if (purchasePrice <= 100000) return 1080 + (purchasePrice - 50000) * 0.035;
  if (purchasePrice <= 200000) return 2830 + (purchasePrice - 100000) * 0.04;
  if (purchasePrice <= 250000) return 6830 + (purchasePrice - 200000) * 0.0425;
  if (purchasePrice <= 300000) return 8955 + (purchasePrice - 250000) * 0.045;
  if (purchasePrice <= 500000) return 11205 + (purchasePrice - 300000) * 0.0475;
  return 20705 + (purchasePrice - 500000) * 0.055;
}

function calculateStampDutyWA(purchasePrice: number, isFirstHomeBuyer: boolean): number {
  if (purchasePrice <= 120000) return purchasePrice * 0.019;
  if (purchasePrice <= 150000) return 2280 + (purchasePrice - 120000) * 0.029;
  if (purchasePrice <= 360000) return 3150 + (purchasePrice - 150000) * 0.039;
  if (purchasePrice <= 725000) return 11340 + (purchasePrice - 360000) * 0.049;
  return 29225 + (purchasePrice - 725000) * 0.051;
}

function calculateStampDutyTAS(purchasePrice: number, isFirstHomeBuyer: boolean): number {
  if (purchasePrice <= 3000) return 50;
  if (purchasePrice <= 25000) return 50 + (purchasePrice - 3000) * 0.0175;
  if (purchasePrice <= 75000) return 435 + (purchasePrice - 25000) * 0.0225;
  if (purchasePrice <= 200000) return 1560 + (purchasePrice - 75000) * 0.035;
  if (purchasePrice <= 375000) return 5935 + (purchasePrice - 200000) * 0.04;
  if (purchasePrice <= 725000) return 12935 + (purchasePrice - 375000) * 0.0425;
  return 27812.50 + (purchasePrice - 725000) * 0.045;
}

function calculateStampDutyNT(purchasePrice: number, isFirstHomeBuyer: boolean): number {
  // NT has flat rates
  if (purchasePrice <= 525000) return 0;
  if (purchasePrice <= 3000000) return (purchasePrice - 525000) * 0.0465;
  if (purchasePrice <= 5000000) return 115087.50 + (purchasePrice - 3000000) * 0.0565;
  return 228087.50 + (purchasePrice - 5000000) * 0.0665;
}

function calculateStampDutyACT(purchasePrice: number, isFirstHomeBuyer: boolean): number {
  // ACT uses a different system, simplified estimate
  return purchasePrice * 0.04;
}


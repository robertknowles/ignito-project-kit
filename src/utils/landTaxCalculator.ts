/**
 * Calculate annual land tax based on state and land value
 * Note: Land tax calculations are complex and vary by state.
 * These are simplified estimates. Users can override via landTaxOverride field.
 */
export function calculateLandTax(state: string, landValue: number): number {
  // Handle undefined or empty state
  if (!state) {
    console.warn('calculateLandTax: state is undefined, returning 0');
    return 0;
  }
  
  switch (state.toUpperCase()) {
    case 'VIC':
      return calculateLandTaxVIC(landValue);
    case 'NSW':
      return calculateLandTaxNSW(landValue);
    case 'QLD':
      return calculateLandTaxQLD(landValue);
    case 'SA':
      return calculateLandTaxSA(landValue);
    case 'WA':
      return calculateLandTaxWA(landValue);
    case 'TAS':
      return calculateLandTaxTAS(landValue);
    case 'NT':
      return 0; // NT has no land tax
    case 'ACT':
      return calculateLandTaxACT(landValue);
    default:
      return 0;
  }
}

function calculateLandTaxVIC(landValue: number): number {
  const threshold = 300000;
  if (landValue <= threshold) return 0;
  
  if (landValue <= 600000) {
    return (landValue - threshold) * 0.002;
  } else if (landValue <= 1000000) {
    return 600 + (landValue - 600000) * 0.006;
  } else if (landValue <= 1800000) {
    return 3000 + (landValue - 1000000) * 0.010;
  } else if (landValue <= 3000000) {
    return 11000 + (landValue - 1800000) * 0.012;
  } else {
    return 25400 + (landValue - 3000000) * 0.025;
  }
}

function calculateLandTaxNSW(landValue: number): number {
  const threshold = 755000;
  if (landValue <= threshold) return 0;
  
  const taxableValue = landValue - threshold;
  return 100 + (taxableValue * 0.016);
}

function calculateLandTaxQLD(landValue: number): number {
  const threshold = 600000;
  if (landValue <= threshold) return 0;
  
  if (landValue <= 999999) {
    return (landValue - threshold) * 0.005;
  } else if (landValue <= 2999999) {
    return 2000 + (landValue - 1000000) * 0.009;
  } else if (landValue <= 4999999) {
    return 20000 + (landValue - 3000000) * 0.016;
  } else {
    return 52000 + (landValue - 5000000) * 0.022;
  }
}

function calculateLandTaxSA(landValue: number): number {
  const threshold = 450000;
  if (landValue <= threshold) return 0;
  
  return (landValue - threshold) * 0.005;
}

function calculateLandTaxWA(landValue: number): number {
  const threshold = 300000;
  if (landValue <= threshold) return 0;
  
  if (landValue <= 1000000) {
    return (landValue - threshold) * 0.0025;
  } else if (landValue <= 1800000) {
    return 1750 + (landValue - 1000000) * 0.009;
  } else {
    return 8950 + (landValue - 1800000) * 0.015;
  }
}

function calculateLandTaxTAS(landValue: number): number {
  const threshold = 25000;
  if (landValue <= threshold) return 0;
  
  return 50 + (landValue - threshold) * 0.0055;
}

function calculateLandTaxACT(landValue: number): number {
  // ACT uses a different system (rates-based)
  // Simplified estimate
  return landValue * 0.006;
}


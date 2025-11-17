/**
 * Utility to generate property timeline data for the client portal
 * This is a simplified version that works without the full context providers
 */

interface TimelineEntry {
  propertyNumber: number;
  year: number;
  purchasePrice: string;
  equity: string;
  yield: string;
  cashflow: string;
  milestone: string;
  nextMove: string;
  isLast?: boolean;
}

interface PropertySelection {
  id?: string;
  title?: string;
  cost?: number;
  purchaseYear?: number;
  affordableYear?: number;
  status?: string;
  rentalYield?: number;
  yield?: string;
  growth?: string;
  [key: string]: any;
}

/**
 * Format currency for display
 */
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toLocaleString()}`;
};

/**
 * Format cashflow with sign
 */
const formatCashflow = (value: number): string => {
  const absValue = Math.abs(value);
  const formatted = formatCurrency(absValue);
  
  if (value < 0) {
    return `−${formatted} p.a.`;
  } else if (value > 0) {
    return `+${formatted} p.a.`;
  }
  return `${formatted} p.a.`;
};

/**
 * Calculate simple equity growth over time
 * This is a simplified calculation for the client view
 */
const calculateEquity = (
  properties: PropertySelection[],
  propertyIndex: number,
  investmentProfile: any
): number => {
  let totalEquity = investmentProfile?.depositPool || 0;
  
  // Add cumulative equity from properties up to this index
  for (let i = 0; i <= propertyIndex; i++) {
    const property = properties[i];
    const purchasePrice = property.cost || 0;
    const yearsHeld = propertyIndex - i + 1;
    const growthRate = parseFloat(property.growth || '6') / 100; // Default 6%
    
    // Simple equity calculation: property value growth minus debt
    const currentValue = purchasePrice * Math.pow(1 + growthRate, yearsHeld);
    const loanAmount = purchasePrice * 0.8; // Assume 80% LVR
    const propertyEquity = currentValue - loanAmount;
    
    totalEquity += propertyEquity;
  }
  
  return totalEquity;
};

/**
 * Calculate simple cashflow
 */
const calculateCashflow = (
  properties: PropertySelection[],
  propertyIndex: number
): number => {
  let totalCashflow = 0;
  
  // Sum cashflow from all properties up to this index
  for (let i = 0; i <= propertyIndex; i++) {
    const property = properties[i];
    const purchasePrice = property.cost || 0;
    const rentalYield = parseFloat(property.yield || '4') / 100; // Default 4%
    const interestRate = 0.065; // 6.5% interest rate
    
    const rentalIncome = purchasePrice * rentalYield;
    const loanAmount = purchasePrice * 0.8;
    const interestPayment = loanAmount * interestRate;
    const expenses = purchasePrice * 0.01; // 1% for rates, insurance, etc.
    
    const propertyCashflow = rentalIncome - interestPayment - expenses;
    totalCashflow += propertyCashflow;
  }
  
  return totalCashflow;
};

/**
 * Generate timeline data from property selections
 */
export const generateTimelineData = (
  propertySelections: PropertySelection[],
  investmentProfile: any
): TimelineEntry[] => {
  // Filter for properties that have been purchased or are feasible
  const purchasedProperties = propertySelections
    .filter(p => p.status === 'feasible' || p.purchaseYear || p.affordableYear)
    .sort((a, b) => {
      const yearA = a.affordableYear || a.purchaseYear || 0;
      const yearB = b.affordableYear || b.purchaseYear || 0;
      return yearA - yearB;
    });

  if (purchasedProperties.length === 0) {
    return [];
  }

  // Generate timeline entries
  return purchasedProperties.map((property, index) => {
    const propertyNumber = index + 1;
    const year = Math.round(property.affordableYear || property.purchaseYear || 2025);
    const purchasePrice = formatCurrency(property.cost || 0);
    const equity = formatCurrency(calculateEquity(purchasedProperties, index, investmentProfile));
    const yieldValue = property.yield || '4.0%';
    const cashflow = formatCashflow(calculateCashflow(purchasedProperties, index));
    
    // Generate milestone message
    const milestone = `Property ${propertyNumber} acquired - ${property.title || 'Investment Property'} established in portfolio.`;
    
    // Generate next move message
    const isLast = index === purchasedProperties.length - 1;
    let nextMove = '';
    if (!isLast) {
      const nextProperty = purchasedProperties[index + 1];
      const nextYear = Math.round(nextProperty.affordableYear || nextProperty.purchaseYear || year + 2);
      nextMove = `Property ${propertyNumber + 1} feasible in ${nextYear} → Building equity for next acquisition.`;
    } else {
      nextMove = 'Continue holding and building equity. Long-term growth phase.';
    }

    return {
      propertyNumber,
      year,
      purchasePrice,
      equity,
      yield: yieldValue,
      cashflow,
      milestone,
      nextMove,
      isLast,
    };
  });
};

/**
 * Generate summary data for the snapshot card
 */
export const generateSummaryData = (investmentProfile: any) => {
  const startingCash = investmentProfile?.depositPool || investmentProfile?.initialDeposit || 0;
  const borrowingCapacity = investmentProfile?.borrowingCapacity || 0;
  const annualSavings = investmentProfile?.annualSavings || 0;
  const equityGoal = investmentProfile?.equityGoal || 0;
  const targetYear = investmentProfile?.targetYear || 2040;

  return {
    startingCash: formatCurrency(startingCash),
    borrowingCapacity: formatCurrency(borrowingCapacity),
    annualSavings: formatCurrency(annualSavings),
    goal: `Financial Independence by ${targetYear} — ${formatCurrency(equityGoal)} Portfolio`,
  };
};


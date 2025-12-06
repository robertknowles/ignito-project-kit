/**
 * Utility to analyze property portfolio and generate strategy pathway data
 */

interface PropertyData {
  id?: string;
  title?: string;
  cost?: number;
  status?: string;
  affordableYear?: number;
  yield?: string;
  growth?: string;
  rentalYield?: number;
  type?: string;
  category?: string;
  [key: string]: any;
}

interface PortfolioGroup {
  type: 'residential' | 'commercial';
  properties: PropertyData[];
  totalCost: number;
  totalEquity: number;
  count: number;
  averageYield: number;
  projectedValue: number;
  projectedIncome: number;
}

interface StrategyAnalysis {
  residential: PortfolioGroup | null;
  commercial: PortfolioGroup | null;
  totalPortfolioValue: number;
  totalEquity: number;
  totalProjectedIncome: number;
  savingsProjection: number;
  timelineYears: number;
}

/**
 * Determine if a property is commercial or residential
 */
const isCommercialProperty = (property: PropertyData): boolean => {
  const title = (property.title || '').toLowerCase();
  const type = (property.type || '').toLowerCase();
  const category = (property.category || '').toLowerCase();
  
  const commercialKeywords = ['commercial', 'retail', 'office', 'warehouse', 'industrial'];
  
  return commercialKeywords.some(keyword => 
    title.includes(keyword) || type.includes(keyword) || category.includes(keyword)
  );
};

/**
 * Calculate equity for a property based on growth over time
 */
const calculatePropertyEquity = (
  property: PropertyData,
  currentYear: number,
  purchaseYear: number
): number => {
  const yearsHeld = Math.max(0, currentYear - purchaseYear);
  const growthRate = parseFloat(property.growth || '6') / 100; // Default 6%
  const purchasePrice = property.cost || 0;
  const lvrRate = 0.8; // 80% LVR
  
  // Calculate current value with growth
  const currentValue = purchasePrice * Math.pow(1 + growthRate, yearsHeld);
  
  // Calculate loan amount (assuming IO loan, so principal unchanged)
  const loanAmount = purchasePrice * lvrRate;
  
  // Equity = Current Value - Loan Amount
  const equity = currentValue - loanAmount;
  
  return Math.max(0, equity);
};

/**
 * Calculate annual rental income for a property
 */
const calculateRentalIncome = (property: PropertyData): number => {
  const purchasePrice = property.cost || 0;
  const yieldRate = parseFloat(property.yield || '4') / 100; // Default 4%
  return purchasePrice * yieldRate;
};

/**
 * Analyze property group
 */
const analyzePropertyGroup = (
  properties: PropertyData[],
  type: 'residential' | 'commercial',
  investmentProfile: any
): PortfolioGroup | null => {
  if (properties.length === 0) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const timelineEndYear = currentYear + (investmentProfile?.timelineYears || 20);
  
  // Calculate totals
  const totalCost = properties.reduce((sum, p) => sum + (p.cost || 0), 0);
  
  // Calculate equity for each property at end of timeline
  const totalEquity = properties.reduce((sum, p) => {
    const purchaseYear = Math.round(p.affordableYear || currentYear);
    return sum + calculatePropertyEquity(p, timelineEndYear, purchaseYear);
  }, 0);
  
  // Calculate average yield
  const totalYield = properties.reduce((sum, p) => {
    const yieldValue = parseFloat(p.yield || '4');
    return sum + yieldValue;
  }, 0);
  const averageYield = properties.length > 0 ? totalYield / properties.length : 4;
  
  // Calculate projected value at end of timeline
  const projectedValue = properties.reduce((sum, p) => {
    const purchaseYear = Math.round(p.affordableYear || currentYear);
    const yearsHeld = Math.max(0, timelineEndYear - purchaseYear);
    const growthRate = parseFloat(p.growth || '6') / 100;
    const futureValue = (p.cost || 0) * Math.pow(1 + growthRate, yearsHeld);
    return sum + futureValue;
  }, 0);
  
  // Calculate projected annual income
  const projectedIncome = properties.reduce((sum, p) => {
    return sum + calculateRentalIncome(p);
  }, 0);
  
  return {
    type,
    properties,
    totalCost,
    totalEquity,
    count: properties.length,
    averageYield,
    projectedValue,
    projectedIncome,
  };
};

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
 * Analyze entire portfolio and return strategy data
 */
export const analyzePortfolioStrategy = (
  propertySelections: PropertyData[],
  investmentProfile: any
): StrategyAnalysis => {
  // Filter feasible properties
  const feasibleProperties = propertySelections.filter(
    p => p.status === 'feasible' || p.affordableYear
  );

  // Group by type
  const residentialProperties = feasibleProperties.filter(p => !isCommercialProperty(p));
  const commercialProperties = feasibleProperties.filter(p => isCommercialProperty(p));

  // Analyze each group
  const residential = analyzePropertyGroup(residentialProperties, 'residential', investmentProfile);
  const commercial = analyzePropertyGroup(commercialProperties, 'commercial', investmentProfile);

  // Calculate totals
  const totalPortfolioValue = (residential?.projectedValue || 0) + (commercial?.projectedValue || 0);
  const totalEquity = (residential?.totalEquity || 0) + (commercial?.totalEquity || 0);
  const totalProjectedIncome = (residential?.projectedIncome || 0) + (commercial?.projectedIncome || 0);

  // Calculate savings projection
  const timelineYears = investmentProfile?.timelineYears || 20;
  const annualSavings = investmentProfile?.annualSavings || 0;
  const savingsProjection = annualSavings * timelineYears;

  return {
    residential,
    commercial,
    totalPortfolioValue,
    totalEquity,
    totalProjectedIncome,
    savingsProjection,
    timelineYears,
  };
};

/**
 * Calculate average growth rate for a group
 */
const calculateAverageGrowth = (properties: PropertyData[]): number => {
  if (properties.length === 0) return 6;
  const totalGrowth = properties.reduce((sum, p) => {
    return sum + parseFloat(p.growth || '6');
  }, 0);
  return totalGrowth / properties.length;
};

/**
 * Calculate average yield for a set of properties
 * Used for yield trend analysis in strategy determination
 */
const calculateAverageYieldForProperties = (properties: PropertyData[]): number => {
  if (properties.length === 0) return 0;
  const totalYield = properties.reduce((sum, p) => {
    return sum + parseFloat(p.yield || p.rentalYield?.toString() || '4');
  }, 0);
  return totalYield / properties.length;
};

/**
 * Calculate purchase velocity for a property group
 * Velocity = properties per year (higher = more aggressive)
 */
const calculateVelocity = (properties: PropertyData[]): number => {
  if (properties.length < 2) return properties.length;
  
  const sorted = [...properties].sort((a, b) => (a.affordableYear || 0) - (b.affordableYear || 0));
  const firstYear = sorted[0].affordableYear || 0;
  const lastYear = sorted[sorted.length - 1].affordableYear || 0;
  const yearSpan = lastYear - firstYear;
  
  return yearSpan > 0 ? properties.length / yearSpan : properties.length;
};

/**
 * Calculate total debt (LVR-based)
 */
const calculateTotalDebt = (totalCost: number, lvrRate: number = 0.8): number => {
  return totalCost * lvrRate;
};

/**
 * Calculate sale value after costs (if portfolio sold down)
 */
const calculateSaleValue = (projectedValue: number, saleCosts: number = 0.05): number => {
  return projectedValue * (1 - saleCosts); // Assume 5% sale costs
};

/**
 * Generate residential portfolio description with strategic narrative
 */
export const generateResidentialDescription = (group: PortfolioGroup, investmentProfile: any) => {
  const borrowingCapacity = investmentProfile?.borrowingCapacity || 0;
  const currentYear = new Date().getFullYear();
  const projectionYears = 5; // 5-year forward projection
  const averageGrowth = calculateAverageGrowth(group.properties);
  
  // Calculate velocity for this group
  const velocity = calculateVelocity(group.properties);
  
  // Calculate "Current Portfolio" vs "Future Acquisition" split
  const currentProperties = group.properties.filter(p => {
    const purchaseYear = Math.round(p.affordableYear || currentYear);
    return purchaseYear <= currentYear;
  });
  const futureProperties = group.properties.filter(p => {
    const purchaseYear = Math.round(p.affordableYear || currentYear);
    return purchaseYear > currentYear;
  });
  
  const currentPortfolioCost = currentProperties.reduce((sum, p) => sum + (p.cost || 0), 0);
  const futureAcquisitionCost = futureProperties.reduce((sum, p) => sum + (p.cost || 0), 0);
  
  // Calculate 5-year projection
  const futureValue = group.totalCost * Math.pow(1 + (averageGrowth / 100), projectionYears);
  const projectedYear = currentYear + projectionYears;
  
  // Calculate equity and sale value
  const totalDebt = calculateTotalDebt(group.totalCost);
  const netEquity = group.totalEquity;
  const saleValue = calculateSaleValue(group.projectedValue);
  
  // Build items array with conditional velocity bullet
  const items: string[] = [
    `${formatCurrency(borrowingCapacity)} borrowing capacity utilized`,
    currentPortfolioCost > 0 
      ? `${formatCurrency(currentPortfolioCost)} current portfolio + ${formatCurrency(futureAcquisitionCost)} future acquisitions`
      : `${formatCurrency(group.totalCost)} total acquisition target (${group.count} ${group.count === 1 ? 'property' : 'properties'})`,
    `Average ${averageGrowth.toFixed(1)}% growth rate across residential assets`,
  ];

  // Add velocity-based bullet if high velocity (> 0.5 = buying every 2 years or faster)
  if (velocity > 0.5) {
    items.push(`Front-loaded acquisition structure to maximize time-in-market`);
  }

  const targets: string[] = [
    `Target: ${formatCurrency(group.totalCost)} portfolio growing at ${averageGrowth.toFixed(1)}% → ${formatCurrency(futureValue)} projected in ${projectionYears} years (${projectedYear})`,
    `${formatCurrency(netEquity)} equity created (${formatCurrency(saleValue)} if sold down)`,
    `Accumulation phase: Building equity base for next-stage transition`,
  ];

  return { items, targets };
};

/**
 * Detect if commercial properties come later in the timeline (injection scenario)
 */
const detectCommercialInjection = (commercialProperties: PropertyData[], residentialProperties: PropertyData[]): boolean => {
  if (commercialProperties.length === 0 || residentialProperties.length === 0) {
    return false;
  }
  
  const firstResidentialYear = Math.min(...residentialProperties.map(p => Math.round(p.affordableYear || 9999)));
  const firstCommercialYear = Math.min(...commercialProperties.map(p => Math.round(p.affordableYear || 9999)));
  
  // If commercial comes 3+ years after first residential, it's an "injection"
  return firstCommercialYear - firstResidentialYear >= 3;
};

/**
 * Calculate equity injection amount (residential equity funding commercial deposit)
 */
const calculateEquityInjection = (commercialCost: number, residentialEquity: number): number => {
  const commercialDeposit = commercialCost * 0.2; // 20% deposit
  const acquisitionCosts = commercialCost * 0.05; // 5% stamp duty/fees
  const totalRequired = commercialDeposit + acquisitionCosts;
  
  // Equity injection is the amount pulled from residential portfolio
  return Math.min(totalRequired, residentialEquity);
};

/**
 * Detect if a commercial property acts as a "Serviceability Valve"
 * 
 * Logic: Commercial property (Yield > 6%) purchased after 2+ Residential properties
 * This indicates the commercial is being used to boost cashflow and offset
 * the holding costs of the earlier growth-focused portfolio.
 */
const detectServiceabilityValve = (
  commercialGroup: PortfolioGroup,
  residentialGroup: PortfolioGroup | null
): boolean => {
  if (!residentialGroup || residentialGroup.properties.length < 2) {
    return false;
  }

  // Sort residential properties by purchase year
  const sortedResidential = [...residentialGroup.properties].sort(
    (a, b) => (a.affordableYear || 0) - (b.affordableYear || 0)
  );
  
  // Get the year of the second residential purchase
  const secondResidentialYear = sortedResidential[1]?.affordableYear || 0;

  // Check if any commercial property with yield > 6% was purchased after 2+ residential
  const hasServiceabilityValve = commercialGroup.properties.some(p => {
    const yieldValue = parseFloat(p.yield || p.rentalYield?.toString() || '0');
    const purchaseYear = p.affordableYear || 9999;
    return yieldValue > 6 && purchaseYear > secondResidentialYear;
  });

  return hasServiceabilityValve;
};

/**
 * Generate commercial portfolio description with strategic narrative
 */
export const generateCommercialDescription = (group: PortfolioGroup, residentialGroup: PortfolioGroup | null = null) => {
  const isInjectionScenario = residentialGroup 
    ? detectCommercialInjection(group.properties, residentialGroup.properties)
    : false;
  
  const residentialEquity = residentialGroup?.totalEquity || 0;
  const equityInjection = calculateEquityInjection(group.totalCost, residentialEquity);
  
  // Detect serviceability valve
  const isServiceabilityValve = detectServiceabilityValve(group, residentialGroup);
  
  // Calculate annual cashflow (rental income minus expenses/interest)
  const annualCashflow = group.projectedIncome;
  const monthlyCashflow = annualCashflow / 12;
  
  // Build items array with conditional serviceability valve bullet
  const items: string[] = isInjectionScenario ? [
    `${formatCurrency(group.totalCost)} commercial ${group.count === 1 ? 'asset' : 'assets'} + ${formatCurrency(equityInjection)} injection from residential gains`,
    `Strategic commercial injection funded by released equity from accumulation phase`,
    `${group.averageYield.toFixed(1)}% yield generating ${formatCurrency(annualCashflow)}/year income stream`,
  ] : [
    `${group.count} commercial ${group.count === 1 ? 'property' : 'properties'} totaling ${formatCurrency(group.totalCost)}`,
    `${group.averageYield.toFixed(1)}% average yield (higher income focus)`,
    `Diversified portfolio with commercial exposure from early stage`,
  ];

  // Add serviceability valve bullet if detected
  if (isServiceabilityValve) {
    items.push(`Acts as a 'Serviceability Valve', adding high yield to offset the holding costs of the earlier growth portfolio`);
  }

  const targets: string[] = isInjectionScenario ? [
    `${group.averageYield.toFixed(1)}% yield = ${formatCurrency(annualCashflow)} positive cashflow to replace income`,
    `Transition phase: Converting equity growth into passive income generation`,
    `Target: Financial independence via ${formatCurrency(monthlyCashflow)}/month commercial income`,
  ] : [
    `Commercial properties provide stable, higher-yield income stream`,
    `Projected ${formatCurrency(group.projectedIncome)}/year passive income`,
    `Strong equity growth potential: ${formatCurrency(group.totalEquity)} projected equity`,
  ];

  return { items, targets };
};

/**
 * Generate savings description
 */
export const generateSavingsDescription = (investmentProfile: any, savingsProjection: number) => {
  const annualSavings = investmentProfile?.annualSavings || 0;
  const depositPool = investmentProfile?.depositPool || investmentProfile?.initialDeposit || 0;
  
  return {
    items: [
      `${formatCurrency(annualSavings)}/year systematic savings contribution`,
      `${formatCurrency(depositPool)} initial capital available`,
      `${formatCurrency(savingsProjection)} total savings over timeline`,
    ],
  };
};

/**
 * Calculate Loan-to-Value Ratio (LVR) exposure
 */
const calculateLVR = (totalValue: number, totalDebt: number): number => {
  if (totalValue === 0) return 0;
  return (totalDebt / totalValue) * 100;
};

/**
 * Calculate total income redirected into debt reduction
 */
const calculateDebtReductionPotential = (
  totalIncome: number, 
  years: number = 10
): number => {
  // Assume 70% of income goes to debt reduction (30% for expenses/tax)
  const effectiveReduction = totalIncome * 0.7;
  return effectiveReduction * years;
};

/**
 * Determine strategy pathway narrative based on portfolio mix and yield trends
 * 
 * Logic:
 * 1. Yield trend analysis: Compare first 50% vs last 50% of purchases
 *    - If yield increases by > 1.5%: "Growth-Funded Income Transition"
 *    - If yield is stable (~4% ± 0.5%): "Pure Wealth Accumulation"
 * 2. Commercial-Led: If commercial starts first or dominates value
 * 3. Hybrid: Mix of residential and commercial
 */
const determineStrategyPathway = (analysis: StrategyAnalysis): string => {
  const hasResidential = analysis.residential !== null;
  const hasCommercial = analysis.commercial !== null;
  
  // Get all properties sorted by purchase year for yield trend analysis
  const allProperties = [
    ...(analysis.residential?.properties || []),
    ...(analysis.commercial?.properties || []),
  ].sort((a, b) => (a.affordableYear || 0) - (b.affordableYear || 0));

  // Yield trend analysis: first 50% vs last 50%
  if (allProperties.length >= 2) {
    const midpoint = Math.floor(allProperties.length / 2);
    const firstHalf = allProperties.slice(0, midpoint);
    const secondHalf = allProperties.slice(midpoint);
    
    const firstHalfYield = calculateAverageYieldForProperties(firstHalf);
    const secondHalfYield = calculateAverageYieldForProperties(secondHalf);
    const yieldDelta = secondHalfYield - firstHalfYield;
    
    // If yield increases by > 1.5%, it's a growth-funded income transition
    if (yieldDelta > 1.5) {
      return "Growth-Funded Income Transition: Building equity through growth assets, then pivoting to high-yield for passive income";
    }
    
    // If yield is stable around 4% (± 0.5%), it's pure wealth accumulation
    const avgYield = (firstHalfYield + secondHalfYield) / 2;
    if (Math.abs(yieldDelta) <= 0.5 && avgYield >= 3.5 && avgYield <= 4.5) {
      return "Pure Wealth Accumulation: Consistent capital growth focus across the timeline";
    }
  }

  // Fall back to existing logic based on portfolio composition
  if (hasResidential && hasCommercial) {
    const commercialValue = analysis.commercial?.projectedValue || 0;
    const residentialValue = analysis.residential?.projectedValue || 0;
    
    // Check if commercial comes first (Commercial-Led)
    const firstCommercialYear = Math.min(
      ...(analysis.commercial?.properties || []).map(p => p.affordableYear || 9999)
    );
    const firstResidentialYear = Math.min(
      ...(analysis.residential?.properties || []).map(p => p.affordableYear || 9999)
    );
    
    if (firstCommercialYear < firstResidentialYear) {
      return "Commercial-Led Income Strategy: High-yield foundation enabling accelerated growth phase";
    }
    
    // Commercial-Led if commercial value exceeds residential
    if (commercialValue > residentialValue) {
      return "Commercial-Led Income Strategy: High-yield focus to accelerate debt reduction";
    }
    
    // Otherwise Hybrid Aggressive
    return "Hybrid Aggressive Strategy: Residential growth for equity + Commercial yields for income";
  } else if (hasResidential && !hasCommercial) {
    return "Residential Growth & Sell-down Strategy: Build equity → Liquidate → Debt-free income";
  } else if (!hasResidential && hasCommercial) {
    return "Commercial-focused Strategy: High-yield income generation from establishment";
  }
  
  return "Custom Investment Strategy";
};

/**
 * Generate long-term outcome description with strategic narrative
 */
export const generateLongTermDescription = (analysis: StrategyAnalysis, investmentProfile: any) => {
  const equityGoal = investmentProfile?.equityGoal || 0;
  const targetYear = investmentProfile?.targetYear || new Date().getFullYear() + 20;
  const cashflowGoal = investmentProfile?.cashflowGoal || 0;
  
  // Calculate LVR exposure
  const totalDebt = calculateTotalDebt(
    (analysis.residential?.totalCost || 0) + (analysis.commercial?.totalCost || 0)
  );
  const lvr = calculateLVR(analysis.totalPortfolioValue, totalDebt);
  
  // Calculate debt reduction potential
  const debtReductionOver10Years = calculateDebtReductionPotential(analysis.totalProjectedIncome, 10);
  
  // Calculate if goals are achieved
  const equityAchieved = analysis.totalEquity >= equityGoal;
  const incomeAchieved = analysis.totalProjectedIncome >= cashflowGoal;
  
  // Determine strategy pathway
  const strategyPathway = determineStrategyPathway(analysis);
  
  // Calculate gap to goal
  const equityGap = equityGoal - analysis.totalEquity;
  const incomeGap = cashflowGoal - analysis.totalProjectedIncome;
  
  const items: string[] = [];
  
  // Strategy pathway
  items.push(`Strategy: ${strategyPathway}`);
  
  // LVR and asset base
  items.push(`${formatCurrency(analysis.totalPortfolioValue)} total asset base @ ${lvr.toFixed(1)}% LVR`);
  
  // Equity position with gap analysis
  if (equityAchieved) {
    items.push(`Target: ${formatCurrency(equityGoal)} equity goal by ${targetYear} ✓ Achieved (${formatCurrency(analysis.totalEquity)} projected)`);
  } else if (equityGap > 0) {
    items.push(`Target: ${formatCurrency(equityGoal)} equity goal by ${targetYear} → Gap: ${formatCurrency(equityGap)} shortfall`);
  } else {
    items.push(`Projected equity: ${formatCurrency(analysis.totalEquity)} by ${targetYear}`);
  }
  
  // Income with yield detail
  const averageYield = analysis.totalPortfolioValue > 0 
    ? (analysis.totalProjectedIncome / analysis.totalPortfolioValue) * 100 
    : 0;
  
  if (incomeAchieved) {
    items.push(`${averageYield.toFixed(1)}% yield → ${formatCurrency(analysis.totalProjectedIncome)} total income redirected into debt reduction ✓ Goal achieved`);
  } else if (incomeGap > 0 && cashflowGoal > 0) {
    items.push(`${averageYield.toFixed(1)}% yield → ${formatCurrency(analysis.totalProjectedIncome)} total income (Gap: ${formatCurrency(incomeGap)} to goal of ${formatCurrency(cashflowGoal)}/year)`);
  } else {
    items.push(`${averageYield.toFixed(1)}% yield → ${formatCurrency(analysis.totalProjectedIncome)} total income redirected into debt reduction`);
  }
  
  // Debt reduction potential
  if (analysis.totalProjectedIncome > 0) {
    items.push(`Income reinvestment: ${formatCurrency(debtReductionOver10Years)} debt reduction potential over 10 years`);
  }
  
  return {
    items,
  };
};


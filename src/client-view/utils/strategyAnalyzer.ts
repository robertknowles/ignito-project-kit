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
 * Generate residential portfolio description
 */
export const generateResidentialDescription = (group: PortfolioGroup, investmentProfile: any) => {
  const borrowingCapacity = investmentProfile?.borrowingCapacity || 0;
  
  return {
    items: [
      `${formatCurrency(borrowingCapacity)} borrowing capacity`,
      `${group.count} residential ${group.count === 1 ? 'property' : 'properties'} (${formatCurrency(group.totalCost)} total)`,
      `Average ${group.averageYield.toFixed(1)}% rental yield across portfolio`,
    ],
    targets: [
      `Portfolio projected to reach ${formatCurrency(group.projectedValue)} with ${group.averageYield.toFixed(1)}% annual growth`,
      `Estimated ${formatCurrency(group.totalEquity)} equity at end of timeline`,
      `Projected ${formatCurrency(group.projectedIncome)}/year rental income`,
    ],
  };
};

/**
 * Generate commercial portfolio description
 */
export const generateCommercialDescription = (group: PortfolioGroup) => {
  return {
    items: [
      `${group.count} commercial ${group.count === 1 ? 'property' : 'properties'} totaling ${formatCurrency(group.totalCost)}`,
      `Average ${group.averageYield.toFixed(1)}% yield (higher than residential)`,
      `Diversified portfolio with commercial exposure`,
    ],
    targets: [
      `Commercial properties provide stable, higher-yield income stream`,
      `Projected ${formatCurrency(group.projectedIncome)}/year passive income`,
      `Strong equity growth potential: ${formatCurrency(group.totalEquity)} projected equity`,
    ],
  };
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
 * Generate long-term outcome description
 */
export const generateLongTermDescription = (analysis: StrategyAnalysis, investmentProfile: any) => {
  const equityGoal = investmentProfile?.equityGoal || 0;
  const targetYear = investmentProfile?.targetYear || new Date().getFullYear() + 20;
  const cashflowGoal = investmentProfile?.cashflowGoal || 0;
  
  // Calculate if goals are achieved
  const equityAchieved = analysis.totalEquity >= equityGoal;
  const incomeAchieved = analysis.totalProjectedIncome >= cashflowGoal;
  
  return {
    items: [
      `Target: ${formatCurrency(equityGoal)} equity goal by ${targetYear} ${equityAchieved ? '✓ Achieved' : ''}`,
      `Projected portfolio value: ${formatCurrency(analysis.totalPortfolioValue)}`,
      `Projected total equity: ${formatCurrency(analysis.totalEquity)}`,
      `Passive income: ${formatCurrency(analysis.totalProjectedIncome)}/year ${incomeAchieved ? '✓ Goal achieved' : `(Goal: ${formatCurrency(cashflowGoal)}/year)`}`,
    ],
  };
};


/**
 * Utility to generate property timeline data for the client portal
 * This is a simplified version that works without the full context providers
 */

// Base interface for all timeline items
interface BaseTimelineItem {
  year: number;
  isLast?: boolean;
}

// Property timeline entry
interface PropertyTimelineEntry extends BaseTimelineItem {
  type: 'property';
  propertyNumber: number;
  purchasePrice: string;
  equity: string;
  yield: string;
  cashflow: string;
  milestone: string;
  nextMove: string;
}

// Milestone/Gap Year entry
interface MilestoneTimelineEntry extends BaseTimelineItem {
  type: 'milestone';
  title: string;
  description: string;
}

// Union type for all timeline items
export type TimelineItem = PropertyTimelineEntry | MilestoneTimelineEntry;

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
  category?: string;
  type?: string;
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
 * Detect if property is commercial based on title or type
 */
const isCommercialProperty = (property: PropertySelection): boolean => {
  const title = (property.title || '').toLowerCase();
  const type = (property.type || '').toLowerCase();
  const category = (property.category || '').toLowerCase();
  
  return title.includes('commercial') || 
         type.includes('commercial') || 
         category.includes('commercial') ||
         title.includes('retail') ||
         title.includes('office') ||
         title.includes('industrial');
};

/**
 * Detect if property cost represents a major jump from previous property
 */
const detectPriceJump = (
  property: PropertySelection,
  previousProperties: PropertySelection[]
): boolean => {
  if (previousProperties.length === 0) return false;
  const previousProperty = previousProperties[previousProperties.length - 1];
  const previousCost = previousProperty.cost || 0;
  const currentCost = property.cost || 0;
  return currentCost > previousCost * 2;
};

/**
 * Get varied high-yield description to avoid repetition
 * Uses round-robin selection based on property index
 */
const getHighYieldVariation = (propertyIndex: number): string => {
  const variations = [
    "High-yield asset added to boost cashflow.",
    "Income-focused acquisition to support serviceability.",
    "Cashflow play to balance portfolio LVR."
  ];
  return variations[propertyIndex % variations.length];
};

/**
 * Generate intelligent narrative milestone based on property characteristics
 */
const generateMilestoneNarrative = (
  property: PropertySelection,
  propertyNumber: number,
  previousProperties: PropertySelection[]
): string => {
  const yieldValue = parseFloat(property.yield || '0');
  const growthValue = parseFloat(property.growth || '0');
  
  // First purchase
  if (propertyNumber === 1) {
    // Determine if it's growth or yield focused
    if (growthValue > yieldValue) {
      return "Foundation property established. Asset selected for Growth to build initial equity base.";
    } else {
      return "Foundation property established. Asset selected for Yield to build initial equity base.";
    }
  }
  
  // Commercial property - highest priority
  if (isCommercialProperty(property)) {
    return "Strategic commercial acquisition to anchor portfolio income.";
  }
  
  // Price jump detection
  if (detectPriceJump(property, previousProperties)) {
    return "Major portfolio upsize - acquiring significant asset base.";
  }
  
  // High yield property with variation (>5%)
  if (yieldValue > 5) {
    return getHighYieldVariation(propertyNumber);
  }
  
  // Standard expansion
  return `Portfolio expansion utilizing released equity from Property ${propertyNumber - 1}.`;
};

/**
 * Generate dynamic "Next Move" guidance
 */
const generateNextMove = (
  currentProperty: PropertySelection,
  currentIndex: number,
  nextProperty: PropertySelection | null,
  purchasedProperties: PropertySelection[]
): string => {
  if (!nextProperty) {
    return "Portfolio consolidation phase begins.";
  }
  
  const currentYear = Math.round(currentProperty.affordableYear || currentProperty.purchaseYear || 2025);
  const nextYear = Math.round(nextProperty.affordableYear || nextProperty.purchaseYear || currentYear + 2);
  const nextPropertyNumber = currentIndex + 2;
  
  // Calculate equity required for next deposit
  const nextDepositRequired = (nextProperty.cost || 0) * 0.2; // 20% deposit
  const acquisitionCosts = (nextProperty.cost || 0) * 0.05; // ~5% for stamp duty, fees
  const totalRequired = nextDepositRequired + acquisitionCosts;
  
  // Check if next property is commercial
  const isNextCommercial = isCommercialProperty(nextProperty);
  const depositType = isNextCommercial ? "Commercial deposit" : "deposit";
  
  return `Property ${nextPropertyNumber} feasible in ${nextYear} → ${formatCurrency(totalRequired)} equity released to fund ${depositType}.`;
};

/**
 * Generate timeline data from property selections with intelligent narratives
 */
export const generateTimelineData = (
  propertySelections: PropertySelection[],
  investmentProfile: any
): TimelineItem[] => {
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

  const timelineItems: TimelineItem[] = [];
  
  // Generate timeline entries with gap detection
  purchasedProperties.forEach((property, index) => {
    const propertyNumber = index + 1;
    const year = Math.round(property.affordableYear || property.purchaseYear || 2025);
    const purchasePrice = formatCurrency(property.cost || 0);
    const equity = formatCurrency(calculateEquity(purchasedProperties, index, investmentProfile));
    const yieldValue = property.yield || '4.0%';
    const cashflow = formatCashflow(calculateCashflow(purchasedProperties, index));
    
    // Check for gap with next property
    if (index < purchasedProperties.length - 1) {
      const nextProperty = purchasedProperties[index + 1];
      const nextYear = Math.round(nextProperty.affordableYear || nextProperty.purchaseYear || year + 2);
      const gap = nextYear - year;
      
      // If gap > 3 years, insert milestone marker at midpoint
      if (gap > 3) {
        const midpointYear = Math.round(year + gap / 2);
        
        // Add current property
        timelineItems.push({
          type: 'property',
          propertyNumber,
          year,
          purchasePrice,
          equity,
          yield: yieldValue,
          cashflow,
          milestone: generateMilestoneNarrative(property, propertyNumber, purchasedProperties.slice(0, index)),
          nextMove: generateNextMove(property, index, nextProperty, purchasedProperties),
          isLast: false,
        });
        
        // Add gap milestone
        timelineItems.push({
          type: 'milestone',
          year: midpointYear,
          title: "Portfolio Review & Equity Assessment",
          description: "Mid-cycle review to assess equity position and serviceability for next phase.",
          isLast: false,
        });
      } else {
        // Normal property entry without gap
        timelineItems.push({
          type: 'property',
          propertyNumber,
          year,
          purchasePrice,
          equity,
          yield: yieldValue,
          cashflow,
          milestone: generateMilestoneNarrative(property, propertyNumber, purchasedProperties.slice(0, index)),
          nextMove: generateNextMove(property, index, nextProperty, purchasedProperties),
          isLast: false,
        });
      }
    } else {
      // Last property
      timelineItems.push({
        type: 'property',
        propertyNumber,
        year,
        purchasePrice,
        equity,
        yield: yieldValue,
        cashflow,
        milestone: generateMilestoneNarrative(property, propertyNumber, purchasedProperties.slice(0, index)),
        nextMove: generateNextMove(property, index, null, purchasedProperties),
        isLast: true,
      });
    }
  });
  
  // Mark the last item
  if (timelineItems.length > 0) {
    timelineItems[timelineItems.length - 1].isLast = true;
  }

  return timelineItems;
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


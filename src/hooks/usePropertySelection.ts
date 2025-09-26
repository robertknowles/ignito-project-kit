import { useState, useMemo } from 'react';
import { CalculatedValues, InvestmentProfileData } from './useInvestmentProfile';

export interface PropertyType {
  id: string;
  title: string;
  priceRange: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  yield: string;
  cashFlow: string;
  riskLevel: string;
  depositPercentage: number; // Typical deposit required as percentage
  monthlyRental: number; // Average monthly rental income
  monthlyCosts: number; // Average monthly costs (rates, maintenance, etc.)
}

export interface PropertySelection {
  propertyId: string;
  quantity: number;
}

export interface PortfolioCalculations {
  totalInvestmentCost: number;
  totalDepositRequired: number;
  totalLoanAmount: number;
  monthlyNetCashflow: number;
  isDepositSufficient: boolean;
  isLoanCapacityOk: boolean;
  isCashflowViable: boolean;
  eligibilityWarnings: string[];
}

const PROPERTY_TYPES: PropertyType[] = [
  {
    id: 'granny-flats',
    title: 'Granny Flats',
    priceRange: '$170k-$400k',
    minPrice: 170000,
    maxPrice: 400000,
    avgPrice: 285000,
    yield: '-9%',
    cashFlow: 'Positive',
    riskLevel: 'Medium',
    depositPercentage: 20,
    monthlyRental: 1800,
    monthlyCosts: 800,
  },
  {
    id: 'villas-townhouses',
    title: 'Villas / Townhouses',
    priceRange: '$250k-$400k',
    minPrice: 250000,
    maxPrice: 400000,
    avgPrice: 325000,
    yield: '6-8%',
    cashFlow: 'Negative',
    riskLevel: 'High',
    depositPercentage: 20,
    monthlyRental: 2100,
    monthlyCosts: 1200,
  },
  {
    id: 'units-apartments',
    title: 'Units / Apartments',
    priceRange: '$250k-$450k',
    minPrice: 250000,
    maxPrice: 450000,
    avgPrice: 350000,
    yield: '6-8%',
    cashFlow: 'Neutral → Positive',
    riskLevel: 'High',
    depositPercentage: 20,
    monthlyRental: 2200,
    monthlyCosts: 1100,
  },
  {
    id: 'houses-regional',
    title: 'Houses (Regional)',
    priceRange: '$250k-$450k',
    minPrice: 250000,
    maxPrice: 450000,
    avgPrice: 350000,
    yield: '6-8%',
    cashFlow: 'Neutral → Positive',
    riskLevel: 'Medium',
    depositPercentage: 20,
    monthlyRental: 2000,
    monthlyCosts: 1000,
  },
  {
    id: 'duplexes',
    title: 'Duplexes',
    priceRange: '$250k-$450k',
    minPrice: 250000,
    maxPrice: 450000,
    avgPrice: 350000,
    yield: '6-8%',
    cashFlow: 'Neutral → Positive',
    riskLevel: 'Medium',
    depositPercentage: 20,
    monthlyRental: 2300,
    monthlyCosts: 1100,
  },
  {
    id: 'metro-houses',
    title: 'Metro Houses',
    priceRange: '$600k-$800k',
    minPrice: 600000,
    maxPrice: 800000,
    avgPrice: 700000,
    yield: '4-5%',
    cashFlow: 'Negative',
    riskLevel: 'Medium-Low',
    depositPercentage: 20,
    monthlyRental: 3200,
    monthlyCosts: 1800,
  },
  {
    id: 'commercial-retail',
    title: 'Commercial Retail',
    priceRange: '$400k-$1.2M',
    minPrice: 400000,
    maxPrice: 1200000,
    avgPrice: 800000,
    yield: '7-9%',
    cashFlow: 'Positive',
    riskLevel: 'High',
    depositPercentage: 30,
    monthlyRental: 5500,
    monthlyCosts: 2000,
  },
  {
    id: 'office-space',
    title: 'Office Space',
    priceRange: '$500k-$2M',
    minPrice: 500000,
    maxPrice: 2000000,
    avgPrice: 1250000,
    yield: '6-8%',
    cashFlow: 'Positive',
    riskLevel: 'Very High',
    depositPercentage: 30,
    monthlyRental: 8000,
    monthlyCosts: 3000,
  },
  {
    id: 'industrial-units',
    title: 'Industrial Units',
    priceRange: '$350k-$1.5M',
    minPrice: 350000,
    maxPrice: 1500000,
    avgPrice: 925000,
    yield: '7-10%',
    cashFlow: 'Positive',
    riskLevel: 'High',
    depositPercentage: 30,
    monthlyRental: 6500,
    monthlyCosts: 2200,
  },
];

export const usePropertySelection = (calculatedValues: CalculatedValues, profile: InvestmentProfileData) => {
  const [selections, setSelections] = useState<PropertySelection[]>([]);

  const addProperty = (propertyId: string) => {
    setSelections(prev => {
      const existing = prev.find(s => s.propertyId === propertyId);
      if (existing) {
        return prev.map(s => 
          s.propertyId === propertyId 
            ? { ...s, quantity: s.quantity + 1 }
            : s
        );
      }
      return [...prev, { propertyId, quantity: 1 }];
    });
  };

  const removeProperty = (propertyId: string) => {
    setSelections(prev => {
      return prev.map(s => {
        if (s.propertyId === propertyId && s.quantity > 0) {
          return { ...s, quantity: s.quantity - 1 };
        }
        return s;
      }).filter(s => s.quantity > 0);
    });
  };

  const getPropertyQuantity = (propertyId: string): number => {
    const selection = selections.find(s => s.propertyId === propertyId);
    return selection?.quantity || 0;
  };

  // Portfolio calculations with eligibility checks
  const portfolioCalculations = useMemo((): PortfolioCalculations => {
    let totalInvestmentCost = 0;
    let totalDepositRequired = 0;
    let totalLoanAmount = 0;
    let monthlyNetCashflow = 0;

    selections.forEach(selection => {
      const property = PROPERTY_TYPES.find(p => p.id === selection.propertyId);
      if (property) {
        const propertyCost = property.avgPrice * selection.quantity;
        const depositRequired = propertyCost * (property.depositPercentage / 100);
        const loanAmount = propertyCost - depositRequired;
        const netCashflow = (property.monthlyRental - property.monthlyCosts) * selection.quantity;

        totalInvestmentCost += propertyCost;
        totalDepositRequired += depositRequired;
        totalLoanAmount += loanAmount;
        monthlyNetCashflow += netCashflow;
      }
    });

    // Eligibility Gates
    const isDepositSufficient = calculatedValues.availableDeposit >= totalDepositRequired;
    const isLoanCapacityOk = totalLoanAmount <= profile.borrowingCapacity;
    const isCashflowViable = monthlyNetCashflow >= -500; // Allow small negative cashflow tolerance

    const eligibilityWarnings: string[] = [];
    
    if (!isDepositSufficient) {
      const shortfall = totalDepositRequired - calculatedValues.availableDeposit;
      eligibilityWarnings.push(`Deposit shortfall: Need $${shortfall.toLocaleString()} more in deposits`);
    }
    
    if (!isLoanCapacityOk) {
      const excess = totalLoanAmount - profile.borrowingCapacity;
      eligibilityWarnings.push(`Borrowing capacity exceeded by $${excess.toLocaleString()}`);
    }
    
    if (!isCashflowViable) {
      eligibilityWarnings.push(`Monthly cashflow deficit: $${Math.abs(monthlyNetCashflow).toLocaleString()}/month`);
    }

    return {
      totalInvestmentCost,
      totalDepositRequired,
      totalLoanAmount,
      monthlyNetCashflow,
      isDepositSufficient,
      isLoanCapacityOk,
      isCashflowViable,
      eligibilityWarnings,
    };
  }, [selections, calculatedValues, profile.borrowingCapacity]);

  return {
    propertyTypes: PROPERTY_TYPES,
    selections,
    addProperty,
    removeProperty,
    getPropertyQuantity,
    portfolioCalculations,
  };
};
import { useMemo } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { calculateGrowthProjections } from '../utils/metricsCalculator';
import type { PropertyPurchase, GrowthProjection } from '../types/property';

export const useGrowthProjections = () => {
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  const projections = useMemo((): GrowthProjection[] => {
    // Convert feasible properties to PropertyPurchase format
    const feasibleProperties = timelineProperties.filter(prop => prop.status === 'feasible');
    
    if (feasibleProperties.length === 0) {
      return [];
    }

    const purchases: PropertyPurchase[] = feasibleProperties.map(property => {
      const propertyData = getPropertyData(property.title);
      return {
        year: property.affordableYear,
        cost: property.cost,
        loanAmount: property.loanAmount,
        depositRequired: property.depositRequired,
        title: property.title,
        rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : 0.04,
        growthRate: propertyData ? parseFloat(propertyData.growth) / 100 : parseFloat(globalFactors.growthRate) / 100,
        interestRate: parseFloat(globalFactors.interestRate) / 100
      };
    });

    return calculateGrowthProjections(
      purchases,
      profile.portfolioValue,
      profile.currentDebt,
      profile.timelineYears
    );
  }, [timelineProperties, profile, globalFactors, getPropertyData]);

  // Calculate key metrics for easier consumption
  const keyMetrics = useMemo(() => {
    if (projections.length === 0) {
      return {
        startValue: 0,
        endValue: 0,
        totalGrowth: 0,
        totalGrowthPercentage: 0,
        finalEquity: 0,
        finalIncome: 0,
        propertiesAtEnd: 0
      };
    }

    const start = projections[0];
    const end = projections[projections.length - 1];
    const totalGrowth = end.portfolioValue - start.portfolioValue;
    const totalGrowthPercentage = start.portfolioValue > 0 ? 
      ((end.portfolioValue - start.portfolioValue) / start.portfolioValue) * 100 : 0;

    return {
      startValue: start.portfolioValue,
      endValue: end.portfolioValue,
      totalGrowth,
      totalGrowthPercentage,
      finalEquity: end.totalEquity,
      finalIncome: end.annualIncome,
      propertiesAtEnd: end.properties.length
    };
  }, [projections]);

  // Get milestone years for quick overview
  const milestones = useMemo(() => {
    if (projections.length === 0) return [];
    
    return projections.filter((_, index) => 
      index === 0 || 
      index === Math.floor(projections.length / 3) || 
      index === Math.floor(projections.length * 2 / 3) || 
      index === projections.length - 1
    );
  }, [projections]);

  return {
    projections,
    keyMetrics,
    milestones,
    hasProjections: projections.length > 0
  };
};
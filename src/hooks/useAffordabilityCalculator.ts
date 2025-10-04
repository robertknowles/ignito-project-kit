import { useEffect, useState, useRef } from 'react';
import { useInvestmentProfile } from './useInvestmentProfile';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import type { TimelineProperty } from '../types/property';
import AffordabilityWorker from '../workers/affordabilityWorker?worker';

export interface AffordabilityResult {
  year: number;
  canAfford: boolean;
  availableFunds: number;
  usableEquity: number;
  totalPortfolioValue: number;
  totalDebt: number;
}

export const useAffordabilityCalculator = () => {
  const { profile, calculatedValues } = useInvestmentProfile();
  const { selections, propertyTypes } = usePropertySelection();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  const [timelineProperties, setTimelineProperties] = useState<TimelineProperty[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const debouncedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Initialize worker on mount
  useEffect(() => {
    try {
      workerRef.current = new AffordabilityWorker();
      
      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data;
        
        if (type === 'RESULT') {
          setTimelineProperties(payload);
          setIsCalculating(false);
        } else if (type === 'ERROR') {
          console.error('Worker error:', e.data.error);
          setIsCalculating(false);
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setIsCalculating(false);
      };
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      setIsCalculating(false);
    }
    
    return () => {
      workerRef.current?.terminate();
      clearTimeout(debouncedTimerRef.current);
    };
  }, []);

  // Debounced calculation trigger
  useEffect(() => {
    clearTimeout(debouncedTimerRef.current);
    setIsCalculating(true);
    
    debouncedTimerRef.current = setTimeout(() => {
      if (!workerRef.current) return;
      
      // Create property data map for worker
      const propertyDataMap: Record<string, any> = {};
      propertyTypes.forEach(pt => {
        const data = getPropertyData(pt.title);
        if (data) {
          propertyDataMap[pt.title] = data;
        }
      });
      
      // Send calculation request to worker
      workerRef.current.postMessage({
        type: 'CALCULATE',
        payload: {
          selections,
          profile: {
            timelineYears: profile.timelineYears,
            borrowingCapacity: profile.borrowingCapacity,
            depositPool: profile.depositPool,
            currentDebt: profile.currentDebt,
            portfolioValue: profile.portfolioValue,
            annualSavings: profile.annualSavings,
            equityFactor: profile.equityFactor,
            equityReleaseFactor: profile.equityReleaseFactor,
            lastConsolidationYear: profile.lastConsolidationYear,
            consolidationsRemaining: profile.consolidationsRemaining,
          },
          globalFactors: {
            growthRate: globalFactors.growthRate,
            interestRate: globalFactors.interestRate,
            loanToValueRatio: globalFactors.loanToValueRatio,
          },
          propertyTypes,
          propertyDataMap,
          availableDeposit: calculatedValues.availableDeposit,
        }
      });
    }, 300);
    
    return () => clearTimeout(debouncedTimerRef.current);
  }, [
    selections,
    profile.timelineYears,
    profile.borrowingCapacity,
    profile.depositPool,
    profile.currentDebt,
    profile.portfolioValue,
    profile.annualSavings,
    profile.equityFactor,
    profile.equityReleaseFactor,
    profile.lastConsolidationYear,
    profile.consolidationsRemaining,
    globalFactors.growthRate,
    globalFactors.interestRate,
    globalFactors.loanToValueRatio,
    propertyTypes,
    getPropertyData,
    calculatedValues.availableDeposit,
  ]);

  return {
    timelineProperties,
    isCalculating
  };
};

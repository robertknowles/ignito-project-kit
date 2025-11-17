import React, { useMemo, useRef, useEffect, useState } from 'react'
import {
  CalendarIcon,
  Loader2,
} from 'lucide-react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { PurchaseEventCard } from './PurchaseEventCard'
import { GapView } from './GapView'
import { PauseBlockCard } from './PauseBlockCard'
import type { YearBreakdownData } from '@/types/property'

// Period conversion helpers
const PERIODS_PER_YEAR = 2;
const BASE_YEAR = 2025;

// Timeline Progress Bar Component - Now exported for use in Dashboard
export interface TimelineProgressBarProps {
  startYear: number;
  endYear: number;
  latestPurchaseYear: number;
  purchaseYears: number[];
  onYearClick: (year: number) => void;
}

export const TimelineProgressBar: React.FC<TimelineProgressBarProps> = ({
  startYear,
  endYear,
  latestPurchaseYear,
  purchaseYears,
  onYearClick,
}) => {
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="border-b border-[#f3f4f6] py-3 px-6">
      <div className="flex items-center justify-start overflow-x-auto">
        {years.map((year, index) => {
          const isLast = index === years.length - 1;
          const isPast = year < currentYear;
          const isPurchaseYear = purchaseYears.includes(year);
          const isFuture = !isPast && !isPurchaseYear;
          
          // Find if this year is between purchase years
          const minPurchaseYear = purchaseYears.length > 0 ? Math.min(...purchaseYears) : Infinity;
          const maxPurchaseYear = purchaseYears.length > 0 ? Math.max(...purchaseYears) : -Infinity;
          const isBetweenPurchases = year > minPurchaseYear && year < maxPurchaseYear && !isPurchaseYear;
          
          // Determine colors based on the state
          let bgColor = '#ffffff'; // White for future years
          let textColor = '#6b7280'; // Gray text for future
          
          if (isPast) {
            bgColor = '#9ca3af'; // Grey for past years
            textColor = '#ffffff'; // White text
          } else if (isPurchaseYear) {
            bgColor = '#87B5FA'; // Blue for purchase years
            textColor = '#ffffff'; // White text
          } else if (isBetweenPurchases) {
            bgColor = '#d1d5db'; // Darker grey for years between purchases
            textColor = '#4b5563'; // Darker text color
          }
          
          return (
            <div key={year} className="relative" style={{ marginRight: isLast ? '0' : '-8px' }}>
              <button
                onClick={() => onYearClick(year)}
                className="relative transition-all hover:opacity-80 flex items-center justify-center font-medium whitespace-nowrap"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  height: '36px',
                  paddingLeft: index === 0 ? '16px' : '24px',
                  paddingRight: isLast ? '16px' : '24px',
                  clipPath: isLast 
                    ? (index === 0 ? 'none' : 'polygon(8px 0%, 100% 0%, 100% 100%, 8px 100%, 0% 50%)')
                    : (index === 0 
                      ? 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)'
                      : 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%)'),
                  fontSize: '14px',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  zIndex: years.length - index,
                }}
              >
                {year}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const periodToDisplay = (period: number): string => {
  const year = BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
  const half = ((period - 1) % PERIODS_PER_YEAR) + 1;
  return `${year} H${half}`;
};

// Currency formatter helper
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Convert annual rate to per-period rate using compound interest formula
const annualRateToPeriodRate = (annualRate: number): number => {
  return Math.pow(1 + annualRate, 1 / PERIODS_PER_YEAR) - 1;
};

// Tiered growth function: Uses customizable growth curve from profile
// Default: 12.5% Y1, 10% Y2-3, 7.5% Y4, 6% Y5+
const calculatePropertyGrowth = (initialValue: number, periods: number, growthCurve: any): number => {
  let currentValue = initialValue;
  
  // Convert annual rates to per-period rates
  const year1Rate = annualRateToPeriodRate(growthCurve.year1 / 100);
  const years2to3Rate = annualRateToPeriodRate(growthCurve.years2to3 / 100);
  const year4Rate = annualRateToPeriodRate(growthCurve.year4 / 100);
  const year5plusRate = annualRateToPeriodRate(growthCurve.year5plus / 100);
  
  for (let period = 1; period <= periods; period++) {
    let periodRate;
    
    if (period <= 2) {
      // Year 1 (periods 1-2)
      periodRate = year1Rate;
    } else if (period <= 6) {
      // Years 2-3 (periods 3-6)
      periodRate = years2to3Rate;
    } else if (period <= 8) {
      // Year 4 (periods 7-8)
      periodRate = year4Rate;
    } else {
      // Year 5+ (period 9+)
      periodRate = year5plusRate;
    }
    
    currentValue *= (1 + periodRate);
  }
  
  return currentValue;
};

// Export timeline data for use in parent components
export const useTimelineData = () => {
  const { profile } = useInvestmentProfile()
  const { timelineProperties } = useAffordabilityCalculator()
  
  const BASE_YEAR = 2025;
  const startYear = BASE_YEAR;
  const endYear = startYear + (profile.timelineYears || 15) - 1;
  
  // Filter out properties with Infinity affordableYear
  const affordableProperties = timelineProperties.filter(p => p.affordableYear !== Infinity);
  
  const latestPurchaseYear = affordableProperties.length > 0
    ? Math.max(...affordableProperties.map(p => Math.round(p.affordableYear)))
    : startYear;
  
  // Get all unique purchase years (excluding Infinity)
  const purchaseYears = affordableProperties.length > 0
    ? [...new Set(affordableProperties.map(p => Math.round(p.affordableYear)))]
    : [];
  
  return {
    startYear,
    endYear,
    latestPurchaseYear,
    purchaseYears,
  };
};

export const InvestmentTimeline = React.forwardRef<{ scrollToYear: (year: number) => void }>((props, ref) => {
  const { calculatedValues, profile } = useInvestmentProfile()
  const { calculations, checkFeasibility, pauseBlocks, propertyTypes, selections, removePause, updatePauseDuration } = usePropertySelection()
  const { timelineProperties, updateTimelinePropertyLoanType, isRecalculating, calculateAffordabilityForProperty } = useAffordabilityCalculator()
  const { globalFactors, getPropertyData } = useDataAssumptions()
  
  // Expose scrollToYear function to parent via ref
  React.useImperativeHandle(ref, () => ({
    scrollToYear: (year: number) => {
      const element = document.getElementById(`year-${year}`);
      if (element) {
        const container = element.closest('.scrollable-content');
        if (container) {
          const containerTop = container.getBoundingClientRect().top;
          const elementTop = element.getBoundingClientRect().top;
          const offset = elementTop - containerTop - 20; // 20px padding
          container.scrollBy({ top: offset, behavior: 'smooth' });
        }
      }
    }
  }));
  
  // Generate ALL years (2025-2050) by interpolating between purchase events
  const fullYearlyBreakdown = useMemo((): YearBreakdownData[] => {
    const baseYear = 2025;
    const endYear = baseYear + profile.timelineYears - 1; // e.g., 2025 + 15 - 1 = 2039
    // DEPRECATED: No longer using globalFactors - each property uses its own template values
    const defaultInterestRate = 0.065; // Default 6.5% for timeline calculations
    const defaultGrowthRate = 0.06; // Default 6% for timeline calculations
    
    // Create a map of years to properties for quick lookup
    // Round affordableYear to nearest integer (2030.5 -> 2031, 2030.3 -> 2030)
    // Filter out properties with Infinity affordableYear
    const propertyByYear = new Map<number, typeof timelineProperties[0][]>();
    timelineProperties
      .filter(prop => prop.affordableYear !== Infinity)
      .forEach(prop => {
        const roundedYear = Math.round(prop.affordableYear);
        if (!propertyByYear.has(roundedYear)) {
          propertyByYear.set(roundedYear, []);
        }
        propertyByYear.get(roundedYear)!.push(prop);
      });

    // Generate ALL years from 2025 to endYear
    const years: YearBreakdownData[] = [];
    
    for (let year = baseYear; year <= endYear; year++) {
      const yearIndex = year - baseYear;
      const properties = propertyByYear.get(year);
      
      if (properties && properties.length > 0) {
        // This is a purchase year - use the first property's data for the year row
        // (Multiple purchases in same year will be shown in the purchases array)
        const property = properties[0];
        const propertyIndex = property.propertyIndex + 1;
        
        const lvr = property.portfolioValueAfter > 0 
          ? (property.totalDebtAfter / property.portfolioValueAfter) * 100 
          : 0;
        const dsr = property.grossRentalIncome > 0 
          ? (property.loanInterest / property.grossRentalIncome) * 100 
          : 0;

        // Calculate new fields for pure presentation
        const extractableEquity = Math.max(0, (property.portfolioValueAfter * 0.80) - property.totalDebtAfter);
        const existingDebt = property.totalDebtAfter - property.loanAmount;
        const newDebt = property.loanAmount;
        const existingLoanInterest = existingDebt * defaultInterestRate;
        const newLoanInterest = newDebt * defaultInterestRate;
        const annualSavingsRate = profile.annualSavings;
        const totalAnnualCapacity = annualSavingsRate + property.cashflowReinvestment;
        
        // Calculate enhanced serviceability values
        const baseServiceabilityCapacity = profile.borrowingCapacity * 0.10;
        const rentalServiceabilityContribution = property.grossRentalIncome * 0.70;
        
        // Build all portfolio properties array
        const allPortfolioProperties = timelineProperties
          .filter(p => p.affordableYear <= year)
          .map(p => {
            const yearsOwned = year - p.affordableYear;
            const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
            // Use tiered growth with period-based calculations
            const currentValue = calculatePropertyGrowth(p.cost, periodsOwned, profile.growthCurve);
            const equity = currentValue - p.loanAmount;
            const extractable = Math.max(0, (currentValue * 0.80) - p.loanAmount);
            
            return {
              propertyId: p.id,
              propertyType: p.title,
              purchaseYear: p.affordableYear,
              displayPeriod: p.displayPeriod,
              originalCost: p.cost,
              currentValue,
              loanAmount: p.loanAmount,
              equity,
              extractableEquity: extractable,
            };
          });

        // Calculate period from year
        const periodNumber = Math.round((year - baseYear) * PERIODS_PER_YEAR) + 1;
        const displayPeriod = `${year} H${((periodNumber - 1) % PERIODS_PER_YEAR) + 1}`;
        
        const yearData: YearBreakdownData = {
          period: periodNumber,
          year,
          displayYear: yearIndex,
          displayPeriod,
          status: 'purchased',
          propertyNumber: propertyIndex,
          propertyType: property.title,
          
          // Portfolio metrics (from calculator)
          portfolioValue: property.portfolioValueAfter,
          totalEquity: property.totalEquityAfter,
          totalDebt: property.totalDebtAfter,
          extractableEquity,
          
          // Cash engine (from calculator)
          availableDeposit: property.availableFundsUsed,
          annualCashFlow: property.netCashflow,
          
          // Available funds breakdown (from calculator)
          baseDeposit: property.baseDeposit,
          cumulativeSavings: property.cumulativeSavings,
          cashflowReinvestment: property.cashflowReinvestment,
          equityRelease: property.equityRelease,
          annualSavingsRate,
          totalAnnualCapacity,
          
          // Cashflow components (from calculator)
          grossRental: property.grossRentalIncome,
          loanRepayments: property.loanInterest,
          expenses: property.expenses,
          
          // Requirements
          requiredDeposit: property.depositRequired,
          requiredLoan: property.loanAmount,
          propertyCost: property.cost,
          
          // Capacity (from calculator)
          availableBorrowingCapacity: property.borrowingCapacityRemaining,
          borrowingCapacity: profile.borrowingCapacity,
          
          // Debt breakdown
          existingDebt,
          newDebt,
          existingLoanInterest,
          newLoanInterest,
          
          // Enhanced serviceability breakdown
          baseServiceabilityCapacity,
          rentalServiceabilityContribution,
          
          // Assumptions (from calculator)
          interestRate: defaultInterestRate * 100,
          rentalRecognition: property.rentalRecognitionRate * 100,
          
          // Tests (from calculator)
          depositTest: {
            pass: property.depositTestPass,
            surplus: property.depositTestSurplus,
            available: property.availableFundsUsed,
            required: property.depositRequired,
          },
          
          borrowingCapacityTest: {
            pass: property.borrowingCapacityRemaining >= 0,
            surplus: property.borrowingCapacityRemaining,
            available: profile.borrowingCapacity,
            required: property.totalDebtAfter,
          },
          
          serviceabilityTest: {
            pass: property.serviceabilityTestPass,
            surplus: property.serviceabilityTestSurplus,
            available: baseServiceabilityCapacity + rentalServiceabilityContribution,
            required: property.loanAmount,
          },
          
          // Flags (from calculator)
          gapRule: property.isGapRuleBlocked,
          equityReleaseYear: property.equityRelease > 0,
          
          // Strategy metrics
          portfolioScaling: propertyIndex,
          selfFundingEfficiency: property.cost > 0 ? (property.netCashflow / property.cost) * 100 : 0,
          equityRecyclingImpact: property.portfolioValueAfter > 0 ? (property.totalEquityAfter / property.portfolioValueAfter) * 100 : 0,
          dsr,
          lvr,
          
          // Breakdown details - Include all properties purchased this year
          purchases: properties.map(prop => ({
            propertyId: prop.id,
            propertyType: prop.title,
            cost: prop.cost,
            deposit: prop.depositRequired,
            loanAmount: prop.loanAmount,
            loanType: prop.loanType,
            year,
            displayPeriod: prop.displayPeriod,
            currentValue: prop.cost,
            equity: prop.cost - prop.loanAmount,
            extractableEquity: Math.max(0, (prop.cost * 0.80) - prop.loanAmount),
            // Acquisition costs
            stampDuty: prop.acquisitionCosts?.stampDuty || 0,
            lmi: prop.acquisitionCosts?.lmi || 0,
            legalFees: prop.acquisitionCosts?.legalFees || 2000,
            inspectionFees: prop.acquisitionCosts?.inspectionFees || 650,
            otherFees: prop.acquisitionCosts?.otherFees || 1500,
            totalAcquisitionCosts: prop.acquisitionCosts?.total || 0,
          })),
          
          // All portfolio properties
          allPortfolioProperties,
        };

        years.push(yearData);
      } else {
        // This is a non-purchase year - interpolate portfolio state with real affordability tests
        const yearData = interpolateYearData(year, yearIndex, timelineProperties, profile, globalFactors, defaultInterestRate, defaultGrowthRate, selections, propertyTypes, calculateAffordabilityForProperty);
        years.push(yearData);
      }
    }

    return years;
  }, [timelineProperties, profile, globalFactors, selections, propertyTypes, calculateAffordabilityForProperty]);
  
  // Determine status based on timeline results
  const getTimelineStatus = (): 'feasible' | 'delayed' | 'challenging' => {
    if (calculations.totalProperties === 0) return 'feasible'
    
    const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible')
    const challengingProperties = timelineProperties.filter(p => p.status === 'challenging')
    
    if (challengingProperties.length > 0) return 'challenging'
    if (feasibleProperties.length < timelineProperties.length) return 'delayed'
    return 'feasible'
  }

  const timelineStatus = getTimelineStatus()

  // Generate unified timeline with individual property cards, pause blocks, and gaps
  const unifiedTimeline = useMemo(() => {
    if (!timelineProperties || timelineProperties.length === 0) {
      return [];
    }

    const timelineElements: Array<{
      type: 'purchase' | 'gap' | 'pause';
      property?: typeof timelineProperties[0];
      yearData?: YearBreakdownData;
      isLastPropertyInYear?: boolean;
      startYear?: number;
      endYear?: number;
      pauseId?: string;
      duration?: number;
    }> = [];

    // Filter out properties with Infinity affordableYear and sort by affordable year
    const sortedProperties = [...timelineProperties]
      .filter((p) => p.affordableYear !== Infinity)
      .sort((a, b) => a.affordableYear - b.affordableYear);

    // Build timeline with individual property cards, pause blocks, and gaps
    // We need to insert pause blocks based on their 'order' field
    let propertyIndex = 0;
    let pauseIndex = 0;
    let currentOrder = 0;

    // Sort pause blocks by order
    const sortedPauses = [...pauseBlocks].sort((a, b) => a.order - b.order);

    // Interleave properties and pauses based on order
    while (propertyIndex < sortedProperties.length || pauseIndex < sortedPauses.length) {
      // Check if there's a pause at this position
      if (pauseIndex < sortedPauses.length && sortedPauses[pauseIndex].order === currentOrder) {
        const pause = sortedPauses[pauseIndex];
        
        // Calculate pause year range
        let pauseStartYear = BASE_YEAR;
        let pauseEndYear = BASE_YEAR;
        
        if (propertyIndex > 0) {
          // Pause starts after the last property
          const lastProperty = sortedProperties[propertyIndex - 1];
          pauseStartYear = Math.ceil(lastProperty.affordableYear);
          pauseEndYear = pauseStartYear + Math.ceil(pause.duration) - 1;
        } else if (sortedProperties.length > 0) {
          // Pause at the very beginning (before any properties)
          pauseStartYear = BASE_YEAR;
          pauseEndYear = BASE_YEAR + Math.ceil(pause.duration) - 1;
        }
        
        timelineElements.push({
          type: 'pause',
          pauseId: pause.id,
          duration: pause.duration,
          startYear: pauseStartYear,
          endYear: pauseEndYear,
        });
        
        pauseIndex++;
        currentOrder++;
      } 
      // Add property if available
      else if (propertyIndex < sortedProperties.length) {
        const property = sortedProperties[propertyIndex];
        const currentYear = Math.round(property.affordableYear);
        const nextProperty = sortedProperties[propertyIndex + 1];
        const nextYear = nextProperty ? Math.round(nextProperty.affordableYear) : null;
        
        // Check if this is the last property in this year
        const isLastPropertyInYear = !nextProperty || nextYear !== currentYear;
        
        // Find year data for this year
        const yearData = fullYearlyBreakdown.find(y => Math.floor(y.year) === currentYear);
        
        // Add the property card
        timelineElements.push({
          type: 'purchase',
          property,
          yearData,
          isLastPropertyInYear,
        });

        // Add gap only after the last property of a year, if there's a gap to the next year
        if (isLastPropertyInYear && nextYear && nextYear > currentYear + 1) {
          const gapStart = currentYear + 1;
          const gapEnd = nextYear - 1;
          
          timelineElements.push({
            type: 'gap',
            startYear: gapStart,
            endYear: gapEnd,
          });
        }
        
        propertyIndex++;
        currentOrder++;
      } else {
        // No more properties, but there might be more pauses after the last property
        // Continue the loop to process remaining pauses
        currentOrder++;
      }
    }

    return timelineElements;
  }, [timelineProperties, fullYearlyBreakdown, pauseBlocks]);

  // Group timeline elements by year for the year circles
  const timelineByYear = useMemo(() => {
    const yearGroups: Array<{
      year: number;
      elements: typeof unifiedTimeline;
      height: number;
    }> = [];

    let currentYear: number | null = null;
    let currentElements: typeof unifiedTimeline = [];

    unifiedTimeline.forEach((element, index) => {
      if (element.type === 'purchase' && element.property) {
        const year = Math.round(element.property.affordableYear);
        
        if (currentYear !== year) {
          // New year - save previous group if exists
          if (currentYear !== null && currentElements.length > 0) {
            yearGroups.push({
              year: currentYear,
              elements: currentElements,
              height: 0 // Will be calculated after render
            });
          }
          
          // Start new group
          currentYear = year;
          currentElements = [element];
        } else {
          // Same year - add to current group
          currentElements.push(element);
        }
      } else if (element.type === 'gap' || element.type === 'pause') {
        // Save current year group before gap/pause
        if (currentYear !== null && currentElements.length > 0) {
          yearGroups.push({
            year: currentYear,
            elements: currentElements,
            height: 0
          });
          currentYear = null;
          currentElements = [];
        }
        
        // Add gap/pause as its own group
        yearGroups.push({
          year: element.startYear || 0,
          elements: [element],
          height: 0
        });
      }
    });

    // Don't forget the last group
    if (currentYear !== null && currentElements.length > 0) {
      yearGroups.push({
        year: currentYear,
        elements: currentElements,
        height: 0
      });
    }

    return yearGroups;
  }, [unifiedTimeline]);

  // Track heights of each year section for the vertical lines
  const [sectionHeights, setSectionHeights] = useState<Record<number, number>>({});
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    // Measure heights after render
    const heights: Record<number, number> = {};
    Object.entries(sectionRefs.current).forEach(([year, ref]) => {
      if (ref) {
        heights[parseInt(year)] = ref.offsetHeight;
      }
    });
    setSectionHeights(heights);
  }, [timelineByYear, unifiedTimeline]);

  return (
    <div className="relative">
      {isRecalculating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-medium">Recalculating timeline...</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-8">
        <CalendarIcon size={16} className="text-[#6b7280]" />
        <h3 className="text-[#111827] font-medium text-sm">
          Investment Timeline with Decision Engine
        </h3>
      </div>

      {unifiedTimeline.length === 0 && timelineProperties.filter(p => p.affordableYear === Infinity).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No properties selected. Add properties to see your investment timeline.</p>
        </div>
      ) : (
        <>

          {/* Timeline Layout */}
          <div className="flex gap-6">
            {/* Property Cards and Gaps */}
            <div className="flex-1 space-y-6">
              {timelineByYear.map((group, groupIndex) => (
                <div
                  key={`section-${group.year}-${groupIndex}`}
                  id={`year-${group.year}`}
                  ref={(el) => {
                    sectionRefs.current[group.year] = el;
                  }}
                >
                  
                  {/* Render elements for this year/section */}
                  <div className="space-y-4">
                    {group.elements.map((element, index) => {
                      if (element.type === 'purchase' && element.property && element.yearData) {
                        return (
                          <div key={`purchase-${element.property.id}-${index}`}>
                            <PurchaseEventCard
                              yearData={element.yearData}
                              property={element.property}
                              showDecisionEngine={element.isLastPropertyInYear || false}
                            />
                          </div>
                        );
                      } else if (element.type === 'pause' && element.pauseId && element.startYear && element.endYear && element.duration) {
                        return (
                          <PauseBlockCard
                            key={`pause-${element.pauseId}-${index}`}
                            pauseId={element.pauseId}
                            startYear={element.startYear}
                            endYear={element.endYear}
                            duration={element.duration}
                            onRemove={() => removePause(element.pauseId!)}
                            onUpdateDuration={(newDuration) => updatePauseDuration(element.pauseId!, newDuration)}
                          />
                        );
                      } else if (element.type === 'gap' && element.startYear && element.endYear) {
                        return (
                          <GapView
                            key={`gap-${element.startYear}-${element.endYear}`}
                            startYear={element.startYear}
                            endYear={element.endYear}
                            allYearData={fullYearlyBreakdown}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unaffordable Properties Section */}
          {timelineProperties.filter(p => p.affordableYear === Infinity).length > 0 && (
            <div className="mt-8 border-t-2 border-red-200 pt-6">
              <h4 className="text-sm font-medium text-red-600 mb-4">
                Properties That Cannot Be Afforded Within Timeline
              </h4>
              <div className="space-y-4">
                {timelineProperties
                  .filter(p => p.affordableYear === Infinity)
                  .map((property, index) => {
                    // Create a dummy yearData for these properties
                    const dummyYearData: YearBreakdownData = {
                      period: 0,
                      year: Infinity,
                      displayYear: 0,
                      displayPeriod: 'N/A',
                      status: 'blocked',
                      propertyNumber: null,
                      propertyType: property.title,
                      portfolioValue: 0,
                      totalEquity: 0,
                      totalDebt: 0,
                      extractableEquity: 0,
                      availableDeposit: 0,
                      annualCashFlow: 0,
                      baseDeposit: 0,
                      cumulativeSavings: 0,
                      cashflowReinvestment: 0,
                      equityRelease: 0,
                      annualSavingsRate: 0,
                      totalAnnualCapacity: 0,
                      grossRental: 0,
                      loanRepayments: 0,
                      expenses: 0,
                      requiredDeposit: property.depositRequired,
                      requiredLoan: property.loanAmount,
                      propertyCost: property.cost,
                      availableBorrowingCapacity: 0,
                      borrowingCapacity: profile.borrowingCapacity,
                      existingDebt: 0,
                      newDebt: 0,
                      existingLoanInterest: 0,
                      newLoanInterest: 0,
                      baseServiceabilityCapacity: 0,
                      rentalServiceabilityContribution: 0,
                      interestRate: 0,
                      rentalRecognition: 0,
                      depositTest: {
                        pass: property.depositTestPass,
                        surplus: property.depositTestSurplus,
                        available: property.availableFundsUsed,
                        required: property.depositRequired,
                      },
                      borrowingCapacityTest: {
                        pass: false,
                        surplus: 0,
                        available: profile.borrowingCapacity,
                        required: 0,
                      },
                      serviceabilityTest: {
                        pass: property.serviceabilityTestPass,
                        surplus: property.serviceabilityTestSurplus,
                        available: 0,
                        required: 0,
                      },
                      gapRule: false,
                      equityReleaseYear: false,
                      portfolioScaling: 0,
                      selfFundingEfficiency: 0,
                      equityRecyclingImpact: 0,
                      dsr: 0,
                      lvr: 0,
                      purchases: [],
                      allPortfolioProperties: [],
                    };
                    
                    return (
                      <PurchaseEventCard
                        key={`unaffordable-${property.id}-${index}`}
                        yearData={dummyYearData}
                        property={property}
                        showDecisionEngine={false}
                      />
                    );
                  })}
              </div>
              <div className="mt-4 text-sm text-gray-600 bg-red-50 p-4 rounded-md">
                <p className="font-medium mb-2">Why can't these properties be afforded?</p>
                <p className="mb-3">These properties cannot be purchased within your {profile.timelineYears}-year timeline due to the following constraints:</p>
                
                <div className="space-y-3">
                  {timelineProperties
                    .filter(p => p.affordableYear === Infinity)
                    .map((property, index) => {
                      const failures: string[] = [];
                      
                      // Check deposit test
                      if (!property.depositTestPass) {
                        const shortfall = Math.abs(property.depositTestSurplus);
                        failures.push(`Deposit shortfall: ${formatCurrency(shortfall)}`);
                      }
                      
                      // Check serviceability test
                      if (!property.serviceabilityTestPass) {
                        const shortfall = Math.abs(property.serviceabilityTestSurplus);
                        failures.push(`Serviceability shortfall: ${formatCurrency(shortfall)}`);
                      }
                      
                      // If both pass but still infinity, it's likely a borrowing capacity issue
                      if (property.depositTestPass && property.serviceabilityTestPass) {
                        failures.push(`Borrowing capacity exceeded (requires ${formatCurrency(property.loanAmount)} loan)`);
                      }
                      
                      return (
                        <div key={`failure-${property.id}-${index}`} className="border-l-4 border-red-400 pl-3">
                          <p className="font-medium text-gray-800">{property.title}</p>
                          <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-700">
                            {failures.map((failure, fIndex) => (
                              <li key={fIndex}>{failure}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

// Helper function to interpolate portfolio state for non-purchase years
function interpolateYearData(
  year: number,
  yearIndex: number,
  timelineProperties: any[],
  profile: any,
  globalFactors: any,
  interestRate: number,
  growthRate: number,
  selections: any,
  propertyTypes: any[],
  calculateAffordabilityForProperty: any
): YearBreakdownData {
  // Find the most recent purchase before this year
  const previousPurchases = timelineProperties
    .filter(prop => prop.affordableYear < year)
    .sort((a, b) => b.affordableYear - a.affordableYear);
  
  const lastPurchase = previousPurchases[0];
  
  if (!lastPurchase) {
    // No previous purchases - return initial state
    return createInitialYearData(year, yearIndex, profile, interestRate);
  }
  
  // Calculate years since last purchase
  const yearsSinceLastPurchase = year - lastPurchase.affordableYear;
  const periodsSinceLastPurchase = yearsSinceLastPurchase * PERIODS_PER_YEAR;
  
  // Interpolate portfolio growth with tiered rates using period-based calculations
  const portfolioValue = calculatePropertyGrowth(lastPurchase.portfolioValueAfter, periodsSinceLastPurchase, profile.growthCurve);
  const totalDebt = lastPurchase.totalDebtAfter; // Debt stays constant (interest-only loans)
  const totalEquity = portfolioValue - totalDebt;
  
  // Calculate cumulative savings growth
  const cumulativeSavings = profile.annualSavings * (year - BASE_YEAR);
  
  // Calculate cashflow from existing properties
  let grossRental = 0;
  let loanInterest = 0;
  let expenses = 0;
  
  previousPurchases.forEach(purchase => {
    const yearsOwned = year - purchase.affordableYear;
    const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
    if (yearsOwned > 0) {
      // Use tiered growth with period-based calculations
      const propertyValue = calculatePropertyGrowth(purchase.cost, periodsOwned, profile.growthCurve);
      const yieldRate = 0.05; // Assume 5% yield
      const rentalIncome = propertyValue * yieldRate;
      const propertyLoanInterest = purchase.loanAmount * interestRate;
      const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
      const propertyExpenses = rentalIncome * 0.30 * inflationFactor;
      
      grossRental += rentalIncome;
      loanInterest += propertyLoanInterest;
      expenses += propertyExpenses;
    }
  });
  
  const netCashflow = grossRental - loanInterest - expenses;
  const availableDeposit = profile.depositPool + cumulativeSavings + Math.max(0, netCashflow);
  
  // Calculate LVR and DSR
  const lvr = portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0;
  const dsr = grossRental > 0 ? (loanInterest / grossRental) * 100 : 0;
  
  // Run affordability tests for the next property that should be purchased
  let depositTestSurplus = 0;
  let depositTestPass = true;
  let serviceabilityTestSurplus = 0;
  let serviceabilityTestPass = true;
  let requiredDeposit = 0;
  let requiredLoan = 0;
  let propertyCost = 0;
  let status: 'initial' | 'purchased' | 'blocked' | 'waiting' = 'waiting';
  
  if (year === 2025) {
    status = 'initial';
  } else {
    // Find the next property that should be purchased
    const nextProperty = findNextPropertyToPurchase(selections, propertyTypes, timelineProperties, year);
    
    if (nextProperty) {
      // Convert timelineProperties to purchase history format
      const purchaseHistory = timelineProperties
        .filter(prop => prop.affordableYear < year)
        .map(prop => ({
          year: prop.affordableYear - 2025 + 1, // Convert to relative year
          cost: prop.cost,
          depositRequired: prop.depositRequired,
          loanAmount: prop.loanAmount,
          title: prop.title
        }));
      
      // Run affordability tests
      const affordabilityResult = calculateAffordabilityForProperty(year - 2025 + 1, nextProperty, purchaseHistory);
      
      depositTestSurplus = affordabilityResult.depositTestSurplus;
      depositTestPass = affordabilityResult.depositTestPass;
      serviceabilityTestSurplus = affordabilityResult.serviceabilityTestSurplus;
      serviceabilityTestPass = affordabilityResult.serviceabilityTestPass;
      requiredDeposit = nextProperty.depositRequired;
      requiredLoan = nextProperty.cost - nextProperty.depositRequired;
      propertyCost = nextProperty.cost;
      
      // Determine status based on test results
      if (!depositTestPass || !serviceabilityTestPass) {
        status = 'blocked';
      } else {
        status = 'waiting';
      }
    }
  }
  
  // Calculate new fields for pure presentation
  const extractableEquity = Math.max(0, (portfolioValue * 0.80) - totalDebt);
  const existingDebt = totalDebt;
  const newDebt = requiredLoan;
  const existingLoanInterest = existingDebt * interestRate;
  const newLoanInterest = newDebt * interestRate;
  const annualSavingsRate = profile.annualSavings;
  const totalAnnualCapacity = annualSavingsRate + Math.max(0, netCashflow);
  
  // Calculate base deposit remaining (after previous purchases)
  const totalDepositsUsed = timelineProperties
    .filter(p => p.affordableYear < year)
    .reduce((sum, p) => sum + p.depositRequired, 0);
  const baseDepositRemaining = Math.max(0, profile.depositPool - totalDepositsUsed);
  
  // Build all portfolio properties array
  const allPortfolioProperties = timelineProperties
    .filter(p => p.affordableYear < year)
    .map(p => {
      const yearsOwned = year - p.affordableYear;
      const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
      // Use tiered growth with period-based calculations
      const currentValue = calculatePropertyGrowth(p.cost, periodsOwned, profile.growthCurve);
      const equity = currentValue - p.loanAmount;
      const extractable = Math.max(0, (currentValue * 0.80) - p.loanAmount);
      
      return {
        propertyId: p.id,
        propertyType: p.title,
        purchaseYear: p.affordableYear,
        displayPeriod: p.displayPeriod,
        originalCost: p.cost,
        currentValue,
        loanAmount: p.loanAmount,
        equity,
        extractableEquity: extractable,
      };
    });

  // Calculate effective borrowing capacity with equity boost
  let totalUsableEquity = 0;
  if (profile.portfolioValue > 0) {
    const periodsElapsed = (year - BASE_YEAR) * PERIODS_PER_YEAR;
    const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, periodsElapsed, profile.growthCurve);
    totalUsableEquity += Math.max(0, grownPortfolioValue * 0.88 - profile.currentDebt);
  }
  previousPurchases.forEach(purchase => {
    const yearsOwned = year - purchase.affordableYear;
    const periodsOwned = yearsOwned * PERIODS_PER_YEAR;
    const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, profile.growthCurve);
    const usableEquity = Math.max(0, currentValue * 0.88 - purchase.loanAmount);
    totalUsableEquity += usableEquity;
  });
  
  const equityBoost = totalUsableEquity * profile.equityFactor;
  const effectiveBorrowingCapacity = profile.borrowingCapacity + equityBoost;
  const availableBorrowingCapacityValue = Math.max(0, effectiveBorrowingCapacity - totalDebt);

  // Calculate period from year
  const periodNumber = Math.round((year - BASE_YEAR) * PERIODS_PER_YEAR) + 1;
  const displayPeriod = `${year} H${((periodNumber - 1) % PERIODS_PER_YEAR) + 1}`;
  
  return {
    period: periodNumber,
    year,
    displayYear: yearIndex,
    displayPeriod,
    status,
    propertyNumber: null,
    propertyType: null,
    
    // Portfolio metrics (interpolated)
    portfolioValue,
    totalEquity,
    totalDebt,
    extractableEquity,
    
    // Cash engine (interpolated)
    availableDeposit,
    annualCashFlow: netCashflow,
    
    // Available funds breakdown (interpolated)
    baseDeposit: baseDepositRemaining, // Rolling amount based on deposits used
    cumulativeSavings,
    cashflowReinvestment: Math.max(0, netCashflow),
    equityRelease: 0, // No equity release in non-purchase years
    annualSavingsRate,
    totalAnnualCapacity,
    
    // Cashflow components (interpolated)
    grossRental,
    loanRepayments: loanInterest,
    expenses,
    
    // Requirements (from affordability tests)
    requiredDeposit,
    requiredLoan,
    propertyCost,
    
    // Capacity
    availableBorrowingCapacity: availableBorrowingCapacityValue,
    borrowingCapacity: profile.borrowingCapacity,
    
    // Debt breakdown
    existingDebt,
    newDebt,
    existingLoanInterest,
    newLoanInterest,
    
    // Enhanced serviceability breakdown
    baseServiceabilityCapacity: profile.borrowingCapacity * 0.10,
    rentalServiceabilityContribution: grossRental * 0.70,
    
    // Assumptions
    interestRate: interestRate * 100,
    rentalRecognition: 75, // Default recognition rate
    
    // Tests (from real affordability calculations)
    depositTest: {
      pass: depositTestPass,
      surplus: depositTestSurplus,
      available: availableDeposit,
      required: requiredDeposit,
    },
    
    borrowingCapacityTest: {
      pass: availableBorrowingCapacityValue >= newDebt,
      surplus: availableBorrowingCapacityValue - newDebt,
      available: profile.borrowingCapacity,
      required: totalDebt + newDebt,
    },
    
    serviceabilityTest: {
      pass: serviceabilityTestPass,
      surplus: serviceabilityTestSurplus,
      available: profile.borrowingCapacity * 0.10 + grossRental * 0.70,
      required: requiredLoan,
    },
    
    // Flags
    gapRule: false,
    equityReleaseYear: false,
    
    // Strategy metrics
    portfolioScaling: previousPurchases.length,
    selfFundingEfficiency: 0,
    equityRecyclingImpact: 0,
    dsr,
    lvr,
    
    // Breakdown details
    purchases: [],
    
    // All portfolio properties
    allPortfolioProperties,
  };
}

// Helper function to find the next property that should be purchased
function findNextPropertyToPurchase(
  selections: any,
  propertyTypes: any[],
  timelineProperties: any[],
  currentYear: number
): any | null {
  // Get all properties that should be purchased
  const allPropertiesToPurchase: Array<{ property: any; index: number }> = [];
  
  Object.entries(selections).forEach(([propertyId, quantity]) => {
    if (quantity > 0) {
      const property = propertyTypes.find(p => p.id === propertyId);
      if (property) {
        for (let i = 0; i < quantity; i++) {
          allPropertiesToPurchase.push({ property, index: i });
        }
      }
    }
  });

  // Find the first property that hasn't been purchased yet
  for (const { property, index } of allPropertiesToPurchase) {
    const propertyId = `${property.id}_${index}`;
    const existingProperty = timelineProperties.find(prop => prop.id === propertyId);
    
    if (!existingProperty || existingProperty.affordableYear > currentYear) {
      return property;
    }
  }
  
  return null;
}

// Helper function to create initial year data
function createInitialYearData(year: number, yearIndex: number, profile: any, defaultInterestRate: number): YearBreakdownData {
  const portfolioValue = profile.portfolioValue;
  const totalDebt = profile.currentDebt;
  const extractableEquity = Math.max(0, (portfolioValue * 0.80) - totalDebt);
  const annualSavingsRate = profile.annualSavings;
  
  // Calculate effective borrowing capacity with equity boost (for initial portfolio)
  let totalUsableEquity = 0;
  if (portfolioValue > 0) {
    totalUsableEquity = Math.max(0, portfolioValue * 0.88 - totalDebt);
  }
  const equityBoost = totalUsableEquity * profile.equityFactor;
  const effectiveBorrowingCapacity = profile.borrowingCapacity + equityBoost;
  const availableBorrowingCapacityValue = Math.max(0, effectiveBorrowingCapacity - totalDebt);
  
  // Calculate period from year
  const periodNumber = Math.round((year - BASE_YEAR) * PERIODS_PER_YEAR) + 1;
  const displayPeriod = `${year} H${((periodNumber - 1) % PERIODS_PER_YEAR) + 1}`;
  
  return {
    period: periodNumber,
    year,
    displayYear: yearIndex,
    displayPeriod,
    status: 'initial',
    propertyNumber: null,
    propertyType: null,
    
    // Portfolio metrics (initial state)
  portfolioValue,
    totalEquity: portfolioValue - totalDebt,
    totalDebt,
    extractableEquity,
    
    // Cash engine (initial state)
    availableDeposit: profile.depositPool,
    annualCashFlow: 0,
    
    // Available funds breakdown (initial state)
    baseDeposit: profile.depositPool,
    cumulativeSavings: 0,
    cashflowReinvestment: 0,
    equityRelease: 0,
    annualSavingsRate,
    totalAnnualCapacity: annualSavingsRate,
    
    // Cashflow components (initial state)
    grossRental: 0,
    loanRepayments: 0,
    expenses: 0,
    
    // Requirements (not applicable)
    requiredDeposit: 0,
    requiredLoan: 0,
    propertyCost: 0,
    
    // Capacity
    availableBorrowingCapacity: availableBorrowingCapacityValue,
    borrowingCapacity: profile.borrowingCapacity,
    
    // Debt breakdown
    existingDebt: totalDebt,
    newDebt: 0,
    existingLoanInterest: totalDebt * defaultInterestRate,
    newLoanInterest: 0,
    
    // Enhanced serviceability breakdown
    baseServiceabilityCapacity: profile.borrowingCapacity * 0.10,
    rentalServiceabilityContribution: 0,
    
    // Assumptions
    interestRate: defaultInterestRate * 100,
    rentalRecognition: 75,
    
    // Tests (not applicable)
    depositTest: {
      pass: true,
      surplus: 0,
      available: profile.depositPool,
      required: 0,
    },
    
    borrowingCapacityTest: {
      pass: availableBorrowingCapacityValue >= 0,
      surplus: availableBorrowingCapacityValue,
      available: profile.borrowingCapacity,
      required: totalDebt,
    },
    
    serviceabilityTest: {
      pass: true,
      surplus: 0,
      available: profile.borrowingCapacity,
      required: 0,
    },
    
    // Flags
    gapRule: false,
    equityReleaseYear: false,
    
    // Strategy metrics
    portfolioScaling: 0,
    selfFundingEfficiency: 0,
    equityRecyclingImpact: 0,
    dsr: 0,
    lvr: portfolioValue > 0 ? (totalDebt / portfolioValue) * 100 : 0,
    
    // Breakdown details
    purchases: [],
    
    // All portfolio properties (empty initially)
    allPortfolioProperties: [],
  };
}

// Add display name for forwardRef component
InvestmentTimeline.displayName = 'InvestmentTimeline';
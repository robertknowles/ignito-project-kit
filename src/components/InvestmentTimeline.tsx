import React, { useMemo, useRef, useEffect, useState } from 'react'
import {
  CalendarIcon,
  Loader2,
} from 'lucide-react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { usePropertySelection, type EventBlock } from '../contexts/PropertySelectionContext'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useScenarioSave } from '../contexts/ScenarioSaveContext'
import { usePortfolioProjection } from '../hooks/usePortfolioProjection'
import { PurchaseEventCard } from './PurchaseEventCard'
import { PauseBlockCard } from './PauseBlockCard'
import { EventBlockCard } from './EventBlockCard'
import type { YearBreakdownData } from '@/types/property'
import {
  BASE_YEAR,
  PERIODS_PER_YEAR,
} from '../constants/financialParams';

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
    <div id="timeline-progress-bar" className="py-3 px-6">
      {/* Responsive flex container: wraps to multiple lines, no horizontal scrollbar */}
      <div className="flex flex-wrap gap-1.5">
        {years.map((year, index) => {
          const isPast = year < currentYear;
          const isPurchaseYear = purchaseYears.includes(year);
          
          // Find if this year is between purchase years
          const minPurchaseYear = purchaseYears.length > 0 ? Math.min(...purchaseYears) : Infinity;
          const maxPurchaseYear = purchaseYears.length > 0 ? Math.max(...purchaseYears) : -Infinity;
          const isBetweenPurchases = year > minPurchaseYear && year < maxPurchaseYear && !isPurchaseYear;
          
          // Determine colors based on the state
          let bgColor = '#f3f4f6'; // Light gray for future years
          let textColor = '#6b7280'; // Gray text for future
          let borderColor = '#e5e7eb'; // Border for future years
          
          if (isPast) {
            bgColor = '#9ca3af'; // Grey for past years
            textColor = '#ffffff'; // White text
            borderColor = '#9ca3af';
          } else if (isPurchaseYear) {
            bgColor = '#4A7BF7'; // Blue for purchase years
            textColor = '#ffffff'; // White text
            borderColor = '#4A7BF7';
          } else if (isBetweenPurchases) {
            bgColor = '#d1d5db'; // Darker grey for years between purchases
            textColor = '#4b5563'; // Darker text color
            borderColor = '#d1d5db';
          }
          
          return (
            <button
              key={year}
              onClick={() => onYearClick(year)}
              className="transition-all hover:opacity-80 hover:scale-105 flex items-center justify-center font-medium rounded-full"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                height: '32px',
                minWidth: '52px',
                padding: '0 12px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
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

// Export timeline data for use in parent components
export const useTimelineData = () => {
  const { profile } = useInvestmentProfile()
  const { timelineProperties } = useAffordabilityCalculator()
  
  const startYear = BASE_YEAR;
  const endYear = startYear + (profile.timelineYears || 20) - 1;
  
  // Filter out properties with Infinity affordableYear
  const affordableProperties = timelineProperties.filter(p => p.affordableYear !== Infinity);
  
  // Use Math.floor for consistent calendar year display (2026.5 belongs to 2026)
  const latestPurchaseYear = affordableProperties.length > 0
    ? Math.max(...affordableProperties.map(p => Math.floor(p.affordableYear)))
    : startYear;
  
  // Get all unique purchase years (excluding Infinity)
  const purchaseYears = affordableProperties.length > 0
    ? [...new Set(affordableProperties.map(p => Math.floor(p.affordableYear)))]
    : [];
  
  return {
    startYear,
    endYear,
    latestPurchaseYear,
    purchaseYears,
  };
};

interface InvestmentTimelineProps {
  onInspectProperty?: (propertyInstanceId: string) => void;
}

export const InvestmentTimeline = React.forwardRef<{ scrollToYear: (year: number) => void }, InvestmentTimelineProps>((props, ref) => {
  const { onInspectProperty } = props;
  const { calculatedValues, profile } = useInvestmentProfile()
  const { calculations, checkFeasibility, pauseBlocks, eventBlocks, propertyTypes, selections, removePause, updatePauseDuration, removeEvent } = usePropertySelection()
  const { timelineProperties, updateTimelinePropertyLoanType, isRecalculating } = useAffordabilityCalculator()
  const { setTimelineSnapshot } = useScenarioSave()
  const { roadmapData } = usePortfolioProjection()
  
  // Sync timeline properties to context for saving
  useEffect(() => {
    if (timelineProperties && timelineProperties.length > 0) {
      setTimelineSnapshot(timelineProperties);
    }
  }, [timelineProperties, setTimelineSnapshot]);
  
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
  
  const fullYearlyBreakdown = useMemo((): YearBreakdownData[] => {
    return roadmapData.years
      .map(y => y.yearBreakdownData)
      .filter((d): d is YearBreakdownData => !!d);
  }, [roadmapData.years]);
  
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
      type: 'purchase' | 'gap' | 'pause' | 'event';
      property?: typeof timelineProperties[0];
      yearData?: YearBreakdownData;
      isLastPropertyInYear?: boolean;
      startYear?: number;
      endYear?: number;
      pauseId?: string;
      duration?: number;
      event?: EventBlock;
    }> = [];

    // Keep properties in user-defined order (FIFO) - only filter out unaffordable ones
    // Do NOT sort by affordableYear - preserve the order properties were added by the user
    const sortedProperties = [...timelineProperties]
      .filter((p) => p.affordableYear !== Infinity);

    // Build timeline with individual property cards, pause blocks, events, and gaps
    // We need to insert pause blocks and events based on their 'order' field
    let propertyIndex = 0;
    let pauseIndex = 0;
    let eventIndex = 0;
    let currentOrder = 0;

    // Sort pause blocks and events by order
    const sortedPauses = [...pauseBlocks].sort((a, b) => a.order - b.order);
    const sortedEvents = [...eventBlocks].sort((a, b) => a.order - b.order);

    // Interleave properties, pauses, and events based on order
    while (propertyIndex < sortedProperties.length || pauseIndex < sortedPauses.length || eventIndex < sortedEvents.length) {
      // Check if there's an event at this position
      if (eventIndex < sortedEvents.length && sortedEvents[eventIndex].order === currentOrder) {
        const event = sortedEvents[eventIndex];
        timelineElements.push({
          type: 'event',
          event,
        });
        eventIndex++;
        currentOrder++;
      }
      // Check if there's a pause at this position
      else if (pauseIndex < sortedPauses.length && sortedPauses[pauseIndex].order === currentOrder) {
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
        const nextProperty = sortedProperties[propertyIndex + 1];
        
        // Use Math.floor to determine calendar year (2026.5 belongs to 2026, not 2027)
        // This properly handles 6-month increment calculations
        const currentYear = Math.floor(property.affordableYear);
        const nextYear = nextProperty ? Math.floor(nextProperty.affordableYear) : null;
        
        // Check if this is the last property in this calendar year
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

        // Add gap only after the last property of a year, if there's a genuine multi-year gap to the next purchase
        // A gap exists only when there's at least one full calendar year between purchases
        // e.g., 2026 -> 2028 has a gap (2027), but 2026 -> 2027 has no gap
        if (isLastPropertyInYear && nextYear && nextYear > currentYear + 1) {
          const gapStart = currentYear + 1;
          const gapEnd = nextYear - 1;
          
          // Only add gap if there's actually a year gap (gapEnd >= gapStart)
          if (gapEnd >= gapStart) {
            timelineElements.push({
              type: 'gap',
              startYear: gapStart,
              endYear: gapEnd,
            });
          }
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
  }, [timelineProperties, fullYearlyBreakdown, pauseBlocks, eventBlocks]);

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
        // Use Math.floor for consistent calendar year grouping (2026.5 belongs to 2026)
        const year = Math.floor(element.property.affordableYear);
        
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
      } else if (element.type === 'gap' || element.type === 'pause' || element.type === 'event') {
        // Save current year group before gap/pause/event
        if (currentYear !== null && currentElements.length > 0) {
          yearGroups.push({
            year: currentYear,
            elements: currentElements,
            height: 0
          });
          currentYear = null;
          currentElements = [];
        }
        
        // Add gap/pause/event as its own group
        // For events, use the event's period converted to year
        const elementYear = element.type === 'event' && element.event 
          ? BASE_YEAR + Math.floor((element.event.period - 1) / PERIODS_PER_YEAR)
          : element.startYear || 0;
        yearGroups.push({
          year: elementYear,
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
    <div id="investment-timeline" className="relative">
      {isRecalculating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-medium">Recalculating timeline...</span>
          </div>
        </div>
      )}

      {unifiedTimeline.length === 0 && timelineProperties.filter(p => p.affordableYear === Infinity).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No properties selected. Add properties to see your investment timeline.</p>
        </div>
      ) : (
        <>

          {/* Timeline Layout */}
          <div className="flex gap-6">
            {/* Property Cards and Gaps */}
            <div className="flex-1 space-y-6 min-w-0">
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
                              yearData={element.yearData!}
                              property={element.property}
                              showDecisionEngine={true}
                              onInspectProperty={onInspectProperty}
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
                      } else if (element.type === 'event' && element.event) {
                        return (
                          <EventBlockCard
                            key={`event-${element.event.id}-${index}`}
                            event={element.event}
                            onRemove={() => removeEvent(element.event!.id)}
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
                        onInspectProperty={onInspectProperty}
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

InvestmentTimeline.displayName = 'InvestmentTimeline';
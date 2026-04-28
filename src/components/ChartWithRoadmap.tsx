import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  Label,
} from 'recharts';
import { AlertTriangle, Info, Check } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useRoadmapData, YearData, FundingBreakdown, EventSummary } from '../hooks/useRoadmapData';
import { calculateRefinanceTriggers, type RefinanceTrigger } from '../utils/refinanceTriggerCalculator';
import { EVENT_CATEGORIES } from '../constants/eventTypes';
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { usePropertyDragDropContext, DraggedProperty } from '../contexts/PropertyDragDropContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { validatePropertyPlacement, isPlacementValid, ValidationResult } from '../utils/guardrailValidator';
import { getPropertyTypeIcon } from '../utils/propertyTypeIcon';
import { MiniPurchaseCard } from './MiniPurchaseCard';
import { SingleTestModal, TestType } from './SingleTestModal';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { GuardrailFixModal } from './GuardrailFixModal';
import { TourStep } from '@/components/TourManager';
import { useLayout } from '@/contexts/LayoutContext';
import type { TimelineProperty } from '../types/property';
import type { GuardrailViolation } from '../utils/guardrailValidator';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import { BASE_YEAR, PERIODS_PER_YEAR } from '../constants/financialParams';

// Column dimension constants
// IMPORTANT: LABEL_COLUMN_WIDTH and Y_AXIS_WIDTH must stay equal for chart/table alignment
const LABEL_COLUMN_WIDTH = 80;
const MIN_YEAR_COLUMN_WIDTH = 50; // Minimum readable width
const MAX_YEAR_COLUMN_WIDTH = 120; // Maximum comfortable width
const Y_AXIS_WIDTH = 80; // Width for the chart Y-axis - must match LABEL_COLUMN_WIDTH
const CHART_HEIGHT = 276; // Height of the chart area (matches Financial Summary table height)

// Period conversion constants (matching useAffordabilityCalculator)

// Convert year to period (for drag-and-drop targeting)
const yearToPeriod = (year: number): number => {
  return Math.round((year - BASE_YEAR) * PERIODS_PER_YEAR) + 1;
};

// Convert period to year (for display)
const periodToYear = (period: number): number => {
  return BASE_YEAR + (period - 1) / PERIODS_PER_YEAR;
};

// Format currency for display
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Format compact currency for table cells (handles negative values)
const formatCompactCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}$${Math.round(absValue / 1000000)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${Math.round(absValue / 1000)}k`;
  }
  return `${sign}$${Math.round(absValue)}`;
};

// Determine if property is a house type (for color coding)
const isHouseType = (propertyTitle: string): boolean => {
  const normalized = propertyTitle.toLowerCase();
  return normalized.includes('house') || 
         normalized.includes('villa') || 
         normalized.includes('townhouse') ||
         normalized.includes('duplex');
};

// Inline StatusPill component - now clickable when onClick is provided
interface StatusPillProps {
  status: 'pass' | 'fail' | 'na';
  onClick?: () => void;
  isClickable?: boolean;
}

const StatusPill: React.FC<StatusPillProps> = ({ status, onClick, isClickable = false }) => {
  const baseClasses = "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium";
  const clickableClasses = isClickable 
    ? "cursor-pointer border border-gray-300 shadow hover:shadow-lg hover:-translate-y-0.5 hover:brightness-105 active:scale-95 active:shadow-sm active:translate-y-0 transition-all duration-150 ease-in-out" 
    : "";
  
  if (status === 'pass') {
    return (
      <span 
        className={`${baseClasses} ${isClickable ? 'bg-green-50 border-green-300' : 'bg-green-100'} text-green-700 ${clickableClasses}`}
        onClick={onClick}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        title={isClickable ? "Click for details" : undefined}
      >
        ✓
      </span>
    );
  }
  if (status === 'fail') {
    return (
      <span 
        className={`${baseClasses} ${isClickable ? 'bg-red-50 border-red-300' : 'bg-red-100'} text-red-700 ${clickableClasses}`}
        onClick={onClick}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        title={isClickable ? "Click for details" : undefined}
      >
        ✗
      </span>
    );
  }
  return (
    <span className={`${baseClasses} bg-gray-100 text-gray-400`}>
      –
    </span>
  );
};

// Custom tooltip factory — accepts refinanceTriggers to show refinance info
const createCustomTooltip = (refinanceTriggers: RefinanceTrigger[]) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const yearTriggers = refinanceTriggers.filter(t => t.triggerYear === Number(label));
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
          <p className="text-xs font-medium text-gray-900 mb-2">Year: {label}</p>
          <p className="text-xs text-gray-500">
            Portfolio: {formatCurrency(data?.portfolioValue || 0)}
          </p>
          <p className="text-xs text-blue-600 font-medium">
            Equity: {formatCurrency(data?.totalEquity || 0)}
          </p>
          {data?.doNothingBalance > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Savings Only: {formatCurrency(data.doNothingBalance)}
            </p>
          )}
          {yearTriggers.map(t => (
            <p key={t.instanceId} className="text-xs text-amber-600 mt-1">
              {t.propertyTitle}: Refinance-ready — {formatCurrency(t.extractableEquity)} extractable
            </p>
          ))}
          {data?.purchaseInYear && data?.purchaseDetails && data.purchaseDetails.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              {data.purchaseDetails.map((purchase: any, idx: number) => (
                <p key={idx} className="text-xs font-medium text-gray-700">
                  {purchase.propertyTitle}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };
  return CustomTooltip;
};

// Custom dot component for property markers
interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: any;
  onPropertyClick?: (instanceId: string) => void;
}

const CustomDot = (props: CustomDotProps) => {
  const { cx, cy, payload, onPropertyClick } = props;
  
  // Protect against invalid coordinates
  if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null;
  
  // Only show marker if there's a purchase this year
  // Note: We now use draggable overlays for property icons, so this is mostly for fallback
  if (!payload?.purchaseInYear || !payload?.purchaseDetails || payload.purchaseDetails.length === 0) {
    return null;
  }
  
  // Use first purchase for the dot marker (stacked properties shown via DraggablePropertyIcon)
  const firstPurchase = payload.purchaseDetails[0];
  const propertyTitle = firstPurchase.propertyTitle;
  const instanceId = firstPurchase.instanceId;
  const isHouse = isHouseType(propertyTitle);
  const borderColor = CHART_COLORS.annotationText; // Grey border
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPropertyClick && instanceId) {
      onPropertyClick(instanceId);
    }
  };
  
  return (
    <foreignObject x={cx - 17} y={cy - 17} width={34} height={34}>
      <div 
        className={`w-[34px] h-[34px] bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden ${onPropertyClick ? 'cursor-pointer hover:scale-110 hover:shadow-md transition-all duration-150' : ''}`}
        style={{ border: `1px solid ${borderColor}` }}
        onClick={handleClick}
        title={onPropertyClick ? `Click for details: ${propertyTitle}` : undefined}
      >
        <div style={{ transform: isHouse ? 'scale(1.4)' : 'scale(1.4) translateY(-3px)' }}>
          {getPropertyTypeIcon(propertyTitle, 34, isHouse ? 'text-green-600' : 'text-blue-600')}
        </div>
      </div>
    </foreignObject>
  );
};

// Draggable Property Icon component for the overlay
interface DraggablePropertyIconProps {
  property: TimelineProperty;
  x: number;
  y: number;
  isDragging: boolean;
  hasViolations: boolean;
  isAmended: boolean;
  onPropertyClick: (instanceId: string) => void;
}

const DraggablePropertyIcon: React.FC<DraggablePropertyIconProps> = ({
  property,
  x,
  y,
  isDragging,
  hasViolations,
  isAmended,
  onPropertyClick,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `draggable-${property.instanceId}`,
    data: {
      instanceId: property.instanceId,
      propertyId: property.id,
      title: property.title,
      currentPeriod: property.period,
      cost: property.cost,
      depositRequired: property.depositRequired,
      loanAmount: property.loanAmount,
    } as DraggedProperty,
  });

  const isHouse = isHouseType(property.title);
  const borderColor = hasViolations ? '#ef4444' : CHART_COLORS.annotationText; // Grey border, red for violations
  const borderWidth = hasViolations ? 2 : 1;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: x - 17,
    top: y - 17,
    width: 34,
    height: 34,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 1000 : 10,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPropertyClick(property.instanceId);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="touch-none"
    >
      <div
        className={`w-[34px] h-[34px] bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden hover:scale-110 hover:shadow-md transition-all duration-150 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ border: `${borderWidth}px solid ${borderColor}` }}
        onClick={handleClick}
        title={`Drag to move: ${property.title}`}
      >
        <div style={{ transform: isHouse ? 'scale(1.4)' : 'scale(1.4) translateY(-3px)' }}>
          {getPropertyTypeIcon(property.title, 34, isHouse ? 'text-green-600' : 'text-blue-600')}
        </div>
      </div>
      {/* Warning indicator for violations */}
      {hasViolations && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <AlertTriangle size={10} className="text-white" />
        </div>
      )}
      {/* Green tick indicator for successfully amended properties */}
      {isAmended && !hasViolations && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-md">
          <Check size={10} className="text-white" />
        </div>
      )}
    </div>
  );
};

// Droppable Year Column overlay component
interface DroppableYearColumnProps {
  year: number;
  period: number;
  x: number;
  width: number;
  height: number;
  isOver: boolean;
  isValid: boolean | null;
  isDragActive: boolean;
}

const DroppableYearColumn: React.FC<DroppableYearColumnProps> = ({
  year,
  period,
  x,
  width,
  height,
  isOver,
  isValid,
  isDragActive,
}) => {
  const { setNodeRef } = useDroppable({
    id: `period-${period}`,
  });

  // Only show highlight when dragging
  if (!isDragActive) {
    return (
      <div
        ref={setNodeRef}
        style={{
          position: 'absolute',
          left: x,
          top: 0,
          width: width,
          height: height,
          pointerEvents: 'auto',
        }}
      />
    );
  }

  // Determine background color based on validation
  let backgroundColor = 'transparent';
  let borderColor = 'transparent';
  
  if (isOver) {
    if (isValid === true) {
      backgroundColor = 'rgba(34, 197, 94, 0.15)'; // Green
      borderColor = '#22c55e';
    } else if (isValid === false) {
      backgroundColor = 'rgba(239, 68, 68, 0.15)'; // Red
      borderColor = '#ef4444';
    }
  } else if (isDragActive) {
    // Show subtle highlight for all columns during drag
    backgroundColor = CHART_COLORS.grid;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: width,
        height: height,
        backgroundColor,
        borderLeft: isOver ? `2px solid ${borderColor}` : 'none',
        borderRight: isOver ? `2px solid ${borderColor}` : 'none',
        transition: 'all 150ms ease-in-out',
        pointerEvents: 'auto',
      }}
    />
  );
};

// Goal Achievement Label component (empty - we only show the yellow dot)
const GoalAchievedLabel = () => {
  return null;
};

interface ChartWithRoadmapProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

export const ChartWithRoadmap: React.FC<ChartWithRoadmapProps> = ({ scenarioData }) => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimelineProperties, previewPlacementAtPeriod, isRecalculating } = useAffordabilityCalculator();
  const { getInstance, updateInstance } = usePropertyInstance();
  
  // Use scenarioData if provided (multi-scenario mode), otherwise use context
  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties;
  
  // Pass scenario data to useRoadmapData so it uses the correct data source
  const { years } = useRoadmapData(scenarioData ? { profile, timelineProperties } : undefined);
  
  // Drag-and-drop state management (from shared context)
  const {
    draggedProperty,
    targetPeriod,
    isDragging,
    setPlacementValidator,
  } = usePropertyDragDropContext();
  const { highlightPeriod } = useLayout();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartPlotArea, setChartPlotArea] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Modal state for single test funnel
  const [selectedTest, setSelectedTest] = useState<{
    year: number;
    type: TestType;
    yearData: YearData;
  } | null>(null);
  
  // Modal state for property details
  const [selectedProperty, setSelectedProperty] = useState<TimelineProperty | null>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  
  // Modal state for guardrail fix (shown when clicking property with violations)
  const [isGuardrailFixModalOpen, setIsGuardrailFixModalOpen] = useState(false);
  const [currentViolations, setCurrentViolations] = useState<GuardrailViolation[]>([]);
  
  // Validation state for drag-over feedback
  const [hoverValidation, setHoverValidation] = useState<{ period: number; isValid: boolean } | null>(null);
  
  // Ref to track validation state and prevent infinite loops
  // We use a ref to avoid triggering re-renders when tracking validation state
  const validationStateRef = useRef<{
    lastDraggedInstanceId: string | null;
    lastTargetPeriod: number | null;
    lastValidationResult: boolean | null;
  }>({
    lastDraggedInstanceId: null,
    lastTargetPeriod: null,
    lastValidationResult: null,
  });
  
  // Expandable row state for Available Funds breakdown
  
  // Get violations for a property
  const getPropertyViolations = useCallback((property: TimelineProperty): GuardrailViolation[] => {
    const violations: GuardrailViolation[] = [];
    
    // Check if property has been manually placed and is violating constraints
    const instance = getInstance(property.instanceId);
    if (!instance?.isManuallyPlaced) {
      // Non-manually placed properties are auto-calculated to be valid
      return violations;
    }
    
    // Check deposit test
    if (!property.depositTestPass) {
      violations.push({
        type: 'deposit',
        severity: 'error',
        message: `Insufficient funds. Shortfall: $${Math.abs(property.depositTestSurplus).toLocaleString()}`,
        shortfall: Math.abs(property.depositTestSurplus),
        currentValue: property.availableFundsUsed,
        requiredValue: property.totalCashRequired,
      });
    }
    
    // Check borrowing capacity
    if (property.borrowingCapacityRemaining < 0) {
      violations.push({
        type: 'borrowing',
        severity: 'error',
        message: `Insufficient borrowing capacity. Exceeded by: $${Math.abs(property.borrowingCapacityRemaining).toLocaleString()}`,
        shortfall: Math.abs(property.borrowingCapacityRemaining),
        currentValue: property.borrowingCapacityUsed,
        requiredValue: property.loanAmount,
      });
    }
    
    // Check serviceability
    if (!property.serviceabilityTestPass) {
      violations.push({
        type: 'serviceability',
        severity: property.serviceabilityTestSurplus < -5000 ? 'error' : 'warning',
        message: `Serviceability test fails. Annual shortfall: $${Math.abs(property.serviceabilityTestSurplus).toLocaleString()}`,
        shortfall: Math.abs(property.serviceabilityTestSurplus),
        currentValue: property.serviceabilityTestSurplus,
        requiredValue: 0,
      });
    }
    
    return violations;
  }, [getInstance]);
  
  // Handler to open property details or guardrail fix modal
  const handlePropertyClick = useCallback((instanceId: string) => {
    const property = timelineProperties.find(p => p.instanceId === instanceId);
    if (!property) return;
    
    setSelectedProperty(property);
    
    // Check if property has violations
    const violations = getPropertyViolations(property);
    
    if (violations.length > 0) {
      // Has violations - show GuardrailFixModal first
      setCurrentViolations(violations);
      setIsGuardrailFixModalOpen(true);
    } else {
      // No violations - show PropertyDetailsModal directly
      setIsPropertyModalOpen(true);
    }
  }, [timelineProperties, getPropertyViolations]);
  
  // Handler to close property details modal
  const handlePropertyModalClose = useCallback(() => {
    setIsPropertyModalOpen(false);
    setSelectedProperty(null);
  }, []);
  
  // Handler to close guardrail fix modal
  const handleGuardrailFixModalClose = useCallback(() => {
    setIsGuardrailFixModalOpen(false);
    setCurrentViolations([]);
  }, []);
  
  // Handler for applying changes from GuardrailFixModal
  const handleApplyGuardrailChanges = useCallback((updatedFields: Partial<PropertyInstanceDetails>) => {
    if (!selectedProperty) return;
    
    // Update the property instance with new values and mark as amended
    updateInstance(selectedProperty.instanceId, {
      ...updatedFields,
      hasBeenAmended: true,
    });
    
    // Close the guardrail modal
    setIsGuardrailFixModalOpen(false);
    setCurrentViolations([]);
    
    // Optionally open the property details modal after applying changes
    // This gives the user a chance to see the updated property details
    setIsPropertyModalOpen(true);
  }, [selectedProperty, updateInstance]);
  
  // Handler for "View Property Details" button in GuardrailFixModal
  const handleViewPropertyDetails = useCallback(() => {
    // Close guardrail modal and open property details modal
    setIsGuardrailFixModalOpen(false);
    setCurrentViolations([]);
    setIsPropertyModalOpen(true);
  }, []);
  
  // Handler to open a specific test modal
  const handleTestClick = useCallback((yearData: YearData, testType: TestType) => {
    if (yearData.yearBreakdownData) {
      setSelectedTest({
        year: yearData.year,
        type: testType,
        yearData,
      });
    }
  }, []);

  // Validate property placement at a specific period (or year)
  // Since the chart shows whole years but the timeline uses half-year periods,
  // we validate BOTH halves of the year and return true if EITHER is affordable.
  // This prevents false-negative red guardrails when a property is affordable in H2 but not H1.
  const validatePlacementAtPeriod = useCallback((
    property: DraggedProperty,
    period: number
  ): boolean => {
    // Calculate both periods for this year (H1 and H2)
    // Period 1,2 = 2025; Period 3,4 = 2026; etc.
    // For any period, find the start of its year: ((period-1) / 2) * 2 + 1
    const yearStartPeriod = Math.floor((period - 1) / PERIODS_PER_YEAR) * PERIODS_PER_YEAR + 1;
    const yearEndPeriod = yearStartPeriod + 1; // H2 of the same year
    
    // Check if property can be placed in EITHER half of the year
    const resultH1 = previewPlacementAtPeriod(property.instanceId, yearStartPeriod);
    const resultH2 = previewPlacementAtPeriod(property.instanceId, yearEndPeriod);
    
    // Return true if either half of the year is valid
    return resultH1.isValid || resultH2.isValid;
  }, [previewPlacementAtPeriod]);

  // Register the placement validator with the drag-drop context
  // This allows the drop handler to find the valid period within a year
  useEffect(() => {
    setPlacementValidator(previewPlacementAtPeriod);
    return () => setPlacementValidator(null);
  }, [setPlacementValidator, previewPlacementAtPeriod]);

  // Update validation state when hovering over a period
  // CRITICAL: Use ref-based memoization to prevent infinite loops
  // The validatePlacementAtPeriod function changes when calculateTimelineProperties recalculates,
  // but we only want to re-validate when the actual drag target changes, not when the underlying
  // timeline data changes mid-drag.
  useEffect(() => {
    // Skip validation entirely during recalculation phase
    // This prevents reading from partially-updated state
    if (isRecalculating) {
      return;
    }
    
    if (isDragging && draggedProperty && targetPeriod) {
      // Check if we've already validated this exact combination
      const ref = validationStateRef.current;
      if (
        ref.lastDraggedInstanceId === draggedProperty.instanceId &&
        ref.lastTargetPeriod === targetPeriod &&
        ref.lastValidationResult !== null
      ) {
        // Already validated this combination, skip re-validation
        // Just ensure the state matches what we cached
        setHoverValidation(prev => {
          if (prev?.period === targetPeriod && prev?.isValid === ref.lastValidationResult) {
            return prev; // No change needed
          }
          return { period: targetPeriod, isValid: ref.lastValidationResult! };
        });
        return;
      }
      
      // New combination - perform validation
      const isValid = validatePlacementAtPeriod(draggedProperty, targetPeriod);
      
      // Cache the result
      ref.lastDraggedInstanceId = draggedProperty.instanceId;
      ref.lastTargetPeriod = targetPeriod;
      ref.lastValidationResult = isValid;
      
      setHoverValidation({ period: targetPeriod, isValid });
    } else {
      // Reset validation state when not dragging
      setHoverValidation(null);
      // Clear the cache when drag ends
      if (!isDragging) {
        validationStateRef.current = {
          lastDraggedInstanceId: null,
          lastTargetPeriod: null,
          lastValidationResult: null,
        };
      }
    }
  }, [isDragging, draggedProperty, targetPeriod, validatePlacementAtPeriod, isRecalculating]);

  // Check if a property has guardrail violations (for displaying warning icon)
  const hasGuardrailViolations = useCallback((property: TimelineProperty): boolean => {
    const instance = getInstance(property.instanceId);
    if (!instance?.isManuallyPlaced) return false;
    
    // Check if any test fails for manually placed properties
    return !property.depositTestPass || !property.serviceabilityTestPass || property.borrowingCapacityRemaining < 0;
  }, [getInstance]);

  // Measure container width and update on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate dynamic column widths based on container size
  const yearCount = years.length;
  const availableWidth = containerWidth - LABEL_COLUMN_WIDTH;
  const calculatedColumnWidth = yearCount > 0 ? availableWidth / yearCount : MAX_YEAR_COLUMN_WIDTH;
  const yearColumnWidth = Math.max(MIN_YEAR_COLUMN_WIDTH, Math.min(MAX_YEAR_COLUMN_WIDTH, calculatedColumnWidth));
  const needsScroll = yearColumnWidth === MIN_YEAR_COLUMN_WIDTH && availableWidth < yearCount * MIN_YEAR_COLUMN_WIDTH;
  
  // Chart width calculation - always fit within container, never overflow
  const chartWidth = availableWidth;
  const totalWidth = LABEL_COLUMN_WIDTH + chartWidth;

  // Dynamic grid style
  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${yearCount}, ${yearColumnWidth}px)`,
  }), [yearCount, yearColumnWidth]);

  // Auto-scroll to show final year when horizontal scroll is needed
  const scrollToEnd = useCallback(() => {
    if (scrollContainerRef.current && needsScroll) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [needsScroll]);

  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(scrollToEnd, 100);
    return () => clearTimeout(timer);
  }, [scrollToEnd, years]);

  // Transform data for the chart - include purchase info
  const chartData = useMemo(() => years.map((yearData) => ({
    year: yearData.year,
    portfolioValue: yearData.portfolioValueRaw,
    totalEquity: yearData.totalEquityRaw,
    purchaseInYear: yearData.purchaseInYear,
    purchaseDetails: yearData.purchaseDetails,
    doNothingBalance: yearData.doNothingBalance ?? 0,
  })), [years]);

  // Read the actual Recharts SVG plotting area after each render/resize
  // This syncs the overlay icons with the real chart coordinate system
  useEffect(() => {
    const readPlotArea = () => {
      if (!chartContainerRef.current) return;
      const clipRect = chartContainerRef.current.querySelector('.recharts-surface clipPath rect');
      if (clipRect) {
        const rect = {
          top: parseFloat(clipRect.getAttribute('y') || '0'),
          left: parseFloat(clipRect.getAttribute('x') || '0'),
          bottom: parseFloat(clipRect.getAttribute('y') || '0') + parseFloat(clipRect.getAttribute('height') || '0'),
          right: parseFloat(clipRect.getAttribute('x') || '0') + parseFloat(clipRect.getAttribute('width') || '0'),
        };
        setChartPlotArea(rect);
      }
    };
    const timer = setTimeout(readPlotArea, 50);
    return () => clearTimeout(timer);
  }, [containerWidth, chartData, yearColumnWidth]);

  // Find the year when equity goal is first reached
  const equityGoalReached = useMemo(() => {
    return chartData.find(d => d.totalEquity >= profile.equityGoal);
  }, [chartData, profile.equityGoal]);

  // Goal achievability summary — surfaces a dashboard-level flag when the
  // projected equity at the BA's stated horizon doesn't reach the goal.
  // Per spec: "failure mode = explicit infeasible message, never silent compromise."
  const goalAchievability = useMemo(() => {
    if (!chartData.length || !profile.equityGoal || profile.equityGoal <= 0) {
      return null; // No goal set, no flag
    }
    const horizonYear = (chartData[0]?.year ?? new Date().getFullYear()) + (profile.timelineYears ?? 15);
    // Use the data point closest to (but not exceeding) the horizon year
    const horizonPoint =
      chartData.find(d => d.year >= horizonYear) ??
      chartData[chartData.length - 1];
    const finalEquity = horizonPoint?.totalEquity ?? 0;
    const achieved = !!equityGoalReached;
    const shortfall = Math.max(0, profile.equityGoal - finalEquity);
    return {
      achieved,
      finalEquity,
      goal: profile.equityGoal,
      shortfall,
      reachedYear: equityGoalReached?.year ?? null,
      horizonYear,
    };
  }, [chartData, profile.equityGoal, profile.timelineYears, equityGoalReached]);

  // Find the most recent purchase year (last property purchased)
  const mostRecentPurchase = useMemo(() => {
    const purchaseYears = chartData.filter(d => d.purchaseInYear);
    return purchaseYears.length > 0 ? purchaseYears[purchaseYears.length - 1] : null;
  }, [chartData]);

  // Phase labels for Accumulation / Consolidation
  const phases = useMemo(() => {
    if (!mostRecentPurchase || chartData.length < 2) return [];
    const startYear = chartData[0].year;
    const endYear = chartData[chartData.length - 1].year;
    const lastPurchaseYear = mostRecentPurchase.year;
    const result: { label: string; startYear: number; endYear: number; fill: string }[] = [];

    if (lastPurchaseYear > startYear) {
      result.push({
        label: 'Accumulation',
        startYear,
        endYear: lastPurchaseYear,
        fill: 'rgba(59, 130, 246, 0.03)',
      });
    }
    if (lastPurchaseYear < endYear) {
      result.push({
        label: 'Consolidation',
        startYear: lastPurchaseYear,
        endYear,
        fill: 'rgba(34, 197, 94, 0.03)',
      });
    }
    return result;
  }, [chartData, mostRecentPurchase]);

  // Refinance trigger dots — first year each property has extractable equity > $50k
  const refinanceTriggers = useMemo(() => {
    return calculateRefinanceTriggers(
      timelineProperties,
      profile.growthCurve,
      profile.timelineYears
    );
  }, [timelineProperties, profile.growthCurve, profile.timelineYears]);

  // Create tooltip component with refinance trigger context
  const CustomTooltip = useMemo(() => createCustomTooltip(refinanceTriggers), [refinanceTriggers]);

  // XAxis padding to center data points in columns
  const xAxisPadding = yearColumnWidth / 2;

  // Vertical gap between stacked property icons (in pixels)
  const STACKED_PROPERTY_GAP = 30;

  // Calculate positions for draggable property icons on the chart overlay
  const propertyPositions = useMemo(() => {
    if (!chartData.length || !chartPlotArea) return [];

    // Use real Recharts plotting area bounds read from the rendered SVG
    const plotTop = chartPlotArea.top;
    const plotBottom = chartPlotArea.bottom;
    const plottingAreaHeight = plotBottom - plotTop;

    // Match Recharts' Y-axis domain calculation
    const dataMax = Math.max(...chartData.map(d => d.portfolioValue));
    const equityGoalValue = profile.equityGoal || 0;
    const rawMax = Math.max(dataMax, equityGoalValue);

    // Recharts adds padding and rounds to nice values
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const maxValue = Math.ceil(rawMax / magnitude * 1.1) * magnitude;
    const minValue = 0;

    // Collect all property positions, handling multiple properties per year (stacking)
    const positions: Array<{
      year: number;
      x: number;
      y: number;
      instanceId: string;
      property: typeof timelineProperties[0] | undefined;
    }> = [];

    chartData
      .filter(d => d.purchaseInYear && d.purchaseDetails && d.purchaseDetails.length > 0)
      .forEach(d => {
        const yearIndex = chartData.findIndex(cd => cd.year === d.year);
        // X position: center of the year column (accounting for Y-axis width)
        const x = Y_AXIS_WIDTH + (yearIndex * yearColumnWidth) + (yearColumnWidth / 2);

        // Base Y position: scaled using actual plotting area bounds
        const valueRatio = (d.portfolioValue - minValue) / (maxValue - minValue);
        const baseY = plotTop + plottingAreaHeight * (1 - valueRatio);

        // Add position for each property in this year, stacking vertically
        d.purchaseDetails!.forEach((purchase, stackIndex) => {
          const y = baseY - (stackIndex * STACKED_PROPERTY_GAP);

          positions.push({
            year: d.year,
            x,
            y,
            instanceId: purchase.instanceId,
            property: timelineProperties.find(p => p.instanceId === purchase.instanceId),
          });
        });
      });

    return positions.filter(pos => pos.property !== undefined);
  }, [chartData, yearColumnWidth, profile.equityGoal, timelineProperties, chartPlotArea]);

  // Generate periods array for droppable columns (one per year in the chart)
  const periodsForDroppables = useMemo(() => {
    return years.map((yearData, index) => ({
      year: yearData.year,
      period: yearToPeriod(yearData.year),
      x: Y_AXIS_WIDTH + (index * yearColumnWidth),
      width: yearColumnWidth,
    }));
  }, [years, yearColumnWidth]);


  return (
      <div ref={containerRef} className="w-full h-full">
        {/* Goal achievability flag — visible only when a goal is set */}
        {goalAchievability && (
          <div
            className={
              goalAchievability.achieved
                ? 'mb-3 flex items-center gap-2 px-3 py-2 rounded-md border bg-green-50 border-green-200 text-green-800 text-xs font-medium'
                : 'mb-3 flex items-center gap-2 px-3 py-2 rounded-md border bg-amber-50 border-amber-300 text-amber-900 text-xs font-medium'
            }
            data-testid="goal-achievability-flag"
          >
            <span
              className={
                goalAchievability.achieved
                  ? 'inline-block w-1.5 h-1.5 rounded-full bg-green-500'
                  : 'inline-block w-1.5 h-1.5 rounded-full bg-amber-500'
              }
              aria-hidden="true"
            />
            {goalAchievability.achieved ? (
              <span>
                Equity goal of {formatCurrency(goalAchievability.goal)} reached in{' '}
                <strong>{goalAchievability.reachedYear}</strong>
                {goalAchievability.reachedYear &&
                  goalAchievability.reachedYear < goalAchievability.horizonYear && (
                    <span className="text-green-700">
                      {' '}— {goalAchievability.horizonYear - goalAchievability.reachedYear} years ahead of target
                    </span>
                  )}
              </span>
            ) : (
              <span>
                Goal not reached — projected equity at year {goalAchievability.horizonYear} is{' '}
                <strong>{formatCurrency(goalAchievability.finalEquity)}</strong> against a target of{' '}
                <strong>{formatCurrency(goalAchievability.goal)}</strong>
                {goalAchievability.shortfall > 0 && (
                  <span> (gap: {formatCurrency(goalAchievability.shortfall)})</span>
                )}
                . Adjust horizon, deposit, or strategy to close the gap.
              </span>
            )}
          </div>
        )}
        <div ref={scrollContainerRef} className="overflow-hidden h-full">
          {/* Scrollable container with dynamic total width */}
          <div style={{ minWidth: totalWidth }}>
            {/* Chart Section with grid overlay */}
            <div className="flex relative">
              {/* Label column - spacer for alignment with rows below */}
              <div 
                className="flex-shrink-0"
                style={{ width: LABEL_COLUMN_WIDTH - Y_AXIS_WIDTH }}
              />
              
              {/* Vertical grid lines overlay removed for clean look */}
              
              {/* Chart container - YAxis + plotting area with data points centered in year columns */}
              <div ref={chartContainerRef} style={{ width: chartWidth + Y_AXIS_WIDTH }} className="relative z-10">
                {/* Droppable Year Column Overlays - positioned over the chart */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ height: CHART_HEIGHT }}
                >
                  {periodsForDroppables.map(({ year, period, x, width }) => (
                    <DroppableYearColumn
                      key={`droppable-${period}`}
                      year={year}
                      period={period}
                      x={x}
                      width={width}
                      height={CHART_HEIGHT}
                      isOver={hoverValidation?.period === period}
                      isValid={hoverValidation?.period === period ? hoverValidation.isValid : null}
                      isDragActive={isDragging}
                    />
                  ))}
                </div>

                {/* Draggable Property Icons Overlay - positioned over the chart */}
                {/* Only show TourStep when there are properties to display */}
                {propertyPositions.length > 0 ? (
                  <TourStep
                    id="property-interactions"
                    title="Interactive Property Icons"
                    content="Each property icon is interactive. Click to view detailed performance metrics (ROI, equity growth, cashflow analysis). Drag to reposition - green highlights show valid placements, red indicates constraint violations."
                    order={9}
                    position="bottom"
                  >
                    <div 
                      className="absolute inset-0"
                      style={{ height: CHART_HEIGHT, zIndex: 20, pointerEvents: 'none' }}
                    >
                      {propertyPositions.map(({ x, y, instanceId, property }) => (
                        property && (
                          <div key={`draggable-wrapper-${instanceId}`} style={{ pointerEvents: 'auto' }}>
                            <DraggablePropertyIcon
                              property={property}
                              x={x}
                              y={y}
                              isDragging={draggedProperty?.instanceId === instanceId}
                              hasViolations={hasGuardrailViolations(property)}
                              isAmended={getInstance(property.instanceId)?.hasBeenAmended ?? false}
                              onPropertyClick={handlePropertyClick}
                            />
                          </div>
                        )
                      ))}
                    </div>
                  </TourStep>
                ) : (
                  <div 
                    className="absolute inset-0"
                    style={{ height: CHART_HEIGHT, zIndex: 20, pointerEvents: 'none' }}
                  />
                )}

                <ComposedChart
                width={chartWidth + Y_AXIS_WIDTH}
                height={CHART_HEIGHT}
                data={chartData}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              >
              {/* Phase labels — no background fill */}
              {phases.map((phase, i) => (
                <ReferenceArea
                  key={`phase-${i}`}
                  x1={phase.startYear}
                  x2={phase.endYear}
                  fill="transparent"
                  fillOpacity={0}
                  stroke="none"
                  ifOverflow="extendDomain"
                  label={{ value: phase.label, position: 'insideTopLeft', fontSize: 9, fill: '#D1D5DB', fontWeight: 400 }}
                />
              ))}

              {/* Explanation highlight — translucent overlay for relevant time period */}
              {highlightPeriod && (
                <ReferenceArea
                  x1={highlightPeriod.startYear}
                  x2={highlightPeriod.endYear}
                  fill="#2563EB"
                  fillOpacity={0.12}
                  stroke="#2563EB"
                  strokeOpacity={0.25}
                  strokeDasharray="4 2"
                />
              )}

              <CartesianGrid
                {...CHART_STYLE.grid}
                vertical={false}
                horizontal={true}
              />

              <XAxis
                dataKey="year"
                {...CHART_STYLE.xAxis}
                padding={{ left: xAxisPadding, right: xAxisPadding }}
              />

              <YAxis
                tickFormatter={formatCurrency}
                tick={{
                  fontSize: 11,
                  fill: CHART_COLORS.annotationText,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                axisLine={false}
                tickLine={false}
                width={Y_AXIS_WIDTH}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Portfolio Value Line - primary blue */}
              <Line
                type="monotone"
                dataKey="portfolioValue"
                name="Portfolio Value"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: '#2563EB',
                  strokeWidth: 2,
                  fill: 'white',
                }}
              />

              {/* Total Equity Line - purple, distinct from portfolio */}
              <Line
                type="monotone"
                dataKey="totalEquity"
                name="Total Equity"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
              />

              {/* Do-Nothing Baseline - dashed grey line */}
              <Line
                type="monotone"
                dataKey="doNothingBalance"
                name="Savings Only"
                stroke={CHART_COLORS.annotationText}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />

              {/* Goal Achievement Marker - yellow dot only */}
              {equityGoalReached && (
                <ReferenceDot
                  x={equityGoalReached.year}
                  y={equityGoalReached.totalEquity}
                  r={8}
                  fill={CHART_COLORS.goal}
                  stroke="white"
                  strokeWidth={2}
                >
                  <Label content={<GoalAchievedLabel year={equityGoalReached.year} />} />
                </ReferenceDot>
              )}

            </ComposedChart>
          </div>
        </div>

        </div>
      </div>

      {/* Single Test Modal */}
      {selectedTest && selectedTest.yearData.yearBreakdownData && (
        <SingleTestModal
          isOpen={!!selectedTest}
          onClose={() => setSelectedTest(null)}
          testType={selectedTest.type}
          yearData={selectedTest.yearData.yearBreakdownData}
          year={selectedTest.year}
        />
      )}
      
      {/* Guardrail Fix Modal - shown when clicking property with violations */}
      {selectedProperty && (
        <GuardrailFixModal
          property={selectedProperty}
          violations={currentViolations}
          isOpen={isGuardrailFixModalOpen}
          onClose={handleGuardrailFixModalClose}
          onApplyChanges={handleApplyGuardrailChanges}
          onViewDetails={handleViewPropertyDetails}
        />
      )}
      
      {/* Property Details Modal */}
      <PropertyDetailsModal
        property={selectedProperty}
        isOpen={isPropertyModalOpen}
        onClose={handlePropertyModalClose}
      />
    </div>
  );
};

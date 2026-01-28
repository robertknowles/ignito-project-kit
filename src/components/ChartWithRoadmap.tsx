import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Label,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useRoadmapData, YearData } from '../hooks/useRoadmapData';
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
import type { TimelineProperty } from '../types/property';
import type { GuardrailViolation } from '../utils/guardrailValidator';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

// Column dimension constants
const LABEL_COLUMN_WIDTH = 50; // Reduced from 70px
const MIN_YEAR_COLUMN_WIDTH = 50; // Minimum readable width
const MAX_YEAR_COLUMN_WIDTH = 120; // Maximum comfortable width
const Y_AXIS_WIDTH = 50; // Width for the chart Y-axis
const CHART_HEIGHT = 220; // Height of the chart area

// Period conversion constants (matching useAffordabilityCalculator)
const PERIODS_PER_YEAR = 2;
const BASE_YEAR = 2025;

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

// Format compact currency for table cells
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
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
    ? "cursor-pointer border border-slate-300 shadow hover:shadow-lg hover:-translate-y-0.5 hover:brightness-105 active:scale-95 active:shadow-sm active:translate-y-0 transition-all duration-150 ease-in-out" 
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
    <span className={`${baseClasses} bg-slate-100 text-slate-400`}>
      –
    </span>
  );
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-md">
        <p className="text-xs font-medium text-slate-900 mb-2">Year: {label}</p>
        <p className="text-xs text-teal-600">
          Portfolio: {formatCurrency(data?.portfolioValue || 0)}
        </p>
        <p className="text-xs text-slate-500">
          Equity: {formatCurrency(data?.totalEquity || 0)}
        </p>
        {data?.purchaseInYear && data?.purchaseDetails && data.purchaseDetails.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            {data.purchaseDetails.map((purchase: any, idx: number) => (
              <p key={idx} className="text-xs font-medium text-slate-700">
                🏠 {purchase.propertyTitle}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
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
  const borderColor = isHouse ? '#22c55e' : '#3b82f6'; // Green for houses, blue for units
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPropertyClick && instanceId) {
      onPropertyClick(instanceId);
    }
  };
  
  return (
    <foreignObject x={cx - 12} y={cy - 12} width={24} height={24}>
      <div 
        className={`w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm ${onPropertyClick ? 'cursor-pointer hover:scale-110 hover:shadow-md transition-all duration-150' : ''}`}
        style={{ border: `2px solid ${borderColor}` }}
        onClick={handleClick}
        title={onPropertyClick ? `Click for details: ${propertyTitle}` : undefined}
      >
        {getPropertyTypeIcon(propertyTitle, 14, isHouse ? 'text-green-600' : 'text-blue-600')}
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
  onPropertyClick: (instanceId: string) => void;
}

const DraggablePropertyIcon: React.FC<DraggablePropertyIconProps> = ({
  property,
  x,
  y,
  isDragging,
  hasViolations,
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
  const baseColor = isHouse ? '#22c55e' : '#3b82f6';
  const borderColor = hasViolations ? '#ef4444' : baseColor;
  const borderWidth = hasViolations ? 3 : 2;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: x - 12,
    top: y - 12,
    width: 24,
    height: 24,
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
        className={`w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 hover:shadow-md transition-all duration-150 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ border: `${borderWidth}px solid ${borderColor}` }}
        onClick={handleClick}
        title={`Drag to move: ${property.title}`}
      >
        {getPropertyTypeIcon(property.title, 14, isHouse ? 'text-green-600' : 'text-blue-600')}
      </div>
      {/* Warning indicator for violations */}
      {hasViolations && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <AlertTriangle size={10} className="text-white" />
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
    backgroundColor = 'rgba(148, 163, 184, 0.05)';
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

// Equity Goal Label component
const EquityGoalLabel = (props: any) => {
  const { viewBox, equityGoal } = props;
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.x + viewBox.width - 10}
      y={viewBox.y - 5}
      fill="#d97706"
      fontSize={11}
      fontWeight={600}
      textAnchor="end"
      fontFamily="Inter, system-ui, sans-serif"
    >
      Equity Goal: {formatCurrency(equityGoal)}
    </text>
  );
};

// Goal Achievement Label component
const GoalAchievedLabel = (props: any) => {
  const { cx, cy, year } = props;
  if (typeof cx !== 'number' || typeof cy !== 'number' || isNaN(cx) || isNaN(cy)) {
    return null;
  }
  return (
    <text
      x={cx}
      y={cy - 18}
      fill="rgba(253, 186, 116, 1)"
      fontSize={10}
      fontWeight={500}
      textAnchor="middle"
      fontFamily="Inter, system-ui, sans-serif"
    >
      Goal: {year}
    </text>
  );
};

interface ChartWithRoadmapProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

export const ChartWithRoadmap: React.FC<ChartWithRoadmapProps> = ({ scenarioData }) => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimelineProperties, calculateAffordabilityForProperty } = useAffordabilityCalculator();
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
  } = usePropertyDragDropContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
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
    
    // Update the property instance with new values
    updateInstance(selectedProperty.instanceId, updatedFields);
    
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

  // Build purchase history for validation (all properties except the one being dragged)
  const buildPurchaseHistoryForValidation = useCallback((excludeInstanceId: string, upToPeriod: number) => {
    return timelineProperties
      .filter(p => p.instanceId !== excludeInstanceId && p.period !== Infinity && p.period < upToPeriod)
      .map(p => ({
        period: p.period,
        cost: p.cost,
        depositRequired: p.depositRequired,
        loanAmount: p.loanAmount,
        title: p.title,
        instanceId: p.instanceId,
        loanType: p.loanType,
        cumulativeEquityReleased: 0,
      }));
  }, [timelineProperties]);

  // Validate property placement at a specific period
  const validatePlacementAtPeriod = useCallback((
    property: DraggedProperty,
    period: number
  ): boolean => {
    // Build purchase history excluding the dragged property
    const previousPurchases = buildPurchaseHistoryForValidation(property.instanceId, period);
    
    // Get the full property data from timelineProperties
    const fullProperty = timelineProperties.find(p => p.instanceId === property.instanceId);
    if (!fullProperty) return false;

    // Create property object for affordability check
    const propertyForCheck = {
      title: property.title,
      cost: property.cost,
      depositRequired: property.depositRequired,
      loanAmount: property.loanAmount,
      instanceId: property.instanceId,
      totalCashRequired: fullProperty.totalCashRequired,
    };

    // Use the calculator to check affordability
    const result = calculateAffordabilityForProperty(period, propertyForCheck, previousPurchases);
    
    // Check all three tests: deposit, serviceability, AND borrowing capacity
    const borrowingCapacityPass = result.borrowingCapacityPass ?? 
      (result.borrowingCapacityRemaining === undefined || result.borrowingCapacityRemaining >= 0);
    
    return result.canAfford && result.depositTestPass && result.serviceabilityTestPass && borrowingCapacityPass;
  }, [buildPurchaseHistoryForValidation, timelineProperties, calculateAffordabilityForProperty]);

  // Update validation state when hovering over a period
  useEffect(() => {
    if (isDragging && draggedProperty && targetPeriod) {
      const isValid = validatePlacementAtPeriod(draggedProperty, targetPeriod);
      setHoverValidation({ period: targetPeriod, isValid });
    } else {
      setHoverValidation(null);
    }
  }, [isDragging, draggedProperty, targetPeriod, validatePlacementAtPeriod]);

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
  
  // Chart width calculation - use full available width to eliminate whitespace
  const minChartWidth = yearCount * yearColumnWidth;
  const chartWidth = Math.max(minChartWidth, availableWidth);
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
  })), [years]);

  // Find the year when equity goal is first reached
  const equityGoalReached = useMemo(() => {
    return chartData.find(d => d.totalEquity >= profile.equityGoal);
  }, [chartData, profile.equityGoal]);

  // Find the most recent purchase year (last property purchased)
  const mostRecentPurchase = useMemo(() => {
    const purchaseYears = chartData.filter(d => d.purchaseInYear);
    return purchaseYears.length > 0 ? purchaseYears[purchaseYears.length - 1] : null;
  }, [chartData]);

  // XAxis padding to center data points in columns
  const xAxisPadding = yearColumnWidth / 2;

  // Vertical gap between stacked property icons (in pixels)
  const STACKED_PROPERTY_GAP = 30;

  // Calculate positions for draggable property icons on the chart overlay
  const propertyPositions = useMemo(() => {
    if (!chartData.length) return [];
    
    // Match Recharts' Y-axis domain calculation
    // Recharts auto-calculates domain with "nice" values - we need to approximate this
    const dataMax = Math.max(...chartData.map(d => d.portfolioValue));
    const equityGoalValue = profile.equityGoal || 0;
    const rawMax = Math.max(dataMax, equityGoalValue);
    
    // Recharts adds padding and rounds to nice values
    // Approximate by adding ~10% padding and rounding up to a nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const maxValue = Math.ceil(rawMax / magnitude * 1.1) * magnitude;
    const minValue = 0;
    
    // Chart dimensions - FIXED based on actual Recharts SVG path analysis
    // The AreaChart has margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
    // BUT Recharts also reserves space for the X-axis at the bottom (~30px)
    // From debug logs: first point at Y=190 for low value, SVG height=220
    // This means plotting area is from Y=20 (top margin) to Y=190 (above X-axis)
    const chartTopMargin = 20;
    const chartBottomMargin = 30; // Space for X-axis labels
    const chartTotalHeight = CHART_HEIGHT; // 220px
    const plottingAreaHeight = chartTotalHeight - chartTopMargin - chartBottomMargin; // 170px
    
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
        
        // Base Y position: scaled based on portfolio value (snaps to equity line area)
        // In SVG/screen coordinates, y=0 is at the top, so we invert
        const valueRatio = (d.portfolioValue - minValue) / (maxValue - minValue);
        const baseY = chartTopMargin + plottingAreaHeight * (1 - valueRatio);
        
        // Add position for each property in this year, stacking vertically
        d.purchaseDetails!.forEach((purchase, stackIndex) => {
          // First property at base Y, subsequent properties stacked above with gap
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
  }, [chartData, yearColumnWidth, profile.equityGoal, timelineProperties]);

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
        <div ref={scrollContainerRef} className="overflow-x-auto h-full">
          {/* Scrollable container with dynamic total width */}
          <div style={{ minWidth: totalWidth }}>
            {/* Chart Section with grid overlay */}
            <div className="flex relative">
              {/* Label column - spacer for alignment with rows below */}
              <div 
                className="flex-shrink-0"
                style={{ width: LABEL_COLUMN_WIDTH - Y_AXIS_WIDTH }}
              />
              
              {/* Vertical grid lines overlay - positioned to align with table columns */}
              <div 
                className="absolute inset-0 pointer-events-none z-0"
                style={{ left: 0 }}
              >
                {/* Grid extends from left border through Y-axis and all year columns */}
                <div className="h-full flex">
                  <div 
                    className="h-full border-r border-slate-300/40"
                    style={{ width: LABEL_COLUMN_WIDTH }}
                  />
                  <div className="h-full flex" style={{ width: chartWidth }}>
                    {years.map((_, index) => (
                      <div 
                        key={`grid-line-${index}`}
                        className="h-full border-r border-slate-300/40"
                        style={{ width: yearColumnWidth }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
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
                          onPropertyClick={handlePropertyClick}
                        />
                      </div>
                    )
                  ))}
                </div>

                <AreaChart
                width={chartWidth + Y_AXIS_WIDTH}
                height={220}
                data={chartData}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              >
              {/* Gradient Definitions */}
              <defs>
                <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5eead4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#5eead4" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="greyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="0" 
                stroke="rgba(148, 163, 184, 0.25)" 
                vertical={false}
                horizontal={true}
              />
              
              <XAxis 
                dataKey="year" 
                tick={false}
                axisLine={false}
                tickLine={false}
                padding={{ left: xAxisPadding, right: xAxisPadding }}
              />
              
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ 
                  fontSize: 11, 
                  fill: '#64748b',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Portfolio Value Area - Teal */}
              <Area
                type="monotone"
                dataKey="portfolioValue"
                name="Portfolio Value"
                stroke="#5eead4"
                strokeWidth={2}
                fill="url(#tealGradient)"
                dot={false}
                activeDot={{
                  r: 6,
                  stroke: '#5eead4',
                  strokeWidth: 2,
                  fill: 'white',
                }}
              />
              
              {/* Total Equity Area - Grey */}
              <Area
                type="monotone"
                dataKey="totalEquity"
                name="Total Equity"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#greyGradient)"
                dot={false}
              />
              
              {/* Equity Goal Reference Line - Rendered after Areas to appear on top */}
              {profile.equityGoal > 0 && (
                <ReferenceLine
                  y={profile.equityGoal}
                  stroke="rgba(253, 186, 116, 0.7)"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                >
                  <Label content={<EquityGoalLabel equityGoal={profile.equityGoal} />} />
                </ReferenceLine>
              )}
              
              {/* Goal Achievement Marker */}
              {equityGoalReached && (
                <ReferenceDot
                  x={equityGoalReached.year}
                  y={equityGoalReached.totalEquity}
                  r={8}
                  fill="rgba(253, 186, 116, 0.9)"
                  stroke="white"
                  strokeWidth={2}
                >
                  <Label content={<GoalAchievedLabel year={equityGoalReached.year} />} />
                </ReferenceDot>
              )}
            </AreaChart>
          </div>
        </div>

        {/* Table Section with light grey background */}
        <div className="bg-slate-50/70 -mt-5">
          {/* YEAR Header Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 border-r border-slate-200/40" />
            {years.map((yearData, index) => (
              <div 
                key={yearData.year}
                className={`px-1 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                  {yearData.year}
                </span>
              </div>
            ))}
          </div>

          {/* PURCHASE Row - Same height as other rows */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Buy
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`purchase-${yearData.year}`}
                className={`px-0.5 py-1.5 flex flex-col items-center justify-center gap-0.5 ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                  // Render a MiniPurchaseCard for each property in this year
                  yearData.purchaseDetails.map((purchase, purchaseIndex) => (
                    <MiniPurchaseCard
                      key={`${purchase.instanceId}-${purchaseIndex}`}
                      propertyTitle={purchase.propertyTitle}
                      cost={purchase.cost}
                      loanAmount={purchase.loanAmount}
                      depositRequired={purchase.depositRequired}
                      onClick={() => handlePropertyClick(purchase.instanceId)}
                    />
                  ))
                ) : (
                  <span className="text-[8px] text-slate-400 self-center">–</span>
                )}
              </div>
            ))}
          </div>

          {/* DEPOSIT Status Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Deposit
              </span>
            </div>
            {years.map((yearData, index) => {
              const isClickable = !!yearData.yearBreakdownData;
              return (
                <div 
                  key={`deposit-${yearData.year}`}
                  className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
                >
                  <StatusPill 
                    status={yearData.depositStatus} 
                    isClickable={isClickable}
                    onClick={isClickable ? () => handleTestClick(yearData, 'deposit') : undefined}
                  />
                </div>
              );
            })}
          </div>

          {/* BORROWING Status Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Borrow
              </span>
            </div>
            {years.map((yearData, index) => {
              const isClickable = !!yearData.yearBreakdownData;
              return (
                <div 
                  key={`borrowing-${yearData.year}`}
                  className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
                >
                  <StatusPill 
                    status={yearData.borrowingStatus}
                    isClickable={isClickable}
                    onClick={isClickable ? () => handleTestClick(yearData, 'borrowing') : undefined}
                  />
                </div>
              );
            })}
          </div>

          {/* SERVICEABILITY Status Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Service
              </span>
            </div>
            {years.map((yearData, index) => {
              const isClickable = !!yearData.yearBreakdownData;
              return (
                <div 
                  key={`service-${yearData.year}`}
                  className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
                >
                  <StatusPill 
                    status={yearData.serviceabilityStatus}
                    isClickable={isClickable}
                    onClick={isClickable ? () => handleTestClick(yearData, 'serviceability') : undefined}
                  />
                </div>
              );
            })}
          </div>

          {/* AVAILABLE Funds Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Avail
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`available-${yearData.year}`}
                className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <span className="text-[8px] font-light text-slate-600">
                  {formatCompactCurrency(yearData.availableFundsRaw)}
                </span>
              </div>
            ))}
          </div>

          {/* LVR Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                LVR
              </span>
            </div>
            {years.map((yearData, index) => {
              const lvr = yearData.portfolioValueRaw > 0 
                ? (yearData.totalDebt / yearData.portfolioValueRaw) * 100 
                : 0;
              return (
                <div 
                  key={`lvr-${yearData.year}`}
                  className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
                >
                  <span className="text-[8px] font-light text-slate-600">
                    {lvr > 0 ? `${lvr.toFixed(0)}%` : '–'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* EQUITY Row */}
          <div style={gridStyle} className="border-b border-slate-200/40">
            <div className="sticky left-0 bg-slate-50/70 z-10 px-1 py-1.5 flex items-center justify-end border-r border-slate-200/40">
              <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wide">
                Equity
              </span>
            </div>
            {years.map((yearData, index) => (
              <div 
                key={`equity-${yearData.year}`}
                className={`px-0.5 py-1.5 flex items-center justify-center ${index < years.length - 1 ? 'border-r border-slate-300/40' : ''}`}
              >
                <span className="text-[8px] font-light text-slate-600">
                  {yearData.totalEquityRaw > 0 ? formatCompactCurrency(yearData.totalEquityRaw) : '–'}
                </span>
              </div>
            ))}
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

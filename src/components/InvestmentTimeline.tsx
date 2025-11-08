import React, { useState } from 'react'
import {
  CalendarIcon,
  Pencil,
  Loader2,
} from 'lucide-react'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { AIStrategySummary } from './AIStrategySummary'
import { getPropertyTypeIcon } from '../utils/propertyTypeIcon'
import { LoanTypeToggle } from './LoanTypeToggle'
import { PropertyDetailModal } from './PropertyDetailModal'
import type { PropertyInstanceDetails } from '../types/propertyInstance'
// Period conversion helpers
const PERIODS_PER_YEAR = 2;
const BASE_YEAR = 2025;

const periodToDisplay = (period: number): string => {
  const year = BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
  const half = ((period - 1) % PERIODS_PER_YEAR) + 1;
  return `${year} H${half}`;
};

export const InvestmentTimeline = () => {
  const { calculatedValues, profile } = useInvestmentProfile()
  const { calculations, checkFeasibility, pauseBlocks, propertyTypes, selections } = usePropertySelection()
  const { timelineProperties, updateTimelinePropertyLoanType, isRecalculating } = useAffordabilityCalculator()
  const { globalFactors, getPropertyData } = useDataAssumptions()
  
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

  // Generate timeline items
  const generateTimelineItems = () => {
    if (calculations.totalProperties === 0) {
      return [
        {
          year: "2025",
          quarter: "Yr 0",
          type: "No properties selected",
          deposit: "$0",
          price: "$0",
          loanAmount: "$0",
          portfolioValue: "$0",
          equity: "$0",
          status: 'feasible' as const,
          eventType: 'purchase' as const
        }
      ]
    }

    const allTimelineEvents: Array<{
      year: string;
      quarter: string;
      type: string;
      deposit?: string;
      price?: string;
      loanAmount?: string;
      portfolioValue: string;
      equity: string;
      status: 'feasible' | 'delayed' | 'challenging';
      number?: string;
      affordableYear: number;
      period: number;
      eventType: 'purchase' | 'pause';
      duration?: number;
      instanceId?: string;
      loanType?: 'IO' | 'PI';
    }> = [];

    // Add purchase events
    timelineProperties.forEach((property, index) => {
      const isAffordable = property.status === 'feasible';
      const timelineEndYear = 2025 + profile.timelineYears;
      
      let yearDisplay: string;
      let periodDisplay: string;
      
      if (property.affordableYear === Infinity || property.period === Infinity) {
        yearDisplay = "Beyond Timeline";
        periodDisplay = "N/A";
      } else if (isAffordable && property.affordableYear <= timelineEndYear) {
        yearDisplay = Math.floor(property.affordableYear).toString();
        periodDisplay = property.displayPeriod || periodToDisplay(property.period);
      } else if (property.affordableYear > timelineEndYear) {
        yearDisplay = Math.floor(property.affordableYear).toString();
        periodDisplay = property.displayPeriod || periodToDisplay(property.period);
      } else {
        yearDisplay = "Beyond Timeline";
        periodDisplay = "N/A";
      }

      // Add purchase event
      allTimelineEvents.push({
        year: yearDisplay,
        quarter: periodDisplay,
        type: property.title,
        deposit: `$${Math.round(property.depositRequired / 1000)}k`,
        price: `$${Math.round(property.cost / 1000)}k`,
        loanAmount: `$${Math.round(property.loanAmount / 1000)}k`,
        portfolioValue: `$${Math.round(property.portfolioValueAfter / 1000)}k`,
        equity: `$${Math.round(property.totalEquityAfter / 1000)}k`,
        status: property.status,
        number: property.propertyIndex > 0 ? `#${property.propertyIndex + 1}` : undefined,
        affordableYear: property.affordableYear,
        period: property.period,
        eventType: 'purchase',
        instanceId: property.instanceId,
        loanType: property.loanType
      });
    });

    // Add pause events - insert pauses between properties based on order
    pauseBlocks.forEach((pause) => {
      // Find the property purchase that comes just before this pause
      const propertiesBeforePause = timelineProperties
        .filter((_, idx) => idx < pause.order)
        .sort((a, b) => a.period - b.period);
      
      if (propertiesBeforePause.length > 0) {
        const lastPropertyBeforePause = propertiesBeforePause[propertiesBeforePause.length - 1];
        const pauseStartPeriod = lastPropertyBeforePause.period + 1;
        const pauseDurationPeriods = Math.ceil(pause.duration * PERIODS_PER_YEAR);
        const pauseEndPeriod = pauseStartPeriod + pauseDurationPeriods - 1;
        
        // Use the portfolio metrics from the last property
        const portfolioValue = lastPropertyBeforePause.portfolioValueAfter;
        const equity = lastPropertyBeforePause.totalEquityAfter;
        
        allTimelineEvents.push({
          year: periodToDisplay(pauseStartPeriod).split(' ')[0],
          quarter: `${periodToDisplay(pauseStartPeriod)} - ${periodToDisplay(pauseEndPeriod)}`,
          type: '⏸️ Pause Period',
          portfolioValue: `$${Math.round(portfolioValue / 1000)}k`,
          equity: `$${Math.round(equity / 1000)}k`,
          status: 'feasible',
          affordableYear: 2025 + (pauseStartPeriod - 1) / PERIODS_PER_YEAR,
          period: pauseStartPeriod,
          eventType: 'pause',
          duration: pause.duration
        });
      }
    });

    // Sort all events by period chronologically
    return allTimelineEvents
      .sort((a, b) => a.period - b.period)
      .slice(0, 12); // Show timeline events
  }

  const timelineItems = generateTimelineItems()

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
          Investment Timeline
        </h3>
      </div>
      <div className="flex gap-4 mb-8">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f9fafb] text-[#374151] rounded-full text-xs font-normal">
          <span className="w-1.5 h-1.5 bg-[#10b981] bg-opacity-50 rounded-full"></span>{' '}
          Feasible
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f9fafb] text-[#374151] rounded-full text-xs font-normal">
          <span className="w-1.5 h-1.5 bg-[#3b82f6] bg-opacity-60 rounded-full"></span>{' '}
          Delayed
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#f9fafb] text-[#374151] rounded-full text-xs font-normal">
          <span className="w-1.5 h-1.5 bg-[#3b82f6] bg-opacity-60 rounded-full"></span>{' '}
          Challenging
        </span>
      </div>
      <div className="flex flex-col gap-6">
        {timelineItems.map((item, index) => (
          item.eventType === 'pause' ? (
            <PauseItem
              key={`${item.year}-pause-${index}`}
              quarter={item.quarter}
              duration={item.duration!}
              equity={item.equity}
              portfolioValue={item.portfolioValue}
            />
          ) : (
            <TimelineItem
              key={`${item.year}-${item.type}-${index}`}
              year={item.year}
              quarter={item.quarter}
              type={item.type}
              number={item.number}
              deposit={item.deposit!}
              loanAmount={item.loanAmount!}
              source="Savings & Equity"
              equity={item.equity}
              portfolioValue={item.portfolioValue}
              price={item.price!}
              status={item.status as 'feasible' | 'delayed' | 'challenging'}
              isLast={index === timelineItems.length - 1}
              instanceId={item.instanceId}
              loanType={item.loanType}
              onLoanTypeChange={updateTimelinePropertyLoanType}
            />
          )
        ))}
      </div>
      <div className="mt-8 text-xs text-[#374151] bg-[#f9fafb] p-6 rounded-md leading-relaxed">
        <AIStrategySummary 
          timelineProperties={timelineProperties}
          profile={profile}
        />
      </div>
    </div>
  )
}
interface TimelineItemProps {
  year: string
  quarter: string
  type: string
  number?: string
  deposit: string
  loanAmount: string
  source: string
  equity: string
  portfolioValue: string
  price: string
  status: 'feasible' | 'delayed' | 'challenging'
  isLast?: boolean
  instanceId?: string
  loanType?: 'IO' | 'PI'
  onLoanTypeChange?: (instanceId: string, loanType: 'IO' | 'PI') => void
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  year,
  quarter,
  type,
  number,
  deposit,
  loanAmount,
  source,
  equity,
  portfolioValue,
  price,
  status,
  isLast = false,
  instanceId,
  loanType = 'IO',
  onLoanTypeChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getInstance, updateInstance, createInstance } = usePropertyInstance();
  const { getPropertyData } = useDataAssumptions();
  
  // Get property instance data
  const propertyInstance = instanceId ? getInstance(instanceId) : null;
  const propertyDefaults = getPropertyData(type);
  
  // Fallback to safe defaults if both are undefined
  const propertyData = propertyInstance || propertyDefaults || {
    state: 'VIC',
    purchasePrice: 350000,
    valuationAtPurchase: 378000,
    rentPerWeek: 471,
    growthAssumption: 'High',
    lvr: 85,
    lmiWaiver: false,
    loanProduct: 'IO',
    interestRate: 6.5,
    loanTerm: 30,
    loanOffsetAccount: 0,
  };
  
  // Calculate derived values
  const calculateLMI = (purchasePrice: number, lvr: number, lmiWaiver: boolean) => {
    if (lmiWaiver || lvr <= 80) return 0;
    const loanAmount = purchasePrice * (lvr / 100);
    if (lvr <= 85) return loanAmount * 0.015;
    if (lvr <= 90) return loanAmount * 0.020;
    if (lvr <= 95) return loanAmount * 0.035;
    return loanAmount * 0.045;
  };
  
  const lmi = calculateLMI(propertyData.purchasePrice, propertyData.lvr, propertyData.lmiWaiver);
  const loanAmountCalc = (propertyData.purchasePrice * (propertyData.lvr / 100)) + lmi;
  const yieldCalc = (propertyData.rentPerWeek * 52 / propertyData.purchasePrice * 100).toFixed(1);
  const mvDiff = ((propertyData.purchasePrice / propertyData.valuationAtPurchase - 1) * 100).toFixed(1);
  
  // Inline edit handlers
  const handleFieldUpdate = (field: keyof PropertyInstanceDetails, value: any) => {
    if (!instanceId) return;
    
    // Create instance if it doesn't exist
    if (!propertyInstance) {
      createInstance(instanceId, type, 1);
    }
    
    updateInstance(instanceId, { [field]: value });
  };
  
  // Editable field component
  const EditableField = ({ 
    label, 
    value, 
    field, 
    prefix = '', 
    suffix = '',
    type = 'number'
  }: { 
    label: string; 
    value: any; 
    field: keyof PropertyInstanceDetails; 
    prefix?: string; 
    suffix?: string;
    type?: 'number' | 'text';
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [error, setError] = useState<string | null>(null);
    
    const handleSave = () => {
      // Validate before saving
      let validationError = null;
      
      if (field === 'lvr' && (editValue < 0 || editValue > 100)) {
        validationError = 'LVR must be 0-100%';
      } else if (field === 'interestRate' && (editValue < 0 || editValue > 20)) {
        validationError = 'Interest must be 0-20%';
      } else if (field === 'loanTerm' && (editValue < 1 || editValue > 40)) {
        validationError = 'Term must be 1-40 years';
      }
      
      if (validationError) {
        setError(validationError);
        return;
      }
      
      const parsedValue = type === 'number' ? parseFloat(editValue) : editValue;
      handleFieldUpdate(field, parsedValue);
      setIsEditing(false);
      setError(null);
    };
    
    if (isEditing) {
      return (
        <div className="inline-flex flex-col">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setEditValue(value);
                setIsEditing(false);
                setError(null);
              }
            }}
            autoFocus
            className="inline-block w-20 px-1 py-0 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
        </div>
      );
    }
    
    return (
      <span
        onClick={() => setIsEditing(true)}
        className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 rounded transition-colors"
        title="Click to edit"
      >
        {prefix}{value}{suffix}
      </span>
    );
  };
  
  return (
    <div className="relative bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          {getPropertyTypeIcon(type, 16, 'text-gray-600')}
        </div>
        <span className="font-medium text-gray-800">{type}</span>
        <span>({propertyData.state})</span>
        <span>|</span>
        <span>Year: {year}</span>
        <span>|</span>
        <span>Growth: {propertyData.growthAssumption}</span>
      </div>
      
      {/* Property Details Section */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-green-700 mb-1">PROPERTY DETAILS</div>
        <div className="text-sm text-gray-700">
          <span>State: </span>
          <EditableField label="State" value={propertyData.state} field="state" type="text" />
          <span className="mx-2">|</span>
          <span>Yield: </span>
          <span>{yieldCalc}%</span>
          <span className="mx-2">|</span>
          <span>Rent: </span>
          <EditableField label="Rent" value={propertyData.rentPerWeek} field="rentPerWeek" prefix="$" suffix="/wk" />
        </div>
      </div>
      
      {/* Purchase Section */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-green-700 mb-1">PURCHASE</div>
        <div className="text-sm text-gray-700">
          <span>Price: </span>
          <EditableField 
            label="Price" 
            value={(propertyData.purchasePrice / 1000).toFixed(0)} 
            field="purchasePrice" 
            prefix="$" 
            suffix="k" 
          />
          <span className="mx-2">|</span>
          <span>Valuation: </span>
          <EditableField 
            label="Valuation" 
            value={(propertyData.valuationAtPurchase / 1000).toFixed(0)} 
            field="valuationAtPurchase" 
            prefix="$" 
            suffix="k" 
          />
          <span className="mx-2">|</span>
          <span>%MV: {mvDiff}%</span>
        </div>
      </div>
      
      {/* Finance Section */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-green-700 mb-1">FINANCE</div>
        <div className="text-sm text-gray-700">
          <span>LVR: </span>
          <EditableField label="LVR" value={propertyData.lvr} field="lvr" suffix="%" />
          <span className="mx-2">|</span>
          <span>{propertyData.loanProduct} @ </span>
          <EditableField label="Interest Rate" value={propertyData.interestRate} field="interestRate" suffix="%" />
          <span> </span>
          <EditableField label="Loan Term" value={propertyData.loanTerm} field="loanTerm" suffix=" yrs" />
          <span className="mx-2">|</span>
          <span>Loan: ${(loanAmountCalc / 1000).toFixed(0)}k</span>
          <span className="mx-2">|</span>
          <span>LMI: ${(lmi || 0).toLocaleString()}</span>
          <span className="mx-2">|</span>
          <span>Offset: ${(propertyData.loanOffsetAccount || 0).toLocaleString()}</span>
        </div>
      </div>
      
      {/* Buttons */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
        <button
          onClick={() => {/* Save is auto on blur */}}
          className="text-sm text-green-700 font-medium hover:text-green-800"
        >
          [ Save Changes ]
        </button>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-sm text-green-700 font-medium hover:text-green-800"
        >
          [ Expand Full Details → ]
        </button>
      </div>
      
      {/* Property Detail Modal */}
      {instanceId && (
        <PropertyDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          instanceId={instanceId}
          propertyType={type}
        />
      )}
    </div>
  )
}

interface PauseItemProps {
  quarter: string
  duration: number
  equity: string
  portfolioValue: string
}

const PauseItem: React.FC<PauseItemProps> = ({
  quarter,
  duration,
  equity,
  portfolioValue,
}) => {
  return (
    <div className="relative bg-gray-50 rounded-lg border-2 border-gray-300 shadow-sm">
      <div className="flex items-center p-6">
        {/* Pause icon circle */}
        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mr-6 border-2 border-gray-300">
          <div className="text-center">
            <div className="text-2xl">⏸️</div>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h4 className="text-gray-700 font-medium">Pause Period</h4>
            </div>
            <div className="text-sm text-gray-600 mt-3 leading-relaxed font-normal">
              Duration: {duration} year{duration !== 1 ? 's' : ''} • Period: {quarter}
              <br />
              <span className="text-gray-500">
                No purchases during this period. Existing properties continue to grow and generate cashflow.
              </span>
              <br />
              <span className="text-gray-400">Portfolio Value: {portfolioValue} • Total Equity: {equity}</span>
            </div>
          </div>
        </div>
        {/* Status indicator */}
        <div className="ml-4 flex items-center">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span className="ml-2 text-xs text-gray-600 font-normal">
            Paused
          </span>
        </div>
      </div>
    </div>
  )
}
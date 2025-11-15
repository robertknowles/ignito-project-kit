import React, { useState } from 'react';
import { DepositTestFunnel } from './DepositTestFunnel';
import { ServiceabilityTestFunnel } from './ServiceabilityTestFunnel';
import { BorrowingCapacityTestFunnel } from './BorrowingCapacityTestFunnel';
import { getPropertyTypeIcon } from '@/utils/propertyTypeIcon';
import { PropertyDetailModal } from './PropertyDetailModal';
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';
import type { YearBreakdownData } from '@/types/property';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';

interface PurchaseEventCardProps {
  yearData: YearBreakdownData;
  property?: any; // Individual property from timelineProperties
  showDecisionEngine?: boolean; // Only show on last card of each year
}

export const PurchaseEventCard: React.FC<PurchaseEventCardProps> = ({ 
  yearData, 
  property,
  showDecisionEngine = false 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decisionEngineExpanded, setDecisionEngineExpanded] = useState(false);
  const { getInstance, updateInstance, createInstance } = usePropertyInstance();
  const { getPropertyData } = useDataAssumptions();
  
  // Use individual property data if provided, otherwise fall back to yearData
  const instanceId = property?.instanceId || (yearData.purchases?.[0]?.propertyId) || `property_${yearData.year}`;
  const propertyType = property?.title || yearData.propertyType || 'House';
  const affordableYear = property?.affordableYear || yearData.year;
  const year = affordableYear === Infinity ? Infinity : Math.floor(affordableYear);
  
  // Get property instance data
  const propertyInstance = getInstance(instanceId);
  const propertyDefaults = getPropertyData(propertyType);
  
  // Fallback to safe defaults if both are undefined
  const propertyData = propertyInstance || propertyDefaults || {
    state: 'VIC',
    purchasePrice: yearData.propertyCost || 350000,
    valuationAtPurchase: (yearData.propertyCost || 350000) * 1.08,
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
    
    // Create instance if it doesn't exist (this happens in event handler, not during render)
    if (!propertyInstance) {
      createInstance(instanceId, propertyType, 1);
      // Wait a tick for the instance to be created, then update
      setTimeout(() => {
        updateInstance(instanceId, { [field]: value });
      }, 0);
      return;
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
      
      let parsedValue = type === 'number' ? parseFloat(editValue) : editValue;
      
      // Convert 'k' format back to full numbers for price fields
      if (suffix === 'k' && (field === 'purchasePrice' || field === 'valuationAtPurchase')) {
        parsedValue = parsedValue * 1000;
      }
      
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
            className="inline-block w-20 px-1 py-0 text-sm border rounded focus:outline-none focus:ring-1"
            style={{ borderColor: '#87B5FA', outlineColor: '#87B5FA' }}
          />
          {error && <span className="text-xs text-red-700 mt-1">{error}</span>}
        </div>
      );
    }
    
    return (
      <span
        onClick={() => setIsEditing(true)}
        className="cursor-pointer px-1 rounded transition-colors"
        style={{ 
          '--hover-bg': 'rgba(135, 181, 250, 0.1)',
          '--hover-color': '#87B5FA'
        } as React.CSSProperties}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(135, 181, 250, 0.1)';
          e.currentTarget.style.color = '#87B5FA';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.color = '';
        }}
        title="Click to edit"
      >
        {prefix}{value}{suffix}
      </span>
    );
  };
  
  return (
    <div className="relative bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      {/* Row 1: Property Title with Expand Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getPropertyTypeIcon(propertyType, 16, 'text-gray-400')}
          <span className="text-sm">
            <span className="font-medium text-gray-900">{propertyType} ({propertyData.state})</span>
            <span className="text-gray-400 mx-1">|</span>
            {year === Infinity ? (
              <span className="text-red-600 font-medium">Cannot afford within timeline</span>
            ) : (
              <span className="text-gray-600">Year: {year}</span>
            )}
            <span className="text-gray-400 mx-1">|</span>
            <span className="text-gray-600">Growth: {propertyData.growthAssumption}</span>
          </span>
        </div>
        
        {/* Expand Full Details Button - Top Right */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-sm hover:underline"
          style={{ color: '#87B5FA' }}
        >
          [ Expand Full Details → ]
        </button>
      </div>
      
      {/* Row 2: Three Sections Side-by-Side */}
      <div className="grid grid-cols-3 gap-6 mb-3">
        {/* Section 1: Property Details */}
        <div>
          <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1.5">
            PROPERTY DETAILS
          </div>
          <div className="text-gray-700 text-sm">
            <span>State: </span>
            <EditableField label="State" value={propertyData.state} field="state" type="text" />
            <span className="mx-2 text-gray-400">|</span>
            <span>Yield: {yieldCalc}%</span>
            <span className="mx-2 text-gray-400">|</span>
            <span>Rent: </span>
            <EditableField label="Rent" value={propertyData.rentPerWeek} field="rentPerWeek" prefix="$" suffix="/wk" />
          </div>
        </div>
        
        {/* Section 2: Purchase */}
        <div>
          <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1.5">
            PURCHASE
          </div>
          <div className="text-gray-700 text-sm">
            <span>Price: </span>
            <EditableField label="Price" value={(propertyData.purchasePrice / 1000).toFixed(0)} field="purchasePrice" prefix="$" suffix="k" />
            <span className="mx-2 text-gray-400">|</span>
            <span>Valuation: </span>
            <EditableField label="Valuation" value={(propertyData.valuationAtPurchase / 1000).toFixed(0)} field="valuationAtPurchase" prefix="$" suffix="k" />
            <span className="mx-2 text-gray-400">|</span>
            <span>%MV: {mvDiff}%</span>
          </div>
        </div>
        
        {/* Section 3: Finance */}
        <div>
          <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1.5">
            FINANCE
          </div>
          <div className="text-gray-700 text-sm">
            <span>LVR: </span>
            <EditableField label="LVR" value={propertyData.lvr} field="lvr" suffix="%" />
            <span className="mx-2 text-gray-400">|</span>
            <span>{propertyData.loanProduct} @ </span>
            <EditableField label="Rate" value={propertyData.interestRate} field="interestRate" suffix="%" />
            <span className="mx-2 text-gray-400">|</span>
            <span>Loan: ${(loanAmountCalc / 1000).toFixed(0)}k</span>
          </div>
        </div>
      </div>

      {/* Decision Engine (only on last card of year) */}
      {showDecisionEngine && (
        <>
          <div className="mt-3 pt-3 text-center border-t border-gray-100">
            <button 
              onClick={() => setDecisionEngineExpanded(!decisionEngineExpanded)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {decisionEngineExpanded ? '▼' : '▶'} Expand Decision Engine Analysis for {year}
            </button>
          </div>

          {/* Decision Engine Funnels (when expanded) */}
          {decisionEngineExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DepositTestFunnel yearData={yearData} />
                <ServiceabilityTestFunnel yearData={yearData} />
                <BorrowingCapacityTestFunnel yearData={yearData} />
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Property Detail Modal */}
      {instanceId && (
        <PropertyDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          instanceId={instanceId}
          propertyType={propertyType}
        />
      )}
    </div>
  );
};

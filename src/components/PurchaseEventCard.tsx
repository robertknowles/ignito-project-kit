import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DepositTestFunnel } from './DepositTestFunnel';
import { ServiceabilityTestFunnel } from './ServiceabilityTestFunnel';
import { BorrowingCapacityTestFunnel } from './BorrowingCapacityTestFunnel';
import { getPropertyTypeIcon } from '@/utils/propertyTypeIcon';
import { PropertyDetailModal } from './PropertyDetailModal';
import { DecisionEngineModal } from './DecisionEngineModal';
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { YearBreakdownData } from '@/types/property';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';

interface PurchaseEventCardProps {
  yearData: YearBreakdownData;
  property?: any; // Individual property from timelineProperties
  showDecisionEngine?: boolean; // Only show on last card of each year
  onInspectProperty?: (propertyInstanceId: string) => void; // Callback when property is clicked for inspection
}

export const PurchaseEventCard: React.FC<PurchaseEventCardProps> = ({ 
  yearData, 
  property,
  showDecisionEngine = false,
  onInspectProperty,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDecisionEngineOpen, setIsDecisionEngineOpen] = useState(false);
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
  // Set valuationAtPurchase to purchasePrice by default
  const propertyData = propertyInstance || propertyDefaults || {
    state: 'VIC',
    purchasePrice: yearData.propertyCost || 350000,
    valuationAtPurchase: yearData.propertyCost || 350000, // Default to same as purchase price
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
        className="cursor-pointer px-1 rounded transition-colors inline-flex items-center gap-0.5"
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
        <ChevronDown size={10} className="opacity-50" />
      </span>
    );
  };
  
  // Handle click on property block for inspection
  const handlePropertyClick = () => {
    if (onInspectProperty && instanceId && property?.status === 'feasible') {
      onInspectProperty(instanceId);
    }
  };

  return (
    <div className="relative flex gap-2 items-center">
      {/* Year Circle - Outside and to the left - Clickable for property inspection */}
      <div 
        className={`flex-shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-200 ${
          onInspectProperty && property?.status === 'feasible' 
            ? 'cursor-pointer hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-blue-200' 
            : ''
        }`}
        style={{ 
          width: '40px', 
          height: '40px',
          backgroundColor: '#87B5FA'
        }}
        onClick={handlePropertyClick}
        title={onInspectProperty && property?.status === 'feasible' ? 'Click to inspect property' : undefined}
      >
        {year === Infinity ? '∞' : year}
      </div>

      {/* Main Card Content */}
      <div className="flex-1 flex flex-col rounded border border-gray-200 shadow-sm overflow-hidden">
        {/* White content area */}
        <div className="bg-white px-2.5 py-2">
          <div className="flex flex-col gap-1.5">
            {/* Row 1: Property Title */}
            <div className="flex items-center gap-1">
              <div className="bg-gray-100 rounded p-0.5 flex items-center justify-center">
                {getPropertyTypeIcon(propertyType, 14, 'text-gray-400')}
              </div>
              <span className="text-[10px] flex items-center">
                <span className="font-medium text-gray-900">{propertyType}</span>
                <span className="text-gray-400 mx-0.5">|</span>
                <span className="text-gray-600 flex items-center">
                  Growth:
                  <Select
                    value={propertyData.growthAssumption}
                    onValueChange={(val) => handleFieldUpdate('growthAssumption', val)}
                  >
                    <SelectTrigger className="h-4 w-auto px-1 text-[10px] border-none bg-transparent hover:bg-gray-100 focus:ring-0 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </span>
              </span>
            </div>
            
            {/* Row 2: PURCHASE */}
            <div className="text-[9px] text-gray-600">
              <span className="text-gray-400 uppercase tracking-wide mr-1">Purchase:</span>
              <EditableField label="Price" value={(propertyData.purchasePrice / 1000).toFixed(0)} field="purchasePrice" prefix="$" suffix="k" />
              <span className="mx-0.5 text-gray-300">|</span>
              <EditableField label="LVR" value={propertyData.lvr} field="lvr" suffix="%" />
            </div>
            
            {/* Row 3: PROPERTY DETAILS */}
            <div className="text-[9px] text-gray-600">
              <span className="text-gray-400 uppercase tracking-wide mr-1">Details:</span>
              <EditableField label="State" value={propertyData.state} field="state" type="text" />
              <span className="mx-0.5 text-gray-300">|</span>
              <span>Rental Yield: {yieldCalc}%</span>
              <span className="mx-0.5 text-gray-300">|</span>
              <EditableField label="Rent" value={propertyData.rentPerWeek} field="rentPerWeek" prefix="$" suffix="/wk" />
            </div>
          </div>
        </div>
        
        {/* Grey footer with action buttons */}
        <div className="bg-gray-50 border-t border-gray-200 px-2.5 py-1.5 flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[9px] hover:underline"
            style={{ color: '#87B5FA' }}
          >
            Details →
          </button>
          {showDecisionEngine && (
            <button
              onClick={() => setIsDecisionEngineOpen(true)}
              className="text-[9px] hover:underline text-gray-500"
            >
              Analysis →
            </button>
          )}
        </div>

        {/* Property Detail Modal */}
        {instanceId && (
          <PropertyDetailModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            instanceId={instanceId}
            propertyType={propertyType}
          />
        )}
        
        {/* Decision Engine Modal */}
        {showDecisionEngine && (
          <DecisionEngineModal
            isOpen={isDecisionEngineOpen}
            onClose={() => setIsDecisionEngineOpen(false)}
            yearData={yearData}
            year={year}
          />
        )}
      </div>
    </div>
  );
};

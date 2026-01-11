import React, { useState } from 'react';
import { getPropertyTypeIcon } from '@/utils/propertyTypeIcon';
import { PropertyDetailModal } from './PropertyDetailModal';
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';
import type { YearBreakdownData } from '@/types/property';

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
  const { getInstance } = usePropertyInstance();
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
  
  // Static display field component (read-only, no editing)
  const DisplayField = ({ 
    value, 
    prefix = '', 
    suffix = '',
  }: { 
    value: any; 
    prefix?: string; 
    suffix?: string;
  }) => {
    return (
      <span className="text-gray-700">
        {prefix}{value}{suffix}
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
                <span className="text-gray-600">
                  Growth: {propertyData.growthAssumption}
                </span>
              </span>
            </div>
            
            {/* Row 2: PURCHASE */}
            <div className="text-[9px] text-gray-600">
              <span className="text-gray-400 uppercase tracking-wide mr-1">Purchase:</span>
              <DisplayField value={(propertyData.purchasePrice / 1000).toFixed(0)} prefix="$" suffix="k" />
              <span className="mx-0.5 text-gray-300">|</span>
              <DisplayField value={propertyData.lvr} suffix="%" />
            </div>
            
            {/* Row 3: PROPERTY DETAILS */}
            <div className="text-[9px] text-gray-600">
              <span className="text-gray-400 uppercase tracking-wide mr-1">Details:</span>
              <DisplayField value={propertyData.state} />
              <span className="mx-0.5 text-gray-300">|</span>
              <span>Rental Yield: {yieldCalc}%</span>
              <span className="mx-0.5 text-gray-300">|</span>
              <DisplayField value={propertyData.rentPerWeek} prefix="$" suffix="/wk" />
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
        </div>

        {/* Property Detail Modal - Read Only from Dashboard */}
        {instanceId && (
          <PropertyDetailModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            instanceId={instanceId}
            propertyType={propertyType}
            readOnly={true}
          />
        )}
      </div>
    </div>
  );
};

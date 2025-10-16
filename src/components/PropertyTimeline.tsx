import React, { useState } from 'react';
import { Building2, Home, Building } from 'lucide-react';

export interface Purchase {
  year: number;
  propertyType: 'Unit' | 'House' | 'Apartment';
  cost: number;
  propertyNumber: number;
}

export interface Client {
  id: string;
  name: string;
  avatar: string;
  purchases: Purchase[];
}

export interface PropertyTimelineProps {
  clients: Client[];
  startYear: number;
  endYear: number;
}

const PropertyIcon = ({ type }: { type: Purchase['propertyType'] }) => {
  const iconProps = { className: 'w-4 h-4', strokeWidth: 2 };
  
  switch (type) {
    case 'Unit':
      return <Building2 {...iconProps} />;
    case 'House':
      return <Home {...iconProps} />;
    case 'Apartment':
      return <Building {...iconProps} />;
    default:
      return <Building2 {...iconProps} />;
  }
};

export const PropertyTimeline: React.FC<PropertyTimelineProps> = ({
  clients,
  startYear,
  endYear,
}) => {
  const [hoveredPurchase, setHoveredPurchase] = useState<{
    clientId: string;
    purchaseIndex: number;
    x: number;
    y: number;
  } | null>(null);

  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  const totalYears = years.length;

  const getPropertyColor = (type: Purchase['propertyType']) => {
    switch (type) {
      case 'Unit':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'House':
        return 'bg-green-500 hover:bg-green-600';
      case 'Apartment':
        return 'bg-purple-500 hover:bg-purple-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full">
      {/* Header with years */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-48 flex-shrink-0 px-4 py-3 font-medium text-sm text-gray-700">
          Client
        </div>
        <div className="flex-1 flex">
          {years.map((year) => (
            <div
              key={year}
              className="flex-1 px-2 py-3 text-center text-xs font-medium text-gray-600 border-l border-gray-200"
              style={{ minWidth: `${100 / totalYears}%` }}
            >
              {year}
            </div>
          ))}
        </div>
      </div>

      {/* Client rows */}
      <div className="divide-y divide-gray-200">
        {clients.map((client) => (
          <div key={client.id} className="flex hover:bg-gray-50 transition-colors">
            {/* Client info column */}
            <div className="w-48 flex-shrink-0 px-4 py-4 flex items-center gap-3">
              <img
                src={client.avatar}
                alt={client.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-medium text-gray-900 truncate">
                {client.name}
              </span>
            </div>

            {/* Timeline column */}
            <div className="flex-1 flex relative">
              {years.map((year, yearIndex) => {
                const purchase = client.purchases.find((p) => p.year === year);
                
                return (
                  <div
                    key={year}
                    className="flex-1 px-2 py-4 border-l border-gray-200 flex items-center justify-center"
                    style={{ minWidth: `${100 / totalYears}%` }}
                  >
                    {purchase && (
                      <div
                        className={`relative w-10 h-10 rounded-lg ${getPropertyColor(
                          purchase.propertyType
                        )} flex items-center justify-center text-white shadow-md cursor-pointer transition-all duration-200 transform hover:scale-110`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredPurchase({
                            clientId: client.id,
                            purchaseIndex: yearIndex,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredPurchase(null)}
                      >
                        <PropertyIcon type={purchase.propertyType} />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-gray-100 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-700">
                            {purchase.propertyNumber}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredPurchase && (() => {
        const client = clients.find((c) => c.id === hoveredPurchase.clientId);
        const purchase = client?.purchases.find((p) => 
          years[hoveredPurchase.purchaseIndex] === p.year
        );
        
        if (!purchase) return null;

        return (
          <div
            className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg shadow-xl px-3 py-2 pointer-events-none"
            style={{
              left: `${hoveredPurchase.x}px`,
              top: `${hoveredPurchase.y - 10}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold mb-1">Property #{purchase.propertyNumber}</div>
            <div className="text-gray-300">{purchase.propertyType}</div>
            <div className="text-gray-300">{formatCurrency(purchase.cost)}</div>
            <div className="text-gray-400 text-[10px] mt-1">{purchase.year}</div>
            {/* Arrow */}
            <div
              className="absolute left-1/2 bottom-0 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"
              style={{ transform: 'translate(-50%, 100%)' }}
            />
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 px-4 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-xs text-gray-600">Unit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-gray-600">House</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500" />
          <span className="text-xs text-gray-600">Apartment</span>
        </div>
      </div>
    </div>
  );
};


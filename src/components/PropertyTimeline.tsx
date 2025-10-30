import React, { useState } from 'react';
import { Building2, Home, Building } from 'lucide-react';

export interface Purchase {
  year: number;
  propertyType: 'Unit' | 'House' | 'Apartment' | 'Other';
  cost: number;
  propertyNumber: number;
}

export interface Client {
  id: string;
  name: string;
  avatar?: string;
  purchases: Purchase[];
}

export interface PropertyTimelineProps {
  clients: Client[];
  startYear?: number;
  endYear?: number;
  'data-id'?: string;
}

const PropertyIcon = ({ type }: { type: Purchase['propertyType'] }) => {
  const iconProps = { className: 'w-5 h-5', strokeWidth: 2 };
  
  switch (type) {
    case 'Unit':
      return <Building2 {...iconProps} />;
    case 'House':
      return <Home {...iconProps} />;
    case 'Apartment':
      return <Building {...iconProps} />;
    case 'Other':
      return <Building {...iconProps} />;
    default:
      return <Building2 {...iconProps} />;
  }
};

export function PropertyTimeline({
  clients,
  startYear = 2025,
  endYear = 2040,
  'data-id': dataId,
}: PropertyTimelineProps) {
  const [hoveredPurchase, setHoveredPurchase] = useState<{
    clientId: string;
    year: number;
  } | null>(null);

  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  const currentYear = new Date().getFullYear();

  const formatCurrency = (amount: number) => {
    return '$' + amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="flex h-full w-full bg-white" data-id={dataId}>
      {/* Left sidebar - Client list */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Clients
          </span>
        </div>
        {/* Client names */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 4rem)' }}>
          {clients.map((client) => (
            <div
              key={client.id}
              className="h-16 flex items-center px-6 border-b border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 truncate">
                {client.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Timeline */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative">
          {/* Year headers */}
          <div className="sticky top-0 z-10 h-16 flex bg-white border-b border-gray-200">
            {years.map((year) => (
              <div
                key={year}
                className="flex-shrink-0 flex items-center justify-center border-r border-gray-200"
                style={{ width: '80px' }}
              >
                <span className="text-xs font-medium text-gray-600">{year}</span>
              </div>
            ))}
          </div>

          {/* Timeline rows */}
          <div className="relative">
            {clients.map((client, clientIndex) => (
              <div
                key={client.id}
                className="h-16 flex border-b border-gray-200 hover:bg-gray-50 transition-colors relative"
              >
                {years.map((year) => (
                  <div
                    key={year}
                    className="flex-shrink-0 border-r border-gray-200 flex items-center justify-center"
                    style={{ width: '80px' }}
                  />
                ))}
                {/* Purchase dots */}
                {client.purchases.map((purchase) => {
                  const yearIndex = years.indexOf(purchase.year);
                  if (yearIndex === -1) return null;

                  const isHovered =
                    hoveredPurchase?.clientId === client.id &&
                    hoveredPurchase?.year === purchase.year;

                  return (
                    <div
                      key={`${client.id}-${purchase.year}`}
                      className="absolute flex items-center justify-center cursor-pointer"
                      style={{
                        left: `${yearIndex * 80 + 40}px`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                      onMouseEnter={() =>
                        setHoveredPurchase({ clientId: client.id, year: purchase.year })
                      }
                      onMouseLeave={() => setHoveredPurchase(null)}
                    >
                      <div
                        className={`relative flex items-center justify-center text-gray-400 transition-all duration-200 ${
                          isHovered ? 'scale-125' : ''
                        }`}
                      >
                        <PropertyIcon type={purchase.propertyType} />

                        {/* Tooltip */}
                        {isHovered && (
                          <div
                            className="absolute z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg pointer-events-none whitespace-nowrap"
                            style={{
                              left: 'calc(100% + 8px)',
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                          >
                            <div className="font-medium text-[11px]">{purchase.propertyType} #{purchase.propertyNumber}</div>
                            <div className="text-gray-300 text-[10px]">${formatCurrency(purchase.cost)}</div>
                            {/* Arrow */}
                            <div
                              className="absolute top-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-900"
                              style={{
                                left: '-4px',
                                transform: 'translateY(-50%)',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


import React from 'react'

// Period conversion helpers
const PERIODS_PER_YEAR = 2;
const BASE_YEAR = 2025;

const periodToDisplay = (period: number): string => {
  const year = BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
  const half = ((period - 1) % PERIODS_PER_YEAR) + 1;
  return `${year} H${half}`;
};

export const YearlyCalendar = () => {
  // Years to display with half-year markers (2025-2029, showing H1 and H2 for each)
  const years = [2025, 2026, 2027, 2028, 2029]
  
  // Mock client purchase data (now by period: "2026 H1", "2026 H2", etc.)
  const clientPurchases = {
    '2026 H1': [
      {
        id: 'RK',
        color: 'bg-[#10b981] bg-opacity-50',
      },
    ],
    '2027 H2': [
      {
        id: 'JC',
        color: 'bg-[#3b82f6] bg-opacity-60',
      },
    ],
    '2029 H1': [
      {
        id: 'RK',
        color: 'bg-[#10b981] bg-opacity-50',
      },
    ],
  } as any
  
  return (
    <div className="w-full bg-[#f9fafb] p-6 rounded-lg">
      <div className="text-xs text-[#6b7280] mb-4">
        Properties can be purchased every 6 months (H1/H2 = First/Second Half)
      </div>
      <div className="flex justify-between w-full gap-1 overflow-x-auto">
        {years.map((year) => (
          <div key={year} className="flex gap-1">
            {/* H1 */}
            <div className="flex flex-col items-center">
              <div className="mb-2 text-xs font-medium text-[#111827]">{year} H1</div>
              <div className="w-14 h-12 bg-white border border-gray-200 rounded-md flex items-center justify-center">
                {clientPurchases[`${year} H1`] ? (
                  <div className="flex gap-1">
                    {clientPurchases[`${year} H1`].map((client: any) => (
                      <div
                        key={`${year}-H1-${client.id}`}
                        className={`w-7 h-7 rounded-full ${client.color} flex items-center justify-center text-white text-xs`}
                      >
                        {client.id}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            
            {/* H2 */}
            <div className="flex flex-col items-center">
              <div className="mb-2 text-xs font-medium text-[#111827]">{year} H2</div>
              <div className="w-14 h-12 bg-white border border-gray-200 rounded-md flex items-center justify-center">
                {clientPurchases[`${year} H2`] ? (
                  <div className="flex gap-1">
                    {clientPurchases[`${year} H2`].map((client: any) => (
                      <div
                        key={`${year}-H2-${client.id}`}
                        className={`w-7 h-7 rounded-full ${client.color} flex items-center justify-center text-white text-xs`}
                      >
                        {client.id}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
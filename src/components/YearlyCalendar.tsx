import React from 'react'
export const YearlyCalendar = () => {
  // Years to display (2025-2034)
  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034]
  // Mock client purchase data
  const clientPurchases = {
    2026: [
      {
        id: 'RK',
        color: 'bg-[#10b981] bg-opacity-50',
      },
    ],
    2027: [
      {
        id: 'JC',
        color: 'bg-[#3b82f6] bg-opacity-60',
      },
    ],
    2029: [
      {
        id: 'RK',
        color: 'bg-[#10b981] bg-opacity-50',
      },
    ],
    2031: [
      {
        id: 'JC',
        color: 'bg-[#3b82f6] bg-opacity-60',
      },
    ],
    2034: [
      {
        id: 'RK',
        color: 'bg-[#10b981] bg-opacity-50',
      },
    ],
  } as any
  return (
    <div className="w-full bg-[#f9fafb] p-6 rounded-lg">
      <div className="flex justify-between w-full">
        {years.map((year) => (
          <div key={year} className="flex flex-col items-center">
            <div className="mb-4 font-medium text-[#111827]">{year}</div>
            <div className="w-16 h-12 bg-[#f9fafb] rounded-md flex items-center justify-center">
              {clientPurchases[year] ? (
                <div className="flex gap-2">
                  {clientPurchases[year].map((client: any) => (
                    <div
                      key={`${year}-${client.id}`}
                      className={`w-8 h-8 rounded-full ${client.color} flex items-center justify-center text-white text-xs`}
                    >
                      {client.id}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
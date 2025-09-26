import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { LineChartIcon } from 'lucide-react'
import { SimulationResults } from '../hooks/useSimulationEngine'

interface CashflowChartProps {
  simulationResults: SimulationResults | null;
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ simulationResults }) => {
  // Generate chart data from simulation results
  const data = simulationResults?.projections ? simulationResults.projections.map((projection, index) => ({
    year: (2024 + projection.year).toString(),
    cashflow: projection.netCashflow,
    highlight: index === Math.floor(simulationResults.projections.length * 0.3) // Highlight around 30% mark
  })) : [
    {
      year: '2026',
      cashflow: -11000,
    },
    {
      year: '2027',
      cashflow: -12000,
    },
    {
      year: '2028',
      cashflow: -21000,
    },
    {
      year: '2029',
      cashflow: -20000,
    },
    {
      year: '2030',
      cashflow: -17000,
    },
    {
      year: '2031',
      cashflow: -14000,
    },
    {
      year: '2032',
      cashflow: -11500,
    },
    {
      year: '2033',
      cashflow: -9000,
      highlight: true,
    },
    {
      year: '2034',
      cashflow: -6000,
    },
    {
      year: '2035',
      cashflow: -4500,
    },
    {
      year: '2036',
      cashflow: -2000,
    },
    {
      year: '2037',
      cashflow: -1000,
    },
    {
      year: '2038',
      cashflow: 2000,
    },
    {
      year: '2039',
      cashflow: 2000,
    },
    {
      year: '2040',
      cashflow: -1000,
    },
    {
      year: '2041',
      cashflow: -14000,
    },
    {
      year: '2042',
      cashflow: -12000,
    },
    {
      year: '2043',
      cashflow: -10000,
    },
    {
      year: '2044',
      cashflow: -6000,
    },
    {
      year: '2045',
      cashflow: -4000,
    },
    {
      year: '2046',
      cashflow: -500,
    },
    {
      year: '2047',
      cashflow: 2000,
    },
    {
      year: '2048',
      cashflow: 6000,
    },
    {
      year: '2049',
      cashflow: 9500,
    },
    {
      year: '2050',
      cashflow: 13000,
    },
    {
      year: '2051',
      cashflow: 17000,
    },
    {
      year: '2052',
      cashflow: 21000,
    },
    {
      year: '2053',
      cashflow: 25000,
    },
    {
      year: '2054',
      cashflow: 29000,
    },
    {
      year: '2055',
      cashflow: 35000,
    },
  ];

  // If no simulation data, show empty state
  if (!simulationResults?.projections || simulationResults.projections.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <LineChartIcon size={16} className="text-[#6b7280]" />
          <h3 className="text-[#111827] font-medium text-sm">
            Cashflow Analysis
          </h3>
        </div>
        <div className="h-80 w-full flex items-center justify-center text-[#6b7280]">
          <div className="text-center">
            <LineChartIcon size={48} className="mx-auto mb-4 text-[#d1d5db]" />
            <h4 className="text-sm font-medium mb-2">No Cashflow Data</h4>
            <p className="text-xs">Select properties to see cashflow analysis</p>
          </div>
        </div>
      </div>
    );
  }
  // Custom tooltip to show the values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      const formattedValue = Math.abs(value).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      return (
        <div className="bg-white p-3 border border-[#f3f4f6] shadow-sm rounded-md">
          <p className="text-xs font-medium">{`Year: ${label}`}</p>
          <p className="text-xs text-[#374151]">
            {`Net Cashflow: ${value >= 0 ? '+' : '-'}${formattedValue}`}
          </p>
        </div>
      )
    }
    return null
  }
  // Format y-axis ticks
  const formatYAxis = (value: number) => {
    if (value === 0) return '$0'
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    if (absValue >= 1000) {
      return `${sign}$${absValue / 1000}K`
    }
    return `${sign}$${absValue}`
  }
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <LineChartIcon size={16} className="text-[#6b7280]" />
        <h3 className="text-[#111827] font-medium text-sm">
          Cashflow Analysis
        </h3>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 20,
              left: 10,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="year"
              tick={{
                fontSize: 11,
              }}
              stroke="#9ca3af"
              axisLine={{
                stroke: '#e5e7eb',
              }}
              tickLine={{
                stroke: '#e5e7eb',
              }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{
                fontSize: 11,
              }}
              stroke="#9ca3af"
              axisLine={{
                stroke: '#e5e7eb',
              }}
              tickLine={{
                stroke: '#e5e7eb',
              }}
              domain={[-30000, 40000]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={2} />
            <Bar dataKey="cashflow" fill="#84E1BC" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="#84E1BC"
                  fillOpacity={entry.highlight ? 0.7 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-xs text-[#374151] bg-[#f9fafb] p-4 rounded-md leading-relaxed">
        <p>
          The chart shows the transition from negative to positive cashflow over
          time as properties mature and rents increase.
        </p>
      </div>
    </div>
  )
}
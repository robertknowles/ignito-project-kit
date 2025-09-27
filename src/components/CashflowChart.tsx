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
import { LineChartIcon, TrendingUpIcon } from 'lucide-react'
import { useSimulationEngine } from '../hooks/useSimulationEngine'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'

export const CashflowChart = () => {
  const { simulationResults, isSimulationComplete } = useSimulationEngine()
  const { calculations } = usePropertySelection()
  const { globalFactors } = useDataAssumptions()

  // Generate cashflow chart data from simulation results
  const generateCashflowData = () => {
    if (!isSimulationComplete || simulationResults.yearlyData.length === 0) {
      return []
    }

    const interestRate = parseFloat(globalFactors.interestRate) / 100

    return simulationResults.yearlyData.map(yearData => {
      // Calculate individual components for this year
      const ownedProperties = simulationResults.finalState.ownedProperties.filter(
        property => property.purchaseYear <= yearData.year
      )

      const rentalIncome = ownedProperties.reduce((total, property) => {
        // Apply growth to property value based on years owned
        const yearsOwned = yearData.year - property.purchaseYear
        const currentValue = property.purchasePrice * Math.pow(1 + property.growthPercent / 100, yearsOwned)
        return total + (currentValue * property.yieldPercent / 100)
      }, 0)

      const loanRepayments = ownedProperties.reduce((total, property) => {
        return total + (property.loanAmount * interestRate)
      }, 0)

      const netCashflow = rentalIncome - loanRepayments

      return {
        year: yearData.year.toString(),
        rentalIncome: Math.round(rentalIncome),
        loanRepayments: Math.round(loanRepayments),
        cashflow: Math.round(netCashflow),
        highlight: netCashflow >= 0 && yearData.year > 1, // Highlight when cashflow turns positive
      }
    })
  }

  const data = generateCashflowData()

  // Handle empty state
  if (data.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <LineChartIcon size={16} className="text-[#6b7280]" />
          <h3 className="text-[#111827] font-medium text-sm">
            Cashflow Analysis
          </h3>
        </div>
        <div className="h-80 w-full flex items-center justify-center bg-[#f9fafb] rounded-md">
          <div className="text-center text-[#6b7280]">
            <TrendingUpIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">Select properties to view cashflow analysis</p>
          </div>
        </div>
      </div>
    )
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
        {data.length > 0 ? (
          <p>
            Cashflow analysis shows rental income vs loan repayments. 
            {data.some(d => d.cashflow >= 0) 
              ? `Portfolio becomes cashflow positive in Year ${data.find(d => d.cashflow >= 0)?.year}.`
              : 'Portfolio requires ongoing financial support throughout the timeline.'
            }
          </p>
        ) : (
          <p>Select properties to view cashflow progression over time.</p>
        )}
      </div>
    </div>
  )
}
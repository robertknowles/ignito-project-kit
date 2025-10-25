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
  Label,
  ReferenceDot,
} from 'recharts'
import { LineChartIcon } from 'lucide-react'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'

export const CashflowChart = () => {
  const { cashflowData } = useChartDataGenerator()
  const { profile } = useInvestmentProfile()
  
  // Use calculated data or show empty state
  const data = cashflowData.length > 0 ? cashflowData : [
    {
      year: '2025',
      cashflow: 0,
      rentalIncome: 0,
      loanRepayments: 0,
    }
  ]
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

  // Find when cashflow turns positive (first time)
  const firstPositivePoint = data.find(d => d.cashflow > 0)
  const cashflowPositiveYear = firstPositivePoint ? firstPositivePoint.year : null

  // Find when passive income goal is reached
  const incomeGoalReached = data.find(d => d.cashflow >= profile.cashflowGoal)
  const incomeGoalYear = incomeGoalReached ? incomeGoalReached.year : null

  // Get final data point for end state annotation
  const finalDataPoint = data[data.length - 1]

  // Custom label for break-even line
  const BreakEvenLabel = (props: any) => {
    const { viewBox } = props
    if (!viewBox) return null
    return (
      <text
        x={viewBox.x + 10}
        y={viewBox.y - 5}
        fill="#9CA3AF"
        fontSize={11}
        fontWeight={500}
      >
        Break-even
      </text>
    )
  }

  // Custom label for passive income goal line
  const IncomeGoalLabel = (props: any) => {
    const { viewBox } = props
    if (!viewBox || !incomeGoalYear) return null
    return (
      <text
        x={viewBox.x + 10}
        y={viewBox.y - 5}
        fill="#F59E0B"
        fontSize={11}
        fontWeight={600}
      >
        💰 Income Goal: ${(profile.cashflowGoal / 1000).toFixed(0)}k/year
      </text>
    )
  }

  // Custom label for cashflow positive marker
  const CashflowPositiveLabel = (props: any) => {
    if (!cashflowPositiveYear) return null
    return (
      <text
        x={props.x}
        y={props.y - 10}
        fill="#10B981"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        💚 Cash Flow Positive: {cashflowPositiveYear}
      </text>
    )
  }

  // Custom label for income goal achievement
  const GoalAchievedLabel = (props: any) => {
    if (!incomeGoalYear) return null
    return (
      <text
        x={props.x}
        y={props.y - 10}
        fill="#F59E0B"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        💰 Goal Reached: {incomeGoalYear}
      </text>
    )
  }

  // Custom label for end state
  const EndStateLabel = (props: any) => {
    const { viewBox } = props
    if (!viewBox || !finalDataPoint) return null
    return (
      <g>
        <rect
          x={viewBox.x - 85}
          y={viewBox.y - 20}
          width={80}
          height={18}
          fill="white"
          fillOpacity={0.95}
          stroke="#e5e7eb"
          strokeWidth={1}
          rx={4}
        />
        <text
          x={viewBox.x - 45}
          y={viewBox.y - 8}
          fill="#10B981"
          fontSize={10}
          fontWeight={600}
          textAnchor="middle"
        >
          Income: ${(finalDataPoint.cashflow / 1000).toFixed(0)}k/year
        </text>
      </g>
    )
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
              top: 30,
              right: 100,
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
            
            {/* Break-even Line (y=0) */}
            <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5">
              <Label content={<BreakEvenLabel />} />
            </ReferenceLine>

            {/* Passive Income Goal Line */}
            {profile.cashflowGoal > 0 && (
              <ReferenceLine
                y={profile.cashflowGoal}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                strokeWidth={2}
              >
                <Label content={<IncomeGoalLabel />} />
              </ReferenceLine>
            )}

            <Bar dataKey="cashflow" fill="#84E1BC" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.cashflow >= 0 ? "#10B981" : "#EF4444"}
                  fillOpacity={entry.highlight ? 0.7 : 1}
                />
              ))}
            </Bar>

            {/* Cashflow Positive Marker */}
            {firstPositivePoint && (
              <ReferenceLine
                x={firstPositivePoint.year}
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="3 3"
              >
                <Label content={<CashflowPositiveLabel />} position="top" />
              </ReferenceLine>
            )}

            {/* Income Goal Achievement Marker */}
            {incomeGoalReached && (
              <ReferenceLine
                x={incomeGoalReached.year}
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="3 3"
              >
                <Label content={<GoalAchievedLabel />} position="top" />
              </ReferenceLine>
            )}

            {/* End State Annotation */}
            {finalDataPoint && data.length > 1 && (
              <ReferenceLine
                segment={[
                  { x: finalDataPoint.year, y: finalDataPoint.cashflow },
                  { x: finalDataPoint.year, y: finalDataPoint.cashflow }
                ]}
                stroke="transparent"
              >
                <Label content={<EndStateLabel />} position="right" />
              </ReferenceLine>
            )}
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
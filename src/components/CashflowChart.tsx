import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Cell,
  Label,
} from 'recharts'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors'

export const CashflowChart = () => {
  const { cashflowData } = useChartDataGenerator()
  const { profile } = useInvestmentProfile()
  
  // Use calculated data or show empty state
  const data = cashflowData.length > 0 ? cashflowData : [
    {
      year: '2025',
      cashflow: 0,
      rentalIncome: 0,
      expenses: 0,
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
        <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
          <p className="text-xs font-medium text-gray-900">{`Year: ${label}`}</p>
          <p className="text-xs text-gray-600">
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

  // Calculate Y-axis domain with nice round intervals
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    const values = data.map(d => d.cashflow);
    const dataMin = Math.min(...values, 0);
    const dataMax = Math.max(...values, profile.cashflowGoal || 0);
    
    // Determine a nice interval based on the range
    const range = dataMax - dataMin;
    let interval: number;
    
    if (range <= 50000) {
      interval = 10000; // 10K intervals for small ranges
    } else if (range <= 100000) {
      interval = 20000; // 20K intervals
    } else if (range <= 200000) {
      interval = 50000; // 50K intervals
    } else {
      interval = 100000; // 100K intervals for large ranges
    }
    
    // Round min down and max up to nearest interval
    const niceMin = Math.floor(dataMin / interval) * interval;
    const niceMax = Math.ceil(dataMax / interval) * interval;
    
    // Generate tick values
    const ticks: number[] = [];
    for (let tick = niceMin; tick <= niceMax; tick += interval) {
      ticks.push(tick);
    }
    
    return {
      yAxisDomain: [niceMin, niceMax],
      yAxisTicks: ticks,
    };
  }, [data, profile.cashflowGoal]);

  // Custom label for break-even line
  const BreakEvenLabel = (props: any) => {
    const { viewBox } = props
    if (!viewBox) return null
    return (
      <text
        x={viewBox.x + 10}
        y={viewBox.y - 5}
        fill={CHART_COLORS.annotationText}
        fontSize={12}
        fontWeight={500}
      >
        Break-even
      </text>
    )
  }

  // Custom label for passive income goal line (empty - we only show the yellow dot)
  const IncomeGoalLabel = () => {
    return null
  }

  // Custom label for cashflow positive marker
  const CashflowPositiveLabel = (props: any) => {
    if (!cashflowPositiveYear) return null
    // Check if we have valid coordinates
    if (typeof props.x !== 'number' || typeof props.y !== 'number' || 
        isNaN(props.x) || isNaN(props.y)) {
      return null
    }
    return (
      <text
        x={props.x}
        y={props.y - 10}
        fill={CHART_COLORS.annotationText}
        fontSize={12}
        fontWeight={500}
        textAnchor="middle"
      >
        💚 Cash Flow Positive: {cashflowPositiveYear}
      </text>
    )
  }

  // Custom label for income goal achievement (empty - we only show the yellow dot)
  const GoalAchievedLabel = () => {
    return null
  }

  // Custom label for end state
  const EndStateLabel = (props: any) => {
    const { viewBox } = props
    if (!viewBox || !finalDataPoint) return null
    return (
      <g>
        <text
          x={viewBox.x - 45}
          y={viewBox.y - 8}
          fill={CHART_COLORS.annotationText}
          fontSize={12}
          fontWeight={500}
          textAnchor="middle"
        >
          Income: ${(finalDataPoint.cashflow / 1000).toFixed(0)}k/year
        </text>
      </g>
    )
  }

  return (
    <div>
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 30,
              right: 120,
              left: 14,
              bottom: 5,
            }}
          >
            <CartesianGrid {...CHART_STYLE.grid} />
            <XAxis
              dataKey="year"
              {...CHART_STYLE.xAxis}
            />
            <YAxis
              tickFormatter={formatYAxis}
              {...CHART_STYLE.yAxis}
              domain={yAxisDomain}
              ticks={yAxisTicks}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Break-even Line (y=0) */}
            <ReferenceLine
              y={0}
              stroke={CHART_COLORS.referenceLine}
              strokeWidth={1}
              strokeDasharray="3 3"
            >
              <Label content={<BreakEvenLabel />} />
            </ReferenceLine>

            <Bar dataKey="cashflow" fill={CHART_COLORS.barPositive} radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.cashflow >= 0 ? CHART_COLORS.barPositive : CHART_COLORS.barNegative}
                  fillOpacity={entry.highlight ? 0.7 : 1}
                />
              ))}
            </Bar>

            {/* Income Goal Achievement Marker - Gold dot when cashflow goal is reached */}
            {incomeGoalReached && (
              <ReferenceDot
                x={incomeGoalReached.year}
                y={incomeGoalReached.cashflow}
                r={8}
                fill={CHART_COLORS.goalMarker}
                stroke={CHART_COLORS.goal}
                strokeWidth={2}
              >
                <Label content={<GoalAchievedLabel />} position="top" />
              </ReferenceDot>
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
      <div className="mt-5 text-xs text-gray-500 bg-gray-50/60 p-4 rounded-md leading-relaxed">
        <p>
          The chart shows the transition from negative to positive cashflow over
          time as properties mature and rents increase.
        </p>
      </div>
    </div>
  )
}
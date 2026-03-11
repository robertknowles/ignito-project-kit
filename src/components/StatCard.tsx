import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, trend }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="mt-1">
        <span className="text-[28px] font-bold text-gray-900 tracking-tight leading-none">
          {value}
        </span>
      </div>
      {subtitle && (
        <span className="text-xs text-gray-400 mt-1 block">{subtitle}</span>
      )}
      {trend && (
        <div className="mt-1">
          <span
            className={`text-xs font-medium ${
              trend.direction === 'up'
                ? 'text-green-600'
                : trend.direction === 'down'
                ? 'text-red-500'
                : 'text-gray-500'
            }`}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—'}{' '}
            {trend.value}
          </span>
        </div>
      )}
    </div>
  )
}

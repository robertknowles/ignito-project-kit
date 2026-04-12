import React from 'react'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  badge?: {
    label: string
    variant: 'green' | 'amber' | 'red' | 'blue' | 'gray'
  }
  progress?: {
    current: number
    max: number
  }
  info?: string
}

const badgeStyles = {
  green: 'bg-green-50 text-green-700 border border-green-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  red: 'bg-red-50 text-red-600 border border-red-200',
  blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  gray: 'bg-gray-50 text-gray-600 border border-gray-200',
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, trend, badge, progress, info }) => {
  return (
    <div className="bg-[#FCFCFD] border border-[#E9EAEB] rounded-lg p-5">
      <div className="flex items-start justify-between">
        <span className="metric-label">{label}</span>
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-300 hover:text-gray-400 transition-colors -mt-0.5">
                <Info size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-xs">{info}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mt-1">
        <span className="stat-number">
          {value}
        </span>
      </div>
      {subtitle && (
        <span className="meta mt-1 block">{subtitle}</span>
      )}
      {progress && (
        <div className="mt-2">
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all"
              style={{ width: `${Math.min((progress.current / progress.max) * 100, 100)}%` }}
            />
          </div>
          <span className="meta mt-1 block">
            Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}
      {badge && (
        <div className="mt-2">
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeStyles[badge.variant]}`}>
            {badge.label}
          </span>
        </div>
      )}
      {trend && (
        <div className="mt-1">
          <span
            className={`text-xs font-medium ${
              trend.direction === 'up'
                ? 'text-blue-600'
                : trend.direction === 'down'
                ? 'text-gray-400'
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

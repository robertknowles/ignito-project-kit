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
  green: 'bg-[#F9FAFB] text-[#344054] border border-[#E9EAEB]',
  amber: 'bg-[#F9FAFB] text-[#344054] border border-[#E9EAEB]',
  red: 'bg-[#F9FAFB] text-[#344054] border border-[#E9EAEB]',
  blue: 'bg-[#F9FAFB] text-[#344054] border border-[#E9EAEB]',
  gray: 'bg-[#F9FAFB] text-[#344054] border border-[#E9EAEB]',
}

const badgeDotStyles = {
  green: 'bg-[#667085]',
  amber: 'bg-[#667085]',
  red: 'bg-[#667085]',
  blue: 'bg-[#667085]',
  gray: 'bg-[#667085]',
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, trend, badge, progress, info }) => {
  return (
    <div className="bg-white border border-[#E9EAEB] rounded-xl p-6">
      <div className="flex items-start justify-between">
        <span className="metric-label">{label}</span>
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-[#D5D7DA] hover:text-[#A4A7AE] transition-colors duration-150">
                <Info size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="text-xs">{info}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mt-2">
        <span className="stat-number">
          {value}
        </span>
      </div>
      {subtitle && (
        <span className="meta mt-1.5 block">{subtitle}</span>
      )}
      {progress && (
        <div className="mt-3">
          <div className="w-full h-2 bg-[#F5F5F6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#535862] rounded-full transition-all duration-300"
              style={{ width: `${Math.min((progress.current / progress.max) * 100, 100)}%` }}
            />
          </div>
          <span className="meta mt-1.5 block">
            Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}
      {badge && (
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-0.5 rounded-full ${badgeStyles[badge.variant]}`}>
            {badge.label}
          </span>
        </div>
      )}
      {trend && (
        <div className="mt-2">
          <span
            className={`text-xs font-medium ${
              trend.direction === 'up'
                ? 'text-[#535862]'
                : trend.direction === 'down'
                ? 'text-[#535862]'
                : 'text-[#717680]'
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

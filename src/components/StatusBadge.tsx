import React from 'react'

const variants = {
  blue: 'text-[#2563EB] bg-[#EFF6FF]',
  green: 'text-[#16A34A] bg-[#F0FDF4]',
  gray: 'text-[#6B7280] bg-[#F3F4F6]',
  amber: 'text-[#D97706] bg-[#FFFBEB]',
  red: 'text-[#EF4444] bg-[#FEF2F2]',
} as const

interface StatusBadgeProps {
  label: string
  variant: keyof typeof variants
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${variants[variant]}`}
    >
      {label}
    </span>
  )
}

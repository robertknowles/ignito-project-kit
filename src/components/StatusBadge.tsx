import React from 'react'

const variants = {
  blue: 'text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE]',
  green: 'text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0]',
  gray: 'text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB]',
  amber: 'text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A]',
  red: 'text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA]',
} as const

interface StatusBadgeProps {
  label: string
  variant: keyof typeof variants
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded ${variants[variant]}`}
    >
      {label}
    </span>
  )
}

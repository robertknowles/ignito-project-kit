import React from 'react'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg py-12 px-6 text-center">
      <Icon size={32} className="text-gray-400 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  )
}

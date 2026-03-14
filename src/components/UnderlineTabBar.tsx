import React from 'react'

interface Tab {
  key: string
  label: string
  count?: number
}

interface UnderlineTabBarProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
}

export const UnderlineTabBar: React.FC<UnderlineTabBarProps> = ({ tabs, activeKey, onChange }) => {
  return (
    <div className="flex gap-6 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`pb-2 text-sm transition-colors ${
              isActive
                ? 'font-medium text-gray-800 border-b-2 border-[#2563EB]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

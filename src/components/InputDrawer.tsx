import React, { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SlidersHorizontal, LayoutGrid } from 'lucide-react'
import { ClientInputsPanel } from './ClientInputsPanel'
import { PropertyBlocksPanel } from './PropertyBlocksPanel'

interface InputDrawerProps {
  isOpen: boolean
  onToggle: () => void
}

type TabType = 'inputs' | 'blocks'

export const InputDrawer: React.FC<InputDrawerProps> = ({ isOpen, onToggle }) => {
  const [activeTab, setActiveTab] = useState<TabType>('inputs')

  const tabs = [
    { id: 'inputs' as TabType, label: 'Client Inputs', icon: SlidersHorizontal },
    { id: 'blocks' as TabType, label: 'Property Blocks', icon: LayoutGrid },
  ]

  return (
    <>
      {/* Drawer Container */}
      <div
        className={`fixed left-16 top-0 h-screen bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'w-80' : 'w-0'
        }`}
      >
        {/* Content wrapper - only visible when open */}
        <div className={`flex flex-col h-full ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Tab Switcher Header */}
          <div className="flex items-center border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors relative ${
                    isActive
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'inputs' && (
              <ClientInputsPanel />
            )}
            {activeTab === 'blocks' && (
              <PropertyBlocksPanel />
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button - always visible */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-40 w-5 h-10 bg-white border border-gray-200 rounded-r-md flex items-center justify-center hover:bg-gray-50 transition-all duration-300 ease-in-out shadow-sm ${
          isOpen ? 'left-[calc(4rem+20rem)]' : 'left-16'
        }`}
        aria-label={isOpen ? 'Collapse drawer' : 'Expand drawer'}
      >
        {isOpen ? (
          <ChevronLeftIcon size={14} className="text-gray-500" />
        ) : (
          <ChevronRightIcon size={14} className="text-gray-500" />
        )}
      </button>
    </>
  )
}


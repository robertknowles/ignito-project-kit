import React, { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SlidersHorizontal, LayoutGrid } from 'lucide-react'
import { ClientInputsPanel } from './ClientInputsPanel'
import { PropertyBlocksPanel } from './PropertyBlocksPanel'
import { TourStep } from '@/components/TourManager'

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
        id="input-drawer"
        className={`fixed left-16 top-0 h-screen bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'w-72' : 'w-0'
        }`}
      >
        {/* Content wrapper - only visible when open */}
        <div className={`flex flex-col h-full ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Tab Switcher Header */}
          <TourStep
            id="drawer-tabs"
            title="Drawer Tabs"
            content="The drawer has two tabs: Client Inputs for financial details and goals, and Property Blocks for selecting which properties to include in the strategy."
            order={5}
            position="bottom"
          >
          <div id="drawer-tabs-container" className="relative flex items-center border-b border-gray-200 h-[45px]">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 h-full text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
            {/* Active indicator - positioned at bottom of container */}
            <div 
              className="absolute bottom-0 h-0.5 bg-gray-900 transition-all duration-200"
              style={{
                left: activeTab === 'inputs' ? '0%' : '50%',
                width: '50%'
              }}
            />
          </div>
          </TourStep>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-white">
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
      {/* TourStep wrapper needs fixed positioning to match the button's fixed position */}
      <div className={`fixed top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out ${
        isOpen ? 'left-[calc(4rem+18rem)]' : 'left-16'
      }`}>
        <TourStep
          id="drawer-toggle"
          title="Input Drawer Toggle"
          content="Click this arrow to expand or collapse the Input Drawer - your control panel for building investment strategies. The drawer contains all the inputs needed to model a client's portfolio."
          order={4}
          position="right"
        >
          <button
            id="drawer-toggle-btn"
            onClick={onToggle}
            className="w-5 h-10 bg-white border border-gray-200 rounded-r-md flex items-center justify-center hover:bg-gray-50 shadow-sm"
            aria-label={isOpen ? 'Collapse drawer' : 'Expand drawer'}
          >
            {isOpen ? (
              <ChevronLeftIcon size={14} className="text-gray-500" />
            ) : (
              <ChevronRightIcon size={14} className="text-gray-500" />
            )}
          </button>
        </TourStep>
      </div>
    </>
  )
}


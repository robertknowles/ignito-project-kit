import React, { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, Home, User } from 'lucide-react'
import { TimelinePanel } from './TimelinePanel'
import { ClientInputsPanel } from './ClientInputsPanel'
import { ClientSelector } from './ClientSelector'
import { TourStep } from '@/components/TourManager'

type DrawerTab = 'properties' | 'client'

const tabs: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
  { id: 'properties', label: 'Properties', icon: <Home size={13} /> },
  { id: 'client', label: 'Client', icon: <User size={13} /> },
]

interface InputDrawerProps {
  isOpen: boolean
  onToggle: () => void
  defaultFirstPropertyExpanded?: boolean
}

export const InputDrawer: React.FC<InputDrawerProps> = ({ isOpen, onToggle, defaultFirstPropertyExpanded = true }) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('properties')

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
          {/* Header */}
          <TourStep
            id="drawer-header"
            title="Timeline Builder"
            content="This is your timeline builder. Add properties and events to create your investment strategy. All property templates are managed in the Settings page."
            order={5}
            position="bottom"
          >
            <div id="drawer-header" className="flex items-center border-b border-gray-200 h-[52px] px-2">
              <ClientSelector />
            </div>
          </TourStep>

          {/* Tab Bar */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-gray-900 border-b-2 border-gray-900 bg-white'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            {activeTab === 'properties' && (
              <TimelinePanel defaultFirstPropertyExpanded={defaultFirstPropertyExpanded} />
            )}
            {activeTab === 'client' && (
              <ClientInputsPanel />
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
          title="Timeline Drawer"
          content="Click this arrow to expand or collapse the timeline drawer. Use it to add properties and life events to your investment timeline."
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

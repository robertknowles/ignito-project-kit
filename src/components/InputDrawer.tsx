import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { TimelinePanel } from './TimelinePanel'
import { TourStep } from '@/components/TourManager'

interface InputDrawerProps {
  isOpen: boolean
  onToggle: () => void
  defaultFirstPropertyExpanded?: boolean
}

export const InputDrawer: React.FC<InputDrawerProps> = ({ isOpen, onToggle, defaultFirstPropertyExpanded = true }) => {
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
            <div id="drawer-header" className="flex items-center justify-between border-b border-gray-200 h-[45px] px-4">
              <h2 className="text-sm font-medium text-gray-900">Property Timeline</h2>
            </div>
          </TourStep>

          {/* Timeline Panel */}
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <TimelinePanel defaultFirstPropertyExpanded={defaultFirstPropertyExpanded} />
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


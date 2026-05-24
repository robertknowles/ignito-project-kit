import React, { useState } from 'react'
import { WrenchIcon, Settings2, Home } from 'lucide-react'
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar'
import { PlanningDefaultsModal } from '@/components/PlanningDefaultsModal'
import { AddToTimelineModal } from '@/components/AddToTimelineModal'

const Toolkit: React.FC = () => {
  const [showDefaults, setShowDefaults] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  return (
    <div className="flex min-h-screen bg-white">
      <AppSidebar />
      <main className="flex-1 px-8 py-8" style={{ marginLeft: SIDEBAR_WIDTH }}>
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Toolkit</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
          {/* Planning Defaults */}
          <button
            onClick={() => setShowDefaults(true)}
            className="flex flex-col items-start gap-3 p-5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
              <Settings2 size={20} className="text-neutral-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Planning Defaults</p>
              <p className="text-xs text-neutral-500 mt-1">Set default property types, states, loan terms, and strategy for new plans.</p>
            </div>
          </button>

          {/* Property Templates */}
          <button
            onClick={() => setShowTemplates(true)}
            className="flex flex-col items-start gap-3 p-5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
              <Home size={20} className="text-neutral-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Property Templates</p>
              <p className="text-xs text-neutral-500 mt-1">Browse and add property types to your investment timeline.</p>
            </div>
          </button>
        </div>

        <PlanningDefaultsModal isOpen={showDefaults} onClose={() => setShowDefaults(false)} />
        <AddToTimelineModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} />
      </main>
    </div>
  )
}

export default Toolkit

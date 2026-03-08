import React from 'react'
import { useBranding } from '@/contexts/BrandingContext'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { Dashboard } from '@/components/Dashboard'
import { Loader2, FileQuestion, Info } from 'lucide-react'

export const PortalPropertyPlan = () => {
  const { branding } = useBranding()
  const { clientScenarioLoading, noScenarioForClient } = useScenarioSave()

  // Loading state
  if (clientScenarioLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: branding.primaryColor }} />
          <p className="text-sm text-gray-500">Loading your property plan...</p>
        </div>
      </div>
    )
  }

  // No scenario shared yet
  if (noScenarioForClient) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Property Plan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Prepared by your buyers agent
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gray-100">
            <FileQuestion className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No plan available yet
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Your buyers agent will create your personalised property investment plan.
            Once ready, you'll be able to explore different scenarios and see your
            portfolio growth projections here.
          </p>
        </div>
      </div>
    )
  }

  // Scenario loaded - render the dashboard in play mode
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Play mode banner */}
      <div
        className="flex items-center gap-2 px-4 py-2 text-xs"
        style={{ backgroundColor: `${branding.primaryColor}10`, borderBottom: `1px solid ${branding.primaryColor}20` }}
      >
        <Info size={14} style={{ color: branding.primaryColor }} />
        <span className="text-gray-600">
          <span className="font-medium" style={{ color: branding.primaryColor }}>Play mode</span>
          {' '}— feel free to explore and tweak. Your changes are temporary and will reset when you leave.
        </span>
      </div>

      {/* Dashboard */}
      <div className="flex-1 overflow-hidden">
        <Dashboard key="portal-property-plan" />
      </div>
    </div>
  )
}

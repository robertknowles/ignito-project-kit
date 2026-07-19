import React, { useState } from 'react'
import { useBranding } from '@/contexts/BrandingContext'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { useAuth } from '@/contexts/AuthContext'
import { Dashboard } from '@/components/Dashboard'
import { ChatPanel } from '@/components/ChatPanel'
import { Loader2, FileQuestion, Info, X } from 'lucide-react'

// The intro banner is a one-time orientation note. Persist dismissal per user so
// a client only ever needs to read it once (Rob, 2026-07-19).
const introDismissKey = (userId?: string) => `proppath:portal-intro-dismissed:${userId ?? 'anon'}`

export const PortalPropertyPlan = () => {
  const { branding } = useBranding()
  const { clientScenarioLoading, noScenarioForClient } = useScenarioSave()
  const { user } = useAuth()

  const [introDismissed, setIntroDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(introDismissKey(user?.id)) === '1'
    } catch {
      return false
    }
  })

  const dismissIntro = () => {
    setIntroDismissed(true)
    try {
      localStorage.setItem(introDismissKey(user?.id), '1')
    } catch {
      // ignore quota / privacy-mode errors
    }
  }

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

  // Scenario loaded - render the dashboard in view mode
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* One-time intro banner - dismissable, remembered per user */}
      {!introDismissed && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs"
          style={{ backgroundColor: `${branding.primaryColor}10`, borderBottom: `1px solid ${branding.primaryColor}20` }}
        >
          <Info size={14} style={{ color: branding.primaryColor }} className="shrink-0" />
          <span className="text-gray-600">
            <span className="font-medium" style={{ color: branding.primaryColor }}>Welcome to your plan</span>
            {' '}- you can update your income details and current portfolio. Your agent is
            notified of any changes and will refresh your plan.
          </span>
          <button
            onClick={dismissIntro}
            title="Dismiss"
            aria-label="Dismiss"
            className="ml-auto shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Docked AI chat (read-only Q&A explainer) + dashboard, mirroring the BA
          shell in App.tsx. ChatPanel self-sizes on drawerOpen; when closed it
          shows a floating launcher instead. */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        <ChatPanel />
        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <Dashboard key="portal-property-plan" />
        </div>
      </div>
    </div>
  )
}

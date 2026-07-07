import React, { useRef, useState } from 'react'
import {
  FileTextIcon,
  PaletteIcon,
  BarChart3Icon,
  Loader2Icon,
  SlidersHorizontalIcon,
  RotateCcw,
} from 'lucide-react'
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar'
import { useAIUsage } from '@/hooks/useAIUsage'
import { AgentFormsContent } from '@/pages/AgentForms'
import { CompanyManagementContent } from '@/pages/CompanyManagement'
import { AssumptionsGrid } from '@/components/AssumptionsGrid'

type SettingsTab = 'forms' | 'assumptions' | 'white-label' | 'usage'

const settingsTabs: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'forms', label: 'Forms', icon: FileTextIcon, description: 'Create and manage client form templates' },
  { id: 'assumptions', label: 'Assumptions', icon: SlidersHorizontalIcon, description: 'Modelling assumptions used by the engine' },
  { id: 'white-label', label: 'White Label', icon: PaletteIcon, description: 'Company branding and team management' },
  { id: 'usage', label: 'AI Usage', icon: BarChart3Icon, description: 'View your AI usage this month' },
]

/** Format large numbers with commas */
function formatNumber(n: number): string {
  return n.toLocaleString()
}

/** Get month name from YYYY-MM string */
function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(parseInt(year), parseInt(m) - 1)
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

export const SettingsHub = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('forms')
  const { usage, isLoading: usageLoading } = useAIUsage()
  // Reset fn published by AssumptionsGrid so the tab header can own the button
  // (same pattern the old AgentHome header used).
  const resetAssumptionsRef = useRef<(() => void) | null>(null)

  return (
    <div className="main-app flex h-screen w-full bg-[#f9fafb]">
      <AppSidebar />
      <div className="flex-1 flex h-full overflow-hidden" style={{ marginLeft: SIDEBAR_WIDTH }}>
        {/* Settings sidebar */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-gray-200 h-[45px] px-4">
            <h2 className="section-heading">Settings</h2>
          </div>
          <div className="py-1">
            {settingsTabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'text-gray-900 bg-gray-100 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {activeTab === 'forms' && (
              <AgentFormsContent />
            )}

            {activeTab === 'assumptions' && (
              <>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="page-title">Assumptions</h2>
                    <p className="body-secondary mt-0.5">
                      Modelling assumptions the engine uses for the active plan
                    </p>
                  </div>
                  <button
                    onClick={() => resetAssumptionsRef.current?.()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    <RotateCcw size={13} />
                    Reset to defaults
                  </button>
                </div>
                <AssumptionsGrid
                  showHeader={false}
                  onResetExposed={(fn) => { resetAssumptionsRef.current = fn }}
                />
              </>
            )}

            {activeTab === 'white-label' && (
              <CompanyManagementContent />
            )}

            {activeTab === 'usage' && (
              <>
                <div className="mb-6">
                  <h2 className="page-title">AI Usage</h2>
                  <p className="body-secondary mt-0.5">
                    Track your AI usage this month
                  </p>
                </div>

                {usageLoading ? (
                  <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
                    <Loader2Icon size={24} className="text-neutral-400 animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Current month header */}
                    <p className="section-heading">
                      {usage?.month ? formatMonth(usage.month) : 'This Month'}
                    </p>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white border border-neutral-200 rounded-lg p-5">
                        <p className="meta uppercase tracking-wide mb-1">Requests</p>
                        <p className="text-2xl font-semibold text-neutral-900">
                          {formatNumber(usage?.requestCount ?? 0)}
                        </p>
                      </div>
                      <div className="bg-white border border-neutral-200 rounded-lg p-5">
                        <p className="meta uppercase tracking-wide mb-1">Input Tokens</p>
                        <p className="text-2xl font-semibold text-neutral-900">
                          {formatNumber(usage?.inputTokens ?? 0)}
                        </p>
                      </div>
                      <div className="bg-white border border-neutral-200 rounded-lg p-5">
                        <p className="meta uppercase tracking-wide mb-1">Output Tokens</p>
                        <p className="text-2xl font-semibold text-neutral-900">
                          {formatNumber(usage?.outputTokens ?? 0)}
                        </p>
                      </div>
                    </div>

                    {/* Total tokens */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="meta uppercase tracking-wide mb-1">Total Tokens</p>
                          <p className="text-2xl font-semibold text-neutral-900">
                            {formatNumber(usage?.totalTokens ?? 0)}
                          </p>
                        </div>
                        <BarChart3Icon size={32} className="text-neutral-200" />
                      </div>
                    </div>

                    <p className="meta">
                      Usage resets at the start of each calendar month. Each chat message uses approximately 2,000–6,000 tokens depending on plan complexity.
                    </p>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

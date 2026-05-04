import React, { useState } from 'react'
import {
  FileTextIcon,
  PaletteIcon,
  BarChart3Icon,
  Loader2Icon,
} from 'lucide-react'
import { LeftRail } from '../components/LeftRail'
import { useNavigate } from 'react-router-dom'
import { useAIUsage } from '@/hooks/useAIUsage'

type SettingsTab = 'forms' | 'white-label' | 'usage'

const settingsTabs: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'forms', label: 'Forms', icon: FileTextIcon, description: 'Create and manage client form templates' },
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
  const navigate = useNavigate()
  const { usage, isLoading: usageLoading } = useAIUsage()

  return (
    <div className="main-app flex h-screen w-full bg-[#f9fafb]">
      <LeftRail />
      <div className="flex-1 ml-16 flex h-full overflow-hidden">
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
              <>
                <div className="mb-6">
                  <h1 className="page-title">Forms</h1>
                  <p className="body-secondary mt-1">Create, edit and send form templates to your clients</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <FileTextIcon size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="body-secondary">Form management is available at the dedicated Forms page.</p>
                  <button
                    onClick={() => navigate('/forms')}
                    className="mt-3 text-sm font-medium hover:underline"
                    style={{ color: '#4A7BF7' }}
                  >
                    Go to Forms →
                  </button>
                </div>
              </>
            )}

            {activeTab === 'white-label' && (
              <>
                <div className="mb-6">
                  <h1 className="page-title">White Label</h1>
                  <p className="body-secondary mt-1">Company branding, team management and client settings</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <PaletteIcon size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="body-secondary">White label settings are available at the Company page.</p>
                  <button
                    onClick={() => navigate('/company')}
                    className="mt-3 text-sm font-medium hover:underline"
                    style={{ color: '#4A7BF7' }}
                  >
                    Go to Company Settings →
                  </button>
                </div>
              </>
            )}

            {activeTab === 'usage' && (
              <>
                <div className="mb-6">
                  <h1 className="page-title">AI Usage</h1>
                  <p className="body-secondary mt-1">
                    Track your PropPath AI usage this month
                  </p>
                </div>

                {usageLoading ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                    <Loader2Icon size={24} className="text-gray-400 animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Current month header */}
                    <p className="text-sm text-gray-500 font-medium">
                      {usage?.month ? formatMonth(usage.month) : 'This Month'}
                    </p>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Requests</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {formatNumber(usage?.requestCount ?? 0)}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Input Tokens</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {formatNumber(usage?.inputTokens ?? 0)}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Output Tokens</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {formatNumber(usage?.outputTokens ?? 0)}
                        </p>
                      </div>
                    </div>

                    {/* Total tokens */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Tokens</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {formatNumber(usage?.totalTokens ?? 0)}
                          </p>
                        </div>
                        <BarChart3Icon size={32} className="text-gray-200" />
                      </div>
                    </div>

                    <p className="text-xs text-gray-400">
                      Usage resets at the start of each calendar month. Each chat message uses approximately 2,000-6,000 tokens depending on plan complexity.
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

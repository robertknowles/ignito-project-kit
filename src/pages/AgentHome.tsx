/**
 * AgentHome — landing page after login.
 *
 * Streamlined to three sections (per cofounder spec, 2026-05-02):
 *   1. Hero chat input (full-width, with strategy preset rows). Pressing Enter
 *      stashes the prompt in sessionStorage and navigates to /dashboard, where
 *      ChatPanel reads it and fires the message as the first turn of a fresh
 *      thread (existing dashboard loading shimmer + AI flow then runs as usual).
 *   2. Recents — client cards sorted by most-recently-updated.
 *   3. Assumptions — the 11-tile dial grid inlined (replaces the standalone
 *      /assumptions page).
 *
 * Everything else from the previous AgentHome (stats, action-required table,
 * calendar, activity feed, send-form modals) is intentionally removed.
 */

import React, { useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 as Loader2Icon, Send as SendIcon } from 'lucide-react'
import { LeftRail } from '@/components/LeftRail'
import { StrategyPresetSelector } from '@/components/StrategyPresetSelector'
import { AssumptionsGrid } from '@/components/AssumptionsGrid'
import { useClient } from '@/contexts/ClientContext'
import { useBranding } from '@/contexts/BrandingContext'
import { toast } from 'sonner'

const PENDING_PROMPT_KEY = 'proppath:pending-prompt'
const AVATAR_BG = '#535862'
const AVATAR_TEXT = '#FFFFFF'

const getInitials = (name: string) => {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export const AgentHome: React.FC = () => {
  const navigate = useNavigate()
  const { clients, activeClient, setActiveClient, createClient } = useClient()
  const { branding } = useBranding()
  const primaryColor = branding.primaryColor

  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow the textarea up to a reasonable cap.
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    setPrompt(el.value)
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  const launchScenario = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || submitting) return
      setSubmitting(true)
      try {
        // Ensure there's an active client to attach the new scenario to.
        let target = activeClient
        if (!target) {
          if (clients.length > 0) {
            target = clients[0]
            setActiveClient(target)
          } else {
            // First-time use: silently spin up an "Untitled Client" so the
            // BA can rename later. Matches the no-friction Canva/Adobe pattern.
            const created = await createClient({
              name: 'Untitled Client',
              stage: 'onboarding',
              portal_status: 'not_invited',
              roadmap_status: 'not_started',
            })
            if (!created) {
              toast.error('Could not create a client to run this scenario against')
              setSubmitting(false)
              return
            }
            target = created
          }
        }

        sessionStorage.setItem(PENDING_PROMPT_KEY, trimmed)
        navigate('/dashboard')
      } catch {
        toast.error('Something went wrong starting the scenario')
        setSubmitting(false)
      }
    },
    [activeClient, clients, createClient, navigate, setActiveClient, submitting]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        launchScenario(prompt)
      }
    },
    [launchScenario, prompt]
  )

  const handleSendClick = useCallback(() => {
    launchScenario(prompt)
  }, [launchScenario, prompt])

  // Recents — clients sorted by most-recently-updated.
  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => {
        const aT = new Date(a.updated_at || a.last_active_at || a.created_at).getTime()
        const bT = new Date(b.updated_at || b.last_active_at || b.created_at).getTime()
        return bT - aT
      })
      .slice(0, 12)
  }, [clients])

  const handleRecentClick = useCallback(
    (client: typeof clients[number]) => {
      setActiveClient(client)
      navigate('/dashboard')
    },
    [navigate, setActiveClient]
  )

  const isActive = prompt.trim().length > 0

  return (
    <div className="main-app flex h-screen w-full bg-white">
      <LeftRail />
      <div className="flex-1 overflow-auto" style={{ marginLeft: 64 }}>
        <div
          className="mx-auto flex flex-col gap-12"
          style={{ padding: '64px 32px 96px 32px', width: '92%', maxWidth: 1100 }}
        >
          {/* ── Hero ─────────────────────────────────────────────── */}
          <section className="flex flex-col items-center gap-6">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 text-center tracking-tight">
              Build a portfolio plan
            </h1>
            <p className="text-sm text-gray-500 text-center max-w-xl -mt-3">
              Describe a client scenario in plain English. Press Enter to
              generate the roadmap — refine inside the dashboard.
            </p>

            <div className="w-full">
              <div
                className="flex items-end gap-2 px-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm transition-shadow focus-within:shadow-md focus-within:border-gray-300"
              >
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. John, $120k income, $80k deposit. Wants to hit $2M in equity over 15 years…"
                  rows={1}
                  disabled={submitting}
                  className="flex-1 bg-transparent text-[14px] text-[#181D27] placeholder-[#717680] resize-none outline-none leading-relaxed max-h-[200px]"
                />
                <button
                  onClick={handleSendClick}
                  disabled={!isActive || submitting}
                  className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:cursor-not-allowed bg-white"
                  style={{ opacity: !isActive && !submitting ? 0.4 : 1 }}
                  aria-label="Generate plan"
                >
                  {submitting ? (
                    <Loader2Icon size={15} className="animate-spin" style={{ color: primaryColor }} />
                  ) : (
                    <SendIcon size={15} style={{ color: isActive ? primaryColor : '#717680' }} />
                  )}
                </button>
              </div>
            </div>

            <div className="w-full max-w-2xl">
              <StrategyPresetSelector />
            </div>
          </section>

          {/* ── Recents ──────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Recents</h2>
            {recentClients.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-5 py-8 text-center">
                No recent clients yet — type a scenario above to start your first plan.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {recentClients.map((client) => {
                  const initials = getInitials(client.name)
                  const isCurrent = activeClient?.id === client.id
                  return (
                    <button
                      key={client.id}
                      onClick={() => handleRecentClick(client)}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-full aspect-square rounded-lg flex items-center justify-center text-lg font-semibold border border-[#E9EAEB]"
                        style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
                      >
                        {initials}
                      </div>
                      <span className="text-[12px] font-medium text-gray-800 truncate w-full text-center">
                        {client.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Assumptions (inlined, replaces /assumptions page) ── */}
          <section className="flex flex-col gap-4">
            <AssumptionsGrid />
          </section>
        </div>
      </div>
    </div>
  )
}

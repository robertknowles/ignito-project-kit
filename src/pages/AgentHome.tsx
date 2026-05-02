/**
 * AgentHome — landing page after login.
 *
 * Three left-aligned sections within a wide centred container:
 *   1. Hero chat card — textarea on top, strategy preset chips inline along
 *      the bottom-left, send button bottom-right (Adobe-style in-prompt
 *      controls). Press Enter to launch a fresh dashboard scenario.
 *   2. Recents — thumbnail tiles for clients, sorted by most-recently-updated.
 *   3. Assumptions — the 11-tile dial grid inlined (replaces /assumptions page).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2 as Loader2Icon,
  Send as SendIcon,
  RotateCcw,
} from 'lucide-react'
import { LeftRail } from '@/components/LeftRail'
import { StrategyPresetSelector } from '@/components/StrategyPresetSelector'
import { AssumptionsGrid } from '@/components/AssumptionsGrid'
import { useClient } from '@/contexts/ClientContext'
import { useBranding } from '@/contexts/BrandingContext'
import { toast } from 'sonner'

const PENDING_PROMPT_KEY = 'proppath:pending-prompt'
const AVATAR_BG = '#535862'
const AVATAR_TEXT = '#FFFFFF'

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

const formatRelativeShort = (iso?: string) => {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  const diff = Date.now() - ts
  const day = 86_400_000
  if (diff < day) return 'today'
  if (diff < 2 * day) return 'yesterday'
  const days = Math.floor(diff / day)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}

export const AgentHome: React.FC = () => {
  const navigate = useNavigate()
  const { clients, activeClient, setActiveClient, createClient } = useClient()
  const { branding } = useBranding()
  const primaryColor = branding.primaryColor

  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resetAssumptionsRef = useRef<() => void>(() => {})

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    setPrompt(el.value)
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [])

  const launchScenario = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || submitting) return
      setSubmitting(true)
      try {
        let target = activeClient
        if (!target) {
          if (clients.length > 0) {
            target = clients[0]
            setActiveClient(target)
          } else {
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

  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => {
        const aT = new Date(a.updated_at || a.last_active_at || a.created_at).getTime()
        const bT = new Date(b.updated_at || b.last_active_at || b.created_at).getTime()
        return bT - aT
      })
      .slice(0, 16)
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
          className="mx-auto"
          style={{ padding: '40px 48px 96px 48px', maxWidth: 1320 }}
        >
          {/* ── Hero ─────────────────────────────────────────────── */}
          <section className="flex flex-col gap-3 mb-10">
            <h1 className="text-[22px] font-semibold text-gray-900 leading-tight">
              Build a portfolio plan
            </h1>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm transition-shadow focus-within:shadow-md focus-within:border-gray-300">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Describe a client scenario in plain English. e.g. John, $120k income, $80k deposit. Wants to hit $2M in equity over 15 years…"
                rows={2}
                disabled={submitting}
                className="w-full bg-transparent text-[14px] text-[#181D27] placeholder-[#9CA3AF] resize-none outline-none leading-relaxed px-4 pt-4 pb-1 max-h-[220px]"
              />
              <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
                <StrategyPresetSelector variant="inline-chips" />
                <button
                  onClick={handleSendClick}
                  disabled={!isActive || submitting}
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:cursor-not-allowed bg-white border border-gray-200 hover:bg-gray-50"
                  style={{ opacity: !isActive && !submitting ? 0.4 : 1 }}
                  aria-label="Generate plan"
                >
                  {submitting ? (
                    <Loader2Icon size={15} className="animate-spin" style={{ color: primaryColor }} />
                  ) : (
                    <SendIcon size={15} style={{ color: isActive ? primaryColor : '#9CA3AF' }} />
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* ── Recents ──────────────────────────────────────────── */}
          <section className="flex flex-col gap-4 mb-12">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Recents</h2>
              {recentClients.length > 0 && (
                <button
                  onClick={() => navigate('/clients')}
                  className="text-[12px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  View all
                </button>
              )}
            </div>
            {recentClients.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-5 py-8 text-center">
                No recent clients yet — type a scenario above to start your first plan.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {recentClients.map((client) => {
                  const initials = getInitials(client.name)
                  const isCurrent = activeClient?.id === client.id
                  const updated = formatRelativeShort(
                    client.updated_at || client.last_active_at || client.created_at
                  )
                  return (
                    <button
                      key={client.id}
                      onClick={() => handleRecentClick(client)}
                      className={`group flex flex-col items-stretch gap-1.5 p-1.5 rounded-xl border transition-all text-left ${
                        isCurrent
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="rounded-lg flex items-center justify-center text-[14px] font-semibold border border-[#E9EAEB]"
                        style={{
                          backgroundColor: AVATAR_BG,
                          color: AVATAR_TEXT,
                          aspectRatio: '4 / 3',
                        }}
                      >
                        {initials}
                      </div>
                      <div className="px-1 pb-0.5">
                        <div className="text-[12px] font-medium text-gray-900 truncate leading-tight">
                          {client.name}
                        </div>
                        <div className="text-[10.5px] text-gray-500 mt-0.5 truncate">
                          Edited {updated}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Assumptions (inlined, replaces /assumptions page) ── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Assumptions</h2>
              <button
                onClick={() => resetAssumptionsRef.current?.()}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <RotateCcw size={12} />
                Reset to defaults
              </button>
            </div>
            <AssumptionsGrid
              showHeader={false}
              onResetExposed={(fn) => {
                resetAssumptionsRef.current = fn
              }}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

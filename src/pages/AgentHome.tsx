/**
 * AgentHome — landing page after login.
 *
 * Three left-aligned sections within a wide centred container:
 *   1. Hero chat card — textarea on top, strategy preset chips inline along
 *      the bottom-left, send button bottom-right (Adobe-style in-prompt
 *      controls). Press Enter to launch a fresh dashboard scenario.
 *   2. Recents — ChartCard wrapping client tiles with mini equity sparklines
 *      pulled from each client's most recent saved scenario.
 *   3. Assumptions — ChartCard wrapping the 11-tile dial grid (replaces the
 *      standalone /assumptions page).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2 as Loader2Icon,
  Send as SendIcon,
  RotateCcw,
} from 'lucide-react'
import { LeftRail } from '@/components/LeftRail'
import { StrategyPresetSelector } from '@/components/StrategyPresetSelector'
import { AssumptionsGrid } from '@/components/AssumptionsGrid'
import { ChartCard } from '@/components/ui/ChartCard'
import { useClient } from '@/contexts/ClientContext'
import { useBranding } from '@/contexts/BrandingContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const PENDING_PROMPT_KEY = 'proppath:pending-prompt'
// Recents fallback (no scenario data yet): white tile with dark-grey
// initials, matches the rest of the app's neutral palette.
const AVATAR_BG = '#FFFFFF'
const AVATAR_TEXT = '#414651'

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

interface ScenarioPreview {
  finalEquity: number | null
  propertyCount: number
  timelineYears: number | null
  strategyPreset: string | null
  updatedAt: string | null
}

const STRATEGY_LABELS: Record<string, string> = {
  'eg-low': 'Equity Growth',
  'eg-high': 'Equity Growth',
  'cf-low': 'Cash Flow',
  'cf-high': 'Cash Flow',
  'commercial-transition': 'Commercial Transition',
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

  // Per-client preview data (final equity, equity series, property count,
  // last updated). Pulled in a single batch query so 16 tiles don't fan out
  // 16 separate selects.
  const [previewByClient, setPreviewByClient] = useState<Record<number, ScenarioPreview>>({})

  useEffect(() => {
    if (clients.length === 0) {
      setPreviewByClient({})
      return
    }
    let cancelled = false

    const run = async () => {
      const ids = clients.map((c) => c.id)
      const { data, error } = await supabase
        .from('scenarios')
        .select('client_id, data, updated_at')
        .in('client_id', ids)
        .order('updated_at', { ascending: false })

      if (error || cancelled || !data) return

      const map: Record<number, ScenarioPreview> = {}
      for (const row of data) {
        const cid = (row as any).client_id as number
        if (map[cid]) continue // first row per client wins (most-recently-updated)
        const d = (row as any).data
        const growth = d?.chartData?.portfolioGrowthData
        const equityPoints: number[] = Array.isArray(growth)
          ? growth.map((p: any) => Number(p?.equity) || 0).filter((n: number) => Number.isFinite(n))
          : []
        const finalEquity = equityPoints.length > 0 ? equityPoints[equityPoints.length - 1] : null
        const selections = (d?.propertySelections || {}) as Record<string, number>
        const propertyCount = Object.values(selections).reduce(
          (sum, n) => sum + (Math.max(0, Math.round(Number(n) || 0))),
          0
        )
        const profile = d?.investmentProfile || {}
        const timelineYears = Number(profile.timelineYears) || null
        const strategyPreset = typeof profile.strategyPreset === 'string' ? profile.strategyPreset : null
        map[cid] = {
          finalEquity,
          propertyCount,
          timelineYears,
          strategyPreset,
          updatedAt: (row as any).updated_at ?? null,
        }
      }
      if (!cancelled) setPreviewByClient(map)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [clients])

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
        const aT = new Date(
          previewByClient[a.id]?.updatedAt || a.updated_at || a.last_active_at || a.created_at
        ).getTime()
        const bT = new Date(
          previewByClient[b.id]?.updatedAt || b.updated_at || b.last_active_at || b.created_at
        ).getTime()
        return bT - aT
      })
      .slice(0, 16)
  }, [clients, previewByClient])

  const handleRecentClick = useCallback(
    (client: typeof clients[number]) => {
      setActiveClient(client)
      navigate('/dashboard')
    },
    [navigate, setActiveClient]
  )

  const isActive = prompt.trim().length > 0

  const formatEquity = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    if (n >= 1_000) return `$${Math.round(n / 1000)}k`
    return `$${Math.round(n)}`
  }

  return (
    <div className="main-app flex h-screen w-full bg-white">
      <LeftRail />
      <div className="relative flex-1 overflow-auto" style={{ marginLeft: 64 }}>
        {/* ── Atmospheric aurora wash at the top of the page ─────
            Two overlapping radial gradients — one warm, one cool —
            anchored above the viewport so they peek down from the top
            and fade out by ~360px. Subtle enough not to distract from
            content, distinct enough to give the page atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0"
          style={{
            height: 620,
            background:
              'radial-gradient(1100px 480px at 18% -100px, rgba(100, 116, 139, 0.50), transparent 68%),' +
              'radial-gradient(1100px 480px at 82% -100px, rgba(148, 163, 184, 0.50), transparent 68%),' +
              'linear-gradient(180deg, rgba(241, 244, 248, 0.95) 0%, rgba(255, 255, 255, 0) 92%)',
          }}
        />

        <div
          className="relative z-10 mx-auto"
          style={{ padding: '40px 48px 96px 48px', maxWidth: 1320 }}
        >
          {/* ── Hero ─────────────────────────────────────────────── */}
          <section className="flex flex-col gap-4 mb-10">
            <h1 className="text-[26px] font-semibold text-gray-900 leading-tight tracking-tight">
              Build a property plan
            </h1>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm transition-shadow focus-within:shadow-md focus-within:border-gray-300">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={'e.g. "$1m borrowing capacity. $120k annual income. $80k deposit. Want to achieve $2m in equity. No existing properties."'}
                rows={2}
                disabled={submitting}
                className="w-full bg-transparent text-[14px] text-[#181D27] placeholder-[#9CA3AF] resize-none outline-none leading-relaxed px-4 pt-4 pb-1 max-h-[220px]"
              />
              <div className="flex items-end justify-between gap-3 px-3 pb-3 pt-1">
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
          <section className="mb-8">
            <ChartCard
              title="Recents"
              action={
                recentClients.length > 0 ? (
                  <button
                    onClick={() => navigate('/clients')}
                    className="text-[12px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    View all
                  </button>
                ) : undefined
              }
            >
              {recentClients.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-5 py-8 text-center">
                  No recent clients yet — type a scenario above to start your first plan.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {recentClients.map((client) => {
                    const initials = getInitials(client.name)
                    const isCurrent = activeClient?.id === client.id
                    const updated = formatRelativeShort(
                      previewByClient[client.id]?.updatedAt ||
                        client.updated_at ||
                        client.last_active_at ||
                        client.created_at
                    )
                    const preview = previewByClient[client.id]
                    const hasScenario =
                      !!preview &&
                      ((preview.finalEquity !== null && preview.finalEquity > 0) || preview.propertyCount > 0)

                    // Build the meta line below the headline equity figure.
                    const metaParts: string[] = []
                    if (preview?.propertyCount && preview.propertyCount > 0) {
                      metaParts.push(
                        `${preview.propertyCount} ${preview.propertyCount === 1 ? 'property' : 'properties'}`
                      )
                    }
                    if (preview?.timelineYears && preview.timelineYears > 0) {
                      metaParts.push(`${preview.timelineYears} yrs`)
                    }
                    const metaLine = metaParts.join(' · ')
                    const strategyLabel =
                      preview?.strategyPreset && STRATEGY_LABELS[preview.strategyPreset]
                        ? STRATEGY_LABELS[preview.strategyPreset]
                        : null

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
                          className="relative rounded-lg border border-[#E9EAEB] overflow-hidden bg-white"
                          style={{ aspectRatio: '4 / 3' }}
                        >
                          {hasScenario ? (
                            <div className="h-full w-full flex flex-col justify-between p-2.5">
                              <div>
                                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Total equity
                                </div>
                                <div className="text-[18px] font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">
                                  {preview!.finalEquity !== null && preview!.finalEquity > 0
                                    ? formatEquity(preview!.finalEquity)
                                    : '—'}
                                </div>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                {metaLine && (
                                  <div className="text-[10.5px] text-gray-500 truncate">{metaLine}</div>
                                )}
                                {strategyLabel && (
                                  <div className="text-[10.5px] font-medium text-gray-600 truncate">
                                    {strategyLabel}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-[14px] font-semibold"
                              style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
                            >
                              {initials}
                            </div>
                          )}
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
            </ChartCard>
          </section>

          {/* ── Assumptions (inlined, replaces /assumptions page) ── */}
          <section>
            <ChartCard
              title="Assumptions"
              action={
                <button
                  onClick={() => resetAssumptionsRef.current?.()}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset to defaults
                </button>
              }
            >
              <AssumptionsGrid
                showHeader={false}
                onResetExposed={(fn) => {
                  resetAssumptionsRef.current = fn
                }}
              />
            </ChartCard>
          </section>
        </div>
      </div>
    </div>
  )
}

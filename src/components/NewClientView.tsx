/**
 * NewClientView — the "no client selected" state inside the Dashboard.
 *
 * Extracted from AgentHome. Renders the hero chat card (textarea + strategy
 * preset chips + file attach) and a Recents grid of recent client tiles.
 * No sidebar or layout wrapper — App.tsx provides those.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2 as Loader2Icon,
  Send as SendIcon,
  Paperclip as PaperclipIcon,
  RotateCcw,
  MoreHorizontal as MoreHorizontalIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
  X as XIcon,
  FileText as FileTextIcon,
  Sparkles as SparklesIcon,
  TrendingUp as TrendingUpIcon,
  DollarSign as DollarSignIcon,
  Building2 as Building2Icon,
} from 'lucide-react'
import { extractTextFromDocument, isSupportedFile, getSupportedExtensions } from '@/utils/documentExtractor'
import { StrategyPresetSelector } from '@/components/StrategyPresetSelector'
import { AssumptionsGrid } from '@/components/AssumptionsGrid'
import { StrategyProfileModal } from '@/components/StrategyProfileModal'
import { ChartCard } from '@/components/ui/ChartCard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useClient, type Client } from '@/contexts/ClientContext'
import { useBranding } from '@/contexts/BrandingContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const PENDING_PROMPT_KEY = 'proppath:pending-prompt'

const formatRelativeShort = (iso?: string) => {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  const diff = Date.now() - ts
  const day = 86_400_000
  if (diff < day) return 'Today'
  if (diff < 2 * day) return 'Yesterday'
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

interface StrategyMeta {
  label: string
  Icon: React.ComponentType<{ size?: number | string; className?: string }>
  textClass: string
}

const STRATEGY_META: Record<string, StrategyMeta> = {
  'eg-low': { label: 'Equity Growth', Icon: TrendingUpIcon, textClass: 'text-neutral-600' },
  'eg-high': { label: 'Equity Growth', Icon: TrendingUpIcon, textClass: 'text-neutral-600' },
  'cf-low': { label: 'Cash Flow', Icon: DollarSignIcon, textClass: 'text-neutral-600' },
  'cf-high': { label: 'Cash Flow', Icon: DollarSignIcon, textClass: 'text-neutral-600' },
  'commercial-transition': { label: 'Commercial Transition', Icon: Building2Icon, textClass: 'text-neutral-600' },
}

export const NewClientView: React.FC = () => {
  const navigate = useNavigate()
  const { clients, activeClient, setActiveClient, createClient, deleteClient } = useClient()
  const [pendingDeleteClient, setPendingDeleteClient] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { branding } = useBranding()
  const { user } = useAuth()
  const primaryColor = branding.primaryColor

  // First name for the heading. Falls back to an empty string when no name is
  // set so the heading still reads naturally.
  const firstName = useMemo(() => {
    const fullName = (user?.user_metadata?.name as string | undefined)?.trim()
    return fullName ? fullName.split(/\s+/)[0] : ''
  }, [user])

  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  const [strategyProfileOpen, setStrategyProfileOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resetAssumptionsRef = useRef<() => void>(() => {})

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
        if (map[cid]) continue
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

  const handleFileSelect = useCallback((file: File) => {
    if (!isSupportedFile(file)) {
      toast.error(`Supported formats: ${getSupportedExtensions()}`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10 MB')
      return
    }
    setSelectedFile(file)
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
      e.target.value = ''
    },
    [handleFileSelect]
  )

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    setPrompt(el.value)
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [])

  const launchScenario = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed && !selectedFile) return
      if (submitting) return
      setSubmitting(true)
      try {
        let finalPrompt = trimmed || 'Please extract the relevant data and build a plan.'

        if (selectedFile) {
          try {
            const docText = await extractTextFromDocument(selectedFile)
            finalPrompt = `[UPLOADED DOCUMENT START]\nFilename: ${selectedFile.name}\nSize: ${(selectedFile.size / 1024).toFixed(0)} KB\n\n${docText}\n[UPLOADED DOCUMENT END]\n\n${finalPrompt}`
          } catch (err: any) {
            const msg = err?.message
            if (msg === 'SCAN_PDF') {
              toast.error('This file appears to be a scanned image — text could not be extracted.')
            } else if (msg === 'UNSUPPORTED_FORMAT') {
              toast.error(`Supported formats: ${getSupportedExtensions()}`)
            } else {
              toast.error('Could not read the file. Please try a different one.')
            }
            setSubmitting(false)
            return
          }
        }

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

        setActiveClient(created)
        setSelectedFile(null)

        sessionStorage.setItem(PENDING_PROMPT_KEY, finalPrompt)
      } catch {
        toast.error('Something went wrong starting the scenario')
        setSubmitting(false)
      }
    },
    [createClient, setActiveClient, submitting, selectedFile]
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
      .slice(0, 5)
  }, [clients, previewByClient])

  const handleRecentClick = useCallback(
    (client: typeof clients[number]) => {
      setActiveClient(client)
    },
    [setActiveClient]
  )

  const isActive = prompt.trim().length > 0 || !!selectedFile

  const formatEquity = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    if (n >= 1_000) return `$${Math.round(n / 1000)}k`
    return `$${Math.round(n)}`
  }

  return (
    <>
      <div className="relative flex-1 overflow-auto flex flex-col">
        {/* Aurora wash */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* Purple glow concentrated around the hero — soft, irregular, drifting gently */}
          <div
            className="aurora-blob aurora-a absolute"
            style={{
              width: 1500, height: 620, left: '50%', top: '44%', marginLeft: -750, marginTop: -310,
              background: 'radial-gradient(ellipse 60% 70% at 48% 46%, rgba(167, 139, 250, 0.22), transparent 70%)',
              filter: 'blur(56px)',
            }}
          />
          <div
            className="aurora-blob aurora-b absolute"
            style={{
              width: 900, height: 520, left: '40%', top: '38%', marginLeft: -450, marginTop: -260,
              background: 'radial-gradient(ellipse 70% 60% at 55% 50%, rgba(192, 132, 252, 0.16), transparent 72%)',
              filter: 'blur(50px)',
            }}
          />
          <div
            className="aurora-blob aurora-c absolute"
            style={{
              width: 820, height: 480, left: '62%', top: '54%', marginLeft: -410, marginTop: -240,
              background: 'radial-gradient(ellipse 65% 62% at 45% 48%, rgba(196, 181, 253, 0.14), transparent 74%)',
              filter: 'blur(52px)',
            }}
          />
          {/* White vignette — fades the hue to clean white at every edge */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 85% 62% at 50% 44%, rgba(255,255,255,0) 34%, rgba(255,255,255,0.92) 88%)' }}
          />
        </div>

        <div
          className="relative z-10 mx-auto my-auto w-full"
          style={{ padding: '48px 48px', maxWidth: 1320 }}
        >
          {/* Hero */}
          <section className="flex flex-col gap-8 mb-10">
            <h1 className="text-[26px] font-semibold text-neutral-900 leading-tight tracking-tight text-center">
              {firstName ? `Hi ${firstName}, let's build a property plan` : "Let's build a property plan"}
            </h1>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm transition-shadow focus-within:shadow-md focus-within:border-gray-300 relative">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <button
                  onClick={() => setStrategyProfileOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors border ${
                    strategyProfileOpen
                      ? 'text-[#414651] bg-[#ECECED] border-[#D5D7DA]'
                      : 'text-[#535862] bg-[#F5F5F6] hover:bg-[#ECECED] border-[#E9EAEB]'
                  }`}
                >
                  <SparklesIcon size={13} />
                  Strategy Profile
                </button>
                <button
                  onClick={() => setAssumptionsOpen(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors border ${
                    assumptionsOpen
                      ? 'text-[#414651] bg-[#ECECED] border-[#D5D7DA]'
                      : 'text-[#535862] bg-[#F5F5F6] hover:bg-[#ECECED] border-[#E9EAEB]'
                  }`}
                >
                  <SlidersHorizontalIcon size={13} />
                  Assumptions
                </button>
              </div>
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
              {selectedFile && (
                <div className="flex items-center gap-2 px-4 pb-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F5F5F6] rounded-lg border border-[#E9EAEB]">
                    <FileTextIcon size={13} className="text-[#535862]" />
                    <span className="text-[11px] text-[#414651] font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-[10px] text-[#717680]">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="ml-0.5 text-[#717680] hover:text-[#414651] transition-colors"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-end justify-between gap-3 px-3 pb-3 pt-1">
                <StrategyPresetSelector variant="inline-chips" />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white border border-gray-200 hover:bg-gray-50"
                    aria-label="Attach file"
                  >
                    <PaperclipIcon size={15} className="text-[#9CA3AF]" />
                  </button>
                  <input ref={fileInputRef} type="file" accept=".pdf,.txt,.csv,.docx,.xlsx" onChange={handleFileInputChange} className="hidden" />
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
              {assumptionsOpen && (
                <div className="border-t border-gray-100 px-4 pt-3 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-medium text-[#414651]">Assumptions</span>
                    <button
                      onClick={() => resetAssumptionsRef.current?.()}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#717680] hover:text-[#414651] transition-colors"
                    >
                      <RotateCcw size={11} />
                      Reset to defaults
                    </button>
                  </div>
                  <AssumptionsGrid
                    showHeader={false}
                    onResetExposed={(fn) => { resetAssumptionsRef.current = fn }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Recents */}
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {recentClients.map((client) => {
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

                    // Build the meta line shown on the right of the footer row.
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
                    const strategyMeta =
                      preview?.strategyPreset && STRATEGY_META[preview.strategyPreset]
                        ? STRATEGY_META[preview.strategyPreset]
                        : null

                    return (
                      <div
                        key={client.id}
                        onClick={() => handleRecentClick(client)}
                        className={`group relative flex flex-col rounded-xl border bg-white p-3.5 transition-all text-left cursor-pointer hover:shadow-sm ${
                          isCurrent
                            ? 'border-neutral-900'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {/* Header: client name + relative time (time fades out on
                            hover to make room for the actions menu in the same spot) */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[13px] font-semibold text-neutral-900 truncate leading-tight">
                            {client.name}
                          </div>
                          <div className="text-[11px] text-neutral-400 whitespace-nowrap transition-opacity group-hover:opacity-0">
                            {updated}
                          </div>
                        </div>

                        {/* Three-dot menu — occupies the time slot on hover */}
                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-6 h-6 inline-flex items-center justify-center rounded-md bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 shadow-sm"
                                aria-label={`Actions for ${client.name}`}
                              >
                                <MoreHorizontalIcon size={14} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  setPendingDeleteClient(client)
                                }}
                                className="text-red-600 focus:text-red-700 focus:bg-red-50"
                              >
                                Delete client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Headline figure */}
                        {hasScenario ? (
                          <>
                            <div className="text-[24px] font-semibold text-neutral-900 tabular-nums leading-none mt-2.5">
                              {preview!.finalEquity !== null && preview!.finalEquity > 0
                                ? formatEquity(preview!.finalEquity)
                                : '—'}
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-1">Total equity</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[24px] font-semibold text-neutral-300 leading-none mt-2.5">
                              Draft
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-1">Not yet modelled</div>
                          </>
                        )}

                        {/* Footer: strategy chip (left) + property/timeline meta (right) */}
                        <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-1.5">
                          {strategyMeta ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-[11px] font-medium whitespace-nowrap ${strategyMeta.textClass}`}
                            >
                              <strategyMeta.Icon size={12} />
                              {strategyMeta.label}
                            </span>
                          ) : (
                            <span />
                          )}
                          {metaLine && (
                            <div className="text-[11px] text-neutral-500 whitespace-nowrap truncate">
                              {metaLine}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ChartCard>
          </section>
        </div>
      </div>

      {/* Delete client confirmation */}
      <Dialog
        open={!!pendingDeleteClient}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeleteClient(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete client</DialogTitle>
            <DialogDescription>
              {pendingDeleteClient
                ? `Are you sure you want to delete ${pendingDeleteClient.name}? This action cannot be undone and will permanently remove the client along with all associated scenarios, properties and projections.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPendingDeleteClient(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!pendingDeleteClient) return
                setDeleting(true)
                const ok = await deleteClient(pendingDeleteClient.id)
                setDeleting(false)
                if (ok) {
                  toast.success(`${pendingDeleteClient.name} deleted`)
                  setPendingDeleteClient(null)
                } else {
                  toast.error('Failed to delete client')
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StrategyProfileModal isOpen={strategyProfileOpen} onClose={() => setStrategyProfileOpen(false)} />
    </>
  )
}

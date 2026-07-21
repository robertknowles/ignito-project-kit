/**
 * NewClientView - the "no client selected" state inside the Dashboard.
 *
 * Extracted from AgentHome. Renders the hero chat card (textarea + strategy
 * preset chips + file attach) and a Recents grid of recent client tiles.
 * No sidebar or layout wrapper - App.tsx provides those.
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
  TrendingUp as TrendingUpIcon,
  DollarSign as DollarSignIcon,
  Building2 as Building2Icon,
  Search as SearchIcon,
  Upload as UploadIcon,
  ClipboardList as ClipboardListIcon,
} from 'lucide-react'
import { extractTextFromDocument, isSupportedFile, getSupportedExtensions } from '@/utils/documentExtractor'
import { CompanyStrategySelector } from '@/components/CompanyStrategySelector'
import { AssumptionsGrid } from '@/components/AssumptionsGrid'
import { StrategyProfileModal } from '@/components/StrategyProfileModal'
import { useStrategyProfiles } from '@/hooks/useStrategyProfiles'
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
import type { Json } from '@/integrations/supabase/types'
import type { ExistingProperty } from '@/types/existingProperty'
import {
  mapSubmittedToExistingProperties,
  type SubmittedPortfolioRow,
} from '@/utils/submittedPortfolioMapper'
import { toast } from 'sonner'

const PENDING_PROMPT_KEY = 'proppath:pending-prompt'
// Carries the chosen company strategy's text to ChatPanel, which injects it
// into the AI prompt for the freshly-launched client.
const PENDING_STRATEGY_KEY = 'proppath:pending-strategy-text'
// A durable copy of the prompt that produced the current plan. Unlike
// PENDING_PROMPT_KEY (consumed by ChatPanel during generation), this survives
// so the confirmation brief's Back button can restore the original inputs.
const BRIEF_SOURCE_PROMPT_KEY = 'proppath:brief-source-prompt'
// Set by the confirmation brief's Back button; consumed here on mount to
// repopulate the chat box with the inputs the agent originally entered.
const RESTORE_PROMPT_KEY = 'proppath:restore-prompt'

// The eight fields a client fills out on their onboarding / details form, in
// display order. Mirrors ClientInputsModal so the pasted text reads the same
// way the agent sees it in the client-inputs viewer.
type FactFindFormat = 'currency' | 'years'
const FACT_FIND_FIELDS: { key: string; label: string; format: FactFindFormat }[] = [
  { key: 'depositPool', label: 'Available Deposit', format: 'currency' },
  { key: 'borrowingCapacity', label: 'Borrowing Capacity', format: 'currency' },
  { key: 'annualSavings', label: 'Annual Savings', format: 'currency' },
  { key: 'portfolioValue', label: 'Current Property Value', format: 'currency' },
  { key: 'currentDebt', label: 'Current Investment Debt', format: 'currency' },
  { key: 'timelineYears', label: 'Investment Horizon', format: 'years' },
  { key: 'equityGoal', label: 'Equity Goal', format: 'currency' },
  { key: 'cashflowGoal', label: 'Annual Cashflow Goal', format: 'currency' },
]

const formatFactFindValue = (value: unknown, format: FactFindFormat): string => {
  if (value === null || value === undefined || value === '') return ''
  if (value === 'N/A') return 'N/A'
  if (format === 'currency') return `$${Number(value).toLocaleString('en-AU')}`
  if (format === 'years') return `${value} year${Number(value) === 1 ? '' : 's'}`
  return String(value)
}

// Per-property breakdown line, e.g.
// "  - Property 1: $450,000 value, $300,000 debt, $520/wk (6.0% yield), Trust"
const buildPropertyLines = (inputs: Record<string, unknown>): string[] => {
  const raw = inputs.existingProperties
  if (!Array.isArray(raw) || raw.length === 0) return []
  const money = (n: number) => `$${Math.round(Number(n) || 0).toLocaleString('en-AU')}`
  const lines = [`Current portfolio (${raw.length} propert${raw.length === 1 ? 'y' : 'ies'}):`]
  raw.forEach((p: any, i: number) => {
    const value = Number(p?.value) || 0
    const weeklyRent = Number(p?.weeklyRent) || 0
    const grossYield = value > 0 ? ((weeklyRent * 52) / value) * 100 : 0
    const rent = weeklyRent > 0
      ? `${money(weeklyRent)}/wk${value > 0 ? ` (${grossYield.toFixed(1)}% yield)` : ''}`
      : 'no rent given'
    lines.push(`  - Property ${i + 1}: ${money(value)} value, ${money(Number(p?.debt) || 0)} debt, ${rent}, ${p?.entity || 'Personal'}`)
  })
  return lines
}

// Turn a client's submitted answers into a readable block the agent can drop
// into the chat and edit before running the plan.
const buildFactFindText = (name: string, inputs: Record<string, unknown>): string => {
  const lines: string[] = []
  for (const f of FACT_FIND_FIELDS) {
    const v = formatFactFindValue(inputs[f.key], f.format)
    if (v) lines.push(`${f.label}: ${v}`)
  }
  lines.push(...buildPropertyLines(inputs))
  const who = name?.trim() ? `${name.trim()}'s submitted details` : 'Client submitted details'
  return `${who}:\n${lines.join('\n')}`
}

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
  createdAt: string | null
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
  'eg-to-cf': { label: 'Growth to Cash Flow', Icon: TrendingUpIcon, textClass: 'text-neutral-600' },
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

  // "Add client details" pill → popup with two paths: upload a document, or
  // pull in a client's submitted form.
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [loadingInputs, setLoadingInputs] = useState(false)
  const [submittedInputsByClient, setSubmittedInputsByClient] = useState<Record<number, Record<string, unknown>>>({})

  // Company strategies - the BA picks one (pills); its text rides along to the
  // launched client so the AI can infer the engine preset from it.
  const { profiles: strategyProfiles, reload: reloadStrategies } = useStrategyProfiles()
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null)
  useEffect(() => {
    setSelectedStrategyId((prev) => {
      if (prev && strategyProfiles.some((p) => p.id === prev)) return prev
      return strategyProfiles[0]?.id ?? null
    })
  }, [strategyProfiles])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Structured existing-portfolio rows picked via "Add client details". The
  // same rows are rendered as prose in the chat box (buildPropertyLines);
  // this ref keeps the REAL store shape so launchScenario can seed them into
  // the new client's scenario row — without this the Portfolio tab starts
  // empty and the AI has to re-extract everything from the prose. Order must
  // stay identical to the prose lines (confirmation-brief merge matches
  // rows by index when addresses are empty).
  const pendingPortfolioRowsRef = useRef<ExistingProperty[]>([])
  const resetAssumptionsRef = useRef<() => void>(() => {})
  const auroraMouseRef = useRef<HTMLDivElement>(null)

  // Aurora glow slowly drifts toward the mouse position (eased, not 1:1 tracking).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    let rafId: number

    const handleMouseMove = (e: MouseEvent) => {
      target.x = ((e.clientX / window.innerWidth) - 0.5) * 260
      target.y = ((e.clientY / window.innerHeight) - 0.5) * 260
    }

    const animate = () => {
      current.x += (target.x - current.x) * 0.045
      current.y += (target.y - current.y) * 0.045
      if (auroraMouseRef.current) {
        auroraMouseRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`
      }
      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMouseMove)
    rafId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

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
        .select('client_id, data, updated_at, created_at')
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
          createdAt: (row as any).created_at ?? null,
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

  // When the agent clicks Back on the confirmation brief we re-mount here with
  // no active client. Restore the original inputs into the chat box so they can
  // tweak and re-run, rather than facing an empty box. A fresh "New Scenario"
  // never sets this key, so it stays empty in that case.
  useEffect(() => {
    const restore = sessionStorage.getItem(RESTORE_PROMPT_KEY)
    if (restore) {
      sessionStorage.removeItem(RESTORE_PROMPT_KEY)
      setPrompt(restore)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (el) {
          el.style.height = 'auto'
          el.style.height = `${Math.min(el.scrollHeight, 220)}px`
        }
      })
    }
  }, [])

  // When the details modal opens, load the verbatim form snapshots for every
  // client so we can list the ones who have actually submitted.
  useEffect(() => {
    if (!detailsModalOpen) return
    const ids = clients.map((c) => c.id)
    if (ids.length === 0) {
      setSubmittedInputsByClient({})
      return
    }
    let cancelled = false
    const run = async () => {
      setLoadingInputs(true)
      const { data, error } = await supabase
        .from('scenarios')
        .select('client_id, data, updated_at')
        .in('client_id', ids)
        .order('updated_at', { ascending: false })
      if (cancelled) return
      const map: Record<number, Record<string, unknown>> = {}
      if (!error && data) {
        for (const row of data) {
          const cid = (row as any).client_id as number
          if (map[cid]) continue
          const sd = (row as any).data || {}
          // Only surface clients who actually submitted their form. Newer
          // submissions store a verbatim snapshot; older ones (submitted before
          // the snapshot existed) fall back to investmentProfile, matching the
          // "Form received" status and the ClientInputsModal viewer.
          const snap = sd.clientSubmittedInputs || (sd.onboardingCompleted ? sd.investmentProfile : null)
          if (snap && typeof snap === 'object') map[cid] = snap
        }
      }
      if (!cancelled) {
        setSubmittedInputsByClient(map)
        setLoadingInputs(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [detailsModalOpen, clients])

  // Drop text into the chat box (appending if there's already content) and
  // re-fit the textarea height. Never runs the simulation.
  const pasteIntoPrompt = useCallback((text: string) => {
    setPrompt((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text))
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) {
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 220)}px`
        el.focus()
      }
    })
  }, [])

  const handlePickClientForm = useCallback(
    (client: Client) => {
      const inputs = submittedInputsByClient[client.id]
      if (!inputs) return
      pasteIntoPrompt(buildFactFindText(client.name, inputs))
      // Keep the structured rows alongside the prose (appended in the same
      // order as the pasted property lines) so launchScenario can seed the
      // real Existing Portfolio store instead of relying on AI re-extraction.
      const raw = inputs.existingProperties
      if (Array.isArray(raw) && raw.length > 0) {
        pendingPortfolioRowsRef.current = [
          ...pendingPortfolioRowsRef.current,
          ...mapSubmittedToExistingProperties(raw as SubmittedPortfolioRow[]),
        ]
      }
      setDetailsModalOpen(false)
      setClientSearch('')
      toast.success(`Added ${client.name || 'client'}'s details to the chat`)
    },
    [submittedInputsByClient, pasteIntoPrompt]
  )

  const handleUploadOption = useCallback(() => {
    setDetailsModalOpen(false)
    // Let the dialog close before opening the native file picker.
    setTimeout(() => fileInputRef.current?.click(), 0)
  }, [])

  // Empty state → send the agent to Client Management, where they can email a
  // client their details form.
  const handleRequestForm = useCallback(() => {
    setDetailsModalOpen(false)
    navigate('/clients')
  }, [navigate])

  const submittedClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    return clients
      .filter((c) => submittedInputsByClient[c.id])
      .filter((c) => !q || (c.name || '').toLowerCase().includes(q))
  }, [clients, submittedInputsByClient, clientSearch])

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
              toast.error('This file appears to be a scanned image - text could not be extracted.')
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

        // Seed the new client's scenario row with the structured portfolio
        // rows picked via "Add client details", BEFORE activating the client:
        // ScenarioSaveContext's load then finds data.existingProperties and
        // hydrates the Existing Portfolio store (the no-scenario path would
        // otherwise reset it to []). The prose in the prompt still carries the
        // same rows in the same order for the AI; the confirmation-brief merge
        // matches them back by index. Seeded whenever rows exist — an empty
        // store here is what let a later AI echo full-replace the portfolio
        // with defaulted rows (address/year/rent wiped), so seeding must not
        // depend on the prompt text keeping the portfolio block. Failure is
        // non-fatal - the prose path still works exactly as before.
        const seedRows = pendingPortfolioRowsRef.current
        if (seedRows.length > 0) {
          const seedData = {
            // Load path calls Object.entries(propertySelections) - must exist.
            propertySelections: {},
            existingProperties: seedRows,
            lastSaved: new Date().toISOString(),
          } as unknown as Json
          const seedPayload = {
            client_id: created.id,
            name: `${created.name}'s Scenario`,
            client_display_name: created.name || 'Client',
            data: seedData,
            // Explicit 0 so the optimistic-concurrency check in saveScenario
            // (loadedVersion vs DB version) matches on the first update.
            version: 0,
          }
          const { error: seedError } = await supabase.from('scenarios').insert(seedPayload)
          if (seedError) {
            console.warn('Could not seed existing portfolio rows for new scenario', seedError)
          }
        }

        setActiveClient(created)
        setSelectedFile(null)

        const stratText = strategyProfiles.find((p) => p.id === selectedStrategyId)?.text?.trim()
        if (stratText) sessionStorage.setItem(PENDING_STRATEGY_KEY, stratText)
        else sessionStorage.removeItem(PENDING_STRATEGY_KEY)

        sessionStorage.setItem(PENDING_PROMPT_KEY, finalPrompt)
        // Keep a durable copy so Back on the confirmation brief can restore the
        // agent's original inputs into the chat box. We store the visible
        // textarea content (not the doc-prefixed prompt) so the box reads the
        // same way it did before launching.
        if (trimmed) sessionStorage.setItem(BRIEF_SOURCE_PROMPT_KEY, trimmed)
        else sessionStorage.removeItem(BRIEF_SOURCE_PROMPT_KEY)
      } catch {
        toast.error('Something went wrong starting the scenario')
        setSubmitting(false)
      }
    },
    [createClient, setActiveClient, submitting, selectedFile, strategyProfiles, selectedStrategyId]
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
          {/* Purple glow concentrated around the hero - soft, irregular, drifting gently, and following the mouse */}
          <div ref={auroraMouseRef} className="absolute inset-0">
            <div
              className="aurora-blob aurora-a absolute"
              style={{
                width: 1900, height: 800, left: '50%', top: '44%', marginLeft: -950, marginTop: -400,
                background: 'radial-gradient(ellipse 60% 70% at 48% 46%, rgba(167, 139, 250, 0.22), transparent 70%)',
                filter: 'blur(64px)',
              }}
            />
            <div
              className="aurora-blob aurora-b absolute"
              style={{
                width: 1180, height: 680, left: '40%', top: '38%', marginLeft: -590, marginTop: -340,
                background: 'radial-gradient(ellipse 70% 60% at 55% 50%, rgba(192, 132, 252, 0.16), transparent 72%)',
                filter: 'blur(58px)',
              }}
            />
            <div
              className="aurora-blob aurora-c absolute"
              style={{
                width: 1060, height: 620, left: '62%', top: '54%', marginLeft: -530, marginTop: -310,
                background: 'radial-gradient(ellipse 65% 62% at 45% 48%, rgba(196, 181, 253, 0.14), transparent 74%)',
                filter: 'blur(60px)',
              }}
            />
          </div>
          {/* White vignette - fades the hue to clean white at every edge */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 85% 62% at 50% 44%, rgba(255,255,255,0) 34%, rgba(255,255,255,0.92) 88%)' }}
          />
        </div>

        <div
          className="relative z-10 mx-auto mt-[16vh] mb-auto w-full"
          style={{ padding: '48px 48px', maxWidth: 1320 }}
        >
          {/* Hero */}
          <section className="flex flex-col gap-8 mb-10">
            <h1 className="text-[26px] font-semibold text-neutral-900 leading-tight tracking-tight text-center">
              {firstName ? `Hi ${firstName}, let's build a property plan` : "Let's build a property plan"}
            </h1>

            <div className="group bg-white border border-gray-200 rounded-2xl shadow-sm transition-shadow focus-within:shadow-md focus-within:border-gray-300 relative">
              {/* Purple line that runs around the frame while the box is focused */}
              <div
                aria-hidden="true"
                className="prompt-border pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
              />
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <button
                  onClick={() => setDetailsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors border text-[#535862] bg-[#F5F5F6] hover:bg-[#ECECED] border-[#E9EAEB]"
                >
                  <PaperclipIcon size={13} className="text-[#9CA3AF]" />
                  Add client details
                </button>
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.csv,.docx,.xlsx" onChange={handleFileInputChange} className="hidden" />
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
                className="w-full bg-transparent text-[14px] text-[#181D27] placeholder-[#9CA3AF] resize-none outline-none leading-relaxed pl-4 pt-4 pb-1 pr-4 sm:pr-[280px] max-h-[220px]"
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
                <CompanyStrategySelector
                  variant="inline-chips"
                  profiles={strategyProfiles}
                  selectedId={selectedStrategyId}
                  onSelect={setSelectedStrategyId}
                  onManage={() => setStrategyProfileOpen(true)}
                />
                <div className="flex items-center gap-1.5">
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
                  No recent clients yet - type a scenario above to start your first plan.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {recentClients.map((client) => {
                    const isCurrent = activeClient?.id === client.id
                    // Show when the simulation was created, not when it was last
                    // edited/viewed.
                    const updated = formatRelativeShort(
                      previewByClient[client.id]?.createdAt ||
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

                        {/* Three-dot menu - occupies the time slot on hover */}
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
                                : '-'}
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
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-[11px] font-medium max-w-[65%] flex-shrink-0 ${strategyMeta.textClass}`}
                            >
                              <strategyMeta.Icon size={12} className="flex-shrink-0" />
                              <span className="truncate">{strategyMeta.label}</span>
                            </span>
                          ) : (
                            <span />
                          )}
                          {metaLine && (
                            <div className="text-[11px] text-neutral-500 whitespace-nowrap truncate min-w-0">
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

      {/* Add client details - upload a document, or pull in a submitted form */}
      <Dialog
        open={detailsModalOpen}
        onOpenChange={(open) => {
          setDetailsModalOpen(open)
          if (!open) setClientSearch('')
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add client details</DialogTitle>
            <DialogDescription>
              Upload a fact find document, or pull in a client's submitted form.
            </DialogDescription>
          </DialogHeader>

          {/* Upload path */}
          <button
            onClick={handleUploadOption}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[#E9EAEB] bg-white hover:bg-[#F9FAFB] hover:border-[#D5D7DA] transition-colors text-left"
          >
            <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#F5F5F6] flex items-center justify-center">
              <UploadIcon size={16} className="text-[#535862]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#181D27]">Upload a file</span>
              <span className="block text-[11px] text-[#717680]">PDF, DOCX, XLSX, CSV or TXT · up to 10 MB</span>
            </span>
          </button>

          {/* Divider - dashboard "kicker" style (11 / 600 / 0.06em / #717680) */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="h-px flex-1 bg-[#E9EAEB]" />
            <span className="text-[11px] font-semibold uppercase text-[#717680] tracking-[0.06em]">or pick a submitted form</span>
            <div className="h-px flex-1 bg-[#E9EAEB]" />
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-3 py-2.5 text-sm text-[#181D27] placeholder-[#9CA3AF] bg-white border border-[#D5D7DA] rounded-lg outline-none focus:border-[#B8BCC4] transition-colors"
            />
          </div>

          {/* Client list */}
          <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
            {loadingInputs ? (
              <div className="py-8 text-center">
                <Loader2Icon size={18} className="animate-spin mx-auto text-[#717680]" />
              </div>
            ) : submittedClients.length === 0 ? (
              clientSearch.trim() ? (
                <p className="py-8 text-center text-sm text-[#717680]">
                  No matching clients have submitted their form.
                </p>
              ) : (
                <div className="py-7 px-4 flex flex-col items-center text-center">
                  <span className="w-10 h-10 rounded-full bg-[#F5F5F6] flex items-center justify-center mb-3">
                    <ClipboardListIcon size={18} className="text-[#A4A7AE]" />
                  </span>
                  <p className="text-sm font-semibold text-[#181D27]">No forms yet</p>
                  <p className="text-[11px] text-[#717680] mt-0.5 mb-3.5 max-w-[240px]">
                    Send a client their details form and their answers will show up here.
                  </p>
                  <button
                    onClick={handleRequestForm}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  >
                    <SendIcon size={14} className="text-[#717680]" />
                    Request one from a client
                  </button>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-1">
                {submittedClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handlePickClientForm(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors text-left"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#ECFDF3] flex items-center justify-center">
                      <ClipboardListIcon size={15} className="text-[#17B26A]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[#181D27] truncate">{c.name || 'Untitled Client'}</span>
                      <span className="block text-[11px] text-[#717680]">Submitted form</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
      <StrategyProfileModal
        isOpen={strategyProfileOpen}
        onClose={() => setStrategyProfileOpen(false)}
        onSaved={reloadStrategies}
      />
    </>
  )
}

/**
 * ChatPanel - Step 1.15 of NL-PIVOT-PLAN.csv
 *
 * The main chat container - replaces InputDrawer as the primary left panel.
 * Header shows "PropPath AI". Scrollable message list + text input pinned
 * to bottom. Typing indicator while waiting. Auto-scrolls to latest message.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Loader2Icon, PlusIcon, ArrowUpIcon, XIcon, FileTextIcon, SearchIcon, MessageCircleIcon, SparklesIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { track, EVENTS } from '@/lib/analytics'
import { ChatMessage } from './ChatMessage'
import { ChatLoadingSteps, classifyLoadingVariant } from './ChatLoadingSteps'
import { CompanyStrategySelector } from './CompanyStrategySelector'
import { StrategyProfileModal } from './StrategyProfileModal'
import { useStrategyProfiles } from '@/hooks/useStrategyProfiles'
import { extractTextFromDocument, isSupportedFile } from '@/utils/documentExtractor'
import { useChatConversation } from '@/hooks/useChatConversation'
import { useInvestmentProfile } from '@/contexts/InvestmentProfileContext'
import { usePropertySelection } from '@/contexts/PropertySelectionContext'
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext'
import {
  mapToInvestmentProfile,
  mapToPropertySelections,
  mergeExistingProperties,
  mapModificationToUpdates,
  mapUpdateProfileToUpdates,
  forceRefinanceOn,
} from '@/utils/nlDataMapper'
import type { NLParseResponse, CurrentPlanState, ChatOptionCardData } from '@/types/nlParse'
import { useLayout } from '@/contexts/LayoutContext'
import { DISCLAIMER_D_TEXT } from '@/components/DisclaimerBlock'
import { usePortfolioProjection } from '@/hooks/usePortfolioProjection'
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator'
import { buildExplanationContext } from '@/utils/explanationGenerator'
import { rewritePlanMessageAfterAutoFix } from '@/utils/autoFixDisclosure'
import { runPlanPreCheck, autoFixPlan } from '@/engine/planPreCheck'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { useAuth } from '@/contexts/AuthContext'
import { useClient } from '@/contexts/ClientContext'
import { useMultiScenario } from '@/contexts/MultiScenarioContext'
import { CHAT_SEND_EVENT, type ChatSendDetail } from '@/utils/chatBus'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

// Human-readable preset names used when rebuilding a brief for a preset change.
const PRESET_LABELS: Record<string, string> = {
  'eg-low': 'equity growth (low entry)',
  'eg-high': 'equity growth (high entry)',
  'cf-low': 'cash flow (low entry)',
  'cf-high': 'cash flow (high entry)',
  'commercial-transition': 'commercial transition',
  'eg-to-cf': 'growth to cash flow',
}

export const ChatPanel: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll the chat's own message list to the bottom. We set scrollTop on the
  // container directly rather than calling messagesEndRef.scrollIntoView():
  // scrollIntoView() scrolls EVERY scrollable ancestor (including the outer
  // dashboard/page) to bring the anchor into view, which yanked the whole
  // screen up whenever a message or the loading steps appeared. Scrolling the
  // container itself keeps the movement contained to the chat.
  const scrollMessagesToBottom = useCallback((smooth: boolean) => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])
  const { drawerOpen, setDrawerOpen, chatPanelWidth, setChatPanelWidth, setPlanGenerating, setHighlightPeriod, setPendingPlanResponse, confirmPlanHandler, replanPlanHandler, pendingPlanResponse } = useLayout()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [strategyProfileOpen, setStrategyProfileOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  // Company strategies (named, free-text). The BA picks one; its text is fed to
  // the AI, which infers the engine preset from it + the brief.
  const { profiles: strategyProfiles, reload: reloadStrategies } = useStrategyProfiles()
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null)
  // Strategy text chosen on the new-client page, carried via PENDING_STRATEGY_KEY.
  const [pendingStrategyText, setPendingStrategyText] = useState<string | null>(null)
  useEffect(() => {
    setSelectedStrategyId((prev) => {
      if (prev && strategyProfiles.some((p) => p.id === prev)) return prev
      return strategyProfiles[0]?.id ?? null
    })
  }, [strategyProfiles])
  // Selected strategy text feeds the AI: explicit home-page pick wins, else the
  // pill selection, else the firm's first strategy.
  const selectedStrategyText =
    pendingStrategyText ||
    strategyProfiles.find((p) => p.id === selectedStrategyId)?.text?.trim() ||
    undefined

  // Ref for sendMessage so auto-fix can send explanation to AI
  const sendMessageRef = useRef<((text: string, presetOverride?: string, forceFreshPlan?: boolean) => void) | null>(null)

  // ── Divider resize (horizontal) ──
  // The docked chat column sits between the sidebar and the dashboard. Dragging
  // the right-edge divider widens/narrows the chat, which reflows the dashboard.
  // Width is clamped + persisted by LayoutContext.setChatPanelWidth.
  const resizeState = useRef<{ startX: number; startW: number } | null>(null)
  const chatWidthRef = useRef(chatPanelWidth)
  chatWidthRef.current = chatPanelWidth

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeState.current) return
      const dx = e.clientX - resizeState.current.startX
      setChatPanelWidth(resizeState.current.startW + dx)
    }
    const onMouseUp = () => {
      if (resizeState.current) {
        resizeState.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [setChatPanelWidth])

  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeState.current = { startX: e.clientX, startW: chatWidthRef.current }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // ── Draggable launcher FAB ──
  // The sparkle button defaults to the bottom-right corner but can be dragged
  // anywhere; its position persists across reloads. A drag past a small
  // threshold suppresses the click, so dropping it doesn't also open the chat.
  const FAB_SIZE = 48
  const FAB_MARGIN = 20
  const FAB_POS_KEY = 'proppath.fabPos'
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(FAB_POS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const fabPosRef = useRef(fabPos)
  fabPosRef.current = fabPos
  const fabDrag = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null)

  const clampFab = useCallback((x: number, y: number) => {
    const maxX = window.innerWidth - FAB_SIZE - 4
    const maxY = window.innerHeight - FAB_SIZE - 4
    return { x: Math.min(Math.max(4, x), Math.max(4, maxX)), y: Math.min(Math.max(4, y), Math.max(4, maxY)) }
  }, [])

  const onFabMouseMove = useCallback((e: MouseEvent) => {
    const d = fabDrag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
    const next = clampFab(d.origX + dx, d.origY + dy)
    fabPosRef.current = next  // keep ref current so mouseup can persist it
    setFabPos(next)
  }, [clampFab])

  const onFabMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', onFabMouseMove)
    window.removeEventListener('mouseup', onFabMouseUp)
    document.body.style.userSelect = ''
    const d = fabDrag.current
    fabDrag.current = null
    if (!d) return
    if (!d.moved) {
      setDrawerOpen(true)
    } else if (fabPosRef.current) {
      try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(fabPosRef.current)) } catch { /* ignore */ }
    }
  }, [onFabMouseMove, setDrawerOpen])

  const onFabMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    fabDrag.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top, moved: false }
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onFabMouseMove)
    window.addEventListener('mouseup', onFabMouseUp)
  }, [onFabMouseMove, onFabMouseUp])

  // Keep the FAB on-screen when the viewport is resized.
  useEffect(() => {
    const onResize = () => setFabPos((p) => (p ? clampFab(p.x, p.y) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampFab])

  // Contexts we write into
  const { updateProfile, profile } = useInvestmentProfile()
  const { setAllSelections, selections, propertyOrder, addEvent } = usePropertySelection()
  const { setInstances, instances } = usePropertyInstance()
  const { scenarios } = useMultiScenario()

  // Chart data for explanations
  const { timelineProperties } = useAffordabilityCalculator()
  const chartData = usePortfolioProjection()

  // Client context - for resetting chat on client switch
  const { activeClient, updateClient } = useClient()

  // Scenario persistence - sync chat messages
  const { chatMessages: savedChatMessages, setChatMessages: saveChatMessages, scenarioId, saveScenario, setChatRequestInFlight, loadedScenarioClientId, existingProperties, setExistingProperties } = useScenarioSave()

  // Explicit save trigger - bypasses the change-detection + autosave debounce
  // chain that we suspect is racing with auth/navigation flows. Called from
  // handlePlanGenerated / handleModification after state updates so the DB
  // row is durable before the user can navigate or log out.
  //
  // Both saveScenario and the latest messages/saveChatMessages flow through
  // refs so the deferred save reads the FRESHEST values, not whatever was
  // closed over when handlePlanGenerated was first created (handlePlanGenerated
  // runs from sendMessage's pending-prompt closure, baked before any plan
  // existed).
  //
  // Inside flushSaveAfterStateUpdate we ALSO eagerly push the latest local
  // messages into the scenario context BEFORE scheduling saveScenario.
  // Otherwise the messages-sync useEffect runs in a separate flush from the
  // setTimeout(0), so saveScenario could fire while context.chatMessages is
  // still missing the assistant's summary/portfolio response - saving the
  // user prompt only and dropping the AI reply (cofounder report 2026-05-06:
  // dashboard restored on click, user msg restored, assistant reply missing).
  const saveScenarioRef = useRef(saveScenario)
  saveScenarioRef.current = saveScenario
  const messagesForSaveRef = useRef<typeof messages>([])
  // messagesForSaveRef gets populated below - declared here so the callback
  // closes over a stable ref. Same for saveChatMessagesRef.
  const saveChatMessagesRef = useRef(saveChatMessages)
  saveChatMessagesRef.current = saveChatMessages
  const flushSaveAfterStateUpdate = useCallback(() => {
    // Defer through two macrotasks so React has time to flush:
    //   1) setMessages(summary)/setMessages(portfolio)/setAllSelections from
    //      the response handler - once flushed, messagesForSaveRef.current
    //      reflects the LATEST local messages including the assistant reply
    //   2) saveChatMessages - once flushed, context.chatMessages reflects
    //      the latest persisted-shape messages, which is what saveScenario
    //      reads via getCurrentScenarioData.
    setTimeout(() => {
      const persistable = messagesForSaveRef.current.filter((m) => m.type !== 'loading')
      saveChatMessagesRef.current(persistable)
      setTimeout(() => {
        void saveScenarioRef.current(true)
      }, 0)
    }, 0)
  }, [])

  // Track client names extracted from the chat-generated plan. These are sent
  // to the AI as plan context AND drive the loading-step display ("Reading
  // X's profile"). Reset whenever the active client changes - without this,
  // names from a previous client's plan leak into the next session, both as
  // a cosmetic glitch (wrong name in the loading text) and a real correctness
  // issue (the AI receives stale clientNames in its plan-context block).
  const clientNamesRef = useRef<string[]>([])
  useEffect(() => {
    clientNamesRef.current = []
  }, [activeClient?.id])

  // Forward-ref to addSystemMessage so handleModification (defined ABOVE the
  // useChatConversation call that returns addSystemMessage) can post into the
  // chat without sitting in a temporal dead zone for the const declaration.
  const addSystemMessageRef = useRef<((text: string) => void) | null>(null)

  // Build current plan state for the edge function.
  // The enginePlanState block carries the actual projected horizon numbers
  // from the simulator, so the AI can cite them in chat (matching the
  // dashboard) instead of doing its own rough projection that drifts ~20%.
  const getCurrentPlan = useCallback((): CurrentPlanState | null => {
    // Return a plan when there's EITHER a planned portfolio OR existing
    // properties on file - otherwise the AI can't answer questions about a
    // client who only has existing holdings and no forward plan yet.
    if (propertyOrder.length === 0 && existingProperties.length === 0) return null

    // Resolve engine projection from chartData if it exists. portfolioGrowthData
    // is the same array the dashboard reads, so values here always match what
    // the BA sees on screen.
    let enginePlanState: CurrentPlanState['enginePlanState']
    const growthData = chartData?.portfolioGrowthData ?? []
    if (growthData.length > 0) {
      const baseYearNum = parseInt(growthData[0]?.year ?? `${new Date().getFullYear()}`, 10)
      const horizonYear = baseYearNum + (profile.timelineYears ?? 20)
      const horizonPoint =
        growthData.find((d) => parseInt(d.year, 10) >= horizonYear) ??
        growthData[growthData.length - 1]
      const equityGoalReachedPoint =
        profile.equityGoal > 0
          ? growthData.find((d) => d.equity >= profile.equityGoal)
          : undefined
      // Net annual cashflow at the same horizon year - feeds the server-side
      // cashflow-goal feasibility check (and the AI's verbatim citations).
      const cashflowSeries = chartData?.cashflowData ?? []
      const horizonCashflowPoint =
        cashflowSeries.find((d) => parseInt(d.year, 10) >= horizonYear) ??
        cashflowSeries[cashflowSeries.length - 1]
      enginePlanState = {
        horizonYear,
        projectedPortfolioValue: Math.round(horizonPoint?.portfolioValue ?? 0),
        projectedEquity: Math.round(horizonPoint?.equity ?? 0),
        projectedAnnualCashflow: horizonCashflowPoint
          ? Math.round(horizonCashflowPoint.cashflow ?? 0)
          : undefined,
        equityGoalReachedYear: equityGoalReachedPoint
          ? parseInt(equityGoalReachedPoint.year, 10)
          : null,
        // Per-year after-tax series (portfolio audit, claim 2): without these
        // the AI invented opex/tax numbers for any year-N cashflow question.
        // Same arrays the dashboard chart reads, so citations match on-screen.
        cashflowByYear: cashflowSeries
          .filter((d) => parseInt(d.year, 10) <= horizonYear)
          .map((d) => ({
            year: parseInt(d.year, 10),
            cashflow: Math.round(d.cashflow ?? 0),
            existingOnlyCashflow: d.existingOnlyCashflow !== undefined
              ? Math.round(d.existingOnlyCashflow)
              : undefined,
          })),
      }
    }

    return {
      investmentProfile: {
        depositPool: profile.depositPool,
        annualSavings: profile.annualSavings,
        baseSalary: profile.baseSalary,
        timelineYears: profile.timelineYears,
        equityGoal: profile.equityGoal,
        cashflowGoal: profile.cashflowGoal,
      },
      properties: propertyOrder.map((instanceId, i) => {
        const inst = instances[instanceId]
        const engineProp = timelineProperties.find(tp => tp.instanceId === instanceId)
        return {
          instanceId,
          type: instanceId.replace(/_instance_\d+$/, ''),
          purchasePrice: inst?.purchasePrice ?? 0,
          state: inst?.state ?? 'VIC',
          period: inst?.manualPlacementPeriod ?? i + 1,
          growthAssumption: (inst?.growthAssumption ?? 'High') as 'High' | 'Medium' | 'Low',
          loanProduct: (inst?.loanProduct ?? 'IO') as 'IO' | 'PI',
          lvr: inst?.lvr ?? 88,
          entity: inst?.entity,
          engineStatus: engineProp?.status as 'feasible' | 'challenging' | undefined,
          borrowingCapacityRemaining: engineProp?.borrowingCapacityRemaining,
        }
      }),
      existingProperties: existingProperties.map((ep) => ({
        address: ep.address,
        state: ep.state,
        boughtYear: ep.boughtYear,
        purchasePrice: ep.purchasePrice,
        currentValue: ep.currentValue,
        loan: ep.loan,
        equity: (ep.currentValue ?? 0) - (ep.loan ?? 0),
        rentPerWeek: ep.rentPerWeek,
        interestRate: ep.interestRate,
        loanType: ep.loanType,
        growthAssumption: ep.growthAssumption,
        entity: ep.entity,
        // Without these the AI can't echo them back, so a chat correction
        // used to wipe sale plans and refinance toggles (portfolio audit).
        saleYear: ep.saleYear ?? null,
        allowEquityRelease: ep.allowEquityRelease,
      })),
      clientNames: clientNamesRef.current,
      enginePlanState,
    }
  }, [profile, propertyOrder, instances, chartData, timelineProperties, existingProperties])

  // Handle plan generation - store response for confirmation screen.
  // Returns a corrected chat-message string when auto-fix changed the plan
  // (useChatConversation posts it instead of the stale server-templated one).
  const handlePlanGenerated = useCallback(
    (response: NLParseResponse): string | undefined => {
      // Refinancing is always on for AI-supplied existing properties
      response = forceRefinanceOn(response)

      // Store client names immediately (needed for display)
      if (response.clientProfile?.members) {
        clientNamesRef.current = response.clientProfile.members.map((m) => m.name)

        const extracted = response.clientProfile.members
          .map((m) => m.name)
          .filter((n) => n && !/^client \d+$/i.test(n))
        if (
          activeClient &&
          extracted.length > 0 &&
          /^untitled client$/i.test(activeClient.name ?? '')
        ) {
          const newName = extracted.length === 1 ? extracted[0] : `${extracted[0]} & ${extracted[1]}`
          void updateClient(activeClient.id, { name: newName })
        }
      }

      // Run affordability pre-check and auto-fix before showing confirmation brief
      let finalResponse = response
      let correctedMessage: string | undefined
      try {
        const preCheck = runPlanPreCheck(response, profile, existingProperties)
        console.info('[ChatPanel] Pre-check result:', { allFeasible: preCheck.allFeasible, failureCount: preCheck.failures.length })

        if (!preCheck.allFeasible) {
          // Auto-fix: flip entities to trust, reduce prices if needed
          const fix = autoFixPlan(response, preCheck, profile, existingProperties)
          console.info('[ChatPanel] Auto-fix result:', { fixed: fix.fixed, changeCount: fix.changes.length, changes: fix.changes.map(c => c.detail) })

          if (fix.fixed) {
            finalResponse = fix.fixedResponse
            // Attach change details so the confirmation brief can show them
            finalResponse._autoFixChanges = fix.changes
            // The server-templated chat message describes the PRE-auto-fix
            // plan. Rewrite it so the chat states the post-auto-fix count and
            // price range, and disclose every auto-fix change in plain
            // language - the brief's _autoFixChanges block stays as-is.
            correctedMessage = rewritePlanMessageAfterAutoFix(
              response.message ?? '',
              finalResponse,
              fix.changes,
            )
          }
        }
      } catch (err) {
        console.error('[ChatPanel] Pre-check/auto-fix threw, showing original brief:', err)
      }

      // Show confirmation screen (immediately, no delay)
      setPendingPlanResponse(finalResponse)
      return correctedMessage
    },
    [activeClient, updateClient, setPendingPlanResponse, profile, existingProperties]
  )

  // Confirm plan - hydrate contexts from the (possibly edited) response
  const confirmPlan = useCallback(
    (response: NLParseResponse) => {
      console.warn('[ConfirmPlan] Properties:', response.properties?.map((p, i) => `P${i+1} targetPeriod=${p.targetPeriod} alertDismissed=${p.alertDismissed}`).join(' | '))

      // Persist a name the BA typed in the confirmation brief to the client
      // record so the sidebar reflects it. Placeholder names ("Client",
      // "client 1", "Untitled Client") don't count as real.
      const confirmedNames = (response.clientProfile?.members ?? [])
        .map((m) => (m.name ?? '').trim())
        .filter((n) => n.length > 0 && !/^client\s*\d*$/i.test(n) && !/^untitled client$/i.test(n))
      if (activeClient && confirmedNames.length > 0) {
        const newName = confirmedNames.length === 1 ? confirmedNames[0] : `${confirmedNames[0]} & ${confirmedNames[1]}`
        if (newName !== activeClient.name) void updateClient(activeClient.id, { name: newName })
      }

      const profileUpdates = mapToInvestmentProfile(response)
      if (Object.keys(profileUpdates).length > 0) {
        updateProfile(profileUpdates)
      }

      const lvrOverride = profile.lvrStrategy === 'prudent_80' ? 80
        : profile.lvrStrategy === 'custom' ? (profile.lvrStrategyCustomPercent ?? 80)
        : undefined;
      const { selections: newSelections, propertyOrder: newOrder, instances: newInstances } =
        mapToPropertySelections(response, lvrOverride, profile)
      console.warn('[ConfirmPlan] Instances:', Object.entries(newInstances).map(([id, inst]) => `${id} period=${inst.manualPlacementPeriod} manual=${inst.isManuallyPlaced} dismissed=${inst.alertDismissed}`).join(' | '))
      if (newOrder.length > 0) {
        setAllSelections(newSelections, newOrder)
        setInstances(newInstances)
      }

      // MERGE into the current list - a plain replace re-defaulted every field
      // the AI didn't echo (entity, growth, costs, overrides, sale plans) and
      // wiped Portfolio-tab edits on a single chat turn (portfolio audit).
      const existingProps = mergeExistingProperties(existingProperties, response)
      if (existingProps) {
        setExistingProperties(existingProps)
        const totalDebt = existingProps.reduce((s, p) => s + (p.loan || 0), 0)
        const totalValue = existingProps.reduce((s, p) => s + (p.currentValue || 0), 0)
        const existingAnnualRent = existingProps.reduce((s, p) => s + (p.rentPerWeek || 0) * 52, 0)
        updateProfile({ currentDebt: totalDebt, portfolioValue: totalValue, existingAnnualRent })
      }

      setPendingPlanResponse(null)
      flushSaveAfterStateUpdate()
    },
    [updateProfile, setAllSelections, setInstances, existingProperties, setExistingProperties, flushSaveAfterStateUpdate, setPendingPlanResponse, profile.lvrStrategy, profile.lvrStrategyCustomPercent, activeClient, updateClient]
  )

  // Expose confirmPlan to the confirmation screen via LayoutContext ref
  React.useEffect(() => {
    confirmPlanHandler.current = confirmPlan
    return () => { confirmPlanHandler.current = null }
  }, [confirmPlan, confirmPlanHandler])

  // Regenerate the (not-yet-approved) pending plan with a different strategy
  // preset. Driven by the confirmation screen's strategy dropdown. Without
  // this, changing the dropdown only relabelled the plan - the properties
  // stayed as the originally-inferred preset. We rebuild a fresh brief from the
  // pending response's profile and re-run create_plan with the new preset
  // forced (forceFreshPlan → currentPlan: null, so the AI always rebuilds and
  // the strategy-switch guard is never hit).
  const replanWithPreset = useCallback(
    (preset: string, response: NLParseResponse) => {
      const ip = response.investmentProfile
      const cp = response.clientProfile
      if (!ip) return
      const names = (cp?.members ?? [])
        .map((m) => m.name)
        .filter((n) => n && !/^client \d+$/i.test(n))
      const parts: string[] = []
      if (names.length > 0) parts.push(names.join(' & '))
      if (ip.baseSalary) parts.push(`income ${Math.round(ip.baseSalary).toLocaleString()}`)
      if (ip.depositPool) parts.push(`deposit ${Math.round(ip.depositPool).toLocaleString()}`)
      if (ip.annualSavings) parts.push(`saving ${Math.round(ip.annualSavings / 12).toLocaleString()} per month`)
      if (cp?.borrowingCapacity) parts.push(`borrowing capacity ${Math.round(cp.borrowingCapacity).toLocaleString()}`)
      if (ip.timelineYears) parts.push(`${ip.timelineYears} year horizon`)
      if (ip.equityGoal) parts.push(`equity goal ${Math.round(ip.equityGoal).toLocaleString()}`)
      if (ip.cashflowGoal) parts.push(`cashflow goal ${Math.round(ip.cashflowGoal).toLocaleString()}`)
      if (ip.goalPriority) parts.push(`prioritise the ${ip.goalPriority} goal first`)
      const presetLabel = PRESET_LABELS[preset] ?? preset
      const brief = `Rebuild the plan as a ${presetLabel} plan. ${parts.join(', ')}.`
      // Clear the current pending plan so the confirmation screen shows the
      // loading state, then regenerate. sendMessageRef is current by the time
      // a user interaction fires this.
      setPendingPlanResponse(null)
      sendMessageRef.current?.(brief, preset, true)
    },
    [setPendingPlanResponse]
  )

  React.useEffect(() => {
    replanPlanHandler.current = replanWithPreset
    return () => { replanPlanHandler.current = null }
  }, [replanWithPreset, replanPlanHandler])

  // Handle modifications - supports single modification or compound modifications array
  const handleModification = useCallback(
    (response: NLParseResponse) => {
      // If compound modifications array exists, process each one
      const modList = response.modifications
        ? response.modifications
        : response.modification
          ? [response.modification]
          : []

      // Diagnostic log so silent-mod-not-applying bug reports have data.
      // Surfaces target/action/params for each mod alongside the current
      // property prices, so we can tell whether the AI returned a delta
      // instead of an absolute, an out-of-range index, or empty params.
      if (modList.length > 0) {
        console.info('[ChatPanel] handleModification', {
          modifications: modList,
          currentPropertyOrder: propertyOrder,
          currentPrices: propertyOrder.map((id, i) => ({
            index: i + 1,
            instanceId: id,
            purchasePrice: instances[id]?.purchasePrice,
          })),
        })
      }

      let mergedProfileUpdates: Record<string, unknown> = {}
      let currentInstances = { ...instances }
      let currentOrder = [...propertyOrder]
      let currentSelections = { ...selections }
      // SNAPSHOT of the order before ANY mod in this response applies. Every
      // "property-N" the AI sends refers to the plan the user was looking at,
      // so all of them must resolve against this snapshot - resolving against
      // the mutating currentOrder shifted indices after each removal and made
      // compound removals delete the wrong properties (Ella bug 314).
      const referenceOrder = [...propertyOrder]
      // Collect mapper warnings across all mods so we can surface them once
      // to the user instead of letting Claude's "Done!" stand for a silent drop.
      const allWarnings: string[] = []

      for (const mod of modList) {
        // Create a temporary response with just this modification
        const singleResponse = { ...response, modification: mod, modifications: undefined }
        const updates = mapModificationToUpdates(singleResponse, currentInstances, currentOrder, profile, referenceOrder)

        if (updates.warnings && updates.warnings.length > 0) {
          allWarnings.push(...updates.warnings)
        }

        if (updates.profileUpdates) {
          mergedProfileUpdates = { ...mergedProfileUpdates, ...updates.profileUpdates }
        }

        if (updates.instanceUpdates) {
          for (const { instanceId, updates: instUpdates } of updates.instanceUpdates) {
            const current = currentInstances[instanceId]
            if (current) {
              const merged = { ...current, ...instUpdates }
              // Auto-sync valuation when purchasePrice changes and BA
              // hasn't manually overridden valuationAtPurchase.
              if (
                instUpdates.purchasePrice !== undefined &&
                instUpdates.valuationAtPurchase === undefined &&
                !current.valuationAtPurchaseManual
              ) {
                merged.valuationAtPurchase = instUpdates.purchasePrice
              }
              currentInstances = {
                ...currentInstances,
                [instanceId]: merged,
              }
            } else {
              console.warn(`[ChatPanel] mapper returned update for missing instance ${instanceId}`)
              allWarnings.push(`Couldn't find that property to update - it may have been removed.`)
            }
          }
        }

        if (updates.selectionChanges) {
          currentOrder = updates.selectionChanges.propertyOrder
          currentSelections = updates.selectionChanges.selections
          currentInstances = updates.selectionChanges.instances
        }
      }

      // Safety net: if the AI included properties on the response but no mod
      // in the list had action "add", the properties were never consumed.
      // This happens when the AI returns a compound like remove+add but uses
      // singular "modification" (the remove) and puts the add info only in
      // "properties". Process the orphaned properties as an add now.
      const hadAddMod = modList.some(m => m.action === 'add')
      let hadOrphanedAdd = false
      if (!hadAddMod && response.properties && response.properties.length > 0) {
        console.info('[ChatPanel] processing orphaned properties as add', { count: response.properties.length })
        const addResponse = { ...response, modification: { target: 'portfolio', action: 'add', params: {} }, modifications: undefined }
        const addUpdates = mapModificationToUpdates(addResponse, currentInstances, currentOrder, profile)
        if (addUpdates.selectionChanges) {
          currentOrder = addUpdates.selectionChanges.propertyOrder
          currentSelections = addUpdates.selectionChanges.selections
          currentInstances = addUpdates.selectionChanges.instances
          hadOrphanedAdd = true
        }
        if (addUpdates.warnings?.length) {
          allWarnings.push(...addUpdates.warnings)
        }
      }

      // Apply all accumulated updates
      if (Object.keys(mergedProfileUpdates).length > 0) {
        updateProfile(mergedProfileUpdates)
      }

      // Apply instance and selection changes
      let didChange = false
      if (modList.some(m => m.target.startsWith('property-') || m.target === 'lvr' || m.target === 'rates' || m.target === 'interestRate')) {
        setInstances(currentInstances)
        didChange = true
      }

      if (hadOrphanedAdd || modList.some(m => ['add', 'remove'].includes(m.action))) {
        setAllSelections(currentSelections, currentOrder)
        setInstances(currentInstances)
        didChange = true
      }

      if (Object.keys(mergedProfileUpdates).length > 0) {
        didChange = true
      }

      // Same explicit-save reasoning as handlePlanGenerated: don't trust the
      // autosave debounce to fire before the user navigates or logs out.
      if (didChange) {
        flushSaveAfterStateUpdate()
        // Visible confirmation that the modification landed. Without this,
        // when the chart's visual change is small (e.g. one property's price
        // shifted slightly), users can't tell whether anything happened -
        // especially after the AI's "engine will re-run" hedge previously
        // suggested there'd be a separate loading event. Toast is brief and
        // doesn't compete with the chat message.
        toast.success('Plan updated', { duration: 1500 })
      }

      // Surface mapper warnings so the user isn't lied to. If Claude's reply
      // says "Done!" but the mapper couldn't apply something, post a system
      // message right after explaining what didn't land. This is the fix for
      // "I asked it to change X and nothing happened" reports.
      if (allWarnings.length > 0) {
        const dedup = Array.from(new Set(allWarnings))
        addSystemMessageRef.current?.(dedup.join(' '))
      }
    },
    [instances, propertyOrder, selections, updateProfile, setAllSelections, setInstances, flushSaveAfterStateUpdate]
  )

  // Scenario comparison fork is disabled by product decision. Comparison
  // responses are intercepted in useChatConversation and downgraded to
  // plain explanations - this handler is retained as a no-op so no path
  // can silently add a second scenario.
  const handleComparison = useCallback(
    (_response: NLParseResponse) => {
      // intentional no-op
    },
    []
  )

  // Build chart data context for explanation requests
  const getChartContext = useCallback(
    (question: string, relevantPeriods?: number[], relevantProperties?: string[]): string | null => {
      if (!chartData || timelineProperties.length === 0) return null
      const ctx = buildExplanationContext(
        question,
        chartData.portfolioGrowthData,
        chartData.cashflowData,
        timelineProperties,
        relevantPeriods,
        relevantProperties
      )
      return ctx.dataContext
    },
    [chartData, timelineProperties]
  )

  // Handle add_event - add timeline events from NL.
  //
  // Only `refinance` and `salary_change` are wired into the calculation
  // engine. Other event types (sell_property, interest_rate_change,
  // market_correction) have placeholder logic in useAffordabilityCalculator
  // that does nothing - adding them looked successful but the dashboard
  // never moved, which is exactly the "looks functional but silently does
  // nothing" trap we're cleaning up. Bounce them with a clear system
  // message instead of pretending to apply them.
  const SUPPORTED_EVENT_TYPES = new Set(['refinance', 'salary_change'])
  const UNSUPPORTED_EVENT_LABELS: Record<string, string> = {
    sell_property: 'selling a property',
    interest_rate_change: 'interest rate changes',
    market_correction: 'market corrections',
  }
  const handleAddEvent = useCallback(
    (response: NLParseResponse) => {
      if (!response.event) return
      const { eventType, targetYear, parameters } = response.event

      if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
        const label = UNSUPPORTED_EVENT_LABELS[eventType] ?? eventType
        console.warn(`[nl-parse] blocking unsupported add_event type: ${eventType}`)
        addSystemMessageRef.current?.(
          `Heads up - ${label} isn't modelled in the engine yet, so I haven't added a timeline event for it. The dashboard wouldn't change. I can describe the directional impact in chat, but the numbers won't move until this is implemented.`,
        )
        return
      }

      const BASE_YEAR = new Date().getFullYear()
      const period = Math.max(1, Math.round((targetYear - BASE_YEAR) * 2) + 1)

      const categoryMap: Record<string, string> = {
        refinance: 'portfolio',
        salary_change: 'income',
      }

      addEvent({
        type: 'event',
        eventType,
        category: categoryMap[eventType] || 'portfolio',
        period,
        order: 0,
        payload: parameters as Record<string, unknown>,
      })
    },
    [addEvent]
  )

  // Handle update_profile - apply partial profile updates without rebuilding
  const handleUpdateProfile = useCallback(
    (response: NLParseResponse) => {
      // Refinancing is always on for AI-supplied existing properties
      response = forceRefinanceOn(response)
      const profileUpdates = mapUpdateProfileToUpdates(response)
      if (Object.keys(profileUpdates).length > 0) {
        updateProfile(profileUpdates)
      }
      // MERGE into the current list - a plain replace re-defaulted every field
      // the AI didn't echo (entity, growth, costs, overrides, sale plans) and
      // wiped Portfolio-tab edits on a single chat turn (portfolio audit).
      const existingProps = mergeExistingProperties(existingProperties, response)
      if (existingProps) {
        setExistingProperties(existingProps)
        const totalDebt = existingProps.reduce((s, p) => s + (p.loan || 0), 0)
        const totalValue = existingProps.reduce((s, p) => s + (p.currentValue || 0), 0)
        const existingAnnualRent = existingProps.reduce((s, p) => s + (p.rentPerWeek || 0) * 52, 0)
        updateProfile({ currentDebt: totalDebt, portfolioValue: totalValue, existingAnnualRent })
      }
      flushSaveAfterStateUpdate()
    },
    [updateProfile, existingProperties, setExistingProperties, flushSaveAfterStateUpdate]
  )

  // Handle explanation - highlight relevant period on the chart
  const handleExplanation = useCallback(
    (response: NLParseResponse) => {
      if (response.explanation?.relevantPeriod) {
        setHighlightPeriod(response.explanation.relevantPeriod)
      }
    },
    [setHighlightPeriod]
  )

  // Tracks whether we're in a pending-prompt (home page) flow so the
  // chat hook sends currentPlan: null, preventing stale plan misrouting.
  const forceNewPlanRef = useRef(false)

  // Chat conversation hook
  const { messages, isLoading, sendMessage, showOptionCards, addSystemMessage, loadMessages, clearMessages, setMessageFeedback } = useChatConversation({
    onPlanGenerated: handlePlanGenerated,
    onModification: handleModification,
    onExplanation: handleExplanation,
    onComparison: handleComparison,
    onAddEvent: handleAddEvent,
    onUpdateProfile: handleUpdateProfile,
    getCurrentPlan,
    getChartContext,
    userId: user?.id,
    clientName: clientNamesRef.current[0] || activeClient?.name || undefined,
    strategyPreset: profile.strategyPreset || 'eg-low',
    strategyProfileText: selectedStrategyText,
    // Only treat the user as having an existing plan when there's a SAVED
    // scenario for the current client. propertyOrder alone leaks across
    // client switches: launching client 2 from Home leaves client 1's
    // selections in memory until loadClientScenario settles, causing the
    // initial_plan downgrade guard to misfire (founder report 2026-05-06).
    hasExistingPlan: propertyOrder.length > 0 && !!scenarioId,
    forceNewPlan: forceNewPlanRef.current,
  })

  // Keep sendMessage ref current for pre-check feedback loop
  sendMessageRef.current = sendMessage

  // Keep the forward-ref pointed at the latest addSystemMessage so callbacks
  // declared above this hook (handleModification) can post into the chat.
  addSystemMessageRef.current = addSystemMessage

  // Mirror the latest local messages into the ref consumed by
  // flushSaveAfterStateUpdate (declared above this hook). This lets the
  // post-state-update save read whatever's in messages right now, without
  // waiting for the messages-sync useEffect to push them into context.
  messagesForSaveRef.current = messages

  // Clear chat when scenario is reset (scenarioId goes from a value to null)
  // ON THE SAME CLIENT. Also reset clientNamesRef - without this, names from
  // the previous plan leak into the next session.
  // Founder report 2026-05-05: AI kept referencing "Sarah" after reset.
  //
  // Important: skip this clear on client switches - when the user launches a
  // new client from AgentHome, scenarioId goes null because the new client has
  // no saved scenario. Clearing here would wipe the pending-prompt message
  // that was just injected by the home-flow handler.
  const prevScenarioIdRef = useRef<string | null>(null)
  const prevScenarioClientRef = useRef<number | null>(null)
  useEffect(() => {
    const clientChanged = activeClient?.id !== prevScenarioClientRef.current
    prevScenarioClientRef.current = activeClient?.id ?? null

    if (clientChanged) {
      // On client switch, scenarioId still holds the previous client's value
      // and is about to transition to null (or the new client's id) once
      // loadClientScenario completes. Pin prev to null so that a null landing
      // doesn't fire the reset-clear (which would wipe the pending-prompt
      // message that was just injected for the new client).
      prevScenarioIdRef.current = null
      return
    }

    if (prevScenarioIdRef.current !== null && scenarioId === null) {
      clearMessages()
      clientNamesRef.current = []
      loadedRef.current = false
    }
    prevScenarioIdRef.current = scenarioId
  }, [scenarioId, activeClient?.id, clearMessages])

  // Reset chat state when the active client changes
  const loadedRef = useRef(false)
  const prevClientRef = useRef<number | null>(null)
  useEffect(() => {
    if (activeClient?.id !== prevClientRef.current) {
      prevClientRef.current = activeClient?.id ?? null
      // On client switch (not initial load), clear messages and allow reload
      if (loadedRef.current) {
        clearMessages()
        loadedRef.current = false
      }
      // Clear any pending confirmation from a previous client
      setPendingPlanResponse(null)
    }
  }, [activeClient?.id, clearMessages, setPendingPlanResponse])

  // Detected SYNCHRONOUSLY at component init (not in an effect) so that the
  // saved-chat-load effect below can suppress its first run and avoid a flash
  // of the previous scenario's chat before the pending-prompt handler wipes it.
  const hasPendingPromptOnMountRef = useRef<boolean>(
    typeof window !== 'undefined' && !!sessionStorage.getItem('proppath:pending-prompt')
  )

  // Load saved chat messages when they arrive (scenario load or client switch).
  //
  // Cofounder report 2026-05-06: clicking a recent client tile sometimes
  // showed the dashboard but an EMPTY chat panel. Cause: the previous binary
  // loadedRef pattern marked itself loaded on the first render after a client
  // switch - but at that moment savedChatMessages was still empty (ChatPanel's
  // effects fire BEFORE ScenarioSaveContext's loadClientScenario does its
  // async fetch). When the chat data eventually arrived, the effect re-fired
  // but loadedRef was already true, so the chat never landed.
  //
  // Fix: track which client's chat has been loaded. Don't mark "loaded" until
  // we see actual chat content, OR until savedChatMessages settles to empty
  // for the current client (so a genuinely empty chat doesn't loop forever).
  // Skipped if the user arrived from AgentHome with a pending prompt - that
  // handler wants a fresh thread.
  // ChatPanel effects fire BEFORE ScenarioSaveContext's loadClientScenario
  // kicks off, so on a client switch the first render still sees
  // savedChatMessages from the PREVIOUS client. Earlier "load whatever's
  // there" attempts baked stale messages in and short-circuited later
  // updates, so clicking between clients showed a frozen old chat alongside
  // a new dashboard.
  //
  // Gate on loadedScenarioClientId - set by ScenarioSaveContext only after
  // a load completes for that specific client. Until that signal matches
  // activeClient.id, savedChatMessages might still be stale, so we hold
  // local messages clear and wait. Once it matches, we sync messages to
  // savedChatMessages exactly (which may be empty for a chat-less client -
  // that's correct).
  //
  // Skipped when the user arrived from AgentHome with a pending prompt; the
  // pending-prompt handler clears + starts a fresh thread.
  const loadedChatForClientRef = useRef<number | null>(null)
  useEffect(() => {
    if (!activeClient?.id) return

    // savedChatMessages doesn't yet reflect the current client. Reset our
    // tracker so the next sync (when the context catches up) actually fires.
    if (loadedScenarioClientId !== activeClient.id) {
      if (loadedChatForClientRef.current !== null) {
        loadedChatForClientRef.current = null
      }
      return
    }
    if (loadedChatForClientRef.current === activeClient.id) return

    // If local messages already have content, it's authoritative - local
    // was populated by sendMessage's pending-prompt path (user prompt +
    // loading indicator) or by the user typing directly. Don't overwrite
    // with the context version, which can be a FILTERED subset (the
    // messages-sync effect strips loading messages before pushing to
    // context, so loading would get wiped if we re-loaded from context).
    if (messages.length > 0) {
      loadedChatForClientRef.current = activeClient.id
      loadedRef.current = true
      return
    }

    // Local is empty - load from context, which holds the saved chat for
    // this client (possibly empty for a brand-new client with no chat yet).
    loadMessages(savedChatMessages)
    loadedChatForClientRef.current = activeClient.id
    loadedRef.current = true
  }, [activeClient?.id, loadedScenarioClientId, savedChatMessages, loadMessages, messages.length])

  // Sync current messages to scenario save context (for persistence).
  // Skip while we're mid-transition between clients (loadedScenarioClientId
  // hasn't caught up to activeClient.id yet) - otherwise the previous
  // client's still-in-memory messages would briefly overwrite the new
  // client's slot before loadClientScenario settles.
  useEffect(() => {
    if (activeClient?.id && loadedScenarioClientId !== activeClient.id) return
    if (messages.length > 0) {
      // Filter out loading messages before saving
      const persistableMessages = messages.filter((m) => m.type !== 'loading')
      saveChatMessages(persistableMessages)
    }
  }, [messages, saveChatMessages, activeClient?.id, loadedScenarioClientId])

  // Loading step progression for ChatLoadingSteps
  const [loadingStep, setLoadingStep] = useState(0)
  const perfStartRef = useRef<number>(0)

  // Pick loading-step copy that fits the most recent question. The steps are
  // timer-driven, not real progress, so "Running affordability checks" while
  // answering a costs/budget question would mislead - classify instead.
  const loadingVariant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'user' && m.type === 'text') return classifyLoadingVariant(m.content)
    }
    return 'plan' as const
  }, [messages])

  // Sync loading state to layout context for Dashboard skeleton UI + step
  // progression. Also lift to ScenarioSaveContext so TopBar (above the route
  // layer) can disable tab nav while a request is in flight - switching
  // routes mid-fetch remounts ChatPanel and orphans the in-flight promise
  // (visible glitch + dropped response).
  useEffect(() => {
    setPlanGenerating(isLoading)
    setChatRequestInFlight(isLoading)
    if (isLoading) {
      perfStartRef.current = performance.now()
      setLoadingStep(0)
      // Step 1 → 2 after API responds (approximate with timer, actual would need hook into response)
      const step1Timer = setTimeout(() => setLoadingStep(1), 1500)
      const step2Timer = setTimeout(() => setLoadingStep(2), 2500)
      return () => {
        clearTimeout(step1Timer)
        clearTimeout(step2Timer)
      }
    } else if (perfStartRef.current > 0) {
      const totalMs = Math.round(performance.now() - perfStartRef.current)
      if (process.env.NODE_ENV === 'development' || totalMs > 0) {
        console.log(`[PropPath Perf] Total: ${totalMs}ms`)
      }
      perfStartRef.current = 0
      setLoadingStep(0)
    }
  }, [isLoading, setPlanGenerating, setChatRequestInFlight])

  // Auto-scroll to bottom when messages change or loading steps progress
  useEffect(() => {
    scrollMessagesToBottom(true)
  }, [messages, loadingStep, scrollMessagesToBottom])

  // Auto-open the docked chat when loading starts (e.g. plan triggered from
  // Home page or a dashboard card via the chat bus).
  useEffect(() => {
    if (isLoading && !drawerOpen) {
      setDrawerOpen(true)
    }
  }, [isLoading])

  // Instantly jump to bottom when the chat opens
  useEffect(() => {
    if (drawerOpen) {
      requestAnimationFrame(() => {
        scrollMessagesToBottom(false)
      })
    }
  }, [drawerOpen, scrollMessagesToBottom])

  // Handle send
  const handleSend = useCallback(async () => {
    const hasText = inputValue.trim()
    const hasFile = selectedFile !== null
    if ((!hasText && !hasFile) || isLoading) return

    // Clear any active chart highlight on new message
    setHighlightPeriod(null)

    let messageText = inputValue.trim()

    // If a file is attached, extract text and prepend to message
    if (selectedFile) {
      try {
        const docText = await extractTextFromDocument(selectedFile)
        messageText = `[UPLOADED DOCUMENT START]\nThe following text was extracted from an uploaded document (${selectedFile.name}). Extract any relevant financial data from it - look for: income, borrowing capacity, loan amount approved, deposit, liabilities, savings, expenses, property values, interest rates.\n---\n${docText}\n[UPLOADED DOCUMENT END]\n\n${messageText || 'Please extract the relevant data and build a plan.'}`
      } catch (err) {
        const errMsg = err instanceof Error && err.message === 'SCAN_PDF'
          ? "Couldn't read that document clearly. Try a text-based file - scanned documents aren't supported yet."
          : 'Could not read the file. Please try a different one.'
        // Show error as system message - don't send to AI
        addSystemMessage(errMsg)
        setSelectedFile(null)
        return
      }
      setSelectedFile(null)
    }

    track(EVENTS.chatMessageSent, { has_attachment: hasFile, length: hasText.length })
    sendMessage(messageText)
    setInputValue('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }, [inputValue, isLoading, sendMessage, setHighlightPeriod, selectedFile, addSystemMessage])

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // File upload handlers
  const handleFileSelect = useCallback((file: File) => {
    if (!isSupportedFile(file)) {
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      return
    }
    setSelectedFile(file)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  // Handle option card click - apply the fix directly to contexts
  const handleOptionSelect = useCallback(
    (card: ChatOptionCardData) => {
      const payload = card.actionPayload

      if (payload.type === 'instance-update') {
        const instanceId = payload.instanceId as string
        const patchUpdates = payload.updates as Record<string, unknown>
        const current = instances[instanceId]
        if (current) {
          const merged = { ...current, ...patchUpdates }
          if (
            patchUpdates.purchasePrice !== undefined &&
            patchUpdates.valuationAtPurchase === undefined &&
            !current.valuationAtPurchaseManual
          ) {
            (merged as any).valuationAtPurchase = patchUpdates.purchasePrice
          }
          setInstances({
            ...instances,
            [instanceId]: merged as typeof current,
          })
        }
        // Confirm in chat
        addSystemMessage(`Applied - ${card.description}`)
      } else if (payload.type === 'remove-property') {
        const instanceId = payload.instanceId as string
        const newOrder = propertyOrder.filter((id) => id !== instanceId)
        const newInstances = { ...instances }
        delete newInstances[instanceId]

        // Rebuild selections
        const newSelections: Record<string, number> = {}
        for (const id of newOrder) {
          const type = id.replace(/_instance_\d+$/, '')
          newSelections[type] = (newSelections[type] ?? 0) + 1
        }

        setAllSelections(newSelections, newOrder)
        setInstances(newInstances)
        addSystemMessage(`Removed ${card.label.replace('Remove ', '')} from the plan`)
      } else {
        // Fallback - send as message
        sendMessage(card.label + ' - ' + card.description)
      }
    },
    [instances, propertyOrder, setInstances, setAllSelections, sendMessage, addSystemMessage]
  )

  const handleFeedback = useCallback(
    (messageId: string, rating: -1 | 1) => {
      setMessageFeedback(messageId, rating)
      const msg = messages.find((m) => m.id === messageId)
      const prevMsg = msg
        ? messages[messages.indexOf(msg) - 1]
        : undefined
      supabase.from('ai_feedback').insert({
        user_id: user?.id,
        client_id: activeClient?.id ?? null,
        message_id: messageId,
        rating,
        user_message: prevMsg?.role === 'user' ? prevMsg.content?.slice(0, 500) : null,
        assistant_message: msg?.content?.slice(0, 500) ?? null,
      }).then(({ error }) => {
        if (error) console.error('[ai_feedback] insert error:', error)
      })
    },
    [messages, setMessageFeedback, user?.id, activeClient?.id]
  )

  // Listen for cross-component chat sends (e.g. dashboard property cards
  // dispatching a re-plan when the BA changes a property type bucket).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ChatSendDetail>).detail
      if (detail?.message && !isLoading) {
        sendMessage(detail.message)
      }
    }
    window.addEventListener(CHAT_SEND_EVENT, handler)
    return () => window.removeEventListener(CHAT_SEND_EVENT, handler)
  }, [isLoading, sendMessage])

  // One-shot per client: when AgentHome's hero input sends us here with a
  // pending prompt, clear any prior chat and fire the prompt as the first
  // message of a fresh thread - so the dashboard loads with the user's message
  // + the normal AI shimmer/response flow, exactly like typing it in directly.
  // Reset when activeClient changes so subsequent launches from Home work.
  const pendingPromptHandledRef = useRef(false)
  const pendingPromptClientRef = useRef<number | null>(null)
  useEffect(() => {
    if (activeClient?.id !== pendingPromptClientRef.current) {
      pendingPromptHandledRef.current = false
      pendingPromptClientRef.current = activeClient?.id ?? null
    }
  }, [activeClient?.id])

  useEffect(() => {
    if (pendingPromptHandledRef.current) return
    if (isLoading) return
    if (!activeClient?.id) return

    const pending = sessionStorage.getItem('proppath:pending-prompt')
    if (!pending) return

    pendingPromptHandledRef.current = true
    sessionStorage.removeItem('proppath:pending-prompt')

    // Pick up the company strategy chosen on the new-client page so this launch
    // (and subsequent messages) carry its text into the AI prompt.
    const pendingStrategy = sessionStorage.getItem('proppath:pending-strategy-text')
    sessionStorage.removeItem('proppath:pending-strategy-text')
    setPendingStrategyText(pendingStrategy || null)

    clearMessages()
    // Force null currentPlan for this send - prevents stale plan state from
    // causing the AI to misroute a fresh client brief as update_profile.
    forceNewPlanRef.current = true
    // Defer one tick so the cleared state lands before the new send.
    setTimeout(() => {
      sendMessage(pending)
      // Clear the flag after the send so subsequent messages use normal plan state.
      forceNewPlanRef.current = false
    }, 50)
  }, [isLoading, activeClient?.id, clearMessages, sendMessage])


  return (
    <>
      {/* Docked AI chat column - sits between the sidebar and the dashboard.
          Hidden during the confirmation brief. */}
      {drawerOpen && !pendingPlanResponse && (
        <div
          className="relative flex flex-col h-full flex-shrink-0 bg-white border-r border-neutral-200"
          style={{ width: chatPanelWidth }}
        >
          {/* Header - title + strategies + close */}
          <div
            className="flex-shrink-0 flex items-center h-[48px] px-3 select-none"
            style={{ borderBottom: '1px solid #E9EAEB' }}
          >
            <div className="flex items-center pl-1">
              <span className="text-[13px] font-semibold text-[#181D27]">PropPath AI</span>
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              <button
                onClick={() => setStrategyProfileOpen(true)}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#717680] hover:text-[#7C3AED] hover:bg-neutral-100 transition-colors"
                title="Company strategies"
              >
                <SparklesIcon size={13} />
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#717680] hover:text-[#414651] hover:bg-neutral-100 transition-colors"
                title="Close chat"
              >
                <XIcon size={14} />
              </button>
            </div>
          </div>

          {/* Compliance disclaimer */}
          <div className="flex-shrink-0 px-3 py-1.5 border-b border-neutral-100 bg-neutral-50/50">
            <p className="text-[10px] text-neutral-400 italic leading-snug">{DISCLAIMER_D_TEXT}</p>
          </div>

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            className={`flex-1 min-h-0 overflow-y-auto px-3.5 pt-3 pb-6 space-y-3 scrollbar-hide ${isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <p className="text-[11px] text-[#414651] leading-[1.5] font-medium">
                  Describe a client scenario to generate an investment roadmap.
                </p>
                <p className="text-[11px] text-[#717680] mt-2 mb-6 leading-[1.4]">
                  e.g. "$1m borrowing capacity. $120k annual income. $80k deposit. Want to achieve $2m in equity. No existing properties."
                </p>
                <CompanyStrategySelector
                  profiles={strategyProfiles}
                  selectedId={selectedStrategyId}
                  onSelect={(id) => { setSelectedStrategyId(id); setPendingStrategyText(null); }}
                  onManage={() => setStrategyProfileOpen(true)}
                />
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg) =>
                msg.type === 'loading' ? (
                  <ChatLoadingSteps
                    key={msg.id}
                    clientName={clientNamesRef.current[0] || activeClient?.name || undefined}
                    variant={loadingVariant}
                    activeStep={loadingStep}
                    isComplete={false}
                  />
                ) : (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onOptionSelect={handleOptionSelect}
                    onFeedback={handleFeedback}
                  />
                )
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-3 pb-3 pt-2">
            {/* File preview */}
            {selectedFile && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-neutral-50 rounded-lg">
                <FileTextIcon size={14} className="text-neutral-500 flex-shrink-0" />
                <span className="text-xs text-neutral-500 truncate flex-1">{selectedFile.name}</span>
                <span className="text-xs text-neutral-400">{formatFileSize(selectedFile.size)}</span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <XIcon size={12} />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.csv,.docx,.xlsx"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex items-center gap-2 bg-white rounded-[24px] pl-2 pr-2 py-1.5 border border-neutral-200 focus-within:border-[#7C3AED]/40 shadow-sm transition-colors">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                title="Attach PDF or transcript"
                aria-label="Attach file"
              >
                <PlusIcon size={18} />
              </button>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="How can I help?"
                rows={1}
                className="flex-1 bg-transparent text-[12px] text-[#414651] placeholder-neutral-400 resize-none outline-none leading-[1.5] max-h-[120px] px-1"
                disabled={isLoading}
              />
              {(() => {
                const isActive = Boolean(inputValue.trim() || selectedFile)
                return (
                  <button
                    onClick={handleSend}
                    disabled={!isActive || isLoading}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: isActive || isLoading ? '#7C3AED' : '#EDE6FB',
                    }}
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <Loader2Icon size={15} className="animate-spin text-white" />
                    ) : (
                      <ArrowUpIcon size={16} strokeWidth={2.5} className={isActive ? 'text-white' : 'text-[#B69EE8]'} />
                    )}
                  </button>
                )
              })()}
            </div>
          </div>

          {/* Drag divider - right edge. Widens/narrows the chat, reflowing the dashboard. */}
          <div
            onMouseDown={onDividerMouseDown}
            className="group absolute top-0 right-0 h-full w-2 translate-x-1/2 cursor-col-resize z-20"
            style={{ touchAction: 'none' }}
            title="Drag to resize"
          >
            <div className="w-px h-full mx-auto bg-transparent group-hover:bg-[#7C3AED]/50 transition-colors" />
          </div>
        </div>
      )}

      {/* Launcher - purple sparkle FAB shown when the chat is closed.
          Defaults to the bottom-right corner; draggable anywhere. */}
      {!drawerOpen && !pendingPlanResponse && (
        <button
          onMouseDown={onFabMouseDown}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawerOpen(true) } }}
          className="fixed z-50 w-12 h-12 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] shadow-lg flex items-center justify-center text-white transition-colors cursor-grab active:cursor-grabbing select-none touch-none"
          style={fabPos
            ? { left: fabPos.x, top: fabPos.y }
            : { right: FAB_MARGIN, bottom: 24 }}
          title="Ask PropPath AI (drag to move)"
          aria-label="Open PropPath AI chat"
        >
          <SparklesIcon size={22} />
        </button>
      )}

      <StrategyProfileModal
        isOpen={strategyProfileOpen}
        onClose={() => setStrategyProfileOpen(false)}
        onSaved={reloadStrategies}
      />
    </>
  )
}

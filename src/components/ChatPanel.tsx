/**
 * ChatPanel — Step 1.15 of NL-PIVOT-PLAN.csv
 *
 * The main chat container — replaces InputDrawer as the primary left panel.
 * Header shows "PropPath AI". Scrollable message list + text input pinned
 * to bottom. Typing indicator while waiting. Auto-scrolls to latest message.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { SendIcon, Loader2Icon, PaperclipIcon, XIcon, FileTextIcon, SearchIcon, MessageCircleIcon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage } from './ChatMessage'
import { ChatLoadingSteps } from './ChatLoadingSteps'
import { StrategyPresetSelector } from './StrategyPresetSelector'
import { extractTextFromPdf } from '@/utils/pdfExtractor'
import { useChatConversation } from '@/hooks/useChatConversation'
import { useInvestmentProfile } from '@/contexts/InvestmentProfileContext'
import { usePropertySelection } from '@/contexts/PropertySelectionContext'
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext'
import {
  mapToInvestmentProfile,
  mapToPropertySelections,
  mapToExistingProperties,
  mapModificationToUpdates,
  mapUpdateProfileToUpdates,
} from '@/utils/nlDataMapper'
import type { NLParseResponse, CurrentPlanState, ChatOptionCardData } from '@/types/nlParse'
import { useLayout } from '@/contexts/LayoutContext'
import { DISCLAIMER_D_TEXT } from '@/components/DisclaimerBlock'
import { useChartDataGenerator } from '@/hooks/useChartDataGenerator'
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator'
import { buildExplanationContext } from '@/utils/explanationGenerator'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { useAuth } from '@/contexts/AuthContext'
import { useClient } from '@/contexts/ClientContext'
import { useMultiScenario } from '@/contexts/MultiScenarioContext'
import { CHAT_SEND_EVENT, type ChatSendDetail } from '@/utils/chatBus'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const ChatPanel: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { drawerOpen: isOpen, setPlanGenerating, setHighlightPeriod, toggleDrawer } = useLayout()
  const [minimized, setMinimized] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const location = useLocation()

  // ── Drag & resize state ──
  const DEFAULT_SIZE = { width: 380, height: 420 }
  const [chatSize, setChatSize] = useState(DEFAULT_SIZE)
  const [chatPos, setChatPos] = useState<{ x: number; y: number } | null>(null)
  const minimizedRef = useRef(minimized)
  minimizedRef.current = minimized
  const chatPosRef = useRef(chatPos)
  chatPosRef.current = chatPos
  const chatSizeRef = useRef(chatSize)
  chatSizeRef.current = chatSize

  const dragState = useRef<{
    active: boolean; startX: number; startY: number;
    startPosX: number; startPosY: number; moved: boolean;
  } | null>(null)
  const resizeState = useRef<{
    active: boolean; startX: number; startY: number;
    startW: number; startH: number;
  } | null>(null)

  // Set default position (bottom-right) on mount — stored as expanded position
  useEffect(() => {
    if (!chatPos) {
      setChatPos({
        x: window.innerWidth - DEFAULT_SIZE.width - 24,
        y: window.innerHeight - DEFAULT_SIZE.height - 24,
      })
    }
  }, [])

  // Reset to bottom-right default position & size on route change
  useEffect(() => {
    setChatSize(DEFAULT_SIZE)
    setChatPos({
      x: window.innerWidth - DEFAULT_SIZE.width - 24,
      y: window.innerHeight - DEFAULT_SIZE.height - 24,
    })
  }, [location.pathname])

  // Global mouse listeners for drag & resize
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragState.current?.active) {
        const dx = e.clientX - dragState.current.startX
        const dy = e.clientY - dragState.current.startY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true
        const newX = Math.max(0, Math.min(window.innerWidth - 200, dragState.current.startPosX + dx))
        const newY = Math.max(0, Math.min(window.innerHeight - 48, dragState.current.startPosY + dy))
        setChatPos({ x: newX, y: newY })
      }
      if (resizeState.current?.active) {
        const dw = e.clientX - resizeState.current.startX
        const dh = e.clientY - resizeState.current.startY
        setChatSize({
          width: Math.max(320, Math.min(700, resizeState.current.startW + dw)),
          height: Math.max(360, Math.min(window.innerHeight - 48, resizeState.current.startH + dh)),
        })
      }
    }
    const onMouseUp = () => {
      if (dragState.current) {
        if (!dragState.current.moved) setMinimized(!minimizedRef.current)
        dragState.current = null
      }
      if (resizeState.current) resizeState.current = null
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [])

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    const pos = chatPosRef.current
    if (!pos) return
    dragState.current = {
      active: true, startX: e.clientX, startY: e.clientY,
      startPosX: pos.x, startPosY: pos.y, moved: false,
    }
  }

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const sz = chatSizeRef.current
    resizeState.current = {
      active: true, startX: e.clientX, startY: e.clientY,
      startW: sz.width, startH: sz.height,
    }
  }

  // Contexts we write into
  const { updateProfile, profile } = useInvestmentProfile()
  const { setAllSelections, selections, propertyOrder, addEvent } = usePropertySelection()
  const { setInstances, instances } = usePropertyInstance()
  const { scenarios } = useMultiScenario()

  // Chart data for explanations
  const { timelineProperties } = useAffordabilityCalculator()
  const chartData = useChartDataGenerator()

  // Client context — for resetting chat on client switch
  const { activeClient, updateClient } = useClient()

  // Scenario persistence — sync chat messages
  const { chatMessages: savedChatMessages, setChatMessages: saveChatMessages, scenarioId, saveScenario, setChatRequestInFlight, loadedScenarioClientId, setExistingProperties } = useScenarioSave()

  // Explicit save trigger — bypasses the change-detection + autosave debounce
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
  // still missing the assistant's summary/portfolio response — saving the
  // user prompt only and dropping the AI reply (cofounder report 2026-05-06:
  // dashboard restored on click, user msg restored, assistant reply missing).
  const saveScenarioRef = useRef(saveScenario)
  saveScenarioRef.current = saveScenario
  const messagesForSaveRef = useRef<typeof messages>([])
  // messagesForSaveRef gets populated below — declared here so the callback
  // closes over a stable ref. Same for saveChatMessagesRef.
  const saveChatMessagesRef = useRef(saveChatMessages)
  saveChatMessagesRef.current = saveChatMessages
  const flushSaveAfterStateUpdate = useCallback(() => {
    // Defer through two macrotasks so React has time to flush:
    //   1) setMessages(summary)/setMessages(portfolio)/setAllSelections from
    //      the response handler — once flushed, messagesForSaveRef.current
    //      reflects the LATEST local messages including the assistant reply
    //   2) saveChatMessages — once flushed, context.chatMessages reflects
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
  // X's profile"). Reset whenever the active client changes — without this,
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
    if (propertyOrder.length === 0) return null

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
      enginePlanState = {
        horizonYear,
        projectedPortfolioValue: Math.round(horizonPoint?.portfolioValue ?? 0),
        projectedEquity: Math.round(horizonPoint?.equity ?? 0),
        equityGoalReachedYear: equityGoalReachedPoint
          ? parseInt(equityGoalReachedPoint.year, 10)
          : null,
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
        return {
          instanceId,
          type: instanceId.replace(/_instance_\d+$/, ''),
          purchasePrice: inst?.purchasePrice ?? 0,
          state: inst?.state ?? 'VIC',
          period: inst?.manualPlacementPeriod ?? i + 1,
          growthAssumption: (inst?.growthAssumption ?? 'High') as 'High' | 'Medium' | 'Low',
          loanProduct: (inst?.loanProduct ?? 'IO') as 'IO' | 'PI',
          lvr: inst?.lvr ?? 88,
        }
      }),
      clientNames: clientNamesRef.current,
      enginePlanState,
    }
  }, [profile, propertyOrder, instances, chartData])

  // Handle plan generation — wire NL response into contexts
  const handlePlanGenerated = useCallback(
    (response: NLParseResponse) => {
      // Store client names
      if (response.clientProfile?.members) {
        clientNamesRef.current = response.clientProfile.members.map((m) => m.name)

        // If the active client still has the placeholder name from Home
        // (Untitled Client) and the AI extracted real names from the prompt,
        // update the client record so the selector / sidebar / breadcrumb
        // stop saying "Untitled Client". Only fires for placeholder names so
        // we don't overwrite a name the BA explicitly set elsewhere.
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

      // Map to investment profile and update context
      const profileUpdates = mapToInvestmentProfile(response)
      if (Object.keys(profileUpdates).length > 0) {
        updateProfile(profileUpdates)
      }

      // Map to property selections/instances and update contexts
      const { selections: newSelections, propertyOrder: newOrder, instances: newInstances } =
        mapToPropertySelections(response)
      if (newOrder.length > 0) {
        setAllSelections(newSelections, newOrder)
        setInstances(newInstances)
      }

      // Map existing portfolio properties (AI-extracted from conversation)
      const existingProps = mapToExistingProperties(response)
      if (existingProps) {
        setExistingProperties(existingProps)
      }

      // Force a save right after the plan lands.
      flushSaveAfterStateUpdate()
    },
    [updateProfile, setAllSelections, setInstances, setExistingProperties, flushSaveAfterStateUpdate, activeClient, updateClient]
  )

  // Handle modifications — supports single modification or compound modifications array
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
      // Collect mapper warnings across all mods so we can surface them once
      // to the user instead of letting Claude's "Done!" stand for a silent drop.
      const allWarnings: string[] = []

      for (const mod of modList) {
        // Create a temporary response with just this modification
        const singleResponse = { ...response, modification: mod, modifications: undefined }
        const updates = mapModificationToUpdates(singleResponse, currentInstances, currentOrder)

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
              allWarnings.push(`Couldn't find that property to update — it may have been removed.`)
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
        const addUpdates = mapModificationToUpdates(addResponse, currentInstances, currentOrder)
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
        // shifted slightly), users can't tell whether anything happened —
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
  // plain explanations — this handler is retained as a no-op so no path
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

  // Handle add_event — add timeline events from NL.
  //
  // Only `refinance` and `salary_change` are wired into the calculation
  // engine. Other event types (sell_property, interest_rate_change,
  // market_correction) have placeholder logic in useAffordabilityCalculator
  // that does nothing — adding them looked successful but the dashboard
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
          `Heads up — ${label} isn't modelled in the engine yet, so I haven't added a timeline event for it. The dashboard wouldn't change. I can describe the directional impact in chat, but the numbers won't move until this is implemented.`,
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

  // Handle update_profile — apply partial profile updates without rebuilding
  const handleUpdateProfile = useCallback(
    (response: NLParseResponse) => {
      const profileUpdates = mapUpdateProfileToUpdates(response)
      if (Object.keys(profileUpdates).length > 0) {
        updateProfile(profileUpdates)
      }
      const existingProps = mapToExistingProperties(response)
      if (existingProps) {
        setExistingProperties(existingProps)
      }
      flushSaveAfterStateUpdate()
    },
    [updateProfile, setExistingProperties, flushSaveAfterStateUpdate]
  )

  // Handle explanation — highlight relevant period on the chart
  const handleExplanation = useCallback(
    (response: NLParseResponse) => {
      if (response.explanation?.relevantPeriod) {
        setHighlightPeriod(response.explanation.relevantPeriod)
      }
    },
    [setHighlightPeriod]
  )

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
    // Only treat the user as having an existing plan when there's a SAVED
    // scenario for the current client. propertyOrder alone leaks across
    // client switches: launching client 2 from Home leaves client 1's
    // selections in memory until loadClientScenario settles, causing the
    // initial_plan downgrade guard to misfire (founder report 2026-05-06).
    hasExistingPlan: propertyOrder.length > 0 && !!scenarioId,
  })

  // Keep the forward-ref pointed at the latest addSystemMessage so callbacks
  // declared above this hook (handleModification) can post into the chat.
  addSystemMessageRef.current = addSystemMessage

  // Mirror the latest local messages into the ref consumed by
  // flushSaveAfterStateUpdate (declared above this hook). This lets the
  // post-state-update save read whatever's in messages right now, without
  // waiting for the messages-sync useEffect to push them into context.
  messagesForSaveRef.current = messages

  // Clear chat when scenario is reset (scenarioId goes from a value to null)
  // ON THE SAME CLIENT. Also reset clientNamesRef — without this, names from
  // the previous plan leak into the next session.
  // Founder report 2026-05-05: AI kept referencing "Sarah" after reset.
  //
  // Important: skip this clear on client switches — when the user launches a
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
    }
  }, [activeClient?.id, clearMessages])

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
  // switch — but at that moment savedChatMessages was still empty (ChatPanel's
  // effects fire BEFORE ScenarioSaveContext's loadClientScenario does its
  // async fetch). When the chat data eventually arrived, the effect re-fired
  // but loadedRef was already true, so the chat never landed.
  //
  // Fix: track which client's chat has been loaded. Don't mark "loaded" until
  // we see actual chat content, OR until savedChatMessages settles to empty
  // for the current client (so a genuinely empty chat doesn't loop forever).
  // Skipped if the user arrived from AgentHome with a pending prompt — that
  // handler wants a fresh thread.
  // ChatPanel effects fire BEFORE ScenarioSaveContext's loadClientScenario
  // kicks off, so on a client switch the first render still sees
  // savedChatMessages from the PREVIOUS client. Earlier "load whatever's
  // there" attempts baked stale messages in and short-circuited later
  // updates, so clicking between clients showed a frozen old chat alongside
  // a new dashboard.
  //
  // Gate on loadedScenarioClientId — set by ScenarioSaveContext only after
  // a load completes for that specific client. Until that signal matches
  // activeClient.id, savedChatMessages might still be stale, so we hold
  // local messages clear and wait. Once it matches, we sync messages to
  // savedChatMessages exactly (which may be empty for a chat-less client —
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

    // If local messages already have content, it's authoritative — local
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

    // Local is empty — load from context, which holds the saved chat for
    // this client (possibly empty for a brand-new client with no chat yet).
    loadMessages(savedChatMessages)
    loadedChatForClientRef.current = activeClient.id
    loadedRef.current = true
  }, [activeClient?.id, loadedScenarioClientId, savedChatMessages, loadMessages, messages.length])

  // Sync current messages to scenario save context (for persistence).
  // Skip while we're mid-transition between clients (loadedScenarioClientId
  // hasn't caught up to activeClient.id yet) — otherwise the previous
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

  // Sync loading state to layout context for Dashboard skeleton UI + step
  // progression. Also lift to ScenarioSaveContext so TopBar (above the route
  // layer) can disable tab nav while a request is in flight — switching
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loadingStep])

  // Auto-expand when loading starts (e.g. plan triggered from Home page)
  useEffect(() => {
    if (isLoading && minimized) {
      setMinimized(false)
    }
  }, [isLoading])

  // Instantly jump to bottom when expanding from minimized
  useEffect(() => {
    if (!minimized) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
      })
    }
  }, [minimized])

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
        const pdfText = await extractTextFromPdf(selectedFile)
        messageText = `[UPLOADED DOCUMENT START]\nThe following text was extracted from an uploaded PDF document. Extract any relevant financial data from it — look for: income, borrowing capacity, loan amount approved, deposit, liabilities, savings, expenses, property values, interest rates.\n---\n${pdfText}\n[UPLOADED DOCUMENT END]\n\n${messageText || 'Please extract the relevant data and build a plan.'}`
      } catch (err) {
        const errMsg = err instanceof Error && err.message === 'SCAN_PDF'
          ? "Couldn't read that document clearly. Try uploading a text-based PDF — scanned documents aren't supported yet."
          : 'Upload failed. Please try again.'
        // Show error as system message — don't send to AI
        addSystemMessage(errMsg)
        setSelectedFile(null)
        return
      }
      setSelectedFile(null)
    }

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
    if (file.type !== 'application/pdf') {
      return // Only accept PDFs
    }
    if (file.size > 10 * 1024 * 1024) {
      return // 10MB limit
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

  // Handle option card click — apply the fix directly to contexts
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
        addSystemMessage(`Applied — ${card.description}`)
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
        // Fallback — send as message
        sendMessage(card.label + ' — ' + card.description)
      }
    },
    [instances, propertyOrder, setInstances, setAllSelections, sendMessage, addSystemMessage]
  )

  // Handle follow-up suggestion click — send as a new message
  const handleFollowUpClick = useCallback(
    (suggestion: string) => {
      if (!isLoading) {
        sendMessage(suggestion)
      }
    },
    [isLoading, sendMessage]
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
  // message of a fresh thread — so the dashboard loads with the user's message
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

    clearMessages()
    // Defer one tick so the cleared state lands before the new send.
    setTimeout(() => {
      sendMessage(pending)
    }, 50)
  }, [isLoading, activeClient?.id, clearMessages, sendMessage])


  return (
    <>
      {/* Messenger-style chat widget — draggable & resizable */}
      {chatPos && (
      <div
        className="fixed z-50 flex flex-col bg-white rounded-2xl shadow-2xl ring-1 ring-neutral-200/60 overflow-hidden"
        style={{
          left: chatPos.x,
          top: minimized ? chatPos.y + chatSize.height - 48 : chatPos.y,
          width: chatSize.width,
          height: minimized ? 48 : chatSize.height,
          transition: dragState.current?.active || resizeState.current?.active ? 'none' : 'top 0.2s ease, height 0.2s ease',
        }}
      >
        {/* Header — drag to move, click to toggle */}
        <div
          onMouseDown={onHeaderMouseDown}
          className="flex-shrink-0 flex items-center h-[48px] px-3 cursor-grab active:cursor-grabbing hover:bg-neutral-50 transition-colors select-none"
          style={!minimized ? { borderBottom: '1px solid #e5e5e5' } : {}}
        >
          <div className="flex items-center gap-2 pl-1">
            <div className="w-2 h-2 rounded-full bg-[#7F56D9]" />
            <span className="text-sm font-semibold text-neutral-800">PropPath AI</span>
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            {/* Drag handle — 3x3 dots */}
            <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-neutral-300 cursor-grab active:cursor-grabbing">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="3" cy="3" r="1.25" /><circle cx="7" cy="3" r="1.25" /><circle cx="11" cy="3" r="1.25" />
                <circle cx="3" cy="7" r="1.25" /><circle cx="7" cy="7" r="1.25" /><circle cx="11" cy="7" r="1.25" />
                <circle cx="3" cy="11" r="1.25" /><circle cx="7" cy="11" r="1.25" /><circle cx="11" cy="11" r="1.25" />
              </svg>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setMinimized(true); }}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              title="Minimize"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>

        {/* Body — hidden when minimized */}
        {!minimized && (
          <>
            {/* Compliance disclaimer */}
            <div className="flex-shrink-0 px-3 py-1.5 border-b border-neutral-100 bg-neutral-50/50">
              <p className="text-[10px] text-neutral-400 italic leading-snug">{DISCLAIMER_D_TEXT}</p>
            </div>

            {/* Messages area */}
            <div
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
                  <StrategyPresetSelector />
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {messages.map((msg) =>
                  msg.type === 'loading' ? (
                    <ChatLoadingSteps
                      key={msg.id}
                      clientName={clientNamesRef.current[0] || activeClient?.name || undefined}
                      activeStep={loadingStep}
                      isComplete={false}
                    />
                  ) : (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      onOptionSelect={handleOptionSelect}
                      onFollowUpClick={handleFollowUpClick}
                      onFeedback={handleFeedback}
                      propertyCount={propertyOrder.length}
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
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-neutral-200 focus-within:border-neutral-300 transition-colors">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
                  title="Attach PDF or transcript"
                  aria-label="Attach file"
                >
                  <PaperclipIcon size={14} />
                </button>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="How can I help?"
                  rows={1}
                  className="flex-1 bg-transparent text-[11px] text-[#414651] placeholder-neutral-400 resize-none outline-none leading-[1.5] max-h-[120px]"
                  disabled={isLoading}
                />
                {(() => {
                  const isActive = Boolean(inputValue.trim() || selectedFile)
                  return (
                    <button
                      onClick={handleSend}
                      disabled={!isActive || isLoading}
                      className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                      style={{
                        opacity: !isActive && !isLoading ? 0.4 : 1,
                      }}
                    >
                      {isLoading ? (
                        <Loader2Icon size={13} className="animate-spin text-[#7F56D9]" />
                      ) : (
                        <SendIcon size={13} className={isActive ? 'text-[#7F56D9]' : 'text-neutral-400'} />
                      )}
                    </button>
                  )
                })()}
              </div>
            </div>

            {/* Resize handle — bottom-right corner */}
            <div
              onMouseDown={onResizeMouseDown}
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-10 flex items-end justify-end p-1"
              style={{ touchAction: 'none' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-neutral-300">
                <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" />
                <line x1="9" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </>
        )}
      </div>
      )}
    </>
  )
}

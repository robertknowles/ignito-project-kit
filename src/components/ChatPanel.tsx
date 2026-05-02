/**
 * ChatPanel — Step 1.15 of NL-PIVOT-PLAN.csv
 *
 * The main chat container — replaces InputDrawer as the primary left panel.
 * Header shows "PropPath AI". Scrollable message list + text input pinned
 * to bottom. Typing indicator while waiting. Auto-scrolls to latest message.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { SendIcon, Loader2Icon, Settings2Icon, BuildingIcon, PaperclipIcon, XIcon, FileTextIcon, SearchIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage } from './ChatMessage'
import { ChatLoadingSteps } from './ChatLoadingSteps'
import { StrategyPresetSelector } from './StrategyPresetSelector'
import { PlanningDefaultsModal } from './PlanningDefaultsModal'
import { AddToTimelineModal } from './AddToTimelineModal'
import { extractTextFromPdf } from '@/utils/pdfExtractor'
import { useChatConversation } from '@/hooks/useChatConversation'
import { useInvestmentProfile } from '@/contexts/InvestmentProfileContext'
import { usePropertySelection } from '@/contexts/PropertySelectionContext'
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext'
import {
  mapToInvestmentProfile,
  mapToPropertySelections,
  mapModificationToUpdates,
} from '@/utils/nlDataMapper'
import type { NLParseResponse, CurrentPlanState, ChatOptionCardData } from '@/types/nlParse'
import { useBranding } from '@/contexts/BrandingContext'
import { useLayout } from '@/contexts/LayoutContext'
import { ClientSelector } from './ClientSelector'
import { useChartDataGenerator } from '@/hooks/useChartDataGenerator'
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator'
import { buildExplanationContext } from '@/utils/explanationGenerator'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { useAuth } from '@/contexts/AuthContext'
import { useClient } from '@/contexts/ClientContext'
import { useMultiScenario } from '@/contexts/MultiScenarioContext'
import { CHAT_SEND_EVENT, type ChatSendDetail } from '@/utils/chatBus'

interface ChatPanelProps {
  isOpen: boolean
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen }) => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { branding } = useBranding()
  const primaryColor = branding.primaryColor
  const { setPlanGenerating, setHighlightPeriod, chatPanelWidth, setChatPanelWidth } = useLayout()
  const [showPreferences, setShowPreferences] = useState(false)
  const [showPropertyLibrary, setShowPropertyLibrary] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isResizingRef = useRef(false)
  const { user } = useAuth()

  // Contexts we write into
  const { updateProfile, profile } = useInvestmentProfile()
  const { setAllSelections, selections, propertyOrder, addEvent } = usePropertySelection()
  const { setInstances, instances } = usePropertyInstance()
  const { scenarios } = useMultiScenario()

  // Chart data for explanations
  const { timelineProperties } = useAffordabilityCalculator()
  const chartData = useChartDataGenerator()

  // Client context — for resetting chat on client switch
  const { activeClient } = useClient()

  // Scenario persistence — sync chat messages
  const { chatMessages: savedChatMessages, setChatMessages: saveChatMessages, scenarioId } = useScenarioSave()

  // Track client names for plan state
  const clientNamesRef = useRef<string[]>([])

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
      const horizonYear = baseYearNum + (profile.timelineYears ?? 15)
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
    },
    [updateProfile, setAllSelections, setInstances]
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

      let mergedProfileUpdates: Record<string, unknown> = {}
      let currentInstances = { ...instances }
      let currentOrder = [...propertyOrder]
      let currentSelections = { ...selections }

      for (const mod of modList) {
        // Create a temporary response with just this modification
        const singleResponse = { ...response, modification: mod, modifications: undefined }
        const updates = mapModificationToUpdates(singleResponse, currentInstances, currentOrder)

        if (updates.profileUpdates) {
          mergedProfileUpdates = { ...mergedProfileUpdates, ...updates.profileUpdates }
        }

        if (updates.instanceUpdates) {
          for (const { instanceId, updates: instUpdates } of updates.instanceUpdates) {
            const current = currentInstances[instanceId]
            if (current) {
              currentInstances = {
                ...currentInstances,
                [instanceId]: { ...current, ...instUpdates },
              }
            }
          }
        }

        if (updates.selectionChanges) {
          currentOrder = updates.selectionChanges.propertyOrder
          currentSelections = updates.selectionChanges.selections
          currentInstances = updates.selectionChanges.instances
        }
      }

      // Apply all accumulated updates
      if (Object.keys(mergedProfileUpdates).length > 0) {
        updateProfile(mergedProfileUpdates)
      }

      // Apply instance and selection changes
      if (modList.some(m => m.target.startsWith('property-') || m.target === 'lvr')) {
        setInstances(currentInstances)
      }

      if (modList.some(m => ['add', 'remove'].includes(m.action))) {
        setAllSelections(currentSelections, currentOrder)
        setInstances(currentInstances)
      }
    },
    [instances, propertyOrder, selections, updateProfile, setAllSelections, setInstances]
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

  // Handle add_event — add timeline events from NL
  const handleAddEvent = useCallback(
    (response: NLParseResponse) => {
      if (!response.event) return
      const { eventType, targetYear, parameters } = response.event
      const BASE_YEAR = new Date().getFullYear()
      const period = Math.max(1, Math.round((targetYear - BASE_YEAR) * 2) + 1)

      // Map NL event types to the existing event system. EVENT_TYPES uses
      // underscore ids (salary_change, interest_rate_change, sell_property)
      // so we preserve those — the previous dashed mapping produced ids that
      // didn't exist in the registry and crashed the roadmap when it tried
      // to look up .label on an undefined typeDef.
      const eventTypeMap: Record<string, string> = {
        refinance: 'refinance',
        salary_change: 'salary_change',
        sell_property: 'sell_property',
        interest_rate_change: 'interest_rate_change',
      }
      const categoryMap: Record<string, string> = {
        refinance: 'portfolio',
        salary_change: 'income',
        sell_property: 'portfolio',
        interest_rate_change: 'market',
      }

      const mappedType = eventTypeMap[eventType]
      if (!mappedType) {
        console.warn('[nl-parse] unknown event type from add_event response:', eventType)
        return
      }

      addEvent({
        type: 'event',
        eventType: mappedType,
        category: categoryMap[eventType] || 'portfolio',
        period,
        order: 0,
        payload: parameters as Record<string, unknown>,
      })
    },
    [addEvent]
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
  const { messages, isLoading, sendMessage, showOptionCards, addSystemMessage, loadMessages, clearMessages } = useChatConversation({
    onPlanGenerated: handlePlanGenerated,
    onModification: handleModification,
    onExplanation: handleExplanation,
    onComparison: handleComparison,
    onAddEvent: handleAddEvent,
    getCurrentPlan,
    getChartContext,
    userId: user?.id,
    clientName: clientNamesRef.current[0] || activeClient?.name || undefined,
    strategyPreset: profile.strategyPreset || 'eg-low',
    hasExistingPlan: propertyOrder.length > 0,
  })

  // Clear chat when scenario is reset (scenarioId goes from a value to null)
  const prevScenarioIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevScenarioIdRef.current !== null && scenarioId === null) {
      clearMessages()
      loadedRef.current = false
    }
    prevScenarioIdRef.current = scenarioId
  }, [scenarioId, clearMessages])

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

  // Load saved chat messages when they change (scenario load or client switch)
  useEffect(() => {
    if (!loadedRef.current) {
      if (savedChatMessages.length > 0) {
        loadMessages(savedChatMessages)
      }
      loadedRef.current = true
    }
  }, [savedChatMessages, loadMessages])

  // Sync current messages to scenario save context (for persistence)
  useEffect(() => {
    if (messages.length > 0) {
      // Filter out loading messages before saving
      const persistableMessages = messages.filter((m) => m.type !== 'loading')
      saveChatMessages(persistableMessages)
    }
  }, [messages, saveChatMessages])

  // Loading step progression for ChatLoadingSteps
  const [loadingStep, setLoadingStep] = useState(0)
  const perfStartRef = useRef<number>(0)

  // Sync loading state to layout context for Dashboard skeleton UI + step progression
  useEffect(() => {
    setPlanGenerating(isLoading)
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
  }, [isLoading, setPlanGenerating])

  // Auto-scroll to bottom when messages change or loading steps progress
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loadingStep])

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
        const updates = payload.updates as Record<string, unknown>
        const current = instances[instanceId]
        if (current) {
          setInstances({
            ...instances,
            [instanceId]: { ...current, ...updates },
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

  // Drag handle for resizing
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    const startX = e.clientX
    const startWidth = chatPanelWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return
      const delta = moveEvent.clientX - startX
      setChatPanelWidth(startWidth + delta)
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [chatPanelWidth, setChatPanelWidth])

  const handleResizeDoubleClick = useCallback(() => {
    setChatPanelWidth(288) // Reset to default w-72
  }, [setChatPanelWidth])

  return (
    <div
      className={`fixed left-16 top-0 h-screen bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ease-in-out`}
      style={{ width: isOpen ? chatPanelWidth : 0 }}
    >
      <div className={`flex flex-col h-full ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Header — Client Selector + action icons */}
        <div className="flex items-center border-b border-gray-200 h-[52px] px-2">
          <ClientSelector />
          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#717680] hover:text-[#414651] hover:bg-[#F5F5F5] transition-colors"
              title="Upload PDF"
            >
              <PaperclipIcon size={14} />
            </button>
            <button
              onClick={() => setShowPropertyLibrary(true)}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#717680] hover:text-[#414651] hover:bg-[#F5F5F5] transition-colors"
              title="Browse Properties"
            >
              <BuildingIcon size={14} />
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#717680] hover:text-[#414651] hover:bg-[#F5F5F5] transition-colors"
              title="Planning Defaults"
            >
              <Settings2Icon size={14} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div
          className={`flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-4 scrollbar-hide ${isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <p className="text-[12px] text-[#181D27] leading-[1.6] font-medium">
                Describe a client scenario to generate an investment roadmap.
              </p>
              <p className="text-[11px] text-[#717680] mt-2 mb-6 leading-[1.5]">
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
                  propertyCount={propertyOrder.length}
                />
              )
            )}
          </AnimatePresence>

          {/* Input area — inside scroll container */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area — fixed at bottom */}
        <div className="px-3 pb-3 pt-2">
          {/* File preview */}
          {selectedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[#F5F5F5] rounded-lg">
              <FileTextIcon size={14} className="text-[#535862] flex-shrink-0" />
              <span className="text-xs text-[#535862] truncate flex-1">{selectedFile.name}</span>
              <span className="text-xs text-[#717680]">{formatFileSize(selectedFile.size)}</span>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[#717680] hover:text-[#414651]"
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
          <div className="flex items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-gray-200 focus-within:border-gray-300 transition-colors">
            <SearchIcon size={14} className="text-[#717680] flex-shrink-0" />
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Describe a client scenario..."
              rows={1}
              className="flex-1 bg-transparent text-[12px] text-[#181D27] placeholder-[#717680] resize-none outline-none leading-relaxed max-h-[120px]"
              disabled={isLoading}
            />
            {(() => {
              const isActive = Boolean(inputValue.trim() || selectedFile)
              return (
                <button
                  onClick={handleSend}
                  disabled={!isActive || isLoading}
                  className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:cursor-not-allowed bg-white"
                  style={{
                    opacity: !isActive && !isLoading ? 0.4 : 1,
                  }}
                >
                  {isLoading ? (
                    <Loader2Icon size={13} className="animate-spin" style={{ color: primaryColor }} />
                  ) : (
                    <SendIcon size={13} style={{ color: isActive ? primaryColor : '#717680' }} />
                  )}
                </button>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Resize handle */}
      {isOpen && (
        <div
          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors group z-40"
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeDoubleClick}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Planning Defaults Modal */}
      <PlanningDefaultsModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />

      {/* Property Library Modal */}
      <AddToTimelineModal isOpen={showPropertyLibrary} onClose={() => setShowPropertyLibrary(false)} />
    </div>
  )
}

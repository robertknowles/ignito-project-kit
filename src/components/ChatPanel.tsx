/**
 * ChatPanel — Step 1.15 of NL-PIVOT-PLAN.csv
 *
 * The main chat container — replaces InputDrawer as the primary left panel.
 * Header shows "PropPath AI". Scrollable message list + text input pinned
 * to bottom. Typing indicator while waiting. Auto-scrolls to latest message.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { SendIcon, Loader2Icon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage } from './ChatMessage'
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

interface ChatPanelProps {
  isOpen: boolean
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen }) => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { branding } = useBranding()
  const primaryColor = branding.primaryColor
  const { setPlanGenerating, setHighlightPeriod } = useLayout()
  const { user } = useAuth()

  // Contexts we write into
  const { updateProfile, profile } = useInvestmentProfile()
  const { setAllSelections, selections, propertyOrder } = usePropertySelection()
  const { setInstances, instances } = usePropertyInstance()
  const { addScenario, syncCurrentScenarioFromContext, scenarios } = useMultiScenario()

  // Chart data for explanations
  const { timelineProperties } = useAffordabilityCalculator()
  const chartData = useChartDataGenerator()

  // Client context — for resetting chat on client switch
  const { activeClient } = useClient()

  // Scenario persistence — sync chat messages
  const { chatMessages: savedChatMessages, setChatMessages: saveChatMessages } = useScenarioSave()

  // Track client names for plan state
  const clientNamesRef = useRef<string[]>([])

  // Build current plan state for the edge function
  const getCurrentPlan = useCallback((): CurrentPlanState | null => {
    if (propertyOrder.length === 0) return null

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
    }
  }, [profile, propertyOrder, instances])

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

  // Handle comparison — fork scenario and apply changes
  const handleComparison = useCallback(
    (response: NLParseResponse) => {
      if (!response.comparison?.changes) return

      // Save current scenario state first
      syncCurrentScenarioFromContext()

      // Create new scenario (this adds and activates it)
      addScenario()

      // Apply the comparison changes as modifications to the new scenario
      const changes = response.comparison.changes
      const updatedInstances = { ...instances }

      for (const change of changes) {
        // Resolve property-N to instance ID
        const propMatch = change.target.match(/^property-(\d+)$/)
        if (propMatch) {
          const idx = parseInt(propMatch[1], 10) - 1
          const instanceId = propertyOrder[idx]
          if (instanceId && updatedInstances[instanceId]) {
            const inst = { ...updatedInstances[instanceId] }
            switch (change.field) {
              case 'state':
                inst.state = change.to as string
                break
              case 'purchasePrice':
                inst.purchasePrice = change.to as number
                inst.valuationAtPurchase = change.to as number
                break
              case 'growthAssumption':
                inst.growthAssumption = change.to as string
                break
              case 'loanProduct':
                inst.loanProduct = change.to as string
                break
              case 'lvr':
                inst.lvr = change.to as number
                break
            }
            updatedInstances[instanceId] = inst
          }
        }
      }

      // Apply changes to the new (now active) scenario
      setInstances(updatedInstances)
    },
    [instances, propertyOrder, syncCurrentScenarioFromContext, addScenario, setInstances]
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
    getCurrentPlan,
    getChartContext,
    userId: user?.id,
    clientName: clientNamesRef.current[0] || activeClient?.name || undefined,
  })

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

  // Sync loading state to layout context for Dashboard skeleton UI
  useEffect(() => {
    setPlanGenerating(isLoading)
  }, [isLoading, setPlanGenerating])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle send
  const handleSend = useCallback(() => {
    if (inputValue.trim() && !isLoading) {
      // Clear any active chart highlight on new message
      setHighlightPeriod(null)
      sendMessage(inputValue)
      setInputValue('')
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    }
  }, [inputValue, isLoading, sendMessage, setHighlightPeriod])

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

  return (
    <div
      className={`fixed left-16 top-0 h-screen bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? 'w-72' : 'w-0'
      }`}
    >
      <div className={`flex flex-col h-full ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Header — Client Selector (matches original InputDrawer header) */}
        <div className="flex items-center border-b border-gray-200 h-[52px] px-2">
          <ClientSelector />
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold mb-3"
                style={{ backgroundColor: primaryColor }}
              >
                P
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Describe a client scenario to generate an investment roadmap.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                e.g. "John. 120k annual income. 80k deposit. Want to hit $2M in equity across 4 properties over 15 years."
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOptionSelect={handleOptionSelect}
                onFollowUpClick={handleFollowUpClick}
              />
            ))}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-gray-300 transition-colors">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Describe a client scenario..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none leading-relaxed max-h-[120px]"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
              style={{
                backgroundColor: inputValue.trim() && !isLoading ? primaryColor : undefined,
                color: inputValue.trim() && !isLoading ? 'white' : undefined,
              }}
            >
              {isLoading ? (
                <Loader2Icon size={14} className="animate-spin text-gray-400" />
              ) : (
                <SendIcon size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

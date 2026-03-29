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

interface ChatPanelProps {
  isOpen: boolean
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen }) => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { branding } = useBranding()
  const primaryColor = branding.primaryColor
  const { setPlanGenerating } = useLayout()

  // Contexts we write into
  const { updateProfile, profile } = useInvestmentProfile()
  const { setAllSelections, selections, propertyOrder } = usePropertySelection()
  const { setInstances, instances } = usePropertyInstance()

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

  // Handle modifications
  const handleModification = useCallback(
    (response: NLParseResponse) => {
      const updates = mapModificationToUpdates(response, instances, propertyOrder)

      if (updates.profileUpdates) {
        updateProfile(updates.profileUpdates)
      }

      if (updates.instanceUpdates) {
        // Apply instance-level updates individually
        for (const { instanceId, updates: instUpdates } of updates.instanceUpdates) {
          const current = instances[instanceId]
          if (current) {
            setInstances({
              ...instances,
              [instanceId]: { ...current, ...instUpdates },
            })
          }
        }
      }

      if (updates.selectionChanges) {
        setAllSelections(updates.selectionChanges.selections, updates.selectionChanges.propertyOrder)
        setInstances(updates.selectionChanges.instances)
      }
    },
    [instances, propertyOrder, updateProfile, setAllSelections, setInstances]
  )

  // Chat conversation hook
  const { messages, isLoading, sendMessage, showOptionCards } = useChatConversation({
    onPlanGenerated: handlePlanGenerated,
    onModification: handleModification,
    getCurrentPlan,
  })

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
      sendMessage(inputValue)
      setInputValue('')
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    }
  }, [inputValue, isLoading, sendMessage])

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

  // Handle option card click
  const handleOptionSelect = useCallback(
    (card: ChatOptionCardData) => {
      // The card's actionPayload contains the modification to apply
      // For now, send it as a message describing the action
      sendMessage(card.label + ' — ' + card.description)
    },
    [sendMessage]
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
                e.g. "Jane and John, both earning 120k, 80k deposit, want to buy around 650k in VIC"
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOptionSelect={handleOptionSelect}
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

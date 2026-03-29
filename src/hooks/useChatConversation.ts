/**
 * useChatConversation — Step 1.14 of NL-PIVOT-PLAN.csv
 *
 * Manages chat state: message history, loading state, conversation context.
 * Handles sending messages to the nl-parse edge function, receiving
 * responses, maintaining conversation history for multi-turn context.
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type {
  ChatMessage,
  ChatMessageType,
  NLParseResponse,
  CurrentPlanState,
  SummaryCardData,
  MicroConfirmationData,
} from '@/types/nlParse'

interface UseChatConversationOptions {
  onPlanGenerated?: (response: NLParseResponse) => void
  onModification?: (response: NLParseResponse) => void
  onExplanation?: (response: NLParseResponse) => void
  getCurrentPlan?: () => CurrentPlanState | null
}

export function useChatConversation(options: UseChatConversationOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messageIdCounter = useRef(0)

  const createMessage = useCallback(
    (
      role: ChatMessage['role'],
      type: ChatMessageType,
      content: string,
      extra?: Partial<ChatMessage>
    ): ChatMessage => {
      messageIdCounter.current += 1
      return {
        id: `msg-${messageIdCounter.current}`,
        role,
        type,
        content,
        timestamp: Date.now(),
        ...extra,
      }
    },
    []
  )

  /**
   * Build a SummaryCardData from an NLParseResponse for the summary card UI
   */
  const buildSummaryCard = useCallback((response: NLParseResponse): SummaryCardData | undefined => {
    if (!response.clientProfile) return undefined

    const { members, monthlySavings, currentDeposit } = response.clientProfile

    const memberNames = members.map((m) => m.name).join(' & ')

    const incomeStr =
      members.length === 1
        ? `$${(members[0].annualIncome / 1000).toFixed(0)}k`
        : members
            .map((m) => `$${(m.annualIncome / 1000).toFixed(0)}k`)
            .join(' + ') +
          ` ($${(members.reduce((sum, m) => sum + m.annualIncome, 0) / 1000).toFixed(0)}k combined)`

    const savingsStr = `$${monthlySavings.toLocaleString()}/mo ($${(monthlySavings * 12 / 1000).toFixed(0)}k/yr)`
    const depositStr = `$${currentDeposit.toLocaleString()}`

    const properties = (response.properties || []).map((p, i) => ({
      label: `Property ${i + 1}`,
      description: `~$${(p.purchasePrice / 1000).toFixed(0)}k in ${p.state}, ${p.growthAssumption.toLowerCase()}-growth, ${p.loanProduct}`,
    }))

    const ownership =
      members.length > 1
        ? 'Individual (50/50)'
        : 'Individual'

    return {
      clients: memberNames,
      income: incomeStr,
      savings: savingsStr,
      availableDeposit: depositStr,
      properties,
      ownership,
    }
  }, [])

  /**
   * Build a MicroConfirmationData from an NLParseResponse
   */
  const buildMicroConfirmation = useCallback((response: NLParseResponse): MicroConfirmationData | undefined => {
    if (!response.clientProfile) return undefined
    const { members, monthlySavings } = response.clientProfile

    return {
      members: members.map((m) => ({
        name: m.name,
        income: `$${(m.annualIncome / 1000).toFixed(0)}k`,
      })),
      savings: `$${monthlySavings.toLocaleString()}/mo`,
    }
  }, [])

  /**
   * Send a message to the nl-parse edge function and process the response
   */
  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading) return

      // Add user message
      const userMsg = createMessage('user', 'text', userText.trim())
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      // Add loading indicator
      const loadingMsg = createMessage('assistant', 'loading', '')
      setMessages((prev) => [...prev, loadingMsg])

      try {
        // Get current plan state for context
        const currentPlan = options.getCurrentPlan?.() ?? null

        // Build conversation history (text messages only, for context)
        const conversationHistory = messages
          .filter((m) => m.role !== 'system' && m.type === 'text')
          .map((m) => ({ role: m.role, content: m.content }))

        // Call the edge function
        const { data, error } = await supabase.functions.invoke('nl-parse', {
          body: {
            message: userText.trim(),
            conversationHistory,
            currentPlan,
          },
        })

        if (error) {
          throw new Error(error.message || 'Failed to reach PropPath AI')
        }

        const response = data as NLParseResponse

        // Remove loading indicator
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id))

        // Process response based on type
        switch (response.type) {
          case 'initial_plan': {
            // Show micro confirmation first (income + savings flash)
            const microData = buildMicroConfirmation(response)
            if (microData) {
              const microMsg = createMessage('assistant', 'micro-confirmation', "Got it. Here's what I'm working with:", {
                microConfirmation: microData,
              })
              setMessages((prev) => [...prev, microMsg])
            }

            // Show summary card with full details
            const summaryData = buildSummaryCard(response)
            if (summaryData) {
              const summaryMsg = createMessage('assistant', 'summary-card', response.message, {
                summaryCard: summaryData,
                assumptions: response.assumptions,
              })
              setMessages((prev) => [...prev, summaryMsg])
            } else {
              // No structured data — just show the message (e.g. asking for more info)
              const textMsg = createMessage('assistant', 'text', response.message)
              setMessages((prev) => [...prev, textMsg])
            }

            // Fire callback to wire data into contexts
            options.onPlanGenerated?.(response)

            // Show system message after plan generates
            if (response.properties && response.properties.length > 0) {
              const systemMsg = createMessage(
                'system',
                'text',
                `Plan generated — ${response.properties.length} properties`
              )
              setMessages((prev) => [...prev, systemMsg])
            }
            break
          }

          case 'modification': {
            const modMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, modMsg])
            options.onModification?.(response)
            break
          }

          case 'explanation': {
            const explMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, explMsg])
            options.onExplanation?.(response)
            break
          }

          default: {
            // Fallback — just show the message
            const fallbackMsg = createMessage('assistant', 'text', response.message)
            setMessages((prev) => [...prev, fallbackMsg])
          }
        }

        // Add follow-up suggestions if present
        if (response.followUpSuggestions && response.followUpSuggestions.length > 0) {
          // These could be rendered as suggestion chips in the UI
          // For now, store them on the last message
          setMessages((prev) => {
            const updated = [...prev]
            const lastAssistant = [...updated].reverse().find((m) => m.role === 'assistant')
            if (lastAssistant) {
              lastAssistant.followUpSuggestions = response.followUpSuggestions
            }
            return updated
          })
        }
      } catch (err) {
        // Remove loading indicator
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id))

        // Show friendly error
        const errorMsg = createMessage(
          'assistant',
          'text',
          'Something went wrong — try rephrasing that.'
        )
        setMessages((prev) => [...prev, errorMsg])

        console.error('nl-parse error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, options, createMessage, buildSummaryCard, buildMicroConfirmation]
  )

  /**
   * Add option cards to the chat (called by constraint feedback handler)
   */
  const showOptionCards = useCallback(
    (
      message: string,
      cards: ChatMessage['optionCards']
    ) => {
      const msg = createMessage('assistant', 'option-cards', message, {
        optionCards: cards,
      })
      setMessages((prev) => [...prev, msg])
    },
    [createMessage]
  )

  /**
   * Clear all messages (e.g. when starting a new scenario)
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    messageIdCounter.current = 0
  }, [])

  /**
   * Load messages from saved scenario
   */
  const loadMessages = useCallback((savedMessages: ChatMessage[]) => {
    setMessages(savedMessages)
    messageIdCounter.current = savedMessages.length
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    showOptionCards,
    clearMessages,
    loadMessages,
  }
}

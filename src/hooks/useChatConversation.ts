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
  PortfolioCardData,
} from '@/types/nlParse'

// Canonical missingInputs keys → summary card row keys that should be
// highlighted in amber. Keys not in this map (e.g. goal) only surface in the
// accuracy nudge, not as a row highlight. One missing input may map to
// multiple rows (existing_debt highlights both debt and equity rows).
const MISSING_INPUT_TO_CARD_KEYS: Record<string, string[]> = {
  income: ['income'],
  savings: ['savings'],
  deposit: ['availableDeposit'],
  borrowing_capacity: ['borrowingCapacity'],
  existing_debt: ['existingPropertyDebt', 'existingPropertyEquity'],
}

/** Format a dollar amount as a compact display string: $1M, $800k, $50k, $0. */
function formatCompactAud(n: number): string {
  if (n === 0) return '$0'
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  return `$${Math.round(n / 1000)}k`
}

interface UseChatConversationOptions {
  onPlanGenerated?: (response: NLParseResponse) => void
  onModification?: (response: NLParseResponse) => void
  onExplanation?: (response: NLParseResponse) => void
  onComparison?: (response: NLParseResponse) => void
  onAddEvent?: (response: NLParseResponse) => void
  getCurrentPlan?: () => CurrentPlanState | null
  /** Returns chart data context string for explanation requests */
  getChartContext?: (question: string, relevantPeriods?: number[], relevantProperties?: string[]) => string | null
  /** User ID for usage tracking */
  userId?: string
  /** Client name for personalised loading text */
  clientName?: string
  /** Acquisition pacing mode — controls property spacing and growth assumptions */
  pacingMode?: 'aggressive' | 'balanced' | 'conservative'
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

    const { members, monthlySavings, currentDeposit, borrowingCapacity, existingPropertyDebt, existingPropertyEquity } =
      response.clientProfile

    const incomeStr =
      members.length === 1
        ? `$${(members[0].annualIncome / 1000).toFixed(0)}k`
        : members
            .map((m) => `$${(m.annualIncome / 1000).toFixed(0)}k`)
            .join(' + ') +
          ` ($${(members.reduce((sum, m) => sum + m.annualIncome, 0) / 1000).toFixed(0)}k combined)`

    const savingsStr = `$${monthlySavings.toLocaleString()}/mo ($${(monthlySavings * 12 / 1000).toFixed(0)}k/yr)`
    const depositStr = `$${currentDeposit.toLocaleString()}`
    const borrowingCapacityStr =
      typeof borrowingCapacity === 'number' && borrowingCapacity > 0
        ? formatCompactAud(borrowingCapacity)
        : 'Not provided'
    const existingPropertyDebtStr =
      typeof existingPropertyDebt === 'number'
        ? formatCompactAud(existingPropertyDebt)
        : 'Not provided'
    const existingPropertyEquityStr =
      typeof existingPropertyEquity === 'number'
        ? formatCompactAud(existingPropertyEquity)
        : 'Not provided'

    const missingFields = (response.missingInputs ?? []).flatMap(
      (k) => MISSING_INPUT_TO_CARD_KEYS[k] ?? []
    )

    return {
      income: incomeStr,
      borrowingCapacity: borrowingCapacityStr,
      savings: savingsStr,
      availableDeposit: depositStr,
      existingPropertyDebt: existingPropertyDebtStr,
      existingPropertyEquity: existingPropertyEquityStr,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
    }
  }, [])

  /**
   * Build a PortfolioCardData from an NLParseResponse for the portfolio card UI
   */
  const buildPortfolioCard = useCallback((response: NLParseResponse): PortfolioCardData | undefined => {
    if (!response.properties || response.properties.length === 0) return undefined
    return {
      properties: response.properties.map((p, i) => ({
        label: `Property ${i + 1}`,
        description: `~$${(p.purchasePrice / 1000).toFixed(0)}k in ${p.state}, ${p.growthAssumption.toLowerCase()}-growth, ${p.loanProduct}`,
      })),
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

      // Add loading indicator with personalised text
      const loadingText = options.clientName
        ? `Mapping ${options.clientName}'s portfolio path...`
        : 'Running the numbers...'
      const loadingMsg = createMessage('assistant', 'loading', loadingText)
      setMessages((prev) => [...prev, loadingMsg])

      try {
        // Get current plan state for context
        const currentPlan = options.getCurrentPlan?.() ?? null

        // Build conversation history (text messages only, for context)
        const conversationHistory = messages
          .filter((m) => m.role !== 'system' && m.type === 'text')
          .map((m) => ({ role: m.role, content: m.content }))

        // Call the edge function (with single retry for transient failures)
        let data: NLParseResponse
        const callEdgeFunction = async () => {
          const result = await supabase.functions.invoke('nl-parse', {
            body: {
              message: userText.trim(),
              conversationHistory,
              currentPlan,
              userId: options.userId,
              pacingMode: options.pacingMode || 'balanced',
            },
          })

          if (result.error) {
            const msg = result.error.message || ''
            // Detect specific error types
            if (msg.includes('timeout') || msg.includes('TIMEOUT') || msg.includes('504')) {
              throw new Error('TIMEOUT')
            }
            if (msg.includes('rate') || msg.includes('429') || msg.includes('too many')) {
              throw new Error('RATE_LIMIT')
            }
            throw new Error(msg || 'Failed to reach PropPath AI')
          }

          if (!result.data || result.data.error) {
            const errMsg = result.data?.error || ''
            if (errMsg.includes('parse') || errMsg.includes('JSON')) {
              throw new Error('MALFORMED')
            }
            throw new Error(errMsg || 'Invalid response from PropPath AI')
          }

          return result.data as NLParseResponse
        }

        try {
          data = await callEdgeFunction()
        } catch (firstErr) {
          const errMsg = firstErr instanceof Error ? firstErr.message : ''
          // Retry once for malformed responses (Claude occasionally returns bad JSON)
          if (errMsg === 'MALFORMED') {
            try {
              data = await callEdgeFunction()
            } catch {
              throw new Error('MALFORMED')
            }
          } else if (errMsg === 'TIMEOUT') {
            throw new Error('TIMEOUT')
          } else if (errMsg === 'RATE_LIMIT') {
            throw new Error('RATE_LIMIT')
          } else if (!navigator.onLine) {
            throw new Error('OFFLINE')
          } else {
            throw firstErr
          }
        }

        const response = data

        // Remove loading indicator
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id))

        // Process response based on type
        switch (response.type) {
          case 'initial_plan': {
            // Two-message sequence:
            // 1. Client summary — what was captured, plus accuracy nudge
            // 2. Portfolio narrative + property table
            const summaryData = buildSummaryCard(response)
            if (summaryData) {
              const summaryMsg = createMessage(
                'assistant',
                'summary-card',
                "Here's what I captured:",
                {
                  summaryCard: summaryData,
                  assumptions: response.assumptions,
                  missingInputs: response.missingInputs,
                }
              )
              setMessages((prev) => [...prev, summaryMsg])
            } else {
              // No structured client data — just show the message (e.g. asking for more info)
              const textMsg = createMessage('assistant', 'text', response.message)
              setMessages((prev) => [...prev, textMsg])
            }

            const portfolioData = buildPortfolioCard(response)
            if (portfolioData) {
              const portfolioMsg = createMessage(
                'assistant',
                'portfolio-card',
                response.message,
                { portfolioCard: portfolioData }
              )
              setMessages((prev) => [...prev, portfolioMsg])
            }

            // Fire callback to wire data into contexts
            options.onPlanGenerated?.(response)

            // Flag refinement on last assistant message (no system message)
            if (response.properties && response.properties.length > 0) {
              setMessages((prev) => {
                // Find the last assistant message index and create a new array with showRefinement set
                const lastIdx = prev.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).pop()
                if (lastIdx === undefined) return prev
                return prev.map((m, i) => i === lastIdx ? { ...m, showRefinement: true } : m)
              })
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
            // Get chart data context for a data-grounded explanation
            const chartContext = options.getChartContext?.(
              response.explanation?.question ?? userText,
              response.explanation?.relevantPeriods,
              response.explanation?.relevantProperties
            )

            if (chartContext) {
              // Make a follow-up call with chart data so Claude references real numbers
              try {
                const explResult = await supabase.functions.invoke('nl-parse', {
                  body: {
                    message: `[EXPLANATION REQUEST]\nOriginal question: "${userText}"\n\nHere is the actual calculated data from the engine. Reference ONLY these numbers in your explanation — never make up figures.\n\n${chartContext}\n\nNow explain in plain English, referencing the specific numbers above. Keep it concise (2-4 sentences). No hedging.`,
                    conversationHistory: [
                      ...conversationHistory,
                      { role: 'user', content: userText },
                    ],
                    currentPlan,
                    userId: options.userId,
                  },
                })

                if (explResult.data && !explResult.data.error) {
                  const explResponse = explResult.data as NLParseResponse
                  const explMsg = createMessage('assistant', 'text', explResponse.message, {
                    assumptions: explResponse.assumptions,
                  })
                  setMessages((prev) => [...prev, explMsg])

                  if (explResponse.followUpSuggestions?.length) {
                    setMessages((prev) => {
                      const updated = [...prev]
                      const last = [...updated].reverse().find((m) => m.role === 'assistant')
                      if (last) last.followUpSuggestions = explResponse.followUpSuggestions
                      return updated
                    })
                  }
                  options.onExplanation?.(explResponse)
                  break
                }
              } catch {
                // Fall through to basic response if follow-up call fails
              }
            }

            // Fallback: show Claude's initial classification message
            const explMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, explMsg])
            options.onExplanation?.(response)
            break
          }

          case 'comparison': {
            const compMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, compMsg])
            options.onComparison?.(response)
            break
          }

          case 'add_event': {
            const eventMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, eventMsg])
            options.onAddEvent?.(response)
            break
          }

          case 'property_suggestions': {
            // Show message + property suggestion cards as refinement options
            const suggestMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, suggestMsg])
            // Map property suggestions to refinement options format
            if (response.propertySuggestions?.length) {
              setMessages((prev) => {
                const updated = [...prev]
                const last = [...updated].reverse().find((m) => m.role === 'assistant')
                if (last) {
                  last.refinementOptions = response.propertySuggestions!.map(s => ({
                    label: `${s.label} — ${s.price}`,
                    prompt: s.prompt,
                  }))
                }
                return updated
              })
            }
            break
          }

          default: {
            // Fallback — just show the message
            const fallbackMsg = createMessage('assistant', 'text', response.message)
            setMessages((prev) => [...prev, fallbackMsg])
          }
        }

        // Add follow-up suggestions and refinement options if present
        if (response.followUpSuggestions?.length || response.refinementOptions?.length) {
          setMessages((prev) => {
            const updated = [...prev]
            const lastAssistant = [...updated].reverse().find((m) => m.role === 'assistant')
            if (lastAssistant) {
              if (response.followUpSuggestions?.length) {
                lastAssistant.followUpSuggestions = response.followUpSuggestions
              }
              if (response.refinementOptions?.length) {
                lastAssistant.refinementOptions = response.refinementOptions
              }
            }
            return updated
          })
        }
      } catch (err) {
        // Remove loading indicator
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id))

        // Map error types to friendly messages
        const errCode = err instanceof Error ? err.message : ''
        let friendlyMessage: string
        switch (errCode) {
          case 'TIMEOUT':
            friendlyMessage = 'That took too long — the AI is under heavy load. Try again in a moment.'
            break
          case 'RATE_LIMIT':
            friendlyMessage = 'Too many requests right now. Wait a few seconds and try again.'
            break
          case 'MALFORMED':
            friendlyMessage = 'Got a garbled response — try rephrasing that slightly differently.'
            break
          case 'OFFLINE':
            friendlyMessage = 'You appear to be offline. Check your connection and try again.'
            break
          default:
            friendlyMessage = 'Something went wrong — try rephrasing that.'
        }

        const errorMsg = createMessage('assistant', 'text', friendlyMessage)
        setMessages((prev) => [...prev, errorMsg])

        console.error('nl-parse error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, options, createMessage, buildSummaryCard, buildPortfolioCard]
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
   * Add a simple text message from the assistant (e.g. fix confirmations)
   */
  const addAssistantMessage = useCallback(
    (text: string) => {
      const msg = createMessage('assistant', 'text', text)
      setMessages((prev) => [...prev, msg])
    },
    [createMessage]
  )

  /**
   * Add a system pill message (e.g. "Plan updated")
   */
  const addSystemMessage = useCallback(
    (text: string) => {
      const msg = createMessage('system', 'text', text)
      setMessages((prev) => [...prev, msg])
    },
    [createMessage]
  )

  /**
   * Clear all messages (e.g. when starting a new scenario)
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    setIsLoading(false)
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
    addAssistantMessage,
    addSystemMessage,
    clearMessages,
    loadMessages,
  }
}

/**
 * useChatConversation - Step 1.14 of NL-PIVOT-PLAN.csv
 *
 * Manages chat state: message history, loading state, conversation context.
 * Handles sending messages to the nl-parse edge function, receiving
 * responses, maintaining conversation history for multi-turn context.
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { track, EVENTS } from '@/lib/analytics'
import { filterComplianceLanguage } from '@/utils/complianceFilter'
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
  /** Wires plan data into contexts (pre-check + auto-fix run inside). May
   *  return a corrected chat-message string when auto-fix changed the plan -
   *  the returned text replaces response.message so the chat never describes
   *  the pre-auto-fix plan. */
  onPlanGenerated?: (response: NLParseResponse) => string | void
  onModification?: (response: NLParseResponse) => void
  onExplanation?: (response: NLParseResponse) => void
  onComparison?: (response: NLParseResponse) => void
  onAddEvent?: (response: NLParseResponse) => void
  onUpdateProfile?: (response: NLParseResponse) => void
  getCurrentPlan?: () => CurrentPlanState | null
  /** Returns chart data context string for explanation requests */
  getChartContext?: (question: string, relevantPeriods?: number[], relevantProperties?: string[]) => string | null
  /** User ID for usage tracking */
  userId?: string
  /** Client name for personalised loading text */
  clientName?: string
  /** Strategy preset - drives chatbot cell selection and property sequencing. */
  strategyPreset?: 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition' | 'eg-to-cf'
  /** Selected company strategy text, injected into the AI prompt. When set
   *  (the strategy picked via the pills), it overrides the default; otherwise
   *  we fall back to the firm's first saved strategy. */
  strategyProfileText?: string
  /** True when a plan already exists - used to reject misclassified initial_plan rebuilds. */
  hasExistingPlan?: boolean
  /** When true, force currentPlan to null on the next sendMessage call.
   *  Used by pending-prompt (home page → dashboard) to prevent stale plan state
   *  from causing the AI to misroute a fresh client brief as update_profile. */
  forceNewPlan?: boolean
}

interface ConversationAction {
  turn: number;
  type: string;
  summary: string;
}

function buildActionSummary(response: NLParseResponse, userText: string): string {
  switch (response.type) {
    case 'initial_plan': {
      const n = response.properties?.length ?? 0;
      const preset = response.strategyPreset ?? 'eg-low';
      const names = response.clientProfile?.members?.map(m => m.name).filter(Boolean).join(' & ');
      return `Created ${n}-property plan (${preset})${names ? ` for ${names}` : ''}`;
    }
    case 'modification': {
      const t = response.modification?.target ?? 'unknown';
      return `Modified ${t}`;
    }
    case 'update_profile': {
      const fields = response.profileUpdates
        ? Object.keys(response.profileUpdates).filter(k => (response.profileUpdates as any)[k] != null)
        : [];
      return `Updated profile: ${fields.join(', ') || 'fields'}`;
    }
    case 'explanation':
      return `Answered question: "${userText.slice(0, 60)}"`;
    case 'add_event':
      return `Added event: ${response.event?.type ?? 'unknown'}`;
    case 'property_suggestions':
      return `Suggested properties for: "${userText.slice(0, 50)}"`;
    default:
      return `Responded to: "${userText.slice(0, 50)}"`;
  }
}

function formatConversationSummary(actions: ConversationAction[]): string {
  if (actions.length === 0) return '';
  return actions.map(a => `Turn ${a.turn}: ${a.summary}`).join('\n');
}

export function useChatConversation(options: UseChatConversationOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messageIdCounter = useRef(0)
  const actionLog = useRef<ConversationAction[]>([])
  const turnCounter = useRef(0)

  // Mirror options into a ref so post-response logic (downgrade guard,
  // strategy-switch detection) reads the LATEST values rather than the
  // stale snapshot baked into sendMessage's closure. Without this, a
  // pending-prompt fired right after a Home-flow client switch sees the
  // PREVIOUS client's hasExistingPlan/strategyPreset, because
  // loadClientScenario hasn't yet reset propertyOrder/scenarioId by the
  // time sendMessage's options were captured.
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Same trick for messages - the pending-prompt handler does
  // clearMessages() → setTimeout(sendMessage, 50). The setTimeout
  // captures sendMessage from the render BEFORE clearMessages landed,
  // so conversationHistory built from messages-via-closure leaks the
  // previous client's chat into the new client's request. The AI then
  // sees "previous chat → new prompt" and classifies as modification
  // instead of initial_plan (cofounder report 2026-05-06: 3rd home-flow
  // launch in a row returned "Updated the profile" instead of building
  // a fresh plan).
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // And for isLoading - the early-return guard reads this. Without a
  // ref a captured sendMessage from a stale render could re-fire after
  // a real send had already started, slipping past the guard and
  // duplicating the user message + AI request.
  const isLoadingRef = useRef(isLoading)
  isLoadingRef.current = isLoading

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
    async (userText: string, presetOverride?: string, forceFreshPlan?: boolean) => {
      if (!userText.trim() || isLoadingRef.current) {
        return
      }

      // Add user message
      const userMsg = createMessage('user', 'text', userText.trim())
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      // Add loading indicator with personalised text
      const loadingText = optionsRef.current.clientName
        ? `Mapping ${optionsRef.current.clientName}'s portfolio path...`
        : 'Running the numbers...'
      const loadingMsg = createMessage('assistant', 'loading', loadingText)
      setMessages((prev) => [...prev, loadingMsg])

      // Minimum-display floor for the loading indicator. On warm edge function
      // calls the response can come back in <1s, faster than the loading-step
      // timers (1500/2500ms). Without this floor, users only ever see the
      // loader on a cold first call. 600ms is enough to register visually
      // without feeling sluggish on genuinely fast responses.
      //
      // Removal and answer-append happen in ONE state update: the loading
      // steps must stay visible right up until the reply renders. Removing
      // early left a blank gap while slower branches (e.g. the explanation
      // follow-up call below) were still working - users read the empty
      // screen as a glitch (founder report 2026-07-18).
      const loadingStartedAt = Date.now()
      const MIN_LOADING_MS = 600
      const finishLoading = async (msg?: ChatMessage) => {
        const elapsed = Date.now() - loadingStartedAt
        if (elapsed < MIN_LOADING_MS) {
          await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed))
        }
        setMessages((prev) => {
          const rest = prev.filter((m) => m.id !== loadingMsg.id)
          return msg ? [...rest, msg] : rest
        })
      }

      try {
        // Get current plan state for context. Read from the ref so the AI
        // request payload reflects the LATEST in-memory plan - not whatever
        // was captured when sendMessage was first created. The captured
        // version may have closed over a previous client's propertyOrder/
        // profile if sendMessage was scheduled (via pending-prompt
        // setTimeout) before loadClientScenario reset state for the new
        // client. Sending a stale currentPlan was causing the AI to
        // classify fresh prompts as modifications of the previous client.
        // If forceNewPlan is set (pending-prompt from home page), send null
        // to guarantee the AI creates a new plan instead of updating stale state.
        const currentPlan = (optionsRef.current.forceNewPlan || forceFreshPlan)
          ? null
          : (optionsRef.current.getCurrentPlan?.() ?? null)

        // Build conversation history (text messages only, for context).
        // Sliding window: keep only the last 20 entries (~10 user/assistant turns).
        // Prevents context-window blow-up on long threads - older messages stay in
        // the UI but get dropped from the LLM payload. Recent context is what
        // matters for follow-up coherence; older turns rarely change the answer.
        const HISTORY_WINDOW = 20
        const conversationHistory = messagesRef.current
          .filter((m) => m.role !== 'system' && m.type === 'text')
          .slice(-HISTORY_WINDOW)
          .map((m) => ({ role: m.role, content: m.content }))

        const conversationSummary = formatConversationSummary(actionLog.current)

        // Call the edge function with timeout + exponential-backoff retry on
        // transient errors (TIMEOUT, RATE_LIMIT). Permanent errors
        // surface immediately.
        //
        // 60s (not 30s): the FIRST call for a long/complex brief pays cold
        // edge-function start + a cold prompt-cache write on top of the Claude
        // generation, which routinely pushed past 30s and dumped the user back
        // to "send it again" with a blank dashboard. A warm resend was fast -
        // the classic cold-start timeout. 60s lets the cold path finish, and
        // the TIMEOUT retry below still auto-recovers on the (now warm) path
        // without the user resending.
        const NL_PARSE_TIMEOUT_MS = 60_000
        // Retry budget per error class. First attempt is always free; the
        // numbers below are how many ADDITIONAL retries we allow.
        const MAX_RETRIES_BY_CODE: Record<string, number> = {
          RATE_LIMIT: 2,  // Anthropic rate-limit windows are short; backoff buys recovery time
          TIMEOUT: 1,     // Claude/edge slow; try once more, don't pile on
          _default: 1,    // Generic edge function errors (500s) - one retry
        }
        // Base delays in ms before each retry (index = retry attempt number).
        // Add jitter to break up thundering-herd patterns when many users
        // retry at the same moment after a shared rate-limit event.
        const RETRY_BASE_DELAYS_MS = [400, 1500, 3500]
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

        // Fetch planning defaults and the active company strategy for this user.
        // The strategy text comes from the explicitly-selected strategy when one
        // was passed in (the pills); otherwise default to the firm's first saved
        // strategy.
        let planningDefaults: Record<string, unknown> | null = null
        let strategyProfileText: string | null = optionsRef.current.strategyProfileText?.trim() || null
        const userId = optionsRef.current.userId
        if (userId) {
          const { data } = await supabase
            .from('profiles')
            .select('planning_defaults, strategy_profiles')
            .eq('id', userId)
            .single()
          planningDefaults = (data?.planning_defaults as Record<string, unknown>) ?? null
          if (!strategyProfileText) {
            const profiles = (data as Record<string, unknown>)?.strategy_profiles
            const first = Array.isArray(profiles) ? (profiles[0] as { text?: string } | undefined) : undefined
            strategyProfileText = (first?.text as string)?.trim() || null
          }
        }

        const callOnce = async (): Promise<NLParseResponse> => {
          const invokePromise = supabase.functions.invoke('nl-parse', {
            body: {
              message: userText.trim(),
              conversationHistory,
              conversationSummary: conversationSummary || undefined,
              currentPlan,
              userId,
              strategyPreset: presetOverride || optionsRef.current.strategyPreset || 'eg-low',
              planningDefaults: planningDefaults || undefined,
              strategyProfileText: strategyProfileText || undefined,
            },
          })

          // Race the invoke against a hard client-side timeout. Without this
          // the user can wait indefinitely if the edge function hangs (Supabase
          // doesn't surface a timely error in that case).
          let timeoutHandle: ReturnType<typeof setTimeout> | undefined
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error('TIMEOUT')),
              NL_PARSE_TIMEOUT_MS,
            )
          })

          let result: Awaited<typeof invokePromise>
          try {
            result = await Promise.race([invokePromise, timeoutPromise])
          } finally {
            if (timeoutHandle) clearTimeout(timeoutHandle)
          }

          if (result.error) {
            const msg = result.error.message || ''
            // Try to extract the actual error from the response body
            const bodyError = result.data?.error || ''
            const fullMsg = bodyError || msg
            console.warn('[nl-parse] edge function error:', { msg, bodyError, status: result.error.status })
            if (fullMsg.includes('timeout') || fullMsg.includes('TIMEOUT') || fullMsg.includes('504')) {
              throw new Error('TIMEOUT')
            }
            if (fullMsg.includes('rate') || fullMsg.includes('429') || fullMsg.includes('too many')) {
              throw new Error('RATE_LIMIT')
            }
            throw new Error(fullMsg || 'Failed to reach PropPath AI')
          }

          if (!result.data || result.data.error) {
            const errMsg = result.data?.error || ''
            throw new Error(errMsg || 'Invalid response from PropPath AI')
          }

          return result.data as NLParseResponse
        }

        const callWithRetry = async (): Promise<NLParseResponse> => {
          let attempt = 0
          while (true) {
            try {
              return await callOnce()
            } catch (err) {
              const code = err instanceof Error ? err.message : ''
              const budget = MAX_RETRIES_BY_CODE[code] ?? MAX_RETRIES_BY_CODE._default ?? 0
              if (attempt >= budget) {
                throw err
              }
              const baseDelay = RETRY_BASE_DELAYS_MS[attempt] ?? 3500
              const jitter = Math.floor(Math.random() * 250)
              console.warn(
                `[nl-parse] ${code} on attempt ${attempt + 1}, retrying in ${baseDelay + jitter}ms`,
              )
              await sleep(baseDelay + jitter)
              attempt += 1
            }
          }
        }

        let data: NLParseResponse
        try {
          data = await callWithRetry()
        } catch (err) {
          // Convert OFFLINE last so we don't override more specific codes
          if (!navigator.onLine) {
            throw new Error('OFFLINE')
          }
          throw err
        }

        const response = data
        if (response.message) {
          response.message = filterComplianceLanguage(response.message)
        }

        // NOTE: the loading indicator is NOT removed here - each branch below
        // swaps it for its reply via finishLoading(msg), so the steps hold
        // until the answer is actually on screen.

        // The pipeline classifier handles intent routing server-side.
        // Minimal client-side guards remain for edge cases:
        // 1. Comparison responses are still downgraded (product decision).
        // 2. initial_plan while plan exists is allowed ONLY for strategy switches.
        let effectiveType: NLParseResponse['type'] = response.type
        const liveHasExistingPlan = optionsRef.current.hasExistingPlan
        const liveStrategyPreset = optionsRef.current.strategyPreset

        if (liveHasExistingPlan && response.type === 'initial_plan') {
          const isStrategySwitch =
            !!response.strategyPreset &&
            response.strategyPreset !== liveStrategyPreset
          if (!isStrategySwitch) {
            console.warn('[nl-parse] initial_plan returned while plan exists (not a strategy switch) - treating as explanation.')
            effectiveType = 'explanation'
          }
        }
        if (response.type === 'comparison') {
          console.warn('[nl-parse] comparison response intercepted - treating as explanation.')
          effectiveType = 'explanation'
        }

        // Process response based on type
        switch (effectiveType) {
          case 'initial_plan': {
            // Wire data into contexts FIRST - the handler runs the
            // affordability pre-check + auto-fix and may return a corrected
            // message reflecting the POST-auto-fix plan. The server-templated
            // response.message describes the plan BEFORE auto-fix, so posting
            // it unconditionally could claim "4-property plan $380k-$750k"
            // while auto-fix changed or emptied it (Ella bug 315).
            const correctedMessage = optionsRef.current.onPlanGenerated?.(response)
            if (typeof correctedMessage === 'string' && correctedMessage.length > 0) {
              response.message = correctedMessage
            }

            // Show AI narrative as plain text
            const planMsg = createMessage('assistant', 'text', response.message)
            await finishLoading(planMsg)

            track(EVENTS.planGenerated, {
              property_count: Array.isArray(response.properties) ? response.properties.length : undefined,
            })
            break
          }

          case 'modification': {
            const modMsg = createMessage('assistant', 'text', response.message)
            await finishLoading(modMsg)
            optionsRef.current.onModification?.(response)
            break
          }

          case 'explanation': {
            const wasDowngradedFromPlan = response.type === 'initial_plan'
            const wasDowngradedFromComparison = response.type === 'comparison'
            const wasDowngraded = wasDowngradedFromPlan || wasDowngradedFromComparison
            // Skip the chart-context enrichment for explanations that aren't
            // anchored to specific periods or properties. Questions like "what
            // if rates rise 2%?" or "model selling property 1" have no period
            // to look up - the follow-up just re-asks the AI the same question
            // and yields a near-duplicate response, producing a visible double-
            // message UX with a long loading state between them (founder
            // report 2026-05-05, B4). Skip if no period/property anchors AND
            // not a downgraded-rebuild fallback.
            const hasAnchors = !!(
              response.explanation?.relevantPeriods?.length ||
              response.explanation?.relevantProperties?.length ||
              response.explanation?.relevantPeriod
            )
            // Get chart data context for a data-grounded explanation
            const chartContext = hasAnchors
              ? optionsRef.current.getChartContext?.(
                  response.explanation?.question ?? userText,
                  response.explanation?.relevantPeriods,
                  response.explanation?.relevantProperties
                )
              : null

            if (chartContext) {
              // Make a follow-up call with chart data so Claude references real numbers
              try {
                const explResult = await supabase.functions.invoke('nl-parse', {
                  body: {
                    message: `[EXPLANATION REQUEST]\nOriginal question: "${userText}"\n\nHere is the actual calculated data from the engine. Reference ONLY these numbers in your explanation - never make up figures.\n\n${chartContext}\n\nNow explain in plain English, referencing the specific numbers above. Keep it concise (2-4 sentences). No hedging. Do not return a new plan or a properties array - respond only with the explanation message.`,
                    conversationHistory: [
                      ...conversationHistory,
                      { role: 'user', content: userText },
                    ],
                    currentPlan,
                    userId: optionsRef.current.userId,
                  },
                })

                if (explResult.data && !explResult.data.error) {
                  const explResponse = explResult.data as NLParseResponse
                  const explMsg = createMessage('assistant', 'text', explResponse.message, {
                    assumptions: explResponse.assumptions,
                  })
                  await finishLoading(explMsg)

                  optionsRef.current.onExplanation?.(explResponse)
                  break
                }
              } catch {
                // Fall through to basic response if follow-up call fails
              }
            }

            // Fallback: show Claude's initial classification message - but if we
            // downgraded from a misclassified initial_plan, the message talks
            // about "Built a 4-property portfolio..." which doesn't answer the
            // question. Ask for clarification instead of a dead-end sorry.
            const fallbackText = wasDowngradedFromPlan
              ? "To start a new client, clear the current plan first using the Reset button."
              : response.message
            const explMsg = createMessage('assistant', 'text', fallbackText)
            await finishLoading(explMsg)
            if (!wasDowngraded) optionsRef.current.onExplanation?.(response)
            break
          }

          case 'comparison': {
            const compMsg = createMessage('assistant', 'text', response.message)
            await finishLoading(compMsg)
            optionsRef.current.onComparison?.(response)
            break
          }

          case 'add_event': {
            const eventMsg = createMessage('assistant', 'text', response.message)
            await finishLoading(eventMsg)
            optionsRef.current.onAddEvent?.(response)
            break
          }

          case 'update_profile': {
            const updateMsg = createMessage('assistant', 'text', response.message)
            await finishLoading(updateMsg)
            optionsRef.current.onUpdateProfile?.(response)
            break
          }

          case 'property_suggestions': {
            const suggestMsg = createMessage('assistant', 'text', response.message)
            await finishLoading(suggestMsg)
            break
          }

          default: {
            // Fallback - just show the message
            const fallbackMsg = createMessage('assistant', 'text', response.message)
            await finishLoading(fallbackMsg)
          }
        }

        // Record action for conversation state tracking
        turnCounter.current += 1
        actionLog.current = [
          ...actionLog.current.slice(-9),
          {
            turn: turnCounter.current,
            type: effectiveType,
            summary: buildActionSummary(response, userText),
          },
        ]

      } catch (err) {
        // Map error types to friendly messages
        const errCode = err instanceof Error ? err.message : ''
        let friendlyMessage: string
        switch (errCode) {
          case 'TIMEOUT':
            friendlyMessage = 'That took a bit long. Send it again and it should go through.'
            break
          case 'RATE_LIMIT':
            friendlyMessage = 'Busy right now - give it a few seconds then resend.'
            break
          case 'OFFLINE':
            friendlyMessage = "Can't reach the server. Check your connection and resend."
            break
          default:
            friendlyMessage = 'Didn\'t go through - try sending that again.'
        }

        // Swap the loading indicator for the error in one update (respects
        // the minimum-display floor).
        const errorMsg = createMessage('assistant', 'text', friendlyMessage)
        await finishLoading(errorMsg)

        console.error('[nl-parse] error after retries:', errCode, err)
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
    actionLog.current = []
    turnCounter.current = 0
  }, [])

  /**
   * Load messages from saved scenario
   */
  const loadMessages = useCallback((savedMessages: ChatMessage[]) => {
    // Resume the ID counter PAST the highest existing id so new messages can't
    // reuse a loaded one. IDs look like `msg-<n>`, but they're sparse: transient
    // loading messages consume counter values yet get filtered out before
    // persistence (see ChatPanel). So savedMessages.length underestimates the
    // real max - seeding the counter with it made the next message reuse an
    // existing id (msg-31 etc.), which React rejects as a duplicate key. Parse
    // the numeric suffixes and continue from the true maximum instead.
    let maxId = savedMessages.reduce((max, m) => {
      const match = /^msg-(\d+)$/.exec(m.id)
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)

    // Heal any duplicate ids already baked into a saved chat by the old
    // length-based seeding bug: re-key the second-and-later occurrence of each
    // id with a fresh one so the loaded list is collision-free too.
    const seen = new Set<string>()
    const deduped = savedMessages.map((m) => {
      if (!seen.has(m.id)) {
        seen.add(m.id)
        return m
      }
      maxId += 1
      const newId = `msg-${maxId}`
      seen.add(newId)
      return { ...m, id: newId }
    })

    setMessages(deduped)
    messageIdCounter.current = maxId
  }, [])

  const setMessageFeedback = useCallback((messageId: string, rating: -1 | 1) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
    )
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
    setMessageFeedback,
  }
}

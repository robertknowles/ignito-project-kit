/**
 * useChatConversation — Step 1.14 of NL-PIVOT-PLAN.csv
 *
 * Manages chat state: message history, loading state, conversation context.
 * Handles sending messages to the nl-parse edge function, receiving
 * responses, maintaining conversation history for multi-turn context.
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
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
  /** Strategy preset — drives chatbot cell selection and property sequencing. */
  strategyPreset?: 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition'
  /** True when a plan already exists — used to reject misclassified initial_plan rebuilds. */
  hasExistingPlan?: boolean
}

export function useChatConversation(options: UseChatConversationOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messageIdCounter = useRef(0)

  // Mirror options into a ref so post-response logic (downgrade guard,
  // strategy-switch detection) reads the LATEST values rather than the
  // stale snapshot baked into sendMessage's closure. Without this, a
  // pending-prompt fired right after a Home-flow client switch sees the
  // PREVIOUS client's hasExistingPlan/strategyPreset, because
  // loadClientScenario hasn't yet reset propertyOrder/scenarioId by the
  // time sendMessage's options were captured.
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Same trick for messages — the pending-prompt handler does
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

  // And for isLoading — the early-return guard reads this. Without a
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
    async (userText: string) => {
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
      const loadingStartedAt = Date.now()
      const MIN_LOADING_MS = 600
      const removeLoading = async () => {
        const elapsed = Date.now() - loadingStartedAt
        if (elapsed < MIN_LOADING_MS) {
          await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed))
        }
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id))
      }

      try {
        // Get current plan state for context. Read from the ref so the AI
        // request payload reflects the LATEST in-memory plan — not whatever
        // was captured when sendMessage was first created. The captured
        // version may have closed over a previous client's propertyOrder/
        // profile if sendMessage was scheduled (via pending-prompt
        // setTimeout) before loadClientScenario reset state for the new
        // client. Sending a stale currentPlan was causing the AI to
        // classify fresh prompts as modifications of the previous client.
        const currentPlan = optionsRef.current.getCurrentPlan?.() ?? null

        // Build conversation history (text messages only, for context).
        // Sliding window: keep only the last 20 entries (~10 user/assistant turns).
        // Prevents context-window blow-up on long threads — older messages stay in
        // the UI but get dropped from the LLM payload. Recent context is what
        // matters for follow-up coherence; older turns rarely change the answer.
        const HISTORY_WINDOW = 20
        const conversationHistory = messagesRef.current
          .filter((m) => m.role !== 'system' && m.type === 'text')
          .slice(-HISTORY_WINDOW)
          .map((m) => ({ role: m.role, content: m.content }))

        // Call the edge function with timeout + exponential-backoff retry on
        // transient errors (TIMEOUT, RATE_LIMIT, MALFORMED). Permanent errors
        // surface immediately. Total max wall time ≈ 65s under the worst case.
        const NL_PARSE_TIMEOUT_MS = 30_000
        // Retry budget per error class. First attempt is always free; the
        // numbers below are how many ADDITIONAL retries we allow.
        const MAX_RETRIES_BY_CODE: Record<string, number> = {
          MALFORMED: 1,   // Claude occasionally returns bad JSON; one retry usually fixes it
          RATE_LIMIT: 2,  // Anthropic rate-limit windows are short; backoff buys recovery time
          TIMEOUT: 1,     // Claude/edge slow; try once more, don't pile on
          _default: 1,    // Generic edge function errors (500s, JSON parse) — one retry
        }
        // Base delays in ms before each retry (index = retry attempt number).
        // Add jitter to break up thundering-herd patterns when many users
        // retry at the same moment after a shared rate-limit event.
        const RETRY_BASE_DELAYS_MS = [400, 1500, 3500]
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

        const callOnce = async (): Promise<NLParseResponse> => {
          const invokePromise = supabase.functions.invoke('nl-parse', {
            body: {
              message: userText.trim(),
              conversationHistory,
              currentPlan,
              userId: optionsRef.current.userId,
              strategyPreset: optionsRef.current.strategyPreset || 'eg-low',
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
            if (errMsg.includes('parse') || errMsg.includes('JSON')) {
              throw new Error('MALFORMED')
            }
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

        // Remove loading indicator (respects minimum-display floor)
        await removeLoading()

        // Guard: if a plan already exists but the model returned initial_plan,
        // the model misclassified a follow-up question as a rebuild. Downgrade
        // to a plain text message so the dashboard isn't destroyed.
        //
        // EXCEPTION: strategy switches are the one legitimate initial_plan
        // rebuild while a plan exists (per system prompt's "Strategy Switches
        // Mid-Conversation" section). Detect by strategyPreset mismatch — if
        // the AI returned a different preset than is currently active, the
        // user explicitly asked to switch strategies and the rebuild is
        // intended. Without this exception, "switch to cash flow" was being
        // silently downgraded to an explanation, the AI's confident "Built a
        // 5-property yield-focused portfolio…" message landed but the
        // dashboard was never rebuilt (founder report 2026-05-05, B2 fail).
        //
        // Also downgrade `comparison` responses — the scenario comparison
        // fork is disabled by product decision; "what if" questions should
        // get a written answer, not a forked scenario.
        let effectiveType: NLParseResponse['type'] = response.type
        // Read these from the ref — closure-captured values are stale when
        // sendMessage was scheduled before a client switch settled.
        const liveHasExistingPlan = optionsRef.current.hasExistingPlan
        const liveStrategyPreset = optionsRef.current.strategyPreset
        if (liveHasExistingPlan && response.type === 'initial_plan') {
          const isStrategySwitch =
            !!response.strategyPreset &&
            response.strategyPreset !== liveStrategyPreset

          if (isStrategySwitch) {
            console.info(`[nl-parse] strategy switch detected: ${liveStrategyPreset} → ${response.strategyPreset}`)
          } else {
            // Check if the user was trying to ADD a property — if so, re-route
            // to modification instead of blocking. The AI misclassifies add
            // requests as initial_plan when it includes properties.
            const addKeywords = /\b(add|another|one more|more propert|extra|squeeze|fifth|sixth|5th|6th)\b/i
            if (addKeywords.test(userText) && response.properties?.length) {
              console.info(`[nl-parse] re-routing initial_plan as add-property modification (${response.properties.length} properties)`)
              response.modification = { target: 'portfolio', action: 'add', params: {} }
              effectiveType = 'modification'
            } else {
              console.warn('[nl-parse] initial_plan returned while a plan exists — blocking rebuild, treating as explanation.')
              effectiveType = 'explanation'
            }
          }
        }
        if (response.type === 'comparison') {
          console.warn('[nl-parse] comparison response intercepted — treating as explanation.')
          effectiveType = 'explanation'
        }
        // Rescue: AI returned "modification" for a strategy switch instead of
        // "initial_plan". Two layers:
        // 1. If the response includes strategyPreset + properties, re-route.
        // 2. Keyword fallback: if the user's message matches a strategy switch
        //    pattern but the AI returned modification (often with no preset or
        //    properties at all), infer the target preset from keywords and
        //    re-fire as initial_plan. Without this the AI confidently says
        //    "Switching to cash flow…" but the dashboard never updates.
        const STRATEGY_KEYWORDS: Record<string, typeof liveStrategyPreset> = {
          'cash flow': 'cf-low',
          'cashflow': 'cf-low',
          'cf low': 'cf-low',
          'cf high': 'cf-high',
          'equity growth low': 'eg-low',
          'equity growth high': 'eg-high',
          'equity growth': 'eg-low',
          'commercial transition': 'commercial-transition',
          'commercial': 'commercial-transition',
        }
        if (
          response.type === 'modification' &&
          response.strategyPreset &&
          response.strategyPreset !== liveStrategyPreset &&
          response.properties &&
          response.properties.length > 0
        ) {
          console.info(`[nl-parse] rescuing misclassified strategy switch: ${liveStrategyPreset} → ${response.strategyPreset}`)
          effectiveType = 'initial_plan'
        } else if (
          response.type === 'modification' &&
          liveHasExistingPlan
        ) {
          const lower = userText.trim().toLowerCase()
          const isSwitchRequest = lower.startsWith('switch to') || lower.startsWith('try ') || lower.startsWith('swap to') || lower.startsWith('change strategy') || lower.startsWith('change preset') || lower.startsWith('go ')
          if (isSwitchRequest) {
            const matchedPreset = Object.entries(STRATEGY_KEYWORDS).find(
              ([kw]) => lower.includes(kw)
            )
            if (matchedPreset && matchedPreset[1] !== liveStrategyPreset) {
              const targetPreset = matchedPreset[1]!
              console.info(`[nl-parse] keyword-rescue strategy switch: "${userText}" → ${targetPreset}`)

              if (response.properties && response.properties.length > 0) {
                response.strategyPreset = targetPreset as any
                effectiveType = 'initial_plan'
              } else {
                // AI returned modification with no properties — re-send with
                // explicit instruction to generate a full plan for the new preset.
                // Send currentPlan: null so the system prompt uses initial-plan
                // mode (the follow-up rules block says "NEVER return initial_plan"
                // which fights our explicit instruction). Inline the client details
                // in the message so the AI knows who the plan is for.
                try {
                  const clientInfo = currentPlan
                    ? `Client: ${currentPlan.clientNames.join(' & ') || 'Unknown'}. Income: $${currentPlan.investmentProfile.baseSalary.toLocaleString()}. Deposit: $${currentPlan.investmentProfile.depositPool.toLocaleString()}. Annual savings: $${currentPlan.investmentProfile.annualSavings.toLocaleString()}. Timeline: ${currentPlan.investmentProfile.timelineYears} years.`
                    : userText
                  const retryResult = await supabase.functions.invoke('nl-parse', {
                    body: {
                      message: `${clientInfo}\n\nUse the ${targetPreset} strategy preset.`,
                      conversationHistory: [],
                      currentPlan: null,
                      userId: optionsRef.current.userId,
                      strategyPreset: targetPreset,
                    },
                  })
                  if (retryResult.data && !retryResult.data.error && retryResult.data.properties?.length > 0) {
                    console.info(`[nl-parse] strategy switch retry succeeded with ${retryResult.data.properties.length} properties`)
                    Object.assign(response, retryResult.data)
                    response.strategyPreset = targetPreset as any
                    effectiveType = 'initial_plan'
                  } else {
                    console.warn('[nl-parse] strategy switch retry failed — showing explanation')
                    response.message = `I tried to switch to ${matchedPreset[0]} but couldn't generate the new plan. Try again, or use the strategy selector on the dashboard.`
                    effectiveType = 'explanation'
                  }
                } catch (err) {
                  console.error('[nl-parse] strategy switch retry error:', err)
                  response.message = `I tried to switch to ${matchedPreset[0]} but hit an error. Try again, or use the strategy selector on the dashboard.`
                  effectiveType = 'explanation'
                }
              }
            }
          }
        }

        // Process response based on type
        switch (effectiveType) {
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
                }
              )
              setMessages((prev) => [...prev, summaryMsg])
            } else {
              // No structured client data — just show the message (e.g. asking for more info)
              const textMsg = createMessage('assistant', 'text', response.message)
              setMessages((prev) => [...prev, textMsg])
            }

            // Standalone accuracy nudge — prompt the BA to share missing inputs
            if (response.missingInputs && response.missingInputs.length > 0) {
              const nudgeMsg = createMessage(
                'assistant',
                'text',
                '',
                { missingInputs: response.missingInputs }
              )
              setMessages((prev) => [...prev, nudgeMsg])
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
            optionsRef.current.onPlanGenerated?.(response)

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
            // to look up — the follow-up just re-asks the AI the same question
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
                    message: `[EXPLANATION REQUEST]\nOriginal question: "${userText}"\n\nHere is the actual calculated data from the engine. Reference ONLY these numbers in your explanation — never make up figures.\n\n${chartContext}\n\nNow explain in plain English, referencing the specific numbers above. Keep it concise (2-4 sentences). No hedging. Do not return a new plan or a properties array — respond only with the explanation message.`,
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
                  setMessages((prev) => [...prev, explMsg])

                  if (explResponse.followUpSuggestions?.length) {
                    setMessages((prev) => {
                      const updated = [...prev]
                      const last = [...updated].reverse().find((m) => m.role === 'assistant')
                      if (last) last.followUpSuggestions = explResponse.followUpSuggestions
                      return updated
                    })
                  }
                  optionsRef.current.onExplanation?.(explResponse)
                  break
                }
              } catch {
                // Fall through to basic response if follow-up call fails
              }
            }

            // Fallback: show Claude's initial classification message — but if we
            // downgraded from a misclassified initial_plan, the message talks
            // about "Built a 4-property portfolio..." which doesn't answer the
            // question. Ask for clarification instead of a dead-end sorry.
            const fallbackText = wasDowngradedFromPlan
              ? "That looks like a new client — clear the current plan first and I'll build a fresh one."
              : response.message
            const explMsg = createMessage('assistant', 'text', fallbackText, {
              assumptions: wasDowngraded ? undefined : response.assumptions,
            })
            setMessages((prev) => [...prev, explMsg])
            if (!wasDowngraded) optionsRef.current.onExplanation?.(response)
            break
          }

          case 'comparison': {
            const compMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, compMsg])
            optionsRef.current.onComparison?.(response)
            break
          }

          case 'add_event': {
            const eventMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, eventMsg])
            optionsRef.current.onAddEvent?.(response)
            break
          }

          case 'property_suggestions': {
            // Show message + property suggestion cards as refinement options
            const suggestMsg = createMessage('assistant', 'text', response.message, {
              assumptions: response.assumptions,
            })
            setMessages((prev) => [...prev, suggestMsg])
            // Map property suggestions to refinement options format
            // Build refinement option buttons from propertySuggestions or
            // fall back to properties array (AI often populates one but not
            // the other — without this fallback the user sees "here are 4
            // options" with no buttons to click).
            const suggestions = response.propertySuggestions?.length
              ? response.propertySuggestions.map(s => ({
                  label: `${s.label} — ${s.price}`,
                  prompt: s.prompt,
                }))
              : response.properties?.length
                ? response.properties.map((p, i) => {
                    const typeLabel = p.type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    const priceK = `$${(p.purchasePrice / 1000).toFixed(0)}k`
                    return {
                      label: `${typeLabel} in ${p.state} — ${priceK}`,
                      prompt: `Add a ${p.type} in ${p.state} at $${p.purchasePrice.toLocaleString()}`,
                    }
                  })
                : null
            if (suggestions?.length) {
              setMessages((prev) => {
                const updated = [...prev]
                const last = [...updated].reverse().find((m) => m.role === 'assistant')
                if (last) {
                  last.refinementOptions = suggestions
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
        // Remove loading indicator (respects minimum-display floor)
        await removeLoading()

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
            friendlyMessage = 'Something went wrong — try sending that again.'
        }

        const errorMsg = createMessage('assistant', 'text', friendlyMessage)
        setMessages((prev) => [...prev, errorMsg])

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

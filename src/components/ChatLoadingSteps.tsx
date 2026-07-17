/**
 * ChatLoadingSteps - Phase 2 of the loading experience
 *
 * Displays sequential progress steps in the chat panel while the assistant
 * works. The steps are timer-driven approximations (there's no true progress
 * signal from the edge function - see ChatPanel), so the copy needs to at least
 * read *honestly* for whatever was asked. A plan build, a numbers question
 * ("what does it cost to hold my portfolio?") and a general question ("are you
 * factoring in the budget changes?") are very different asks - showing
 * "Running affordability checks" for the last two is misleading. So we classify
 * the user's message into one of three variants and show steps that fit.
 *
 * Each step shows a spinner while active, then a checkmark when complete.
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2Icon, CheckIcon } from 'lucide-react'

interface LoadingStep {
  label: string
  status: 'pending' | 'active' | 'complete'
}

/** Which kind of request the loading steps should describe. */
export type LoadingVariant = 'plan' | 'analysis' | 'general'

/**
 * Guess the variant from the user's message. This only drives loading copy, so
 * a wrong guess is harmless - it just shows slightly less specific step labels.
 * Keep it simple and readable rather than clever. Order matters: 'plan' wins
 * over 'analysis' when both match (building a plan implies running the numbers).
 */
export function classifyLoadingVariant(userText: string): LoadingVariant {
  const t = userText.toLowerCase()

  // Building / modelling a roadmap or scenario from a brief.
  const planSignals = [
    'build', 'create', 'generate', 'model', 'roadmap', 'plan', 'scenario',
    'borrowing capacity', 'want to achieve', 'goal of', 'add another property',
  ]
  // Questions about the numbers on the existing portfolio.
  const analysisSignals = [
    'cost', 'hold', 'cashflow', 'cash flow', 'expense', 'tax', 'equity',
    'yield', 'return', 'how much', 'breakdown', 'repayment', 'interest',
    'rent', 'income', 'value', 'over the next', 'per year', 'annual', 'ongoing',
  ]

  if (planSignals.some((s) => t.includes(s))) return 'plan'
  if (analysisSignals.some((s) => t.includes(s))) return 'analysis'
  return 'general'
}

/**
 * Step labels per variant. Always three steps so the timer progression in
 * ChatPanel (step 0 → 1 → 2) lines up and the final step holds a spinner until
 * the response lands. The first step is personalised with the client's name.
 */
function stepLabels(variant: LoadingVariant, clientName?: string): string[] {
  const who = clientName ? `${clientName}'s` : 'the'
  switch (variant) {
    case 'plan':
      return [
        clientName ? `Reading ${clientName}'s profile` : 'Reading the profile',
        'Selecting properties',
        'Running affordability checks',
      ]
    case 'analysis':
      return [
        `Reading ${who} portfolio`,
        'Pulling the figures',
        'Crunching the numbers',
      ]
    case 'general':
    default:
      return [
        `Reading ${who} portfolio`,
        'Reviewing the details',
        'Preparing your answer',
      ]
  }
}

interface ChatLoadingStepsProps {
  clientName?: string
  /** What kind of request this is, so the step copy fits. Defaults to 'plan'. */
  variant?: LoadingVariant
  /** Which step is currently active (0-indexed) */
  activeStep: number
  /** Whether the loading process is complete */
  isComplete: boolean
}

export const ChatLoadingSteps = React.forwardRef<HTMLDivElement, ChatLoadingStepsProps>(({
  clientName,
  variant = 'plan',
  activeStep,
  isComplete,
}, ref) => {
  if (isComplete) return null

  const labels = stepLabels(variant, clientName)
  const steps: LoadingStep[] = labels.map((label, i) => ({
    label,
    status: activeStep > i ? 'complete' : activeStep === i ? 'active' : 'pending',
  }))

  return (
    <div ref={ref} className="flex items-start">
      <div className="space-y-1.5 py-1">
        <AnimatePresence>
          {steps.map((step, i) => {
            if (step.status === 'pending') return null
            // First-visible step (i=0 on initial mount) skips the opacity-fade
            // animation so the user gets immediate feedback after pressing
            // Enter - the staggered fade-in caused a perceptible gap between
            // the user message rendering and "Reading X's profile..."
            // appearing (cofounder report 2026-05-06: looked like nothing
            // was happening for ~1s after submit on initial generation).
            // Subsequent steps still stagger in to feel polished.
            const skipInitialFade = i === 0
            return (
              <motion.div
                key={i}
                initial={skipInitialFade ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: skipInitialFade ? 0 : i * 0.1 }}
                className="flex items-center gap-2 text-[11px] text-gray-400"
              >
                {step.status === 'active' ? (
                  <Loader2Icon size={11} className="animate-spin text-gray-400" />
                ) : (
                  <CheckIcon size={11} className="text-emerald-500" />
                )}
                <span className={step.status === 'complete' ? 'text-gray-400' : 'text-gray-500'}>
                  {step.label}...
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
})

ChatLoadingSteps.displayName = 'ChatLoadingSteps'

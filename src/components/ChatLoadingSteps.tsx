/**
 * ChatLoadingSteps — Phase 2 of the loading experience
 *
 * Displays sequential progress steps in the chat panel during plan generation.
 * Each step shows a spinner while active, then a checkmark when complete.
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2Icon, CheckIcon, BotIcon } from 'lucide-react'

interface LoadingStep {
  label: string
  status: 'pending' | 'active' | 'complete'
}

interface ChatLoadingStepsProps {
  clientName?: string
  /** Which step is currently active (0-indexed) */
  activeStep: number
  /** Whether the loading process is complete */
  isComplete: boolean
  /** Follow-up mode — show a single "Updating dashboard" indicator instead of the 3-step sequence */
  followUp?: boolean
}

export const ChatLoadingSteps = React.forwardRef<HTMLDivElement, ChatLoadingStepsProps>(({
  clientName,
  activeStep,
  isComplete,
  followUp = false,
}, ref) => {
  if (isComplete) return null

  if (followUp) {
    return (
      <div ref={ref} className="flex items-start">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 text-xs text-gray-500 py-1"
        >
          <Loader2Icon size={12} className="animate-spin text-gray-400" />
          <span>Updating dashboard...</span>
        </motion.div>
      </div>
    )
  }

  const steps: LoadingStep[] = [
    {
      label: clientName ? `Reading ${clientName}'s profile` : 'Reading client profile',
      status: activeStep > 0 ? 'complete' : activeStep === 0 ? 'active' : 'pending',
    },
    {
      label: 'Selecting properties',
      status: activeStep > 1 ? 'complete' : activeStep === 1 ? 'active' : 'pending',
    },
    {
      label: 'Running affordability checks',
      status: activeStep > 2 ? 'complete' : activeStep === 2 ? 'active' : 'pending',
    },
  ]

  return (
    <div ref={ref} className="flex items-start">
      <div className="space-y-1.5 py-1">
        <AnimatePresence>
          {steps.map((step, i) => {
            if (step.status === 'pending') return null
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.1 }}
                className="flex items-center gap-2 text-xs text-gray-400"
              >
                {step.status === 'active' ? (
                  <Loader2Icon size={12} className="animate-spin text-gray-400" />
                ) : (
                  <CheckIcon size={12} className="text-emerald-500" />
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

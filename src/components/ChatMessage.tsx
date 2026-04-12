/**
 * ChatMessage — Step 1.10 of NL-PIVOT-PLAN.csv
 *
 * Renders a single chat message. Four variants:
 * - user: dark bubble, right-aligned
 * - assistant: light bubble, left-aligned with small bot avatar
 * - system: centered green pill
 * - option-cards: clickable list items inline in the chat
 */

import React from 'react'
import { motion } from 'framer-motion'
import { BotIcon } from 'lucide-react'
import type { ChatMessage as ChatMessageType, ChatOptionCardData } from '@/types/nlParse'
import { ChatOptionCard } from './ChatOptionCard'
import { ChatSummaryCard } from './ChatSummaryCard'
import { MicroConfirmationCard } from './MicroConfirmationCard'
import { PostPlanRefinement } from './PostPlanRefinement'

interface ChatMessageProps {
  message: ChatMessageType
  onOptionSelect?: (card: ChatOptionCardData) => void
  onFollowUpClick?: (suggestion: string) => void
  propertyCount?: number
}

export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(({ message, onOptionSelect, onFollowUpClick, propertyCount }, ref) => {
  // Loading indicator with personalised text
  if (message.type === 'loading') {
    return (
      <div ref={ref} className="flex items-start gap-2.5">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#F5F5F5] text-sm text-[#535862]">
          <div className="flex items-center gap-1">
            <motion.span
              className="w-1.5 h-1.5 bg-[#A4A7AE] rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-1.5 h-1.5 bg-[#A4A7AE] rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="w-1.5 h-1.5 bg-[#A4A7AE] rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          {message.content && (
            <span className="text-[#717680] text-xs">{message.content}</span>
          )}
        </div>
      </div>
    )
  }

  // System message — centered green pill
  if (message.role === 'system') {
    return (
      <div ref={ref}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center py-1"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F5] border border-[#E9EAEB] text-xs text-[#535862] font-medium">
            <span className="text-[#181D27]">&#10003;</span>
            {message.content}
          </div>
        </motion.div>
      </div>
    )
  }

  // User message — light bubble, right-aligned (UUI style)
  if (message.role === 'user') {
    return (
      <div ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex justify-end"
        >
          <div className="max-w-[90%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-[#F5F5F5] border border-gray-200 text-[#181D27] text-[12px] leading-[1.6]">
            {message.content}
          </div>
        </motion.div>
      </div>
    )
  }

  // Assistant message — left-aligned with avatar
  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-start gap-2.5"
      >
        <div className="flex-1 min-w-0">
          {/* Single bubble wrapping all content */}
          <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-gray-200 space-y-2.5">
            {/* Text content */}
            {message.content && (
              <div className="text-[12px] text-[#181D27] leading-[1.6]">
                {message.content}
              </div>
            )}

            {/* Micro confirmation card */}
            {message.type === 'micro-confirmation' && message.microConfirmation && (
              <MicroConfirmationCard data={message.microConfirmation} />
            )}

            {/* Summary card */}
            {message.type === 'summary-card' && message.summaryCard && (
              <ChatSummaryCard data={message.summaryCard} />
            )}

            {/* Option cards */}
            {message.type === 'option-cards' && message.optionCards && (
              <div className="space-y-2">
                {message.optionCards.map((card) => (
                  <ChatOptionCard
                    key={card.id}
                    card={card}
                    onSelect={onOptionSelect || (() => {})}
                  />
                ))}
              </div>
            )}

            {/* Assumptions */}
            {message.assumptions && message.assumptions.length > 0 && (
              <div className="text-xs text-[#717680] italic">
                Assumed: {message.assumptions.join(' · ')}
              </div>
            )}
          </div>

          {/* Post-plan refinement — outside bubble */}
          {message.showRefinement && (
            <div className="mt-2.5">
              <PostPlanRefinement
                propertyCount={propertyCount ?? 0}
                onSelect={(prompt) => onFollowUpClick?.(prompt)}
              />
            </div>
          )}

          {/* Follow-up suggestions — outside bubble */}
          {message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {message.followUpSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUpClick?.(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#E9EAEB] text-[#535862] hover:bg-[#F5F5F5] hover:border-[#D5D7DA] transition-colors leading-tight"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
})

ChatMessage.displayName = 'ChatMessage'

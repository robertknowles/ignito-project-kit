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

interface ChatMessageProps {
  message: ChatMessageType
  onOptionSelect?: (card: ChatOptionCardData) => void
  onFollowUpClick?: (suggestion: string) => void
}

export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(({ message, onOptionSelect, onFollowUpClick }, ref) => {
  // Loading indicator with personalised text
  if (message.type === 'loading') {
    return (
      <div ref={ref} className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center">
          <BotIcon size={13} className="text-white" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-100 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <motion.span
              className="w-1.5 h-1.5 bg-gray-400 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-1.5 h-1.5 bg-gray-400 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="w-1.5 h-1.5 bg-gray-400 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          {message.content && (
            <span className="text-gray-400 text-xs">{message.content}</span>
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
            <span className="text-emerald-500">&#10003;</span>
            {message.content}
          </div>
        </motion.div>
      </div>
    )
  }

  // User message — dark bubble, right-aligned
  if (message.role === 'user') {
    return (
      <div ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex justify-end"
        >
          <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-gray-800 text-white text-sm leading-relaxed">
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
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center mt-0.5">
          <BotIcon size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Text content */}
          {message.content && (
            <div className="text-sm text-gray-700 leading-relaxed">
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
            <div className="text-xs text-gray-400 italic">
              Assumed: {message.assumptions.join(' · ')}
            </div>
          )}

          {/* Follow-up suggestions */}
          {message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {message.followUpSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUpClick?.(suggestion)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors leading-tight"
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

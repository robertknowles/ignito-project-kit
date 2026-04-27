/**
 * PostPlanRefinement — strategic-intent buttons under the chat input.
 *
 * Parametric edits (price, type, count) are now handled directly via the
 * dashboard property cards. Chat is reserved for strategic intent — risk
 * profile, pacing, stress tests, and full strategy switches.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldIcon, GaugeIcon, ActivityIcon, RefreshCwIcon, ChevronLeftIcon } from 'lucide-react'

interface PostPlanRefinementProps {
  propertyCount: number
  onSelect: (prompt: string) => void
}

interface Category {
  id: string
  label: string
  icon: React.ReactNode
  getOptions: (count: number) => Array<{ label: string; prompt: string }>
}

const categories: Category[] = [
  {
    id: 'risk',
    label: 'Risk profile',
    icon: <ShieldIcon size={12} />,
    getOptions: () => [
      { label: 'Make more conservative', prompt: 'Make this plan more conservative — lower-risk property choices, lower LVRs, more cashflow buffer.' },
      { label: 'Make more aggressive', prompt: 'Make this plan more aggressive — higher-growth properties, push borrowing capacity, accept lower cashflow short-term.' },
    ],
  },
  {
    id: 'pacing',
    label: 'Pacing',
    icon: <GaugeIcon size={12} />,
    getOptions: () => [
      { label: 'Pace slower', prompt: 'Pace acquisitions slower — give more breathing room between purchases.' },
      { label: 'Pace faster', prompt: 'Pace acquisitions faster — compress the timeline so the portfolio is built sooner.' },
    ],
  },
  {
    id: 'stress',
    label: 'Stress test',
    icon: <ActivityIcon size={12} />,
    getOptions: () => [
      { label: 'Higher interest rates', prompt: 'Stress test this plan against a 2% rise in interest rates — show me what breaks.' },
      { label: 'Lower growth scenario', prompt: 'Stress test against a low-growth market — what happens if growth comes in 30% below assumption?' },
      { label: 'Income shock', prompt: 'Stress test against a 6-month loss of one income — does the portfolio survive?' },
    ],
  },
  {
    id: 'strategy',
    label: 'Try a different strategy',
    icon: <RefreshCwIcon size={12} />,
    getOptions: () => [
      { label: 'Equity-growth focus', prompt: 'Re-plan with an equity-growth focus — prioritise capital growth over cashflow.' },
      { label: 'Cashflow focus', prompt: 'Re-plan with a cashflow focus — prioritise positively-geared properties.' },
      { label: 'Commercial transition', prompt: 'Re-plan with a commercial transition strategy — start residential, move into commercial later.' },
    ],
  },
]

export const PostPlanRefinement: React.FC<PostPlanRefinementProps> = ({ propertyCount, onSelect }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const handleCategoryClick = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  const handleOptionClick = (prompt: string) => {
    setExpandedCategory(null)
    onSelect(prompt)
  }

  const activeCategory = categories.find((c) => c.id === expandedCategory)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="space-y-2"
    >
      <p className="text-xs text-[#717680] font-medium">Want to adjust?</p>

      <AnimatePresence mode="wait">
        {!expandedCategory ? (
          /* Step 1 — Category buttons in 2-col grid */
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-2 gap-1.5"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[#E9EAEB] text-[#535862] bg-white hover:bg-[#F5F5F5] hover:border-[#D5D7DA] transition-colors leading-tight font-medium"
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </motion.div>
        ) : (
          /* Step 2 — Sub-options for selected category */
          <motion.div
            key={`options-${expandedCategory}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-1.5"
          >
            <button
              onClick={() => setExpandedCategory(null)}
              className="inline-flex items-center gap-1 text-xs text-[#717680] hover:text-[#414651] transition-colors mb-0.5"
            >
              <ChevronLeftIcon size={12} />
              {activeCategory?.label}
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              {activeCategory?.getOptions(propertyCount).map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionClick(opt.prompt)}
                  className="text-xs px-3 py-2 rounded-lg border border-[#E9EAEB] text-[#535862] bg-white hover:bg-[#F5F5F5] hover:border-[#D5D7DA] transition-colors leading-tight font-medium"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

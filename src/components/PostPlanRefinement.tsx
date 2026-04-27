/**
 * PostPlanRefinement — 2-step refinement flow after plan generation
 *
 * Step 1: Fixed category buttons (# properties, prices, types, strategy)
 * Step 2: Contextual sub-options based on what was clicked
 *
 * Fully client-side — no AI call needed for the button display.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HashIcon, DollarSignIcon, HomeIcon, CompassIcon, ChevronLeftIcon } from 'lucide-react'
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile'

type PresetId = 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition'

const PRESET_SWITCH_OPTIONS: Record<PresetId, { label: string; prompt: string }> = {
  'eg-low': {
    label: 'Equity Growth — Low Price',
    prompt: 'Switch to the Equity Growth — Low Price strategy: bias toward regional houses and metro units in growth mode at lower entry prices, scaling through volume.',
  },
  'eg-high': {
    label: 'Equity Growth — High Price',
    prompt: 'Switch to the Equity Growth — High Price strategy: bias toward metro houses in growth mode, fewer larger assets with stronger land content.',
  },
  'cf-low': {
    label: 'Cash Flow — Low Price',
    prompt: 'Switch to the Cash Flow — Low Price strategy: bias toward regional units and regional houses in cashflow mode, yield-focused.',
  },
  'cf-high': {
    label: 'Cash Flow — High Price',
    prompt: 'Switch to the Cash Flow — High Price strategy: bias toward metro houses in cashflow mode and high-cost commercial, premium yield.',
  },
  'commercial-transition': {
    label: 'Commercial Transition',
    prompt: 'Switch to the Commercial Transition strategy: build equity in residential first, then pivot to commercial yield around year 5-7.',
  },
}

interface PostPlanRefinementProps {
  propertyCount: number
  onSelect: (prompt: string) => void
}

interface Category {
  id: string
  label: string
  icon: React.ReactNode
  getOptions: (count: number, currentPreset: PresetId) => Array<{ label: string; prompt: string }>
}

const categories: Category[] = [
  {
    id: 'count',
    label: 'Change # of properties',
    icon: <HashIcon size={12} />,
    getOptions: (count) => {
      const opts: Array<{ label: string; prompt: string }> = []
      if (count > 1) {
        opts.push({
          label: `Remove one (→ ${count - 1})`,
          prompt: `Remove one property from the plan, keep the best ${count - 1}`,
        })
      }
      opts.push({
        label: `Add one more (→ ${count + 1})`,
        prompt: `Add one more property to the portfolio, making it ${count + 1} total`,
      })
      if (count > 2) {
        opts.push({
          label: `Start smaller (→ 2)`,
          prompt: 'Scale back to just 2 properties to start with',
        })
      }
      if (count < 5) {
        opts.push({
          label: `Go bigger (→ ${Math.min(count + 2, 6)})`,
          prompt: `Expand to ${Math.min(count + 2, 6)} properties total`,
        })
      }
      return opts
    },
  },
  {
    id: 'price',
    label: 'Change property prices',
    icon: <DollarSignIcon size={12} />,
    getOptions: () => [
      { label: 'Cheaper entry points', prompt: 'Bring property prices down — focus on more affordable entry points under $500k' },
      { label: 'Mid-range ($500-700k)', prompt: 'Adjust property prices to the $500-700k range' },
      { label: 'Higher end ($700k+)', prompt: 'Push property prices higher — $700k+ range for better capital growth' },
      { label: 'Mix of price points', prompt: 'Mix up the prices — start cheap and work up to more expensive properties later' },
    ],
  },
  {
    id: 'type',
    label: 'Change property types',
    icon: <HomeIcon size={12} />,
    getOptions: () => [
      { label: 'All units/apartments', prompt: 'Switch all properties to units or apartments' },
      { label: 'All houses', prompt: 'Switch all properties to houses' },
      { label: 'Townhouses / villas', prompt: 'Switch to townhouses or villas for better land content' },
      { label: 'Mix of types', prompt: 'Mix property types — some units, some houses, some townhouses' },
    ],
  },
  {
    id: 'strategy',
    label: 'Switch strategy',
    icon: <CompassIcon size={12} />,
    getOptions: (_count, currentPreset) =>
      (Object.keys(PRESET_SWITCH_OPTIONS) as PresetId[])
        .filter((p) => p !== currentPreset)
        .map((p) => PRESET_SWITCH_OPTIONS[p]),
  },
]

export const PostPlanRefinement: React.FC<PostPlanRefinementProps> = ({ propertyCount, onSelect }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const { profile } = useInvestmentProfile()
  const currentPreset = (profile.strategyPreset || 'eg-low') as PresetId

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
              {activeCategory?.getOptions(propertyCount, currentPreset).map((opt, i) => (
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

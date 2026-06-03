import React from 'react';
import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════
   ILLUSTRATIONS — scaled up for clarity
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── 1. AI-POWERED PLANNING ─── */
const AIPlanningIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <div className="w-full max-w-[400px] mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Chat window header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">PP</span>
          </div>
          <span className="text-[13px] font-semibold text-gray-900">PropPath</span>
          <div className="ml-auto flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          </div>
        </div>

        {/* Chat body */}
        <div className="px-4 py-4 flex flex-col gap-3 min-h-[240px]">
          {/* User message 1 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: [0, 1, 1, 1, 1, 1, 1, 0] }}
            transition={{ times: [0, 0.04, 0.35, 0.38, 0.5, 0.85, 0.92, 0.97], duration: 16, repeat: Infinity }}
            className="flex justify-end"
          >
            <div className="bg-gray-900 text-white px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[75%]">
              <span className="text-[12.5px] leading-snug">What if they save $20K/yr?</span>
            </div>
          </motion.div>

          {/* Typing indicator → AI response 1 */}
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              {/* Typing dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 1, 0, 0, 0, 0] }}
                transition={{ times: [0, 0.05, 0.07, 0.14, 0.16, 0.5, 0.9, 1], duration: 16, repeat: Infinity }}
                className="bg-gray-100 px-3.5 py-2.5 rounded-2xl rounded-tl-sm inline-flex gap-1"
              >
                {[0, 1, 2].map((dot) => (
                  <motion.div
                    key={dot}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400"
                  />
                ))}
              </motion.div>
              {/* AI response */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: [0, 0, 0, 1, 1, 1, 1, 0] }}
                transition={{ times: [0, 0.1, 0.15, 0.18, 0.35, 0.85, 0.92, 0.97], duration: 16, repeat: Infinity }}
                className="bg-gray-100 px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
              >
                <span className="text-[12.5px] text-gray-700 leading-snug">Purchase 2 moves from 2031 to 2029. Equity release unlocks 18 months earlier.</span>
              </motion.div>
            </div>
          </div>

          {/* User message 2 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 0] }}
            transition={{ times: [0, 0.3, 0.35, 0.38, 0.4, 0.43, 0.85, 0.92], duration: 16, repeat: Infinity }}
            className="flex justify-end"
          >
            <div className="bg-gray-900 text-white px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[75%]">
              <span className="text-[12.5px] leading-snug">Rates go up 1.5%?</span>
            </div>
          </motion.div>

          {/* Typing indicator → AI response 2 */}
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0] }}
                transition={{ times: [0, 0.4, 0.43, 0.46, 0.48, 0.5, 0.56, 0.58, 0.9, 1], duration: 16, repeat: Infinity }}
                className="bg-gray-100 px-3.5 py-2.5 rounded-2xl rounded-tl-sm inline-flex gap-1"
              >
                {[0, 1, 2].map((dot) => (
                  <motion.div
                    key={dot}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400"
                  />
                ))}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: [0, 0, 0, 0, 0, 0, 0, 1, 1, 0] }}
                transition={{ times: [0, 0.4, 0.5, 0.53, 0.56, 0.58, 0.6, 0.63, 0.85, 0.92], duration: 16, repeat: Infinity }}
                className="bg-gray-100 px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
              >
                <span className="text-[12.5px] text-gray-700 leading-snug">Still feasible. Purchase 3 delays by 2 years. Serviceability buffer stays above 5%.</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Chat input bar */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
          <div className="flex-1 bg-gray-50 rounded-xl px-3.5 py-2">
            <span className="text-[12px] text-gray-400">Ask about this plan...</span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10.5 1.5L5.5 6.5M10.5 1.5L7 10.5L5.5 6.5M10.5 1.5L1.5 5L5.5 6.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── 2. THE ROADMAP ─── */
const roadmapSteps = [
  { year: '2026', label: 'Purchase 1', detail: '$450k · QLD', icon: '1' },
  { year: '2029', label: 'Equity Release', detail: '$82k unlocked', icon: '↗' },
  { year: '2031', label: 'Purchase 2', detail: '$520k · NSW', icon: '2' },
  { year: '2036', label: 'Purchase 3', detail: '$610k · QLD', icon: '3' },
];

const RoadmapIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <div className="w-full max-w-[380px] px-6 py-3">
      <div className="relative flex flex-col gap-0">
        {roadmapSteps.map((step, i) => (
          <div key={i} className="flex items-stretch gap-4">
            {/* Vertical line + node */}
            <div className="flex flex-col items-center w-8 shrink-0">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.2 + i * 1.8, duration: 0.5, repeat: Infinity, repeatDelay: 16 - (1.2 + i * 1.8) - 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  i === 0 ? 'bg-gray-900 text-white' : 'bg-white border-2 border-gray-300 text-gray-500'
                }`}
              >
                <span className="text-[11px] font-bold">{step.icon}</span>
              </motion.div>
              {i < roadmapSteps.length - 1 && (
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 1.8 + i * 1.8, duration: 0.8, repeat: Infinity, repeatDelay: 16 - (1.8 + i * 1.8) - 0.8, ease: 'easeOut' }}
                  className="w-[2px] bg-gray-200 flex-1 origin-top min-h-[16px]"
                />
              )}
            </div>

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + i * 1.8, duration: 0.5, repeat: Infinity, repeatDelay: 16 - (1.4 + i * 1.8) - 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 pb-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-semibold text-gray-900">{step.label}</span>
                    <span className="text-[12px] text-gray-400 ml-2">{step.detail}</span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 tabular-nums">{step.year}</span>
                </div>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── 3. SCENARIO PLANNING ─── */
const ScenarioIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 16, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-full max-w-[380px] relative px-4 py-3 flex gap-4"
    >
      {/* Scenario A */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.8, repeat: Infinity, repeatDelay: 14.6 }}
        className="flex-1 border border-gray-200 rounded-xl p-4 bg-white flex flex-col"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#7F56D9]" />
          <span className="text-[13px] font-bold text-gray-700">Scenario A</span>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          {[
            { label: 'Properties', val: '4' },
            { label: 'Equity', val: '$1.8M' },
            { label: 'Cashflow', val: '+$42k' },
            { label: 'Timeline', val: '15 yrs' },
          ].map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 + i * 0.4, duration: 0.5, repeat: Infinity, repeatDelay: 13.5 - i * 0.4 }}
              className="flex justify-between items-center"
            >
              <span className="text-[11px] text-gray-400">{row.label}</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums">{row.val}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 4, duration: 1, repeat: Infinity, repeatDelay: 11 }}
          className="h-1.5 bg-[#7F56D9]/20 rounded-full mt-3"
        />
      </motion.div>

      {/* Scenario B */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 5, duration: 0.8, repeat: Infinity, repeatDelay: 10.2 }}
        className="flex-1 border border-gray-200 rounded-xl p-4 bg-white flex flex-col"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <span className="text-[13px] font-bold text-gray-700">Scenario B</span>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          {[
            { label: 'Properties', val: '3' },
            { label: 'Equity', val: '$2.1M' },
            { label: 'Cashflow', val: '+$68k' },
            { label: 'Timeline', val: '12 yrs' },
          ].map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 6 + i * 0.4, duration: 0.5, repeat: Infinity, repeatDelay: 9 - i * 0.4 }}
              className="flex justify-between items-center"
            >
              <span className="text-[11px] text-gray-400">{row.label}</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums">{row.val}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 8.4, duration: 1, repeat: Infinity, repeatDelay: 6.6 }}
          className="h-1.5 bg-gray-300 rounded-full mt-3"
        />
      </motion.div>

      {/* Compare line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ times: [0, 0.55, 0.6, 0.9, 0.95], duration: 16, repeat: Infinity }}
        className="absolute top-4 bottom-4 left-1/2 w-[1px] bg-gray-300"
      />
    </motion.div>
  </div>
);

/* ─── 4. THE TOOLKIT ─── */
const ToolkitIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 16, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-full max-w-[340px] relative px-4 py-3 flex flex-col gap-3"
    >
      {/* Input row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6, repeat: Infinity, repeatDelay: 14.8 }}
        className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3"
      >
        <span className="text-[12px] text-gray-400">State</span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.5, repeat: Infinity, repeatDelay: 13.9 }}
          className="bg-gray-100 rounded-lg px-3 py-1"
        >
          <span className="text-[12px] font-bold text-gray-700">QLD</span>
        </motion.div>
        <span className="text-[12px] text-gray-400 ml-3">Price</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6, duration: 0.5, repeat: Infinity, repeatDelay: 12.9 }}
          className="text-[13px] font-bold text-gray-900 tabular-nums"
        >
          $450,000
        </motion.span>
      </motion.div>

      {/* Results */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 4, duration: 0.8, repeat: Infinity, repeatDelay: 11.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3"
      >
        {[
          { label: 'Stamp Duty', value: '$15,925' },
          { label: 'Transfer Fee', value: '$1,370' },
          { label: 'Land Tax (annual)', value: '$0' },
          { label: 'LMI', value: '$4,200' },
        ].map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 5 + i * 0.6, duration: 0.5, repeat: Infinity, repeatDelay: 10 - i * 0.6 }}
            className="flex items-center justify-between"
          >
            <span className="text-[12px] text-gray-400">{row.label}</span>
            <span className="text-[13px] font-bold text-gray-900 tabular-nums">{row.value}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 7.8, duration: 0.6, repeat: Infinity, repeatDelay: 7.6 }}
          className="h-[1px] bg-gray-200 origin-left"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 8.6, duration: 0.5, repeat: Infinity, repeatDelay: 6.9 }}
          className="flex items-center justify-between"
        >
          <span className="text-[13px] font-bold text-gray-700">Total upfront</span>
          <span className="text-[15px] font-bold text-gray-900 tabular-nums">$21,495</span>
        </motion.div>
      </motion.div>
    </motion.div>
  </div>
);

/* ─── 5. THE CLIENT PORTAL ─── */
const ClientPortalIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 16, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-full max-w-[360px] relative px-4 py-3 flex flex-col items-center justify-center gap-3.5"
    >
      {/* URL bar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6, repeat: Infinity, repeatDelay: 14.8 }}
        className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm w-full"
      >
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: 'auto' }}
          transition={{ delay: 1.6, duration: 1, repeat: Infinity, repeatDelay: 13.4 }}
          className="text-[13px] text-gray-500 font-mono overflow-hidden whitespace-nowrap"
        >
          proppath.co/client/john
        </motion.span>
      </motion.div>

      {/* Portal card */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0, originY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay: 3.6, duration: 0.8, repeat: Infinity, repeatDelay: 11.6, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-[11px] font-bold text-gray-500">JP</span>
          </div>
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 5, duration: 0.5, repeat: Infinity, repeatDelay: 10.5 }}
              className="text-[13px] font-bold text-gray-900"
            >
              John's Portfolio Roadmap
            </motion.div>
            <div className="text-[11px] text-gray-400">4 properties · 15 year plan</div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {[70, 55, 40, 85].map((w, i) => (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              animate={{ width: `${w}%` }}
              transition={{ delay: 6 + i * 0.5, duration: 0.8, repeat: Infinity, repeatDelay: 9 - i * 0.5 }}
              className="h-1.5 bg-gray-200 rounded-full"
            />
          ))}
        </div>
      </motion.div>

      {/* Feature tags */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 9, duration: 0.6, repeat: Infinity, repeatDelay: 6.4 }}
        className="flex flex-wrap gap-1.5 justify-center"
      >
        {['Portfolio', 'Property', 'Plan', 'Brief', 'Progress', 'Deal'].map((tag) => (
          <span key={tag} className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{tag}</span>
        ))}
      </motion.div>
    </motion.div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — single bento section with 5 feature cards
   ═══════════════════════════════════════════════════════════════════════ */

const features = [
  {
    label: 'AI-POWERED PLANNING',
    title: 'Conversational planning',
    desc: 'Describe a client scenario in plain language. PropPath reasons through assumptions and constraints, builds the roadmap, and helps you refine it through conversation.',
    illustration: <AIPlanningIllustration />,
  },
  {
    label: 'THE ROADMAP',
    title: 'A living property journey',
    desc: "Every client gets a clear, visual journey from where they are today to where they want to be. Each property decision connects to the next. Each milestone is trackable. Not a static PDF.",
    illustration: <RoadmapIllustration />,
  },
  {
    label: 'SCENARIO PLANNING',
    title: 'Side-by-side comparison',
    desc: 'Acquisition order matters. State matters. Timing matters. Compare scenarios side by side before anyone signs a contract. The right plan is obvious when both are on the same screen.',
    illustration: <ScenarioIllustration />,
  },
  {
    label: 'THE TOOLKIT',
    title: 'Every calculator, one platform',
    desc: 'Borrowing Power. Stamp Duty. Land Tax. LMI. Loan Repayments. The tools BAs reach for every day, built into the same platform as the plan.',
    illustration: <ToolkitIllustration />,
  },
  {
    label: 'THE CLIENT PORTAL',
    title: 'Built for the relationship',
    desc: "Every client gets their own portal. Portfolio value, equity position, and cashflow projections update as properties are added. Loan balances tracked. Milestones flagged. Not just for the session — for the entire relationship.",
    illustration: <ClientPortalIllustration />,
  },
];

const HowItWorks: React.FC = () => (
  <section id="how-it-works" className="py-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
    {/* Sub-heading */}
    <div className="mb-12 md:mb-16">
      <h2 className="text-3xl md:text-[36px] font-semibold tracking-tight leading-[1.2] mb-4">
        <span className="text-gray-900">Everything you need</span>{' '}
        <span className="text-gray-400">to build, manage, and share property plans with speed and clarity.</span>
      </h2>
    </div>

    {/* Bento grid — 2 large top, 3 small bottom */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {features.slice(0, 2).map((feature) => (
        <div key={feature.label} className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="p-6 pb-0">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-2 block">{feature.label}</span>
            <h3 className="text-[16px] font-semibold text-gray-900 mb-1.5">{feature.title}</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">{feature.desc}</p>
          </div>
          <div className="h-[340px] flex items-center justify-center p-4">
            {feature.illustration}
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {features.slice(2).map((feature) => (
        <div key={feature.label} className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="p-5 pb-0">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-2 block">{feature.label}</span>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">{feature.title}</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">{feature.desc}</p>
          </div>
          <div className="h-[280px] flex items-center justify-center p-3">
            {feature.illustration}
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;

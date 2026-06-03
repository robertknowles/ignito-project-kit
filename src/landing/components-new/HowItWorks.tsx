import React from 'react';
import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════
   ILLUSTRATIONS — scaled up for clarity
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── 1. AI-POWERED PLANNING ─── */
const AIPlanningIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[380px] mx-auto"
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Chat window header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">PP</span>
          </div>
          <span className="text-[13px] font-semibold text-gray-900">PropPath</span>
          <div className="ml-auto flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-green-400"
            />
            <span className="text-[10px] text-gray-400">Online</span>
          </div>
        </div>

        {/* Chat body — settled conversation */}
        <div className="px-4 py-5 flex flex-col gap-3">
          {/* User message */}
          <div className="flex justify-end">
            <div className="bg-gray-900 text-white px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[75%]">
              <span className="text-[12.5px] leading-snug">What if they save $20K/yr?</span>
            </div>
          </div>

          {/* AI response */}
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3.5 py-2.5 rounded-2xl rounded-tl-sm max-w-[80%]">
              <span className="text-[12.5px] text-gray-700 leading-snug">Purchase 2 moves to 2029 — equity release unlocks 18 months earlier.</span>
            </div>
          </div>

          {/* Live typing indicator — the single subtle animation */}
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3.5 py-2.5 rounded-2xl rounded-tl-sm inline-flex gap-1">
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: dot * 0.18, ease: 'easeInOut' }}
                  className="w-1.5 h-1.5 rounded-full bg-gray-400"
                />
              ))}
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
    </motion.div>
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
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      className="w-full max-w-[380px] px-6 py-3"
    >
      <div className="relative flex flex-col gap-0">
        {roadmapSteps.map((step, i) => (
          <div key={i} className="flex items-stretch gap-4">
            {/* Vertical line + node */}
            <div className="flex flex-col items-center w-8 shrink-0">
              <motion.div
                variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1 } }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={`relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  i === 0 ? 'bg-gray-900 text-white' : 'bg-white border-2 border-gray-300 text-gray-500'
                }`}
              >
                {i === 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.7], opacity: [0.45, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full bg-gray-900/40"
                  />
                )}
                <span className="text-[11px] font-bold">{step.icon}</span>
              </motion.div>
              {i < roadmapSteps.length - 1 && (
                <div className="w-[2px] bg-gray-200 flex-1 min-h-[16px]" />
              )}
            </div>

            {/* Card */}
            <motion.div
              variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
    </motion.div>
  </div>
);

/* ─── 3. SCENARIO PLANNING ─── */
const ScenarioIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[380px] relative px-4 py-3 flex gap-4"
    >
      {/* Scenario A */}
      <div className="flex-1 border border-gray-200 rounded-xl p-4 bg-white flex flex-col">
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
            <div key={i} className="flex justify-between items-center">
              <span className="text-[11px] text-gray-400">{row.label}</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums">{row.val}</span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-[#7F56D9]/20 rounded-full mt-3" />
      </div>

      {/* Scenario B */}
      <div className="flex-1 border border-gray-200 rounded-xl p-4 bg-white flex flex-col">
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
            <div key={i} className="flex justify-between items-center">
              <span className="text-[11px] text-gray-400">{row.label}</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums">{row.val}</span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-gray-300 rounded-full mt-3" />
      </div>

      {/* Compare line — subtle pulse */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-4 bottom-4 left-1/2 w-[1px] bg-gray-300"
      />
    </motion.div>
  </div>
);

/* ─── 4. THE TOOLKIT ─── */
const ToolkitIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[340px] relative px-4 py-3 flex flex-col gap-3"
    >
      {/* Input row */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3">
        <span className="text-[12px] text-gray-400">State</span>
        <div className="bg-gray-100 rounded-lg px-3 py-1">
          <span className="text-[12px] font-bold text-gray-700">QLD</span>
        </div>
        <span className="text-[12px] text-gray-400 ml-3">Price</span>
        <span className="text-[13px] font-bold text-gray-900 tabular-nums inline-flex items-center">
          $450,000
          {/* Blinking caret — the single subtle animation */}
          <motion.span
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
            className="ml-0.5 w-[1.5px] h-3.5 bg-gray-900 inline-block"
          />
        </span>
      </div>

      {/* Results */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
        {[
          { label: 'Stamp Duty', value: '$15,925' },
          { label: 'Transfer Fee', value: '$1,370' },
          { label: 'Land Tax (annual)', value: '$0' },
          { label: 'LMI', value: '$4,200' },
        ].map((row, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[12px] text-gray-400">{row.label}</span>
            <span className="text-[13px] font-bold text-gray-900 tabular-nums">{row.value}</span>
          </div>
        ))}
        <div className="h-[1px] bg-gray-200" />
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-gray-700">Total upfront</span>
          <span className="text-[15px] font-bold text-gray-900 tabular-nums">$21,495</span>
        </div>
      </div>
    </motion.div>
  </div>
);

/* ─── 5. THE CLIENT PORTAL ─── */
const ClientPortalIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[360px] relative px-4 py-3 flex flex-col items-center justify-center gap-3.5"
    >
      {/* URL bar */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm w-full">
        {/* Live status dot — the single subtle animation */}
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-3 h-3 rounded-full bg-green-400 shrink-0"
        />
        <span className="text-[13px] text-gray-500 font-mono">proppath.co/client/john</span>
      </div>

      {/* Portal card */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-[11px] font-bold text-gray-500">JP</span>
          </div>
          <div>
            <div className="text-[13px] font-bold text-gray-900">John's Portfolio Roadmap</div>
            <div className="text-[11px] text-gray-400">4 properties · 15 year plan</div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {[70, 55, 40, 85].map((w, i) => (
            <div key={i} className="h-1.5 bg-gray-200 rounded-full" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>

      {/* Feature tags */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {['Portfolio', 'Property', 'Plan', 'Brief', 'Progress', 'Deal'].map((tag) => (
          <span key={tag} className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{tag}</span>
        ))}
      </div>
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

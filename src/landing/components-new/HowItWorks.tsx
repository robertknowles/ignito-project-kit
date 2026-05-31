import React from 'react';
import { motion } from 'framer-motion';

/* ─────────────── Illustration wrapper ─────────────── */
const IllustrationBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   ILLUSTRATIONS — one per feature card
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── 1. AI-POWERED PLANNING ─── */
const AIPlanningIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0.95, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[180px] relative p-4 flex flex-col"
    >
      <div className="flex flex-col gap-3 flex-grow overflow-hidden relative">
        <div className="relative h-8 flex items-end justify-end">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{
              opacity: [0, 1, 1, 0, 0, 0, 0, 0],
              x: [20, 0, 0, -10, -10, -10, -10, -10],
            }}
            transition={{
              times: [0, 0.05, 0.45, 0.5, 0.55, 0.85, 0.95, 1],
              duration: 10,
              repeat: Infinity,
            }}
            className="absolute bg-gray-900 text-white px-3 py-1.5 rounded-[6px] rounded-tr-none shadow-sm"
          >
            <span className="text-[8px] font-medium leading-tight tracking-tight">What if they save $20K/yr?</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{
              opacity: [0, 0, 0, 0, 0, 1, 1, 0],
              x: [20, 20, 20, 20, 20, 0, 0, -10],
            }}
            transition={{
              times: [0, 0.45, 0.5, 0.55, 0.6, 0.65, 0.95, 1],
              duration: 10,
              repeat: Infinity,
            }}
            className="absolute bg-gray-900 text-white px-3 py-1.5 rounded-[6px] rounded-tr-none shadow-sm"
          >
            <span className="text-[8px] font-medium leading-tight tracking-tight">Rates go up 1.5%?</span>
          </motion.div>
        </div>

        <div className="relative h-4 mt-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 1, 0, 0, 0, 0] }}
            transition={{
              times: [0, 0.08, 0.12, 0.45, 0.5, 0.6, 0.95, 1],
              duration: 10,
              repeat: Infinity,
            }}
            className="absolute flex items-center gap-2 px-1"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                  className="w-0.5 h-0.5 rounded-full bg-gray-500"
                />
              ))}
            </div>
            <span className="text-[7px] font-mono text-gray-400 italic tracking-tight uppercase">Adjusting timeline...</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0, 0, 0, 0, 1, 1, 0] }}
            transition={{
              times: [0, 0.5, 0.55, 0.6, 0.65, 0.68, 0.72, 0.95, 1],
              duration: 10,
              repeat: Infinity,
            }}
            className="absolute flex items-center gap-2 px-1"
          >
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-1 h-1 rounded-full bg-gray-700"
            />
            <span className="text-[7px] font-mono text-gray-400 italic tracking-tight uppercase">Stress testing...</span>
          </motion.div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[6px] p-3 shadow-sm flex flex-col gap-2.5 mt-2">
          {[
            { label: 'Purchase 1', years: ['2026', '2026', '2026'] },
            { label: 'Equity Release', years: ['2029', '2031', '2031'] },
            { label: 'Purchase 2', years: ['2031', '2035', '2036'] },
            { label: 'Purchase 3', years: ['2036', '2042', '2044'] },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-700" />
                <span className="text-[8px] text-gray-400 font-medium tracking-tight uppercase">{item.label}</span>
              </div>
              <div className="relative w-8 h-3 flex items-center justify-end overflow-hidden">
                {item.years.map((year, yearIdx) => (
                  <motion.span
                    key={yearIdx}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity:
                        yearIdx === 0
                          ? [1, 1, 0, 0, 0, 0, 1]
                          : yearIdx === 1
                          ? [0, 0, 1, 1, 0, 0, 0]
                          : [0, 0, 0, 0, 1, 1, 0],
                    }}
                    transition={{
                      times: [0, 0.45, 0.5, 0.65, 0.7, 0.95, 1],
                      duration: 10,
                      repeat: Infinity,
                    }}
                    className="absolute text-[8px] font-mono font-bold text-gray-900 tabular-nums"
                  >
                    {year}
                  </motion.span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 opacity-30">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        <span className="text-[7px] text-gray-900 font-medium tracking-tight">Ask about this plan...</span>
      </div>
    </motion.div>
  </IllustrationBox>
);

/* ─── 2. THE ROADMAP ─── */
const RoadmapIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[280px] h-[180px] relative p-4 flex flex-col justify-center"
    >
      <div className="relative h-24">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.8, repeat: Infinity, repeatDelay: 6.9, ease: 'easeOut' }}
          className="absolute top-1/2 left-4 right-4 h-[1.5px] bg-gray-200 origin-left"
        />
        {[
          { label: '$450k QLD', x: '10%', delay: 1.0, color: '#7F56D9' },
          { label: '$520k NSW', x: '35%', delay: 1.8, color: '#6B7280' },
          { label: '$380k VIC', x: '60%', delay: 2.6, color: '#7F56D9' },
          { label: '$610k QLD', x: '85%', delay: 3.4, color: '#6B7280' },
        ].map((node, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -15, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: node.delay, duration: 0.5, repeat: Infinity, repeatDelay: 8 - node.delay - 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
            style={{ left: node.x }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: node.delay + 0.2, duration: 0.3, repeat: Infinity, repeatDelay: 8 - node.delay - 0.5 }}
              className="w-3 h-3 rounded-full border-2 bg-white"
              style={{ borderColor: node.color }}
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: node.delay + 0.4, duration: 0.3, repeat: Infinity, repeatDelay: 8 - node.delay - 0.7 }}
              className="text-[7px] font-bold text-gray-700 whitespace-nowrap mt-1"
            >
              {node.label}
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: node.delay + 0.5, duration: 0.3, repeat: Infinity, repeatDelay: 8 - node.delay - 0.8 }}
              className="text-[6px] text-gray-400"
            >
              {2026 + i * 3}
            </motion.span>
          </motion.div>
        ))}
        {[
          { left: '10%', width: '25%', delay: 1.8 },
          { left: '35%', width: '25%', delay: 2.6 },
          { left: '60%', width: '25%', delay: 3.4 },
        ].map((seg, i) => (
          <motion.div
            key={i}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: seg.delay, duration: 0.4, repeat: Infinity, repeatDelay: 8 - seg.delay - 0.4 }}
            className="absolute top-1/2 h-[1.5px] bg-gray-400 origin-left"
            style={{ left: seg.left, width: seg.width }}
          />
        ))}
      </div>

      {/* "Not a static PDF" tagline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4.5, duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        className="mt-3 flex justify-center"
      >
        <span className="text-[6px] text-gray-400 font-medium tracking-wide uppercase">Not a static PDF — a living roadmap</span>
      </motion.div>
    </motion.div>
  </IllustrationBox>
);

/* ─── 3. SCENARIO PLANNING ─── */
const ScenarioIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[170px] relative p-3 flex gap-3"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5, repeat: Infinity, repeatDelay: 7.2 }}
        className="flex-1 border border-gray-200 rounded-lg p-2.5 bg-white flex flex-col"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7F56D9]" />
          <span className="text-[7px] font-bold text-gray-700">Scenario A</span>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
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
              transition={{ delay: 0.8 + i * 0.2, duration: 0.3, repeat: Infinity, repeatDelay: 6.6 - i * 0.2 }}
              className="flex justify-between items-center"
            >
              <span className="text-[6px] text-gray-400">{row.label}</span>
              <span className="text-[7px] font-bold text-gray-900 tabular-nums">{row.val}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 2, duration: 0.6, repeat: Infinity, repeatDelay: 5.4 }}
          className="h-1 bg-[#7F56D9]/20 rounded-full mt-2"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2.5, duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
        className="flex-1 border border-gray-200 rounded-lg p-2.5 bg-white flex flex-col"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span className="text-[7px] font-bold text-gray-700">Scenario B</span>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
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
              transition={{ delay: 3 + i * 0.2, duration: 0.3, repeat: Infinity, repeatDelay: 4.4 - i * 0.2 }}
              className="flex justify-between items-center"
            >
              <span className="text-[6px] text-gray-400">{row.label}</span>
              <span className="text-[7px] font-bold text-gray-900 tabular-nums">{row.val}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 4.2, duration: 0.6, repeat: Infinity, repeatDelay: 3.2 }}
          className="h-1 bg-gray-300 rounded-full mt-2"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ times: [0, 0.55, 0.6, 0.9, 0.95], duration: 8, repeat: Infinity }}
        className="absolute top-3 bottom-3 left-1/2 w-[1px] bg-gray-300"
      />
    </motion.div>
  </IllustrationBox>
);

/* ─── 4. THE TOOLKIT ─── */
const ToolkitIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[240px] h-[160px] relative p-3 flex flex-col gap-2.5"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4, repeat: Infinity, repeatDelay: 7.3 }}
        className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center gap-2"
      >
        <span className="text-[7px] text-gray-400">State</span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3, repeat: Infinity, repeatDelay: 6.9 }}
          className="bg-gray-100 rounded px-2 py-0.5"
        >
          <span className="text-[7px] font-bold text-gray-700">QLD</span>
        </motion.div>
        <span className="text-[7px] text-gray-400 ml-2">Price</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.3, repeat: Infinity, repeatDelay: 6.4 }}
          className="text-[8px] font-bold text-gray-900 tabular-nums"
        >
          $450,000
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.5, repeat: Infinity, repeatDelay: 5.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2"
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
            transition={{ delay: 2.5 + i * 0.3, duration: 0.3, repeat: Infinity, repeatDelay: 5 - i * 0.3 }}
            className="flex items-center justify-between"
          >
            <span className="text-[7px] text-gray-400">{row.label}</span>
            <span className="text-[8px] font-bold text-gray-900 tabular-nums">{row.value}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 3.8, duration: 0.4, repeat: Infinity, repeatDelay: 3.8 }}
          className="h-[1px] bg-gray-200 origin-left"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.2, duration: 0.3, repeat: Infinity, repeatDelay: 3.5 }}
          className="flex items-center justify-between"
        >
          <span className="text-[7px] font-bold text-gray-700">Total upfront</span>
          <span className="text-[9px] font-bold text-gray-900 tabular-nums">$21,495</span>
        </motion.div>
      </motion.div>
    </motion.div>
  </IllustrationBox>
);

/* ─── 5. THE CLIENT PORTAL ─── */
const ClientPortalIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[240px] h-[160px] relative p-4 flex flex-col items-center justify-center gap-3"
    >
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, repeat: Infinity, repeatDelay: 7.3 }}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm w-full"
      >
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: 'auto' }}
          transition={{ delay: 0.8, duration: 0.6, repeat: Infinity, repeatDelay: 6.6 }}
          className="text-[8px] text-gray-500 font-mono overflow-hidden whitespace-nowrap"
        >
          proppath.co/client/john
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scaleY: 0, originY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay: 1.8, duration: 0.6, repeat: Infinity, repeatDelay: 5.6, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm w-full"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">
            <span className="text-[6px] font-bold text-gray-500">JP</span>
          </div>
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 0.3, repeat: Infinity, repeatDelay: 5.2 }}
              className="text-[7px] font-bold text-gray-900"
            >
              John's Portfolio Roadmap
            </motion.div>
            <div className="text-[6px] text-gray-400">4 properties · 15 year plan</div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {[70, 55, 40, 85].map((w, i) => (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              animate={{ width: `${w}%` }}
              transition={{ delay: 3 + i * 0.25, duration: 0.5, repeat: Infinity, repeatDelay: 4.5 - i * 0.25 }}
              className="h-1 bg-gray-200 rounded-full"
            />
          ))}
        </div>
      </motion.div>

      {/* Feature tags */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4.5, duration: 0.4, repeat: Infinity, repeatDelay: 3.1 }}
        className="flex flex-wrap gap-1 justify-center"
      >
        {['Portfolio', 'Property', 'Plan', 'Brief', 'Progress', 'Deal'].map((tag) => (
          <span key={tag} className="text-[5px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{tag}</span>
        ))}
      </motion.div>
    </motion.div>
  </IllustrationBox>
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
    {/* Section intro */}
    <div className="max-w-none mb-16 md:mb-20">
      <h2 className="text-3xl md:text-[36px] font-semibold tracking-tight leading-[1.2] mb-4">
        <span className="text-gray-900">A new standard for portfolio planning.</span>{' '}
        <span className="text-gray-400">
          PropPath gives agents the ability to build property roadmaps in minutes.
        </span>
      </h2>
    </div>

    {/* Sub-heading */}
    <div className="mb-12 md:mb-16 border-t border-gray-200 pt-12">
      <h2 className="text-3xl font-semibold text-gray-900 mb-4">Everything you need to build, manage, and share property plans with speed and clarity.</h2>
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
          <div className="h-[240px] flex items-center justify-center p-4">
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
          <div className="h-[200px] flex items-center justify-center p-3">
            {feature.illustration}
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;

import React from 'react';
import { motion } from 'framer-motion';

/* ─────────────── Illustration wrapper (centering only, no bg) ─────────────── */
const IllustrationBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   EXISTING ILLUSTRATIONS — preserved exactly, just reorganized
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── AI PLANNING: Conversational AI (PoweredByAI) ─── */
const ConversationalAIIllustration: React.FC = () => (
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

/* ─── AI PLANNING: Speed checklist (DesignedForSpeed) ─── */
const SpeedChecklistIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 7, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[180px] relative p-4 flex items-center justify-center gap-12"
    >
      <div className="flex flex-col gap-4">
        {[
          { label: 'Client inputs', at: 0.5 },
          { label: 'Roadmap built', at: 1.5 },
          { label: 'Optimised', at: 2.5 },
          { label: 'Presented', at: 3.5 },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="relative w-[10px] h-[10px]">
              <div className="absolute inset-0 rounded-full border-[1.2px] border-gray-200" />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: item.at, duration: 0.3, repeat: Infinity, repeatDelay: 6.5 - item.at }}
                className="absolute inset-0 rounded-full bg-gray-900 flex items-center justify-center p-[1px]"
              >
                <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5L4 7L8 3" />
                </svg>
              </motion.div>
            </div>
            <motion.span
              initial={{ color: '#9ca3af' }}
              animate={{ color: '#111827' }}
              transition={{ delay: item.at, duration: 0.3, repeat: Infinity, repeatDelay: 6.5 - item.at }}
              className="text-[8px] font-medium tracking-tight"
            >
              {item.label}
            </motion.span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4.2, duration: 0.5, repeat: Infinity, repeatDelay: 2.3 }}
          className="bg-gray-900 px-5 py-2 rounded-full flex items-center justify-center gap-2.5 shadow-xl"
        >
          <span className="text-[9px] font-bold text-white tracking-widest uppercase">SEND</span>
          <div className="w-3 h-3 rounded-full bg-white/10 flex items-center justify-center">
            <svg viewBox="0 0 10 10" className="w-[6px] h-[6px] text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 5l3 3 5-7" />
            </svg>
          </div>
        </motion.div>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5.2, duration: 0.4, repeat: Infinity, repeatDelay: 1.4 }}
          className="text-[6px] font-mono text-gray-400 uppercase tracking-tighter mt-3"
        >
          Deliverable ready
        </motion.span>
      </div>
    </motion.div>
  </IllustrationBox>
);

/* ─── AI PLANNING: Platform overview (BuiltForPurpose) ─── */
const PlatformOverviewIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 7, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[280px] h-[180px] relative p-4 flex flex-col gap-2"
    >
      <div className="flex gap-2 flex-1">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 6.6 }}
          className="w-12 border border-gray-200 rounded-[3px] p-1.5 flex flex-col gap-1.5 shrink-0"
        >
          <div className="w-5 h-1.5 bg-gray-300 rounded-[1px]" />
          <div className="mt-1 flex flex-col gap-1.5">
            {[1, 0.6, 0.6, 0.6].map((opacity, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: i === 0 ? '#6B7280' : '#D1D5DB' }} />
                <div className="h-1 rounded-[0.5px] flex-1" style={{ backgroundColor: i === 0 ? '#9CA3AF' : '#E5E7EB', opacity }} />
              </div>
            ))}
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col gap-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4, repeat: Infinity, repeatDelay: 6.3 }}
            className="flex gap-1.5"
          >
            <div className="bg-gray-200 rounded-[2px] px-2 py-0.5">
              <span className="text-[5px] font-bold text-gray-700">Portfolio Plan</span>
            </div>
            <div className="bg-gray-100 rounded-[2px] px-2 py-0.5">
              <span className="text-[5px] text-gray-400">Brief</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5, repeat: Infinity, repeatDelay: 5.7 }}
            className="border border-gray-200 rounded-[3px] p-2 flex-1 flex flex-col"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[5px] font-bold text-gray-700">Total Equity</span>
              <span className="text-[6px] font-bold text-gray-900">$1.6M</span>
            </div>
            <div className="flex-1 relative">
              <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="none">
                <motion.path
                  d="M0,45 C30,44 60,42 90,36 S140,22 170,12 L200,5"
                  fill="none"
                  stroke="#7F56D9"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.2, duration: 1.5, repeat: Infinity, repeatDelay: 4.3 }}
                />
                <motion.path
                  d="M0,45 C30,44 60,42 90,36 S140,22 170,12 L200,5 L200,50 L0,50 Z"
                  fill="#7F56D9"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.08 }}
                  transition={{ delay: 2, duration: 0.5, repeat: Infinity, repeatDelay: 4.5 }}
                />
              </svg>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8, duration: 0.4, repeat: Infinity, repeatDelay: 3.8 }}
            className="border border-gray-200 rounded-[3px] p-1.5 flex flex-col gap-1"
          >
            {['QLD Townhouse · $450k', 'NSW House · $520k', 'VIC Unit · $380k'].map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 3 + i * 0.3, duration: 0.3, repeat: Infinity, repeatDelay: 3.4 - i * 0.3 }}
                className="flex items-center justify-between"
              >
                <span className="text-[5px] text-gray-500">{row}</span>
                <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${[65, 80, 45][i]}%` }}
                    transition={{ delay: 3.3 + i * 0.3, duration: 0.5, repeat: Infinity, repeatDelay: 3.1 - i * 0.3 }}
                    className="h-full bg-gray-400 rounded-full"
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  </IllustrationBox>
);

/* ─── ROADMAP: Timeline (RoadmapBuilder) ─── */
const RoadmapTimelineIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[160px] relative p-4 flex flex-col justify-center"
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
    </motion.div>
  </IllustrationBox>
);

/* ─── ROADMAP: Next Purchase (NextPurchase) ─── */
const NextPurchaseIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 7, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[220px] h-[160px] relative p-3 flex items-center justify-center"
    >
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full flex flex-col gap-2.5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, repeat: Infinity, repeatDelay: 6.2 }}
          className="flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
            <span className="text-[8px]">🏠</span>
          </div>
          <div>
            <div className="text-[8px] font-bold text-gray-900">QLD Townhouse</div>
            <div className="text-[6px] text-gray-400">High-growth corridor</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
          className="flex justify-between items-center border-t border-gray-100 pt-2"
        >
          <span className="text-[7px] text-gray-400">Purchase price</span>
          <span className="text-[9px] font-bold text-gray-900">$450,000</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.3, repeat: Infinity, repeatDelay: 4.7 }}
          className="flex flex-col gap-1"
        >
          <div className="flex justify-between">
            <span className="text-[6px] text-gray-400">Funding</span>
            <span className="text-[6px] font-bold text-gray-600">$80k deposit + equity</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 2.3, duration: 1, repeat: Infinity, repeatDelay: 3.7 }}
              className="h-full bg-gray-400 rounded-full"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 3.8, duration: 0.4, repeat: Infinity, repeatDelay: 2.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center"
        >
          <div className="bg-green-50 border border-green-200 rounded-full px-3 py-0.5 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[7px] font-bold text-green-700">Ready to purchase</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  </IllustrationBox>
);

/* ─── SCENARIO: A vs B (ScenarioPlanning) ─── */
const ScenarioCompareIllustration: React.FC = () => (
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

/* ─── CLIENT PORTAL: Portal preview (ClientPortal) ─── */
const PortalPreviewIllustration: React.FC = () => (
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
    </motion.div>
  </IllustrationBox>
);

/* ─── CLIENT PORTAL: Portfolio view (PortfolioView) ─── */
const PortfolioViewIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[170px] relative p-3"
    >
      <div className="grid grid-cols-2 gap-2 mb-2">
        {[
          { name: 'QLD Townhouse', price: '$450k', equity: 65, color: '#7F56D9' },
          { name: 'NSW House', price: '$520k', equity: 80, color: '#6B7280' },
          { name: 'VIC Unit', price: '$380k', equity: 45, color: '#7F56D9' },
          { name: 'QLD Duplex', price: '$610k', equity: 30, color: '#6B7280' },
        ].map((prop, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.5, duration: 0.4, repeat: Infinity, repeatDelay: 7 - i * 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-gray-200 rounded-lg p-2 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[6px] font-bold text-gray-700">{prop.name}</span>
              <span className="text-[6px] font-bold text-gray-500">{prop.price}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${prop.equity}%` }}
                transition={{ delay: 0.9 + i * 0.5, duration: 0.8, repeat: Infinity, repeatDelay: 6.3 - i * 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: prop.color }}
              />
            </div>
            <div className="text-[5px] text-gray-400 text-right">{prop.equity}% equity</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.5, duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-1.5"
      >
        <span className="text-[7px] text-gray-400 font-medium">Total portfolio equity</span>
        <span className="text-[9px] font-bold text-gray-900">$1,694,820</span>
      </motion.div>
    </motion.div>
  </IllustrationBox>
);

/* ─── CLIENT PORTAL: Client management (ClientManagement) ─── */
const ClientManagementIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[160px] relative p-3 flex flex-col gap-2"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4, repeat: Infinity, repeatDelay: 7.3 }}
        className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center gap-2.5"
      >
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <span className="text-[7px] font-bold text-gray-600">JD</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-bold text-gray-900">John Davis</div>
          <div className="text-[6px] text-gray-400">4 properties · Active</div>
        </div>
        <div className="text-[6px] text-gray-400">$120k income</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4, repeat: Infinity, repeatDelay: 6.4 }}
        className="bg-white border border-gray-200 rounded-lg p-2.5"
      >
        <div className="text-[6px] text-gray-400 font-medium mb-2 uppercase tracking-wider">Milestones</div>
        <div className="flex items-center gap-1.5">
          {[
            { label: 'P1', done: true, delay: 1.8 },
            { label: 'Eq.', done: true, delay: 2.4 },
            { label: 'P2', done: false, delay: 3.0 },
            { label: 'P3', done: false, delay: 3.6 },
          ].map((ms, i) => (
            <React.Fragment key={i}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: ms.delay, duration: 0.3, repeat: Infinity, repeatDelay: 8 - ms.delay - 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[5px] font-bold shrink-0 ${
                  ms.done ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-400'
                }`}
              >
                {ms.done ? '✓' : ms.label}
              </motion.div>
              {i < 3 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: ms.delay + 0.2, duration: 0.3, repeat: Infinity, repeatDelay: 8 - ms.delay - 0.5 }}
                  className={`h-[1px] flex-1 origin-left ${ms.done ? 'bg-gray-400' : 'bg-gray-200'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 4.5, duration: 0.5, repeat: Infinity, repeatDelay: 3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-gray-200 rounded-lg p-2 flex items-center gap-2 shadow-sm"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ delay: 5, duration: 0.4, repeat: Infinity, repeatDelay: 7.6 }}
          className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center shrink-0"
        >
          <span className="text-[8px]">🔔</span>
        </motion.div>
        <div>
          <div className="text-[7px] font-bold text-gray-900">Milestone reached</div>
          <div className="text-[6px] text-gray-400">John is ready for Purchase 2 conversation</div>
        </div>
      </motion.div>
    </motion.div>
  </IllustrationBox>
);

/* ═══════════════════════════════════════════════════════════════════════
   NEW ILLUSTRATIONS
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── SCENARIO: Stress testing ─── */
const StressTestIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[240px] h-[170px] relative p-4 flex flex-col gap-3"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4, repeat: Infinity, repeatDelay: 7.3 }}
        className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2"
      >
        <div className="text-[6px] text-gray-400 font-medium uppercase tracking-wider">Stress Test Parameters</div>
        {[
          { label: 'Interest rate', values: ['5.5%', '6.5%', '7.0%'] },
          { label: 'Vacancy', values: ['2 wks', '4 wks', '6 wks'] },
          { label: 'Growth rate', values: ['6.0%', '4.0%', '3.0%'] },
        ].map((param, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[7px] text-gray-400">{param.label}</span>
            <div className="relative w-8 h-3 flex items-center justify-end overflow-hidden">
              {param.values.map((val, vIdx) => (
                <motion.span
                  key={vIdx}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: vIdx === 0 ? [1, 1, 0, 0, 0, 0, 1] : vIdx === 1 ? [0, 0, 1, 1, 0, 0, 0] : [0, 0, 0, 0, 1, 1, 0],
                  }}
                  transition={{ times: [0, 0.3, 0.35, 0.6, 0.65, 0.9, 0.95], duration: 8, repeat: Infinity }}
                  className="absolute text-[8px] font-mono font-bold text-gray-900 tabular-nums"
                >
                  {val}
                </motion.span>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0, 0, 0] }}
        transition={{ times: [0, 0.3, 0.38, 0.58, 0.63, 0.9, 1], duration: 8, repeat: Infinity }}
        className="flex justify-center"
      >
        <div className="bg-green-50 border border-green-200 rounded-full px-3 py-1 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[7px] font-bold text-green-700">Still feasible</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 0] }}
        transition={{ times: [0, 0.3, 0.35, 0.6, 0.63, 0.68, 0.9, 0.95], duration: 8, repeat: Infinity }}
        className="flex justify-center"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-[7px] font-bold text-amber-700">Tight — review timeline</span>
        </div>
      </motion.div>
    </motion.div>
  </IllustrationBox>
);

/* ─── TOOLKIT: Calculator ─── */
const CalculatorIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[240px] h-[170px] relative p-3 flex flex-col gap-2.5"
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

/* ─── TOOLKIT: Tool grid ─── */
const ToolGridIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 7, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[240px] h-[160px] relative p-3"
    >
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Borrowing', icon: '📊', delay: 0.3 },
          { label: 'Stamp Duty', icon: '🏛️', delay: 0.6 },
          { label: 'Land Tax', icon: '📋', delay: 0.9 },
          { label: 'LMI', icon: '🛡️', delay: 1.2 },
          { label: 'Repayments', icon: '💰', delay: 1.5 },
          { label: 'Contracts', icon: '📄', delay: 1.8 },
        ].map((tool, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: tool.delay, duration: 0.4, repeat: Infinity, repeatDelay: 6.5 - tool.delay, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-gray-200 rounded-lg p-2.5 flex flex-col items-center gap-1.5"
          >
            <span className="text-[12px]">{tool.icon}</span>
            <span className="text-[6px] font-bold text-gray-600 text-center">{tool.label}</span>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 0.5, repeat: Infinity, repeatDelay: 3.5 }}
        className="mt-2 flex justify-center"
      >
        <span className="text-[6px] text-gray-400 font-medium">All tools. One platform.</span>
      </motion.div>
    </motion.div>
  </IllustrationBox>
);

/* ═══════════════════════════════════════════════════════════════════════
   MINI ILLUSTRATIONS — compact visuals for small bento cards
   ═══════════════════════════════════════════════════════════════════════ */

const DecadeBarsMini: React.FC = () => (
  <div className="flex items-end justify-center gap-5 w-full h-full px-4 pb-2 pt-4">
    {[
      { label: '10 yrs', pct: 35, value: '$620k', delay: 0.5 },
      { label: '20 yrs', pct: 60, value: '$1.4M', delay: 1.0 },
      { label: '30 yrs', pct: 90, value: '$3.2M', delay: 1.5 },
    ].map((bar, i) => (
      <div key={i} className="flex flex-col items-center gap-1.5 w-14">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: bar.delay + 0.6, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
          className="text-[8px] font-bold text-gray-900 tabular-nums"
        >
          {bar.value}
        </motion.span>
        <div className="w-full h-[70px] bg-gray-100 rounded-md relative overflow-hidden flex items-end">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${bar.pct}%` }}
            transition={{ delay: bar.delay, duration: 0.6, repeat: Infinity, repeatDelay: 5.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full bg-gray-300 rounded-md"
          />
        </div>
        <span className="text-[7px] text-gray-400 font-medium">{bar.label}</span>
      </div>
    ))}
  </div>
);

const UnifiedMetricsMini: React.FC = () => (
  <div className="flex flex-col gap-3 w-[200px] py-2">
    {[
      { label: 'Total Equity', value: '$1.6M', pct: 75, delay: 0.5 },
      { label: 'Net Cashflow', value: '+$42k', pct: 55, delay: 1.0 },
      { label: 'Borrowing Cap.', value: '$1.2M', pct: 85, delay: 1.5 },
    ].map((metric, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: metric.delay, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
        className="flex flex-col gap-1"
      >
        <div className="flex items-center justify-between">
          <span className="text-[7px] text-gray-400 font-medium">{metric.label}</span>
          <span className="text-[8px] font-bold text-gray-900 tabular-nums">{metric.value}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${metric.pct}%` }}
            transition={{ delay: metric.delay + 0.2, duration: 0.6, repeat: Infinity, repeatDelay: 5.3 }}
            className="h-full bg-gray-400 rounded-full"
          />
        </div>
      </motion.div>
    ))}
  </div>
);

const LivingDocMini: React.FC = () => (
  <div className="flex items-center justify-center gap-6 w-full h-full">
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0.2, 0.2] }}
      transition={{ times: [0, 0.3, 0.4, 1], duration: 6, repeat: Infinity }}
      className="flex flex-col items-center gap-2"
    >
      <div className="w-10 h-12 border border-gray-300 rounded bg-white flex flex-col items-center justify-center gap-1">
        <div className="w-5 h-[1px] bg-gray-200" />
        <div className="w-5 h-[1px] bg-gray-200" />
        <div className="w-3 h-[1px] bg-gray-200" />
      </div>
      <span className="text-[7px] text-gray-400">Static PDF</span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0, 1, 1] }}
      transition={{ times: [0, 0.3, 0.45, 1], duration: 6, repeat: Infinity }}
      className="text-[10px] text-gray-300"
    >
      →
    </motion.div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0, 1, 1] }}
      transition={{ times: [0, 0.35, 0.5, 1], duration: 6, repeat: Infinity }}
      className="flex flex-col items-center gap-2"
    >
      <motion.div
        animate={{ boxShadow: ['0 0 0 0 rgba(127,86,217,0)', '0 0 0 4px rgba(127,86,217,0.15)', '0 0 0 0 rgba(127,86,217,0)'] }}
        transition={{ duration: 2, repeat: Infinity, delay: 3 }}
        className="w-10 h-12 border border-[#7F56D9] rounded bg-white flex flex-col items-center justify-center gap-1"
      >
        <div className="w-5 h-[1px] bg-[#7F56D9]/30" />
        <div className="w-5 h-[1px] bg-[#7F56D9]/30" />
        <div className="w-3 h-[1px] bg-[#7F56D9]/30" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-0.5" />
      </motion.div>
      <span className="text-[7px] text-gray-700 font-medium">Live roadmap</span>
    </motion.div>
  </div>
);

const MilestoneTrackMini: React.FC = () => (
  <div className="flex items-center justify-center gap-2 w-full h-full px-4">
    {[
      { label: 'P1', delay: 0.5 },
      { label: 'Eq.', delay: 1.2 },
      { label: 'P2', delay: 1.9 },
      { label: 'P3', delay: 2.6 },
    ].map((ms, i) => (
      <React.Fragment key={i}>
        <div className="relative w-7 h-7">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-gray-200 flex items-center justify-center">
            <span className="text-[6px] text-gray-300 font-bold">{ms.label}</span>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: ms.delay, duration: 0.3, repeat: Infinity, repeatDelay: 6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 rounded-full bg-gray-900 flex items-center justify-center"
          >
            <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M2 5L4 7L8 3" />
            </svg>
          </motion.div>
        </div>
        {i < 3 && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: ms.delay + 0.2, duration: 0.4, repeat: Infinity, repeatDelay: 5.8 }}
            className="w-4 h-[1.5px] bg-gray-300 origin-left"
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

const GrowthCounterMini: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
    <div className="text-[7px] text-gray-400 font-medium uppercase tracking-wider">Portfolio Value</div>
    <div className="relative h-6 w-28 overflow-hidden">
      {['$420,000', '$820,000', '$1,480,000', '$2,160,000'].map((val, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: [0, 0, 1, 1, 0, 0],
            y: [10, 10, 0, 0, -10, -10],
          }}
          transition={{
            times: [i * 0.22, i * 0.22 + 0.03, i * 0.22 + 0.06, (i + 1) * 0.22, (i + 1) * 0.22 + 0.03, 1],
            duration: 8,
            repeat: Infinity,
          }}
          className="absolute inset-0 flex items-center justify-center text-[14px] font-bold text-gray-900 tabular-nums"
        >
          {val}
        </motion.div>
      ))}
    </div>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: '80%' }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      className="h-1 bg-gray-200 rounded-full"
    />
  </div>
);

const StrategyShiftMini: React.FC = () => (
  <div className="flex flex-col gap-2.5 w-[180px] py-2">
    {[
      { label: 'Equity', a: '65%', b: '78%', delay: 0.5 },
      { label: 'Cashflow', a: '+$32k', b: '+$58k', delay: 1.0 },
      { label: 'Timeline', a: '15 yrs', b: '12 yrs', delay: 1.5 },
    ].map((row, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: row.delay, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
        className="flex items-center gap-2"
      >
        <span className="text-[7px] text-gray-400 w-12">{row.label}</span>
        <div className="flex-1 flex items-center gap-1.5">
          <span className="text-[7px] font-bold text-gray-500 tabular-nums">{row.a}</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: row.delay + 0.4, duration: 0.2, repeat: Infinity, repeatDelay: 5.1 }}
            className="text-[8px] text-gray-300"
          >
            →
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: row.delay + 0.6, duration: 0.3, repeat: Infinity, repeatDelay: 4.9 }}
            className="text-[8px] font-bold text-gray-900 tabular-nums"
          >
            {row.b}
          </motion.span>
        </div>
      </motion.div>
    ))}
  </div>
);

const RiskModelMini: React.FC = () => (
  <div className="flex flex-col gap-2 w-[180px] py-2">
    {[
      { label: 'Rate +1.5%', status: 'Pass', color: 'green', delay: 0.5 },
      { label: '4-week vacancy', status: 'Pass', color: 'green', delay: 1.0 },
      { label: '3% growth only', status: 'Review', color: 'amber', delay: 1.5 },
    ].map((test, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: test.delay, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
        className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-1.5"
      >
        <span className="text-[7px] text-gray-500">{test.label}</span>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: test.delay + 0.4, duration: 0.3, repeat: Infinity, repeatDelay: 5.1, ease: [0.16, 1, 0.3, 1] }}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
            test.color === 'green' ? 'bg-green-50' : 'bg-amber-50'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${test.color === 'green' ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className={`text-[6px] font-bold ${test.color === 'green' ? 'text-green-700' : 'text-amber-700'}`}>
            {test.status}
          </span>
        </motion.div>
      </motion.div>
    ))}
  </div>
);

const TradeOffMini: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
    <div className="flex gap-4 w-[180px]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4, repeat: Infinity, repeatDelay: 5.5 }}
        className="flex-1 border border-gray-200 rounded-lg p-2 text-center"
      >
        <div className="text-[6px] text-gray-400 mb-1">Conservative</div>
        <div className="text-[9px] font-bold text-gray-900">$1.2M</div>
        <div className="text-[6px] text-gray-400">15 yrs · 3 props</div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4, repeat: Infinity, repeatDelay: 4.8 }}
        className="flex-1 border border-gray-200 rounded-lg p-2 text-center"
      >
        <div className="text-[6px] text-gray-400 mb-1">Aggressive</div>
        <div className="text-[9px] font-bold text-gray-900">$2.4M</div>
        <div className="text-[6px] text-gray-400">12 yrs · 5 props</div>
      </motion.div>
    </div>
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2, duration: 0.4, repeat: Infinity, repeatDelay: 4 }}
      className="text-[6px] text-gray-400 font-medium"
    >
      The right plan is obvious on the same screen.
    </motion.span>
  </div>
);

const BorrowingMeterMini: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4, repeat: Infinity, repeatDelay: 5.5 }}
      className="w-[160px] flex flex-col gap-1"
    >
      <div className="flex justify-between">
        <span className="text-[7px] text-gray-400">Household income</span>
        <span className="text-[8px] font-bold text-gray-900">$120,000</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[7px] text-gray-400">Existing debt</span>
        <span className="text-[8px] font-bold text-gray-900">$15,000</span>
      </div>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5, repeat: Infinity, repeatDelay: 4.5 }}
      className="w-[160px] border border-gray-200 rounded-lg p-2.5 text-center"
    >
      <div className="text-[6px] text-gray-400 mb-1">Max borrowing</div>
      <div className="text-[14px] font-bold text-gray-900 tabular-nums">$852,000</div>
    </motion.div>
  </div>
);

const DutyComparisonMini: React.FC = () => (
  <div className="flex flex-col gap-2 w-[180px] py-2">
    {[
      { state: 'QLD', duty: '$15,925', delay: 0.5 },
      { state: 'NSW', duty: '$17,990', delay: 1.0 },
      { state: 'VIC', duty: '$18,370', delay: 1.5 },
    ].map((row, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: row.delay, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
            <span className="text-[6px] font-bold text-gray-600">{row.state}</span>
          </div>
          <span className="text-[7px] text-gray-500">on $450k</span>
        </div>
        <span className="text-[8px] font-bold text-gray-900 tabular-nums">{row.duty}</span>
      </motion.div>
    ))}
  </div>
);

const LoanBreakdownMini: React.FC = () => (
  <div className="flex flex-col gap-2.5 w-[180px] py-2">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
      className="flex items-center justify-between"
    >
      <span className="text-[7px] text-gray-400">P&I monthly</span>
      <span className="text-[8px] font-bold text-gray-900 tabular-nums">$2,340</span>
    </motion.div>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.0, duration: 0.3, repeat: Infinity, repeatDelay: 5.0 }}
      className="flex items-center justify-between"
    >
      <span className="text-[7px] text-gray-400">IO monthly</span>
      <span className="text-[8px] font-bold text-gray-900 tabular-nums">$1,687</span>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 0.4, repeat: Infinity, repeatDelay: 4.2 }}
      className="border-t border-gray-100 pt-2 flex items-center justify-between"
    >
      <span className="text-[7px] text-gray-400">Buffer rate (6%)</span>
      <span className="text-[8px] font-bold text-gray-900 tabular-nums">$2,846</span>
    </motion.div>
  </div>
);

const LoanEquityMini: React.FC = () => (
  <div className="flex flex-col gap-3 w-[180px] py-2">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
      className="flex flex-col gap-1"
    >
      <div className="flex justify-between">
        <span className="text-[7px] text-gray-400">Loan balance</span>
        <span className="text-[8px] font-bold text-gray-900 tabular-nums">$360,000</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '60%' }}
          transition={{ delay: 1.5, duration: 1.5, repeat: Infinity, repeatDelay: 4 }}
          className="h-full bg-gray-400 rounded-full"
        />
      </div>
    </motion.div>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.0, duration: 0.3, repeat: Infinity, repeatDelay: 5.0 }}
      className="flex flex-col gap-1"
    >
      <div className="flex justify-between">
        <span className="text-[7px] text-gray-400">Equity position</span>
        <span className="text-[8px] font-bold text-[#7F56D9] tabular-nums">$290,000</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '20%' }}
          animate={{ width: '65%' }}
          transition={{ delay: 1.5, duration: 1.5, repeat: Infinity, repeatDelay: 4 }}
          className="h-full bg-[#7F56D9] rounded-full"
        />
      </div>
    </motion.div>
  </div>
);

const FeatureTagsMini: React.FC = () => (
  <div className="flex flex-wrap items-center justify-center gap-2 w-full h-full px-4">
    {['Portfolio', 'Property', 'Plan', 'Brief', 'Progress', 'Deal'].map((tag, i) => (
      <motion.div
        key={tag}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 + i * 0.3, duration: 0.3, repeat: Infinity, repeatDelay: 6 - i * 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-gray-200 rounded-full px-3 py-1"
      >
        <span className="text-[8px] font-medium text-gray-700">{tag}</span>
      </motion.div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   BENTO SECTION LAYOUT
   ═══════════════════════════════════════════════════════════════════════ */

interface BentoCardProps {
  title: string;
  desc: string;
  children: React.ReactNode;
  large?: boolean;
}

const BentoCard: React.FC<BentoCardProps> = ({ title, desc, children, large }) => (
  <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col">
    <div className={large ? 'p-6 pb-0' : 'p-5 pb-0'}>
      <h4 className={`font-semibold text-gray-900 ${large ? 'text-[15px] mb-1.5' : 'text-[14px] mb-1'}`}>{title}</h4>
      <p className="text-[13px] text-gray-500 leading-relaxed">{desc}</p>
    </div>
    <div className={`flex items-center justify-center ${large ? 'h-[230px] p-4' : 'h-[160px] p-3'}`}>
      {children}
    </div>
  </div>
);

interface SectionHeaderProps {
  label: string;
  title: string;
  description?: string;
  bullets?: string[];
  tagline?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, title, description, bullets, tagline }) => (
  <div className="mb-10">
    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-5 block">{label}</span>
    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-16">
      <h3 className="text-[24px] md:text-[28px] font-semibold text-gray-900 leading-[1.3] lg:max-w-md shrink-0">
        {title}
      </h3>
      {(description || bullets || tagline) && (
        <div className="flex flex-col gap-3 max-w-lg">
          {description && (
            <p className="text-[15px] text-gray-500 leading-relaxed">{description}</p>
          )}
          {bullets && (
            <ul className="flex flex-col gap-2">
              {bullets.map((b, i) => (
                <li key={i} className="text-[15px] text-gray-500 leading-relaxed flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-[7px] shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          )}
          {tagline && (
            <p className="text-[15px] text-gray-700 font-medium leading-relaxed">{tagline}</p>
          )}
        </div>
      )}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

const HowItWorks: React.FC = () => (
  <section id="how-it-works" className="py-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
    {/* Section intro */}
    <div className="max-w-none mb-24 md:mb-32">
      <h2 className="text-3xl md:text-[36px] font-semibold tracking-tight leading-[1.2] mb-4">
        <span className="text-gray-900">A new standard for portfolio planning.</span>{' '}
        <span className="text-gray-400">
          PropPath gives agents the ability to build property roadmaps in minutes.
        </span>
      </h2>
    </div>

    {/* ═══ AI-POWERED PLANNING ═══ */}
    <div className="mb-24 md:mb-32">
      <SectionHeader
        label="AI-POWERED PLANNING"
        title="Describe a client scenario in plain language."
        description="PropPath reasons through assumptions and constraints, builds the roadmap, and helps you refine it through conversation."
        bullets={[
          'See how different acquisition sequences perform over 10, 20, and 30 years',
          'Forecast long-term equity, cashflow, and borrowing capacity in one view',
          'Move from discovery call to client presentation the same day',
        ]}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <BentoCard large title="Conversational planning" desc="Ask questions, adjust assumptions, and watch the roadmap update in real time.">
          <ConversationalAIIllustration />
        </BentoCard>
        <BentoCard large title="Discovery to delivery" desc="Client inputs to client-ready presentation, all in one sitting.">
          <SpeedChecklistIllustration />
        </BentoCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BentoCard title="Multi-decade modeling" desc="See how different sequences perform over 10, 20, and 30 years.">
          <DecadeBarsMini />
        </BentoCard>
        <BentoCard title="Unified projections" desc="Equity, cashflow, and borrowing capacity in a single view.">
          <UnifiedMetricsMini />
        </BentoCard>
        <BentoCard title="Purpose-built platform" desc="Every feature shaped by the workflows of real Australian buyers' agents.">
          <PlatformOverviewIllustration />
        </BentoCard>
      </div>
    </div>

    {/* ═══ THE ROADMAP ═══ */}
    <div className="mb-24 md:mb-32">
      <SectionHeader
        label="THE ROADMAP"
        title="Every client gets a clear, visual journey."
        description="From where they are today to where they want to be. Each property decision connects to the next. Each milestone is trackable."
        tagline="Not a static PDF. A living roadmap that updates as they grow."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <BentoCard large title="Visual property journey" desc="Each acquisition connects to the next across a clear, long-term timeline.">
          <RoadmapTimelineIllustration />
        </BentoCard>
        <BentoCard large title="Connected decisions" desc="Property type, timing, funding, and readiness — all linked to the plan.">
          <NextPurchaseIllustration />
        </BentoCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BentoCard title="Living roadmap" desc="Not a static export. A document that evolves with the portfolio.">
          <LivingDocMini />
        </BentoCard>
        <BentoCard title="Trackable milestones" desc="Every milestone flagged. Every step connected to the next.">
          <MilestoneTrackMini />
        </BentoCard>
        <BentoCard title="Grows with your client" desc="Portfolio value and projections update with every new property.">
          <GrowthCounterMini />
        </BentoCard>
      </div>
    </div>

    {/* ═══ SCENARIO PLANNING ═══ */}
    <div className="mb-24 md:mb-32">
      <SectionHeader
        label="SCENARIO PLANNING"
        title="Acquisition order matters. State matters. Timing matters."
        description="Most BAs pick a path and commit. PropPath lets you compare them side by side before anyone signs a contract."
        bullets={[
          'See how equity, cashflow, and timeline shift across different strategies',
          'Stress test against rate rises, vacancy, or slower growth',
          'Show the client exactly what the conservative path costs versus the aggressive one',
        ]}
        tagline="The right plan is obvious when both plans are on the same screen."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <BentoCard large title="Side-by-side comparison" desc="Compare equity, cashflow, and timeline across different strategies.">
          <ScenarioCompareIllustration />
        </BentoCard>
        <BentoCard large title="Stress testing" desc="Model rate rises, vacancy, and slower growth before committing.">
          <StressTestIllustration />
        </BentoCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BentoCard title="Strategy shifts" desc="See how key metrics change when you adjust the approach.">
          <StrategyShiftMini />
        </BentoCard>
        <BentoCard title="Risk modeling" desc="Test each scenario against real-world downside conditions.">
          <RiskModelMini />
        </BentoCard>
        <BentoCard title="Clear trade-offs" desc="Show the client both paths on the same screen.">
          <TradeOffMini />
        </BentoCard>
      </div>
    </div>

    {/* ═══ THE TOOLKIT ═══ */}
    <div className="mb-24 md:mb-32">
      <SectionHeader
        label="THE TOOLKIT"
        title="Borrowing Power. Stamp Duty. Land Tax. LMI. Loan Repayments."
        description="The tools BAs reach for every day, built into the same platform as the plan."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <BentoCard large title="Instant calculations" desc="Stamp duty, land tax, LMI — results by state in seconds.">
          <CalculatorIllustration />
        </BentoCard>
        <BentoCard large title="All in one platform" desc="Every calculator a BA needs, built into the same workflow.">
          <ToolGridIllustration />
        </BentoCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BentoCard title="Borrowing power" desc="Capacity calculator tailored to Australian lending rules.">
          <BorrowingMeterMini />
        </BentoCard>
        <BentoCard title="Stamp duty by state" desc="Accurate by state, including first home buyer concessions.">
          <DutyComparisonMini />
        </BentoCard>
        <BentoCard title="Loan repayments" desc="P&I and IO scenarios with real serviceability buffers.">
          <LoanBreakdownMini />
        </BentoCard>
      </div>
    </div>

    {/* ═══ THE CLIENT PORTAL ═══ */}
    <div>
      <SectionHeader
        label="THE CLIENT PORTAL"
        title="Every client gets their own portal."
        description="Portfolio value, equity position, and cashflow projections update as properties are added. Loan balances tracked. Milestones flagged."
        tagline="Not just for the session. For the entire relationship."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <BentoCard large title="Branded client portal" desc="Every client gets a link to their own portal, branded to your agency.">
          <PortalPreviewIllustration />
        </BentoCard>
        <BentoCard large title="Portfolio tracking" desc="Value, equity, and cashflow projections update live as properties are added.">
          <PortfolioViewIllustration />
        </BentoCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BentoCard title="Relationship management" desc="Client records, milestones, and alerts in one place.">
          <ClientManagementIllustration />
        </BentoCard>
        <BentoCard title="Loan tracking" desc="Loan balances tracked. Equity positions updated automatically.">
          <LoanEquityMini />
        </BentoCard>
        <BentoCard title="Complete overview" desc="Everything your client needs, in one view.">
          <FeatureTagsMini />
        </BentoCard>
      </div>
    </div>
  </section>
);

export default HowItWorks;

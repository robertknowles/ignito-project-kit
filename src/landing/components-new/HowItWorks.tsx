import React from 'react';
import { motion } from 'framer-motion';

/* ─────────────── Illustration container (shared wrapper) ─────────────── */
const IllustrationBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full h-48 mb-8 relative flex items-center justify-center overflow-hidden bg-gray-50 rounded-xl border border-gray-200">
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   TOP ROW — 3 hero illustrations (existing, uplifted)
   ═══════════════════════════════════════════════════════════════════════ */

const BuiltForPurposeIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 7, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[280px] h-[180px] relative p-4 flex flex-col gap-2"
    >
      {/* Mini sidebar + main area */}
      <div className="flex gap-2 flex-1">
        {/* Sidebar skeleton */}
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

        {/* Main content area */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Tab bar */}
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

          {/* Chart area */}
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
            {/* Chart line */}
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

          {/* Table rows */}
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

const PoweredByAIIllustration: React.FC = () => (
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

const DesignedForSpeedIllustration: React.FC = () => (
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

/* ═══════════════════════════════════════════════════════════════════════
   BOTTOM GRID — 6 feature illustrations (new animations)
   ═══════════════════════════════════════════════════════════════════════ */

const RoadmapBuilderIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[160px] relative p-4 flex flex-col justify-center"
    >
      {/* Horizontal timeline axis */}
      <div className="relative h-24">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.8, repeat: Infinity, repeatDelay: 6.9, ease: 'easeOut' }}
          className="absolute top-1/2 left-4 right-4 h-[1.5px] bg-gray-200 origin-left"
        />

        {/* Property nodes along the timeline */}
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

        {/* Connecting line segments that grow between nodes */}
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

const ScenarioPlanningIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[170px] relative p-3 flex gap-3"
    >
      {/* Scenario A */}
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

      {/* Scenario B */}
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

      {/* Compare cursor line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ times: [0, 0.55, 0.6, 0.9, 0.95], duration: 8, repeat: Infinity }}
        className="absolute top-3 bottom-3 left-1/2 w-[1px] bg-gray-300"
      />
    </motion.div>
  </IllustrationBox>
);

const ClientPortalIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[240px] h-[160px] relative p-4 flex flex-col items-center justify-center gap-3"
    >
      {/* URL bar */}
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

      {/* Portal preview card */}
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
        {/* Mini roadmap bars */}
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

const NextPurchaseIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 7, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[220px] h-[160px] relative p-3 flex items-center justify-center"
    >
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full flex flex-col gap-2.5">
        {/* Property type icon + name */}
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

        {/* Price */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.3, repeat: Infinity, repeatDelay: 5.5 }}
          className="flex justify-between items-center border-t border-gray-100 pt-2"
        >
          <span className="text-[7px] text-gray-400">Purchase price</span>
          <span className="text-[9px] font-bold text-gray-900">$450,000</span>
        </motion.div>

        {/* Funding bar */}
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

        {/* Ready badge */}
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

const PortfolioViewIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[170px] relative p-3"
    >
      {/* Property tile grid */}
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

      {/* Total counter */}
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

const ClientManagementIllustration: React.FC = () => (
  <IllustrationBox>
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 8, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[160px] relative p-3 flex flex-col gap-2"
    >
      {/* Client row */}
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

      {/* Milestone timeline */}
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

      {/* Notification */}
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
   Combined Section
   ═══════════════════════════════════════════════════════════════════════ */

const HowItWorks: React.FC = () => (
  <section id="how-it-works" className="py-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
    {/* Section heading */}
    <div className="max-w-none mb-24 md:mb-32">
      <h2 className="text-3xl md:text-[36px] font-semibold tracking-tight leading-[1.2] mb-4">
        <span className="text-gray-900">A new standard for portfolio planning.</span>{' '}
        <span className="text-gray-400">
          PropPath gives investment-focused buyers' agents an AI-powered way to plan property roadmaps clients can actually see, understand, and buy into.
        </span>
      </h2>
    </div>

    {/* Sub-heading */}
    <div className="mb-16 md:mb-20 border-t border-gray-200 pt-12">
      <h2 className="text-3xl font-semibold text-gray-900 mb-4">Designed for the modern agent.</h2>
      <p className="text-gray-500 text-[18px] leading-[28px] max-w-xl">
        Everything you need to build, manage, and share property plans with speed and clarity.
      </p>
    </div>

    {/* All 9 feature cards in one grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
      {[
        {
          title: 'Built for purpose',
          desc: "Shaped by the workflows and pain points of real Australian buyers' agents. Every feature exists to help you plan, present, and retain.",
          illustration: <BuiltForPurposeIllustration />,
        },
        {
          title: 'Powered by AI',
          desc: 'Describe a client scenario in plain language. PropPath reasons through a series of assumptions and constraints, builds the roadmap, and helps you optimise it through conversation.',
          illustration: <PoweredByAIIllustration />,
        },
        {
          title: 'Designed for speed',
          desc: 'Cuts through the complexity of multi-property planning so you can move from plan to client presentation in minutes, not hours.',
          illustration: <DesignedForSpeedIllustration />,
        },
        {
          title: 'AI Roadmap Builder',
          desc: "A clear, long-term view of a client's property journey and how each decision connects over time.",
          illustration: <RoadmapBuilderIllustration />,
        },
        {
          title: 'Scenario-based Planning',
          desc: 'Compare and refine different scenario paths to land on the right long-term direction, fast.',
          illustration: <ScenarioPlanningIllustration />,
        },
        {
          title: 'Client-facing Portal',
          desc: 'A single place for clients to view and revisit their roadmap, tailored to show as much or as little detail as you choose.',
          illustration: <ClientPortalIllustration />,
        },
        {
          title: 'Next Purchase Plan',
          desc: 'A focused view of the next move. Property type, timing, funding source, and readiness, all in one place.',
          illustration: <NextPurchaseIllustration />,
        },
        {
          title: 'Portfolio View',
          desc: "Manage what's already been purchased across every property.",
          illustration: <PortfolioViewIllustration />,
        },
        {
          title: 'Client Management',
          desc: "Store client details, financials, and property records in one place. Get alerts when milestones are hit and it's time for the next conversation.",
          illustration: <ClientManagementIllustration />,
        },
      ].map((item) => (
        <div key={item.title} className="flex flex-col">
          {item.illustration}
          <h3 className="text-[15px] font-semibold text-gray-900 mb-3">{item.title}</h3>
          <p className="text-[14px] text-gray-500 leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;

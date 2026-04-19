import React from 'react';
import { motion } from 'framer-motion';

const BuiltForPurposeIllustration: React.FC = () => (
  <div className="w-full h-48 mb-8 relative flex items-center justify-center overflow-hidden bg-white/50 rounded-xl border border-black/[0.03]">
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 7, times: [0, 0.95, 1], repeat: Infinity, ease: 'linear' }}
      className="w-[260px] h-[180px] relative p-4 flex flex-col gap-3"
    >
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 6.5 }}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-[1px] bg-black/10" />
          <span className="text-[7px] font-bold text-black uppercase tracking-wider">Villas / Townhouses</span>
        </div>
        <span className="text-[7px] font-bold text-black">$450,000</span>
      </motion.div>

      <div className="grid grid-cols-4 gap-2">
        {['$41,099', '-$291/wk', '345.7%', '2 yrs'].map((val, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.75, duration: 0.4, repeat: Infinity, repeatDelay: 5.85 }}
            className="bg-black/[0.03] border border-black/[0.05] rounded-[2px] p-1.5 flex items-center justify-center"
          >
            <span className="text-[7px] font-bold text-black">{val}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 flex-grow">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
          className="border border-black/[0.05] rounded-[2px] p-2 flex flex-col gap-1.5 justify-center"
        >
          {[100, 70, 50, 30, 85].map((w, i) => (
            <div key={i} className="h-[2px] bg-black/[0.05] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${w}%` }}
                transition={{ delay: 1.7 + i * 0.05, duration: 0.5, repeat: Infinity, repeatDelay: 4.8 - i * 0.05 }}
                className="h-full bg-black/10"
              />
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
          className="border border-black/[0.05] rounded-[2px] p-2 flex items-end gap-[2px] justify-between"
        >
          {[10, 20, 30, 45, 55, 65, 75, 82, 88, 95].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 1.8 + i * 0.05, duration: 0.5, repeat: Infinity, repeatDelay: 4.7 - i * 0.05 }}
              className="flex-grow bg-black/60 rounded-[0.5px]"
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
          className="border border-black/[0.05] rounded-[2px] p-2 flex items-end gap-[2px] justify-between"
        >
          {[90, 82, 75, 65, 58, 50, 42, 38, 32, 30].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 1.8 + i * 0.05, duration: 0.5, repeat: Infinity, repeatDelay: 4.7 - i * 0.05 }}
              className="flex-grow bg-black/20 rounded-[0.5px]"
            />
          ))}
        </motion.div>
      </div>

      <div className="flex flex-col gap-1.5">
        {[0, 1, 2, 3, 4].map((row) => (
          <motion.div
            key={row}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 + row * 0.2, duration: 0.4, repeat: Infinity, repeatDelay: 4.1 - row * 0.2 }}
            className="flex justify-between items-center"
          >
            {[40, 20, 35, 15, 25, 30].map((w, i) => (
              <div key={i} style={{ width: `${w}px` }} className={`h-1 rounded-[0.5px] ${row === 0 ? 'bg-black/15' : 'bg-black/5'}`} />
            ))}
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

const PoweredByAIIllustration: React.FC = () => (
  <div className="w-full h-48 mb-8 relative flex items-center justify-center overflow-hidden bg-white/50 rounded-xl border border-black/[0.03]">
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
            className="absolute bg-[#111] text-white px-3 py-1.5 rounded-[6px] rounded-tr-none shadow-sm"
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
            className="absolute bg-[#111] text-white px-3 py-1.5 rounded-[6px] rounded-tr-none shadow-sm"
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
                  className="w-0.5 h-0.5 rounded-full bg-black/60"
                />
              ))}
            </div>
            <span className="text-[7px] font-mono text-black/50 italic tracking-tight uppercase">Adjusting timeline...</span>
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
              className="w-1 h-1 rounded-full bg-black/80"
            />
            <span className="text-[7px] font-mono text-black/50 italic tracking-tight uppercase">Stress testing...</span>
          </motion.div>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-[6px] p-3 shadow-sm flex flex-col gap-2.5 mt-2">
          {[
            { label: 'Purchase 1', years: ['2026', '2026', '2026'] },
            { label: 'Equity Release', years: ['2029', '2031', '2031'] },
            { label: 'Purchase 2', years: ['2031', '2035', '2036'] },
            { label: 'Purchase 3', years: ['2036', '2042', '2044'] },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-black/80" />
                <span className="text-[8px] text-black/40 font-medium tracking-tight uppercase">{item.label}</span>
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
                    className="absolute text-[8px] font-mono font-bold text-black tabular-nums"
                  >
                    {year}
                  </motion.span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-black/[0.03] flex items-center gap-2 opacity-30">
        <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
        <span className="text-[7px] text-black font-medium tracking-tight">Ask about this plan...</span>
      </div>
    </motion.div>
  </div>
);

const DesignedForSpeedIllustration: React.FC = () => (
  <div className="w-full h-48 mb-8 relative flex items-center justify-center overflow-hidden bg-white/50 rounded-xl border border-black/[0.03]">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-[260px] h-[180px] relative p-4 flex items-center justify-center gap-12"
    >
      <div className="flex flex-col gap-4">
        {[
          { label: 'Clients inputs', at: 0.5 },
          { label: 'Roadmap built', at: 1.5 },
          { label: 'Optimised', at: 2.5 },
          { label: 'Presented', at: 3.5 },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="relative w-[10px] h-[10px]">
              <div className="absolute inset-0 rounded-full border-[1.2px] border-black/10" />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: item.at, duration: 0.3 }}
                className="absolute inset-0 rounded-full bg-[#111] flex items-center justify-center p-[1px]"
              >
                <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5L4 7L8 3" />
                </svg>
              </motion.div>
            </div>
            <motion.span
              initial={{ color: '#bbb' }}
              animate={{ color: '#111' }}
              transition={{ delay: item.at, duration: 0.3 }}
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
          transition={{ delay: 4.2, duration: 0.5 }}
          className="bg-[#111] px-5 py-2 rounded-full flex items-center justify-center gap-2.5 shadow-xl border border-white/10"
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
          transition={{ delay: 5.5, duration: 0.4 }}
          className="text-[6px] font-mono text-black/40 uppercase tracking-tighter mt-3"
        >
          Deliverable ready
        </motion.span>
      </div>
    </motion.div>
  </div>
);

const HowItWorks: React.FC = () => (
  <section id="how-it-works" className="py-24 max-w-[1400px] mx-auto px-6 md:px-8 scroll-mt-24">
    <div className="max-w-none mb-24 md:mb-32">
      <h2 className="text-3xl md:text-[38px] font-medium tracking-tight leading-[1.2] mb-4">
        <span className="text-black">A new standard for portfolio planning.</span>{' '}
        <span className="text-black/40">
          PropPath gives investment-focused <br className="hidden lg:block" />
          buyers' agents an AI-powered way to plan property strategies clients <br className="hidden lg:block" />
          can actually see, understand, and buy into.
        </span>
      </h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-black/[0.05] pt-12">
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
          desc: 'Cuts through the complexity of multi-property planning so you can move from strategy to client presentation in minutes, not hours.',
          illustration: <DesignedForSpeedIllustration />,
        },
      ].map((item) => (
        <div key={item.title} className="flex flex-col">
          {item.illustration}
          <h3 className="text-[15px] font-semibold mb-3">{item.title}</h3>
          <p className="text-[14px] text-linear-muted leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;

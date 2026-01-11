import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, Home, Building2, Building, Store, CheckCircle2 } from 'lucide-react';

const roadmapSteps = [
  { year: '2025', type: 'Unit', label: 'Entry Level Unit', icon: Home, equity: 150000 },
  { year: '2027', type: 'Villa', label: 'Cosmetic Reno Villa', icon: Home, equity: 320000 },
  { year: '2029', type: 'Townhouse', label: 'Blue Chip Townhouse', icon: Building, equity: 550000 },
  { year: '2032', type: 'House', label: 'Principal Place', icon: Building2, equity: 780000 },
  { year: '2036', type: 'Small Block', label: 'Unit Block (6 Pack)', icon: Building, equity: 1100000 },
  { year: '2040', type: 'Commercial', label: 'Industrial Warehouse', icon: Store, equity: 1800000, isGoal: true },
];

const Hero: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    // Initial delay before starting animation loop
    const startDelay = visibleCount === 0 ? 500 : 0;

    const runAnimation = () => {
        if (visibleCount < roadmapSteps.length) {
           // Add next item
           timeout = setTimeout(() => {
             setVisibleCount(prev => prev + 1);
           }, 1200);
        } else {
           // Pause then reset
           timeout = setTimeout(() => {
             setVisibleCount(0);
           }, 4000);
        }
    };

    timeout = setTimeout(runAnimation, startDelay);

    return () => clearTimeout(timeout);
  }, [visibleCount]);

  const currentEquity = visibleCount > 0 ? roadmapSteps[visibleCount - 1].equity : 120000;
  const progress = Math.min((currentEquity / 1000000) * 100, 100);
  const isGoalReached = currentEquity >= 1000000;

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Text Content */}
        <div className="lg:col-span-7 flex flex-col gap-8 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 w-fit"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Now Accepting Founding Agencies</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-black"
          >
            Built for <br/>
            <span className="italic font-light text-gray-500">Buyer Agent Sales.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed"
          >
            Give clients a clear, visual plan of how they can get to their goal in minutes so they have the confidence to keep on buying.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 items-start"
          >
            <button className="group bg-black text-white px-8 py-4 rounded-full text-base font-medium hover:bg-gray-800 transition-all flex items-center gap-2">
              Become a Founding Agency
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 rounded-full text-base font-medium text-gray-600 hover:text-black border border-transparent hover:border-gray-200 transition-all flex items-center gap-2">
              <Play size={16} fill="currentColor" /> Watch 2 min demo
            </button>
          </motion.div>

          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.8, delay: 0.5 }}
             className="pt-8 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-500"
          >
            <span>Fast to build</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Simple to understand</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Made for sales</span>
          </motion.div>
        </div>

        {/* Dynamic Visual: Timeline Animation */}
        <div className="lg:col-span-5 relative">
           <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[600px]"
           >
              {/* Mock Browser Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
                <div className="mx-auto bg-white border border-gray-200 rounded px-3 py-0.5 text-[10px] text-gray-400 font-mono">
                  proppath.app/simulation
                </div>
              </div>

              {/* Header inside the app view */}
              <div className="px-6 pt-6 pb-2 shrink-0">
                 <div className="flex justify-between items-end mb-4">
                    <div>
                        <h3 className="font-serif text-xl">Property Roadmap</h3>
                        <p className="text-xs text-gray-400">Client: Michael & Sarah</p>
                    </div>
                 </div>
                 <div className="h-px bg-gray-100 w-full"></div>
              </div>

              {/* Scrollable Timeline Area */}
              <div className="flex-1 overflow-hidden relative p-6">
                  {/* Vertical Line */}
                  <div className="absolute left-[88px] top-6 bottom-6 w-0.5 bg-gray-100 z-0"></div>

                  <div className="space-y-6 relative z-10">
                     <AnimatePresence mode="popLayout">
                        {roadmapSteps.slice(0, visibleCount).map((step, idx) => (
                           <motion.div
                              key={step.year}
                              initial={{ opacity: 0, x: -20, y: 10 }}
                              animate={{ opacity: 1, x: 0, y: 0 }}
                              exit={{ opacity: 0, transition: { duration: 0.2 } }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className="flex items-center gap-4"
                           >
                              {/* Year Pill */}
                              <div className="w-16 text-right text-xs font-semibold text-gray-400 shrink-0 font-mono">
                                 {step.year}
                              </div>

                              {/* Dot / Indicator */}
                              <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${step.isGoal ? 'bg-green-500 border-green-500' : 'bg-white border-black'}`}></div>

                              {/* Card */}
                              <div className={`flex-1 p-3 rounded-xl border shadow-sm flex items-center gap-3 bg-white ${step.isGoal ? 'border-green-200 bg-green-50/50' : 'border-gray-100'}`}>
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step.isGoal ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    <step.icon size={16} />
                                 </div>
                                 <div>
                                    <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">{step.type}</div>
                                    <div className="text-sm font-medium text-gray-900">{step.label}</div>
                                 </div>
                              </div>
                           </motion.div>
                        ))}
                     </AnimatePresence>
                     
                     {/* "Next" Indicator Ghost */}
                     {visibleCount < roadmapSteps.length && (
                        <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 0.4 }}
                           className="flex items-center gap-4"
                        >
                            <div className="w-16 text-right text-xs text-gray-200 font-mono">....</div>
                            <div className="w-3 h-3 rounded-full border-2 border-gray-100 bg-white shrink-0"></div>
                            <div className="flex-1 h-12 rounded-xl border border-gray-100 border-dashed bg-gray-50/50"></div>
                        </motion.div>
                     )}
                  </div>
              </div>

              {/* Bottom Sticky Stats / Goal Tracker */}
              <div className="bg-gray-50 border-t border-gray-100 p-4 shrink-0">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Equity Goal: $1,000,000</span>
                     <span className={`text-sm font-bold font-serif ${isGoalReached ? 'text-green-600' : 'text-gray-900'}`}>
                        ${(currentEquity / 1000000).toFixed(1)}M
                     </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                     <motion.div 
                        className={`h-full ${isGoalReached ? 'bg-green-500' : 'bg-black'}`}
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                     />
                  </div>
                  {isGoalReached && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 text-green-700 text-xs font-medium bg-green-100 px-3 py-2 rounded-lg"
                     >
                        <CheckCircle2 size={14} />
                        <span>Client goal achieved ahead of schedule.</span>
                     </motion.div>
                  )}
              </div>

           </motion.div>

           {/* Decorative Elements behind */}
           <div className="absolute top-10 -right-10 w-full h-full bg-gray-100 rounded-2xl -z-10 rotate-3 opacity-50"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;


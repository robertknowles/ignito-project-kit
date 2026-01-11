import React from 'react';
import { motion } from 'framer-motion';

const SolutionSection: React.FC = () => {
  return (
    <section id="solution" className="py-32 bg-offwhite overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-5xl md:text-6xl mb-6"
          >
            The PropPath Sales Engine
          </motion.h2>
          <p className="text-xl text-gray-500">
            Automate complex modelling and distribute clarity instantly. A simple, fast roadmap that shows exactly when they can buy next.
          </p>
        </div>

        {/* Split Layout Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
          
          {/* Left: Configuration / Inputs (Terminal metaphor) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex flex-col"
          >
            <div className="mb-10">
              <h3 className="text-3xl font-serif mb-4">Input & Simulate</h3>
              <p className="text-gray-500">Fast, self-serving modelling for agents that doesn't disrupt the sales process</p>
            </div>

            {/* Mock Interface - Configuration */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex-1 font-mono text-sm relative overflow-hidden">
              <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-gray-400">Parameter</span>
                    <span className="text-gray-400">Value</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span>Deposit Pool</span>
                    <span className="bg-white px-2 py-1 rounded border border-gray-200 text-blue-600">$120,000</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span>Borrowing Capacity</span>
                    <span className="bg-white px-2 py-1 rounded border border-gray-200 text-blue-600">$950,000</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span>Annual Savings</span>
                    <span className="bg-white px-2 py-1 rounded border border-gray-200 text-blue-600">$45,000</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span>Equity Goal</span>
                    <span className="bg-white px-2 py-1 rounded border border-gray-200">$5,000,000</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span>Cashflow Goal</span>
                    <span className="bg-white px-2 py-1 rounded border border-gray-200">$150,000</span>
                 </div>
                 
                 <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                    <div className="text-gray-400 text-xs mb-2">Simulating Scenarios...</div>
                    <div className="space-y-2">
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: "0%" }}
                                whileInView={{ width: "70%" }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                                className="h-full bg-black"
                            />
                        </div>
                        <div className="h-1.5 w-3/4 bg-gray-100 rounded-full overflow-hidden">
                             <motion.div 
                                initial={{ width: "0%" }}
                                whileInView={{ width: "50%" }}
                                transition={{ duration: 1.5, delay: 0.2, repeat: Infinity, repeatType: "reverse" }}
                                className="h-full bg-gray-400"
                            />
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Output / Visual (Mobile/Timeline metaphor) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-black text-white rounded-[2.5rem] p-10 shadow-2xl flex flex-col relative overflow-hidden"
          >
             <div className="mb-10 relative z-10">
              <h3 className="text-3xl font-serif mb-4">Client Roadmap</h3>
              <p className="text-gray-400">A clear, visual timeline clients instantly understand. No overwhelm.</p>
            </div>

            {/* Mock Interface - Mobile View */}
            <div className="flex justify-center relative z-10">
                <div className="w-[280px] bg-white text-black rounded-[2rem] p-4 border-4 border-gray-800 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <span className="font-serif font-bold">Roadmap</span>
                        <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                    </div>
                    
                    <div className="space-y-6 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[15px] top-2 bottom-0 w-0.5 bg-gray-100 -z-10"></div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs shrink-0 font-bold">1</div>
                            <div>
                                <h4 className="font-semibold text-sm">Purchase Property #1</h4>
                                <p className="text-xs text-gray-500">Est: Nov 2024</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 opacity-50">
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs shrink-0">2</div>
                            <div>
                                <h4 className="font-semibold text-sm">Equity Release</h4>
                                <p className="text-xs text-gray-500">Est: Aug 2026</p>
                            </div>
                        </div>

                         <div className="flex gap-4 opacity-30">
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs shrink-0">3</div>
                            <div>
                                <h4 className="font-semibold text-sm">Purchase Property #2</h4>
                                <p className="text-xs text-gray-500">Est: Jan 2027</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Projected Value</div>
                        <div className="flex items-end gap-1">
                             <div className="h-8 w-2 bg-gray-200 rounded-t-sm"></div>
                             <div className="h-12 w-2 bg-gray-300 rounded-t-sm"></div>
                             <div className="h-16 w-2 bg-black rounded-t-sm"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Glow */}
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-gray-800 rounded-full blur-[100px] opacity-50"></div>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default SolutionSection;


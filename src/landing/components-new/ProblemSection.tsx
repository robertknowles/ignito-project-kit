import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const problems = [
  {
    title: "Capture the Essentials",
    desc: "Automatically capture key client details during the discovery call, so PropPath can immediately map out what's achievable.",
  },
  {
    title: "Build Scenarios in Minutes",
    desc: "Create side-by-side strategy scenarios that clearly show how different decisions affect a client's portfolio over the long term.",
  },
  {
    title: "Present the Roadmap & Close",
    desc: "Present a clear, visual portfolio roadmap using polished, branded outputs that demonstrate your value and help clients commit with confidence.",
  },
  {
    title: "Save, Share & Integrate",
    desc: "Export plans, sync them with your CRM, share with referral partners, and reuse templates to streamline your end-to-end workflow.",
  }
];

const ProblemSection: React.FC = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-24 bg-white border-t border-gray-100 scroll-mt-28" ref={containerRef}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col gap-16">
          
          {/* Top Text Content */}
          <div className="max-w-2xl">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="font-serif text-5xl md:text-6xl mb-8 leading-[1.1]"
            >
              How it works.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-xl text-gray-500 leading-relaxed max-w-sm"
            >
              Designed for the sales process.
            </motion.p>
            
            <motion.div 
               initial={{ width: 0 }}
               animate={isInView ? { width: 100 } : {}}
               transition={{ duration: 1, delay: 0.3 }}
               className="h-1 bg-black mt-12" 
            />
          </div>

          {/* Grid Layout - 4 columns on large screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {problems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group p-8 rounded-[2rem] border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:border-transparent transition-all duration-500 cursor-default flex flex-col h-full"
              >
                <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-6 group-hover:bg-black group-hover:border-black transition-colors duration-500 font-serif text-lg font-medium text-black group-hover:text-white">
                  {idx + 1}
                </div>
                <h3 className="text-2xl font-serif mb-3 leading-tight">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed mt-auto text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProblemSection;


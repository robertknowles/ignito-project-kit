import React from 'react';
import { motion } from 'framer-motion';

const DarkFooterSection: React.FC = () => {
  return (
    <section className="bg-black text-white pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Testimonials (Stories) */}
        <div className="mb-32 scroll-mt-28" id="testimonials">
          <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Stories</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-12">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="border-l border-gray-800 pl-8"
             >
                <p className="text-2xl font-figtree italic text-gray-200 leading-relaxed mb-6">
                   "PropPath completely changed how we explain strategy to clients. Instead of talking through spreadsheets, we show them a visual roadmap. It's transformed our conversion rate."
                </p>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gray-700"></div>
                   <div>
                      <div className="font-medium">Ben Carrington</div>
                      <div className="text-sm text-gray-500">Director at Compound Property</div>
                   </div>
                </div>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.2 }}
               className="border-l border-gray-800 pl-8"
             >
                <p className="text-2xl font-figtree italic text-gray-200 leading-relaxed mb-6">
                   "Clients understand the plan instantly. This is how every strategy session should be. No spreadsheets, just visual clarity."
                </p>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gray-700"></div>
                   <div>
                      <div className="font-medium">Alex Chen</div>
                      <div className="text-sm text-gray-500">Director, Elite Property</div>
                   </div>
                </div>
             </motion.div>
          </div>
        </div>

        {/* Big CTA */}
        <div id="founders" className="relative border-t border-gray-800 pt-24 pb-24 text-center scroll-mt-28">
            <h2 className="font-serif text-6xl md:text-8xl mb-8 tracking-tight">
               Clarity closes <br/> clients.
            </h2>
            <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
               Build trust. Accelerate decisions. Grow your agency. Join the waitlist today.
            </p>
            <button className="bg-white text-black px-10 py-5 rounded-full text-lg font-medium hover:bg-gray-200 transition-colors">
               Get Early Access
            </button>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800 pt-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-sm text-gray-500">
           <div className="flex items-center gap-2">
             <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M4 28L4 14L16 2L28 14L14 14L10 18L22 18L26 22L20 28H4Z" fill="currentColor"/>
             </svg>
             <span className="font-serif text-white font-bold text-lg">PropPath</span>
           </div>
           
           <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Products</a>
              <a href="#" className="hover:text-white transition-colors">Company</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
           </div>

           <div>
              © 2025 — Sydney, Australia.
           </div>
        </footer>

      </div>
    </section>
  );
};

export default DarkFooterSection;


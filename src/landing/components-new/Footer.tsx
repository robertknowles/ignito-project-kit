import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Twitter, Github } from 'lucide-react';

const Footer: React.FC = () => {
  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Final CTA Section — also acts as #founders anchor target */}
      <section id="founders" className="py-32 md:py-40 border-t border-black/[0.05] text-center scroll-mt-24">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-semibold mb-10 tracking-tight"
          >
            Clarity closes clients. <br />
            <span className="text-linear-muted">Start building today.</span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={scrollToPricing}
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-black/90 transition-all"
            >
              Get Early Access
            </button>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-black/[0.05] py-16 md:py-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16 md:mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-2 font-semibold text-[15px] tracking-tight mb-6">
                <TrendingUp className="w-5 h-5 text-black" />
                PropPath
              </div>
              <p className="text-[13px] text-linear-muted max-w-[200px] leading-relaxed">
                The property roadmap builder for the modern agent.
              </p>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold mb-6">Product</h4>
              <div className="flex flex-col gap-4 text-[13px] text-linear-muted">
                <a href="#how-it-works" className="hover:text-black transition-colors">Product</a>
                <a href="#features" className="hover:text-black transition-colors">Features</a>
                <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold mb-6">Company</h4>
              <div className="flex flex-col gap-4 text-[13px] text-linear-muted">
                <a href="#founders" className="hover:text-black transition-colors">Founding Agency</a>
                <a href="#" className="hover:text-black transition-colors">About</a>
                <a href="#" className="hover:text-black transition-colors">Contact</a>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold mb-6">Legal</h4>
              <div className="flex flex-col gap-4 text-[13px] text-linear-muted">
                <a href="#" className="hover:text-black transition-colors">Privacy</a>
                <a href="#" className="hover:text-black transition-colors">Terms</a>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-10 border-t border-black/[0.05] text-[12px] text-linear-muted gap-4">
            <div>© 2026 PropPath. Sydney, Australia.</div>
            <div className="flex items-center gap-6">
              <Twitter className="w-4 h-4 hover:text-black transition-colors cursor-pointer" />
              <Github className="w-4 h-4 hover:text-black transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;

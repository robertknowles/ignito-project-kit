import React from 'react';
import { Twitter, Github } from 'lucide-react';

const Footer: React.FC = () => {
  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Final CTA Section */}
      <section id="founders" className="py-24 md:py-32 border-t border-gray-200 text-center scroll-mt-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-[48px] font-semibold text-gray-900 mb-5 tracking-tight leading-[1.2]">
            Clarity closes clients.
          </h2>
          <p className="text-[20px] text-gray-400 font-medium mb-10">Start building today.</p>
          <button
            onClick={scrollToPricing}
            className="bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white px-[18px] py-[12px] rounded-lg font-semibold text-[16px] hover:from-[#6d28d9] hover:to-[#9333ea] transition-all shadow-sm"
          >
            Get Early Access
          </button>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16 md:mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight text-gray-900 mb-6">
                <img src="/images/proppath-icon.svg" alt="PropPath" className="w-6 h-6 rounded" />
                PropPath
              </div>
              <p className="text-[14px] text-gray-500 max-w-[220px] leading-relaxed">
                The property roadmap builder for the modern agent.
              </p>
            </div>

            <div>
              <h4 className="text-[14px] font-semibold text-gray-900 mb-6">Product</h4>
              <div className="flex flex-col gap-4 text-[14px] text-gray-500">
                <a href="#how-it-works" className="hover:text-gray-900 transition-colors">Product</a>
                <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
                <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
              </div>
            </div>

            <div>
              <h4 className="text-[14px] font-semibold text-gray-900 mb-6">Company</h4>
              <div className="flex flex-col gap-4 text-[14px] text-gray-500">
                <a href="#founders" className="hover:text-gray-900 transition-colors">Founding Agency</a>
                <a href="/terms" className="hover:text-gray-900 transition-colors">Terms &amp; Disclaimers</a>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-10 border-t border-gray-200 text-[13px] text-gray-400 gap-4">
            <div>© 2026 PropPath. Sydney, Australia. PropPath is a modelling tool, not a financial adviser.</div>
            <div className="flex items-center gap-6">
              <Twitter className="w-4 h-4 hover:text-gray-900 transition-colors cursor-pointer" />
              <Github className="w-4 h-4 hover:text-gray-900 transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;

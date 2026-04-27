import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Play,
  Save,
  Bell,
  User,
  Send,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Building2,
  Calculator,
  Calendar,
  Paperclip,
  SlidersHorizontal,
  ChevronDown,
  RotateCw,
  Hash,
  DollarSign,
  Home,
  Clock,
  FileText,
  LayoutGrid,
  LineChart,
  Users,
  TrendingUp,
} from 'lucide-react';
import DemoVideoModal from './DemoVideoModal';

const Hero: React.FC = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const mockupVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const, delay: 0.4 },
    },
  };

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-40 md:pt-56 pb-20 overflow-hidden bg-white">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-black/[0.03]" />
        <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-black/[0.08] to-transparent" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12"
        >
          <div className="max-w-7xl">
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-[64px] font-medium tracking-[-0.03em] leading-[1.05] md:leading-none mb-8"
            >
              Build AI-powered portfolio <br className="hidden md:block" />
              strategy for every client
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-[16px] text-linear-muted leading-[24px] font-normal max-w-xl"
            >
              Purpose-built for planning and building portfolios. Designed for the modern agent.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3 mt-8"
            >
              <button
                onClick={scrollToPricing}
                className="group bg-black text-white px-6 py-3 rounded-md font-medium hover:bg-black/90 transition-all flex items-center justify-center gap-2 text-[14px]"
              >
                Get Early Access
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => setIsDemoOpen(true)}
                className="border border-black/10 px-6 py-3 rounded-md font-medium hover:border-black/30 hover:bg-black/[0.02] transition-all flex items-center justify-center gap-2 text-[14px] text-black/70"
              >
                <Play size={14} fill="currentColor" /> Watch Demo
              </button>
            </motion.div>
          </div>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={scrollToPricing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black/10 text-[13px] font-medium text-linear-muted hover:bg-black/10 transition-colors cursor-pointer mb-1 w-fit"
          >
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span>Become a founding agency</span>
            <ArrowRight size={13} className="ml-1" />
          </motion.button>
        </motion.div>

        {/* Product UI Mockup */}
        <motion.div
          variants={mockupVariants}
          initial="hidden"
          animate="visible"
          className="relative group mt-16"
        >
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] h-24 bg-black/[0.08] blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -inset-4 bg-black/5 rounded-[32px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

          <div className="glass-card overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] border-black/10 bg-white relative transition-transform duration-700 ease-out group-hover:scale-[1.005] group-hover:-translate-y-1">
            <div className="flex h-[720px]">
              {/* Leftmost Icon Sidebar */}
              <div className="w-14 border-r border-black/5 flex flex-col items-center py-4 gap-6 bg-white shrink-0">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                  <TrendingUp size={18} />
                </div>
                <div className="flex flex-col gap-6 mt-4 text-black/20">
                  <LayoutGrid size={20} className="text-black" />
                  <LineChart size={20} />
                  <Users size={20} />
                </div>
                <div className="mt-auto flex flex-col gap-6 text-black/20">
                  <Bell size={20} />
                  <User size={20} />
                </div>
              </div>

              {/* Chat/Input Sidebar */}
              <div className="w-[300px] border-r border-black/5 flex-col bg-white shrink-0 hidden lg:flex">
                <div className="p-4 border-b border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center text-white text-[10px] font-bold">S</div>
                    <div className="text-[13px] font-semibold flex items-center gap-1">
                      Steve
                      <ChevronDown size={14} className="text-black/20" />
                    </div>
                  </div>
                  <div className="flex gap-2.5 text-black/40">
                    <Paperclip size={15} />
                    <Calculator size={15} />
                    <SlidersHorizontal size={15} />
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                  <div className="bg-[#f4f4f5] p-5 rounded-xl text-[13px] leading-relaxed italic text-black/80">
                    "John. 120k annual income. 80k deposit. Want to hit $2M in equity across 4 properties over 15 years."
                  </div>

                  <div className="bg-white border border-black/5 p-4 rounded-xl text-[12px] shadow-sm">
                    <div className="text-black/40 text-[11px] mb-2 font-medium">Got it. Here's what I'm working with:</div>
                    <div className="border border-black/[0.08] rounded-lg p-3 flex justify-between items-center bg-[#fdfdfd]">
                      <span className="font-medium text-[11px]">John $120k</span>
                      <span className="text-black font-semibold text-[11px]">Saving <span className="text-black/60">$2,000/mo</span></span>
                    </div>
                  </div>

                  <div className="bg-white border border-black/5 p-5 rounded-xl text-[12px] shadow-sm flex-1">
                    <div className="text-black/60 mb-4 leading-relaxed tracking-tight text-[11px]">
                      Built John's 4-property portfolio targeting $2M equity over 15 years. Starting with a QLD townhouse, then regional NSW house, VIC unit, and finishing with a duplex. Mixed states for diversification with strong growth assumptions. I've estimated savings at $2k/month — adjust if you know the actual figure.
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Clients', val: 'John' },
                        { label: 'Income', val: '$120k' },
                        { label: 'Savings', val: '$2,000/mo ($24k/yr)' },
                        { label: 'Available Deposit', val: '$80,000' },
                        { label: 'Property 1', val: '~$450k in QLD, high-growth, IO' },
                        { label: 'Property 2', val: '~$400k in NSW, high-growth, IO' },
                        { label: 'Property 3', val: '~$380k in VIC, medium-growth, IO' },
                        { label: 'Property 4', val: '~$550k in QLD, high-growth, IO' },
                        { label: 'Ownership', val: 'Individual' },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between text-[10px] pb-1.5 border-b border-black/[0.03]">
                          <span className="text-black/40">{item.label}</span>
                          <span className="font-bold text-right text-black/80">{item.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-[9px] text-black/30 italic leading-[1.3] text-center">
                      Assumed: Monthly savings estimated at $2,000 (not specified) • Individual ownership • Interest-only loans • 88% LVR across all properties • High-growth areas where possible • No existing debt
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="text-[11px] font-medium text-black/40 mb-3 ml-1">Want to adjust?</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Change # of properties', icon: <Hash size={12} /> },
                        { label: 'Change property prices', icon: <DollarSign size={12} /> },
                        { label: 'Change property types', icon: <Home size={12} /> },
                        { label: 'Switch strategy', icon: <Clock size={12} /> },
                      ].map((btn) => (
                        <div
                          key={btn.label}
                          className="flex flex-col gap-2 bg-white border border-black/5 p-3 rounded-xl text-[10px] text-left leading-tight font-medium text-black/60"
                        >
                          <div className="shrink-0 text-black/30">{btn.icon}</div>
                          {btn.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-black/5">
                  <div className="relative">
                    <div className="w-full bg-[#f9f9f9] border border-black/10 rounded-full py-2.5 pl-4 pr-10 text-[12px] text-black/20">
                      Describe a client scenario...
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20">
                      <Send size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Dashboard Area */}
              <div className="flex-1 flex flex-col bg-[#fafafa]">
                <div className="h-12 border-b border-black/[0.03] bg-white flex items-center justify-between px-6 md:px-8 shrink-0">
                  <div className="flex gap-6 md:gap-10">
                    <div className="text-[12px] font-bold text-black border-b-[2.5px] border-black h-12 flex items-center uppercase tracking-widest">Dashboard</div>
                    <div className="text-[12px] font-bold text-black/30 h-12 flex items-center uppercase tracking-widest">Portfolio</div>
                    <div className="text-[12px] font-bold text-black/30 h-12 flex items-center uppercase tracking-widest hidden md:flex">Retirement</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-md text-black/40">
                      <RotateCw size={15} />
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2 bg-[#111] text-white rounded-md text-[11px] font-bold tracking-tight shadow-sm">
                      <Save size={14} className="shrink-0" /> Save Scenario
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden p-6 md:p-8 flex flex-col gap-6 md:gap-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Portfolio Value', val: '$3.26M', icon: <ArrowUpRight className="rotate-45" /> },
                      { label: 'Total Equity', val: '$1.69M', icon: <LayoutGrid /> },
                      { label: 'Net Cashflow', val: '$13,549', suffix: '/mo', icon: <FileText /> },
                      { label: 'Next Purchase', val: '2027', icon: <Calendar /> },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="bg-white border border-black/[0.04] p-4 md:p-5 rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]"
                      >
                        <div className="text-[10px] font-bold text-black/30 uppercase tracking-[0.15em] mb-3 md:mb-4 flex items-center justify-between">
                          {stat.label}
                          <div className="w-6 h-6 rounded-md bg-black/[0.02] flex items-center justify-center text-black/20">
                            <div className="[&>svg]:w-3.5 [&>svg]:h-3.5">{stat.icon}</div>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[22px] md:text-[26px] font-bold tracking-tight text-black">{stat.val}</span>
                          {stat.suffix && <span className="text-[11px] text-black/30 font-medium">{stat.suffix}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white border border-black/[0.04] p-6 rounded-xl shadow-sm flex-1 flex flex-col min-h-[220px]">
                    <div className="flex items-center justify-between mb-6 md:mb-10 pb-4 border-b border-black/[0.03]">
                      <span className="text-[12px] font-bold tracking-tight text-black uppercase">Investment Timeline</span>
                      <div className="hidden md:flex items-center gap-6">
                        {[
                          { label: 'Portfolio Value', color: 'bg-black' },
                          { label: 'Total Equity', color: 'bg-black/40' },
                          { label: 'Do Nothing', color: 'bg-black/10' },
                        ].map((legend) => (
                          <div key={legend.label} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${legend.color}`} />
                            <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{legend.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <line key={i} x1="0" y1={40 * i} x2="800" y2={40 * i} stroke="black" strokeWidth="0.5" strokeOpacity="0.03" />
                        ))}
                        <path d="M0,180 C100,175 200,170 300,150 S600,60 810,40" fill="none" stroke="black" strokeWidth="2.5" />
                        <path d="M0,180 C100,178 200,175 300,165 S600,110 810,105" fill="none" stroke="black" strokeWidth="2.5" strokeOpacity="0.4" />
                        <path d="M0,180 L810,165" fill="none" stroke="black" strokeWidth="1" strokeDasharray="4" strokeOpacity="0.15" />
                        {[
                          { x: 100, y: 175 },
                          { x: 350, y: 140 },
                          { x: 550, y: 100 },
                          { x: 720, y: 65 },
                        ].map((node, i) => (
                          <circle key={i} cx={node.x} cy={node.y} r="6" fill="white" stroke="black" strokeWidth="0.5" strokeOpacity="0.2" />
                        ))}
                      </svg>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-black/20 pt-4 border-t border-black/[0.03] tabular-nums font-medium">
                        {['2026', '2028', '2030', '2032', '2034', '2036', '2038', '2040'].map((year) => (
                          <span key={year}>{year}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-black/[0.04] p-5 md:p-6 rounded-xl shadow-sm hidden md:block">
                    <h3 className="text-[12px] font-bold tracking-tight mb-6 text-black uppercase">Funding Sources</h3>
                    <div className="flex items-center justify-between pb-2 group rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-black/80" />
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-black uppercase tracking-tight">Villas / Townhouses</span>
                            <span className="px-1.5 py-0.5 bg-black/[0.04] text-black/50 text-[8px] font-bold rounded uppercase tracking-tighter">Buy Next</span>
                          </div>
                          <div className="text-[10px] text-black/30 mt-1 font-medium">Target 2027</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 md:gap-12">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">88% ready</span>
                          <div className="w-32 md:w-48 h-1 bg-black/[0.03] rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-black/80" style={{ width: '88%' }} />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[14px] font-bold text-black">$91k</div>
                          <div className="text-[9px] text-black/30 uppercase font-bold tracking-tighter">to fund</div>
                        </div>
                        <ChevronRight className="text-black/10" size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Copilot Badge */}
          <div className="absolute bottom-6 right-6 bg-white border border-black/10 px-4 py-2 rounded-lg items-center gap-3 shadow-2xl hidden md:flex">
            <Sparkles size={14} className="text-black" />
            <span className="text-[13px] font-medium">PropPath Copilot</span>
            <div className="w-px h-4 bg-black/10 mx-1" />
            <CheckCircle2 size={14} className="text-black/30" />
          </div>
        </motion.div>
      </div>

      <DemoVideoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </section>
  );
};

export default Hero;

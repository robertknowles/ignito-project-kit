/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  ArrowRight, 
  Zap, 
  Layers, 
  Shield, 
  Cpu, 
  Globe, 
  Github, 
  Twitter, 
  Command,
  Plus,
  FileText,
  Save,
  MessageSquare,
  Settings,
  Bell,
  User,
  Search,
  Send,
  MoreHorizontal,
  ArrowUpRight,
  History,
  Mic,
  X,
  Check,
  TrendingUp,
  LayoutGrid,
  LineChart,
  Users,
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
  Clock
} from "lucide-react";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.08] bg-white/50 backdrop-blur-xl">
    <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
      <a href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
        <TrendingUp className="w-5 h-5 text-black" />
        PropPath
      </a>
      
      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-8 text-[13px] font-normal text-linear-muted">
          <a href="#how-it-works" className="hover:text-black transition-colors">Product</a>
          <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
          <a href="#" className="hover:text-black transition-colors">Founding Agency</a>
        </div>
        
        <div className="flex items-center gap-6 text-[13px] font-normal">
          <div className="w-[1px] h-4 bg-black/[0.08] hidden md:block mx-2" />
          <button className="text-linear-muted hover:text-black transition-colors">Log in</button>
          <button className="bg-black text-white px-4 py-1.5 rounded-md hover:bg-black/90 transition-colors font-medium">Sign up</button>
        </div>
      </div>
    </div>
  </nav>
);

const Hero = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1], // Custom ease-out
      },
    },
  };

  const mockupVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.4,
      },
    },
  };

  return (
    <section className="relative pt-64 pb-20 overflow-hidden bg-[#ffffff]">
      {/* Linear-style stage background effect */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-black/[0.03]" />
        <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-black/[0.08] to-transparent" />
      </div>

      <div className="max-w-[1400px] mx-auto px-8 relative z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12"
        >
          <div className="max-w-7xl">
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-[64px] font-medium tracking-[-0.03em] leading-none mb-8"
            >
              Build AI-powered portfolio <br />
              strategy for every client
            </motion.h1>
            
            <motion.p
              variants={itemVariants}
              className="text-[16px] text-linear-muted leading-[24px] font-normal max-w-none"
            >
              Purpose-built for planning and building portfolios. Designed for the modern agent.
            </motion.p>
          </div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black/10 text-[13px] font-medium text-linear-muted hover:bg-black/10 transition-colors cursor-pointer mb-1"
          >
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span>Become a founding agency</span>
            <ArrowRight size={13} className="ml-1" />
          </motion.div>
        </motion.div>

        {/* Product UI Mockup */}
        <motion.div
          variants={mockupVariants}
          initial="hidden"
          animate="visible"
          className="relative group mt-16"
        >
          {/* Subtle reflection/shadow below */}
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
            <div className="w-[300px] border-r border-black/5 flex flex-col bg-white shrink-0">
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
                      { label: 'Ownership', val: 'Individual' }
                    ].map(item => (
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
                      { label: 'Change timing / pacing', icon: <Clock size={12} /> }
                    ].map(btn => (
                      <button key={btn.label} className="flex flex-col gap-2 bg-white border border-black/5 p-3 rounded-xl text-[10px] text-left hover:bg-black/[0.02] transition-colors leading-tight font-medium text-black/60">
                        <div className="shrink-0 text-black/30">{btn.icon}</div>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-black/5">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Describe a client scenario..." 
                    className="w-full bg-[#f9f9f9] border border-black/10 rounded-full py-2.5 pl-4 pr-10 text-[12px] focus:outline-none focus:ring-1 focus:ring-black placeholder:text-black/20"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20">
                    <Send size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Dashboard Area */}
            <div className="flex-1 flex flex-col bg-[#fafafa]">
              {/* Top Nav */}
              <div className="h-12 border-b border-black/[0.03] bg-white flex items-center justify-between px-8 shrink-0">
                <div className="flex gap-10">
                  <div className="text-[12px] font-bold text-black border-b-[2.5px] border-black h-12 flex items-center uppercase tracking-widest">Dashboard</div>
                  <div className="text-[12px] font-bold text-black/30 h-12 flex items-center uppercase tracking-widest hover:text-black transition-colors cursor-pointer">Portfolio</div>
                  <div className="text-[12px] font-bold text-black/30 h-12 flex items-center uppercase tracking-widest hover:text-black transition-colors cursor-pointer">Retirement</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2 hover:bg-black/[0.03] rounded-md transition-colors cursor-pointer text-black/40">
                    <RotateCw size={15} />
                  </div>
                  <button className="flex items-center gap-2 px-6 py-2 bg-[#111] text-white rounded-md text-[11px] font-bold tracking-tight hover:bg-black/90 transition-colors shadow-sm">
                    <Save size={14} className="shrink-0" /> Save Scenario
                  </button>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="flex-1 overflow-auto p-8 flex flex-col gap-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Portfolio Value', val: '$3.26M', icon: <ArrowUpRight className="rotate-45" /> },
                    { label: 'Total Equity', val: '$1.69M', icon: <LayoutGrid /> },
                    { label: 'Net Cashflow', val: '$13,549', suffix: '/mo', icon: <FileText /> },
                    { label: 'Next Purchase', val: '2027', icon: <Calendar /> }
                  ].map(stat => (
                    <div key={stat.label} className="bg-white border border-black/[0.04] p-5 rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] relative group transition-all duration-300 hover:border-black/10">
                      <div className="text-[10px] font-bold text-black/30 uppercase tracking-[0.15em] mb-4 flex items-center justify-between">
                        {stat.label}
                        <div className="w-6 h-6 rounded-md bg-black/[0.02] flex items-center justify-center text-black/20 group-hover:bg-black/[0.04] group-hover:text-black transition-colors">
                          <div className="[&>svg]:w-3.5 [&>svg]:h-3.5">{stat.icon}</div>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[26px] font-bold tracking-tight text-black">{stat.val}</span>
                        {stat.suffix && <span className="text-[11px] text-black/30 font-medium">{stat.suffix}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart Mockup */}
                <div className="bg-white border border-black/[0.04] p-6 rounded-xl shadow-sm flex-1 flex flex-col min-h-[340px]">
                  <div className="flex items-center justify-between mb-10 pb-4 border-b border-black/[0.03]">
                    <span className="text-[12px] font-bold tracking-tight text-black uppercase">Investment Timeline</span>
                    <div className="flex items-center gap-6">
                      {[
                        { label: 'Portfolio Value', color: 'bg-black' },
                        { label: 'Total Equity', color: 'bg-black/40' },
                        { label: 'Do Nothing', color: 'bg-black/10' }
                      ].map(legend => (
                        <div key={legend.label} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${legend.color}`} />
                          <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{legend.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    {/* SVG Chart Placeholder */}
                    <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                      {[0, 1, 2, 3, 4].map(i => (
                        <line key={i} x1="0" y1={40 * i} x2="800" y2={40 * i} stroke="black" strokeWidth="0.5" strokeOpacity="0.03" />
                      ))}
                      <path d="M0,180 C100,175 200,170 300,150 S600,60 810,40" fill="none" stroke="black" strokeWidth="2.5" />
                      <path d="M0,180 C100,178 200,175 300,165 S600,110 810,105" fill="none" stroke="black" strokeWidth="2.5" strokeOpacity="0.4" />
                      <path d="M0,180 L810,165" fill="none" stroke="black" strokeWidth="1" strokeDasharray="4" strokeOpacity="0.15" />
                      
                      {/* Interaction Nodes */}
                      {[
                        { x: 100, y: 175, icon: <Building2 className="w-2.5 h-2.5" /> },
                        { x: 350, y: 140, icon: <Calculator className="w-2.5 h-2.5" /> },
                        { x: 550, y: 100, icon: <Building2 className="w-2.5 h-2.5" /> },
                        { x: 720, y: 65, icon: <LayoutGrid className="w-2.5 h-2.5" /> }
                      ].map((node, i) => (
                        <g key={i}>
                          <circle cx={node.x} cy={node.y} r="8" fill="white" stroke="black" strokeWidth="0.5" strokeOpacity="0.1" />
                          <foreignObject x={node.x - 5} y={node.y - 5} width="10" height="10">
                            <div className="flex items-center justify-center text-black/20">
                              {node.icon}
                            </div>
                          </foreignObject>
                        </g>
                      ))}
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-black/20 pt-4 border-t border-black/[0.03] tabular-nums font-medium">
                      {['2026', '2028', '2030', '2032', '2034', '2036', '2038', '2040'].map(year => (
                        <span key={year}>{year}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Equity Unlock Timeline */}
                <div className="bg-white border border-black/[0.04] p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <span className="text-[12px] font-bold tracking-tight text-black uppercase">Equity Unlock Timeline</span>
                    <div className="flex items-center gap-4">
                      {[
                        { label: 'Villas / Townhouses', color: 'bg-black' },
                        { label: 'Houses (Regional)', color: 'bg-black/60' },
                        { label: 'Units / Apartments', color: 'bg-black/30' },
                        { label: 'Duplexes', color: 'bg-black/10' },
                        { label: 'Refinance event', color: 'bg-white', stroke: 'stroke-black', ring: true }
                      ].map(legend => (
                        <div key={legend.label} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${legend.color} ${legend.stroke ? `border border-black` : ''} ${legend.ring ? 'ring-2 ring-white ring-offset-1 ring-black/20' : ''}`} />
                          <span className="text-[9px] font-bold text-black/40 uppercase tracking-widest">{legend.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-[200px] relative">
                    <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                      <path d="M0,180 C150,175 300,140 810,40" fill="none" stroke="black" strokeWidth="2" />
                      <path d="M0,185 C150,180 300,165 810,110" fill="none" stroke="black" strokeWidth="2" strokeOpacity="0.6" />
                      <path d="M0,190 C150,185 300,175 810,150" fill="none" stroke="black" strokeWidth="2" strokeOpacity="0.3" />
                      
                      {/* Refinance Nodes */}
                      {[
                        { x: 450, y: 145 },
                        { x: 580, y: 115 },
                        { x: 720, y: 55 }
                      ].map((node, i) => (
                        <g key={i}>
                          <circle cx={node.x} cy={node.y} r="8" fill="white" stroke="black" strokeWidth="0.5" strokeOpacity="0.2" />
                          <foreignObject x={node.x - 5} y={node.y - 5} width="10" height="10">
                            <div className="flex items-center justify-center text-black/40">
                              <DollarSign className="w-2.5 h-2.5" />
                            </div>
                          </foreignObject>
                        </g>
                      ))}
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-black/20 pt-4 border-t border-black/[0.03] font-medium">
                      {['2026', '2028', '2030', '2032', '2034', '2036', '2038', '2040'].map(year => (
                        <span key={year}>{year}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Funding Sources Bottom */}
                <div className="bg-white border border-black/[0.04] p-6 rounded-xl shadow-sm">
                  <h3 className="text-[12px] font-bold tracking-tight mb-8 text-black uppercase">Funding Sources</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-6 border-b border-black/[0.03] group cursor-pointer hover:bg-black/[0.01] transition-colors rounded-lg px-2 -mx-2">
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
                      <div className="flex items-center gap-12">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">88% ready</span>
                          <div className="w-48 h-1 bg-black/[0.03] rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-black/80" style={{ width: '88%' }} />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[14px] font-bold text-black">$91k</div>
                          <div className="text-[9px] text-black/30 uppercase font-bold tracking-tighter">to fund</div>
                        </div>
                        <ChevronRight className="text-black/10 group-hover:text-black/30 transition-colors" size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Copilot Badge */}
        <div className="absolute bottom-6 right-6 bg-white border border-black/10 px-4 py-2 rounded-lg flex items-center gap-3 shadow-2xl">
          <Sparkles size={14} className="text-black" />
          <span className="text-[13px] font-medium">PropPath Copilot</span>
          <div className="w-px h-4 bg-black/10 mx-1" />
          <button className="text-black/40 hover:text-black">✕</button>
        </div>
      </motion.div>
    </div>
  </section>
  );
};

const BuiltForPurposeIllustration = () => (
  <div className="w-full h-48 mb-8 relative flex items-center justify-center overflow-hidden bg-white/50 rounded-xl border border-black/[0.03]">
    <motion.div 
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 7, times: [0, 0.95, 1], repeat: Infinity, ease: "linear" }}
      className="w-[260px] h-[180px] relative p-4 flex flex-col gap-3"
    >
      {/* Header Row */}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-2">
        {["$41,099", "-$291/wk", "345.7%", "2 yrs"].map((val, i) => (
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

      {/* Chart Boxes */}
      <div className="grid grid-cols-3 gap-2 flex-grow">
        {/* Left: Cashflow Breakdown */}
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
                transition={{ delay: 1.7 + (i * 0.05), duration: 0.5, repeat: Infinity, repeatDelay: 4.8 - (i * 0.05) }}
                className="h-full bg-black/10"
              />
            </div>
          ))}
        </motion.div>

        {/* Centre: Equity Growth */}
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
              transition={{ delay: 1.8 + (i * 0.05), duration: 0.5, repeat: Infinity, repeatDelay: 4.7 - (i * 0.05) }}
              className="flex-grow bg-black/60 rounded-[0.5px]"
            />
          ))}
        </motion.div>

        {/* Right: Trajectory */}
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
              transition={{ delay: 1.8 + (i * 0.05), duration: 0.5, repeat: Infinity, repeatDelay: 4.7 - (i * 0.05) }}
              className="flex-grow bg-black/20 rounded-[0.5px]"
            />
          ))}
        </motion.div>
      </div>

      {/* Table Rows */}
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2, 3, 4].map((row) => (
          <motion.div 
          key={row}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 + (row * 0.2), duration: 0.4, repeat: Infinity, repeatDelay: 4.1 - (row * 0.2) }}
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

const PoweredByAIIllustration = () => (
  <div className="w-full h-48 mb-8 relative flex items-center justify-center overflow-hidden bg-white/50 rounded-xl border border-black/[0.03]">
    <motion.div 
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0.95, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      className="w-[260px] h-[180px] relative p-4 flex flex-col"
    >
      {/* Chat Area */}
      <div className="flex flex-col gap-3 flex-grow overflow-hidden relative">
        {/* Strategy Questions (Rotating) */}
        <div className="relative h-8 flex items-end justify-end">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ 
              opacity: [0, 1, 1, 0, 0, 0, 0, 0],
              x: [20, 0, 0, -10, -10, -10, -10, -10]
            }}
            transition={{ 
              times: [0, 0.05, 0.45, 0.5, 0.55, 0.85, 0.95, 1],
              duration: 10, 
              repeat: Infinity 
            }}
            className="absolute bg-[#111] text-white px-3 py-1.5 rounded-[6px] rounded-tr-none shadow-sm"
          >
            <span className="text-[8px] font-medium leading-tight tracking-tight">What if they save $20K/yr?</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ 
              opacity: [0, 0, 0, 0, 0, 1, 1, 0],
              x: [20, 20, 20, 20, 20, 0, 0, -10]
            }}
            transition={{ 
              times: [0, 0.45, 0.5, 0.55, 0.6, 0.65, 0.95, 1],
              duration: 10, 
              repeat: Infinity 
            }}
            className="absolute bg-[#111] text-white px-3 py-1.5 rounded-[6px] rounded-tr-none shadow-sm"
          >
            <span className="text-[8px] font-medium leading-tight tracking-tight">Rates go up 1.5%?</span>
          </motion.div>
        </div>

        {/* AI Action Indicator (Rotating) */}
        <div className="relative h-4 mt-1">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0, 0, 0]
            }}
            transition={{ 
              times: [0, 0.08, 0.12, 0.45, 0.5, 0.6, 0.95, 1],
              duration: 10, 
              repeat: Infinity 
            }}
            className="absolute flex items-center gap-2 px-1"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map(dot => (
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
            animate={{ 
              opacity: [0, 0, 0, 0, 0, 0, 1, 1, 0]
            }}
            transition={{ 
              times: [0, 0.5, 0.55, 0.6, 0.65, 0.68, 0.72, 0.95, 1],
              duration: 10, 
              repeat: Infinity 
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

        {/* Roadmap Card - Dynamic Strategy */}
        <div className="bg-white border border-black/[0.08] rounded-[6px] p-3 shadow-sm flex flex-col gap-2.5 mt-2">
          {[
            { label: "Purchase 1", years: ["2026", "2026", "2026"] },
            { label: "Equity Release", years: ["2029", "2031", "2031"] },
            { label: "Purchase 2", years: ["2031", "2035", "2036"] },
            { label: "Purchase 3", years: ["2036", "2042", "2044"] }
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
                      opacity: yearIdx === 0 
                        ? [1, 1, 0, 0, 0, 0, 1] 
                        : (yearIdx === 1 
                            ? [0, 0, 1, 1, 0, 0, 0] 
                            : [0, 0, 0, 0, 1, 1, 0])
                    }}
                    transition={{ 
                      times: [0, 0.45, 0.5, 0.65, 0.7, 0.95, 1],
                      duration: 10, 
                      repeat: Infinity 
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

      {/* Input Bar */}
      <div className="mt-4 pt-3 border-t border-black/[0.03] flex items-center gap-2 opacity-30">
        <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
        <span className="text-[7px] text-black font-medium tracking-tight">Ask about this plan...</span>
      </div>
    </motion.div>
  </div>
);

const DesignedForSpeedIllustration = () => (
  <div className="w-full h-48 mb-8 relative flex items-center justify-center overflow-hidden bg-white/50 rounded-xl border border-black/[0.03]">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-[260px] h-[180px] relative p-4 flex items-center justify-center gap-12"
    >
      {/* Checklist (Left Side) - Animates sequentially */}
      <div className="flex flex-col gap-4">
        {[
          { label: "Clients inputs", at: 0.5 },
          { label: "Roadmap built", at: 1.5 },
          { label: "Optimised", at: 2.5 },
          { label: "Presented", at: 3.5 }
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
              initial={{ color: "#bbb" }}
              animate={{ color: "#111" }}
              transition={{ delay: item.at, duration: 0.3 }}
              className="text-[8px] font-medium tracking-tight"
            >
              {item.label}
            </motion.span>
          </div>
        ))}
      </div>

      {/* Action Section (Right Side) - Appears after checks */}
      <div className="flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 1,
            y: 0
          }}
          transition={{ 
            delay: 4.2, 
            duration: 0.5
          }}
          className="bg-[#111] px-5 py-2 rounded-full flex items-center justify-center gap-2.5 shadow-xl border border-white/10"
        >
          <span className="text-[9px] font-bold text-white tracking-widest uppercase">SEND</span>
          <div className="w-3 h-3 rounded-full bg-white/10 flex items-center justify-center">
            <svg viewBox="0 0 10 10" className="w-[6px] h-[6px] text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 5l3 3 5-7" />
            </svg>
          </div>
        </motion.div>
        
        {/* Subtle "Status" text under button */}
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

const HowItWorks = () => (
  <section id="how-it-works" className="py-24 max-w-[1400px] mx-auto px-8">
    {/* Logos Row */}
    <div className="flex justify-center items-center gap-16 mb-32 opacity-60">
      <div className="flex items-center">
        <span className="text-2xl font-bold tracking-[0.1em] text-black">COMPOUND</span>
      </div>
      <div className="flex items-center">
        <span className="text-2xl font-normal tracking-[0.05em] text-black uppercase" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>CH SECURE</span>
      </div>
    </div>

    {/* Heading & Subheader */}
    <div className="max-w-none mb-32">
      <h2 className="text-3xl md:text-[38px] font-medium tracking-tight leading-[1.2] md:leading-[1.2] mb-4">
        <span className="text-black">A new standard for portfolio planning.</span>{" "}
        <span className="text-black/40">
          PropPath gives investment-focused <br className="hidden lg:block" />
          buyers' agents an AI-powered way to plan property strategies clients <br className="hidden lg:block" />
          can actually see, understand, and buy into.
        </span>
      </h2>
    </div>

    {/* 3 Points Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-black/[0.05] pt-12">
      {[
        {
          title: "Built for purpose",
          desc: "Shaped by the workflows and pain points of real Australian buyers' agents. Every feature exists to help you plan, present, and retain.",
          illustration: <BuiltForPurposeIllustration />
        },
        {
          title: "Powered by AI",
          desc: "Describe a client scenario in plain language. PropPath reasons through a series of assumptions and constraints, builds the roadmap, and helps you optimise it through conversation.",
          illustration: <PoweredByAIIllustration />
        },
        {
          title: "Designed for speed",
          desc: "Cuts through the complexity of multi-property planning so you can move from strategy to client presentation in minutes, not hours.",
          illustration: <DesignedForSpeedIllustration />
        }
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

const Features = () => (
  <section id="features" className="py-32 border-t border-black/[0.05]">
    <div className="max-w-[1400px] mx-auto px-8">
      <div className="mb-20">
        <h2 className="text-3xl font-semibold mb-4">Designed for the modern agent.</h2>
        <p className="text-linear-muted max-w-xl">
          Everything you need to build, manage, and share property strategies with speed and clarity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/[0.05] border border-black/[0.05] rounded-2xl overflow-hidden">
        {[
          {
            title: "AI Roadmap Builder",
            desc: "A clear, long-term view of a client's property journey and how each decision connects over time.",
            icon: Layers
          },
          {
            title: "Scenario-based Planning",
            desc: "Compare and refine different strategy paths to land on the right long-term direction, fast.",
            icon: Zap
          },
          {
            title: "Client-facing Portal",
            desc: "A single place for clients to view and revisit their roadmap, tailored to show as much or as little detail as you choose.",
            icon: Globe
          },
          {
            title: "Next Purchase Plan",
            desc: "A focused view of the next move. Property type, timing, funding source, and readiness, all in one place.",
            icon: LineChart
          },
          {
            title: "Portfolio View",
            desc: "Manage what's already been purchased across every property.",
            icon: LayoutGrid
          },
          {
            title: "Client Management",
            desc: "Store client details, financials, and property records in one place. Get alerts when milestones are hit and it's time for the next conversation.",
            icon: Users
          }
        ].map((feature) => (
          <div key={feature.title} className="bg-white p-10 hover:bg-black/[0.02] transition-colors group">
            <feature.icon className="w-6 h-6 text-linear-muted mb-6 group-hover:text-black transition-colors" />
            <h3 className="text-[17px] font-semibold mb-3">{feature.title}</h3>
            <p className="text-[15px] text-linear-muted leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Pricing = () => (
  <section id="pricing" className="py-32 max-w-[1400px] mx-auto px-8">
    <div className="mb-20">
      <h2 className="text-3xl font-semibold mb-4">Pricing that makes sense.</h2>
      <p className="text-linear-muted max-w-xl">Choose the plan that fits your agency's size.</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black/[0.05] border border-black/[0.05] rounded-2xl overflow-hidden">
      {/* Starter */}
      <div className="bg-white p-12 flex flex-col">
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-2">Starter</h3>
          <p className="text-linear-muted text-[15px]">For solo buyers' agents and small teams</p>
        </div>
        <div className="mb-10">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold">$599</span>
            <span className="text-linear-muted text-sm">aud /month</span>
          </div>
        </div>
        <div className="flex-1 space-y-4 mb-12">
          {[
            "Up to 3 client roadmaps per month",
            "AI portfolio strategiser",
            "Client Briefing",
            "Portfolio management",
            "Email support"
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-[14px]">
              <CheckCircle2 size={16} className="text-linear-muted shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <button className="w-full py-2.5 bg-black/5 border border-black/10 rounded-lg font-medium hover:bg-black/10 transition-all">Get Started</button>
      </div>

      {/* Professional */}
      <div className="bg-black/[0.02] p-12 flex flex-col relative">
        <div className="absolute top-6 right-12 px-2 py-0.5 bg-linear-primary/20 border border-linear-primary/30 rounded text-[11px] font-semibold text-linear-primary uppercase tracking-wider">Popular</div>
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-2">Professional</h3>
          <p className="text-linear-muted text-[15px]">For growing agencies and larger teams</p>
        </div>
        <div className="mb-10">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold">$699</span>
            <span className="text-linear-muted text-sm">aud /month</span>
          </div>
        </div>
        <div className="flex-1 space-y-4 mb-12">
          {[
            "Up to 10 client roadmaps per month",
            "White-labelling",
            "AI portfolio strategiser",
            "Client Briefing",
            "Portfolio management",
            "Priority support"
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-[14px]">
              <CheckCircle2 size={16} className="text-linear-primary shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <button className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-all">Get Started</button>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-black/[0.05] py-20">
    <div className="max-w-[1400px] mx-auto px-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
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
            <a href="#" className="hover:text-black transition-colors">Features</a>
            <a href="#" className="hover:text-black transition-colors">Integrations</a>
            <a href="#" className="hover:text-black transition-colors">Pricing</a>
            <a href="#" className="hover:text-black transition-colors">Changelog</a>
          </div>
        </div>

        <div>
          <h4 className="text-[13px] font-semibold mb-6">Company</h4>
          <div className="flex flex-col gap-4 text-[13px] text-linear-muted">
            <a href="#" className="hover:text-black transition-colors">About</a>
            <a href="#" className="hover:text-black transition-colors">Blog</a>
            <a href="#" className="hover:text-black transition-colors">Careers</a>
            <a href="#" className="hover:text-black transition-colors">Contact</a>
          </div>
        </div>

        <div>
          <h4 className="text-[13px] font-semibold mb-6">Legal</h4>
          <div className="flex flex-col gap-4 text-[13px] text-linear-muted">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="#" className="hover:text-black transition-colors">Security</a>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-10 border-t border-black/[0.05] text-[12px] text-linear-muted">
        <div>© 2026 PropPath. All rights reserved.</div>
        <div className="flex items-center gap-6">
          <Twitter className="w-4 h-4 hover:text-black transition-colors cursor-pointer" />
          <Github className="w-4 h-4 hover:text-black transition-colors cursor-pointer" />
        </div>
      </div>
    </div>
  </footer>
);

export default function App() {
  return (
    <div className="min-h-screen bg-linear-bg text-linear-text selection:bg-linear-primary/30">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        
        {/* Final CTA Section */}
        <section className="py-40 border-t border-black/[0.05] text-center">
          <div className="max-w-[1400px] mx-auto px-8">
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
              <button className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-black/90 transition-all">
                Get Early Access
              </button>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

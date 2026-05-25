import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  TrendingUp,
  Home,
  LayoutDashboard,
  Users,
  Wrench,
  Settings,
  Search,
  FileText,
  Building2,
  Sparkles,
  Send,
  ChevronDown,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  X,
  Grid3X3,
} from 'lucide-react';
import DemoVideoModal from './DemoVideoModal';

const Hero: React.FC = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden bg-white">
      {/* Subtle grid background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, #98A2B3 0px, #98A2B3 1px, transparent 1px, transparent 80px), repeating-linear-gradient(0deg, #98A2B3 0px, #98A2B3 1px, transparent 1px, transparent 80px)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Center-aligned hero content */}
        <div className="flex flex-col items-center text-center">
          {/* Announcement badge — matches UUI pattern exactly */}
          <button
            onClick={scrollToPricing}
            className="inline-flex items-center gap-3 mb-4 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-[2px] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Founding agencies
            </span>
            <span className="text-[14px] font-medium text-gray-600 flex items-center gap-1">
              Become a founding agency
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          {/* Heading */}
          <h1 className="text-[36px] sm:text-[48px] md:text-[60px] font-semibold tracking-[-0.02em] leading-[1.2] md:leading-[72px] text-gray-900 mb-5 max-w-[900px]">
            Build AI-powered portfolio <br className="hidden md:block" />
            plan for every client
          </h1>

          {/* Subtitle */}
          <p className="text-[18px] sm:text-[20px] font-normal leading-[28px] sm:leading-[30px] text-gray-600 max-w-[640px] mb-10">
            Purpose-built for planning and building portfolios. Designed for the modern agent.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={scrollToPricing}
              className="group inline-flex items-center justify-center gap-2 text-[16px] font-semibold text-white bg-gray-900 hover:bg-gray-800 shadow-sm px-[18px] py-[12px] rounded-lg transition-colors min-w-[120px]"
            >
              Get Early Access
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => setIsDemoOpen(true)}
              className="inline-flex items-center justify-center gap-2 text-[16px] font-semibold text-gray-700 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 px-[18px] py-[12px] rounded-lg transition-colors min-w-[120px]"
            >
              <Play size={14} fill="currentColor" className="opacity-70" />
              Watch Demo
            </button>
          </div>
        </div>

        {/* Dashboard Mockup — full-width, matches real dashboard */}
        <div className="mt-16 sm:mt-20">
          <div className="rounded-[24px] sm:rounded-[32px] bg-white p-[3px] sm:p-1 shadow-lg ring-[1.5px] sm:ring-[2px] ring-inset ring-gray-300/60">
            <div className="rounded-[21px] sm:rounded-[28px] overflow-hidden shadow-[inset_0_0_4px_1.5px_rgba(10,13,18,0.08),inset_0_0_3px_1px_rgba(10,13,18,0.03)] bg-white">
            <div className="flex h-[500px] sm:h-[640px] lg:h-[740px]">

              {/* Sidebar */}
              <div className="w-[220px] border-r border-gray-200 flex-col bg-white shrink-0 hidden lg:flex">
                <div className="px-5 h-16 flex items-center gap-2.5 border-b border-gray-200">
                  <img src="/images/proppath-icon.png" alt="PropPath" className="w-8 h-8 rounded-lg" />
                  <span className="text-[14px] font-semibold text-gray-900">PropPath</span>
                </div>
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-400 text-[13px]">
                    <Search size={14} />
                    <span>Search</span>
                    <span className="ml-auto text-[11px] text-gray-300 border border-gray-200 rounded px-1">⌘K</span>
                  </div>
                </div>
                <div className="px-3 py-2 flex flex-col gap-0.5">
                  {[
                    { icon: <Home size={18} />, label: 'Home', active: false },
                    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', active: true },
                    { icon: <Users size={18} />, label: 'Clients', active: false },
                    { icon: <Wrench size={18} />, label: 'Toolkit', active: false },
                    { icon: <Settings size={18} />, label: 'Settings', active: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium ${
                        item.active ? 'bg-gray-50 text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      <span className={item.active ? 'text-[#7F56D9]' : 'text-gray-400'}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="mt-auto px-4 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-600">JS</div>
                    <div>
                      <div className="text-[13px] font-medium text-gray-900">John Smith</div>
                      <div className="text-[11px] text-gray-400">Agent</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col bg-[#FAFAFA] relative overflow-hidden">
                {/* Top Tabs */}
                <div className="h-12 border-b border-gray-200 bg-white flex items-center px-6 shrink-0">
                  <div className="flex gap-1">
                    {[
                      { icon: <TrendingUp size={14} />, label: 'Portfolio Plan', active: true },
                      { icon: <FileText size={14} />, label: 'Next Purchase Brief', active: false },
                      { icon: <Building2 size={14} />, label: 'Existing Portfolio', active: false },
                    ].map((tab) => (
                      <div
                        key={tab.label}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium ${
                          tab.active ? 'bg-gray-100 text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Charts area */}
                <div className="flex-1 overflow-hidden p-4 lg:p-5 flex flex-col gap-4">

                  {/* ── Equity Chart Card ── */}
                  <div className="rounded-xl flex-1 flex flex-col" style={{ background: '#FAFAFA', boxShadow: '#E5E5E5 0px 0px 0px 1px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px' }}>
                    <div className="px-5 pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] font-semibold text-gray-900">Total Equity</span>
                        <div className="hidden md:flex items-center gap-3">
                          {[
                            { label: 'Total Equity', color: '#7F56D9' },
                            { label: 'Portfolio Value', color: '#A3A3A3' },
                          ].map((legend) => (
                            <div key={legend.label} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: legend.color }} />
                              <span className="text-[11px] text-gray-500">{legend.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
                        {['10 years', '20 years', '30 years'].map((range, i) => (
                          <span
                            key={range}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              i === 1 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                            }`}
                          >
                            {range}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl bg-white flex-1 flex flex-col" style={{ boxShadow: '#E5E5E5 0px 0px 0px 1px inset' }}>
                      <div className="px-5 pt-4 pb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[28px] lg:text-[30px] font-semibold text-gray-900 tracking-tight">$6.27M</span>
                          <span className="text-[13px] text-gray-500">by 2045</span>
                        </div>
                      </div>
                      {/* SVG Chart — no Y-axis, like real dashboard */}
                      <div className="flex-1 relative px-4 pb-6 min-h-0">
                        <svg className="w-full h-full" viewBox="0 0 900 180" preserveAspectRatio="none">
                          {/* Faint grid lines */}
                          {[0, 1, 2, 3].map((i) => (
                            <line key={i} x1="10" y1={i * 45 + 15} x2="890" y2={i * 45 + 15} stroke="#F3F3F3" strokeWidth="1" />
                          ))}

                          {/* Goal marker */}
                          <rect x="155" y="2" width="56" height="18" rx="9" fill="#7F56D9" />
                          <text x="183" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="Inter">Goal ✓</text>
                          <line x1="183" y1="20" x2="183" y2="135" stroke="#7F56D9" strokeWidth="1.5" strokeDasharray="3 2" />

                          {/* Portfolio Value dashed line (above equity) */}
                          <path d="M15,155 C100,154 200,150 300,142 S500,120 600,100 S750,65 890,30" fill="none" stroke="#D4D4D4" strokeWidth="1.5" strokeDasharray="6 3" />

                          {/* Total Equity line — gentle slope matching real chart */}
                          <path d="M15,160 C100,159 200,156 300,150 S500,135 600,118 S750,85 890,45" fill="none" stroke="#7F56D9" strokeWidth="2" />

                          {/* Gradient fill */}
                          <defs>
                            <linearGradient id="eqGrad2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7F56D9" stopOpacity="0.10" />
                              <stop offset="100%" stopColor="#7F56D9" stopOpacity="0.01" />
                            </linearGradient>
                          </defs>
                          <path d="M15,160 C100,159 200,156 300,150 S500,135 600,118 S750,85 890,45 L890,170 L15,170 Z" fill="url(#eqGrad2)" />

                          {/* Purchase markers — circles */}
                          {[
                            { x: 55, y: 158 },
                            { x: 140, y: 155 },
                            { x: 183, y: 150 },
                            { x: 280, y: 148 },
                          ].map((node, i) => (
                            <circle key={i} cx={node.x} cy={node.y} r="5" fill="white" stroke="#7F56D9" strokeWidth="2" />
                          ))}
                        </svg>

                        {/* X-axis labels — every year */}
                        <div className="absolute bottom-1 left-[16px] right-[16px] flex justify-between text-[9px] text-gray-400 font-medium">
                          {['2026','2027','2028','2029','2030','2031','2032','2033','2034','2035','2036','2037','2038','2039','2040','2041','2042','2043','2044','2045'].map((year) => (
                            <span key={year}>{year}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Cashflow Chart Card — full height ── */}
                  <div className="rounded-xl flex-1 flex flex-col" style={{ background: '#FAFAFA', boxShadow: '#E5E5E5 0px 0px 0px 1px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px' }}>
                    <div className="px-5 pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] font-semibold text-gray-900">Net Cashflow</span>
                        <div className="hidden md:flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#7F56D9]" />
                            <span className="text-[11px] text-gray-500">Net Cashflow</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
                        {['10 years', '20 years', '30 years'].map((range, i) => (
                          <span
                            key={range}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              i === 1 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                            }`}
                          >
                            {range}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl bg-white flex-1 flex flex-col" style={{ boxShadow: '#E5E5E5 0px 0px 0px 1px inset' }}>
                      <div className="px-5 pt-4 pb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[28px] lg:text-[30px] font-semibold text-gray-900 tracking-tight">$114,891</span>
                          <span className="text-[13px] text-gray-500">/yr by 2045</span>
                        </div>
                      </div>
                      <div className="flex-1 relative px-4 pb-6 min-h-0">
                        <svg className="w-full h-full" viewBox="0 0 900 130" preserveAspectRatio="xMidYMid meet">
                          {/* Grid lines */}
                          {[0, 1, 2].map((i) => (
                            <line key={i} x1="10" y1={i * 40 + 10} x2="890" y2={i * 40 + 10} stroke="#F3F3F3" strokeWidth="1" />
                          ))}

                          {/* CF Positive marker */}
                          <rect x="362" y="2" width="72" height="18" rx="9" fill="#7F56D9" />
                          <text x="398" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="600" fontFamily="Inter">CF Positive ✓</text>
                          <line x1="398" y1="20" x2="398" y2="72" stroke="#7F56D9" strokeWidth="1.5" strokeDasharray="3 2" />

                          {/* Net cashflow line — starts slightly negative, curves up */}
                          <path d="M15,95 C100,97 200,98 300,95 S420,78 500,68 S650,45 800,28 L890,18" fill="none" stroke="#7F56D9" strokeWidth="2" />

                          {/* Gradient fill instead of stripes for cleaner rendering */}
                          <defs>
                            <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7F56D9" stopOpacity="0.08" />
                              <stop offset="100%" stopColor="#7F56D9" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          <path d="M15,95 C100,97 200,98 300,95 S420,78 500,68 S650,45 800,28 L890,18 L890,110 L15,110 Z" fill="url(#cfGrad)" />

                          {/* CF positive dot */}
                          <circle cx="398" cy="76" r="4" fill="#7F56D9" />
                        </svg>

                        {/* X-axis */}
                        <div className="absolute bottom-1 left-[16px] right-[16px] flex justify-between text-[9px] text-gray-400 font-medium">
                          {['2026','2027','2028','2029','2030','2031','2032','2033','2034','2035','2036','2037','2038','2039','2040','2041','2042','2043','2044','2045'].map((year) => (
                            <span key={year}>{year}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PropPath AI Chat — matches real chat panel */}
                <div className="absolute bottom-4 right-4 w-[340px] bg-white rounded-2xl shadow-[0px_20px_24px_-4px_rgba(0,0,0,0.08),0px_8px_8px_-4px_rgba(0,0,0,0.03)] overflow-hidden hidden sm:block" style={{ border: '1px solid #E5E5E5' }}>
                  {/* Header — green dot, title, grid + close icons */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7F56D9]" />
                      <span className="text-[14px] font-semibold text-gray-900">PropPath AI</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Grid3X3 size={15} />
                      <X size={15} />
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="px-5 pt-3">
                    <p className="text-[11px] text-gray-400 italic">PropPath provides factual modelling, not financial or credit advice.</p>
                  </div>

                  {/* Messages */}
                  <div className="px-5 py-3 space-y-3">
                    {/* User message — right aligned, grey pill */}
                    <div className="flex justify-end">
                      <div className="bg-[#F5F5F5] rounded-full px-4 py-2 text-[12px] text-gray-700 max-w-[85%]">
                        John. 2m borrowing cap. 200k income. 200k deposit
                      </div>
                    </div>
                    {/* System response — left aligned, white bg, paragraph style */}
                    <div>
                      <div className="bg-white rounded-xl px-4 py-3 text-[11px] text-gray-700 leading-[1.6] border border-gray-100">
                        Built a 4-property equity-growth plan for John across QLD, VIC, and NSW. With $200k income, $2M borrowing capacity, and $200k deposit, he's well positioned to move quickly on the first property.
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 px-1">
                        <ThumbsUp size={12} className="text-gray-300" />
                        <ThumbsDown size={12} className="text-gray-300" />
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white">
                      <Paperclip size={14} className="text-gray-300 shrink-0" />
                      <span className="text-[12px] text-gray-400 flex-1">How can I help?</span>
                      <Send size={14} className="text-gray-300 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <DemoVideoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </section>
  );
};

export default Hero;

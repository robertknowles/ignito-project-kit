import React from 'react';
import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════
   ILLUSTRATIONS — scaled up for clarity
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── 1. AI-POWERED PLANNING ─── */
const planInputs = [
  { l: 'Income', v: '$140k' },
  { l: 'Deposit', v: '$95k' },
  { l: 'Savings', v: '$1.2k/mo' },
  { l: 'Capacity', v: '$780k' },
  { l: 'Risk', v: 'Balanced' },
];

const planTimeline = [
  { label: 'Purchase 1', detail: '$450k · QLD', year: '2026', icon: '1', y: 54 },
  { label: 'Purchase 2', detail: '$500k · NSW', year: '2028', icon: '2', y: 118 },
  { label: 'Purchase 3', detail: '$610k · QLD', year: '2033', icon: '3', y: 182 },
  { label: 'Equity Goal Achieved', detail: '', year: '2036', icon: '✓', y: 246 },
];

const AIPlanningIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[400px] mx-auto px-3"
    >
      <svg viewBox="0 0 452 300" className="w-full h-auto" fill="none">
        <defs>
          {/* Purple sphere: light lavender top → deep purple base */}
          <linearGradient id="orbPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="38%" stopColor="#c4b5fd" />
            <stop offset="72%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
          {/* Deep base fade to sink the bottom of the sphere */}
          <linearGradient id="orbBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="45%" stopColor="#4c1d95" stopOpacity="0" />
            <stop offset="100%" stopColor="#3b0764" stopOpacity="0.7" />
          </linearGradient>
          <radialGradient id="orbHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
          {/* Static cloud textures (ChatGPT-style) — drift smoothly via translation */}
          <filter id="orbClouds" x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.014" numOctaves="3" seed="7" stitchTiles="stitch" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.2 0 0 0 -0.25" />
          </filter>
          <filter id="orbClouds2" x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.022" numOctaves="2" seed="19" stitchTiles="stitch" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.15 0 0 0 -0.3" />
          </filter>
          <clipPath id="orbClip"><circle cx="200" cy="150" r="36" /></clipPath>
          <clipPath id="inputClip"><rect x="8" y="64" width="120" height="172" rx="12" /></clipPath>
          <linearGradient id="inputFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* ── Connectors: input → orb ── */}
        <path d="M128 150 H164" stroke="#e9d5ff" strokeWidth="2" />
        <path d="M128 150 H164" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 9">
          <animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.9s" repeatCount="indefinite" />
        </path>

        {/* ── Connectors: orb → timeline ── */}
        {planTimeline.map((o, i) => {
          const d = `M236 150 C 258 150, 272 ${o.y}, 288 ${o.y}`;
          return (
            <g key={i}>
              <path d={d} stroke="#e9d5ff" strokeWidth="2" />
              <path d={d} stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 9">
                <animate attributeName="stroke-dashoffset" from="11" to="0" dur="1.1s" begin={`${i * 0.18}s`} repeatCount="indefinite" />
              </path>
            </g>
          );
        })}

        {/* ── Client inputs card ── */}
        <g>
          <rect x="8" y="64" width="120" height="172" rx="12" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
          <g clipPath="url(#inputClip)">
            <text x="22" y="86" fontSize="9" fontWeight="700" letterSpacing="0.6" fill="#9ca3af">CLIENT INPUTS</text>
            {planInputs.map((row, i) => {
              const ry = 110 + i * 25;
              return (
                <g key={i}>
                  <text x="22" y={ry} fontSize="10.5" fill="#6b7280">{row.l}</text>
                  <text x="114" y={ry} fontSize="10.5" fontWeight="600" fill="#111827" textAnchor="end">{row.v}</text>
                </g>
              );
            })}
            {/* fade out the lower rows to imply more inputs */}
            <rect x="8" y="176" width="120" height="60" fill="url(#inputFade)" />
          </g>
        </g>

        {/* ── AI orb (center) — purple cloud sphere ── */}
        <circle cx="200" cy="150" r="50" fill="url(#orbHalo)" />
        <motion.g
          style={{ transformOrigin: '200px 150px' }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <g clipPath="url(#orbClip)">
            <rect x="148" y="98" width="104" height="104" fill="url(#orbPurple)" />
            <motion.g
              animate={{ x: [-4, 4, -4], y: [3, -3, 3] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            >
              <rect x="148" y="98" width="104" height="104" filter="url(#orbClouds)" opacity="0.5" />
            </motion.g>
            <motion.g
              animate={{ x: [3, -5, 3], y: [-3, 4, -3] }}
              transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
            >
              <rect x="148" y="98" width="104" height="104" filter="url(#orbClouds2)" opacity="0.32" />
            </motion.g>
            <rect x="148" y="98" width="104" height="104" fill="url(#orbBase)" />
          </g>
          {/* crisp rim + soft top highlight */}
          <circle cx="200" cy="150" r="36" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />
          <ellipse cx="190" cy="134" rx="13" ry="8" fill="#ffffff" opacity="0.22" />
        </motion.g>
        <text x="200" y="208" fontSize="9" fontWeight="700" letterSpacing="0.6" fill="#7c3aed" textAnchor="middle">AI ENGINE</text>

        {/* ── Timeline milestones ── */}
        {planTimeline.map((o, i) => (
          <g key={i}>
            <rect x="288" y={o.y - 20} width="160" height="40" rx="10" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
            <circle cx="303" cy={o.y} r="6" fill={i === 0 ? '#7c3aed' : '#ffffff'} stroke="#7c3aed" strokeWidth="1.5" />
            <text x="303" y={o.y + 2.5} fontSize="7" fontWeight="700" fill={i === 0 ? '#ffffff' : '#7c3aed'} textAnchor="middle">{o.icon}</text>
            <text x="316" y={o.detail ? o.y - 2 : o.y + 3} fontSize="8.5" fontWeight="700" fill="#111827">{o.label}</text>
            {o.detail && <text x="316" y={o.y + 11} fontSize="7.5" fill="#9ca3af">{o.detail}</text>}
            <text x="438" y={o.y + 3} fontSize="7.5" fill="#9ca3af" textAnchor="end">{o.year}</text>
          </g>
        ))}
      </svg>
    </motion.div>
  </div>
);

/* ─── 1b. CONVERSATIONAL SCENARIO CHAT ─── */
const chatThread = [
  { role: 'user', text: 'What if interest rates rise 1%?' },
  { role: 'ai', text: 'Borrowing capacity drops ~$48k — the 2036 goal still holds.' },
  { role: 'user', text: 'And if they save $2k more a month?' },
  { role: 'ai', text: 'It offsets the rise. Purchase 2 moves up to 2028.' },
];

const ConversationIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden p-2">
    <div className="w-full max-w-[360px]">
      {/* header */}
      <div className="flex items-center gap-2.5 px-1 pb-3 mb-1 border-b border-gray-100">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c4b5fd] via-[#a855f7] to-[#7c3aed] flex items-center justify-center shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 3l1.7 4.5L18 9.2l-4.3 1.7L12 15l-1.7-4.1L6 9.2l4.3-1.7L12 3z" fill="#ffffff" />
          </svg>
        </div>
        <span className="text-[12.5px] font-semibold text-gray-900">PropPath Assistant</span>
      </div>

      {/* thread */}
      <div className="flex flex-col gap-2 py-3.5">
        {chatThread.map((m, i) =>
          m.role === 'user' ? (
            <div
              key={i}
              className="self-end max-w-[82%] bg-gray-900 text-white text-[12px] leading-snug rounded-2xl rounded-br-sm px-3 py-2"
            >
              {m.text}
            </div>
          ) : (
            <div
              key={i}
              className="self-start max-w-[88%] bg-gray-50 border border-gray-200 text-gray-600 text-[12px] leading-snug rounded-2xl rounded-bl-sm px-3 py-2"
            >
              {m.text}
            </div>
          )
        )}
      </div>

      {/* input box — next question being typed */}
      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
        <span className="flex-1 inline-flex items-center text-[12px] text-gray-600">
          What if we add a 5th property?
          <motion.span
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
            className="ml-0.5 w-[1.5px] h-3.5 bg-gray-500 inline-block"
          />
        </span>
        <div className="w-6 h-6 rounded-md bg-[#7c3aed] flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h13M12 6l6 6-6 6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

/* ─── 2. THE ROADMAP ─── */
const roadmapSteps = [
  { year: '2026', label: 'Purchase 1', detail: '$450k · QLD', icon: '1' },
  { year: '2029', label: 'Equity Release', detail: '$82k unlocked', icon: '↗' },
  { year: '2031', label: 'Purchase 2', detail: '$520k · NSW', icon: '2' },
  { year: '2036', label: 'Purchase 3', detail: '$610k · QLD', icon: '3' },
];

const RoadmapIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      className="w-full max-w-[380px] px-6 py-3"
    >
      <div className="relative flex flex-col gap-0">
        {roadmapSteps.map((step, i) => (
          <div key={i} className="flex items-stretch gap-4">
            {/* Vertical line + node */}
            <div className="flex flex-col items-center w-8 shrink-0">
              <motion.div
                variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1 } }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={`relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  i === 0 ? 'bg-gray-900 text-white' : 'bg-white border-2 border-gray-300 text-gray-500'
                }`}
              >
                {i === 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.7], opacity: [0.45, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full bg-gray-900/40"
                  />
                )}
                <span className="text-[11px] font-bold">{step.icon}</span>
              </motion.div>
              {i < roadmapSteps.length - 1 && (
                <div className="w-[2px] bg-gray-200 flex-1 min-h-[16px]" />
              )}
            </div>

            {/* Card */}
            <motion.div
              variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 pb-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-semibold text-gray-900">{step.label}</span>
                    <span className="text-[12px] text-gray-400 ml-2">{step.detail}</span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 tabular-nums">{step.year}</span>
                </div>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </motion.div>
  </div>
);

/* ─── 3. SCENARIO PLANNING ─── */
const ScenarioIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[380px] relative px-4 py-3 flex gap-4"
    >
      {/* Scenario A */}
      <div className="flex-1 border border-gray-200 rounded-xl p-4 bg-white flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <span className="text-[13px] font-bold text-gray-700">Scenario A</span>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          {[
            { label: 'Properties', val: '4' },
            { label: 'Equity', val: '$1.8M' },
            { label: 'Cashflow', val: '+$42k' },
            { label: 'Timeline', val: '15 yrs' },
          ].map((row, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-[11px] text-gray-400">{row.label}</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums">{row.val}</span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-gray-300 rounded-full mt-3" />
      </div>

      {/* Scenario B */}
      <div className="flex-1 border border-gray-200 rounded-xl p-4 bg-white flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#7F56D9]" />
          <span className="text-[13px] font-bold text-gray-700">Scenario B</span>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          {[
            { label: 'Properties', val: '3' },
            { label: 'Equity', val: '$2.1M' },
            { label: 'Cashflow', val: '+$68k' },
            { label: 'Timeline', val: '12 yrs' },
          ].map((row, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-[11px] text-gray-400">{row.label}</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums">{row.val}</span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-[#7F56D9]/20 rounded-full mt-3" />
      </div>

      {/* Compare line — subtle pulse */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-4 bottom-4 left-1/2 w-[1px] bg-gray-300"
      />
    </motion.div>
  </div>
);

/* ─── 4. THE TOOLKIT ─── */
const toolkitTools = [
  {
    label: 'Borrowing Power',
    icon: (
      <path d="M3 10l9-5 9 5M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" />
    ),
    accent: true,
  },
  {
    label: 'Stamp Duty',
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
  },
  {
    label: 'Land Tax',
    icon: (
      <path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14" />
    ),
  },
  {
    label: 'LMI',
    icon: (
      <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" />
    ),
  },
  {
    label: 'Loan Repayments',
    icon: (
      <path d="M20 11a8 8 0 0 0-14-4M4 6v3h3M4 13a8 8 0 0 0 14 4M20 18v-3h-3" />
    ),
  },
  {
    label: 'Cashflow',
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 7h8M8 11h2M11 11h2M14 11h2M8 15h2M14 15h2M11 15v3" />
      </>
    ),
  },
];

const ToolkitIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[320px] px-4 py-3 grid grid-cols-2 gap-2.5"
    >
      {toolkitTools.map((tool) => (
        <div
          key={tool.label}
          className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5"
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              tool.accent ? 'bg-[#ede9fe]' : 'bg-gray-50'
            }`}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke={tool.accent ? '#7c3aed' : '#374151'}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {tool.icon}
            </svg>
          </div>
          <span className="text-[11.5px] font-semibold text-gray-700 leading-tight">{tool.label}</span>
        </div>
      ))}
    </motion.div>
  </div>
);

/* ─── 5. THE CLIENT PORTAL ─── */
const ClientPortalIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[360px] relative px-4 py-3 flex flex-col items-center justify-center gap-3.5"
    >
      {/* URL bar */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm w-full">
        {/* Live status dot — the single subtle animation */}
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-3 h-3 rounded-full bg-[#c4b5fd] shrink-0"
        />
        <span className="text-[13px] text-gray-500 font-mono">proppath.co/client/john</span>
      </div>

      {/* Portal card */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-[11px] font-bold text-gray-500">JP</span>
          </div>
          <div>
            <div className="text-[13px] font-bold text-gray-900">John's Portfolio Roadmap</div>
            <div className="text-[11px] text-gray-400">4 properties · 15 year plan</div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {[70, 55, 40, 85].map((w, i) => (
            <div key={i} className="h-1.5 bg-gray-200 rounded-full" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>

      {/* Feature tags */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {['Roadmap', 'Next Purchase', 'Portfolio', 'Progress'].map((tag) => (
          <span key={tag} className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{tag}</span>
        ))}
      </div>
    </motion.div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — single bento section with 5 feature cards
   ═══════════════════════════════════════════════════════════════════════ */

const features = [
  {
    label: 'AI-POWERED PLANNING',
    title: 'Conversational planning',
    desc: 'Describe a client scenario in plain language. PropPath reasons through assumptions and constraints, builds the roadmap, and helps you refine it through conversation.',
    illustration: <ConversationIllustration />,
  },
  {
    label: 'THE ROADMAP',
    title: 'A living property journey',
    desc: "Every client gets a clear, visual journey from where they are today to where they want to be. Each property decision connects to the next. Each milestone is trackable. Not a static PDF.",
    illustration: <AIPlanningIllustration />,
  },
  {
    label: 'SCENARIO PLANNING',
    title: 'Side-by-side comparison',
    desc: 'Acquisition order matters. State matters. Strategy matters. Compare scenarios side by side before anyone signs a contract. The right plan is obvious when both are on the same screen.',
    illustration: <ScenarioIllustration />,
  },
  {
    label: 'THE TOOLKIT',
    title: 'Every calculator, one platform',
    desc: 'Borrowing Power. Stamp Duty. Land Tax. LMI. Loan Repayments. The tools BAs reach for every day, accessible at any time.',
    illustration: <ToolkitIllustration />,
  },
  {
    label: 'THE CLIENT PORTAL',
    title: 'Built for the relationship',
    desc: "Every client gets their own portal. Portfolio value, equity position, and cashflow projections update as properties are added. Loan balances tracked. Milestones flagged. Not just for the session — for the entire relationship.",
    illustration: <ClientPortalIllustration />,
  },
];

const HowItWorks: React.FC = () => (
  <section id="how-it-works" className="py-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
    {/* Sub-heading */}
    <div className="mb-12 md:mb-16">
      <h2 className="text-3xl md:text-[36px] font-semibold tracking-tight leading-[1.2] mb-4">
        <span className="text-gray-900">Everything you need</span>{' '}
        <span className="text-gray-400">to build, manage, and share property plans with speed and clarity.</span>
      </h2>
    </div>

    {/* Bento grid — 2 large top, 3 small bottom */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {features.slice(0, 2).map((feature) => (
        <div key={feature.label} className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="p-6 pb-0">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-2 block">{feature.label}</span>
            <h3 className="text-[16px] font-semibold text-gray-900 mb-1.5">{feature.title}</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">{feature.desc}</p>
          </div>
          <div className="h-[340px] flex items-center justify-center p-4">
            {feature.illustration}
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {features.slice(2).map((feature) => (
        <div key={feature.label} className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="p-5 pb-0">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-2 block">{feature.label}</span>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">{feature.title}</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">{feature.desc}</p>
          </div>
          <div className="h-[280px] flex items-center justify-center p-3">
            {feature.illustration}
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;

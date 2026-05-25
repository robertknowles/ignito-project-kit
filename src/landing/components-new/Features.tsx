import React from 'react';
import { Zap, Layers, Globe, LayoutGrid, LineChart, Users } from 'lucide-react';

const features = [
  {
    title: 'AI Roadmap Builder',
    desc: "A clear, long-term view of a client's property journey and how each decision connects over time.",
    icon: Layers,
  },
  {
    title: 'Scenario-based Planning',
    desc: 'Compare and refine different scenario paths to land on the right long-term direction, fast.',
    icon: Zap,
  },
  {
    title: 'Client-facing Portal',
    desc: 'A single place for clients to view and revisit their roadmap, tailored to show as much or as little detail as you choose.',
    icon: Globe,
  },
  {
    title: 'Next Purchase Plan',
    desc: 'A focused view of the next move. Property type, timing, funding source, and readiness, all in one place.',
    icon: LineChart,
  },
  {
    title: 'Portfolio View',
    desc: "Manage what's already been purchased across every property.",
    icon: LayoutGrid,
  },
  {
    title: 'Client Management',
    desc: "Store client details, financials, and property records in one place. Get alerts when milestones are hit and it's time for the next conversation.",
    icon: Users,
  },
];

const Features: React.FC = () => (
  <section id="features" className="py-24 border-t border-gray-200 scroll-mt-24">
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-16 md:mb-20">
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">Designed for the modern agent.</h2>
        <p className="text-gray-500 text-[18px] leading-[28px] max-w-xl">
          Everything you need to build, manage, and share property plans with speed and clarity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden">
        {features.map((feature) => (
          <div key={feature.title} className="bg-white p-10 hover:bg-gray-50 transition-colors group">
            <feature.icon className="w-6 h-6 text-gray-400 mb-6 group-hover:text-gray-900 transition-colors" />
            <h3 className="text-[17px] font-semibold text-gray-900 mb-3">{feature.title}</h3>
            <p className="text-[15px] text-gray-500 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;

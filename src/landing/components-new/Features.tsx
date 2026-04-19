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
    desc: 'Compare and refine different strategy paths to land on the right long-term direction, fast.',
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
  <section id="features" className="py-32 border-t border-black/[0.05] scroll-mt-24">
    <div className="max-w-[1400px] mx-auto px-6 md:px-8">
      <div className="mb-16 md:mb-20">
        <h2 className="text-3xl font-semibold mb-4">Designed for the modern agent.</h2>
        <p className="text-linear-muted max-w-xl">
          Everything you need to build, manage, and share property strategies with speed and clarity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/[0.05] border border-black/[0.05] rounded-2xl overflow-hidden">
        {features.map((feature) => (
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

export default Features;

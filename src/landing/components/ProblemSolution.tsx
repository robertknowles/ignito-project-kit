import React from 'react';
import { Home, Zap, BarChart3, MessageCircle } from 'lucide-react';

export const ProblemSolution = () => {
  const benefits = [
    {
      icon: Home,
      title: 'Build visually',
      points: [
        "Show, don't tell.",
        'Map out every step visually',
        'Turn numbers into stories clients get instantly'
      ]
    },
    {
      icon: Zap,
      title: 'Instant insights',
      points: [
        'Smart logic, no spreadsheets.',
        'Auto-calculates timing, equity, and cashflow',
        'See next buying windows in seconds'
      ]
    },
    {
      icon: MessageCircle,
      title: 'Client clarity',
      points: [
        'Explain the "why."',
        'Every plan includes plain-English insights',
        'Clients know what happens - and why'
      ]
    },
    {
      icon: BarChart3,
      title: 'Professional delivery',
      points: [
        'Look polished. Work faster.',
        'Export branded PDFs in minutes',
        'Every plan feels consistent and premium'
      ]
    }
  ];

  return (
    <section className="w-full bg-[#F5F5F5] py-16 md:py-24">
      <div className="px-20">
        {/* Problem/Solution Header */}
        <div className="mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal mb-8 font-hedvig leading-[1.15] tracking-[0.02em] max-w-7xl">
            Why most agents lose clarity - and how you fix it.
          </h2>
          <p className="text-lg text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] max-w-6xl">
            Traditional tools were built for investors, not professionals.
            They're slow, manual, and confusing for clients. This platform makes
            your strategy simple, visual, and client-ready.
          </p>
        </div>
        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="mb-6">
                  <Icon className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-medium mb-3 font-figtree tracking-[0.01em]">
                  {benefit.title}
                </h3>
                <ul className="space-y-2">
                  {benefit.points.map((point, pointIndex) => (
                    <li
                      key={pointIndex}
                      className="text-xs text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] flex items-start gap-2"
                    >
                      <span className="text-gray-400 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


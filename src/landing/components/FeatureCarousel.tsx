import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Feature {
  badge?: string;
  title: string;
  description: string;
  highlight: boolean;
}

export const FeatureCarousel = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  
  const features: Feature[] = [
    {
      title: 'Create client plans in minutes',
      description: 'Build professional property roadmaps quickly without complex spreadsheets or manual calculations.',
      highlight: true
    },
    {
      title: 'Visualise the journey',
      description: 'Transform complex strategies into clear visual timelines that clients can instantly understand.',
      highlight: true
    },
    {
      title: 'Predict future buying moments',
      description: 'Automatically calculate optimal timing for next purchases based on equity growth and market conditions.',
      highlight: true
    },
    {
      title: 'Explain the strategy clearly',
      description: 'Present investment plans with plain-English explanations that build client confidence.',
      highlight: true
    },
    {
      title: 'Adjust with confidence',
      description: 'Make changes to plans on the fly and see instant updates across all calculations.',
      highlight: true
    },
    {
      title: 'Export branded PDFs',
      description: 'Generate professional, branded documents that showcase your expertise and attention to detail.',
      highlight: true
    },
    {
      title: 'Stay consistent, look sharp',
      description: 'Maintain a polished, professional appearance across all client presentations and materials.',
      highlight: true
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [features.length]);

  const nextFeature = () => {
    setActiveFeature(prev => (prev + 1) % features.length);
  };

  const prevFeature = () => {
    setActiveFeature(prev => (prev - 1 + features.length) % features.length);
  };

  return (
    <section className="w-full bg-white py-16 md:py-24 pt-[24rem] md:pt-[32rem]">
      <div className="px-20">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal mb-6 font-hedvig leading-[1.15] tracking-[0.02em]">
            A design tool that makes your strategies crystal clear.
          </h2>
        </div>
        <div className="grid md:grid-cols-[1fr_2fr] gap-20 items-start">
          {/* Feature List */}
          <div className="space-y-4 font-figtree">
            {features.map((feature, index) => (
              <div
                key={index}
                onClick={() => setActiveFeature(index)}
                className={`p-5 rounded-lg cursor-pointer transition-all duration-300 ${
                  activeFeature === index
                    ? 'bg-gray-50 border-2 border-gray-800 shadow-md'
                    : 'bg-gray-50 border border-[#EAEAEA] hover:border-gray-400'
                }`}
                style={{
                  borderRadius: '8px'
                }}
              >
                <div className="flex items-start gap-3">
                  {feature.badge && (
                    <span className="bg-black text-white text-xs font-semibold px-2 py-1 rounded">
                      {feature.badge}
                    </span>
                  )}
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-normal mb-2 tracking-[0.01em] font-figtree ${
                        activeFeature === index ? 'text-black' : 'text-gray-700'
                      }`}
                    >
                      {feature.title}
                    </h3>
                    {activeFeature === index && (
                      <p className="text-gray-600 text-xs font-normal tracking-[0.01em] animate-fade-in leading-relaxed">
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Feature Visualization */}
          <div className="relative sticky top-8">
            <div
              className="p-16 shadow-2xl min-h-[600px] flex items-center justify-center"
              style={{
                backgroundColor: '#1E1E1E',
                borderRadius: '16px'
              }}
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-10 w-full border border-white/10 font-figtree">
                <div className="text-white space-y-8">
                  <div className="flex items-center gap-4">
                    {features[activeFeature].badge && (
                      <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded">
                        {features[activeFeature].badge}
                      </span>
                    )}
                    <h3 className="text-2xl font-normal tracking-[0.01em]">
                      {features[activeFeature].title}
                    </h3>
                  </div>
                  <p className="text-white/90 text-lg leading-relaxed font-normal tracking-[0.01em]">
                    {features[activeFeature].description}
                  </p>
                  <div className="grid grid-cols-2 gap-6 pt-8">
                    <div className="bg-white/10 rounded-lg p-8 border border-white/10">
                      <div className="text-4xl font-normal mb-3">
                        {activeFeature + 1}
                      </div>
                      <div className="text-sm text-white/80 font-normal tracking-[0.01em]">
                        Active Feature
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-8 border border-white/10">
                      <div className="text-4xl font-normal mb-3">
                        {features.length}
                      </div>
                      <div className="text-sm text-white/80 font-normal tracking-[0.01em]">
                        Total Features
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Carousel Controls */}
            <div className="flex items-center justify-center gap-6 mt-10">
              <button
                onClick={prevFeature}
                className="p-3 rounded-full bg-white border-2 border-gray-200 hover:border-black transition-colors"
                aria-label="Previous feature"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-3">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveFeature(index)}
                    className={`h-2 rounded-full transition-all ${
                      activeFeature === index
                        ? 'w-8 bg-black'
                        : 'w-2 bg-gray-300 hover:bg-gray-500'
                    }`}
                    aria-label={`Go to feature ${index + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={nextFeature}
                className="p-3 rounded-full bg-white border-2 border-gray-200 hover:border-black transition-colors"
                aria-label="Next feature"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


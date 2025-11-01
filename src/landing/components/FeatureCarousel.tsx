import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Feature {
  badge?: string;
  title: string;
  description: string;
  highlight: boolean;
  videoUrl?: string;
}

export const FeatureCarousel = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  
  const features: Feature[] = [
    {
      title: 'Investment Profile',
      description: 'Create comprehensive investment profiles for your clients with detailed financial planning and property investment strategies.',
      highlight: true,
      videoUrl: 'https://player.vimeo.com/video/1132703996'
    },
    {
      title: 'Property Blocks',
      description: 'Build and visualize property portfolios with customizable property blocks that show equity, growth, and timing.',
      highlight: true,
      videoUrl: 'https://player.vimeo.com/video/1132704003'
    },
    {
      title: 'Output',
      description: 'Generate professional reports and visualizations that clearly communicate the investment strategy to your clients.',
      highlight: true,
      videoUrl: 'https://player.vimeo.com/video/1132704462'
    },
    {
      title: 'CRM',
      description: 'Manage all your client relationships in one place with integrated client management and scenario tracking.',
      highlight: true,
      videoUrl: 'https://player.vimeo.com/video/1132704462'
    },
    {
      title: 'Coming Soon',
      description: 'More exciting features are on the way to enhance your property investment planning experience.',
      highlight: true
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length);
    }, 15000);
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
              className="shadow-2xl min-h-[600px] flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: '#1E1E1E',
                borderRadius: '16px'
              }}
            >
              {features[activeFeature].videoUrl ? (
                <div className="w-full h-full min-h-[600px]">
                  <iframe
                    src={`${features[activeFeature].videoUrl}?background=1&autoplay=1&loop=1&autopause=0&muted=1&title=0&byline=0&portrait=0&controls=0`}
                    className="w-full h-full min-h-[600px]"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={features[activeFeature].title}
                  />
                </div>
              ) : (
                <div className="p-16 w-full">
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
              )}
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


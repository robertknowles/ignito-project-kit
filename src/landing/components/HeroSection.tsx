import React, { useEffect } from 'react';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

export const HeroSection = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Load the dotlottie web component script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js';
    script.type = 'module';
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script when component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <section className="w-full bg-white pt-24 md:pt-32 pb-16 md:pb-24 relative">
      <div className="px-20 relative z-20">
        <div className="max-w-5xl mx-auto text-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-normal font-hedvig leading-[1.15] tracking-[0.02em]">
              Turn your property strategies into client-winning roadmaps
            </h1>
            <p className="text-xl text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] max-w-3xl mx-auto">
              Create clear, visual investment plans in minutes - helping your
              clients see the path, build confidence, and make decisions
              quicker.
            </p>
          </div>
          {/* Button directly below subheading */}
          <div className="mt-8">
            <Button 
              className="py-4 px-8 text-base"
              onClick={() => navigate('/signup')}
            >
              Request a demo
            </Button>
          </div>
        </div>
      </div>
      {/* Responsive animation positioned as background layer */}
      <div className="absolute -top-10 left-0 w-full flex justify-center z-0">
        <div
          style={{
            width: '100%',
            maxWidth: '1200px',
            aspectRatio: '1/1'
          }}
        >
          <dotlottie-wc
            src="https://lottie.host/e183b9f0-c59f-4369-9a1e-0155a5e7afe1/uUAAzcrFqH.lottie"
            style={{
              width: '100%',
              height: '100%'
            }}
            autoplay
            loop
          />
        </div>
      </div>
    </section>
  );
};


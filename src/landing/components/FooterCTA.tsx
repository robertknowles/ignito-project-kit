import React from 'react';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

export const FooterCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="w-full bg-black text-white py-16 md:py-24">
      <div className="px-20 text-center space-y-10">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal font-hedvig leading-[1.15] tracking-[0.02em]">
          Ready to get started?
        </h2>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto font-figtree font-normal leading-relaxed tracking-[0.01em]">
          Stop sending spreadsheets
          <br />
          Start sending roadmaps
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
          <Button 
            className="py-4 px-8 text-base"
            onClick={() => navigate('/signup')}
          >
            Request a demo
          </Button>
          <Button 
            variant="outline" 
            className="py-4 px-8 text-base"
            onClick={() => window.location.href = 'mailto:contact@proppath.com'}
          >
            Talk with us
          </Button>
        </div>
      </div>
    </section>
  );
};


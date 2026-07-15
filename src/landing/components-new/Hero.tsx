import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  // Laptop "open" effect: the screen reclines back then flattens to face you as you scroll.
  const { scrollY } = useScroll();
  const rotateX = useTransform(scrollY, [0, 520], [-46, 0]);

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
          {/* Announcement badge - matches UUI pattern exactly */}
          <button
            onClick={scrollToPricing}
            className="inline-flex items-center gap-2 mb-4 pl-3 pr-2.5 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[14px] font-medium text-gray-700">Become a founding agency</span>
            <ArrowRight size={14} className="text-gray-600 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Heading */}
          <h1 className="text-[36px] sm:text-[48px] md:text-[60px] font-semibold tracking-[-0.02em] leading-[1.2] md:leading-[72px] text-gray-900 mb-5 max-w-[900px]">
            Build AI powered property <br className="hidden md:block" />
            roadmaps.
          </h1>

          {/* Subtitle */}
          <p className="text-[18px] sm:text-[20px] font-normal leading-[28px] sm:leading-[30px] text-gray-600 max-w-[640px] mb-10">
            PropPath gives buyers agents and property professionals the ability to build property roadmaps in minutes.
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
          </div>
        </div>

        {/* Dashboard Mockup inside a laptop - screen opens on scroll */}
        <div className="mt-6 sm:mt-8 mx-auto max-w-[1080px] [perspective:2200px]">
          <motion.div
            style={{ rotateX, transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}
            className="will-change-transform"
          >
          <div className="rounded-[24px] sm:rounded-[32px] bg-white p-[3px] sm:p-1 shadow-lg ring-[1.5px] sm:ring-[2px] ring-inset ring-gray-300/60">
            <div className="rounded-[21px] sm:rounded-[28px] overflow-hidden shadow-[inset_0_0_4px_1.5px_rgba(10,13,18,0.08),inset_0_0_3px_1px_rgba(10,13,18,0.03)] bg-white">
              <img
                src="/images/dashboard-hero.png"
                alt="PropPath dashboard"
                className="block w-full h-auto"
              />
            </div>
          </div>
          </motion.div>

          {/* Laptop base / keyboard deck */}
          <div className="relative mx-auto -mt-[2px]">
            {/* hinge line */}
            <div className="mx-auto h-[7px] w-[101%] max-w-[calc(100%+16px)] rounded-b-[6px] bg-gradient-to-b from-[#CED2D7] to-[#B7BBC1]" />
            {/* deck - slightly wider than the screen, like a real laptop base */}
            <div className="relative mx-auto -mt-[2px] h-[15px] sm:h-[20px] w-[105%] max-w-[calc(100%+56px)] rounded-b-[13px] bg-gradient-to-b from-[#DEE1E5] via-[#C7CBD0] to-[#AAAEB4] shadow-[0_22px_34px_-12px_rgba(0,0,0,0.32)]">
              {/* front opening lip */}
              <div className="absolute left-1/2 top-0 h-[4px] w-[84px] sm:w-[120px] -translate-x-1/2 rounded-b-[5px] bg-[#A2A6AC]" />
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;

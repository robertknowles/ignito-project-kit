import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import Navbar from './components-new/Navbar';
import Hero from './components-new/Hero';
import ProblemSection from './components-new/ProblemSection';
import SolutionSection from './components-new/SolutionSection';
import FeaturesGrid from './components-new/FeaturesGrid';
import PricingSection from './components-new/PricingSection';
import DarkFooterSection from './components-new/DarkFooterSection';

export function Landing() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="relative w-full overflow-hidden bg-white">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-black origin-left z-50"
        style={{ scaleX }}
      />

      <Navbar />
      
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <FeaturesGrid />
        <PricingSection />
        <DarkFooterSection />
      </main>
    </div>
  );
}

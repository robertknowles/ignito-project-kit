import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import Navbar from './components-new/Navbar';
import Hero from './components-new/Hero';
import HowItWorks from './components-new/HowItWorks';
import Features from './components-new/Features';
import Pricing from './components-new/Pricing';
import Footer from './components-new/Footer';

export function Landing() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="relative w-full overflow-hidden bg-white min-h-screen text-black selection:bg-black/20">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-black origin-left z-[60]"
        style={{ scaleX }}
      />

      <Navbar />

      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
      </main>

      <Footer />
    </div>
  );
}

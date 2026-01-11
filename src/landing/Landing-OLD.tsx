import React from 'react';
import { Navigation } from './components/Navigation';
import { HeroSection } from './components/HeroSection';
import { FeatureCarousel } from './components/FeatureCarousel';
import { ProblemSolution } from './components/ProblemSolution';
import { PricingSection } from './components/PricingSection';
import { FooterCTA } from './components/FooterCTA';

export function Landing() {
  return (
    <div className="landing-page min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <FeatureCarousel />
      <ProblemSolution />
      <PricingSection />
      <FooterCTA />
    </div>
  );
}



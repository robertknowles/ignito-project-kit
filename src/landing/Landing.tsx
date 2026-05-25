import React from 'react';
import Navbar from './components-new/Navbar';
import Hero from './components-new/Hero';
import HowItWorks from './components-new/HowItWorks';

import Pricing from './components-new/Pricing';
import Footer from './components-new/Footer';

export function Landing() {
  return (
    <div className="relative w-full overflow-hidden bg-white min-h-screen text-gray-900">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />

        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

import React, { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
             <path d="M4 28L4 14L16 2L28 14L14 14L10 18L22 18L26 22L20 28H4Z" fill="currentColor"/>
          </svg>
          <span className="font-serif font-bold text-xl tracking-tight">PropPath</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#how-it-works" className="hover:text-black transition-colors">Solution</a>
          <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
          <a href="#testimonials" className="hover:text-black transition-colors">Testimonials</a>
          <a href="#founders" className="hover:text-black transition-colors">Founding Agency</a>
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => navigate('/login')}
            className="text-sm font-medium hover:text-gray-600 transition-colors"
          >
            Login
          </button>
          <button 
            onClick={() => navigate('/signup')}
            className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-all flex items-center gap-2"
          >
            Get Early Access
          </button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 p-6 flex flex-col gap-4 shadow-xl">
           <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Solution</a>
           <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Pricing</a>
           <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Testimonials</a>
           <a href="#founders" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Founding Agency</a>
           <div className="h-px bg-gray-100 my-2"></div>
           <button 
             onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
             className="text-left font-medium"
           >
             Login
           </button>
           <button 
             onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
             className="bg-black text-white px-5 py-3 rounded-full text-sm font-medium w-full text-center"
           >
            Get Early Access
          </button>
        </div>
      )}
    </motion.nav>
  );
};

export default Navbar;


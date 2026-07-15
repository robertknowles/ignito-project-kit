import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex w-full items-center justify-center pt-3 px-4 sm:px-6 lg:px-8 transition-all duration-300 ease-in-out">
      <div
        className={`flex w-full items-center justify-between gap-4 rounded-full bg-white/95 backdrop-blur-md ring-1 ring-gray-200 transition-all duration-300 ease-in-out ${
          scrolled
            ? 'max-w-[820px] px-4 py-1.5 shadow-lg'
            : 'max-w-[1080px] px-5 py-2.5 shadow-md'
        }`}
      >
        {/* Left group: logo + nav items */}
        <div className="flex items-center gap-10">
          <a
            href="/"
            className="flex items-center gap-2.5 font-semibold text-[16px] tracking-tight text-gray-900"
          >
            <img
              src="/images/proppath-icon.png"
              alt="PropPath"
              className={`rounded-lg transition-all duration-300 ease-in-out ${
                scrolled ? 'w-6 h-6' : 'w-8 h-8'
              }`}
            />
            PropPath
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-[14px] font-semibold text-gray-700 hover:text-gray-900 transition-colors">
              Product
            </a>
            <a href="#pricing" className="text-[14px] font-semibold text-gray-700 hover:text-gray-900 transition-colors">
              Pricing
            </a>
            <a href="#founders" className="text-[14px] font-semibold text-gray-700 hover:text-gray-900 transition-colors">
              Founding Agency
            </a>
          </div>
        </div>

        {/* Right group: auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className={`text-[14px] font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-[14px] rounded-lg transition-all duration-300 shadow-sm ${
              scrolled ? 'py-[6px]' : 'py-[10px]'
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/signup')}
            className={`text-[14px] font-semibold text-white bg-gray-600 hover:bg-gray-700 px-[14px] rounded-lg transition-all duration-300 shadow-sm ${
              scrolled ? 'py-[6px]' : 'py-[10px]'
            }`}
          >
            Sign up
          </button>
        </div>

        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 md:hidden bg-white border-t border-gray-200 px-4 py-6 flex flex-col gap-4 shadow-lg">
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-gray-700 py-2">
            Product
          </a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-gray-700 py-2">
            Pricing
          </a>
          <a href="#founders" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-semibold text-gray-700 py-2">
            Founding Agency
          </a>
          <div className="h-px bg-gray-200 my-2" />
          <button
            onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
            className="text-[14px] font-semibold text-gray-700 border border-gray-300 py-[10px] rounded-lg text-center"
          >
            Log in
          </button>
          <button
            onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
            className="text-[14px] font-semibold text-white bg-gray-600 py-[10px] rounded-lg text-center"
          >
            Sign up
          </button>
          <button
            onClick={() => { setMobileMenuOpen(false); scrollToPricing(); }}
            className="text-[14px] font-semibold text-gray-700 border border-gray-300 py-[10px] rounded-lg text-center"
          >
            Get Early Access
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;

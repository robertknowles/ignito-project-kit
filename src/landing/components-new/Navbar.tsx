import React, { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const navigate = useNavigate();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() || 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: '-100%' },
      }}
      animate={hidden ? 'hidden' : 'visible'}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.08] bg-white/70 backdrop-blur-xl"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-2 font-semibold text-[15px] tracking-tight"
        >
          <TrendingUp className="w-5 h-5 text-black" />
          PropPath
        </a>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-8 text-[13px] font-normal text-linear-muted">
            <a href="#how-it-works" className="hover:text-black transition-colors">Product</a>
            <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
            <a href="#founders" className="hover:text-black transition-colors">Founding Agency</a>
          </div>

          <div className="hidden md:flex items-center gap-6 text-[13px] font-normal">
            <div className="w-[1px] h-4 bg-black/[0.08] mx-2" />
            <button
              onClick={() => navigate('/login')}
              className="text-linear-muted hover:text-black transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-black text-white px-4 py-1.5 rounded-md hover:bg-black/90 transition-colors font-medium"
            >
              Sign up
            </button>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-black/[0.08] px-6 py-6 flex flex-col gap-5 shadow-xl text-[14px]">
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="font-medium"
          >
            Product
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="font-medium"
          >
            Pricing
          </a>
          <a
            href="#founders"
            onClick={() => setMobileMenuOpen(false)}
            className="font-medium"
          >
            Founding Agency
          </a>
          <div className="h-px bg-black/[0.08]" />
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/login');
            }}
            className="text-left font-medium text-linear-muted"
          >
            Log in
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/signup');
            }}
            className="bg-black text-white px-4 py-2.5 rounded-md font-medium text-center"
          >
            Sign up
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              scrollToPricing();
            }}
            className="border border-black/10 px-4 py-2.5 rounded-md font-medium text-center"
          >
            Get Early Access
          </button>
        </div>
      )}
    </motion.nav>
  );
};

export default Navbar;

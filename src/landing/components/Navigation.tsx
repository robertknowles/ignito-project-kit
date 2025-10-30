import React from 'react';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

export const Navigation = () => {
  const navigate = useNavigate();

  return (
    <nav className="font-figtree w-full">
      <div className="px-20 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-16">
            <div className="flex items-center gap-2">
              <img
                src="https://uploadthingy.s3.us-west-1.amazonaws.com/w5yHoAViH5XdT2bu6HLFoF/image.png"
                alt="PropPath"
                className="w-8 h-8"
              />
              <span className="text-xl font-medium tracking-wide">
                PropPath
              </span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-normal hover:text-gray-600 transition-colors tracking-[0.01em]"
            >
              Login
            </button>
            <Button 
              className="py-3 px-6"
              onClick={() => navigate('/signup')}
            >
              Request a demo
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};


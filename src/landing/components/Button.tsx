import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  className?: string;
  children: React.ReactNode;
}

export const Button = ({
  variant = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = 'font-medium transition-colors focus:outline-none font-figtree tracking-[0.01em]';
  const variantStyles = {
    default: 'bg-black text-white hover:bg-gray-800',
    outline: 'bg-transparent border-2 border-white text-white hover:bg-white/10'
  };
  const shapeStyles = 'rounded-[24px]';
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]} ${shapeStyles} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};


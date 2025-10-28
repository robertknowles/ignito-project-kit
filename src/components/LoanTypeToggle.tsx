import React from 'react';

interface LoanTypeToggleProps {
  loanType: 'IO' | 'PI';
  onChange: (loanType: 'IO' | 'PI') => void;
  size?: 'sm' | 'md';
}

export const LoanTypeToggle: React.FC<LoanTypeToggleProps> = ({
  loanType,
  onChange,
  size = 'sm',
}) => {
  const isSmall = size === 'sm';
  
  return (
    <div className="flex items-center gap-2">
      <span className={`${isSmall ? 'text-xs' : 'text-sm'} text-[#6b7280]`}>
        Loan:
      </span>
      <div className="flex rounded-md overflow-hidden border border-[#e5e7eb]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange('IO');
          }}
          className={`${isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} transition-colors ${
            loanType === 'IO' 
              ? 'bg-[#3b82f6] text-white' 
              : 'bg-white text-[#6b7280] hover:bg-[#f3f4f6]'
          }`}
          title="Interest Only - Pay only interest, principal remains unchanged"
        >
          IO
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange('PI');
          }}
          className={`${isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} transition-colors ${
            loanType === 'PI' 
              ? 'bg-[#3b82f6] text-white' 
              : 'bg-white text-[#6b7280] hover:bg-[#f3f4f6]'
          }`}
          title="Principal & Interest - Pay both principal and interest"
        >
          P&I
        </button>
      </div>
    </div>
  );
};


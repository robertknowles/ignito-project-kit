import React from 'react';

interface CoverPageProps {
  clientDisplayName: string;
  agentDisplayName: string;
  companyDisplayName: string;
}

export function CoverPage({ clientDisplayName, agentDisplayName, companyDisplayName }: CoverPageProps) {
  // Generate current date in "MONTH YEAR" format (uppercase)
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  }).toUpperCase();

  return <div className="w-full h-[297mm] bg-[#f9fafb] p-16 flex flex-col justify-between">
      {/* Date */}
      <div>
        <p className="text-xs font-medium text-gray-500 tracking-wider">
          {currentDate}
        </p>
      </div>
      {/* Main Title */}
      <div className="flex-1 flex flex-col justify-center -mt-20">
        <h1 className="text-6xl font-semibold text-gray-900 mb-6" style={{
        fontFamily: 'Figtree, sans-serif'
      }}>
          Investment Strategy Report
        </h1>
        <p className="text-xl text-gray-600" style={{
        fontFamily: 'Figtree, sans-serif'
      }}>
          For the fiscal year ending June 30, 2025
        </p>
      </div>
      {/* Bottom Section */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Prepared for</p>
            <p className="text-lg font-semibold text-gray-900">{clientDisplayName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Presented by</p>
            <p className="text-lg font-semibold text-gray-900">{agentDisplayName}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{companyDisplayName}</div>
        </div>
      </div>
    </div>;
}


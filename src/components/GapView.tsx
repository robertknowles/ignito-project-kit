import React, { useState } from 'react';
import { GapYearRow } from './GapYearRow';
import { AISummaryForGap } from './AISummaryForGap';
import type { YearBreakdownData } from '@/types/property';

interface GapViewProps {
  startYear: number;
  endYear: number;
  allYearData: YearBreakdownData[];
}

export const GapView: React.FC<GapViewProps> = ({ startYear, endYear, allYearData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Filter to get only the years in this gap
  const gapYears = allYearData.filter(
    yearData => yearData.year >= startYear && yearData.year <= endYear
  );
  
  const yearCount = endYear - startYear + 1;
  
  // Format the year label: single year shows just the year, multi-year shows range
  const yearLabel = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
  
  // Format the duration text: "1 Year Gap" vs "X Years Gap"
  const durationText = yearCount === 1 ? '1 Year Gap' : `${yearCount} Years Gap`;
  
  return (
    <div className="my-4 text-center">
      {/* Subtle Button - No box, no border, centered */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        {isExpanded ? '▼' : '▶'} Show {yearLabel} progression ({durationText})
      </button>
      
      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-4 space-y-2">
          {/* AI Summary */}
          <div className="text-sm text-gray-500 italic">
            <AISummaryForGap gapData={gapYears} />
          </div>
          
          {/* Year-by-year rows */}
          {gapYears.map((yearData) => (
            <GapYearRow 
              key={yearData.year} 
              yearData={yearData} 
            />
          ))}
        </div>
      )}
    </div>
  );
};


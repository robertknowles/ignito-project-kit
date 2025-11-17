import React from 'react';

interface YearCircleProps {
  year: number;
  isFirst: boolean;
  isLast: boolean;
  hasMultipleProperties: boolean;
  height: number; // Height to extend vertical line
}

export const YearCircle: React.FC<YearCircleProps> = ({ 
  year, 
  isFirst, 
  isLast, 
  hasMultipleProperties,
  height 
}) => {
  return (
    <div className="relative flex items-start" style={{ height: `${height}px` }}>
      {/* Vertical line from above (if not first) */}
      {!isFirst && (
        <div 
          className="absolute left-6 bottom-full w-0.5 bg-gray-300" 
          style={{ height: '24px' }} // Gap between years
        />
      )}
      
      {/* Circle - aligned to top of container */}
      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 text-gray-700 font-bold text-sm shadow-sm flex-shrink-0">
        {year}
      </div>
      
      {/* Horizontal line extending right - aligned with top of circle */}
      <div className="absolute left-12 top-6 w-8 h-0.5 bg-gray-300" />
      
      {/* Vertical line connecting to content below (if has multiple properties or not last) */}
      {(hasMultipleProperties || !isLast) && (
        <div 
          className="absolute left-6 top-12 w-0.5 bg-gray-300" 
          style={{ height: `${height - 48}px` }} // From bottom of circle to end
        />
      )}
    </div>
  );
};


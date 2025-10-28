import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { TimelineProperty } from '@/types/property';
import type { InvestmentProfileData } from '@/contexts/InvestmentProfileContext';
import { generateStrategySummary } from '@/utils/summaryGenerator';

interface AIStrategySummaryProps {
  timelineProperties: TimelineProperty[];
  profile: InvestmentProfileData;
}

/**
 * AIStrategySummary component
 * 
 * Displays an AI-generated strategy summary that updates after the user
 * stops making changes to the timeline. Shows a loading state while generating.
 */
export const AIStrategySummary: React.FC<AIStrategySummaryProps> = ({ 
  timelineProperties, 
  profile 
}) => {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Debounce the timeline properties to wait until the user stops adding/changing them
  const debouncedTimeline = useDebounce(timelineProperties, 1500); // 1.5 second debounce

  useEffect(() => {
    if (debouncedTimeline.length > 0) {
      setIsLoading(true);
      
      // 3-second delay after user stops making changes
      const timer = setTimeout(() => {
        const newSummary = generateStrategySummary(debouncedTimeline, profile);
        setSummary(newSummary);
        setIsLoading(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // If timeline is empty, immediately show the empty state message
      setSummary(generateStrategySummary([], profile));
      setIsLoading(false);
    }
  }, [debouncedTimeline, profile]);

  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      {isLoading ? (
        <p className="text-gray-500 italic">Generating AI strategy summary...</p>
      ) : (
        <p>{summary}</p>
      )}
    </div>
  );
};


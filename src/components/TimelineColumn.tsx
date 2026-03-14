import React from 'react';
import { ChartWithRoadmap } from './ChartWithRoadmap';
import { TourStep } from '@/components/TourManager';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

interface TimelineColumnProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
  noBorder?: boolean;
}

export const TimelineColumn: React.FC<TimelineColumnProps> = ({ scenarioData, noBorder }) => {
  return (
    <TourStep
      id="wealth-cashflow-chart"
      title="Portfolio Growth Chart"
      content="Your portfolio visualization showing equity growth, savings comparison, and refinance milestones."
      order={10}
      position="top"
    >
      <div id="wealth-cashflow-chart-container" className="overflow-hidden relative">
        <ChartWithRoadmap scenarioData={scenarioData} />
      </div>
    </TourStep>
  );
};

TimelineColumn.displayName = 'TimelineColumn';

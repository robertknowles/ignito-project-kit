import React from 'react';
import { Plus } from 'lucide-react';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useLayout } from '@/contexts/LayoutContext';
import { TourStep } from '@/components/TourManager';

export const AddScenarioButton: React.FC = () => {
  const { addScenario, scenarios } = useMultiScenario();
  const { drawerOpen } = useLayout();
  
  // Only allow adding if < 2 scenarios
  if (scenarios.length >= 2) return null;
  
  // Calculate left offset: LeftRail (64px) + InputDrawer (288px when open, 0 when closed)
  // Center point should be at the midpoint of the remaining content area
  // When drawer open: offset = 64 + 288 = 352px, center = 352 + (viewport - 352) / 2 = (352 + viewport) / 2
  // When drawer closed: offset = 64px, center = 64 + (viewport - 64) / 2 = (64 + viewport) / 2
  // Using calc: left = calc(50% + offset/2) where offset is the left sidebar width
  const leftOffset = drawerOpen ? 'calc(50% + 176px)' : 'calc(50% + 32px)';
  
  return (
    <TourStep
      id="scenario-comparison"
      title="Compare Strategies"
      content="Add a second scenario to compare different investment approaches side-by-side. The system analyzes both strategies and recommends which better achieves your client's equity and cashflow goals."
      order={12}
      position="top"
    >
    <div 
      className="add-scenario-container fixed bottom-[5%] -translate-x-1/2 z-40 flex items-center justify-center py-3 px-6 bg-white/95 backdrop-blur-sm border border-dashed border-gray-300 rounded-full shadow-lg hover:border-gray-400 hover:bg-white hover:shadow-xl transition-all cursor-pointer group"
      style={{ left: leftOffset }}
      onClick={addScenario}
    >
      <div className="flex items-center gap-2 text-sm text-gray-500 group-hover:text-gray-700">
        <Plus className="w-4 h-4" />
        <span>Add a second scenario to compare strategies</span>
      </div>
    </div>
    </TourStep>
  );
};

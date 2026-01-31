import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { TourStep } from '@/components/TourManager';

export const AddScenarioButton: React.FC = () => {
  const { addScenario, scenarios } = useMultiScenario();
  
  // Only allow adding if < 2 scenarios
  if (scenarios.length >= 2) return null;
  
  return (
    <TourStep
      id="scenario-comparison"
      title="Compare Strategies"
      content="Add a second scenario to compare different investment approaches side-by-side. The system analyzes both strategies and recommends which better achieves your client's equity and cashflow goals."
      order={12}
      position="top"
    >
    <div className="add-scenario-container flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
      onClick={addScenario}
    >
      <Button
        variant="outline"
        size="lg"
        className="flex items-center gap-2 pointer-events-none group-hover:bg-white"
      >
        <Plus className="w-5 h-5" />
        Add Scenario to Compare
      </Button>
    </div>
    </TourStep>
  );
};

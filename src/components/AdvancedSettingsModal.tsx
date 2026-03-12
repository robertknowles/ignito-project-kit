import React from 'react';
import { Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Slider styles - matching ClientInputsPanel
const sliderClassName = "w-full appearance-none cursor-pointer bg-gray-200 rounded-full h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2563EB] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#2563EB] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all";

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #2563EB 0%, #2563EB ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
});

export const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, updateProfile } = useInvestmentProfile();

  // Convert decimal to percentage for display (0.03 -> 3)
  const growthRatePercent = Math.round(profile.existingPortfolioGrowthRate * 100);

  const handleGrowthRateChange = (percentValue: number) => {
    // Convert percentage to decimal (3 -> 0.03)
    updateProfile({ existingPortfolioGrowthRate: percentValue / 100 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Settings2 className="w-5 h-5" />
            Advanced Portfolio Settings
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          {/* Max Purchases Per Year */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">
                Maximum Purchases Per Year
              </label>
              <span className="text-sm font-bold text-gray-900">
                {profile.maxPurchasesPerYear}
              </span>
            </div>
            <input
              type="range"
              className={sliderClassName}
              style={getSliderStyle(profile.maxPurchasesPerYear, 1, 4)}
              min={1}
              max={4}
              step={1}
              value={profile.maxPurchasesPerYear}
              onChange={(e) => updateProfile({ maxPurchasesPerYear: parseInt(e.target.value) })}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1 (Conservative)</span>
              <span>4 (Aggressive)</span>
            </div>
            <p className="text-xs text-gray-500">
              Limits how many properties can be purchased annually for realistic planning. 
              Higher values allow faster portfolio growth if funds permit.
            </p>
          </div>

          {/* Existing Portfolio Growth Rate */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">
                Existing Portfolio Growth Rate
              </label>
              <span className="text-sm font-bold text-gray-900">
                {growthRatePercent}%
              </span>
            </div>
            <input
              type="range"
              className={sliderClassName}
              style={getSliderStyle(growthRatePercent, 1, 6)}
              min={1}
              max={6}
              step={1}
              value={growthRatePercent}
              onChange={(e) => handleGrowthRateChange(parseInt(e.target.value))}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1% (Conservative)</span>
              <span>6% (Optimistic)</span>
            </div>
            <p className="text-xs text-gray-500">
              Annual growth rate applied to existing mature properties. 
              New purchases use tiered growth rates (12.5% Y1, tapering to 6% Y5+).
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              About These Settings
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              These advanced settings help fine-tune the simulation model to match your client's 
              risk tolerance and market expectations. The defaults (3 purchases/year, 3% growth) 
              represent moderate assumptions suitable for most scenarios.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

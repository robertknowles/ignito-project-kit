import React from 'react';
import { PauseCircle, X } from 'lucide-react';

interface PauseBlockCardProps {
  pauseId: string;
  startYear: number;
  endYear: number;
  duration: number;
  onRemove: () => void;
  onUpdateDuration: (newDuration: number) => void;
}

export const PauseBlockCard: React.FC<PauseBlockCardProps> = ({
  pauseId,
  startYear,
  endYear,
  duration,
  onRemove,
  onUpdateDuration,
}) => {
  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDuration = parseFloat(e.target.value);
    onUpdateDuration(newDuration);
  };

  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* Pause Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
            <PauseCircle className="text-gray-600" size={24} />
          </div>

          {/* Pause Details */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Pause Period</h3>
              <span className="text-sm text-gray-500">
                {startYear} - {endYear}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Strategic break in acquisition timeline. Existing properties continue to grow and generate cashflow.
            </p>

            {/* Duration Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Duration:</label>
              <select
                value={duration}
                onChange={handleDurationChange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0.5">6 months</option>
                <option value="1">1 year</option>
                <option value="1.5">1.5 years</option>
                <option value="2">2 years</option>
                <option value="3">3 years</option>
              </select>
            </div>

            {/* Info Box */}
            <div className="mt-4 bg-gray-100 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-600">
                <strong>During this pause:</strong>
              </p>
              <ul className="text-xs text-gray-600 mt-1 space-y-1 ml-4">
                <li>• No new properties will be purchased</li>
                <li>• Portfolio value continues to grow</li>
                <li>• Rental income accumulates</li>
                <li>• Savings and equity build for future purchases</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove pause period"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};


import React from 'react';
import { AlertTriangle, X, Settings } from 'lucide-react';

interface PropertyOnboardingWarningBannerProps {
  onConfigureNow: () => void;
  onDismiss: () => void;
}

export const PropertyOnboardingWarningBanner: React.FC<PropertyOnboardingWarningBannerProps> = ({
  onConfigureNow,
  onDismiss,
}) => {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Property templates not configured.</span>
                {' '}You're using default values which may not match your market. Configure your property blocks for accurate projections.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onConfigureNow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
            >
              <Settings size={14} />
              Configure Now
            </button>
            <button
              onClick={onDismiss}
              className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
              aria-label="Dismiss warning"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

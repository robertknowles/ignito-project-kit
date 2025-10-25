import React from 'react';
import { LightbulbIcon, XIcon } from 'lucide-react';
import type { FeasibilityAnalysis } from '../utils/feasibilityChecker';

interface FeasibilityWarningProps {
  analysis: FeasibilityAnalysis;
  onDismiss?: () => void;
}

export const FeasibilityWarning: React.FC<FeasibilityWarningProps> = ({
  analysis,
  onDismiss,
}) => {
  
  if (analysis.isAchievable || analysis.severity === 'none') {
    return null;
  }
  
  const bgColor = 
    analysis.severity === 'major' ? 'bg-red-50 border-red-200' :
    analysis.severity === 'moderate' ? 'bg-amber-50 border-amber-200' :
    'bg-blue-50 border-blue-200';
  
  const textColor =
    analysis.severity === 'major' ? 'text-red-900' :
    analysis.severity === 'moderate' ? 'text-amber-900' :
    'text-blue-900';
  
  const iconColor =
    analysis.severity === 'major' ? 'text-red-600' :
    analysis.severity === 'moderate' ? 'text-amber-600' :
    'text-blue-600';
  
  return (
    <div className={`${bgColor} border rounded-lg p-4 mt-6`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <LightbulbIcon size={20} className={iconColor} />
          <h3 className={`font-semibold ${textColor}`}>Strategy Optimization</h3>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className={`${iconColor} hover:opacity-70`}>
            <XIcon size={18} />
          </button>
        )}
      </div>
      
      <p className={`text-sm ${textColor} mb-4`}>{analysis.message}</p>
      
      {analysis.bottlenecks.length > 0 && (
        <div className="mb-4">
          <p className={`text-xs font-medium ${textColor} mb-2`}>Current Challenges:</p>
          <div className="space-y-1">
            {analysis.bottlenecks.map((bottleneck, i) => (
              <div key={i} className={`text-xs ${textColor.replace('900', '700')} flex items-start gap-2`}>
                <span className={iconColor}>•</span>
                {bottleneck.message}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {analysis.suggestions.length > 0 && (
        <div>
          <p className={`text-xs font-medium ${textColor} mb-2`}>Suggested Adjustments:</p>
          <div className="space-y-2">
            {analysis.suggestions.map((suggestion, i) => (
              <div 
                key={i}
                className="bg-white rounded-md p-3 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{suggestion.action}</p>
                  <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ml-2 ${
                    suggestion.priority === 'high' 
                      ? 'bg-red-100 text-red-700' 
                      : suggestion.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {suggestion.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{suggestion.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className={`mt-4 pt-3 border-t ${bgColor.replace('50', '100')}`}>
        <p className={`text-xs ${textColor.replace('900', '700')}`}>
          💡 These are suggestions to help optimize your strategy. You can proceed as-is or make adjustments.
        </p>
      </div>
    </div>
  );
};


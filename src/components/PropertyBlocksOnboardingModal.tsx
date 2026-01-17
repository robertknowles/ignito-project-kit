import React, { useState } from 'react';
import { X, Building2, Sparkles } from 'lucide-react';
import { TitleDeedCard } from './TitleDeedCard';
import { PropertyDetailModal } from './PropertyDetailModal';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';

interface PropertyBlocksOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const PropertyBlocksOnboardingModal: React.FC<PropertyBlocksOnboardingModalProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const { propertyTypeTemplates } = useDataAssumptions();
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEditTemplate = (propertyType: string) => {
    setEditingTemplate(propertyType);
  };

  return (
    <>
      {/* Main Onboarding Modal */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Build Your Property Blocks
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Configure your investment property templates
                  </p>
                </div>
              </div>
              <button
                onClick={onSkip}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Skip onboarding"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Introduction */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-medium text-gray-900">Welcome!</span> These are your default property templates — 
                    pre-configured "building blocks" for creating investment strategies. Each template represents a different 
                    property type with typical values for your market.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">We recommend reviewing and customizing these defaults</span> to match your 
                    local market conditions. Click "Edit Template" on any card to adjust the values.
                  </p>
                </div>
              </div>
            </div>

            {/* Property Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {propertyTypeTemplates.map((template) => (
                <TitleDeedCard
                  key={template.propertyType}
                  template={template}
                  onEdit={() => handleEditTemplate(template.propertyType)}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                You can always edit these templates later from the sidebar
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={onComplete}
                  className="px-5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Looks Good, Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property Template Edit Modal */}
      {editingTemplate && (
        <PropertyDetailModal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          instanceId={`template_${editingTemplate}`}
          propertyType={editingTemplate}
          isTemplate={true}
        />
      )}
    </>
  );
};

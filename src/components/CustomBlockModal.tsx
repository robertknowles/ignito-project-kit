import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CustomBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: CustomPropertyBlock) => void;
}

export interface CustomPropertyBlock {
  id: string;
  title: string;
  cost: number;
  yieldPercent: number;
  lvr: number;
  loanType: 'IO' | 'PI';
  isCustom: true;
  growthPercent: number;
}

export const CustomBlockModal: React.FC<CustomBlockModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    cost: 350000,
    yieldPercent: 7,
    lvr: 80,
    growthPercent: 5,
  });

  const handleSave = () => {
    const customBlock: CustomPropertyBlock = {
      id: `custom-${Date.now()}`,
      title: formData.title || 'Custom Property',
      cost: formData.cost,
      yieldPercent: formData.yieldPercent,
      lvr: formData.lvr,
      loanType: 'IO', // Default to Interest Only (managed per-instance in timeline)
      isCustom: true,
      growthPercent: formData.growthPercent,
    };
    
    onSave(customBlock);
    onClose();
    
    // Reset form
    setFormData({
      title: '',
      cost: 350000,
      yieldPercent: 7,
      lvr: 80,
      growthPercent: 5,
    });
  };

  if (!isOpen) return null;

  const loanAmount = (formData.cost * formData.lvr) / 100;
  const depositRequired = formData.cost - loanAmount;
  const annualRentalIncome = (formData.cost * formData.yieldPercent) / 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#111827]">Create Custom Property Block</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Property Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Name
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Premium Apartment"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#374151]"
            />
          </div>

          {/* Property Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Price ($)
            </label>
            <input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
              step="10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#374151]"
            />
          </div>

          {/* Yield */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rental Yield (%)
            </label>
            <input
              type="number"
              value={formData.yieldPercent}
              onChange={(e) => setFormData({ ...formData, yieldPercent: parseFloat(e.target.value) || 0 })}
              step="0.1"
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#374151]"
            />
          </div>

          {/* Growth Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Growth Rate (%)
            </label>
            <input
              type="number"
              value={formData.growthPercent}
              onChange={(e) => setFormData({ ...formData, growthPercent: parseFloat(e.target.value) || 0 })}
              step="0.1"
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#374151]"
            />
          </div>

          {/* LVR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LVR (%)
            </label>
            <input
              type="number"
              value={formData.lvr}
              onChange={(e) => setFormData({ ...formData, lvr: parseInt(e.target.value) || 0 })}
              min="0"
              max="95"
              step="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#374151]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Loan-to-Value Ratio (typically 70-90%)
            </p>
          </div>

          {/* Calculated Values Preview */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Loan Amount:</span>
                <span className="font-medium">${loanAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Deposit Required:</span>
                <span className="font-medium">${depositRequired.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Rental Income:</span>
                <span className="font-medium">${annualRentalIncome.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Block
          </button>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { ClientDashboard } from './ClientDashboard';
import { useSharedScenario } from '../hooks/useSharedScenario';
import './client-view.css';

export const ClientView = () => {
  // Fetch scenario data using the share_id from URL
  const { scenario, loading, error } = useSharedScenario();

  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-600 text-lg">Loading your investment dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="max-w-md p-8 bg-white rounded-xl shadow-lg border border-red-200">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">
            Dashboard Not Found
          </h2>
          <p className="text-gray-700 mb-2">
            {error?.message || 'Unable to load the investment dashboard.'}
          </p>
          <p className="text-sm text-gray-500">
            Please check your link and try again, or contact your advisor for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* Dashboard Content */}
      <ClientDashboard 
        investmentProfile={scenario.investmentProfile}
        propertySelections={scenario.propertySelections}
        chartData={scenario.chartData}
        clientDisplayName={scenario.client_display_name}
        agentDisplayName={scenario.agent_display_name}
        companyDisplayName={scenario.company_display_name}
        onPrint={handlePrint}
      />
    </div>
  );
};


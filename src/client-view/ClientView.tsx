import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { CoverPage } from './pages/CoverPage';
import { AtAGlancePage } from './pages/AtAGlancePage';
import { PropertyTimelinePage } from './pages/PropertyTimelinePage';
import { StrategyPathwayPage } from './pages/StrategyPathwayPage';
import { useSharedScenario } from '../hooks/useSharedScenario';
import './client-view.css';

export const ClientView = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const componentRef = useRef(null);
  
  // Fetch scenario data using the share_id from URL
  const { scenario, loading, error } = useSharedScenario();

  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-600 text-lg">Loading your investment report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg border border-red-200">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">
            Report Not Found
          </h2>
          <p className="text-gray-700 mb-2">
            {error?.message || 'Unable to load the investment report.'}
          </p>
          <p className="text-sm text-gray-500">
            Please check your link and try again, or contact your advisor for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Create pages with data props
  const pages = [
    <CoverPage 
      key="cover"
      clientDisplayName={scenario.client_display_name}
      agentDisplayName={scenario.agent_display_name}
      companyDisplayName={scenario.company_display_name}
    />,
    <AtAGlancePage 
      key="glance"
      investmentProfile={scenario.investmentProfile}
      propertySelections={scenario.propertySelections}
      chartData={scenario.chartData}
      companyDisplayName={scenario.company_display_name}
    />,
    <PropertyTimelinePage 
      key="timeline"
      investmentProfile={scenario.investmentProfile}
      propertySelections={scenario.propertySelections}
      companyDisplayName={scenario.company_display_name}
    />,
    <StrategyPathwayPage 
      key="strategy"
      investmentProfile={scenario.investmentProfile}
      propertySelections={scenario.propertySelections}
      companyDisplayName={scenario.company_display_name}
    />,
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {pages.length}
          </span>
          <button
            onClick={() =>
              setCurrentPage(Math.min(pages.length - 1, currentPage + 1))
            }
            disabled={currentPage === pages.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>
      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-8">
        <div ref={componentRef} className="max-w-[210mm] mx-auto">
          {pages[currentPage]}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { CoverPage } from './pages/CoverPage';
import { AtAGlancePage } from './pages/AtAGlancePage';
import { PropertyTimelinePage } from './pages/PropertyTimelinePage';
import { StrategyPathwayPage } from './pages/StrategyPathwayPage';
import './client-view.css';

export const ClientView = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const componentRef = useRef(null);

  const pages = [
    <CoverPage key="cover" />,
    <AtAGlancePage key="glance" />,
    <PropertyTimelinePage key="timeline" />,
    <StrategyPathwayPage key="strategy" />,
  ];

  const handlePrint = () => {
    window.print();
  };

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


import React from 'react';
import { InvestmentTimeline } from './InvestmentTimeline';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { CashflowChart } from './CashflowChart';

interface PDFReportRendererProps {
  visible: boolean;
}

export const PDFReportRenderer: React.FC<PDFReportRendererProps> = ({ visible }) => {
  return (
    <div 
      style={{
        position: 'fixed',
        left: visible ? 0 : '-9999px',
        top: 0,
        width: '800px',
        backgroundColor: 'white',
        padding: '20px',
        zIndex: visible ? 9999 : -1,
      }}
    >
      {/* Timeline Section */}
      <div id="pdf-timeline" style={{ marginBottom: '30px', backgroundColor: 'white', padding: '20px' }}>
        <InvestmentTimeline />
      </div>

      {/* Portfolio Growth Chart Section */}
      <div id="pdf-portfolio" style={{ marginBottom: '30px', backgroundColor: 'white', padding: '20px' }}>
        <PortfolioGrowthChart />
      </div>

      {/* Cashflow Chart Section */}
      <div id="pdf-cashflow" style={{ backgroundColor: 'white', padding: '20px' }}>
        <CashflowChart />
      </div>
    </div>
  );
};


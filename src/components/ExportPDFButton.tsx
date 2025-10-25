import React, { useState } from 'react';
import { DownloadIcon } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { useInvestmentProfile } from '@/contexts/InvestmentProfileContext';
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';
import { useGrowthProjections } from '@/hooks/useGrowthProjections';
import { generateEnhancedClientReport } from '../utils/pdfEnhancedGenerator';
import { toast } from 'sonner';
import { PDFReportRenderer } from './PDFReportRenderer';

export const ExportPDFButton: React.FC = () => {
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showPDFRenderer, setShowPDFRenderer] = useState(false);
  const { activeClient } = useClient();
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();
  const { projections } = useGrowthProjections();
  const { propertyAssumptions, globalFactors } = useDataAssumptions();

  const handleGeneratePDF = async () => {
    if (!activeClient) {
      toast.error('No client selected. Please select a client first.');
      return;
    }
    
    // Show the PDF renderer components
    setShowPDFRenderer(true);
    setPdfGenerating(true);
    
    // Wait for components to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.info('Generating PDF report...');
    
    // Agent branding - could be made configurable via settings
    const agentBranding = {
      name: 'Your Buyers Agent',
      email: 'agent@example.com',
      website: 'www.example.com',
      phone: '+1 234 567 8900'
    };
    
    await generateEnhancedClientReport({
      clientName: activeClient.name,
      profile,
      timelineProperties: timelineProperties.filter(p => p.status === 'feasible'),
      projections,
      propertyAssumptions,
      globalFactors,
      agentBranding,
      onProgress: (stage) => {
        console.log('PDF Generation:', stage);
      },
      onComplete: () => {
        toast.success('PDF report generated successfully!');
        setPdfGenerating(false);
        setShowPDFRenderer(false);
      },
      onError: (error) => {
        toast.error(`Failed to generate PDF: ${error.message}`);
        setPdfGenerating(false);
        setShowPDFRenderer(false);
      },
    });
  };

  return (
    <>
      <button 
        onClick={handleGeneratePDF}
        disabled={pdfGenerating || !activeClient}
        className="flex items-center gap-2 bg-[#3b82f6] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={!activeClient ? 'Select a client to export PDF' : 'Export PDF Report'}
      >
        <DownloadIcon size={14} />
        <span>{pdfGenerating ? 'Generating...' : 'Export PDF'}</span>
      </button>
      
      {showPDFRenderer && <PDFReportRenderer visible={false} />}
    </>
  );
};

